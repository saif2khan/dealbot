import { createClient } from '@/lib/supabase/server'
import { searchNumbers, purchaseNumber, getPhoneNumberId, registerWebhook, getMessagingProfileId, assignToMessagingProfile } from '@/lib/telnyx/client'
import { NextResponse, type NextRequest } from 'next/server'

/** GET /api/telnyx/numbers?country=US — search available numbers */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const country = request.nextUrl.searchParams.get('country') ?? 'US'

  try {
    const numbers = await searchNumbers(country)
    return NextResponse.json({ numbers })
  } catch (err: unknown) {
    console.error('Telnyx search error:', err)
    return NextResponse.json({ error: 'Failed to search numbers' }, { status: 500 })
  }
}

/** POST /api/telnyx/numbers — purchase a number and register webhook */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check user doesn't already have a number
  const { data: profile } = await supabase
    .from('users')
    .select('telnyx_number')
    .eq('id', user.id)
    .single()

  if (profile?.telnyx_number) {
    return NextResponse.json({ error: 'You already have a provisioned number' }, { status: 400 })
  }

  const { phoneNumber } = await request.json()
  if (!phoneNumber) return NextResponse.json({ error: 'phoneNumber required' }, { status: 400 })

  try {
    await purchaseNumber(phoneNumber)

    // Fetch the actual phone number resource ID (order ID ≠ number ID)
    const numberId = await getPhoneNumberId(phoneNumber)

    // Register webhook
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks/telnyx`
    await registerWebhook(numberId, webhookUrl)

    // Assign to "FB Marketplace Agent" messaging profile
    const messagingProfileId = await getMessagingProfileId('FB Marketplace Agent')
    if (messagingProfileId) {
      await assignToMessagingProfile(numberId, messagingProfileId)
      console.log(`[numbers] assigned ${numberId} to messaging profile ${messagingProfileId}`)
    } else {
      console.error('[numbers] Could not find "FB Marketplace Agent" messaging profile — number not assigned')
    }

    // Store in user profile
    await supabase
      .from('users')
      .update({ telnyx_number: phoneNumber, telnyx_number_id: numberId })
      .eq('id', user.id)

    return NextResponse.json({ phoneNumber, numberId })
  } catch (err: unknown) {
    console.error('Telnyx purchase error:', err)
    return NextResponse.json({ error: 'Failed to provision number' }, { status: 500 })
  }
}
