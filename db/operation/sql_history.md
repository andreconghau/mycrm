# SQL Operation History

## 2026-11-10 — Seed markets and grant user 27

- Database: `seafood_crm` (`dev` profile).
- Authorized actor: active admin user `27`, with active `access.markets:manage` grant.
- User-confirmed operation: create KR/JP/US markets using approved metadata and grant all three to user `27`.
- Request ID: `2e2f0e13-8264-4d61-8df7-347cba61df5b`.
- Result: 3 markets created, 3 active memberships granted, 6 successful audit events recorded. Verification returned KR `1`, JP `2`, US `3`; each membership is active with no revocation timestamp.

### Read-only diagnosis

```sql
SELECT
    u.id AS user_id,
    u.status AS user_status,
    m.id AS market_id,
    m.code AS market_code,
    m.active AS market_active,
    umm.active AS membership_active,
    umm.revoked_at
FROM public.users AS u
LEFT JOIN public.user_market_memberships AS umm
    ON umm.user_id = u.id
LEFT JOIN public.markets AS m
    ON m.id = umm.market_id
WHERE u.id = 27
ORDER BY m.code;
```

```sql
SELECT
    id,
    code,
    name_en,
    default_currency,
    active
FROM public.markets
ORDER BY code;
```

```sql
SELECT
    ur.role_code,
    ur.active AS role_active
FROM public.user_roles AS ur
WHERE ur.user_id = 27
ORDER BY ur.role_code;
```

```sql
SELECT
    rg.role_code,
    rg.resource,
    rg.action,
    rg.active
FROM public.role_grants AS rg
JOIN public.user_roles AS ur
    ON ur.role_code = rg.role_code
WHERE ur.user_id = 27
    AND ur.active = true
    AND rg.resource = 'access.markets'
    AND rg.action = 'manage';
```

```sql
SELECT
    u.id AS user_id,
    u.status AS user_status,
    ur.role_code,
    ur.active AS role_active,
    rg.active AS market_manage_grant_active,
    m.code AS market_code,
    m.active AS market_active,
    umm.active AS membership_active
FROM public.users AS u
LEFT JOIN public.user_roles AS ur
    ON ur.user_id = u.id
    AND ur.role_code = 'admin'
LEFT JOIN public.role_grants AS rg
    ON rg.role_code = ur.role_code
    AND rg.resource = 'access.markets'
    AND rg.action = 'manage'
LEFT JOIN public.user_market_memberships AS umm
    ON umm.user_id = u.id
LEFT JOIN public.markets AS m
    ON m.id = umm.market_id
WHERE u.id = 27
ORDER BY m.code;
```

### Applied SQL

The statement below is atomic. It validates the active admin actor and market-management grant, refuses to seed if an existing KR/JP/US definition conflicts, inserts or verifies the approved market definitions, upserts the three memberships, and writes audit events in the same statement.

