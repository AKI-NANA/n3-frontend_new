-- ============================================================================
-- NAGANO-3 システム完全連携調査
-- ============================================================================
-- 目的: すべての既存機能が正しく連携しているか検証
-- ============================================================================

-- ============================================================================
-- PART 1: 全トリガーの状況確認
-- ============================================================================
SELECT 
    t.trigger_name,
    t.event_object_table,
    t.action_timing || ' ' || t.event_manipulation as trigger_event,
    CASE 
        WHEN t.action_statement LIKE '%EXECUTE FUNCTION%' 
        THEN regexp_replace(t.action_statement, '.*EXECUTE FUNCTION ([^(]+).*', '\1')
        ELSE 'INLINE'
    END as function_name,
    t.action_statement
FROM information_schema.triggers t
WHERE t.trigger_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;

-- ============================================================================
-- PART 2: 全関数の一覧と説明
-- ============================================================================
SELECT 
    r.routine_name,
    r.routine_type,
    pg_get_functiondef(p.oid) as full_definition,
    obj_description(p.oid) as comment
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE r.routine_schema = 'public'
    AND r.routine_type = 'FUNCTION'
ORDER BY r.routine_name;

-- ============================================================================
-- PART 3: 外部キー制約の完全一覧
-- ============================================================================
SELECT
    tc.constraint_name,
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- PART 4: インデックスの完全一覧
-- ============================================================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 5: テーブル間のデータ整合性チェック
-- ============================================================================

-- products_master と各ソーステーブルの整合性
SELECT 
    'yahoo_scraped_products' as source_table,
    (SELECT COUNT(*) FROM yahoo_scraped_products) as source_count,
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'yahoo') as master_count,
    (SELECT COUNT(*) FROM yahoo_scraped_products) - 
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'yahoo') as missing_in_master
UNION ALL
SELECT 
    'ebay_inventory',
    (SELECT COUNT(*) FROM ebay_inventory),
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'ebay'),
    (SELECT COUNT(*) FROM ebay_inventory) - 
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'ebay')
UNION ALL
SELECT 
    'inventory_master',
    (SELECT COUNT(*) FROM inventory_master),
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'inventory_master'),
    (SELECT COUNT(*) FROM inventory_master) - 
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'inventory_master')
UNION ALL
SELECT 
    'products',
    (SELECT COUNT(*) FROM products),
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'products'),
    (SELECT COUNT(*) FROM products) - 
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'products')
UNION ALL
SELECT 
    'research_products_master',
    (SELECT COUNT(*) FROM research_products_master),
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'research'),
    (SELECT COUNT(*) FROM research_products_master) - 
    (SELECT COUNT(*) FROM products_master WHERE source_system = 'research');

-- ============================================================================
-- PART 6: SKU整合性チェック
-- ============================================================================

-- products_master のSKU状況
SELECT 
    'products_master SKU状況' as check_name,
    COUNT(*) as total_records,
    COUNT(sku) as with_sku,
    COUNT(master_key) as with_master_key,
    COUNT(*) - COUNT(sku) as missing_sku,
    COUNT(*) - COUNT(master_key) as missing_master_key
FROM products_master;

-- listing_history のSKU状況
SELECT 
    'listing_history SKU状況' as check_name,
    COUNT(*) as total_records,
    COUNT(sku) as with_sku,
    COUNT(product_id) as with_product_id,
    COUNT(products_master_id) as with_products_master_id,
    COUNT(*) - COUNT(sku) as missing_sku
FROM listing_history;

-- SKUの重複チェック
SELECT 
    'SKU重複チェック' as check_name,
    sku,
    COUNT(*) as duplicate_count
FROM products_master
WHERE sku IS NOT NULL
GROUP BY sku
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- ============================================================================
-- PART 7: 重要カラムのNULL状況
-- ============================================================================

-- products_master の重要カラム
SELECT 
    'products_master' as table_name,
    COUNT(*) as total,
    COUNT(id) as has_id,
    COUNT(sku) as has_sku,
    COUNT(master_key) as has_master_key,
    COUNT(title) as has_title,
    COUNT(source_system) as has_source_system,
    COUNT(source_id) as has_source_id,
    COUNT(source_table) as has_source_table,
    COUNT(primary_image_url) as has_image,
    COUNT(category) as has_category
