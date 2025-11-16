-- ============================================
-- products_master_id カラムの追加と既存データのマッピング
-- ============================================

-- 1. products_master_id カラムを追加
ALTER TABLE product_html_generated
ADD COLUMN IF NOT EXISTS products_master_id INTEGER REFERENCES products_master(id);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_product_html_products_master
ON product_html_generated(products_master_id);

-- 2. 既存データをSKUベースでマッピング
UPDATE product_html_generated phg
SET products_master_id = pm.id
FROM products_master pm
WHERE phg.sku = pm.sku
AND phg.products_master_id IS NULL;

-- 3. 検証クエリ
SELECT 
    phg.id,
    phg.sku,
    phg.product_id as old_product_uuid,
    phg.products_master_id as new_master_id,
    pm.title,
    phg.marketplace,
    phg.template_name,
    CASE 
        WHEN phg.products_master_id IS NOT NULL THEN '✅ Mapped'
        ELSE '❌ Not Mapped'
    END as mapping_status
FROM product_html_generated phg
LEFT JOIN products_master pm ON pm.id = phg.products_master_id
ORDER BY phg.created_at DESC;

-- 4. マッピング統計
SELECT 
    COUNT(*) as total_records,
    COUNT(products_master_id) as mapped_records,
    COUNT(*) - COUNT(products_master_id) as unmapped_records
FROM product_html_generated;
