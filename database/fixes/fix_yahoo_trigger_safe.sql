-- ============================================================================
-- yahoo_scraped_products トリガー関数修正（型エラー対応）
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_image_url TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- SKU生成: YAH-{id}
        v_sku := 'YAH-' || NEW.id::TEXT;
        
        -- 画像URL取得（JSONBから安全に抽出）
        v_image_url := NULL;
        IF NEW.image_urls IS NOT NULL AND jsonb_typeof(NEW.image_urls) = 'array' AND jsonb_array_length(NEW.image_urls) > 0 THEN
            v_image_url := NEW.image_urls->0->>'url';
            IF v_image_url IS NULL THEN
                v_image_url := NEW.image_urls->>0;
            END IF;
        END IF;
        
        IF v_image_url IS NULL AND NEW.scraped_data IS NOT NULL THEN
            v_image_url := NEW.scraped_data->'images'->0->>'url';
        END IF;
        
        IF v_image_url IS NULL AND NEW.ebay_api_data IS NOT NULL THEN
            v_image_url := NEW.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
        END IF;
        
        INSERT INTO products_master (
            sku,
            source_system,
            source_id,
            source_table,
            title,
            current_price,
            currency,
            category,
            condition_name,
            primary_image_url,
            gallery_images,
            workflow_status,
            approval_status,
            profit_margin,
            profit_amount,
            ai_confidence_score,
            created_at,
            updated_at
        )
        VALUES (
            v_sku,
            'yahoo_scraped_products',
            NEW.id::TEXT,
            'yahoo_scraped_products',
            COALESCE(NEW.english_title, NEW.title),
            COALESCE(NEW.price_usd, NEW.price_jpy / 150.0),
            CASE WHEN NEW.price_usd IS NOT NULL THEN 'USD' ELSE 'JPY' END,
            NEW.category_name,
            NEW.recommended_condition,
            v_image_url,
            NEW.image_urls,
            'scraped',
            COALESCE(NEW.approval_status, 'pending'),
            NEW.profit_margin,
            NEW.profit_amount_usd,
            COALESCE(NEW.ai_confidence_score, 0),
            NEW.created_at,
            NEW.updated_at
        )
        ON CONFLICT (source_system, source_id)
        DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            current_price = EXCLUDED.current_price,
            category = EXCLUDED.category,
            condition_name = EXCLUDED.condition_name,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            profit_margin = EXCLUDED.profit_margin,
            profit_amount = EXCLUDED.profit_amount,
            ai_confidence_score = EXCLUDED.ai_confidence_score,
            updated_at = EXCLUDED.updated_at;
            
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        -- 画像URL取得
        v_image_url := NULL;
        IF NEW.image_urls IS NOT NULL AND jsonb_typeof(NEW.image_urls) = 'array' AND jsonb_array_length(NEW.image_urls) > 0 THEN
            v_image_url := NEW.image_urls->0->>'url';
            IF v_image_url IS NULL THEN
                v_image_url := NEW.image_urls->>0;
            END IF;
        END IF;
        
        IF v_image_url IS NULL AND NEW.scraped_data IS NOT NULL THEN
            v_image_url := NEW.scraped_data->'images'->0->>'url';
        END IF;
        
        IF v_image_url IS NULL AND NEW.ebay_api_data IS NOT NULL THEN
            v_image_url := NEW.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
        END IF;
        
        UPDATE products_master SET
            title = COALESCE(NEW.english_title, NEW.title),
            current_price = COALESCE(NEW.price_usd, NEW.price_jpy / 150.0),
            category = NEW.category_name,
            condition_name = NEW.recommended_condition,
            primary_image_url = v_image_url,
            gallery_images = NEW.image_urls,
            profit_margin = NEW.profit_margin,
            profit_amount = NEW.profit_amount_usd,
            ai_confidence_score = COALESCE(NEW.ai_confidence_score, 0),
            approval_status = COALESCE(NEW.approval_status, 'pending'),
            updated_at = NEW.updated_at
        WHERE source_system = 'yahoo_scraped_products'
        AND source_id = NEW.id::TEXT;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master
        WHERE source_system = 'yahoo_scraped_products'
        AND source_id = OLD.id::TEXT;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 既存データのSKUと画像を修正
