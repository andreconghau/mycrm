ALTER TABLE quotation_versions
  ADD COLUMN unrounded_usd_numerator text,
  ADD COLUMN unrounded_usd_denominator text;

ALTER TABLE quotation_versions
  ADD CONSTRAINT quotation_versions_fx_rate_check
    CHECK (vnd_per_usd IS NULL OR (
      vnd_per_usd > 0
      AND scale(vnd_per_usd) <= 4
      AND vnd_per_usd < 100000000000000
    )),
  ADD CONSTRAINT quotation_versions_exact_total_check
    CHECK (
      (unrounded_usd_numerator IS NULL AND unrounded_usd_denominator IS NULL)
      OR (
        unrounded_usd_numerator IS NOT NULL
        AND unrounded_usd_denominator IS NOT NULL
        AND unrounded_usd_numerator ~ '^(0|[1-9][0-9]*)$'
        AND unrounded_usd_denominator ~ '^[1-9][0-9]*$'
      )
    );

ALTER TABLE quotation_lines
  ADD COLUMN price_basis text,
  ADD COLUMN price_basis_note text,
  ADD COLUMN price_selection_id integer,
  ALTER COLUMN selected_by DROP NOT NULL,
  ALTER COLUMN selected_at DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN specification_version_id DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL,
  ALTER COLUMN unit DROP NOT NULL,
  ALTER COLUMN input_currency DROP NOT NULL,
  ALTER COLUMN input_unit_price DROP NOT NULL,
  ALTER COLUMN original_line_amount DROP NOT NULL,
  ALTER COLUMN converted_usd_amount DROP NOT NULL,
  ALTER COLUMN product_snapshot DROP NOT NULL,
  ALTER COLUMN specification_snapshot DROP NOT NULL;

CREATE INDEX quotation_versions_draft_idx
  ON quotation_versions (market_id, quotation_id, revision_no DESC, id);

CREATE INDEX quotation_lines_price_selection_idx
  ON quotation_lines (market_id, price_selection_id)
  WHERE price_selection_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_quotation_version_draft()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  version_state text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'quotation versions cannot be deleted'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.market_id IS DISTINCT FROM OLD.market_id
     OR NEW.quotation_id IS DISTINCT FROM OLD.quotation_id
     OR NEW.rfq_id IS DISTINCT FROM OLD.rfq_id
     OR NEW.revision_no IS DISTINCT FROM OLD.revision_no THEN
    RAISE EXCEPTION 'quotation version identity cannot be changed'
      USING ERRCODE = '55000';
  END IF;

  SELECT state INTO version_state
  FROM quotation_versions
  WHERE id = OLD.id AND market_id = OLD.market_id
  FOR UPDATE;

  IF version_state IS DISTINCT FROM 'DRAFT' OR NEW.state IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'only draft quotation versions may be edited in R1-09'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotation_versions_draft_only
BEFORE UPDATE OR DELETE ON quotation_versions
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_version_draft();

CREATE OR REPLACE FUNCTION enforce_quotation_child_draft()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_market_id integer;
  version_id integer;
  version_state text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_market_id := OLD.market_id;
    version_id := OLD.quotation_version_id;
  ELSE
    row_market_id := NEW.market_id;
    version_id := NEW.quotation_version_id;
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.market_id IS DISTINCT FROM OLD.market_id
    OR NEW.quotation_version_id IS DISTINCT FROM OLD.quotation_version_id
  ) THEN
    RAISE EXCEPTION 'quotation child rows cannot be reassigned'
      USING ERRCODE = '55000';
  END IF;

  SELECT state INTO version_state
  FROM quotation_versions
  WHERE id = version_id AND market_id = row_market_id
  FOR UPDATE;

  IF version_state IS NULL THEN
    RAISE EXCEPTION 'quotation child row has no matching version'
      USING ERRCODE = '23503';
  END IF;

  IF version_state <> 'DRAFT' THEN
    RAISE EXCEPTION 'quotation child rows are editable only in DRAFT'
      USING ERRCODE = '55000';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER quotation_lines_draft_only
BEFORE INSERT OR UPDATE OR DELETE ON quotation_lines
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_child_draft();

CREATE TRIGGER quotation_adjustments_draft_only
BEFORE INSERT OR UPDATE OR DELETE ON quotation_adjustments
FOR EACH ROW EXECUTE FUNCTION enforce_quotation_child_draft();
