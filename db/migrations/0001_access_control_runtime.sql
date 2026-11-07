-- Runtime support for R1-01 authentication throttling.
-- The existing 63-table fresh-schema initializer remains the R1 baseline and is
-- fingerprinted by scripts/migrate.ts before this migration is applied.

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key_hash text PRIMARY KEY,
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at timestamptz NOT NULL,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE auth_rate_limits IS
  'Database-backed generic login throttling keyed by an HMAC; never stores raw email or IP data.';
COMMENT ON COLUMN auth_rate_limits.key_hash IS
  'HMAC-SHA-256 of the normalized login identifier using the server CSRF secret.';
COMMENT ON COLUMN auth_rate_limits.failure_count IS
  'Failures observed in the current fixed window.';
COMMENT ON COLUMN auth_rate_limits.window_started_at IS
  'Start of the current throttling window.';
COMMENT ON COLUMN auth_rate_limits.blocked_until IS
  'When another attempt may be evaluated; NULL when not blocked.';
COMMENT ON COLUMN auth_rate_limits.updated_at IS
  'Last successful mutation time in UTC.';

CREATE INDEX IF NOT EXISTS auth_rate_limits_blocked_until
  ON auth_rate_limits (blocked_until)
  WHERE blocked_until IS NOT NULL;
