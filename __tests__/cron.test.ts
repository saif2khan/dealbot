/**
 * Tests for the no-show follow-up cron logic.
 * Uses relative times to avoid timezone issues.
 */

function isOverdueForFollowup(meetupDate: string, meetupTime: string, now: Date): boolean {
  const meetupDatetime = new Date(`${meetupDate}T${meetupTime}`)
  if (isNaN(meetupDatetime.getTime())) return false
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  return meetupDatetime.getTime() <= oneHourAgo.getTime()
}

function isOverdueForAutoResolve(followupSentAt: string, now: Date): boolean {
  const sent = new Date(followupSentAt)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return sent.getTime() <= oneDayAgo.getTime()
}

/** Format a Date as YYYY-MM-DD in local time (matches how the cron builds datetime strings) */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format a Date as HH:MM in local time */
function toLocalTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

describe('Cron: follow-up trigger', () => {
  const now = new Date()

  it('triggers follow-up for meetup 2h ago', () => {
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    expect(isOverdueForFollowup(toLocalDateString(twoHoursAgo), toLocalTimeString(twoHoursAgo), now)).toBe(true)
  })

  it('triggers follow-up for meetup exactly 1h ago', () => {
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    expect(isOverdueForFollowup(toLocalDateString(oneHourAgo), toLocalTimeString(oneHourAgo), now)).toBe(true)
  })

  it('does NOT trigger for meetup 30min ago', () => {
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000)
    expect(isOverdueForFollowup(toLocalDateString(thirtyMinsAgo), toLocalTimeString(thirtyMinsAgo), now)).toBe(false)
  })

  it('does NOT trigger for meetup in the future', () => {
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    expect(isOverdueForFollowup(toLocalDateString(twoHoursFromNow), toLocalTimeString(twoHoursFromNow), now)).toBe(false)
  })

  it('returns false for invalid date/time', () => {
    expect(isOverdueForFollowup('invalid', 'bad', now)).toBe(false)
  })
})

describe('Cron: auto-resolve after 24h no response', () => {
  const now = new Date()

  it('auto-resolves when followup was sent 25h ago', () => {
    const sent = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
    expect(isOverdueForAutoResolve(sent, now)).toBe(true)
  })

  it('auto-resolves when followup was sent exactly 24h ago', () => {
    const sent = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    expect(isOverdueForAutoResolve(sent, now)).toBe(true)
  })

  it('does NOT auto-resolve when followup was sent 12h ago', () => {
    const sent = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
    expect(isOverdueForAutoResolve(sent, now)).toBe(false)
  })

  it('does NOT auto-resolve when followup was just sent', () => {
    expect(isOverdueForAutoResolve(now.toISOString(), now)).toBe(false)
  })
})

describe('Cron: authorization', () => {
  function isAuthorized(headerValue: string | null, secret: string): boolean {
    if (!secret) return true
    return headerValue === `Bearer ${secret}`
  }

  it('allows request with correct secret', () => {
    expect(isAuthorized('Bearer my-secret', 'my-secret')).toBe(true)
  })

  it('rejects request with wrong secret', () => {
    expect(isAuthorized('Bearer wrong', 'my-secret')).toBe(false)
  })

  it('rejects request with no auth header', () => {
    expect(isAuthorized(null, 'my-secret')).toBe(false)
  })

  it('allows any request when no secret is configured', () => {
    expect(isAuthorized(null, '')).toBe(true)
  })
})