```sql
WITH
actor AS MATERIALIZED (
    SELECT u.id
    FROM public.users AS u
    JOIN public.user_roles AS ur ON ur.user_id = u.id
    JOIN public.role_grants AS rg ON rg.role_code = ur.role_code
    WHERE u.id = 27
        AND u.status = 'ACTIVE'
        AND ur.role_code = 'admin'
        AND ur.active = true
        AND rg.resource = 'access.markets'
        AND rg.action = 'manage'
        AND rg.active = true
    LIMIT 1
    FOR UPDATE OF u
),
seed_values(code, name_en, name_vi, default_currency) AS (
    VALUES
        ('KR', 'South Korea', 'Hàn Quốc', 'KRW'),
        ('JP', 'Japan', 'Nhật Bản', 'JPY'),
        ('US', 'United States', 'Mỹ', 'USD')
),
seed_guard AS MATERIALIZED (
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.markets AS m
        JOIN seed_values AS s ON s.code = m.code
        WHERE m.active IS DISTINCT FROM true
            OR m.name_en IS DISTINCT FROM s.name_en
            OR m.name_vi IS DISTINCT FROM s.name_vi
            OR m.default_currency IS DISTINCT FROM s.default_currency
    ) AS definitions_match
),
seeded_markets AS (
    INSERT INTO public.markets (code, name_en, name_vi, default_currency)
    SELECT s.code, s.name_en, s.name_vi, s.default_currency
    FROM seed_values AS s
    CROSS JOIN actor AS a
    CROSS JOIN seed_guard AS g
    WHERE g.definitions_match
    ON CONFLICT (code) DO UPDATE
        SET code = EXCLUDED.code
        WHERE public.markets.active = true
            AND public.markets.name_en = EXCLUDED.name_en
            AND public.markets.name_vi = EXCLUDED.name_vi
            AND public.markets.default_currency = EXCLUDED.default_currency
    RETURNING id, code, (xmax = 0) AS created
),
market_audit AS (
    INSERT INTO public.audit_events (
        market_id, actor_id, action, resource_type, resource_id,
        request_id, safe_diff, result
    )
    SELECT
        m.id, a.id, 'access.market_initialized', 'market', m.id,
        '2e2f0e13-8264-4d61-8df7-347cba61df5b'::uuid,
        jsonb_build_object('marketCode', m.code),
        'SUCCESS'
    FROM seeded_markets AS m
    CROSS JOIN actor AS a
    WHERE m.created = true
    RETURNING id
),
membership_changes AS (
    INSERT INTO public.user_market_memberships (
        market_id, user_id, active, granted_by, granted_at,
        revoked_at, revoked_by
    )
    SELECT m.id, a.id, true, a.id, now(), NULL, NULL
    FROM seeded_markets AS m
    CROSS JOIN actor AS a
    ON CONFLICT (user_id, market_id) DO UPDATE
        SET active = true,
            granted_by = EXCLUDED.granted_by,
            granted_at = now(),
            revoked_at = NULL,
            revoked_by = NULL,
            updated_at = now(),
            version = public.user_market_memberships.version + 1
        WHERE public.user_market_memberships.active IS DISTINCT FROM true
            OR public.user_market_memberships.revoked_at IS NOT NULL
    RETURNING id, market_id, user_id, granted_by
),
membership_audit AS (
    INSERT INTO public.audit_events (
        market_id, actor_id, action, resource_type, resource_id,
        request_id, safe_diff, result
    )
    SELECT
        c.market_id, c.granted_by, 'access.market_granted', 'market',
        c.market_id, '2e2f0e13-8264-4d61-8df7-347cba61df5b'::uuid,
        jsonb_build_object('userId', c.user_id, 'active', true),
        'SUCCESS'
    FROM membership_changes AS c
    RETURNING id
)
SELECT
    m.code AS market_code,
    m.id AS market_id,
    umm.user_id,
    umm.active AS membership_active,
    umm.revoked_at,
    (SELECT count(*) FROM market_audit) AS market_audit_rows,
    (SELECT count(*) FROM membership_audit) AS membership_audit_rows
FROM seeded_markets AS m
JOIN public.user_market_memberships AS umm
    ON umm.market_id = m.id
    AND umm.user_id = 27
ORDER BY m.code;
```

### Read-only verification

```sql
SELECT
    m.id AS market_id,
    m.code AS market_code,
    m.name_en,
    m.name_vi,
    m.default_currency,
    m.active AS market_active,
    umm.user_id,
    umm.active AS membership_active,
    umm.revoked_at,
    umm.granted_by
FROM public.markets AS m
LEFT JOIN public.user_market_memberships AS umm
    ON umm.market_id = m.id
    AND umm.user_id = 27
WHERE m.code IN ('KR', 'JP', 'US')
ORDER BY m.code;
```

```sql
SELECT
    request_id,
    action,
    resource_type,
    resource_id,
    market_id,
    safe_diff,
    occurred_at
FROM public.audit_events
WHERE actor_id = 27
    AND action IN ('access.market_initialized', 'access.market_granted')
    AND occurred_at >= now() - interval '10 minutes'
ORDER BY occurred_at, action, resource_id;
```

### Rejected attempt

An earlier write attempt was rejected by the PostgreSQL MCP profile while it was in read-only mode. The database did not execute that statement; it is therefore not recorded as an applied operation.

## 2026-11-10 — Activate approved Customer role grants

- Database: `seafood_crm` (`dev` profile).
- Authorized actor: active admin user `27`, with active `access.grants:manage` grant.
- User-confirmed scope: activate the approved M01 policy for `sale` OWN, `manager` TEAM, and `admin` ALL.
- Request ID: `9f1d46c0-75e7-469f-9825-39ce7ac5dd71`.
- Result: all 12 approved Customer role/action/scope combinations are active with the expected field policies. Audit event `access.customer_grants_activated` was recorded for actor `27`.

### Applied SQL

