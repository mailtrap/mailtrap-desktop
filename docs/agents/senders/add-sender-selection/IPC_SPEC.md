# IPC Spec: Add Sender Selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`

All IPC uses `ipcMain.handle` / `ipcRenderer.invoke` (request-response). The preload bridge exposes every method on `window.electron`. Types are defined in `TYPES_SPEC.md`.

---

## New Channels

---

### `auth:list-senders`

**Direction:** renderer → main
**Purpose:** Return all saved sender profiles, without tokens, so the Sender List screen can display them.

**Request:** No arguments.

**Response:**
```typescript
SenderProfilePublic[]
```
Always returns an array (empty array when no senders saved). Never throws.

**Handler logic (`handlers.ts`):**
```
const profiles = listSenders()           // reads StoreData.senders[]
return profiles.map(toPublicProfile)     // strips encryptedToken
```

`toPublicProfile` is a pure helper: `({ id, displayName, accountId, accountName, createdAt }) => SenderProfilePublic`.

**Error cases:** None. If the store is unreadable the store module falls back to defaults (empty senders array), so an empty array is returned.

**ElectronAPI method:**
```typescript
listSenders: () => Promise<SenderProfilePublic[]>
```

**Preload implementation:**
```typescript
listSenders: () => ipcRenderer.invoke('auth:list-senders'),
```

---

### `auth:add-sender`

**Direction:** renderer → main
**Purpose:** Validate a new API token, save a new sender profile, activate the session, and start polling.

**Request arguments:** `(displayName: string, token: string)`

**Response:**
```typescript
AddSenderResult:
  | { success: true;  senderId: string; accountId: number; accountName: string }
  | { success: false; error: string }
```

**Handler logic (`handlers.ts`):**
```
1. Trim displayName and token.
2. If displayName is empty → return { success: false, error: 'Display name is required' }
3. If displayName.length > 80 → return { success: false, error: 'Display name must be 80 characters or fewer' }
4. If token is empty → return { success: false, error: 'API token is required' }

5. destroyApiClients()
6. initApiClients(token)

7. accounts = await getAccounts()               // GET /api/accounts
   → if accounts.length === 0 throw 'No accounts found for this API token'

8. accountId  = accounts[0].id
   accountName = accounts[0].name

9. existing = listSenders().find(s => s.accountId === accountId)
   if (existing) → destroyApiClients()
                   return { success: false, error: `This account is already saved as "${existing.displayName}"` }

10. profile = {
      id:             crypto.randomUUID(),
      displayName:    displayName.trim(),
      encryptedToken: encryptToken(token),      // same encryption as current saveToken()
      accountId,
      accountName,
      createdAt:      new Date().toISOString()
    }
11. saveSender(profile)
12. setLastActiveSenderId(profile.id)
13. startPolling()
14. return { success: true, senderId: profile.id, accountId, accountName }

on catch(error):
  destroyApiClients()
  return { success: false, error: error.message ?? 'Authentication failed' }
```

The `encryptToken` helper (internal to `store.ts`) mirrors today's `saveToken` logic: uses `safeStorage.encryptString` when available, falls back to base64.

**Error cases:**
| Condition | Error message |
|---|---|
| Empty display name | `'Display name is required'` |
| Display name > 80 chars | `'Display name must be 80 characters or fewer'` |
| Empty token | `'API token is required'` |
| API returns 401 | Axios error message (e.g., `'Request failed with status code 401'`) |
| `accountId` already in senders | `'This account is already saved as "<displayName>"'` |
| Network timeout (15 s) | Axios timeout error message |
| No accounts returned | `'No accounts found for this API token'` |

**ElectronAPI method:**
```typescript
addSender: (displayName: string, token: string) => Promise<AddSenderResult>
```

**Preload implementation:**
```typescript
addSender: (displayName, token) => ipcRenderer.invoke('auth:add-sender', displayName, token),
```

---

### `auth:select-sender`

**Direction:** renderer → main
**Purpose:** Activate a previously saved sender by ID, verifying the token is still valid, then start polling.

**Request arguments:** `(senderId: string)`

**Response:**
```typescript
SelectSenderResult:
  | { success: true;  accountId: number; accountName: string; senderId: string }
  | { success: false; error: string }
```

**Handler logic (`handlers.ts`):**
```
1. profile = getSenderById(senderId)
   if (!profile) → return { success: false, error: 'Sender not found' }

2. token = decryptToken(profile.encryptedToken)   // internal to store.ts
   if (!token) → return { success: false, error: 'Could not read stored credentials' }

3. destroyApiClients()
4. initApiClients(token)

5. accounts = await getAccounts()               // GET /api/accounts — live verification
   → if accounts.length === 0 throw 'No accounts found for this token'

6. setLastActiveSenderId(senderId)
7. startPolling()
8. return { success: true, accountId: profile.accountId, accountName: profile.accountName, senderId }

on catch(error):
  destroyApiClients()
  return { success: false, error: error.message ?? 'Could not connect to this sender' }
```

