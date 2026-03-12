# User Stories: Add Sender Selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`

Stories are grouped by layer. Each story has an ID, a priority (P1 = must-have for the feature to ship, P2 = important but not blocking the first functional pass), and rough sizing notes for the scrum-master.

---

## Epic: Sender Profile Store

### US-01 — Extend the persistent store to hold a sender list
**As a** developer,
**I want** the JSON store to support a `senders` array and a `lastActiveSenderId` field,
**so that** the app can persist multiple sender profiles without breaking existing stored data.

**Priority:** P1
**Acceptance criteria:**
- `StoreData` interface gains `senders?: SenderProfile[]` and `lastActiveSenderId?: string`
- `SenderProfile` type defined: `{ id, displayName, encryptedToken, accountId, accountName, createdAt }`
- New store functions: `listSenders()`, `saveSender(profile)`, `deleteSender(id)`, `getLastActiveSenderId()`, `setLastActiveSenderId(id | null)`
- Existing token/accountId/accountName read/write functions remain unchanged (used by migration)

**Notes:** Pure back-end / store layer. No UI changes. ~S.

---

### US-02 — Migrate legacy single-sender store on first read
**As a** returning user with an existing installation,
**I want** my saved token and account info to be automatically converted to a sender profile,
**so that** I don't have to re-enter my credentials after the update.

**Priority:** P1
**Acceptance criteria:**
- On `readStore()`, if `encryptedToken` is present and `senders` is absent (or empty), a migration runs that creates one `SenderProfile` from the existing `encryptedToken` / `accountId` / `accountName`
- After migration, `lastActiveSenderId` is set to the new profile's id
- The legacy top-level `encryptedToken` / `accountId` / `accountName` fields are removed from the written store
- Migration is idempotent (running twice on the same data is safe)

**Notes:** Depends on US-01. ~S.

---

## Epic: IPC Layer

### US-03 — IPC handler: list senders
**As a** renderer component,
**I want** to call `window.electron.listSenders()` and receive a list of saved sender profiles (without tokens),
**so that** the Sender List screen can display them.

**Priority:** P1
**Acceptance criteria:**
- New IPC channel `auth:list-senders` registered in `handlers.ts`
- Returns `SenderProfilePublic[]` — all fields except `encryptedToken`
- Corresponding `listSenders()` method added to `ElectronAPI` in `preload.ts` and `env.d.ts`

**Notes:** Depends on US-01. ~XS.

---

### US-04 — IPC handler: add sender
**As a** renderer component,
**I want** to call `window.electron.addSender(displayName, token)` to save a new sender and start a session,
**so that** the Add Sender form can complete the whole flow in one call.

**Priority:** P1
**Acceptance criteria:**
- New IPC channel `auth:add-sender` registered
- Handler: initialise temp API client → call `GET /api/accounts` → on success save profile, set `lastActiveSenderId`, start polling → return `{ success: true, senderId, accountId, accountName }`
- On failure: destroy temp client, return `{ success: false, error: string }`
- If `accountId` already exists in `senders`, return `{ success: false, error: 'This account is already saved as "<displayName>"' }`
- Corresponding method in `ElectronAPI`

**Notes:** Depends on US-01, US-03. ~M.

---

### US-05 — IPC handler: select (activate) sender
**As a** renderer component,
**I want** to call `window.electron.selectSender(senderId)` to activate a saved sender,
**so that** the Sender List screen can start a session without re-entering the token.

**Priority:** P1
**Acceptance criteria:**
- New IPC channel `auth:select-sender` registered
- Handler: look up sender by id → initialise API client with stored token → call `GET /api/accounts` to verify → on success set `lastActiveSenderId`, start polling → return `{ success: true, accountId, accountName }`
- On failure: destroy client, return `{ success: false, error: string }`
- Corresponding method in `ElectronAPI`

**Notes:** Depends on US-01. ~M.

---

### US-06 — IPC handler: delete sender
**As a** renderer component,
**I want** to call `window.electron.deleteSender(senderId)` to permanently remove a sender,
**so that** the user can clean up stale credentials.

**Priority:** P1
**Acceptance criteria:**
- New IPC channel `auth:delete-sender` registered
- If the deleted sender is the currently active one (`lastActiveSenderId` matches), the handler also stops polling, destroys the API client, and clears `lastActiveSenderId`
- Sender profile (including encrypted token) is removed from the store
- Returns `{ success: true, wasActive: boolean }`
- Corresponding method in `ElectronAPI`

**Notes:** Depends on US-01. ~S.

---

### US-07 — Update auth:restore to use sender list
**As a** returning user,
**I want** the app to restore my last-active sender session on launch,
**so that** I don't have to re-select my sender every time I open the app.

**Priority:** P1
**Acceptance criteria:**
- `auth:restore` handler reads `lastActiveSenderId`, looks up the matching sender profile, initialises the API client, starts polling
- Returns `{ authenticated: true, accountId, accountName, senderId, senderDisplayName }` on success
- Returns `{ authenticated: false }` if no `lastActiveSenderId` or profile not found
- Legacy path (single token in store, migration not yet run) is handled by running migration first

**Notes:** Depends on US-02. ~S.

---

### US-08 — Update auth:logout to preserve sender list
**As a** logged-in user,
**I want** logging out to end my session but keep my saved senders,
**so that** I can quickly switch back without re-entering my token.

**Priority:** P1
**Acceptance criteria:**
- `auth:logout` handler stops polling, destroys API client, sets `lastActiveSenderId = null`
- Sender profiles remain in the store (not deleted)
- Returns `{ success: true }`
- Existing `deleteToken()` call is removed (legacy cleanup only); the store's `encryptedToken` top-level field, if any, is also cleared during migration (US-02)

