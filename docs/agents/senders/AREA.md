# Area: Senders

**Area path:** `docs/agents/senders/`
**Scope:** Everything related to how the app stores, manages, and activates Mailtrap account credentials (sender profiles).

---

## What this area owns

| Layer | Files |
|---|---|
| Store | `electron/store.ts` — SenderProfile persistence, migration, lastActiveSenderId |
| Types | `electron/api/types.ts` — SenderProfile, SenderProfilePublic, IPC payload types |
| IPC handlers | `electron/ipc/handlers.ts` — auth:list-senders, auth:add-sender, auth:select-sender, auth:delete-sender, auth:restore (updated), auth:logout (updated) |
| IPC bridge | `electron/preload.ts` — ElectronAPI additions |
| API client lifecycle | `electron/api/client.ts` — init/destroy tied to sender activation |
| Renderer state | `src/stores/appStore.ts` — senderId field |
| Renderer UI | `src/components/auth/SenderList.tsx`, `src/components/auth/AddSender.tsx` |
| App routing | `src/App.tsx` — unauthenticated view swap |

---

## Work items

| Item | Status | Docs |
|---|---|---|
| add-sender-selection | In progress | [BRIEF](add-sender-selection/BRIEF.md) · [REQUIREMENTS](add-sender-selection/REQUIREMENTS.md) · [USER_STORIES](add-sender-selection/USER_STORIES.md) · [ARCHITECTURE](add-sender-selection/ARCHITECTURE.md) · [IPC_SPEC](add-sender-selection/IPC_SPEC.md) · [TYPES_SPEC](add-sender-selection/TYPES_SPEC.md) |

---

## Architecture invariants for this area

1. **Token isolation.** Encrypted tokens are stored only in the main-process JSON store. No IPC channel ever sends a raw or encrypted token to the renderer. The renderer receives only `SenderProfilePublic` (id, displayName, accountId, accountName, createdAt).

2. **Single active session.** Only one sender is active at a time. The API client (`electron/api/client.ts`) holds exactly one Axios instance; activating a new sender always destroys the previous instance before creating a new one.

3. **Store migration is idempotent.** The legacy-to-multi-sender migration (top-level `encryptedToken` → `senders[]`) runs at store read time and is a no-op if the store is already in the new format.

4. **Polling is session-scoped.** `startPolling()` / `stopPolling()` are called on sender activation / deactivation. Polling reads `getAccountId()` at each tick; it never caches the account ID in module state.

5. **Cache is not sender-scoped (v1).** All cache entries (inbox summaries, sending stats, etc.) are keyed the same way regardless of which sender is active. Stale cache from a previous sender may briefly appear; this is accepted for v1.

6. **Settings are global.** `AppSettings` (polling intervals, theme, defaultView, feature flags) are shared across all senders. Per-sender settings are out of scope.
