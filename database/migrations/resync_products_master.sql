-- ============================================
-- products_master 再同期スクリプト
-- ============================================
-- 目的: 既存テーブルのデータをproducts_masterに再同期
-- 実行前に http://localhost:3000/api/debug/check-tables で
-- どのテーブルにデータが残っているか確認してください
-- ============================================

DO $$
DECLARE
    sync_count INTEGER;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'products_master 再同期開始';
    RAISE NOTICE '============================================';

    -- ============================================
    -- STEP 1: yahoo_scraped_products から同期
    -- ============================================
    RAISE NOTICE 'STEP 1: yahoo_scraped_products から同期中...';
    
    INSERT INTO products_master (
        source_system,
        source_id,
        sku,
        title,
        title_en,
        purchase_price_jpy,
        primary_image_url,
        images,
        image_urls,
        scraped_data,
        approval_status,
        workflow_status,
        created_at
    )
    SELECT 
        'yahoo_scraped' as source_system,
        COALESCE(id::text, item_id) as source_id,
        sku,
        title,
        title_en,
        current_price as purchase_price_jpy,
        COALESCE(
            image_url,
            CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 
                 THEN images->0->>'url' 
                 ELSE NULL END
        ) as primary_image_url,
        images,
        CASE 
            WHEN image_url IS NOT NULL THEN jsonb_build_array(image_url)
            ELSE '[]'::jsonb
        END as image_urls,
        jsonb_strip_nulls(jsonb_build_object(
            'item_id', item_id,
            'url', url,
            'seller_id', seller_id,
            'condition', condition,
            'category', category,
            'end_date', end_date
        )) as scraped_data,
        COALESCE(approval_status, 'pending') as approval_status,
        'scraped' as workflow_status,
        COALESCE(created_at, NOW()) as created_at
    FROM yahoo_scraped_products
    ON CONFLICT (source_system, source_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        title_en = EXCLUDED.title_en,
        purchase_price_jpy = EXCLUDED.purchase_price_jpy,
        primary_image_url = EXCLUDED.primary_image_url,
        images = EXCLUDED.images,
        scraped_data = EXCLUDED.scraped_data,
        updated_at = NOW(),
        synced_at = NOW();
    
    GET DIAGNOSTICS sync_count = ROW_COUNT;
    RAISE NOTICE '  → yahoo_scraped_products: % 件を同期', sync_count;

    -- ============================================
    -- STEP 2: mystical_japan_treasures_inventory から同期
    -- ============================================
    RAISE NOTICE 'STEP 2: mystical_japan_treasures_inventory から同期中...';
    
    INSERT INTO products_master (
        source_system,
        source_id,
        sku,
        title,
        title_en,
        purchase_price_jpy,
        recommended_price_usd,
        profit_amount_usd,
        profit_margin_percent,
        final_score,
        category_score,
        competition_score,
        profit_score,
        export_filter_pass,
        patent_filter_pass,
        mall_filter_pass,
        filter_issues,
        primary_image_url,
        images,
        listing_data,
        approval_status,
        workflow_status,
        created_at
    )
    SELECT 
        'mystical' as source_system,
        id::text as source_id,
        sku,
        title,
        title_en,
        purchase_price_jpy,
        recommended_price_usd,
        profit_amount_usd,
        profit_margin_percent,
        final_score,
        category_score,
        competition_score,
        profit_score,
        export_filter_pass,
        patent_filter_pass,
        mall_filter_pass,
        filter_issues,
        COALESCE(
            primary_image_url,
            CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 
                 THEN images->>0 
                 ELSE NULL END
        ) as primary_image_url,
        images,
        listing_data,
        COALESCE(approval_status, 'pending') as approval_status,
        COALESCE(workflow_status, 'processed') as workflow_status,
        COALESCE(created_at, NOW()) as created_at
    FROM mystical_japan_treasures_inventory
    ON CONFLICT (source_system, source_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        title_en = EXCLUDED.title_en,
        purchase_price_jpy = EXCLUDED.purchase_price_jpy,
        recommended_price_usd = EXCLUDED.recommended_price_usd,
        profit_amount_usd = EXCLUDED.profit_amount_usd,
        profit_margin_percent = EXCLUDED.profit_margin_percent,
        final_score = EXCLUDED.final_score,
        export_filter_pass = EXCLUDED.export_filter_pass,
        patent_filter_pass = EXCLUDED.patent_filter_pass,
        mall_filter_pass = EXCLUDED.mall_filter_pass,
        filter_issues = EXCLUDED.filter_issues,
        primary_image_url = EXCLUDED.primary_image_url,
        images = EXCLUDED.images,
        listing_data = EXCLUDED.listing_data,
        updated_at = NOW(),
        synced_at = NOW();
    
    GET DIAGNOSTICS sync_count = ROW_COUNT;
    RAISE NOTICE '  → mystical_japan_treasures_inventory: % 件を同期', sync_count;

    -- ============================================
    -- STEP 3: inventory_products から同期
    -- ============================================
    RAISE NOTICE 'STEP 3: inventory_products から同期中...';
    
    INSERT INTO products_master (
        source_system,
        source_id,
        sku,
        title,
        description,
        category,
        purchase_price_usd,
        primary_image_url,
        approval_status,
        workflow_status,
        created_at
    )
    SELECT 
        'inventory' as source_system,
        id::text as source_id,
        sku,
        COALESCE(product_name, name) as title,
        description,
        category,
        COALESCE(price_usd, price) as purchase_price_usd,
        image_url as primary_image_url,
        COALESCE(approval_status, 'pending') as approval_status,
        COALESCE(status, 'in_stock') as workflow_status,
        COALESCE(created_at, NOW()) as created_at
    FROM inventory_products
    ON CONFLICT (source_system, source_id) 
    DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        purchase_price_usd = EXCLUDED.purchase_price_usd,
        primary_image_url = EXCLUDED.primary_image_url,
        updated_at = NOW(),
        synced_at = NOW();
    
    GET DIAGNOSTICS sync_count = ROW_COUNT;
    RAISE NOTICE '  → inventory_products: % 件を同期', sync_count;

    -- ============================================
    -- STEP 4: 統計情報表示
    -- ============================================
    RAISE NOTICE '============================================';
    RAISE NOTICE '同期完了 - 統計情報:';
    
    -- 各ソースからの統合データ件数確認
    DECLARE
        rec RECORD;
    BEGIN
        FOR rec IN 
            SELECT 
                source_system,
                COUNT(*) as total_records,
                COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected
            FROM products_master
            GROUP BY source_system
            ORDER BY source_system
        LOOP
            RAISE NOTICE '  [%] 総数: %, 承認待ち: %, 承認済み: %, 否認: %', 
                rec.source_system, 
                rec.total_records, 
                rec.pending, 
                rec.approved, 
                rec.rejected;
        END LOOP;
    END;
    
    -- Gengar検索
    DECLARE
        gengar_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO gengar_count
        FROM products_master
        WHERE title ILIKE '%gengar%' OR title_en ILIKE '%gengar%';
        
        RAISE NOTICE '============================================';
        IF gengar_count > 0 THEN
            RAISE NOTICE 'Gengarを % 件発見しました！', gengar_count;
            
            -- Gengarの詳細を表示
            FOR rec IN 
                SELECT id, title_en, source_system, created_at
                FROM products_master
                WHERE title ILIKE '%gengar%' OR title_en ILIKE '%gengar%'
                ORDER BY created_at DESC
                LIMIT 5
            LOOP
                RAISE NOTICE '  - ID: %, Title: %, Source: %', 
                    rec.id, 
                    rec.title_en, 
                    rec.source_system;
            END LOOP;
        ELSE
            RAISE NOTICE 'Gengarは見つかりませんでした';
        END IF;
    END;
    
    RAISE NOTICE '============================================';
END $$;
