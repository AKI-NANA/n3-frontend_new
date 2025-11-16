-- ============================================
-- product_idを使ったマッピング（正しい方法）
-- ============================================

-- 1. まず、マッピング可能か確認
SELECT 
    phg.id,
    phg.product_id as html_product_uuid,
    phg.sku as html_incorrect_sku,
    pm.id as master_id,
    pm.sku as master_correct_sku,
    pm.title,
    pm.source_table
FROM product_html_generated phg
LEFT JOIN products_master pm ON pm.source_id = phg.product_id
ORDER BY phg.created_at DESC;

-- 2. マッピング実行（product_id → source_id）
UPDATE product_html_generated phg
SET products_master_id = pm.id
FROM products_master pm
WHERE pm.source_id = phg.product_id
AND phg.products_master_id IS NULL;

-- 3. 正しいSKUを同期
UPDATE product_html_generated phg
SET sku = pm.sku
FROM products_master pm
WHERE pm.id = phg.products_master_id
AND phg.sku != pm.sku;

-- 4. 最終確認
SELECT 
    phg.id,
    phg.sku as corrected_sku,
    phg.products_master_id,
    pm.title,
    phg.marketplace,
    CASE 
        WHEN phg.products_master_id IS NOT NULL THEN '✅ Mapped'
        ELSE '❌ Not Mapped'
    END as status
FROM product_html_generated phg
LEFT JOIN products_master pm ON pm.id = phg.products_master_id
ORDER BY phg.created_at DESC;

-- 5. 統計
SELECT 
    COUNT(*) as total_html_records,
    COUNT(products_master_id) as successfully_mapped,
    COUNT(*) - COUNT(products_master_id) as unmapped,
    ROUND(100.0 * COUNT(products_master_id) / COUNT(*), 2) as mapping_percentage
FROM product_html_generated;
