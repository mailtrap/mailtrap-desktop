# Test Cases: US-02 — Migrate Legacy Single-Sender Store

**User Story:** As a returning user with an existing installation, I want my saved token and account info to be automatically converted to a sender profile, so that I don't have to re-enter my credentials after the update.

**References:** ARCHITECTURE.md §2 | REQUIREMENTS.md FR-1.4 | USER_STORIES.md US-02 | IPC_SPEC.md auth:restore

---

## TC-02-01 — Migration converts legacy store to a single SenderProfile

**Priority:** P1

**Description:** Verify that a store file containing the legacy `encryptedToken` / `accountId` / `accountName` fields is automatically migrated to a `senders` array on first read.

**Preconditions:**
- `mailtrap-store.json` exists with the legacy format:
  ```json
  {
    "encryptedToken": "<base64-encoded-token>",
    "accountId": 42,
    "accountName": "legacyuser",
    "settings": { ... }
  }
  ```
- The `senders` field is absent.

**Steps:**
1. Start the app (or invoke `readStore()` in the main process).
2. Call `listSenders()`.
3. Call `getLastActiveSenderId()`.
4. Read the raw `mailtrap-store.json` file from disk.

**Expected result:**
- `listSenders()` returns exactly one `SenderProfile`.
- The profile has:
  - `displayName: "legacyuser"` (same as legacy `accountName`)
  - `encryptedToken`: the same base64 value as the legacy field
  - `accountId: 42`
  - `accountName: "legacyuser"`
  - `id`: a non-empty UUID string
  - `createdAt`: a valid ISO 8601 timestamp
- `getLastActiveSenderId()` returns the new profile's `id`.
- The raw JSON file no longer contains the top-level `encryptedToken`, `accountId`, or `accountName` fields.

---

## TC-02-02 — Migration uses "My account" fallback when accountName is missing

**Priority:** P1

**Description:** Verify that migration creates a valid profile even when the legacy store has no `accountName`.

**Preconditions:**
- `mailtrap-store.json` contains:
  ```json
  {
    "encryptedToken": "<base64-encoded-token>",
    "accountId": 7
  }
  ```
- `accountName` field is absent.

**Steps:**
1. Invoke `readStore()`.
2. Call `listSenders()` and inspect the returned profile.

**Expected result:**
- One profile is created.
- `profile.displayName` is `"My account"`.
- `profile.accountName` is `""` (empty string).
- `profile.accountId` is `7`.
- Migration does not throw.

---

## TC-02-03 — Migration uses accountId fallback of 0 when accountId is missing

**Priority:** P1

**Description:** Verify the defensive fallback for a legacy store where `accountId` was never written (edge case that should not occur in practice but must be handled).

**Preconditions:**
- `mailtrap-store.json` contains:
  ```json
  {
    "encryptedToken": "<base64-encoded-token>",
    "accountName": "partial"
  }
  ```
- `accountId` field is absent.

**Steps:**
1. Invoke `readStore()`.
2. Call `listSenders()` and inspect the returned profile.

**Expected result:**
- One profile is created.
- `profile.accountId` is `0`.
- `profile.displayName` is `"partial"`.
- Migration completes without throwing.

---

## TC-02-04 — Migration is idempotent: running twice produces one profile

**Priority:** P1

**Description:** Verify that invoking `readStore()` (and thus migration) a second time after migration has already run does not create a duplicate sender or corrupt the store.

**Preconditions:**
- Migration has already run once (store now has `senders: [...]` and no legacy fields).
- A second `readStore()` call is made (e.g., app relaunched).

**Steps:**
1. Confirm store is in post-migration state (one sender, no legacy fields).
2. Invoke `readStore()` again (simulating a second app launch).
3. Call `listSenders()`.

**Expected result:**
- `listSenders()` still returns exactly one sender.
- No new profile is created.
- The existing profile's `id` and `createdAt` are unchanged.
- `lastActiveSenderId` still points to the same profile.

---

## TC-02-05 — Migration does not run when senders array already exists

**Priority:** P1

**Description:** Verify that if `senders` is already populated (even if legacy fields somehow exist), migration is skipped entirely.

