-- yahoo_scraped_products テーブルの構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;
