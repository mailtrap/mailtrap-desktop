import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// We need to mock electron modules before importing the store
const mockStoreDir = mkdtempSync(join(tmpdir(), 'store-test-'))
const mockStorePath = join(mockStoreDir, 'port587-store.json')

vi.mock('electron', () => ({
  app: {
    getPath: () => mockStoreDir
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (str: string) => Buffer.from(`encrypted:${str}`),
    decryptString: (buf: Buffer) => buf.toString().replace('encrypted:', '')
  }
}))

import {
  saveToken,
  getToken,
  deleteToken,
  saveAccountId,
  getAccountId,
  saveAccountName,
  getAccountName,
  getHiddenTrayInboxIds,
  setInboxTrayVisibility,
  isInboxVisibleInTray,
  setMultipleInboxTrayVisibility,
  saveSendingStatsCache,
  getSendingStatsCache,
  saveInboxSummariesCache,
  getInboxSummariesCache,
  saveSendingDomainsCache,
  getSendingDomainsCache,
  saveMessagesCache,
  getMessagesCache,
  saveEmailCache,
  getEmailCache,
  getSettings,
  saveSettings,
  clearStoreCache
} from '../store'
import { DEFAULT_SETTINGS } from '../api/types'

beforeEach(() => {
  clearStoreCache()
  // Reset the store between tests by overwriting the file with defaults
  try {
    writeFileSync(mockStorePath, JSON.stringify({ settings: { ...DEFAULT_SETTINGS } }))
    // Remove legacy store file so backward-compat path doesn't interfere
    const legacyPath = join(mockStoreDir, 'mailtrap-store.json')
    if (existsSync(legacyPath)) unlinkSync(legacyPath)
  } catch {
    // ignore
  }
})

// ── Token Management ──

describe('Token Management', () => {
  it('saves and retrieves a token', () => {
    saveToken('my-api-token')
    const token = getToken()
    expect(token).toBe('my-api-token')
  })

  it('returns null when no token saved', () => {
    expect(getToken()).toBeNull()
  })

  it('deletes a token and clears account info', () => {
    saveToken('my-api-token')
    saveAccountId(42)
    saveAccountName('Test Account')
    deleteToken()

    expect(getToken()).toBeNull()
    expect(getAccountId()).toBeNull()
    expect(getAccountName()).toBeNull()
  })
})

// ── Account ID & Name ──

describe('Account ID & Name', () => {
  it('saves and retrieves account ID', () => {
    saveAccountId(123)
    expect(getAccountId()).toBe(123)
  })

  it('returns null when no account ID', () => {
    expect(getAccountId()).toBeNull()
  })

  it('saves and retrieves account name', () => {
    saveAccountName('My Account')
    expect(getAccountName()).toBe('My Account')
  })

  it('returns null when no account name', () => {
    expect(getAccountName()).toBeNull()
  })
})

// ── Tray Visibility ──

describe('Tray Visibility', () => {
  it('returns empty hidden IDs by default', () => {
    expect(getHiddenTrayInboxIds()).toEqual([])
  })

  it('hides an inbox', () => {
    setInboxTrayVisibility(1, false)
    expect(getHiddenTrayInboxIds()).toContain(1)
    expect(isInboxVisibleInTray(1)).toBe(false)
  })

  it('shows a previously hidden inbox', () => {
    setInboxTrayVisibility(1, false)
    setInboxTrayVisibility(1, true)
    expect(getHiddenTrayInboxIds()).not.toContain(1)
    expect(isInboxVisibleInTray(1)).toBe(true)
  })

  it('batch updates visibility', () => {
    setMultipleInboxTrayVisibility([
      { inboxId: 1, visible: false },
      { inboxId: 2, visible: false },
      { inboxId: 3, visible: true }
    ])
    expect(isInboxVisibleInTray(1)).toBe(false)
    expect(isInboxVisibleInTray(2)).toBe(false)
    expect(isInboxVisibleInTray(3)).toBe(true)
  })
})

// ── Cache CRUD ──

describe('Sending Stats Cache', () => {
  it('saves and retrieves sending stats by key', () => {
    const stats = { delivery_count: 100 }
    const daily = [{ date: '2025-01-01', delivered: 50 }]
    saveSendingStatsCache(1, '7d', stats, daily, undefined, undefined)

    const cached = getSendingStatsCache(1, '7d')
    expect(cached).not.toBeNull()
    expect(cached!.stats).toEqual(stats)
    expect(cached!.dailyStats).toEqual(daily)
    expect(cached!.fetchedAt).toBeDefined()
  })

  it('returns null for missing cache key', () => {
    expect(getSendingStatsCache(999, '30d')).toBeNull()
  })
})

describe('Inbox Summaries Cache', () => {
  it('saves and retrieves inbox summaries', () => {
    const data = [{ id: 1, name: 'Inbox 1' }]
    saveInboxSummariesCache(data)

    const cached = getInboxSummariesCache()
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(data)
    expect(cached!.fetchedAt).toBeDefined()
  })

  it('returns null when no cache', () => {
    expect(getInboxSummariesCache()).toBeNull()
  })
})

describe('Sending Domains Cache', () => {
  it('saves and retrieves sending domains', () => {
    const data = [{ id: 1, domain_name: 'example.com' }]
    saveSendingDomainsCache(data)

    const cached = getSendingDomainsCache()
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(data)
  })

  it('returns null when no cache', () => {
    expect(getSendingDomainsCache()).toBeNull()
  })
})

describe('Messages Cache', () => {
  it('saves and retrieves messages per inbox', () => {
    const data = [{ id: 1, subject: 'Hello' }]
    saveMessagesCache(42, data)

    const cached = getMessagesCache(42)
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual(data)
  })

  it('returns null for non-cached inbox', () => {
    expect(getMessagesCache(999)).toBeNull()
  })
})

describe('Email Cache', () => {
  it('saves and retrieves individual emails', () => {
    const msg = { id: 5, subject: 'Test' }
    saveEmailCache(42, 5, msg, '<h1>Hello</h1>')

    const cached = getEmailCache(42, 5)
    expect(cached).not.toBeNull()
    expect(cached!.data).toEqual({ message: msg, htmlBody: '<h1>Hello</h1>' })
  })

  it('returns null for non-cached email', () => {
    expect(getEmailCache(1, 999)).toBeNull()
  })
})

// ── Settings ──

describe('Settings', () => {
  it('returns default settings when none saved', () => {
    const settings = getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('saves partial settings merged with defaults', () => {
    const updated = saveSettings({ launchAtStartup: true })
    expect(updated.launchAtStartup).toBe(true)
    expect(updated.theme).toBe(DEFAULT_SETTINGS.theme)
    expect(updated.testingPollingIntervalMs).toBe(DEFAULT_SETTINGS.testingPollingIntervalMs)
  })

  it('persists settings across reads', () => {
    saveSettings({ theme: 'dark' })
    const settings = getSettings()
    expect(settings.theme).toBe('dark')
  })
})
