-- ============================================
-- 配送ポリシー完全版
-- DDP/DDU × 重量帯 × 価格帯 の完全マトリクス
-- ============================================

-- 既存の不完全なデータを削除
DELETE FROM ebay_policy_zone_rates_v2;
DELETE FROM ebay_shipping_policies_v2;

-- シーケンスをリセット
ALTER SEQUENCE ebay_shipping_policies_v2_id_seq RESTART WITH 1;

-- ============================================
-- 通常価格帯 - DDP (関税込み)
-- ============================================

-- Light DDP (0.5-2kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Light_DDP_0.5-2kg',
  'DDP shipping for light items (0.5-2kg) with duties included',
  'EBAY_US',
  10,
  true,
  true,
  'Light',
  0.5,
  2.0,
  'Standard'
);

-- Small DDP (2-5kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Small_DDP_2-5kg',
  'DDP shipping for small items (2-5kg) with duties included',
  'EBAY_US',
  10,
  true,
  true,
  'Small',
  2.0,
  5.0,
  'Standard'
);

-- Medium DDP (5-10kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Medium_DDP_5-10kg',
  'DDP shipping for medium items (5-10kg) with duties included',
  'EBAY_US',
  10,
  true,
  true,
  'Medium',
  5.0,
  10.0,
  'Standard'
);

-- Heavy DDP (10-20kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Heavy_DDP_10-20kg',
  'DDP shipping for heavy items (10-20kg) with duties included',
  'EBAY_US',
  10,
  true,
  true,
  'Heavy',
  10.0,
  20.0,
  'Standard'
);

-- ============================================
-- 通常価格帯 - DDU (関税別)
-- ============================================

-- Light DDU (0.5-2kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Light_DDU_0.5-2kg',
  'DDU shipping for light items (0.5-2kg) without duties',
  'EBAY_US',
  10,
  false,
  true,
  'Light',
  0.5,
  2.0,
  'Standard'
);

-- Small DDU (2-5kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Small_DDU_2-5kg',
  'DDU shipping for small items (2-5kg) without duties',
  'EBAY_US',
  10,
  false,
  true,
  'Small',
  2.0,
  5.0,
  'Standard'
);

-- Medium DDU (5-10kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Medium_DDU_5-10kg',
  'DDU shipping for medium items (5-10kg) without duties',
  'EBAY_US',
  10,
  false,
  true,
  'Medium',
  5.0,
  10.0,
  'Standard'
);

-- Heavy DDU (10-20kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Heavy_DDU_10-20kg',
  'DDU shipping for heavy items (10-20kg) without duties',
  'EBAY_US',
  10,
  false,
  true,
  'Heavy',
  10.0,
  20.0,
  'Standard'
);

-- ============================================
-- 高額価格帯 - DDU (関税別) ※高額商品は関税を購入者負担にする
-- ============================================

-- Light DDU High Value (0.5-2kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Light_DDU_HighValue_0.5-2kg',
  'DDU shipping for high-value light items (0.5-2kg)',
  'EBAY_US',
  10,
  false,
  true,
  'Light',
  0.5,
  2.0,
  'HighValue'
);

-- Small DDU High Value (2-5kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Small_DDU_HighValue_2-5kg',
  'DDU shipping for high-value small items (2-5kg)',
  'EBAY_US',
  10,
  false,
  true,
  'Small',
  2.0,
  5.0,
  'HighValue'
);

-- Medium DDU High Value (5-10kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Medium_DDU_HighValue_5-10kg',
  'DDU shipping for high-value medium items (5-10kg)',
  'EBAY_US',
  10,
  false,
  true,
  'Medium',
  5.0,
  10.0,
  'HighValue'
);

-- Heavy DDU High Value (10-20kg)
INSERT INTO ebay_shipping_policies_v2 (
  policy_name, description, marketplace_id, 
  handling_time_days, is_ddp, is_active,
  weight_category, weight_min_kg, weight_max_kg,
  price_range_category
) VALUES (
  'Heavy_DDU_HighValue_10-20kg',
  'DDU shipping for high-value heavy items (10-20kg)',
  'EBAY_US',
  10,
  false,
  true,
  'Heavy',
  10.0,
  20.0,
  'HighValue'
);

-- ============================================
-- 合計: 12ポリシー
-- - DDP (通常): 4件
-- - DDU (通常): 4件  
-- - DDU (高額): 4件
-- ============================================
