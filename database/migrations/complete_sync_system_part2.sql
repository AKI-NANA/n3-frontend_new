-- ============================================
-- 4. inventory_products テーブル → products_master
-- ============================================
CREATE OR REPLACE FUNCTION sync_inventory_to_master()
RETURNS TRIGGER AS $$
DECLARE
    extracted_primary_image TEXT;
    extracted_title TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'inventory' AND source_id = OLD.id::text;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- タイトル抽出（複数のフィールドから）
        extracted_title := COALESCE(NEW.product_name, NEW.name, NEW.title);
        
        -- 画像URL抽出
        extracted_primary_image := NEW.image_url;
        
        INSERT INTO products_master (
            source_system, source_id,
            sku, title, description,
            purchase_price_usd, category, condition,
            primary_image_url,
            approval_status, workflow_status,
            created_at, updated_at, synced_at
        ) VALUES (
            'inventory', NEW.id::text,
            NEW.sku, extracted_title, NEW.description,
            COALESCE(NEW.price_usd, NEW.price, NEW.cost_price), 
            NEW.category, 
            NEW.condition,
            extracted_primary_image,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.status, 'in_stock'),
            COALESCE(NEW.created_at, NOW()), NOW(), NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            purchase_price_usd = EXCLUDED.purchase_price_usd,
            category = EXCLUDED.category,
            condition = EXCLUDED.condition,
            primary_image_url = EXCLUDED.primary_image_url,
            approval_status = EXCLUDED.approval_status,
            workflow_status = EXCLUDED.workflow_status,
            updated_at = NOW(),
            synced_at = NOW();
            
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成（inventory_productsテーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_products') THEN
        DROP TRIGGER IF EXISTS trigger_sync_inventory_to_master ON inventory_products;
        CREATE TRIGGER trigger_sync_inventory_to_master
            AFTER INSERT OR UPDATE OR DELETE ON inventory_products
            FOR EACH ROW
            EXECUTE FUNCTION sync_inventory_to_master();
        RAISE NOTICE 'inventory_products トリガーを作成しました';
    ELSE
        RAISE NOTICE 'inventory_products テーブルが存在しないためスキップ';
    END IF;
END $$;

-- ============================================
-- 5. mystical_japan_treasures_inventory テーブル → products_master
-- ============================================
CREATE OR REPLACE FUNCTION sync_mystical_to_master()
RETURNS TRIGGER AS $$
DECLARE
    extracted_primary_image TEXT;
    extracted_gallery_images JSONB;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        DELETE FROM products_master 
        WHERE source_system = 'mystical' AND source_id = OLD.id::text;
        RETURN OLD;
        
    ELSIF (TG_OP IN ('INSERT', 'UPDATE')) THEN
        -- 画像URL抽出
        extracted_primary_image := NEW.primary_image_url;
        
        IF extracted_primary_image IS NULL AND NEW.images IS NOT NULL THEN
            IF jsonb_typeof(NEW.images) = 'array' AND jsonb_array_length(NEW.images) > 0 THEN
                extracted_primary_image := NEW.images->>0;
                extracted_gallery_images := NEW.images;
            END IF;
        END IF;
        
        INSERT INTO products_master (
            source_system, source_id,
            sku, title, title_en,
            purchase_price_jpy, recommended_price_usd,
            profit_amount_usd, profit_margin_percent,
            lowest_price_usd, lowest_price_profit_usd, lowest_price_profit_margin,
            final_score, category_score, competition_score, profit_score,
            export_filter_pass, patent_filter_pass, mall_filter_pass,
            filter_issues, category,
            primary_image_url, gallery_images, images,
            listing_data,
            approval_status, workflow_status,
            created_at, updated_at, synced_at
        ) VALUES (
            'mystical', NEW.id::text,
            NEW.sku, NEW.title, NEW.title_en,
            NEW.purchase_price_jpy, NEW.recommended_price_usd,
            NEW.profit_amount_usd, NEW.profit_margin_percent,
            NEW.sm_lowest_price, NEW.sm_profit_amount_usd, NEW.sm_profit_margin,
            NEW.final_score, NEW.category_score, NEW.competition_score, NEW.profit_score,
            NEW.export_filter_pass, NEW.patent_filter_pass, NEW.mall_filter_pass,
            NEW.filter_issues, NEW.category,
            extracted_primary_image,
            COALESCE(extracted_gallery_images, '[]'::jsonb),
            NEW.images,
            NEW.listing_data,
            COALESCE(NEW.approval_status, 'pending'),
            COALESCE(NEW.workflow_status, 'processed'),
            COALESCE(NEW.created_at, NOW()), NOW(), NOW()
        )
        ON CONFLICT (source_system, source_id) DO UPDATE SET
            sku = EXCLUDED.sku,
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            purchase_price_jpy = EXCLUDED.purchase_price_jpy,
            recommended_price_usd = EXCLUDED.recommended_price_usd,
            profit_amount_usd = EXCLUDED.profit_amount_usd,
            profit_margin_percent = EXCLUDED.profit_margin_percent,
            lowest_price_usd = EXCLUDED.lowest_price_usd,
            lowest_price_profit_usd = EXCLUDED.lowest_price_profit_usd,
            lowest_price_profit_margin = EXCLUDED.lowest_price_profit_margin,
            final_score = EXCLUDED.final_score,
            category_score = EXCLUDED.category_score,
            competition_score = EXCLUDED.competition_score,
            profit_score = EXCLUDED.profit_score,
            export_filter_pass = EXCLUDED.export_filter_pass,
            patent_filter_pass = EXCLUDED.patent_filter_pass,
            mall_filter_pass = EXCLUDED.mall_filter_pass,
            filter_issues = EXCLUDED.filter_issues,
            category = EXCLUDED.category,
            primary_image_url = EXCLUDED.primary_image_url,
            gallery_images = EXCLUDED.gallery_images,
            images = EXCLUDED.images,
            listing_data = EXCLUDED.listing_data,
            approval_status = EXCLUDED.approval_status,
            workflow_status = EXCLUDED.workflow_status,
            updated_at = NOW(),
            synced_at = NOW();
            
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成（mystical_japan_treasures_inventoryテーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystical_japan_treasures_inventory') THEN
        DROP TRIGGER IF EXISTS trigger_sync_mystical_to_master ON mystical_japan_treasures_inventory;
        CREATE TRIGGER trigger_sync_mystical_to_master
            AFTER INSERT OR UPDATE OR DELETE ON mystical_japan_treasures_inventory
            FOR EACH ROW
            EXECUTE FUNCTION sync_mystical_to_master();
        RAISE NOTICE 'mystical_japan_treasures_inventory トリガーを作成しました';
    ELSE
        RAISE NOTICE 'mystical_japan_treasures_inventory テーブルが存在しないためスキップ';
    END IF;
