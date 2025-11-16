-- ============================================
-- 完全なproducts_master同期システム
-- 全てのソーステーブルに対応したトリガー
-- ============================================

-- ============================================
-- 1. products テーブル → products_master
-- ============================================
CREATE OR REPLACE FUNCTION sync_products_to_master()
RETURNS TRIGGER AS $$
DECLARE
    extracted_primary_image TEXT;
    extracted_gallery_images JSONB;
    extracted_title_en TEXT;
    extracted_price_jpy NUMERIC;
    extracted_price_usd NUMERIC;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'products' AND source_id = OLD.id::text;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- タイトル抽出
        extracted_title_en := COALESCE(NEW.english_title, NEW.title_en);
        
        -- 価格抽出
        extracted_price_jpy := COALESCE(NEW.price_jpy, NEW.acquired_price_jpy, NEW.cost_price);
        extracted_price_usd := COALESCE(NEW.price_usd, NEW.ddp_price_usd, NEW.ddu_price_usd);
        
        -- 画像URL抽出（複数のソースから試行）
        -- 1. ebay_api_data.browse_result.items[0].image.imageUrl
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
        
        -- 3. image_urls (配列フィールド)
        IF extracted_primary_image IS NULL AND NEW.image_urls IS NOT NULL THEN
            IF jsonb_typeof(NEW.image_urls) = 'array' AND jsonb_array_length(NEW.image_urls) > 0 THEN
                extracted_primary_image := NEW.image_urls->>0;
                extracted_gallery_images := NEW.image_urls;
            ELSIF array_length(NEW.image_urls::text[], 1) > 0 THEN
                extracted_primary_image := (NEW.image_urls::text[])[1];
            END IF;
        END IF;
        
        -- 4. images (JSONBフィールド)
        IF extracted_primary_image IS NULL AND NEW.images IS NOT NULL THEN
            IF jsonb_typeof(NEW.images) = 'array' AND jsonb_array_length(NEW.images) > 0 THEN
                extracted_primary_image := NEW.images->>0;
                extracted_gallery_images := NEW.images;
            END IF;
        END IF;
        
        -- products_master に UPSERT
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
            NEW.sku, NEW.title, extracted_title_en, NEW.description,
            extracted_price_jpy, extracted_price_usd,
            NEW.recommended_price_usd, NEW.profit_amount_usd, NEW.profit_margin,
            NEW.sm_lowest_price, NEW.sm_profit_amount_usd, NEW.sm_profit_margin,
            NEW.listing_score, NEW.category_name, NEW.condition,
            extracted_primary_image, 
            COALESCE(extracted_gallery_images, '[]'::jsonb),
            COALESCE(NEW.images, '[]'::jsonb),
            NEW.listing_data, NEW.scraped_data, NEW.ebay_api_data,
            COALESCE(NEW.approval_status, NEW.status, 'pending'),
            COALESCE(NEW.status, 'imported'),
            COALESCE(NEW.created_at, NOW()), NOW(), NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            description = EXCLUDED.description,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            purchase_price_usd = EXCLUDED.purchase_price_usd,
            recommended_price_usd = EXCLUDED.recommended_price_usd,
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

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_sync_products_to_master ON products;
CREATE TRIGGER trigger_sync_products_to_master
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW
    EXECUTE FUNCTION sync_products_to_master();

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
            lowest_price_profit_usd = EXCLUDED.lowest_price_profit_usd,
            lowest_price_profit_margin = EXCLUDED.lowest_price_profit_margin,
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

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_sync_yahoo_to_master ON yahoo_scraped_products;
CREATE TRIGGER trigger_sync_yahoo_to_master
    AFTER INSERT OR UPDATE OR DELETE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION sync_yahoo_to_master();

-- ============================================
-- 3. 既存データの完全再同期
-- ============================================
DO $$
DECLARE
    rec RECORD;
    sync_count INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '既存データの完全再同期を開始';
    RAISE NOTICE '============================================';
    
    -- products テーブルから再同期
    RAISE NOTICE 'STEP 1: products テーブルからの再同期...';
    FOR rec IN SELECT * FROM products LOOP
        -- トリガー関数を直接呼び出すのではなく、UPDATEでトリガーを発火
        UPDATE products SET updated_at = updated_at WHERE id = rec.id;
        sync_count := sync_count + 1;
    END LOOP;
    RAISE NOTICE '  → products: % 件を再同期', sync_count;
    
    -- yahoo_scraped_products テーブルから再同期
    sync_count := 0;
    RAISE NOTICE 'STEP 2: yahoo_scraped_products テーブルからの再同期...';
    FOR rec IN SELECT * FROM yahoo_scraped_products LOOP
        UPDATE yahoo_scraped_products SET updated_at = updated_at WHERE id = rec.id;
        sync_count := sync_count + 1;
    END LOOP;
    RAISE NOTICE '  → yahoo_scraped_products: % 件を再同期', sync_count;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '再同期完了 - 統計情報:';
    
    -- ゲンガーの確認
    FOR rec IN 
        SELECT 
            id, 
            source_system,
            title, 
            title_en,
            primary_image_url, 
            jsonb_array_length(COALESCE(gallery_images, '[]'::jsonb)) as image_count,
            purchase_price_jpy,
            recommended_price_usd,
            approval_status
        FROM products_master
        WHERE title ILIKE '%ゲンガー%' OR title_en ILIKE '%gengar%'
        ORDER BY updated_at DESC
    LOOP
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE 'ゲンガー商品発見:';
        RAISE NOTICE '  ID: %', rec.id;
        RAISE NOTICE '  ソース: %', rec.source_system;
        RAISE NOTICE '  タイトル(日): %', substring(rec.title, 1, 50);
        RAISE NOTICE '  タイトル(英): %', substring(COALESCE(rec.title_en, 'なし'), 1, 50);
        RAISE NOTICE '  画像URL: %', COALESCE(rec.primary_image_url, 'なし');
        RAISE NOTICE '  画像数: %', rec.image_count;
        RAISE NOTICE '  仕入価格: ¥%', rec.purchase_price_jpy;
        RAISE NOTICE '  推奨価格: $%', rec.recommended_price_usd;
        RAISE NOTICE '  承認状態: %', rec.approval_status;
    END LOOP;
    
    -- 全体統計
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '全体統計:';
    FOR rec IN 
        SELECT 
            source_system,
            COUNT(*) as total,
            COUNT(CASE WHEN primary_image_url IS NOT NULL THEN 1 END) as with_image,
            COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved
        FROM products_master
        GROUP BY source_system
    LOOP
        RAISE NOTICE '  [%] 総数: %, 画像あり: %, 承認待ち: %, 承認済み: %', 
            rec.source_system, rec.total, rec.with_image, rec.pending, rec.approved;
    END LOOP;
    
    RAISE NOTICE '============================================';
    RAISE NOTICE '完了！';
    RAISE NOTICE '============================================';
END $$;
