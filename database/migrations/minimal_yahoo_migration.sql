-- 確実に存在するフィールドだけで移行（最小限版）

-- 既存のyahooデータを削除
DELETE FROM products_master WHERE source_system = 'yahoo_scraped_products';

-- 基本フィールドのみで移行
INSERT INTO products_master (
    source_system, 
    source_id, 
    title, 
    title_en,
    current_price,
    approval_status,
    workflow_status,
    created_at, 
    updated_at
)
SELECT 
    'yahoo_scraped_products' AS source_system,
    y.id::TEXT AS source_id,
    y.title,
    COALESCE(y.english_title, y.title) AS title_en,
    COALESCE(y.price_usd, 0) AS current_price,
    COALESCE(y.approval_status, 'pending') AS approval_status,
    COALESCE(y.status, 'scraped') AS workflow_status,
    y.created_at,
    COALESCE(y.updated_at, y.created_at)
FROM yahoo_scraped_products y;

-- 移行結果確認
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN title LIKE '%ゲンガー%' THEN 1 END) as gengar_count
FROM products_master
WHERE source_system = 'yahoo_scraped_products';

-- 全データ確認
SELECT 
    id,
    source_id,
    title,
    title_en,
    current_price,
    approval_status,
    workflow_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
ORDER BY id;
