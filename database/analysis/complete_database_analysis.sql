-- ============================================================================
-- NAGANO-3 データベース完全調査
-- ============================================================================
-- 目的: 全テーブルの構造、型、リレーション、データ整合性を調査
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
-- PART 2: 主要テーブルの詳細構造
-- ============================================================================

-- products_master テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- listing_history テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- yahoo_scraped_products テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- inventory_products テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'inventory_products'
ORDER BY ordinal_position;

-- mystical_japan_treasures_inventory テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mystical_japan_treasures_inventory'
ORDER BY ordinal_position;

-- ebay_inventory テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ebay_inventory'
ORDER BY ordinal_position;

-- research_products_master テーブル
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'research_products_master'
ORDER BY ordinal_position;

-- ============================================================================
-- PART 3: 型の不一致を検出
-- ============================================================================

-- idカラムの型をすべてのテーブルで確認
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'id'
    AND table_schema = 'public'
ORDER BY table_name;

-- skuカラムの型をすべてのテーブルで確認
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'sku'
    AND table_schema = 'public'
ORDER BY table_name;

-- product_id関連カラムの型を確認
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name LIKE '%product%id%'
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- ============================================================================
-- PART 4: データサンプリング（実際の値を確認）
-- ============================================================================

-- products_master のサンプル
SELECT 
    id,
    sku,
    source_system,
    source_id,
    source_table,
    title
FROM products_master
LIMIT 5;

-- listing_history のサンプル
SELECT 
    id,
    product_id,
    product_id_uuid,
    sku,
    marketplace,
    status
FROM listing_history
LIMIT 5;

-- yahoo_scraped_products のサンプル
SELECT 
    id,
    item_id,
    title,
    current_price
FROM yahoo_scraped_products
LIMIT 5;

-- inventory_products のサンプル
SELECT 
    id,
    sku,
    title,
    status
FROM inventory_products
LIMIT 5;

-- mystical_japan_treasures_inventory のサンプル
SELECT 
    id,
    sku,
    title,
    status
FROM mystical_japan_treasures_inventory
LIMIT 5;

-- ebay_inventory のサンプル
SELECT 
    id,
    sku,
    title,
    status
FROM ebay_inventory
LIMIT 5;

-- research_products_master のサンプル
SELECT 
    id,
    yahoo_auction_id,
    title,
    status
FROM research_products_master
LIMIT 5;

-- ============================================================================
-- PART 5: データ整合性チェック
-- ============================================================================

-- products_master のレコード数（source_table別）
SELECT 
    source_table,
    COUNT(*) as record_count,
    COUNT(DISTINCT sku) as unique_skus,
    COUNT(*) - COUNT(sku) as null_skus
FROM products_master
GROUP BY source_table
ORDER BY record_count DESC;

-- listing_history のレコード数
SELECT 
    marketplace,
    COUNT(*) as total_records,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as without_sku,
    COUNT(product_id) as with_product_id,
    COUNT(product_id_uuid) as with_product_id_uuid
FROM listing_history
GROUP BY marketplace
ORDER BY total_records DESC;

-- ============================================================================
-- PART 6: 外部キー制約の確認
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
-- PART 7: トリガーの確認
-- ============================================================================
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
