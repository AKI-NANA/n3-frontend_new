-- データ状況確認クエリ
-- 各テーブルのレコード数を確認
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'yahoo_scraped_products', COUNT(*) FROM yahoo_scraped_products
UNION ALL
SELECT 'products_master', COUNT(*) FROM products_master;

-- products_master のサンプルデータ確認
SELECT id, source_system, source_id, title, title_en, created_at
FROM products_master 
LIMIT 5;
