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

  return <ItemsClientView items={items} profile={profile} />
}
