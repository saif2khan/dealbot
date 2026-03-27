import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ItemsClientView from '@/components/dashboard/ItemsClientView'

export default async function ItemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, itemsResult] = await Promise.all([
    supabase.from('users').select('items_listed_this_month, items_limit').eq('id', user.id).single(),
    supabase
      .from('items')
      .select('*, waitlist_entries(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileResult.data ?? { items_listed_this_month: 0, items_limit: 10 }
  const items = itemsResult.data ?? []

  // Fetch deals for pending items
  const pendingItemIds = items.filter(i => i.status === 'pending').map(i => i.id)
  let dealsByItem: Record<string, { buyer_name: string; buyer_phone: string; agreed_price: number; meetup_date: string; meetup_time: string }> = {}

  if (pendingItemIds.length > 0) {
    const { data: deals, error } = await supabase
      .from('pending_deals')
      .select('item_id, buyer_name, buyer_phone, agreed_price, meetup_date, meetup_time')
      .in('item_id', pendingItemIds)
      .eq('status', 'scheduled')

    if (!error && deals) {
      for (const deal of deals) {
        dealsByItem[deal.item_id] = deal
      }
    }
  }

  return <ItemsClientView items={items} profile={profile} dealsByItem={dealsByItem} />
}
