-- データ確認用クエリ

-- 1. 全重量帯を確認
SELECT DISTINCT 
  weight_min_kg, 
  weight_max_kg, 
  weight_band_name,
  COUNT(*) as レコード数
FROM usa_ddp_rates
GROUP BY weight_min_kg, weight_max_kg, weight_band_name
ORDER BY weight_min_kg;

-- 2. 0.5kgの重量帯を検索（現在のロジック）
SELECT *
FROM usa_ddp_rates
WHERE weight_min_kg <= 0.5
  AND weight_max_kg > 0.5
LIMIT 5;

-- 3. 全レコード確認
SELECT COUNT(*) as 総レコード数 FROM usa_ddp_rates;
