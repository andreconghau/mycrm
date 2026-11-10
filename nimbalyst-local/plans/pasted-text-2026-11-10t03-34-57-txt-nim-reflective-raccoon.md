# Plan — Record R1 owner decisions in project documentation

## Context

The owner circulated "Seafood Export CRM — R1 decisions & improvements" (2026-11-09, pending approval). It was written as if no code existed, but the repo already has R1-00/01 foundation, R1-02 Audit Log, R1-03, M29 in progress, Drizzle tables `teams`, `team_memberships`, `sessions`, `invitations`, `customers`, `customer_transfers`, `duplicate_reviews`, and scrypt password hashing. The owner chose this session's deliverable: **record the approved decisions in docs only (no code, no migrations)**, then append the delta to `spec-updating-v1.md`. Task breakdown is a later session.

Owner resolutions gathered in this session (2026-11-10):

| Topic | Resolution |
|---|---|
| Deliverable | Decision record + docs updates; no code |
| Password hashing | Keep existing scrypt (`src/modules/access-control/infrastructure/password.ts`); Argon2id dropped |
| Hosting | **Keep Vercel** (per `docs/context.md`). VPS / Caddy / Nginx / self-managed backup sections of the summary are **not adopted**; production DB, storage, backup and restore remain open decisions |
| Teams | Reuse `team_memberships`; add missing fields (`is_lead`, `left_at`) only in a future approved migration |
| Rounding | **Keep approved rule**: sum exact line decimals, ROUND_HALF_EVEN only on the final total (10.004 + 10.004 → 20.01). Summary's per-line proposal rejected |
| Admin approvals | Record as an **explicit grant** to Admin (not a bypass) + controlled SoD exception; AGENTS.md principle stays unchanged |
| 3.2 #1 FX after SO confirm | Editable reference field + history (no amendment); SO snapshot stores FX at confirmation; current value from `rate_history` |
| 3.2 #2 Manager scope | ALL; Team is not a data scope in R1 |
| 3.2 #4 FX deviation warning | Deferred after R1 |
| 3.2 #5 FX change notification | In-app to creator, assigned Sale, approver |
| 3.2 #6 SO confirm without file | Admin only |
| 3.2 #7 English-only PDF mode | Added (4 modes: EN, EN–VI, EN–KO, VI–KO) |
| 3.2 #8 Password handover | One-time set-password link, 24h, token stored hashed, Admin delivers out-of-band; reuse `invitations` |
| 3.2 #9/#10 Backup owner / off-site | Not applicable under Vercel; remain open with production infra decision |
| 3.2 #11 Accountant in R1 | Not activated (default deny) |
| 3.2 #12 File limits | 20 MB/file; jpg, png, webp, pdf, eml, msg; server-side real MIME check |
| 3.1 #7 Quote acceptance evidence | Same file rules as SO evidence |

## Approach

