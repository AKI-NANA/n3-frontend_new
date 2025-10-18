-- database/migrations/CREATE_CORRECT_POLICIES_FINAL.sql
/**
 * 配送ポリシー完全確定版
 * 
 * 【ポリシー構成】
 * - DDU: 4ポリシー (全価格帯共通)
 * - DDP: 8ポリシー (BAND_200 × 4 + BAND_350 × 4)
 * 合計: 12ポリシー
 * 
 * 【2個目の送料計算】
 * DDP: 実費 + DDP総額増加分
 * DDU: 実費のみ
 */

-- ========================================
-- STEP 1: 既存データをクリア
-- ========================================
DELETE FROM ebay_policy_zone_rates_v2;
DELETE FROM ebay_shipping_policies_v2;

-- ========================================
-- STEP 2: DDUポリシー作成 (4個)
-- ========================================

-- Light DDU (0.5-2kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, marketplace_id, handling_time_days, active
) VALUES (
  'Light_DDU_0.5-2kg', 'account1', 'Light', 0.5, 2.0,
  'DDU', 'EBAY_US', 10, true
);

-- Small DDU (2-5kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, marketplace_id, handling_time_days, active
) VALUES (
  'Small_DDU_2-5kg', 'account1', 'Small', 2.0, 5.0,
  'DDU', 'EBAY_US', 10, true
);

-- Medium DDU (5-10kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, marketplace_id, handling_time_days, active
) VALUES (
  'Medium_DDU_5-10kg', 'account1', 'Medium', 5.0, 10.0,
  'DDU', 'EBAY_US', 10, true
);

-- Heavy DDU (10-20kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, marketplace_id, handling_time_days, active
) VALUES (
  'Heavy_DDU_10-20kg', 'account1', 'Heavy', 10.0, 20.0,
  'DDU', 'EBAY_US', 10, true
);

-- ========================================
-- STEP 3: DDP BAND_200 ポリシー作成 (4個)
-- ========================================

-- Light DDP BAND_200
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Light_DDP_BAND200_0.5-2kg', 'account1', 'Light', 0.5, 2.0,
  'DDP', 'BAND_200', 200, 150, 250,
  'EBAY_US', 10, true
);

-- Small DDP BAND_200
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Small_DDP_BAND200_2-5kg', 'account1', 'Small', 2.0, 5.0,
  'DDP', 'BAND_200', 200, 150, 250,
  'EBAY_US', 10, true
);

-- Medium DDP BAND_200
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Medium_DDP_BAND200_5-10kg', 'account1', 'Medium', 5.0, 10.0,
  'DDP', 'BAND_200', 200, 150, 250,
  'EBAY_US', 10, true
);

-- Heavy DDP BAND_200
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Heavy_DDP_BAND200_10-20kg', 'account1', 'Heavy', 10.0, 20.0,
  'DDP', 'BAND_200', 200, 150, 250,
  'EBAY_US', 10, true
);

-- ========================================
-- STEP 4: DDP BAND_350 ポリシー作成 (4個)
-- ========================================

-- Light DDP BAND_350
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Light_DDP_BAND350_0.5-2kg', 'account1', 'Light', 0.5, 2.0,
  'DDP', 'BAND_350', 350, 250, 450,
  'EBAY_US', 10, true
);

-- Small DDP BAND_350
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Small_DDP_BAND350_2-5kg', 'account1', 'Small', 2.0, 5.0,
  'DDP', 'BAND_350', 350, 250, 450,
  'EBAY_US', 10, true
);

-- Medium DDP BAND_350
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Medium_DDP_BAND350_5-10kg', 'account1', 'Medium', 5.0, 10.0,
  'DDP', 'BAND_350', 350, 250, 450,
  'EBAY_US', 10, true
);

-- Heavy DDP BAND_350
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, ebay_account, weight_category, weight_min_kg, weight_max_kg,
  pricing_basis, price_band_final, sample_product_price, price_min_usd, price_max_usd,
  marketplace_id, handling_time_days, active
) VALUES (
  'Heavy_DDP_BAND350_10-20kg', 'account1', 'Heavy', 10.0, 20.0,
  'DDP', 'BAND_350', 350, 250, 450,
  'EBAY_US', 10, true
);

