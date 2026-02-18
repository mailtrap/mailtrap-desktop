import { useState } from 'react'

interface LastUpdatedIndicatorProps {
  lastFetchedAt: string
  isFromCache: boolean
  refreshing: boolean
  rateLimited?: boolean
  onRefresh: () => void
}

function formatFetchedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function LastUpdatedIndicator({
  lastFetchedAt,
  isFromCache,
  refreshing,
  rateLimited,
  onRefresh,
}: LastUpdatedIndicatorProps) {
  const [hovered, setHovered] = useState(false)
  const staleMinutes = (Date.now() - new Date(lastFetchedAt).getTime()) / 60000
  const isStaleCache = isFromCache && staleMinutes > 10
  const showWarning = isStaleCache || rateLimited

  let label: string
  if (rateLimited) {
    label = `Last updated ${formatFetchedAt(lastFetchedAt)}. Rate limit reached, will retry in a minute`
  } else if (isStaleCache) {
    label = `Cached data from ${formatFetchedAt(lastFetchedAt)}`
  } else {
    label = `Last updated ${formatFetchedAt(lastFetchedAt)}`
  }

  return (
    <div
      className="mb-4 flex items-center gap-2 text-body-s text-grey-deep"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {refreshing ? (
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-grey-muted border-t-transparent" />
      ) : hovered ? (
        <button
          onClick={onRefresh}
          className="flex h-3.5 w-3.5 items-center justify-center text-grey-muted transition-colors duration-mtui ease-mtui hover:text-blue-neutral"
          title="Refresh now"
          aria-label="Refresh now"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.016 4.656v4.992" />
          </svg>
        </button>
      ) : showWarning ? (
        <svg className="h-3.5 w-3.5 text-orange-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 text-green-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      )}
      <span>{label}</span>
    </div>
  )
}
