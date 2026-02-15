import { getApiClient } from './client'
import type {
  AggregatedStats,
  DailyStatsItem,
  DailyStats,
  SendingDomain,
  SendingDomainsResponse,
  SendingStreamSummary,
  ProviderStats,
  CategoryStats
} from './types'

// ── Aggregated Stats ──
// GET /api/accounts/{account_id}/stats

export async function getAggregatedStats(
  accountId: number,
  startDate: string,
  endDate: string,
  domainIds?: number[]
): Promise<AggregatedStats> {
  const client = getApiClient()
  const params: Record<string, string | number[]> = {
    start_date: startDate,
    end_date: endDate
  }
  if (domainIds && domainIds.length > 0) {
    params['sending_domain_ids[]'] = domainIds
  }
  const { data } = await client.get<AggregatedStats>(
    `/api/accounts/${accountId}/stats`,
    { params }
  )
  return data
}

// ── Daily Stats ──
// GET /api/accounts/{account_id}/stats/date

export async function getDailyStats(
  accountId: number,
  startDate: string,
  endDate: string,
  domainIds?: number[]
): Promise<DailyStats[]> {
  const client = getApiClient()
  const params: Record<string, string | number[]> = {
    start_date: startDate,
    end_date: endDate
  }
  if (domainIds && domainIds.length > 0) {
    params['sending_domain_ids[]'] = domainIds
  }
  const { data } = await client.get<DailyStatsItem[]>(
    `/api/accounts/${accountId}/stats/date`,
    { params }
  )
  return data.map((d) => ({
    date: d.date,
    delivered: d.stats.delivery_count,
    deliveryRate: d.stats.delivery_rate,
    bounced: d.stats.bounce_count,
    bounceRate: d.stats.bounce_rate,
    opened: d.stats.open_count,
    openRate: d.stats.open_rate,
    clicked: d.stats.click_count,
    clickRate: d.stats.click_rate,
    spam: d.stats.spam_count
  }))
}

// ── Mailbox Provider Stats ──
// GET /api/accounts/{account_id}/stats/email_service_providers

export async function getMailboxProviderStats(
  accountId: number,
  startDate: string,
  endDate: string,
  domainIds?: number[]
): Promise<ProviderStats[]> {
  const client = getApiClient()
  const params: Record<string, string | number[]> = {
    start_date: startDate,
    end_date: endDate
  }
  if (domainIds && domainIds.length > 0) {
    params['sending_domain_ids[]'] = domainIds
  }
  const { data } = await client.get<ProviderStats[]>(
    `/api/accounts/${accountId}/stats/email_service_providers`,
    { params }
  )
  return data
}

// ── Category Stats ──
// GET /api/accounts/{account_id}/stats/categories

export async function getCategoryStats(
  accountId: number,
  startDate: string,
  endDate: string,
  domainIds?: number[]
): Promise<CategoryStats[]> {
  const client = getApiClient()
  const params: Record<string, string | number[]> = {
    start_date: startDate,
    end_date: endDate
  }
  if (domainIds && domainIds.length > 0) {
    params['sending_domain_ids[]'] = domainIds
  }
  const { data } = await client.get<CategoryStats[]>(
    `/api/accounts/${accountId}/stats/categories`,
    { params }
  )
  return data
}

// ── Sending Domains ──
// GET /api/accounts/{account_id}/sending_domains
// Response is { data: SendingDomain[] }

export async function getSendingDomains(
  accountId: number
): Promise<SendingDomain[]> {
  const client = getApiClient()
  const { data } = await client.get<SendingDomainsResponse>(
    `/api/accounts/${accountId}/sending_domains`
  )
  return data.data
}

// ── Helper: build tray-friendly stream summaries ──

export async function getStreamSummaries(accountId: number): Promise<SendingStreamSummary[]> {
  const summaries: SendingStreamSummary[] = []

  try {
    const domains = await getSendingDomains(accountId)

    // Get date range for last 7 days
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // Fetch stats per domain so each gets its own numbers
    for (const domain of domains) {
      try {
        const stats = await getAggregatedStats(accountId, startDate, endDate, [domain.id])
        summaries.push({
          id: String(domain.id),
          name: domain.domain_name,
          sentCount: stats.delivery_count + stats.bounce_count,
          deliveryRate: stats.delivery_rate * 100
        })
      } catch {
        // If stats fail for one domain, still show it with zero
        summaries.push({
          id: String(domain.id),
          name: domain.domain_name,
          sentCount: 0,
          deliveryRate: null
        })
      }
    }
  } catch {
    // If sending domains aren't available, return empty
  }

  return summaries
}
