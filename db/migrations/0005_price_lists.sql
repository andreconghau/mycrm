-- R1-08 M08: approved market-scoped price references and append-only selections.
-- Extends the applied price_lists / price_list_items baseline and adds the
-- standalone AD_HOC selection contract. No SQL FOREIGN KEY / REFERENCES is used.

-- ---------------------------------------------------------------------------
-- price_lists: creator, lifecycle metadata and eligibility lookup
-- ---------------------------------------------------------------------------

ALTER TABLE price_lists ADD COLUMN created_by INTEGER NOT NULL DEFAULT 0;
ALTER TABLE price_lists ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE price_lists ADD COLUMN approved_at timestamptz;
ALTER TABLE price_lists ADD COLUMN archived_at timestamptz;
ALTER TABLE price_lists ADD COLUMN archive_reason text;

UPDATE price_lists SET status = 'DRAFT'
WHERE status NOT IN ('DRAFT', 'APPROVED', 'ARCHIVED');

ALTER TABLE price_lists ADD CONSTRAINT price_lists_status_check
  CHECK (status IN ('DRAFT', 'APPROVED', 'ARCHIVED'));
ALTER TABLE price_lists ADD CONSTRAINT price_lists_currency_check
  CHECK (currency IN ('USD', 'VND'));
ALTER TABLE price_lists ADD CONSTRAINT price_lists_approved_metadata_check
  CHECK (status <> 'APPROVED' OR (approved_at IS NOT NULL AND approved_by IS NOT NULL));
ALTER TABLE price_lists ADD CONSTRAINT price_lists_archived_metadata_check
  CHECK (status <> 'ARCHIVED' OR (archived_at IS NOT NULL AND archive_reason IS NOT NULL AND btrim(archive_reason) <> ''));

COMMENT ON COLUMN price_lists.created_by IS
  'User who created the price list; 0 marks a pre-migration row with no recorded actor.';
COMMENT ON COLUMN price_lists.approved_at IS
  'UTC instant the list entered APPROVED. Active/scheduled/expired state is derived from validity.';
COMMENT ON COLUMN price_lists.archived_at IS
  'UTC instant the approved list was archived.';
COMMENT ON COLUMN price_lists.archive_reason IS
  'Required reason for archiving a price list.';

-- The baseline price_eligibility index leads with customer_id and cannot serve
-- the market + lifecycle + tier scan used by eligible-price lookup.
CREATE INDEX price_lists_eligibility_idx
  ON price_lists (market_id, status, tier, valid_from, valid_to);

-- ---------------------------------------------------------------------------
-- price_list_items: supported basis and freeze approved commercial terms
-- ---------------------------------------------------------------------------

ALTER TABLE price_list_items ADD COLUMN price_basis_note text;
ALTER TABLE price_list_items ADD CONSTRAINT price_list_items_unit_check
  CHECK (unit IN ('KG', 'MT', 'CTN', 'PCS', 'LB'));
ALTER TABLE price_list_items ADD CONSTRAINT price_list_items_price_basis_check
  CHECK (price_basis IN ('NET', 'GROSS', 'OTHER'));
ALTER TABLE price_list_items ADD CONSTRAINT price_list_items_other_basis_note_check
  CHECK (price_basis <> 'OTHER' OR (price_basis_note IS NOT NULL AND btrim(price_basis_note) <> ''));

COMMENT ON COLUMN price_list_items.price_basis_note IS
  'Required human-readable explanation when price_basis is OTHER.';

CREATE INDEX price_list_items_lookup_idx
  ON price_list_items (market_id, product_id, unit, valid_from, valid_to);

