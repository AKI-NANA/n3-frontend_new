-- eBayカテゴリFVF修正SQL（正しいカラム名版）

-- 1. 無効なFVFをデフォルト13.15%に設定
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE fvf IS NULL OR fvf = 0 OR fvf < 0.01;

-- 2. 主要カテゴリのFVFを正確に設定（eBay公式データ）

-- Musical Instruments > Guitars & Basses: 3.5%
UPDATE ebay_pricing_category_fees
SET fvf = 0.035
WHERE category_key LIKE '%guitar%' OR category_name LIKE '%Guitar%';

-- Musical Instruments > Other: 6.35%
UPDATE ebay_pricing_category_fees
SET fvf = 0.0635
WHERE (category_key LIKE '%musical%' OR category_name LIKE '%Musical%')
  AND category_key NOT LIKE '%guitar%';

-- Collectibles: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%collectible%' OR category_name LIKE '%Collectible%';

-- Art: 15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.15
WHERE category_key LIKE '%art%' OR category_name = 'Art';

-- Books: 14.95%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1495
WHERE category_key LIKE '%book%' OR category_name LIKE '%Book%';

-- Clothing, Shoes & Accessories: 15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.15
WHERE category_key LIKE '%cloth%' OR category_name LIKE '%Cloth%';

-- Electronics: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%electronic%' OR category_name LIKE '%Electronic%';

-- Jewelry & Watches: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%jewelry%' OR category_key LIKE '%watch%';

-- Sporting Goods: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%sport%' OR category_name LIKE '%Sport%';

-- Toys & Hobbies: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%toy%' OR category_name LIKE '%Toy%';

-- Home & Garden: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%home%' OR category_key LIKE '%garden%';

-- Cameras & Photo: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%camera%' OR category_key LIKE '%photo%';

-- Video Games: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%game%' OR category_name LIKE '%Game%';

-- Pet Supplies: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.1315
WHERE category_key LIKE '%pet%' OR category_name LIKE '%Pet%';

-- Antiques: 15%
UPDATE ebay_pricing_category_fees
SET fvf = 0.15
WHERE category_key LIKE '%antique%' OR category_name LIKE '%Antique%';

-- 3. 確認用クエリ
SELECT 
  category_key,
  category_name,
  fvf,
  ROUND(fvf * 100, 2) as fvf_percent
FROM ebay_pricing_category_fees
WHERE active = true
ORDER BY category_name;

-- 4. 統計確認
SELECT 
  ROUND(fvf * 100, 2) as fvf_percent,
  COUNT(*) as count
FROM ebay_pricing_category_fees
WHERE active = true
GROUP BY fvf
ORDER BY fvf;

-- 5. 完了メッセージ
DO $$
DECLARE
  total_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM ebay_pricing_category_fees WHERE active = true;
  SELECT COUNT(*) INTO updated_count FROM ebay_pricing_category_fees WHERE active = true AND fvf > 0;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ eBayカテゴリFVF設定完了！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '総カテゴリ数: % 件', total_count;
  RAISE NOTICE 'FVF設定済み: % 件', updated_count;
  RAISE NOTICE '';
  RAISE NOTICE '主なFVF率:';
  RAISE NOTICE '  - ギター: 3.5%%';
  RAISE NOTICE '  - 楽器その他: 6.35%%';
  RAISE NOTICE '  - コレクタブル: 13.15%%';
  RAISE NOTICE '  - アート: 15%%';
  RAISE NOTICE '  - 衣料品: 15%%';
  RAISE NOTICE '  - その他: 13.15%% (デフォルト)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 準備完了！';
  RAISE NOTICE '========================================';
END $$;
