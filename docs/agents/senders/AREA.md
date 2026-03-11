# Area: Senders

**Area path:** `docs/agents/senders/`
**Scope:** Everything related to how the app stores, manages, and activates Mailtrap account credentials (sender profiles).

---

## What this area owns

| Layer | Files |
|---|---|
| Store | `electron/store.ts` — SenderProfile persistence, migration, lastActiveSenderId, clearAllCaches |
| Types | `electron/api/types.ts` — SenderProfile, SenderProfilePublic, AddSenderResult, SelectSenderResult, DeleteSenderResult, RestoreAuthResult |
| IPC handlers | `electron/ipc/handlers.ts` — auth:list-senders, auth:add-sender, auth:select-sender, auth:delete-sender, auth:restore (updated), auth:logout (updated) |
| IPC bridge | `electron/preload.ts` — listSenders, addSender, selectSender, deleteSender, restoreAuth |
| API client lifecycle | `electron/api/client.ts` — init/destroy tied to sender activation |
| Tray | `electron/tray.ts` — "Connected as: {displayName}" label from getActiveSenderDisplayName() |
| Renderer state | `src/stores/appStore.ts` — senderId, senderDisplayName fields; setAuthenticated signature updated |
| Renderer UI | `src/components/auth/SenderList.tsx`, `src/components/auth/AddSender.tsx` |
| App routing | `src/App.tsx` — unauthenticated view is now a local state machine (list | add), no longer a single TokenSetup |
| TitleBar | `src/components/layout/TitleBar.tsx` — shows "Mailtrap - {senderDisplayName}" when authenticated |
| Settings | `src/components/settings/Settings.tsx` — logout description updated to "Log out and return to the sender list" |

---

## Key Files

| File | Description |
|---|---|
| `electron/api/types.ts` | `SenderProfile` (full, with encryptedToken), `SenderProfilePublic` (token stripped), plus `AddSenderResult`, `SelectSenderResult`, `DeleteSenderResult`, `RestoreAuthResult` union types |
| `electron/store.ts` | `listSenders`, `saveSender`, `deleteSender`, `getSenderById`, `getLastActiveSenderId`, `setLastActiveSenderId`, `getActiveSenderDisplayName`, `clearAllCaches`, `migrateIfNeeded` (runs inside readStore) |
| `electron/ipc/handlers.ts` | Five sender IPC handlers + `withAuth` helper that resolves accountId from the active sender profile. `auth:logout` now clears lastActiveSenderId and all caches. `auth:restore` looks up lastActiveSenderId then the profile by ID. |
| `electron/preload.ts` | `ElectronAPI` extended with `listSenders`, `addSender`, `selectSender`, `deleteSender`, `restoreAuth` |
| `electron/tray.ts` | Imports `getActiveSenderDisplayName` from store; prepends "Connected as: {displayName}" separator group to tray menu when a sender is active |
| `src/stores/appStore.ts` | `AppState` now has `senderId: string | null` and `senderDisplayName: string | null`; `setAuthenticated` accepts optional third and fourth args |
| `src/components/auth/SenderList.tsx` | Sender list screen: empty state (Mailtrap logo + "No senders yet"), populated state (avatar rows with inline Connect + Delete), per-row loading and error states, inline delete confirmation |
| `src/components/auth/AddSender.tsx` | Add sender form: display name (80-char max, autofocus) + API token (password input), client-side validation, IPC call, inline error display |
| `src/App.tsx` | Unauthenticated branch uses `authView` local state (`'list' | 'add'`). `restoreAuth` now passes `senderId` and `senderDisplayName` into `setAuthenticated`. |
| `src/components/layout/TitleBar.tsx` | Reads `senderDisplayName` from appStore; title is "Mailtrap - {name}" when set, "Mailtrap" otherwise |
| `src/components/settings/Settings.tsx` | Logout description changed to "Log out and return to the sender list"; no structural changes needed — `setUnauthenticated()` lands on SenderList automatically |

---

## Work items

| Item | Status | Docs |
|---|---|---|
| add-sender-selection | Complete | [BRIEF](add-sender-selection/BRIEF.md) · [REQUIREMENTS](add-sender-selection/REQUIREMENTS.md) · [USER_STORIES](add-sender-selection/USER_STORIES.md) · [ARCHITECTURE](add-sender-selection/ARCHITECTURE.md) · [IPC_SPEC](add-sender-selection/IPC_SPEC.md) · [TYPES_SPEC](add-sender-selection/TYPES_SPEC.md) |

---

## Architecture invariants for this area

1. **Token isolation.** Encrypted tokens are stored only in the main-process JSON store. No IPC channel ever sends a raw or encrypted token to the renderer. The renderer receives only `SenderProfilePublic` (id, displayName, accountId, accountName, createdAt).

2. **Single active session.** Only one sender is active at a time. The API client (`electron/api/client.ts`) holds exactly one Axios instance; activating a new sender always destroys the previous instance before creating a new one.

3. **Store migration is idempotent.** The legacy-to-multi-sender migration (top-level `encryptedToken` → `senders[]`) runs at store read time inside `migrateIfNeeded()` and is a no-op if the store is already in the new format.

4. **Polling is session-scoped.** `startPolling()` / `stopPolling()` are called on sender activation / deactivation. Polling reads `getAccountId()` at each tick; it never caches the account ID in module state.

5. **Cache is cleared on sender switch.** `clearAllCaches()` is called by both `auth:add-sender` and `auth:select-sender` before activating the new session, preventing stale data from the previous sender from appearing.

6. **Settings are global.** `AppSettings` (polling intervals, theme, defaultView, feature flags) are shared across all senders. Per-sender settings are out of scope.

7. **add-sender validates with a temporary Axios client.** `auth:add-sender` creates a short-lived `axios.create()` instance to validate the token against the API without touching the current active session. Only after successful validation does it destroy the old session and activate the new one.

---

## History

| Date | Event |
|---|---|
| 2026-03-11 | `add-sender-selection` feature built and tested on branch `port587`. Multi-sender support added end-to-end: store schema migrated, 5 IPC handlers added, SenderList and AddSender components created, TitleBar and Settings updated, tray shows active sender name. 24 tests pass, 5 blocked (require live Electron process). |
