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

## Implemented R1-01 boundary

- Login, refresh, logout, invitation acceptance, current profile and effective permission endpoints under `/api/v1`.
- Admin read, disable, role assignment, team membership and market membership endpoints. Mutations require signed CSRF and exact-origin validation.
- Operator-only first-admin bootstrap and invitation delivery; no raw invitation token is returned by REST or logged.
- Default-deny application authorization with `NONE`, `OWN`, `TEAM`, `ASSIGNED` and explicit `ALL` scopes plus read/write field allowlists.
- Database-backed throttling, server-side session revocation, transactional audit events and versioned migration bookkeeping.
- Admin-only OpenAPI 3.1 JSON and self-hosted Swagger UI for the implemented access-control endpoints. Proposed business endpoints are not published.

Only fixed M29 access-administration grants are bootstrapped. Business resource grants remain inactive until the owning module policy is approved. Password recovery, MFA, email delivery and production deployment are outside this implementation.
