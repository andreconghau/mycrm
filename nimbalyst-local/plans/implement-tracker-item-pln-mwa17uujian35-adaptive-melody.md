# R1-04 · M02 · Contacts — Implementation Plan

Tracker: `pln_mwa17uujian357` (CCA.8 — local key only, never in commit messages).
Prerequisite: R1-03 (M01 Customers) — verified present in code, tracker status `in-review`.

---

## Context

M02 Contacts is the second half of R1.1 Master data (`docs/modules/RELEASES.md`) and is currently **`Status: PLANNED — NOT IMPLEMENTED`** (`docs/modules/contacts.md`). Today `/contacts` renders synthetic prototype rows from `src/constants/dummy/contacts.json` via `src/modules/routing/r1-route-data.ts:53`; there is no `contacts` API, no Drizzle table and no `contacts` permission resource. Downstream R1 modules already depend on a real contact: `rfqs.contact_id`, `samples.contact_id`, `lead_conversions.contact_id` and `record_links.contact_id` are dangling logical references in the baseline schema.

The business need: manage people at buyer companies with recipient role/context, multiple channels, consent, an explicit primary per context, and deactivation that preserves history. Two distinct people at the same buyer must be able to share an email **after a warning**, keeping separate IDs and separate history — normalized email is a *duplicate hint*, never an identity key. And because `contacts` carries no `owner_id`/`team_id`, every read and write must derive record scope from the **parent customer**, including the current-ownership path *and* R1-03's former-owner historical path.

### Key finding: no migration is needed

The four M02 tables already exist in the fingerprinted R1 baseline `docs/structure/01_init_20261106.sql:212-266` (`contacts`, `contact_channels`, `contact_preferences`, `customer_primary_contacts`), with every index at lines 969-1165 and all `COMMENT ON` statements from 1533. Verified live against `seafood_crm` via the `postgres` MCP (`dev` profile, read-only): all four exist, plus `files`. `scripts/migrate.ts:13` checksums that baseline, so **it must not be edited**. R1-04 therefore ships **no SQL file at all** — it adds Drizzle definitions over tables that are already there, and the existing `UNIQUE`/`CHECK`/partial-unique constraints are the enforcement mechanism.

This satisfies the reference task's "versioned SQL-only migrations" constraint by having nothing to migrate; it is not a shortcut.

### Second finding: the baseline already designed per-contact history

`record_links` has a `contact_id` column with `CHECK (num_nonnulls(...) = 1)` (`01_init:797-805`), and `history_snapshots` is keyed `UNIQUE (market_id, transfer_id, record_link_id, source_version)` (`01_init:~2090`). So **many per-contact snapshots sharing one `transfer_id`** is exactly what the schema was shaped for. R1-04 reuses R1-03's handover machinery (`customer-repository.ts:387-526`: `record_links` → `customer_transfers` → `history_snapshots.payload` frozen JSONB → `history_entitlements` for the former owner) rather than inventing contact-level versioning.

---

## Comparison with the reference task spec

The owner-supplied R1-04 task spec was compared clause by clause. Result: **aligned on everything, with four items the first draft of this plan had wrongly scoped out and which are now in scope.**

| Reference clause | Status in this plan |
| --- | --- |
| Contact CRUD, roles, language/timezone, no hard-delete | §1–§4 |
| Channels (email/phone/WhatsApp/Kakao/LINE), consent not inferred, no auto-messaging, field-level protection | §2, §4, §6 |
| Primary contacts per context, independent people, change preserves correspondence | §4 `setPrimary` |
| Duplicate email: normalize, warn, allow, never merge, no UNIQUE, no leakage | §2, §4 `duplicateCandidates`, AC-03…AC-06, AC-15 |
| Customer parent authorization on list/search/detail/update/deactivate/direct lookup | §4 `parentScope` + `resolveContact` |
| **Historical access: former owner sees cutoff version only; direct lookup same policy** | **Added — §5 (was missing)** |
| **Contact transfer between Customers, authorized on source *and* destination, audited** | **Added — §4 `transfer`, D7 (was scoped out)** |
| **`GetContactTimeline`** | **Added — §4 `timeline` from `audit_events`, D8 (was scoped out)** |
| **AC-15 counts, AC-18 concurrency, AC-19 disabled/revoked employee** | **Added to §10 and Verification (AC-15/19 were missing)** |
| Lifecycle ACTIVE/INACTIVE, inactive contact still in historical RFQs | §4 `deactivate`, AC-12 |
| No FK, logical refs in app layer, independent integer IDs, normalized-email index without uniqueness | §1, §4 — baseline already matches |
| Audit create/update/deactivate/primary/transfer; audit failure rolls back | §4, AC-17 |
| AC-01…AC-19 | §10 maps every ID to a named test |

