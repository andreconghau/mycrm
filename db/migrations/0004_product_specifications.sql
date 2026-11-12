-- R1-06 M07: bring the baseline `specifications` / `specification_versions`
-- tables in line with the approved Product Specifications design.
--
-- The baseline (docs/structure/01_init_20261106.sql) already created both
-- tables with revision identity, grade/processing, pack weights, glazing and a
-- `gross >= net` CHECK. This migration adds the approved lifecycle guard,
-- EN/VI/KO translations (r1-decisions.md §9), the remaining technical,
-- packaging, handling and buyer-specific fields, the buyer link, the
-- single-APPROVED-revision guarantee and database-level immutability of
-- approved revisions.
--
-- No SQL FOREIGN KEY / REFERENCES is added; product_id, market_id, customer_id
-- and the actor columns stay application-enforced per AGENTS.md §3.

-- ---------------------------------------------------------------------------
-- specifications: buyer-specific link and lookup indexes
-- ---------------------------------------------------------------------------

ALTER TABLE specifications ADD COLUMN customer_id INTEGER;

COMMENT ON COLUMN specifications.customer_id IS
  'NULL = standard specification for the market. Set = buyer-specific specification with its own code and its own revision history; it never overwrites the standard specification.';
COMMENT ON COLUMN specifications.active IS
  'Whole-specification archive flag: false removes the specification from new commercial selection while preserving every historical reference. Per-revision lifecycle lives in specification_versions.status.';
COMMENT ON COLUMN specifications.code IS
  'Auto-generated identity in the form <SKU>-S<nn>, allocated transactionally per (market_id, product_id) and unique per market.';

-- Note: (market_id, product_id) is already covered by the baseline index
-- idx_specifications_market_id_product_id, so it is not recreated here.

