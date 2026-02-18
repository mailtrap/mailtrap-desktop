import { useEffect, useState, useRef } from 'react'
import StatsCard from './StatsCard'
import RateChart from './RateChart'
import { StatsTable } from './StatsTable'
import { Button } from '../ui/Button'
import { LastUpdatedIndicator } from '../ui/LastUpdatedIndicator'
import { useCacheFetch } from '../../hooks/useCacheFetch'
import { usePollingInterval } from '../../hooks/usePollingInterval'
import type {
  SendingDomain,
  AggregatedStats,
  DailyStats,
  ProviderStats,
  CategoryStats,
  StatsRow,
} from '../../../electron/api/types'

type TimeRange = '7d' | '30d'

const BOUNCE_THRESHOLD = 5 // 5%
const SPAM_THRESHOLD = 0.1 // 0.1%

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function formatPercent(rate: number): string {
  return (rate * 100).toFixed(2) + '%'
}

function toStatsRow(p: ProviderStats): StatsRow {
  return {
    name: p.email_service_provider,
    delivered: p.stats.delivery_count,
    uniqueOpenRate: p.stats.open_rate,
    clickRate: p.stats.click_rate,
    bounceRate: p.stats.bounce_rate,
    spamCount: p.stats.spam_count,
  }
}

function categoryToStatsRow(c: CategoryStats): StatsRow {
  return {
    name: c.category,
    delivered: c.stats.delivery_count,
    uniqueOpenRate: c.stats.open_rate,
    clickRate: c.stats.click_rate,
    bounceRate: c.stats.bounce_rate,
    spamCount: c.stats.spam_count,
  }
}

