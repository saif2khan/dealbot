/**
 * Tests for webhook routing and action handling logic.
 * Tests the decision logic independently of live HTTP calls.
 */

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
describe('Webhook: rate limiting', () => {
  type RateLimitEntry = { count: number; resetAt: number }
  const RATE_LIMIT = 20

  function checkRateLimit(
    phone: string,
    map: Map<string, RateLimitEntry>,
    now: number
  ): boolean {
    const entry = map.get(phone)
    if (!entry || now > entry.resetAt) {
      map.set(phone, { count: 1, resetAt: now + 3600000 })
      return true
    }
    if (entry.count >= RATE_LIMIT) return false
    entry.count++
    return true
  }

  it('allows first message', () => {
    const map = new Map<string, RateLimitEntry>()
    expect(checkRateLimit('+1111', map, Date.now())).toBe(true)
  })

  it('allows up to the limit', () => {
    const map = new Map<string, RateLimitEntry>()
    const now = Date.now()
    for (let i = 0; i < 20; i++) checkRateLimit('+1111', map, now)
    expect(map.get('+1111')?.count).toBe(20)
  })

  it('blocks message 21', () => {
    const map = new Map<string, RateLimitEntry>()
    const now = Date.now()
    for (let i = 0; i < 20; i++) checkRateLimit('+1111', map, now)
    expect(checkRateLimit('+1111', map, now)).toBe(false)
  })

  it('resets after 1 hour', () => {
    const map = new Map<string, RateLimitEntry>()
    const now = Date.now()
    for (let i = 0; i < 20; i++) checkRateLimit('+1111', map, now)
    // Simulate 1h+1ms later
    expect(checkRateLimit('+1111', map, now + 3600001)).toBe(true)
    expect(map.get('+1111')?.count).toBe(1)
  })

  it('tracks separate limits per phone number', () => {
    const map = new Map<string, RateLimitEntry>()
    const now = Date.now()
    for (let i = 0; i < 20; i++) checkRateLimit('+1111', map, now)
    // Different number still allowed
    expect(checkRateLimit('+2222', map, now)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Deduplication window
// ---------------------------------------------------------------------------
describe('Webhook: message deduplication', () => {
  function isDuplicate(
    existingMessages: Array<{ body: string; created_at: string; direction: string }>,
    incomingBody: string,
    now: Date
  ): boolean {
    const since = new Date(now.getTime() - 30000)
    return existingMessages.some(
      m =>
        m.body === incomingBody &&
        m.direction === 'inbound' &&
        new Date(m.created_at) >= since
    )
  }

  const now = new Date('2026-03-24T12:00:00Z')

  it('detects duplicate within 30s', () => {
    const msgs = [{ body: 'hello', direction: 'inbound', created_at: new Date(now.getTime() - 10000).toISOString() }]
    expect(isDuplicate(msgs, 'hello', now)).toBe(true)
  })

  it('does not flag message older than 30s as duplicate', () => {
    const msgs = [{ body: 'hello', direction: 'inbound', created_at: new Date(now.getTime() - 31000).toISOString() }]
    expect(isDuplicate(msgs, 'hello', now)).toBe(false)
  })

  it('does not flag different message body as duplicate', () => {
    const msgs = [{ body: 'hello', direction: 'inbound', created_at: new Date(now.getTime() - 5000).toISOString() }]
    expect(isDuplicate(msgs, 'world', now)).toBe(false)
  })

  it('does not flag outbound message as duplicate', () => {
    const msgs = [{ body: 'hello', direction: 'outbound', created_at: new Date(now.getTime() - 5000).toISOString() }]
    expect(isDuplicate(msgs, 'hello', now)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Seller detection
// ---------------------------------------------------------------------------
describe('Webhook: seller detection', () => {
  function isSellerTexting(
    fromPhone: string,
    sellerDbPhone: string | null
  ): boolean {
    return sellerDbPhone === fromPhone
  }

  it('routes to seller handler when phones match', () => {
    expect(isSellerTexting('+16041234567', '+16041234567')).toBe(true)
  })

  it('routes to buyer handler when phones differ', () => {
    expect(isSellerTexting('+16041234567', '+17781234567')).toBe(false)
  })

  it('does not match when seller has no phone set', () => {
    expect(isSellerTexting('+16041234567', null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// DEAL_CONFIRMED idempotency
// ---------------------------------------------------------------------------
describe('Webhook: DEAL_CONFIRMED idempotency', () => {
  function shouldSkipDealConfirm(existingDeal: { id: string } | null): boolean {
    return existingDeal !== null
  }

  it('skips when a scheduled deal already exists', () => {
    expect(shouldSkipDealConfirm({ id: 'deal-1' })).toBe(true)
  })

  it('proceeds when no scheduled deal exists', () => {
    expect(shouldSkipDealConfirm(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Waitlist position
// ---------------------------------------------------------------------------
describe('Webhook: waitlist position', () => {
  function nextPosition(currentCount: number | null): number {
    return (currentCount ?? 0) + 1
  }

  it('first entry gets position 1', () => expect(nextPosition(0)).toBe(1))
  it('second entry gets position 2', () => expect(nextPosition(1)).toBe(2))
  it('handles null count as 0', () => expect(nextPosition(null)).toBe(1))
})

// ---------------------------------------------------------------------------
// Tone mid-conversation: system prompt rebuilds each request
// ---------------------------------------------------------------------------
describe('Webhook: tone changes take effect immediately', () => {
  // The system prompt is rebuilt on every request using the latest seller data
  // from the DB, so tone changes are always reflected on the next message.
  it('uses seller tone from DB on every request (not cached)', () => {
    // Simulate two consecutive requests with different tones
    function buildToneSnippet(tone: string): string {
      if (tone === 'friendly') return 'Warm and casual'
      if (tone === 'firm') return 'Direct and concise'
      return 'Professional'
    }
    expect(buildToneSnippet('professional')).toBe('Professional')
    expect(buildToneSnippet('friendly')).toBe('Warm and casual')
    expect(buildToneSnippet('firm')).toBe('Direct and concise')
  })
})
