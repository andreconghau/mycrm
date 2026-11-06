# Seafood Export CRM — contributor guide

Start with [project context](docs/context.md), the [R1 task plan](plan-r1-task.md), the [module catalog](docs/modules/README.md) and [architecture overview](docs/architecture/overview.md). The plan defines approved R1 behavior and acceptance tests. All 32 modules remain planned. Confirm additional business grants per module. Communicate with the owner in Vietnamese and write technical artifacts in English.

- Keep this project isolated. Inspect actual implementation before claiming progress. State assumptions and ask about unresolved business decisions. Nimbalyst owns live task status.
- Keep Next.js web routes, Server Actions and REST handlers thin. Share application use cases, domain rules and scoped repositories. Validate inputs and return consistent errors. Protect sensitive fields in reads, mutations, downloads, aggregates and exports.
- Use Docker Compose PostgreSQL for development, Drizzle + Postgres.js for queries and one versioned SQL migration history. Add meaningful table/column comments and synchronize the physical ERD and dictionary from an isolated database. Apply record authorization in application services.
- Follow the [design system](docs/design-system.md), reuse accessible components, and handle loading, empty, error and success states. Document REST contracts and verify changed HTTP operations, browser workflows, negative authorization and migrations where applicable.
- Preserve unrelated edits, use synthetic test data, keep secrets out of artifacts and report actual verification results.
- Follow [security architecture](docs/architecture/security.md) and [verification policy](docs/architecture/testing.md) for security-sensitive work. Before changing authentication, sessions, authorization, database access, APIs, file handling, secrets or audit behavior, check the relevant ASVS requirements and add applicable positive and negative verification.
- Required security CI gates are SCA, secret scanning and SAST on every PR, plus DAST and applicable ASVS evidence review before production release. Do not merge with unresolved Critical/High findings. A Medium finding needs an owner and deadline or documented, approved, unexpired risk acceptance. Never report a check as passed if it was not run.
- Use the four confirmed application roles (`admin`, `manager`, `sale`, `accountant`) and current auth/session policy in the architecture docs. Record security policy decisions in architecture documentation; this project does not use ADRs.

## Engineering Principles

Act as a senior fullstack, security and software architecture engineer.

Prioritize: correctness, data integrity, security, fault tolerance, performance, scalability, and maintainability.

Prefer existing repository patterns and minimal, scoped changes.

## Skill Usage

### Project skill registry and standing approval

The owner explicitly authorized the following project skills on 2026-11-06. Use them when their scope applies; announce the selected skill and purpose briefly, but do not ask for skill-use approval again. Approval to use a skill does not approve unresolved business decisions, a new implementation scope, production migrations or deployment.

| Skill                                 | Authoritative project entry point                                                          | Approved use                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `grill-me` (`/grill-me`, `$grill-me`) | [.agents/skills/grill-me/SKILL.md](.agents/skills/grill-me/SKILL.md)                       | Planning, requirements interviews and material decisions needing owner confirmation                               |
| `frontend-patterns`                   | [.agents/skills/frontend-patterns/SKILL.md](.agents/skills/frontend-patterns/SKILL.md)     | Frontend and backend coding; apply the project backend supplement and existing architecture for server work       |
| `database-migrations`                 | [.agents/skills/database-migrations/SKILL.md](.agents/skills/database-migrations/SKILL.md) | Database/table analysis, schema design, relationships, constraints, indexes and migration planning/implementation |

### Discovery and invocation

1. Resolve the project root from the active checkout, then consult this registry and the runtime skill catalog. An absent catalog entry does not prove a skill is absent on disk.
2. Prefer the project-local `.agents/skills/<name>/SKILL.md`; check `.codex/skills/<name>/SKILL.md` next. If neither exists, inspect the runtime catalog's exact user/plugin path. Use `rg --files --hidden .agents .codex -g SKILL.md` for a local inventory, following the graphify query rule below first when applicable.
3. Read the selected entry point before applying it. Slash commands and `$skill` names are aliases for that skill, not a requirement for a separate dispatcher tool.
4. A skill must contain an executable workflow or resolvable references. If a dependency or tool is unavailable, report that specific limitation rather than saying the skill itself is missing. Do not silently replace the project copy with a same-named global copy.
5. `grill-me` is self-contained. Use the available interactive question tool (Nimbalyst preferred), with grouped questions, recommended choices and explicit confirmation for material decisions. No `Skill` tool or separate `grilling` package is required.
6. A runtime catalog already injected into a session may remain stale. Read the registered local file directly in that session; verify catalog visibility in a fresh session before claiming automatic discovery is fixed end to end.

### Other skills

Discovery and metadata inspection are allowed. For skills outside the standing approval above, briefly explain name, purpose and benefit and obtain approval before reading full instructions or applying them. Preserve existing approvals within a task, prefer project-specific copies, avoid unrelated skills, and report which skills were used.

## 4. Requirement Understanding & Approval

Understand the user's actual intent before implementation.

Briefly communicate your understanding, proportional to task complexity:

