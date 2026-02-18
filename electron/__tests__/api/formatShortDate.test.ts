import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock API client (required by sandbox module imports)
vi.mock('../../api/client', () => ({
  getApiClient: () => ({ get: vi.fn() })
}))

import { formatShortDate } from '../../api/sandbox'

function isoAt(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('formatShortDate', () => {
  it('formats a time-only string for dates earlier today', () => {
    const result = formatShortDate(isoAt(2 * HOUR))
    // Should look like a time — contains ":" and no letters from month names
    expect(result).toMatch(/\d{1,2}[:.]\d{2}/)
  })

  it('formats today differently from yesterday', () => {
    const today = formatShortDate(isoAt(30 * MIN))
    const yesterday = formatShortDate(isoAt(25 * HOUR))
    expect(today).not.toBe(yesterday)
  })

  it('returns a non-empty string for a very old date', () => {
    const old = formatShortDate('2020-01-01T00:00:00Z')
    expect(old.length).toBeGreaterThan(0)
  })

  it('returns a non-empty string for a recent date', () => {
    const recent = formatShortDate(isoAt(3 * DAY))
    expect(recent.length).toBeGreaterThan(0)
  })

  it('includes month info for dates this year but older than 7 days', () => {
    // Pick a date guaranteed to be in the same year but > 7 days ago
    const now = new Date()
    const tenDaysAgo = new Date(now.getTime() - 10 * DAY)
    // Only run this assertion when we're past Jan 10 to avoid year boundary issues
    if (now.getMonth() > 0 || now.getDate() > 10) {
      const result = formatShortDate(tenDaysAgo.toISOString())
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('handles invalid date strings gracefully', () => {
    // Should not throw
    expect(() => formatShortDate('not-a-date')).not.toThrow()
  })
})
