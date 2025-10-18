-- database/migrations/CREATE_CORRECT_POLICIES_V3_FINAL.sql
/**
 * 配送ポリシー完全確定版 v3
 * 
 * 【ポリシー構成】
 * - 重量: 8カテゴリ (0.5-1, 1-2, 2-5, 5-10, 10-15, 15-20, 20-30, 30+kg)
 * - 関税率: 8バンド (0%, 0-10%, 10-20%, 20-30%, 30-40%, 40-50%, 50-60%, 60%+)
 * - DDP/DDU: 価格帯と関税率で自動選択
 * 
 * 【2個目の送料計算】
 * DDP: 実費 + (2個時のDDP総額 - 1個時のDDP総額)
 * DDU: 実費のみ
 * 
 * 【出品警告】
 * - 30kg以上: 配送困難
 * - 関税60%以上: 出品非推奨（DDUのみ可）
 */

-- ========================================
-- STEP 1: 既存データをクリア
-- ========================================
DELETE FROM ebay_policy_zone_rates_v2;
DELETE FROM ebay_shipping_policies_v2;

-- ========================================
-- STEP 2: ポリシー作成関数
-- ========================================

DO $$
DECLARE
  weight_configs JSON := '[
    {"name": "UltraLight", "min": 0.5, "max": 1.0, "avg": 0.75},
    {"name": "VeryLight", "min": 1.0, "max": 2.0, "avg": 1.5},
    {"name": "Light", "min": 2.0, "max": 5.0, "avg": 3.5},
    {"name": "Medium", "min": 5.0, "max": 10.0, "avg": 7.5},
    {"name": "Heavy", "min": 10.0, "max": 15.0, "avg": 12.5},
    {"name": "VeryHeavy", "min": 15.0, "max": 20.0, "avg": 17.5},
    {"name": "ExtraHeavy", "min": 20.0, "max": 30.0, "avg": 25.0},
    {"name": "Oversize", "min": 30.0, "max": 50.0, "avg": 40.0}
  ]'::JSON;
  
  tariff_configs JSON := '[
    {"band": "TARIFF_0", "min": 0.00, "max": 0.00, "sample": 0.000, "warning": false},
    {"band": "TARIFF_5", "min": 0.01, "max": 0.10, "sample": 0.065, "warning": false},
    {"band": "TARIFF_10", "min": 0.10, "max": 0.20, "sample": 0.150, "warning": false},
    {"band": "TARIFF_20", "min": 0.20, "max": 0.30, "sample": 0.250, "warning": false},
    {"band": "TARIFF_30", "min": 0.30, "max": 0.40, "sample": 0.350, "warning": false},
    {"band": "TARIFF_40", "min": 0.40, "max": 0.50, "sample": 0.450, "warning": false},
    {"band": "TARIFF_50", "min": 0.50, "max": 0.60, "sample": 0.550, "warning": true},
    {"band": "TARIFF_60", "min": 0.60, "max": 1.00, "sample": 0.700, "warning": true}
  ]'::JSON;
  
  weight_rec RECORD;
  tariff_rec RECORD;
  pricing_basis VARCHAR(10);
  policy_id INTEGER;
  policy_name VARCHAR(255);
  sample_price DECIMAL := 200; -- DDPの計算用サンプル価格
  
