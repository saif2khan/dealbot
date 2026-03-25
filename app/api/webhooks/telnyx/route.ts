import { createServiceClient } from '@/lib/supabase/server'
import { sendSms, verifyTelnyxSignature } from '@/lib/telnyx/client'
import { buildSystemPrompt, truncateHistory } from '@/lib/agent/systemPrompt'
import { callClaude } from '@/lib/agent/claude'
import { parseAction } from '@/lib/agent/actions'
import { handleSellerReply } from '@/lib/agent/sellerReply'
import { NextResponse, type NextRequest } from 'next/server'
import type { Item, PendingDeal } from '@/types/database'

// Rate limit store (in-memory for MVP; replace with Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20 // messages per hour per number

function checkRateLimit(phone: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(phone)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(phone, { count: 1, resetAt: now + 3600000 })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('telnyx-signature-ed25519') ?? ''
  const timestamp = request.headers.get('telnyx-timestamp') ?? ''

  // Verify webhook authenticity (skip in dev if keys not set)
  if (process.env.NODE_ENV === 'production') {
    if (!verifyTelnyxSignature(body, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: {
    data?: {
      event_type?: string
      payload?: {
        from?: { phone_number?: string }
        to?: Array<{ phone_number?: string }>
        text?: string
      }
    }
  }
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only handle inbound SMS
  const eventType = payload?.data?.event_type
  console.log(`[Telnyx webhook] event_type: ${eventType}`)
  if (eventType !== 'message.received') {
    return NextResponse.json({ received: true })
  }

  const messagePayload = payload.data?.payload
  const buyerPhone = messagePayload?.from?.phone_number
  const toNumber = messagePayload?.to?.[0]?.phone_number
  const buyerMessage = messagePayload?.text?.trim()

  if (!buyerPhone || !toNumber || !buyerMessage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Rate limit check
  if (!checkRateLimit(buyerPhone)) {
    console.warn(`Rate limit exceeded for ${buyerPhone}`)
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceClient()

  // Check if this is the SELLER texting their own number (for escalation replies / no-show confirmations)
  const { data: sellerCheck } = await supabase
    .from('users')
    .select('id, phone')
    .eq('telnyx_number', toNumber)
    .maybeSingle()

  console.log(`[Telnyx webhook] from=${buyerPhone} to=${toNumber} | seller DB phone=${sellerCheck?.phone ?? 'no match for telnyx_number'}`)

  if (sellerCheck?.phone === buyerPhone) {
    console.log('[Telnyx webhook] Routing to handleSellerReply')
    await handleSellerReply(buyerPhone, toNumber, buyerMessage)
    return NextResponse.json({ received: true })
  }

  // 1. Identify seller by destination number
  const { data: seller } = await supabase
    .from('users')
    .select('*')
    .eq('telnyx_number', toNumber)
    .single()

  if (!seller) {
    console.error(`No seller found for number ${toNumber}`)
    return NextResponse.json({ received: true })
  }

  // 2. Get or create conversation thread (use most recent active one)
  const { data: convRows } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', seller.id)
    .eq('buyer_phone', buyerPhone)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(1)

  let conversation = convRows?.[0] ?? null

  if (!conversation) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        user_id: seller.id,
        buyer_phone: buyerPhone,
        status: 'active',
      })
      .select()
      .single()
    conversation = newConv
  }

  if (!conversation) {
    console.error('Failed to create/retrieve conversation')
    return NextResponse.json({ error: 'Conversation error' }, { status: 500 })
  }

  // 3. Deduplicate: check if this exact message was already processed (Telnyx retry protection)
  const since = new Date(Date.now() - 30000).toISOString() // within last 30s
  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversation.id)
    .eq('body', buyerMessage)
    .eq('direction', 'inbound')
    .gte('created_at', since)
    .limit(1)

  if (existing && existing.length > 0) {
    console.log('[Telnyx webhook] Duplicate message detected, skipping')
    return NextResponse.json({ received: true })
  }

  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    direction: 'inbound',
    body: buyerMessage,
    sender_type: 'buyer',
  })

  // Update last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversation.id)

  // 4. Load conversation history
  const { data: rawHistory } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })

  const history = truncateHistory(rawHistory ?? [])

  // 5. Load current item context
  let currentItem: Item | null = null
  let pendingDeal: PendingDeal | null = null
  let waitlistCount = 0

  if (conversation.current_item_id) {
    const { data: item } = await supabase
      .from('items')
      .select('*')
      .eq('id', conversation.current_item_id)
      .single()
    currentItem = item

    if (item?.status === 'pending' && item.pending_buyer_id) {
      const { data: deal } = await supabase
        .from('pending_deals')
        .select('*')
        .eq('id', item.pending_buyer_id)
        .single()
      pendingDeal = deal

      const { count } = await supabase
        .from('waitlist_entries')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', item.id)
        .eq('status', 'waiting')
      waitlistCount = count ?? 0
    }
  }

  // 6. Load all seller items for context (all statuses so agent knows about sold/archived too)
  const { data: allItems } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', seller.id)

  // 7. Build system prompt
  const systemPrompt = buildSystemPrompt({
    seller,
    item: currentItem,
    history,
    pendingDeal,
    waitlistCount,
    allItems: allItems ?? [],
  })

  // 8. Call Claude
  let agentResponseRaw: string
  try {
    agentResponseRaw = await callClaude(systemPrompt, history.slice(0, -1), buyerMessage)
  } catch (err) {
    console.error('Claude API error:', err)
    // Fallback: inform buyer and notify seller
    await sendSms(toNumber, buyerPhone, "Sorry, I'm having a brief technical issue. The seller will follow up with you shortly.")
    await sendSms(toNumber, seller.phone!, `BZARP alert: Claude API error for buyer ${buyerPhone}. Message: "${buyerMessage}"`)
    return NextResponse.json({ received: true })
  }

  // 9. Parse actions from response
  const { text: agentResponse, action } = parseAction(agentResponseRaw)
  console.log(`[webhook] action=${action?.type ?? 'none'} currentItem=${currentItem?.id ?? 'null'} raw snippet="${agentResponseRaw.slice(-200)}"`)


  // 10. Send reply to buyer
  await sendSms(toNumber, buyerPhone, agentResponse)

  // 11. Store outbound message
  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    direction: 'outbound',
    body: agentResponse,
    sender_type: 'agent',
  })

  // 12. Handle actions
  if (action) {
    switch (action.type) {
      case 'ITEM_IDENTIFIED': {
        // Persist which item this conversation is about
        await supabase
          .from('conversations')
          .update({ current_item_id: action.itemId })
          .eq('id', conversation.id)
        // Always update in-memory so DEAL_CONFIRMED in same message uses the right item
        if (currentItem?.id !== action.itemId) {
          const { data: identified } = await supabase
            .from('items')
            .select('*')
            .eq('id', action.itemId)
            .single()
          if (identified) currentItem = identified
        }
        break
      }

      case 'DEAL_CONFIRMED': {
        // Resolve item: prefer action.itemId (most reliable), fallback to conversation state
        if (!currentItem || currentItem.id !== action.itemId) {
          if (action.itemId) {
            const { data: refetched } = await supabase
              .from('items')
              .select('*')
              .eq('id', action.itemId)
              .single()
            if (refetched) currentItem = refetched
          }
        }
        if (!currentItem) {
          console.warn('[webhook] DEAL_CONFIRMED but no currentItem — skipping')
          break
        }

        // Idempotency: skip only if a scheduled deal already exists for this item
        const { data: existingDeal } = await supabase
          .from('pending_deals')
          .select('id')
          .eq('item_id', currentItem.id)
          .eq('status', 'scheduled')
          .maybeSingle()
        if (existingDeal) {
          console.log('[Telnyx webhook] Deal already confirmed, skipping duplicate')
          break
        }

        // Create pending deal record
        const { data: deal } = await supabase
          .from('pending_deals')
          .insert({
            item_id: currentItem.id,
            conversation_id: conversation.id,
            buyer_phone: buyerPhone,
            buyer_name: action.buyerName,
            agreed_price: action.agreedPrice,
            meetup_date: action.meetupDate,
            meetup_time: action.meetupTime,
            meetup_location: action.meetupLocation,
            status: 'scheduled',
          })
          .select()
          .single()

        if (deal) {
          // Mark item as pending
          await supabase
            .from('items')
            .update({ status: 'pending', pending_buyer_id: deal.id })
            .eq('id', currentItem.id)

          // Update conversation with buyer name
          await supabase
            .from('conversations')
            .update({ buyer_name: action.buyerName })
            .eq('id', conversation.id)

          // Notify seller via SMS
          const sellerMsg =
            `BZARP: Deal confirmed!\n` +
            `Item: ${currentItem.name}\n` +
            `Buyer: ${action.buyerName} (${buyerPhone})\n` +
            `Price: $${action.agreedPrice}\n` +
            `Meetup: ${action.meetupDate} at ${action.meetupTime}\n` +
            `Location: ${action.meetupLocation}`
          await sendSms(toNumber, seller.phone!, sellerMsg)
        }
        break
      }

      case 'WAITLIST_JOIN': {
        if (!currentItem) break

        // Get current waitlist count for position
        const { count: position } = await supabase
          .from('waitlist_entries')
          .select('*', { count: 'exact', head: true })
          .eq('item_id', currentItem.id)

        await supabase.from('waitlist_entries').insert({
          item_id: currentItem.id,
          conversation_id: conversation.id,
          buyer_phone: buyerPhone,
          buyer_name: action.buyerName,
          offered_price: action.offeredPrice,
          position: (position ?? 0) + 1,
          status: 'waiting',
        })

        // Update buyer name in conversation
        await supabase
          .from('conversations')
          .update({ buyer_name: action.buyerName })
          .eq('id', conversation.id)
        break
      }

      case 'ESCALATE': {
        // Mark conversation as escalated
        await supabase
          .from('conversations')
          .update({ status: 'escalated' })
          .eq('id', conversation.id)

        // Notify seller via SMS
        const escalationMsg =
          `BZARP escalation needed!\n` +
          `Buyer: ${buyerPhone}\n` +
          `Item: ${currentItem?.name ?? 'Unknown'}\n` +
          `Reason: ${action.reason}\n` +
          `Last message: "${action.lastBuyerMessage}"\n\n` +
          `Reply to this SMS with your response and BZARP will forward it.`
        await sendSms(toNumber, seller.phone!, escalationMsg)
        break
      }
    }
  }

  // 13. Item disambiguation: if no current item, try to match from buyer's message
  if (!currentItem && allItems && allItems.length > 0) {
    // Simple keyword match — agent will ask for clarification if needed
    // The conversation.current_item_id will be set once agent identifies the item
    // This is handled conversationally by Claude
  }

  return NextResponse.json({ received: true })
}
