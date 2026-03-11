# Test Cases: US-01 — Extend Persistent Store for Sender List

**User Story:** As a developer, I want the JSON store to support a `senders` array and a `lastActiveSenderId` field, so that the app can persist multiple sender profiles without breaking existing stored data.

**References:** ARCHITECTURE.md §1, §3 | REQUIREMENTS.md FR-1 | USER_STORIES.md US-01

---

## TC-01-01 — Store initialises with empty senders array on fresh install

**Priority:** P1

**Description:** Verify that a fresh store (no existing file) returns an empty senders array and a null lastActiveSenderId, leaving all other defaults intact.

**Preconditions:**
- No `mailtrap-store.json` exists in the Electron userData directory.
- App process is freshly started.

**Steps:**
1. Launch the app for the first time (no prior store file).
2. From the main process, call `listSenders()`.
3. Call `getLastActiveSenderId()`.
4. Inspect `StoreData.settings` to confirm defaults are present.

**Expected result:**
- `listSenders()` returns `[]`.
- `getLastActiveSenderId()` returns `null`.
- `settings` field contains default `AppSettings` values (not undefined).
- No legacy `encryptedToken`, `accountId`, or `accountName` fields exist in the store file.

---

## TC-01-02 — SenderProfile shape is complete and correctly typed

**Priority:** P1

**Description:** Verify that a saved SenderProfile contains all required fields with the correct types as defined in the interface.

**Preconditions:**
- Fresh store (no existing data).
- A valid `SenderProfile` object is constructed in memory.

**Steps:**
1. Construct a `SenderProfile` with all required fields:
   - `id`: UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`)
   - `displayName`: `"Work"`
   - `encryptedToken`: non-empty base64 string
   - `accountId`: `12345` (number)
   - `accountName`: `"workaccount"` (string)
   - `createdAt`: ISO 8601 string (e.g., `"2026-03-11T10:00:00.000Z"`)
2. Call `saveSender(profile)`.
3. Call `listSenders()` and inspect the returned entry.

**Expected result:**
- `listSenders()` returns an array with one entry.
- The entry has all six fields: `id`, `displayName`, `encryptedToken`, `accountId`, `accountName`, `createdAt`.
- `accountId` is a number, not a string.
- `createdAt` is a valid ISO 8601 string.
- TypeScript compilation (`npx tsc --noEmit`) passes with no errors.

---

## TC-01-03 — saveSender persists a new sender profile to disk

**Priority:** P1

**Description:** Verify that `saveSender` writes the profile to the JSON store file and the data survives a store re-read.

**Preconditions:**
- Fresh store (no senders).

**Steps:**
1. Call `saveSender(profile)` with a valid profile object.
2. Read the raw `mailtrap-store.json` file from disk.
3. Call `listSenders()` again (cache busted or via a new store read).

**Expected result:**
- The JSON file contains a `senders` array with one entry.
- The entry in the file matches the profile passed to `saveSender`.
- `listSenders()` returns the same profile after re-read.

---

## TC-01-04 — saveSender upserts by id (update existing sender)

**Priority:** P1

**Description:** Verify that calling `saveSender` with the same `id` as an existing profile replaces it rather than creating a duplicate.

**Preconditions:**
- Store has one sender with id `"abc-123"`.

**Steps:**
1. Call `saveSender({ id: "abc-123", displayName: "Updated Name", ... })` with a modified `displayName`.
2. Call `listSenders()`.

**Expected result:**
- `listSenders()` returns exactly one sender (no duplicate).
- The returned sender has `displayName: "Updated Name"`.

---

## TC-01-05 — deleteSender removes the profile by id

**Priority:** P1

**Description:** Verify that `deleteSender` removes the matching profile and persists the change.

**Preconditions:**
- Store has two senders with ids `"id-A"` and `"id-B"`.

**Steps:**
1. Call `deleteSender("id-A")`.
2. Call `listSenders()`.
3. Read the raw JSON file from disk.

**Expected result:**
- `listSenders()` returns exactly one sender with id `"id-B"`.
- The JSON file no longer contains a sender with id `"id-A"`.
- The encrypted token from `"id-A"` is absent from the file.

---

## TC-01-06 — deleteSender with unknown id does not throw and leaves store unchanged

**Priority:** P2

**Description:** Verify that calling `deleteSender` with an id that does not exist is handled gracefully.

**Preconditions:**
- Store has one sender with id `"id-A"`.

**Steps:**
1. Call `deleteSender("nonexistent-id")`.
2. Call `listSenders()`.

**Expected result:**
- No exception is thrown.
- `listSenders()` still returns one sender with id `"id-A"`.

---

## TC-01-07 — getSenderById returns the correct profile or null

**Priority:** P1

**Description:** Verify that `getSenderById` retrieves a matching profile and returns null for unknown ids.

**Preconditions:**
- Store has one sender with id `"id-A"` and `displayName: "Work"`.

**Steps:**
1. Call `getSenderById("id-A")`.
2. Call `getSenderById("does-not-exist")`.

**Expected result:**
- First call returns the profile object with `displayName: "Work"`.
- Second call returns `null`.

---

## TC-01-08 — setLastActiveSenderId persists and getLastActiveSenderId retrieves

**Priority:** P1

**Description:** Verify round-trip persistence of `lastActiveSenderId`.

**Preconditions:**
- Fresh store.

**Steps:**
1. Call `setLastActiveSenderId("uuid-123")`.
2. Call `getLastActiveSenderId()`.
3. Call `setLastActiveSenderId(null)`.
4. Call `getLastActiveSenderId()` again.

**Expected result:**
- After step 2: returns `"uuid-123"`.
- After step 4: returns `null`.
- Both writes are reflected in `mailtrap-store.json` on disk.

---

## TC-01-09 — Legacy token/account functions remain callable (backwards compatibility)

**Priority:** P2

**Description:** Verify that the existing `saveToken`, `getToken`, `deleteToken`, `saveAccountId`, `getAccountId`, `saveAccountName`, `getAccountName` functions still exist and compile without errors, even though they are no longer called by IPC handlers.

**Preconditions:**
- Updated codebase on the `port587` branch.

**Steps:**
1. Run `npx tsc --noEmit`.
2. Inspect `electron/store.ts` to confirm the legacy functions are still exported.

**Expected result:**
- TypeScript compilation succeeds with zero errors.
- Legacy functions are present in `electron/store.ts` (not deleted).

---

## TC-01-10 — Multiple senders can be saved and listed in insertion order

**Priority:** P2

**Description:** Verify the store supports multiple senders and preserves their insertion order.

**Preconditions:**
- Fresh store.

**Steps:**
1. Call `saveSender(profileA)` where `profileA.displayName = "Alpha"`.
2. Call `saveSender(profileB)` where `profileB.displayName = "Beta"`.
3. Call `saveSender(profileC)` where `profileC.displayName = "Gamma"`.
4. Call `listSenders()`.

**Expected result:**
- Returns an array of three senders.
- Order is `["Alpha", "Beta", "Gamma"]` (insertion order preserved).
- No data loss between saves.
