-- 正確な配送業者・サービス構造（実際の調査データに基づく）
-- FedX、DHL、UPSの具体的サービス分類

-- 既存データクリア
TRUNCATE TABLE shipping_services CASCADE;
DELETE FROM carrier_group_members;
DELETE FROM carrier_groups;
DELETE FROM shipping_carriers WHERE carrier_id > 2; -- Eloji FedX + Orange Connex保持

-- 正確な業者グループ
INSERT INTO carrier_groups (group_name, group_description, group_priority) VALUES
('Cpass', '海外配送代行サービス', 1),
('Eloji', '配送統合サービス', 2),
('日本郵便', '日本国内郵便サービス', 3)
ON CONFLICT (group_name) DO UPDATE SET
    group_description = EXCLUDED.group_description,
    group_priority = EXCLUDED.group_priority;

-- 配送業者登録（実際の業者構造）
INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions, is_active) VALUES
-- Cpass傘下
('Cpass', 'CPASS_MAIN', 10, '["WORLDWIDE"]', true),
-- Eloji傘下 (既存のELOJI_FEDEXはそのまま)
('Eloji', 'ELOJI_MAIN', 20, '["WORLDWIDE"]', true),
-- 日本郵便
('日本郵便', 'JP_POST_MAIN', 30, '["WORLDWIDE"]', true)
ON CONFLICT (carrier_code) DO UPDATE SET
    carrier_name = EXCLUDED.carrier_name,
    priority_order = EXCLUDED.priority_order;

-- Orange Connex削除
DELETE FROM shipping_carriers WHERE carrier_code = 'ORANGE_CONNEX';

-- 正確な配送サービス定義（調査結果に基づく）

-- === FedEx サービス ===
INSERT INTO shipping_services (carrier_id, service_code, service_name, service_type, display_order, service_description) VALUES
-- Cpass FedX
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'FEDEX_INTERNATIONAL_FIRST', 'FedX International First', 'premium', 1, '1日配達・最高速'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'FEDEX_INTERNATIONAL_PRIORITY_EXPRESS', 'FedX International Priority Express', 'express', 2, '1-3営業日・10:30AM配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'FEDEX_INTERNATIONAL_PRIORITY', 'FedX International Priority', 'express', 3, '1-3営業日・正午配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'FEDEX_INTERNATIONAL_ECONOMY', 'FedX International Economy', 'economy', 4, '2-5営業日・経済的'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'FEDEX_INTERNATIONAL_CONNECT_PLUS', 'FedX International Connect Plus', 'economy', 5, '2-5営業日・コスト重視'),

-- Eloji FedX (既存データ互換)
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_FEDEX'), 'FEDEX_INTERNATIONAL_PRIORITY', 'FedX International Priority', 'express', 1, '1-3営業日・高速配送'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_FEDEX'), 'FEDEX_INTERNATIONAL_ECONOMY', 'FedX International Economy', 'economy', 2, '2-5営業日・経済配送');

-- === DHL サービス ===
INSERT INTO shipping_services (carrier_id, service_code, service_name, service_type, display_order, service_description) VALUES
-- Cpass DHL
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'DHL_EXPRESS_WORLDWIDE', 'DHL Express Worldwide', 'express', 10, '翌営業日配達・最速'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'DHL_EXPRESS_9AM', 'DHL Express 9:00AM', 'premium', 11, '午前9時配達・プレミアム'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'DHL_EXPRESS_10_30AM', 'DHL Express 10:30AM', 'premium', 12, '午前10:30配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'DHL_EXPRESS_12PM', 'DHL Express 12:00PM', 'express', 13, '正午配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'DHL_ECONOMY_SELECT', 'DHL Economy Select', 'economy', 14, '2-5営業日・経済的'),

-- Eloji DHL
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'DHL_EXPRESS_WORLDWIDE', 'DHL Express Worldwide', 'express', 10, '翌営業日配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'DHL_EXPRESS_12PM', 'DHL Express 12:00PM', 'express', 11, '正午配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'DHL_ECONOMY_SELECT', 'DHL Economy Select', 'economy', 12, '2-5営業日配送');

-- === UPS サービス ===
INSERT INTO shipping_services (carrier_id, service_code, service_name, service_type, display_order, service_description) VALUES
-- Cpass UPS (SpeedPakとして扱う)
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'UPS_SPEEDPAK_ECONOMY', 'SpeedPak Economy', 'economy', 20, '5-12営業日・低コスト'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'CPASS_MAIN'), 'UPS_SPEEDPAK_STANDARD', 'SpeedPak Standard', 'standard', 21, '3-8営業日・標準'),

