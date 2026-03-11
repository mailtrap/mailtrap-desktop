# Architecture: Add Sender Selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`
**Phase:** 3 — Architecture

---

## Overview

This document describes the technical design for converting the app from a single-sender model to a multi-sender list model. The core principle is minimal disruption: the store gains a new `senders` array alongside a `lastActiveSenderId` pointer; existing functional code (API client, polling, tray) is unchanged; the renderer unauthenticated view is swapped from `TokenSetup` to a two-screen `SenderList / AddSender` flow.

---

## 1. Store Schema Changes

### 1.1 Current structure (as-is)

```
StoreData {
  encryptedToken?:       string   // base64 of safeStorage-encrypted token
  accountId?:            number
  accountName?:          string
  hiddenTrayInboxIds?:   number[]
  sendingStatsCache?:    Record<string, CachedSendingStats>
  inboxSummariesCache?:  CachedWithTimestamp
  messagesCache?:        Record<string, CachedWithTimestamp>
  emailCache?:           Record<string, CachedWithTimestamp>
  sendingDomainsCache?:  CachedWithTimestamp
  settings:              AppSettings
}
```

### 1.2 New structure (to-be)

```
StoreData {
  // --- NEW ---
  senders?:              SenderProfile[]
  lastActiveSenderId?:   string

  // --- LEGACY (kept for migration read, then removed) ---
  encryptedToken?:       string
  accountId?:            number
  accountName?:          string

  // --- UNCHANGED ---
  hiddenTrayInboxIds?:   number[]
  sendingStatsCache?:    Record<string, CachedSendingStats>
  inboxSummariesCache?:  CachedWithTimestamp
  messagesCache?:        Record<string, CachedWithTimestamp>
  emailCache?:           Record<string, CachedWithTimestamp>
  sendingDomainsCache?:  CachedWithTimestamp
  settings:              AppSettings
}
```

The legacy fields (`encryptedToken`, `accountId`, `accountName`) remain in the `StoreData` TypeScript interface as optional because they must be readable during migration. After migration they are deleted from the written JSON. The interface fields are annotated `/** @deprecated — removed by migration */`.

### 1.3 SenderProfile shape

```typescript
interface SenderProfile {
  id:             string   // UUID v4 generated at save time
  displayName:    string   // user-provided, 1–80 chars
  encryptedToken: string   // base64 of safeStorage-encrypted token
  accountId:      number   // from GET /api/accounts at save time
  accountName:    string   // from GET /api/accounts at save time
  createdAt:      string   // ISO 8601 timestamp
}
```

Stored in `StoreData.senders[]`. No size limit imposed by the store layer.

### 1.4 ID generation

Sender IDs use `crypto.randomUUID()` (available in Node.js 14.17+ / Electron 13+; this project targets Electron 35, so it is unconditionally available). No external package is needed.

---

## 2. Migration Strategy

### 2.1 Trigger

Migration runs inside `readStore()`, immediately after the raw JSON is parsed from disk. This is the single entry point for all store reads, so the migration runs exactly once per app process (the result is cached in `storeCache`).

### 2.2 Migration logic

```
function migrateIfNeeded(store: StoreData): StoreData {
  const hasSenders = store.senders && store.senders.length > 0
  const hasLegacyToken = !!store.encryptedToken

  if (hasSenders || !hasLegacyToken) {
    // Already migrated, or nothing to migrate (fresh install)
    return store
  }

  // Build a SenderProfile from legacy fields
  const profile: SenderProfile = {
    id:             crypto.randomUUID(),
    displayName:    store.accountName ?? 'My account',
    encryptedToken: store.encryptedToken,          // already base64-encoded
    accountId:      store.accountId ?? 0,
    accountName:    store.accountName ?? '',
    createdAt:      new Date().toISOString()
  }

  store.senders = [profile]
  store.lastActiveSenderId = profile.id

  // Remove legacy top-level fields
  delete store.encryptedToken
  delete store.accountId
  delete store.accountName

  // Flush to disk so the migration doesn't re-run
  writeStore(store)

  return store
}
```

Idempotency guarantee: the condition `hasSenders || !hasLegacyToken` ensures the migration body never runs if `senders` already has entries (even if legacy fields somehow reappear).

The `accountId` fallback of `0` handles the edge case where a token was saved but the account ID was never persisted (should not occur in practice, but is defensive).

---

## 3. New Store Functions

