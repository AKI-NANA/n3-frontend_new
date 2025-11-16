-- =========================================
-- NAGANO-3 完全セットアップ: Yahoo → Master 同期
-- =========================================
-- 実行順序: このファイルを順番に実行してください
-- =========================================

-- ========== STEP 1: products_master テーブル構造 ==========
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

-- ユニーク制約
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

-- インデックス
CREATE INDEX IF NOT EXISTS idx_products_master_source ON products_master(source_system, source_id);
CREATE INDEX IF NOT EXISTS idx_products_master_approval ON products_master(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_master_updated ON products_master(updated_at DESC);

-- ========== STEP 2: yahoo_scraped_products テーブル構造 ==========
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

-- インデックス
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_sku ON yahoo_scraped_products(sku);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_status ON yahoo_scraped_products(status);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_created ON yahoo_scraped_products(created_at DESC);

-- ========== STEP 3: 同期トリガー関数 ==========
CREATE OR REPLACE FUNCTION sync_yahoo_scraped_to_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped_products' AND source_id = OLD.id::text;
        RETURN OLD;
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        INSERT INTO products_master (
            sku,
            title,
            title_en,
            purchase_price_jpy,
            profit_margin_percent,
            currency,
            condition,
            category,
            source,
            source_system,
            source_table,
            source_id,
            primary_image_url,
            images,
            scraped_data,
            listing_data,
            ebay_api_data,
            approval_status,
            listing_priority,
            created_at,
            updated_at
        ) VALUES (
            NEW.sku,
            NEW.title,
            COALESCE(NEW.english_title, NEW.title),
            NEW.price_jpy,
            COALESCE(NEW.profit_margin, 15),
            COALESCE(NEW.currency, 'JPY'),
            COALESCE(NEW.scraped_data->>'condition', '不明'),
            COALESCE(NEW.scraped_data->>'category', 'その他'),
            COALESCE(NEW.source_url, 'Yahoo Auction'),
            'yahoo_scraped_products',
            'yahoo_scraped_products',
            NEW.id::text,
            -- primary_image_url: scraped_data.images配列の最初の要素
            CASE 
                WHEN jsonb_typeof(NEW.scraped_data->'images') = 'array' 
                     AND jsonb_array_length(NEW.scraped_data->'images') > 0 
                THEN NEW.scraped_data->'images'->>0
                ELSE NULL
            END,
            -- images: scraped_data.images をJSONBとして保存
            NEW.scraped_data->'images',
            -- scraped_data: 完全なデータ
            NEW.scraped_data,
            NEW.listing_data,
            NEW.ebay_api_data,
            COALESCE(NEW.status, 'pending'),
            COALESCE(NEW.listing_priority, 'medium'),
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            currency = EXCLUDED.currency,
            condition = EXCLUDED.condition,
            category = EXCLUDED.category,
            source = EXCLUDED.source,
            primary_image_url = EXCLUDED.primary_image_url,
            images = EXCLUDED.images,
            scraped_data = EXCLUDED.scraped_data,
            listing_data = EXCLUDED.listing_data,
            ebay_api_data = EXCLUDED.ebay_api_data,
            approval_status = EXCLUDED.approval_status,
            listing_priority = EXCLUDED.listing_priority,
            updated_at = NOW();
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ========== STEP 4: トリガー作成 ==========
-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS sync_yahoo_to_master_trigger ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trg_sync_yahoo_to_master ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_products ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_to_master ON yahoo_scraped_products;

-- 新しいトリガーを作成
CREATE TRIGGER trigger_sync_yahoo_scraped_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_scraped_to_master();

-- ========== STEP 5: 既存データを同期 ==========
INSERT INTO products_master (
    sku, title, title_en, purchase_price_jpy, profit_margin_percent,
    currency, condition, category, source,
    source_system, source_table, source_id,
    primary_image_url, images, scraped_data,
    approval_status, created_at, updated_at
)
SELECT 
    sku,
    title,
    COALESCE(english_title, title),
    price_jpy,
    COALESCE(profit_margin, 15),
    COALESCE(currency, 'JPY'),
    COALESCE(scraped_data->>'condition', '不明'),
    COALESCE(scraped_data->>'category', 'その他'),
    COALESCE(source_url, 'Yahoo Auction'),
    'yahoo_scraped_products',
    'yahoo_scraped_products',
    id::text,
    CASE 
        WHEN jsonb_typeof(scraped_data->'images') = 'array' 
             AND jsonb_array_length(scraped_data->'images') > 0 
        THEN scraped_data->'images'->>0
        ELSE NULL
    END,
    scraped_data->'images',
    scraped_data,
    COALESCE(status, 'pending'),
    COALESCE(created_at, NOW()),
    NOW()
FROM yahoo_scraped_products
ON CONFLICT (source_system, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = NOW();

-- ========== STEP 6: 確認 ==========
-- トリガー確認
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'yahoo_scraped_products';

-- データ件数確認
SELECT 
    'yahoo_scraped_products' as table_name,
    COUNT(*) as count 
FROM yahoo_scraped_products
UNION ALL
SELECT 
    'products_master (yahoo系)' as table_name,
    COUNT(*) as count 
FROM products_master 
WHERE source_system = 'yahoo_scraped_products';

-- サンプルデータ確認
SELECT 
    id,
    sku,
    title,
    price_jpy,
    currency,
    jsonb_array_length(scraped_data->'images') as image_count,
    status
FROM yahoo_scraped_products
LIMIT 3;

SELECT 
    id,
    sku,
    title,
    purchase_price_jpy,
    currency,
    primary_image_url,
    approval_status,
    source_system
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
LIMIT 3;
