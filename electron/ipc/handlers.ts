import { ipcMain, app, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import axios from 'axios'
import { initApiClients, destroyApiClients, GENERAL_BASE_URL } from '../api/client'
import {
  getAccounts,
  getProjects,
  getInboxes,
  getMessages,
  getMessage,
  getMessageHtmlBody,
  getMessageContentByPath,
  getMessageSpamReport,
  getMessageHtmlAnalysis,
  getInboxSummaries,
  toMessageSummary
} from '../api/sandbox'
import {
  getAggregatedStats,
  getDailyStats,
  getSendingDomains,
  getStreamSummaries,
  getMailboxProviderStats,
  getCategoryStats
} from '../api/stats'
import {
  saveToken,
  getToken,
  deleteToken,
  saveAccountId,
  saveAccountName,
  getHiddenTrayInboxIds,
  setInboxTrayVisibility,
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
  listSenders,
  saveSender,
  deleteSender as deleteSenderFromStore,
  getSenderById,
  getLastActiveSenderId,
  setLastActiveSenderId,
  encryptToken,
  decryptToken,
  clearAllCaches,
  clearActiveAccount,
} from '../store'
import { startPolling, stopPolling, restartTestingPolling, restartSendingPolling, stopTestingPolling, stopSendingPolling } from '../polling'
import { refreshTrayMenu } from '../tray'
import { randomUUID } from 'crypto'
import type { Account, AppSettings, SenderProfile, AddSenderResult, SelectSenderResult, DeleteSenderResult, RestoreAuthResult, SenderProfilePublic } from '../api/types'

/**
 * Wraps an IPC handler that requires authentication.
 * Resolves the accountId from the active sender profile and throws if not authenticated.
 */
function withAuth<TArgs extends unknown[], TReturn>(
  handler: (accountId: number, ...args: TArgs) => Promise<TReturn> | TReturn
) {
  return async (_event: IpcMainInvokeEvent, ...args: TArgs): Promise<TReturn> => {
    const activeSenderId = getLastActiveSenderId()
    if (!activeSenderId) throw new Error('Not authenticated')
    const sender = getSenderById(activeSenderId)
    if (!sender) throw new Error('Active sender profile not found')
    return handler(sender.accountId, ...args)
  }
}

export function registerIpcHandlers(): void {
  // ── Auth ──

  ipcMain.handle('auth:get-token', () => {
    return getToken() !== null
  })

  /** @deprecated Kept for backward compatibility; no longer exposed via preload bridge. */
  ipcMain.handle('auth:login', async (_event, token: string) => {
    initApiClients(token)
    try {
      const accounts = await getAccounts()
      if (accounts.length === 0) {
        throw new Error('No accounts found for this API token')
      }
      saveToken(token)
      saveAccountId(accounts[0].id)
      saveAccountName(accounts[0].name)
      startPolling()
      return { success: true, accountId: accounts[0].id, accountName: accounts[0].name }
    } catch (error: unknown) {
      destroyApiClients()
      const message = error instanceof Error ? error.message : 'Authentication failed'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('auth:logout', () => {
    stopPolling()
    destroyApiClients()
    setLastActiveSenderId(null)
    clearActiveAccount()
    clearAllCaches()
    return { success: true }
  })

  ipcMain.handle('auth:restore', (): RestoreAuthResult => {
    // readStore() triggers migrateIfNeeded() if needed
    const senderId = getLastActiveSenderId()
    if (!senderId) {
      return { authenticated: false }
    }

    const profile = getSenderById(senderId)
    if (!profile) {
      return { authenticated: false }
    }

    const token = decryptToken(profile.encryptedToken)
    if (!token) {
      return { authenticated: false }
    }

    initApiClients(token)
    startPolling()
    return {
      authenticated: true,
      accountId: profile.accountId,
      accountName: profile.accountName,
      senderId: profile.id,
      senderDisplayName: profile.displayName,
    }
  })

  // ── Sender Profiles ──

  ipcMain.handle('auth:list-senders', async (): Promise<SenderProfilePublic[]> => {
    const profiles = listSenders()
    return profiles.map(({ encryptedToken, ...rest }) => rest)
  })

  ipcMain.handle('auth:add-sender', async (_event, displayName: string, token: string): Promise<AddSenderResult> => {
    // Validate inputs
    if (!displayName || displayName.trim().length === 0) {
      return { success: false, error: 'Display name is required' }
    }
    if (displayName.length > 80) {
      return { success: false, error: 'Display name must be 80 characters or fewer' }
    }
    if (!token || token.trim().length === 0) {
      return { success: false, error: 'API token is required' }
    }

    try {
      // Validate the token using a temporary client to avoid destroying the active session
      const tempClient = axios.create({
        baseURL: GENERAL_BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      })
      const response = await tempClient.get<Account[]>('/api/accounts')
      const accounts = response.data

      if (accounts.length === 0) {
        return { success: false, error: 'No accounts found for this API token' }
      }

      const account = accounts[0]

      // Check for duplicate accountId
      const existing = listSenders()
      if (existing.some(s => s.accountId === account.id)) {
        return { success: false, error: `Account "${account.name}" is already added` }
      }

      const profile: SenderProfile = {
        id: randomUUID(),
        displayName: displayName.trim(),
        encryptedToken: encryptToken(token),
        accountId: account.id,
        accountName: account.name,
        createdAt: new Date().toISOString(),
      }

      // Only now switch the active session
      destroyApiClients()
      clearAllCaches()
      initApiClients(token)
      saveSender(profile)
      setLastActiveSenderId(profile.id)
      startPolling()

      return { success: true, senderId: profile.id, accountId: account.id, accountName: account.name }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add sender'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('auth:select-sender', async (_event, senderId: string): Promise<SelectSenderResult> => {
    const profile = getSenderById(senderId)
    if (!profile) {
      return { success: false, error: 'Sender profile not found' }
    }

    const token = decryptToken(profile.encryptedToken)
    if (!token) {
      return { success: false, error: 'Failed to decrypt sender token' }
    }

    try {
      destroyApiClients()
      clearAllCaches()
      initApiClients(token)

      const accounts = await getAccounts()
      if (accounts.length === 0) {
        destroyApiClients()
        return { success: false, error: 'Token is no longer valid' }
      }

      setLastActiveSenderId(senderId)
      startPolling()

      return { success: true, senderId: profile.id, accountId: profile.accountId, accountName: profile.accountName }
    } catch (error: unknown) {
      destroyApiClients()
      const message = error instanceof Error ? error.message : 'Failed to select sender'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('auth:delete-sender', async (_event, senderId: string): Promise<DeleteSenderResult> => {
    const profile = getSenderById(senderId)
    if (!profile) {
      return { success: false, error: 'Sender profile not found' }
    }

    const wasActive = getLastActiveSenderId() === senderId
    if (wasActive) {
      stopPolling()
      destroyApiClients()
      setLastActiveSenderId(null)
    }

    deleteSenderFromStore(senderId)

    return { success: true, wasActive }
  })

  // ── Sandbox ──

  ipcMain.handle('sandbox:get-projects', withAuth(
    (accountId) => getProjects(accountId)
  ))

  ipcMain.handle('sandbox:get-inboxes', withAuth(
    (accountId) => getInboxes(accountId)
  ))

  ipcMain.handle('sandbox:get-inbox-summaries', withAuth(
    (accountId) => getInboxSummaries(accountId)
  ))

  ipcMain.handle('sandbox:get-messages', withAuth(
    async (accountId, inboxId: number, page: number) => {
      const messages = await getMessages(accountId, inboxId, page)
      return messages.map(toMessageSummary)
    }
  ))

  ipcMain.handle('sandbox:get-message', withAuth(
    (accountId, inboxId: number, messageId: number) =>
      getMessage(accountId, inboxId, messageId)
  ))

  ipcMain.handle('sandbox:get-message-html', withAuth(
    async (accountId, inboxId: number, messageId: number) => {
      try {
        return await getMessageHtmlBody(accountId, inboxId, messageId)
      } catch {
        return ''
      }
    }
  ))

  ipcMain.handle('sandbox:get-message-content', withAuth(
    async (_accountId, path: string) => {
      try {
        return await getMessageContentByPath(path)
      } catch {
        return ''
      }
    }
  ))

  ipcMain.handle('sandbox:get-spam-report', withAuth(
    (accountId, inboxId: number, messageId: number) =>
      getMessageSpamReport(accountId, inboxId, messageId)
  ))

  ipcMain.handle('sandbox:get-html-analysis', withAuth(
    (accountId, inboxId: number, messageId: number) =>
      getMessageHtmlAnalysis(accountId, inboxId, messageId)
  ))

  // ── Sending Stats ──

  ipcMain.handle('sending:get-domains', withAuth(
    (accountId) => getSendingDomains(accountId)
  ))

  ipcMain.handle('sending:get-stats', withAuth(
    (accountId, startDate: string, endDate: string, domainIds?: number[]) =>
      getAggregatedStats(accountId, startDate, endDate, domainIds)
  ))

  ipcMain.handle('sending:get-daily-stats', withAuth(
    (accountId, startDate: string, endDate: string, domainIds?: number[]) =>
      getDailyStats(accountId, startDate, endDate, domainIds)
  ))

  ipcMain.handle('sending:get-provider-stats', withAuth(
    (accountId, startDate: string, endDate: string, domainIds?: number[]) =>
      getMailboxProviderStats(accountId, startDate, endDate, domainIds)
  ))

  ipcMain.handle('sending:get-category-stats', withAuth(
    (accountId, startDate: string, endDate: string, domainIds?: number[]) =>
      getCategoryStats(accountId, startDate, endDate, domainIds)
  ))

  ipcMain.handle('sending:get-stream-summaries', withAuth(
    (accountId) => getStreamSummaries(accountId)
  ))

  // ── Tray Visibility ──

  ipcMain.handle('sandbox:get-hidden-tray-ids', () => {
    return getHiddenTrayInboxIds()
  })

  ipcMain.handle(
    'sandbox:set-tray-visibility',
    (_event, inboxId: number, visible: boolean) => {
      setInboxTrayVisibility(inboxId, visible)
      return { success: true }
    }
  )

  ipcMain.handle(
    'sandbox:set-tray-visibility-batch',
    (_event, entries: { inboxId: number; visible: boolean }[]) => {
      setMultipleInboxTrayVisibility(entries)
      return { success: true }
    }
  )

  // ── Sending Stats Cache ──

  ipcMain.handle(
    'sending:save-stats-cache',
    (_event, domainId: number, timeRange: string, stats: unknown, dailyStats: unknown, providerRows?: unknown, categoryRows?: unknown) => {
      saveSendingStatsCache(domainId, timeRange, stats, dailyStats, providerRows, categoryRows)
      return { success: true }
    }
  )

  ipcMain.handle(
    'sending:get-stats-cache',
    (_event, domainId: number, timeRange: string) => {
      return getSendingStatsCache(domainId, timeRange)
    }
  )

  // ── Inbox Summaries Cache ──

  ipcMain.handle('sandbox:save-inbox-cache', (_event, data: unknown) => {
    saveInboxSummariesCache(data)
    return { success: true }
  })

  ipcMain.handle('sandbox:get-inbox-cache', () => {
    return getInboxSummariesCache()
  })

  // ── Sending Domains Cache ──

  ipcMain.handle('sending:save-domains-cache', (_event, data: unknown) => {
    saveSendingDomainsCache(data)
    return { success: true }
  })

  ipcMain.handle('sending:get-domains-cache', () => {
    return getSendingDomainsCache()
  })

  // ── Messages Cache ──

  ipcMain.handle('sandbox:save-messages-cache', (_event, inboxId: number, data: unknown) => {
    saveMessagesCache(inboxId, data)
    return { success: true }
  })

  ipcMain.handle('sandbox:get-messages-cache', (_event, inboxId: number) => {
    return getMessagesCache(inboxId)
  })

  // ── Email Cache ──

  ipcMain.handle('sandbox:save-email-cache', (_event, inboxId: number, messageId: number, data: unknown, htmlBody: string | null) => {
    saveEmailCache(inboxId, messageId, data, htmlBody)
    return { success: true }
  })

  ipcMain.handle('sandbox:get-email-cache', (_event, inboxId: number, messageId: number) => {
    return getEmailCache(inboxId, messageId)
  })

  // ── Settings ──

  ipcMain.handle('settings:get', () => {
    return getSettings()
  })

  ipcMain.handle('settings:save', (_event, settings: Partial<AppSettings>) => {
    const updated = saveSettings(settings)
    if (settings.testingPollingIntervalMs !== undefined) {
      restartTestingPolling()
    }
    if (settings.sendingPollingIntervalMs !== undefined) {
      restartSendingPolling()
    }
    if (settings.sandboxEnabled !== undefined) {
      if (settings.sandboxEnabled) {
        restartTestingPolling()
      } else {
        stopTestingPolling()
      }
    }
    if (settings.sendingEnabled !== undefined) {
      if (settings.sendingEnabled) {
        restartSendingPolling()
      } else {
        stopSendingPolling()
      }
    }
    if (settings.sendingEnabled !== undefined || settings.sandboxEnabled !== undefined) {
      refreshTrayMenu()
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send('navigate', '__settings_changed')
      }
    }
    if (settings.launchAtStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    }
    return updated
  })
}
