import { getApiClient } from './client'
import type { Account, Project, Inbox, Message, InboxSummary, MessageSummary } from './types'

// ── Accounts ──

export async function getAccounts(): Promise<Account[]> {
  const client = getApiClient()
  const { data } = await client.get<Account[]>('/api/accounts')
  return data
}

// ── Projects (includes embedded inboxes) ──

export async function getProjects(accountId: number): Promise<Project[]> {
  const client = getApiClient()
  const { data } = await client.get<Project[]>(`/api/accounts/${accountId}/projects`)
  return data
}

// ── Inboxes ──

export async function getInboxes(accountId: number): Promise<Inbox[]> {
  // List all inboxes for the account (not per-project)
  const client = getApiClient()
  const { data } = await client.get<Inbox[]>(`/api/accounts/${accountId}/inboxes`)
  return data
}


// ── Messages ──

export async function getMessages(
  accountId: number,
  inboxId: number,
  page = 1
): Promise<Message[]> {
  const client = getApiClient()
  const { data } = await client.get<Message[]>(
    `/api/accounts/${accountId}/inboxes/${inboxId}/messages`,
    { params: { page } }
  )
  return data
}

export async function getMessage(
  accountId: number,
  inboxId: number,
  messageId: number
): Promise<Message> {
  const client = getApiClient()
  const { data } = await client.get<Message>(
    `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${messageId}`
  )
  return data
}

export async function getMessageHtmlBody(
  accountId: number,
  inboxId: number,
  messageId: number
): Promise<string> {
  const client = getApiClient()
  const msg = await getMessage(accountId, inboxId, messageId)
  const htmlPath = msg.html_path
  if (!htmlPath) return ''
  const { data } = await client.get<string>(htmlPath, {
    headers: { Accept: 'text/html' }
  })
  return data
}

/** Fetch content from a message path (html_source_path, txt_path, raw_path) */
export async function getMessageContentByPath(path: string): Promise<string> {
  if (!path) return ''
  const client = getApiClient()
  const { data } = await client.get<string>(path)
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
}

/** Fetch spam report for a message */
export async function getMessageSpamReport(
  accountId: number,
  inboxId: number,
  messageId: number
): Promise<unknown> {
  const client = getApiClient()
  const { data } = await client.get(
    `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${messageId}/spam_report`
  )
  return data
}

/** Fetch HTML analysis for a message */
export async function getMessageHtmlAnalysis(
  accountId: number,
  inboxId: number,
  messageId: number
): Promise<unknown> {
  const client = getApiClient()
  const { data } = await client.get(
    `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${messageId}/analyze`
  )
  return data
}

// ── Helper: build tray-friendly summaries ──

export async function getInboxSummaries(accountId: number): Promise<InboxSummary[]> {
  const projects = await getProjects(accountId)

  const entries: { project: typeof projects[0]; inbox: typeof projects[0]['inboxes'][0] }[] = []
  for (const project of projects) {
    for (const inbox of project.inboxes) {
      entries.push({ project, inbox })
    }
  }

  const messageResults = await Promise.allSettled(
    entries.map(({ inbox }) =>
      inbox.emails_count > 0
        ? getMessages(accountId, inbox.id, 1)
        : Promise.resolve(null)
    )
  )

  return entries.map(({ project, inbox }, i) => {
    let lastSubject: string | null = null
    let lastDate: string | null = null

    const result = messageResults[i]
    if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
      lastSubject = result.value[0].subject
      lastDate = formatShortDate(result.value[0].created_at)
    }

    return {
      id: inbox.id,
      name: inbox.name,
      projectName: project.name,
      sentCount: inbox.sent_messages_count,
      unreadCount: inbox.emails_unread_count,
      totalCount: inbox.emails_count,
      lastEmailSubject: lastSubject,
      lastEmailDate: lastDate,
      lastMessageAt: inbox.last_message_sent_at
    }
  })
}

export function toMessageSummary(msg: Message): MessageSummary {
  return {
    id: msg.id,
    inboxId: msg.inbox_id,
    subject: msg.subject,
    fromEmail: msg.from_email,
    fromName: msg.from_name,
    toEmail: msg.to_email,
    toName: msg.to_name,
    sentAt: msg.sent_at || msg.created_at,
    isRead: msg.is_read,
    size: msg.human_size
  }
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
