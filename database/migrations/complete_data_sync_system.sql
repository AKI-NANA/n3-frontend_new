-- ============================================================
-- 完全データ同期システム v2.0
-- yahoo_scraped_products → products_master 完全マッピング
-- ============================================================

-- ステップ1: products_master に不足しているカラムを追加
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS image_count INTEGER DEFAULT 0;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS purchase_price_jpy NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS purchase_price_usd NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS recommended_price_usd NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS lowest_price_usd NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_margin_percent NUMERIC(5,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS lowest_price_profit_usd NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS lowest_price_profit_margin NUMERIC(5,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_lowest_price NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS sm_data JSONB;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS ebay_category_id TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS category_path TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS export_filter_pass BOOLEAN;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS patent_filter_pass BOOLEAN;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS mall_filter_pass BOOLEAN;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS filter_issues JSONB;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS vero_brand TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS vero_risk_level TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS japanese_seller_count INTEGER;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS competitors_data JSONB;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS length_cm NUMERIC(8,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS width_cm NUMERIC(8,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS height_cm NUMERIC(8,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS weight_g NUMERIC(10,2);
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS selected_marketplace TEXT;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS final_score INTEGER;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS category_score INTEGER;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS competition_score INTEGER;
ALTER TABLE products_master ADD COLUMN IF NOT EXISTS profit_score INTEGER;

-- ステップ2: 既存データを削除して再同期
DELETE FROM products_master WHERE source_system = 'yahoo_scraped_products';

-- ステップ3: yahoo_scraped_products から完全データ移行
INSERT INTO products_master (
    source_system,
    source_id,
    sku,
    title,
    title_en,
    description,
    -- 価格
    purchase_price_jpy,
    purchase_price_usd,
    current_price,
    cost_price,
    recommended_price_usd,
    lowest_price_usd,
    profit_amount,
    profit_margin,
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
    condition,
    workflow_status,
    approval_status,
    listing_status,
    listing_price,
    inventory_quantity,
    -- フィルター
    export_filter_pass,
    patent_filter_pass,
    mall_filter_pass,
    -- VERO
    vero_brand,
    vero_risk_level,
    -- 競合
    japanese_seller_count,
    competitors_data,
    -- SellerMirror
    sm_lowest_price,
    sm_average_price,
    sm_competitor_count,
    sm_data,
    -- 画像
    image_count,
    primary_image_url,
    gallery_images,
    -- サイズ・重量
    length_cm,
    width_cm,
    height_cm,
    weight_g,
    -- 配送
    shipping_cost,
    -- その他
    ai_confidence_score,
    ai_recommendation,
    approved_at,
    approved_by,
    rejection_reason,
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
    y.listing_data->>'html_description' AS description,
    -- 価格
    y.price_jpy AS purchase_price_jpy,
    y.price_usd AS purchase_price_usd,
    COALESCE(y.price_usd, 0) AS current_price,
    0 AS cost_price,
    y.recommended_price_usd,
    y.competitors_lowest_price AS lowest_price_usd,
    y.profit_amount_usd AS profit_amount,
    y.profit_margin AS profit_margin,
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
    y.listing_data->>'condition' AS condition,
    COALESCE(y.status, 'scraped') AS workflow_status,
    COALESCE(y.approval_status, 'pending') AS approval_status,
    'not_listed' AS listing_status,
    COALESCE(y.price_usd, 0) AS listing_price,
    COALESCE(y.current_stock, 0) AS inventory_quantity,
    -- フィルター
    CASE WHEN y.export_filter_status = 'pass' THEN true ELSE false END AS export_filter_pass,
    CASE WHEN y.patent_filter_status = 'pass' THEN true ELSE false END AS patent_filter_pass,
    CASE WHEN y.mall_filter_status = 'pass' THEN true ELSE false END AS mall_filter_pass,
    -- VERO
    y.vero_brand_name AS vero_brand,
    y.vero_risk_level,
    -- 競合
    y.competitors_count AS japanese_seller_count,
    y.competitors_data,
    -- SellerMirror
    y.sm_lowest_price,
    y.sm_average_price,
    y.sm_competitor_count,
    y.sm_data,
    -- 画像（scraped_dataとimage_urlsの両方対応）
    COALESCE(y.image_count, 0) AS image_count,
    CASE 
        WHEN y.scraped_data->'image_urls' IS NOT NULL 
             AND jsonb_typeof(y.scraped_data->'image_urls') = 'array' 
             AND jsonb_array_length(y.scraped_data->'image_urls') > 0 
        THEN TRIM(BOTH '"' FROM (y.scraped_data->'image_urls'->0)::text)
        WHEN y.image_urls IS NOT NULL 
             AND jsonb_typeof(y.image_urls) = 'array' 
             AND jsonb_array_length(y.image_urls) > 0 
        THEN TRIM(BOTH '"' FROM (y.image_urls->0)::text)
        ELSE NULL
    END AS primary_image_url,
    COALESCE(y.scraped_data->'image_urls', y.image_urls, '[]'::jsonb) AS gallery_images,
    -- サイズ・重量
    (y.listing_data->>'length_cm')::NUMERIC AS length_cm,
    (y.listing_data->>'width_cm')::NUMERIC AS width_cm,
    (y.listing_data->>'height_cm')::NUMERIC AS height_cm,
    (y.listing_data->>'weight_g')::NUMERIC AS weight_g,
    -- 配送
    y.shipping_cost_usd AS shipping_cost,
    -- その他
    y.ai_confidence_score,
    y.ai_recommendation,
    y.approved_at,
    y.approved_by,
    y.rejection_reason,
    y.selected_mall AS selected_marketplace,
    -- メタデータ
    y.created_at,
    COALESCE(y.updated_at, y.created_at)
FROM yahoo_scraped_products y;

-- ステップ4: products からも移行（既存のデータ保持）
INSERT INTO products_master (
    source_system,
    source_id,
    title,
    title_en,
    current_price,
    cost_price,
    profit_amount,
    profit_margin,
    category,
    condition_name,
    workflow_status,
    approval_status,
    listing_status,
    listing_price,
    inventory_quantity,
    gallery_images,
    created_at,
    updated_at
)
SELECT 
    'products' AS source_system,
    p.id::TEXT AS source_id,
    p.title,
    COALESCE(p.english_title, p.title) AS title_en,
    p.price_usd AS current_price,
    COALESCE(p.cost_price, 0) AS cost_price,
    (p.price_usd - COALESCE(p.cost_price, 0)) AS profit_amount,
    CASE 
        WHEN p.price_usd > 0 THEN ((p.price_usd - COALESCE(p.cost_price, 0)) / p.price_usd) * 100
        ELSE 0 
    END AS profit_margin,
    COALESCE(p.category_name, 'Uncategorized') AS category,
    COALESCE(p.condition, 'Unknown') AS condition_name,
    COALESCE(p.status, 'draft') AS workflow_status,
    'pending' AS approval_status,
    CASE WHEN p.ready_to_list THEN 'ready' ELSE 'not_listed' END AS listing_status,
    p.price_usd AS listing_price,
    COALESCE(p.stock_quantity, 0) AS inventory_quantity,
    COALESCE(p.images, '[]'::jsonb) AS gallery_images,
    p.created_at,
    p.updated_at
FROM products p
ON CONFLICT (source_system, source_id) DO NOTHING;

-- ============================================================
-- 結果確認
-- ============================================================
SELECT 
    '✓ データ移行完了' as status,
    source_system,
    COUNT(*) as total_records,
    COUNT(CASE WHEN title LIKE '%ゲンガー%' THEN 1 END) as gengar_count,
    COUNT(sku) as has_sku,
    COUNT(primary_image_url) as has_primary_image,
    COUNT(sm_lowest_price) as has_sm_data,
    COUNT(profit_amount_usd) as has_profit_data
FROM products_master
GROUP BY source_system;

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
    sm_lowest_price,
    sm_competitor_count,
    category,
    condition,
    primary_image_url,
    image_count,
    length_cm,
    width_cm,
    height_cm,
    weight_g,
    approval_status
FROM products_master
WHERE title LIKE '%ゲンガー%';