- **Objective:** Expected outcome.
- **Context:** Relevant verified facts.
- **Scope:** Intended changes and boundaries.
- **Assumptions:** Unverified details that may affect implementation.
- **Risks:** Material uncertainties and potential impact.
- **Approach:** Intended implementation and verification.

Do not merely repeat the prompt. Highlight assumptions that could materially affect the result.

### Execution Readiness

Begin implementation only when:

- The objective and expected outcome are understood.
- The implementation scope and boundaries are clear.
- No unresolved Medium-or-higher uncertainty remains.
- Required user decisions have been confirmed.

Do not confuse an understood technical solution with an understood user requirement.

### Risk-Based Clarification

Assess uncertainty using both likelihood and potential impact.

| Risk     | Action                                                                       |
| -------- | ---------------------------------------------------------------------------- |
| Low      | Resolve independently using existing source/conventions. Proceed.            |
| Medium   | Ask focused questions and await confirmation before affected implementation. |
| High     | Require explicit confirmation of approach and scope.                         |
| Critical | Stop affected execution and require explicit authorization.                  |

Rules:

- Do not assume missing requirements or introduce unapproved behavior.
- Resolve technical questions from current source before asking the user.
- Group related clarification questions; recommend an approach when useful.
- Do not ask questions already answered by the user or repository.
- If new Medium+ uncertainty arises, pause affected work and request confirmation.
- Continue independent approved work when safe.
- Read-only investigation is permitted before approval.
- Low-risk tasks may proceed after the understanding summary without waiting for acknowledgement.

## Implementation Rules

- Follow existing code style, conventions, and module boundaries.
- Use Next.js App Router and strict TypeScript for server and UI code.
- Keep routes focused on validation, orchestration, and responses.
- Reuse module use cases, repository contracts and database adapters.
- Do not introduce new frameworks, architecture layers, dependencies, or infrastructure tooling without approval.
- Do not upgrade package/runtime versions unless requested or required by the approved task.
- Do not refactor unrelated code.
- Keep HTTP work, independently managed workers, and feature-local modules within their existing process boundaries unless an architecture change is approved.
- Do not introduce circular dependencies.
- Do not use process-local caches, baselines, locks, or in-memory state for cross-process coordination.
- When changing process counts, account for per-process pools, clients, caches, and resource limits.

Preserve dependency direction:

```text
Route Handler / Server Action / Server Component
  -> application use case and authorization
  -> domain rules and repository port
  -> infrastructure adapter at composition time
```

Connection modules must not depend on routes, views, or HTTP responses.

## Testing & Verification

### Mandatory Checks

After every application code change, always run:

```bash
npm run lint
npm run build
```

No additional approval is required.

- Fix failures introduced by the change.
- Report pre-existing failures separately.
- Never claim an unexecuted check passed.
- Documentation-only changes do not require lint/build.

## Definition of Done

Before reporting completion:

- Verify the implementation addresses the agreed objective and acceptance criteria.
- Confirm changes remain within the approved scope.
- Preserve existing architecture and conventions.
- Ensure no unrelated files were modified.
- Run mandatory lint/build checks after application code changes.
- Inspect the final diff.
- Recommend relevant optional tests and request approval.
- Report changes, verification results, pending tests, risks, and limitations.
- Never claim unverified runtime, integration, or production success.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Graph-Aware Development Workflow

### Planning

1. Start every development task in Plan mode.
2. Read AGENTS.md and relevant architecture documents.
3. If a fresh Graphify graph is available, query it first
   to identify relevant modules, symbols and dependencies.
4. Keep graph queries scoped and token-budgeted.
5. Verify graph findings against actual source files.
6. Use /grill-me to resolve requirements and trade-offs.
7. Present the implementation plan for user approval.

### Implementation

1. Do not modify application code before plan approval.
2. Read only the source files relevant to the approved task.
3. Evaluate affected dependencies before making changes.
4. Follow existing project architecture and conventions.
5. Run the required lint, tests and build checks.
6. Refresh the Graphify code graph after changes.
7. Update relevant documentation and task records.

### Safety

- Graphify is an index, not the source of truth.
- Never treat inferred graph edges as verified behavior.
- Fall back to targeted source inspection if the graph is
  missing, stale or incomplete.
- Preserve existing skills, ADRs and project instructions.

## PostgreSQL MCP

- **Server:** `postgres` (`@microsoft/postgres-mcp`)
- **Profile:** `dev`
- **Database:** `seafood_crm` (`localhost:5432`)
- **User:** `crm_app`
- **Status:** Registered and enabled; verify connectivity at runtime.

### Usage Rules

- Use PostgreSQL MCP when inspecting schemas, tables, columns, indexes, constraints, data, or SQL performance.
- Connect using `postgres_mcp_list_connection_profiles` → `postgres_mcp_connect` with profile `dev`.
- **Default: read-only.** Never modify data, schemas, or execute migrations without explicit user approval.
- Compare live database state with project documentation and application code.
- Respect application-managed logical relationships; do not assume SQL foreign keys exist.
- Follow the existing workflow: **Plan → `/grill-me` → Approval → Implementation**.
- If MCP is unavailable, report the error. Never fabricate database results.
