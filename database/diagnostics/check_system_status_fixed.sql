-- ============================================
-- 全テーブルの存在確認とレコード数（修正版）
-- ============================================

-- 1. 全テーブルのリスト
SELECT 
    '📋 全テーブル一覧' as status,
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name IN (
    'products_master',
    'yahoo_scraped_products',
    'inventory_master',
    'ebay_inventory',
    'research_products_master'
)
ORDER BY table_name;

-- 2. 各テーブルのレコード数
SELECT '📊 レコード数確認' as status, '=' as separator;

SELECT 'products_master' as table_name, COUNT(*) as record_count
FROM products_master
UNION ALL
SELECT 'yahoo_scraped_products', COUNT(*)
FROM yahoo_scraped_products
UNION ALL
SELECT 'inventory_master', COUNT(*)
FROM inventory_master
UNION ALL
SELECT 'ebay_inventory', COUNT(*)
FROM ebay_inventory
UNION ALL
SELECT 'research_products_master', COUNT(*)
FROM research_products_master
ORDER BY table_name;

-- 3. products_master のソース別集計
SELECT 
    '🔄 products_master ソース別' as status,
    source_system,
    COUNT(*) as count
FROM products_master
GROUP BY source_system
ORDER BY count DESC;

-- 4. トリガー設置状況確認
SELECT 
    '⚡ トリガー設置状況' as status,
    event_object_table as table_name,
    trigger_name,
    string_agg(DISTINCT event_manipulation, ', ' ORDER BY event_manipulation) as events
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'yahoo_scraped_products',
    'inventory_master',
    'ebay_inventory',
    'research_products_master'
)
GROUP BY event_object_table, trigger_name
ORDER BY event_object_table;

-- 5. products_master の最新更新確認
SELECT 
    '🕐 最新更新時刻' as status,
    source_system,
    MAX(updated_at) as last_update,
    COUNT(*) as total_records
FROM products_master
GROUP BY source_system
ORDER BY last_update DESC NULLS LAST;

-- 6. 同期関数の確認
SELECT 
    '🔧 同期関数一覧' as status,
    routine_name as function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%sync%'
ORDER BY routine_name;
