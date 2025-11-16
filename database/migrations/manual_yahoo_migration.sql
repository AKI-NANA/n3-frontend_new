-- yahoo_scraped_products から products_master への手動移行（フィールド名を柔軟に対応）

-- まず、yahoo_scraped_productsの全カラムを確認
SELECT * FROM yahoo_scraped_products LIMIT 1;

-- 基本的なデータ移行（エラーが出るまで試す）
INSERT INTO products_master (
    source_system, 
    source_id, 
    title, 
    title_en,
    created_at, 
    updated_at
)
SELECT 
    'yahoo_scraped_products' AS source_system,
    id::TEXT AS source_id,
    title,
    COALESCE(title, 'No Title') AS title_en,
    created_at,
    COALESCE(updated_at, created_at, NOW())
FROM yahoo_scraped_products
ON CONFLICT (source_system, source_id) DO UPDATE SET
    title = EXCLUDED.title,
    title_en = EXCLUDED.title_en,
    updated_at = EXCLUDED.updated_at;

-- 移行結果確認
SELECT 
    source_system,
    COUNT(*) as count
FROM products_master
GROUP BY source_system;

-- yahoo_scraped_productsのデータ詳細確認
SELECT 
    id,
    source_system,
    source_id,
    title,
    title_en,
    approval_status
FROM products_master
WHERE source_system = 'yahoo_scraped_products'
LIMIT 10;
