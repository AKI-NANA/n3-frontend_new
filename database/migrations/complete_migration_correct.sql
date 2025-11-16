-- ============================================================
-- yahoo_scraped_products から products_master への完全移行
-- 実際のカラム名に基づいた正確なマッピング
-- ============================================================

-- 既存のyahooデータを削除
DELETE FROM products_master WHERE source_system = 'yahoo_scraped_products';

-- 完全なフィールドマッピングで移行
INSERT INTO products_master (
    source_system, 
    source_id, 
    sku,
    title, 
    title_en,
    -- 価格・利益
    purchase_price_jpy,
    purchase_price_usd,
    current_price,
    cost_price,
    profit_amount,
    profit_margin,
    recommended_price_usd,
    lowest_price_usd,
    profit_amount_usd,
    profit_margin_percent,
    lowest_price_profit_usd,
    lowest_price_profit_margin,
    -- カテゴリ
    category,
    category_id,
    ebay_category_id,
    category_path,
    -- ステータス
    workflow_status,
    approval_status,
    listing_status,
    listing_price,
    inventory_quantity,
    -- フィルター結果
    export_filter_pass,
    patent_filter_pass,
    mall_filter_pass,
    -- VERO
    vero_brand,
    vero_risk_level,
    -- 競合情報
    japanese_seller_count,
    -- SellerMirror
    sm_lowest_price,
    sm_average_price,
    sm_competitor_count,
    sm_data,
    -- 画像
    image_count,
    primary_image_url,
    gallery_images,
    -- 配送
    shipping_cost_usd,
    -- その他
    approved_at,
    approved_by,
    rejection_reason,
    ai_confidence_score,
    ai_recommendation,
    selected_marketplace,
    -- メタデータ
    created_at, 
    updated_at
)
SELECT 
    'yahoo_scraped_products' AS source_system,
    y.id::TEXT AS source_id,
    y.sku,
    y.title,
    COALESCE(y.english_title, y.title) AS title_en,
    -- 価格・利益
    y.price_jpy AS purchase_price_jpy,
    y.price_usd AS purchase_price_usd,
    COALESCE(y.price_usd, 0) AS current_price,
    0 AS cost_price,
    y.profit_amount_usd AS profit_amount,
    y.profit_margin AS profit_margin,
    y.recommended_price_usd,
    y.competitors_lowest_price AS lowest_price_usd,
    y.profit_amount_usd,
    y.profit_margin AS profit_margin_percent,
    y.sm_profit_amount_usd AS lowest_price_profit_usd,
    y.sm_profit_margin AS lowest_price_profit_margin,
    -- カテゴリ
    COALESCE(y.category_name, 'Uncategorized') AS category,
    y.category_number AS category_id,
    y.ebay_category_id,
    y.ebay_category_path AS category_path,
    -- ステータス
    COALESCE(y.status, 'scraped') AS workflow_status,
    COALESCE(y.approval_status, 'pending') AS approval_status,
    'not_listed' AS listing_status,
    COALESCE(y.price_usd, 0) AS listing_price,
    COALESCE(y.current_stock, 0) AS inventory_quantity,
    -- フィルター結果
    CASE WHEN y.export_filter_status = 'pass' THEN true ELSE false END AS export_filter_pass,
    CASE WHEN y.patent_filter_status = 'pass' THEN true ELSE false END AS patent_filter_pass,
    CASE WHEN y.mall_filter_status = 'pass' THEN true ELSE false END AS mall_filter_pass,
    -- VERO
    y.vero_brand_name AS vero_brand,
    y.vero_risk_level,
    -- 競合情報
    y.competitors_count AS japanese_seller_count,
    -- SellerMirror
    y.sm_lowest_price,
    y.sm_average_price,
    y.sm_competitor_count,
    y.sm_data,
    -- 画像（JSONBから最初の画像を抽出）
    y.image_count,
    CASE 
        WHEN y.image_urls IS NOT NULL AND jsonb_typeof(y.image_urls) = 'array' AND jsonb_array_length(y.image_urls) > 0 
        THEN y.image_urls->0->>'url'
        ELSE NULL
    END AS primary_image_url,
    COALESCE(y.image_urls, '[]'::jsonb) AS gallery_images,
    -- 配送
    y.shipping_cost_usd,
    -- その他
    y.approved_at,
    y.approved_by,
    y.rejection_reason,
    y.ai_confidence_score,
    y.ai_recommendation,
    y.selected_mall AS selected_marketplace,
    -- メタデータ
    y.created_at,
    COALESCE(y.updated_at, y.created_at)
FROM yahoo_scraped_products y;

-- ============================================================
-- 移行結果確認
-- ============================================================
SELECT 
    '✓ 移行完了' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN title LIKE '%ゲンガー%' THEN 1 END) as gengar_count,
    COUNT(CASE WHEN primary_image_url IS NOT NULL THEN 1 END) as has_image_count
FROM products_master
WHERE source_system = 'yahoo_scraped_products';

-- ゲンガーの詳細確認
SELECT 
    id,
    sku,
    title,
    title_en,
    purchase_price_jpy,
    current_price,
    profit_amount_usd,
    profit_margin_percent,
    category,
    primary_image_url,
    image_count,
    sm_lowest_price,
    sm_competitor_count,
    approval_status,
    workflow_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
  AND title LIKE '%ゲンガー%';

-- 全データ一覧（簡易版）
SELECT 
    id,
    sku,
    title,
    current_price,
    profit_amount_usd,
    category,
    CASE WHEN primary_image_url IS NOT NULL THEN '✓' ELSE '✗' END as has_image,
    approval_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
ORDER BY id;
