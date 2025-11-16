-- yahoo_scraped_products の完全なフィールドマッピング確認

-- 1. すべてのカラム名を取得
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'yahoo_scraped_products'
ORDER BY ordinal_position;

-- 2. ゲンガーのデータをJSON形式で確認
SELECT row_to_json(y.*)
FROM yahoo_scraped_products y
WHERE title LIKE '%ゲンガー%'
LIMIT 1;

-- 3. 重要なフィールドの存在確認
SELECT 
    COUNT(*) as total,
    COUNT(sku) as has_sku,
    COUNT(image_url) as has_image_url,
    COUNT(images) as has_images,
    COUNT(gallery_images) as has_gallery_images,
    COUNT(primary_image_url) as has_primary_image_url,
    COUNT(purchase_price_jpy) as has_purchase_price_jpy,
    COUNT(length_cm) as has_length_cm,
    COUNT(width_cm) as has_width_cm,
    COUNT(height_cm) as has_height_cm,
    COUNT(weight_g) as has_weight_g
FROM yahoo_scraped_products;
