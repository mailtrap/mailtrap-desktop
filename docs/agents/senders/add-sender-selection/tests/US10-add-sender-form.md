# Test Cases: US-10 — Add Sender Form Component

**User Story:** As a user, I want to enter a display name and API token to save a new sender, so that I can add new Mailtrap accounts to the app.

**References:** UX-DESIGN.md §2 | REQUIREMENTS.md FR-3 | USER_STORIES.md US-10

---

## TC-10-01 — Form renders all required elements on load

**Priority:** P1

**Description:** Verify the Add Sender form renders with all required fields and controls when navigated to.

**Preconditions:**
- User is on the Sender List screen.
- User clicks "+ Add sender".

**Steps:**
1. Click "Add sender" on the Sender List.
2. Observe the rendered form.

**Expected result:**
- Heading "Add sender" is displayed.
- Subtitle "Give this account a name you'll recognise" (or equivalent) is displayed.
- A "Display name" label and text input field are rendered.
- An "API Token" label and password input field are rendered.
- A helper text "You can find it in Settings → API Tokens" with a link is shown below the token field.
- A "Connect" submit button is rendered (enabled by default).
- A "Cancel" ghost button is rendered.
- No error box is visible initially.

---

## TC-10-02 — Display name field is auto-focused on load

**Priority:** P2

**Description:** Verify that the display name field receives focus automatically when the form loads, as specified in UX-DESIGN.md §2.

**Preconditions:**
- User navigates to the Add Sender form.

**Steps:**
1. Open the Add Sender form.
2. Observe which element has focus without any user interaction.

**Expected result:**
- The display name input has focus (cursor is in the field).

---

## TC-10-03 — Happy path: valid name and token connects and navigates to main view

**Priority:** P1

**Description:** Verify that submitting valid values calls `addSender`, navigates to the main app view on success, and shows no error.

**Preconditions:**
- API mock returns `[{ id: 100, name: "workaccount" }]` for `GET /api/accounts`.
- No existing senders.

**Steps:**
1. Enter "Work" in the display name field.
2. Enter a valid API token in the token field.
3. Click "Connect".
4. Wait for the IPC call to complete.

**Expected result:**
- "Connect" button shows loading state ("Connecting..." label, disabled).
- After success, the app navigates to the main authenticated view.
- The Add Sender form is no longer visible.
- No error message is shown.

---

## TC-10-04 — Connect button shows loading state while IPC is in-flight

**Priority:** P1

**Description:** Verify the loading state is applied to the Connect button during the `addSender` IPC call.

**Preconditions:**
- Add Sender form is open.
- API mock has a deliberate delay (simulating slow network).

**Steps:**
1. Fill in valid display name and token.
2. Click "Connect".
3. Observe the button state before the IPC call resolves.

**Expected result:**
- "Connect" button is disabled.
- Button label shows "Connecting..." (or has a loading spinner).
- Cancel button is also disabled while loading.

---

## TC-10-05 — Cancel button is disabled while IPC is in-flight

**Priority:** P1

**Description:** Verify that the Cancel button cannot be clicked while a connection attempt is in progress.

**Preconditions:**
- Add Sender form is open.
- IPC call is in-flight (slow mock).

**Steps:**
1. Fill in valid display name and token.
2. Click "Connect".
3. Attempt to click "Cancel" before the IPC resolves.

**Expected result:**
- Cancel button is disabled (has `disabled` attribute or `pointer-events-none`).

---

## TC-10-06 — Empty display name on submit shows inline validation error

**Priority:** P1

**Description:** Verify that submitting the form with an empty display name shows the correct inline error without calling `addSender`.

**Preconditions:**
- Add Sender form is open.

**Steps:**
1. Leave the display name field empty.
2. Enter a valid token in the token field.
3. Click "Connect".

**Expected result:**
- Inline error: "Please enter a display name." is shown (or the error returned from the IPC handler: "Display name is required").
- `addSender` is either not called (client-side validation) or called and the error is displayed.
- Form is not dismissed; user stays on the Add Sender screen.

---

## TC-10-07 — Empty token on submit shows inline validation error

**Priority:** P1

**Description:** Verify that submitting the form with an empty API token shows the correct error.

**Preconditions:**
- Add Sender form is open.