export default function SendingDash() {
  const {
    data: domains,
    loading: domainsLoading,
    error: domainsError,
    refresh: refreshDomains,
  } = useCacheFetch<SendingDomain[]>({
    getCached: () => window.electron.getSendingDomainsCache(),
    getFresh: () => window.electron.getDomains(),
    saveToCache: (data) => { window.electron.saveSendingDomainsCache(data) },
    isEmpty: (data) => data.length === 0,
  })

  const [selectedDomain, setSelectedDomain] = useState<SendingDomain | null | undefined>(undefined)
  const [stats, setStats] = useState<AggregatedStats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsRefreshing, setStatsRefreshing] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [providerRows, setProviderRows] = useState<StatsRow[]>([])
  const [categoryRows, setCategoryRows] = useState<StatsRow[]>([])

  const refreshRef = useRef<() => void>(() => {})

  // Default to "All Domains" once domains load
  useEffect(() => {
    if (domains && domains.length > 0 && selectedDomain === undefined) {
      setSelectedDomain(null)
    }
  }, [domains, selectedDomain])

  useEffect(() => {
    if (selectedDomain !== undefined) {
      loadCacheThenFetchStats(selectedDomain?.id ?? null, timeRange)
    }
  }, [selectedDomain, timeRange])

  // Auto-refresh with proper cleanup
  usePollingInterval(
    () => refreshRef.current(),
    async () => {
      const s = await window.electron.getSettings()
      return s?.sendingPollingIntervalMs || 300000
    }
  )

  useEffect(() => {
    refreshRef.current = () => {
      fetchFreshStats(selectedDomain?.id ?? null, timeRange)
    }
  }, [selectedDomain, timeRange])

  const loadCacheThenFetchStats = async (domainId: number | null, range: TimeRange) => {
    const cacheKey = domainId ?? 0
    try {
      const cached = await window.electron.getSendingStatsCache(cacheKey, range)
      if (cached?.stats) {
        setStats(cached.stats)
        setDailyStats(cached.dailyStats)
        if (cached.providerRows?.length) setProviderRows(cached.providerRows)
        if (cached.categoryRows?.length) setCategoryRows(cached.categoryRows)
        setLastFetchedAt(cached.fetchedAt)
        setIsFromCache(true)
        setStatsLoading(false)
      }
    } catch {}

    await fetchFreshStats(domainId, range)
  }

  const fetchFreshStats = async (domainId: number | null, range: TimeRange) => {
    let hasDisplayedData = false
    setStats((prev) => { hasDisplayedData = prev !== null; return prev })

    const startTime = Date.now()
    if (hasDisplayedData) {
      setStatsRefreshing(true)
    } else {
      setStatsLoading(true)
    }
    setStatsError(null)

    try {
      const days = range === '7d' ? 7 : 30
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const domainFilter = domainId ? [domainId] : undefined

      const [statsResult, dailyResult, providerResult, categoryResult] = await Promise.all([
        window.electron.getStats(startDate, endDate, domainFilter)
          .then((d) => ({ ok: true as const, data: d }))
          .catch((e: unknown) => ({ ok: false as const, error: e })),
        window.electron.getDailyStats(startDate, endDate, domainFilter)
          .then((d) => ({ ok: true as const, data: d }))
          .catch((e: unknown) => ({ ok: false as const, error: e })),
        window.electron.getProviderStats(startDate, endDate, domainFilter)
          .then((d) => ({ ok: true as const, data: d }))
          .catch(() => ({ ok: false as const, data: [] as ProviderStats[] })),
        window.electron.getCategoryStats(startDate, endDate, domainFilter)
          .then((d) => ({ ok: true as const, data: d }))
          .catch(() => ({ ok: false as const, data: [] as CategoryStats[] }))
      ])

      // Provider & Category tables
      if (providerResult.ok && providerResult.data.length > 0) {
        setProviderRows(providerResult.data.map(toStatsRow))
      }
      if (categoryResult.ok && categoryResult.data.length > 0) {
        setCategoryRows(
          categoryResult.data
            .filter((c) => c.category !== '')
            .map(categoryToStatsRow)
        )
      }

      const freshProviders = providerResult.ok ? providerResult.data.map(toStatsRow) : undefined
      const freshCategories = categoryResult.ok
        ? categoryResult.data.filter((c) => c.category !== '').map(categoryToStatsRow)
        : undefined

      if (statsResult.ok && dailyResult.ok) {
        setStats(statsResult.data)
        setDailyStats(dailyResult.data)
        setLastFetchedAt(new Date().toISOString())
        setIsFromCache(false)
        setRateLimited(false)

        const cacheKey = domainId ?? 0
        window.electron.saveSendingStatsCache(cacheKey, range, statsResult.data, dailyResult.data, freshProviders, freshCategories)
      } else {
        const failedErr = !statsResult.ok ? statsResult.error : !dailyResult.ok ? dailyResult.error : null
        const message = failedErr instanceof Error ? failedErr.message : String(failedErr ?? '')
        const isRateLimit = message.toLowerCase().includes('rate limit') || message.includes('429')

        if (isRateLimit) {
          setRateLimited(true)
          setTimeout(() => fetchFreshStats(domainId, range), 60000)
        }

        if (!hasDisplayedData && !isRateLimit) {
          setStatsError('Failed to load stats. Click retry to try again.')
        }
      }
    } catch {
      if (!hasDisplayedData) {
        setStatsError('Failed to load stats. Click retry to try again.')
      }
    } finally {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 1000 - elapsed)
      setTimeout(() => {
        setStatsLoading(false)
        setStatsRefreshing(false)
      }, remaining)
    }
  }

  // Format daily data into chart-friendly points
  const formatDateLabel = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })

  const openRateData = dailyStats.map((d) => ({
    dateLabel: formatDateLabel(d.date),
    value: d.openRate * 100
  }))

  const clickRateData = dailyStats.map((d) => ({
    dateLabel: formatDateLabel(d.date),
    value: d.clickRate * 100
  }))

  const bounceRateData = dailyStats.map((d) => ({
    dateLabel: formatDateLabel(d.date),
    value: d.bounceRate * 100
  }))

  const spamRateData = dailyStats.map((d) => {
    const total = d.delivered + d.bounced
    const spamRate = total > 0 ? (d.spam / total) * 100 : 0
    return { dateLabel: formatDateLabel(d.date), value: spamRate }
  })

  const analyticsBase = 'https://mailtrap.io/sending/analytics'
  const isBounceAboveThreshold = stats ? stats.bounce_rate * 100 > BOUNCE_THRESHOLD : false
  const domainItems = domains ?? []

  if (domainsLoading && domainItems.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  if (domainsError && domainItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-medium">{domainsError}</p>
        <Button onClick={refreshDomains}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-heading-1 text-navy-air">Stats Overview</h1>
          {domainItems.length > 0 && (
            <select
              value={selectedDomain?.id ?? 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedDomain(null)
                } else {
                  const d = domainItems.find((d) => d.id === Number(e.target.value))
                  if (d) setSelectedDomain(d)
                }
              }}
              className="input w-auto text-body-s"
            >
              <option value="all">All Domains</option>
              {domainItems.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.domain_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-body-s text-grey-muted">
            {new Date(Date.now() - (timeRange === '7d' ? 7 : 30) * 86400000).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
            {' - '}
            {new Date().toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
          <div className="flex rounded-mtui border border-grey-dark">
            {(['7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-item-label-s transition-colors ${
                  timeRange === range
                    ? 'bg-blue-400/15 text-blue-neutral'
                    : 'text-grey-muted hover:text-navy-air'
                }`}
              >
                {range === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {lastFetchedAt && (
        <LastUpdatedIndicator
          lastFetchedAt={lastFetchedAt}
          isFromCache={isFromCache}
          refreshing={statsRefreshing}
          rateLimited={rateLimited}
          onRefresh={() => fetchFreshStats(selectedDomain?.id ?? null, timeRange)}
        />
      )}

      {domainItems.length === 0 ? (
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            No sending domains found. Set up a domain in the{' '}
            <a
              href="https://mailtrap.io/sending/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-neutral underline hover:text-blue-medium"
            >
              Mailtrap web app
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          {statsError && !stats && (
            <div className="mb-4 flex items-center justify-between rounded-mtui border border-orange-300/30 bg-orange-300/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-orange-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="text-body-s text-orange-medium">{statsError}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchFreshStats(selectedDomain?.id ?? null, timeRange)}
                className="text-orange-medium hover:text-orange-200"
              >
                Retry
              </Button>
            </div>
          )}

          {statsLoading && !stats && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
            </div>
          )}

          {stats && (
            <>
              {/* Top Stats Cards */}
              <div className="mb-6 grid grid-cols-5 gap-3">
                <StatsCard label="Delivered" count={stats.delivery_count} rate={stats.delivery_rate} />
                <StatsCard label="Unique Open Rate" count={stats.open_count} rate={stats.open_rate} />
                <StatsCard label="Click Rate" count={stats.click_count} rate={stats.click_rate} />
                <StatsCard
                  label="Bounce Rate"
                  count={stats.bounce_count}
                  rate={stats.bounce_rate}
                  isCritical
                  criticalThreshold={BOUNCE_THRESHOLD / 100}
                />
                <StatsCard
                  label="Spam Complaints"
                  count={stats.spam_count}
                  rate={stats.spam_rate}
                  isCritical
                  criticalThreshold={SPAM_THRESHOLD / 100}
                />
              </div>

              {/* Mailbox Providers & Category Tables */}
              {(providerRows.length > 0 || categoryRows.length > 0) && (
                <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <StatsTable
                    title="Mailbox Provi..."
                    rows={providerRows}
                    linkLabel="See All"
                    linkUrl="https://mailtrap.io/sending/analytics/esp"
                    bounceThreshold={BOUNCE_THRESHOLD}
                  />
                  <StatsTable
                    title="Category"
                    rows={categoryRows}
                    linkLabel="See All"
                    linkUrl="https://mailtrap.io/sending/analytics/categories"
                    bounceThreshold={BOUNCE_THRESHOLD}
                  />
                </div>
              )}

              {/* Rate Charts Grid (2x2) */}
              {dailyStats.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <RateChart
                    title="Unique Open Rate %"
                    data={openRateData}
                    color="#4C83EE"
                    linkLabel="Opened Emails"
                    linkUrl="https://mailtrap.io/sending/email_logs?end_date=2026-02-18&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22open%22%5D%7D%5D"
                  />
                  <RateChart
                    title="Click Rate %"
                    data={clickRateData}
                    color="#4C83EE"
                    linkLabel="Email Clicks"
                    linkUrl="https://mailtrap.io/sending/email_logs?end_date=2026-02-18&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22click%22%5D%7D%5D"
                  />
                  <RateChart
                    title="Bounce Rate %"
                    data={bounceRateData}
                    color={isBounceAboveThreshold ? '#FB5151' : '#4C83EE'}
                    threshold={BOUNCE_THRESHOLD}
                    thresholdLabel={`threshold ${BOUNCE_THRESHOLD}.00%`}
                    linkLabel="Bounced Emails"
                    linkUrl="https://mailtrap.io/sending/email_logs?end_date=2026-02-18&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22bounce%22%5D%7D%5D"
                    isCritical={isBounceAboveThreshold}
                  />
                  <RateChart
                    title="Spam Complaints %"
                    data={spamRateData}
                    color="#4C83EE"
                    threshold={SPAM_THRESHOLD}
                    thresholdLabel={`threshold ${SPAM_THRESHOLD.toFixed(2)}%`}
                    linkLabel="Spam Complaints"
                    linkUrl="https://mailtrap.io/sending/email_logs?end_date=2026-02-18&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22spam%22%5D%7D%5D"
                  />
                </div>
              )}
            </>
          )}

          {!stats && !statsLoading && !statsError && (
            <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
              <p className="text-body text-grey-muted">
                No sending stats available for this domain yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
