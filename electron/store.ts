import { safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { AppSettings } from './api/types'
import { DEFAULT_SETTINGS } from './api/types'

function getStorePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'mailtrap-store.json')
}

interface CachedSendingStats {
  stats: unknown
  dailyStats: unknown
  providerRows?: unknown
  categoryRows?: unknown
  fetchedAt: string // ISO timestamp
}

interface CachedWithTimestamp<T = unknown> {
  data: T
  fetchedAt: string // ISO timestamp
}

interface StoreData {
  encryptedToken?: string
  accountId?: number
  accountName?: string
  /** Inbox IDs hidden from the tray menu (default: all visible) */
  hiddenTrayInboxIds?: number[]
  /** Cached sending stats keyed by "domainId_timeRange" */
  sendingStatsCache?: Record<string, CachedSendingStats>
  /** Cached inbox summaries (Sandboxes) */
  inboxSummariesCache?: CachedWithTimestamp
  /** Cached messages per inbox, keyed by inboxId */
  messagesCache?: Record<string, CachedWithTimestamp>
  /** Cached full email, keyed by "inboxId_messageId" */
  emailCache?: Record<string, CachedWithTimestamp>
  /** Cached sending domains list */
  sendingDomainsCache?: CachedWithTimestamp
  settings: AppSettings
}

function readStore(): StoreData {
  const storePath = getStorePath()
  if (!existsSync(storePath)) {
    return { settings: { ...DEFAULT_SETTINGS } }
  }
  try {
    const raw = readFileSync(storePath, 'utf-8')
    return JSON.parse(raw) as StoreData
  } catch {
    return { settings: { ...DEFAULT_SETTINGS } }
  }
}

function writeStore(data: StoreData): void {
  const storePath = getStorePath()
  const dir = join(storePath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
}

// ── Token Management ──

export function saveToken(token: string): void {
  const store = readStore()
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token)
    store.encryptedToken = encrypted.toString('base64')
  } else {
    // Fallback: store as base64 (not truly secure, but works on all platforms)
    store.encryptedToken = Buffer.from(token).toString('base64')
  }
  writeStore(store)
}

export function getToken(): string | null {
  const store = readStore()
  if (!store.encryptedToken) return null

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(store.encryptedToken, 'base64')
      return safeStorage.decryptString(buffer)
    } else {
      return Buffer.from(store.encryptedToken, 'base64').toString('utf-8')
    }
  } catch {
    return null
  }
}

export function deleteToken(): void {
  const store = readStore()
  delete store.encryptedToken
  delete store.accountId
  delete store.accountName
  writeStore(store)
}

// ── Account ID & Name ──

export function saveAccountId(accountId: number): void {
  const store = readStore()
  store.accountId = accountId
  writeStore(store)
}

export function getAccountId(): number | null {
  const store = readStore()
  return store.accountId ?? null
}

export function saveAccountName(name: string): void {
  const store = readStore()
  store.accountName = name
  writeStore(store)
}

export function getAccountName(): string | null {
  const store = readStore()
  return store.accountName ?? null
}

// ── Tray Visibility ──

export function getHiddenTrayInboxIds(): number[] {
  const store = readStore()
  return store.hiddenTrayInboxIds ?? []
}

export function setInboxTrayVisibility(inboxId: number, visible: boolean): void {
  const store = readStore()
  const hidden = new Set(store.hiddenTrayInboxIds ?? [])
  if (visible) {
    hidden.delete(inboxId)
  } else {
    hidden.add(inboxId)
  }
  store.hiddenTrayInboxIds = [...hidden]
  writeStore(store)
}

export function isInboxVisibleInTray(inboxId: number): boolean {
  const store = readStore()
  return !(store.hiddenTrayInboxIds ?? []).includes(inboxId)
}

export function setMultipleInboxTrayVisibility(entries: { inboxId: number; visible: boolean }[]): void {
  const store = readStore()
  const hidden = new Set(store.hiddenTrayInboxIds ?? [])
  for (const { inboxId, visible } of entries) {
    if (visible) {
      hidden.delete(inboxId)
    } else {
      hidden.add(inboxId)
    }
  }
  store.hiddenTrayInboxIds = [...hidden]
  writeStore(store)
}

// ── Sending Stats Cache ──

export function saveSendingStatsCache(
  domainId: number,
  timeRange: string,
  stats: unknown,
  dailyStats: unknown,
  providerRows?: unknown,
  categoryRows?: unknown
): void {
  const store = readStore()
  if (!store.sendingStatsCache) store.sendingStatsCache = {}
  store.sendingStatsCache[`${domainId}_${timeRange}`] = {
    stats,
    dailyStats,
    providerRows,
    categoryRows,
    fetchedAt: new Date().toISOString()
  }
  writeStore(store)
}

export function getSendingStatsCache(
  domainId: number,
  timeRange: string
): CachedSendingStats | null {
  const store = readStore()
  return store.sendingStatsCache?.[`${domainId}_${timeRange}`] ?? null
}

// ── Settings ──

export function getSettings(): AppSettings {
  const store = readStore()
  return { ...DEFAULT_SETTINGS, ...store.settings }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const store = readStore()
  store.settings = { ...DEFAULT_SETTINGS, ...store.settings, ...settings }
  writeStore(store)
  return store.settings
}

// ── Inbox Summaries Cache ──

export function saveInboxSummariesCache(data: unknown): void {
  const store = readStore()
  store.inboxSummariesCache = { data, fetchedAt: new Date().toISOString() }
  writeStore(store)
}

export function getInboxSummariesCache(): CachedWithTimestamp | null {
  const store = readStore()
  return store.inboxSummariesCache ?? null
}

// ── Sending Domains Cache ──

export function saveSendingDomainsCache(data: unknown): void {
  const store = readStore()
  store.sendingDomainsCache = { data, fetchedAt: new Date().toISOString() }
  writeStore(store)
}

export function getSendingDomainsCache(): CachedWithTimestamp | null {
  const store = readStore()
  return store.sendingDomainsCache ?? null
}

// ── Messages Cache (per inbox) ──

export function saveMessagesCache(inboxId: number, data: unknown): void {
  const store = readStore()
  if (!store.messagesCache) store.messagesCache = {}
  store.messagesCache[String(inboxId)] = { data, fetchedAt: new Date().toISOString() }
  writeStore(store)
}

export function getMessagesCache(inboxId: number): CachedWithTimestamp | null {
  const store = readStore()
  return store.messagesCache?.[String(inboxId)] ?? null
}

// ── Email Cache (individual message) ──

export function saveEmailCache(inboxId: number, messageId: number, data: unknown, htmlBody: string | null): void {
  const store = readStore()
  if (!store.emailCache) store.emailCache = {}
  store.emailCache[`${inboxId}_${messageId}`] = {
    data: { message: data, htmlBody },
    fetchedAt: new Date().toISOString()
  }
  writeStore(store)
}

export function getEmailCache(inboxId: number, messageId: number): CachedWithTimestamp | null {
  const store = readStore()
  return store.emailCache?.[`${inboxId}_${messageId}`] ?? null
}
