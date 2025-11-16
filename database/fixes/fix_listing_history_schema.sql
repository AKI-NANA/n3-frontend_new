-- ============================================================================
-- listing_historyテーブルのスキーマ修正
-- ============================================================================
-- 問題: 
--   1. skuカラムが存在しない
--   2. product_idの型がproducts_master.idと不一致
--      (listing_history.product_id = INTEGER, products_master.id = UUID)
-- ============================================================================

-- 現在のテーブル構造を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 1: skuカラムを追加
-- ============================================================================
ALTER TABLE listing_history 
ADD COLUMN IF NOT EXISTS sku TEXT;

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_listing_history_sku 
ON listing_history(sku);

COMMENT ON COLUMN listing_history.sku IS '商品SKU（products_master.skuと紐付け）';

-- ============================================================================
-- STEP 2: product_idの型を確認して修正方針を決定
-- ============================================================================
-- オプション A: product_idをUUID型に変更（推奨）
-- オプション B: product_id_uuidという新しいカラムを追加
-- 
-- ここでは既存データへの影響を最小限にするため、
-- オプションBを採用し、product_id_uuidカラムを追加します

-- 新しいUUID型のカラムを追加
ALTER TABLE listing_history
ADD COLUMN IF NOT EXISTS product_id_uuid UUID;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_listing_history_product_id_uuid
ON listing_history(product_id_uuid);

COMMENT ON COLUMN listing_history.product_id_uuid IS '商品UUID（products_master.idと紐付け）';

-- ============================================================================
-- STEP 3: 既存データを移行（skuを設定）
-- ============================================================================
-- products_masterからskuを取得してlisting_historyに設定
-- 型キャストを使用してproduct_idを文字列として比較

UPDATE listing_history lh
SET sku = pm.sku
FROM products_master pm
WHERE lh.product_id::TEXT = pm.id::TEXT
  AND lh.sku IS NULL
  AND pm.sku IS NOT NULL;

-- ============================================================================
-- STEP 4: 既存データを移行（product_id_uuidを設定）
-- ============================================================================
-- INTEGER型のproduct_idからUUID型のproduct_id_uuidへ移行
-- ※この移行は既存のマッピングロジックに依存します

-- もしproducts_masterにinteger型の旧IDが残っている場合:
-- UPDATE listing_history lh
-- SET product_id_uuid = pm.id
-- FROM products_master pm
-- WHERE lh.product_id = pm.legacy_id  -- 旧IDカラムが存在する場合
--   AND lh.product_id_uuid IS NULL;

-- ============================================================================
-- STEP 5: 検証クエリ
-- ============================================================================
-- skuが正しく設定されたか確認
SELECT 
    COUNT(*) as total_records,
    COUNT(sku) as records_with_sku,
    COUNT(product_id_uuid) as records_with_uuid,
    COUNT(*) - COUNT(sku) as missing_sku,
    COUNT(*) - COUNT(product_id_uuid) as missing_uuid
FROM listing_history;

-- サンプルデータを確認
SELECT 
    id,
    product_id,
    product_id_uuid,
    sku,
    marketplace,
    status,
    listed_at
FROM listing_history
ORDER BY listed_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 6: 将来の推奨事項
-- ============================================================================
-- 以下のステップは、既存データの移行が完了し、
-- アプリケーションコードが新しいスキーマに対応した後に実行してください:

-- 1. product_idカラムの削除（product_id_uuidに完全移行後）
-- ALTER TABLE listing_history DROP COLUMN IF EXISTS product_id;

-- 2. product_id_uuidをproduct_idにリネーム
-- ALTER TABLE listing_history RENAME COLUMN product_id_uuid TO product_id;

-- 3. NOT NULL制約を追加（データ整合性を保証）
-- ALTER TABLE listing_history ALTER COLUMN sku SET NOT NULL;
-- ALTER TABLE listing_history ALTER COLUMN product_id SET NOT NULL;

-- ============================================================================
-- トラブルシューティング
-- ============================================================================

-- products_masterのid型を確認
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns
WHERE table_name = 'products_master' 
  AND column_name = 'id';

-- listing_historyの全カラムと型を確認
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'listing_history'
ORDER BY ordinal_position;

-- データの分布を確認
SELECT 
    marketplace,
    COUNT(*) as count,
    COUNT(sku) as with_sku,
    COUNT(product_id_uuid) as with_uuid
FROM listing_history
GROUP BY marketplace;
