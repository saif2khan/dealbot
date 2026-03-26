import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!
const ACTOR_ID = 'apify~facebook-marketplace-scraper'

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

/** Parse price from various formats: "$150", "150", "CAD 150", "Free" */
function parsePrice(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return raw
  const cleaned = raw.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function mapApifyResult(raw: Record<string, unknown>) {
  const title = (raw.listingTitle ?? '') as string
  const descObj = raw.description as { text?: string } | string | null | undefined
  const descText = typeof descObj === 'string' ? descObj : (descObj?.text ?? '') as string
  const priceObj = raw.listingPrice as { amount?: string | number } | null | undefined
  const conditionRaw = (raw.condition as string | null | undefined) ?? null
  const location = (raw.locationText as { text?: string } | null)?.text ?? ''

  type Attr = { attribute_name?: string; label?: string }
  const attrs = (raw.listingAttributes as Attr[] | null) ?? []
  const attrLines = attrs
    .filter(a => a.attribute_name && a.label)
    .map(a => `${a.attribute_name}: ${a.label}`)
  const description = attrLines.length
    ? `${descText}\n\nDetails:\n${attrLines.join('\n')}`
    : descText

  type ListingPhoto = { image?: { uri?: string } }
  const listingPhotos = (raw.listingPhotos ?? []) as ListingPhoto[]
  const photoUrl: string | null = listingPhotos[0]?.image?.uri ?? null

  return {
    name: title,
    description,
    askingPrice: parsePrice(priceObj?.amount ?? null),
    condition: mapCondition(conditionRaw),
    category: null,
    location,
    photoUrl,
  }
}

/** POST — start an async Apify run, return runId immediately */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url } = await request.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  if (!url.includes('facebook.com')) {
    return NextResponse.json({ error: 'Please enter a Facebook Marketplace URL.' }, { status: 400 })
  }

  const apifyRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&memory=512`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url }],
        resultsLimit: 1,
        includeListingDetails: true,
      }),
    }
  )

  if (!apifyRes.ok) {
    console.error('[scrape] Failed to start Apify run:', await apifyRes.text())
    return NextResponse.json({ error: 'Failed to start scraper.' }, { status: 502 })
  }

  const apifyJson = await apifyRes.json() as { data?: { id?: string } }
  const runId = apifyJson?.data?.id

  if (!runId) {
    return NextResponse.json({ error: 'No run ID returned from scraper.' }, { status: 502 })
  }

  return NextResponse.json({ runId })
}

/** GET — poll run status; return mapped item data when ready */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const runId = request.nextUrl.searchParams.get('runId')
  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

  const statusRes = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
  )

  if (!statusRes.ok) {
    return NextResponse.json({ error: 'Failed to check run status.' }, { status: 502 })
  }

  const statusJson = await statusRes.json() as {
    data?: { status?: string; defaultDatasetId?: string }
  }
  const runStatus = statusJson?.data?.status

  if (runStatus === 'RUNNING' || runStatus === 'READY') {
    return NextResponse.json({ status: 'running' })
  }

  if (runStatus !== 'SUCCEEDED') {
    return NextResponse.json({ error: `Scraper ${runStatus?.toLowerCase() ?? 'failed'}. Try again.` }, { status: 422 })
  }

  const datasetId = statusJson?.data?.defaultDatasetId
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=1`
  )
  const items = await itemsRes.json() as Record<string, unknown>[]

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No listing data found. Make sure the URL points to a specific item.' }, { status: 404 })
  }

  const raw = items[0]

  if (raw.error) {
    return NextResponse.json({
      error: `Could not read listing: ${(raw.errorDescription as string) ?? (raw.error as string)}. Make sure the listing is public.`,
    }, { status: 422 })
  }

  return NextResponse.json({ status: 'done', ...mapApifyResult(raw) })
}
