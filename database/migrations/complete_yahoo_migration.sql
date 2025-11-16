-- yahoo_scraped_products から products_master への完全再移行
-- 既存のyahooデータを削除
DELETE FROM products_master WHERE source_system = 'yahoo_scraped_products';

-- フィールド名を推測して移行（エラーが出たら調整）
INSERT INTO products_master (
    source_system, 
    source_id, 
    sku,
    title, 
    title_en,
    description,
    current_price,
    cost_price,
    purchase_price_jpy,
    profit_amount,
    profit_margin,
    category,
    condition_name,
    workflow_status,
    approval_status,
    listing_status,
    listing_price,
    inventory_quantity,
    primary_image_url,
    gallery_images,
    length_cm,
    width_cm,
    height_cm,
    weight_g,
    created_at, 
    updated_at
)
SELECT 
    'yahoo_scraped_products' AS source_system,
    y.id::TEXT AS source_id,
    y.sku,
    y.title,
    COALESCE(y.english_title, y.title) AS title_en,
    y.description,
    COALESCE(y.price_usd, 0) AS current_price,
    0 AS cost_price,
    y.purchase_price AS purchase_price_jpy,
    COALESCE(y.price_usd, 0) AS profit_amount,
    100 AS profit_margin,
    COALESCE(y.category_name, 'Uncategorized') AS category,
    'Unknown' AS condition_name,
    COALESCE(y.status, 'scraped') AS workflow_status,
    COALESCE(y.approval_status, 'pending') AS approval_status,
    'not_listed' AS listing_status,
    COALESCE(y.price_usd, 0) AS listing_price,
    COALESCE(y.current_stock, 0) AS inventory_quantity,
    -- 画像フィールド（複数パターン対応）
    CASE 
        WHEN y.image_urls IS NOT NULL AND jsonb_array_length(y.image_urls) > 0 THEN y.image_urls->0
        WHEN y.primary_image IS NOT NULL THEN to_jsonb(y.primary_image)
        ELSE NULL
    END AS primary_image_url,
    COALESCE(y.image_urls, y.images, '[]'::jsonb) AS gallery_images,
    -- サイズ・重量
    y.length_cm,
    y.width_cm,
    y.height_cm,
    y.weight_g,
    y.created_at,
    COALESCE(y.updated_at, y.created_at)
FROM yahoo_scraped_products y;

-- 移行結果確認
SELECT 
    '移行完了' as status,
    COUNT(*) as total_records
FROM products_master
WHERE source_system = 'yahoo_scraped_products';

-- ゲンガーの詳細確認
SELECT 
    id,
    source_system,
    sku,
    title,
    title_en,
    current_price,
    primary_image_url,
    gallery_images,
    length_cm,
    width_cm,
    height_cm,
    weight_g,
    approval_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
  AND title LIKE '%ゲンガー%';
