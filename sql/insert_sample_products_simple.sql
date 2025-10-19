-- サンプル商品データを追加（画像URL付き・シンプル版）
-- 既存のyahoo_scraped_productsテーブルの基本カラムのみを使用

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, 
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-001', 'NSW-001', 
  'Nintendo Switch 有機ELモデル ホワイト 新品未開封',
  'Nintendo Switch OLED Model White New Sealed',
  35800, 299.00,
  '{"images": ["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=300&fit=crop"], "condition": "新品", "category": "ゲーム機本体", "shipping": "ゆうパック"}'::jsonb,
  'active', 5
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  price_jpy = EXCLUDED.price_jpy,
  price_usd = EXCLUDED.price_usd;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-002', 'CAM-001',
  'Canon EOS R5 ミラーレス一眼 ボディのみ 美品',
  'Canon EOS R5 Mirrorless Camera Body Only Excellent',
  458000, 3199.00,
  '{"images": ["https://images.unsplash.com/photo-1606816321032-f1a6eeee4787?w=400&h=300&fit=crop"], "condition": "中古美品", "category": "カメラ本体", "shipping": "ゆうパック"}'::jsonb,
  'active', 2
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-003', 'APW-001',
  'Apple Watch Series 9 GPS 45mm スターライト',
  'Apple Watch Series 9 GPS 45mm Starlight',
  52800, 399.00,
  '{"images": ["https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=300&fit=crop"], "condition": "新品", "category": "スマートウォッチ", "shipping": "クリックポスト"}'::jsonb,
  'active', 3
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-004', 'MBP-001',
  'MacBook Pro 14インチ M3 Pro 512GB スペースブラック',
  'MacBook Pro 14-inch M3 Pro 512GB Space Black',
  298000, 2299.00,
  '{"images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop"], "condition": "新品", "category": "ノートPC", "shipping": "ゆうパック"}'::jsonb,
  'active', 1
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-005', 'SHP-001',
  'SONY WH-1000XM5 ワイヤレスヘッドホン ブラック',
  'SONY WH-1000XM5 Wireless Headphones Black',
  42800, 329.00,
  '{"images": ["https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=300&fit=crop"], "condition": "新品", "category": "オーディオ", "shipping": "ゆうパック"}'::jsonb,
  'active', 8
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-006', 'DJI-001',
  'DJI Mini 4 Pro Fly More コンボ',
  'DJI Mini 4 Pro Fly More Combo',
  128000, 999.00,
  '{"images": ["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop"], "condition": "新品", "category": "ドローン", "shipping": "ゆうパック"}'::jsonb,
  'active', 4
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-007', 'PS5-001',
  'PlayStation 5 デジタルエディション 新品未開封',
  'PlayStation 5 Digital Edition New Sealed',
  49800, 449.00,
  '{"images": ["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop"], "condition": "新品", "category": "ゲーム機本体", "shipping": "ゆうパック"}'::jsonb,
  'active', 6
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd,
  scraped_data,
  status, current_stock
) VALUES 
(
  'YAH-SAMPLE-008', 'NIK-001',
  'Nikon Z 24-70mm f/2.8 S 美品 動作確認済み',
  'Nikon Z 24-70mm f/2.8 S Excellent Condition Tested',
  258000, 1899.00,
  '{"images": ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop"], "condition": "中古美品", "category": "カメラレンズ", "shipping": "ゆうパック"}'::jsonb,
  'active', 2
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data;

-- 利益データがあるカラムが存在する場合は更新
UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 89.50,
  profit_margin = 42.3
WHERE source_item_id = 'YAH-SAMPLE-001';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 580.00,
  profit_margin = 22.1
WHERE source_item_id = 'YAH-SAMPLE-002';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 95.00,
  profit_margin = 31.2
WHERE source_item_id = 'YAH-SAMPLE-003';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 450.00,
  profit_margin = 24.3
WHERE source_item_id = 'YAH-SAMPLE-004';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 78.00,
  profit_margin = 31.0
WHERE source_item_id = 'YAH-SAMPLE-005';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 215.00,
  profit_margin = 27.4
WHERE source_item_id = 'YAH-SAMPLE-006';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 125.00,
  profit_margin = 38.5
WHERE source_item_id = 'YAH-SAMPLE-007';

UPDATE yahoo_scraped_products 
SET 
  profit_amount_usd = 320.00,
  profit_margin = 20.2
WHERE source_item_id = 'YAH-SAMPLE-008';
