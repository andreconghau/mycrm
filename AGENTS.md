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

- Discover available skills before executing tasks.
- Identify relevant skills based on task requirements.
- Read skill metadata (`name`, `description`) to determine relevance.
- **Do not activate or execute any skill without explicit user approval.**
- Before starting the task, present:
  - **Skill:** Name of the proposed skill.
  - **Purpose:** Why this skill is relevant.
  - **Benefit:** What the skill will contribute to the task.
- Ask the user to confirm whether to use the proposed skill(s).
- If multiple skills are relevant, present them together for approval.
- Wait for explicit user confirmation before reading the full `SKILL.md` or applying its workflow.
- If approved, read the selected `SKILL.md` and follow its instructions.
- If rejected, proceed without the rejected skill using standard Codex capabilities.
- Do not repeatedly request approval for skills already approved within the same task.
- If additional skills become necessary during execution, request approval before using them.
- Prefer project-specific skills over generic skills when appropriate.
- Do not force unrelated skills.
- Report which skills were used and why in the final task summary.

### Skill Approval Gate

**Mandatory:** Never invoke a skill implicitly, even if it is an obvious match, without first obtaining explicit user approval.

Skill discovery and metadata inspection are permitted without approval. Reading full skill instructions and executing skill workflows require approval.

This approval requirement applies to every new task, unless the user has already explicitly authorized specific skills for that task.

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
