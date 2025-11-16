-- ============================================================================
-- listing_historyテーブルのスキーマ修正（INTEGER型ID用）
-- ============================================================================
-- 確認事項:
--   ✅ products_master.id = INTEGER型
--   ✅ products_master.sku = TEXT型
--   ❌ listing_history.sku = 存在しない（追加が必要）
-- ============================================================================

-- ============================================================================
-- STEP 1: 現在のテーブル構造を確認
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: skuカラムを追加
-- ============================================================================
ALTER TABLE listing_history 
ADD COLUMN IF NOT EXISTS sku TEXT;

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_listing_history_sku 
ON listing_history(sku);

COMMENT ON COLUMN listing_history.sku IS '商品SKU（products_master.skuと紐付け）';

-- ============================================================================
-- STEP 3: 既存データを移行（product_id → sku）
-- ============================================================================
-- INTEGER型同士の比較なので型キャスト不要
UPDATE listing_history lh
SET sku = pm.sku
FROM products_master pm
WHERE lh.product_id = pm.id
  AND lh.sku IS NULL
  AND pm.sku IS NOT NULL;

-- ============================================================================
-- STEP 4: 検証クエリ
-- ============================================================================
-- skuが正しく設定されたか確認
SELECT 
    COUNT(*) as total_records,
    COUNT(sku) as records_with_sku,
    COUNT(*) - COUNT(sku) as missing_sku,
    ROUND(100.0 * COUNT(sku) / NULLIF(COUNT(*), 0), 2) as sku_coverage_percent
FROM listing_history;

-- サンプルデータを確認
SELECT 
    lh.id,
    lh.product_id,
    lh.sku,
    pm.sku as products_master_sku,
    lh.marketplace,
    lh.status,
    lh.listed_at
FROM listing_history lh
LEFT JOIN products_master pm ON lh.product_id = pm.id
ORDER BY lh.listed_at DESC
LIMIT 10;

-- skuが設定されていないレコードを確認（デバッグ用）
SELECT 
    lh.id,
    lh.product_id,
    lh.sku,
    lh.marketplace,
    lh.status,
    CASE 
        WHEN pm.id IS NULL THEN 'product_not_found'
        WHEN pm.sku IS NULL THEN 'product_has_no_sku'
        ELSE 'unknown'
    END as reason
FROM listing_history lh
LEFT JOIN products_master pm ON lh.product_id = pm.id
WHERE lh.sku IS NULL
LIMIT 10;

-- ============================================================================
-- STEP 5: product_idのNULL値をチェック（データ整合性）
-- ============================================================================
SELECT 
    COUNT(*) as records_with_null_product_id
FROM listing_history
WHERE product_id IS NULL;

-- ============================================================================
-- STEP 6: マーケットプレイス別のデータ分布を確認
-- ============================================================================
SELECT 
    marketplace,
    COUNT(*) as total_count,
    COUNT(sku) as with_sku,
    COUNT(*) - COUNT(sku) as without_sku,
    ROUND(100.0 * COUNT(sku) / NULLIF(COUNT(*), 0), 2) as coverage_percent
FROM listing_history
GROUP BY marketplace
ORDER BY total_count DESC;

-- ============================================================================
-- 将来の推奨事項（オプション）
-- ============================================================================
-- 全てのデータ移行が完了し、アプリケーションコードが
-- skuカラムを使用するように更新された後、以下を検討:

-- 1. skuカラムにNOT NULL制約を追加
-- ALTER TABLE listing_history 
-- ALTER COLUMN sku SET NOT NULL;

-- 2. 外部キー制約を追加（参照整合性を保証）
-- ALTER TABLE listing_history
-- ADD CONSTRAINT fk_listing_history_sku
-- FOREIGN KEY (sku) REFERENCES products_master(sku)
-- ON DELETE CASCADE;

-- 3. product_idベースのクエリをskuベースに移行後、
--    既存のproduct_idインデックスを確認
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'listing_history';
