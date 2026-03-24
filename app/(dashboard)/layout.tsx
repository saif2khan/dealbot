import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Redirect to onboarding if not set up yet
  if (!profile?.telnyx_number) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={profile} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
