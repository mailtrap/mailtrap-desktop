import { useEffect, useState, useRef } from 'react'
import StatsCard from './StatsCard'
import RateChart from './RateChart'
import { StatsTable } from './StatsTable'
import { Button } from '../ui/Button'
import { LastUpdatedIndicator } from '../ui/LastUpdatedIndicator'
import { useCacheFetch } from '../../hooks/useCacheFetch'
import { usePollingInterval } from '../../hooks/usePollingInterval'
import { useAppStore } from '../../stores/appStore'
import type {
  SendingDomain,
  AggregatedStats,
  DailyStats,
  ProviderStats,
  CategoryStats,
  StatsRow,
  VendorCapabilities,
} from '../../../electron/api/types'

type TimeRange = '7d' | '30d'

const BOUNCE_THRESHOLD = 5 // 5%
const SPAM_THRESHOLD = 0.1 // 0.1%

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

/** Vendor-agnostic domain item shape */
interface DomainItem {
  id: string | number
  name: string
}

export default function SendingDash() {
  const vendor = useAppStore((s) => s.vendor)
  const isMailtrap = vendor === 'mailtrap' || vendor === null
  const [capabilities, setCapabilities] = useState<VendorCapabilities | null>(null)

  useEffect(() => {
    window.electron.getCapabilities().then(setCapabilities)
  }, [vendor])

  // --- Domain loading ---
  // For Mailtrap, use legacy getDomains; for others, use getVendorDomains
  const {
    data: mailtrapDomains,
    loading: mailtrapDomainsLoading,
    error: mailtrapDomainsError,
    refresh: refreshMailtrapDomains,
  } = useCacheFetch<SendingDomain[]>({
    getCached: () => isMailtrap ? window.electron.getSendingDomainsCache() : Promise.resolve(null),
    getFresh: () => isMailtrap ? window.electron.getDomains() : Promise.resolve([]),
    saveToCache: (data) => { if (isMailtrap) window.electron.saveSendingDomainsCache(data) },
    isEmpty: (data) => data.length === 0,
  })

  const [vendorDomains, setVendorDomains] = useState<{ id: string; name: string }[]>([])
  const [vendorDomainsLoading, setVendorDomainsLoading] = useState(!isMailtrap)
  const [vendorDomainsError, setVendorDomainsError] = useState<string | null>(null)

  useEffect(() => {
    if (!isMailtrap) {
      setVendorDomainsLoading(true)
      window.electron.getVendorDomains()
        .then((d) => {
          setVendorDomains(d)
          setVendorDomainsLoading(false)
        })
        .catch((e: unknown) => {
          setVendorDomainsError(e instanceof Error ? e.message : 'Failed to load domains')
          setVendorDomainsLoading(false)
        })
    }
  }, [isMailtrap])

  // Normalize domain list
  const domainItems: DomainItem[] = isMailtrap
    ? (mailtrapDomains ?? []).map((d) => ({ id: d.id, name: d.domain_name }))
    : vendorDomains.map((d) => ({ id: d.id, name: d.name }))

  const domainsLoading = isMailtrap ? mailtrapDomainsLoading : vendorDomainsLoading
  const domainsError = isMailtrap ? mailtrapDomainsError : vendorDomainsError
  const refreshDomains = isMailtrap
    ? refreshMailtrapDomains
    : () => {
        setVendorDomainsLoading(true)
        window.electron.getVendorDomains()
          .then(setVendorDomains)
          .catch(() => {})
          .finally(() => setVendorDomainsLoading(false))
      }

  const [selectedDomainId, setSelectedDomainId] = useState<string | number | null | undefined>(undefined)
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
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when vendor (account) changes
  useEffect(() => {
    // Clear any pending rate-limit retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    setSelectedDomainId(undefined)
    setStats(null)
    setDailyStats([])
    setProviderRows([])
    setCategoryRows([])
    setStatsError(null)
    setLastFetchedAt(null)
    setIsFromCache(false)
    setRateLimited(false)
  }, [vendor])

  // Default to "All Domains" once domains load (or immediately if no domains)
  useEffect(() => {
    if (selectedDomainId === undefined && !domainsLoading) {
      setSelectedDomainId(null)
    }
  }, [domainItems, selectedDomainId, domainsLoading])

  useEffect(() => {
    if (selectedDomainId !== undefined) {
      // Clear any pending rate-limit retry when selection changes
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      loadCacheThenFetchStats(selectedDomainId, timeRange)
    }
  }, [selectedDomainId, timeRange])

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
      fetchFreshStats(selectedDomainId ?? null, timeRange)
    }
  }, [selectedDomainId, timeRange])

  const loadCacheThenFetchStats = async (domainId: string | number | null | undefined, range: TimeRange) => {
    const resolvedId = domainId ?? null
    // Only load from cache for Mailtrap (which uses numeric IDs)
    if (isMailtrap) {
      const cacheKey = (typeof resolvedId === 'number' ? resolvedId : 0)
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
    }

    await fetchFreshStats(resolvedId, range)
  }

  const fetchFreshStats = async (domainId: string | number | null, range: TimeRange) => {
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

      if (isMailtrap) {
        // Mailtrap path: use legacy channels
        const domainFilter = typeof domainId === 'number' && domainId ? [domainId] : undefined

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

        // Provider & Category tables — always update, even if empty
        if (providerResult.ok) {
          setProviderRows(providerResult.data.map(toStatsRow))
        }
        if (categoryResult.ok) {
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

          const cacheKey = (typeof domainId === 'number' ? domainId : 0)
          window.electron.saveSendingStatsCache(cacheKey, range, statsResult.data, dailyResult.data, freshProviders, freshCategories)
        } else {
          handleStatsError(statsResult, dailyResult, hasDisplayedData, domainId, range)
        }
      } else {
        // Vendor path: use vendor-agnostic channels
        const vendorDomainId = typeof domainId === 'string' ? domainId : null

        const [statsResult, dailyResult] = await Promise.all([
          window.electron.getVendorStats(startDate, endDate, vendorDomainId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch((e: unknown) => ({ ok: false as const, error: e })),
          window.electron.getVendorDailyStats(startDate, endDate, vendorDomainId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch((e: unknown) => ({ ok: false as const, error: e })),
        ])

        // No provider/category tables for non-Mailtrap vendors
        setProviderRows([])
        setCategoryRows([])

        if (statsResult.ok && dailyResult.ok) {
          setStats(statsResult.data)
          setDailyStats(dailyResult.data)
          setLastFetchedAt(new Date().toISOString())
          setIsFromCache(false)
          setRateLimited(false)
        } else {
          handleStatsError(statsResult, dailyResult, hasDisplayedData, domainId, range)
        }
      }
    } catch {
      if (!hasDisplayedData) {
        setStatsError('Failed to load stats. Click retry to try again.')
      }
    } finally {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 300 - elapsed)
      setTimeout(() => {
        setStatsLoading(false)
        setStatsRefreshing(false)
      }, remaining)
    }
  }

  const handleStatsError = (
    statsResult: { ok: boolean; error?: unknown },
    dailyResult: { ok: boolean; error?: unknown },
    hasDisplayedData: boolean,
    domainId: string | number | null,
    range: TimeRange
  ) => {
    const failedErr = !statsResult.ok ? statsResult.error : !dailyResult.ok ? dailyResult.error : null
    const message = failedErr instanceof Error ? failedErr.message : String(failedErr ?? '')
    const isRateLimit = message.toLowerCase().includes('rate limit') || message.includes('429')

    if (isRateLimit) {
      setRateLimited(true)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null
        fetchFreshStats(domainId, range)
      }, 60000)
    }

    if (!hasDisplayedData && !isRateLimit) {
      setStatsError('Failed to load stats. Click retry to try again.')
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

  const isBounceAboveThreshold = stats ? stats.bounce_rate * 100 > BOUNCE_THRESHOLD : false
  const showProviderCategory = capabilities?.providerStats || capabilities?.categoryStats

  const renderEndDate = new Date().toISOString().split('T')[0]
  const renderStartDate = new Date(Date.now() - (timeRange === '7d' ? 7 : 30) * 86400000).toISOString().split('T')[0]
  const espRowLinkBuilder = (name: string) =>
    `https://mailtrap.io/sending/analytics/esp?email_service_providers=${encodeURIComponent(name)}&end_date=${renderEndDate}&start_date=${renderStartDate}`
  const categoryRowLinkBuilder = (name: string) =>
    `https://mailtrap.io/sending/analytics/categories?categories=${encodeURIComponent(name)}&end_date=${renderEndDate}&start_date=${renderStartDate}`

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
              value={selectedDomainId != null ? String(selectedDomainId) : 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedDomainId(null)
                } else {
                  const d = domainItems.find((d) => String(d.id) === e.target.value)
                  if (d) setSelectedDomainId(d.id)
                }
              }}
              className="input w-auto text-body-s"
            >
              <option value="all">All Domains</option>
              {domainItems.map((d) => (
                <option key={String(d.id)} value={String(d.id)}>
                  {d.name}
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
          onRefresh={() => fetchFreshStats(selectedDomainId ?? null, timeRange)}
        />
      )}

      {domainItems.length === 0 && isMailtrap ? (
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            No sending domains found.{' '}
            Set up a domain in the{' '}
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
                onClick={() => fetchFreshStats(selectedDomainId ?? null, timeRange)}
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

              {/* Mailbox Providers & Category Tables — Mailtrap only */}
              {showProviderCategory && (providerRows.length > 0 || categoryRows.length > 0) && (
                <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <StatsTable
                    title="Mailbox Provi..."
                    rows={providerRows}
                    linkLabel="See All"
                    linkUrl="https://mailtrap.io/sending/analytics/esp"
                    bounceThreshold={BOUNCE_THRESHOLD}
                    rowLinkBuilder={espRowLinkBuilder}
                  />
                  <StatsTable
                    title="Category"
                    rows={categoryRows}
                    linkLabel="See All"
                    linkUrl="https://mailtrap.io/sending/analytics/categories"
                    bounceThreshold={BOUNCE_THRESHOLD}
                    rowLinkBuilder={categoryRowLinkBuilder}
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
                    linkLabel={isMailtrap ? "Opened Emails" : undefined}
                    linkUrl={isMailtrap ? `https://mailtrap.io/sending/email_logs?end_date=${renderEndDate}&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22open%22%5D%7D%5D` : undefined}
                  />
                  <RateChart
                    title="Click Rate %"
                    data={clickRateData}
                    color="#4C83EE"
                    linkLabel={isMailtrap ? "Email Clicks" : undefined}
                    linkUrl={isMailtrap ? `https://mailtrap.io/sending/email_logs?end_date=${renderEndDate}&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22click%22%5D%7D%5D` : undefined}
                  />
                  <RateChart
                    title="Bounce Rate %"
                    data={bounceRateData}
                    color={isBounceAboveThreshold ? '#FB5151' : '#4C83EE'}
                    threshold={BOUNCE_THRESHOLD}
                    thresholdLabel={`threshold ${BOUNCE_THRESHOLD}.00%`}
                    linkLabel={isMailtrap ? "Bounced Emails" : undefined}
                    linkUrl={isMailtrap ? `https://mailtrap.io/sending/email_logs?end_date=${renderEndDate}&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22bounce%22%5D%7D%5D` : undefined}
                    isCritical={isBounceAboveThreshold}
                  />
                  <RateChart
                    title="Spam Complaints %"
                    data={spamRateData}
                    color="#4C83EE"
                    threshold={SPAM_THRESHOLD}
                    thresholdLabel={`threshold ${SPAM_THRESHOLD.toFixed(2)}%`}
                    linkLabel={isMailtrap ? "Spam Complaints" : undefined}
                    linkUrl={isMailtrap ? `https://mailtrap.io/sending/email_logs?end_date=${renderEndDate}&filters=%5B%7B%22name%22%3A%22events%22%2C%22operator%22%3A%22include_event%22%2C%22value%22%3A%5B%22spam%22%5D%7D%5D` : undefined}
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
