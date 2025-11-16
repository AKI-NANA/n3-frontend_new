-- ============================================================================
-- 簡易スキーマ確認（エラー回避版）
-- ============================================================================

-- products_master の全カラム
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- listing_history の全カラム  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- products の全カラム
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 全トリガーの一覧
SELECT 
    trigger_name,
    event_object_table,
    action_timing || ' ' || event_manipulation as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 全関数の一覧（SKU関連のみ）
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND (routine_name LIKE '%sku%' OR routine_name LIKE '%key%' OR routine_name LIKE '%generate%')
ORDER BY routine_name;

-- データ整合性（簡易版）
SELECT 
    source_system,
    source_table,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as missing_sku
FROM products_master
GROUP BY source_system, source_table;

-- listing_history のSKU状況
SELECT 
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(product_id) as with_product_id,
    COUNT(*) - COUNT(sku) as missing_sku
FROM listing_history;

-- 最近のデータサンプル
SELECT 
    id,
    sku,
    source_system,
    source_id,
    LEFT(title, 40) as title,
    created_at
FROM products_master
ORDER BY created_at DESC
LIMIT 5;