CREATE INDEX specifications_market_customer_idx
  ON specifications (market_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX specifications_market_active_idx
  ON specifications (market_id, active);

-- ---------------------------------------------------------------------------
-- specification_versions: approved revision content
-- ---------------------------------------------------------------------------

-- Market-facing translations. r1-decisions.md §9 requires EN/VI/KO names and
-- descriptions on Specifications; missing translations block PDF issue in M10.
ALTER TABLE specification_versions ADD COLUMN name_en text;
ALTER TABLE specification_versions ADD COLUMN name_vi text;
ALTER TABLE specification_versions ADD COLUMN name_ko text;
ALTER TABLE specification_versions ADD COLUMN description_en text;
ALTER TABLE specification_versions ADD COLUMN description_vi text;
ALTER TABLE specification_versions ADD COLUMN description_ko text;

-- Technical identity beyond grade/processing.
ALTER TABLE specification_versions ADD COLUMN size_band text;
ALTER TABLE specification_versions ADD COLUMN size_unit text;
ALTER TABLE specification_versions ADD COLUMN treatment text;
ALTER TABLE specification_versions ADD COLUMN frozen_form text;

-- Packaging and commercial basis.
ALTER TABLE specification_versions ADD COLUMN carton_net_weight numeric
  CHECK (carton_net_weight > 0);
ALTER TABLE specification_versions ADD COLUMN packaging_material text;
ALTER TABLE specification_versions ADD COLUMN uom text;
ALTER TABLE specification_versions ADD COLUMN moq numeric CHECK (moq > 0);
ALTER TABLE specification_versions ADD COLUMN moq_unit text;

-- Handling. The temperature bound is a physical plausibility guard only; it is
-- deliberately NOT a product rule and no default freezing temperature or
-- shelf life is implied anywhere.
ALTER TABLE specification_versions ADD COLUMN storage_temp_c numeric
  CHECK (storage_temp_c BETWEEN -80 AND 60);
ALTER TABLE specification_versions ADD COLUMN shelf_life_months integer
  CHECK (shelf_life_months > 0);

-- Provenance and labelling.
ALTER TABLE specification_versions ADD COLUMN origin_country text
  CHECK (origin_country ~ '^[A-Z]{2}$');
ALTER TABLE specification_versions ADD COLUMN certifications text[];
ALTER TABLE specification_versions ADD COLUMN label_languages text[];

-- Buyer-specific content.
ALTER TABLE specification_versions ADD COLUMN buyer_requirements text;
ALTER TABLE specification_versions ADD COLUMN notes text;

-- Actor provenance. created_by is backfilled with 0 ("unknown historical
-- actor") for any pre-existing row, then the default is dropped so every new
-- revision must name its creator.
ALTER TABLE specification_versions ADD COLUMN created_by INTEGER NOT NULL DEFAULT 0;
ALTER TABLE specification_versions ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE specification_versions ADD COLUMN approved_by INTEGER;
ALTER TABLE specification_versions ADD COLUMN archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- specification_versions: enumerations and lifecycle integrity
-- ---------------------------------------------------------------------------

UPDATE specification_versions
SET status = 'DRAFT'
WHERE status NOT IN ('DRAFT', 'APPROVED', 'ARCHIVED');

ALTER TABLE specification_versions ADD CONSTRAINT specification_versions_status_check
  CHECK (status IN ('DRAFT', 'APPROVED', 'ARCHIVED'));

ALTER TABLE specification_versions ADD CONSTRAINT specification_versions_weight_unit_check
  CHECK (weight_unit IS NULL OR weight_unit IN ('KG', 'MT', 'LB'));

ALTER TABLE specification_versions ADD CONSTRAINT specification_versions_uom_check
  CHECK (uom IS NULL OR uom IN ('KG', 'MT', 'CTN', 'PCS', 'LB'));

ALTER TABLE specification_versions ADD CONSTRAINT specification_versions_moq_unit_check
  CHECK (moq_unit IS NULL OR moq_unit IN ('KG', 'MT', 'CTN', 'PCS', 'LB'));

-- An APPROVED revision must carry its approval metadata; an ARCHIVED revision
-- must carry its archive timestamp.
ALTER TABLE specification_versions ADD CONSTRAINT specification_versions_approved_metadata_check
  CHECK (
    status <> 'APPROVED'
    OR (published_at IS NOT NULL AND approved_by IS NOT NULL)
  );

ALTER TABLE specification_versions ADD CONSTRAINT specification_versions_archived_metadata_check
  CHECK (status <> 'ARCHIVED' OR archived_at IS NOT NULL);

-- At most one APPROVED revision per specification. This is the database-level
-- guarantee behind AC-16: two concurrent publishes cannot both win.
CREATE UNIQUE INDEX specification_versions_one_approved
  ON specification_versions (market_id, specification_id)
  WHERE status = 'APPROVED';

-- Eligibility lookups filter by status, which the baseline
-- (market_id, product_id, specification_id) index does not cover.
CREATE INDEX specification_versions_market_product_status_idx
  ON specification_versions (market_id, product_id, status);

-- Revision history ordering is already served by the baseline UNIQUE
-- (market_id, specification_id, revision_no) index, so it is not duplicated.

COMMENT ON COLUMN specification_versions.status IS
  'Revision lifecycle: DRAFT (editable) -> APPROVED (immutable, at most one per specification) -> ARCHIVED (immutable, not selectable for new commercial lines, preserved for historical offers).';
COMMENT ON COLUMN specification_versions.published_at IS
  'Timestamp the revision reached APPROVED. The lifecycle has no separate PUBLISHED state; publish and approve are the same transition.';
COMMENT ON COLUMN specification_versions.revision_no IS
  'Monotonic content revision within one specification. Distinct from the `version` optimistic-concurrency counter and from a technical document version.';
COMMENT ON COLUMN specification_versions.weight_unit IS
  'Unit for net/gross pack weight and carton net weight. No automatic unit conversion is performed anywhere; mixed-unit arithmetic is rejected.';
COMMENT ON COLUMN specification_versions.uom IS
  'Commercial unit of measurement used for offer quantities.';
COMMENT ON COLUMN specification_versions.storage_temp_c IS
  'Product-specific storage temperature in Celsius. The CHECK bound is a physical plausibility guard only; no universal freezing temperature is assumed or defaulted.';
COMMENT ON COLUMN specification_versions.shelf_life_months IS
  'Product-specific shelf life in months. No default is assumed; it must be reviewed per product.';
COMMENT ON COLUMN specification_versions.certifications IS
  'Verified certification labels only. Never inferred from the product name, origin or market.';
COMMENT ON COLUMN specification_versions.created_by IS
  'User who created the revision. 0 marks a pre-migration row with no recorded actor.';

-- ---------------------------------------------------------------------------
-- specification_versions: immutability of approved content (AC-04)
-- ---------------------------------------------------------------------------
--
-- Once a revision leaves DRAFT its technical and commercial content is frozen
-- at the database level. Only the lifecycle columns may still change, so an
-- APPROVED revision can be archived but never edited. Changing approved
-- content requires a new revision.

CREATE OR REPLACE FUNCTION reject_specification_version_content_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'DRAFT' THEN
    RETURN NEW;
  END IF;

  IF ROW(
    NEW.market_id, NEW.specification_id, NEW.product_id, NEW.revision_no,
    NEW.grade, NEW.processing, NEW.net_weight_per_pack, NEW.gross_weight_per_pack,
    NEW.weight_unit, NEW.packs_per_carton, NEW.glazing_percent, NEW.packaging,
    NEW.requirements, NEW.name_en, NEW.name_vi, NEW.name_ko,
    NEW.description_en, NEW.description_vi, NEW.description_ko,
    NEW.size_band, NEW.size_unit, NEW.treatment, NEW.frozen_form,
    NEW.carton_net_weight, NEW.packaging_material, NEW.uom, NEW.moq, NEW.moq_unit,
    NEW.storage_temp_c, NEW.shelf_life_months, NEW.origin_country,
    NEW.certifications, NEW.label_languages, NEW.buyer_requirements, NEW.notes,
    NEW.created_by, NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.market_id, OLD.specification_id, OLD.product_id, OLD.revision_no,
    OLD.grade, OLD.processing, OLD.net_weight_per_pack, OLD.gross_weight_per_pack,
    OLD.weight_unit, OLD.packs_per_carton, OLD.glazing_percent, OLD.packaging,
    OLD.requirements, OLD.name_en, OLD.name_vi, OLD.name_ko,
    OLD.description_en, OLD.description_vi, OLD.description_ko,
    OLD.size_band, OLD.size_unit, OLD.treatment, OLD.frozen_form,
    OLD.carton_net_weight, OLD.packaging_material, OLD.uom, OLD.moq, OLD.moq_unit,
    OLD.storage_temp_c, OLD.shelf_life_months, OLD.origin_country,
    OLD.certifications, OLD.label_languages, OLD.buyer_requirements, OLD.notes,
    OLD.created_by, OLD.created_at
  ) THEN
    RAISE EXCEPTION
      'specification revision % is % and its content is immutable; create a new revision',
      OLD.revision_no, OLD.status
      USING ERRCODE = '55000';
  END IF;

  IF OLD.status = 'ARCHIVED' AND NEW.status <> 'ARCHIVED' THEN
    RAISE EXCEPTION 'an archived specification revision cannot be reopened'
      USING ERRCODE = '55000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER specification_versions_immutable_after_approval
BEFORE UPDATE ON specification_versions
FOR EACH ROW EXECUTE FUNCTION reject_specification_version_content_change();

COMMENT ON FUNCTION reject_specification_version_content_change() IS
  'Freezes technical/commercial content of any specification revision that has left DRAFT, and prevents an ARCHIVED revision from being reopened. Only status, published_at, approved_by, archived_at, updated_at and version may still change.';
