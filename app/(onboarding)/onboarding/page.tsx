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

  const { billing } = await searchParams

  const hasTelnyx = !!profile?.telnyx_number
  // Billing confirmed either by webhook updating subscription_status, or by the
  // Stripe success_url param (webhook may not have fired yet when user lands here)
  const hasBilling =
    ['trialing', 'active'].includes(profile?.subscription_status ?? '') ||
    billing === 'success'

  // Fully onboarded — both steps done
  if (hasTelnyx && hasBilling) redirect('/dashboard')

  // Determine which step to start on based on what's already complete
  // Step 0: Phone Number, Step 1: Billing
  const initialStep = hasTelnyx && !hasBilling ? 1 : 0

  return (
    <OnboardingWizard
      userId={user.id}
      initialStep={initialStep}
      billingDone={hasBilling}
    />
  )
}
