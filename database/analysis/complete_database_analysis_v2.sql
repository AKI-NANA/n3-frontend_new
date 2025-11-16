-- ============================================================================
-- NAGANO-3 データベース完全調査（修正版）
-- ============================================================================

-- ============================================================================
-- PART 1: 全テーブル一覧
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- PART 2: 各テーブルの全カラム構造を確認
-- ============================================================================

-- products_master
SELECT 'products_master' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- listing_history
SELECT 'listing_history' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- yahoo_scraped_products
SELECT 'yahoo_scraped_products' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- inventory_products
SELECT 'inventory_products' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'inventory_products'
ORDER BY ordinal_position;

-- mystical_japan_treasures_inventory
SELECT 'mystical_japan_treasures_inventory' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'mystical_japan_treasures_inventory'
ORDER BY ordinal_position;

-- ebay_inventory
SELECT 'ebay_inventory' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ebay_inventory'
ORDER BY ordinal_position;

-- research_products_master
SELECT 'research_products_master' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'research_products_master'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 3: 重要カラムの型を横断確認
-- ============================================================================

-- idカラムの型
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'id'
    AND table_schema = 'public'
ORDER BY table_name;

-- skuカラムの型
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
WHERE column_name LIKE '%product%id%'
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
-- PART 4: データサンプリング（最初の3件ずつ）
-- ============================================================================

-- products_master
SELECT 
    id,
    sku,
    source_system,
    source_id,
    source_table,
    LEFT(title, 50) as title_preview
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

-- yahoo_scraped_products（最初の5カラムのみ）
SELECT *
FROM yahoo_scraped_products
LIMIT 3;

-- inventory_products（最初の5カラムのみ）
SELECT *
FROM inventory_products
LIMIT 3;

-- mystical_japan_treasures_inventory（最初の5カラムのみ）
SELECT *
FROM mystical_japan_treasures_inventory
LIMIT 3;

-- ebay_inventory（最初の5カラムのみ）
SELECT *
FROM ebay_inventory
LIMIT 3;

-- research_products_master（最初の5カラムのみ）
SELECT *
FROM research_products_master
LIMIT 3;

-- ============================================================================
-- PART 5: レコード数とNULL値の状況
-- ============================================================================

-- 各テーブルのレコード数
SELECT 'products_master' as table_name, COUNT(*) as total_records FROM products_master
UNION ALL
SELECT 'listing_history', COUNT(*) FROM listing_history
UNION ALL
SELECT 'yahoo_scraped_products', COUNT(*) FROM yahoo_scraped_products
UNION ALL
SELECT 'inventory_products', COUNT(*) FROM inventory_products
UNION ALL
SELECT 'mystical_japan_treasures_inventory', COUNT(*) FROM mystical_japan_treasures_inventory
UNION ALL
SELECT 'ebay_inventory', COUNT(*) FROM ebay_inventory
UNION ALL
SELECT 'research_products_master', COUNT(*) FROM research_products_master
ORDER BY total_records DESC;

-- products_masterのsource_table別レコード数
SELECT 
    COALESCE(source_table, 'NULL') as source_table,
    COUNT(*) as record_count,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as null_sku
FROM products_master
GROUP BY source_table
ORDER BY record_count DESC;

-- listing_historyのデータ状況
SELECT 
    COALESCE(marketplace, 'NULL') as marketplace,
    COUNT(*) as total,
    COUNT(sku) as with_sku,
    COUNT(product_id) as with_product_id,
    COUNT(product_id_uuid) as with_product_id_uuid
FROM listing_history
GROUP BY marketplace
ORDER BY total DESC;

-- ============================================================================
-- PART 6: 外部キー制約
-- ============================================================================
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
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
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