```sql
WITH
actor AS MATERIALIZED (
    SELECT u.id
    FROM public.users AS u
    JOIN public.user_roles AS ur ON ur.user_id = u.id
    JOIN public.role_grants AS actor_grant ON actor_grant.role_code = ur.role_code
    WHERE u.id = 27
        AND u.status = 'ACTIVE'
        AND ur.role_code = 'admin'
        AND ur.active = true
        AND actor_grant.resource = 'access.grants'
        AND actor_grant.action = 'manage'
        AND actor_grant.active = true
    LIMIT 1
    FOR UPDATE OF u
),
grant_values(role_code, resource, action, record_scope, read_fields, write_fields, active) AS (
    VALUES
        ('sale', 'customers', 'create', 'OWN', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'teamId', 'addresses', 'identifiers']::text[], true),
        ('sale', 'customers', 'read', 'OWN', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY[]::text[], true),
        ('sale', 'customers', 'update', 'OWN', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'addresses', 'identifiers']::text[], true),
        ('sale', 'customers', 'archive', 'OWN', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY[]::text[], true),
        ('manager', 'customers', 'read', 'TEAM', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY[]::text[], true),
        ('manager', 'customers', 'update', 'TEAM', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'addresses', 'identifiers']::text[], true),
        ('manager', 'customers', 'reassign', 'TEAM', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['ownerId', 'teamId']::text[], true),
        ('admin', 'customers', 'create', 'ALL', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'addresses', 'identifiers']::text[], true),
        ('admin', 'customers', 'read', 'ALL', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY[]::text[], true),
        ('admin', 'customers', 'update', 'ALL', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'addresses', 'identifiers']::text[], true),
        ('admin', 'customers', 'archive', 'ALL', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'addresses', 'identifiers']::text[], true),
        ('admin', 'customers', 'reassign', 'ALL', ARRAY['id', 'code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'version', 'addresses', 'identifiers']::text[], ARRAY['code', 'legalName', 'tradeName', 'countryCode', 'preferredLanguage', 'preferredCurrency', 'website', 'status', 'ownerId', 'teamId', 'addresses', 'identifiers']::text[], true)
),
grant_changes AS (
    INSERT INTO public.role_grants (
        role_code, resource, action, record_scope, read_fields,
        write_fields, active, changed_by
    )
    SELECT
        v.role_code, v.resource, v.action, v.record_scope,
        v.read_fields, v.write_fields, v.active, a.id
    FROM grant_values AS v
    CROSS JOIN actor AS a
    ON CONFLICT (role_code, resource, action, record_scope)
    DO UPDATE SET
        read_fields = EXCLUDED.read_fields,
        write_fields = EXCLUDED.write_fields,
        active = true,
        changed_by = EXCLUDED.changed_by,
        updated_at = now(),
        version = public.role_grants.version + 1
    WHERE public.role_grants.read_fields IS DISTINCT FROM EXCLUDED.read_fields
        OR public.role_grants.write_fields IS DISTINCT FROM EXCLUDED.write_fields
        OR public.role_grants.active IS DISTINCT FROM true
    RETURNING id
),
grant_audit AS (
    INSERT INTO public.audit_events (
        actor_id, action, resource_type, request_id, safe_diff, result
    )
    SELECT
        a.id,
        'access.customer_grants_activated',
        'role_grant',
        '9f1d46c0-75e7-469f-9825-39ce7ac5dd71'::uuid,
        jsonb_build_object('grantBoundary', 'M01_CUSTOMERS_APPROVED'),
        'SUCCESS'
    FROM actor AS a
    WHERE EXISTS (SELECT 1 FROM grant_changes)
    RETURNING id
)
SELECT
    (SELECT count(*) FROM grant_changes) AS changed_grant_count,
    (SELECT count(*) FROM grant_audit) AS audit_event_count;
```

### Read-only verification

```sql
SELECT
    role_code,
    action,
    record_scope,
    active,
    array_length(read_fields, 1) AS readable_field_count,
    array_length(write_fields, 1) AS writable_field_count
FROM public.role_grants
WHERE resource = 'customers'
    AND role_code IN ('sale', 'manager', 'admin')
ORDER BY role_code, action;
```

```sql
SELECT
    request_id,
    actor_id,
    action,
    resource_type,
    safe_diff,
    occurred_at
FROM public.audit_events
WHERE request_id = '9f1d46c0-75e7-469f-9825-39ce7ac5dd71'::uuid
ORDER BY occurred_at;
```

### Rejected operator attempt

The local `grant-customers` operator was also attempted, but `tsx` was blocked by the sandbox before the script or any SQL ran (`listen EPERM` on its IPC pipe). The successful audited SQL above was applied through PostgreSQL MCP instead.
## 2026-11-11 — Migration 0004: Product Specifications (R1-06)

`db/migrations/0004_product_specifications.sql` extends the baseline `specifications` and `specification_versions` tables with buyer, multilingual, technical, packaging, handling and audit fields. It adds lifecycle and measurement constraints, lookup/history indexes, a partial unique index allowing one approved revision per specification, and a database trigger preventing content edits after approval. The matching `.down.sql` removes the additions.

Validation: `npm run db:validate-migrations` passed in an isolated PostgreSQL schema after rerunning with sandbox escalation to allow the `tsx` IPC socket. No development database migration was applied in this task.
