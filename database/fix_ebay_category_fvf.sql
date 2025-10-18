-- eBayカテゴリFVF修正SQL

-- 1. 既存の無効なFVFを修正
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315  -- デフォルト13.15%
WHERE fvf_rate IS NULL OR fvf_rate = 0;

-- 2. 主要カテゴリのFVFを正確に設定

-- Musical Instruments > Guitars & Basses: 3.5%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.035
WHERE category_key LIKE '%guitar%' OR category_name LIKE '%Guitar%';

-- Musical Instruments > Other: 6.35%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.0635
WHERE category_key LIKE '%musical%' AND category_key NOT LIKE '%guitar%';

-- Antiques: 15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.15
WHERE category_key LIKE '%antique%' OR category_name LIKE '%Antique%';

-- Collectibles: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%collectible%' OR category_name LIKE '%Collectible%';

-- Art: 15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.15
WHERE category_key LIKE '%art%' OR category_name = 'Art';

-- Books: 14.95%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1495
WHERE category_key LIKE '%book%' OR category_name LIKE '%Book%';

-- Clothing: 15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.15
WHERE category_key LIKE '%cloth%' OR category_name LIKE '%Cloth%';

-- Electronics: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%electronic%' OR category_name LIKE '%Electronic%';

-- Jewelry & Watches: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%jewelry%' OR category_key LIKE '%watch%';

-- Sporting Goods: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%sport%' OR category_name LIKE '%Sport%';

-- Toys & Hobbies: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%toy%' OR category_name LIKE '%Toy%';

-- Home & Garden: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%home%' OR category_key LIKE '%garden%';

-- Cameras & Photo: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%camera%' OR category_key LIKE '%photo%';

-- Video Games: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%game%' OR category_name LIKE '%Game%';

-- Pet Supplies: 13.15%
UPDATE ebay_pricing_category_fees
SET fvf_rate = 0.1315
WHERE category_key LIKE '%pet%' OR category_name LIKE '%Pet%';

-- 3. 確認用クエリ
SELECT 
  category_key,
  category_name,
  fvf_rate,
  ROUND(fvf_rate * 100, 2) as fvf_percent
FROM ebay_pricing_category_fees
WHERE active = true
ORDER BY category_name;

-- 4. 統計確認
SELECT 
  ROUND(fvf_rate * 100, 2) as fvf_percent,
  COUNT(*) as count
FROM ebay_pricing_category_fees
WHERE active = true
GROUP BY fvf_rate
ORDER BY fvf_rate;
