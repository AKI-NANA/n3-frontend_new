-- ============================================
-- システム完全診断
-- ============================================

-- 1. トリガー設置状況の詳細確認
SELECT 
    '⚡ トリガー詳細' as check_type,
    event_object_table as table_name,
    trigger_name,
    event_manipulation as event_type,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN (
    'yahoo_scraped_products',
    'inventory_master',
    'ebay_inventory',
    'research_products_master'
)
ORDER BY event_object_table, event_manipulation;

-- 2. 各ソーステーブルのレコード数
SELECT 
    '📊 ソーステーブル' as check_type,
    'yahoo_scraped_products' as table_name,
    COUNT(*) as records
FROM yahoo_scraped_products
UNION ALL
SELECT 
    '📊 ソーステーブル',
    'inventory_master',
    COUNT(*)
FROM inventory_master
UNION ALL
SELECT 
    '📊 ソーステーブル',
    'ebay_inventory',
    COUNT(*)
FROM ebay_inventory
UNION ALL
SELECT 
    '📊 ソーステーブル',
    'research_products_master',
    COUNT(*)
FROM research_products_master;

-- 3. products_master の統合状況
SELECT 
    '🔄 統合マスター' as check_type,
    COALESCE(source_system, 'NULL') as source_system,
    COUNT(*) as records
FROM products_master
GROUP BY source_system
ORDER BY records DESC;

-- 4. システム診断結果
SELECT 
    '✅ 診断結果' as result_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers 
              WHERE event_object_table = 'yahoo_scraped_products') >= 1 
        THEN '✅ Yahoo同期: 有効'
        ELSE '❌ Yahoo同期: 無効'
    END as yahoo_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers 
              WHERE event_object_table = 'inventory_master') >= 1 
        THEN '✅ Inventory同期: 有効'
        ELSE '❌ Inventory同期: 無効'
    END as inventory_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers 
              WHERE event_object_table = 'ebay_inventory') >= 1 
        THEN '✅ eBay同期: 有効'
        ELSE '❌ eBay同期: 無効'
    END as ebay_status,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers 
              WHERE event_object_table = 'research_products_master') >= 1 
        THEN '✅ Research同期: 有効'
        ELSE '❌ Research同期: 無効'
    END as research_status;
