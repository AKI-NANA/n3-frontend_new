-- =========================================
-- トリガーのみ作成（テーブル構造は既存を使用）
-- =========================================

-- 1. yahoo_scraped_products に最小限のカラムを追加
ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS price_jpy NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JPY',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scraped',
ADD COLUMN IF NOT EXISTS scraped_data JSONB,
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2) DEFAULT 15,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. 同期トリガー関数（products_master の既存カラム名に合わせる）
CREATE OR REPLACE FUNCTION sync_yahoo_scraped_to_master()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped_products' AND source_id = OLD.id::text;
        RETURN OLD;
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        INSERT INTO products_master (
            source_system,
            source_table,
            source_id,
            sku,
            title,
            title_en,
            current_price,
            purchase_price_jpy,
            profit_margin_percent,
            currency,
            condition,
            category,
            source,
            primary_image_url,
            images,
            scraped_data,
            approval_status,
            workflow_status,
            created_at,
            updated_at
        ) VALUES (
            'yahoo_scraped_products',
            'yahoo_scraped_products',
            NEW.id::text,
            NEW.sku,
            NEW.title,
            NEW.title, -- title_en は title と同じ（後で翻訳可能）
            NEW.price_jpy,
            NEW.price_jpy,
            COALESCE(NEW.profit_margin, 15),
            COALESCE(NEW.currency, 'JPY'),
            COALESCE(NEW.scraped_data->>'condition', '不明'),
            COALESCE(NEW.scraped_data->>'category', 'その他'),
            COALESCE(NEW.source_url, 'Yahoo Auction'),
            -- primary_image_url: scraped_data.images[0]
            CASE 
                WHEN jsonb_typeof(NEW.scraped_data->'images') = 'array' 
                     AND jsonb_array_length(NEW.scraped_data->'images') > 0 
                THEN NEW.scraped_data->'images'->>0
                ELSE NULL
            END,
            -- images: scraped_data.images
            NEW.scraped_data->'images',
            NEW.scraped_data,
            COALESCE(NEW.status, 'pending'),
            'scraped',
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            current_price = EXCLUDED.current_price,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            currency = EXCLUDED.currency,
            condition = EXCLUDED.condition,
            category = EXCLUDED.category,
            source = EXCLUDED.source,
            primary_image_url = EXCLUDED.primary_image_url,
            images = EXCLUDED.images,
            scraped_data = EXCLUDED.scraped_data,
            approval_status = EXCLUDED.approval_status,
            workflow_status = EXCLUDED.workflow_status,
            updated_at = NOW();
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. 既存のトリガーを削除
DROP TRIGGER IF EXISTS sync_yahoo_to_master_trigger ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trg_sync_yahoo_to_master ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_products ON yahoo_scraped_products;
DROP TRIGGER IF EXISTS trigger_sync_yahoo_scraped_to_master ON yahoo_scraped_products;

-- 4. 新しいトリガーを作成
CREATE TRIGGER trigger_sync_yahoo_scraped_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_scraped_to_master();

-- 5. 既存データを同期
INSERT INTO products_master (
    source_system, source_table, source_id,
    sku, title, title_en,
    current_price, purchase_price_jpy, profit_margin_percent,
    currency, condition, category, source,
    primary_image_url, images, scraped_data,
    approval_status, workflow_status,
    created_at, updated_at
)
SELECT 
    'yahoo_scraped_products',
    'yahoo_scraped_products',
    id::text,
    sku,
    title,
    title,
    price_jpy,
    price_jpy,
    COALESCE(profit_margin, 15),
    COALESCE(currency, 'JPY'),
    COALESCE(scraped_data->>'condition', '不明'),
    COALESCE(scraped_data->>'category', 'その他'),
    COALESCE(source_url, 'Yahoo Auction'),
    CASE 
        WHEN jsonb_typeof(scraped_data->'images') = 'array' 
             AND jsonb_array_length(scraped_data->'images') > 0 
        THEN scraped_data->'images'->>0
        ELSE NULL
    END,
    scraped_data->'images',
    scraped_data,
    COALESCE(status, 'pending'),
    'scraped',
    COALESCE(created_at, NOW()),
    NOW()
FROM yahoo_scraped_products
WHERE sku IS NOT NULL
ON CONFLICT (source_system, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = NOW();

-- 6. 確認
SELECT 
    'トリガー確認' as check_type,
    trigger_name,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'yahoo_scraped_products'

UNION ALL

SELECT 
    'データ件数' as check_type,
    'yahoo_scraped_products' as trigger_name,
    COUNT(*)::text as event_manipulation
FROM yahoo_scraped_products

UNION ALL

SELECT 
    'データ件数' as check_type,
    'products_master (yahoo)' as trigger_name,
    COUNT(*)::text as event_manipulation
FROM products_master
WHERE source_system = 'yahoo_scraped_products';