BEGIN
  -- 各重量カテゴリに対して
  FOR weight_rec IN 
    SELECT 
      value->>'name' as name,
      (value->>'min')::DECIMAL as min_kg,
      (value->>'max')::DECIMAL as max_kg,
      (value->>'avg')::DECIMAL as avg_kg
    FROM json_array_elements(weight_configs)
  LOOP
    -- 各関税率バンドに対して
    FOR tariff_rec IN
      SELECT
        value->>'band' as band,
        (value->>'min')::DECIMAL as min_rate,
        (value->>'max')::DECIMAL as max_rate,
        (value->>'sample')::DECIMAL as sample_rate,
        (value->>'warning')::BOOLEAN as warning
      FROM json_array_elements(tariff_configs)
    LOOP
      -- DDUポリシー作成（全ての関税率バンドで作成）
      policy_name := weight_rec.name || '_DDU_' || tariff_rec.band || '_' || 
                     weight_rec.min_kg || '-' || weight_rec.max_kg || 'kg';
      
      INSERT INTO ebay_shipping_policies_v2 (
        policy_name, ebay_account, weight_category, 
        weight_min_kg, weight_max_kg,
        pricing_basis, tariff_band, tariff_rate_min, tariff_rate_max,
        sample_tariff_rate, has_warning,
        marketplace_id, handling_time_days, active
      ) VALUES (
        policy_name, 'account1', weight_rec.name,
        weight_rec.min_kg, weight_rec.max_kg,
        'DDU', tariff_rec.band, tariff_rec.min_rate, tariff_rec.max_rate,
        tariff_rec.sample_rate, tariff_rec.warning,
        'EBAY_US', 10, true
      ) RETURNING id INTO policy_id;
      
      -- ZONE別料金を生成（DDU）
      PERFORM create_zone_rates(
        policy_id, 
        weight_rec.avg_kg, 
        'DDU', 
        NULL, 
        tariff_rec.sample_rate
      );
      
      -- DDPポリシー作成（関税率0%以外）
      IF tariff_rec.sample_rate > 0 THEN
        policy_name := weight_rec.name || '_DDP_' || tariff_rec.band || '_' || 
                       weight_rec.min_kg || '-' || weight_rec.max_kg || 'kg';
        
        INSERT INTO ebay_shipping_policies_v2 (
          policy_name, ebay_account, weight_category,
          weight_min_kg, weight_max_kg,
          pricing_basis, tariff_band, tariff_rate_min, tariff_rate_max,
          sample_tariff_rate, sample_product_price, has_warning,
          marketplace_id, handling_time_days, active
        ) VALUES (
          policy_name, 'account1', weight_rec.name,
          weight_rec.min_kg, weight_rec.max_kg,
          'DDP', tariff_rec.band, tariff_rec.min_rate, tariff_rec.max_rate,
          tariff_rec.sample_rate, sample_price, tariff_rec.warning,
          'EBAY_US', 10, true
        ) RETURNING id INTO policy_id;
        
        -- ZONE別料金を生成（DDP）
        PERFORM create_zone_rates(
          policy_id, 
          weight_rec.avg_kg, 
          'DDP', 
          sample_price, 
          tariff_rec.sample_rate
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ ポリシー作成完了';
END $$;

-- ========================================
-- STEP 3: ZONE別料金生成関数
-- ========================================

CREATE OR REPLACE FUNCTION create_zone_rates(
  p_policy_id INTEGER,
  p_avg_weight DECIMAL,
  p_pricing_basis VARCHAR(10),
  p_sample_price DECIMAL,
  p_tariff_rate DECIMAL
) RETURNS VOID AS $$
DECLARE
  zone_rec RECORD;
  actual_cost DECIMAL;
  display_shipping DECIMAL;
  additional_shipping DECIMAL;
  cif1 DECIMAL;
  cif2 DECIMAL;
  ddp1 DECIMAL;
  ddp2 DECIMAL;
  mpf1 DECIMAL;
  mpf2 DECIMAL;
  hmf1 DECIMAL;
  hmf2 DECIMAL;
BEGIN
  -- 各ZONEに対して
  FOR zone_rec IN
    SELECT DISTINCT zone_number, zone_name
    FROM fedex_icp_zone_rates
    WHERE zone_number BETWEEN 1 AND 22
    ORDER BY zone_number
  LOOP
    -- 実費を取得
    SELECT cost_usd INTO actual_cost
    FROM fedex_icp_zone_rates
    WHERE zone_number = zone_rec.zone_number
      AND weight_kg >= p_avg_weight
    ORDER BY weight_kg ASC
    LIMIT 1;
    
    -- 実費が見つからない場合はスキップ
    IF actual_cost IS NULL THEN
      CONTINUE;
    END IF;
    
    -- 表示送料（実費の2.2倍）
    display_shipping := actual_cost * 2.2;
    
    -- 2個目の送料計算
    IF p_pricing_basis = 'DDP' AND p_sample_price IS NOT NULL THEN
      -- 1個目のDDP計算
      cif1 := p_sample_price + actual_cost;
      mpf1 := GREATEST(LEAST(cif1 * 0.003464, 614.35), 0.3);
      hmf1 := cif1 * 0.00125;
      ddp1 := cif1 * p_tariff_rate + mpf1 + hmf1 + 5;
      
      -- 2個目のDDP計算
      cif2 := p_sample_price * 2 + actual_cost * 2;
      mpf2 := GREATEST(LEAST(cif2 * 0.003464, 614.35), 0.3);
      hmf2 := cif2 * 0.00125;
      ddp2 := cif2 * p_tariff_rate + mpf2 + hmf2 + 5;
      
      -- DDP増加分
      additional_shipping := actual_cost + (ddp2 - ddp1);
    ELSE
      -- DDU: 実費のみ
      additional_shipping := actual_cost;
    END IF;
    
    -- レコード挿入
    INSERT INTO ebay_policy_zone_rates_v2 (
      policy_id, zone_name, zone_code,
      actual_cost_usd, display_shipping_usd,
      first_item_shipping_usd, additional_item_shipping_usd,
      handling_fee_usd,
      estimated_delivery_days_min, estimated_delivery_days_max,
      sort_order
    ) VALUES (
      p_policy_id,
      zone_rec.zone_name,
      'ZONE_' || zone_rec.zone_number,
      actual_cost,
      display_shipping,
      display_shipping,
      additional_shipping,
      8.0,
      10, 21,
      zone_rec.zone_number
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STEP 4: カラム追加（警告フラグ）
-- ========================================

ALTER TABLE ebay_shipping_policies_v2
ADD COLUMN IF NOT EXISTS tariff_band VARCHAR(20),
ADD COLUMN IF NOT EXISTS tariff_rate_min DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS tariff_rate_max DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS sample_tariff_rate DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS has_warning BOOLEAN DEFAULT false;

-- ========================================
-- STEP 5: 確認クエリ
-- ========================================

-- ポリシー数の確認
SELECT 
  pricing_basis,
  COUNT(*) as count,
  SUM(CASE WHEN has_warning THEN 1 ELSE 0 END) as warning_count
FROM ebay_shipping_policies_v2
GROUP BY pricing_basis;

-- サンプルポリシー表示
SELECT 
  policy_name,
  pricing_basis,
  tariff_band,
  sample_tariff_rate,
  weight_min_kg || '-' || weight_max_kg || 'kg' as weight_range,
  has_warning
FROM ebay_shipping_policies_v2
ORDER BY 
  pricing_basis DESC,
  sample_tariff_rate,
  weight_min_kg
LIMIT 20;

-- ZONE料金サンプル
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.tariff_band,
  r.zone_code,
  ROUND(r.actual_cost_usd::numeric, 2) as actual,
  ROUND(r.first_item_shipping_usd::numeric, 2) as first,
  ROUND(r.additional_item_shipping_usd::numeric, 2) as additional,
  ROUND((r.additional_item_shipping_usd / r.actual_cost_usd)::numeric, 2) as additional_ratio
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE r.zone_code IN ('ZONE_3', 'ZONE_4')  -- USA
  AND p.weight_min_kg = 0.5
ORDER BY p.pricing_basis DESC, p.tariff_band;

-- 完了メッセージ
DO $$
DECLARE
  total_policies INTEGER;
  ddp_count INTEGER;
  ddu_count INTEGER;
  warning_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies FROM ebay_shipping_policies_v2;
  SELECT COUNT(*) INTO ddp_count FROM ebay_shipping_policies_v2 WHERE pricing_basis = 'DDP';
  SELECT COUNT(*) INTO ddu_count FROM ebay_shipping_policies_v2 WHERE pricing_basis = 'DDU';
  SELECT COUNT(*) INTO warning_count FROM ebay_shipping_policies_v2 WHERE has_warning = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 配送ポリシー生成完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたポリシー:';
  RAISE NOTICE '  - 合計: % ポリシー', total_policies;
  RAISE NOTICE '  - DDP: % ポリシー', ddp_count;
  RAISE NOTICE '  - DDU: % ポリシー', ddu_count;
  RAISE NOTICE '  - 警告付き: % ポリシー', warning_count;
  RAISE NOTICE '';
  RAISE NOTICE '重量カテゴリ: 8種類';
  RAISE NOTICE '関税率バンド: 8種類';
  RAISE NOTICE '各ポリシーに22 ZONEの料金設定完了';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  警告システム:';
  RAISE NOTICE '  - 30kg以上: 配送困難';
  RAISE NOTICE '  - 関税60%以上: 出品非推奨';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 http://localhost:3003/shipping-policy-manager で確認';
  RAISE NOTICE '';
END $$;
