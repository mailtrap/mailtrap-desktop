import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Message, Project } from '../../api/types'

// Mock the API client
const mockGet = vi.fn()
vi.mock('../../api/client', () => ({
  getApiClient: () => ({ get: mockGet })
}))

import { toMessageSummary, getInboxSummaries } from '../../api/sandbox'

beforeEach(() => {
  mockGet.mockReset()
})

// ── toMessageSummary ──

describe('toMessageSummary', () => {
  it('maps snake_case Message to camelCase MessageSummary', () => {
    const msg: Message = {
      id: 1,
      inbox_id: 10,
      subject: 'Test Email',
      from_email: 'sender@test.com',
      from_name: 'Sender',
      to_email: 'recipient@test.com',
      to_name: 'Recipient',
      sent_at: '2025-01-15T10:00:00Z',
      created_at: '2025-01-15T09:00:00Z',
      is_read: false,
      human_size: '2.5 KB',
      email_size: 2560,
      updated_at: '2025-01-15T10:00:00Z',
      template_id: null,
      template_variables: null,
      html_body_size: 1024,
      text_body_size: 512,
      html_path: '/html',
      txt_path: '/txt',
      raw_path: '/raw',
      download_path: '/download',
      html_body: '<p>Hi</p>',
      text_body: 'Hi',
      html_source_path: '/source',
      blacklists_report_info: false
    }

    const summary = toMessageSummary(msg)

    expect(summary).toEqual({
      id: 1,
      inboxId: 10,
      subject: 'Test Email',
      fromEmail: 'sender@test.com',
      fromName: 'Sender',
      toEmail: 'recipient@test.com',
      toName: 'Recipient',
      sentAt: '2025-01-15T10:00:00Z',
      isRead: false,
      size: '2.5 KB'
    })
  })

  it('uses created_at as sentAt when sent_at is empty', () => {
    const msg = {
      id: 2,
      inbox_id: 10,
      subject: 'No sent_at',
      from_email: 'a@b.com',
      from_name: 'A',
      to_email: 'b@c.com',
      to_name: 'B',
      sent_at: '',
      created_at: '2025-01-20T12:00:00Z',
      is_read: true,
      human_size: '1 KB'
    } as Message

    const summary = toMessageSummary(msg)
    expect(summary.sentAt).toBe('2025-01-20T12:00:00Z')
  })
})

// ── getInboxSummaries ──

describe('getInboxSummaries', () => {
  it('aggregates projects with inboxes into summaries', async () => {
    const projects: Project[] = [
      {
        id: 1,
        name: 'Project Alpha',
        inboxes: [
          {
            id: 100,
            name: 'Dev Inbox',
            emails_count: 5,
            emails_unread_count: 2,
            sent_messages_count: 3,
            last_message_sent_at: '2025-01-15T10:00:00Z',
            // minimal required fields
            username: 'u1',
            status: 'active',
            email_username: 'eu1',
            email_username_enabled: true,
            used: true,
            forward_from_email_address: '',
            project_id: 1,
            domain: 'd',
            pop3_domain: 'p',
            email_domain: 'e',
            api_domain: 'a',
            smtp_ports: [],
            pop3_ports: [],
            forwarded_messages_count: 0,
            max_size: 100,
            max_message_size: 10,
            permissions: { can_read: true, can_update: true, can_destroy: true, can_leave: false }
          }
        ],
        permissions: { can_read: true, can_update: true, can_destroy: true, can_leave: false }
      }
    ]

    // Mock getProjects
    mockGet.mockResolvedValueOnce({ data: projects })
    // Mock getMessages for the inbox with emails_count > 0
    mockGet.mockResolvedValueOnce({
      data: [
        { subject: 'Latest Email', created_at: '2025-01-15T10:00:00Z' }
      ]
    })

    const summaries = await getInboxSummaries(1)

    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      id: 100,
      name: 'Dev Inbox',
      projectName: 'Project Alpha',
      sentCount: 3,
      unreadCount: 2,
      totalCount: 5,
      lastEmailSubject: 'Latest Email'
    })
  })

  it('sets null last email info when inbox has no emails', async () => {
    const projects: Project[] = [
      {
        id: 1,
        name: 'Empty Project',
        inboxes: [
          {
            id: 200,
            name: 'Empty Inbox',
            emails_count: 0,
            emails_unread_count: 0,
            sent_messages_count: 0,
            last_message_sent_at: null,
            username: 'u2',
            status: 'active',
            email_username: 'eu2',
            email_username_enabled: true,
            used: false,
            forward_from_email_address: '',
            project_id: 1,
            domain: 'd',
            pop3_domain: 'p',
            email_domain: 'e',
            api_domain: 'a',
            smtp_ports: [],
            pop3_ports: [],
            forwarded_messages_count: 0,
            max_size: 100,
            max_message_size: 10,
            permissions: { can_read: true, can_update: true, can_destroy: true, can_leave: false }
          }
        ],
        permissions: { can_read: true, can_update: true, can_destroy: true, can_leave: false }
      }
    ]

    mockGet.mockResolvedValueOnce({ data: projects })

    const summaries = await getInboxSummaries(1)

    expect(summaries).toHaveLength(1)
    expect(summaries[0].lastEmailSubject).toBeNull()
    expect(summaries[0].lastEmailDate).toBeNull()
  })
})
