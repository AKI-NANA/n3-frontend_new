-- ============================================================================
-- テーブル構造の完全確認
-- ============================================================================

-- listing_historyのすべてのカラムと型を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- products_masterのすべてのカラムと型を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'products_master'
ORDER BY ordinal_position;

-- listing_historyの実際のデータを確認
SELECT * FROM listing_history LIMIT 5;

-- products_masterの実際のデータを確認
SELECT id, sku, title FROM products_master LIMIT 5;
