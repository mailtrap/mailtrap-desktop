import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { IpcMainInvokeEvent } from 'electron'

// ── Mocks ──

const handlers = new Map<string, (...args: unknown[]) => unknown>()

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler)
    }
  },
  app: {
    getPath: () => '/tmp/test-store',
    setLoginItemSettings: vi.fn()
  },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (str: string) => Buffer.from(str),
    decryptString: (buf: Buffer) => buf.toString()
  },
  BrowserWindow: {
    getAllWindows: () => []
  }
}))

const mockGet = vi.fn()
let apiClientInitialized = false

vi.mock('../../api/client', () => ({
  initApiClients: vi.fn(() => { apiClientInitialized = true }),
  destroyApiClients: vi.fn(() => { apiClientInitialized = false }),
  getApiClient: () => {
    if (!apiClientInitialized) throw new Error('API client not initialized')
    return { get: mockGet }
  }
}))

vi.mock('../../polling', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  restartTestingPolling: vi.fn(),
  restartSendingPolling: vi.fn(),
  stopTestingPolling: vi.fn(),
  stopSendingPolling: vi.fn()
}))

vi.mock('../../tray', () => ({
  refreshTrayMenu: vi.fn()
}))

vi.mock('../../api/vendors', () => ({
  getConnector: vi.fn()
}))

// Mock fs to use in-memory storage
let storeData: Record<string, unknown> = {}
vi.mock('fs', () => ({
  existsSync: () => Object.keys(storeData).length > 0,
  readFileSync: () => JSON.stringify(storeData),
  writeFileSync: (_path: string, content: string) => {
    storeData = JSON.parse(content)
  },
  mkdirSync: vi.fn()
}))

import { registerIpcHandlers } from '../../ipc/handlers'
import { startPolling, stopPolling, restartTestingPolling, restartSendingPolling } from '../../polling'
import { initApiClients, destroyApiClients } from '../../api/client'
import { clearStoreCache } from '../../store'

const fakeEvent = {} as IpcMainInvokeEvent

function invoke(channel: string, ...args: unknown[]): unknown {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`No handler for ${channel}`)
  return handler(fakeEvent, ...args)
}

beforeEach(() => {
  clearStoreCache()
  handlers.clear()
  storeData = {}
  apiClientInitialized = false
  mockGet.mockReset()
  vi.mocked(startPolling).mockClear()
  vi.mocked(stopPolling).mockClear()
  vi.mocked(initApiClients).mockClear()
  vi.mocked(destroyApiClients).mockClear()
  registerIpcHandlers()
})

// ── Auth Flow ──

describe('Auth flow', () => {
  it('login → saves token → starts polling → returns accountId', async () => {
    mockGet.mockResolvedValueOnce({
      data: [{ id: 42, name: 'Test Account', access_levels: [100] }]
    })

    const result = await invoke('auth:login', 'test-token')

    expect(result).toEqual({
      success: true,
      accountId: 42,
      accountName: 'Test Account'
    })
    expect(initApiClients).toHaveBeenCalledWith('test-token')
    expect(startPolling).toHaveBeenCalled()
    // Token should be persisted
    expect(storeData).toHaveProperty('encryptedToken')
    expect(storeData).toHaveProperty('accountId', 42)
  })

  it('login failure → destroys clients → returns error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Invalid token'))

    const result = await invoke('auth:login', 'bad-token')

    expect(result).toEqual({
      success: false,
      error: 'Invalid token'
    })
    expect(destroyApiClients).toHaveBeenCalled()
  })

  it('logout → stops polling → clears active sender', async () => {
    // First login
    mockGet.mockResolvedValueOnce({
      data: [{ id: 1, name: 'Acct', access_levels: [] }]
    })
    await invoke('auth:login', 'token')

    const result = await invoke('auth:logout')

    expect(result).toEqual({ success: true })
    expect(stopPolling).toHaveBeenCalled()
    expect(destroyApiClients).toHaveBeenCalled()
    // Active sender and account info should be cleared
    expect(storeData).not.toHaveProperty('lastActiveSenderId')
    expect(storeData).not.toHaveProperty('accountId')
    expect(storeData).not.toHaveProperty('accountName')
  })

  it('restore → initializes clients if token exists', async () => {
    // Pre-populate store with a sender profile (multi-vendor format)
    const senderId = 'test-sender-id'
    storeData = {
      senders: [{
        id: senderId,
        displayName: 'Restored',
        encryptedToken: Buffer.from('stored-token').toString('base64'),
        accountId: 99,
        accountName: 'Restored',
        vendor: 'mailtrap',
        createdAt: new Date().toISOString()
      }],
      lastActiveSenderId: senderId,
      settings: {}
    }

    const result = await invoke('auth:restore')

    expect(result).toEqual({
      authenticated: true,
      accountId: 99,
      accountName: 'Restored',
      senderId,
      senderDisplayName: 'Restored',
      vendor: 'mailtrap'
    })
    expect(initApiClients).toHaveBeenCalled()
    expect(startPolling).toHaveBeenCalled()
  })

  it('restore → returns unauthenticated when no token', async () => {
    const result = await invoke('auth:restore')

    expect(result).toEqual({ authenticated: false })
    expect(initApiClients).not.toHaveBeenCalled()
  })
})

