import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingWizard from '@/components/onboarding/OnboardingWizard'

interface Props {
  searchParams: Promise<{ billing?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Already onboarded
  if (profile?.telnyx_number) redirect('/dashboard')

  const { billing } = await searchParams
  // After Stripe checkout success, jump straight to Profile step (step 2)
  const initialStep = billing === 'success' ? 2 : 0

  return <OnboardingWizard userId={user.id} initialStep={initialStep} />
}
