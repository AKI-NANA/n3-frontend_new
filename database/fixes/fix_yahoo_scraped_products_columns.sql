-- =========================================
-- yahoo_scraped_products テーブルの完全な構造確認・作成
-- =========================================

-- 1. 現在のカラム一覧を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- 2. 必要なカラムを追加（存在しない場合のみ）
ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS english_title TEXT,
ADD COLUMN IF NOT EXISTS price_jpy NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JPY',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS bid_count TEXT,
ADD COLUMN IF NOT EXISTS stock_status TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scraped',
ADD COLUMN IF NOT EXISTS scraped_data JSONB,
ADD COLUMN IF NOT EXISTS listing_data JSONB,
ADD COLUMN IF NOT EXISTS ebay_api_data JSONB,
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2) DEFAULT 15,
ADD COLUMN IF NOT EXISTS master_key TEXT,
ADD COLUMN IF NOT EXISTS listing_priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_sku ON yahoo_scraped_products(sku);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_status ON yahoo_scraped_products(status);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_created ON yahoo_scraped_products(created_at DESC);

-- 4. 確認
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;