// ── withAuth middleware ──

describe('withAuth middleware', () => {
  it('rejects unauthenticated calls', async () => {
    // No login performed, accountId is null
    await expect(invoke('sandbox:get-projects')).rejects.toThrow('Not authenticated')
  })
})

// ── Sandbox handlers ──

describe('Sandbox handlers', () => {
  beforeEach(async () => {
    // Login first
    mockGet.mockResolvedValueOnce({
      data: [{ id: 10, name: 'Acct', access_levels: [] }]
    })
    await invoke('auth:login', 'token')
    // Clear in-memory cache so the next readStore() re-reads from disk and
    // migrateIfNeeded() converts the legacy token into a sender profile,
    // which is required by the new getActiveProfile()-based withAuth guard.
    clearStoreCache()
    mockGet.mockReset()
  })

  it('get-projects calls API with accountId', async () => {
    const projects = [{ id: 1, name: 'Project 1' }]
    mockGet.mockResolvedValueOnce({ data: projects })

    const result = await invoke('sandbox:get-projects')

    expect(mockGet).toHaveBeenCalledWith('/api/accounts/10/projects')
    expect(result).toEqual(projects)
  })

  it('get-messages calls API and maps to summaries', async () => {
    const messages = [{
      id: 1,
      inbox_id: 5,
      subject: 'Hello',
      from_email: 'a@b.com',
      from_name: 'A',
      to_email: 'c@d.com',
      to_name: 'C',
      sent_at: '2025-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      is_read: false,
      human_size: '1 KB'
    }]
    mockGet.mockResolvedValueOnce({ data: messages })

    const result = await invoke('sandbox:get-messages', 5, 1) as unknown[]

    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('inboxId', 5)
    expect(result[0]).toHaveProperty('fromEmail', 'a@b.com')
  })
})

// ── Cache handlers ──

describe('Cache handlers', () => {
  it('inbox summaries cache: save and retrieve round-trip', async () => {
    const data = [{ id: 1, name: 'Inbox' }]

    await invoke('sandbox:save-inbox-cache', data)
    const cached = await invoke('sandbox:get-inbox-cache') as { data: unknown; fetchedAt: string } | null

    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(data)
    expect(cached!.fetchedAt).toBeDefined()
  })

  it('messages cache: save and retrieve round-trip', async () => {
    const data = [{ id: 1, subject: 'Test' }]

    await invoke('sandbox:save-messages-cache', 42, data)
    const cached = await invoke('sandbox:get-messages-cache', 42) as { data: unknown } | null

    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(data)
  })

  it('sending stats cache: save and retrieve round-trip', async () => {
    const stats = { delivery_count: 100 }
    const daily = [{ date: '2025-01-01' }]

    await invoke('sending:save-stats-cache', 1, '7d', stats, daily)
    const cached = await invoke('sending:get-stats-cache', 1, '7d') as { stats: unknown } | null

    expect(cached).not.toBeNull()
    expect(cached!.stats).toEqual(stats)
  })
})

// ── Settings handler ──

describe('Settings handler', () => {
  it('save triggers polling restart for testing interval', async () => {
    await invoke('settings:save', { testingPollingIntervalMs: 30000 })

    expect(restartTestingPolling).toHaveBeenCalled()
  })

  it('save triggers polling restart for sending interval', async () => {
    await invoke('settings:save', { sendingPollingIntervalMs: 120000 })

    expect(restartSendingPolling).toHaveBeenCalled()
  })

  it('get returns default settings when none saved', async () => {
    const settings = await invoke('settings:get') as Record<string, unknown>

    expect(settings).toHaveProperty('testingPollingIntervalMs')
    expect(settings).toHaveProperty('sendingPollingIntervalMs')
    expect(settings).toHaveProperty('theme')
  })
})