-- ============================================================================

-- SKUがNULLのレコードを修正
UPDATE products_master
SET sku = 'YAH-' || source_id
WHERE source_system = 'yahoo_scraped_products'
  AND sku IS NULL;

-- 画像URLを再取得して更新（安全な型変換）
DO $$
DECLARE
    rec RECORD;
    v_image_url TEXT;
BEGIN
    FOR rec IN 
        SELECT pm.id, y.id as yahoo_id, y.image_urls, y.scraped_data, y.ebay_api_data
        FROM products_master pm
        JOIN yahoo_scraped_products y ON y.id::TEXT = pm.source_id
        WHERE pm.source_system = 'yahoo_scraped_products'
    LOOP
        v_image_url := NULL;
        
        -- image_urls から取得
        IF rec.image_urls IS NOT NULL AND jsonb_typeof(rec.image_urls) = 'array' AND jsonb_array_length(rec.image_urls) > 0 THEN
            v_image_url := rec.image_urls->0->>'url';
            IF v_image_url IS NULL THEN
                v_image_url := rec.image_urls->>0;
            END IF;
        END IF;
        
        -- scraped_data から取得
        IF v_image_url IS NULL AND rec.scraped_data IS NOT NULL THEN
            v_image_url := rec.scraped_data->'images'->0->>'url';
        END IF;
        
        -- ebay_api_data から取得
        IF v_image_url IS NULL AND rec.ebay_api_data IS NOT NULL THEN
            v_image_url := rec.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
        END IF;
        
        -- 更新
        UPDATE products_master
        SET primary_image_url = v_image_url,
            gallery_images = rec.image_urls
        WHERE id = rec.id;
    END LOOP;
END $$;

-- ============================================================================
-- 検証
-- ============================================================================

-- 1. SKU確認
SELECT 
    id,
    sku,
    source_id,
    LEFT(title, 40) as title,
    CASE 
        WHEN sku IS NULL THEN '❌ NULL'
        WHEN sku LIKE 'YAH-%' THEN '✅ Correct'
        ELSE '⚠️ Wrong format'
    END as sku_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
ORDER BY id DESC
LIMIT 10;

-- 2. 画像確認
SELECT 
    pm.id,
    pm.sku,
    LEFT(pm.primary_image_url, 50) as image_url_preview,
    CASE 
        WHEN pm.primary_image_url IS NOT NULL THEN '✅ Has image'
        WHEN pm.gallery_images IS NOT NULL THEN '⚠️ Gallery only'
        ELSE '❌ No image'
    END as image_status,
    LEFT(pm.title, 30) as title
FROM products_master pm
WHERE pm.source_system = 'yahoo_scraped_products'
ORDER BY pm.id DESC
LIMIT 10;

-- 3. yahoo_scraped_productsの画像データ確認
SELECT 
    id,
    LEFT(title, 30) as title,
    jsonb_typeof(image_urls) as image_urls_type,
    CASE 
        WHEN image_urls IS NOT NULL AND jsonb_typeof(image_urls) = 'array' 
        THEN jsonb_array_length(image_urls)
        ELSE 0
    END as image_count,
    image_urls->0 as first_image
FROM yahoo_scraped_products
ORDER BY id DESC
LIMIT 5;

-- 4. 新規テストデータ追加
INSERT INTO yahoo_scraped_products (
    title,
    english_title,
    price_jpy,
    price_usd,
    category_name,
    status
) VALUES (
    'トリガー完全テスト',
    'Trigger Full Test',
    10000,
    66.67,
    'Electronics',
    'active'
)
RETURNING id, title;

-- 5. 最終確認
SELECT 
    id,
    sku,
    source_system,
    LEFT(title, 40) as title,
    primary_image_url IS NOT NULL as has_image,
    LEFT(primary_image_url, 50) as image_preview
FROM products_master
ORDER BY id DESC
LIMIT 5;

-- 6. 統計
SELECT 
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(primary_image_url) as with_image,
    COUNT(*) - COUNT(sku) as missing_sku,
    COUNT(*) - COUNT(primary_image_url) as missing_image
FROM products_master
WHERE source_system = 'yahoo_scraped_products';
