import { Link } from 'react-router-dom'
import type { MessageSummary } from '../../../electron/api/types'

interface MessageListPanelProps {
  messages: MessageSummary[]
  selectedId: number | null
  onSelectMessage: (id: number) => void
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  inboxId: string
  inboxName: string
}

function timeAgo(dateStr: string): string {
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

export function MessageListPanel({
  messages,
  selectedId,
  onSelectMessage,
  loading,
  hasMore,
  onLoadMore,
  inboxId,
  inboxName,
}: MessageListPanelProps) {
  return (
    <div className="flex w-[420px] shrink-0 flex-col border-r border-grey-dark bg-navy-700">
      {/* Inbox header */}
      <div className="flex items-center gap-2 border-b border-grey-dark px-3 py-2.5">
        <Link
          to="/sandbox"
          className="rounded p-1 text-grey-muted transition-colors hover:bg-grey-bold hover:text-navy-air"
          aria-label="Back to sandboxes"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <span className="truncate text-item-label font-semibold text-navy-air">
          {inboxName}
        </span>
        <span className="ml-auto text-body-s text-grey-muted">
          {messages.length}
        </span>
      </div>

      {/* Search bar (visual only) */}
      <div className="border-b border-grey-dark px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-grey-solid px-2.5 py-1.5">
          <svg className="h-3.5 w-3.5 text-grey-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <span className="text-body-s text-grey-deep">Search...</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-neutral border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="px-3 py-8 text-center text-body-s text-grey-deep">
            No messages yet
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isSelected = selectedId === msg.id
              return (
                <button
                  key={msg.id}
                  onClick={() => onSelectMessage(msg.id)}
                  className={`w-full border-b border-grey-dark/30 px-3 py-2.5 text-left transition-colors ${
                    isSelected ? 'bg-blue-neutral' : 'hover:bg-grey-solid'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`truncate leading-tight ${
                        isSelected
                          ? 'text-white'
                          : !msg.isRead
                            ? 'text-email-default text-navy-air'
                            : 'text-email-read text-navy-air'
                      }`}
                    >
                      {msg.subject || '(no subject)'}
                    </span>
                    <span className={`shrink-0 text-[11px] leading-tight ${isSelected ? 'text-white/70' : 'text-grey-muted'}`}>
                      {timeAgo(msg.sentAt)}
                    </span>
                  </div>
                  <div className={`mt-0.5 truncate text-[11px] ${isSelected ? 'text-white/70' : 'text-grey-muted'}`}>
                    to: &lt;{msg.toEmail}&gt;
                  </div>
                </button>
              )
            })}
            {hasMore && (
              <button
                onClick={onLoadMore}
                className="w-full py-2.5 text-center text-body-s text-blue-neutral hover:text-blue-medium"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
