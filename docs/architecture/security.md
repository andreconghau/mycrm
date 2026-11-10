# Security Architecture

## Baseline

This implementation targets OWASP ASVS 5.0.0 Level 2 controls applicable to authentication, session management, authorization, input validation, APIs, cryptography, logging and data protection. It is an engineering baseline, not a legal or certification claim.

## Authentication

- Accounts are invite-only employees. Supported states are `INVITED`, `ACTIVE` and `DISABLED`.
- Passwords require 15–128 Unicode code points and impose no composition rule. Verifiers use Node.js scrypt with `N=2^17`, `r=8`, `p=1`, a 16-byte random salt and a 64-byte output.
- Login failures use generic responses. PostgreSQL stores a keyed HMAC of the normalized login identifier for fixed-window throttling; raw identifiers are not stored in the limiter.
- The first access administrator is created only through `npm run access:operator -- bootstrap-admin`. The CLI reads the password without echo or accepts `--password-stdin`.

## Sessions and cookies

- The access token is an HS256 JWT with issuer, audience, subject, session ID, JTI, issued-at and one-hour expiry claims.
- The renewal credential is an opaque 256-bit random value. Only its SHA-256 verifier is stored in `sessions`.
- Sessions have a seven-day absolute and three-day idle limit. Protected requests re-read active user/session/role/team/market state; disable, revoke and role removal therefore apply on the next request.
- Refresh rotates the opaque secret. A stale or mismatched secret revokes the server session.
- Logout revokes the current server session and clears all auth cookies. If the session is already missing or revoked, logout clears cookies and returns an unauthenticated terminal response so a lost response can be retried safely; CSRF or origin failures never clear the session.
- Production cookies use the `__Host-` prefix, `Secure`, `Path=/` and `SameSite=Lax`. Access and refresh cookies are `HttpOnly`; the CSRF cookie is intentionally readable by the same-origin client.

## CSRF and request boundaries

Unsafe authenticated requests require both an exact trusted `Origin`/`Referer` origin and a signed double-submit token bound to the session ID. SameSite is defense in depth, not the sole control. Route handlers validate bodies and positive integer identifiers with Zod.

## Authorization

Effective access is the intersection of active account/session, active role grant, current team/market membership, resource/action, record scope and explicit field lists. Unknown resources, actions, roles, scopes and empty grants deny access. `ALL` is explicit. Browser controls and market selection never grant access.

The bootstrap policy grants `admin` only M29 resources (`access.users`, `access.roles`, `access.grants`, `access.teams`, `access.markets`). No customer, commercial, document or finance grant is activated by this task. Role-grant mutation endpoints remain intentionally absent until module policies are approved.

## Evidence file uploads (approved, not implemented)

Commercial evidence uploads accept jpg, png, webp, pdf, eml and msg up to 20 MB per file. The server verifies the real MIME type, stores SHA-256 and uploader metadata, keeps files immutable (replacement voids the prior file with a reason) and serves downloads only through authorized API routes. See [R1 decisions §7](../business/r1-decisions.md#7-evidence-files-sales-order-confirmation-and-quotation-acceptance).

## API documentation

The OpenAPI JSON endpoint and localized Swagger UI require the same server-side `access.grants:read` permission. The document includes only implemented routes and synthetic schema examples; it contains no credentials, invitation tokens or production data. Responses are `private, no-store`. Swagger is self-hosted, sends requests only to the current origin and copies the readable signed CSRF cookie into `X-CSRF-Token` for unsafe “Try it out” requests. HttpOnly access and refresh cookies remain inaccessible to JavaScript.

## Secrets and logging

`DATABASE_URL`, `AUTH_ACCESS_SECRET` and `AUTH_CSRF_SECRET` are server-only. Authentication responses never contain bearer or refresh tokens. Logs record only safe error categories; password, JWT, renewal secret, invitation token and raw request body values are excluded. Security and access mutations append redacted audit events.

## Deferred controls

MFA, password recovery, compromised-password blocklist integration, production key management/rotation, email invitation delivery, production distributed rate-limit sizing, DAST and operational retention remain outside this task and require separate approval.
