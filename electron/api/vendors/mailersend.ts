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
    baseURL: 'https://api.mailersend.com',
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

/** Convert YYYY-MM-DD to Unix timestamp (seconds) at start of day UTC */
function toUnixTimestamp(dateStr: string): number {
  return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
}

/** Convert YYYY-MM-DD to Unix timestamp (seconds) at end of day UTC */
function toUnixTimestampEnd(dateStr: string): number {
  return Math.floor(new Date(dateStr + 'T23:59:59Z').getTime() / 1000)
}

interface MailerSendStatsEntry {
  date: string
  sent?: number
  delivered?: number
  opened?: number
  clicked?: number
  bounced?: number
  spam_complaints?: number
}

export const mailersendConnector: VendorConnector = {
  async validateToken(token: string): Promise<{ accountId: string; accountName: string }> {
    const client = makeClient(token)
    try {
      await client.get('/v1/domains', { params: { limit: 1 } })
      return {
        accountId: `mailersend_${tokenHash(token)}`,
        accountName: 'MailerSend Account',
      }
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
  },

  async getDomains(token: string): Promise<{ id: string; name: string }[]> {
    const client = makeClient(token)
    try {
      const { data } = await client.get('/v1/domains', { params: { limit: 100 } })
      if (!data?.data || !Array.isArray(data.data)) return []
      return data.data.map((d: { id: string; name?: string; domain?: string }) => ({
        id: d.id,
        name: d.name || d.domain || d.id,
      }))
    } catch {
      return []
    }
  },

  async getAggregatedStats(
    token: string,
    startDate: string,
    endDate: string,
    domainId: string | null
  ): Promise<AggregatedStats> {
    const client = makeClient(token)
    try {
      const params: Record<string, string | number | string[]> = {
        date_from: toUnixTimestamp(startDate),
        date_to: toUnixTimestampEnd(endDate),
        'event[]': ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam_complaints'],
        group_by: 'days',
      }
      if (domainId) {
        params.domain_id = domainId
      }

      const { data } = await client.get('/v1/analytics/date', { params })

      const stats: MailerSendStatsEntry[] = data?.data?.stats ?? []
      let sent = 0, delivered = 0, opened = 0,
        clicked = 0, bounced = 0, spam = 0

      for (const entry of stats) {
        sent += entry.sent ?? 0
        delivered += entry.delivered ?? 0
        opened += entry.opened ?? 0
        clicked += entry.clicked ?? 0
        bounced += entry.bounced ?? 0
        spam += entry.spam_complaints ?? 0
      }

      return {
        delivery_count: delivered,
        delivery_rate: safeRate(delivered, sent),
        bounce_count: bounced,
        bounce_rate: safeRate(bounced, sent),
        open_count: opened,
        open_rate: safeRate(opened, delivered),
        click_count: clicked,
        click_rate: safeRate(clicked, delivered),
        spam_count: spam,
        spam_rate: safeRate(spam, delivered),
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
    domainId: string | null
  ): Promise<DailyStats[]> {
    const client = makeClient(token)
    try {
      const params: Record<string, string | number | string[]> = {
        date_from: toUnixTimestamp(startDate),
        date_to: toUnixTimestampEnd(endDate),
        'event[]': ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'spam_complaints'],
        group_by: 'days',
      }
      if (domainId) {
        params.domain_id = domainId
      }

      const { data } = await client.get('/v1/analytics/date', { params })

      const stats: MailerSendStatsEntry[] = data?.data?.stats ?? []

      return stats.map(entry => {
        const sent = entry.sent ?? 0
        const delivered = entry.delivered ?? 0
        const opened = entry.opened ?? 0
        const clicked = entry.clicked ?? 0
        const bounced = entry.bounced ?? 0
        const spam = entry.spam_complaints ?? 0

        return {
          date: entry.date ? entry.date.split('T')[0] : '',
          delivered,
          deliveryRate: safeRate(delivered, sent),
          bounced,
          bounceRate: safeRate(bounced, sent),
          opened,
          openRate: safeRate(opened, delivered),
          clicked,
          clickRate: safeRate(clicked, delivered),
          spam,
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
    domainId: string | null,
    page: number
  ): Promise<EmailEvent[]> {
    const client = makeClient(token)

    // When domainId is null, query the first domain
    let targetDomain = domainId
    if (!targetDomain) {
      const domains = await this.getDomains(token)
      if (domains.length === 0) return []
      targetDomain = domains[0].id
    }

    try {
      const { data } = await client.get(`/v1/activity/${targetDomain}`, {
        params: { limit: 100, page },
      })

      if (!data?.data || !Array.isArray(data.data)) return []

      return data.data.map((item: {
        id: string
        created_at: string
        type: string
        email?: {
          from?: string
          subject?: string
          recipient?: { email?: string }
        }
      }) => ({
        id: item.id,
        timestamp: item.created_at,
        event: item.type,
        recipient: item.email?.recipient?.email ?? '',
        subject: item.email?.subject,
      }))
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && (err.response?.status === 403 || err.response?.status === 404)) {
        return []
      }
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        throw new Error('Rate limit exceeded (429). Please try again later.')
      }
      throw err
    }
  },

  async getSuppressions(token: string): Promise<SuppressionEntry[]> {
    const client = makeClient(token)
    const results: SuppressionEntry[] = []

    const endpoints = [
      { path: '/v1/suppressions/bounces', reason: 'bounce' },
      { path: '/v1/suppressions/unsubscribes', reason: 'unsubscribe' },
      { path: '/v1/suppressions/spam-complaints', reason: 'spam_report' },
    ]

    const settled = await Promise.allSettled(
      endpoints.map(({ path }) =>
        client.get(path, { params: { limit: 500 } })
      )
    )

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]
      const { reason } = endpoints[i]
      if (result.status === 'fulfilled') {
        const items = result.value.data?.data
        if (Array.isArray(items)) {
          for (const entry of items) {
            results.push({
              email: entry.recipient?.email ?? entry.email ?? '',
              reason,
              createdAt: entry.created_at ?? new Date().toISOString(),
            })
          }
        }
      }
    }

    return results
  },
}
