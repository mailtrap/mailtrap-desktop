// ── Account ──

export interface Account {
  id: number
  name: string
  access_levels: number[]
}

// ── Sandboxes ──

export interface Project {
  id: number
  name: string
  share_links?: {
    admin: string
    viewer: string
  }
  inboxes: Inbox[]
  permissions: {
    can_read: boolean
    can_update: boolean
    can_destroy: boolean
    can_leave: boolean
  }
}

export interface Inbox {
  id: number
  name: string
  username: string
  status: string
  email_username: string
  email_username_enabled: boolean
  used: boolean
  forward_from_email_address: string
  project_id: number
  domain: string
  pop3_domain: string
  email_domain: string
  api_domain: string
  smtp_ports: number[]
  pop3_ports: number[]
  sent_messages_count: number
  forwarded_messages_count: number
  emails_count: number
  emails_unread_count: number
  last_message_sent_at: string | null
  max_size: number
  max_message_size: number
  permissions: {
    can_read: boolean
    can_update: boolean
    can_destroy: boolean
    can_leave: boolean
  }
}

export interface InboxSummary {
  id: number
  name: string
  projectName: string
  sentCount: number
  unreadCount: number
  totalCount: number
  lastEmailSubject: string | null
  lastEmailDate: string | null
  lastMessageAt: string | null
}

export interface Message {
  id: number
  inbox_id: number
  subject: string
  sent_at: string
  from_email: string
  from_name: string
  to_email: string
  to_name: string
  email_size: number
  is_read: boolean
  created_at: string
  updated_at: string
  template_id: string | null
  template_variables: Record<string, unknown> | null
  html_body_size: number
  text_body_size: number
  human_size: string
  html_path: string
  txt_path: string
  raw_path: string
  download_path: string
  html_body: string
  text_body: string
  html_source_path: string
  blacklists_report_info: boolean | Record<string, unknown>
  smtp_information?: {
    ok: boolean
    data?: {
      mail_from_addr: string
      client_ip: string
    }
  }
}

export interface MessageSummary {
  id: number
  inboxId: number
  subject: string
  fromEmail: string
  fromName: string
  toEmail: string
  toName: string
  sentAt: string
  isRead: boolean
  size: string
}

// ── Sending ──

export interface SendingDomain {
  id: number
  domain_name: string
  open_tracking_enabled: boolean
  click_tracking_enabled: boolean
  dns_verified: boolean
  demo: boolean
  permissions: {
    can_read: boolean
    can_update: boolean
    can_destroy: boolean
  }
}

// The /api/accounts/{id}/sending_domains response wraps data in { data: [...] }
export interface SendingDomainsResponse {
  data: SendingDomain[]
}

// Aggregated stats from /api/accounts/{id}/stats
export interface AggregatedStats {
  delivery_count: number
  delivery_rate: number
  bounce_count: number
  bounce_rate: number
  open_count: number
  open_rate: number
  click_count: number
  click_rate: number
  spam_count: number
  spam_rate: number
}

// Daily stats from /api/accounts/{id}/stats/date
export interface DailyStatsItem {
  date: string
  stats: {
    delivery_count: number
    delivery_rate: number
    bounce_count: number
    bounce_rate: number
    open_count: number
    open_rate: number
    click_count: number
    click_rate: number
    spam_count: number
    spam_rate: number
  }
}

// Flattened daily stats for the renderer
export interface DailyStats {
  date: string
  delivered: number
  deliveryRate: number
  bounced: number
  bounceRate: number
  opened: number
  openRate: number
  clicked: number
  clickRate: number
  spam: number
}

// Stats by mailbox provider from /api/accounts/{id}/stats/email_service_providers
export interface ProviderStats {
  email_service_provider: string
  stats: {
    delivery_count: number
    delivery_rate: number
    bounce_count: number
    bounce_rate: number
    open_count: number
    open_rate: number
    click_count: number
    click_rate: number
    spam_count: number
    spam_rate: number
  }
}

// Stats by category from /api/accounts/{id}/stats/categories
export interface CategoryStats {
  category: string
  stats: {
    delivery_count: number
    delivery_rate: number
    bounce_count: number
    bounce_rate: number
    open_count: number
    open_rate: number
    click_count: number
    click_rate: number
    spam_count: number
    spam_rate: number
  }
}

export interface SendingStreamSummary {
  id: string
  name: string
  sentCount: number
  deliveryRate: number | null
}

// ── Sender Profiles ──

export interface SenderProfile {
  id: string
  displayName: string
  encryptedToken: string
  accountId: number
  accountName: string
  createdAt: string
}

export type SenderProfilePublic = Omit<SenderProfile, 'encryptedToken'>

export type AddSenderResult =
  | { success: true; senderId: string; accountId: number; accountName: string }
  | { success: false; error: string }

export type SelectSenderResult =
  | { success: true; senderId: string; accountId: number; accountName: string }
  | { success: false; error: string }

export type DeleteSenderResult =
  | { success: true; wasActive: boolean }
  | { success: false; error: string }

export type RestoreAuthResult =
  | { authenticated: true; accountId: number; accountName?: string; senderId: string; senderDisplayName: string }
  | { authenticated: false }

// ── Settings ──

export interface AppSettings {
  testingPollingIntervalMs: number
  sendingPollingIntervalMs: number
  launchAtStartup: boolean
  theme: 'system' | 'light' | 'dark'
  defaultView: 'sending' | 'testing'
  sendingEnabled: boolean
  sandboxEnabled: boolean
}

export interface StatsRow {
  name: string
  delivered: number
  uniqueOpenRate: number
  clickRate: number
  bounceRate: number
  spamCount: number
}

export interface CacheEntry<T> {
  data: T
  fetchedAt: string
}

export interface StatsCacheEntry {
  stats: AggregatedStats
  dailyStats: DailyStats[]
  providerRows?: StatsRow[]
  categoryRows?: StatsRow[]
  fetchedAt: string
}

export interface EmailCacheEntry {
  data: {
    message: Message
    htmlBody: string | null
  }
  fetchedAt: string
}

export const DEFAULT_SETTINGS: AppSettings = {

  testingPollingIntervalMs: 60000,    // 1 minute
  sendingPollingIntervalMs: 300000,   // 5 minutes
  launchAtStartup: false,
  theme: 'system',
  defaultView: 'testing',
  sendingEnabled: true,
  sandboxEnabled: true,
}
