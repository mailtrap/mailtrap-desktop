import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../ui/Button'

interface MessageSummary {
  id: number
  inboxId: number
  subject: string
  fromEmail: string
  fromName: string
  toEmail: string
  toName: string
  sentAt: string
  isRead: boolean
  size: string
}

export default function MessageList() {
  const { inboxId } = useParams<{ inboxId: string }>()
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (inboxId) loadCacheThenFetch()
  }, [inboxId])

  /** Load cached messages first, then fetch fresh */
  const loadCacheThenFetch = async () => {
    if (!inboxId) return

    // Step 1: Load cache instantly
    try {
      const cached = await window.electron.getMessagesCache(Number(inboxId))
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        setMessages(cached.data as MessageSummary[])
        setHasMore(cached.data.length >= 30)
        setLoading(false)
      }
    } catch {
      // no cache
    }

    // Step 2: Fetch fresh
    await fetchFreshMessages(1)
  }

  const fetchFreshMessages = async (pageNum: number) => {
    if (!inboxId) return
    const hadData = messages.length > 0 && pageNum === 1
    if (hadData) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await window.electron.getMessages(Number(inboxId), pageNum)
      if (pageNum === 1) {
        setMessages(data)
        // Save first page to cache
        window.electron.saveMessagesCache(Number(inboxId), data)
      } else {
        setMessages((prev) => [...prev, ...data])
      }
      setHasMore(data.length === 30)
      setPage(pageNum)
      setError(null)
    } catch (err) {
      if (messages.length === 0) {
        setError(err instanceof Error ? err.message : 'Failed to load messages')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-neutral border-t-transparent" />
      </div>
    )
  }

  if (error && messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-medium">{error}</p>
        <Button onClick={() => fetchFreshMessages(1)}>Retry</Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-grey-dark px-6 py-4">
        <Link
          to="/sandbox"
          className="rounded-mtui p-1.5 text-grey-muted transition-colors hover:bg-grey-bold hover:text-navy-air"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-heading-2 text-navy-air">Inbox</h1>
        <span className="text-body-s text-grey-muted">
          {messages.length} messages
        </span>
        {refreshing && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-neutral border-t-transparent" />
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-body text-grey-muted">
              No messages yet. Send a test email to this inbox.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-grey-dark/50">
            {messages.map((msg) => (
              <Link
                key={msg.id}
                to={`/sandbox/inbox/${inboxId}/message/${msg.id}`}
                className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-grey-solid"
              >
                {/* Unread dot */}
                <div className="w-2 shrink-0">
                  {!msg.isRead && (
                    <div className="h-2 w-2 rounded-full bg-blue-neutral" />
                  )}
                </div>

                {/* From */}
                <div className="w-40 shrink-0 truncate">
                  <span
                    className={`text-body ${
                      !msg.isRead
                        ? 'font-semibold text-navy-air'
                        : 'text-grey-muted'
                    }`}
                  >
                    {msg.fromName || msg.fromEmail}
                  </span>
                </div>

                {/* Subject */}
                <div className="min-w-0 flex-1 truncate">
                  <span
                    className={`text-body ${
                      !msg.isRead
                        ? 'font-medium text-navy-air'
                        : 'text-grey-muted'
                    }`}
                  >
                    {msg.subject || '(no subject)'}
                  </span>
                </div>

                {/* Date */}
                <div className="shrink-0 text-body-s text-grey-deep">
                  {formatDate(msg.sentAt)}
                </div>

                {/* Size */}
                <div className="shrink-0 text-body-s text-grey-deep">
                  {msg.size}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && messages.length > 0 && (
          <div className="flex justify-center py-4">
            <Button
              variant="dark-outline"
              onClick={() => fetchFreshMessages(page + 1)}
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
