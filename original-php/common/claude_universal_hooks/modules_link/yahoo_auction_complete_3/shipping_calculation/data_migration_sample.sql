-- ====================================
-- 既存データ移行・サンプルデータ投入
-- ====================================

-- 1. 送料サービス登録（PDFから抽出）
INSERT INTO shipping_services (
    carrier_name, service_name, service_code, 
    max_weight_kg, max_length_cm, max_width_cm, max_height_cm, max_girth_cm,
    tracking_available, insurance_available,
    estimated_delivery_days_min, estimated_delivery_days_max
) VALUES
-- eLogi FedEx サービス
('eLogi', 'FedEx International Economy', 'ELOGI_FEDEX_IE', 68.0, 274.0, 120.0, 120.0, 330.0, TRUE, TRUE, 3, 5),
('eLogi', 'FedEx International Priority', 'ELOGI_FEDEX_IP', 68.0, 274.0, 120.0, 120.0, 330.0, TRUE, TRUE, 2, 4),

-- cpass eBay SpeedPAK
('cpass', 'eBay SpeedPAK Standard', 'CPASS_SPEEDPAK_STD', 30.0, 60.0, 60.0, 60.0, 300.0, TRUE, FALSE, 5, 8),
('cpass', 'eBay SpeedPAK Plus', 'CPASS_SPEEDPAK_PLUS', 30.0, 60.0, 60.0, 60.0, 300.0, TRUE, TRUE, 4, 7),

-- 日本郵便
('日本郵便', 'EMS', 'JP_POST_EMS', 30.0, 150.0, 150.0, 150.0, 300.0, TRUE, TRUE, 4, 7),
('日本郵便', '国際eパケット', 'JP_POST_EPACKET', 2.0, 60.0, 60.0, 60.0, 90.0, TRUE, FALSE, 7, 14),
('日本郵便', '航空便', 'JP_POST_AIR', 30.0, 150.0, 150.0, 150.0, 300.0, FALSE, FALSE, 7, 10);

-- 2. 重量・国別料金データ（サンプル）
-- eLogi FedEx IE - アメリカ向け
INSERT INTO shipping_rates (service_id, destination_country_code, weight_from_kg, weight_to_kg, base_cost_usd) VALUES
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 0.0, 0.5, 33.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 0.5, 1.0, 39.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 1.0, 1.5, 45.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 1.5, 2.0, 51.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 2.0, 3.0, 58.00),

-- eLogi FedEx IE - カナダ向け
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'CAN', 0.0, 0.5, 35.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'CAN', 0.5, 1.0, 41.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'CAN', 1.0, 1.5, 47.00),

-- cpass SpeedPAK - アメリカ向け
((SELECT service_id FROM shipping_services WHERE service_code = 'CPASS_SPEEDPAK_STD'), 'USA', 0.0, 0.5, 16.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'CPASS_SPEEDPAK_STD'), 'USA', 0.5, 1.0, 20.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'CPASS_SPEEDPAK_STD'), 'USA', 1.0, 1.5, 24.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'CPASS_SPEEDPAK_STD'), 'USA', 1.5, 2.0, 28.00),

-- 日本郵便 EMS - アメリカ向け
((SELECT service_id FROM shipping_services WHERE service_code = 'JP_POST_EMS'), 'USA', 0.0, 0.5, 20.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'JP_POST_EMS'), 'USA', 0.5, 1.0, 24.50),
((SELECT service_id FROM shipping_services WHERE service_code = 'JP_POST_EMS'), 'USA', 1.0, 1.5, 29.00),
((SELECT service_id FROM shipping_services WHERE service_code = 'JP_POST_EMS'), 'USA', 1.5, 2.0, 33.50);

-- 3. 追加費用設定（燃油サーチャージ等）
INSERT INTO additional_fees (
    service_id, fee_type, fee_name, cost_type, 
    fixed_cost_usd, percentage_rate, condition_description, is_active
) VALUES
-- 燃油サーチャージ（全サービス共通15%）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'fuel_surcharge', '燃油サーチャージ', 'percentage', 0.00, 0.1500, '基本送料の15%', TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IP'), 'fuel_surcharge', '燃油サーチャージ', 'percentage', 0.00, 0.1500, '基本送料の15%', TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'CPASS_SPEEDPAK_STD'), 'fuel_surcharge', '燃油サーチャージ', 'percentage', 0.00, 0.1200, '基本送料の12%', TRUE),

-- 保険料（商品価値の1%、最低$5）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'insurance', '保険料', 'percentage', 5.00, 0.0100, '商品価値の1%、最低$5', TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'JP_POST_EMS'), 'insurance', '保険料', 'percentage', 3.00, 0.0080, '商品価値の0.8%、最低$3', TRUE),

-- サイン確認料
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'signature', 'サイン確認料', 'fixed', 8.00, 0.0000, '配達時サイン必須', TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IP'), 'signature', 'サイン確認料', 'fixed', 8.00, 0.0000, '配達時サイン必須', TRUE),

-- 長物超過料金（一辺120cm超過時）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'oversize', '長物超過料金', 'fixed', 50.00, 0.0000, '一辺が120cmを超える場合', TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IP'), 'oversize', '長物超過料金', 'fixed', 50.00, 0.0000, '一辺が120cmを超える場合', TRUE);

-- 4. 為替レート初期データ
INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
('JPY', 'USD', 0.0067, 'manual_initial'),
('USD', 'JPY', 148.5, 'manual_initial');

-- 5. サンプル商品データ
INSERT INTO item_master (
    item_code, item_name, cost_jpy, weight_kg, length_cm, width_cm, height_cm,
    ebay_category_id, ebay_category_name
) VALUES
('SAMPLE-001', 'ワイヤレスイヤホン', 2500.00, 0.3, 15.0, 10.0, 5.0, '176982', 'Cell Phone Accessories'),
('SAMPLE-002', 'デジタルカメラレンズ', 15000.00, 1.2, 25.0, 10.0, 10.0, '625', 'Camera Lenses'),
('SAMPLE-003', 'ヴィンテージ腕時計', 8000.00, 0.2, 12.0, 8.0, 3.0, '14324', 'Vintage Watches'),
('SAMPLE-004', 'フィギュア', 3500.00, 0.8, 30.0, 20.0, 15.0, '246', 'Action Figures'),
('SAMPLE-005', '電子部品セット', 1200.00, 0.1, 8.0, 6.0, 2.0, '92074', 'Electronic Components');

-- ====================================
-- データ整合性チェック用クエリ
-- ====================================

-- 1. 送料サービス登録確認
SELECT 
    carrier_name,
    service_name,
    service_code,
    max_weight_kg,
    max_length_cm
FROM shipping_services 
ORDER BY carrier_name, service_name;

-- 2. 料金データ登録確認
SELECT 
    ss.carrier_name,
    ss.service_name,
    sr.destination_country_code,
    sr.weight_from_kg,
    sr.weight_to_kg,
    sr.base_cost_usd
FROM shipping_rates sr
JOIN shipping_services ss ON sr.service_id = ss.service_id
WHERE sr.destination_country_code = 'USA'
ORDER BY ss.carrier_name, sr.weight_from_kg;

-- 3. 追加費用確認
SELECT 
    ss.carrier_name,
    af.fee_name,
    af.cost_type,
    af.fixed_cost_usd,
    af.percentage_rate
FROM additional_fees af
JOIN shipping_services ss ON af.service_id = ss.service_id
WHERE af.is_active = TRUE
ORDER BY ss.carrier_name, af.fee_type;
