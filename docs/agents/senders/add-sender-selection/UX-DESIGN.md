# UX Design: Multi-Sender Selection

Feature: `add-sender-selection`
Status: Ready for implementation
Author: UX Expert (Phase 2)

---

## Overview

The current app supports exactly one saved token. This feature converts the unauthenticated view into a sender management screen: users can save multiple named senders, pick one to connect, and switch between them by logging out and back in.

Only one sender can be active at a time. There is no concept of "switching while logged in" — the user must explicitly log out via Settings, which returns them to the sender list.

---

## Navigation Flow

```
App Launch
    |
    v
[restoreAuth IPC]
    |
    +-- token found, valid --> AuthenticatedApp (bypass sender list)
    |
    +-- no token / invalid --> SenderList screen
                                    |
                                    +-- list is empty --> EmptyState (within SenderList)
                                    |
                                    +-- click "Add sender" --> AddSenderForm (replaces SenderList)
                                    |       |
                                    |       +-- Cancel --> back to SenderList
                                    |       +-- Connect (success) --> AuthenticatedApp
                                    |       +-- Connect (error) --> inline error, stay on form
                                    |
                                    +-- click sender row --> connecting state on row
                                            |
                                            +-- success --> AuthenticatedApp
                                            +-- error --> inline error on row

AuthenticatedApp
    |
    Settings page --> "Log out" button
        |
        v
    logout IPC --> SenderList screen (clears active session, senders list persists)
```

Auto-restore behavior: on launch, if a previously active sender's token is stored and still valid, skip the sender list entirely and boot directly into AuthenticatedApp. If validation fails, land on SenderList with the failed sender's row showing an error state.

---

## 1. Sender List Screen

Replaces `TokenSetup` as the unauthenticated view. Rendered inside the existing `App` shell: TitleBar (h-12) at top, full remaining height below.

### Layout Shell

```
┌─────────────────────────────────────────────┐  <- bg-navy-void, full height
│  TitleBar (h-12)                            │
├─────────────────────────────────────────────┤
│                                             │
│         (vertical centering flex)           │
│                                             │
│    ┌─────────────────────────────────────┐  │  <- max-w-md, w-full, mx-auto
│    │  [Mailtrap SVG logo]                │  │  <- h-12, mx-auto mb-6
│    │                                     │  │
│    │  Senders                            │  │  <- text-heading-1 text-navy-air mb-1
│    │  Connect to a Mailtrap account      │  │  <- text-body text-grey-muted mb-6
│    │                                     │  │
│    │  ┌───────────────────────────────┐  │  │  <- sender list (space-y-2)
│    │  │  SenderRow                    │  │  │
│    │  │  SenderRow                    │  │  │
│    │  │  ...                          │  │  │
│    │  └───────────────────────────────┘  │  │
│    │                                     │  │
│    │  [+ Add sender]                     │  │  <- full-width outlined Button, mt-4
│    └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Component Classes

Outer container:
```
<div className="flex h-full items-center justify-center p-8">
  <div className="w-full max-w-md">
```

Header block (identical to TokenSetup header, reuse verbatim):
```
<div className="mb-8 text-center">
  <div className="mx-auto mb-6 flex justify-center">
    {/* Mailtrap SVG logo, h-12 */}
  </div>
  <h1 className="text-heading-1 text-navy-air mb-1">Senders</h1>
  <p className="text-body text-grey-muted">
    Connect to a Mailtrap account
  </p>
</div>
```

Sender list:
```
<div className="space-y-2">
  {senders.map(sender => <SenderRow key={sender.id} sender={sender} />)}
</div>
```

Add sender button:
```
<Button variant="outlined" className="mt-4 w-full" onClick={onAddSender}>
  + Add sender
