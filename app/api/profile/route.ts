import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const allowed = ['address', 'addressArea', 'phone', 'globalInstructions', 'availabilityText', 'name', 'agentTone', 'customToneInstructions']
  const update: Record<string, string> = {}

  // Map camelCase to snake_case
  const fieldMap: Record<string, string> = {
    address: 'address',
    addressArea: 'address_area',
    phone: 'phone',
    globalInstructions: 'global_instructions',
    availabilityText: 'availability_text',
    name: 'name',
    agentTone: 'agent_tone',
    customToneInstructions: 'custom_tone_instructions',
  }

  for (const key of allowed) {
    if (body[key] !== undefined) {
      update[fieldMap[key]] = body[key]
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { error } = await supabase.from('users').update(update).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
