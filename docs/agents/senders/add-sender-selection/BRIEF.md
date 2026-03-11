# Brief: Add Sender Selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`
**Date:** 2026-03-11

---

## Goals

Convert Mailtrap Desktop from a single-account app into an app that supports multiple named "senders" (Mailtrap accounts). On the login screen the user picks which sender they want to connect to, enters the corresponding API token, and sees that sender's data. Only one sender is active at a time; switching requires logging out first.

A "sender" in this context is a named Mailtrap account. Each Mailtrap API token is scoped to one account; calling `GET /api/accounts` with a valid token returns the accounts accessible by that token (currently always one per token in practice). The sender concept in the app is just an alias the user gives to a saved set of credentials so they can switch between multiple accounts without re-entering tokens each time.

---

## Scope

### In scope
- **Sender list screen** — shown instead of the bare token form when no session is active; lists previously-saved senders and an "Add sender" action
- **Add sender flow** — user assigns a display name, enters an API token; on success the credentials are saved and the sender becomes active
- **Sender selection** — user picks an existing sender from the list and connects immediately (token already saved)
- **Single active session** — only one sender is active at a time; to use a different sender the user logs out first
- **Logout / switch** — logout from Settings clears the active session but keeps the saved sender list; the user returns to the sender selection screen
- **Delete sender** — user can remove a saved sender from the list (with confirmation)
- **Store migration** — extend the persistent JSON store to hold a list of sender profiles alongside the existing single-session fields; preserve backwards compatibility with existing stored tokens
- **IPC layer** — new IPC channels for listing, saving, and deleting sender profiles; updated auth restore to account for multi-sender store

### Out of scope
- Simultaneous multi-sender sessions (concurrent polling for multiple accounts)
- OAuth / browser-based login
- Sharing sender profiles between OS users
- Cloud sync of sender profiles
- Per-sender settings (all senders share the same `AppSettings` for now)

---

## Acceptance Criteria

1. On first launch (no saved data), the app shows a "no senders yet" empty state with an "Add sender" button.
2. The user can add a sender: enter a name and an API token. On successful authentication the sender is saved, the session starts, and the main app view loads.
3. On subsequent launches, the sender list screen shows all saved senders. The user taps one to activate it without re-entering the token.
4. The Settings page "Log out" button ends the active session and navigates to the sender list screen; the saved sender list is preserved.
5. The user can delete a saved sender from the sender list (with a confirmation step). Deleting the active sender also logs out.
6. If a saved sender's token has been revoked since it was saved, tapping it shows an error inline and does not crash; the sender remains in the list so the user can update or delete it.
7. The app correctly restores the last-active sender session on relaunch (existing `auth:restore` behavior preserved for single-sender experience).
8. The existing store file is migrated without data loss: a store that currently has `encryptedToken` / `accountId` / `accountName` is automatically converted to a single-entry sender list on first read.
9. TypeScript compiles with no errors (`npx tsc --noEmit` clean).
10. The tray menu and polling continue to work correctly for the active sender.

---

## Current State Summary

### Auth flow (as-is)
1. App launches; `App.tsx` calls `window.electron.restoreAuth()`.
2. Main process (`handlers.ts: auth:restore`) reads the single `encryptedToken` + `accountId` + `accountName` from the JSON store. If present, it initialises the Axios client and starts polling; returns `{ authenticated: true, accountId, accountName }`.
3. If no token, renderer shows `TokenSetup` — a simple form with a single password input.
4. On submit, renderer calls `window.electron.login(token)`. Main process calls `GET /api/accounts`, saves token + accountId + accountName, starts polling, returns `{ success: true, accountId, accountName }`.
5. Logout: renderer calls `window.electron.logout()`. Main process stops polling, deletes token/accountId/accountName from store, destroys the Axios client.

### Store structure (as-is)
Single file `mailtrap-store.json` in Electron `userData`. Relevant auth fields:
- `encryptedToken` — base64-encoded (safeStorage-encrypted if available)
- `accountId` — number
- `accountName` — string

### API client (as-is)
`electron/api/client.ts` holds a single module-level `apiClient` (axios instance). `initApiClients(token)` creates it; `destroyApiClients()` nulls it. Token is embedded in the `Authorization: Bearer` header at init time.

### What "accounts" means in the Mailtrap API
`GET /api/accounts` returns an array of `{ id, name, access_levels }` objects for the authenticated token. In practice this is usually one entry. The `accountId` is used as a path parameter throughout all sandbox and stats API calls (`/api/accounts/{accountId}/...`).

### What must change
- The store needs a `senders` array (each entry: id, display name, encrypted token, accountId, accountName).
- The login screen (`TokenSetup`) needs to become a two-screen flow: sender list → add sender form.
- The `appStore` needs to track which sender is active (or null).
- IPC handlers need new channels for CRUD on the sender list.
- `auth:restore` should restore the last-active sender.
- `auth:logout` should clear only the active session (not the saved sender list).
