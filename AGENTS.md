# Seafood Export CRM — Agent Instructions

## 1. Project Context

Internal B2B Seafood Export CRM. Releases: R1 Core CRM, R2 Export Execution, R3 Supply & Finance.

**Read in priority order:**

1. `AGENTS.md`
2. `docs/context.md`
3. `docs/modules/README.md`
4. Relevant files in `docs/tasks/`, `docs/modules/`, `docs/architecture/`, `docs/business/`
5. `docs/design-system.md`

Verify file existence and actual implementation. Never assume planned features exist. Nimbalyst owns live task status.

**Language:** Communicate with the owner in Vietnamese. Write code, comments, SQL, tests, documentation and commits in English.

**Priorities:** Correctness → Data integrity → Security → Fault tolerance → Performance → Scalability → Maintainability.

## 2. Mandatory Task Workflow

Apply automatically to **every development task**, even when not repeated in the prompt.

`PLAN → /grill-me → PLAN APPROVAL → DOCS DECISION → IMPLEMENTATION APPROVAL → CODE → TEST + /goal → DEV LOG DECISION → SPEC UPDATE DECISION → REPORT`

### Planning

- Always start in Plan mode (`/plan`).
- Read relevant docs, inspect code, verify prerequisites and dependencies.
- Use `/grill-me` for unresolved material decisions; recommend the best option with trade-offs.
- Present objective, scope, approach, affected files, risks, tests and acceptance criteria.
- **STOP: Request explicit Plan approval.**

### Documentation

- Identify `.md` files requiring changes and explain why.
- **STOP: Ask before updating specifications.**
- Report unresolved conflicts; do not silently change business rules.

### Implementation

- **STOP: Request separate Implementation approval.**
- Apply `frontend-patterns`; use `database-migrations` for DB changes.
- Implement only approved scope. Reuse existing patterns.
- If new material uncertainty arises, pause affected work and use `/grill-me`.

### Verification

- Run `npm run lint` and `npm run build` after application code changes.
- Run relevant unit/integration/API/UI/security tests.
- Verify positive/negative authorization, transactions and migrations where applicable.
- Run `/goal` if available and approved; otherwise report limitation and review acceptance criteria manually.
- Report `PASS / FAIL / BLOCKED / NOT TESTED` with evidence.
- Review final diff; preserve unrelated edits.

### Development Log

**STOP:** Ask before appending to `nimbalyst-local/wiki/develop-process.md`.

Format: `Date → Task → Topic → Status → Implemented → Not Implemented → Decisions → Verification → Risks → Next Steps`.

### Specification Update

**STOP:** Ask before comparing `nimbalyst-local/wiki/CRM-Spec.md` and appending approved differences to `nimbalyst-local/wiki/spec-updating-v1.md`.

Never overwrite the original spec. Do not confuse incomplete work with approved spec changes.

### Completion

Report implemented work, pending items, actual test results, risks and documentation status. Update Nimbalyst according to verified status. Never automatically start the next task.

## 3. Architecture & Database

**Stack:** Next.js App Router, strict TypeScript, React, Tailwind, shadcn/ui, PostgreSQL, Drizzle/Postgres.js, Docker Compose, REST `/api/v1`, OpenAPI 3.1.

**Architecture:** Modular Monolith + Clean Architecture.

`Route/Action → Application Use Case → Domain/Repository Port → Infrastructure Adapter`

- Keep routes thin; validate and authorize server-side.
- Reuse existing code and UI patterns.
- No unrelated refactoring, new dependencies or infrastructure without approval.
- No process-local coordination across instances.
- Use versioned SQL-only migrations.
- Primary keys: approved integer auto-increment strategy.
- **No SQL `FOREIGN KEY` / `REFERENCES` without explicit approval.**
- Enforce logical relationships and ownership in application services.
- Use transactions for multi-record operations and mandatory audit.
- Preserve UNIQUE/CHECK/NOT NULL/indexes and commercial snapshots.
- Use fixed-precision money, UTC timestamps and explicit business timezones.
- Keep schema, comments, ERD and dictionary synchronized.

## 4. Authentication & Security

- Roles: `admin`, `manager`, `sale`, `accountant`.
- Invite-only, email/password, JWT HttpOnly cookies.
- Access token: 1 hour; session: 7-day absolute, 3-day idle; no MFA.
- Revocation and role removal effective on the next request.
- Default deny: actor + resource + action + record scope + field/state policy.
- Business grants require explicit module-level approval.
- Admin cannot automatically bypass business/financial approvals.
- Protect sensitive reads, writes, files, exports and aggregates.
- Mandatory audit failure rolls back the associated transaction.
- Never expose secrets, tokens, passwords or unredacted sensitive data.
- Follow applicable OWASP ASVS requirements.
- PR security gates: SCA, SAST, secret scanning. Pre-production: DAST/ASVS review.
- Block unresolved Critical/High findings; Medium requires remediation or approved risk acceptance.

## 5. Skills

**Preapproved:** `grill-me`, `frontend-patterns`, `database-migrations`.

1. Prefer `.agents/skills/<name>/SKILL.md`, then `.codex/skills/<name>/SKILL.md`, then runtime catalog.
2. Read skill instructions before use; announce selected skills briefly.
3. `/grill-me`: requirements and decisions.
4. `frontend-patterns`: approved frontend/backend coding.
5. `database-migrations`: schema and migration work.
6. Other skills require approval before reading/applying.
7. `/goal`: verify availability and approval; never claim execution if unavailable.
8. Skill approval does not imply Implementation approval.

## 6. Graphify & PostgreSQL MCP

**Graphify:** If `graphify-out/graph.json` exists, run `graphify query` before codebase source searches. Use `graphify path/explain` for dependencies, verify against source and run `graphify update .` after code changes. Fall back to targeted inspection if unavailable.

**PostgreSQL MCP:** Server `postgres` (`@microsoft/postgres-mcp`), profile `dev`, database `seafood_crm`.

Use `postgres_mcp_list_connection_profiles` → `postgres_mcp_connect`.

Default **read-only**. Never modify data/schema or execute migrations without explicit approval. Report connection failures accurately.

## 7. Next.js Rules

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 8. Task Prompt Contract

New tasks only need:

- Task ID and module.
- Prerequisites.
- Work/scope.
- Acceptance criteria.
- Exceptional constraints, if any.

All workflow, approvals, coding, security, testing and documentation rules above apply automatically.

**Always begin in Plan mode. Never implement before explicit approval.**
