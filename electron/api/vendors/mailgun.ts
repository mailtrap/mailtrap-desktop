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

const STAT_EVENTS = ['accepted', 'delivered', 'failed', 'opened', 'clicked', 'complained']

function makeClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: MAILGUN_BASE_URL,
    auth: { username: 'api', password: token },
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
    paramsSerializer: { indexes: null },
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

    // Account-wide: iterate all domains, sum raw counts. Cap at 10 domains.
    const domains = await this.getDomains(token)
    if (domains.length === 0) {
      return emptyStats()
    }

    const capped = domains.slice(0, 10)
    // Concurrency limit: batches of 3
    const allCounts: DomainRawCounts[] = []
    for (let i = 0; i < capped.length; i += 3) {
      const batch = capped.slice(i, i + 3)
      const batchResults = await Promise.allSettled(
        batch.map(d => fetchDomainRawCounts(client, d.id, startDate, endDate))
      )
      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          allCounts.push(r.value)
        }
      }
    }

    return sumRawCounts(allCounts)
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
          event: STAT_EVENTS,
          start: Math.floor(new Date(startDate).getTime() / 1000),
          end: Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000),
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

/** Raw counts from a single domain, including accepted for rate calculation. */
interface DomainRawCounts {
  accepted: number
  delivered: number
  bounced: number
  opened: number
  clicked: number
  spam: number
}

async function fetchDomainRawCounts(
  client: AxiosInstance,
  domain: string,
  startDate: string,
  endDate: string
): Promise<DomainRawCounts> {
  const duration = `${daysBetween(startDate, endDate)}d`

  try {
    const { data } = await client.get(`/v3/${domain}/stats/total`, {
      params: {
        event: STAT_EVENTS,
        duration,
      },
    })

    if (!data?.stats || !Array.isArray(data.stats)) {
      return { accepted: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, spam: 0 }
    }

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

    return { accepted, delivered, bounced, opened, clicked, spam }
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      throw new Error('Rate limit exceeded (429). Please try again later.')
    }
    throw err
  }
}

function rawCountsToStats(counts: DomainRawCounts): AggregatedStats {
  return {
    delivery_count: counts.delivered,
    delivery_rate: safeRate(counts.delivered, counts.accepted),
    bounce_count: counts.bounced,
    bounce_rate: safeRate(counts.bounced, counts.accepted),
    open_count: counts.opened,
    open_rate: safeRate(counts.opened, counts.delivered),
    click_count: counts.clicked,
    click_rate: safeRate(counts.clicked, counts.delivered),
    spam_count: counts.spam,
    spam_rate: safeRate(counts.spam, counts.delivered),
  }
}

async function fetchDomainStats(
  client: AxiosInstance,
  domain: string,
  startDate: string,
  endDate: string
): Promise<AggregatedStats> {
  const counts = await fetchDomainRawCounts(client, domain, startDate, endDate)
  return rawCountsToStats(counts)
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

function sumRawCounts(arr: DomainRawCounts[]): AggregatedStats {
  if (arr.length === 0) return emptyStats()

  const totals = arr.reduce(
    (acc, c) => ({
      accepted: acc.accepted + c.accepted,
      delivered: acc.delivered + c.delivered,
      bounced: acc.bounced + c.bounced,
      opened: acc.opened + c.opened,
      clicked: acc.clicked + c.clicked,
      spam: acc.spam + c.spam,
    }),
    { accepted: 0, delivered: 0, bounced: 0, opened: 0, clicked: 0, spam: 0 }
  )

  return rawCountsToStats(totals)
}