**Divergences from the reference spec, each owner-confirmed below:** route shape is flat (D3), and `GetContactTimeline` is sourced from `audit_events` rather than M30 Activities (D8).

### Owner-confirmed decisions (this session)

| # | Decision | Chosen |
| --- | --- | --- |
| D1 | Delivery scope | Full 12-endpoint inventory from `docs/structure/backend.md:185-202` + real UI |
| D2 | Market on the wire | Keep `?market=<CODE>`, reusing M01's `protectedAction`/`resolveMarketId`. Divergence from `backend.md` §4.1 (`marketId`) recorded, not silently applied |
| D3 | Route shape | **Flat `/api/v1/contacts?customerId=`** per `backend.md:153`, which explicitly rejects a second nested contact list API. Overrides the nested shape proposed in `docs/modules/contacts.md` and in the reference task spec |
| D4 | Grants | admin `ALL` + sale `OWN` + manager `TEAM` (list/read/create/edit/sensitive-read); accountant `ASSIGNED` list/read only, **no** `sensitive-read` |
| D5 | Historical access | **One `record_links(contact_id)` + `history_snapshots` + `history_entitlements` row per contact**, sharing the customer transfer's `transfer_id`, with each contact's own `source_version`. The existing M01 customer payload shape is untouched |
| D6 | Duplicate warning | `POST /api/v1/contacts/duplicate-candidates`, mirroring M01. Warning only, never a merge |
| D7 | Contact transfer | `POST /api/v1/contacts/{id}/transfer` requiring `contacts.edit` on **both** source and destination customer; audited; clears source primary designations; **no** new snapshot/entitlement; no commercial snapshot is rewritten |
| D8 | Timeline | `GET /api/v1/contacts/{id}/timeline` derived from `audit_events` filtered to `resource_type='contact'`, through `projectSafeAuditDiff` |

---

## Scope

**In scope**

1. Drizzle definitions for the four existing M02 tables (+ read-only `files`).
2. `src/modules/contacts/` module — contracts → service → repository → presentation, per `AGENTS.md` §3 layering.
3. 16 route handlers (12 from `backend.md` + `duplicate-candidates` + `transfer` + `timeline`).
4. Historical (former-owner) contact access, wired into M01's existing reassign transaction.
5. `contacts` permission resource, five actions, seeded for the D4 matrix.
6. OpenAPI 3.1 paths/schemas + the operation allowlist test.
7. UI: real Contacts workspace, contact detail with channels/preferences/primary/transfer/deactivate, Contacts panel on Customer detail.
8. Unit tests + a PostgreSQL integration suite + real-HTTP negative checks covering AC-01…AC-19.

**Explicitly out of scope**

- Any edit to `docs/structure/01_init_20261106.sql` or any new `db/migrations/*.sql`.
- Any SQL `FOREIGN KEY` / `REFERENCES` (`AGENTS.md` §3).
- A Files/upload module. `contact_preferences.evidence_file_id` is accepted and validated against the existing `files` table (same market + `scan_state='CLEAN'`), but no upload endpoint or UI.
- Messaging/campaign adapters. Preferences are stored and exposed; **no adapter exists in the codebase, so AC-16 will be reported as "no adapter exists; nothing sends messages" rather than claimed PASS.**
- Contact-level independent versioning beyond the existing `contacts.version` column (reference spec: "chỉ mở rộng versioning khi thực sự cần và được duyệt").
- Refactoring M01 to `marketId` (per D2).
- M30 Activities / notes / file attachments on contacts.

---

## Implementation

### 1. Drizzle definitions — `src/modules/access-control/infrastructure/schema.ts`

Append after `customerIdentifiers` (~line 298), transcribed from the baseline DDL, reusing the local `identity()` helper and the `customerAddresses` style. Column → camelCase mapping only; **no new constraints, no FKs**.

- `contacts`: `id, marketId, customerId, displayName, jobTitle, department, preferredLanguage, timezone, active (default true), createdAt, updatedAt, version`
- `contactChannels`: `+ kind, handle, normalizedHandle, isPrimary, verifiedAt`
- `contactPreferences`: `+ purpose, allowed, evidenceFileId, recordedAt`
- `customerPrimaryContacts`: `+ contactId, context`
- `files` (read-only use): `id, marketId, scanState` only

Declare the existing indexes in the third `pgTable` argument so Drizzle's view matches reality — `contacts_parent_page`, `contact_channel_primary` as `uniqueIndex(...).where(sql\`is_primary`)`, `contact_channel_duplicate`, and the `(market_id, contact_id)` children. These **declare existing objects**; nothing is created.

