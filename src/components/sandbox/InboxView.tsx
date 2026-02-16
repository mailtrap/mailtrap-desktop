import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import Prism from 'prismjs'
import 'prismjs/components/prism-markup'
import 'prismjs/themes/prism-tomorrow.css'

// ── Types ──

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
  html_path: string
  txt_path: string
  raw_path: string
  html_source_path: string
  blacklists_report_info: boolean | Record<string, unknown>
  smtp_information?: {
    ok: boolean
    data?: {
      mail_from_addr: string
      client_ip: string
    }
  }
}

interface InboxMeta {
  name: string
  projectName: string
}

type Tab = 'html' | 'html_source' | 'text' | 'raw' | 'tech_info'
type DevicePreview = 'mobile' | 'tablet' | 'desktop'

// ── Helpers ──

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

// ── Main Component ──

export default function InboxView() {
  const { inboxId } = useParams<{ inboxId: string }>()

  // Message list state
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Selected message state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState<FullMessage | null>(null)
  const [htmlBody, setHtmlBody] = useState<string | null>(null)
  const [msgLoading, setMsgLoading] = useState(false)

  // Tab content
  const [activeTab, setActiveTab] = useState<Tab>('html')
  const [tabContent, setTabContent] = useState<string>('')
  const [tabLoading, setTabLoading] = useState(false)
  const [showHeaders, setShowHeaders] = useState(false)
  const [emailHeaders, setEmailHeaders] = useState<{ name: string; value: string }[]>([])

  // Device preview
  const [devicePreview, setDevicePreview] = useState<DevicePreview>('desktop')

  // Inbox metadata (name, project)
  const [inboxMeta, setInboxMeta] = useState<InboxMeta | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // ── Load inbox metadata from cache ──
  useEffect(() => {
    if (!inboxId) return
    window.electron.getInboxSummariesCache().then((cached: { data: { id: number; name: string; projectName: string }[] } | null) => {
      if (cached?.data) {
        const inbox = cached.data.find((i: { id: number }) => i.id === Number(inboxId))
        if (inbox) {
          setInboxMeta({ name: inbox.name, projectName: inbox.projectName })
        }
      }
    }).catch(() => {})
  }, [inboxId])

  // ── Load messages ──
  useEffect(() => {
    if (inboxId) loadMessages()
  }, [inboxId])

  const loadMessages = async () => {
    if (!inboxId) return
    setListLoading(true)

    // Load from cache first
    try {
      const cached = await window.electron.getMessagesCache(Number(inboxId))
      if (cached?.data?.length > 0) {
        setMessages(cached.data as MessageSummary[])
        setHasMore(cached.data.length >= 30)
        setListLoading(false)
        if (!selectedId && cached.data.length > 0) {
          setSelectedId(cached.data[0].id)
        }
      }
    } catch {}

    // Fetch fresh
    try {
      const data = await window.electron.getMessages(Number(inboxId), 1)
      setMessages(data)
      setHasMore(data.length === 30)
      setPage(1)
      window.electron.saveMessagesCache(Number(inboxId), data)
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id)
      }
    } catch {}
    setListLoading(false)
  }

  const loadMore = async () => {
    if (!inboxId) return
    const nextPage = page + 1
    try {
      const data = await window.electron.getMessages(Number(inboxId), nextPage)
      setMessages(prev => [...prev, ...data])
      setHasMore(data.length === 30)
      setPage(nextPage)
    } catch {}
  }

  // ── Load selected message ──
  useEffect(() => {
    if (selectedId && inboxId) loadMessage(selectedId)
  }, [selectedId, inboxId])

  const loadMessage = async (msgId: number) => {
    if (!inboxId) return
    setMsgLoading(true)
    setMessage(null)
    setHtmlBody(null)
    setTabContent('')
    setEmailHeaders([])
    setActiveTab('html')
    setShowHeaders(false)

    // Load from cache
    try {
      const cached = await window.electron.getEmailCache(Number(inboxId), msgId)
      if (cached?.data) {
        const { message: msg, htmlBody: html } = cached.data as { message: FullMessage; htmlBody: string | null }
        if (msg) {
          setMessage(msg)
          setHtmlBody(html)
          setMsgLoading(false)
        }
      }
    } catch {}

    // Fetch fresh
    try {
      const msg = await window.electron.getMessage(Number(inboxId), msgId) as FullMessage
      setMessage(msg)

      let html: string | null = null
      try {
        html = await window.electron.getMessageHtml(Number(inboxId), msgId)
      } catch {}
      setHtmlBody(html)

      window.electron.saveEmailCache(Number(inboxId), msgId, msg, html)
    } catch {}
    setMsgLoading(false)
  }

  // ── Write HTML to iframe ──
  useEffect(() => {
    if (activeTab === 'html' && htmlBody && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(htmlBody)
        doc.close()
      }
    }
  }, [activeTab, htmlBody, devicePreview])

  // ── Fetch tab content on tab change ──
  const fetchTabContent = useCallback(async (tab: Tab) => {
    if (!message || !inboxId) return

    if (tab === 'html') return // handled by iframe
    setTabLoading(true)
    setTabContent('')

    try {
      switch (tab) {
        case 'html_source':
          if (message.html_source_path) {
            const content = await window.electron.getMessageContent(message.html_source_path)
            setTabContent(content)
          } else {
            setTabContent('No HTML source available')
          }
          break
        case 'text':
          if (message.txt_path) {
            const content = await window.electron.getMessageContent(message.txt_path)
            setTabContent(content)
          } else {
            setTabContent('No text content available')
          }
          break
        case 'raw':
          if (message.raw_path) {
            const content = await window.electron.getMessageContent(message.raw_path)
            setTabContent(content)
          } else {
            setTabContent('No raw content available')
          }
          break
        case 'tech_info':
          if (message.raw_path) {
            try {
              const raw = await window.electron.getMessageContent(message.raw_path)
              if (raw) {
                const headerSection = raw.split(/\r?\n\r?\n/)[0] || ''
                const parsed = parseEmailHeaders(headerSection)
                setEmailHeaders(parsed)
              }
            } catch {
              setEmailHeaders([])
            }
          }
          break
      }
    } catch {
      setTabContent('Failed to load content')
    }
    setTabLoading(false)
  }, [message, inboxId])

  useEffect(() => {
    if (activeTab !== 'html') {
      fetchTabContent(activeTab)
    }
  }, [activeTab, fetchTabContent])

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab)
  }

  // ── Tab definitions ──
  const tabs: { key: Tab; label: string }[] = [
    { key: 'html', label: 'HTML' },
    { key: 'html_source', label: 'HTML Source' },
    { key: 'text', label: 'Text' },
    { key: 'raw', label: 'Raw' },
    { key: 'tech_info', label: 'Tech Info' }
  ]

  return (
    <div className="flex h-full">
      {/* ── Left: Message List ── */}
      <div className="flex w-[280px] shrink-0 flex-col border-r border-grey-dark bg-navy-700">
        {/* Inbox header */}
        <div className="flex items-center gap-2 border-b border-grey-dark px-3 py-2.5">
          <Link
            to="/sandbox"
            className="rounded p-1 text-grey-muted transition-colors hover:bg-grey-bold hover:text-navy-air"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="truncate text-item-label font-semibold text-navy-air">
            {inboxMeta?.name || 'Inbox'}
          </span>
          <span className="ml-auto text-body-s text-grey-deep">
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
          {listLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-neutral border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="px-3 py-8 text-center text-body-s text-grey-deep">
              No messages yet
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => setSelectedId(msg.id)}
                  className={`w-full border-b border-grey-dark/30 px-3 py-2.5 text-left transition-colors ${
                    selectedId === msg.id
                      ? 'bg-blue-400/15'
                      : 'hover:bg-grey-solid'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`truncate leading-tight ${
                        !msg.isRead
                          ? 'text-email-default text-navy-air'
                          : 'text-email-read text-navy-air'
                      }`}
                    >
                      {msg.subject || '(no subject)'}
                    </span>
                    <span className="shrink-0 text-[11px] leading-tight text-grey-deep">
                      {timeAgo(msg.sentAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-grey-deep">
                    to: &lt;{msg.toEmail}&gt;
                  </div>
                </button>
              ))}
              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full py-2.5 text-center text-body-s text-blue-neutral hover:text-blue-medium"
                >
                  Load more
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right: Email Viewer ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!selectedId || (!message && !msgLoading) ? (
          <div className="flex flex-1 items-center justify-center text-body text-grey-deep">
            Select a message to view
          </div>
        ) : msgLoading && !message ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-neutral border-t-transparent" />
          </div>
        ) : message ? (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 border-b border-grey-dark px-5 py-2 text-body-s">
              <Link to="/sandbox" className="text-grey-deep hover:text-blue-neutral">
                Sandboxes
              </Link>
              <span className="text-navy-300">&gt;</span>
              <span className="truncate text-navy-air">
                {inboxMeta?.name || 'Inbox'}
              </span>
              <span className="text-navy-300">&gt;</span>
              <span className="truncate text-navy-air">
                {message.subject || '(no subject)'}
              </span>
            </div>

            {/* Subject + Meta */}
            <div className="border-b border-grey-dark px-5 py-3">
              <div className="flex items-start justify-between">
                <h1 className="text-heading-2 text-navy-air">
                  {message.subject || '(no subject)'}
                </h1>
                <div className="shrink-0 text-right text-body-s text-grey-deep">
                  {new Date(message.sent_at || message.created_at).toLocaleString([], {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  , {message.human_size}
                </div>
              </div>

              {/* From / To */}
              <div className="mt-2 space-y-0.5 text-body-s">
                <div>
                  <span className="text-grey-deep">From: </span>
                  <span className="text-navy-air">
                    {message.from_name
                      ? `${message.from_name} <${message.from_email}>`
                      : message.from_email}
                  </span>
                </div>
                <div>
                  <span className="text-grey-deep">To: </span>
                  <span className="text-navy-air">
                    {message.to_name
                      ? `${message.to_name} <${message.to_email}>`
                      : message.to_email}
                  </span>
                </div>
              </div>

              {/* Show Headers toggle */}
              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="mt-1.5 text-body-s text-blue-neutral hover:text-blue-medium"
              >
                {showHeaders ? 'Hide Headers' : 'Show Headers'}
              </button>

              {/* Expanded headers */}
              {showHeaders && (
                <div className="mt-2 space-y-1 rounded-md bg-grey-solid p-3 text-body-s">
                  <HeaderLine label="Subject" value={message.subject} />
                  <HeaderLine
                    label="From"
                    value={message.from_name ? `${message.from_name} <${message.from_email}>` : message.from_email}
                  />
                  <HeaderLine
                    label="To"
                    value={message.to_name ? `${message.to_name} <${message.to_email}>` : message.to_email}
                  />
                  <HeaderLine
                    label="Date"
                    value={new Date(message.sent_at || message.created_at).toLocaleString()}
                  />
                  <HeaderLine label="Size" value={message.human_size} />
                  {message.smtp_information?.data?.mail_from_addr && (
                    <HeaderLine label="MAIL FROM" value={message.smtp_information.data.mail_from_addr} />
                  )}
                  {message.smtp_information?.data?.client_ip && (
                    <HeaderLine label="Client IP" value={message.smtp_information.data.client_ip} />
                  )}
                </div>
              )}
            </div>

            {/* Tab bar */}
            <div className="flex items-center border-b border-grey-dark px-5">
              <div className="flex gap-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => handleTabClick(tab.key)}
                    className={`border-b-2 px-3.5 py-2 text-tab transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-neutral text-navy-air'
                        : 'border-transparent text-grey-muted hover:text-navy-air'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              {/* Device preview (HTML tab only) */}
              {activeTab === 'html' && (
                <div className="flex items-center gap-1">
                  <DeviceButton
                    active={devicePreview === 'mobile'}
                    onClick={() => setDevicePreview('mobile')}
                    title="Mobile"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </DeviceButton>
                  <DeviceButton
                    active={devicePreview === 'tablet'}
                    onClick={() => setDevicePreview('tablet')}
                    title="Tablet"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.5a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </DeviceButton>
                  <DeviceButton
                    active={devicePreview === 'desktop'}
                    onClick={() => setDevicePreview('desktop')}
                    title="Desktop"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                    </svg>
                  </DeviceButton>
                </div>
              )}

              {/* Open in Mailtrap link */}
              <a
                href={`https://mailtrap.io/inboxes/${inboxId}/messages/${message.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 flex items-center gap-1 text-body-s text-grey-muted transition-colors hover:text-blue-neutral"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {tabLoading && activeTab !== 'html' ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-neutral border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* HTML */}
                  {activeTab === 'html' && (
                    htmlBody ? (
                      devicePreview === 'desktop' ? (
                        /* Desktop: full-width, no frame */
                        <div className="h-full">
                          <iframe
                            ref={iframeRef}
                            key={`${message.id}-desktop`}
                            title="Email HTML Preview"
                            className="h-full w-full border-0 bg-white"
                            sandbox="allow-same-origin"
                          />
                        </div>
                      ) : devicePreview === 'tablet' ? (
                        /* Tablet: device frame */
                        <div className="flex h-full items-start justify-center overflow-auto py-6">
                          <div className="flex flex-col items-center">
                            <div
                              className="overflow-hidden rounded-[2rem] border-[3px] border-blue-neutral/60"
                              style={{ width: '768px', height: '1024px', maxHeight: 'calc(100vh - 300px)' }}
                            >
                              <iframe
                                ref={iframeRef}
                                key={`${message.id}-tablet`}
                                title="Email HTML Preview — Tablet"
                                className="h-full w-full border-0 bg-white"
                                sandbox="allow-same-origin"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Mobile: phone frame with home button */
                        <div className="flex h-full items-start justify-center overflow-auto py-6">
                          <div className="flex flex-col items-center">
                            <div
                              className="flex flex-col overflow-hidden rounded-[2.5rem] border-[3px] border-blue-neutral/60"
                              style={{ width: '375px' }}
                            >
                              {/* Screen */}
                              <div style={{ height: '667px', maxHeight: 'calc(100vh - 360px)' }}>
                                <iframe
                                  ref={iframeRef}
                                  key={`${message.id}-mobile`}
                                  title="Email HTML Preview — Mobile"
                                  className="h-full w-full border-0 bg-white"
                                  sandbox="allow-same-origin"
                                />
                              </div>
                              {/* Home button area */}
                              <div className="flex items-center justify-center bg-navy-void py-3">
                                <div className="h-8 w-8 rounded-full border-[2.5px] border-grey-dark" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-body text-grey-muted">
                          No HTML content available
                        </p>
                      </div>
                    )
                  )}

                  {/* HTML Source */}
                  {activeTab === 'html_source' && (
                    <SyntaxHighlightedCode code={tabContent} language="markup" fallback="No HTML source available" />
                  )}

                  {/* Text */}
                  {activeTab === 'text' && (
                    <pre className="whitespace-pre-wrap p-5 text-body text-navy-air">
                      {tabContent || 'No text content'}
                    </pre>
                  )}

                  {/* Raw */}
                  {activeTab === 'raw' && (
                    <SyntaxHighlightedCode code={tabContent} language="markup" fallback="No raw content available" />
                  )}

                  {/* Tech Info */}
                  {activeTab === 'tech_info' && (
                    <div className="p-5">
                      <TechInfoView message={message} emailHeaders={emailHeaders} />
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

// ── Sub-components ──

function SyntaxHighlightedCode({
  code,
  language,
  fallback
}: {
  code: string
  language: string
  fallback: string
}) {
  const highlighted = useMemo(() => {
    if (!code) return ''
    try {
      return Prism.highlight(code, Prism.languages[language] || Prism.languages.markup, language)
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
  }, [code, language])

  if (!code) {
    return (
      <pre className="p-5 font-mono text-body-s text-grey-deep">{fallback}</pre>
    )
  }

  return (
    <div className="overflow-auto p-5">
      <pre
        className="font-mono text-[13px] leading-[1.6]"
        style={{ background: 'transparent', margin: 0, padding: 0 }}
      >
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
          style={{ background: 'transparent' }}
        />
      </pre>
    </div>
  )
}

function HeaderLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-grey-deep">{label}</span>
      <span className="text-navy-air">{value}</span>
    </div>
  )
}

function DeviceButton({
  active,
  onClick,
  title,
  children
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-grey-bold text-navy-air'
          : 'text-grey-deep hover:text-navy-air'
      }`}
    >
      {children}
    </button>
  )
}

