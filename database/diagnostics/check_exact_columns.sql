-- yahoo_scraped_products の実際のカラム名を確認
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'yahoo_scraped_products'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 実際のデータサンプルを見る（すべてのカラム）
SELECT * FROM yahoo_scraped_products LIMIT 1;
