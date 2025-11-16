-- =========================================
-- products_master テーブルの完全な構造を確認・作成
-- =========================================

-- 1. 現在のカラム一覧を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- 2. 必要なカラムを追加（存在しない場合のみ）
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS title_en TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS purchase_price_jpy NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS recommended_price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JPY',
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS source_system TEXT,
ADD COLUMN IF NOT EXISTS source_table TEXT,
ADD COLUMN IF NOT EXISTS source_id TEXT,
ADD COLUMN IF NOT EXISTS primary_image_url TEXT,
ADD COLUMN IF NOT EXISTS images JSONB,
ADD COLUMN IF NOT EXISTS image_urls TEXT[],
ADD COLUMN IF NOT EXISTS scraped_data JSONB,
ADD COLUMN IF NOT EXISTS listing_data JSONB,
ADD COLUMN IF NOT EXISTS ebay_api_data JSONB,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS listing_priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. ユニーク制約を追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'products_master_source_unique'
    ) THEN
        ALTER TABLE products_master 
        ADD CONSTRAINT products_master_source_unique 
        UNIQUE(source_system, source_id);
    END IF;
END $$;

-- 4. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_products_master_source ON products_master(source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_products_master_approval ON products_master(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_master_updated ON products_master(updated_at DESC);

-- 5. 確認
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;