function parseEmailHeaders(headerSection: string): { name: string; value: string }[] {
  const headers: { name: string; value: string }[] = []
  const lines = headerSection.split(/\r?\n/)
  let current: { name: string; value: string } | null = null

  for (const line of lines) {
    if (/^\s/.test(line) && current) {
      current.value += ' ' + line.trim()
    } else {
      const match = line.match(/^([^:]+):\s*(.*)$/)
      if (match) {
        current = { name: match[1].trim(), value: match[2].trim() }
        headers.push(current)
      }
    }
  }
  return headers
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded border border-blue-neutral/60 px-2.5 py-1 text-[12px] font-normal text-blue-neutral transition-colors hover:border-blue-medium hover:text-blue-medium"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4 text-grey-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
}

function TechInfoView({
  message,
  emailHeaders
}: {
  message: FullMessage
  emailHeaders: { name: string; value: string }[]
}) {
  const smtpRows: { name: string; value: string }[] = []

  if (message.smtp_information?.data?.mail_from_addr) {
    smtpRows.push({ name: 'MAIL FROM', value: message.smtp_information.data.mail_from_addr })
  }
  if (message.to_email) {
    smtpRows.push({ name: 'RCPT TO', value: message.to_email })
  }

  // Pick the key email headers to display
  const displayHeaderNames = ['From', 'To', 'Bcc', 'Subject', 'Content-Type', 'MIME-Version', 'Date', 'Message-ID']
  const headersToShow = displayHeaderNames
    .map(name => {
      const found = emailHeaders.find(h => h.name.toLowerCase() === name.toLowerCase())
      return found || null
    })
    .filter(Boolean) as { name: string; value: string }[]

  // Add remaining headers not in the display list
  const shown = new Set(headersToShow.map(h => h.name.toLowerCase()))
  const extraHeaders = emailHeaders.filter(h => !shown.has(h.name.toLowerCase()))

  const hasBcc = emailHeaders.some(h => h.name.toLowerCase() === 'bcc')

  return (
    <div className="flex flex-col gap-8">
      {/* SMTP Transaction Info — MTUI: Panel dimmed + HeadingBar + GridTable small */}
      <div className="rounded-mtui border border-grey-shade bg-grey-bold px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-heading-2 text-navy-air">
            SMTP Transaction Info
          </h2>
          <InfoIcon />
        </div>
        <p className="mb-5 mt-3 text-body-s text-grey-muted">
          This information is sent with an SMTP transaction itself and is not included in the email headers or body.
          It can be crucial for SMTP debugging, but can&apos;t be found in common email tools.
        </p>
        {smtpRows.length > 0 ? (
          <div className="overflow-hidden rounded-mtui border border-grey-dark/40">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-grey-shade bg-grey-bold">
                  <th className="w-[20%] px-[10px] py-[5px] text-left text-sm font-semibold text-navy-air" style={{ minHeight: 38 }}>Name</th>
                  <th className="px-[10px] py-[5px] text-left text-sm font-semibold text-navy-air" style={{ minHeight: 38 }}>Value</th>
                  <th className="w-16 py-[5px]"></th>
                </tr>
              </thead>
              <tbody>
                {smtpRows.map((row, i) => (
                  <tr key={row.name} className={`border-b border-grey-dark/15 last:border-0 ${i % 2 === 0 ? 'bg-grey-shade' : 'bg-grey-bold'}`}>
                    <td className="px-[10px] py-[5px] text-sm text-navy-air" style={{ minHeight: 38 }}>{row.name}</td>
                    <td className="px-[10px] py-[5px] text-sm text-navy-air" style={{ minHeight: 38 }}>{row.value}</td>
                    <td className="py-[5px] pr-[10px] text-right">
                      <CopyButton value={row.value} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body-s text-grey-muted">No SMTP transaction data available.</p>
        )}
      </div>

      {/* Email Headers — MTUI: Panel dimmed + HeadingBar + GridTable small reverseZebra */}
      <div className="rounded-mtui border border-grey-shade bg-grey-bold px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-heading-2 text-navy-air">
            Email Headers
          </h2>
          <InfoIcon />
        </div>
        <p className="mb-5 mt-2 text-body-s text-grey-muted">
          Original values of the headers. When sending a real email, headers can be altered by an email service provider or a mail transfer agent.
        </p>
        {headersToShow.length > 0 || extraHeaders.length > 0 ? (
          <EmailHeadersTable
            headersToShow={headersToShow}
            extraHeaders={extraHeaders}
            hasBcc={hasBcc}
          />
        ) : (
          <p className="text-body-s text-grey-muted">Loading headers...</p>
        )}
      </div>
    </div>
  )
}

function EmailHeadersTable({
  headersToShow,
  extraHeaders,
  hasBcc
}: {
  headersToShow: { name: string; value: string }[]
  extraHeaders: { name: string; value: string }[]
  hasBcc: boolean
}) {
  const allRows: ({ type: 'header'; name: string; value: string } | { type: 'bcc-notice' })[] = []

  for (const header of headersToShow) {
    allRows.push({ type: 'header', name: header.name, value: header.value })
    if (header.name.toLowerCase() === 'to' && !hasBcc) {
      allRows.push({ type: 'bcc-notice' } as { type: 'bcc-notice' })
    }
  }
  for (const header of extraHeaders) {
    allRows.push({ type: 'header', name: header.name, value: header.value })
  }

  return (
    <div className="overflow-hidden rounded-mtui border border-grey-dark/40">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-grey-shade bg-grey-bold">
            <th className="w-[20%] px-[10px] py-[5px] text-left text-sm font-semibold text-navy-air" style={{ minHeight: 38 }}>Name</th>
            <th className="px-[10px] py-[5px] text-left text-sm font-semibold text-navy-air" style={{ minHeight: 38 }}>Value</th>
            <th className="w-16 py-[5px]"></th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, i) => {
            const zebraBg = i % 2 === 0 ? 'bg-grey-shade' : 'bg-grey-bold'
            if (row.type === 'bcc-notice') {
              return (
                <tr key="bcc-notice" className={`border-b border-grey-dark/15 ${zebraBg}`}>
                  <td colSpan={3} className="py-[5px] text-center" style={{ minHeight: 38 }}>
                    <span className="inline-flex items-center gap-1.5 text-sm text-grey-muted">
                      <svg className="h-4 w-4 text-green-medium" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      There is no Bcc information in this email message
                    </span>
                  </td>
                </tr>
              )
            }
            return (
              <tr
                key={row.name + i}
                className={`border-b border-grey-dark/15 last:border-0 ${zebraBg}`}
              >
                <td className="px-[10px] py-[5px] text-sm text-navy-air" style={{ minHeight: 38 }}>{row.name}</td>
                <td className="max-w-0 truncate px-[10px] py-[5px] text-sm text-navy-air" title={row.value} style={{ minHeight: 38 }}>
                  {row.value}
                </td>
                <td className="py-[5px] pr-[10px] text-right">
                  <CopyButton value={row.value} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
