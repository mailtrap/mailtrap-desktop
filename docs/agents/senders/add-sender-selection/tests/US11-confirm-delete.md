# Test Cases: US-11 — Confirm Delete Sender

**User Story:** As a user, I want a confirmation step before a sender is deleted, so that I don't accidentally remove saved credentials.

**References:** UX-DESIGN.md §4 | REQUIREMENTS.md FR-6.2 | USER_STORIES.md US-11

---

## TC-11-01 — Clicking the trash icon enters confirmation state for that row

**Priority:** P1

**Description:** Verify that clicking the delete (trash) icon on a sender row transforms the row into the inline confirmation state without deleting the sender.

**Preconditions:**
- Store has one sender: `{ displayName: "Work", ... }`.
- Sender List screen is loaded.

**Steps:**
1. Locate the sender row for "Work".
2. Click the trash icon button on that row.
3. Observe the row.

**Expected result:**
- The row transforms: avatar and name block are replaced by the text `Delete "Work"?`.
- A "Delete" button (danger variant) is visible.
- A "Cancel" button (ghost variant) is visible.
- The row's border changes from `border-grey-shade` to `border-red-shade`.
- The sender is NOT deleted yet (IPC not called).

---

## TC-11-02 — Cancelling confirmation restores the normal row view

**Priority:** P1

**Description:** Verify that clicking "Cancel" on the confirmation row returns the row to its default state without deleting the sender.

**Preconditions:**
- A sender row is in confirmation state (trash icon was clicked).

**Steps:**
1. Click the "Cancel" button in the confirmation row.
2. Observe the row.
3. Call `listSenders()`.

**Expected result:**
- The row returns to the default layout: avatar, display name, account name, Connect button, and trash icon are all visible again.
- No delete IPC call was made.
- `listSenders()` still contains the sender.

---

## TC-11-03 — Confirming delete calls deleteSender IPC and removes the row

**Priority:** P1

**Description:** Verify that clicking the "Delete" button in the confirmation state calls `deleteSender` and removes the sender from the UI and store.

**Preconditions:**
- Sender row for `"id-A"` is in confirmation state.
- `deleteSender` IPC mock returns `{ success: true, wasActive: false }`.

**Steps:**
1. Click the "Delete" button in the confirmation row.
2. Wait for the IPC call to complete.
3. Observe the Sender List.

**Expected result:**
- The row for `"id-A"` is removed from the UI.
- `listSenders()` returns an empty array (or the remaining senders if multiple were present).

---

## TC-11-04 — Confirming delete of active sender calls setUnauthenticated and refreshes list

**Priority:** P1

**Description:** Verify that when `deleteSender` returns `{ success: true, wasActive: true }`, the renderer calls `setUnauthenticated()` and the Sender List refreshes to show the deleted sender is gone.

**Preconditions:**
- Store has one sender `"id-A"` which is the active sender.
- `deleteSender` IPC returns `{ success: true, wasActive: true }`.

**Steps:**
1. Enter confirmation state for `"id-A"`.
2. Click "Delete".
3. Observe the app state.

**Expected result:**
- The app calls `setUnauthenticated()` internally (auth state clears).
- The Sender List is shown (user is not navigated away to main app).
- The deleted row is no longer visible.
- If no other senders remain, the empty state is shown ("No senders yet").

---

## TC-11-05 — Only one row can be in confirmation state at a time

**Priority:** P2

**Description:** Verify that entering confirmation state on one row does not affect other rows, and that at most one row is in confirmation state simultaneously.

**Preconditions:**
- Store has two senders: `"id-A"` and `"id-B"`.

**Steps:**
1. Click the trash icon on the first row (`"id-A"`).
2. Observe both rows.

**Expected result:**
- Row `"id-A"` is in confirmation state.
- Row `"id-B"` remains in its default state (no confirmation prompt).
- The `isConfirmingDelete` state is local to each row's component instance.

---

## TC-11-06 — Entering confirmation on a second row while one is already confirming

**Priority:** P2

**Description:** Verify the behavior when a user clicks the trash icon on a second row while the first row is already in confirmation state (testing for conflicting confirm states).

**Preconditions:**
- Store has two senders: `"id-A"` and `"id-B"`.
- Row `"id-A"` is in confirmation state.

**Steps:**
1. Click the trash icon on row `"id-B"` (if it is visible and clickable).
2. Observe the state of both rows.

**Expected result:**
- Both rows may be in confirmation state simultaneously (since state is local to each row), OR row `"id-A"` returns to default when `"id-B"` enters confirmation (either behavior is acceptable but should be consistent).
- No crash or infinite re-render occurs.
- Document the actual behavior.

---

## TC-11-07 — Deleting last sender transitions UI to empty state

**Priority:** P1

**Description:** Verify that deleting the last remaining sender shows the empty state after the row disappears.

**Preconditions:**
- Store has exactly one sender.
- Row is in confirmation state.

**Steps:**
1. Click "Delete" in the confirmation row.
2. Observe the Sender List after the row is removed.

**Expected result:**
- The sender row disappears.
- The empty state renders: heading "No senders yet", subtitle, and primary "Add sender" button.

---

## TC-11-08 — Delete button in confirmation uses danger styling

**Priority:** P2

**Description:** Verify the Delete button within the confirmation row uses the `variant="danger"` Button style per UX-DESIGN.md §4.

**Preconditions:**
- A sender row is in confirmation state.

**Steps:**
1. Inspect the "Delete" button element in the confirmation row.

**Expected result:**
- The button has the `variant="danger"` prop / corresponding CSS classes (e.g., destructive red background).
- The Cancel button has the `variant="ghost"` prop.

---

## TC-11-09 — Confirmation row border is red (border-red-shade)

**Priority:** P2

**Description:** Verify the row container's border changes to `border-red-shade` when in confirmation state, as specified in UX-DESIGN.md §4.

**Preconditions:**
- A sender row is in confirmation state.

**Steps:**
1. Inspect the row container's CSS classes.

**Expected result:**
- The container has class `border-red-shade` (not `border-grey-shade`).

---

## TC-11-10 — No IPC call is made until the user clicks the "Delete" confirmation button

**Priority:** P1

**Description:** Verify that clicking the trash icon only changes local component state and does not immediately invoke the `deleteSender` IPC channel.

**Preconditions:**
- Sender List has one row.
- IPC call spy / monitor is active.

**Steps:**
1. Click the trash icon.
2. Observe IPC invocations.

**Expected result:**
- No `auth:delete-sender` IPC call is made.
- The IPC channel is only called after the user explicitly clicks the "Delete" confirmation button.
