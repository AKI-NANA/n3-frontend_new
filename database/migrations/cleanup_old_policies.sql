-- database/migrations/cleanup_old_policies.sql
/**
 * 古い配送ポリシーを削除して整理
 * 
 * 【削除対象】
 * - policy_number（旧システム）
 * - price_band, price_band_new（中間バージョン）
 * 
 * 【残すもの】
 * - price_band_final（最終版）
 * - 正しいDDP/DDU設定
 */

-- ========================================
-- STEP 1: 古いポリシーを無効化
-- ========================================

-- policy_numberを持つ古いポリシー
UPDATE ebay_shipping_policies_v2
SET active = false
WHERE policy_number IS NOT NULL
  AND active = true;

-- price_bandやprice_band_newを使っている古いポリシー
UPDATE ebay_shipping_policies_v2
SET active = false
WHERE (price_band IS NOT NULL OR price_band_new IS NOT NULL)
  AND price_band_final IS NULL
  AND active = true;

-- ========================================
-- STEP 2: 最終版のみをアクティブに
-- ========================================

-- DDPで正しい価格帯を持つポリシー
UPDATE ebay_shipping_policies_v2
SET active = true
WHERE pricing_basis = 'DDP'
  AND price_band_final IN ('BAND_200', 'BAND_350')
  AND policy_name LIKE '%DDP%';

-- DDUポリシー（価格帯なし）
UPDATE ebay_shipping_policies_v2
SET active = true
WHERE pricing_basis = 'DDU'
  AND price_band_final IS NULL
  AND policy_name LIKE '%DDU%';

-- ========================================
-- STEP 3: 確認
-- ========================================

-- アクティブなポリシーのサマリー
SELECT 
  pricing_basis,
  price_band_final,
  sample_product_price,
  COUNT(*) as count,
  STRING_AGG(DISTINCT policy_name, ', ' ORDER BY policy_name) as policy_names
FROM ebay_shipping_policies_v2
WHERE active = true
GROUP BY pricing_basis, price_band_final, sample_product_price
ORDER BY 
  CASE pricing_basis WHEN 'DDP' THEN 1 ELSE 2 END,
  sample_product_price NULLS LAST;

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
  sample_product_price NULLS LAST,
  weight_min_kg;

-- 無効化されたポリシー数
SELECT 
  pricing_basis,
  COUNT(*) as disabled_count
FROM ebay_shipping_policies_v2
WHERE active = false
GROUP BY pricing_basis;

-- ========================================
-- STEP 4: 古いカラムを削除（オプション）
-- ========================================

-- 注意: 削除する前に必ずバックアップを取ること
-- ALTER TABLE ebay_shipping_policies_v2 DROP COLUMN IF EXISTS policy_number;
-- ALTER TABLE ebay_shipping_policies_v2 DROP COLUMN IF EXISTS price_band;
-- ALTER TABLE ebay_shipping_policies_v2 DROP COLUMN IF EXISTS price_band_new;

-- ========================================
-- STEP 5: ポリシー名をクリーンアップ（オプション）
-- ========================================

-- ポリシー名を統一形式に変更
UPDATE ebay_shipping_policies_v2
SET policy_name = CASE
  WHEN pricing_basis = 'DDP' AND price_band_final = 'BAND_200' THEN
    CASE 
      WHEN weight_min_kg = 0.5 THEN 'DDP_Light_0.5-2kg_' || id
      WHEN weight_min_kg = 2.0 THEN 'DDP_Small_2-5kg_' || id
      WHEN weight_min_kg = 5.0 THEN 'DDP_Medium_5-10kg_' || id
      WHEN weight_min_kg = 10.0 THEN 'DDP_Large_10-20kg_' || id
      ELSE policy_name
    END || '_B200'
  WHEN pricing_basis = 'DDP' AND price_band_final = 'BAND_350' THEN
    CASE 
      WHEN weight_min_kg = 0.5 THEN 'DDP_Light_0.5-2kg_' || id
      WHEN weight_min_kg = 2.0 THEN 'DDP_Small_2-5kg_' || id
      WHEN weight_min_kg = 5.0 THEN 'DDP_Medium_5-10kg_' || id
      WHEN weight_min_kg = 10.0 THEN 'DDP_Large_10-20kg_' || id
      ELSE policy_name
    END || '_B350'
  WHEN pricing_basis = 'DDU' THEN
    CASE 
      WHEN weight_min_kg = 0.5 THEN 'DDU_Light_0.5-2kg_' || id
      WHEN weight_min_kg = 2.0 THEN 'DDU_Small_2-5kg_' || id
      WHEN weight_min_kg = 5.0 THEN 'DDU_Medium_5-10kg_' || id
      WHEN weight_min_kg = 10.0 THEN 'DDU_Large_10-20kg_' || id
      ELSE policy_name
    END
  ELSE policy_name
END
WHERE active = true;

-- コメント
COMMENT ON TABLE ebay_shipping_policies_v2 IS '配送ポリシーマスタ（最終版）: DDP（$150-450の2価格帯）、DDU（全価格）';

DO $$
BEGIN
  RAISE NOTICE '✅ 古いポリシーを整理しました';
  RAISE NOTICE 'アクティブ: 最新のDDP/DDUポリシーのみ';
  RAISE NOTICE 'DDP: BAND_200 ($150-250), BAND_350 ($250-450)';
  RAISE NOTICE 'DDU: 価格帯なし';
END $$;
