-- yahoo_scraped_products の全カラム名を取得（シンプル版）
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;
