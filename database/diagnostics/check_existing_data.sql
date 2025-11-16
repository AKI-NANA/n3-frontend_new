-- 既存の正しいデータを確認
SELECT 
    id,
    sku,
    title,
    price_jpy,
    jsonb_pretty(scraped_data) as scraped_data_formatted
FROM yahoo_scraped_products
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8)
LIMIT 3;
