-- ============================================
-- 型変換を使った正しいマッピング
-- ============================================

-- Step 1: データ型確認
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'product_html_generated' 
AND column_name IN ('product_id', 'sku', 'products_master_id');

SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'products_master' 
AND column_name IN ('id', 'source_id', 'sku');

-- Step 2: 型変換してマッピング確認
SELECT 
    phg.id,
    phg.product_id::text as html_product_uuid,
    phg.sku as html_sku,
    pm.id as master_id,
    pm.source_id as master_source_id,
    pm.sku as master_sku,
    pm.title
FROM product_html_generated phg
LEFT JOIN products_master pm ON pm.source_id = phg.product_id::text
ORDER BY phg.created_at DESC
LIMIT 5;

-- Step 3: マッピング実行（型変換）
UPDATE product_html_generated phg
SET products_master_id = pm.id
FROM products_master pm
WHERE pm.source_id = phg.product_id::text
AND phg.products_master_id IS NULL;

-- Step 4: SKU同期
UPDATE product_html_generated phg
SET sku = pm.sku
FROM products_master pm
WHERE pm.id = phg.products_master_id
AND phg.sku != pm.sku;

-- Step 5: 最終確認
SELECT 
    phg.id,
    phg.sku,
    phg.products_master_id,
    pm.title,
    phg.marketplace
FROM product_html_generated phg
LEFT JOIN products_master pm ON pm.id = phg.products_master_id
ORDER BY phg.created_at DESC;

-- Step 6: 統計
SELECT 
    COUNT(*) as total,
    COUNT(products_master_id) as mapped,
    COUNT(*) - COUNT(products_master_id) as unmapped
FROM product_html_generated;
