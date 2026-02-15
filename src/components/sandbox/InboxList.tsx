import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'

interface InboxSummary {
  id: number
  name: string
  projectName: string
  sentCount: number
  unreadCount: number
  totalCount: number
  lastEmailSubject: string | null
  lastEmailDate: string | null
  lastMessageAt: string | null
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Empty'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffMonths === 1) return 'a month ago'
  return `${diffMonths} months ago`
}

/** Toggle switch component */
function Toggle({
  checked,
  indeterminate,
  onChange,
  title
}: {
  checked: boolean
  indeterminate?: boolean
  onChange: () => void
  title?: string
}) {
  return (
    <button
      onClick={onChange}
      className="inline-flex items-center justify-center"
      title={title}
    >
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          indeterminate
            ? 'bg-blue-400/50'
            : checked
              ? 'bg-blue-400'
              : 'bg-navy-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            indeterminate
              ? 'translate-x-2'
              : checked
                ? 'translate-x-4'
                : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  )
}

export default function InboxList() {
  const [inboxes, setInboxes] = useState<InboxSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null)
  /** Set of inbox IDs hidden from the tray (toggled off) */
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set())

  const fetchFreshRef = useRef<() => Promise<void>>(() => Promise.resolve())

  useEffect(() => {
    loadCacheThenFetch()
    loadHiddenIds()
  }, [])

  // Set up auto-refresh timer based on testingPollingIntervalMs setting
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    window.electron.getSettings().then((s: any) => {
      const interval = s?.testingPollingIntervalMs || 60000
      timer = setInterval(() => {
        fetchFreshRef.current()
      }, interval)
    })

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [])

  /** Load cached data first, then fetch fresh data in background */
  const loadCacheThenFetch = async () => {
    // Step 1: Load cache instantly
    try {
      const cached = await window.electron.getInboxSummariesCache()
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        setInboxes(cached.data as InboxSummary[])
        setIsFromCache(true)
        setLastFetchedAt(cached.fetchedAt)
        setLoading(false)
      }
    } catch {
      // no cache available
    }

    // Step 2: Fetch fresh data in background
    await fetchFresh()
  }

  const fetchFresh = useCallback(async () => {
    let hasData = false
    setInboxes((prev) => { hasData = prev.length > 0; return prev })

    const startTime = Date.now()
    if (hasData) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await window.electron.getInboxSummaries()
      setInboxes(data)
      setIsFromCache(false)
      setLastFetchedAt(new Date().toISOString())
      setError(null)

      // Save to cache for next launch
      window.electron.saveInboxSummariesCache(data)
    } catch (err) {
      setInboxes((prev) => {
        if (prev.length === 0) {
          setError(err instanceof Error ? err.message : 'Failed to load inboxes')
        }
        return prev
      })
    } finally {
      // Keep spinner visible for at least 1s so user notices the refresh
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 1000 - elapsed)
      setTimeout(() => {
        setLoading(false)
        setRefreshing(false)
      }, remaining)
    }
  }, [])

  // Keep the ref pointing to the latest fetchFresh
  useEffect(() => {
    fetchFreshRef.current = fetchFresh
  }, [fetchFresh])

  const loadHiddenIds = async () => {
    try {
      const ids: number[] = await window.electron.getHiddenTrayInboxIds()
      setHiddenIds(new Set(ids))
    } catch {
      // ignore
    }
  }

  const toggleTrayVisibility = async (inboxId: number) => {
    const newVisible = hiddenIds.has(inboxId)

    setHiddenIds((prev) => {
      const next = new Set(prev)
      if (newVisible) next.delete(inboxId)
      else next.add(inboxId)
      return next
    })

    try {
      await window.electron.setInboxTrayVisibility(inboxId, newVisible)
    } catch {
      // Revert
      setHiddenIds((prev) => {
        const next = new Set(prev)
        if (newVisible) next.add(inboxId)
        else next.delete(inboxId)
        return next
      })
    }
  }

  const toggleProjectVisibility = async (projectInboxes: InboxSummary[]) => {
    const ids = projectInboxes.map((i) => i.id)
    const allVisible = ids.every((id) => !hiddenIds.has(id))
    // If all visible -> hide all, otherwise -> show all
    const newVisible = !allVisible

    // Optimistic update
    setHiddenIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (newVisible) next.delete(id)
        else next.add(id)
      }
      return next
    })

    try {
      await window.electron.setTrayVisibilityBatch(
        ids.map((inboxId) => ({ inboxId, visible: newVisible }))
      )
    } catch {
      // Revert
      setHiddenIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) {
          if (newVisible) next.add(id)
          else next.delete(id)
        }
        return next
      })
    }
  }

  if (loading && inboxes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
      </div>
    )
  }

  if (error && inboxes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-300">{error}</p>
        <button onClick={fetchFresh} className="btn-primary">
          Retry
        </button>
      </div>
    )
  }

  // Group inboxes by project
  const grouped = inboxes.reduce<Record<string, InboxSummary[]>>((acc, inbox) => {
    const key = inbox.projectName
    if (!acc[key]) acc[key] = []
    acc[key].push(inbox)
    return acc
  }, {})

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mb-1">
        <h1 className="text-heading-1 text-[#FBFCFC]">Projects</h1>
      </div>

      {/* Last fetched indicator */}
      {lastFetchedAt && (
        <LastUpdatedIndicator
          lastFetchedAt={lastFetchedAt}
          isFromCache={isFromCache}
          refreshing={refreshing}
          onRefresh={fetchFresh}
        />
      )}

      {inboxes.length === 0 ? (
        <div className="rounded-mtui border border-dashed border-navy-300 p-12 text-center">
          <p className="text-body text-navy-100">
            No sandboxes found. Create one in the{' '}
            <a
              href="https://mailtrap.io/inboxes"
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
        <div className="space-y-6">
          {Object.entries(grouped).map(([projectName, projectInboxes]) => {
            const projectIds = projectInboxes.map((i) => i.id)
            const visibleCount = projectIds.filter((id) => !hiddenIds.has(id)).length
            const allVisible = visibleCount === projectIds.length
            const noneVisible = visibleCount === 0
            const indeterminate = !allVisible && !noneVisible

            return (
              <div
                key={projectName}
                className="rounded-mtui border border-navy-300 bg-navy-600"
              >
                {/* Project header */}
                <div className="flex items-center border-b border-navy-300">
                  <div className="flex flex-1 items-center gap-2 px-5 py-3">
                    <svg className="h-4 w-4 text-navy-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                    <span className="text-item-label text-[#FBFCFC] font-semibold">
                      {projectName}
                    </span>
                  </div>
                  <div className="px-4 py-3 text-center" style={{ width: '88px' }}>
                    <Toggle
                      checked={allVisible}
                      indeterminate={indeterminate}
                      onChange={() => toggleProjectVisibility(projectInboxes)}
                      title={
                        allVisible
                          ? 'Hide all sandboxes from tray'
                          : 'Show all sandboxes in tray'
                      }
                    />
                  </div>
                </div>

                {/* Table */}
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-300/50 text-left">
                      <th className="px-5 py-2.5 text-item-label-s font-medium text-navy-100">
                        Sandboxes
                      </th>
                      <th className="px-4 py-2.5 text-item-label-s font-medium text-navy-100">
                        Total Sent
                      </th>
                      <th className="px-4 py-2.5 text-item-label-s font-medium text-navy-100">
                        Messages
                      </th>
                      <th className="px-4 py-2.5 text-item-label-s font-medium text-navy-100">
                        Last message
                      </th>
                      <th className="px-4 py-2.5 text-item-label-s font-medium text-navy-100">
                        Last email subject
                      </th>
                      <th className="px-4 py-2.5 text-center text-item-label-s font-medium text-navy-100">
                        Tray
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectInboxes.map((inbox, idx) => {
                      const isVisible = !hiddenIds.has(inbox.id)
                      return (
                        <tr
                          key={inbox.id}
                          className={`transition-colors hover:bg-navy-500/50 ${
                            idx < projectInboxes.length - 1 ? 'border-b border-navy-300/30' : ''
                          }`}
                        >
                          {/* Sandbox name */}
                          <td className="px-5 py-3">
                            <Link
                              to={`/sandbox/inbox/${inbox.id}`}
                              className="text-body text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              {inbox.name}
                            </Link>
                          </td>

                          {/* Total Sent */}
                          <td className="px-4 py-3 text-body text-[#FBFCFC]">
                            {inbox.sentCount}
                          </td>

                          {/* Messages (unread / total) */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-body text-[#FBFCFC]">
                              <svg className="h-4 w-4 text-navy-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                              </svg>
                              {inbox.unreadCount} / {inbox.totalCount}
                            </div>
                          </td>

                          {/* Last message (time ago) */}
                          <td className="px-4 py-3 text-body text-navy-100">
                            {timeAgo(inbox.lastMessageAt)}
                          </td>

                          {/* Last email subject */}
                          <td className="max-w-[200px] truncate px-4 py-3 text-body text-navy-100">
                            {inbox.lastEmailSubject || '—'}
                          </td>

                          {/* Tray visibility toggle */}
                          <td className="px-4 py-3 text-center">
                            <Toggle
                              checked={isVisible}
                              onChange={() => toggleTrayVisibility(inbox.id)}
                              title={isVisible ? 'Shown in tray menu' : 'Hidden from tray menu'}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LastUpdatedIndicator({
  lastFetchedAt,
  isFromCache,
  refreshing,
  onRefresh
}: {
  lastFetchedAt: string
  isFromCache: boolean
  refreshing: boolean
  onRefresh: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const staleMinutes = (Date.now() - new Date(lastFetchedAt).getTime()) / 60000
  const isStaleCache = isFromCache && staleMinutes > 10

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
      ) : isStaleCache ? (
        <svg className="h-3.5 w-3.5 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )}
      <span>
        {isStaleCache ? 'Cached data from ' : 'Last updated '}
        {new Date(lastFetchedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
    </div>
  )
}
