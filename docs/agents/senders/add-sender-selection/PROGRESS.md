# PROGRESS: add-sender-selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`
**Last updated:** 2026-03-11

---

## Sprint Board

### Done

_Nothing merged yet._

---

### In Progress

_Build phase begins. No stories started yet._

---

### To Do

| ID | Story | Priority | Size | Assignee |
|---|---|---|---|---|
| US-14 | TypeScript types for sender profiles | P1 | XS | main-process-dev |
| US-01 | Extend store for sender list | P1 | S | main-process-dev |
| US-02 | Migrate legacy single-sender store | P1 | S | main-process-dev |
| US-03 | IPC handler: list senders | P1 | XS | main-process-dev |
| US-04 | IPC handler: add sender | P1 | M | main-process-dev |
| US-05 | IPC handler: select sender | P1 | M | main-process-dev |
| US-06 | IPC handler: delete sender | P1 | S | main-process-dev |
| US-07 | Update auth:restore to use sender list | P1 | S | main-process-dev |
| US-08 | Update auth:logout to preserve sender list | P1 | XS | main-process-dev |
| Tray | Add "Connected as: {displayName}" to tray | P1 | XS | main-process-dev |
| US-12 | Update appStore to track active senderId | P2 | S | renderer-dev-1 |
| US-09 | Sender List screen component | P1 | L | renderer-dev-1 |
| US-10 | Add Sender form component | P1 | M | renderer-dev-2 |
| US-11 | Confirm delete sender | P1 | S | renderer-dev-1 |
| US-13 | Settings logout returns to Sender List | P1 | XS | renderer-dev-2 |
| US-15 | Manual smoke test checklist | P2 | S | qa-engineer |

---

## Story Dependencies

```
US-14 (types — electron/api/types.ts)
  |
  v
US-01 (store: schema + CRUD functions)
  |
  +---> US-02 (migration: migrateIfNeeded)
  |       |
  |       v
  |     US-07 (auth:restore update)
  |       |
  |       v
  |     US-08 (auth:logout update)
  |
  +---> US-03 (IPC: list senders + preload)
  |       |
  |       v
  |     US-09 (SenderList component) <----+
  |       |                               |
  |       v                               |
  |     US-11 (delete confirm)            |
  |       |                               |
  |       v                               |
  |     US-13 (settings logout wiring)    |
  |                                       |
  +---> US-04 (IPC: add sender + preload) |
  |       |                               |
  |       v                               |
  |     US-10 (AddSender component)       |
  |                                       |
  +---> US-05 (IPC: select sender) -------+
  |
  +---> US-06 (IPC: delete sender) -------> US-09

US-12 (appStore senderId) — no main-process dependency
  |
  +---> US-09 (SenderList, needs senderId in store)
  +---> TitleBar update

US-15 (smoke tests) — depends on all stories being done
```

---

## Implementation Waves

### Wave 1 — Main Process (main-process-dev)

Goal: all `electron/` files updated, type-safe, `npx tsc --noEmit` passes.

Implementation order within wave:

1. **US-14** — Add types to `electron/api/types.ts`
   - `SenderProfile` interface
   - `SenderProfilePublic` interface
   - All new IPC request/response payload types

2. **US-01** — Extend `electron/store.ts`
   - Update `StoreData` interface (add `senders?`, `lastActiveSenderId?`; deprecate legacy fields)
   - Add: `listSenders`, `saveSender`, `deleteSender`, `getSenderById`, `getLastActiveSenderId`, `setLastActiveSenderId`

3. **US-02** — Add `migrateIfNeeded` to `electron/store.ts`
   - Runs inside `readStore()` after JSON parse
   - Converts legacy `encryptedToken` / `accountId` / `accountName` to first `SenderProfile`
   - Idempotent

4. **US-03** — Register `auth:list-senders` in `electron/ipc/handlers.ts`; extend `electron/preload.ts`

5. **US-04** — Register `auth:add-sender` handler

6. **US-05** — Register `auth:select-sender` handler

7. **US-06** — Register `auth:delete-sender` handler

8. **US-07** — Update `auth:restore` handler to use `lastActiveSenderId` + sender lookup

9. **US-08** — Update `auth:logout` to clear `lastActiveSenderId`, keep sender profiles

