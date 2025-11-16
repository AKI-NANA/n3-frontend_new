-- yahoo_scraped_products の正しいフィールド名で確認

-- 1. すべてのカラム名を取得
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- 2. ゲンガーのデータをすべて確認
SELECT *
FROM yahoo_scraped_products
WHERE title LIKE '%ゲンガー%'
LIMIT 1;

-- 3. 重要なフィールドの存在確認（修正版）
SELECT 
    COUNT(*) as total,
    COUNT(sku) as has_sku,
    COUNT(image_urls) as has_image_urls,
    COUNT(images) as has_images,
    COUNT(primary_image) as has_primary_image,
    COUNT(purchase_price) as has_purchase_price,
    COUNT(dimensions) as has_dimensions,
    COUNT(weight) as has_weight
FROM yahoo_scraped_products;
