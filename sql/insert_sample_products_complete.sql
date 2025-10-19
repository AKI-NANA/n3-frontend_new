-- サンプル商品データを追加（全カラム完全版）
-- カラム追加後に実行してください

-- 1. Nintendo Switch（全フィルターOK、AI高評価）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count
) VALUES (
  'YAH-SAMPLE-001', 'NSW-001', 
  'Nintendo Switch 有機ELモデル ホワイト 新品未開封',
  'Nintendo Switch OLED Model White New Sealed',
  35800, 299.00, 89.50, 42.3,
  '{"images": ["https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=400&h=300&fit=crop"], "condition": "新品", "category": "ゲーム機本体", "shipping": "ゆうパック"}'::jsonb,
  'active', 5,
  true, true, true,
  92, 'pending', 'OK',
  285.00, 310.00, 15
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  price_jpy = EXCLUDED.price_jpy,
  price_usd = EXCLUDED.price_usd,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score;

-- 2. Canon Camera（全フィルターOK、AI高評価）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count
) VALUES (
  'YAH-SAMPLE-002', 'CAM-001',
  'Canon EOS R5 ミラーレス一眼 ボディのみ 美品',
  'Canon EOS R5 Mirrorless Camera Body Only Excellent',
  458000, 3199.00, 580.00, 22.1,
  '{"images": ["https://images.unsplash.com/photo-1606816321032-f1a6eeee4787?w=400&h=300&fit=crop"], "condition": "中古美品", "category": "カメラ本体", "shipping": "ゆうパック"}'::jsonb,
  'active', 2,
  true, true, true,
  88, 'pending', 'OK',
  3099.00, 3250.00, 8
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 3. Apple Watch（特許フィルターNG、AI中評価）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count
) VALUES (
  'YAH-SAMPLE-003', 'APW-001',
  'Apple Watch Series 9 GPS 45mm スターライト',
  'Apple Watch Series 9 GPS 45mm Starlight',
  52800, 399.00, 95.00, 31.2,
  '{"images": ["https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=300&fit=crop"], "condition": "新品", "category": "スマートウォッチ", "shipping": "クリックポスト"}'::jsonb,
  'active', 3,
  true, false, true,
  65, 'pending', 'PENDING',
  389.00, 420.00, 25
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 4. MacBook Pro（全フィルターOK、AI中評価）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count
) VALUES (
  'YAH-SAMPLE-004', 'MBP-001',
  'MacBook Pro 14インチ M3 Pro 512GB スペースブラック',
  'MacBook Pro 14-inch M3 Pro 512GB Space Black',
  298000, 2299.00, 450.00, 24.3,
  '{"images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop"], "condition": "新品", "category": "ノートPC", "shipping": "ゆうパック"}'::jsonb,
  'active', 1,
  true, true, true,
  78, 'pending', 'OK',
  2199.00, 2350.00, 12
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 5. Sony Headphones（全フィルターOK、承認済み）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count,
  approved_at, approved_by
) VALUES (
  'YAH-SAMPLE-005', 'SHP-001',
  'SONY WH-1000XM5 ワイヤレスヘッドホン ブラック',
  'SONY WH-1000XM5 Wireless Headphones Black',
  42800, 329.00, 78.00, 31.0,
  '{"images": ["https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=300&fit=crop"], "condition": "新品", "category": "オーディオ", "shipping": "ゆうパック"}'::jsonb,
  'active', 8,
  true, true, true,
  90, 'approved', 'OK',
  319.00, 340.00, 30,
  NOW(), 'admin'
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  approval_status = EXCLUDED.approval_status,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 6. DJI Drone（全フィルターOK、AI高評価）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count
) VALUES (
  'YAH-SAMPLE-006', 'DJI-001',
  'DJI Mini 4 Pro Fly More コンボ',
  'DJI Mini 4 Pro Fly More Combo',
  128000, 999.00, 215.00, 27.4,
  '{"images": ["https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop"], "condition": "新品", "category": "ドローン", "shipping": "ゆうパック"}'::jsonb,
  'active', 4,
  true, true, true,
  82, 'pending', 'OK',
  949.00, 1050.00, 18
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 7. PlayStation 5（全フィルターOK、承認済み）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count,
  approved_at, approved_by
) VALUES (
  'YAH-SAMPLE-007', 'PS5-001',
  'PlayStation 5 デジタルエディション 新品未開封',
  'PlayStation 5 Digital Edition New Sealed',
  49800, 449.00, 125.00, 38.5,
  '{"images": ["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop"], "condition": "新品", "category": "ゲーム機本体", "shipping": "ゆうパック"}'::jsonb,
  'active', 6,
  true, true, true,
  95, 'approved', 'OK',
  439.00, 460.00, 22,
  NOW(), 'admin'
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  approval_status = EXCLUDED.approval_status,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 8. Nikon Lens（モールフィルターNG、AI低評価）
INSERT INTO yahoo_scraped_products (
  source_item_id, sku, title, english_title,
  price_jpy, price_usd, profit_amount_usd, profit_margin,
  scraped_data, status, current_stock,
  export_filter_status, patent_filter_status, mall_filter_status,
  ai_confidence_score, approval_status, final_judgment,
  sm_lowest_price, sm_average_price, sm_competitor_count
) VALUES (
  'YAH-SAMPLE-008', 'NIK-001',
  'Nikon Z 24-70mm f/2.8 S 美品 動作確認済み',
  'Nikon Z 24-70mm f/2.8 S Excellent Condition Tested',
  258000, 1899.00, 320.00, 20.2,
  '{"images": ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop"], "condition": "中古美品", "category": "カメラレンズ", "shipping": "ゆうパック"}'::jsonb,
  'active', 2,
  true, true, false,
  45, 'pending', 'NG',
  1849.00, 1950.00, 10
) ON CONFLICT (source_item_id) DO UPDATE SET
  scraped_data = EXCLUDED.scraped_data,
  export_filter_status = EXCLUDED.export_filter_status,
  patent_filter_status = EXCLUDED.patent_filter_status,
  mall_filter_status = EXCLUDED.mall_filter_status,
  ai_confidence_score = EXCLUDED.ai_confidence_score,
  profit_amount_usd = EXCLUDED.profit_amount_usd,
  profit_margin = EXCLUDED.profit_margin;

-- 完了メッセージ
SELECT '✅ サンプルデータ追加完了: 8件の商品（画像・フィルター・AI判定含む）' as message;