### 1. New decision record — `docs/business/r1-decisions.md`
Single source for the 2026-11-09/10 decisions, in English, sections:
- R1 phasing R1.0–R1.3 and deferrals (legacy import, email/Zalo, accountant matrix, R2/R3).
- Shared R1.0 components list (Decimal + HALF_EVEN, state machine, snapshot helper, idempotency key, document numbering RFQ-/QT-/SO-, pagination, repository scope filter, error model, OpenAPI, storage port, in-app notifications, `rate_history`).
- Quotation approval (no threshold, Manager/Admin explicit grant, self-approval comment ≥ 10 non-whitespace chars, Sale cannot self-approve, approval record fields, version-bound, row lock).
- **Controlled exceptions** (so later readers don't treat them as bugs): SoD self-approval exception with compensating controls; FX field editable outside lock rules with immutable history.
- FX VND/USD rules (`numeric(18,4)`, > 0, reference only, edit permissions, mandatory comment, no re-version/re-approval, bank FX field designed now / built R3).
- SO evidence, amendment/cancel lifecycle, PDF languages, team model, password handover, file limits, technical risk mitigations (orphan guards, append-only audit, idempotency, `currency` column everywhere, `legacy_ref` on master tables).
- Definition of Done per module (summary §3.4).
- Explicitly rejected/not adopted: per-line rounding, Argon2id, VPS stack, `team_members` table name.

### 2. Targeted updates to existing docs (add/align, never silently change rules)
- `docs/context.md` — R1 phasing summary + link to decision record; keep Vercel; note backup/restore owner still open.
- `docs/business/permissions.md` — R1 scopes OWN/ASSIGNED/ALL; Manager ALL; Team = broadcast/notify/support only; quotation & amendment approval row adds Admin as explicit grant; SoD section documents controlled exception; Accountant not activated in R1; mark these as approved for R1 (rest of matrix stays proposal).
- `docs/modules/quotations.md` + `docs/business/pricing-and-quotations.md` — approval rules, FX reference field + history + notifications, translation snapshot at submit, PDF modes and missing-translation block, PDF issuance metadata (language, version, SHA-256, creator, time), acceptance evidence file rules. Rounding text unchanged. Replace "manager approval" with "Manager or Admin approval".
- `docs/modules/sales-orders.md` + `docs/business/sales-workflow.md` — evidence types/metadata/immutability/voiding, Admin no-file confirmation with source comment, review flags (no file / image-only), FX after confirmation, amendment states `draft → submitted → approved/rejected`, one open amendment per SO, SO versions + `superseded`, cancel as amendment type, single transaction, R2/R3 quantity constraint.
- `docs/modules/products.md`, `docs/modules/product-specifications.md` — `name_en/vi/ko` + descriptions, `legacy_ref`.
- `docs/modules/customers.md` — `preferred_doc_language`, `legacy_ref` (verify duplicate-warning text already matches).
- `docs/modules/access-control.md` / `docs/architecture/security.md` — scrypt recorded, session_id + `last_seen` idle check (verify existing text first), password handover via `invitations`, upload limits/MIME check.
- `docs/architecture/overview.md` — storage port, shared components pointer; no hosting change.
- `docs/modules/README.md` / `RELEASES.md` — add R1.0–R1.3 ordering note only.

Each edit: read target first, keep existing wording where consistent, record any further conflict found in the report instead of overwriting.

### 3. Spec delta (separate STOP per AGENTS.md)
After docs approval, ask before appending a dated entry to `nimbalyst-local/wiki/spec-updating-v1.md` comparing against `CRM-Spec.md` (§7.2 SoD/TEAM scope, §8.3/§8.4 lock & snapshot FX, §5 infra additions: `rate_history`, `notifications`, PDF library pending). `CRM-Spec.md` is never modified.

### 4. Development log (separate STOP)
Ask before appending to `nimbalyst-local/wiki/develop-process.md`.

## Out of scope
Code, migrations (`team_memberships.is_lead/left_at`, `rate_history`, `notifications`, `legacy_ref`), PDF library selection (awaits template), CI additions (typecheck/SCA/SAST — noted in DoD only), R1 task breakdown.

## Risks
- Admin approval grant weakens SoD; mitigated only by mandatory comment, append-only audit and dashboard review flags — documented as accepted risk.
- Open: production DB/storage/backup owner and off-site location remain unresolved before deployment.

## Verification
- `git diff --stat` shows only `.md` files under `docs/` (+ wiki files if approved); no `src/`, `db/` changes.
- Grep checks: no remaining "manager approval" wording contradicting Admin grant in quotation/SO docs; rounding example `10.004 + 10.004 → 20.01` still present; no "Argon2", "VPS", "team_members" introduced as adopted.
- All new relative links resolve (`grep -o '](.*\.md)'` + `test -f`).
- `npm run lint`/`build` not required (docs only) — reported as NOT TESTED with reason.
