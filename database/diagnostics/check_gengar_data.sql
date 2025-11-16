-- ゲンガーのデータを詳細確認
SELECT * 
FROM yahoo_scraped_products 
WHERE title LIKE '%ゲンガー%'
LIMIT 1;

-- products_masterに移行されたゲンガーのデータ
SELECT *
FROM products_master
WHERE title LIKE '%ゲンガー%';

-- yahoo_scraped_productsのすべてのカラムとデータ型を確認
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- 画像があるレコードを確認
SELECT 
    id,
    title,
    image_url,
    images,
    gallery_images,
    primary_image_url
FROM yahoo_scraped_products
WHERE title LIKE '%ゲンガー%'
LIMIT 1;
