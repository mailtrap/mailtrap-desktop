import { getAccountId, getSettings, saveInboxSummariesCache } from './store'
import { getApiClient } from './api/client'
import { getInboxSummaries } from './api/sandbox'
import { getStreamSummaries } from './api/stats'
import { updateTrayData } from './tray'
import type { InboxSummary, SendingStreamSummary } from './api/types'

let testingTimer: ReturnType<typeof setInterval> | null = null
let sendingTimer: ReturnType<typeof setInterval> | null = null

let latestInboxes: InboxSummary[] = []
let latestStreams: SendingStreamSummary[] = []

function isReady(): boolean {
  const accountId = getAccountId()
  if (!accountId) return false
  try {
    getApiClient()
    return true
  } catch {
    return false
  }
}

// ── Testing Polling ──

async function pollTesting(): Promise<void> {
  if (!isReady()) return
  const accountId = getAccountId()!

  try {
    const inboxes = await getInboxSummaries(accountId)
    latestInboxes = inboxes
    updateTrayData(latestInboxes, latestStreams)
    if (inboxes.length > 0) saveInboxSummariesCache(inboxes)
    console.log(`[Polling:Testing] Updated ${inboxes.length} inboxes`)
  } catch (err: unknown) {
    console.error('[Polling:Testing] Failed:', err instanceof Error ? err.message : String(err))
  }
}

export function startTestingPolling(): void {
  const settings = getSettings()
  if (!settings.sandboxEnabled) {
    console.log('[Polling:Testing] Skipped — sandbox disabled')
    return
  }
  pollTesting()
  const interval = settings.testingPollingIntervalMs || 60000
  if (testingTimer) clearInterval(testingTimer)
  testingTimer = setInterval(pollTesting, interval)
  console.log(`[Polling:Testing] Started with ${interval / 1000}s interval`)
}

export function stopTestingPolling(): void {
  if (testingTimer) {
    clearInterval(testingTimer)
    testingTimer = null
    console.log('[Polling:Testing] Stopped')
  }
}

export function restartTestingPolling(): void {
  stopTestingPolling()
  startTestingPolling()
}

// ── Sending Polling ──

async function pollSending(): Promise<void> {
  if (!isReady()) return
  const accountId = getAccountId()!

  try {
    const streams = await getStreamSummaries(accountId)
    latestStreams = streams
    updateTrayData(latestInboxes, latestStreams)
    console.log(`[Polling:Sending] Updated ${streams.length} streams`)
  } catch (err: unknown) {
    console.error('[Polling:Sending] Failed:', err instanceof Error ? err.message : String(err))
  }
}

export function startSendingPolling(): void {
  const settings = getSettings()
  if (!settings.sendingEnabled) {
    console.log('[Polling:Sending] Skipped — sending disabled')
    return
  }
  pollSending()
  const interval = settings.sendingPollingIntervalMs || 300000
  if (sendingTimer) clearInterval(sendingTimer)
  sendingTimer = setInterval(pollSending, interval)
  console.log(`[Polling:Sending] Started with ${interval / 1000}s interval`)
}

export function stopSendingPolling(): void {
  if (sendingTimer) {
    clearInterval(sendingTimer)
    sendingTimer = null
    console.log('[Polling:Sending] Stopped')
  }
}

export function restartSendingPolling(): void {
  stopSendingPolling()
  startSendingPolling()
}

// ── Combined helpers ──

export function startPolling(): void {
  startTestingPolling()
  startSendingPolling()
}

export function stopPolling(): void {
  stopTestingPolling()
  stopSendingPolling()
}

export function restartPolling(): void {
  stopPolling()
  startPolling()
}
