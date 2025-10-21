-- ================================================
-- サンプル商品データを追加（テスト用）
-- ================================================

-- まず、既存の商品数を確認
SELECT COUNT(*) as total FROM products;

-- サンプル商品を5件追加
INSERT INTO products (
  item_id,
  title,
  english_title,
  sku,
  brand,
  manufacturer,
  acquired_price_jpy,
  price_jpy,
  ddp_price_usd,
  ddu_price_usd,
  price_usd,
  stock_quantity,
  condition,
  weight_g,
  length_cm,
  width_cm,
  height_cm,
  category_name,
  image_urls,
  image_count,
  html_applied,
  ready_to_list,
  -- EU責任者情報（LEGO）
  eu_responsible_company_name,
  eu_responsible_address_line1,
  eu_responsible_city,
  eu_responsible_postal_code,
  eu_responsible_country,
  eu_responsible_email,
  eu_responsible_phone,
  eu_responsible_contact_url,
  created_at,
  updated_at
) VALUES
  -- 商品1: LEGO Star Wars
  (
    'LEGO-75301',
    'レゴ スター・ウォーズ ルークのXウイング・ファイター 75301',
    'LEGO Star Wars Luke Skywalker''s X-Wing Fighter 75301',
    'LEGO-75301-2025',
    'LEGO',
    'LEGO',
    8500,
    8500,
    59.99,
    54.99,
    59.99,
    5,
    'New',
    850,
    38.0,
    26.0,
    7.0,
    'Toys & Hobbies > Building Toys > LEGO',
    ARRAY['https://via.placeholder.com/800x800?text=LEGO+X-Wing'],
    1,
    false,
    false,
    -- EU情報
    'LEGO System A/S',
    'Aastvej 1',
    'Billund',
    '7190',
    'DK',
    'consumer.service@lego.com',
    '+45 79 50 60 70',
    'https://www.lego.com/service/contact',
    NOW(),
    NOW()
  ),
  
  -- 商品2: Nintendo Switch Game
  (
    'NSW-HAC-001',
    '任天堂 スイッチ ゼルダの伝説 ティアーズ オブ ザ キングダム',
    'Nintendo Switch The Legend of Zelda: Tears of the Kingdom',
    'NSW-ZELDA-TOK-2025',
    'Nintendo',
    'Nintendo',
    6980,
    6980,
    69.99,
    64.99,
    69.99,
    10,
    'New',
    100,
    17.0,
    10.0,
    1.5,
    'Video Games > Nintendo Switch > Games',
    ARRAY['https://via.placeholder.com/800x800?text=Zelda+TOTK'],
    1,
    false,
    false,
    -- EU情報
    'Nintendo of Europe GmbH',
    'Herriotstrasse 4',
    'Frankfurt',
    '60528',
    'DE',
    'service@nintendo.de',
    '+49 69 667 770',
    'https://www.nintendo.de/kontakt',
    NOW(),
    NOW()
  ),
  
  -- 商品3: Bandai Figure
  (
    'BANDAI-FIG-001',
    'バンダイ ガンプラ RG 1/144 ガンダム',
    'Bandai Gunpla RG 1/144 Gundam Model Kit',
    'BANDAI-RG-GUNDAM-2025',
    'Bandai',
    'Bandai',
    3200,
    3200,
    34.99,
    31.99,
    34.99,
    8,
    'New',
    350,
    30.0,
    19.0,
    8.0,
    'Toys & Hobbies > Models > Gundam',
    ARRAY['https://via.placeholder.com/800x800?text=Gundam+RG'],
    1,
    false,
    false,
    -- EU情報
    'Bandai Namco Europe S.A.S',
    '49-51 Rue des Docks',
    'Lyon',
    '69258',
    'FR',
    'contact@bandainamcoent.eu',
    '+33 4 72 20 71 00',
    'https://www.bandainamcoent.eu/contact',
    NOW(),
    NOW()
  ),
  
  -- 商品4: Sony Headphones
  (
    'SONY-WH1000XM5',
    'ソニー ワイヤレスノイズキャンセリングヘッドホン WH-1000XM5',
    'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
    'SONY-WH1000XM5-BLK-2025',
    'Sony',
    'Sony',
    42000,
    42000,
    399.99,
    379.99,
    399.99,
    3,
    'New',
    250,
    21.0,
    19.0,
    8.0,
    'Electronics > Headphones > Over-Ear',
    ARRAY['https://via.placeholder.com/800x800?text=Sony+WH1000XM5'],
    1,
    false,
    false,
    -- EU情報
    'Sony Europe B.V.',
    'Da Vincilaan 7-D1',
    'Amsterdam',
    '1930 AA',
    'NL',
    'info@sony.eu',
    '+31 20 658 5900',
    'https://www.sony.eu/support/contact',
    NOW(),
    NOW()
  ),
  
  -- 商品5: Hasbro Transformer
  (
    'HASBRO-TF-001',
    'ハズブロ トランスフォーマー オプティマスプライム',
    'Hasbro Transformers Optimus Prime Action Figure',
    'HASBRO-TF-OPTIMUS-2025',
    'Hasbro',
    'Hasbro',
    5600,
    5600,
    54.99,
    49.99,
    54.99,
    6,
    'New',
    600,
    35.0,
    25.0,
    10.0,
    'Toys & Hobbies > Action Figures > Transformers',
    ARRAY['https://via.placeholder.com/800x800?text=Optimus+Prime'],
    1,
    false,
    false,
    -- EU情報
    'Hasbro Europe Trading B.V.',
    'Industrialaan 1',
    'Amsterdam',
    '1702 BH',
    'NL',
    'consumercare@hasbro.com',
    '+31 20 654 2222',
    'https://corporate.hasbro.com/contact',
    NOW(),
    NOW()
  )
ON CONFLICT (sku) DO UPDATE SET
  eu_responsible_company_name = EXCLUDED.eu_responsible_company_name,
  eu_responsible_address_line1 = EXCLUDED.eu_responsible_address_line1,
  eu_responsible_city = EXCLUDED.eu_responsible_city,
  eu_responsible_postal_code = EXCLUDED.eu_responsible_postal_code,
  eu_responsible_country = EXCLUDED.eu_responsible_country,
  eu_responsible_email = EXCLUDED.eu_responsible_email,
  eu_responsible_phone = EXCLUDED.eu_responsible_phone,
  eu_responsible_contact_url = EXCLUDED.eu_responsible_contact_url,
  updated_at = NOW();

-- 結果を確認
SELECT 
  id,
  title,
  sku,
  brand,
  price_usd,
  eu_responsible_company_name,
  eu_responsible_country,
  created_at
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- 統計
SELECT 
  COUNT(*) as total_products,
  COUNT(eu_responsible_company_name) as with_eu_info,
  COUNT(*) - COUNT(eu_responsible_company_name) as without_eu_info
FROM products;
