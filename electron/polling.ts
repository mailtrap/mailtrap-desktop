import { getSettings, saveInboxSummariesCache, getLastActiveSenderId, getSenderById, decryptToken } from './store'
import { getApiClient } from './api/client'
import { getInboxSummaries } from './api/sandbox'
import { getStreamSummaries } from './api/stats'
import { getConnector } from './api/vendors'
import { updateTrayData } from './tray'
import type { InboxSummary, SendingStreamSummary, VendorId } from './api/types'
import { VENDOR_CAPABILITIES } from './api/types'

let testingTimer: ReturnType<typeof setInterval> | null = null
let sendingTimer: ReturnType<typeof setInterval> | null = null

let latestInboxes: InboxSummary[] = []
let latestStreams: SendingStreamSummary[] = []

/** Get the active sender's vendor, or default to 'mailtrap'. */
function getActiveVendor(): VendorId {
  const senderId = getLastActiveSenderId()
  if (!senderId) return 'mailtrap'
  const profile = getSenderById(senderId)
  return profile?.vendor ?? 'mailtrap'
}

function isReady(): boolean {
  const senderId = getLastActiveSenderId()
  if (!senderId) return false
  const profile = getSenderById(senderId)
  if (!profile) return false
  // For Mailtrap, also require the API client to be initialized
  if (profile.vendor === 'mailtrap') {
    try {
      getApiClient()
    } catch {
      return false
    }
  }
  return true
}

// ── Testing Polling ──

async function pollTesting(): Promise<void> {
  if (!isReady()) return
  const senderId = getLastActiveSenderId()
  const profile = senderId ? getSenderById(senderId) : null
  if (!profile) return

  try {
    const inboxes = await getInboxSummaries(profile.accountId)
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
  const vendor = getActiveVendor()
  const caps = VENDOR_CAPABILITIES[vendor]

  // Only poll sandbox if the vendor supports it and settings allow it
  if (!caps.sandbox) {
    console.log(`[Polling:Testing] Skipped — vendor "${vendor}" has no sandbox capability`)
    return
  }
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

/**
 * Returns the effective sending polling interval, enforcing vendor-specific minimums.
 * Mailgun has a 10-minute minimum to avoid rate limiting from per-domain fan-out.
 */
function effectiveSendingInterval(vendor: VendorId): number {
  const base = getSettings().sendingPollingIntervalMs || 300000
  if (vendor === 'mailgun') return Math.max(base, 600000) // 10 min minimum
  return base
}

async function pollSending(): Promise<void> {
  if (!isReady()) return
  const senderId = getLastActiveSenderId()
  const profile = senderId ? getSenderById(senderId) : null
  if (!profile) return

  try {
    let streams: SendingStreamSummary[]

    if (profile.vendor === 'mailtrap') {
      // Use existing Mailtrap-specific flow
      streams = await getStreamSummaries(profile.accountId)
    } else {
      // Vendor-agnostic flow: use connector
      const connector = getConnector(profile.vendor)
      const token = decryptToken(profile.encryptedToken)
      if (!token) return

      const secondaryToken = profile.encryptedSecondaryToken
        ? decryptToken(profile.encryptedSecondaryToken) ?? undefined
        : undefined
      const connectorToken = profile.vendor === 'postmark' && secondaryToken
        ? `${token}::${secondaryToken}`
        : token

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const domains = await connector.getDomains(connectorToken)

      // Concurrency limit: process domains in batches of 3
      const results: SendingStreamSummary[] = []
      for (let i = 0; i < domains.length; i += 3) {
        const batch = domains.slice(i, i + 3)
        const batchResults = await Promise.allSettled(
          batch.map(d =>
            connector.getAggregatedStats(connectorToken, startDate, endDate, d.id)
          )
        )
        batchResults.forEach((r, j) => {
          const d = batch[j]
          const stats = r.status === 'fulfilled' ? r.value : null
          results.push({
            id: d.id,
            name: d.name,
            sentCount: stats ? stats.delivery_count + stats.bounce_count : 0,
            deliveryRate: stats ? stats.delivery_rate * 100 : null,
          })
        })
      }
      streams = results
    }

    latestStreams = streams
    updateTrayData(latestInboxes, latestStreams)
    console.log(`[Polling:Sending] Updated ${streams.length} streams`)
  } catch (err: unknown) {
    // Log rate limit warnings without crashing
    const message = err instanceof Error ? err.message : String(err)
    if (message.toLowerCase().includes('rate limit') || message.includes('429')) {
      console.warn(`[Polling:Sending] Rate limited — skipping cycle: ${message}`)
    } else {
      console.error('[Polling:Sending] Failed:', message)
    }
  }
}

export function startSendingPolling(): void {
  const settings = getSettings()
  const vendor = getActiveVendor()
  const caps = VENDOR_CAPABILITIES[vendor]

  // Only poll sending stats if the vendor supports it and settings allow it
  if (!caps.sendingStats) {
    console.log(`[Polling:Sending] Skipped — vendor "${vendor}" has no sendingStats capability`)
    return
  }
  if (!settings.sendingEnabled) {
    console.log('[Polling:Sending] Skipped — sending disabled')
    return
  }

  pollSending()
  const interval = effectiveSendingInterval(vendor)
  if (sendingTimer) clearInterval(sendingTimer)
  sendingTimer = setInterval(pollSending, interval)
  console.log(`[Polling:Sending] Started with ${interval / 1000}s interval (vendor: ${vendor})`)
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
