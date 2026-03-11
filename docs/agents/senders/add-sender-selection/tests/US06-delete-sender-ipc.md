# Test Cases: US-06 — IPC Handler: Delete Sender

**User Story:** As a renderer component, I want to call `window.electron.deleteSender(senderId)` to permanently remove a sender, so that the user can clean up stale credentials.

**References:** IPC_SPEC.md auth:delete-sender | ARCHITECTURE.md §6.5 | REQUIREMENTS.md FR-6 | USER_STORIES.md US-06

---

## TC-06-01 — Happy path: delete an inactive sender removes it from the store

**Priority:** P1

**Description:** Verify that deleting a sender that is not currently active removes the profile from the store and returns `wasActive: false`.

**Preconditions:**
- Store has two senders: `"id-A"` (active, `lastActiveSenderId = "id-A"`) and `"id-B"` (inactive).
- Polling is active for sender A.

**Steps:**
1. Call `window.electron.deleteSender("id-B")`.
2. Await the result.
3. Call `listSenders()`.
4. Call `getLastActiveSenderId()`.

**Expected result:**
- Return value: `{ success: true, wasActive: false }`.
- `listSenders()` returns one sender with id `"id-A"`.
- `getLastActiveSenderId()` still returns `"id-A"` (unchanged).
- Polling continues uninterrupted.

---

## TC-06-02 — Delete active sender stops polling and clears session

**Priority:** P1

**Description:** Verify that deleting the currently active sender stops polling, destroys the API client, and clears `lastActiveSenderId`.

**Preconditions:**
- Store has one sender: `"id-A"`.
- `lastActiveSenderId = "id-A"`.
- Polling is active.

**Steps:**
1. Call `window.electron.deleteSender("id-A")`.
2. Await the result.
3. Call `listSenders()`.
4. Call `getLastActiveSenderId()`.
5. Check polling state (e.g., confirm no further API calls are made).

**Expected result:**
- Return value: `{ success: true, wasActive: true }`.
- `listSenders()` returns `[]`.
- `getLastActiveSenderId()` returns `null`.
- Polling is stopped.
- API client is destroyed.

---

## TC-06-03 — Delete active sender when multiple senders exist

**Priority:** P1

**Description:** Verify that deleting the active sender with other senders remaining still stops the session and only removes the active one.

**Preconditions:**
- Store has two senders: `"id-A"` (active) and `"id-B"` (inactive).
- `lastActiveSenderId = "id-A"`.

**Steps:**
1. Call `window.electron.deleteSender("id-A")`.
2. Call `listSenders()`.
3. Call `getLastActiveSenderId()`.

**Expected result:**
- Return value: `{ success: true, wasActive: true }`.
- `listSenders()` returns one sender with id `"id-B"` (still present).
- `getLastActiveSenderId()` returns `null`.
- Polling is stopped.

---

## TC-06-04 — Unknown senderId returns error

**Priority:** P1

**Description:** Verify that attempting to delete a non-existent sender returns an error without modifying the store.

**Preconditions:**
- Store has one sender: `"id-A"`.

**Steps:**
1. Call `window.electron.deleteSender("does-not-exist")`.
2. Call `listSenders()`.

**Expected result:**
- Return value: `{ success: false, error: "Sender not found" }`.
- `listSenders()` still returns one sender with id `"id-A"` (store unchanged).
- Polling is unaffected.

---

## TC-06-05 — Encrypted token is removed from the store file after delete

**Priority:** P1

**Description:** Verify that the deleted sender's `encryptedToken` is not present in the persisted store file (credential cleanup).

**Preconditions:**
- Store has one sender `"id-A"` with a known `encryptedToken` value.

**Steps:**
1. Note the `encryptedToken` value of `"id-A"`.
2. Call `window.electron.deleteSender("id-A")`.
3. Read the raw `mailtrap-store.json` file from disk.

**Expected result:**
- The JSON file contains no entry with the noted `encryptedToken` value.
- The `senders` array in the file is empty (`[]`) or absent.

---

## TC-06-06 — Delete is idempotent: double-delete returns error on second call

**Priority:** P2

**Description:** Verify that calling `deleteSender` twice with the same id fails gracefully on the second call rather than throwing an unhandled error.

**Preconditions:**
- Store has one sender `"id-A"`.

**Steps:**
1. Call `window.electron.deleteSender("id-A")` — first call.
2. Call `window.electron.deleteSender("id-A")` — second call.

**Expected result:**
- First call: `{ success: true, wasActive: ... }`.
- Second call: `{ success: false, error: "Sender not found" }`.
- No exception thrown.

---

## TC-06-07 — Deleting active sender while polling is processing does not crash

**Priority:** P1

**Description:** Verify that deleting the active sender mid-poll cycle (while an API request may be in-flight) does not result in an unhandled exception or app crash.

**Preconditions:**
- Polling is active for sender `"id-A"`.
- A polling tick is in-flight (simulate with a delayed API mock response).

**Steps:**
1. Trigger a polling tick.
2. Before the tick completes, call `window.electron.deleteSender("id-A")`.
3. Allow the polling tick to complete (or time out).

**Expected result:**
- `deleteSender` returns `{ success: true, wasActive: true }`.
- Polling stops.
- No uncaught exception occurs.
- App remains stable.

---

## TC-06-08 — wasActive flag is false when sender is not the active one

**Priority:** P1

**Description:** Verify the `wasActive` flag accurately reflects whether the deleted sender was the active one.

**Preconditions:**
- Store has two senders: `"id-A"` (active, `lastActiveSenderId = "id-A"`) and `"id-B"`.

**Steps:**
1. Call `window.electron.deleteSender("id-B")`.

**Expected result:**
- Return value: `{ success: true, wasActive: false }`.

---

## TC-06-09 — Deleting the only sender transitions app to empty state (no active session)

**Priority:** P1

**Description:** Verify that after deleting the last sender, the app has no active session and the sender list is empty.

**Preconditions:**
- Store has exactly one sender: `"id-A"` (active).

**Steps:**
1. Call `window.electron.deleteSender("id-A")`.
2. Call `listSenders()`.
3. Call `getLastActiveSenderId()`.

**Expected result:**
- Return value: `{ success: true, wasActive: true }`.
- `listSenders()` returns `[]`.
- `getLastActiveSenderId()` returns `null`.
- The renderer should transition to the empty state of the Sender List screen once it handles `wasActive: true`.
