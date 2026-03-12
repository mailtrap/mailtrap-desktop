# Technical Decisions (ADR Log)

This file records architectural decision records (ADRs) for the Mailtrap Desktop agent team. Each entry documents a design choice, the alternatives considered, and the rationale.

---

## ADR-001: Multi-sender store design — flat senders array

**Status:** Accepted
**Date:** 2026-03-11
**Work item:** `senders/add-sender-selection`

### Context

The store (`electron/store.ts`) currently holds a single sender's credentials as top-level fields (`encryptedToken`, `accountId`, `accountName`). We need to support N saved senders.

Two structural approaches were considered:

**Option A — Flat array (`senders: SenderProfile[]`):**
The store gains a top-level `senders` array. Each element is a `SenderProfile` object with its own `encryptedToken`. A separate `lastActiveSenderId` string pointer identifies the active sender.

**Option B — Nested / keyed object (`senders: Record<string, SenderProfile>`):**
Senders are stored as a dictionary keyed by sender ID. The active pointer is the same `lastActiveSenderId` string.

### Decision

Use **Option A** (flat array).

### Rationale

- The array is the natural representation for an ordered list that the UI renders. No secondary sort or `Object.values` transform is needed at read time.
- JSON serialisation of arrays is straightforward and human-readable in the store file.
- The number of senders is expected to be small (single digits in practice). Linear scan for `getSenderById` is negligible.
- An object keyed by UUID would require no additional lookup cost, but adds cognitive overhead (keys and values carry the same ID) and makes migration from the legacy single-sender format slightly more complex.
- `saveSender` implements an upsert by scanning for a matching `id` and replacing in-place, preserving array order. This is a one-liner with `findIndex`.

### Consequences

- Store reads are O(n) for ID lookups. Acceptable for n < ~100; revisit if the feature ever needs to support dozens of senders with auto-complete UI.
- The array is iterable directly for the `auth:list-senders` IPC response.

---

## ADR-002: Token never exposed to renderer

**Status:** Accepted
**Date:** 2026-03-11
**Work item:** `senders/add-sender-selection`

### Context

The current app receives the raw API token from the renderer (via `auth:login`) and also returns it implicitly through `auth:restore`. We need to ensure that with the new multi-sender design, stored tokens cannot be extracted by a compromised renderer process.

Two approaches:

**Option A — Tokens stay in main process:**
IPC handlers accept `(displayName, token)` once (to add a sender) and never return a token back. All token usage (init API client, verify) happens in the main process. The renderer only ever receives `SenderProfilePublic` (no `encryptedToken` field).

**Option B — Token round-trip allowed:**
When the renderer needs to re-verify or switch senders, the main process decrypts and returns the token to the renderer to pass back. Simpler handler logic for some edge cases.

### Decision

Use **Option A** — tokens never leave the main process after initial save.

### Rationale

- Electron's renderer process runs in a sandboxed Chromium context, but it is still web content and is the attack surface most likely to be targeted by third-party code (e.g. a supply-chain attack on a renderer dependency).
- Once a token is in the renderer's JavaScript heap it can be read by any code running in that context. Keeping tokens exclusively in the main process and `safeStorage`-encrypted at rest provides defence-in-depth.
- This pattern is consistent with what `auth:restore` does (it reads the token in the main process and initialises the Axios client there; the renderer only receives non-sensitive fields: `accountId`, `accountName`, `senderId`, and `senderDisplayName`).
- `SenderProfilePublic = Omit<SenderProfile, 'encryptedToken'>` enforces this at the type system level — passing a `SenderProfile` where a `SenderProfilePublic` is expected is a compile error.

### Consequences

- All token-requiring operations (`selectSender`, `addSender`, restore) are IPC calls handled exclusively in the main process.
- The renderer cannot cache or inspect the token for debugging. Developers who need to verify token-related issues should check HTTP response status codes in the main process logs. Never log raw tokens — use redacted placeholders (e.g., `token: ***${last4}`) if token identification is needed.
- Revoked-token detection relies on the 401 HTTP response from the API, not on renderer-side token inspection.

---

## ADR-003: Cache not sender-scoped in v1

**Status:** Accepted (v1 only — revisit in v2)
**Date:** 2026-03-11
**Work item:** `senders/add-sender-selection`

### Context

All caches (inbox summaries, sending stats, messages, emails) are stored in the global JSON store with keys that do not include a sender ID (e.g., `${domainId}_${timeRange}`, numeric inbox ID). If a user switches senders, the new sender may see stale cached data from the previous sender.

Two approaches for v1:

**Option A — Keep cache global (not sender-scoped):**
No changes to cache keys or cache invalidation logic. The new sender briefly sees old data; polling refreshes it within the polling interval (1 min for sandbox, 5 min for sending).

**Option B — Scope cache by sender ID:**
Cache keys are prefixed with `senderId`. On sender switch, either clear all cache or the renderer ignores old-sender entries. Requires changing every cache read/write call.

### Decision

Use **Option A** — cache remains global, not sender-scoped, in v1.

### Rationale

- Sender switching is expected to be an infrequent action (typically once per session, if at all). The brief data bleed is a minor UX issue, not a correctness issue (the data becomes correct after the first poll).
- Scoping cache by sender would require changes to every cache function (`getSendingStatsCache`, `getInboxSummariesCache`, `getMessagesCache`, `getEmailCache`, etc.) and every IPC handler that writes cache. The blast radius is large and the benefit is small for an infrequent operation.
- Cache staleness is already an inherent property of the design (the renderer fetches fresh data in the background after loading from cache). Users already see briefly-stale data on every app launch.
- The inbox/email cache data is mostly harmless if shown briefly from the wrong sender (it's non-sensitive overview data).

### Consequences

- All caches are cleared on sender switch (`clearAllCaches()` is called in `auth:add-sender` and `auth:select-sender` handlers), so stale data from the previous sender is not displayed. However, cache is still not keyed by sender — if the user switches back, data must be re-fetched.
- After switching senders, the UI shows empty/loading state until the first poll completes.
- If a domain ID from sender A happens to match a domain ID from sender B (unlikely but theoretically possible), the stats cache entry will be incorrectly reused. This is an accepted v1 risk.
- A future v2 improvement would prefix all cache keys with `senderId` and flush keys for the previous sender on activation. This change is isolated to `store.ts` and the cache-write IPC handlers.

### Revisit trigger

Implement sender-scoped cache if: (a) users frequently switch between senders with disjoint data, or (b) the stale-data bleed causes confusion in user testing or support tickets.
