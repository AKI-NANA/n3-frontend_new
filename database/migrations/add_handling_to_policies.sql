-- =====================================================
-- Handling Fee を配送ポリシーに追加するマイグレーション
-- =====================================================

-- Step 1: 既存のテーブル構造確認
-- ebay_zone_shipping_rates には既に handling_fee カラムが存在

-- Step 2: Handling Fee の計算ルールを追加
-- 上乗せ額（markup）とHandling Feeの関係を定義

-- =====================================================
-- 2-1. Rate Table の上乗せパターン定義
-- =====================================================
CREATE TABLE IF NOT EXISTS ebay_rate_table_tiers (
  id SERIAL PRIMARY KEY,
  
  -- Tier情報
  tier_name VARCHAR(50) NOT NULL,  -- 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'
  tier_level INTEGER NOT NULL,      -- 1, 2, 3, 4
  
  -- 上乗せ額（USD）
  markup_amount DECIMAL(10,2) NOT NULL,  -- $10, $15, $20, $25
  
  -- 説明
  description TEXT,
  
  -- 適用条件（オプション）
  min_ddp_fee DECIMAL(10,2),  -- この上乗せ額で対応できる最小DDP手数料
  max_ddp_fee DECIMAL(10,2),  -- この上乗せ額で対応できる最大DDP手数料
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2-2. 初期データ投入（4つのTier）
-- =====================================================
INSERT INTO ebay_rate_table_tiers (tier_name, tier_level, markup_amount, description, min_ddp_fee, max_ddp_fee)
VALUES 
  ('Tier 1', 1, 10.00, '最小上乗せ - DDP手数料$0-10対応', 0.00, 10.00),
  ('Tier 2', 2, 15.00, '標準上乗せ - DDP手数料$10-15対応', 10.00, 15.00),
  ('Tier 3', 3, 20.00, '高上乗せ - DDP手数料$15-20対応', 15.00, 20.00),
  ('Tier 4', 4, 25.00, '最大上乗せ - DDP手数料$20-25対応', 20.00, 25.00)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2-3. Handling Fee 計算ルール定義
-- =====================================================
CREATE TABLE IF NOT EXISTS ebay_handling_fee_rules (
  id SERIAL PRIMARY KEY,
  
  -- ルール名
  rule_name VARCHAR(100) NOT NULL,
  
  -- 計算方式
  calculation_method VARCHAR(50) NOT NULL,  -- 'PERCENTAGE_OF_SHIPPING', 'FIXED_AMOUNT', 'MARKUP_SPLIT'
  
  -- パラメータ
  percentage DECIMAL(5,2),           -- 送料の○%（例: 20.00 = 20%）
  fixed_amount DECIMAL(10,2),        -- 固定額
  max_amount DECIMAL(10,2),          -- 上限額（例: $50）
  
  -- Markup分配比率（MARKUP_SPLITの場合）
  markup_to_handling_ratio DECIMAL(5,2),  -- Markupの何%をHandlingに（例: 50.00 = 50%）
  
  -- 説明
  description TEXT,
  
  -- 優先順位
  priority INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2-4. Handling Fee ルールの初期データ
-- =====================================================
INSERT INTO ebay_handling_fee_rules (rule_name, calculation_method, percentage, max_amount, description, priority)
VALUES 
  ('eBay上限ルール', 'PERCENTAGE_OF_SHIPPING', 20.00, 50.00, 'eBay規約：送料の20%または$50のいずれか小さい方', 1),
  ('最大化戦略', 'PERCENTAGE_OF_SHIPPING', 20.00, 50.00, 'Handlingを上限まで設定し還付額を最大化', 2)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. 既存データへのHandling Fee 自動設定
-- =====================================================

-- 3-1. 送料の20%または$50を自動計算して設定
UPDATE ebay_zone_shipping_rates
SET 
  handling_fee = LEAST(
    display_shipping_cost * 0.20,  -- 送料の20%
    50.00                           -- または$50
  ),
  updated_at = NOW()
WHERE handling_fee IS NULL OR handling_fee = 0;

-- =====================================================
-- 4. Handlingを含む配送ポリシーのビュー作成
-- =====================================================
CREATE OR REPLACE VIEW v_shipping_policy_with_handling AS
SELECT 
  p.id as policy_id,
  p.policy_name,
  p.weight_min_kg,
  p.weight_max_kg,
  s.id as service_id,
  s.service_level,
  s.service_type,
  r.zone_code,
  r.zone_name,
  r.weight_kg,
  
  -- コスト情報
  r.reference_shipping_cost as actual_cost,
  r.display_shipping_cost,
  r.handling_fee,
  
  -- 上乗せ計算
  (r.display_shipping_cost - r.reference_shipping_cost) as shipping_markup,
  (r.display_shipping_cost + r.handling_fee) as total_shipping_to_customer,
  
  -- Markup合計
  (r.display_shipping_cost - r.reference_shipping_cost + r.handling_fee) as total_markup,
  
  r.service_available,
  r.unavailable_reason
  
FROM ebay_shipping_policies p
JOIN ebay_shipping_services s ON s.policy_id = p.id
JOIN ebay_zone_shipping_rates r ON r.service_id = s.id
WHERE p.is_active = true;

-- =====================================================
-- 5. Handling Fee 最適化関数
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_optimal_handling(
  p_actual_shipping DECIMAL,
  p_ddp_fee DECIMAL,
  p_max_percentage DECIMAL DEFAULT 0.20,
  p_max_absolute DECIMAL DEFAULT 50.00
)
RETURNS TABLE (
  handling_fee DECIMAL,
  display_shipping DECIMAL,
  total_to_customer DECIMAL,
  ddp_recovered DECIMAL,
  ddp_shortfall DECIMAL,
  is_fully_recovered BOOLEAN,
  strategy VARCHAR
) AS $$
DECLARE
  v_max_handling DECIMAL;
  v_markup DECIMAL;
  v_handling_a DECIMAL;
  v_shipping_a DECIMAL;
  v_handling_b DECIMAL;
  v_shipping_b DECIMAL;
  v_handling_c DECIMAL;
  v_shipping_c DECIMAL;
  v_recovered_a DECIMAL;
  v_recovered_b DECIMAL;
  v_recovered_c DECIMAL;
BEGIN
  -- DDU（DDP手数料0）の場合
  IF p_ddp_fee = 0 THEN
    RETURN QUERY SELECT 
      2.00::DECIMAL as handling_fee,
      p_actual_shipping as display_shipping,
      p_actual_shipping + 2.00 as total_to_customer,
      0.00::DECIMAL as ddp_recovered,
      0.00::DECIMAL as ddp_shortfall,
      true as is_fully_recovered,
      'DDU (minimal handling)'::VARCHAR as strategy;
    RETURN;
  END IF;

  -- Handling上限計算
  v_max_handling := LEAST(p_actual_shipping * p_max_percentage, p_max_absolute);
  
  -- Rate Tableから最適なTierを選択（DDPより大きいmarkup）
  SELECT markup_amount INTO v_markup
  FROM ebay_rate_table_tiers
  WHERE markup_amount >= p_ddp_fee
  ORDER BY markup_amount DESC
  LIMIT 1;
  
  -- Tierが見つからない場合はDDP手数料をそのまま使用
  IF v_markup IS NULL THEN
    v_markup := p_ddp_fee;
  END IF;
  
  -- オプションA: Handlingを最大限活用
  v_handling_a := LEAST(v_markup, v_max_handling);
  v_shipping_a := p_actual_shipping + (v_markup - v_handling_a);
  v_recovered_a := v_handling_a + (v_markup - v_handling_a);
  
  -- オプションB: 送料を実費の150%以内に抑える
  v_shipping_b := LEAST(p_actual_shipping + v_markup, p_actual_shipping * 1.50);
  v_handling_b := LEAST(GREATEST(0, p_actual_shipping + v_markup - v_shipping_b), v_max_handling);
  v_recovered_b := (v_shipping_b - p_actual_shipping) + v_handling_b;
  
  -- オプションC: バランス型（送料130%）
  v_shipping_c := p_actual_shipping * 1.30;
  v_handling_c := LEAST(GREATEST(0, p_actual_shipping + v_markup - v_shipping_c), v_max_handling);
  v_recovered_c := (v_shipping_c - p_actual_shipping) + v_handling_c;
  
  -- 最適な戦略を選択（回収額が最大）
  IF v_recovered_a >= v_recovered_b AND v_recovered_a >= v_recovered_c THEN
    RETURN QUERY SELECT 
      v_handling_a as handling_fee,
      v_shipping_a as display_shipping,
      v_shipping_a + v_handling_a as total_to_customer,
      v_recovered_a as ddp_recovered,
      GREATEST(0, p_ddp_fee - v_recovered_a) as ddp_shortfall,
      (v_recovered_a >= p_ddp_fee) as is_fully_recovered,
      'Max Handling'::VARCHAR as strategy;
  ELSIF v_recovered_b >= v_recovered_c THEN
    RETURN QUERY SELECT 
      v_handling_b as handling_fee,
      v_shipping_b as display_shipping,
      v_shipping_b + v_handling_b as total_to_customer,
      v_recovered_b as ddp_recovered,
      GREATEST(0, p_ddp_fee - v_recovered_b) as ddp_shortfall,
      (v_recovered_b >= p_ddp_fee) as is_fully_recovered,
      'Customer-friendly'::VARCHAR as strategy;
  ELSE
    RETURN QUERY SELECT 
      v_handling_c as handling_fee,
      v_shipping_c as display_shipping,
      v_shipping_c + v_handling_c as total_to_customer,
      v_recovered_c as ddp_recovered,
      GREATEST(0, p_ddp_fee - v_recovered_c) as ddp_shortfall,
      (v_recovered_c >= p_ddp_fee) as is_fully_recovered,
      'Balanced'::VARCHAR as strategy;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. インデックス作成
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_zone_rates_handling ON ebay_zone_shipping_rates(handling_fee);
CREATE INDEX IF NOT EXISTS idx_rate_tiers_markup ON ebay_rate_table_tiers(markup_amount);
CREATE INDEX IF NOT EXISTS idx_handling_rules_active ON ebay_handling_fee_rules(is_active, priority);

-- =====================================================
-- 完了
-- =====================================================
COMMENT ON TABLE ebay_rate_table_tiers IS 'Rate Tableの上乗せTier定義';
COMMENT ON TABLE ebay_handling_fee_rules IS 'Handling Fee計算ルール';
COMMENT ON FUNCTION calculate_optimal_handling IS 'DDP手数料に基づいてHandlingと送料を最適配分';
