import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Auth
  hasToken: () => ipcRenderer.invoke('auth:get-token'),
  login: (token: string) => ipcRenderer.invoke('auth:login', token),
  logout: () => ipcRenderer.invoke('auth:logout'),
  restoreAuth: () => ipcRenderer.invoke('auth:restore'),

  // Sandbox
  getProjects: () => ipcRenderer.invoke('sandbox:get-projects'),
  getInboxes: (projectId: number) => ipcRenderer.invoke('sandbox:get-inboxes', projectId),
  getInboxSummaries: () => ipcRenderer.invoke('sandbox:get-inbox-summaries'),
  getMessages: (inboxId: number, page = 1) => ipcRenderer.invoke('sandbox:get-messages', inboxId, page),
  getMessage: (inboxId: number, messageId: number) => ipcRenderer.invoke('sandbox:get-message', inboxId, messageId),
  getMessageHtml: (inboxId: number, messageId: number) => ipcRenderer.invoke('sandbox:get-message-html', inboxId, messageId),
  getMessageContent: (path: string) => ipcRenderer.invoke('sandbox:get-message-content', path),
  getSpamReport: (inboxId: number, messageId: number) => ipcRenderer.invoke('sandbox:get-spam-report', inboxId, messageId),
  getHtmlAnalysis: (inboxId: number, messageId: number) => ipcRenderer.invoke('sandbox:get-html-analysis', inboxId, messageId),

  // Tray visibility
  getHiddenTrayInboxIds: () => ipcRenderer.invoke('sandbox:get-hidden-tray-ids'),
  setInboxTrayVisibility: (inboxId: number, visible: boolean) => ipcRenderer.invoke('sandbox:set-tray-visibility', inboxId, visible),
  setTrayVisibilityBatch: (entries: { inboxId: number; visible: boolean }[]) => ipcRenderer.invoke('sandbox:set-tray-visibility-batch', entries),

  // Sending
  getDomains: () => ipcRenderer.invoke('sending:get-domains'),
  getStats: (startDate: string, endDate: string, domainIds?: number[]) => ipcRenderer.invoke('sending:get-stats', startDate, endDate, domainIds),
  getDailyStats: (startDate: string, endDate: string, domainIds?: number[]) => ipcRenderer.invoke('sending:get-daily-stats', startDate, endDate, domainIds),
  getProviderStats: (startDate: string, endDate: string, domainIds?: number[]) => ipcRenderer.invoke('sending:get-provider-stats', startDate, endDate, domainIds),
  getCategoryStats: (startDate: string, endDate: string, domainIds?: number[]) => ipcRenderer.invoke('sending:get-category-stats', startDate, endDate, domainIds),
  getStreamSummaries: () => ipcRenderer.invoke('sending:get-stream-summaries'),

  // Sending stats cache
  saveSendingStatsCache: (domainId: number, timeRange: string, stats: unknown, dailyStats: unknown, providerRows?: unknown, categoryRows?: unknown) =>
    ipcRenderer.invoke('sending:save-stats-cache', domainId, timeRange, stats, dailyStats, providerRows, categoryRows),
  getSendingStatsCache: (domainId: number, timeRange: string) =>
    ipcRenderer.invoke('sending:get-stats-cache', domainId, timeRange),

  // Inbox summaries cache
  saveInboxSummariesCache: (data: unknown) => ipcRenderer.invoke('sandbox:save-inbox-cache', data),
  getInboxSummariesCache: () => ipcRenderer.invoke('sandbox:get-inbox-cache'),

  // Sending domains cache
  saveSendingDomainsCache: (data: unknown) => ipcRenderer.invoke('sending:save-domains-cache', data),
  getSendingDomainsCache: () => ipcRenderer.invoke('sending:get-domains-cache'),

  // Messages cache
  saveMessagesCache: (inboxId: number, data: unknown) => ipcRenderer.invoke('sandbox:save-messages-cache', inboxId, data),
  getMessagesCache: (inboxId: number) => ipcRenderer.invoke('sandbox:get-messages-cache', inboxId),

  // Email cache
  saveEmailCache: (inboxId: number, messageId: number, data: unknown, htmlBody: string | null) =>
    ipcRenderer.invoke('sandbox:save-email-cache', inboxId, messageId, data, htmlBody),
  getEmailCache: (inboxId: number, messageId: number) => ipcRenderer.invoke('sandbox:get-email-cache', inboxId, messageId),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:save', settings),

  // Navigation (tray click -> renderer)
  onNavigate: (callback: (route: string) => void) => {
    ipcRenderer.on('navigate', (_event, route: string) => callback(route))
  }
}

contextBridge.exposeInMainWorld('electron', api)
