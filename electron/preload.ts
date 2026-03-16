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
  SenderProfilePublic,
  AddSenderResult,
  SelectSenderResult,
  DeleteSenderResult,
  RestoreAuthResult,
  VendorId,
  VendorCapabilities,
  EmailEvent,
  SuppressionEntry,
} from './api/types'

export interface ElectronAPI {
  // Auth
  hasToken: () => Promise<boolean>
  logout: () => Promise<{ success: boolean }>
  restoreAuth: () => Promise<RestoreAuthResult>

  // Sender Profiles
  listSenders: () => Promise<SenderProfilePublic[]>
  addSender: (vendor: VendorId, displayName: string, token: string, secondaryToken?: string) => Promise<AddSenderResult>
  selectSender: (senderId: string) => Promise<SelectSenderResult>
  deleteSender: (senderId: string) => Promise<DeleteSenderResult>

  // Vendor capabilities
  getCapabilities: () => Promise<VendorCapabilities>

  // Vendor-agnostic data
  getVendorDomains: () => Promise<{ id: string; name: string }[]>
  getVendorStats: (startDate: string, endDate: string, domainId: string | null) => Promise<AggregatedStats>
  getVendorDailyStats: (startDate: string, endDate: string, domainId: string | null) => Promise<DailyStats[]>
  getEvents: (domainId: string | null, page: number) => Promise<EmailEvent[]>
  getSuppressions: () => Promise<SuppressionEntry[]>

  // Sandbox (Mailtrap-only)
  getProjects: () => Promise<unknown[]>
  getInboxes: (projectId: number) => Promise<unknown[]>
  getInboxSummaries: () => Promise<InboxSummary[]>
  getMessages: (inboxId: number, page?: number) => Promise<MessageSummary[]>
  getMessage: (inboxId: number, messageId: number) => Promise<Message>
  getMessageHtml: (inboxId: number, messageId: number) => Promise<string>
  getMessageContent: (path: string) => Promise<string>
  getSpamReport: (inboxId: number, messageId: number) => Promise<unknown>
  getHtmlAnalysis: (inboxId: number, messageId: number) => Promise<unknown>

  // Tray visibility (Mailtrap-only)
  getHiddenTrayInboxIds: () => Promise<number[]>
  setInboxTrayVisibility: (inboxId: number, visible: boolean) => Promise<{ success: boolean }>
  setTrayVisibilityBatch: (entries: { inboxId: number; visible: boolean }[]) => Promise<{ success: boolean }>

  // Sending (Mailtrap-only legacy — kept for backward compat)
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
  onNavigate: (callback: (route: string) => void) => () => void
}

const api: ElectronAPI = {
  // Auth
  hasToken: () => ipcRenderer.invoke('auth:get-token'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  restoreAuth: () => ipcRenderer.invoke('auth:restore'),

  // Sender Profiles
  listSenders: () => ipcRenderer.invoke('auth:list-senders'),
  addSender: (vendor, displayName, token, secondaryToken) =>
    ipcRenderer.invoke('auth:add-sender', vendor, displayName, token, secondaryToken),
  selectSender: (senderId) => ipcRenderer.invoke('auth:select-sender', senderId),
  deleteSender: (senderId) => ipcRenderer.invoke('auth:delete-sender', senderId),

  // Vendor capabilities
  getCapabilities: () => ipcRenderer.invoke('vendor:get-capabilities'),

  // Vendor-agnostic data
  getVendorDomains: () => ipcRenderer.invoke('vendor:get-domains'),
  getVendorStats: (startDate, endDate, domainId) =>
    ipcRenderer.invoke('vendor:get-stats', startDate, endDate, domainId),
  getVendorDailyStats: (startDate, endDate, domainId) =>
    ipcRenderer.invoke('vendor:get-daily-stats', startDate, endDate, domainId),
  getEvents: (domainId, page) => ipcRenderer.invoke('vendor:get-events', domainId, page),
  getSuppressions: () => ipcRenderer.invoke('vendor:get-suppressions'),

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

  // Sending (Mailtrap-only legacy)
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
    const listener = (_event: Electron.IpcRendererEvent, route: string) => callback(route)
    ipcRenderer.on('navigate', listener)
    return () => { ipcRenderer.removeListener('navigate', listener) }
  },
}

contextBridge.exposeInMainWorld('electron', api)
