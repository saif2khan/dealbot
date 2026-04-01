import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSummary from '@/components/dashboard/DashboardSummary'
import AgentStatusSection from '@/components/dashboard/AgentStatusSection'
import QuickstartGuide from '@/components/dashboard/QuickstartGuide'

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
      {profile?.telnyx_number ? (
        <AgentStatusSection
          initialActive={profile?.agent_active ?? true}
          telnyxNumber={profile.telnyx_number}
          agentName={profile.agent_name || 'Zuck'}
          agentGender={(profile.agent_gender as 'male' | 'female') || 'male'}
        />
      ) : (
        <div>
          <h2 className="hidden md:block text-3xl font-[family-name:var(--font-manrope)] font-extrabold tracking-tight text-slate-900">Dashboard</h2>
          <p className="hidden md:block text-on-surface-variant text-sm mt-1">Your BZARP at a glance</p>
        </div>
      )}

      <DashboardSummary
        activeItems={activeItems}
        pendingDeals={pendingDeals}
        messagesToday={messagestoday}
        itemsUsed={profile?.items_listed_this_month ?? 0}
        itemsLimit={profile?.items_limit ?? 10}
      />

      <QuickstartGuide />
    </div>
  )
}