**Notes:** Depends on US-07. ~XS.

---

## Epic: Renderer — Sender List Screen

### US-09 — Sender List screen component
**As a** user with no active session,
**I want** to see a list of my saved senders when the app opens,
**so that** I can quickly activate one or add a new one.

**Priority:** P1
**Acceptance criteria:**
- New component `src/components/auth/SenderList.tsx` replaces `TokenSetup` as the unauthenticated view in `App.tsx`
- Lists each sender as a row: display name, Mailtrap account name, and a delete icon
- Shows empty-state copy and an "Add sender" button when no senders exist
- "Add sender" button navigates to the Add Sender form (US-10)
- Tapping a sender row triggers `selectSender` (US-05) with a loading state on that row
- Inline error shown on the row if activation fails
- Follows MTUI design (same layout shell, spacing, and typography as `TokenSetup`)

**Notes:** Depends on US-03, US-05, US-06. ~L.

---

### US-10 — Add Sender form component
**As a** user,
**I want** to enter a display name and API token to save a new sender,
**so that** I can add new Mailtrap accounts to the app.

**Priority:** P1
**Acceptance criteria:**
- New component `src/components/auth/AddSender.tsx`
- Fields: display name (text, required), API token (password, required)
- "Connect" button calls `addSender` (US-04); shows loading state
- On success: session starts, app navigates to main view (same as today's `TokenSetup` success)
- On failure: inline error message
- "Cancel" / back action returns to the Sender List screen (US-09)
- Display name field is auto-focused; API token field follows

**Notes:** Depends on US-04. ~M.

---

### US-11 — Confirm delete sender
**As a** user,
**I want** a confirmation step before a sender is deleted,
**so that** I don't accidentally remove saved credentials.

**Priority:** P1
**Acceptance criteria:**
- Clicking the delete icon on a sender row shows an inline confirmation (e.g., the row transforms to show "Delete [name]?" with "Confirm" and "Cancel" buttons — no full modal required)
- Confirming calls `deleteSender` (US-06)
- If `wasActive` is true in the response, the renderer calls `setUnauthenticated()` and the Sender List refreshes (the deleted sender is gone)
- Cancelling restores the normal row view

**Notes:** Depends on US-09. ~S.

---

### US-12 — Update appStore to track active senderId
**As a** developer,
**I want** `appStore` to hold the active `senderId` alongside `accountId` and `accountName`,
**so that** components can reference which sender is active without querying the main process.

**Priority:** P2
**Acceptance criteria:**
- `AppState` gains `senderId: string | null` and `senderDisplayName: string | null`
- `setAuthenticated` updated to accept `(accountId, accountName, senderId, senderDisplayName)` — existing callers updated
- `setUnauthenticated` resets `senderId` and `senderDisplayName` to null

**Notes:** Small typing change; touches several call sites. ~S.

---

## Epic: Settings — Logout Update

### US-13 — Settings logout returns to Sender List
**As a** logged-in user,
**I want** "Log out" in Settings to take me to the Sender List screen (not the old single token form),
**so that** I can immediately select a different sender.

**Priority:** P1
**Acceptance criteria:**
- `Settings.tsx` `handleLogout` calls `window.electron.logout()` then `setUnauthenticated()` (unchanged logic)
- Because the unauthenticated view is now `SenderList` (US-09), this automatically works once US-09 is in place
- The Settings page still shows the active account name for context (uses `accountName` from `appStore`)

**Notes:** Likely zero code change once US-09 replaces `TokenSetup` in `App.tsx`. ~XS.

---

## Epic: Quality

### US-14 — TypeScript types for sender profiles
**As a** developer,
**I want** all new sender-related types defined and exported from `electron/api/types.ts`,
**so that** the codebase stays type-safe throughout.

**Priority:** P1
**Acceptance criteria:**
- `SenderProfile` interface exported (includes encrypted token — main-process only)
- `SenderProfilePublic` interface exported (omits encrypted token — safe to send to renderer)
- All new IPC payload types typed (no `unknown` in signatures where the shape is known)
- `npx tsc --noEmit` passes

**Notes:** Can be done early to unblock parallel work. ~XS.

---

### US-15 — Manual smoke test of the full sender flow
**As a** QA engineer,
**I want** a test checklist covering the critical paths,
**so that** the team can verify the feature before merging.

**Priority:** P2
**Acceptance criteria:** See test plan in the scrum board / manual-tester brief.

---

## Story Map Summary

| ID | Story | Priority | Size |
|---|---|---|---|
| US-01 | Extend store for sender list | P1 | S |
| US-02 | Migrate legacy store | P1 | S |
| US-03 | IPC: list senders | P1 | XS |
| US-04 | IPC: add sender | P1 | M |
| US-05 | IPC: select sender | P1 | M |
| US-06 | IPC: delete sender | P1 | S |
| US-07 | Update auth:restore | P1 | S |
| US-08 | Update auth:logout | P1 | XS |
| US-09 | Sender List screen | P1 | L |
| US-10 | Add Sender form | P1 | M |
| US-11 | Confirm delete sender | P1 | S |
| US-12 | appStore senderId field | P2 | S |
| US-13 | Settings logout wiring | P1 | XS |
| US-14 | TypeScript types | P1 | XS |
| US-15 | Smoke test checklist | P2 | S |

**Suggested implementation order:**
US-14 → US-01 → US-02 → US-03 → US-04 → US-05 → US-06 → US-07 → US-08 → US-12 → US-09 → US-10 → US-11 → US-13 → US-15
