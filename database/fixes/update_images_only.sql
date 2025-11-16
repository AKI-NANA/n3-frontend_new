-- 画像フィールドだけ追加で更新
UPDATE products_master pm
SET 
    primary_image_url = y.image_url,
    gallery_images = COALESCE(y.images, y.gallery_images, '[]'::jsonb)
FROM yahoo_scraped_products y
WHERE pm.source_system = 'yahoo_scraped_products' 
  AND pm.source_id = y.id::TEXT;

-- 更新結果確認
SELECT 
    id,
    title,
    primary_image_url,
    gallery_images
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
  AND title LIKE '%ゲンガー%';
