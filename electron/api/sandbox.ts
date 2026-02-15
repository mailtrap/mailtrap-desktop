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

export async function getInbox(accountId: number, inboxId: number): Promise<Inbox> {
  const client = getApiClient()
  const { data } = await client.get<Inbox>(
    `/api/accounts/${accountId}/inboxes/${inboxId}`
  )
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
  // First get the message to obtain its html_path
  const msg = await getMessage(accountId, inboxId, messageId)
  const htmlPath = msg.html_path
  if (!htmlPath) return ''
  // Fetch the HTML body from the signed path
  const { data } = await client.get<string>(htmlPath, {
    headers: { Accept: 'text/html' }
  })
  return data
}

// ── Helper: build tray-friendly summaries ──

export async function getInboxSummaries(accountId: number): Promise<InboxSummary[]> {
  // The projects endpoint returns inboxes embedded in each project
  const projects = await getProjects(accountId)
  const summaries: InboxSummary[] = []

  for (const project of projects) {
    for (const inbox of project.inboxes) {
      let lastSubject: string | null = null
      let lastDate: string | null = null

      if (inbox.emails_count > 0) {
        try {
          const messages = await getMessages(accountId, inbox.id, 1)
          if (messages.length > 0) {
            lastSubject = messages[0].subject
            lastDate = formatShortDate(messages[0].created_at)
          }
        } catch {
          // Ignore — we'll just show no last email
        }
      }

      summaries.push({
        id: inbox.id,
        name: inbox.name,
        projectName: project.name,
        sentCount: inbox.sent_messages_count,
        unreadCount: inbox.emails_unread_count,
        totalCount: inbox.emails_count,
        lastEmailSubject: lastSubject,
        lastEmailDate: lastDate,
        lastMessageAt: inbox.last_message_sent_at
      })
    }
  }

  return summaries
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

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
