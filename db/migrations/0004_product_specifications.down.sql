-- Reverses 0004_product_specifications. Column drops discard approved
-- specification content, so this is a development-only rollback path.

DROP TRIGGER IF EXISTS specification_versions_immutable_after_approval ON specification_versions;
DROP FUNCTION IF EXISTS reject_specification_version_content_change();

DROP INDEX IF EXISTS specification_versions_market_product_status_idx;
DROP INDEX IF EXISTS specification_versions_one_approved;

ALTER TABLE specification_versions
  DROP CONSTRAINT IF EXISTS specification_versions_archived_metadata_check;
ALTER TABLE specification_versions
  DROP CONSTRAINT IF EXISTS specification_versions_approved_metadata_check;
ALTER TABLE specification_versions
  DROP CONSTRAINT IF EXISTS specification_versions_moq_unit_check;
ALTER TABLE specification_versions
  DROP CONSTRAINT IF EXISTS specification_versions_uom_check;
ALTER TABLE specification_versions
  DROP CONSTRAINT IF EXISTS specification_versions_weight_unit_check;
ALTER TABLE specification_versions
  DROP CONSTRAINT IF EXISTS specification_versions_status_check;

ALTER TABLE specification_versions DROP COLUMN IF EXISTS archived_at;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS approved_by;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS created_by;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS notes;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS buyer_requirements;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS label_languages;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS certifications;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS origin_country;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS shelf_life_months;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS storage_temp_c;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS moq_unit;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS moq;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS uom;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS packaging_material;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS carton_net_weight;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS frozen_form;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS treatment;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS size_unit;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS size_band;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS description_ko;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS description_vi;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS description_en;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS name_ko;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS name_vi;
ALTER TABLE specification_versions DROP COLUMN IF EXISTS name_en;

DROP INDEX IF EXISTS specifications_market_active_idx;
DROP INDEX IF EXISTS specifications_market_customer_idx;

ALTER TABLE specifications DROP COLUMN IF EXISTS customer_id;
