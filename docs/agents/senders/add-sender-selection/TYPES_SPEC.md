# Types Spec: Add Sender Selection

**Branch:** `port587`
**Work area:** `senders/add-sender-selection`

All new types belong in `electron/api/types.ts` unless noted otherwise.

---

## 1. Core domain types

### `SenderProfile`

Full sender record. Stored in `StoreData.senders[]`. Never sent to the renderer.

```typescript
export interface SenderProfile {
  /** Locally generated UUID v4. */
  id: string
  /** User-assigned label, 1–80 characters. */
  displayName: string
  /** Base64-encoded safeStorage-encrypted token. Main process only. */
  encryptedToken: string
  /** Mailtrap account ID, resolved at save time via GET /api/accounts. */
  accountId: number
  /** Mailtrap account name, resolved at save time. */
  accountName: string
  /** ISO 8601 creation timestamp. */
  createdAt: string
}
```

### `SenderProfilePublic`

Renderer-safe projection of `SenderProfile`. The `encryptedToken` field is omitted. This is the type returned by `auth:list-senders` and embedded in IPC success responses.

```typescript
export type SenderProfilePublic = Omit<SenderProfile, 'encryptedToken'>
```

Using `Omit` ensures `SenderProfilePublic` automatically stays in sync if `SenderProfile` gains new non-sensitive fields.

---

## 2. IPC response types

All IPC responses are plain objects (no class instances). The discriminated union pattern `{ success: true; ... } | { success: false; error: string }` is used consistently.

### `AddSenderResult`

Response from `auth:add-sender`.

```typescript
export type AddSenderResult =
  | { success: true;  senderId: string; accountId: number; accountName: string }
  | { success: false; error: string }
```

### `SelectSenderResult`

Response from `auth:select-sender`.

```typescript
export type SelectSenderResult =
  | { success: true;  senderId: string; accountId: number; accountName: string }
  | { success: false; error: string }
```

### `DeleteSenderResult`

Response from `auth:delete-sender`.

```typescript
export type DeleteSenderResult =
  | { success: true;  wasActive: boolean }
  | { success: false; error: string }
```

### `RestoreAuthResult`

Updated response from `auth:restore`. The `senderId` field is new; it is optional to preserve backwards compatibility with any call site that ignores it.

```typescript
export type RestoreAuthResult =
  | { authenticated: true;  accountId: number; accountName?: string; senderId: string; senderDisplayName: string }
  | { authenticated: false }
```

---

## 3. Store interface changes

In `electron/store.ts`, the `StoreData` interface gains:

```typescript
interface StoreData {
  /** List of saved sender profiles (main process only — contains encrypted tokens). */
  senders?: SenderProfile[]

  /** ID of the sender that was most recently activated. Null/absent = no active session. */
  lastActiveSenderId?: string

  /** @deprecated Migrated to senders[]. Left readable for the migration routine only. */
  encryptedToken?: string
  /** @deprecated Migrated to senders[]. Left readable for the migration routine only. */
  accountId?: number
  /** @deprecated Migrated to senders[]. Left readable for the migration routine only. */
  accountName?: string

  // ... (all existing fields unchanged)
}
```

The deprecated fields remain in the interface so TypeScript does not error when the migration code reads them from the raw JSON. They are deleted from the in-memory object (and written to disk without them) after migration.

---

## 4. Zustand store changes (`src/stores/appStore.ts`)

```typescript
interface AppState {
  // Auth
  isAuthenticated:   boolean
  accountId:         number | null
  accountName:       string | null
  senderId:          string | null   // NEW — UUID of the active sender
  senderDisplayName: string | null   // NEW — user-assigned label, used in TitleBar and tray
  isLoading:         boolean

  // Actions
  setAuthenticated:   (accountId: number, accountName?: string, senderId?: string, senderDisplayName?: string) => void
  setUnauthenticated: () => void
  setLoading:         (loading: boolean) => void
}
```

`senderId` and `senderDisplayName` start as `null`. `setAuthenticated` sets both from the third and fourth arguments (default to `null` if omitted — backwards-compatible with existing callers). `setUnauthenticated` resets both to `null`.