</Button>
```

### States

**Loading (initial auth restore in progress):**
Reuse the existing full-screen spinner from `App.tsx` — do not show the sender list until `restoreAuth` resolves.

**Empty (no senders saved):** See Section 5.

**Populated:** Render sender rows. If a row is in `connecting` state, all other rows and the "Add sender" button are disabled (pointer-events-none, opacity-50).

**Error on restore:** If auto-restore attempted and failed, show the SenderList normally. The previously active sender's row should show the error state (see SenderRow error state in Section 3).

---

## 2. Add Sender Form

Shown in place of the SenderList when the user clicks "+ Add sender". This is a full-page swap within the same centered shell — not a modal, not a drawer.

### Layout

```
┌─────────────────────────────────────────────┐  <- bg-navy-void, full height
│  TitleBar (h-12)                            │
├─────────────────────────────────────────────┤
│                                             │
│    ┌─────────────────────────────────────┐  │  <- max-w-md, w-full, mx-auto
│    │  [Mailtrap SVG logo]                │  │  <- h-12, mx-auto mb-6
│    │                                     │  │
│    │  Add sender                         │  │  <- text-heading-1 text-navy-air mb-1
│    │  Give this account a name you'll    │  │  <- text-body text-grey-muted mb-6
│    │  recognise                          │  │
│    │                                     │  │
│    │  Display name            [label]    │  │
│    │  ┌─────────────────────────────┐    │  │  <- .input
│    │  │ e.g. Work, Personal...      │    │  │
│    │  └─────────────────────────────┘    │  │
│    │                                     │  │
│    │  API Token               [label]    │  │
│    │  ┌─────────────────────────────┐    │  │  <- .input type="password"
│    │  │ Enter your Mailtrap API...  │    │  │
│    │  └─────────────────────────────┘    │  │
│    │  You can find it in Settings →      │  │  <- text-body-s text-grey-muted mt-1
│    │  API Tokens (link)                  │  │
│    │                                     │  │
│    │  [error box if present]             │  │
│    │                                     │  │
│    │  [Connect]                          │  │  <- primary Button, w-full
│    │  [Cancel]                           │  │  <- ghost Button, w-full, mt-2
│    └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Component Classes

Form:
```
<form className="space-y-4">
  <div>
    <label className="mb-1.5 block text-heading-3 text-navy-air">
      Display name
    </label>
    <input
      type="text"
      className="input"
      placeholder="e.g. Work, Personal, Client A"
      maxLength={50}
      autoFocus
    />
  </div>

  <div>
    <label className="mb-1.5 block text-heading-3 text-navy-air">
      API Token
    </label>
    <input
      type="password"
      className="input"
      placeholder="Enter your Mailtrap API token"
    />
    <p className="mt-1 text-body-s text-grey-muted">
      You can find it in{' '}
      <a
        href="https://mailtrap.io/api-tokens"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-neutral hover:text-blue-medium underline"
      >
        Settings &rarr; API Tokens
      </a>
    </p>
  </div>

  {error && (
    <div className="rounded-mtui border border-red-shade bg-red-solid px-4 py-3 text-body text-red-medium">
      {error}
    </div>
  )}

  <Button type="submit" loading={loading} className="w-full">
    {loading ? 'Connecting...' : 'Connect'}
  </Button>

  <Button
    type="button"
    variant="ghost"
    className="w-full"
    onClick={onCancel}
    disabled={loading}
  >
    Cancel
  </Button>
</form>
```

### Validation Rules

- Display name: required, max 50 chars, trimmed. If empty on submit, show "Please enter a display name."
- API Token: required, trimmed. If empty on submit, show "Please enter your API token."
- On `login` IPC error: show the error message returned by the API in the error box.
- On network error: show "Connection failed. Please check your internet connection."

### On Successful Connect

After the `login` IPC returns success:
1. Save the sender to the senders list in the store (id, displayName, accountId, accountName, encrypted token).
2. Set this sender as the active sender in appStore.
3. Navigate to AuthenticatedApp — identical to the current TokenSetup success path.

---

## 3. Sender Row

Each saved sender is a row in the SenderList. Height is not fixed — let content define it (min ~56px effective with py-3).

### Default State

```
┌──────────────────────────────────────────────────┐
│  [avatar]  Display Name              [Connect]   │
│            @accountname              [ trash ]   │
└──────────────────────────────────────────────────┘
```

Detailed layout:
```
<div className="flex items-center gap-3 rounded-mtui border border-grey-shade bg-navy-700 px-4 py-3">

  {/* Avatar — first letter of display name */}
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-grey-shade text-heading-3 text-grey-muted uppercase">
    {sender.displayName[0]}
  </div>

  {/* Name block */}
  <div className="min-w-0 flex-1">
    <p className="truncate text-heading-3 text-navy-air">{sender.displayName}</p>
    <p className="truncate text-body-s text-grey-muted">@{sender.accountName}</p>
  </div>

  {/* Actions */}
  <div className="flex shrink-0 items-center gap-2">
    <Button variant="outlined" size="sm" onClick={onConnect}>
      Connect
    </Button>
    <button
      className="flex h-7 w-7 items-center justify-center rounded-mtui text-grey-muted hover:text-red-medium hover:bg-grey-shade transition-colors"
      onClick={onDeleteRequest}
      aria-label="Delete sender"
    >
      {/* Trash icon SVG, 16x16 */}
    </button>
  </div>

</div>
```

