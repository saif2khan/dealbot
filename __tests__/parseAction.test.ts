import { parseAction } from '@/lib/agent/actions'

describe('parseAction', () => {
  it('parses ITEM_IDENTIFIED', () => {
    const raw = 'Sure, let me help!\n<ACTION>{"type":"ITEM_IDENTIFIED","itemId":"abc-123"}</ACTION>'
    const { text, action } = parseAction(raw)
    expect(action).toEqual({ type: 'ITEM_IDENTIFIED', itemId: 'abc-123' })
    expect(text).toBe('Sure, let me help!')
  })

  it('parses DEAL_CONFIRMED with itemId', () => {
    const raw = 'Great, see you then!\n<ACTION>{"type":"DEAL_CONFIRMED","itemId":"item-1","agreedPrice":80,"buyerName":"Alice","meetupDate":"2026-03-29","meetupTime":"15:00","meetupLocation":"123 Main St"}</ACTION>'
    const { text, action } = parseAction(raw)
    expect(action?.type).toBe('DEAL_CONFIRMED')
    if (action?.type === 'DEAL_CONFIRMED') {
      expect(action.itemId).toBe('item-1')
      expect(action.agreedPrice).toBe(80)
      expect(action.buyerName).toBe('Alice')
      expect(action.meetupDate).toBe('2026-03-29')
      expect(action.meetupTime).toBe('15:00')
      expect(action.meetupLocation).toBe('123 Main St')
    }
    expect(text).toBe('Great, see you then!')
  })

  it('parses WAITLIST_JOIN', () => {
    const raw = 'Added you to the waitlist.\n<ACTION>{"type":"WAITLIST_JOIN","buyerName":"Bob","offeredPrice":70}</ACTION>'
    const { action } = parseAction(raw)
    expect(action).toEqual({ type: 'WAITLIST_JOIN', buyerName: 'Bob', offeredPrice: 70 })
  })

  it('parses ESCALATE', () => {
    const raw = 'Let me check with the seller.\n<ACTION>{"type":"ESCALATE","reason":"custom paint job question","lastBuyerMessage":"can you repaint it?"}</ACTION>'
    const { action } = parseAction(raw)
    expect(action?.type).toBe('ESCALATE')
    if (action?.type === 'ESCALATE') {
      expect(action.reason).toBe('custom paint job question')
    }
  })

  it('returns null action when no ACTION block present', () => {
    const raw = 'Hello! How can I help you today?'
    const { text, action } = parseAction(raw)
    expect(action).toBeNull()
    expect(text).toBe('Hello! How can I help you today?')
  })

  it('returns null action for malformed JSON in ACTION block', () => {
    const raw = 'Sure.\n<ACTION>{broken json here}</ACTION>'
    const { text, action } = parseAction(raw)
    expect(action).toBeNull()
    expect(text).toBe('Sure.')
  })

  it('strips ACTION block from response text', () => {
    const raw = 'Sounds good!\n<ACTION>{"type":"ITEM_IDENTIFIED","itemId":"x"}</ACTION>'
    const { text } = parseAction(raw)
    expect(text).not.toContain('<ACTION>')
    expect(text).not.toContain('ITEM_IDENTIFIED')
  })
})
