import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import InboxList from '../../components/sandbox/InboxList'
import type { InboxSummary } from '../../../electron/api/types'

// Mock window.electron
const mockElectron = {
  getInboxSummariesCache: vi.fn(),
  getInboxSummaries: vi.fn(),
  saveInboxSummariesCache: vi.fn(),
  getHiddenTrayInboxIds: vi.fn().mockResolvedValue([]),
  setInboxTrayVisibility: vi.fn().mockResolvedValue(undefined),
  setTrayVisibilityBatch: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue({ testingPollingIntervalMs: 60000 })
}

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true
})

const sampleInboxes: InboxSummary[] = [
  {
    id: 1,
    name: 'Dev Inbox',
    projectName: 'Project Alpha',
    sentCount: 10,
    unreadCount: 3,
    totalCount: 15,
    lastEmailSubject: 'Welcome',
    lastEmailDate: '2025-01-15',
    lastMessageAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 2,
    name: 'Staging Inbox',
    projectName: 'Project Alpha',
    sentCount: 5,
    unreadCount: 0,
    totalCount: 8,
    lastEmailSubject: 'Test notification',
    lastEmailDate: '2025-01-14',
    lastMessageAt: '2025-01-14T09:00:00Z'
  }
]

function renderInboxList() {
  return render(
    <MemoryRouter>
      <InboxList />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockElectron.getHiddenTrayInboxIds.mockResolvedValue([])
  mockElectron.getSettings.mockResolvedValue({ testingPollingIntervalMs: 60000 })
})

describe('InboxList', () => {
  it('renders loading spinner initially', () => {
    // getCached and getFresh both return delayed promises
    mockElectron.getInboxSummariesCache.mockReturnValue(new Promise(() => {}))
    mockElectron.getInboxSummaries.mockReturnValue(new Promise(() => {}))

    renderInboxList()

    // Look for the spinner (animated element)
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('renders inbox data from cache then fresh', async () => {
    const cachedData = [sampleInboxes[0]]
    const freshData = sampleInboxes

    mockElectron.getInboxSummariesCache.mockResolvedValue({
      data: cachedData,
      fetchedAt: '2025-01-15T10:00:00Z'
    })
    mockElectron.getInboxSummaries.mockResolvedValue(freshData)

    renderInboxList()

    // Wait for cached data to show
    await waitFor(() => {
      expect(screen.getByText('Dev Inbox')).toBeInTheDocument()
    })

    // Eventually fresh data adds the second inbox
    await waitFor(() => {
      expect(screen.getByText('Staging Inbox')).toBeInTheDocument()
    })
  })

  it('renders error state with retry button', async () => {
    mockElectron.getInboxSummariesCache.mockResolvedValue(null)
    mockElectron.getInboxSummaries.mockRejectedValue(new Error('API failure'))

    renderInboxList()

    // useCacheFetch has a 1s minimum delay before clearing loading state,
    // so we need a longer timeout for the error to appear
    await waitFor(() => {
      expect(screen.getByText('API failure')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('tray toggle updates hidden IDs optimistically', async () => {
    mockElectron.getInboxSummariesCache.mockResolvedValue(null)
    mockElectron.getInboxSummaries.mockResolvedValue(sampleInboxes)

    renderInboxList()

    // Wait for inboxes to render
    await waitFor(() => {
      expect(screen.getByText('Dev Inbox')).toBeInTheDocument()
    })

    // Find the toggle buttons (per inbox) - they have title attributes
    const toggleButtons = screen.getAllByTitle('Shown in tray menu')
    expect(toggleButtons.length).toBeGreaterThan(0)

    // Click the first toggle
    fireEvent.click(toggleButtons[0])

    // The IPC call should fire (optimistic update)
    await waitFor(() => {
      expect(mockElectron.setInboxTrayVisibility).toHaveBeenCalledWith(1, false)
    })
  })
})
