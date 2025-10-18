-- ebay_pricing_category_feesテーブルにcategory_pathカラムを追加

ALTER TABLE public.ebay_pricing_category_fees
ADD COLUMN IF NOT EXISTS category_path TEXT;

-- インデックスも追加（検索用）
CREATE INDEX IF NOT EXISTS idx_ebay_category_path 
ON public.ebay_pricing_category_fees(category_path);

-- 確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ebay_pricing_category_fees'
ORDER BY ordinal_position;