**Preconditions:**
- `mailtrap-store.json` contains both a `senders` array and legacy `encryptedToken`:
  ```json
  {
    "senders": [{ "id": "existing-id", "displayName": "Existing", ... }],
    "encryptedToken": "<stale-token>",
    "accountId": 99
  }
  ```

**Steps:**
1. Invoke `readStore()`.
2. Call `listSenders()`.

**Expected result:**
- `listSenders()` returns the existing single entry with `id: "existing-id"`.
- No additional profile is created from the legacy fields.
- The legacy fields remain in the file as-is (migration body did not run, so it did not delete them — the existing profile guard triggers the early return).

---

## TC-02-06 — Migration does not run on a completely fresh store (no token)

**Priority:** P1

**Description:** Verify that a fresh install with no token does not trigger migration or create phantom profiles.

**Preconditions:**
- No `mailtrap-store.json` file, or a file with only `settings` and no `encryptedToken`.

**Steps:**
1. Invoke `readStore()`.
2. Call `listSenders()`.
3. Call `getLastActiveSenderId()`.

**Expected result:**
- `listSenders()` returns `[]`.
- `getLastActiveSenderId()` returns `null`.
- No profile is created.

---

## TC-02-07 — Migrated store is written to disk (migration result persists)

**Priority:** P1

**Description:** Verify that migration writes the updated store to disk immediately, so a subsequent cold-start reads the migrated state instead of re-running migration.

**Preconditions:**
- Legacy store with `encryptedToken`, `accountId`, `accountName` present.

**Steps:**
1. Invoke `readStore()` (migration runs).
2. Read the raw `mailtrap-store.json` file from disk before any further writes.
3. Parse the file contents.

**Expected result:**
- The file contains a `senders` array with one entry.
- The file contains `lastActiveSenderId` pointing to the new profile.
- Top-level `encryptedToken`, `accountId`, `accountName` are absent from the file.

---

## TC-02-08 — auth:restore triggers migration on first launch after update

**Priority:** P1

**Description:** Verify the end-to-end migration integration: when `auth:restore` is called with a legacy store, migration runs and the session is restored from the resulting sender profile.

**Preconditions:**
- Legacy store present with a valid `encryptedToken`, `accountId: 42`, `accountName: "myaccount"`.
- The Mailtrap API is not actually called (auth:restore does not verify token).

**Steps:**
1. Call the `auth:restore` IPC handler.
2. Inspect the returned value.
3. Call `listSenders()` to confirm migration side-effects.

**Expected result:**
- `auth:restore` returns `{ authenticated: true, accountId: 42, accountName: "myaccount", senderId: <uuid>, senderDisplayName: "myaccount" }`.
- `listSenders()` returns one profile with the migrated data.
- Legacy fields are removed from the store file.

---

## TC-02-09 — Long accountName (>80 chars) is preserved during migration

**Priority:** P2

**Description:** Verify that a legacy accountName exceeding 80 characters does not cause a validation failure or data loss. Migration stores the full accountName as-is — the 80-char limit only applies to user-entered names in the Add Sender form, not to migrated data.

**Preconditions:**
- Legacy store with `accountName` of 100 characters.

**Steps:**
1. Invoke `readStore()`.
2. Call `listSenders()`.

**Expected result:**
- Migration completes without throwing.
- A profile is created.
- `profile.displayName` is the full 100-character `accountName` (no truncation during migration).

---

## TC-02-10 — Store with empty senders array triggers migration

**Priority:** P2

**Description:** Verify that when `senders` is present but empty (`[]`) and a legacy `encryptedToken` exists, migration runs and creates a profile. The guard condition `!store.senders || store.senders.length === 0` treats an empty array the same as absent.

**Preconditions:**
- `mailtrap-store.json` contains:
  ```json
  {
    "senders": [],
    "encryptedToken": "<token>"
  }
  ```

**Steps:**
1. Invoke `readStore()`.
2. Call `listSenders()`.

**Expected result:**
- Migration runs because `senders.length === 0` and `encryptedToken` is present.
- `listSenders()` returns one profile created from the legacy token.
- Legacy fields are removed from the store file.
