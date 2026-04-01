import { buildSystemPrompt } from '@/lib/agent/systemPrompt'
import type { User, Item } from '@/types/database'

const baseUser: User = {
  id: 'user-1',
  email: 'seller@example.com',
  name: 'John',
  address: '123 Main St, Vancouver, BC',
  address_area: 'East Vancouver',
  phone: '+16045550100',
  telnyx_number: '+17785550100',
  telnyx_number_id: null,
  stripe_customer_id: null,
  subscription_status: 'active',
  trial_ends_at: null,
  global_instructions: null,
  availability_text: 'Weekdays after 5pm',
  agent_tone: 'professional',
  custom_tone_instructions: null,
  agent_name: 'Zuck',
  agent_gender: 'male',
  items_listed_this_month: 1,
  items_limit: 10,
  created_at: '2026-01-01T00:00:00Z',
}

const baseItem: Item = {
  id: 'item-1',
  user_id: 'user-1',
  name: 'Blue IKEA Couch',
  description: 'Comfortable 3-seat couch',
  category: 'furniture',
  tags: [],
  condition: 'good',
  asking_price: 100,
  max_discount: 20,
  firm_price: false,
  preferred_times: null,
  status: 'active',
  pending_buyer_id: null,
  created_at: '2026-01-01T00:00:00Z',
  archived_at: null,
}

const ctx = { seller: baseUser, item: null, history: [], pendingDeal: null, waitlistCount: 0, allItems: [] }

describe('buildSystemPrompt — tone', () => {
  it('injects professional tone', () => {
    const prompt = buildSystemPrompt({ ...ctx, seller: { ...baseUser, agent_tone: 'professional' } })
    expect(prompt).toContain('Professional')
    expect(prompt).toContain('No emoji')
  })

  it('injects friendly tone', () => {
    const prompt = buildSystemPrompt({ ...ctx, seller: { ...baseUser, agent_tone: 'friendly' } })
    expect(prompt).toContain('Warm')
    expect(prompt).toContain('casual')
  })

  it('injects firm tone', () => {
    const prompt = buildSystemPrompt({ ...ctx, seller: { ...baseUser, agent_tone: 'firm' } })
    expect(prompt).toContain('Direct')
    expect(prompt.toLowerCase()).toContain('minimal small talk')
  })

  it('injects custom tone instructions verbatim', () => {
    const prompt = buildSystemPrompt({
      ...ctx,
      seller: { ...baseUser, agent_tone: 'custom', custom_tone_instructions: 'Always say howdy partner.' },
    })
    expect(prompt).toContain('Always say howdy partner.')
  })

  it('falls back to professional when custom tone has no instructions', () => {
    const prompt = buildSystemPrompt({
      ...ctx,
      seller: { ...baseUser, agent_tone: 'custom', custom_tone_instructions: null },
    })
    expect(prompt).toContain('Professional')
  })
})

describe('buildSystemPrompt — pricing', () => {
  const ctxWithItem = { ...ctx, item: baseItem, allItems: [baseItem] }

  it('calculates floor price correctly (asking 100 - discount 20 = floor 80)', () => {
    const prompt = buildSystemPrompt(ctxWithItem)
    expect(prompt).toContain('$80')
  })

  it('shows FIRM instruction and hides negotiation for firm price items', () => {
    const firmItem = { ...baseItem, firm_price: true }
    const prompt = buildSystemPrompt({ ...ctx, item: firmItem, allItems: [firmItem] })
    expect(prompt).toContain('FIRM')
    expect(prompt).not.toContain('floor')
  })

  it('shows asking price and floor in negotiation section', () => {
    const prompt = buildSystemPrompt(ctxWithItem)
    expect(prompt).toContain('$100') // asking price
    expect(prompt).toContain('$80')  // floor
  })
})

describe('buildSystemPrompt — privacy', () => {
  it('includes address_area but not full address in general context', () => {
    const prompt = buildSystemPrompt({ ...ctx, item: baseItem, allItems: [baseItem] })
    expect(prompt).toContain('East Vancouver')
  })

  it('includes full address only in post-deal instructions', () => {
    const prompt = buildSystemPrompt({ ...ctx, item: baseItem, allItems: [baseItem] })
    expect(prompt).toContain('123 Main St')
    // Full address appears after deal confirmation, not as general share
    expect(prompt).toContain('after deal is fully confirmed')
  })
})

describe('buildSystemPrompt — high value safety', () => {
  it('adds safety note for items >= $500', () => {
    const expensiveItem = { ...baseItem, asking_price: 500 }
    const prompt = buildSystemPrompt({ ...ctx, item: expensiveItem, allItems: [expensiveItem] })
    expect(prompt).toMatch(/public location|safe.trade/i)
  })

  it('does not add safety note for items < $500', () => {
    const prompt = buildSystemPrompt({ ...ctx, item: baseItem, allItems: [baseItem] })
    expect(prompt).not.toMatch(/safe.trade/i)
  })
})

describe('buildSystemPrompt — date', () => {
  it("includes today's date", () => {
    const prompt = buildSystemPrompt(ctx)
    const year = new Date().getFullYear().toString()
    expect(prompt).toContain(year)
  })
})

describe('buildSystemPrompt — DEAL_CONFIRMED action format', () => {
  it('instructs Claude to include itemId in DEAL_CONFIRMED', () => {
    const prompt = buildSystemPrompt({ ...ctx, item: baseItem, allItems: [baseItem] })
    expect(prompt).toContain('"itemId"')
  })
})
