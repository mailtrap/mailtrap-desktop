import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import type { EmailEvent, VendorCapabilities } from '../../../electron/api/types'

function eventColor(event: string): string {
  const lower = event.toLowerCase()
  if (lower === 'delivered' || lower === 'sent') return 'text-green-medium'
  if (lower.includes('bounce') || lower === 'failed') return 'text-red-medium'
  if (lower.includes('spam') || lower.includes('complaint')) return 'text-orange-medium'
  if (lower === 'opened' || lower === 'open' || lower === 'clicked' || lower === 'click') return 'text-blue-neutral'
  return 'text-navy-air'
}

function formatEventType(event: string): string {
  if (!event) return '-'
  return event.charAt(0).toUpperCase() + event.slice(1).toLowerCase()
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function EventsView() {
  const [capabilities, setCapabilities] = useState<VendorCapabilities | null>(null)
  const [events, setEvents] = useState<EmailEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    window.electron.getCapabilities()
      .then(setCapabilities)
      .catch(() => {
        setError('Failed to load capabilities')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (capabilities && capabilities.eventsLog) {
      loadEvents(true)
    }
  }, [capabilities])

  const loadEvents = async (reset: boolean) => {
    const nextPage = reset ? 1 : page + 1

    if (reset) {
      setLoading(true)
      setEvents([])
      setPage(1)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }
    setError(null)

    try {
      const result = await window.electron.getEvents(null, nextPage)
      if (reset) {
        setEvents(result)
      } else {
        setEvents((prev) => [...prev, ...result])
      }
      setPage(nextPage)
      // If fewer than 100 results, no more pages
      if (result.length < 100) {
        setHasMore(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Capability guard
  if (capabilities && !capabilities.eventsLog) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            Events are not available for this service.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-medium">{error}</p>
        <Button onClick={() => loadEvents(true)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-heading-1 text-navy-air">Activity</h1>
        <Button variant="ghost" size="sm" onClick={() => loadEvents(true)}>
          Refresh
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-mtui border border-dashed border-grey-dark p-12 text-center">
          <p className="text-body text-grey-muted">
            No events found for this period.
          </p>
        </div>
      ) : (
        <>
          <div className="mtui-table-wrap">
            <table className="mtui-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Event</th>
                  <th>Subject</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr
                    key={evt.id}
                    className="transition-colors duration-mtui ease-mtui hover:bg-grey-shade/40"
                  >
                    <td className="max-w-[200px] truncate">{evt.recipient}</td>
                    <td>
                      <span className={eventColor(evt.event)}>
                        {formatEventType(evt.event)}
                      </span>
                    </td>
                    <td className="max-w-[250px] truncate !text-grey-muted">
                      {evt.subject || '\u2014'}
                    </td>
                    <td className="!text-grey-muted whitespace-nowrap">
                      {formatDate(evt.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                loading={loadingMore}
                onClick={() => loadEvents(false)}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-mtui border border-orange-300/30 bg-orange-300/10 px-4 py-3">
              <p className="text-body-s text-orange-medium">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
