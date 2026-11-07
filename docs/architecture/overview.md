# Architecture Overview

## Runtime shape

The R1 application is a Next.js 16 App Router modular monolith. Local development uses PostgreSQL from Docker Compose. HTTP route handlers and server layouts call application services; application services enforce authentication and authorization before repositories access PostgreSQL through Drizzle and Postgres.js.

```mermaid
flowchart LR
  Browser --> Route[Route Handler or Server Layout]
  Route --> UseCase[Application Use Case]
  UseCase --> Policy[Authorization Policy]
  UseCase --> Repository[Scoped Repository]
  Repository --> DB[(PostgreSQL)]
  UseCase --> Audit[Transactional Audit Event]
```

## Dependency direction

Presentation code depends on access-control application services. Application services depend on domain types and repository contracts. Infrastructure owns Postgres.js composition, Drizzle mappings, password verification, JWT signing, cookie handling and CSRF primitives. Database modules do not import HTTP responses or UI components.

## Implemented R1-00/R1-01 boundary

- Versioned migration bookkeeping fingerprints the existing fresh-schema initializer and applies incremental migrations.
- Employee authentication uses database-backed, revocable sessions behind short-lived cookie JWTs.
- Authorization is default-deny across resource, action, record scope and explicit field lists.
- Only M29 access-administration grants can be bootstrapped. CRM business grants remain inactive pending module-level approval.
- Invitations are delivered through an operator CLI in R1. No email provider or automated outbound delivery is implemented.
- The implemented REST boundary has an OpenAPI 3.1 contract and self-hosted Swagger UI. Both are server-authorized with `access.grants:read`; planned endpoints are excluded.

The application remains a partial R1 implementation. Business modules still render synthetic prototype data and must not be treated as database-backed or production-ready.
