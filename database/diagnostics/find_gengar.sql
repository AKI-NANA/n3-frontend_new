-- ゲンガーのデータがどこにあるか探す

-- 1. yahoo_scraped_products にゲンガーがあるか
SELECT 
    'yahoo_scraped_products' as table_name,
    id,
    title,
    sku,
    price_usd,
    image_urls,
    image_count
FROM yahoo_scraped_products 
WHERE title LIKE '%ゲンガー%';

-- 2. products テーブルにゲンガーがあるか
SELECT 
    'products' as table_name,
    id,
    title,
    sku,
    price_usd,
    images
FROM products 
WHERE title LIKE '%ゲンガー%';

-- 3. すべてのテーブルのレコード数確認
SELECT 'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'yahoo_scraped_products', COUNT(*) FROM yahoo_scraped_products
UNION ALL
SELECT 'products_master', COUNT(*) FROM products_master;

-- 4. products_master の現在のデータ
SELECT 
    id,
    source_system,
    source_id,
    title,
    current_price,
    primary_image_url
FROM products_master
ORDER BY id;
