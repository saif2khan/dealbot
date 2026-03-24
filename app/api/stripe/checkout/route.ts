import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  const stripe = getStripe()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  let customerId = profile?.stripe_customer_id

  // Create Stripe customer if not exists
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { supabase_user_id: user.id },
    },
    success_url: `${appUrl}/onboarding?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/onboarding?billing=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