-- ========================================
-- STEP 5: ZONE別料金を生成
-- ========================================

-- ZONE別料金の動的生成
DO $$
DECLARE
  policy RECORD;
  zone RECORD;
  avg_weight DECIMAL;
  actual_cost DECIMAL;
  display_shipping DECIMAL;
  additional_shipping DECIMAL;
  ddp_1 DECIMAL;
  ddp_2 DECIMAL;
  ddp_increase DECIMAL;
BEGIN
  -- 各ポリシーに対して
  FOR policy IN 
    SELECT id, weight_min_kg, weight_max_kg, pricing_basis, 
           sample_product_price, price_band_final
    FROM ebay_shipping_policies_v2
    WHERE active = true
  LOOP
    -- 平均重量
    avg_weight := (policy.weight_min_kg + policy.weight_max_kg) / 2;
    
    -- 各ZONEに対して
    FOR zone IN 
      SELECT DISTINCT zone_number, zone_name
      FROM fedex_icp_zone_rates
      WHERE zone_number BETWEEN 1 AND 22
      ORDER BY zone_number
    LOOP
      -- 実費を取得（FedEx ICP料金）
      SELECT cost_usd INTO actual_cost
      FROM fedex_icp_zone_rates
      WHERE zone_number = zone.zone_number
        AND weight_kg >= avg_weight
      ORDER BY weight_kg ASC
      LIMIT 1;
      
      -- 表示送料（実費の2.2倍）
      display_shipping := actual_cost * 2.2;
      
      -- 2個目の送料計算
      IF policy.pricing_basis = 'DDP' THEN
        -- DDP: 実費 + DDP増加分
        ddp_1 := (policy.sample_product_price + actual_cost) * 0.065 + 5 + 1;
        ddp_2 := (policy.sample_product_price * 2 + actual_cost * 2) * 0.065 + 5 + 1;
        ddp_increase := ddp_2 - ddp_1;
        additional_shipping := actual_cost + ddp_increase;
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
        policy.id,
        zone.zone_name,
        'ZONE_' || zone.zone_number,
        actual_cost,
        display_shipping,
        display_shipping,
        additional_shipping,
        8.0,
        10, 21,
        zone.zone_number
      );
    END LOOP;
  END LOOP;
END $$;

-- ========================================
-- STEP 6: 確認クエリ
-- ========================================

-- ポリシー一覧
SELECT 
  id,
  policy_name,
  pricing_basis,
  price_band_final,
  sample_product_price,
  weight_min_kg || '-' || weight_max_kg || 'kg' as weight_range
FROM ebay_shipping_policies_v2
ORDER BY pricing_basis DESC, sample_product_price NULLS FIRST, weight_min_kg;

-- ZONE料金サンプル（USA）
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_final,
  r.zone_code,
  ROUND(r.actual_cost_usd::numeric, 2) as actual,
  ROUND(r.first_item_shipping_usd::numeric, 2) as first,
  ROUND(r.additional_item_shipping_usd::numeric, 2) as additional
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE r.zone_code IN ('ZONE_3', 'ZONE_4')  -- USA zones
ORDER BY p.pricing_basis DESC, p.sample_product_price NULLS FIRST, p.weight_min_kg;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 配送ポリシー生成完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '作成されたポリシー:';
  RAISE NOTICE '  - DDU: 4ポリシー';
  RAISE NOTICE '  - DDP BAND_200: 4ポリシー';
  RAISE NOTICE '  - DDP BAND_350: 4ポリシー';
  RAISE NOTICE '  合計: 12ポリシー';
  RAISE NOTICE '';
  RAISE NOTICE '各ポリシーに22 ZONEの料金設定完了';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 http://localhost:3003/shipping-policy-manager で確認';
  RAISE NOTICE '';
END $$;
