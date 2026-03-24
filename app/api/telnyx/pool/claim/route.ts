import { createClient } from '@/lib/supabase/server'
import { registerWebhook } from '@/lib/telnyx/client'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * POST /api/telnyx/pool/claim
 * Claims an already-purchased number from the pool (no Telnyx purchase needed).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('telnyx_number')
    .eq('id', user.id)
    .single()

  if (profile?.telnyx_number) {
    return NextResponse.json({ error: 'You already have a provisioned number' }, { status: 400 })
  }

  const { phoneNumber, numberId } = await request.json()
  if (!phoneNumber || !numberId) {
    return NextResponse.json({ error: 'phoneNumber and numberId required' }, { status: 400 })
  }

  try {
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/telnyx`
    await registerWebhook(numberId, webhookUrl)

    await supabase
      .from('users')
      .update({ telnyx_number: phoneNumber, telnyx_number_id: numberId })
      .eq('id', user.id)

    return NextResponse.json({ phoneNumber, numberId })
  } catch (err) {
    console.error('Claim error:', err)
    return NextResponse.json({ error: 'Failed to claim number' }, { status: 500 })
  }
}
