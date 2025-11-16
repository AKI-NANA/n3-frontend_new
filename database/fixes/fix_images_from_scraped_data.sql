-- ============================================================================
-- scraped_data->images から画像を正しく取得する修正
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_image_url TEXT;
    v_images_array JSONB;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- SKU生成: YAH-{id}
        v_sku := 'YAH-' || NEW.id::TEXT;
        
        -- 画像取得: scraped_data->images が文字列配列になっている
        v_image_url := NULL;
        v_images_array := NULL;
        
        -- scraped_data->'images' から取得（これがメインソース）
        IF NEW.scraped_data IS NOT NULL AND NEW.scraped_data->'images' IS NOT NULL THEN
            v_images_array := NEW.scraped_data->'images';
            IF jsonb_typeof(v_images_array) = 'array' AND jsonb_array_length(v_images_array) > 0 THEN
                -- 配列の最初の要素を取得
                v_image_url := v_images_array->>0;
            END IF;
        END IF;
        
        -- fallback: image_urls から
        IF v_image_url IS NULL AND NEW.image_urls IS NOT NULL THEN
            IF jsonb_typeof(NEW.image_urls) = 'array' AND jsonb_array_length(NEW.image_urls) > 0 THEN
                v_image_url := NEW.image_urls->0->>'url';
                IF v_image_url IS NULL THEN
                    v_image_url := NEW.image_urls->>0;
                END IF;
            END IF;
        END IF;
        
        -- fallback: ebay_api_data から
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
            COALESCE(v_images_array, NEW.image_urls),
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
        -- 画像取得
        v_image_url := NULL;
        v_images_array := NULL;
        
        IF NEW.scraped_data IS NOT NULL AND NEW.scraped_data->'images' IS NOT NULL THEN
            v_images_array := NEW.scraped_data->'images';
            IF jsonb_typeof(v_images_array) = 'array' AND jsonb_array_length(v_images_array) > 0 THEN
                v_image_url := v_images_array->>0;
            END IF;
        END IF;
        
        IF v_image_url IS NULL AND NEW.image_urls IS NOT NULL THEN
            IF jsonb_typeof(NEW.image_urls) = 'array' AND jsonb_array_length(NEW.image_urls) > 0 THEN
                v_image_url := NEW.image_urls->0->>'url';
                IF v_image_url IS NULL THEN
                    v_image_url := NEW.image_urls->>0;
                END IF;
            END IF;
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
            gallery_images = COALESCE(v_images_array, NEW.image_urls),
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
-- 既存データの画像を再取得（scraped_data->images から）
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
    v_image_url TEXT;
    v_images_array JSONB;
BEGIN
    FOR rec IN 
        SELECT pm.id, y.scraped_data, y.image_urls, y.ebay_api_data
        FROM products_master pm
        JOIN yahoo_scraped_products y ON y.id::TEXT = pm.source_id
        WHERE pm.source_system = 'yahoo_scraped_products'
    LOOP
        v_image_url := NULL;
        v_images_array := NULL;
        
        -- scraped_data->'images' から取得（優先）
        IF rec.scraped_data IS NOT NULL AND rec.scraped_data->'images' IS NOT NULL THEN
            v_images_array := rec.scraped_data->'images';
            IF jsonb_typeof(v_images_array) = 'array' AND jsonb_array_length(v_images_array) > 0 THEN
                v_image_url := v_images_array->>0;
            END IF;
        END IF;
        
        -- fallback
        IF v_image_url IS NULL AND rec.image_urls IS NOT NULL THEN
            IF jsonb_typeof(rec.image_urls) = 'array' AND jsonb_array_length(rec.image_urls) > 0 THEN
                v_image_url := rec.image_urls->0->>'url';
                IF v_image_url IS NULL THEN
                    v_image_url := rec.image_urls->>0;
                END IF;
            END IF;
        END IF;
        
        IF v_image_url IS NULL AND rec.ebay_api_data IS NOT NULL THEN
            v_image_url := rec.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
        END IF;
        
        -- 更新
        UPDATE products_master
        SET primary_image_url = v_image_url,
            gallery_images = v_images_array
        WHERE id = rec.id;
    END LOOP;
END $$;

-- ============================================================================
-- SKUがNULLのレコードを修正
-- ============================================================================

UPDATE products_master
SET sku = 'YAH-' || source_id
WHERE source_system = 'yahoo_scraped_products'
  AND (sku IS NULL OR sku = '');

-- ============================================================================
-- 検証
-- ============================================================================

-- 1. 画像確認
SELECT 
    pm.id,
    pm.sku,
    LEFT(pm.primary_image_url, 60) as image_url,
    CASE 
        WHEN pm.primary_image_url IS NOT NULL THEN '✅ Has image'
        ELSE '❌ No image'
    END as status,
    LEFT(pm.title, 30) as title
FROM products_master pm
WHERE pm.source_system = 'yahoo_scraped_products'
ORDER BY pm.id;

-- 2. 統計
SELECT 
    '✅ Total' as metric,
    COUNT(*) as count
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
UNION ALL
SELECT 
    '✅ With SKU',
    COUNT(*)
FROM products_master
WHERE source_system = 'yahoo_scraped_products' AND sku IS NOT NULL
UNION ALL
SELECT 
    '✅ With Image',
    COUNT(*)
FROM products_master
WHERE source_system = 'yahoo_scraped_products' AND primary_image_url IS NOT NULL
UNION ALL
SELECT 
    '❌ Missing SKU',
    COUNT(*)
FROM products_master
WHERE source_system = 'yahoo_scraped_products' AND sku IS NULL
UNION ALL
SELECT 
    '❌ Missing Image',
    COUNT(*)
FROM products_master
WHERE source_system = 'yahoo_scraped_products' AND primary_image_url IS NULL;

-- 3. 新規テスト
INSERT INTO yahoo_scraped_products (
    title,
    english_title,
    price_jpy,
    category_name,
    status,
    scraped_data
) VALUES (
    '最終テスト商品',
    'Final Test Product',
    5000,
    'Test',
    'active',
    '{"images": ["https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Test+Image"]}'::jsonb
)
RETURNING id, title;

-- 4. 最終確認
SELECT 
    id,
    sku,
    LEFT(primary_image_url, 60) as image,
    LEFT(title, 30) as title
FROM products_master
ORDER BY id DESC
LIMIT 3;
