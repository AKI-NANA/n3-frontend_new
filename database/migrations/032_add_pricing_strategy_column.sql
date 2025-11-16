-- Migration 032: 商品個別の価格戦略設定カラム追加
-- 作成日: 2025-11-03
-- 説明: products_masterに個別の価格戦略設定を保存するカラムを追加

-- 1. カラム追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS pricing_strategy JSONB;

-- 2. コメント追加
COMMENT ON COLUMN products_master.pricing_strategy 
IS '個別の価格戦略設定（nullの場合はglobal_pricing_strategyのデフォルト設定を使用）。
例: {
  "pricing_strategy": "follow_lowest",
  "min_profit_usd": 10,
  "price_adjust_percent": -5,
  "follow_competitor": true,
  "max_adjust_percent": 20,
  "out_of_stock_action": "set_zero",
  "check_frequency": "1day"
}';

-- 3. インデックス追加（価格戦略を持つ商品の検索用）
CREATE INDEX IF NOT EXISTS idx_products_pricing_strategy 
ON products_master((pricing_strategy IS NOT NULL));

-- 4. 既存データの確認用ビュー作成
CREATE OR REPLACE VIEW v_pricing_strategy_status AS
SELECT 
  id,
  sku,
  title,
  CASE 
    WHEN pricing_strategy IS NOT NULL THEN 'カスタム'
    ELSE 'デフォルト'
  END as strategy_source,
  pricing_strategy,
  inventory_monitoring_enabled,
  created_at,
  updated_at
FROM products_master
WHERE inventory_monitoring_enabled = true
ORDER BY updated_at DESC;

-- 5. 統計情報確認用
DO $$
DECLARE
  total_products INTEGER;
  custom_strategy_count INTEGER;
  default_strategy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_products FROM products_master WHERE inventory_monitoring_enabled = true;
  SELECT COUNT(*) INTO custom_strategy_count FROM products_master WHERE pricing_strategy IS NOT NULL;
  SELECT COUNT(*) INTO default_strategy_count FROM products_master WHERE pricing_strategy IS NULL AND inventory_monitoring_enabled = true;
  
  RAISE NOTICE '=== 価格戦略設定統計 ===';
  RAISE NOTICE '監視対象商品数: %', total_products;
  RAISE NOTICE 'カスタム設定: %', custom_strategy_count;
  RAISE NOTICE 'デフォルト設定: %', default_strategy_count;
END $$;
