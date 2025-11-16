-- ============================================================
-- テーブル存在確認とトリガー修正用SQL
-- Supabaseエディタで直接実行可能
-- ============================================================

-- 1. 現在存在するテーブルを確認
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('products', 'yahoo_scraped_products', 'inventory_products', 'products_master')
ORDER BY tablename;

-- 2. products_master テーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'products_master'
) as products_master_exists;

-- 3. inventory_products テーブルが存在するか確認
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'inventory_products'
) as inventory_products_exists;

-- 4. 各テーブルのレコード数を確認
SELECT 
    'products' as table_name, 
    COUNT(*) as record_count 
FROM products
UNION ALL
SELECT 
    'yahoo_scraped_products', 
    COUNT(*) 
FROM yahoo_scraped_products
UNION ALL
SELECT 
    'products_master', 
    COUNT(*) 
FROM products_master;
