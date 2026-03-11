# Requirements: Add Sender Selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`

---

## Functional Requirements

### FR-1: Sender Profile Management

**FR-1.1** The app shall maintain a persistent list of sender profiles. Each profile contains:
- A locally-generated unique `id` (e.g., UUID or timestamp-based)
- A user-provided `displayName` (string, 1–80 characters)
- An encrypted API token (same encryption as today's single token)
- The Mailtrap `accountId` (number, resolved at add-time)
- The Mailtrap `accountName` (string, resolved at add-time)
- A `createdAt` ISO timestamp

**FR-1.2** The store shall support up to a reasonable number of sender profiles (no hard cap required; no UI pagination needed for v1).

**FR-1.3** Sender profiles shall persist across app restarts.

**FR-1.4** If the existing store has a `encryptedToken` / `accountId` / `accountName` (legacy single-sender format), the app shall automatically migrate it to a single sender profile on first read, using `accountName` as the display name (fallback: "My account").

---

### FR-2: Sender List Screen

**FR-2.1** When no sender session is active, the app shall display the Sender List screen (replaces the current `TokenSetup` single-form view).

**FR-2.2** The Sender List screen shall show:
- Each saved sender as a tappable row displaying: display name, Mailtrap account name, and a delete action
- An "Add sender" button (or equivalent affordance)
- An empty state message when no senders are saved

**FR-2.3** Tapping a sender row shall activate that sender: the app shall re-initialise the API client with the stored token, verify the token is still valid (a lightweight API call, e.g., `GET /api/accounts`), start polling, and navigate to the main app view.

**FR-2.4** If token verification fails when activating a sender (revoked token or network error), the error shall be shown inline on the sender row; the user remains on the Sender List screen.

**FR-2.5** The Sender List screen shall be shown on top of the TitleBar / standard app shell (same layout as the current `TokenSetup`).

---

### FR-3: Add Sender Flow

**FR-3.1** The "Add sender" action shall open an Add Sender form containing:
- A text field for the display name (pre-filled with a placeholder, required)
- A password field for the API token (required)
- A "Connect" / "Save" button
- A "Cancel" / back action

**FR-3.2** On submission the app shall:
1. Validate that both fields are non-empty.
2. Initialise a temporary API client with the provided token.
3. Call `GET /api/accounts` to validate the token and resolve `accountId` / `accountName`.
4. On success: save the sender profile to the store, set it as the active session, start polling, navigate to the main app view.
5. On failure: display the error message inline; do not save anything.

**FR-3.3** If the user provides a token that already belongs to an existing saved sender (matched by `accountId`), the app shall inform the user rather than creating a duplicate entry.

---

### FR-4: Session Management

**FR-4.1** Only one sender session shall be active at a time.

**FR-4.2** The store shall record a `lastActiveSenderId` (string) pointing to the last sender profile that was successfully activated.

**FR-4.3** On app launch, `auth:restore` shall attempt to restore the session for the sender identified by `lastActiveSenderId`. If the profile is found and its token exists, the API client is initialised and polling starts (same behaviour as today, no re-verification at startup required).

**FR-4.4** The active sender's `accountId` and `accountName` shall be available in the renderer via `appStore` (as today).

---

### FR-5: Logout / Switch

**FR-5.1** The "Log out" action in Settings shall:
1. Stop all polling.
2. Destroy the API client.
3. Clear `lastActiveSenderId` from the store (so the app does not auto-restore on next launch).
4. Leave all sender profiles intact in the store.
5. Navigate the renderer to the Sender List screen.

**FR-5.2** To switch senders the user must log out first, then select or add a different sender.

---

### FR-6: Delete Sender

**FR-6.1** Each sender in the Sender List shall have a delete affordance (e.g., a trash/remove icon).

**FR-6.2** Deleting a sender shall require confirmation (a simple inline confirm or a modal prompt).

**FR-6.3** If the deleted sender is currently active, the app shall also log out (stop polling, destroy API client, clear `lastActiveSenderId`) and return to the Sender List screen.

**FR-6.4** The deleted sender's encrypted token shall be removed from disk.

---

### FR-7: IPC Bridge Extensions

The following new IPC channels shall be added (with corresponding `ElectronAPI` methods in `preload.ts`):

| Channel | Direction | Description |
|---|---|---|
| `auth:list-senders` | main → renderer | Returns `SenderProfile[]` (without the encrypted token) |
| `auth:add-sender` | renderer → main | `(displayName, token)` → `{ success, senderId?, error? }` |
| `auth:select-sender` | renderer → main | `(senderId)` → `{ success, accountId?, accountName?, error? }` |
| `auth:delete-sender` | renderer → main | `(senderId)` → `{ success }` |

The existing channels (`auth:login`, `auth:logout`, `auth:restore`, `auth:get-token`) shall remain for backwards compatibility during the transition, but `auth:login` may be superseded by `auth:add-sender` in the renderer.

---

## Non-Functional Requirements

### NFR-1: Performance
- Activating a saved sender (select from list) shall complete the API validation call and begin rendering the main app within 3 seconds on a normal connection.
- The sender list shall render instantly from the store (no network call required to display the list).

### NFR-2: Security
- Sender tokens shall be stored with the same encryption strategy as today (`safeStorage.encryptString` when available, base64 fallback).
- Tokens shall never be returned to the renderer over IPC — only `displayName`, `accountId`, `accountName`, and the opaque `senderId` are exposed.
- Deleting a sender profile shall immediately overwrite / remove the encrypted token from the JSON store file.

### NFR-3: Data Integrity
- The store migration from the legacy single-sender format must be idempotent: running it twice produces the same result.
- No sender profile data shall be lost on app crash mid-write (the existing write-store pattern using synchronous `writeFileSync` is acceptable for v1).
- Cache data (inbox summaries, sending stats, etc.) is stored globally today; no change is required for v1 — cache is implicitly scoped to whatever sender is active.

### NFR-4: UX / Responsiveness
- The Sender List screen and Add Sender form shall follow the existing MTUI design language (Tailwind tokens, same layout shell as `TokenSetup`).
- Loading/error states shall be shown inline (no full-screen spinners except during initial auth restore).
- The empty state on the Sender List screen shall include a clear call to action.

### NFR-5: Type Safety
- All new types (e.g., `SenderProfile`, new IPC payloads) shall be defined in `electron/api/types.ts` or a dedicated `electron/api/senders.ts`.
- No use of `any` in new code without a documented reason.
- `npx tsc --noEmit` must pass on the completed branch.

---

## Constraints

- **Single active session only** — no concurrent multi-sender polling in this iteration.
- **No new dependencies** — the feature must be built with existing packages (Electron safeStorage, Axios, Zustand, React, Tailwind).
- **Backwards compatibility** — existing `mailtrap-store.json` files must be auto-migrated without user intervention.
- **Settings are global** — `AppSettings` (polling intervals, theme, etc.) remain shared across all senders; per-sender settings are out of scope.
- **Cache is not sender-scoped** — inbox/sending caches remain keyed as today; cache from a previous sender may briefly appear before the new sender's data loads (acceptable for v1).
