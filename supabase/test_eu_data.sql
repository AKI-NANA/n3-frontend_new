-- 既存の商品データを確認
SELECT 
  id,
  title,
  sku,
  item_id,
  brand,
  eu_responsible_company_name,
  eu_responsible_address_line1,
  eu_responsible_city
FROM products
LIMIT 5;
