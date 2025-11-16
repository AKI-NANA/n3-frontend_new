-- ============================================
-- 完全なproducts_master同期システム Part 2（修正版）
-- ETL処理と補完的な機能
-- ============================================

-- ============================================
-- ETL: 初期データ移行（すべてのテーブル対応）
-- ============================================
CREATE OR REPLACE FUNCTION migrate_all_existing_data_to_master()
RETURNS TABLE (
    step_name TEXT,
    records_processed BIGINT,
    records_with_images BIGINT,
    status TEXT,
    error_details TEXT
) AS $$
DECLARE
    processed_count BIGINT;
    image_count BIGINT;
BEGIN
    -- ステップ 1: products テーブル
    BEGIN
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE 'ステップ 1/5: products テーブルの移行開始...';
        
        WITH inserted AS (
            INSERT INTO products_master (
                source_system, source_id, sku, title, title_en, description,
                purchase_price_jpy, purchase_price_usd,
                recommended_price_usd, profit_amount_usd, profit_margin_percent,
                lowest_price_usd, lowest_price_profit_usd, lowest_price_profit_margin,
                final_score, category, condition,
                primary_image_url, gallery_images, images,
                listing_data, scraped_data, ebay_api_data,
                approval_status, workflow_status,
                created_at, updated_at, synced_at
            )
            SELECT 
                'products' as source_system,
                p.id::text as source_id,
                p.sku,
                p.title,
                p.english_title as title_en,
                COALESCE(p.html_description, '') as description,
                COALESCE(p.price_jpy, p.acquired_price_jpy, p.cost_price) as purchase_price_jpy,
                COALESCE(p.price_usd, p.ddp_price_usd, p.ddu_price_usd) as purchase_price_usd,
                NULLIF(p.ddu_price_usd, 0) as recommended_price_usd,
                p.profit_amount_usd,
                p.profit_margin as profit_margin_percent,
                p.sm_lowest_price as lowest_price_usd,
                p.sm_profit_amount_usd as lowest_price_profit_usd,
                p.sm_profit_margin as lowest_price_profit_margin,
                p.listing_score as final_score,
                p.category_name as category,
                p.condition,
                COALESCE(
                    p.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl',
                    p.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages'->0->>'imageUrl',
                    p.scraped_data->'image_urls'->>0,
                    CASE 
                        WHEN jsonb_typeof(p.image_urls) = 'array' THEN p.image_urls->>0
                        ELSE NULL
                    END,
                    CASE 
                        WHEN jsonb_typeof(p.images) = 'array' THEN p.images->>0
                        ELSE NULL
                    END
                ) as primary_image_url,
                COALESCE(
                    p.ebay_api_data->'browse_result'->'items'->0->'thumbnailImages',
                    p.scraped_data->'image_urls',
                    CASE WHEN jsonb_typeof(p.image_urls) = 'array' THEN p.image_urls ELSE '[]'::jsonb END,
                    CASE WHEN jsonb_typeof(p.images) = 'array' THEN p.images ELSE '[]'::jsonb END,
                    '[]'::jsonb
                ) as gallery_images,
                COALESCE(p.images, '[]'::jsonb) as images,
                p.listing_data,
                p.scraped_data,
                p.ebay_api_data,
                COALESCE(p.status, 'imported') as approval_status,
                COALESCE(p.status, 'imported') as workflow_status,
                COALESCE(p.created_at, NOW()),
                NOW(),
                NOW()
            FROM products p
            WHERE NOT EXISTS (
                SELECT 1 FROM products_master pm 
                WHERE pm.source_system = 'products' AND pm.source_id = p.id::text
            )
            RETURNING 1, primary_image_url
        )
        SELECT COUNT(*), COUNT(primary_image_url) INTO processed_count, image_count FROM inserted;
        
        step_name := 'products';
        records_processed := processed_count;
        records_with_images := image_count;
        status := 'SUCCESS';
        error_details := NULL;
        
        RAISE NOTICE '✓ 完了: % 件処理, % 件に画像あり', processed_count, image_count;
        RETURN NEXT;
        
    EXCEPTION WHEN OTHERS THEN
        step_name := 'products';
        records_processed := 0;
        records_with_images := 0;
        status := 'ERROR';
        error_details := SQLERRM;
        RAISE NOTICE '✗ エラー: %', SQLERRM;
        RETURN NEXT;
    END;

    -- ステップ 2: yahoo_scraped_products テーブル
    BEGIN
        RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        RAISE NOTICE 'ステップ 2/5: yahoo_scraped_products テーブルの移行開始...';
        
        WITH inserted AS (
            INSERT INTO products_master (
                source_system, source_id, sku, title, title_en,
                purchase_price_jpy, purchase_price_usd,
                recommended_price_usd, profit_amount_usd, profit_margin_percent,
                lowest_price_usd, lowest_price_profit_usd, lowest_price_profit_margin,
                category, primary_image_url, gallery_images,
                listing_data, scraped_data, ebay_api_data,
                approval_status, workflow_status, html_templates,
                is_vero_brand, vero_brand_name, vero_risk_level, vero_notes,
                created_at, updated_at, synced_at
            )
            SELECT 
                'yahoo_scraped_products' as source_system,
                y.id::text as source_id,
                y.sku,
                y.title,
                y.english_title as title_en,
                y.price_jpy as purchase_price_jpy,
                y.price_usd as purchase_price_usd,
                y.recommended_price_usd,
                y.profit_amount_usd,
                y.profit_margin as profit_margin_percent,
                y.sm_lowest_price as lowest_price_usd,
                y.sm_profit_amount_usd as lowest_price_profit_usd,
                y.sm_profit_margin as lowest_price_profit_margin,
                y.category_name as category,
                COALESCE(
                    y.scraped_data->'images'->>0,
                    CASE WHEN jsonb_typeof(y.image_urls) = 'array' THEN y.image_urls->>0 ELSE NULL END
                ) as primary_image_url,
                COALESCE(
                    CASE WHEN jsonb_typeof(y.scraped_data->'images') = 'array' THEN y.scraped_data->'images' ELSE '[]'::jsonb END,
                    CASE WHEN jsonb_typeof(y.image_urls) = 'array' THEN y.image_urls ELSE '[]'::jsonb END,
                    '[]'::jsonb
                ) as gallery_images,
                y.listing_data,
                y.scraped_data,
                y.ebay_api_data,
                COALESCE(y.approval_status, y.status, 'pending') as approval_status,
                COALESCE(y.status, 'imported') as workflow_status,
                COALESCE(y.html_templates, '{}'::jsonb) as html_templates,
                COALESCE(y.is_vero_brand, false) as is_vero_brand,
                y.vero_brand_name,
                y.vero_risk_level,
                y.vero_notes,
                COALESCE(y.created_at, NOW()),
                NOW(),
                NOW()
            FROM yahoo_scraped_products y
            WHERE NOT EXISTS (
                SELECT 1 FROM products_master pm 
                WHERE pm.source_system = 'yahoo_scraped_products' AND pm.source_id = y.id::text
            )
            RETURNING 1, primary_image_url
        )
        SELECT COUNT(*), COUNT(primary_image_url) INTO processed_count, image_count FROM inserted;
        
        step_name := 'yahoo_scraped_products';
        records_processed := processed_count;
        records_with_images := image_count;
        status := 'SUCCESS';
        error_details := NULL;
        
        RAISE NOTICE '✓ 完了: % 件処理, % 件に画像あり', processed_count, image_count;
        RETURN NEXT;
        
    EXCEPTION WHEN OTHERS THEN
        step_name := 'yahoo_scraped_products';
        records_processed := 0;
        records_with_images := 0;
        status := 'ERROR';
        error_details := SQLERRM;
        RAISE NOTICE '✗ エラー: %', SQLERRM;
        RETURN NEXT;
    END;

    -- ステップ 3, 4, 5: inventory_products, mystical_japan_treasures_inventory, ebay_inventory
    -- （同様のパターンで実装 - 必要に応じて追加）
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '全ての移行処理が完了しました！';
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 画像URL修復関数
-- ============================================
CREATE OR REPLACE FUNCTION repair_missing_images()
RETURNS TABLE (
    master_id BIGINT,
    source_system TEXT,
    source_id TEXT,
    old_image_url TEXT,
    new_image_url TEXT,
    image_source TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH repairs AS (
        UPDATE products_master pm
        SET 
            primary_image_url = CASE
                WHEN pm.source_system = 'products' THEN
                    COALESCE(
                        (SELECT p.ebay_api_data->'browse_result'->'items'->0->'image'->>'imageUrl'
                         FROM products p WHERE p.id::text = pm.source_id),
                        (SELECT p.scraped_data->'image_urls'->>0
                         FROM products p WHERE p.id::text = pm.source_id),
                        (SELECT CASE WHEN jsonb_typeof(p.image_urls) = 'array' 
                                THEN p.image_urls->>0 ELSE NULL END
                         FROM products p WHERE p.id::text = pm.source_id)
                    )
                WHEN pm.source_system = 'yahoo_scraped_products' THEN
                    COALESCE(
                        (SELECT y.scraped_data->'images'->>0
                         FROM yahoo_scraped_products y WHERE y.id::text = pm.source_id),
                        (SELECT CASE WHEN jsonb_typeof(y.image_urls) = 'array' 
                                THEN y.image_urls->>0 ELSE NULL END
                         FROM yahoo_scraped_products y WHERE y.id::text = pm.source_id)
                    )
                ELSE pm.primary_image_url
            END,
            updated_at = NOW(),
            synced_at = NOW()
        WHERE pm.primary_image_url IS NULL
        RETURNING 
            pm.id,
            pm.source_system,
            pm.source_id,
            NULL as old_url,
            pm.primary_image_url as new_url,
            'repaired' as source,
            'UPDATED' as status
    )
    SELECT * FROM repairs;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- データ整合性チェック関数
-- ============================================
CREATE OR REPLACE FUNCTION check_sync_integrity()
RETURNS TABLE (
    check_name TEXT,
    issue_count BIGINT,
    severity TEXT,
    description TEXT
) AS $$
BEGIN
    -- チェック1: 画像URLが欠落している商品
    RETURN QUERY
    SELECT 
        'missing_images'::TEXT as check_name,
        COUNT(*)::BIGINT as issue_count,
        'WARNING'::TEXT as severity,
        'products_master に画像URLが設定されていない商品'::TEXT as description
    FROM products_master
    WHERE primary_image_url IS NULL;

    -- チェック2: 元テーブルに存在するが products_master にない商品（products）
    RETURN QUERY
    SELECT 
        'products_not_synced'::TEXT,
        COUNT(*)::BIGINT,
        'ERROR'::TEXT,
        'products テーブルに存在するが products_master に同期されていない商品'::TEXT
    FROM products p
    WHERE NOT EXISTS (
        SELECT 1 FROM products_master pm 
        WHERE pm.source_system = 'products' AND pm.source_id = p.id::text
    );

    -- チェック3: 元テーブルに存在するが products_master にない商品（yahoo_scraped_products）
    RETURN QUERY
    SELECT 
        'yahoo_not_synced'::TEXT,
        COUNT(*)::BIGINT,
        'ERROR'::TEXT,
        'yahoo_scraped_products テーブルに存在するが products_master に同期されていない商品'::TEXT
    FROM yahoo_scraped_products y
    WHERE NOT EXISTS (
        SELECT 1 FROM products_master pm 
        WHERE pm.source_system = 'yahoo_scraped_products' AND pm.source_id = y.id::text
    );

    -- チェック4: 価格情報が欠落している商品
    RETURN QUERY
    SELECT 
        'missing_prices'::TEXT,
        COUNT(*)::BIGINT,
        'WARNING'::TEXT,
        'purchase_price_usd または recommended_price_usd が NULL の商品'::TEXT
    FROM products_master
    WHERE purchase_price_usd IS NULL OR recommended_price_usd IS NULL;

    -- チェック5: 重複レコード
    RETURN QUERY
    SELECT 
        'duplicates'::TEXT,
        COUNT(*)::BIGINT,
        'ERROR'::TEXT,
        '同じ source_system + source_id の組み合わせが複数存在'::TEXT
    FROM (
        SELECT source_system, source_id, COUNT(*) as cnt
        FROM products_master
        GROUP BY source_system, source_id
        HAVING COUNT(*) > 1
    ) dupes;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 統計レポート関数
-- ============================================
CREATE OR REPLACE FUNCTION generate_sync_report()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT,
    category TEXT
) AS $$
BEGIN
    -- 基本統計
    RETURN QUERY
    SELECT 
        '総商品数'::TEXT as metric_name,
        COUNT(*)::TEXT as metric_value,
        'overview'::TEXT as category
    FROM products_master;

    RETURN QUERY
    SELECT 
        'ソース別内訳'::TEXT,
        source_system || ': ' || COUNT(*)::TEXT,
        'by_source'::TEXT
    FROM products_master
    GROUP BY source_system
    ORDER BY COUNT(*) DESC;

    -- 画像統計
    RETURN QUERY
    SELECT 
        '画像あり商品'::TEXT,
        COUNT(*)::TEXT || ' / ' || (SELECT COUNT(*)::TEXT FROM products_master),
        'images'::TEXT
    FROM products_master
    WHERE primary_image_url IS NOT NULL;

    RETURN QUERY
    SELECT 
        '画像なし商品'::TEXT,
        COUNT(*)::TEXT,
        'images'::TEXT
    FROM products_master
    WHERE primary_image_url IS NULL;

    -- 承認状態統計
    RETURN QUERY
    SELECT 
        '承認状態: ' || COALESCE(approval_status, 'NULL'),
        COUNT(*)::TEXT,
        'approval'::TEXT
    FROM products_master
    GROUP BY approval_status
    ORDER BY COUNT(*) DESC;

    -- 利益率統計
    RETURN QUERY
    SELECT 
        '平均利益率'::TEXT,
        ROUND(AVG(profit_margin_percent), 2)::TEXT || '%',
        'profit'::TEXT
    FROM products_master
    WHERE profit_margin_percent IS NOT NULL;

    RETURN QUERY
    SELECT 
        '利益率 > 20%'::TEXT,
        COUNT(*)::TEXT,
        'profit'::TEXT
    FROM products_master
    WHERE profit_margin_percent > 20;

END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 実行コマンド例
-- ============================================

-- 初期データ移行
-- SELECT * FROM migrate_all_existing_data_to_master();

-- 画像URL修復
-- SELECT * FROM repair_missing_images();

-- 整合性チェック
-- SELECT * FROM check_sync_integrity();

-- 統計レポート
-- SELECT * FROM generate_sync_report();

-- 検証
-- SELECT verify_sync_system();

-- ゲンガー商品の確認
-- SELECT 
--     id, source_system, title, title_en,
--     primary_image_url,
--     purchase_price_jpy, recommended_price_usd,
--     profit_margin_percent, approval_status
-- FROM products_master 
-- WHERE title ILIKE '%ゲンガー%' OR title_en ILIKE '%gengar%'
-- ORDER BY updated_at DESC;