Call-site changes:
- `App.tsx`: pass `result.senderId` and the corresponding display name to `setAuthenticated` after `restoreAuth`. The display name must come from the `SenderProfilePublic` list (loaded separately) or be included in the `RestoreAuthResult`.
- `SenderList.tsx`: pass `result.senderId` and `sender.displayName` after `selectSender` success.
- `AddSender.tsx`: pass `result.senderId` and the user-entered `displayName` after `addSender` success.

Note on `restoreAuth` + `senderDisplayName`: to avoid an extra IPC round-trip, `RestoreAuthResult` should include `senderDisplayName` in its success branch. The handler can read it cheaply from the profile in the store. Update `RestoreAuthResult` accordingly:

```typescript
export type RestoreAuthResult =
  | { authenticated: true;  accountId: number; accountName?: string; senderId: string; senderDisplayName: string }
  | { authenticated: false }
```

---

## 5. ElectronAPI additions (`electron/preload.ts`)

New import at top of file:
```typescript
import type {
  SenderProfilePublic,
  AddSenderResult,
  SelectSenderResult,
  DeleteSenderResult,
  RestoreAuthResult,
} from './api/types'
```

New methods added to `ElectronAPI`:
```typescript
export interface ElectronAPI {
  // ... (existing methods unchanged)

  // Sender management
  listSenders:  () => Promise<SenderProfilePublic[]>
  addSender:    (displayName: string, token: string) => Promise<AddSenderResult>
  selectSender: (senderId: string) => Promise<SelectSenderResult>
  deleteSender: (senderId: string) => Promise<DeleteSenderResult>
}
```

The `restoreAuth` return type is updated to `Promise<RestoreAuthResult>` from the existing inline object type. This is a structural change only; the runtime shape is backwards compatible.

---

## 6. Internal store helpers (main process only)

These function signatures are added to `electron/store.ts`. They are not exported through the IPC bridge.

```typescript
// Returns all sender profiles (including encryptedToken — main process only)
export function listSenders(): SenderProfile[]

// Upsert: if a profile with this id already exists it is replaced; otherwise appended
export function saveSender(profile: SenderProfile): void

// Removes sender by id; no-op if id not found
export function deleteSender(id: string): void

// Returns the profile with the given id, or null
export function getSenderById(id: string): SenderProfile | null

// Returns lastActiveSenderId or null
export function getLastActiveSenderId(): string | null

// Persists lastActiveSenderId; call with null to clear it
export function setLastActiveSenderId(id: string | null): void
```

Additional exported helper (consumed by `tray.ts`):
```typescript
// Returns the displayName of the currently active sender, or null if no session
export function getActiveSenderDisplayName(): string | null
```

This allows `tray.ts` to prepend "Connected as: {displayName}" to the tray menu without needing an IPC call.

Internal-only (not exported, lives in store.ts):
```typescript
// Encrypts a plain-text token using safeStorage when available; base64 fallback
function encryptToken(token: string): string

// Decrypts a stored base64 token string back to plain text
function decryptToken(encrypted: string): string | null
```

These replace the current `saveToken` / `getToken` pattern. The legacy `saveToken` / `getToken` / `deleteToken` / `saveAccountId` / `getAccountId` / `saveAccountName` / `getAccountName` exports remain in the file for the duration of this work item (they are still referenced by `auth:login` which is kept for backwards compatibility). They can be removed in a future cleanup.

---

## 7. Type safety notes

- `SenderProfile.encryptedToken` is typed as `string`, not `Buffer`, because the store serialises to JSON (which does not support `Buffer`). The encrypted value is always base64-encoded before storage.
- `crypto.randomUUID()` returns `string` with no type import needed in Node.js 14.17+ / TypeScript 4.4+ (available via `lib: ["ES2021"]` or newer in `tsconfig`). Confirm `tsconfig.json` includes `"ES2021"` or add `"lib": ["ES2021", "DOM"]` if missing.
- The `Omit<SenderProfile, 'encryptedToken'>` for `SenderProfilePublic` means any code that accidentally tries to read `.encryptedToken` on a `SenderProfilePublic` will be a compile-time error.
- All new IPC handler functions must have explicit return types matching the union types above so TypeScript enforces exhaustive handling of the `success` / `error` branches.
