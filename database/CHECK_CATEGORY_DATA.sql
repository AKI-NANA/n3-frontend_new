-- ebay_pricing_category_feesテーブルのサンプルデータを確認
SELECT 
  category_key,
  category_name,
  category_path,
  fvf,
  insertion_fee
FROM ebay_pricing_category_fees
ORDER BY category_name
LIMIT 20;

-- カテゴリ名の分布を確認
SELECT 
  DISTINCT category_name,
  COUNT(*) as count
FROM ebay_pricing_category_fees
GROUP BY category_name
ORDER BY count DESC
LIMIT 50;
