-- ============================================================
-- yahoo_scraped_products から products_master への確実な移行
-- ============================================================

-- 既存のyahooデータを削除
DELETE FROM products_master WHERE source_system = 'yahoo_scraped_products';

-- 最小限のフィールドで確実に移行
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
    workflow_status,
    approval_status,
    listing_status,
    listing_price,
    inventory_quantity,
    created_at, 
    updated_at
)
SELECT 
    'yahoo_scraped_products' AS source_system,
    y.id::TEXT AS source_id,
    y.title,
    COALESCE(y.english_title, y.title) AS title_en,
    COALESCE(y.price_usd, 0) AS current_price,
    0 AS cost_price,
    COALESCE(y.price_usd, 0) AS profit_amount,
    100 AS profit_margin,
    COALESCE(y.category_name, 'Uncategorized') AS category,
    COALESCE(y.status, 'scraped') AS workflow_status,
    COALESCE(y.approval_status, 'pending') AS approval_status,
    'not_listed' AS listing_status,
    COALESCE(y.price_usd, 0) AS listing_price,
    COALESCE(y.current_stock, 0) AS inventory_quantity,
    y.created_at,
    COALESCE(y.updated_at, y.created_at)
FROM yahoo_scraped_products y;

-- 移行結果確認
SELECT 
    '移行完了' as status,
    COUNT(*) as total_records
FROM products_master
WHERE source_system = 'yahoo_scraped_products';

-- 詳細確認
SELECT 
    id,
    source_system,
    title,
    title_en,
    current_price,
    approval_status,
    workflow_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
ORDER BY id;
