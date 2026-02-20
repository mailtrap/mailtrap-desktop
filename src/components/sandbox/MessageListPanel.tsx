import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { timeAgo } from '../../utils/formatters'
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
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  // Reset search when switching inboxes
  useEffect(() => { setSearch('') }, [inboxId])

  const filteredMessages = useMemo(() => {
    if (!search.trim()) return messages
    const q = search.toLowerCase()
    return messages.filter(
      (msg) =>
        (msg.subject || '').toLowerCase().includes(q) ||
        msg.toEmail.toLowerCase().includes(q) ||
        msg.fromEmail.toLowerCase().includes(q)
    )
  }, [messages, search])

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
          {search ? `${filteredMessages.length}/${messages.length}` : messages.length}
        </span>
      </div>

      {/* Search bar */}
      <div className="border-b border-grey-dark px-3 py-2">
        <div className="flex items-center gap-2 rounded-md bg-grey-solid px-2.5 py-1.5">
          {!searchFocused && !search && (
            <svg className="h-3.5 w-3.5 shrink-0 text-grey-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full bg-transparent text-body-s text-navy-air placeholder-grey-deep outline-none"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="shrink-0 text-grey-deep hover:text-navy-air"
              aria-label="Clear search"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-neutral border-t-transparent" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="px-3 py-8 text-center text-body-s text-grey-deep">
            {search ? 'No matching messages' : 'No messages yet'}
          </div>
        ) : (
          <>
            {filteredMessages.map((msg) => {
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
            {hasMore && !search && (
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
