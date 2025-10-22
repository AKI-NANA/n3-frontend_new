-- 在庫監視システム - 現在の状態確認

-- 1. 監視対象商品の確認
SELECT
  COUNT(*) as total_products,
  COUNT(CASE WHEN monitoring_enabled = true THEN 1 END) as monitoring_enabled,
  COUNT(CASE WHEN source_url IS NOT NULL THEN 1 END) as has_source_url,
  COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved
FROM products;

-- 2. 実行履歴の確認
SELECT COUNT(*) as execution_count
FROM inventory_monitoring_logs;

-- 3. 変動データの確認
SELECT COUNT(*) as change_count
FROM inventory_changes;

-- 4. スケジュール設定の確認
SELECT * FROM monitoring_schedules;

-- ========================================
-- テスト用: 既存商品を監視対象に追加
-- ========================================

-- 承認済みでsource_urlがある商品を監視対象に（最大10件）
UPDATE products
SET
  monitoring_enabled = true,
  monitoring_status = 'active',
  monitoring_started_at = NOW(),
  previous_price_jpy = acquired_price_jpy,
  previous_stock = current_stock
WHERE approval_status = 'approved'
  AND source_url IS NOT NULL
  AND source_url != ''
  AND monitoring_enabled = false
LIMIT 10;

-- 確認
SELECT
  id,
  sku,
  title,
  source_url,
  monitoring_enabled,
  monitoring_status,
  previous_price_jpy,
  previous_stock
FROM products
WHERE monitoring_enabled = true
LIMIT 5;
