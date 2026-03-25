import { createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/telnyx/client'
import { NextResponse, type NextRequest } from 'next/server'

// Protect with a secret to prevent public access
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1. Auto-resolve deals where followup was sent >24h ago and still 'scheduled'
  const { data: overdueDeals } = await supabase
    .from('pending_deals')
    .select('*, items(id, name, user_id), conversations(buyer_phone)')
    .eq('status', 'scheduled')
    .not('followup_sent_at', 'is', null)
    .lte('followup_sent_at', oneDayAgo.toISOString())

  if (overdueDeals && overdueDeals.length > 0) {
    for (const deal of overdueDeals) {
      const item = (deal as unknown as { items: { id: string; name: string; user_id: string } }).items

      await supabase.from('pending_deals').update({ status: 'no_show' }).eq('id', deal.id)
      await supabase
        .from('items')
        .update({ status: 'active', pending_buyer_id: null })
        .eq('id', deal.item_id)

      // Broadcast waitlist
      const { data: waitlist } = await supabase
        .from('waitlist_entries')
        .select('*, conversations(buyer_phone)')
        .eq('item_id', deal.item_id)
        .eq('status', 'waiting')
        .order('position', { ascending: true })

      // Get seller info for virtual number
      const { data: seller } = await supabase
        .from('users')
        .select('telnyx_number, phone')
        .eq('id', item.user_id)
        .single()

      if (seller?.telnyx_number && waitlist && waitlist.length > 0) {
        const broadcastMsg = `Good news — "${item.name}" is available again! Still interested? Reply YES to restart.`
        for (const entry of waitlist) {
          const buyerPhone = (entry as unknown as { conversations: { buyer_phone: string } }).conversations?.buyer_phone
          if (buyerPhone) {
            await sendSms(seller.telnyx_number, buyerPhone, broadcastMsg)
            await supabase
              .from('waitlist_entries')
              .update({ status: 'broadcast_sent', broadcast_sent_at: now.toISOString() })
              .eq('id', entry.id)
          }
        }

        if (seller.phone) {
          await sendSms(
            seller.telnyx_number,
            seller.phone,
            `BZARP: No response from you about "${item.name}" meetup with ${deal.buyer_name}. Marked as no-show, item is back to active. Reached out to ${waitlist.length} buyer(s) on the waitlist.`
          )
        }
      }
    }
  }

  // 2. Send follow-up for deals where meetup time passed 1h ago and no followup sent yet
  // Build meetup datetime from meetup_date + meetup_time and compare with 1h ago
  const { data: scheduledDeals } = await supabase
    .from('pending_deals')
    .select('*, items(id, name, user_id)')
    .eq('status', 'scheduled')
    .is('followup_sent_at', null)
    .lte('meetup_date', oneHourAgo.toISOString().split('T')[0]) // meetup date is today or earlier

  let followupsSent = 0

  if (scheduledDeals && scheduledDeals.length > 0) {
    for (const deal of scheduledDeals) {
      // Combine meetup_date and meetup_time into a Date object
      const meetupDatetime = new Date(`${deal.meetup_date}T${deal.meetup_time}`)
      if (isNaN(meetupDatetime.getTime())) continue

      // Only send if meetup was at least 1 hour ago
      if (meetupDatetime.getTime() > oneHourAgo.getTime()) continue

      const item = (deal as unknown as { items: { id: string; name: string; user_id: string } }).items

      const { data: seller } = await supabase
        .from('users')
        .select('telnyx_number, phone')
        .eq('id', item.user_id)
        .single()

      if (!seller?.telnyx_number || !seller.phone) continue

      const followupMsg =
        `BZARP: Did ${deal.buyer_name} show up for "${item.name}" today?\n` +
        `Reply YES if the sale went through, or NO if they didn't show up.`

      await sendSms(seller.telnyx_number, seller.phone, followupMsg)
      await supabase
        .from('pending_deals')
        .update({ followup_sent_at: now.toISOString() })
        .eq('id', deal.id)

      followupsSent++
    }
  }

  return NextResponse.json({
    ok: true,
    followupsSent,
    autoResolved: overdueDeals?.length ?? 0,
  })
}
