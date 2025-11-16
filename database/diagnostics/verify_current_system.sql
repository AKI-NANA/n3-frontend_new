-- ============================================
-- 現在のシステム状態確認
-- ============================================

-- 1. 全トリガーの状態確認
SELECT 
    '⚡ トリガー設定状況' as status,
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

-- 2. products_master のデータ確認
SELECT 
    '📊 products_master データ状況' as status,
    source_system,
    COUNT(*) as count,
    COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected
FROM products_master
GROUP BY source_system
ORDER BY count DESC;

-- 3. 同期関数の確認
SELECT 
    '🔧 同期関数' as status,
    routine_name as function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%sync%' OR routine_name LIKE '%products_master%')
ORDER BY routine_name;

-- 4. 総合サマリー
SELECT 
    '✅ システム状態' as status,
    (SELECT COUNT(*) FROM products_master) as total_products,
    (SELECT COUNT(*) FROM information_schema.triggers 
     WHERE trigger_schema = 'public' 
     AND event_object_table IN ('yahoo_scraped_products', 'inventory_master', 'ebay_inventory', 'research_products_master')) as active_triggers,
    (SELECT COUNT(*) FROM information_schema.routines 
     WHERE routine_schema = 'public' 
     AND routine_name LIKE '%sync%') as sync_functions;

-- 5. リアルタイム同期テスト準備
SELECT 
    '🧪 テスト準備完了' as status,
    '各テーブルにINSERT/UPDATE/DELETEを実行して同期を確認できます' as next_step;
