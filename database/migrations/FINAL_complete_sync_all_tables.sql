-- ============================================
-- 完全なproducts_master同期システム（最終版）
-- 全てのテーブルに対応 - 実際のフィールド名で修正済み
-- ============================================

-- ============================================
-- 1. products テーブル → products_master
-- ============================================
CREATE OR REPLACE FUNCTION sync_products_to_master()
RETURNS TRIGGER AS $$
DECLARE
    extracted_primary_image TEXT;
    extracted_gallery_images JSONB;
    extracted_price_jpy NUMERIC;
    extracted_price_usd NUMERIC;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'products' AND source_id = OLD.id::text;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- 価格抽出
        extracted_price_jpy := COALESCE(NEW.price_jpy, NEW.acquired_price_jpy, NEW.cost_price);
        extracted_price_usd := COALESCE(NEW.price_usd, NEW.ddp_price_usd, NEW.ddu_price_usd);
        
        -- 画像URL抽出
        -- 1. ebay_api_data.browse_result.items[0]
        IF NEW.ebay_api_data IS NOT NULL THEN
            extracted_primary_image := NEW.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl';
            IF extracted_primary_image IS NULL THEN
                extracted_primary_image := NEW.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages'->0->>'imageUrl';
            END IF;
            extracted_gallery_images := NEW.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages';
        END IF;
        
        -- 2. scraped_data.image_urls
        IF extracted_primary_image IS NULL AND NEW.scraped_data IS NOT NULL THEN
            IF NEW.scraped_data->'image_urls' IS NOT NULL THEN
                IF jsonb_typeof(NEW.scraped_data->'image_urls') = 'array' AND 
                   jsonb_array_length(NEW.scraped_data->'image_urls') > 0 THEN
                    extracted_primary_image := NEW.scraped_data->'image_urls'->>0;
                    extracted_gallery_images := NEW.scraped_data->'image_urls';
                END IF;
            END IF;
        END IF;
        
        -- 3. images
        IF extracted_primary_image IS NULL AND NEW.images IS NOT NULL THEN
            IF jsonb_typeof(NEW.images) = 'array' AND jsonb_array_length(NEW.images) > 0 THEN
                extracted_primary_image := NEW.images->>0;
                extracted_gallery_images := NEW.images;
            END IF;
        END IF;
        
        -- UPSERT
        INSERT INTO products_master (
            source_system, source_id,
            sku, title, title_en, description,
            purchase_price_jpy, purchase_price_usd,
            recommended_price_usd, profit_amount_usd, profit_margin_percent,
            lowest_price_usd, lowest_price_profit_usd, lowest_price_profit_margin,
            final_score, category, condition,
            primary_image_url, gallery_images, images,
            listing_data, scraped_data, ebay_api_data,
            approval_status, workflow_status,
            created_at, updated_at, synced_at
        ) VALUES (
            'products', NEW.id::text,
            NEW.sku, NEW.title, NEW.english_title, NULL,
            extracted_price_jpy, extracted_price_usd,
            NULL, NEW.profit_amount_usd, NEW.profit_margin,
            NEW.sm_lowest_price, NEW.sm_profit_amount_usd, NEW.sm_profit_margin,
            NEW.listing_score, NEW.category_name, NEW.condition,
            extracted_primary_image, 
            COALESCE(extracted_gallery_images, '[]'::jsonb),
            COALESCE(NEW.images, '[]'::jsonb),
            NEW.listing_data, NEW.scraped_data, NEW.ebay_api_data,
            COALESCE(NEW.status, 'pending'),
            COALESCE(NEW.status, 'imported'),
            COALESCE(NEW.created_at, NOW()), NOW(), NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            purchase_price_usd = EXCLUDED.purchase_price_usd,
            profit_amount_usd = EXCLUDED.profit_amount_usd,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            lowest_price_usd = EXCLUDED.lowest_price_usd,
            lowest_price_profit_usd = EXCLUDED.lowest_price_profit_usd,
            lowest_price_profit_margin = EXCLUDED.lowest_price_profit_margin,
            final_score = EXCLUDED.final_score,
            category = EXCLUDED.category,
            condition = EXCLUDED.condition,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            images = EXCLUDED.images,
            listing_data = EXCLUDED.listing_data,
            scraped_data = EXCLUDED.scraped_data,
            ebay_api_data = EXCLUDED.ebay_api_data,
            approval_status = EXCLUDED.approval_status,
            workflow_status = EXCLUDED.workflow_status,
            updated_at = NOW(),
            synced_at = NOW();
            
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_products_to_master ON products;
CREATE TRIGGER trigger_sync_products_to_master
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_products_to_master();

RAISE NOTICE '✅ products → products_master トリガー作成完了';

-- ============================================
-- 2. yahoo_scraped_products テーブル → products_master  
-- ============================================
CREATE OR REPLACE FUNCTION sync_yahoo_to_master()
RETURNS TRIGGER AS $$
DECLARE
    extracted_primary_image TEXT;
    extracted_gallery_images JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'yahoo_scraped' AND source_id = OLD.id::text;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- 画像URL抽出
        IF NEW.image_urls IS NOT NULL THEN
            IF jsonb_typeof(NEW.image_urls) = 'array' AND jsonb_array_length(NEW.image_urls) > 0 THEN
                extracted_primary_image := NEW.image_urls->>0;
                extracted_gallery_images := NEW.image_urls;
            END IF;
        END IF;
        
        IF extracted_primary_image IS NULL AND NEW.scraped_data IS NOT NULL THEN
            IF NEW.scraped_data->'image_urls' IS NOT NULL THEN
                IF jsonb_typeof(NEW.scraped_data->'image_urls') = 'array' AND 
                   jsonb_array_length(NEW.scraped_data->'image_urls') > 0 THEN
                    extracted_primary_image := NEW.scraped_data->'image_urls'->>0;
                    extracted_gallery_images := NEW.scraped_data->'image_urls';
                ELSIF jsonb_typeof(NEW.scraped_data->'images') = 'array' AND 
                   jsonb_array_length(NEW.scraped_data->'images') > 0 THEN
                    extracted_primary_image := NEW.scraped_data->'images'->>0;
                    extracted_gallery_images := NEW.scraped_data->'images';
                END IF;
            END IF;
        END IF;
        
        INSERT INTO products_master (
            source_system, source_id,
            sku, title, title_en,
            purchase_price_jpy, purchase_price_usd,
            recommended_price_usd, profit_amount_usd, profit_margin_percent,
            lowest_price_usd, lowest_price_profit_usd, lowest_price_profit_margin,
            final_score, category,
            primary_image_url, gallery_images, image_urls,
            scraped_data, ebay_api_data, listing_data,
            approval_status, workflow_status,
            created_at, updated_at, synced_at
        ) VALUES (
            'yahoo_scraped', NEW.id::text,
            NEW.sku, NEW.title, NEW.english_title,
            NEW.price_jpy, NEW.price_usd,
            NEW.recommended_price_usd, NEW.profit_amount_usd, NEW.profit_margin,
            NEW.sm_lowest_price, NEW.sm_profit_amount_usd, NEW.sm_profit_margin,
            NULL, NEW.category_name,
            extracted_primary_image,
            COALESCE(extracted_gallery_images, '[]'::jsonb),
            NEW.image_urls,
            NEW.scraped_data, NEW.ebay_api_data, NEW.listing_data,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.status, 'scraped'),
            COALESCE(NEW.created_at, NOW()), NOW(), NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            purchase_price_usd = EXCLUDED.purchase_price_usd,
            recommended_price_usd = EXCLUDED.recommended_price_usd,
            profit_amount_usd = EXCLUDED.profit_amount_usd,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            lowest_price_usd = EXCLUDED.lowest_price_usd,
            category = EXCLUDED.category,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            image_urls = EXCLUDED.image_urls,
            scraped_data = EXCLUDED.scraped_data,
            ebay_api_data = EXCLUDED.ebay_api_data,
            listing_data = EXCLUDED.listing_data,
            approval_status = EXCLUDED.approval_status,
            workflow_status = EXCLUDED.workflow_status,
            updated_at = NOW(),
            synced_at = NOW();
            
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_yahoo_to_master ON yahoo_scraped_products;
CREATE TRIGGER trigger_sync_yahoo_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_to_master();

RAISE NOTICE '✅ yahoo_scraped_products → products_master トリガー作成完了';

-- ============================================
-- 3. 既存データの完全再同期
-- ============================================
DO $$
DECLARE
    rec RECORD;
    sync_count INTEGER := 0;
    total_synced INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '既存データの完全再同期を開始';
    RAISE NOTICE '============================================';
    
    -- products テーブル
    sync_count := 0;
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 1: products テーブルからの再同期...';
    FOR rec IN SELECT id FROM products LOOP
        UPDATE products SET updated_at = COALESCE(updated_at, NOW()) WHERE id = rec.id;
        sync_count := sync_count + 1;
    END LOOP;
    total_synced := total_synced + sync_count;
    RAISE NOTICE '  ✅ products: % 件を再同期', sync_count;
    
    -- yahoo_scraped_products テーブル
    sync_count := 0;
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 2: yahoo_scraped_products テーブルからの再同期...';
    FOR rec IN SELECT id FROM yahoo_scraped_products LOOP
        UPDATE yahoo_scraped_products SET updated_at = COALESCE(updated_at, NOW()) WHERE id = rec.id;
        sync_count := sync_count + 1;
    END LOOP;
    total_synced := total_synced + sync_count;
    RAISE NOTICE '  ✅ yahoo_scraped_products: % 件を再同期', sync_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '再同期完了: 合計 % 件を同期', total_synced;
    RAISE NOTICE '============================================';
    
    -- ゲンガー商品の詳細表示
    RAISE NOTICE '';
    RAISE NOTICE '🔍 ゲンガー商品の検索結果:';
    RAISE NOTICE '============================================';
    
    FOR rec IN 
        SELECT 
            id, 
            source_system,
            title, 
            title_en,
            primary_image_url, 
            jsonb_array_length(COALESCE(gallery_images, '[]'::jsonb)) as image_count,
            purchase_price_jpy,
            purchase_price_usd,
            recommended_price_usd,
            profit_amount_usd,
            profit_margin_percent,
            approval_status,
            workflow_status,
            created_at
        FROM products_master
        WHERE title ILIKE '%ゲンガー%' OR title_en ILIKE '%gengar%'
        ORDER BY updated_at DESC
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '👻 ゲンガー商品 ID: %', rec.id;
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE '  📦 ソース: %', rec.source_system;
        RAISE NOTICE '  🏷️  タイトル(日): %', COALESCE(substring(rec.title, 1, 60), 'なし');
        RAISE NOTICE '  🏷️  タイトル(英): %', COALESCE(substring(rec.title_en, 1, 60), 'なし');
        RAISE NOTICE '  🖼️  画像URL: %', COALESCE(substring(rec.primary_image_url, 1, 80), '❌ なし');
        RAISE NOTICE '  🖼️  画像数: %', rec.image_count;
        RAISE NOTICE '  💴 仕入価格(JPY): %', COALESCE(rec.purchase_price_jpy::text, 'なし');
        RAISE NOTICE '  💵 仕入価格(USD): %', COALESCE(rec.purchase_price_usd::text, 'なし');
        RAISE NOTICE '  💰 推奨価格(USD): %', COALESCE(rec.recommended_price_usd::text, 'なし');
        RAISE NOTICE '  📈 利益(USD): %', COALESCE(rec.profit_amount_usd::text, 'なし');
        RAISE NOTICE '  📊 利益率: %%%', COALESCE(rec.profit_margin_percent::text, 'なし');
        RAISE NOTICE '  ✅ 承認状態: %', rec.approval_status;
        RAISE NOTICE '  🔄 ワークフロー: %', rec.workflow_status;
        RAISE NOTICE '  📅 作成日時: %', rec.created_at;
    END LOOP;
    
    -- 全体統計
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '📊 products_master 全体統計:';
    RAISE NOTICE '============================================';
    
    FOR rec IN 
        SELECT 
            source_system,
            COUNT(*) as total,
            COUNT(CASE WHEN primary_image_url IS NOT NULL THEN 1 END) as with_image,
            COUNT(CASE WHEN title_en IS NOT NULL THEN 1 END) as with_english,
            COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
            COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected
        FROM products_master
        GROUP BY source_system
        ORDER BY source_system
    LOOP
        RAISE NOTICE '';
        RAISE NOTICE '  [%]', rec.source_system;
        RAISE NOTICE '    総数: %', rec.total;
        RAISE NOTICE '    画像あり: %', rec.with_image;
        RAISE NOTICE '    英語タイトルあり: %', rec.with_english;
        RAISE NOTICE '    承認待ち: %', rec.pending;
        RAISE NOTICE '    承認済み: %', rec.approved;
        RAISE NOTICE '    否認: %', rec.rejected;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ 完了！';
    RAISE NOTICE '============================================';
END $$;
