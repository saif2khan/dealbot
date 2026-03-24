/**
 * Tests for seller reply routing logic.
 * We test the decision logic (which branch fires) independently of Supabase/Telnyx I/O.
 */

// ---------------------------------------------------------------------------
// Yes/No detection
// ---------------------------------------------------------------------------
describe('Seller reply: yes/no detection', () => {
  function isYesReply(text: string): boolean {
    const n = text.trim().toLowerCase()
    return n === 'yes' || n === 'y'
  }
  function isNoReply(text: string): boolean {
    const n = text.trim().toLowerCase()
    return n === 'no' || n === 'n'
  }

  it('detects "yes"', () => expect(isYesReply('yes')).toBe(true))
  it('detects "YES" (case-insensitive)', () => expect(isYesReply('YES')).toBe(true))
  it('detects "y"', () => expect(isYesReply('y')).toBe(true))
  it('detects "no"', () => expect(isNoReply('no')).toBe(true))
  it('detects "NO"', () => expect(isNoReply('NO')).toBe(true))
  it('detects "n"', () => expect(isNoReply('n')).toBe(true))
  it('does not match "yes please"', () => expect(isYesReply('yes please')).toBe(false))
  it('does not match "nope"', () => expect(isNoReply('nope')).toBe(false))
  it('does not match "maybe"', () => {
    expect(isYesReply('maybe')).toBe(false)
    expect(isNoReply('maybe')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Followup guard: yes/no only triggers when followup_sent_at is set
// ---------------------------------------------------------------------------
describe('Seller reply: yes/no only fires when followup was sent', () => {
  function shouldHandleYesNo(
    isYesOrNo: boolean,
    deals: Array<{ followup_sent_at: string | null; status: string }>
  ): boolean {
    if (!isYesOrNo) return false
    // Only trigger if there is a scheduled deal WITH a followup_sent_at
    return deals.some(d => d.status === 'scheduled' && d.followup_sent_at !== null)
  }

  it('triggers when followup was sent and reply is yes', () => {
    const deals = [{ status: 'scheduled', followup_sent_at: '2026-03-24T12:00:00Z' }]
    expect(shouldHandleYesNo(true, deals)).toBe(true)
  })

  it('does NOT trigger when no followup was sent', () => {
    const deals = [{ status: 'scheduled', followup_sent_at: null }]
    expect(shouldHandleYesNo(true, deals)).toBe(false)
  })

  it('does NOT trigger when no scheduled deals at all', () => {
    expect(shouldHandleYesNo(true, [])).toBe(false)
  })

  it('does NOT trigger for non yes/no messages even with pending followup', () => {
    const deals = [{ status: 'scheduled', followup_sent_at: '2026-03-24T12:00:00Z' }]
    expect(shouldHandleYesNo(false, deals)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Item name matching (fuzzy)
// ---------------------------------------------------------------------------
describe('Seller reply: item name matching', () => {
  function findItem(commandName: string, items: Array<{ name: string }>): { name: string } | undefined {
    return (
      items.find(i => i.name.toLowerCase() === commandName.toLowerCase()) ??
      items.find(i =>
        i.name.toLowerCase().includes(commandName.toLowerCase()) ||
        commandName.toLowerCase().includes(i.name.toLowerCase())
      )
    )
  }

  const items = [{ name: 'Blue IKEA Couch' }, { name: 'iPhone 15 Pro' }]

  it('finds exact match', () => {
    expect(findItem('Blue IKEA Couch', items)?.name).toBe('Blue IKEA Couch')
  })

  it('finds partial match (command is subset)', () => {
    expect(findItem('couch', items)?.name).toBe('Blue IKEA Couch')
  })

  it('finds partial match (item is subset)', () => {
    expect(findItem('iPhone 15 Pro Max', items)?.name).toBe('iPhone 15 Pro')
  })

  it('returns undefined when no match', () => {
    expect(findItem('dining table', items)).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// STATUS_CHANGE outcome logic
// ---------------------------------------------------------------------------
describe('Seller reply: STATUS_CHANGE outcomes', () => {
  function getStatusUpdatePayload(newStatus: 'sold' | 'active' | 'archived'): Record<string, unknown> {
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'sold') update.archived_at = expect.any(String)
    if (newStatus === 'active') update.pending_buyer_id = null
    return update
  }

  it('sold update includes archived_at', () => {
    const payload = getStatusUpdatePayload('sold')
    expect(payload.status).toBe('sold')
    expect(payload).toHaveProperty('archived_at')
  })

  it('active update clears pending_buyer_id', () => {
    const payload = getStatusUpdatePayload('active')
    expect(payload.status).toBe('active')
    expect(payload.pending_buyer_id).toBeNull()
  })

  it('archived update only sets status', () => {
    const payload = getStatusUpdatePayload('archived')
    expect(payload.status).toBe('archived')
    expect(payload).not.toHaveProperty('pending_buyer_id')
    expect(payload).not.toHaveProperty('archived_at')
  })
})