The following functions are added to `electron/store.ts`. Existing functions (`saveToken`, `getToken`, `deleteToken`, `saveAccountId`, `getAccountId`, `saveAccountName`, `getAccountName`) remain for now but become internal-only helpers used only by the migration path; they are not called from IPC handlers after this change.

| Function | Signature | Purpose |
|---|---|---|
| `listSenders` | `() => SenderProfile[]` | Return full sender list (includes encrypted tokens — main process only) |
| `saveSender` | `(profile: SenderProfile) => void` | Upsert a sender by id |
| `deleteSender` | `(id: string) => void` | Remove sender by id from the array |
| `getSenderById` | `(id: string) => SenderProfile \| null` | Look up a single sender |
| `getLastActiveSenderId` | `() => string \| null` | Read `lastActiveSenderId` |
| `setLastActiveSenderId` | `(id: string \| null) => void` | Write `lastActiveSenderId`; pass null to clear |

All functions call `readStore()` (cache-first) and `writeStore()` as today.

---

## 4. API Client Lifecycle

`electron/api/client.ts` is unchanged. The three functions (`initApiClients`, `getApiClient`, `destroyApiClients`) continue to manage a single module-level `apiClient`.

The key invariant: before any sender activation (`auth:add-sender` or `auth:select-sender`) the existing client must be destroyed if one exists. The handler calls `destroyApiClients()` first, then `initApiClients(token)`. This prevents a partial failure from leaving a stale client pointing at the previous sender's token.

Sequence for `auth:select-sender`:

```
destroyApiClients()          // ensure clean slate
initApiClients(token)        // token read from store by handler
GET /api/accounts            // verify token
  success → setLastActiveSenderId(id), startPolling(), return { success: true, ... }
  failure → destroyApiClients(), return { success: false, error }
```

---

## 5. Polling

No changes to `electron/polling.ts`. Polling already reads `getAccountId()` from the store at each tick via `isReady()`, so it will use whatever account is currently active. The `startPolling()` / `stopPolling()` call sites move from the old `auth:login` / `auth:logout` handlers to the new `auth:add-sender` / `auth:select-sender` / `auth:logout` / `auth:delete-sender` (when active) handlers.

The `withAuth` helper in `handlers.ts` continues to call `getAccountId()` at request time. After a sender switch, the new `accountId` is in the store and `withAuth` picks it up automatically.

---

## 6. Auth Flow Changes

### 6.1 Restore on launch (auth:restore)

New sequence:
1. Call `readStore()` — migration runs here if needed.
2. Read `lastActiveSenderId`.
3. If null or profile not found → return `{ authenticated: false }`.
4. Retrieve profile's `encryptedToken` via `getSenderById`.
5. `initApiClients(token)`, `startPolling()`.
6. Return `{ authenticated: true, accountId, accountName, senderId }`.

