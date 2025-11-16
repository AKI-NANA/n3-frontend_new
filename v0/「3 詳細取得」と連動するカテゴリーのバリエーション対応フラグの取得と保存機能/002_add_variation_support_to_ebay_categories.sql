-- database/migrations/002_add_variation_support_to_ebay_categories.sql

-- ebay_categories テーブルに 'supports_variations' カラムを追加
ALTER TABLE ebay_categories
ADD COLUMN IF NOT EXISTS supports_variations BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN ebay_categories.supports_variations IS 'バリエーション出品（マルチSKU）が可能かを示すフラグ';