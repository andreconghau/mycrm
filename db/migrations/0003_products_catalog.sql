-- R1-05 M06: bring the baseline `products`/`product_aliases` tables in line with
-- the approved catalog design (lifecycle status, multilingual names, family,
-- descriptions). No SQL FOREIGN KEY is added; `product_id` references remain
-- application-enforced per AGENTS.md.

ALTER TABLE products ADD COLUMN status text;
UPDATE products SET status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END;
ALTER TABLE products ALTER COLUMN status SET NOT NULL;
ALTER TABLE products ALTER COLUMN status SET DEFAULT 'DRAFT';
ALTER TABLE products ADD CONSTRAINT products_status_check
  CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'));
ALTER TABLE products DROP COLUMN active;

ALTER TABLE products ADD COLUMN product_family text;
ALTER TABLE products ADD COLUMN description_en text;
ALTER TABLE products ADD COLUMN description_vi text;
ALTER TABLE products ADD COLUMN description_ko text;

COMMENT ON COLUMN products.status IS
  'Lifecycle gate: DRAFT (not commercially usable) -> ACTIVE (eligible for new commercial lines) -> INACTIVE (retired; existing references preserved).';
COMMENT ON COLUMN products.product_family IS
  'Free-entry commercial grouping (e.g. squid, octopus, shrimp); identity-level only, distinct from M07 Specification processing/grade detail.';
COMMENT ON COLUMN products.description_en IS 'Primary-language marketing/catalog description.';
COMMENT ON COLUMN products.description_vi IS 'Vietnamese catalog description.';
COMMENT ON COLUMN products.description_ko IS 'Korean catalog description.';

ALTER TABLE product_aliases ADD COLUMN kind text NOT NULL DEFAULT 'ALIAS';
ALTER TABLE product_aliases ADD CONSTRAINT product_aliases_kind_check
  CHECK (kind IN ('NAME', 'ALIAS'));

COMMENT ON COLUMN product_aliases.kind IS
  'NAME = required canonical per-locale display name (EN/VI/KO); ALIAS = free-text search synonym, any number per locale.';

-- Enforce at most one canonical NAME per (product, locale); unrelated to the
-- pre-existing UNIQUE (product_id, locale, label) which still guards ALIAS rows.
CREATE UNIQUE INDEX product_aliases_one_name_per_locale
  ON product_aliases (product_id, locale)
  WHERE kind = 'NAME';

CREATE INDEX products_status_idx ON products (status);
CREATE INDEX products_category_idx ON products (category);