10. **Tray** — Add "Connected as: {displayName}" item to `electron/tray.ts`

Wave 1 exit criterion: `npx tsc --noEmit` passes; all IPC channels registered and returning correct shapes.

---

### Wave 2 — Renderer (renderer-dev-1 + renderer-dev-2 in parallel)

Goal: all `src/` files updated; UI matches UX design; app navigates correctly between SenderList and AddSender.

**renderer-dev-1 tasks:**

1. **US-12** — Update `src/stores/appStore.ts`
   - Add `senderId: string | null` (and `senderDisplayName: string | null` per architecture)
   - Update `setAuthenticated` signature; update all existing callers

2. **US-09** — Create `src/components/auth/SenderList.tsx`
   - Update `src/App.tsx`: replace `<TokenSetup />` with sub-router (`/add-sender` → AddSender, `/*` → SenderList)
   - Sender rows with display name, account name, delete icon
   - Empty-state with "Add sender" button
   - Row-level loading state on activation
   - Inline error on activation failure

3. **US-11** — Add inline delete confirmation to `SenderList.tsx`
   - Row transforms to show "Delete [name]?" with Confirm/Cancel
   - On confirm: call `deleteSender`; if `wasActive` → call `setUnauthenticated()`

4. **TitleBar** — Update `src/components/layout/TitleBar.tsx` to use `senderDisplayName` from appStore

**renderer-dev-2 tasks (can start once US-12 is done and IPC handlers from Wave 1 exist):**

1. **US-10** — Create `src/components/auth/AddSender.tsx`
   - Fields: display name (auto-focused), API token
   - Connect button with loading state
   - Inline error display
   - Cancel returns to SenderList

2. **US-13** — Verify `src/components/settings/Settings.tsx` `handleLogout` requires no changes
   - Confirm logout lands on SenderList automatically
   - Update if needed

Wave 2 exit criterion: app runs end-to-end; can add, select, delete senders; logout lands on SenderList.

---

### Wave 3 — Review

Goal: catch regressions, type errors, and style issues before integration testing.

| Task | Assignee |
|---|---|
| Code review of Wave 1 (all `electron/` changes) | code-reviewer |
| Code review of Wave 2 (all `src/` changes) | code-reviewer |
| Performance review (IPC call count, polling correctness on sender switch) | performance-engineer |

Wave 3 exit criterion: all review comments resolved; `npx tsc --noEmit` passes; no open blocking comments.

---

### Wave 4 — Integration + Manual Testing

Goal: verify full end-to-end flows on a real build.

**US-15 — Smoke test checklist** (qa-engineer + manual-tester)

Critical paths to cover:

| # | Scenario | Expected |
|---|---|---|
| 1 | Fresh install — no senders | SenderList shows empty state with "Add sender" |
| 2 | Add sender with valid token | Session starts; main view loads; sender appears in tray |
| 3 | Add sender with invalid token | Inline error shown; no profile saved |
| 4 | Add duplicate account (same accountId) | Inline error: "This account is already saved as..." |
| 5 | App restart — last sender auto-restored | Main view loads without re-selecting |
| 6 | App restart — no last active sender | SenderList shown |
| 7 | Select a different saved sender | Session switches; tray updates to new display name |
| 8 | Select sender with revoked token | Inline error on that row; sender remains in list |
| 9 | Delete inactive sender | Sender removed from list; session unaffected |
| 10 | Delete active sender | Session ends; SenderList shown; deleted sender gone |
| 11 | Delete sender — cancel | Row returns to normal; no deletion |
| 12 | Legacy install migration | Existing token becomes first sender; session resumes |
| 13 | Log out via Settings | SenderList shown; saved senders still present |
| 14 | Add second sender after logout | Both senders visible in SenderList |
| 15 | TitleBar shows senderDisplayName | Title reads "Mailtrap - {displayName}" not account handle |

Wave 4 exit criterion: all 15 smoke test scenarios pass; no P1 bugs open.

---

## Overall Status

| Wave | Description | Status |
|---|---|---|
| Wave 1 | Main process (types → store → migration → IPC handlers → preload → tray) | pending |
| Wave 2 | Renderer (appStore → SenderList → AddSender → delete confirm → settings) | pending |
| Wave 3 | Code review + performance review | pending |
| Wave 4 | Integration + manual testing | pending |