### Connecting State

When the user clicks "Connect" on a row, that row enters connecting state:

- The Connect button shows `loading={true}` with label "Connecting..." and is disabled.
- The trash icon button is hidden (`hidden`).
- The entire row gets `opacity-75`.
- All other rows are `opacity-50 pointer-events-none`.
- The "+ Add sender" button is `disabled`.

```
┌──────────────────────────────────────────────────┐
│  [avatar]  Display Name         [~ Connecting]   │  <- opacity-75
│            @accountname                          │     trash hidden
└──────────────────────────────────────────────────┘
```

### Error State

If the connection attempt fails, the row returns to a near-default appearance but adds an inline error message below the name:

```
┌──────────────────────────────────────────────────┐
│  [avatar]  Display Name              [Connect]   │
│            @accountname              [ trash ]   │
│            Could not authenticate. Token may     │
│            be invalid or expired.                │
└──────────────────────────────────────────────────┘
```

Error text:
```
<p className="mt-1 text-body-s text-red-medium">{errorMessage}</p>
```

The error clears when the user clicks Connect again or when the user navigates away.

### Previously Active Sender (restore failure)

If restoreAuth fails for a sender that was previously active, that row is shown in error state with the message: "Session expired. Click Connect to log in again."

No visual distinction otherwise — do not add a "previously active" badge.

---

## 4. Delete Confirmation

There is no modal component. Confirmation is inline on the row — the row transforms in place.

### Confirmation State

```
┌──────────────────────────────────────────────────┐
│  Delete "Work"?              [Delete]  [Cancel]  │
└──────────────────────────────────────────────────┘
```

The avatar and name block are replaced by the confirmation prompt. The delete and cancel buttons are right-aligned.

Full row implementation:
```
{isConfirmingDelete ? (
  <div className="flex items-center gap-3 rounded-mtui border border-red-shade bg-navy-700 px-4 py-3">
    <p className="flex-1 text-body text-navy-air">
      Delete{' '}
      <span className="font-semibold">"{sender.displayName}"</span>?
    </p>
    <div className="flex shrink-0 items-center gap-2">
      <Button variant="danger" size="sm" onClick={onConfirmDelete}>
        Delete
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancelDelete}>
        Cancel
      </Button>
    </div>
  </div>
) : (
  /* normal row as above */
)}
```

Border changes from `border-grey-shade` to `border-red-shade` to signal destructive intent.

The confirmation state is purely local to the row — `isConfirmingDelete` is a `useState` boolean inside the SenderRow component. Clicking Delete calls the parent's `onDeleteConfirm(sender.id)` handler.

If there is only one sender and the user deletes it, the SenderList transitions to the empty state after the row disappears.

---

## 5. Empty State

When `senders.length === 0`, render this in place of the sender list:

```
┌─────────────────────────────────────────────┐
│                                             │
│         (center of remaining space)         │
│                                             │
│    ┌─────────────────────────────────────┐  │  <- max-w-md
│    │  [Mailtrap SVG logo]                │  │
│    │                                     │  │
│    │  No senders yet                     │  │  <- text-heading-1 text-navy-air mb-1
│    │  Add a sender to get started with   │  │  <- text-body text-grey-muted mb-6
│    │  Mailtrap Desktop.                  │  │
│    │                                     │  │
│    │  [+ Add sender]                     │  │  <- primary Button, w-full
│    └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

Notice the "Add sender" button uses `variant="primary"` (not outlined) in the empty state — it is the only action and should draw the eye. In the populated state it uses `variant="outlined"` to be secondary to the Connect actions on each row.

Component:
```
<div className="mb-8 text-center">
  {/* Mailtrap SVG logo, h-12, mx-auto mb-6 */}
  <h1 className="text-heading-1 text-navy-air mb-1">No senders yet</h1>
  <p className="text-body text-grey-muted mb-6">
    Add a sender to get started with Mailtrap Desktop.
  </p>
  <Button className="w-full" onClick={onAddSender}>
    + Add sender
  </Button>
