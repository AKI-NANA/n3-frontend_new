-- database/migrations/cleanup_old_policies_fixed.sql
/**
 * 古い配送ポリシーを削除して整理（修正版）
 * 存在しないカラムのチェックを追加
 */

-- ========================================
-- STEP 1: 古いポリシーを無効化
-- ========================================

-- policy_numberを持つ古いポリシー（存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ebay_shipping_policies_v2' 
    AND column_name = 'policy_number'
  ) THEN
    UPDATE ebay_shipping_policies_v2
    SET active = false
    WHERE policy_number IS NOT NULL
      AND active = true;
    RAISE NOTICE '✓ policy_numberを持つポリシーを無効化';
  END IF;
END $$;

-- price_band_newがあるが、price_band_finalがないポリシー
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ebay_shipping_policies_v2' 
    AND column_name = 'price_band_new'
  ) THEN
    UPDATE ebay_shipping_policies_v2
    SET active = false
    WHERE price_band_new IS NOT NULL
      AND price_band_final IS NULL
      AND active = true;
    RAISE NOTICE '✓ price_band_newを持つ古いポリシーを無効化';
  END IF;
END $$;

-- ========================================
-- STEP 2: 最終版のみをアクティブに
-- ========================================

-- DDPで正しい価格帯を持つポリシー
UPDATE ebay_shipping_policies_v2
SET active = true
WHERE pricing_basis = 'DDP'
  AND price_band_final IN ('BAND_200', 'BAND_350');

-- DDUポリシー（価格帯なし）
UPDATE ebay_shipping_policies_v2
SET active = true
WHERE pricing_basis = 'DDU'
  AND (price_band_final IS NULL OR price_band_final = '');

-- ========================================
-- STEP 3: 重複を削除（同じ条件のポリシーが複数ある場合）
-- ========================================

-- 各条件で最初の1つだけを残す
WITH ranked_policies AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY pricing_basis, price_band_final, weight_min_kg, weight_max_kg 
      ORDER BY id
    ) as rn
  FROM ebay_shipping_policies_v2
  WHERE active = true
)
UPDATE ebay_shipping_policies_v2 p
SET active = false
FROM ranked_policies rp
WHERE p.id = rp.id 
  AND rp.rn > 1;

-- ========================================
-- STEP 4: 確認クエリ
-- ========================================

-- アクティブなポリシーのサマリー
SELECT 
  pricing_basis,
  price_band_final,
  sample_product_price,
  weight_min_kg || '-' || weight_max_kg as weight,
  COUNT(*) as count
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_final, sample_product_price, weight_min_kg, weight_max_kg
ORDER BY 
  CASE pricing_basis WHEN 'DDP' THEN 1 ELSE 2 END,
  sample_product_price NULLS LAST,
  weight_min_kg;

-- 詳細リスト
SELECT 
  id,
  policy_name,
  pricing_basis,
  price_band_final,
  sample_product_price,
  weight_min_kg || '-' || weight_max_kg as weight_range,
  active
FROM ebay_shipping_policies_v2
WHERE active = true
ORDER BY 
  pricing_basis DESC,
  COALESCE(sample_product_price, 0),
  weight_min_kg;

-- 各価格帯・重量帯の組み合わせ数
SELECT 
  pricing_basis,
  price_band_final,
  CASE 
    WHEN weight_min_kg = 0.5 THEN 'Light (0.5-2kg)'
    WHEN weight_min_kg = 2.0 THEN 'Small (2-5kg)'
    WHEN weight_min_kg = 5.0 THEN 'Medium (5-10kg)'
    WHEN weight_min_kg = 10.0 THEN 'Large (10-20kg)'
    ELSE 'Other'
  END as weight_class,
  COUNT(*) as policies
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_final, weight_min_kg
ORDER BY 
  pricing_basis DESC,
  price_band_final NULLS LAST,
  weight_min_kg;

-- 無効化されたポリシー数
SELECT 
  'Disabled' as status,
  pricing_basis,
  COUNT(*) as count
FROM ebay_shipping_policies_v2
WHERE active = false
GROUP BY pricing_basis
UNION ALL
SELECT 
  'Active' as status,
  pricing_basis,
  COUNT(*) as count
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis
ORDER BY status DESC, pricing_basis DESC;

-- ========================================
-- STEP 5: ZONE別送料の確認
-- ========================================

-- 各アクティブポリシーのUSA送料
SELECT 
  p.policy_name,
  p.pricing_basis,
  p.price_band_final,
  p.weight_min_kg || '-' || p.weight_max_kg as weight,
  r.zone_code,
  ROUND(r.first_item_shipping_usd, 2) as first_item,
  ROUND(r.additional_item_shipping_usd, 2) as additional
FROM ebay_shipping_policies_v2 p
JOIN ebay_policy_zone_rates_v2 r ON r.policy_id = p.id
WHERE p.active = true
  AND r.zone_code = 'US'
ORDER BY 
  p.pricing_basis DESC,
  p.price_band_final NULLS LAST,
  p.weight_min_kg
LIMIT 20;

-- コメント
COMMENT ON COLUMN ebay_shipping_policies_v2.price_band_final IS 'DDP用価格帯: BAND_200 ($150-250), BAND_350 ($250-450)';

DO $$
DECLARE
  active_ddp_count INTEGER;
  active_ddu_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_ddp_count FROM ebay_shipping_policies_v2 WHERE active = true AND pricing_basis = 'DDP';
  SELECT COUNT(*) INTO active_ddu_count FROM ebay_shipping_policies_v2 WHERE active = true AND pricing_basis = 'DDU';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ポリシー整理完了';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'アクティブなDDPポリシー: %', active_ddp_count;
  RAISE NOTICE 'アクティブなDDUポリシー: %', active_ddu_count;
  RAISE NOTICE '';
  RAISE NOTICE '【DDP】$150-450の2価格帯';
  RAISE NOTICE '  BAND_200: $150-250';
  RAISE NOTICE '  BAND_350: $250-450';
  RAISE NOTICE '';
  RAISE NOTICE '【DDU】全価格対応';
  RAISE NOTICE '========================================';
END $$;