CREATE OR REPLACE FUNCTION reject_price_list_item_change_after_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT status INTO parent_status
  FROM price_lists
  WHERE id = OLD.price_list_id AND market_id = OLD.market_id
  FOR UPDATE;

  IF parent_status IS NULL THEN
    RAISE EXCEPTION 'price list item % has no matching parent list', OLD.id
      USING ERRCODE = '23503';
  END IF;

  IF NEW.market_id IS DISTINCT FROM OLD.market_id
     OR NEW.price_list_id IS DISTINCT FROM OLD.price_list_id THEN
    RAISE EXCEPTION 'price list item % cannot be reassigned', OLD.id
      USING ERRCODE = '55000';
  END IF;

  IF parent_status <> 'DRAFT' AND ROW(
    NEW.market_id, NEW.price_list_id, NEW.product_id,
    NEW.specification_version_id, NEW.unit, NEW.price_basis,
    NEW.price_basis_note, NEW.unit_price, NEW.min_quantity,
    NEW.max_quantity, NEW.valid_from, NEW.valid_to
  ) IS DISTINCT FROM ROW(
    OLD.market_id, OLD.price_list_id, OLD.product_id,
    OLD.specification_version_id, OLD.unit, OLD.price_basis,
    OLD.price_basis_note, OLD.unit_price, OLD.min_quantity,
    OLD.max_quantity, OLD.valid_from, OLD.valid_to
  ) THEN
    RAISE EXCEPTION 'price list item % is immutable after approval', OLD.id
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER price_list_items_immutable_after_approval
BEFORE UPDATE ON price_list_items
FOR EACH ROW EXECUTE FUNCTION reject_price_list_item_change_after_approval();

CREATE OR REPLACE FUNCTION reject_price_list_item_delete_after_approval()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_status text;
BEGIN
  SELECT status INTO parent_status
  FROM price_lists
  WHERE id = OLD.price_list_id AND market_id = OLD.market_id
  FOR UPDATE;

  IF parent_status IS NULL THEN
    RAISE EXCEPTION 'price list item % has no matching parent list', OLD.id
      USING ERRCODE = '23503';
  END IF;

  IF parent_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'price list item % cannot be deleted after approval', OLD.id
      USING ERRCODE = '55000';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER price_list_items_delete_after_approval
BEFORE DELETE ON price_list_items
FOR EACH ROW EXECUTE FUNCTION reject_price_list_item_delete_after_approval();

COMMENT ON FUNCTION reject_price_list_item_change_after_approval() IS
  'Freezes commercial fields on price list items whenever the parent list has left DRAFT.';
COMMENT ON FUNCTION reject_price_list_item_delete_after_approval() IS
  'Rejects deletion of a price list item whenever its parent list has left DRAFT.';

-- ---------------------------------------------------------------------------
-- price_selections: immutable provenance for every AD_HOC selection
-- ---------------------------------------------------------------------------

CREATE TABLE price_selections (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  market_id INTEGER NOT NULL,
  context_type text NOT NULL,
  context_id INTEGER,
  product_id INTEGER NOT NULL,
  specification_version_id INTEGER,
  price_list_id INTEGER,
  price_list_item_id INTEGER,
  selection_type text NOT NULL,
  listed_amount numeric CHECK (listed_amount IS NULL OR listed_amount >= 0),
  selected_amount numeric NOT NULL CHECK (selected_amount >= 0),
  currency text NOT NULL,
  unit text NOT NULL,
  price_basis text NOT NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  reason text,
  source_metadata jsonb NOT NULL DEFAULT '{}',
  selected_by INTEGER NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (context_type IN ('AD_HOC', 'QUOTATION_LINE')),
  CHECK (context_type <> 'AD_HOC' OR context_id IS NULL),
  CHECK (context_type <> 'QUOTATION_LINE' OR context_id IS NOT NULL),
  CHECK (selection_type IN ('REFERENCE', 'MANUAL', 'OVERRIDE')),
  CHECK (currency IN ('USD', 'VND')),
  CHECK (unit IN ('KG', 'MT', 'CTN', 'PCS', 'LB')),
  CHECK (price_basis IN ('NET', 'GROSS', 'OTHER')),
  CHECK (price_basis <> 'OTHER' OR (source_metadata->>'priceBasisNote' IS NOT NULL AND btrim(source_metadata->>'priceBasisNote') <> '')),
  CHECK (selection_type = 'REFERENCE' OR (reason IS NOT NULL AND length(btrim(reason)) >= 10)),
  CHECK (selection_type <> 'REFERENCE' OR (price_list_item_id IS NOT NULL AND listed_amount IS NOT NULL AND selected_amount = listed_amount)),
  CHECK (selection_type <> 'OVERRIDE' OR (price_list_item_id IS NOT NULL AND listed_amount IS NOT NULL)),
  CHECK (selection_type <> 'MANUAL' OR (price_list_item_id IS NULL AND listed_amount IS NULL))
);

