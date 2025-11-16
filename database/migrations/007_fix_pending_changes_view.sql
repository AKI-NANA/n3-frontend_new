-- ====================================================================
-- エラー修正: pending_changes ビュー
-- ====================================================================
-- エラー: products_master.ebay_listing_id が存在しない
-- 修正: unified_changes.ebay_listing_id を使用
-- ====================================================================

-- 既存のビューを削除
DROP VIEW IF EXISTS pending_changes;

-- 修正版ビューを作成
CREATE OR REPLACE VIEW pending_changes AS
SELECT 
  uc.*,
  p.sku,
  p.title,
  p.store_url as source_url
FROM unified_changes uc
JOIN products_master p ON uc.product_id = p.id
WHERE uc.status = 'pending'
ORDER BY uc.detected_at DESC;

COMMENT ON VIEW pending_changes IS '未処理の変動データ（修正版）';

-- ====================================================================
-- active_monitoring_products ビューも確認
-- ====================================================================

-- このビューでもebay_listing_idを使っていないか確認
DROP VIEW IF EXISTS active_monitoring_products CASCADE;

CREATE OR REPLACE VIEW active_monitoring_products AS
SELECT 
  p.*,
  ps.performance_score,
  ps.rank,
  CASE 
    WHEN p.next_inventory_check IS NULL THEN true
    WHEN p.next_inventory_check <= NOW() THEN true
    ELSE false
  END as should_check_now
FROM products_master p
LEFT JOIN product_scores ps ON p.id = ps.product_id
WHERE p.inventory_monitoring_enabled = true
  AND p.store_url IS NOT NULL
ORDER BY p.next_inventory_check ASC NULLS FIRST;

COMMENT ON VIEW active_monitoring_products IS '在庫監視対象商品（アクティブ）';

-- ====================================================================
-- 検証
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ ビュー修正完了';
  RAISE NOTICE '  - pending_changes: ebay_listing_idをunified_changesから取得';
  RAISE NOTICE '  - active_monitoring_products: 確認済み';
END $$;

-- ビューのテスト
SELECT COUNT(*) as pending_count FROM pending_changes;
SELECT COUNT(*) as monitoring_count FROM active_monitoring_products;
