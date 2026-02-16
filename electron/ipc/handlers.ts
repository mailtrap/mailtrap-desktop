import { ipcMain, app } from 'electron'
import { initApiClients, destroyApiClients } from '../api/client'
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
    getAccountId,
    saveAccountName,
    getAccountName,
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
    saveSettings
  } from '../store'
import { startPolling, stopPolling, restartTestingPolling, restartSendingPolling } from '../polling'
import type { AppSettings } from '../api/types'

export function registerIpcHandlers(): void {
  // ── Auth ──

  ipcMain.handle('auth:get-token', () => {
    return getToken() !== null
  })

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
    deleteToken()
    destroyApiClients()
    return { success: true }
  })

  ipcMain.handle('auth:restore', () => {
    const token = getToken()
    const accountId = getAccountId()
    const accountName = getAccountName()
    if (token && accountId) {
      initApiClients(token)
      startPolling()
      return { authenticated: true, accountId, accountName }
    }
    return { authenticated: false }
  })

  // ── Sandbox ──

  ipcMain.handle('sandbox:get-projects', async () => {
    const accountId = getAccountId()
    if (!accountId) throw new Error('Not authenticated')
    return await getProjects(accountId)
  })

  ipcMain.handle('sandbox:get-inboxes', async () => {
    const accountId = getAccountId()
    if (!accountId) throw new Error('Not authenticated')
    return await getInboxes(accountId)
  })

  ipcMain.handle('sandbox:get-inbox-summaries', async () => {
    const accountId = getAccountId()
    if (!accountId) throw new Error('Not authenticated')
    return await getInboxSummaries(accountId)
  })

  ipcMain.handle(
    'sandbox:get-messages',
    async (_event, inboxId: number, page: number) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      const messages = await getMessages(accountId, inboxId, page)
      return messages.map(toMessageSummary)
    }
  )

  ipcMain.handle(
    'sandbox:get-message',
    async (_event, inboxId: number, messageId: number) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getMessage(accountId, inboxId, messageId)
    }
  )

  ipcMain.handle(
    'sandbox:get-message-html',
    async (_event, inboxId: number, messageId: number) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      try {
        return await getMessageHtmlBody(accountId, inboxId, messageId)
      } catch {
        // HTML body may not exist for some messages — return empty
        return ''
      }
    }
  )

  ipcMain.handle(
    'sandbox:get-message-content',
    async (_event, path: string) => {
      try {
        return await getMessageContentByPath(path)
      } catch {
        return ''
      }
    }
  )

  ipcMain.handle(
    'sandbox:get-spam-report',
    async (_event, inboxId: number, messageId: number) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getMessageSpamReport(accountId, inboxId, messageId)
    }
  )

  ipcMain.handle(
    'sandbox:get-html-analysis',
    async (_event, inboxId: number, messageId: number) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getMessageHtmlAnalysis(accountId, inboxId, messageId)
    }
  )

  // ── Sending Stats ──

  ipcMain.handle('sending:get-domains', async () => {
    const accountId = getAccountId()
    if (!accountId) throw new Error('Not authenticated')
    return await getSendingDomains(accountId)
  })

  ipcMain.handle(
    'sending:get-stats',
    async (_event, startDate: string, endDate: string, domainIds?: number[]) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getAggregatedStats(accountId, startDate, endDate, domainIds)
    }
  )

  ipcMain.handle(
    'sending:get-daily-stats',
    async (_event, startDate: string, endDate: string, domainIds?: number[]) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getDailyStats(accountId, startDate, endDate, domainIds)
    }
  )

  ipcMain.handle(
    'sending:get-provider-stats',
    async (_event, startDate: string, endDate: string, domainIds?: number[]) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getMailboxProviderStats(accountId, startDate, endDate, domainIds)
    }
  )

  ipcMain.handle(
    'sending:get-category-stats',
    async (_event, startDate: string, endDate: string, domainIds?: number[]) => {
      const accountId = getAccountId()
      if (!accountId) throw new Error('Not authenticated')
      return await getCategoryStats(accountId, startDate, endDate, domainIds)
    }
  )

  ipcMain.handle('sending:get-stream-summaries', async () => {
    const accountId = getAccountId()
    if (!accountId) throw new Error('Not authenticated')
    return await getStreamSummaries(accountId)
  })

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
    // Restart the correct polling timer when its interval changes
    if (settings.testingPollingIntervalMs !== undefined) {
      restartTestingPolling()
    }
    if (settings.sendingPollingIntervalMs !== undefined) {
      restartSendingPolling()
    }
    // Apply launch-at-startup setting
    if (settings.launchAtStartup !== undefined) {
      app.setLoginItemSettings({ openAtLogin: settings.launchAtStartup })
    }
    return updated
  })
}
