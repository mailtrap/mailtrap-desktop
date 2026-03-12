# Test Cases: US-04 — IPC Handler: Add Sender

**User Story:** As a renderer component, I want to call `window.electron.addSender(displayName, token)` to save a new sender and start a session, so that the Add Sender form can complete the whole flow in one call.

**References:** IPC_SPEC.md auth:add-sender | ARCHITECTURE.md §6.3 | REQUIREMENTS.md FR-3 | USER_STORIES.md US-04

---

## TC-04-01 — Happy path: valid displayName and token saves sender and starts session

**Priority:** P1

**Description:** Verify that a valid (displayName, token) pair creates a sender profile, sets the active sender, starts polling, and returns the correct success payload.

**Preconditions:**
- Store has no existing senders.
- Mailtrap API mock returns `[{ id: 100, name: "workaccount" }]` for `GET /api/accounts`.
- No active API client exists.

**Steps:**
1. Call `window.electron.addSender("Work", "<valid-token>")`.
2. Await the result.
3. Call `listSenders()` in the main process.
4. Call `getLastActiveSenderId()`.
5. Confirm polling has started (verify `startPolling()` was called, e.g. via spy or by checking that polling timers are set).

**Expected result:**
- Return value: `{ success: true, senderId: <uuid>, accountId: 100, accountName: "workaccount" }`.
- `listSenders()` returns one entry with `displayName: "Work"`, `accountId: 100`, `accountName: "workaccount"`.
- `getLastActiveSenderId()` returns the same UUID as `senderId`.
- `startPolling()` was called.

---

## TC-04-02 — displayName is trimmed before save

**Priority:** P1

**Description:** Verify that leading/trailing whitespace in displayName is removed before persistence.

**Preconditions:**
- Store has no senders.
- API mock returns a valid account.

**Steps:**
1. Call `window.electron.addSender("  Work  ", "<valid-token>")`.
2. Call `listSenders()`.

**Expected result:**
- Success response returned.
- Stored profile has `displayName: "Work"` (trimmed).

---

## TC-04-03 — Empty displayName returns validation error

**Priority:** P1

**Description:** Verify that submitting an empty display name returns an error without calling the API.

**Preconditions:**
- Store has no senders.
- API is available (should not be called).

**Steps:**
1. Call `window.electron.addSender("", "<valid-token>")`.
2. Await the result.
3. Confirm no API call was made.
4. Call `listSenders()`.

**Expected result:**
- Return value: `{ success: false, error: "Display name is required" }`.
- No profile saved (`listSenders()` returns `[]`).
- No API client initialised.

---

## TC-04-04 — Whitespace-only displayName returns validation error

**Priority:** P1

**Description:** Verify that a displayName of only spaces is treated as empty after trimming.

**Preconditions:**
- Store has no senders.

**Steps:**
1. Call `window.electron.addSender("   ", "<valid-token>")`.

**Expected result:**
- Return value: `{ success: false, error: "Display name is required" }`.
- No profile saved.

---

## TC-04-05 — displayName exceeding 80 characters returns validation error

**Priority:** P1

**Description:** Verify the 80-character limit on displayName is enforced at the IPC handler level.

**Preconditions:**
- Store has no senders.

**Steps:**
1. Construct a string of 81 characters (e.g., `"A".repeat(81)`).
2. Call `window.electron.addSender(<81-char-string>, "<valid-token>")`.

**Expected result:**
- Return value: `{ success: false, error: "Display name must be 80 characters or fewer" }`.
- No profile saved.

---

## TC-04-06 — Empty token returns validation error

**Priority:** P1

**Description:** Verify that submitting an empty token returns a validation error without calling the API.

**Preconditions:**
- Store has no senders.

**Steps:**
1. Call `window.electron.addSender("Work", "")`.

**Expected result:**
- Return value: `{ success: false, error: "API token is required" }`.
- No profile saved.
- No API call made.

---

## TC-04-07 — Whitespace-only token returns validation error

**Priority:** P1

**Description:** Verify that a token of only spaces is treated as empty after trimming.

**Preconditions:**
- Store has no senders.

**Steps:**
1. Call `window.electron.addSender("Work", "   ")`.

**Expected result:**
- Return value: `{ success: false, error: "API token is required" }`.

---

## TC-04-08 — Duplicate accountId returns descriptive error

**Priority:** P1

**Description:** Verify that adding a token that resolves to an accountId already in the senders list returns an error naming the conflicting sender, without saving a duplicate.

