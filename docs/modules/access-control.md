# M29 — Access Control

> **Status: R1 FOUNDATION IMPLEMENTED — BUSINESS GRANTS PENDING**
> **Area:** System · **Release:** R1 · **Reference:** [`docs/context.md`](../context.md)

## Purpose
Manage identity, role membership, team ownership and action-level policies.

## R1 workflow and acceptance

- Invite employees, manage teams and direct managers, implement email/password login, cookie sessions and per-module application grants. Deny anonymous, expired, disabled, revoked and wrong-owner requests through real endpoints. Role removal is effective on the next request.

## Proposed fields

- `User`: `id`, `email`, `display_name`, `status`, `team_id?`, `last_login_at?`.
- `Role`: `id`, `code`, `description`, `is_system`, `status`.
- `Permission`: `resource`, `action`, `scope`, `field_policy?`; `RolePermission`, `UserRole`, `TeamMembership` with effective dates where needed.
- `ApprovalDelegation`: time-limited actor/permission/action scope (only if required by policy).

## Proposed use cases and endpoints

- `CreateUser`, `DisableUser`, `GrantRole`, `RevokeRole`, `GetEffectivePermissions`, `AuthorizeRecordAction`.
- `GET/POST /api/v1/admin/users`; `POST /api/v1/admin/users/:id/roles`; `GET /api/v1/me/permissions` (safe projection).

## Approved administrator account policy

- Admin users receive all active application permissions, including access-administration permissions. For each approved module policy, the Admin grant uses `ALL` record scope and the module's full writable field set; currently implemented for Customers. Admins may manage roles/permissions for non-admin users.
- An Admin may edit only their own profile, limited to `displayName`. Email changes are not available through the self-service profile API.
- Admin accounts are protected from application-level disable and role changes. The application cannot grant the Admin role or change any role assignment on an Admin account; those account lifecycle changes require a manual database operation.
- These rules apply even when multiple Admin users exist. They do not grant one Admin authority to disable or demote another Admin.
- `PATCH /api/v1/me` persists the authenticated user's display name only. Email and role fields are rejected; the update and audit event share a transaction.
- Admin account protections are enforced in the repository transaction for role assignment and account disable, including prevention of concurrent changes while the target user row is locked.
- Admin bootstrap seeds the M29 administration grants and the approved M01 Customer `ALL` grants; the shared Customer policy is also used by the operator grant command.

## Implemented R1-01 boundary

- Login, refresh, logout, invitation acceptance, current profile and effective permission endpoints under `/api/v1`.
- Admin read, disable, role assignment, team membership and market membership endpoints. Mutations require signed CSRF and exact-origin validation.
- Operator-only first-admin bootstrap and invitation delivery; no raw invitation token is returned by REST or logged.
- Default-deny application authorization with `NONE`, `OWN`, `TEAM`, `ASSIGNED` and explicit `ALL` scopes plus read/write field allowlists.
- Database-backed throttling, server-side session revocation, transactional audit events and versioned migration bookkeeping.
- Existing auth and access mutations pass a request correlation UUID into the same-transaction audit event. Safe diffs are projected from an allowlist; audit history UPDATE/DELETE is blocked by migration `0002_audit_events_append_only.sql`.
- R1-02 adds administrator-only audit history reads. No non-admin audit grant or Auditor role is enabled.
- OpenAPI 3.1 JSON and self-hosted Swagger UI are currently public at `/api/v1/openapi.json`, `/api/v1/swagger-assets/*` and `/api-docs`; no app login is required to load the docs. Proposed business endpoints are not published.
- `/api-docs` is shared outside the locale and workspace layout. Basic Auth is planned for a later change. API operations retain their existing authentication and authorization requirements.

Only fixed M29 access-administration grants are bootstrapped. Business resource grants remain inactive until the owning module policy is approved. Password recovery, MFA, email delivery and production deployment are outside this implementation.