</div>
```

---

## 6. TitleBar Update

Current: `Mailtrap - @{accountName}` when authenticated, `Mailtrap` otherwise.

New behavior:
- Unauthenticated (sender list / add form): `Mailtrap`
- Authenticated: `Mailtrap - {senderDisplayName}`

The `@accountName` suffix is dropped. The sender's display name (user-chosen label, e.g. "Work") replaces the Mailtrap username. This is more meaningful to multi-account users who may have the same `accountName` across environments.

Updated logic in `TitleBar.tsx`:
```tsx
// appStore needs a new field: senderDisplayName (string | null)
const senderDisplayName = useAppStore((s) => s.senderDisplayName)
const title = senderDisplayName ? `Mailtrap - ${senderDisplayName}` : 'Mailtrap'
```

The `text-item-label-s text-grey-muted` class on the title `<span>` stays unchanged.

If the display name is long, it will be clipped by the centered flex container — this is acceptable since the window has fixed minimum width and the TitleBar has symmetric 70px gutters for traffic lights. Renderer devs should note that the central flex div already uses `flex-1` with `justify-center`, so overflow will simply be invisible rather than pushing layout. Add `truncate` to the span as a safeguard:

```tsx
<span className="truncate text-item-label-s text-grey-muted">
  {title}
</span>
```

---

## 7. Tray Menu Update

Add a disabled "Connected as" label at the very top of the tray menu, above all sections, when a sender is active.

```
Connected as: Work              <- disabled label, shown when authenticated
──────────────────────────────
Sandboxes
──────────────────────────────
  ...inboxes...
──────────────────────────────
API/SMTP
...
```

In `rebuildTrayMenu`, prepend before any section:
```ts
// Add at the top if a sender display name is known
const senderDisplayName = getActiveSenderDisplayName() // new store helper
if (senderDisplayName) {
  menu.append(new MenuItem({
    label: `Connected as: ${senderDisplayName}`,
    enabled: false
  }))
  menu.append(new MenuItem({ type: 'separator' }))
}
```

`getActiveSenderDisplayName()` reads from the persistent store — not from renderer state. The tray is a main-process concern and must not rely on IPC for display name resolution.

This label is only shown when the app is authenticated. When showing the tray from a logged-out state (edge case: tray icon persists after logout), omit this label.

The existing footer items (Settings, Open Mailtrap Web, separator, Quit Mailtrap) are unchanged.

---

## 8. Settings Page: Logout Behavior

The current Settings page has a "Log out" / "Disconnect Account" action. Its behavior changes under multi-sender:

- Clicking "Log out" clears the active session token and active sender in the store.
- It does NOT delete the sender from the senders list.
- The app navigates to the SenderList screen (same as `setUnauthenticated()` today, but appStore now also clears `activeSenderId` and `senderDisplayName`).

No UI change to the Settings page is required beyond updating the label copy slightly:

Old: "Disconnect Account" / "Remove your API token and log out"
New: "Disconnect" / "Log out and return to the sender list"

This is a copy-only change, not a structural one.

---

## Appendix: appStore Changes Required

The renderer-dev will need to extend `AppState` in `src/stores/appStore.ts`:

```ts
interface AppState {
  isAuthenticated: boolean
  accountId: number | null
  accountName: string | null
  activeSenderId: string | null      // new: UUID of the active sender
  senderDisplayName: string | null   // new: user-chosen label for TitleBar
  isLoading: boolean

  setAuthenticated: (accountId: number, accountName?: string, senderId?: string, senderDisplayName?: string) => void
  setUnauthenticated: () => void
  setLoading: (loading: boolean) => void
}
```

The persistent senders list (array of saved senders) lives in the main process store (`electron/store.ts`), not in Zustand. Zustand holds only the currently active sender's identity for TitleBar / UI display purposes.

---

## Appendix: Sender Data Shape

For reference — the shape renderer-devs should expect from IPC calls:

```ts
interface SavedSender {
  id: string              // UUID, generated on add
  displayName: string     // user-chosen label, e.g. "Work"
  accountId: number       // from Mailtrap API after login
  accountName: string     // Mailtrap username, from API after login
  // token is stored encrypted in main process; never exposed to renderer
}
```

The renderer never sees the raw token. IPC handlers own token storage and retrieval.
