import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import type { Message, MessageSummary, InboxSummary } from '../../../electron/api/types'
import { MessageListPanel } from './MessageListPanel'
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode'
import { TechInfoView, parseEmailHeaders } from './TechInfo'

type Tab = 'html' | 'html_source' | 'text' | 'raw' | 'tech_info'
type DevicePreview = 'mobile' | 'tablet' | 'desktop'

export default function InboxView() {
  const { inboxId } = useParams<{ inboxId: string }>()

  // Message list state
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Selected message state
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
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
  const [inboxMeta, setInboxMeta] = useState<{ name: string; projectName: string } | null>(null)

  // ── Load inbox metadata from cache ──
  useEffect(() => {
    if (!inboxId) return
    window.electron.getInboxSummariesCache().then((cached) => {
      if (cached?.data) {
        const inbox = cached.data.find((i: InboxSummary) => i.id === Number(inboxId))
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
      if (cached && cached.data && cached.data.length > 0) {
        setMessages(cached.data)
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
        const { message: msg, htmlBody: html } = cached.data
        if (msg) {
          setMessage(msg)
          setHtmlBody(html)
          setMsgLoading(false)
        }
      }
    } catch {}

    // Fetch fresh
    try {
      const msg = await window.electron.getMessage(Number(inboxId), msgId)
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

  // ── Fetch tab content on tab change ──
  const fetchTabContent = useCallback(async (tab: Tab) => {
    if (!message || !inboxId) return

    if (tab === 'html') return
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
      <MessageListPanel
        messages={messages}
        selectedId={selectedId}
        onSelectMessage={setSelectedId}
        loading={listLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        inboxId={inboxId ?? ''}
        inboxName={inboxMeta?.name || 'Inbox'}
      />

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

              <button
                onClick={() => setShowHeaders(!showHeaders)}
                className="mt-1.5 text-body-s text-blue-neutral hover:text-blue-medium"
              >
                {showHeaders ? 'Hide Headers' : 'Show Headers'}
              </button>

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
                    onClick={() => setActiveTab(tab.key)}
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

              {activeTab === 'html' && (
                <div className="flex items-center gap-1">
                  <DeviceButton active={devicePreview === 'mobile'} onClick={() => setDevicePreview('mobile')} title="Mobile">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </DeviceButton>
                  <DeviceButton active={devicePreview === 'tablet'} onClick={() => setDevicePreview('tablet')} title="Tablet">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.5a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </DeviceButton>
                  <DeviceButton active={devicePreview === 'desktop'} onClick={() => setDevicePreview('desktop')} title="Desktop">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z" />
                    </svg>
                  </DeviceButton>
                </div>
              )}

              <a
                href={`https://mailtrap.io/inboxes/${inboxId}/messages/${message.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 flex items-center gap-1 text-body-s text-grey-muted transition-colors hover:text-blue-neutral"
                aria-label="Open in Mailtrap"
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
                  {activeTab === 'html' && (
                    htmlBody ? (
                      <HtmlPreview
                        htmlBody={htmlBody}
                        messageId={message.id}
                        devicePreview={devicePreview}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-body text-grey-muted">No HTML content available</p>
                      </div>
                    )
                  )}

                  {activeTab === 'html_source' && (
                    <SyntaxHighlightedCode code={tabContent} language="markup" fallback="No HTML source available" />
                  )}

                  {activeTab === 'text' && (
                    <pre className="whitespace-pre-wrap p-5 text-body text-navy-air">
                      {tabContent || 'No text content'}
                    </pre>
                  )}

                  {activeTab === 'raw' && (
                    <SyntaxHighlightedCode code={tabContent} language="markup" fallback="No raw content available" />
                  )}

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
      aria-label={title}
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

function HtmlPreview({
  htmlBody,
  messageId,
  devicePreview,
}: {
  htmlBody: string
  messageId: number
  devicePreview: DevicePreview
}) {
  if (devicePreview === 'desktop') {
    return (
      <div className="h-full">
        <iframe
          key={`${messageId}-desktop`}
          title="Email HTML Preview"
          srcDoc={htmlBody}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-same-origin"
        />
      </div>
    )
  }

  if (devicePreview === 'tablet') {
    return (
      <div className="flex h-full items-start justify-center overflow-auto py-6">
        <div className="flex flex-col items-center">
          <div
            className="overflow-hidden rounded-[2rem] border-[3px] border-blue-neutral/60"
            style={{ width: '768px', height: '1024px', maxHeight: 'calc(100vh - 300px)' }}
          >
            <iframe
              key={`${messageId}-tablet`}
              title="Email HTML Preview \u2014 Tablet"
              srcDoc={htmlBody}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    )
  }

  // Mobile
  return (
    <div className="flex h-full items-start justify-center overflow-auto py-6">
      <div className="flex flex-col items-center">
        <div
          className="flex flex-col overflow-hidden rounded-[2.5rem] border-[3px] border-blue-neutral/60"
          style={{ width: '375px' }}
        >
          <div style={{ height: '667px', maxHeight: 'calc(100vh - 360px)' }}>
            <iframe
              key={`${messageId}-mobile`}
              title="Email HTML Preview \u2014 Mobile"
              srcDoc={htmlBody}
              className="h-full w-full border-0 bg-white"
              sandbox="allow-same-origin"
            />
          </div>
          <div className="flex items-center justify-center bg-navy-void py-3">
            <div className="h-8 w-8 rounded-full border-[2.5px] border-grey-dark" />
          </div>
        </div>
      </div>
    </div>
  )
}
