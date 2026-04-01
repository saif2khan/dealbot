import { createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/telnyx/client'

/**
 * Handle an inbound SMS from the SELLER (to their own virtual number).
 * Sellers manage listings and deals via the app — SMS is notifications only.
 */
export async function handleSellerReply(
  sellerPhone: string,
  virtualNumber: string,
  _messageText: string
) {
  const supabase = createServiceClient()

  const { data: seller } = await supabase
    .from('users')
    .select('id')
    .eq('telnyx_number', virtualNumber)
    .eq('phone', sellerPhone)
    .single()

  if (!seller) return

  await sendSms(
    virtualNumber,
    sellerPhone,
    'To manage your listings and deals, please use the BZARP app.'
  )
}
