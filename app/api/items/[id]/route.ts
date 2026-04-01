import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/telnyx/client'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item: data })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const allowed = ['name', 'description', 'condition', 'asking_price', 'max_discount', 'firm_price', 'tags', 'category', 'preferred_times', 'status']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('items')
    .select('user_id, name, status')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const serviceClient = createServiceClient()

  // Handle status transitions from 'pending' to other states
  if (update.status && update.status !== 'pending') {
    const { data: seller } = await supabase
      .from('users')
      .select('telnyx_number')
      .eq('id', user.id)
      .single()

    if (update.status === 'sold') {
      // Complete the pending deal
      await serviceClient
        .from('pending_deals')
        .update({ status: 'completed' })
        .eq('item_id', id)
        .eq('status', 'scheduled')

      update.pending_buyer_id = null
      update.archived_at = new Date().toISOString()

      // Notify all waitlisted buyers that the item is sold, then archive entries
      if (seller?.telnyx_number) {
        const { data: waitlist } = await serviceClient
          .from('waitlist_entries')
          .select('buyer_phone')
          .eq('item_id', id)
          .in('status', ['waiting', 'broadcast_sent'])

        if (waitlist && waitlist.length > 0) {
          const soldMsg = `"${existing.name}" has been sold and is no longer available.`
          for (const entry of waitlist) {
            if (entry.buyer_phone) {
              await sendSms(seller.telnyx_number, entry.buyer_phone, soldMsg)
            }
          }
        }
      }

      // Archive all waitlist entries for this item
      await serviceClient
        .from('waitlist_entries')
        .delete()
        .eq('item_id', id)

    } else if (update.status === 'archived') {
      // Cancel any pending deal
      await serviceClient
        .from('pending_deals')
        .update({ status: 'cancelled' })
        .eq('item_id', id)
        .eq('status', 'scheduled')

      update.pending_buyer_id = null
      update.archived_at = new Date().toISOString()

      // Notify all waitlisted buyers, then remove entries
      if (seller?.telnyx_number) {
        const { data: waitlist } = await serviceClient
          .from('waitlist_entries')
          .select('buyer_phone')
          .eq('item_id', id)
          .in('status', ['waiting', 'broadcast_sent'])

        if (waitlist && waitlist.length > 0) {
          const archivedMsg = `"${existing.name}" is no longer available.`
          for (const entry of waitlist) {
            if (entry.buyer_phone) {
              await sendSms(seller.telnyx_number, entry.buyer_phone, archivedMsg)
            }
          }
        }
      }

      // Remove all waitlist entries and pending deals for this item
      await serviceClient.from('waitlist_entries').delete().eq('item_id', id)
      await serviceClient.from('pending_deals').delete().eq('item_id', id)

    } else if (update.status === 'active') {
      // Cancel any scheduled deal
      await serviceClient
        .from('pending_deals')
        .update({ status: 'cancelled' })
        .eq('item_id', id)
        .eq('status', 'scheduled')

      update.pending_buyer_id = null

      // Broadcast to waitlisted buyers that the item is available again
      if (seller?.telnyx_number) {
        const { data: waitlist } = await serviceClient
          .from('waitlist_entries')
          .select('buyer_phone')
          .eq('item_id', id)
          .eq('status', 'waiting')
          .order('created_at', { ascending: true })

        if (waitlist && waitlist.length > 0) {
          const broadcastMsg = `Good news — "${existing.name}" is available again! Still interested? Reply YES to restart.`
          for (const entry of waitlist) {
            if (entry.buyer_phone) {
              await sendSms(seller.telnyx_number, entry.buyer_phone, broadcastMsg)
            }
          }
          await serviceClient
            .from('waitlist_entries')
            .update({ status: 'broadcast_sent' })
            .eq('item_id', id)
            .eq('status', 'waiting')
        }
      }
    }
  }

  const { data, error } = await supabase
    .from('items')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('items')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
