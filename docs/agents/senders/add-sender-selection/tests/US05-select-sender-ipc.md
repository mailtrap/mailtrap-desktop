# Test Cases: US-05 — IPC Handler: Select (Activate) Sender

**User Story:** As a renderer component, I want to call `window.electron.selectSender(senderId)` to activate a saved sender, so that the Sender List screen can start a session without re-entering the token.

**References:** IPC_SPEC.md auth:select-sender | ARCHITECTURE.md §6.4 | REQUIREMENTS.md FR-2.3, FR-2.4 | USER_STORIES.md US-05

---

## TC-05-01 — Happy path: valid senderId activates sender and starts session

**Priority:** P1

**Description:** Verify that selecting a known sender with a valid token succeeds, starts polling, and returns the correct payload.

**Preconditions:**
- Store has one sender: `{ id: "id-A", displayName: "Work", encryptedToken: <valid>, accountId: 100, accountName: "workaccount" }`.
- API mock returns `[{ id: 100, name: "workaccount" }]` for `GET /api/accounts`.
- No active API client.

**Steps:**
1. Call `window.electron.selectSender("id-A")`.
2. Await the result.
3. Call `getLastActiveSenderId()` in the main process.
4. Confirm polling has started.

**Expected result:**
- Return value: `{ success: true, accountId: 100, accountName: "workaccount", senderId: "id-A" }`.
- `getLastActiveSenderId()` returns `"id-A"`.
- Polling is active.

---

## TC-05-02 — Returned accountId and accountName are from stored profile, not live API

**Priority:** P1

**Description:** Verify that the `accountId` and `accountName` in the success response come from the stored profile, even if the live API response has a different `name` value (account renamed on the Mailtrap side).

**Preconditions:**
- Stored profile: `{ accountId: 100, accountName: "oldname", ... }`.
- API mock returns `[{ id: 100, name: "newname" }]` (name changed on Mailtrap side).

**Steps:**
1. Call `window.electron.selectSender("id-A")`.

**Expected result:**
- Return value: `{ success: true, accountId: 100, accountName: "oldname", ... }` (stored name, not live API name).
- Stored profile's `accountName` is not overwritten.

---

## TC-05-03 — Unknown senderId returns error

**Priority:** P1

**Description:** Verify that passing a senderId that does not exist in the store returns a descriptive error.

**Preconditions:**
- Store has no senders (or senders with different ids).

**Steps:**
1. Call `window.electron.selectSender("does-not-exist")`.

**Expected result:**
- Return value: `{ success: false, error: "Sender not found" }`.
- No API call is made.
- Polling is not started.

---

## TC-05-04 — Revoked token returns error and does not start session

**Priority:** P1

**Description:** Verify that when the stored token has been revoked on the Mailtrap side, the `GET /api/accounts` call fails and the error is returned without starting a session.

**Preconditions:**
- Store has one sender with a token that was valid when saved.
- API mock returns HTTP 401 for `GET /api/accounts`.

**Steps:**
1. Call `window.electron.selectSender("id-A")`.
2. Call `getLastActiveSenderId()`.

**Expected result:**
- Return value: `{ success: false, error: <axios error message> }`.
- `getLastActiveSenderId()` does not update to `"id-A"`.
- API client is destroyed after the failure.
- Polling is not started.
- Sender profile remains in the store (not deleted).

---

## TC-05-05 — Network timeout during token verification returns error

**Priority:** P1

**Description:** Verify graceful handling of a network timeout during the live `GET /api/accounts` verification call.

**Preconditions:**
- Store has one sender with a valid encrypted token.
- API mock delays response beyond 15 seconds.

**Steps:**
1. Call `window.electron.selectSender("id-A")` and wait for timeout.

**Expected result:**
- Return value: `{ success: false, error: <axios timeout error message> }`.
- API client is destroyed.
- Session is not activated.
- Sender remains in the store.

---

## TC-05-06 — Corrupted encrypted token returns credential error

**Priority:** P1

**Description:** Verify that if `decryptToken` fails (e.g., corrupted base64 or safeStorage unavailable), an appropriate error is returned.

**Preconditions:**
- Store has one sender whose `encryptedToken` value is corrupted or not decryptable.

**Steps:**
1. Call `window.electron.selectSender("id-A")`.

**Expected result:**
- Return value: `{ success: false, error: "Could not read stored credentials" }`.
- No API call attempted.
- Polling is not started.

---

## TC-05-07 — Existing API client is destroyed before activating new sender

**Priority:** P1

**Description:** Verify that a pre-existing active API client for a different sender is destroyed before the new one is initialised, preventing cross-account data leaks.

**Preconditions:**
- API client is currently active for sender A (accountId 50).
- Store has sender B (id: `"id-B"`, accountId: 200).
- API mock returns valid response for account 200.

**Steps:**
1. Call `window.electron.selectSender("id-B")`.
2. Verify that no API requests are made using the old sender A token.

**Expected result:**
- Return value: `{ success: true, accountId: 200, ... }`.
- The previous client (account 50) is destroyed before the new client is created.

---

## TC-05-08 — setLastActiveSenderId is only called on success

**Priority:** P1

**Description:** Verify that a failed select attempt does not update `lastActiveSenderId`, preserving the previously active sender identity.

**Preconditions:**
- Store has sender A (`"id-A"`) currently set as `lastActiveSenderId`.
- Store has sender B (`"id-B"`) whose token is revoked.

**Steps:**
1. Call `window.electron.selectSender("id-B")` — expect failure.
2. Call `getLastActiveSenderId()`.

**Expected result:**
- `getLastActiveSenderId()` still returns `"id-A"` (unchanged).

---

## TC-05-09 — API returns empty accounts array returns descriptive error

**Priority:** P1

**Description:** Verify the specific error when token verification succeeds (200 OK) but the accounts array is empty.

**Preconditions:**
- Store has one sender with a valid encrypted token.
- API mock returns `{ status: 200, body: [] }`.

**Steps:**
1. Call `window.electron.selectSender("id-A")`.

**Expected result:**
- Return value: `{ success: false, error: "No accounts found for this token" }`.
- Session not started.

---

## TC-05-10 — Selecting a sender that was previously selected again works correctly

**Priority:** P2

**Description:** Verify that re-activating the currently active sender (e.g., after a polling error) succeeds and refreshes the session.

**Preconditions:**
- Sender `"id-A"` is `lastActiveSenderId`.
- API mock returns valid response.

**Steps:**
1. Call `window.electron.selectSender("id-A")`.

**Expected result:**
- Return value: `{ success: true, accountId: 100, accountName: "workaccount", senderId: "id-A" }`.
- No error thrown for re-selecting the same sender.
- Polling restarts cleanly.

---

## TC-05-11 — selectSender response includes senderId in success payload

**Priority:** P1

**Description:** Verify that the `senderId` field is present in the success response so the renderer can update `appStore.activeSenderId`.

**Preconditions:**
- Store has one valid sender with id `"id-A"`.
- API mock returns valid accounts.

**Steps:**
1. Call `window.electron.selectSender("id-A")`.
2. Inspect the returned object.

**Expected result:**
- Return value includes `senderId: "id-A"`.
- `senderId` is a string, not undefined or null.
