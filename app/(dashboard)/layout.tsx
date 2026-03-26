import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileHeader from '@/components/dashboard/MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const hasTelnyx = !!profile?.telnyx_number
  const hasBilling = ['trialing', 'active'].includes(profile?.subscription_status ?? '')

  if (!hasTelnyx || !hasBilling) {
    redirect('/onboarding')
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <MobileHeader email={profile?.email ?? ''} />
      <Sidebar user={profile} />
      <main className="md:ml-64 min-h-screen px-4 pt-[72px] pb-24 md:px-8 md:pt-8 md:pb-8">
        {children}
      </main>
    </div>
  )
}