### 2. `src/modules/contacts/application/contracts.ts`

Modelled on `src/modules/customers/application/contracts.ts`. Zod 4, every object `.strict()` so unknown fields are a `400` (`backend.md` §4.1).

- Reuse `customerMarketCodeSchema` and `positiveIdSchema` instead of redefining them.
- `contactChannelKinds = ['email','phone','whatsapp','kakao','line','other']`.
- `contactPrimaryContexts = ['procurement','invoicing','consignee']` — an allowlist, since the column comment says "or approved context", meaning *approved*, not arbitrary. Unknown context → `400`.
- `contactPreferencePurposes = ['commercial','operational','marketing']` — allowlist; required because consent must never be inferred.
- `createContactSchema`: `customerId, displayName, jobTitle?, department?, preferredLanguage?, timezone?` — exactly the `backend.md:457` input allowlist, plus optional `channels[]` for one-shot creation.
- `updateContactSchema`: `version` + partial writable fields. **`customerId` and `marketId` are absent**, so a client cannot move a contact to bypass ownership (reference spec: "Không cho phép client thay đổi `customer_id`"). The only move path is the explicit `transfer` command.
- `channelInputSchema`, `preferenceInputSchema`, `setPrimaryContactSchema` (`{version, context}`), `deactivateContactSchema` (`{version, reason: min 3}`), `transferContactSchema` (`{version, targetCustomerId, reason: min 3}`).
- `contactListQuerySchema`: `marketCode, customerId?, active?, q?, limit (1..100, default 50), cursor?` — the filter set from `backend.md:124`. Reuse M01's base64url `{createdAt,id}` cursor validator.
- **New normalizers** — `normalizeIdentifier` is an *uppercasing business-identifier* helper and is wrong for channels:
  - `normalizeEmailHandle(v)` → `v.normalize('NFKC').trim().toLocaleLowerCase('en-US')`, shape-checked on a single `@`. **No dot-stripping, no `+tag` removal, no provider-specific rules** — those would infer identity and could collapse two real people.
  - `normalizePhoneHandle(v)` → NFKC, keep `+` and digits only.
  - `normalizeChannelHandle(kind, v)` dispatches: `email`→email; `phone`/`whatsapp`→phone; otherwise NFKC + trim + lowercase.
- `timezone` validated against `Intl.supportedValuesOf('timeZone')`; `preferredLanguage` against `/^[a-z]{2}(-[A-Z]{2})?$/`.

### 3. Audit safe-diff — `src/modules/access-control/application/audit-safe-diff.ts`

`projectSafeAuditDiff` works off field allowlists (lines 3-31), so contact audit payloads would otherwise be silently dropped. Add a `contactAuditFields` allowlist: `displayName, jobTitle, department, preferredLanguage, timezone, active, context, previousContactId, channelKind, preferencePurpose, allowed, formerCustomerId, newCustomerId, changedFields`. **`handle`, `normalizedHandle` and `evidenceFileId` are deliberately excluded** — channel values must never reach audit rows or logs (`backend.md:600`).

### 4. `src/modules/contacts/infrastructure/contact-repository.ts`

Modelled on `customer-repository.ts`. `import 'server-only'`. Exports `ContactNotFoundError` / `ContactConflictError` in the M01 error shape so the API mapper stays uniform.

**The central rule — parent-derived scope.** `contacts` has no `owner_id`/`team_id`, so scope is evaluated on the parent inside the same statement:

```ts
function parentScope(scope: RecordScope, actor: Principal): SQL {
  if (scope === 'ALL') return sql`true`
  if (scope === 'OWN') return eq(customers.ownerId, actor.userId)
  if (scope === 'TEAM' && actor.teamIds.length) return inArray(customers.teamId, actor.teamIds)
  return sql`false`           // NONE and ASSIGNED default-deny
}
```

Every read/write does `innerJoin(customers, and(eq(customers.id, contacts.customerId), eq(customers.marketId, contacts.marketId)))` plus `eq(contacts.marketId, marketId)` plus `parentScope(...)`. A private `resolveContact(tx, {marketId, id, scope, actor})` performs this once, with `.for('update')` on writes, and throws `ContactNotFoundError` on a miss — so out-of-scope, wrong-market and nonexistent are indistinguishable (`backend.md` §4.2 "identical disclosure behavior"). Reuse the `assertMarketAccess` logic from `customer-repository.ts:72`.

Methods:

