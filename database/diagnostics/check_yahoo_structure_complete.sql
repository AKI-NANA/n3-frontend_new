-- ============================================
-- yahoo_scraped_products の完全なカラム構造確認
-- ============================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- サンプルデータも1件取得して確認
SELECT * FROM yahoo_scraped_products LIMIT 1;
