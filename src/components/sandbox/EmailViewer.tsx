import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'

interface FullMessage {
  id: number
  inbox_id: number
  subject: string
  from_email: string
  from_name: string
  to_email: string
  to_name: string
  sent_at: string
  created_at: string
  html_body: string
  text_body: string
  is_read: boolean
  human_size: string
}

type Tab = 'html' | 'text' | 'headers'

export default function EmailViewer() {
  const { inboxId, messageId } = useParams<{ inboxId: string; messageId: string }>()
  const [message, setMessage] = useState<FullMessage | null>(null)
  const [htmlBody, setHtmlBody] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('html')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (inboxId && messageId) loadCacheThenFetch()
  }, [inboxId, messageId])

  /** Load cached email first, then fetch fresh */
  const loadCacheThenFetch = async () => {
    if (!inboxId || !messageId) return

    // Step 1: Load cache instantly
    try {
      const cached = await window.electron.getEmailCache(Number(inboxId), Number(messageId))
      if (cached && cached.data) {
        const { message: msg, htmlBody: html } = cached.data as { message: FullMessage; htmlBody: string | null }
        if (msg) {
          setMessage(msg)
          setHtmlBody(html)
          setLoading(false)
        }
      }
    } catch {
      // no cache
    }

    // Step 2: Fetch fresh
    await fetchFreshMessage()
  }

  const fetchFreshMessage = async () => {
    if (!inboxId || !messageId) return
    const hadData = message !== null
    if (hadData) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const msg = await window.electron.getMessage(Number(inboxId), Number(messageId))
      setMessage(msg as unknown as FullMessage)
      setError(null)

      // Fetch HTML separately — non-fatal if it fails
      let html: string | null = null
      try {
        html = await window.electron.getMessageHtml(Number(inboxId), Number(messageId))
      } catch {
        // Some messages have no HTML body — that's OK
      }
      setHtmlBody(html)

      // Save to cache
      window.electron.saveEmailCache(Number(inboxId), Number(messageId), msg, html)
    } catch (err) {
      if (!message) {
        setError(err instanceof Error ? err.message : 'Failed to load message')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'html' && htmlBody && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlBody)
        doc.close()
      }
    }
  }, [activeTab, htmlBody])

  if (loading && !message) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-400 border-t-transparent" />
      </div>
    )
  }

  if ((error || !message) && !message) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <p className="text-body text-red-300">{error || 'Message not found'}</p>
        <Link to={`/sandbox/inbox/${inboxId}`} className="btn-primary">
          Back to inbox
        </Link>
      </div>
    )
  }

  if (!message) return null

  const tabs: { key: Tab; label: string }[] = [
    { key: 'html', label: 'HTML' },
    { key: 'text', label: 'Text' },
    { key: 'headers', label: 'Headers' }
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-navy-300 px-6 py-4">
        <div className="mb-3 flex items-center gap-3">
          <Link
            to={`/sandbox/inbox/${inboxId}`}
            className="rounded-mtui p-1.5 text-navy-100 transition-colors hover:bg-navy-500 hover:text-[#FBFCFC]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="text-heading-1 text-[#FBFCFC]">
            {message.subject || '(no subject)'}
          </h1>
          {refreshing && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          )}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 pl-10 text-body">
          <span className="text-navy-100">From</span>
          <span className="text-[#FBFCFC]">
            {message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}
          </span>
          <span className="text-navy-100">To</span>
          <span className="text-[#FBFCFC]">
            {message.to_name ? `${message.to_name} <${message.to_email}>` : message.to_email}
          </span>
          <span className="text-navy-100">Date</span>
          <span className="text-[#FBFCFC]">
            {new Date(message.sent_at || message.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-navy-300 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2.5 text-item-label transition-colors ${
              activeTab === tab.key
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-navy-100 hover:text-[#FBFCFC]'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="flex-1" />

        <a
          href={`https://mailtrap.io/inboxes/${inboxId}/messages/${messageId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2.5 text-body-s text-navy-100 transition-colors hover:text-blue-400"
        >
          Open in Mailtrap
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'html' && (
          htmlBody ? (
            <iframe
              ref={iframeRef}
              title="Email HTML Preview"
              className="h-full w-full border-0 bg-white"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-body text-navy-100">No HTML content available for this message.</p>
            </div>
          )
        )}
        {activeTab === 'text' && (
          <pre className="whitespace-pre-wrap p-6 text-body text-[#FBFCFC]">
            {message.text_body || 'No text content'}
          </pre>
        )}
        {activeTab === 'headers' && (
          <div className="space-y-2 p-6">
            <HeaderRow label="Subject" value={message.subject} />
            <HeaderRow label="From" value={`${message.from_name} <${message.from_email}>`} />
            <HeaderRow label="To" value={`${message.to_name} <${message.to_email}>`} />
            <HeaderRow label="Date" value={new Date(message.sent_at || message.created_at).toLocaleString()} />
            <HeaderRow label="Size" value={message.human_size} />
          </div>
        )}
      </div>
    </div>
  )
}

function HeaderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 rounded-mtui bg-navy-600 px-4 py-2.5">
      <span className="w-20 shrink-0 text-item-label-s text-navy-100">
        {label}
      </span>
      <span className="text-body text-[#FBFCFC]">{value}</span>
    </div>
  )
}