- **`list`** — keyset on `(contacts.createdAt DESC, contacts.id DESC)`; filters `customerId`/`active`/`q` (on `displayName`, escaped by M01's `safeSearch`). Filters apply **before** pagination. Never selects or joins channel values. Returns `{items, historyItems, nextCursor}`, mirroring M01 so the former-owner path (§5) rides along.
- **`get`** — `resolveContact`; returns the contact plus its `customer_primary_contacts` contexts. On a current-scope miss, falls through to the entitled-snapshot path (§5) before giving up.
- **`create`** — one transaction: verify the parent customer exists in-market, is in scope, and is **not `ARCHIVED`**; insert `contacts`; insert supplied channels with server-computed `normalizedHandle`; insert one `record_links` row with **only** `contactId` set (the `CHECK num_nonnulls(...)=1` at `01_init:805` forbids setting two ids); insert `audit_events` `contact.created`. Audit failure rolls the whole thing back.
- **`update`** — lock by `(id, marketId)` + scope, compare `version`, reject when `active = false`, `UPDATE … SET version = version + 1 WHERE version = :expected`, audit `contact.updated` with a `changedFields` diff only.
- **`listChannels` / `createChannel` / `updateChannel`** — child mutations **lock and increment the parent `contacts` aggregate** (`backend.md` §4.2) and take `expectedVersion` against the parent. `normalizedHandle` is always recomputed server-side; a client-supplied value is ignored. Setting `isPrimary = true` first clears the sibling primary for the same `(marketId, contactId, kind)` *inside* the transaction, so the partial unique index `contact_channel_primary` is satisfied rather than violated. `verifiedAt` is **not** settable from the API ("Only set from recorded verification").
- **`listPreferences` / `createPreference` / `updatePreference`** — same parent locking. `allowed` defaults `false`. When `evidenceFileId` is supplied, verify in-transaction that the file is same-market and `scan_state='CLEAN'`, else `422`. Upsert on `UNIQUE (market_id, contact_id, purpose)`.
- **`setPrimary`** — resolve the contact under parent scope, require `active = true`, then `INSERT … ON CONFLICT (market_id, customer_id, context) DO UPDATE SET contact_id = …, version = version + 1`. Because `customer_id` is taken from the **resolved contact**, "primary contact must belong to the same buyer" is structurally true. Audit `contact.primary_set` with `{context, previousContactId}`. **No row is ever deleted** — prior correspondence, prior orders and prior audit are untouched.
- **`deactivate`** — `active = false`, bump version, audit `contact.deactivated` with the reason. There is no `DELETE` endpoint anywhere in the module; "no hard-delete" is structural.
- **`transfer`** (D7) — one transaction: `resolveContact` on the **source** (parent scope); independently resolve the **destination** customer under the same `parentScope` and reject `ARCHIVED` — so moving to an inaccessible customer is a `404`/`403`, never a silent success (AC-09); reject `targetCustomerId === current.customerId`; update `contacts.customerId` and bump version; delete the contact's rows from `customer_primary_contacts` at the source (removing a *designation*, not correspondence); audit `contact.transferred` with `{formerCustomerId, newCustomerId}` + reason. No `history_snapshots`/`history_entitlements` row is written and no accepted commercial snapshot is rewritten.
- **`timeline`** (D8) — `audit_events WHERE resource_type='contact' AND resource_id=:id AND market_id=:marketId`, served by the existing `audit_resource_lookup` index, keyset on `(occurred_at DESC, id DESC)`. Callable only after `resolveContact` succeeds, so timeline inherits parent scope. Rows pass through `projectSafeAuditDiff`.
- **`duplicateCandidates`** — given `{customerId?, channels:[{kind,handle}]}`, join `contact_channels → contacts → customers`, match `(marketId, kind, normalizedHandle)` via the `contact_channel_duplicate` index, apply `parentScope`, exclude the contact being edited, `LIMIT 25`. Returns `{id, displayName, jobTitle, customerId, customerLegalName, active, matchedKind, sameCustomer}` — enough for a human decision, and **only in-scope matches**, so duplicate suggestions cannot leak contacts the caller may not see (AC-15).

### 5. Historical (former-owner) contact access — D5

**Write side.** A new `src/modules/contacts/infrastructure/contact-history.ts` exports:

```ts
snapshotContactsForTransfer(tx, { marketId, transferId, customerId }): Promise<number[]>
```

For each contact under the customer it inserts one `record_links` row with only `contactId` set, one `history_snapshots` row (`transferId`, that `recordLinkId`, `sourceVersion = contact.version`, and a frozen payload of the contact + its channels + preferences + primary contexts), and one `history_entitlements` row for the **former owner**. The `UNIQUE (market_id, transfer_id, record_link_id, source_version)` key makes this idempotent per contact per transfer.

`CustomerRepository.reassign` (`customer-repository.ts:387`) calls it once, inside the existing transaction, right after the `customer_transfers` insert — so an audit or snapshot failure still rolls back the whole handover. **The existing customer payload shape is not modified**, so the M01 contract under review is unaffected. Direction of the dependency is M01 → M02, which is acceptable: the handover event belongs to M01, the contact payload shape belongs to M02.

**Read side.** `ContactRepository` gets `getEntitledContactHistory(userId, marketId, contactId?)` and `listEntitledContactHistory(...)`, transcribed from M01's `listHistorical` / `getEntitledHistory`: join `history_entitlements → history_snapshots → record_links` on `record_links.contactId IS NOT NULL`, scoped to `marketId` and `userId`. Consequences, all of which are the AC-13/AC-14 requirements:

- `GET /contacts/{id}` for a former owner returns the **frozen payload** with `historical: true`, not live data — because the payload is immutable JSONB, post-handover edits are invisible by construction, not by a filter that could be bypassed.
- The same code path serves list, detail and **direct lookup**, so a guessed contact id gets exactly the same historical policy (AC-07 + AC-13 together).
- Historical results are **read-only**: every mutation calls `resolveContact`, which only consults live rows under current scope, so a former owner's write is a `404`.
- `history_entitlements` is intersected with current grants and current market membership: `requirePermission` runs first and `assertMarketAccess` runs inside the repository, so a revoked or disabled employee is denied regardless of entitlement (AC-19).
- Service-level projection applies `readFields` to the historical payload too, so field-level restrictions are not lost on the history path.

### 6. API layer — `src/modules/contacts/presentation/api.ts`

Copy the `protectedAction` / `responseFor` structure from `src/modules/customers/presentation/api.ts` with resource `contacts`. It already gives `requirePermission` → `requireCsrf` on mutations → `?market=` resolution → `{data}` envelope with `Cache-Control: private, no-store`, plus error mapping (`NOT_FOUND`→404, `VERSION_CONFLICT`→409, PG `23505`→409, business rule→409/422, else `authErrorResponse`). Add business codes `CONTACT_PARENT_NOT_ACCESSIBLE`, `CONTACT_INACTIVE`, `CONTACT_EVIDENCE_FILE_INVALID`, `CONTACT_PRIMARY_CONTEXT_INVALID`, `CONTACT_TRANSFER_TARGET_INVALID`, `CONTACT_TRANSFER_TARGET_UNCHANGED`.

Permission actions per `backend.md`: `list`, `read`, `create`, `edit`, `sensitive-read`. `sensitive-read` gates `GET /channels` and `GET /preferences`; writing a channel needs `edit`. `timeline` needs `read`; `transfer` needs `edit`.

### 7. Route handlers — `src/app/api/v1/contacts/...`

Thin re-exports only, matching `src/app/api/v1/customers/route.ts`:

```
contacts/route.ts                             GET list · POST create
contacts/[id]/route.ts                        GET read · PATCH update
contacts/[id]/channels/route.ts               GET · POST
contacts/[id]/channels/[childId]/route.ts     PATCH
contacts/[id]/preferences/route.ts            GET · POST
contacts/[id]/preferences/[childId]/route.ts  PATCH
contacts/[id]/set-primary/route.ts            POST
contacts/[id]/deactivate/route.ts             POST
contacts/[id]/transfer/route.ts               POST
contacts/[id]/timeline/route.ts               GET
contacts/duplicate-candidates/route.ts        POST
```

### 8. Grants — `src/modules/access-control/domain/contact-grants.ts`

New file modelled on `customer-admin-grants.ts`, exporting `contactReadFields`, `contactWriteFields` and `contactGrants`:

| role | actions | scope |
| --- | --- | --- |
| `admin` | list, read, create, edit, sensitive-read | `ALL` |
| `sale` | list, read, create, edit, sensitive-read | `OWN` |
| `manager` | list, read, create, edit, sensitive-read | `TEAM` |
| `accountant` | list, read | `ASSIGNED` (no `sensitive-read`) |

Wire into the two existing seed points, following the `customerAdminGrants` loop verbatim (`onConflictDoUpdate` on `(roleCode, resource, action, recordScope)`): `src/modules/access-control/infrastructure/access-repository.ts:720` and `scripts/access-control.ts:170,207`. Update the bootstrap audit `grantBoundary` (`access-repository.ts:~757`) from `'M29_AND_M01'` to `'M29_M01_M02'`.

### 9. OpenAPI — `src/modules/api-docs/openapi.ts`

Add the 16 operations under a `Contacts` tag, deriving request schemas from the Zod contracts via the existing `fromZod`, reusing `idParameter`, `csrfParameter`, `commonErrors`, `dataEnvelope`, `jsonBody`. Add a `childId` path parameter. New schemas: `Contact`, `ContactHistory`, `ContactChannel`, `ContactPreference`, `ContactTimelineEvent`, `CreateContactRequest`, `UpdateContactRequest`, `ContactChannelRequest`, `ContactPreferenceRequest`, `SetPrimaryContactRequest`, `DeactivateContactRequest`, `TransferContactRequest`, `ContactDuplicateCandidatesRequest`.

Extend `src/modules/api-docs/openapi.test.ts`: append the 16 operations to `expectedOperations`. The existing hard assertion `expect(operations.filter(o => o.includes('customers'))).toHaveLength(7)` still passes — no new path contains the string `customers`.

### 10. UI

Follow the `frontend-patterns` skill and `docs/design-system.md` "CRM application guidance": visible focus, labeled inputs, responsive overflow, and loading / empty / error / **access-denied** states, status colour paired with text, reason inputs on sensitive actions, immutable history.

- **`contact-workspace.tsx`** (client) — modelled on `customer-workspace.tsx`. Market selector from `/api/v1/me/markets`, `?customerId=` and `active` filters, name search, keyset "load more", create form. On submit the create form **first** calls `duplicate-candidates`; when matches return it renders a non-blocking warning naming the matched people and their buyer, with an explicit "create as a different person" confirmation. Historical items render in a separate read-only block, as M01 does. A `403` renders a distinct access-denied panel, not a generic error.
- **`contact-detail.tsx`** (client) — modelled on `customer-detail.tsx`. Edit form with **no `customerId` field**; Channels section loaded separately (renders an access-denied note, not an error, when `sensitive-read` is absent); Preferences section with explicit allow/deny plus `recordedAt` and an optional evidence file id; Primary-contact section with one control per context; Transfer form requiring a destination customer id plus a reason; Deactivate requiring a typed reason; Timeline list. When `historical: true`, the whole page is read-only with the amber snapshot banner M01 already uses.
- **`customer-contacts-panel.tsx`** — compact in-scope contact list embedded at the bottom of `CustomerDetail`, linking to the full contact page.
- **Pages** — replace the placeholder `src/app/[locale]/(workspace)/contacts/page.tsx` (currently `R1RoutePage`) with the real workspace; add `src/app/[locale]/(workspace)/contacts/[id]/page.tsx` mirroring `customers/[id]/page.tsx` (`currentPrincipal()`, integer guard, `notFound()`).
- **Retire the prototype** — remove the `'/contacts'` case at `src/modules/routing/r1-route-data.ts:53-59`, its `searchableColumns` entry (line 188), and the now-unused `contacts.json` import. **Leave `src/constants/dummy/contacts.json` in place**: `src/modules/markets/market-data.test.ts:11,54,66` still uses it for cross-module market-consistency fixtures. Update the "business modules still render synthetic prototype data" sentence in `docs/architecture/overview.md` to carve out M02.

---

## Acceptance criteria → test mapping

Reference-spec IDs, each tied to a named check. `IT` = PostgreSQL integration test, `HTTP` = real-HTTP negative check, `UI` = browser check.

| ID | Scenario | Where proven |
| --- | --- | --- |
| AC-01 | Authorized creation succeeds + audit | IT-01 |
| AC-02 | Unauthorized customer → cannot create/read | IT-02, HTTP-03 |
| AC-03 | Two contacts share email → warning, creation allowed | IT-03, UI-01 |
| AC-04 | Duplicate email → distinct contact ids | IT-03 |
| AC-05 | Update one duplicate → the other unchanged | IT-04 |
| AC-06 | Duplicate contacts keep independent history | IT-05 (`audit_events` + `record_links` per contact) |
| AC-07 | Direct `/contacts/{id}` enforces parent scope | IT-06, HTTP-03, HTTP-04 |
| AC-08 | Unauthorized update denied | IT-06, HTTP-05 |
| AC-09 | Move to inaccessible customer denied | IT-07 (`transfer` with out-of-scope target), HTTP-07 |
| AC-10 | Primary change: correct assignment + audit | IT-08 |
| AC-11 | Independent procurement/invoicing/consignee primaries | IT-09 |
| AC-12 | Deactivate preserves historical references | IT-10 |
| AC-13 | Read after customer handover enforces historical scope | IT-11 (former owner gets frozen payload) |
| AC-14 | Former owner sees no post-transfer updates | IT-12 (edit after cutoff invisible; write → not found) |
| AC-15 | No leakage via search / filter / pagination / **counts** / duplicate suggestions | IT-13, HTTP-08 (list body carries no handle key; `duplicateCandidates` returns only in-scope rows; no total-count field is exposed) |
| AC-16 | Do-not-contact honoured by applicable existing adapters | **No adapter exists in R1-04** — reported as such, not as PASS. Storage + exposure proven by IT-14 |
| AC-17 | Mandatory audit failure rolls back | IT-15 |
| AC-18 | Concurrent updates: no silent lost update | IT-16 (two concurrent `setPrimary`; two concurrent `update` with the same `expectedVersion`) |
| AC-19 | Disabled/revoked employee denied per R1-01 | HTTP-09, IT-17 (entitlement without membership still denied) |

Additional structural checks: IT-18 one primary channel per `(contact, kind)`; IT-19 `normalizeEmailHandle` does not strip dots or `+tags`.

The integration suite is new: `src/modules/contacts/infrastructure/contact-repository.integration.test.ts`, using the isolated-schema technique from `scripts/validate-migrations.ts` (create `contacts_it_<rand>`, apply the baseline, seed synthetic market/users/teams/customers, assert, drop). Guarded by `DATABASE_URL` and run through a separate `vitest.integration.config.ts` + `npm run test:integration`, so the default `npm test` stays DB-free. Unit tests (`contracts.test.ts`, `contact-service.test.ts`) cover schema/projection logic only — per the reference spec, **mock-only tests are not used to prove parent scope or historical integrity**.

---

## Files

**New** — `src/modules/contacts/{application/{contracts.ts,contracts.test.ts,contact-service.ts,contact-service.test.ts},infrastructure/{contact-repository.ts,contact-history.ts,contact-repository.integration.test.ts},presentation/{api.ts,contact-workspace.tsx,contact-detail.tsx,customer-contacts-panel.tsx}}`; `src/modules/access-control/domain/contact-grants.ts`; the eleven route files under `src/app/api/v1/contacts/`; `src/app/[locale]/(workspace)/contacts/[id]/page.tsx`; `vitest.integration.config.ts`.

**Modified** — `schema.ts` (append 5 tables); `audit-safe-diff.ts` (contact allowlist); `access-repository.ts` + `scripts/access-control.ts` (grant seeding, `grantBoundary`); **`customers/infrastructure/customer-repository.ts` (`reassign` calls `snapshotContactsForTransfer`)**; `customers/presentation/customer-detail.tsx` (mount panel); `api-docs/openapi.ts` + `openapi.test.ts`; `routing/r1-route-data.ts`; `app/[locale]/(workspace)/contacts/page.tsx`; `package.json`.

**Must not be touched** — `docs/structure/01_init_20261106.sql` (checksum-fingerprinted baseline), `db/migrations/*`.

---

## Verification

Run in order; report each as **PASS / FAIL / BLOCKED / NOT TESTED** with output.

1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm test` — full default suite including the extended `openapi.test.ts`.
5. `npm run test:integration` — IT-01…IT-19 above. **Primary evidence.**
6. `npm run db:validate-migrations` — confirms baseline + existing migrations still replay to 64 tables and that no SQL was added. Expected unchanged.
7. **Grant seeding** — `npm run access:operator`, then read-only via Postgres MCP: `SELECT role_code, action, record_scope, active FROM role_grants WHERE resource = 'contacts' ORDER BY role_code, action;` must match the D4 matrix.
8. **Real HTTP negative checks** (`npm run dev` + `curl`), each asserted:
   - HTTP-01 unauthenticated `GET /api/v1/contacts?market=KR` → `401`
   - HTTP-02 authenticated with no `contacts` grant → `403`
   - HTTP-03 `GET /api/v1/contacts/{id}` under another sale's customer, as `sale` → `404` (**not** 403)
   - HTTP-04 same with a foreign `?market=` → `404`
   - HTTP-05 `PATCH` on an out-of-scope contact → `404`
   - HTTP-06 `PATCH` without `X-CSRF-Token` → `403`; with `{"customerId":2}` → `400`; without `version` → `400`; with a stale `version` → `409`
   - HTTP-07 `POST /contacts/{id}/transfer` to an out-of-scope `targetCustomerId` → `404`
   - HTTP-08 `GET /api/v1/contacts/{id}/channels` as `accountant` → `403`; and a contact list body contains no `email`/`phone`/`handle` key and no total-count field
   - HTTP-09 disabled, then revoked-session employee → `401`/`403` on every contact path including `timeline` and `duplicate-candidates`
   - HTTP-10 `POST /contacts/{id}/preferences` with an `evidenceFileId` whose `scan_state <> 'CLEAN'` → `422`
   - HTTP-11 guessed contact ids swept across a range as a low-scope `sale` → uniformly `404`, no timing or body difference
9. **Customer handover A → B end to end** — create buyer with contacts as A; reassign to B; then as A confirm list and direct lookup return only the frozen cutoff payload, a contact created *after* the cutoff is absent, an edit made after the cutoff is not visible, and every mutation returns `404`. As B confirm full current access.
10. **Browser checks** (Playwright / Chrome DevTools MCP) — UI-01 two people at one buyer with the same email: warning shown, creation proceeds on confirmation, both listed with distinct ids; UI-02 set a primary per context and confirm switching one leaves the others intact; UI-03 deactivate and confirm the contact remains under the inactive filter with its timeline intact; UI-04 former-owner view renders read-only with the snapshot banner.
11. `/goal` — check availability; if unavailable, say so and walk the acceptance criteria manually.
12. Review the final diff; preserve unrelated edits, including the `next dev`-regenerated `AGENTS.md` §7 block.

---

## Risks

| Risk | Mitigation |
| --- | --- |
| `ASSIGNED` has no assignment model in R1, so the seeded accountant grant **denies everything** (`parentScope` → `false`). | Deliberate and stated: default-deny, visible in the matrix, logged as a follow-up. Not silently remapped to `OWN`/`TEAM`. |
| Touching `CustomerRepository.reassign` risks regressing R1-03, which is still `in-review`. | The change is additive — one call inside the existing transaction; the customer payload shape is untouched. M01's existing tests plus IT-11/IT-12 cover it. Flagged for the R1-03 reviewer. |
| Editing the baseline SQL would break `scripts/migrate.ts`'s checksum gate. | No SQL is added or changed; verification step 6 proves it. |
| Drizzle index declarations could drift from the real objects. | Transcribed from `01_init_20261106.sql:969-1165`; IT-09/IT-18 assert the real constraints actually fire. |
| Over-aggressive email normalization would collapse two real people. | NFKC + trim + lowercase only. IT-03 and IT-19 lock this in. |
| Channel handles leaking into logs, audit diffs or list projections. | Excluded from the projection, from the `projectSafeAuditDiff` allowlist, and gated behind `sensitive-read`. HTTP-08 asserts it. |
| A contact created after a handover could appear in a former owner's view. | Impossible by construction: the historical path reads only frozen `history_snapshots` payloads written at the cutoff. IT-12 asserts it. |
| M01 keeps `?market=`, diverging from `backend.md`'s `marketId`. | Owner decision D2; needs a spec-divergence note. A later task can align both modules at once. |
| `record_links`' `CHECK (num_nonnulls(...) = 1)` rejects a row carrying both ids. | Contact creation and contact snapshots both insert `contactId`-only rows. |
| No file-upload module, so `evidenceFileId` can't be exercised end to end. | Validation path implemented and tested against a synthetic `files` row; no upload UI is claimed. |
| AC-16 cannot be genuinely verified. | Reported as "no adapter exists in R1-04", not PASS. |

**Rollback:** no schema change, so reverting the commit reverts the feature. Seeded `role_grants` rows for `resource='contacts'` need `active = false` (or deletion) separately — noted in the dev log. Any `history_snapshots`/`history_entitlements` rows written for contacts are additive and harmless once the read path is gone.

---

## Documentation (STOP points per `AGENTS.md` §2)

Nothing below is written without separate explicit approval:

1. **Spec docs** — `docs/modules/contacts.md`: flip the status header, tick the checklist, replace the "proposed" field/route block with the implemented contract, record the D3 route resolution and the collapsed field shape. `docs/modules/README.md`: M02 `Planned` → implemented. `docs/structure/backend.md` §6: M02 rows `Proposed` → `Implemented`, plus the `?market=` divergence. `docs/architecture/overview.md` / `security.md`: grant boundary now includes M02; prototype-data carve-out.
2. **Dev log** — append to `nimbalyst-local/wiki/develop-process.md` in the `Date → Task → Topic → Status → Implemented → Not Implemented → Decisions → Verification → Risks → Next Steps` format.
3. **Spec update log** — compare against `nimbalyst-local/wiki/CRM-Spec.md`, append approved differences to `nimbalyst-local/wiki/spec-updating-v1.md`. The original spec is never overwritten.
4. **Tracker** — set `pln_mwa17uujian357` to its verified status with `tracker_update` only once the step 5/8/9/10 evidence exists.

## Approval gates

- **Gate 1 — Plan approval** (this document).
- **Gate 2 — Docs decision** (section above; may be deferred until after code).
- **Gate 3 — Implementation approval**, separate from Gate 1.
- **Gate 4 — Module-level grant approval** for activating `contacts.*` across admin/sale/manager/accountant (`AGENTS.md` §4). D4 is the owner's chosen matrix; Gate 3 is read as covering its activation unless the owner says otherwise.
