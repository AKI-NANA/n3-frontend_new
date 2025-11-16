-- ============================================================================
-- listing_history.sku へのデータ移行（型キャスト版）
-- ============================================================================
-- 問題:
--   listing_history.product_id = UUID型
--   products_master.id = INTEGER型
--   → 直接比較できないため型キャストが必要
-- ============================================================================

-- ============================================================================
-- STEP 1: 現状確認
-- ============================================================================
-- skuがNULLのレコード数を確認
SELECT 
    COUNT(*) as total_records,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as without_sku,
    ROUND(100.0 * COUNT(sku) / NULLIF(COUNT(*), 0), 2) as coverage_percent
FROM listing_history;

-- サンプルデータを確認
SELECT 
    id,
    product_id,
    sku,
    marketplace,
    status,
    listed_at
FROM listing_history
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: 既存データを移行（INTEGER → UUID キャスト）
-- ============================================================================
-- products_master.id (INTEGER) を UUID にキャストして比較
UPDATE listing_history lh
SET sku = pm.sku
FROM products_master pm
WHERE lh.product_id = pm.id::TEXT::UUID
  AND lh.sku IS NULL
  AND pm.sku IS NOT NULL;

-- 注意: このクエリは以下の前提に基づいています:
-- products_master.id (INTEGER値: 197, 199, 201...) が
-- 何らかの方法でUUIDに変換されてlisting_history.product_idに格納されている

-- ============================================================================
-- STEP 3: 代替案 - product_id_uuid を使用
-- ============================================================================
-- もし product_id_uuid カラムが正しく設定されている場合:
UPDATE listing_history lh
SET sku = pm.sku
FROM products_master pm
WHERE lh.product_id_uuid = pm.id::TEXT::UUID
  AND lh.sku IS NULL
  AND pm.sku IS NOT NULL;

-- ============================================================================
-- STEP 4: 検証
-- ============================================================================
-- 更新後の状況を確認
SELECT 
    COUNT(*) as total_records,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as without_sku,
    ROUND(100.0 * COUNT(sku) / NULLIF(COUNT(*), 0), 2) as coverage_percent
FROM listing_history;

-- 結合テスト
SELECT 
    lh.id,
    lh.product_id,
    lh.sku as listing_history_sku,
    pm.id as products_master_id,
    pm.sku as products_master_sku,
    lh.marketplace,
    lh.status
FROM listing_history lh
LEFT JOIN products_master pm ON lh.product_id = pm.id::TEXT::UUID
ORDER BY lh.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: データ整合性の問題を確認
-- ============================================================================
-- listing_historyに存在するがproducts_masterに存在しない product_id
SELECT 
    lh.id,
    lh.product_id,
    lh.sku,
    lh.marketplace,
    'product_not_found_in_products_master' as issue
FROM listing_history lh
LEFT JOIN products_master pm ON lh.product_id = pm.id::TEXT::UUID
WHERE pm.id IS NULL
LIMIT 20;

-- products_masterにskuがないレコード
SELECT 
    id,
    source_system,
    source_id,
    title,
    sku,
    'sku_is_null' as issue
FROM products_master
WHERE sku IS NULL
LIMIT 20;
