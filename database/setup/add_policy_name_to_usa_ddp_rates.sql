-- usa_ddp_rates テーブルに policy_name カラムを追加
ALTER TABLE usa_ddp_rates ADD COLUMN IF NOT EXISTS policy_name VARCHAR(50);

-- 既存データに policy_name を生成して更新
-- 重量帯番号の計算: CEIL(weight_max_kg / 0.5)
-- ポリシー名の形式: RT{重量帯:02d}_P{価格:04d}
UPDATE usa_ddp_rates
SET policy_name = 
  'RT' || 
  LPAD(CAST(CEIL(weight_max_kg / 0.5) AS TEXT), 2, '0') || 
  '_P' || 
  LPAD(CAST(product_price_usd AS TEXT), 4, '0');

-- インデックスを追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_usa_ddp_rates_policy_name ON usa_ddp_rates(policy_name);

-- 確認クエリ
SELECT 
  weight_band_name,
  product_price_usd,
  policy_name,
  total_shipping_usd
FROM usa_ddp_rates
LIMIT 10;
