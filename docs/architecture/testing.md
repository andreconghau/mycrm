# Verification Policy

## Required evidence

Application changes require lint and production build. Authentication/access-control changes additionally require unit tests, migration replay, real HTTP negative checks and browser workflow checks where the environment permits them. Report each check as PASS, FAIL or NOT RUN; local source evidence does not prove deployment or production behavior.

## R1-01 minimum matrix

- Password hashing/verification and password boundary validation.
- Anonymous, invalid credential, expired, disabled and revoked session denial.
- Refresh rotation and stale-token reuse revocation.
- Logout success, already-revoked-session retry, cookie clearing and UI retry/error behavior.
- Missing/invalid CSRF and untrusted origin denial on unsafe routes.
- Missing resource/action grant, wrong role, wrong owner/team/assignment and empty field grant denial.
- Role removal and account disable effective on the next request.
- Invitation single-use/expiry behavior and no token/hash leakage in API responses or logs.
- Migration replay against an isolated schema plus inspection of the approved development database.
- OpenAPI path/method parity with implemented routes, unique operation IDs, no planned-route leakage, anonymous/non-admin denial and admin Swagger rendering with a safe same-origin “Try it out” request.

## Security gates

Every pull request requires SCA, secret scanning and SAST. Production release additionally requires DAST and review of applicable ASVS 5.0.0 evidence. Critical/High findings block merge. Medium findings require an owner and deadline or an approved, unexpired risk acceptance.

## Environment separation

Isolated migration replay uses a randomly named PostgreSQL schema and removes it after validation. Development database results are reported separately. Browser, deployment, provider and production evidence must not be inferred from unit or static checks.