COMMENT ON TABLE price_selections IS
  'Append-only record of selected reference, manual or override price terms; does not mutate quotation history.';
COMMENT ON COLUMN price_selections.id IS
  'Generated INTEGER identity primary key; immutable and never recycled.';
COMMENT ON COLUMN price_selections.market_id IS
  'Market boundary for authorization and history queries; application validates membership and ownership.';
COMMENT ON COLUMN price_selections.context_type IS
  'AD_HOC for standalone M08; QUOTATION_LINE is reserved for future M10 integration.';
COMMENT ON COLUMN price_selections.context_id IS
  'NULL for AD_HOC; future typed quotation line identifier for QUOTATION_LINE.';
COMMENT ON COLUMN price_selections.product_id IS
  'Logical product reference; application validates active catalog eligibility.';
COMMENT ON COLUMN price_selections.specification_version_id IS
  'Optional logical specification revision captured for this price selection.';
COMMENT ON COLUMN price_selections.price_list_id IS
  'Optional logical source Price List; NULL for manual price entries.';
COMMENT ON COLUMN price_selections.price_list_item_id IS
  'Optional logical source item; required for REFERENCE and OVERRIDE selections.';
COMMENT ON COLUMN price_selections.selection_type IS
  'REFERENCE, MANUAL, or OVERRIDE classification determined by the server.';
COMMENT ON COLUMN price_selections.listed_amount IS
  'Reference amount captured at selection time; NULL only for MANUAL.';
COMMENT ON COLUMN price_selections.selected_amount IS
  'Amount explicitly selected by the actor; never recalculated retroactively.';
COMMENT ON COLUMN price_selections.currency IS
  'Exact selected currency; USD or VND, with no conversion.';
COMMENT ON COLUMN price_selections.unit IS
  'Exact selected quantity unit; no conversion.';
COMMENT ON COLUMN price_selections.price_basis IS
  'NET, GROSS, or OTHER basis associated with the selected amount.';
COMMENT ON COLUMN price_selections.quantity IS
  'Positive requested quantity used when the server recomputed eligibility.';
COMMENT ON COLUMN price_selections.reason IS
  'Required for MANUAL and OVERRIDE; visible to authorized approvers.';
COMMENT ON COLUMN price_selections.source_metadata IS
  'Safe reference provenance such as tier, list code, specification revision and eligibility instant.';
COMMENT ON COLUMN price_selections.selected_by IS
  'User who recorded the selection; application validates the active principal.';
COMMENT ON COLUMN price_selections.selected_at IS
  'UTC instant the selection was recorded.';
COMMENT ON COLUMN price_selections.request_id IS
  'Request correlation UUID shared with the mandatory audit event.';
COMMENT ON COLUMN price_selections.created_at IS
  'Database insertion instant in UTC.';

CREATE INDEX price_selections_context_idx
  ON price_selections (market_id, context_type, context_id);
CREATE INDEX price_selections_product_time_idx
  ON price_selections (market_id, product_id, selected_at DESC);
CREATE INDEX price_selections_item_idx
  ON price_selections (market_id, price_list_item_id);

CREATE OR REPLACE FUNCTION reject_price_selection_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'price_selections is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER price_selections_append_only
BEFORE UPDATE OR DELETE ON price_selections
FOR EACH ROW EXECUTE FUNCTION reject_price_selection_mutation();

COMMENT ON FUNCTION reject_price_selection_mutation() IS
  'Rejects application-level UPDATE and DELETE of price selection provenance.';
