import { contextBridge, ipcRenderer } from 'electron'
import type {
  InboxSummary,
  MessageSummary,
  Message,
  SendingDomain,
  AggregatedStats,
  DailyStats,
  ProviderStats,
  CategoryStats,
  SendingStreamSummary,
  AppSettings,
  CacheEntry,
  StatsCacheEntry,
  EmailCacheEntry,
} from './api/types'

export interface ElectronAPI {
  // Auth
  hasToken: () => Promise<boolean>
  login: (token: string) => Promise<{ success: boolean; accountId?: number; accountName?: string; error?: string }>
  logout: () => Promise<{ success: boolean }>
  restoreAuth: () => Promise<{ authenticated: boolean; accountId?: number; accountName?: string }>

  // Sandbox
  getProjects: () => Promise<unknown[]>
  getInboxes: (projectId: number) => Promise<unknown[]>
  getInboxSummaries: () => Promise<InboxSummary[]>
  getMessages: (inboxId: number, page?: number) => Promise<MessageSummary[]>
  getMessage: (inboxId: number, messageId: number) => Promise<Message>
  getMessageHtml: (inboxId: number, messageId: number) => Promise<string>
  getMessageContent: (path: string) => Promise<string>
  getSpamReport: (inboxId: number, messageId: number) => Promise<unknown>
  getHtmlAnalysis: (inboxId: number, messageId: number) => Promise<unknown>

  // Tray visibility
  getHiddenTrayInboxIds: () => Promise<number[]>
  setInboxTrayVisibility: (inboxId: number, visible: boolean) => Promise<{ success: boolean }>
  setTrayVisibilityBatch: (entries: { inboxId: number; visible: boolean }[]) => Promise<{ success: boolean }>

  // Sending
  getDomains: () => Promise<SendingDomain[]>
  getStats: (startDate: string, endDate: string, domainIds?: number[]) => Promise<AggregatedStats>
  getDailyStats: (startDate: string, endDate: string, domainIds?: number[]) => Promise<DailyStats[]>
  getProviderStats: (startDate: string, endDate: string, domainIds?: number[]) => Promise<ProviderStats[]>
  getCategoryStats: (startDate: string, endDate: string, domainIds?: number[]) => Promise<CategoryStats[]>
  getStreamSummaries: () => Promise<SendingStreamSummary[]>

  // Sending stats cache
  saveSendingStatsCache: (domainId: number, timeRange: string, stats: AggregatedStats, dailyStats: DailyStats[], providerRows?: unknown, categoryRows?: unknown) => Promise<{ success: boolean }>
  getSendingStatsCache: (domainId: number, timeRange: string) => Promise<StatsCacheEntry | null>

  // Inbox summaries cache
  saveInboxSummariesCache: (data: InboxSummary[]) => Promise<{ success: boolean }>
  getInboxSummariesCache: () => Promise<CacheEntry<InboxSummary[]> | null>

  // Sending domains cache
  saveSendingDomainsCache: (data: SendingDomain[]) => Promise<{ success: boolean }>
  getSendingDomainsCache: () => Promise<CacheEntry<SendingDomain[]> | null>

  // Messages cache
  saveMessagesCache: (inboxId: number, data: MessageSummary[]) => Promise<{ success: boolean }>
  getMessagesCache: (inboxId: number) => Promise<CacheEntry<MessageSummary[]> | null>

  // Email cache
  saveEmailCache: (inboxId: number, messageId: number, data: Message, htmlBody: string | null) => Promise<{ success: boolean }>
  getEmailCache: (inboxId: number, messageId: number) => Promise<EmailCacheEntry | null>

  // Settings
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>

  // Navigation (tray click -> renderer)
  onNavigate: (callback: (route: string) => void) => void
}

