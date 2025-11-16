-- ============================================================================
-- yahoo_scraped_products 画像データ構造統一
-- ============================================================================
-- 目的: scraped_data.images に完全統一
-- 理由: 重複した格納方法を排除、メンテナンス性向上
-- ============================================================================

-- ============================================================================
-- STEP 1: 現状のバックアップ（念のため）
-- ============================================================================
SELECT 
    id,
    title,
    scraped_data,
    image_urls
FROM yahoo_scraped_products
WHERE scraped_data->'image_urls' IS NOT NULL 
    OR image_urls IS NOT NULL;

-- ============================================================================
-- STEP 2: scraped_data.image_urls → scraped_data.images に移行
-- ============================================================================
UPDATE yahoo_scraped_products
SET scraped_data = jsonb_set(
    COALESCE(scraped_data, '{}'::jsonb),
    '{images}',
    scraped_data->'image_urls'
)
WHERE scraped_data->'image_urls' IS NOT NULL
    AND (scraped_data->'images' IS NULL OR scraped_data->'images' = '[]'::jsonb);

-- ============================================================================
-- STEP 3: scraped_data.image_urls フィールドを削除
-- ============================================================================
UPDATE yahoo_scraped_products
SET scraped_data = scraped_data - 'image_urls'
WHERE scraped_data ? 'image_urls';

-- ============================================================================
-- STEP 4: image_urls カラムのデータも scraped_data.images に移行
-- ============================================================================
UPDATE yahoo_scraped_products
SET scraped_data = jsonb_set(
    COALESCE(scraped_data, '{}'::jsonb),
    '{images}',
    image_urls
)
WHERE image_urls IS NOT NULL
    AND (scraped_data->'images' IS NULL OR scraped_data->'images' = '[]'::jsonb);

-- ============================================================================
-- STEP 5: image_urls カラムをクリア（将来的に削除を検討）
-- ============================================================================
-- 注: カラム削除はスキーマ変更になるため、現時点ではNULLにするのみ
UPDATE yahoo_scraped_products
SET image_urls = NULL
WHERE image_urls IS NOT NULL;

-- ============================================================================
-- STEP 6: トリガー関数を scraped_data.images 専用に簡素化
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_yahoo_to_products_master()
RETURNS TRIGGER AS $$
DECLARE
    v_sku TEXT;
    v_image_url TEXT;
    v_images_array JSONB;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_sku := 'YAH-' || NEW.id::TEXT;
        
        -- 画像取得: scraped_data.images のみ（統一後）
        v_image_url := NULL;
        v_images_array := NULL;
        
        IF NEW.scraped_data IS NOT NULL AND NEW.scraped_data->'images' IS NOT NULL THEN
            v_images_array := NEW.scraped_data->'images';
            IF jsonb_typeof(v_images_array) = 'array' AND jsonb_array_length(v_images_array) > 0 THEN
                v_image_url := v_images_array->>0;
            END IF;
        END IF;
        
        -- fallback: ebay_api_data (研究データ用)
        IF v_image_url IS NULL AND NEW.ebay_api_data IS NOT NULL THEN
            v_image_url := NEW.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
        END IF;
        
        INSERT INTO products_master (
            sku, source_system, source_id, source_table,
            title, current_price, currency, category, condition_name,
            primary_image_url, gallery_images,
            workflow_status, approval_status,
            profit_margin, profit_amount, ai_confidence_score,
            created_at, updated_at
        )
        VALUES (
            v_sku, 'yahoo_scraped_products', NEW.id::TEXT, 'yahoo_scraped_products',
            COALESCE(NEW.english_title, NEW.title),
            COALESCE(NEW.price_usd, NEW.price_jpy / 150.0),
            CASE WHEN NEW.price_usd IS NOT NULL THEN 'USD' ELSE 'JPY' END,
            NEW.category_name, NEW.recommended_condition,
            v_image_url, v_images_array,
            'scraped', COALESCE(NEW.approval_status, 'pending'),
            NEW.profit_margin, NEW.profit_amount_usd,
            COALESCE(NEW.ai_confidence_score, 0),
            NEW.created_at, NEW.updated_at
        )
        ON CONFLICT (source_system, source_id)
        DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            current_price = EXCLUDED.current_price,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            updated_at = EXCLUDED.updated_at;
        RETURN NEW;
    END IF;
    
    IF (TG_OP = 'UPDATE') THEN
        v_image_url := NULL;
        v_images_array := NULL;
        
        IF NEW.scraped_data IS NOT NULL AND NEW.scraped_data->'images' IS NOT NULL THEN
            v_images_array := NEW.scraped_data->'images';
            IF jsonb_typeof(v_images_array) = 'array' AND jsonb_array_length(v_images_array) > 0 THEN
                v_image_url := v_images_array->>0;
            END IF;
        END IF;
        
        IF v_image_url IS NULL AND NEW.ebay_api_data IS NOT NULL THEN
            v_image_url := NEW.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
        END IF;
        
        UPDATE products_master SET
            title = COALESCE(NEW.english_title, NEW.title),
            current_price = COALESCE(NEW.price_usd, NEW.price_jpy / 150.0),
            primary_image_url = v_image_url,
            gallery_images = v_images_array,
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