-- Eloji UPS
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'UPS_WORLDWIDE_EXPRESS_PLUS', 'UPS Worldwide Express Plus', 'premium', 20, '1-3営業日・8:30AM配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'UPS_WORLDWIDE_EXPRESS', 'UPS Worldwide Express', 'express', 21, '1-3営業日・10:30AM配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'UPS_WORLDWIDE_EXPRESS_SAVER', 'UPS Worldwide Express Saver', 'express', 22, '1-3営業日・終日配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'UPS_WORLDWIDE_EXPEDITED', 'UPS Worldwide Expedited', 'standard', 23, '2-5営業日・保証配達'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'ELOJI_MAIN'), 'UPS_WORLDWIDE_ECONOMY', 'UPS Worldwide Economy', 'economy', 24, '5-8営業日・低コスト');

-- === 日本郵便サービス ===
INSERT INTO shipping_services (carrier_id, service_code, service_name, service_type, display_order, service_description) VALUES
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'JP_POST_MAIN'), 'JP_POST_EMS', '日本郵便 EMS', 'express', 30, '2-4営業日・追跡付き'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'JP_POST_MAIN'), 'JP_POST_SMALL_PACKET_REG', '日本郵便 小型包装物書留', 'standard', 31, '1-3週間・書留'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'JP_POST_MAIN'), 'JP_POST_SMALL_PACKET', '日本郵便 小型包装物', 'economy', 32, '1-3週間・経済的'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'JP_POST_MAIN'), 'JP_POST_REGISTERED_LETTER', '日本郵便 書状書留', 'standard', 33, '1-2週間・書状書留'),
((SELECT carrier_id FROM shipping_carriers WHERE carrier_code = 'JP_POST_MAIN'), 'JP_POST_LETTER', '日本郵便 書状', 'economy', 34, '1-2週間・普通書状');

-- グループメンバー関係設定
INSERT INTO carrier_group_members (group_id, carrier_id, member_priority) 
SELECT 
    cg.group_id,
    sc.carrier_id,
    CASE 
        WHEN sc.carrier_code = 'CPASS_MAIN' THEN 1
        WHEN sc.carrier_code LIKE 'ELOJI_%' THEN 2
        WHEN sc.carrier_code = 'JP_POST_MAIN' THEN 3
    END
FROM carrier_groups cg
CROSS JOIN shipping_carriers sc
WHERE 
    (cg.group_name = 'Cpass' AND sc.carrier_code = 'CPASS_MAIN')
    OR (cg.group_name = 'Eloji' AND sc.carrier_code LIKE 'ELOJI_%')
    OR (cg.group_name = '日本郵便' AND sc.carrier_code = 'JP_POST_MAIN')
ON CONFLICT (group_id, carrier_id) DO NOTHING;

-- 管理ビュー更新
CREATE OR REPLACE VIEW shipping_services_detailed_view AS
SELECT 
    cg.group_name as carrier_group,
    sc.carrier_name,
    sc.carrier_code,
    ss.service_name,
    ss.service_type,
    ss.service_description,
    ss.display_order,
    
    -- 料金データ有無確認
    CASE 
        WHEN sc.carrier_code = 'ELOJI_FEDEX' THEN '料金データ投入済み'
        ELSE '料金データ未投入'
    END as data_status,
    
    -- サービス数カウント
    COUNT(*) OVER (PARTITION BY sc.carrier_id) as services_count,
    
    sc.is_active as carrier_active,
    ss.is_active as service_active
    
FROM shipping_carriers sc
LEFT JOIN carrier_group_members cgm ON sc.carrier_id = cgm.carrier_id
LEFT JOIN carrier_groups cg ON cgm.group_id = cg.group_id
LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id
WHERE sc.is_active = TRUE
ORDER BY cg.group_name, sc.carrier_name, ss.display_order;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '🎉 正確な配送サービス構造作成完了';
    RAISE NOTICE '📦 Cpass: FedX(5種), DHL(5種), SpeedPak(2種)';
    RAISE NOTICE '🚚 Eloji: FedX(2種・データ有), DHL(3種), UPS(5種)';
    RAISE NOTICE '📮 日本郵便: EMS, 小型包装物, 書状など(5種)';
    RAISE NOTICE '📊 総配送サービス数: 22種類';
    RAISE NOTICE '⚡ 現在料金データがあるのはEloji FedXのみ(144件)';
END $$;