No re-verification API call at startup (same as today's `auth:restore`). Token validity is only checked on explicit user-triggered activation.

### 6.2 Logout (auth:logout)

New sequence:
1. `stopPolling()`
2. `destroyApiClients()`
3. `setLastActiveSenderId(null)` — clears active session pointer; sender profiles remain.
4. Return `{ success: true }`.

The old `deleteToken()` call is removed; legacy cleanup is handled by migration.

### 6.3 Add sender (auth:add-sender)

1. Validate `displayName` (non-empty, ≤ 80 chars) and `token` (non-empty) — return error if invalid.
2. `destroyApiClients()` then `initApiClients(token)`.
3. `GET /api/accounts`.
4. Check if any existing sender already has the resolved `accountId` — if so return duplicate error.
5. Build `SenderProfile` with new UUID, save via `saveSender`.
6. `setLastActiveSenderId(newId)`.
7. `startPolling()`.
8. Return `{ success: true, senderId, accountId, accountName }`.
9. On any failure: `destroyApiClients()`, return `{ success: false, error }`.

### 6.4 Select sender (auth:select-sender)

1. Look up sender by id via `getSenderById` — return error if not found.
2. Decrypt and retrieve token.
3. `destroyApiClients()` then `initApiClients(token)`.
4. `GET /api/accounts` (verification).
5. `setLastActiveSenderId(id)`, `startPolling()`.
6. Return `{ success: true, accountId, accountName, senderId }`.
7. On failure: `destroyApiClients()`, return `{ success: false, error }`.

### 6.5 Delete sender (auth:delete-sender)

1. Look up sender by id — return `{ success: false, error }` if not found.
2. Check if `getLastActiveSenderId() === id`.
3. If active: `stopPolling()`, `destroyApiClients()`, `setLastActiveSenderId(null)`.
4. `deleteSender(id)`.
5. Return `{ success: true, wasActive: boolean }`.

---

## 7. Cache Considerations

All existing cache keys (`${domainId}_${timeRange}`, inbox summaries, messages, emails) remain unchanged. Cache is not sender-scoped in v1 (see ADR-003 in TECH_DECISIONS.md).

Consequence: when a user switches senders, they briefly see the previous sender's cached data before the new sender's data loads via polling. This is acceptable for v1 — the polling cycle for both sandbox (1 min) and sending (5 min) will refresh the display promptly.

Cache invalidation on sender switch is explicitly deferred to a future iteration and is not part of this work item.

---

## 8. Renderer Auth State

### 8.1 appStore changes

`AppState` gains two new fields: `senderId: string | null` and `senderDisplayName: string | null`. `setAuthenticated` is updated to accept `(accountId: number, accountName?: string, senderId?: string, senderDisplayName?: string)`. `setUnauthenticated` resets both to null.

`senderDisplayName` is the user-assigned label (e.g. "Work") used by `TitleBar.tsx` to show `Mailtrap - {senderDisplayName}` instead of the old `Mailtrap - @{accountName}`.

### 8.2 App.tsx routing

`App.tsx` currently renders `<TokenSetup />` when `!isAuthenticated`. This is replaced with a sub-router:

```
unauthenticated view:
  /add-sender  → <AddSender />
  /*           → <SenderList />
```

Both components sit inside the same `TitleBar` + `ErrorBoundary` shell as today's `TokenSetup`.

`SenderList` uses a local React state machine (idle → selecting | deleting → error state) rather than a Zustand store slice, because its state is ephemeral and not needed elsewhere.

`AddSender` likewise uses local form state (displayName, token, isLoading, error).

### 8.3 Settings logout

`Settings.tsx` `handleLogout` is unchanged — it calls `window.electron.logout()` then `setUnauthenticated()`. Because the unauthenticated view is now `SenderList`, the user automatically lands there.

---

## 9. Error Handling Strategy

| Scenario | Response |
|---|---|
| Token validation fails on `auth:add-sender` | Return `{ success: false, error: message }`; do not persist anything; destroy client |
| Token validation fails on `auth:select-sender` | Return `{ success: false, error: message }`; destroy client; sender remains in list |
| Sender not found on `auth:select-sender` | Return `{ success: false, error: 'Sender not found' }` |
| Duplicate `accountId` on `auth:add-sender` | Return `{ success: false, error: 'This account is already saved as "<displayName>"' }` |
| Store read/write error (disk full, permissions) | `readStore` falls back to defaults (existing behavior); errors logged to console |
| Network timeout on verification | Axios 15s timeout propagates as error message to renderer |
| App crash mid-write | `writeFileSync` is synchronous; partial writes are not possible at the Node.js level on all platforms where Electron runs (macOS / Windows / Linux with standard fs). Acceptable for v1. |

Errors are displayed inline on the relevant row or form field in the renderer, not as system dialogs.

---

## 10. File Change Summary

| File | Change type |
|---|---|
| `electron/api/types.ts` | Add `SenderProfile`, `SenderProfilePublic`, IPC payload types |
| `electron/store.ts` | Add migration, new sender CRUD functions; deprecate old token functions |
| `electron/ipc/handlers.ts` | Add 4 new handlers; update `auth:restore`, `auth:logout` |
| `electron/preload.ts` | Add `listSenders`, `addSender`, `selectSender`, `deleteSender` to `ElectronAPI` |
| `src/env.d.ts` | Automatically updated via `ElectronAPI` re-export (no direct change needed) |
| `src/stores/appStore.ts` | Add `senderId` field; update `setAuthenticated` signature |
| `src/App.tsx` | Swap `TokenSetup` for `SenderList`/`AddSender` sub-router |
| `src/components/auth/SenderList.tsx` | New file |
| `src/components/auth/AddSender.tsx` | New file |
| `src/components/auth/TokenSetup.tsx` | No change needed (can be removed or kept as dead code) |

Minor changes to: `electron/tray.ts` — add "Connected as: {displayName}" header item at the top of the tray menu using the new `getActiveSenderDisplayName()` store helper. `src/components/layout/TitleBar.tsx` — read `senderDisplayName` from appStore instead of `accountName`.

No changes to: `polling.ts`, `api/client.ts`, `api/sandbox.ts`, `api/stats.ts`.
