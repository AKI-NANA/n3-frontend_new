-- ============================================================
-- スクレイピングシステムのデータフロー確認
-- ============================================================

-- 1. yahoo_scraped_products のデータ構造確認
SELECT 
    id,
    sku,
    title,
    english_title,
    price_jpy,
    price_usd,
    status,
    -- スクレイピングデータ
    scraped_data->>'scraped_at' as scraped_at,
    scraped_data->'image_urls' as scraped_images,
    -- eBay API データ
    ebay_api_data->>'title' as ebay_title,
    ebay_api_data->>'category_id' as ebay_category,
    -- リスティングデータ
    listing_data->>'condition' as condition,
    listing_data->>'ddp_price_usd' as ddp_price,
    listing_data->>'html_description' as html_desc,
    -- フィルター状態
    export_filter_status,
    patent_filter_status,
    mall_filter_status,
    approval_status,
    -- SellerMirror データ
    sm_lowest_price,
    sm_competitor_count,
    -- 画像
    image_count,
    image_urls
FROM yahoo_scraped_products
WHERE title LIKE '%ゲンガー%';

-- 2. products_master への同期状態確認
SELECT 
    pm.id,
    pm.source_system,
    pm.sku,
    pm.title,
    pm.title_en,
    pm.current_price,
    pm.profit_amount,
    pm.category,
    pm.approval_status,
    pm.primary_image_url,
    pm.image_count,
    pm.gallery_images
FROM products_master pm
WHERE pm.title LIKE '%ゲンガー%';

-- 3. データフロー：yahoo_scraped_products → products_master
-- どのフィールドがマッピングされているか
SELECT 
    'yahoo_scraped_products' as source_table,
    COUNT(*) as total_records,
    COUNT(sku) as has_sku,
    COUNT(scraped_data->'image_urls') as has_scraped_images,
    COUNT(image_urls) as has_image_urls,
    COUNT(ebay_api_data) as has_ebay_data,
    COUNT(listing_data) as has_listing_data,
    COUNT(sm_data) as has_sm_data
FROM yahoo_scraped_products;

-- 4. products_master の充填率
SELECT 
    'products_master' as target_table,
    COUNT(*) as total_records,
    COUNT(sku) as has_sku,
    COUNT(primary_image_url) as has_primary_image,
    COUNT(gallery_images) as has_gallery_images,
    COUNT(profit_amount) as has_profit_amount,
    COUNT(category) as has_category,
    COUNT(title_en) as has_english_title
FROM products_master
WHERE source_system = 'yahoo_scraped_products';
