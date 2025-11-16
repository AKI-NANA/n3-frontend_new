-- ============================================
-- products_master 同期トリガー修正版
-- 画像データを正しく抽出して同期
-- ============================================

-- トリガー関数を修正（画像抽出ロジック追加）
CREATE OR REPLACE FUNCTION sync_products_to_master()
RETURNS TRIGGER AS $$
DECLARE
    extracted_primary_image TEXT;
    extracted_gallery_images JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'products' AND source_id = OLD.id::text;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- 画像URL抽出ロジック
        -- 1. ebay_api_data.browse_result.items[0].image.imageUrl を優先
        IF NEW.ebay_api_data IS NOT NULL THEN
            extracted_primary_image := NEW.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
            
            -- thumbnailImagesから gallery_images を構築
            IF NEW.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages' IS NOT NULL THEN
                extracted_gallery_images := NEW.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages';
            END IF;
        END IF;
        
        -- 2. scraped_data.image_urls をフォールバック
        IF extracted_primary_image IS NULL AND NEW.scraped_data IS NOT NULL THEN
            IF jsonb_typeof(NEW.scraped_data->'image_urls') = 'array' AND 
               jsonb_array_length(NEW.scraped_data->'image_urls') > 0 THEN
                extracted_primary_image := NEW.scraped_data->'image_urls'->>0;
                extracted_gallery_images := NEW.scraped_data->'image_urls';
            END IF;
        END IF;
        
        -- 3. images フィールドをフォールバック
        IF extracted_primary_image IS NULL AND NEW.images IS NOT NULL THEN
            IF jsonb_typeof(NEW.images) = 'array' AND jsonb_array_length(NEW.images) > 0 THEN
                extracted_primary_image := NEW.images->>0;
                extracted_gallery_images := NEW.images;
            END IF;
        END IF;
        
        -- products_master に UPSERT
        INSERT INTO products_master (
            id, sku, title, title_en, description,
            purchase_price_jpy, recommended_price_usd,
            profit_amount_usd, profit_margin_percent,
            final_score, condition, category, source,
            source_system, source_table, source_id,
            images, listing_data, approval_status,
            primary_image_url, gallery_images,
            ebay_api_data, scraped_data,
            created_at, updated_at
        ) VALUES (
            NEW.id, NEW.sku, NEW.title, NEW.english_title, NEW.description,
            NEW.price_jpy, NEW.recommended_price_usd,
            NEW.profit_amount_usd, NEW.profit_margin,
            NEW.final_score, NEW.condition, NEW.category_name, NEW.source,
            'products', 'products', NEW.id::text,
            COALESCE(NEW.images, '[]'::jsonb), NEW.listing_data, NEW.approval_status,
            extracted_primary_image,
            COALESCE(extracted_gallery_images, '[]'::jsonb),
            NEW.ebay_api_data, NEW.scraped_data,
            NEW.created_at, NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            recommended_price_usd = EXCLUDED.recommended_price_usd,
            profit_amount_usd = EXCLUDED.profit_amount_usd,
            approval_status = EXCLUDED.approval_status,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            images = EXCLUDED.images,
            ebay_api_data = EXCLUDED.ebay_api_data,
            scraped_data = EXCLUDED.scraped_data,
            updated_at = NOW();
            
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- トリガーを再作成
DROP TRIGGER IF EXISTS trigger_sync_products_to_master ON products;
CREATE TRIGGER trigger_sync_products_to_master
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_products_to_master();

-- ============================================
-- 既存データの再同期（画像データを修正）
-- ============================================
DO $$
DECLARE
    rec RECORD;
    extracted_primary_image TEXT;
    extracted_gallery_images JSONB;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE '既存データの画像を再同期中...';
    
    FOR rec IN 
        SELECT * FROM products 
        WHERE ebay_api_data IS NOT NULL OR scraped_data IS NOT NULL OR images IS NOT NULL
    LOOP
        extracted_primary_image := NULL;
        extracted_gallery_images := NULL;
        
        -- 画像抽出ロジック
        IF rec.ebay_api_data IS NOT NULL THEN
            extracted_primary_image := rec.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
            
            IF rec.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages' IS NOT NULL THEN
                extracted_gallery_images := rec.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages';
            END IF;
        END IF;
        
        IF extracted_primary_image IS NULL AND rec.scraped_data IS NOT NULL THEN
            IF jsonb_typeof(rec.scraped_data->'image_urls') = 'array' AND 
               jsonb_array_length(rec.scraped_data->'image_urls') > 0 THEN
                extracted_primary_image := rec.scraped_data->'image_urls'->>0;
                extracted_gallery_images := rec.scraped_data->'image_urls';
            END IF;
        END IF;
        
        IF extracted_primary_image IS NULL AND rec.images IS NOT NULL THEN
            IF jsonb_typeof(rec.images) = 'array' AND jsonb_array_length(rec.images) > 0 THEN
                extracted_primary_image := rec.images->>0;
                extracted_gallery_images := rec.images;
            END IF;
        END IF;
        
        -- 画像データがある場合のみ更新
        IF extracted_primary_image IS NOT NULL THEN
            UPDATE products_master
            SET 
                primary_image_url = extracted_primary_image,
                gallery_images = COALESCE(extracted_gallery_images, '[]'::jsonb),
                ebay_api_data = rec.ebay_api_data,
                scraped_data = rec.scraped_data,
                images = COALESCE(rec.images, '[]'::jsonb),
                updated_at = NOW(),
                synced_at = NOW()
            WHERE source_system = 'products' AND source_id = rec.id::text;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ 画像データの同期完了: % 件更新', updated_count;
    
    -- ゲンガーの確認
    FOR rec IN 
        SELECT id, title, primary_image_url, 
               jsonb_array_length(COALESCE(gallery_images, '[]'::jsonb)) as image_count
        FROM products_master
        WHERE title ILIKE '%ゲンガー%' OR title_en ILIKE '%gengar%'
    LOOP
        RAISE NOTICE 'ゲンガー商品: ID=%, タイトル=%, 画像URL=%, 画像数=%', 
            rec.id, 
            substring(rec.title, 1, 50), 
            rec.primary_image_url,
            rec.image_count;
    END LOOP;
END $$;

RAISE NOTICE '============================================';
RAISE NOTICE '同期トリガーの修正と既存データの再同期が完了しました';
RAISE NOTICE '============================================';
