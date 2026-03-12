# Test Cases: US-09 — Sender List Screen Component

**User Story:** As a user with no active session, I want to see a list of my saved senders when the app opens, so that I can quickly activate one or add a new one.

**References:** UX-DESIGN.md §1, §3, §5 | REQUIREMENTS.md FR-2 | USER_STORIES.md US-09

---

## TC-09-01 — Empty state renders "No senders yet" when no senders exist

**Priority:** P1

**Description:** Verify that the SenderList screen renders the empty state UI with the correct heading, subtitle, and primary "Add sender" button when `listSenders()` returns an empty array.

**Preconditions:**
- Store has no senders.
- `auth:restore` returned `{ authenticated: false }`.

**Steps:**
1. Open the app (unauthenticated view loads).
2. Observe the rendered content.

**Expected result:**
- Heading text `"No senders yet"` is visible.
- Subtitle text `"Add a sender to get started with Mailtrap Desktop."` is visible.
- A primary "Add sender" button is displayed (not outlined — full primary variant).
- No sender rows are rendered.
- Mailtrap SVG logo is displayed above the heading.

---

## TC-09-02 — Populated state renders each saved sender as a row

**Priority:** P1

**Description:** Verify that each saved sender appears as a row displaying the display name, the Mailtrap account name, a Connect button, and a delete icon.

**Preconditions:**
- Store has two senders:
  - `{ displayName: "Work", accountName: "workaccount" }`
  - `{ displayName: "Personal", accountName: "personalaccount" }`

**Steps:**
1. Open the app (unauthenticated view loads).
2. Observe the rendered sender rows.

**Expected result:**
- Two sender rows are rendered.
- Row 1 shows: "Work" as the primary name and "@workaccount" as the secondary label.
- Row 2 shows: "Personal" as the primary name and "@personalaccount".
- Each row has a "Connect" button and a trash/delete icon button.
- An "Add sender" button is present (outlined variant, at the bottom).
- The heading shows "Senders" (not "No senders yet").
- Subtitle shows "Connect to a Mailtrap account".

---

## TC-09-03 — Avatar shows the first letter of the display name

**Priority:** P2

**Description:** Verify the avatar circle in each sender row displays the uppercase first character of the display name.

**Preconditions:**
- Store has one sender with `displayName: "work"`.

**Steps:**
1. Load the Sender List screen.
2. Inspect the avatar element in the sender row.

**Expected result:**
- Avatar displays `"W"` (uppercase first letter of "work").

---

## TC-09-04 — Clicking a sender row's Connect button enters connecting state

**Priority:** P1

**Description:** Verify that clicking "Connect" on a row triggers the connecting UI state: the button shows "Connecting..." and is disabled, the trash icon is hidden, the row gets reduced opacity, and all other rows and the "Add sender" button are disabled.

**Preconditions:**
- Store has two senders.
- The `selectSender` IPC call is pending (slow network mock — does not resolve immediately).

**Steps:**
1. Load the Sender List screen.
2. Click "Connect" on the first sender row.
3. Observe the UI before the IPC call resolves.

**Expected result:**
- The clicked row's Connect button label changes to "Connecting..." and is disabled.
- The trash icon on the clicked row is hidden.
- The clicked row has `opacity-75` styling applied.
- The other sender row has `opacity-50` and `pointer-events-none` applied.
- The "Add sender" button is disabled.
- No navigation occurs yet.

---

## TC-09-05 — Successful activation navigates to main app view

**Priority:** P1

**Description:** Verify that after `selectSender` resolves successfully, the app navigates away from the Sender List to the authenticated main view.

**Preconditions:**
- Store has one sender with a valid token.
- API mock returns success.

**Steps:**
1. Load the Sender List screen.
2. Click "Connect" on the sender row.
3. Wait for the IPC call to resolve.

**Expected result:**
- The app navigates to the authenticated main app view (e.g., sandbox or sending stats).
- The Sender List screen is no longer visible.

---

## TC-09-06 — Failed activation shows inline error on the row

**Priority:** P1

