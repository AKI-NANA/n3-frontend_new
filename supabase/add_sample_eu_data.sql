-- ====================================
-- 既存商品にEU責任者情報を追加（テスト用）
-- ====================================

-- まず、既存の商品を確認
SELECT 
  id,
  title,
  sku,
  brand,
  manufacturer,
  eu_responsible_company_name
FROM products
LIMIT 10;

-- サンプル: 最初の商品にLEGOのEU情報を追加
UPDATE products
SET 
  eu_responsible_company_name = 'LEGO System A/S',
  eu_responsible_address_line1 = 'Aastvej 1',
  eu_responsible_address_line2 = NULL,
  eu_responsible_city = 'Billund',
  eu_responsible_state_or_province = NULL,
  eu_responsible_postal_code = '7190',
  eu_responsible_country = 'DK',
  eu_responsible_email = 'consumer.service@lego.com',
  eu_responsible_phone = '+45 79 50 60 70',
  eu_responsible_contact_url = 'https://www.lego.com/service/contact',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM products 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- サンプル: 次の商品にNintendoのEU情報を追加
UPDATE products
SET 
  eu_responsible_company_name = 'Nintendo of Europe GmbH',
  eu_responsible_address_line1 = 'Herriotstrasse 4',
  eu_responsible_address_line2 = NULL,
  eu_responsible_city = 'Frankfurt',
  eu_responsible_state_or_province = NULL,
  eu_responsible_postal_code = '60528',
  eu_responsible_country = 'DE',
  eu_responsible_email = 'service@nintendo.de',
  eu_responsible_phone = '+49 69 667 770',
  eu_responsible_contact_url = 'https://www.nintendo.de/kontakt',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM products 
  ORDER BY created_at DESC 
  LIMIT 1 OFFSET 1
);

-- サンプル: 3番目の商品にBandaiのEU情報を追加
UPDATE products
SET 
  eu_responsible_company_name = 'Bandai Namco Europe S.A.S',
  eu_responsible_address_line1 = '49-51 Rue des Docks',
  eu_responsible_address_line2 = NULL,
  eu_responsible_city = 'Lyon',
  eu_responsible_state_or_province = NULL,
  eu_responsible_postal_code = '69258',
  eu_responsible_country = 'FR',
  eu_responsible_email = 'contact@bandainamcoent.eu',
  eu_responsible_phone = '+33 4 72 20 71 00',
  eu_responsible_contact_url = 'https://www.bandainamcoent.eu/contact',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM products 
  ORDER BY created_at DESC 
  LIMIT 1 OFFSET 2
);

-- サンプル: 4番目の商品にSonyのEU情報を追加
UPDATE products
SET 
  eu_responsible_company_name = 'Sony Europe B.V.',
  eu_responsible_address_line1 = 'Da Vincilaan 7-D1',
  eu_responsible_address_line2 = NULL,
  eu_responsible_city = 'Amsterdam',
  eu_responsible_state_or_province = NULL,
  eu_responsible_postal_code = '1930 AA',
  eu_responsible_country = 'NL',
  eu_responsible_email = 'info@sony.eu',
  eu_responsible_phone = '+31 20 658 5900',
  eu_responsible_contact_url = 'https://www.sony.eu/support/contact',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM products 
  ORDER BY created_at DESC 
  LIMIT 1 OFFSET 3
);

-- サンプル: 5番目の商品にHasbroのEU情報を追加
UPDATE products
SET 
  eu_responsible_company_name = 'Hasbro Europe Trading B.V.',
  eu_responsible_address_line1 = 'Industrialaan 1',
  eu_responsible_address_line2 = NULL,
  eu_responsible_city = 'Amsterdam',
  eu_responsible_state_or_province = NULL,
  eu_responsible_postal_code = '1702 BH',
  eu_responsible_country = 'NL',
  eu_responsible_email = 'consumercare@hasbro.com',
  eu_responsible_phone = '+31 20 654 2222',
  eu_responsible_contact_url = 'https://corporate.hasbro.com/contact',
  updated_at = NOW()
WHERE id IN (
  SELECT id FROM products 
  ORDER BY created_at DESC 
  LIMIT 1 OFFSET 4
);

-- 更新結果を確認
SELECT 
  id,
  title,
  sku,
  eu_responsible_company_name,
  eu_responsible_city,
  eu_responsible_country,
  eu_responsible_email,
  updated_at
FROM products
WHERE eu_responsible_company_name IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- 統計情報
SELECT 
  COUNT(*) as total_products,
  COUNT(eu_responsible_company_name) as with_eu_info,
  COUNT(*) - COUNT(eu_responsible_company_name) as without_eu_info,
  ROUND(100.0 * COUNT(eu_responsible_company_name) / COUNT(*), 2) as eu_coverage_percent
FROM products;
