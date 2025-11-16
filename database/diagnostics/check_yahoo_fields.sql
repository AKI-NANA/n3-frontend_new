-- yahoo_scraped_products テーブルの構造とデータを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- 実際のデータサンプル確認
SELECT 
    id,
    title,
    english_title,
    price_usd,
    category_name,
    status,
    approval_status,
    current_stock,
    created_at
FROM yahoo_scraped_products 
LIMIT 5;

-- どのフィールドがNULLでないか確認
SELECT 
    COUNT(*) as total,
    COUNT(title) as has_title,
    COUNT(english_title) as has_english_title,
    COUNT(price_usd) as has_price_usd,
    COUNT(category_name) as has_category_name,
    COUNT(status) as has_status,
    COUNT(approval_status) as has_approval_status
FROM yahoo_scraped_products;