const api: ElectronAPI = {
  // Auth
  hasToken: () => ipcRenderer.invoke('auth:get-token'),
  login: (token) => ipcRenderer.invoke('auth:login', token),
  logout: () => ipcRenderer.invoke('auth:logout'),
  restoreAuth: () => ipcRenderer.invoke('auth:restore'),

  // Sandbox
  getProjects: () => ipcRenderer.invoke('sandbox:get-projects'),
  getInboxes: (projectId) => ipcRenderer.invoke('sandbox:get-inboxes', projectId),
  getInboxSummaries: () => ipcRenderer.invoke('sandbox:get-inbox-summaries'),
  getMessages: (inboxId, page = 1) => ipcRenderer.invoke('sandbox:get-messages', inboxId, page),
  getMessage: (inboxId, messageId) => ipcRenderer.invoke('sandbox:get-message', inboxId, messageId),
  getMessageHtml: (inboxId, messageId) => ipcRenderer.invoke('sandbox:get-message-html', inboxId, messageId),
  getMessageContent: (path) => ipcRenderer.invoke('sandbox:get-message-content', path),
  getSpamReport: (inboxId, messageId) => ipcRenderer.invoke('sandbox:get-spam-report', inboxId, messageId),
  getHtmlAnalysis: (inboxId, messageId) => ipcRenderer.invoke('sandbox:get-html-analysis', inboxId, messageId),

  // Tray visibility
  getHiddenTrayInboxIds: () => ipcRenderer.invoke('sandbox:get-hidden-tray-ids'),
  setInboxTrayVisibility: (inboxId, visible) => ipcRenderer.invoke('sandbox:set-tray-visibility', inboxId, visible),
  setTrayVisibilityBatch: (entries) => ipcRenderer.invoke('sandbox:set-tray-visibility-batch', entries),

  // Sending
  getDomains: () => ipcRenderer.invoke('sending:get-domains'),
  getStats: (startDate, endDate, domainIds) => ipcRenderer.invoke('sending:get-stats', startDate, endDate, domainIds),
  getDailyStats: (startDate, endDate, domainIds) => ipcRenderer.invoke('sending:get-daily-stats', startDate, endDate, domainIds),
  getProviderStats: (startDate, endDate, domainIds) => ipcRenderer.invoke('sending:get-provider-stats', startDate, endDate, domainIds),
  getCategoryStats: (startDate, endDate, domainIds) => ipcRenderer.invoke('sending:get-category-stats', startDate, endDate, domainIds),
  getStreamSummaries: () => ipcRenderer.invoke('sending:get-stream-summaries'),

  // Sending stats cache
  saveSendingStatsCache: (domainId, timeRange, stats, dailyStats, providerRows, categoryRows) =>
    ipcRenderer.invoke('sending:save-stats-cache', domainId, timeRange, stats, dailyStats, providerRows, categoryRows),
  getSendingStatsCache: (domainId, timeRange) =>
    ipcRenderer.invoke('sending:get-stats-cache', domainId, timeRange),

  // Inbox summaries cache
  saveInboxSummariesCache: (data) => ipcRenderer.invoke('sandbox:save-inbox-cache', data),
  getInboxSummariesCache: () => ipcRenderer.invoke('sandbox:get-inbox-cache'),

  // Sending domains cache
  saveSendingDomainsCache: (data) => ipcRenderer.invoke('sending:save-domains-cache', data),
  getSendingDomainsCache: () => ipcRenderer.invoke('sending:get-domains-cache'),

  // Messages cache
  saveMessagesCache: (inboxId, data) => ipcRenderer.invoke('sandbox:save-messages-cache', inboxId, data),
  getMessagesCache: (inboxId) => ipcRenderer.invoke('sandbox:get-messages-cache', inboxId),

  // Email cache
  saveEmailCache: (inboxId, messageId, data, htmlBody) =>
    ipcRenderer.invoke('sandbox:save-email-cache', inboxId, messageId, data, htmlBody),
  getEmailCache: (inboxId, messageId) => ipcRenderer.invoke('sandbox:get-email-cache', inboxId, messageId),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Navigation (tray click -> renderer)
  onNavigate: (callback) => {
    ipcRenderer.on('navigate', (_event, route: string) => callback(route))
  },
}

contextBridge.exposeInMainWorld('electron', api)
