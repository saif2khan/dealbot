import { createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/telnyx/client'
import { callClaude } from '@/lib/agent/claude'
import { buildSystemPrompt, truncateHistory } from '@/lib/agent/systemPrompt'
import { detectSellerCommand } from '@/lib/agent/sellerCommands'
import type { Item, PendingDeal } from '@/types/database'

/**
 * Handle an inbound SMS from the SELLER (to their own virtual number).
 * Priority order:
 * 1. Status-change commands ("mark X as sold", "deal fell through", etc.)
 * 2. Yes/No no-show confirmation (after followup was sent)
 * 3. Escalation reply forwarding
 */
export async function handleSellerReply(
  sellerPhone: string,
  virtualNumber: string,
  messageText: string
) {
  const supabase = createServiceClient()

  const { data: seller } = await supabase
    .from('users')
    .select('*')
    .eq('telnyx_number', virtualNumber)
    .eq('phone', sellerPhone)
    .single()

  if (!seller) return

  // Load seller's items for command detection
  const { data: allItems } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', seller.id)
    .in('status', ['active', 'pending', 'sold'])

  const items: Item[] = (allItems ?? []) as Item[]

  // 1. Check for inventory commands (STATUS_CHANGE, CANCEL_DEAL)
  const command = await detectSellerCommand(messageText, items)
  console.log(`[sellerReply] command detected:`, JSON.stringify(command))

  if (command.type === 'STATUS_CHANGE') {
    // Find the item by name (fuzzy match already done by Claude)
    const target = items.find(i =>
      i.name.toLowerCase() === command.itemName.toLowerCase()
    ) ?? items.find(i =>
      i.name.toLowerCase().includes(command.itemName.toLowerCase()) ||
      command.itemName.toLowerCase().includes(i.name.toLowerCase())
    )

    if (!target) {
      await sendSms(virtualNumber, sellerPhone, `BZARP: Couldn't find an item named "${command.itemName}". Check your listings and try again.`)
      return
    }

    const update: Record<string, unknown> = { status: command.newStatus }
    if (command.newStatus === 'sold') {
      update.archived_at = new Date().toISOString()
      // Also complete any pending deal
      await supabase
        .from('pending_deals')
        .update({ status: 'completed' })
        .eq('item_id', target.id)
        .eq('status', 'scheduled')
    } else if (command.newStatus === 'active') {
      update.pending_buyer_id = null
      // Cancel any scheduled deal
      await supabase
        .from('pending_deals')
        .update({ status: 'cancelled' })
        .eq('item_id', target.id)
        .eq('status', 'scheduled')
    }

    await supabase.from('items').update(update).eq('id', target.id)

    const statusLabels: Record<string, string> = {
      sold: 'marked as sold',
      active: 'back to active',
      archived: 'archived',
    }
    await sendSms(
      virtualNumber,
      sellerPhone,
      `BZARP: "${target.name}" has been ${statusLabels[command.newStatus] ?? command.newStatus}.`
    )
    return
  }

  if (command.type === 'CANCEL_DEAL') {
    const target = items.find(i =>
      i.name.toLowerCase() === command.itemName.toLowerCase()
    ) ?? items.find(i =>
      i.name.toLowerCase().includes(command.itemName.toLowerCase()) ||
      command.itemName.toLowerCase().includes(i.name.toLowerCase())
    )

    if (!target) {
      await sendSms(virtualNumber, sellerPhone, `BZARP: Couldn't find an item named "${command.itemName}".`)
      return
    }

    await supabase
      .from('pending_deals')
      .update({ status: 'cancelled' })
      .eq('item_id', target.id)
      .eq('status', 'scheduled')

    await supabase
      .from('items')
      .update({ status: 'active', pending_buyer_id: null })
      .eq('id', target.id)

    await sendSms(
      virtualNumber,
      sellerPhone,
      `BZARP: Deal cancelled for "${target.name}". Item is back to active.`
    )
    return
  }

  // 2. Yes/No no-show confirmation
  // Only trigger when there's a deal with followup_sent_at set (followup was sent)
  const normalizedText = messageText.trim().toLowerCase()
  const isYes = normalizedText === 'yes' || normalizedText === 'y'
  const isNo = normalizedText === 'no' || normalizedText === 'n'

  if (isYes || isNo) {
    // Look for a deal where the follow-up was sent and still scheduled
    const { data: deals } = await supabase
      .from('pending_deals')
      .select('*, items(*)')
      .eq('status', 'scheduled')
      .not('followup_sent_at', 'is', null)
      .order('followup_sent_at', { ascending: false })
      .limit(1)

    if (deals && deals.length > 0) {
      const deal = deals[0]
      const item = (deal as unknown as { items: Item }).items

      if (isYes) {
        // Buyer showed up — mark sold
        await supabase.from('pending_deals').update({ status: 'completed' }).eq('id', deal.id)
        await supabase
          .from('items')
          .update({ status: 'sold', final_sale_price: deal.agreed_price, archived_at: new Date().toISOString() })
          .eq('id', deal.item_id)

        await sendSms(virtualNumber, sellerPhone, `BZARP: "${item.name}" marked as sold. Congrats!`)
      } else {
        // No-show — return item to active, broadcast waitlist
        await supabase.from('pending_deals').update({ status: 'no_show' }).eq('id', deal.id)
        await supabase
          .from('items')
          .update({ status: 'active', pending_buyer_id: null })
          .eq('id', deal.item_id)

        const { data: waitlist } = await supabase
          .from('waitlist_entries')
          .select('*, conversations(buyer_phone)')
          .eq('item_id', deal.item_id)
          .eq('status', 'waiting')
          .order('position', { ascending: true })

        if (waitlist && waitlist.length > 0) {
          const broadcastMsg = `Good news — "${item.name}" is available again! Still interested? Reply YES to restart.`
          for (const entry of waitlist) {
            const buyerPhone = (entry as unknown as { conversations: { buyer_phone: string } }).conversations?.buyer_phone
            if (buyerPhone) {
              await sendSms(virtualNumber, buyerPhone, broadcastMsg)
              await supabase
                .from('waitlist_entries')
                .update({ status: 'broadcast_sent', broadcast_sent_at: new Date().toISOString() })
                .eq('id', entry.id)
            }
          }

          await sendSms(
            virtualNumber,
            sellerPhone,
            `BZARP: "${item.name}" is back to active. Reached out to ${waitlist.length} buyer(s) on the waitlist.`
          )
        } else {
          await sendSms(virtualNumber, sellerPhone, `BZARP: "${item.name}" is back to active. No waitlist buyers to notify.`)
        }
      }
      return
    }
  }

  // 3. Handle escalation reply — forward seller's response to the escalated buyer
  const { data: escalatedConv } = await supabase
    .from('conversations')
    .select('*, items(*)')
    .eq('user_id', seller.id)
    .eq('status', 'escalated')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single()

  if (!escalatedConv) return

  await supabase.from('messages').insert({
    conversation_id: escalatedConv.id,
    direction: 'outbound',
    body: `[Seller]: ${messageText}`,
    sender_type: 'seller',
  })

  const { data: rawHistory } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', escalatedConv.id)
    .order('created_at', { ascending: true })

  const history = truncateHistory(rawHistory ?? [])

  let currentItem: Item | null = null
  let pendingDeal: PendingDeal | null = null

  if (escalatedConv.current_item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('*')
      .eq('id', escalatedConv.current_item_id)
      .single()
    currentItem = item
  }

  const { data: activeItems } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', seller.id)
    .in('status', ['active', 'pending'])

  const systemPrompt = buildSystemPrompt({
    seller,
    item: currentItem,
    history,
    pendingDeal,
    waitlistCount: 0,
    allItems: activeItems ?? [],
  })

  const resumePrompt = `The seller has provided the following clarification to the buyer's question: "${messageText}". Use this information to respond to the buyer and continue the conversation naturally.`

  let agentResponse: string
  try {
    agentResponse = await callClaude(systemPrompt, history, resumePrompt)
  } catch {
    return
  }

  await sendSms(virtualNumber, escalatedConv.buyer_phone, agentResponse)

  await supabase.from('messages').insert({
    conversation_id: escalatedConv.id,
    direction: 'outbound',
    body: agentResponse,
    sender_type: 'agent',
  })

  await supabase
    .from('conversations')
    .update({ status: 'active', last_message_at: new Date().toISOString() })
    .eq('id', escalatedConv.id)
}
