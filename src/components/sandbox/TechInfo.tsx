import { useState } from 'react'
import type { Message } from '../../../electron/api/types'

interface TechInfoViewProps {
  message: Message
  emailHeaders: { name: string; value: string }[]
}

export function TechInfoView({ message, emailHeaders }: TechInfoViewProps) {
  const smtpRows: { name: string; value: string }[] = []

  if (message.smtp_information?.data?.mail_from_addr) {
    smtpRows.push({ name: 'MAIL FROM', value: message.smtp_information.data.mail_from_addr })
  }
  if (message.to_email) {
    smtpRows.push({ name: 'RCPT TO', value: message.to_email })
  }

  const displayHeaderNames = ['From', 'To', 'Bcc', 'Subject', 'Content-Type', 'MIME-Version', 'Date', 'Message-ID']
  const headersToShow = displayHeaderNames
    .map(name => emailHeaders.find(h => h.name.toLowerCase() === name.toLowerCase()) ?? null)
    .filter(Boolean) as { name: string; value: string }[]

  const shown = new Set(headersToShow.map(h => h.name.toLowerCase()))
  const extraHeaders = emailHeaders.filter(h => !shown.has(h.name.toLowerCase()))
  const hasBcc = emailHeaders.some(h => h.name.toLowerCase() === 'bcc')

  return (
    <div className="flex flex-col gap-8">
      {/* SMTP Transaction Info */}
      <div className="rounded-mtui border border-grey-shade bg-grey-bold px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-heading-2 text-navy-air">SMTP Transaction Info</h2>
          <InfoIcon />
        </div>
        <p className="mb-5 mt-3 text-body-s text-grey-muted">
          This information is sent with an SMTP transaction itself and is not included in the email headers or body.
          It can be crucial for SMTP debugging, but can&apos;t be found in common email tools.
        </p>
        {smtpRows.length > 0 ? (
          <HeaderTable rows={smtpRows} />
        ) : (
          <p className="text-body-s text-grey-muted">No SMTP transaction data available.</p>
        )}
      </div>

      {/* Email Headers */}
      <div className="rounded-mtui border border-grey-shade bg-grey-bold px-5 pb-5 pt-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-heading-2 text-navy-air">Email Headers</h2>
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

export function parseEmailHeaders(headerSection: string): { name: string; value: string }[] {
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

function InfoIcon() {
  return (
    <svg className="h-4 w-4 text-grey-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  )
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

function HeaderTable({ rows }: { rows: { name: string; value: string }[] }) {
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
          {rows.map((row, i) => (
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
  )
}

function EmailHeadersTable({
  headersToShow,
  extraHeaders,
  hasBcc,
}: {
  headersToShow: { name: string; value: string }[]
  extraHeaders: { name: string; value: string }[]
  hasBcc: boolean
}) {
  const allRows: ({ type: 'header'; name: string; value: string } | { type: 'bcc-notice' })[] = []

  for (const header of headersToShow) {
    allRows.push({ type: 'header', name: header.name, value: header.value })
    if (header.name.toLowerCase() === 'to' && !hasBcc) {
      allRows.push({ type: 'bcc-notice' })
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
