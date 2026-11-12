DROP TRIGGER IF EXISTS price_selections_append_only ON price_selections;
DROP FUNCTION IF EXISTS reject_price_selection_mutation();

DROP INDEX IF EXISTS price_selections_item_idx;
DROP INDEX IF EXISTS price_selections_product_time_idx;
DROP INDEX IF EXISTS price_selections_context_idx;
DROP TABLE IF EXISTS price_selections;

DROP TRIGGER IF EXISTS price_list_items_delete_after_approval ON price_list_items;
DROP TRIGGER IF EXISTS price_list_items_immutable_after_approval ON price_list_items;
DROP FUNCTION IF EXISTS reject_price_list_item_delete_after_approval();
DROP FUNCTION IF EXISTS reject_price_list_item_change_after_approval();
DROP INDEX IF EXISTS price_list_items_lookup_idx;
ALTER TABLE price_list_items
  DROP CONSTRAINT IF EXISTS price_list_items_other_basis_note_check,
  DROP CONSTRAINT IF EXISTS price_list_items_price_basis_check,
  DROP CONSTRAINT IF EXISTS price_list_items_unit_check,
  DROP COLUMN IF EXISTS price_basis_note;

DROP INDEX IF EXISTS price_lists_eligibility_idx;
ALTER TABLE price_lists
  DROP CONSTRAINT IF EXISTS price_lists_archived_metadata_check,
  DROP CONSTRAINT IF EXISTS price_lists_approved_metadata_check,
  DROP CONSTRAINT IF EXISTS price_lists_currency_check,
  DROP CONSTRAINT IF EXISTS price_lists_status_check,
  DROP COLUMN IF EXISTS archive_reason,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS created_by;
