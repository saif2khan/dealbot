import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert so repeated clicks don't create duplicates
  const { error } = await supabase
    .from('user_waitlist')
    .upsert({ email: email.toLowerCase().trim(), status: 'waiting' }, { onConflict: 'email' })

  if (error) {
    console.error('Waitlist insert error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
