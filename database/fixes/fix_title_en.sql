-- ============================================================
-- 緊急修正: title_en を title からコピー
-- ============================================================

-- products_master の title_en が NULL のレコードを修正
UPDATE products_master 
SET title_en = title
WHERE title_en IS NULL;

-- 確認
SELECT 
    id, 
    source_system, 
    source_id, 
    title, 
    title_en, 
    approval_status
FROM products_master 
LIMIT 10;
