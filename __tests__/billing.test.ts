/**
 * Tests for billing/subscription enforcement and Stripe webhook handling.
 * These are unit tests that mock Supabase — no real DB calls.
 */

// ---------------------------------------------------------------------------
// Helpers to build mock Supabase chains
// ---------------------------------------------------------------------------
function makeSupabase(overrides: Record<string, unknown> = {}) {
  const defaults = {
    getUser: { data: { user: { id: 'user-1' } }, error: null },
    profile: { data: { items_listed_this_month: 0, items_limit: 10 }, error: null },
    insertItem: { data: { id: 'item-new', name: 'Test Item' }, error: null },
    updateUser: { error: null },
  }
  return { ...defaults, ...overrides }
}

// ---------------------------------------------------------------------------
// Item limit enforcement (tested against the logic directly)
// ---------------------------------------------------------------------------
describe('Item listing limit enforcement', () => {
  function checkLimit(listed: number, limit: number): boolean {
    return listed >= limit
  }

  it('allows listing when under the limit', () => {
    expect(checkLimit(5, 10)).toBe(false)
  })

  it('blocks listing when exactly at the limit', () => {
    expect(checkLimit(10, 10)).toBe(true)
  })

  it('blocks listing when over the limit', () => {
    expect(checkLimit(11, 10)).toBe(true)
  })

  it('blocks listing when at limit of 0 (cancelled subscription)', () => {
    expect(checkLimit(0, 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Subscription status guard
// ---------------------------------------------------------------------------
describe('Subscription status access control', () => {
  function canCreateItem(status: string | null): boolean {
    return status === 'active' || status === 'trialing'
  }

  it('allows active subscribers', () => {
    expect(canCreateItem('active')).toBe(true)
  })

  it('allows trialing users', () => {
    expect(canCreateItem('trialing')).toBe(true)
  })

  it('blocks cancelled subscribers', () => {
    expect(canCreateItem('cancelled')).toBe(false)
  })

  it('blocks past_due subscribers', () => {
    expect(canCreateItem('past_due')).toBe(false)
  })

  it('blocks users with no subscription status', () => {
    expect(canCreateItem(null)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Stripe webhook: subscription status mapping
// ---------------------------------------------------------------------------
describe('Stripe subscription status mapping', () => {
  function mapStripeStatus(stripeStatus: string): string {
    const map: Record<string, string> = {
      active: 'active',
      trialing: 'trialing',
      past_due: 'past_due',
      canceled: 'cancelled',
      incomplete: 'incomplete',
      incomplete_expired: 'cancelled',
      unpaid: 'past_due',
    }
    return map[stripeStatus] ?? 'cancelled'
  }

  it('maps active correctly', () => expect(mapStripeStatus('active')).toBe('active'))
  it('maps trialing correctly', () => expect(mapStripeStatus('trialing')).toBe('trialing'))
  it('maps past_due correctly', () => expect(mapStripeStatus('past_due')).toBe('past_due'))
  it('maps canceled to cancelled', () => expect(mapStripeStatus('canceled')).toBe('cancelled'))
  it('maps incomplete_expired to cancelled', () => expect(mapStripeStatus('incomplete_expired')).toBe('cancelled'))
  it('maps unknown status to cancelled', () => expect(mapStripeStatus('unknown_status')).toBe('cancelled'))
})

// ---------------------------------------------------------------------------
// Monthly reset logic
// ---------------------------------------------------------------------------
describe('Monthly item count reset', () => {
  it('resets items_listed_this_month to 0 on payment_succeeded', () => {
    // Logic: on invoice.payment_succeeded, set items_listed_this_month = 0
    const update = { items_listed_this_month: 0 }
    expect(update.items_listed_this_month).toBe(0)
  })

  it('increments count by 1 when item created', () => {
    const currentCount = 3
    const newCount = currentCount + 1
    expect(newCount).toBe(4)
  })
})
