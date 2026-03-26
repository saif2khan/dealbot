import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!
// Facebook Marketplace scraper actor on Apify
const ACTOR_ID = 'apify~facebook-marketplace-scraper'

/** Follow redirects to resolve FB share URLs → clean marketplace URL. */
async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(10000),
    })
    const u = new URL(res.url)
    return `${u.origin}${u.pathname}`
  } catch {
    return url
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

  // Validate it resolved to an actual marketplace item (not a login redirect)
  if (!resolvedUrl.includes('facebook.com/marketplace/item')) {
    return NextResponse.json({
      error: "Couldn't resolve this link. Please open the listing on Facebook, copy the URL from your browser's address bar (it should look like facebook.com/marketplace/item/...), and paste that instead.",
    }, { status: 400 })
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
          resultsLimit: 1,
          includeListingDetails: true,
          ...(process.env.FACEBOOK_COOKIES ? { cookies: JSON.parse(process.env.FACEBOOK_COOKIES) } : {}),
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

  // Map fields from apify~facebook-marketplace-scraper response format
  const title = (raw.listingTitle ?? '') as string
  const descObj = raw.description as { text?: string } | string | null | undefined
  const descText = typeof descObj === 'string' ? descObj : (descObj?.text ?? '') as string
  const priceObj = raw.listingPrice as { amount?: string | number } | null | undefined
  const priceRaw = priceObj?.amount ?? null
  // condition comes as top-level string e.g. "New", or from listingAttributes
  const conditionRaw = (raw.condition as string | null | undefined) ?? null
  const location = (raw.locationText as { text?: string } | null)?.text ?? ''

  // Append listing attributes (e.g. Size, Material, Gemstone) to description
  type Attr = { attribute_name?: string; label?: string }
  const attrs = (raw.listingAttributes as Attr[] | null) ?? []
  const attrLines = attrs
    .filter(a => a.attribute_name && a.label)
    .map(a => `${a.attribute_name}: ${a.label}`)
  const description = attrLines.length
    ? `${descText}\n\nDetails:\n${attrLines.join('\n')}`
    : descText

  const price = parsePrice(priceRaw as string | number | null)

  // Extract first photo URL from listingPhotos[0].image.uri
  type ListingPhoto = { image?: { uri?: string } }
  const listingPhotos = (raw.listingPhotos ?? []) as ListingPhoto[]
  const photoUrl: string | null = listingPhotos[0]?.image?.uri ?? null

  return NextResponse.json({
    name: title,
    description,
    askingPrice: price,
    condition: mapCondition(conditionRaw),
    category: null, // not reliably available from scraper; user selects manually
    location,
    resolvedUrl,
    photoUrl,
  })
}
