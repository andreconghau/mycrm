# M02 — Contacts

> **Status: IMPLEMENTED (R1-04)** — backend, grants and UI committed (`ac6127d`, `ade3abd`). Verified: `npm run lint`, `npm run typecheck`, `npm test` (66 tests), `npm run test:integration` (25 tests, AC-01…AC-19), `npm run build`, `npm run db:validate-migrations`.
> **Area:** CRM · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Confirmed R1 workflow and acceptance

- Manage recipient roles, channels, primary contacts and deactivation. Suggest duplicates using normalized email. Two people at one buyer can share email after a warning and retain distinct IDs and history. Direct lookup enforces parent scope.

## Purpose
Track people, roles and preferences at buyer companies.

## Features / use cases
- Create/edit contact under authorized customer
- Store buyer roles, preferred language/channel and commercial communication history links
- Primary procurement, invoicing and consignee contacts may differ

## Core data (implemented)
`contacts`: `id`, `market_id`, `customer_id`, `display_name`, `job_title?`, `department?`, `preferred_language?`, `timezone?`, `active`, `created_at`, `updated_at`, `version`. No table-level `role`/`locale` columns beyond `preferred_language`; channels and consent live in their own tables below. No SQL migration was added — the four tables already existed in the fingerprinted R1 baseline (`docs/structure/01_init_20261106.sql`).

## States / lifecycle (implemented)
`active = true / false`. Deactivation is the only state change; there is no delete endpoint, so historical references (RFQs, samples, prior audit) remain intact.

## Business rules and validation
- Validate customer ownership before linking/moving contact
- Consent/channel preferences must not be inferred
- Duplicate email does not always imply same person across companies

## Authorization and record scope (implemented — D4)

Record scope is derived from the parent customer on every path (contacts carry no `owner_id`/`team_id`):

| Role | Actions | Scope |
| --- | --- | --- |
| `admin` | list, read, create, edit, sensitive-read | `ALL` |
| `manager` | list, read, create, edit, sensitive-read | `TEAM` |
| `sale` | list, read, create, edit, sensitive-read | `OWN` |
| `accountant` | list, read | `ASSIGNED` (no `sensitive-read`; R1 has no assignment model, so this resolves to default-deny until one is approved) |

`sensitive-read` gates `GET /channels` and `GET /preferences`; writing either requires `edit`. Activated in the dev database via `npm run access:operator -- grant-contacts --actor-email <admin>`.

## Dependencies / integration boundaries
Customers, Access Control

## Acceptance / UAT
- Cannot move contact to an inaccessible customer
- Primary contact change recorded and old orders unaffected

## Detailed Implementation Contract (implemented)

### Functional workflow
1. User adds named people under a customer (purchasing, logistics, finance, management), each with role, preferred channel and consent/preferences.
2. Multiple contacts can be linked to RFQs/shipments, but one may be designated primary per context; changing a primary does not delete prior correspondence.
3. The contact timeline (derived from `audit_events`) replaces a dedicated activity feed; visibility inherits the associated customer scope.

### Implemented fields
- `Contact`: `id`, `customerId`, `displayName`, `jobTitle?`, `department?`, `preferredLanguage?`, `timezone?`, `active`, `version`. `customerId`/`marketId` are **not** accepted on the generic update — moving a contact requires the explicit `transfer` command, authorized on both source and destination.
- `ContactChannel`: `contactId`, `kind` (`email|phone|whatsapp|kakao|line|other`), `handle`, `isPrimary`, `verifiedAt?` (server-only, never client-settable).
- `ContactPreference`: `contactId`, `purpose` (`commercial|operational|marketing`), `allowed`, `evidenceFileId?` (must reference a same-market `files` row with `scan_state = 'CLEAN'`), `recordedAt`.
- `CustomerPrimaryContact`: one row per `(customerId, context)` of `procurement|invoicing|consignee`.

### Implemented endpoints

Flat route shape (`/api/v1/contacts?customerId=`), per `docs/structure/backend.md` §5's explicit rejection of a second nested contact list API — this diverges from the nested shape in the original module sketch.

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/api/v1/contacts` | `contacts:list` |
| POST | `/api/v1/contacts` | `contacts:create` |
| GET | `/api/v1/contacts/{id}` | `contacts:read` |
| PATCH | `/api/v1/contacts/{id}` | `contacts:edit` |
| GET | `/api/v1/contacts/{id}/channels` | `contacts:sensitive-read` |
| POST | `/api/v1/contacts/{id}/channels` | `contacts:edit` |
| PATCH | `/api/v1/contacts/{id}/channels/{childId}` | `contacts:edit` |
| GET | `/api/v1/contacts/{id}/preferences` | `contacts:sensitive-read` |
| POST | `/api/v1/contacts/{id}/preferences` | `contacts:edit` |
| PATCH | `/api/v1/contacts/{id}/preferences/{childId}` | `contacts:edit` |
| POST | `/api/v1/contacts/{id}/set-primary` | `contacts:edit` |
| POST | `/api/v1/contacts/{id}/deactivate` | `contacts:edit` |
| POST | `/api/v1/contacts/{id}/transfer` | `contacts:edit` (both source and destination customer) |
| GET | `/api/v1/contacts/{id}/timeline` | `contacts:read` |
| POST | `/api/v1/contacts/duplicate-candidates` | `contacts:list` |

The wire still carries `?market=<CODE>`, matching M01 Customers; this diverges from `backend.md` §4.1's `marketId` convention and is a known, recorded divergence pending a joint alignment task.

### UI / edge cases
- Contact panel on customer details, contact profile, outbound channel shortcuts (no automatic messaging without integration approval).
- Company changes require explicit transfer and authorization; preserve previous customer relationship if business policy requires history.
- Warn on a normalized email match and allow a distinct person at the same customer to share that address.
- On the Contacts list, create a contact in a responsive right-side drawer: expandable on desktop and full-screen on mobile.
- Select the parent buyer through an authorized name/code search rather than an internal numeric ID.
- Keep email/phone duplicate candidates and the explicit "create separate contact" decision inside the drawer. After successful creation, open the new contact profile.
- Preserve keyboard focus, dirty-form confirmation, sticky actions and responsive accessibility behavior defined in `AGENTS.md`.

### Verification scenarios
- Contact can be read only when parent customer is accessible; direct `/contacts/:id` cannot bypass parent scope.
- Primary contact change and deactivation retain historical RFQ references and audit trail.
- A customer handover (M01 `reassign`) freezes every contact under that buyer into a per-contact `history_snapshots` row sharing the transfer's `transfer_id`; the former owner's read (list, direct lookup, or guessed id) returns only that frozen payload, never live data, and every mutation path returns 404.
- Do-not-contact preference is stored and exposed; **no messaging/campaign adapter exists in R1**, so honoring it end-to-end is not yet testable and is not claimed as verified.

## Implementation checklist
- [x] Domain model, state transitions and failure cases reviewed with business owner.
- [x] Persistence contract/schema and safe database indexes approved — reused the existing baseline tables; no migration added.
- [x] Use cases, server-side Zod validation and scoped authorization implemented.
- [x] UI or API adapters implemented only where needed.
- [x] Unit and integration tests cover success, negative permissions and concurrency/idempotency where relevant.
- [x] Audit/observability updated; acceptance verified against AC-01…AC-19. Grants activated in the dev database.
