import axios, { AxiosInstance } from 'axios'
import { createHash } from 'crypto'
import type {
  VendorConnector,
  AggregatedStats,
  DailyStats,
  EmailEvent,
  SuppressionEntry,
} from '../types'

function makeClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: 'https://api.sendgrid.com',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 15000,
  })
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex').substring(0, 12)
}

function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

interface SendGridMetrics {
  delivered?: number
  bounces?: number
  requests?: number
  unique_opens?: number
  unique_clicks?: number
  spam_reports?: number
  opens?: number
  clicks?: number
}

interface SendGridStatsDay {
  date: string
  stats: { metrics: SendGridMetrics }[]
}

export const sendgridConnector: VendorConnector = {
  async validateToken(token: string): Promise<{ accountId: string; accountName: string }> {
    const client = makeClient(token)
    try {
      // /v3/scopes works with any valid API key regardless of permissions
      await client.get('/v3/scopes')
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          throw new Error('Authentication failed. Check your API token.')
        }
        if (err.response?.status === 429) {
          throw new Error('Rate limit exceeded (429). Please try again later.')
        }
      }
      throw err
    }

    // Try to get account name, fall back gracefully
    let name = 'SendGrid Account'
    try {
      const { data } = await client.get('/v3/user/account')
      const fullName = [data?.first_name, data?.last_name].filter(Boolean).join(' ')
      if (fullName) name = fullName
    } catch {
      // Insufficient permissions for user/account — use default name
    }

    return {
      accountId: `sendgrid_${tokenHash(token)}`,
      accountName: name,
    }
  },

  async getDomains(token: string): Promise<{ id: string; name: string }[]> {
    const client = makeClient(token)
    try {
      const { data } = await client.get('/v3/whitelabel/domains')
      if (!Array.isArray(data)) return []
      return data.map((d: { id: number; domain: string }) => ({
        id: String(d.id),
        name: d.domain,
      }))
    } catch {
      // Insufficient permissions or no domains — not an auth error
      return []
    }
  },

  async getAggregatedStats(
    token: string,
    startDate: string,
    endDate: string,
    _domainId: string | null
  ): Promise<AggregatedStats> {
    const client = makeClient(token)
    // Note: SendGrid v3 has no direct stats-by-domain endpoint.
    // When domainId is provided, we still return account-wide stats.
    // See REQUIREMENTS.md Section 3.2 for this limitation.
    try {
      const { data } = await client.get<SendGridStatsDay[]>('/v3/stats', {
        params: {
          start_date: startDate,
          end_date: endDate,
          aggregated_by: 'day',
          limit: 500,
        },
      })

      let delivered = 0, bounces = 0, requests = 0,
        uniqueOpens = 0, uniqueClicks = 0, spamReports = 0

      for (const day of data) {
        for (const stat of day.stats) {
          const m = stat.metrics
          delivered += m.delivered ?? 0
          bounces += m.bounces ?? 0
          requests += m.requests ?? 0
          uniqueOpens += m.unique_opens ?? 0
          uniqueClicks += m.unique_clicks ?? 0
          spamReports += m.spam_reports ?? 0
        }
      }

      return {
        delivery_count: delivered,
        delivery_rate: safeRate(delivered, requests),
        bounce_count: bounces,
        bounce_rate: safeRate(bounces, requests),
        open_count: uniqueOpens,
        open_rate: safeRate(uniqueOpens, delivered),
        click_count: uniqueClicks,
        click_rate: safeRate(uniqueClicks, delivered),
        spam_count: spamReports,
        spam_rate: safeRate(spamReports, delivered),
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        throw new Error('Rate limit exceeded (429). Please try again later.')
      }
      throw err
    }
  },

  async getDailyStats(
    token: string,
    startDate: string,
    endDate: string,
    _domainId: string | null
  ): Promise<DailyStats[]> {
    const client = makeClient(token)
    try {
      const { data } = await client.get<SendGridStatsDay[]>('/v3/stats', {
        params: {
          start_date: startDate,
          end_date: endDate,
          aggregated_by: 'day',
          limit: 500,
        },
      })

      return data.map(day => {
        let delivered = 0, bounces = 0, requests = 0,
          uniqueOpens = 0, uniqueClicks = 0, spamReports = 0

        for (const stat of day.stats) {
          const m = stat.metrics
          delivered += m.delivered ?? 0
          bounces += m.bounces ?? 0
          requests += m.requests ?? 0
          uniqueOpens += m.unique_opens ?? 0
          uniqueClicks += m.unique_clicks ?? 0
          spamReports += m.spam_reports ?? 0
        }

        return {
          date: day.date,
          delivered,
          deliveryRate: safeRate(delivered, requests),
          bounced: bounces,
          bounceRate: safeRate(bounces, requests),
          opened: uniqueOpens,
          openRate: safeRate(uniqueOpens, delivered),
          clicked: uniqueClicks,
          clickRate: safeRate(uniqueClicks, delivered),
          spam: spamReports,
        }
      })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        throw new Error('Rate limit exceeded (429). Please try again later.')
      }
      throw err
    }
  },

  async getEvents(
    token: string,
    _domainId: string | null,
    page: number
  ): Promise<EmailEvent[]> {
    // SendGrid Email Activity Feed requires a paid add-on.
    // Use a short timeout — without the add-on the endpoint hangs.
    const client = makeClient(token)
    try {
      const limit = 100
      const { data } = await client.get('/v3/messages', {
        params: { limit, query: `last_event_time BETWEEN TIMESTAMP "2000-01-01T00:00:00Z" AND TIMESTAMP "2099-12-31T23:59:59Z"` },
        timeout: 5000,
      })
      if (!data?.messages || !Array.isArray(data.messages)) return []

      return data.messages.map((msg: {
        msg_id: string
        to_email: string
        subject?: string
        last_event_time: string
        status: string
      }) => ({
        id: msg.msg_id,
        timestamp: msg.last_event_time,
        event: msg.status,
        recipient: msg.to_email,
        subject: msg.subject,
      }))
    } catch (err: unknown) {
      // 403/404 = Email Activity Feed not enabled; timeout = add-on not available
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403 || err.response?.status === 404) return []
        if (err.code === 'ECONNABORTED') return []
        if (err.response?.status === 429) {
          throw new Error('Rate limit exceeded (429). Please try again later.')
        }
      }
      throw err
    }
  },

  async getSuppressions(token: string): Promise<SuppressionEntry[]> {
    const client = makeClient(token)
    const results: SuppressionEntry[] = []

    const endpoints = [
      { path: '/v3/suppression/bounces', reason: 'bounce' },
      { path: '/v3/suppression/unsubscribes', reason: 'unsubscribe' },
      { path: '/v3/suppression/spam_reports', reason: 'spam_report' },
    ]

    const settled = await Promise.allSettled(
      endpoints.map(({ path }) =>
        client.get(path, { params: { limit: 500 } })
      )
    )

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]
      const { reason } = endpoints[i]
      if (result.status === 'fulfilled' && Array.isArray(result.value.data)) {
        for (const entry of result.value.data) {
          results.push({
            email: entry.email,
            reason,
            // SendGrid timestamps are Unix seconds
            createdAt: new Date((entry.created ?? 0) * 1000).toISOString(),
          })
        }
      }
      // 404 on optional endpoints: swallowed by allSettled
    }

    return results
  },
}
