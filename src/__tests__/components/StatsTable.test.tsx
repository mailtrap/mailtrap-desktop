import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsTable } from '../../components/sending/StatsTable'
import type { StatsRow } from '../../../electron/api/types'

const rows: StatsRow[] = [
  { name: 'Google', delivered: 1000, uniqueOpenRate: 0.45, clickRate: 0.18, bounceRate: 0.01, spamCount: 0 },
  { name: 'Outlook', delivered: 500, uniqueOpenRate: 0.40, clickRate: 0.15, bounceRate: 0.02, spamCount: 1 },
]

describe('StatsTable', () => {
  it('renders row names as plain text when no rowLinkBuilder is provided', () => {
    render(
      <StatsTable
        title="Mailbox Providers"
        rows={rows}
        linkLabel="See All"
        linkUrl="https://mailtrap.io/sending/analytics/esp"
        bounceThreshold={5}
      />
    )

    expect(screen.getByText('Google')).toBeInTheDocument()
    expect(screen.getByText('Outlook')).toBeInTheDocument()

    // Names should NOT be anchor tags
    const links = screen.queryAllByRole('link')
    const nameLinks = links.filter(l => l.textContent === 'Google' || l.textContent === 'Outlook')
    expect(nameLinks).toHaveLength(0)
  })

  it('renders row names as clickable links when rowLinkBuilder is provided', () => {
    const rowLinkBuilder = (name: string) =>
      `https://mailtrap.io/sending/analytics/esp?email_service_providers=${encodeURIComponent(name)}&end_date=2026-02-18&start_date=2026-02-11`

    render(
      <StatsTable
        title="Mailbox Providers"
        rows={rows}
        linkLabel="See All"
        linkUrl="https://mailtrap.io/sending/analytics/esp"
        bounceThreshold={5}
        rowLinkBuilder={rowLinkBuilder}
      />
    )

    const googleLink = screen.getByRole('link', { name: 'Google' })
    expect(googleLink).toBeInTheDocument()
    expect(googleLink).toHaveAttribute(
      'href',
      'https://mailtrap.io/sending/analytics/esp?email_service_providers=Google&end_date=2026-02-18&start_date=2026-02-11'
    )

    const outlookLink = screen.getByRole('link', { name: 'Outlook' })
    expect(outlookLink).toHaveAttribute(
      'href',
      'https://mailtrap.io/sending/analytics/esp?email_service_providers=Outlook&end_date=2026-02-18&start_date=2026-02-11'
    )
  })

  it('links open in a new tab', () => {
    render(
      <StatsTable
        title="Mailbox Providers"
        rows={rows}
        linkLabel="See All"
        linkUrl="https://mailtrap.io/sending/analytics/esp"
        bounceThreshold={5}
        rowLinkBuilder={(name) => `https://example.com/${name}`}
      />
    )

    const googleLink = screen.getByRole('link', { name: 'Google' })
    expect(googleLink).toHaveAttribute('target', '_blank')
    expect(googleLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('highlights bounce rate in red when above threshold', () => {
    const highBounceRow: StatsRow[] = [
      { name: 'Yahoo', delivered: 100, uniqueOpenRate: 0.3, clickRate: 0.1, bounceRate: 0.10, spamCount: 0 },
    ]

    const { container } = render(
      <StatsTable
        title="Providers"
        rows={highBounceRow}
        linkLabel="See All"
        linkUrl="https://mailtrap.io"
        bounceThreshold={5}
      />
    )

    const redCell = container.querySelector('.\\!text-red-400')
    expect(redCell).toBeInTheDocument()
  })

  it('renders the See All footer link', () => {
    const { container } = render(
      <StatsTable
        title="Category"
        rows={rows}
        linkLabel="See All"
        linkUrl="https://mailtrap.io/sending/analytics/categories"
        bounceThreshold={5}
      />
    )

    const seeAll = container.querySelector('a[href="https://mailtrap.io/sending/analytics/categories"]')
    expect(seeAll).toBeInTheDocument()
  })

  it('returns null when rows are empty', () => {
    const { container } = render(
      <StatsTable
        title="Empty"
        rows={[]}
        linkLabel="See All"
        linkUrl="https://mailtrap.io"
        bounceThreshold={5}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
