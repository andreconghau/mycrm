-- Prevent application-level UPDATE/DELETE of audit history.
CREATE OR REPLACE FUNCTION reject_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_event_mutation();

COMMENT ON FUNCTION reject_audit_event_mutation() IS
  'Rejects application-level mutation of audit history; retention policy is not implemented.';
