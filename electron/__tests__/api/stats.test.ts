import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
vi.mock('../../api/client', () => ({
  getApiClient: () => ({ get: mockGet })
}))

import { getStreamSummaries, getDailyStats } from '../../api/stats'

beforeEach(() => {
  mockGet.mockReset()
})

// ── getStreamSummaries ──

describe('getStreamSummaries', () => {
  it('calculates delivery rate from aggregated stats', async () => {
    // getSendingDomains
    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, domain_name: 'example.com' }
        ]
      }
    })
    // getAggregatedStats for domain 1
    mockGet.mockResolvedValueOnce({
      data: {
        delivery_count: 90,
        delivery_rate: 0.9,
        bounce_count: 10,
        bounce_rate: 0.1,
        open_count: 50,
        open_rate: 0.5,
        click_count: 20,
        click_rate: 0.2,
        spam_count: 2,
        spam_rate: 0.02
      }
    })

    const summaries = await getStreamSummaries(1)

    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      id: '1',
      name: 'example.com',
      sentCount: 100, // delivery_count + bounce_count
      deliveryRate: 90 // delivery_rate * 100
    })
  })

  it('returns zero stats when per-domain stats fail', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: 2, domain_name: 'fail.com' }
        ]
      }
    })
    // Stats request fails
    mockGet.mockRejectedValueOnce(new Error('API error'))

    const summaries = await getStreamSummaries(1)

    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      id: '2',
      name: 'fail.com',
      sentCount: 0,
      deliveryRate: null
    })
  })

  it('returns empty array when getSendingDomains fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'))

    const summaries = await getStreamSummaries(1)
    expect(summaries).toEqual([])
  })
})

// ── getDailyStats ──

describe('getDailyStats', () => {
  it('flattens nested stats to flat daily objects', async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        {
          date: '2025-01-15',
          stats: {
            delivery_count: 80,
            delivery_rate: 0.8,
            bounce_count: 5,
            bounce_rate: 0.05,
            open_count: 40,
            open_rate: 0.4,
            click_count: 15,
            click_rate: 0.15,
            spam_count: 1,
            spam_rate: 0.01
          }
        }
      ]
    })

    const result = await getDailyStats(1, '2025-01-15', '2025-01-15')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      date: '2025-01-15',
      delivered: 80,
      deliveryRate: 0.8,
      bounced: 5,
      bounceRate: 0.05,
      opened: 40,
      openRate: 0.4,
      clicked: 15,
      clickRate: 0.15,
      spam: 1
    })
  })
})
