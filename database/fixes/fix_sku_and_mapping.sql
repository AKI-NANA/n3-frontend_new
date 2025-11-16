-- ============================================
-- SKU修正とマッピング
-- ============================================

-- 1. まず、products_masterの正しいSKUを確認
SELECT id, sku, title
FROM products_master
WHERE sku LIKE '%5CA8F114-AF75-4E80-9683-004A20D0DF3A%'
LIMIT 5;

-- 2. product_html_generatedのSKUを修正（NaNを削除）
UPDATE product_html_generated
SET sku = REPLACE(sku, 'NaN', '')
WHERE sku LIKE '%NaN%';

-- 3. 修正後の確認
SELECT id, sku, marketplace
FROM product_html_generated
WHERE sku LIKE '%5CA8F114-AF75-4E80-9683-004A20D0DF3A%';

-- 4. products_master_idをマッピング
UPDATE product_html_generated phg
SET products_master_id = pm.id
FROM products_master pm
WHERE phg.sku = pm.sku
AND phg.products_master_id IS NULL;

-- 5. 最終確認
SELECT 
    phg.id,
    phg.sku,
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

-- 6. マッピング統計
SELECT 
    COUNT(*) as total_html_records,
    COUNT(products_master_id) as successfully_mapped,
    COUNT(*) - COUNT(products_master_id) as unmapped
FROM product_html_generated;
