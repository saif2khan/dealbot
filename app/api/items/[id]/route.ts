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
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // If status is changing away from 'pending', cancel any scheduled deal, clear pending_buyer_id, and notify waitlist
  // Uses service client to bypass RLS (pending_deals has no UPDATE policy for users)
  if (update.status && update.status !== 'pending') {
    const serviceClient = createServiceClient()
    await serviceClient
      .from('pending_deals')
      .update({ status: 'cancelled' })
      .eq('item_id', id)
      .eq('status', 'scheduled')

    update.pending_buyer_id = null

    // Notify waitlisted buyers that the item is available again
    if (update.status === 'active') {
      const { data: itemData } = await supabase.from('items').select('name, user_id').eq('id', id).single()
      const { data: seller } = await supabase.from('users').select('telnyx_number').eq('id', user.id).single()

      if (itemData && seller?.telnyx_number) {
        const { data: waitlist } = await serviceClient
          .from('waitlist_entries')
          .select('*, conversations(buyer_phone)')
          .eq('item_id', id)
          .eq('status', 'waiting')
          .order('position', { ascending: true })

        if (waitlist && waitlist.length > 0) {
          const broadcastMsg = `Good news — "${itemData.name}" is available again! Still interested? Reply YES to restart.`
          for (const entry of waitlist) {
            const buyerPhone = (entry as unknown as { conversations: { buyer_phone: string } }).conversations?.buyer_phone
            if (buyerPhone) {
              await sendSms(seller.telnyx_number, buyerPhone, broadcastMsg)
              await serviceClient
                .from('waitlist_entries')
                .update({ status: 'broadcast_sent', broadcast_sent_at: new Date().toISOString() })
                .eq('id', entry.id)
            }
          }
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
