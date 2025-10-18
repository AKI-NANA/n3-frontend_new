-- 既存データを削除
DELETE FROM ebay_pricing_category_fees;

-- category_parent_idカラムを追加
ALTER TABLE ebay_pricing_category_fees
ADD COLUMN IF NOT EXISTS category_parent_id VARCHAR;

-- category_levelカラムを追加
ALTER TABLE ebay_pricing_category_fees
ADD COLUMN IF NOT EXISTS category_level INTEGER;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_category_parent 
ON ebay_pricing_category_fees(category_parent_id);

CREATE INDEX IF NOT EXISTS idx_category_level 
ON ebay_pricing_category_fees(category_level);
