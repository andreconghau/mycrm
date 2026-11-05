# M29 — Access Control

> **Status: PLANNED — NOT IMPLEMENTED**  
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
