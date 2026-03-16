import axios, { AxiosInstance } from 'axios'
import { createHash } from 'crypto'
import type {
  VendorConnector,
  AggregatedStats,
  DailyStats,
  EmailEvent,
  SuppressionEntry,
} from '../types'

const POSTMARK_BASE_URL = 'https://api.postmarkapp.com'

function makeAccountClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: POSTMARK_BASE_URL,
    headers: {
      'X-Postmark-Account-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  })
}

function makeServerClient(serverToken: string): AxiosInstance {
  return axios.create({
    baseURL: POSTMARK_BASE_URL,
    headers: {
      'X-Postmark-Server-Token': serverToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  })
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex').substring(0, 12)
}

function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

/**
 * Postmark connector.
 *
 * Postmark separates account-level tokens from server-level tokens.
 * - Account token: used for server listing and validation (getDomains, validateToken).
 * - Server token: required for stats, events. Passed via secondaryToken.
 *
 * When no server token is available, stats return zero-filled responses and events return [].
 *
 * Note: the connector accepts the account token as `token` and the server token
 * as `secondaryToken`. However, VendorConnector interface only has `token`.
 * The IPC handler passes the server token concatenated as "accountToken::serverToken"
 * when a secondary token is available, and the connector splits them.
 */

function splitTokens(token: string): { accountToken: string; serverToken: string | null } {
  const sep = token.indexOf('::')
  if (sep === -1) return { accountToken: token, serverToken: null }
  return { accountToken: token.substring(0, sep), serverToken: token.substring(sep + 2) || null }
}

export const postmarkConnector: VendorConnector = {
  async validateToken(token: string): Promise<{ accountId: string; accountName: string }> {
    const { accountToken } = splitTokens(token)
    const client = makeAccountClient(accountToken)
    try {
      await client.get('/servers', { params: { count: 1, offset: 0 } })
      return {
        accountId: `postmark_${tokenHash(accountToken)}`,
        accountName: 'Postmark Account',
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
    const { accountToken } = splitTokens(token)
    const client = makeAccountClient(accountToken)
    try {
      const { data } = await client.get('/servers', { params: { count: 100, offset: 0 } })
      if (!data?.Servers || !Array.isArray(data.Servers)) return []
      return data.Servers.map((s: { ID: number; Name: string }) => ({
        id: String(s.ID),
        name: s.Name,
      }))
    } catch {
      return []
    }
  },

  async getAggregatedStats(
    token: string,
    startDate: string,
    endDate: string,
    _domainId: string | null
  ): Promise<AggregatedStats> {
    const { serverToken } = splitTokens(token)
    if (!serverToken) return emptyStats()

    const client = makeServerClient(serverToken)
    try {
      const { data } = await client.get('/stats/outbound', {
        params: { fromdate: startDate, todate: endDate },
      })

      const sent = data?.Sent ?? 0
      const bounced = data?.Bounced ?? 0
      const uniqueOpens = data?.UniqueOpens ?? 0
      const spam = data?.SpamComplaints ?? 0

      return {
        delivery_count: sent - bounced,
        delivery_rate: safeRate(sent - bounced, sent),
        bounce_count: bounced,
        bounce_rate: (data?.BounceRate ?? 0) / 100,
        open_count: uniqueOpens,
        open_rate: safeRate(uniqueOpens, sent),
        click_count: 0, // Postmark outbound overview does not break out clicks separately
        click_rate: 0,
        spam_count: spam,
        spam_rate: (data?.SpamComplaintsRate ?? 0) / 100,
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
    const { serverToken } = splitTokens(token)
    if (!serverToken) return []

    const client = makeServerClient(serverToken)

    // Postmark has no daily breakdown endpoint; we make one request per day.
    // Cap at 30 days. Batch in chunks of 5 with 200ms delay between chunks.
    const days = generateDateRange(startDate, endDate).slice(0, 30)
    const results: DailyStats[] = []

    for (let i = 0; i < days.length; i += 5) {
      const batch = days.slice(i, i + 5)
      const batchResults = await Promise.allSettled(
        batch.map(day =>
          client.get('/stats/outbound', {
            params: { fromdate: day, todate: day },
          })
        )
      )

      for (let j = 0; j < batchResults.length; j++) {
        const r = batchResults[j]
        const day = batch[j]
        if (r.status === 'fulfilled') {
          const d = r.value.data
          const sent = d?.Sent ?? 0
          const bounced = d?.Bounced ?? 0
          const uniqueOpens = d?.UniqueOpens ?? 0
          const spam = d?.SpamComplaints ?? 0

          results.push({
            date: day,
            delivered: sent - bounced,
            deliveryRate: safeRate(sent - bounced, sent),
            bounced,
            bounceRate: (d?.BounceRate ?? 0) / 100,
            opened: uniqueOpens,
            openRate: safeRate(uniqueOpens, sent),
            clicked: 0,
            clickRate: 0,
            spam,
          })
        } else {
          results.push({
            date: day,
            delivered: 0, deliveryRate: 0,
            bounced: 0, bounceRate: 0,
            opened: 0, openRate: 0,
            clicked: 0, clickRate: 0,
            spam: 0,
          })
        }
      }

      // 200ms delay between chunks to avoid rate limits
      if (i + 5 < days.length) {
        await delay(200)
      }
    }

    return results
  },

  async getEvents(
    token: string,
    _domainId: string | null,
    page: number
  ): Promise<EmailEvent[]> {
    const { serverToken } = splitTokens(token)
    if (!serverToken) return []

    const client = makeServerClient(serverToken)
    try {
      const offset = (page - 1) * 100
      const { data } = await client.get('/messages/outbound', {
        params: { count: 100, offset },
      })

      if (!data?.Messages || !Array.isArray(data.Messages)) return []

      return data.Messages.map((msg: {
        MessageID: string
        To: Array<{ Email: string }> | string
        Subject: string
        Status: string
        ReceivedAt: string
      }) => ({
        id: msg.MessageID,
        timestamp: msg.ReceivedAt,
        event: msg.Status,
        recipient: Array.isArray(msg.To)
          ? msg.To.map((t: { Email: string }) => t.Email).join(', ')
          : String(msg.To),
        subject: msg.Subject,
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

  async getSuppressions(): Promise<SuppressionEntry[]> {
    // Postmark does not expose a general suppression list via the standard API.
    return []
  },
}

function emptyStats(): AggregatedStats {
  return {
    delivery_count: 0, delivery_rate: 0,
    bounce_count: 0, bounce_rate: 0,
    open_count: 0, open_rate: 0,
    click_count: 0, click_rate: 0,
    spam_count: 0, spam_rate: 0,
  }
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