**Preconditions:**
- Store has one sender: `{ id: "existing-id", displayName: "Personal", accountId: 100, ... }`.
- API mock returns `[{ id: 100, name: "personalaccount" }]`.

**Steps:**
1. Call `window.electron.addSender("Work", "<token-for-account-100>")`.
2. Call `listSenders()`.

**Expected result:**
- Return value: `{ success: false, error: 'Account "personalaccount" is already added' }`.
- `listSenders()` still returns exactly one sender (no duplicate created).
- API client is destroyed after the duplicate check.

---

## TC-04-09 — API returns 401 returns authentication error

**Priority:** P1

**Description:** Verify that a revoked or invalid token results in an error response and no profile is saved.

**Preconditions:**
- Store has no senders.
- API mock returns HTTP 401 for `GET /api/accounts`.

**Steps:**
1. Call `window.electron.addSender("Work", "<invalid-token>")`.
2. Call `listSenders()`.

**Expected result:**
- Return value: `{ success: false, error: <axios error message, e.g. "Request failed with status code 401"> }`.
- No profile saved (`listSenders()` returns `[]`).
- The temporary validation client is discarded; the singleton API client is untouched (was never initialized for this attempt).
- Polling is not started.

---

## TC-04-10 — Network timeout returns timeout error

**Priority:** P1

**Description:** Verify that a network timeout during `GET /api/accounts` is handled gracefully with no profile saved.

**Preconditions:**
- Store has no senders.
- API mock delays response beyond the 15-second timeout.

**Steps:**
1. Call `window.electron.addSender("Work", "<valid-token>")` and let it time out.

**Expected result:**
- Return value: `{ success: false, error: <axios timeout error message> }`.
- No profile saved.
- The temporary validation client is discarded; the singleton API client is untouched.
- Polling is not started.

---

## TC-04-11 — API returns empty accounts array returns descriptive error

**Priority:** P1

**Description:** Verify the specific error when `GET /api/accounts` returns an empty array.

**Preconditions:**
- Store has no senders.
- API mock returns `[]` for `GET /api/accounts`.

**Steps:**
1. Call `window.electron.addSender("Work", "<valid-token>")`.

**Expected result:**
- Return value: `{ success: false, error: "No accounts found for this API token" }`.
- No profile saved.

---

## TC-04-12 — Existing API client is destroyed before initialising a new one

**Priority:** P1

**Description:** Verify that a pre-existing active API client is torn down before the new one is created, preventing stale client leaks.

**Preconditions:**
- Store has one active sender (API client already initialised for account 50).
- A new sender is being added for account 200.

**Steps:**
1. Note the current active API client (account 50 is active).
2. Call `window.electron.addSender("NewWork", "<token-for-account-200>")`.
3. Confirm the old API client (account 50) is no longer reachable.

**Expected result:**
- Success response returned with `accountId: 200`.
- Any call that would use the old client (account 50) fails or references the new client.
- No residual state from the old client.

---

## TC-04-13 — Sender profile is not saved if API call fails

**Priority:** P1

**Description:** Verify that on any failure path (API error or network error), no incomplete profile is persisted to the store.

**Preconditions:**
- Store has no senders.
- API mock returns HTTP 500.

**Steps:**
1. Call `window.electron.addSender("Work", "<valid-token>")`.
2. Call `listSenders()`.

**Expected result:**
- `listSenders()` returns `[]`.
- No partial or incomplete `SenderProfile` entry exists in the store file.

---

## TC-04-14 — displayName exactly 80 characters is accepted

**Priority:** P2

**Description:** Verify the boundary condition where displayName is exactly 80 characters (the maximum allowed).

**Preconditions:**
- Store has no senders.
- API mock returns a valid account.

**Steps:**
1. Construct a string of exactly 80 characters.
2. Call `window.electron.addSender(<80-char-string>, "<valid-token>")`.

**Expected result:**
- Return value: `{ success: true, ... }`.
- Profile is saved with the full 80-character displayName.

---

## TC-04-15 — addSender generates a unique UUID for each new sender

**Priority:** P2

**Description:** Verify that two successful `addSender` calls produce profiles with distinct ids.

**Preconditions:**
- Store has no senders.
- API mock returns two different accounts on successive calls (accountId 100, then 200).

**Steps:**
1. Call `window.electron.addSender("Work", "<token-A>")` — get `senderIdA`.
2. Call `window.electron.addSender("Personal", "<token-B>")` — get `senderIdB`.

**Expected result:**
- `senderIdA !== senderIdB`.
- Both are valid UUID strings.
- `listSenders()` returns two profiles with distinct ids.