**Steps:**
1. Enter "Work" in the display name field.
2. Leave the token field empty.
3. Click "Connect".

**Expected result:**
- Inline error: "Please enter your API token." is shown (or the IPC error: "API token is required").
- Form is not dismissed.

---

## TC-10-08 — API error from IPC is shown in the error box

**Priority:** P1

**Description:** Verify that when `addSender` returns `{ success: false, error: <message> }`, the error message is displayed in the styled error box.

**Preconditions:**
- API mock returns HTTP 401.

**Steps:**
1. Enter "Work" and an invalid token.
2. Click "Connect".
3. Wait for the IPC to fail.

**Expected result:**
- The error box is rendered with the API error message (e.g., the Axios 401 error string).
- Connect button is re-enabled.
- Cancel button is re-enabled.
- Form remains open.

---

## TC-10-09 — Duplicate account error is displayed with the existing sender name

**Priority:** P1

**Description:** Verify that when a token for an already-saved account is submitted, the error names the conflicting existing sender.

**Preconditions:**
- Store has one sender: `{ displayName: "Work", accountId: 100 }`.
- API mock returns `[{ id: 100, name: "workaccount" }]`.

**Steps:**
1. Enter "Personal" in the display name field.
2. Enter the same token as the existing "Work" sender.
3. Click "Connect".

**Expected result:**
- Error box shows: `'This account is already saved as "Work"'`.
- Form remains open.
- No new sender is created.

---

## TC-10-10 — Network error shows a connection failure message

**Priority:** P1

**Description:** Verify that a network timeout or connection error shows a user-friendly error in the form.

**Preconditions:**
- Network is unavailable or the API times out.

**Steps:**
1. Enter a valid display name and token.
2. Click "Connect".
3. Let the request time out.

**Expected result:**
- Error box is shown (e.g., "Connection failed. Please check your internet connection." or the Axios timeout message).
- Form remains open.
- Connect and Cancel buttons are re-enabled.

---

## TC-10-11 — Cancel button returns to the Sender List screen

**Priority:** P1

**Description:** Verify that clicking Cancel navigates back to the Sender List without saving anything.

**Preconditions:**
- Add Sender form is open with some data entered.

**Steps:**
1. Enter "Work" and a partial token.
2. Click "Cancel" (not "Connect").

**Expected result:**
- The Sender List screen is shown.
- No new sender was added (form data discarded).
- `listSenders()` count is unchanged.

---

## TC-10-12 — Display name field enforces 50-character max length in the UI

**Priority:** P2

**Description:** Verify that the display name input field enforces the `maxLength={50}` attribute from UX-DESIGN.md §2 and prevents input beyond 50 characters.

**Preconditions:**
- Add Sender form is open.

**Steps:**
1. Attempt to type 60 characters into the display name field.
2. Observe the field value after input.

**Expected result:**
- The field value is truncated at 50 characters.
- No more than 50 characters can be entered via normal keyboard input.

---

## TC-10-13 — Token field is of type password (characters are masked)

**Priority:** P2

**Description:** Verify that the API token input field masks its content for security.

**Preconditions:**
- Add Sender form is open.

**Steps:**
1. Click into the token field.
2. Type any characters.

**Expected result:**
- Characters are displayed as bullets or asterisks (masked).
- The field has `type="password"` in the DOM.

---

## TC-10-14 — Error box is hidden when no error is present

**Priority:** P2

**Description:** Verify the error box is not rendered when the form has no error state.

**Preconditions:**
- Add Sender form freshly loaded, no submit attempted.

**Steps:**
1. Open the Add Sender form.
2. Inspect the DOM.

**Expected result:**
- No error box element is rendered (conditional render — element should not be in the DOM).

---

## TC-10-15 — Successful add updates the sender list when returning via Cancel later

**Priority:** P2

**Description:** Verify that after adding a sender successfully (navigating to main app), if the user later logs out and returns to the Sender List, the new sender is visible.

**Preconditions:**
- Add Sender form was used to add a sender successfully.
- User is now authenticated.

**Steps:**
1. Navigate to Settings and click "Log out".
2. Observe the Sender List screen.

**Expected result:**
- The Sender List shows the newly added sender as a row.
