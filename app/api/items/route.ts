import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('items')
    .select('*, waitlist_entries(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check monthly item limit
  const { data: profile } = await supabase
    .from('users')
    .select('items_listed_this_month, items_limit')
    .eq('id', user.id)
    .single()

  if (profile && profile.items_listed_this_month >= profile.items_limit) {
    return NextResponse.json(
      { error: `Monthly item limit reached (${profile.items_limit}). Upgrade or wait until next billing cycle.` },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { name, description, condition, askingPrice, maxDiscount, firmPrice, tags, category, preferredTimes } = body

  if (!name || !description || !condition || askingPrice == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: item, error } = await supabase
    .from('items')
    .insert({
      user_id: user.id,
      name,
      description,
      condition,
      asking_price: askingPrice,
      max_discount: maxDiscount ?? 0,
      firm_price: firmPrice ?? false,
      tags: tags ?? [],
      category: category ?? null,
      preferred_times: preferredTimes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Increment monthly count
  await supabase
    .from('users')
    .update({ items_listed_this_month: (profile?.items_listed_this_month ?? 0) + 1 })
    .eq('id', user.id)

  return NextResponse.json({ item }, { status: 201 })
}
