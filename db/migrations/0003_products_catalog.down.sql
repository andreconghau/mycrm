DROP INDEX IF EXISTS products_category_idx;
DROP INDEX IF EXISTS products_status_idx;

DROP INDEX IF EXISTS product_aliases_one_name_per_locale;
ALTER TABLE product_aliases DROP CONSTRAINT IF EXISTS product_aliases_kind_check;
ALTER TABLE product_aliases DROP COLUMN IF EXISTS kind;

ALTER TABLE products ADD COLUMN active boolean;
UPDATE products SET active = (status = 'ACTIVE');
ALTER TABLE products ALTER COLUMN active SET NOT NULL;
ALTER TABLE products ALTER COLUMN active SET DEFAULT true;

ALTER TABLE products DROP COLUMN IF EXISTS description_ko;
ALTER TABLE products DROP COLUMN IF EXISTS description_vi;
ALTER TABLE products DROP COLUMN IF EXISTS description_en;
ALTER TABLE products DROP COLUMN IF EXISTS product_family;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products DROP COLUMN IF EXISTS status;
