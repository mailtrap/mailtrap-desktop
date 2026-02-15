import { useEffect, useState, useRef } from 'react'
import StatsCard from './StatsCard'
import RateChart from './RateChart'

interface Domain {
  id: number
  domain_name: string
}

interface Stats {
  delivery_count: number
  delivery_rate: number
  bounce_count: number
  bounce_rate: number
  open_count: number
  open_rate: number
  click_count: number
  click_rate: number
  spam_count: number
  spam_rate: number
}

interface DailyData {
  date: string
  delivered: number
  deliveryRate: number
  bounced: number
  bounceRate: number
  opened: number
  openRate: number
  clicked: number
  clickRate: number
  spam: number
}

interface ProviderRow {
  name: string
  delivered: number
  uniqueOpenRate: number
  clickRate: number
  bounceRate: number
  spamCount: number
}

interface CategoryRow {
  name: string
  delivered: number
  uniqueOpenRate: number
  clickRate: number
  bounceRate: number
  spamCount: number
}

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

function formatFetchedAt(isoDate: string | null): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

export default function SendingDash() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [selectedDomain, setSelectedDomain] = useState<Domain | null | undefined>(undefined)
  const [stats, setStats] = useState<Stats | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyData[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsRefreshing, setStatsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [providerRows, setProviderRows] = useState<ProviderRow[]>([])
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])

  const refreshRef = useRef<() => void>(() => {})

  useEffect(() => {
    loadCacheThenFetchDomains()
  }, [])

  useEffect(() => {
    if (selectedDomain !== undefined) {
      loadCacheThenFetchStats(selectedDomain?.id ?? null, timeRange)
    }
  }, [selectedDomain, timeRange])

  // Set up auto-refresh timer based on sendingPollingIntervalMs setting
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    window.electron.getSettings().then((s: any) => {
      const interval = s?.sendingPollingIntervalMs || 300000
      timer = setInterval(() => {
        refreshRef.current()
      }, interval)
    })

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  // Keep ref up to date so the timer calls the latest version
  useEffect(() => {
    refreshRef.current = () => {
      fetchFreshStats(selectedDomain?.id ?? null, timeRange)
    }
  }, [selectedDomain, timeRange])

  /** Load cached domains first, then fetch fresh */
  const loadCacheThenFetchDomains = async () => {
    // Step 1: Load cache instantly
    try {
      const cached = await window.electron.getSendingDomainsCache()
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        setDomains(cached.data as Domain[])
        // Default to "All Domains" (null)
        setSelectedDomain(null)
        setLoading(false)
      }
    } catch {
      // no cache
    }

    // Step 2: Fetch fresh
    await fetchFreshDomains()
  }

  const fetchFreshDomains = async () => {
    const hadData = domains.length > 0
    if (hadData) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await window.electron.getDomains()
      setDomains(data)
      if (data.length > 0) {
        setSelectedDomain((prev) => {
          // Keep selection if still valid (null = "All Domains" is always valid)
          if (prev === null || prev === undefined) return null
          if (data.some((d: Domain) => d.id === prev.id)) return prev
          return null
        })
      }
      setError(null)

      // Save to cache
      window.electron.saveSendingDomainsCache(data)
    } catch (err) {
      if (domains.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to load sending domains')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  /** Load cached stats first, then fetch fresh */
  const loadCacheThenFetchStats = async (domainId: number | null, range: TimeRange) => {
    const cacheKey = domainId ?? 0
    // Step 1: Load cache instantly
    try {
      const cached = await window.electron.getSendingStatsCache(cacheKey, range)
      if (cached && cached.stats) {
        setStats(cached.stats as unknown as Stats)
        setDailyStats(cached.dailyStats as unknown as DailyData[])
        setLastFetchedAt(cached.fetchedAt)
        setIsFromCache(true)
        setStatsLoading(false)
      }
    } catch {
      // no cache
    }

    // Step 2: Fetch fresh
    await fetchFreshStats(domainId, range)
  }

  const fetchFreshStats = async (domainId: number | null, range: TimeRange) => {
    // Check if we already have data displayed (from cache or previous fetch)
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

      // Fetch all four independently so one failure doesn't block the rest
      const [statsResult, dailyResult, providerResult, categoryResult] = await Promise.all([
        window.electron.getStats(startDate, endDate, domainFilter)
          .then((d: any) => ({ ok: true as const, data: d }))
          .catch((e: any) => ({ ok: false as const, error: e })),
        window.electron.getDailyStats(startDate, endDate, domainFilter)
          .then((d: any) => ({ ok: true as const, data: d }))
          .catch((e: any) => ({ ok: false as const, error: e })),
        window.electron.getProviderStats(startDate, endDate, domainFilter)
          .then((d: any) => ({ ok: true as const, data: d as any[] }))
          .catch(() => ({ ok: false as const, data: [] as any[] })),
        window.electron.getCategoryStats(startDate, endDate, domainFilter)
          .then((d: any) => ({ ok: true as const, data: d as any[] }))
          .catch(() => ({ ok: false as const, data: [] as any[] }))
      ])

      // Provider & Category tables — update when fresh data arrives, keep previous on failure
      if (providerResult.ok && Array.isArray(providerResult.data) && providerResult.data.length > 0) {
        setProviderRows(
          providerResult.data.map((p: any) => ({
            name: p.email_service_provider,
            delivered: p.stats.delivery_count,
            uniqueOpenRate: p.stats.open_rate,
            clickRate: p.stats.click_rate,
            bounceRate: p.stats.bounce_rate,
            spamCount: p.stats.spam_count
          }))
        )
      }
      if (categoryResult.ok && Array.isArray(categoryResult.data) && categoryResult.data.length > 0) {
        setCategoryRows(
          categoryResult.data
            .filter((c: any) => c.category !== '')
            .map((c: any) => ({
              name: c.category,
              delivered: c.stats.delivery_count,
              uniqueOpenRate: c.stats.open_rate,
              clickRate: c.stats.click_rate,
              bounceRate: c.stats.bounce_rate,
              spamCount: c.stats.spam_count
            }))
        )
      }

      // Main stats & daily data
      if (statsResult.ok && dailyResult.ok) {
        setStats(statsResult.data as unknown as Stats)
        setDailyStats(dailyResult.data as unknown as DailyData[])
        setLastFetchedAt(new Date().toISOString())
        setIsFromCache(false)
        setRateLimited(false)

        const cacheKey = domainId ?? 0
        window.electron.saveSendingStatsCache(cacheKey, range, statsResult.data, dailyResult.data)
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
      // Unexpected processing error — don't crash
      if (!hasDisplayedData) {
        setStatsError('Failed to load stats. Click retry to try again.')
      }
    } finally {
      // Keep spinner visible for at least 1s so user notices the refresh
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
    return {
      dateLabel: formatDateLabel(d.date),
      value: spamRate
    }
  })

  // Build web app URLs — analytics base page (UUIDs not available via API)
  const analyticsBase = 'https://mailtrap.io/sending/analytics'

  const isBounceAboveThreshold = stats ? stats.bounce_rate * 100 > BOUNCE_THRESHOLD : false

  if (loading && domains.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
      </div>
    )
  }

  if (error && domains.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-300">{error}</p>
        <button onClick={fetchFreshDomains} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-heading-1 text-[#FBFCFC]">Stats Overview</h1>
          {/* Domain selector */}
          {domains.length > 0 && (
            <select
              value={selectedDomain?.id ?? 'all'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedDomain(null)
                } else {
                  const d = domains.find((d) => d.id === Number(e.target.value))
                  if (d) setSelectedDomain(d)
                }
              }}
              className="input w-auto text-body-s"
            >
              <option value="all">All Domains</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.domain_name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Time range + date display */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-mtui border border-navy-300">
            {(['7d', '30d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-item-label-s transition-colors ${
                  timeRange === range
                    ? 'bg-blue-400/15 text-blue-400'
                    : 'text-navy-100 hover:text-[#FBFCFC]'
                }`}
              >
                {range === '7d' ? '7 days' : '30 days'}
              </button>
            ))}
          </div>
          <span className="text-body-s text-navy-100">
            {new Date(Date.now() - (timeRange === '7d' ? 7 : 30) * 86400000).toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
            {' - '}
            {new Date().toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Last fetched indicator */}
      {lastFetchedAt && (
        <LastUpdatedIndicator
          lastFetchedAt={lastFetchedAt}
          isFromCache={isFromCache}
          refreshing={statsRefreshing || refreshing}
          rateLimited={rateLimited}
          onRefresh={() => {
            fetchFreshStats(selectedDomain?.id ?? null, timeRange)
          }}
        />
      )}

      {domains.length === 0 ? (
        <div className="rounded-mtui border border-dashed border-navy-300 p-12 text-center">
          <p className="text-body text-navy-100">
            No sending domains found. Set up a domain in the{' '}
            <a
              href="https://mailtrap.io/sending/domains"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline hover:text-blue-300"
            >
              Mailtrap web app
            </a>
            .
          </p>
        </div>
      ) : (
        <>
          {/* Stats error banner — only when no data is displayed */}
          {statsError && !stats && (
            <div className="mb-4 flex items-center justify-between rounded-mtui border border-orange-300/30 bg-orange-300/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                <p className="text-body-s text-orange-300">{statsError}</p>
              </div>
              {!statsError.includes('automatically') && !statsError.includes('cached') && (
                <button
                  onClick={() => fetchFreshStats(selectedDomain?.id ?? null, timeRange)}
                  className="btn-ghost text-item-label-s text-orange-300"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Loading state */}
          {statsLoading && !stats && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
            </div>
          )}

          {stats && (
            <>
              {/* ── Top Stats Cards ── */}
              <div className="mb-6 grid grid-cols-5 gap-3">
                <StatsCard
                  label="Delivered"
                  count={stats.delivery_count}
                  rate={stats.delivery_rate}
                />
                <StatsCard
                  label="Unique Open Rate"
                  count={stats.open_count}
                  rate={stats.open_rate}
                />
                <StatsCard
                  label="Click Rate"
                  count={stats.click_count}
                  rate={stats.click_rate}
                />
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

              {/* ── Mailbox Providers & Category Tables ── */}
              {(providerRows.length > 0 || categoryRows.length > 0) && (
                <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {/* Mailbox Providers */}
                  {providerRows.length > 0 && (
                    <div className="rounded-mtui border border-navy-300 bg-navy-500/50">
                      <table className="w-full table-fixed text-left text-body-s">
                        <thead>
                          <tr className="border-b border-navy-300 text-navy-100">
                            <th className="w-[28%] truncate px-2 py-2 font-medium">Mailbox Provi…</th>
                            <th className="px-2 py-2 text-right font-medium">Delivered</th>
                            <th className="px-2 py-2 text-right font-medium">Unique …</th>
                            <th className="px-2 py-2 text-right font-medium">Click Rate</th>
                            <th className="px-2 py-2 text-right font-medium">Bounce…</th>
                            <th className="px-2 py-2 text-right font-medium">Spam C…</th>
                          </tr>
                        </thead>
                        <tbody>
                          {providerRows.map((row) => (
                            <tr key={row.name} className="border-b border-navy-300/50 last:border-0">
                              <td className="truncate px-2 py-2 text-blue-400" title={row.name}>{row.name}</td>
                              <td className="px-2 py-2 text-right text-[#FBFCFC]">{formatCount(row.delivered)}</td>
                              <td className="px-2 py-2 text-right text-[#FBFCFC]">{formatPercent(row.uniqueOpenRate)}</td>
                              <td className="px-2 py-2 text-right text-[#FBFCFC]">{formatPercent(row.clickRate)}</td>
                              <td className={`px-2 py-2 text-right ${row.bounceRate * 100 > BOUNCE_THRESHOLD ? 'text-red-400' : 'text-[#FBFCFC]'}`}>
                                {formatPercent(row.bounceRate)}
                              </td>
                              <td className={`px-2 py-2 text-right ${row.spamCount > 0 ? 'text-red-400' : 'text-[#FBFCFC]'}`}>
                                {row.spamCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end border-t border-navy-300/50 px-3 py-2">
                        <a
                          href={`${analyticsBase}?tab=mailbox_providers`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-body-s text-blue-400 hover:text-blue-300"
                        >
                          See All
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Category */}
                  {categoryRows.length > 0 && (
                    <div className="rounded-mtui border border-navy-300 bg-navy-500/50">
                      <table className="w-full table-fixed text-left text-body-s">
                        <thead>
                          <tr className="border-b border-navy-300 text-navy-100">
                            <th className="w-[28%] truncate px-2 py-2 font-medium">Category</th>
                            <th className="px-2 py-2 text-right font-medium">Delivered</th>
                            <th className="px-2 py-2 text-right font-medium">Unique …</th>
                            <th className="px-2 py-2 text-right font-medium">Click Rate</th>
                            <th className="px-2 py-2 text-right font-medium">Bounce…</th>
                            <th className="px-2 py-2 text-right font-medium">Spam C…</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryRows.map((row) => (
                            <tr key={row.name} className="border-b border-navy-300/50 last:border-0">
                              <td className="truncate px-2 py-2 text-blue-400" title={row.name}>{row.name}</td>
                              <td className="px-2 py-2 text-right text-[#FBFCFC]">{formatCount(row.delivered)}</td>
                              <td className="px-2 py-2 text-right text-[#FBFCFC]">{formatPercent(row.uniqueOpenRate)}</td>
                              <td className="px-2 py-2 text-right text-[#FBFCFC]">{formatPercent(row.clickRate)}</td>
                              <td className={`px-2 py-2 text-right ${row.bounceRate * 100 > BOUNCE_THRESHOLD ? 'text-red-400' : 'text-[#FBFCFC]'}`}>
                                {formatPercent(row.bounceRate)}
                              </td>
                              <td className={`px-2 py-2 text-right ${row.spamCount > 0 ? 'text-red-400' : 'text-[#FBFCFC]'}`}>
                                {row.spamCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex justify-end border-t border-navy-300/50 px-3 py-2">
                        <a
                          href={`${analyticsBase}?tab=categories`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-body-s text-blue-400 hover:text-blue-300"
                        >
                          See All
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Rate Charts Grid (2×2) ── */}
              {dailyStats.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <RateChart
                    title="Unique Open Rate %"
                    data={openRateData}
                    color="#4C83EE"
                    linkLabel="Opened Emails"
                    linkUrl={analyticsBase}
                  />
                  <RateChart
                    title="Click Rate %"
                    data={clickRateData}
                    color="#4C83EE"
                    linkLabel="Email Clicks"
                    linkUrl={analyticsBase}
                  />
                  <RateChart
                    title="Bounce Rate %"
                    data={bounceRateData}
                    color={isBounceAboveThreshold ? '#FB5151' : '#4C83EE'}
                    threshold={BOUNCE_THRESHOLD}
                    thresholdLabel={`threshold ${BOUNCE_THRESHOLD}.00%`}
                    linkLabel="Bounced Emails"
                    linkUrl={analyticsBase}
                    isCritical={isBounceAboveThreshold}
                  />
                  <RateChart
                    title="Spam Complaints %"
                    data={spamRateData}
                    color="#4C83EE"
                    threshold={SPAM_THRESHOLD}
                    thresholdLabel={`threshold ${SPAM_THRESHOLD.toFixed(2)}%`}
                    linkLabel="Spam Complaints"
                    linkUrl={analyticsBase}
                  />
                </div>
              )}
            </>
          )}

          {!stats && !statsLoading && !statsError && (
            <div className="rounded-mtui border border-dashed border-navy-300 p-12 text-center">
              <p className="text-body text-navy-100">
                No sending stats available for this domain yet.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LastUpdatedIndicator({
  lastFetchedAt,
  isFromCache,
  refreshing,
  rateLimited,
  onRefresh
}: {
  lastFetchedAt: string
  isFromCache: boolean
  refreshing: boolean
  rateLimited?: boolean
  onRefresh: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const staleMinutes = (Date.now() - new Date(lastFetchedAt).getTime()) / 60000
  const isStaleCache = isFromCache && staleMinutes > 10
  const showWarning = isStaleCache || rateLimited

  return (
    <div
      className="mb-4 flex items-center gap-2 text-body-s text-navy-200"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {refreshing ? (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-navy-100 border-t-transparent" />
      ) : hovered ? (
        <button
          onClick={onRefresh}
          className="flex h-3.5 w-3.5 items-center justify-center text-navy-100 transition-colors hover:text-blue-400"
          title="Refresh now"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.016 4.656v4.992" />
          </svg>
        </button>
      ) : showWarning ? (
        <svg className="h-3.5 w-3.5 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )}
      <span>
        {rateLimited
          ? 'Last updated ' + formatFetchedAt(lastFetchedAt) + '. Rate limit reached, will retry in a minute'
          : isStaleCache
            ? 'Cached data from ' + formatFetchedAt(lastFetchedAt)
            : 'Last updated ' + formatFetchedAt(lastFetchedAt)}
      </span>
    </div>
  )
}
