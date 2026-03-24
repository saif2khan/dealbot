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
  // availability_text is set in step 3 (Availability) — reliable signal the wizard was finished
  const hasFinishedWizard = hasTelnyx && hasBilling && !!profile?.availability_text

  if (hasFinishedWizard) redirect('/dashboard')

  // Resume at the right step based on what's already saved
  // Step 0: Phone, Step 1: Billing, Step 2: Profile, Step 3: Availability, Step 4: First Item
  let initialStep = 0
  if (hasTelnyx && hasBilling) initialStep = 2  // both done → resume at Profile
  else if (hasTelnyx && !hasBilling) initialStep = 1  // phone done → resume at Billing

  return (
    <OnboardingWizard
      userId={user.id}
      initialStep={initialStep}
      billingDone={hasBilling}
    />
  )
}
