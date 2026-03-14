import axios, { AxiosInstance } from 'axios'
import { createHash } from 'crypto'
import type {
  VendorConnector,
  AggregatedStats,
  DailyStats,
  EmailEvent,
  SuppressionEntry,
} from '../types'

// US region only — EU region (api.eu.mailgun.net) is not auto-detected.
const MAILGUN_BASE_URL = 'https://api.mailgun.net'

function makeClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: MAILGUN_BASE_URL,
    auth: { username: 'api', password: token },
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  })
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex').substring(0, 12)
}

function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

interface MailgunStatsItem {
  time: string
  accepted?: { total?: number }
  delivered?: { total?: number; smtp?: number; http?: number }
  failed?: { permanent?: { total?: number }; temporary?: { total?: number } }
  opened?: { total?: number }
  clicked?: { total?: number }
  complained?: { total?: number }
}

export const mailgunConnector: VendorConnector = {
  async validateToken(token: string): Promise<{ accountId: string; accountName: string }> {
    const client = makeClient(token)
    try {
      await client.get('/v3/domains', { params: { limit: 1 } })
      return {
        accountId: `mailgun_${tokenHash(token)}`,
        accountName: 'Mailgun Account',
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
      const { data } = await client.get('/v3/domains', { params: { limit: 100 } })
      if (!data?.items || !Array.isArray(data.items)) return []
      return data.items.map((d: { name: string }) => ({
        id: d.name,
        name: d.name,
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

    if (domainId) {
      return fetchDomainStats(client, domainId, startDate, endDate)
    }

    // Account-wide: iterate all domains, sum. Cap at 10 domains.
    const domains = await this.getDomains(token)
    if (domains.length === 0) {
      return emptyStats()
    }

    const capped = domains.slice(0, 10)
    // Concurrency limit: batches of 3
    const allStats: AggregatedStats[] = []
    for (let i = 0; i < capped.length; i += 3) {
      const batch = capped.slice(i, i + 3)
      const batchResults = await Promise.allSettled(
        batch.map(d => fetchDomainStats(client, d.id, startDate, endDate))
      )
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          allStats.push(r.value)
        }
      }
    }

    return sumStats(allStats)
  },

  async getDailyStats(
    token: string,
    startDate: string,
    endDate: string,
    domainId: string | null
  ): Promise<DailyStats[]> {
    const client = makeClient(token)

    const domain = domainId ?? (await getFirstDomain(token))
    if (!domain) return []

    try {
      const { data } = await client.get(`/v3/${domain}/stats/total`, {
        params: {
          event: 'accepted,delivered,failed,opened,clicked,complained',
          start: startDate,
          end: endDate,
          resolution: 'day',
        },
      })

      if (!data?.stats || !Array.isArray(data.stats)) return []

      return data.stats.map((item: MailgunStatsItem) => {
        const accepted = item.accepted?.total ?? 0
        const delivered = item.delivered?.total ?? 0
        const bounced = item.failed?.permanent?.total ?? 0
        const opened = item.opened?.total ?? 0
        const clicked = item.clicked?.total ?? 0
        const spam = item.complained?.total ?? 0

        return {
          date: item.time ? item.time.split('T')[0] : '',
          delivered,
          deliveryRate: safeRate(delivered, accepted),
          bounced,
          bounceRate: safeRate(bounced, accepted),
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
    _page: number
  ): Promise<EmailEvent[]> {
    const client = makeClient(token)
    // When domainId is null, query the first domain only
    const domain = domainId ?? (await getFirstDomain(token))
    if (!domain) return []

    try {
      const { data } = await client.get(`/v3/${domain}/events`, {
        params: {
          ascending: 'yes',
          limit: 100,
        },
      })

      if (!data?.items || !Array.isArray(data.items)) return []

      return data.items.map((item: {
        id: string
        timestamp: number
        event: string
        recipient: string
        message?: { headers?: { subject?: string; 'message-id'?: string } }
        'delivery-status'?: { description?: string }
      }) => ({
        id: item.id,
        timestamp: new Date(item.timestamp * 1000).toISOString(),
        event: item.event,
        recipient: item.recipient,
        subject: item.message?.headers?.subject,
        messageId: item.message?.headers?.['message-id'],
        errorMessage: item['delivery-status']?.description,
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
    // Query the first domain only when getting suppressions
    const domain = await getFirstDomain(token)
    if (!domain) return []

    const results: SuppressionEntry[] = []
    const endpoints = [
      { path: `/v3/${domain}/bounces`, reason: 'bounce' },
      { path: `/v3/${domain}/unsubscribes`, reason: 'unsubscribe' },
      { path: `/v3/${domain}/complaints`, reason: 'spam_report' },
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
        const items = result.value.data?.items
        if (Array.isArray(items)) {
          for (const entry of items) {
            results.push({
              email: entry.address || entry.email || '',
              reason,
              createdAt: entry.created_at || new Date().toISOString(),
            })
          }
        }
      }
    }

    return results
  },
}

async function getFirstDomain(token: string): Promise<string | null> {
  const client = makeClient(token)
  try {
    const { data } = await client.get('/v3/domains', { params: { limit: 1 } })
    if (data?.items?.length > 0) return data.items[0].name
  } catch {
    // ignore
  }
  return null
}

async function fetchDomainStats(
  client: AxiosInstance,
  domain: string,
  startDate: string,
  endDate: string
): Promise<AggregatedStats> {
  const duration = `${daysBetween(startDate, endDate)}d`

  try {
    const { data } = await client.get(`/v3/${domain}/stats/total`, {
      params: {
        event: 'accepted,delivered,failed,opened,clicked,complained',
        duration,
      },
    })

    if (!data?.stats || !Array.isArray(data.stats)) return emptyStats()

    let accepted = 0, delivered = 0, bounced = 0,
      opened = 0, clicked = 0, spam = 0

    for (const item of data.stats as MailgunStatsItem[]) {
      accepted += item.accepted?.total ?? 0
      delivered += item.delivered?.total ?? 0
      bounced += item.failed?.permanent?.total ?? 0
      opened += item.opened?.total ?? 0
      clicked += item.clicked?.total ?? 0
      spam += item.complained?.total ?? 0
    }

    return {
      delivery_count: delivered,
      delivery_rate: safeRate(delivered, accepted),
      bounce_count: bounced,
      bounce_rate: safeRate(bounced, accepted),
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

function sumStats(arr: AggregatedStats[]): AggregatedStats {
  if (arr.length === 0) return emptyStats()

  const totals = arr.reduce(
    (acc, s) => ({
      delivery_count: acc.delivery_count + s.delivery_count,
      bounce_count: acc.bounce_count + s.bounce_count,
      open_count: acc.open_count + s.open_count,
      click_count: acc.click_count + s.click_count,
      spam_count: acc.spam_count + s.spam_count,
      sent: acc.sent + s.delivery_count + s.bounce_count,
    }),
    { delivery_count: 0, bounce_count: 0, open_count: 0, click_count: 0, spam_count: 0, sent: 0 }
  )

  return {
    delivery_count: totals.delivery_count,
    delivery_rate: safeRate(totals.delivery_count, totals.sent),
    bounce_count: totals.bounce_count,
    bounce_rate: safeRate(totals.bounce_count, totals.sent),
    open_count: totals.open_count,
    open_rate: safeRate(totals.open_count, totals.delivery_count),
    click_count: totals.click_count,
    click_rate: safeRate(totals.click_count, totals.delivery_count),
    spam_count: totals.spam_count,
    spam_rate: safeRate(totals.spam_count, totals.delivery_count),
  }
}
