import { safeStorage } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { AppSettings, SenderProfile } from './api/types'
import { DEFAULT_SETTINGS } from './api/types'

function getStorePath(): string {
  const userDataPath = app.getPath('userData')
  const newPath = join(userDataPath, 'port587-store.json')
  // Backwards compat: if old store exists and new doesn't, use old path
  const legacyPath = join(userDataPath, 'mailtrap-store.json')
  if (!existsSync(newPath) && existsSync(legacyPath)) {
    return legacyPath
  }
  return newPath
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
  /** @deprecated Use senders[] instead */
  encryptedToken?: string
  /** @deprecated Use senders[] instead */
  accountId?: number
  /** @deprecated Use senders[] instead */
  accountName?: string
  /** Sender profiles (multi-sender support) */
  senders?: SenderProfile[]
  /** ID of the last active sender profile */
  lastActiveSenderId?: string
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

let storeCache: StoreData | null = null

/**
 * Migrates legacy single-token store data to the multi-sender format.
 * Idempotent: does nothing if senders[] already has entries.
 */
function migrateIfNeeded(store: StoreData): StoreData {
  if (store.encryptedToken && (!store.senders || store.senders.length === 0)) {
    const profile: SenderProfile = {
      id: randomUUID(),
      displayName: store.accountName ?? `Account ${store.accountId ?? 'unknown'}`,
      encryptedToken: store.encryptedToken,
      accountId: store.accountId ?? 0,
      accountName: store.accountName ?? '',
      createdAt: new Date().toISOString(),
    }
    store.senders = [profile]
    store.lastActiveSenderId = profile.id
    delete store.encryptedToken
    delete store.accountId
    delete store.accountName
    writeStore(store)
  }
  return store
}

function readStore(): StoreData {
  if (storeCache) return storeCache

  const storePath = getStorePath()
  if (!existsSync(storePath)) {
    storeCache = { settings: { ...DEFAULT_SETTINGS } }
    return storeCache
  }
  try {
    const raw = readFileSync(storePath, 'utf-8')
    storeCache = JSON.parse(raw) as StoreData
    storeCache = migrateIfNeeded(storeCache)
    return storeCache
  } catch {
    storeCache = { settings: { ...DEFAULT_SETTINGS } }
    return storeCache
  }
}

function writeStore(data: StoreData): void {
  storeCache = data
  const storePath = getStorePath()
  const dir = join(storePath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function clearStoreCache(): void {
  storeCache = null
}

/**
 * Clears all cached API data from persistent storage.
 * Call when switching senders to prevent stale data from a previous sender being visible.
 */
export function clearAllCaches(): void {
  const store = readStore()
  delete store.sendingStatsCache
  delete store.inboxSummariesCache
  delete store.messagesCache
  delete store.emailCache
  delete store.sendingDomainsCache
  writeStore(store)
}

// ── Encryption Helpers ──

export function encryptToken(token: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(token)
    return encrypted.toString('base64')
  }
  // Fallback: store as base64 (not truly secure, but works on all platforms)
  return Buffer.from(token).toString('base64')
}

export function decryptToken(encrypted: string): string | null {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted, 'base64')
      return safeStorage.decryptString(buffer)
    }
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

// ── Token Management ──

export function saveToken(token: string): void {
  const store = readStore()
  store.encryptedToken = encryptToken(token)
  writeStore(store)
}

export function getToken(): string | null {
  const store = readStore()
  if (!store.encryptedToken) return null
  return decryptToken(store.encryptedToken)
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

/**
 * Clears the deprecated root-level accountId and accountName fields.
 * Call on logout to prevent stale values from lingering.
 */
export function clearActiveAccount(): void {
  const store = readStore()
  delete store.accountId
  delete store.accountName
  writeStore(store)
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

// ── Sender Profile Management ──

export function listSenders(): SenderProfile[] {
  const store = readStore()
  return store.senders ?? []
}

export function saveSender(profile: SenderProfile): void {
  const store = readStore()
  if (!store.senders) store.senders = []
  store.senders.push(profile)
  writeStore(store)
}

export function deleteSender(id: string): void {
  const store = readStore()
  store.senders = (store.senders ?? []).filter(s => s.id !== id)
  writeStore(store)
}

export function getSenderById(id: string): SenderProfile | null {
  const store = readStore()
  return (store.senders ?? []).find(s => s.id === id) ?? null
}

export function getLastActiveSenderId(): string | null {
  const store = readStore()
  return store.lastActiveSenderId ?? null
}

export function setLastActiveSenderId(id: string | null): void {
  const store = readStore()
  if (id === null) {
    delete store.lastActiveSenderId
  } else {
    store.lastActiveSenderId = id
  }
  writeStore(store)
}

export function getActiveSenderDisplayName(): string | null {
  const store = readStore()
  const activeId = store.lastActiveSenderId
  if (!activeId) return null
  const sender = (store.senders ?? []).find(s => s.id === activeId)
  return sender?.displayName ?? null
}
