-- 商品データの確認
SELECT 
  COUNT(*) as total_products
FROM products;

-- 最近追加された商品を確認
SELECT 
  id,
  title,
  sku,
  created_at,
  updated_at
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- EU情報がある商品を確認
SELECT 
  id,
  title,
  sku,
  eu_responsible_company_name,
  eu_responsible_city,
  eu_responsible_country
FROM products
WHERE eu_responsible_company_name IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
