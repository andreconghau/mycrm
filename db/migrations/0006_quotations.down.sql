DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM quotation_lines
    WHERE product_id IS NULL
       OR specification_version_id IS NULL
       OR quantity IS NULL
       OR unit IS NULL
       OR input_currency IS NULL
       OR input_unit_price IS NULL
       OR original_line_amount IS NULL
       OR converted_usd_amount IS NULL
       OR product_snapshot IS NULL
       OR specification_snapshot IS NULL
       OR selected_by IS NULL
       OR selected_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot roll back quotation drafts while incomplete quotation lines exist';
  END IF;
END;
$$;

DROP TRIGGER quotation_adjustments_draft_only ON quotation_adjustments;
DROP TRIGGER quotation_lines_draft_only ON quotation_lines;
DROP TRIGGER quotation_versions_draft_only ON quotation_versions;

DROP FUNCTION enforce_quotation_child_draft();
DROP FUNCTION enforce_quotation_version_draft();

DROP INDEX quotation_versions_draft_idx;
DROP INDEX quotation_lines_price_selection_idx;

ALTER TABLE quotation_lines
  ALTER COLUMN selected_by SET NOT NULL,
  ALTER COLUMN selected_at SET NOT NULL,
  ALTER COLUMN product_id SET NOT NULL,
  ALTER COLUMN specification_version_id SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN unit SET NOT NULL,
  ALTER COLUMN input_currency SET NOT NULL,
  ALTER COLUMN input_unit_price SET NOT NULL,
  ALTER COLUMN original_line_amount SET NOT NULL,
  ALTER COLUMN converted_usd_amount SET NOT NULL,
  ALTER COLUMN product_snapshot SET NOT NULL,
  ALTER COLUMN specification_snapshot SET NOT NULL;

ALTER TABLE quotation_lines
  DROP COLUMN price_basis_note,
  DROP COLUMN price_basis,
  DROP COLUMN price_selection_id;

ALTER TABLE quotation_versions
  DROP CONSTRAINT quotation_versions_exact_total_check,
  DROP CONSTRAINT quotation_versions_fx_rate_check,
  DROP COLUMN unrounded_usd_denominator,
  DROP COLUMN unrounded_usd_numerator;