COMMENT ON FUNCTION sync_yahoo_to_products_master() IS 
'Yahoo商品データをproducts_masterに同期。画像はscraped_data.imagesのみ使用（統一後）';

-- ============================================================================
-- STEP 7: products_master の画像を再同期
-- ============================================================================
UPDATE products_master pm
SET 
    primary_image_url = y.scraped_data->'images'->>0,
    gallery_images = y.scraped_data->'images'
FROM yahoo_scraped_products y
WHERE pm.source_id = y.id::TEXT
    AND pm.source_system = 'yahoo_scraped_products'
    AND y.scraped_data->'images' IS NOT NULL;

-- ============================================================================
-- STEP 8: 検証
-- ============================================================================

-- 1. yahoo_scraped_products のデータ構造確認（統一後）
SELECT 
    id,
    LEFT(title, 30) as title,
    CASE 
        WHEN scraped_data->'images' IS NOT NULL THEN '✅ scraped_data.images'
        WHEN scraped_data->'image_urls' IS NOT NULL THEN '❌ まだ image_urls'
        WHEN image_urls IS NOT NULL THEN '❌ まだカラム使用'
        ELSE '⚠️ 画像なし'
    END as status,
    CASE 
        WHEN scraped_data->'images' IS NOT NULL 
        THEN jsonb_array_length(scraped_data->'images')
        ELSE 0
    END as image_count
FROM yahoo_scraped_products
ORDER BY id;

-- 2. 統計（統一後）
SELECT 
    CASE 
        WHEN scraped_data->'images' IS NOT NULL THEN '✅ Unified (scraped_data.images)'
        WHEN scraped_data->'image_urls' IS NOT NULL THEN '❌ Old (image_urls)'
        WHEN image_urls IS NOT NULL THEN '❌ Old (column)'
        ELSE '⚠️ No image data'
    END as storage_type,
    COUNT(*) as count
FROM yahoo_scraped_products
GROUP BY 1
ORDER BY count DESC;

-- 3. products_master の画像状況
SELECT 
    pm.id,
    pm.sku,
    LEFT(pm.primary_image_url, 50) as image,
    CASE 
        WHEN pm.primary_image_url IS NOT NULL THEN '✅'
        ELSE '❌'
    END as has_img,
    LEFT(pm.title, 25) as title
FROM products_master pm
WHERE pm.source_system = 'yahoo_scraped_products'
ORDER BY pm.id;

-- 4. 最終統計
SELECT 
    '✅ Total Yahoo products' as metric,
    COUNT(*) as count
FROM yahoo_scraped_products
UNION ALL
SELECT 
    '✅ With scraped_data.images',
    COUNT(*)
FROM yahoo_scraped_products
WHERE scraped_data->'images' IS NOT NULL
UNION ALL
SELECT 
    '❌ Old structure remaining',
    COUNT(*)
FROM yahoo_scraped_products
WHERE scraped_data->'image_urls' IS NOT NULL OR image_urls IS NOT NULL
UNION ALL
SELECT 
    '✅ products_master synced',
    COUNT(*)
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
UNION ALL
SELECT 
    '✅ With images in master',
    COUNT(*)
FROM products_master
WHERE source_system = 'yahoo_scraped_products' AND primary_image_url IS NOT NULL;

-- ============================================================================
-- STEP 9: 新規テスト（統一後の動作確認）
-- ============================================================================
INSERT INTO yahoo_scraped_products (
    title,
    english_title,
    price_jpy,
    category_name,
    status,
    scraped_data
) VALUES (
    '統一後テスト商品',
    'Unified Structure Test',
    8000,
    'Test',
    'active',
    '{"images": ["https://via.placeholder.com/400x300/00BCD4/FFFFFF?text=Unified+Test"], "scraped_at": "2025-11-01T00:00:00Z"}'::jsonb
)
RETURNING id, title;

-- 最終確認
SELECT 
    pm.id,
    pm.sku,
    LEFT(pm.primary_image_url, 50) as image,
    LEFT(pm.title, 30) as title
FROM products_master pm
ORDER BY pm.id DESC
LIMIT 3;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
SELECT 
    '✅ 画像データ構造統一完了' as status,
    'scraped_data.images に完全統一' as detail,
    '重複した格納方法を排除' as improvement,
    NOW() as completed_at;
