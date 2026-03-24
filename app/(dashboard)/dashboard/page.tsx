import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSummary from '@/components/dashboard/DashboardSummary'
import VirtualNumberBanner from '@/components/dashboard/VirtualNumberBanner'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileResult, itemsResult, conversationsResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).single(),
    supabase.from('items').select('id, status').eq('user_id', user.id),
    supabase
      .from('conversations')
      .select('id, status, last_message_at')
      .eq('user_id', user.id)
      .gte('last_message_at', new Date(Date.now() - 86400000).toISOString()),
  ])

  const profile = profileResult.data
  const items = itemsResult.data ?? []
  const todayConversations = conversationsResult.data ?? []

  const activeItems = items.filter(i => i.status === 'active').length
  const pendingDeals = items.filter(i => i.status === 'pending').length
  const messagestoday = todayConversations.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Your DealBot at a glance</p>
      </div>

      {profile?.telnyx_number && (
        <VirtualNumberBanner number={profile.telnyx_number} />
      )}

      <DashboardSummary
        activeItems={activeItems}
        pendingDeals={pendingDeals}
        messagesToday={messagestoday}
        itemsUsed={profile?.items_listed_this_month ?? 0}
        itemsLimit={profile?.items_limit ?? 10}
      />
    </div>
  )
}
