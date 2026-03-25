import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getMessagingProfileId, listNumbersInProfile } from '@/lib/telnyx/client'
import { NextResponse } from 'next/server'

const MESSAGING_PROFILE_NAME = 'FB Marketplace Agent'

/**
 * GET /api/telnyx/pool
 * Returns numbers from the "FB Marketplace Agent" messaging profile
 * that are not claimed by any active BZARP user.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Find the messaging profile
    const profileId = await getMessagingProfileId(MESSAGING_PROFILE_NAME)
    if (!profileId) {
      return NextResponse.json({ numbers: [], profileFound: false })
    }

    // 2. List all numbers in the profile
    const telnyxNumbers = await listNumbersInProfile(profileId)
    if (telnyxNumbers.length === 0) {
      return NextResponse.json({ numbers: [], profileFound: true })
    }

    // 3. Find which numbers are already claimed by active users
    const serviceClient = createServiceClient()
    const { data: claimedUsers } = await serviceClient
      .from('users')
      .select('telnyx_number, subscription_status')
      .in('telnyx_number', telnyxNumbers.map(n => n.phone_number))

    const claimedNumbers = new Set(
      (claimedUsers ?? [])
        .filter(u => ['trialing', 'active', 'past_due'].includes(u.subscription_status ?? ''))
        .map(u => u.telnyx_number)
    )

    // 4. Return only unclaimed numbers
    const available = telnyxNumbers
      .filter(n => !claimedNumbers.has(n.phone_number))
      .map(n => ({ phone_number: n.phone_number, id: n.id }))

    return NextResponse.json({ numbers: available, profileFound: true })
  } catch (err) {
    console.error('Pool fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch number pool' }, { status: 500 })
  }
}
