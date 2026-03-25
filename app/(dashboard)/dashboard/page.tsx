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
    <div className="max-w-7xl space-y-8 pb-12">
      <div>
        <h2 className="text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">Dashboard</h2>
        <p className="text-on-surface-variant text-sm mt-1">Your BZARP at a glance</p>
      </div>

      {profile?.telnyx_number && (
        <VirtualNumberBanner
          number={profile.telnyx_number}
          agentName={profile.agent_name || 'Zuck'}
          agentGender={((profile.agent_gender as 'male' | 'female') || 'male')}
        />
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