**Description:** Verify that when `selectSender` returns `{ success: false, error: ... }`, the error message is shown inline below the sender's name in the row, and the row returns to its default (non-connecting) state.

**Preconditions:**
- Store has one sender whose token is revoked.
- API mock returns HTTP 401.

**Steps:**
1. Load the Sender List screen.
2. Click "Connect" on the sender row.
3. Wait for the IPC call to fail.

**Expected result:**
- The row exits connecting state: Connect button is re-enabled, trash icon reappears.
- An error message is displayed below the account name within the row.
- The error text references the failure (e.g., the Axios 401 error message).
- The "Add sender" button is re-enabled.
- The app does not navigate away.
- The sender is not removed from the list.

---

## TC-09-07 — Error clears when Connect is clicked again

**Priority:** P2

**Description:** Verify that the inline row error is cleared when the user clicks Connect again on the same row.

**Preconditions:**
- Sender row is in error state from a previous failed connect attempt.

**Steps:**
1. Click "Connect" on the row that has an error.
2. Observe the row immediately after the click (before IPC resolves).

**Expected result:**
- The error message is no longer visible.
- The row enters the connecting state.

---

## TC-09-08 — Sibling rows and Add sender button are re-enabled after failed connect

**Priority:** P1

**Description:** Verify that when a connect attempt fails, all previously disabled sibling rows and the Add sender button return to enabled state.

**Preconditions:**
- Store has two senders.
- First sender's connect attempt fails.

**Steps:**
1. Click "Connect" on the first row — wait for failure.
2. Inspect the second row and the "Add sender" button.

**Expected result:**
- Second row is no longer `opacity-50 pointer-events-none`.
- "Add sender" button is no longer disabled.

---

## TC-09-09 — auth:restore failure shows error on the previously active sender row

**Priority:** P1

**Description:** Verify that if `auth:restore` failed for the last-active sender, the corresponding row is pre-populated with an error state when the Sender List loads.

**Preconditions:**
- Store has one sender `"id-A"` with `lastActiveSenderId = "id-A"`.
- `auth:restore` returns `{ authenticated: false }` (token revoked or unreachable).
- UX-DESIGN.md specifies: show error "Session expired. Click Connect to log in again." on the previously active sender's row.

**Steps:**
1. Launch the app with a revoked token and `lastActiveSenderId` set.
2. Observe the Sender List screen after auth restore completes.

**Expected result:**
- Sender List screen is shown.
- The row for `"id-A"` displays the error message "Session expired. Click Connect to log in again".
- The Connect button is available (not disabled).

---

## TC-09-10 — Add sender button navigates to the Add Sender form

**Priority:** P1

**Description:** Verify that clicking the "Add sender" button in either the empty state or populated state navigates to the Add Sender form.

**Preconditions:**
- Sender List screen is loaded (any state: empty or populated).

**Steps:**
1. Click the "Add sender" button.
2. Observe the rendered view.

**Expected result:**
- The Add Sender form is rendered (heading "Add sender", display name field, API token field).
- The Sender List screen is no longer visible.

---

## TC-09-11 — Sender list renders instantly without a network call

**Priority:** P1

**Description:** Verify that the Sender List screen renders from the local store immediately, without waiting for any network request.

**Preconditions:**
- Store has two senders.
- Network is unavailable or very slow.

**Steps:**
1. Disable network access.
2. Load the Sender List screen.

**Expected result:**
- Both sender rows render immediately.
- No loading spinner is shown for the list itself (loading spinner only applies to initial auth restore).
- The screen is fully interactive without network.

---

## TC-09-12 — Sender list uses outlined Add sender button in populated state, primary in empty state

**Priority:** P2

**Description:** Verify the button variant changes based on whether senders exist, as specified in UX-DESIGN.md §5.

**Preconditions:**
- Case A: store has no senders.
- Case B: store has one sender.

**Steps:**
1. Load with empty store — inspect the "Add sender" button variant.
2. Load with one sender — inspect the "Add sender" button variant.

**Expected result:**
- Case A (empty state): button uses `variant="primary"` (filled/solid appearance).
- Case B (populated state): button uses `variant="outlined"` (outlined appearance).