END $$;

-- ============================================
-- 6. 全テーブルの既存データを完全再同期
-- ============================================
DO $$
DECLARE
    rec RECORD;
    sync_count INTEGER := 0;
    total_synced INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '全テーブルの既存データ完全再同期を開始';
    RAISE NOTICE '============================================';
    
    -- products テーブル
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        sync_count := 0;
        RAISE NOTICE '';
        RAISE NOTICE 'STEP 1: products テーブルからの再同期...';
        FOR rec IN SELECT id FROM products LOOP
            UPDATE products SET updated_at = COALESCE(updated_at, NOW()) WHERE id = rec.id;
            sync_count := sync_count + 1;
        END LOOP;
        total_synced := total_synced + sync_count;
        RAISE NOTICE '  ✅ products: % 件を再同期', sync_count;
    ELSE
        RAISE NOTICE 'STEP 1: products テーブルが存在しません（スキップ）';
    END IF;
    
    -- yahoo_scraped_products テーブル
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products') THEN
        sync_count := 0;
        RAISE NOTICE '';
        RAISE NOTICE 'STEP 2: yahoo_scraped_products テーブルからの再同期...';
        FOR rec IN SELECT id FROM yahoo_scraped_products LOOP
            UPDATE yahoo_scraped_products SET updated_at = COALESCE(updated_at, NOW()) WHERE id = rec.id;
            sync_count := sync_count + 1;
        END LOOP;
        total_synced := total_synced + sync_count;
        RAISE NOTICE '  ✅ yahoo_scraped_products: % 件を再同期', sync_count;
    ELSE
        RAISE NOTICE 'STEP 2: yahoo_scraped_products テーブルが存在しません（スキップ）';
    END IF;
    
    -- inventory_products テーブル
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_products') THEN
        sync_count := 0;
        RAISE NOTICE '';
        RAISE NOTICE 'STEP 3: inventory_products テーブルからの再同期...';
        FOR rec IN SELECT id FROM inventory_products LOOP
            UPDATE inventory_products SET updated_at = COALESCE(updated_at, NOW()) WHERE id = rec.id;
            sync_count := sync_count + 1;
        END LOOP;
        total_synced := total_synced + sync_count;
        RAISE NOTICE '  ✅ inventory_products: % 件を再同期', sync_count;
    ELSE
        RAISE NOTICE 'STEP 3: inventory_products テーブルが存在しません（スキップ）';
    END IF;
    
    -- mystical_japan_treasures_inventory テーブル
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystical_japan_treasures_inventory') THEN
        sync_count := 0;
        RAISE NOTICE '';
        RAISE NOTICE 'STEP 4: mystical_japan_treasures_inventory テーブルからの再同期...';
        FOR rec IN SELECT id FROM mystical_japan_treasures_inventory LOOP
            UPDATE mystical_japan_treasures_inventory SET updated_at = COALESCE(updated_at, NOW()) WHERE id = rec.id;
            sync_count := sync_count + 1;
        END LOOP;
        total_synced := total_synced + sync_count;
        RAISE NOTICE '  ✅ mystical_japan_treasures_inventory: % 件を再同期', sync_count;
    ELSE
        RAISE NOTICE 'STEP 4: mystical_japan_treasures_inventory テーブルが存在しません（スキップ）';
    END IF;
    
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
        RAISE NOTICE '  🖼️  画像URL: %', COALESCE(substring(rec.primary_image_url, 1, 60), '❌ なし');
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