Note: `accountId` and `accountName` are returned from the stored profile, not from the live API response, to be consistent with what was saved. If the account was renamed on the Mailtrap side since the sender was saved, v1 does not update the stored name. This is an accepted v1 limitation.

**Error cases:**
| Condition | Error message |
|---|---|
| senderId not in store | `'Sender not found'` |
| Cannot decrypt token | `'Could not read stored credentials'` |
| API returns 401 | Axios error message |
| Network timeout | Axios timeout message |

**ElectronAPI method:**
```typescript
selectSender: (senderId: string) => Promise<SelectSenderResult>
```

**Preload implementation:**
```typescript
selectSender: (senderId) => ipcRenderer.invoke('auth:select-sender', senderId),
```

---

### `auth:delete-sender`

**Direction:** renderer → main
**Purpose:** Permanently remove a saved sender profile. If the sender was active, also end the session.

**Request arguments:** `(senderId: string)`

**Response:**
```typescript
DeleteSenderResult:
  | { success: true;  wasActive: boolean }
  | { success: false; error: string }
```

**Handler logic (`handlers.ts`):**
```
1. profile = getSenderById(senderId)
   if (!profile) → return { success: false, error: 'Sender not found' }

2. wasActive = getLastActiveSenderId() === senderId

3. if (wasActive):
     stopPolling()
     destroyApiClients()
     setLastActiveSenderId(null)

4. deleteSender(senderId)
5. return { success: true, wasActive }
```

**Error cases:**
| Condition | Error message |
|---|---|
| senderId not in store | `'Sender not found'` |

**ElectronAPI method:**
```typescript
deleteSender: (senderId: string) => Promise<DeleteSenderResult>
```

**Preload implementation:**
```typescript
deleteSender: (senderId) => ipcRenderer.invoke('auth:delete-sender', senderId),
```

---

## Changed Channels

---

### `auth:restore` (updated)

**Change:** Reads from `lastActiveSenderId` + `senders[]` instead of the legacy `encryptedToken` / `accountId` / `accountName` fields.

**Response type change:** Adds `senderId` and `senderDisplayName` to the success shape.

```typescript
// Before
{ authenticated: true;  accountId: number; accountName?: string }
{ authenticated: false }

// After
{ authenticated: true;  accountId: number; accountName?: string; senderId: string; senderDisplayName: string }
{ authenticated: false }
```

**Handler logic (updated):**
```
1. readStore() — migration runs here if needed

2. senderId = getLastActiveSenderId()
   if (!senderId) → return { authenticated: false }

3. profile = getSenderById(senderId)
   if (!profile) → return { authenticated: false }

4. token = decryptToken(profile.encryptedToken)
   if (!token) → return { authenticated: false }

5. initApiClients(token)
6. startPolling()
7. return { authenticated: true, accountId: profile.accountId, accountName: profile.accountName, senderId, senderDisplayName: profile.displayName }
```

No token-validity API call at startup (same as today's auth:restore). Token is assumed valid until the user explicitly activates it.

**ElectronAPI method — updated signature:**
```typescript
restoreAuth: () => Promise<{
  authenticated: boolean
  accountId?: number
  accountName?: string
  senderId?: string
  senderDisplayName?: string
}>
```

The `senderId` and `senderDisplayName` fields are optional so existing callers that ignore them are unaffected.

---

### `auth:logout` (updated)

**Change:** Stops session (polling, API client, clears `lastActiveSenderId`) without deleting sender profiles. Removes the call to `deleteToken()`.

**Response type:** Unchanged — `{ success: true }`.

**Handler logic (updated):**
```
1. stopPolling()
2. destroyApiClients()
3. setLastActiveSenderId(null)
4. return { success: true }
```

Removed: `deleteToken()` call. The sender list is preserved on logout.

**ElectronAPI method:** Signature unchanged — `logout: () => Promise<{ success: boolean }>`.

---

### `auth:get-token` (unchanged, kept for compatibility)

Still returns `boolean` — whether any session is restorable. In the new model this can remain as-is (returns `getToken() !== null` which reads the legacy field; after migration this always returns `false` for the field, but the channel is not called by the new renderer code anyway). This channel may be removed in a future cleanup pass.

### `auth:login` (unchanged, kept for compatibility)

The `auth:login` channel continues to exist for backwards compatibility. It is superseded by `auth:add-sender` in the renderer but is not removed in this iteration. It still operates on the legacy `saveToken` / `saveAccountId` / `saveAccountName` functions.

---

## ElectronAPI Interface — Full Additions

These are the additions to the `ElectronAPI` interface in `electron/preload.ts`:

```typescript
// Sender management
listSenders:  () => Promise<SenderProfilePublic[]>
addSender:    (displayName: string, token: string) => Promise<AddSenderResult>
selectSender: (senderId: string) => Promise<SelectSenderResult>
deleteSender: (senderId: string) => Promise<DeleteSenderResult>
```

The `restoreAuth` return type is updated (see above).

No other method signatures change.
