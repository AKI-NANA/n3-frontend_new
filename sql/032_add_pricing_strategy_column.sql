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

-- 4. 確認クエリ
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products_master'
AND column_name = 'pricing_strategy';