FROM products_master;

-- listing_history の重要カラム
SELECT 
    'listing_history' as table_name,
    COUNT(*) as total,
    COUNT(id) as has_id,
    COUNT(sku) as has_sku,
    COUNT(product_id) as has_product_id,
    COUNT(products_master_id) as has_products_master_id,
    COUNT(marketplace) as has_marketplace,
    COUNT(listing_id) as has_listing_id
FROM listing_history;

-- ============================================================================
-- PART 8: トリガーが実際に動作しているか確認
-- ============================================================================

-- 最近作成されたproducts_masterレコードのSKU状況
SELECT 
    'Recent products_master (last 10)' as check_name,
    id,
    sku,
    master_key,
    source_system,
    source_id,
    created_at
FROM products_master
ORDER BY created_at DESC
LIMIT 10;

-- 最近作成されたlisting_historyレコードのSKU状況
SELECT 
    'Recent listing_history (last 10)' as check_name,
    id,
    sku,
    product_id,
    products_master_id,
    marketplace,
    created_at
FROM listing_history
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 9: API/Frontend関連テーブルの状況
-- ============================================================================

-- product_html_generated の状況
SELECT 
    'product_html_generated' as table_name,
    COUNT(*) as total_records,
    COUNT(product_id) as with_product_id,
    COUNT(html_content) as with_html,
    COUNT(*) - COUNT(html_content) as missing_html
FROM product_html_generated;

-- sellermirror_analysis の状況
SELECT 
    'sellermirror_analysis' as table_name,
    COUNT(*) as total_records,
    COUNT(product_id) as with_product_id,
    COUNT(analysis_data) as with_analysis_data
FROM sellermirror_analysis;

-- ============================================================================
-- PART 10: データフロー検証
-- ============================================================================

-- yahoo_scraped_products → products_master → listing_history のフロー
SELECT 
    'Yahoo→Master→Listing フロー' as flow_check,
    y.id as yahoo_id,
    y.title as yahoo_title,
    pm.id as master_id,
    pm.sku as master_sku,
    lh.id as listing_id,
    lh.sku as listing_sku,
    CASE 
        WHEN pm.id IS NULL THEN '❌ Not in products_master'
        WHEN lh.id IS NULL THEN '⚠️ Not in listing_history'
        WHEN pm.sku != lh.sku THEN '❌ SKU mismatch'
        ELSE '✅ OK'
    END as status
FROM yahoo_scraped_products y
LEFT JOIN products_master pm ON pm.source_system = 'yahoo' AND pm.source_id = y.id::TEXT
LEFT JOIN listing_history lh ON lh.sku = pm.sku
LIMIT 20;

-- ============================================================================
-- PART 11: 未使用/孤立データの検出
-- ============================================================================

-- products_master にあるがソーステーブルにないレコード
SELECT 
    'Orphaned products_master records' as issue_type,
    pm.id,
    pm.sku,
    pm.source_system,
    pm.source_id,
    pm.title
FROM products_master pm
WHERE pm.source_system = 'yahoo'
    AND NOT EXISTS (
        SELECT 1 FROM yahoo_scraped_products y WHERE y.id::TEXT = pm.source_id
    )
LIMIT 10;

-- listing_history にあるが products_master にないSKU
SELECT 
    'Orphaned listing_history records' as issue_type,
    lh.id,
    lh.sku,
    lh.product_id,
    lh.marketplace
FROM listing_history lh
WHERE lh.sku IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM products_master pm WHERE pm.sku = lh.sku
    )
LIMIT 10;

-- ============================================================================
-- PART 12: パフォーマンスチェック
-- ============================================================================

-- テーブルサイズとレコード数
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_name = tablename AND t.table_schema = schemaname) as record_estimate
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'products_master',
        'listing_history',
        'yahoo_scraped_products',
        'ebay_inventory',
        'inventory_master',
        'products',
        'research_products_master'
    )
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- PART 13: システム設定の確認
-- ============================================================================

-- PostgreSQLバージョン
SELECT version();

-- 主要な設定値
SHOW max_connections;
SHOW shared_buffers;
SHOW work_mem;

-- ============================================================================
-- 完了メッセージ
-- ============================================================================
SELECT 
    '✅ Complete system integration audit finished' as status,
    NOW() as completed_at;
