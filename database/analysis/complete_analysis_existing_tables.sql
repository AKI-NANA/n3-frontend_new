-- ============================================================================
-- NAGANO-3 データベース完全調査（存在確認済みテーブル版）
-- ============================================================================

-- ============================================================================
-- PART 1: 主要テーブルの全カラム構造
-- ============================================================================

-- products_master（存在確認済み）
SELECT 'products_master' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- listing_history
SELECT 'listing_history' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- ebay_inventory
SELECT 'ebay_inventory' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ebay_inventory'
ORDER BY ordinal_position;

-- products
SELECT 'products' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- listings
SELECT 'listings' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listings'
ORDER BY ordinal_position;

-- inventory_master
SELECT 'inventory_master' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_master'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 2: 重要カラムの型を横断確認
-- ============================================================================

-- idカラムの型（全テーブル）
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'id'
    AND table_schema = 'public'
    AND table_name IN (
        'products_master',
        'listing_history', 
        'ebay_inventory',
        'products',
        'listings',
        'inventory_master'
    )
ORDER BY table_name;

-- skuカラムの型（全テーブル）
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'sku'
    AND table_schema = 'public'
ORDER BY table_name;

-- product_id系カラムの型
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE (column_name LIKE '%product%id%' OR column_name LIKE '%product_id%')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- source_id系カラムの型
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name LIKE '%source%id%'
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- ============================================================================
-- PART 3: データサンプリング
-- ============================================================================

-- products_master
SELECT 
    id,
    sku,
    source_system,
    source_id,
    source_table,
    LEFT(COALESCE(title, ''), 50) as title_preview
FROM products_master
LIMIT 3;

-- listing_history
SELECT 
    id,
    product_id,
    product_id_uuid,
    sku,
    marketplace,
    status
FROM listing_history
LIMIT 3;

-- ebay_inventory
SELECT 
    id,
    sku,
    LEFT(COALESCE(title, ''), 50) as title_preview,
    status
FROM ebay_inventory
LIMIT 3;

-- products
SELECT *
FROM products
LIMIT 3;

-- listings
SELECT *
FROM listings
LIMIT 3;

-- inventory_master
SELECT *
FROM inventory_master
LIMIT 3;

-- ============================================================================
-- PART 4: レコード数とNULL値の状況
-- ============================================================================

-- 各テーブルのレコード数
SELECT 'products_master' as table_name, COUNT(*) as total_records FROM products_master
UNION ALL
SELECT 'listing_history', COUNT(*) FROM listing_history
UNION ALL
SELECT 'ebay_inventory', COUNT(*) FROM ebay_inventory
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'listings', COUNT(*) FROM listings
UNION ALL
SELECT 'inventory_master', COUNT(*) FROM inventory_master
ORDER BY total_records DESC;

-- products_masterのsource_table別集計
SELECT 
    COALESCE(source_table, 'NULL') as source_table,
    COUNT(*) as record_count,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as null_sku
FROM products_master
GROUP BY source_table
ORDER BY record_count DESC;

-- listing_historyの詳細集計
SELECT 
    COALESCE(marketplace, 'NULL') as marketplace,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(product_id) as with_product_id,
    COUNT(product_id_uuid) as with_product_id_uuid,
    COUNT(*) - COUNT(sku) as missing_sku
FROM listing_history
GROUP BY marketplace
ORDER BY total DESC;

-- ============================================================================
-- PART 5: リレーションシップ分析
-- ============================================================================

-- listing_history と products_master の結合テスト（INTEGER as TEXT to UUID）
SELECT 
    lh.id as lh_id,
    lh.product_id as lh_product_id_uuid,
    lh.sku as lh_sku,
    pm.id as pm_id_integer,
    pm.sku as pm_sku,
    CASE 
        WHEN pm.id IS NULL THEN 'NOT_FOUND'
        WHEN lh.sku = pm.sku THEN 'SKU_MATCH'
        ELSE 'SKU_MISMATCH'
    END as match_status
FROM listing_history lh
LEFT JOIN products_master pm ON lh.sku = pm.sku
LIMIT 10;

-- ============================================================================
-- PART 6: 外部キー制約
-- ============================================================================
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- PART 7: トリガー
-- ============================================================================
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing || ' ' || event_manipulation as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN (
        'products_master',
        'listing_history',
        'ebay_inventory',
        'products',
        'listings',
        'inventory_master'
    )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- PART 8: 型不一致の具体的な問題点
-- ============================================================================

-- listing_history.product_id (UUID) と products_master.id (INTEGER) の対応確認
SELECT 
    'TYPE_MISMATCH' as issue,
    'listing_history.product_id' as column1,
    'UUID' as type1,
    'products_master.id' as column2,
    'INTEGER' as type2,
    'Cannot join directly - requires SKU-based join' as solution;
