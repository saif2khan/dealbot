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

  if (!profile?.telnyx_number) {
    redirect('/onboarding')
  }

  return (
    <div className="bg-background min-h-screen">
      <Sidebar user={profile} />
      <main className="md:ml-64 min-h-screen px-8 py-8">
        {children}
      </main>
    </div>
  )
}
