import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!
// Facebook Marketplace scraper actor on Apify
const ACTOR_ID = 'apify~facebook-marketplace-scraper'

/** Follow redirects server-side to resolve FB share URLs → actual marketplace URL */
async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(10000),
    })
    return res.url
  } catch {
    return url // return original if resolution fails
  }
}

/** Map FB Marketplace condition string → our DB enum */
function mapCondition(raw: string | null | undefined): string {
  if (!raw) return 'good'
  const s = raw.toLowerCase()
  if (s.includes('new') && !s.includes('like')) return 'new'
  if (s.includes('like new') || s.includes('like_new')) return 'like_new'
  if (s.includes('good')) return 'good'
  if (s.includes('fair')) return 'fair'
  if (s.includes('part') || s.includes('not working')) return 'for_parts'
  return 'good'
}

/** Map FB Marketplace category → our DB enum */
function mapCategory(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.toLowerCase()
  if (s.includes('electron') || s.includes('phone') || s.includes('computer')) return 'electronics'
  if (s.includes('furniture') || s.includes('home')) return 'furniture'
  if (s.includes('vehicle') || s.includes('car') || s.includes('truck')) return 'vehicle'
  if (s.includes('cloth') || s.includes('apparel') || s.includes('fashion')) return 'clothing'
  return 'other'
}

/** Parse price from various formats: "$150", "150", "CAD 150", "Free" */
function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return raw
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Step 1: Resolve share URL → actual marketplace URL
  const resolvedUrl = await resolveUrl(url)

  // Validate it's a Facebook Marketplace URL
  if (!resolvedUrl.includes('facebook.com')) {
    return NextResponse.json({ error: 'Could not resolve to a Facebook URL. Please check the link.' }, { status: 400 })
  }

  // Step 2: Run Apify actor synchronously (blocks until done, max 120s)
  let apifyData: Record<string, unknown>[]
  try {
    const apifyRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120&memory=512`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: resolvedUrl }],
          maxItems: 1,
          proxy: { useApifyProxy: true },
        }),
        signal: AbortSignal.timeout(150000), // 150s client timeout
      }
    )

    if (!apifyRes.ok) {
      const err = await apifyRes.text()
      console.error('[scrape] Apify error:', err)
      return NextResponse.json({ error: 'Scraper failed. Check the URL and try again.' }, { status: 502 })
    }

    apifyData = await apifyRes.json()
  } catch (err) {
    console.error('[scrape] Apify timeout or network error:', err)
    return NextResponse.json({ error: 'Scraper timed out. Try again.' }, { status: 504 })
  }

  if (!apifyData || apifyData.length === 0) {
    return NextResponse.json({ error: 'No listing data found. Make sure the URL points to a specific item.' }, { status: 404 })
  }

  // Step 3: Map Apify output → our item schema
  const raw = apifyData[0]

  // Handle actor-level errors (e.g. private/unavailable listing)
  if (raw.error) {
    console.error('[scrape] Actor returned error:', raw.error, raw.errorDescription)
    return NextResponse.json({
      error: `Could not read listing: ${raw.errorDescription ?? raw.error}. Make sure the listing is public and not sold.`,
    }, { status: 422 })
  }

  // Apify FB Marketplace scraper output field names (handles different actor variants)
  const title = (raw.title ?? raw.name ?? raw.listing_title ?? '') as string
  const description = (raw.description ?? raw.text ?? raw.body ?? '') as string
  const priceRaw = (raw.price ?? raw.priceAmount ?? raw.listing_price ?? null) as string | number | null
  const conditionRaw = (raw.condition ?? raw.itemCondition ?? null) as string | null
  const categoryRaw = (raw.category ?? raw.primaryCategory ?? null) as string | null

  // Location: could be string or object
  let location = ''
  if (typeof raw.location === 'string') {
    location = raw.location
  } else if (raw.location && typeof raw.location === 'object') {
    const loc = raw.location as Record<string, string>
    location = [loc.city, loc.state, loc.country].filter(Boolean).join(', ')
  } else if (typeof raw.seller_location === 'string') {
    location = raw.seller_location as string
  }

  const price = parsePrice(priceRaw)

  return NextResponse.json({
    name: title,
    description,
    askingPrice: price,
    condition: mapCondition(conditionRaw),
    category: mapCategory(categoryRaw),
    location,
    resolvedUrl,
  })
}
