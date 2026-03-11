# CHECKPOINT: add-sender-selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`
**Last updated:** 2026-03-11

---

## Current Phase

**Phase 5 — Build**

---

## Phase Completion Status

| # | Phase | Status |
|---|---|---|
| 1 | Discovery | complete |
| 2 | Requirements | complete |
| 3 | Architecture | complete |
| 4 | Planning (User Stories) | complete |
| 5 | Build | in-progress |
| 6 | Code Review | pending |
| 7 | Integration + Manual Testing | pending |
| 8 | Merge | pending |

---

## User Stories

| ID | Title | Priority | Size | Assignee | Status |
|---|---|---|---|---|---|
| US-14 | TypeScript types for sender profiles | P1 | XS | main-process-dev | pending |
| US-01 | Extend store for sender list | P1 | S | main-process-dev | pending |
| US-02 | Migrate legacy single-sender store | P1 | S | main-process-dev | pending |
| US-03 | IPC handler: list senders | P1 | XS | main-process-dev | pending |
| US-04 | IPC handler: add sender | P1 | M | main-process-dev | pending |
| US-05 | IPC handler: select sender | P1 | M | main-process-dev | pending |
| US-06 | IPC handler: delete sender | P1 | S | main-process-dev | pending |
| US-07 | Update auth:restore to use sender list | P1 | S | main-process-dev | pending |
| US-08 | Update auth:logout to preserve sender list | P1 | XS | main-process-dev | pending |
| US-09 | Sender List screen component | P1 | L | renderer-dev-1 | pending |
| US-10 | Add Sender form component | P1 | M | renderer-dev-2 | pending |
| US-11 | Confirm delete sender | P1 | S | renderer-dev-1 | pending |
| US-12 | Update appStore to track active senderId | P2 | S | renderer-dev-1 | pending |
| US-13 | Settings logout returns to Sender List | P1 | XS | renderer-dev-2 | pending |
| US-15 | Manual smoke test of the full sender flow | P2 | S | qa-engineer | pending |

---

## Additional Tasks

| Task | Assignee | Depends on | Status |
|---|---|---|---|
| Add "Connected as: {displayName}" to tray menu | main-process-dev | US-01 | pending |
| Update TitleBar to read senderDisplayName from appStore | renderer-dev-1 | US-12 | pending |

---

## Task Assignments Summary

### main-process-dev
Owns `electron/` — all main-process files.

- US-14: Add `SenderProfile`, `SenderProfilePublic`, and IPC payload types to `electron/api/types.ts`
- US-01: Extend `electron/store.ts` with sender CRUD functions and updated `StoreData` interface
- US-02: Add `migrateIfNeeded()` to `electron/store.ts`
- US-03: Register `auth:list-senders` handler in `electron/ipc/handlers.ts`; add `listSenders()` to `electron/preload.ts`
- US-04: Register `auth:add-sender` handler; add `addSender()` to preload
- US-05: Register `auth:select-sender` handler; add `selectSender()` to preload
- US-06: Register `auth:delete-sender` handler; add `deleteSender()` to preload
- US-07: Update `auth:restore` handler in `electron/ipc/handlers.ts`
- US-08: Update `auth:logout` handler in `electron/ipc/handlers.ts`
- Tray update: Add "Connected as: {displayName}" to `electron/tray.ts` using `getActiveSenderDisplayName()` store helper

### renderer-dev-1
Owns `src/` — React components and stores.

- US-12: Add `senderId` field and update `setAuthenticated` in `src/stores/appStore.ts`
- US-09: Create `src/components/auth/SenderList.tsx`; update `src/App.tsx` routing
- US-11: Add inline delete confirmation to `SenderList.tsx`
- TitleBar: Update `src/components/layout/TitleBar.tsx` to read `senderDisplayName` from appStore

### renderer-dev-2
Owns `src/` — React components.

- US-10: Create `src/components/auth/AddSender.tsx`
- US-13: Verify `src/components/settings/Settings.tsx` `handleLogout` works with new SenderList routing (zero or minimal code change)

### qa-engineer

- US-15: Write and execute manual smoke test checklist covering critical sender flow paths

---

## File Ownership Map

| File | Owner |
|---|---|
| `electron/api/types.ts` | main-process-dev |
| `electron/store.ts` | main-process-dev |
| `electron/ipc/handlers.ts` | main-process-dev |
| `electron/preload.ts` | main-process-dev |
| `electron/tray.ts` | main-process-dev |
| `src/stores/appStore.ts` | renderer-dev-1 |
| `src/App.tsx` | renderer-dev-1 |
| `src/components/auth/SenderList.tsx` | renderer-dev-1 |
| `src/components/auth/AddSender.tsx` | renderer-dev-2 |
| `src/components/layout/TitleBar.tsx` | renderer-dev-1 |
| `src/components/settings/Settings.tsx` | renderer-dev-2 |

---

## Key Dependencies

```
US-14 (types)
  └── US-01 (store schema + CRUD)
        ├── US-02 (migration)
        ├── US-03 (IPC: list)
        │     └── US-09 (SenderList component)
        │           ├── US-11 (delete confirm)
        │           └── US-13 (settings logout)
        ├── US-04 (IPC: add sender)
        │     └── US-10 (AddSender component)
        ├── US-05 (IPC: select sender)
        │     └── US-09 (SenderList component)
        ├── US-06 (IPC: delete sender)
        │     └── US-09 (SenderList component)
        └── US-02 (migration)
              └── US-07 (auth:restore update)
                    └── US-08 (auth:logout update)

US-12 (appStore senderId) — parallel, feeds US-09 and TitleBar
```

---

## Resume Instructions

To resume work on this feature:

1. Check out branch: `git checkout port587`
2. Verify current story status in this file against code state
3. Start with the first `pending` story in the implementation order: US-14 → US-01 → US-02 → US-03 → US-04 → US-05 → US-06 → US-07 → US-08 → US-12 → US-09 → US-10 → US-11 → US-13 → US-15
4. Main-process-dev stories (US-14 through US-08, tray) must reach `done` before renderer-dev stories (US-09, US-10, US-11) can be completed
5. US-12 (appStore) can be done in parallel with US-03 through US-08 as it only touches `src/`

---

## Reference Docs

- `docs/agents/senders/add-sender-selection/BRIEF.md`
- `docs/agents/senders/add-sender-selection/REQUIREMENTS.md`
- `docs/agents/senders/add-sender-selection/USER_STORIES.md`
- `docs/agents/senders/add-sender-selection/ARCHITECTURE.md`
- `docs/agents/senders/add-sender-selection/IPC_SPEC.md`
- `docs/agents/senders/add-sender-selection/TYPES_SPEC.md`
- `docs/agents/senders/add-sender-selection/UX-DESIGN.md`
