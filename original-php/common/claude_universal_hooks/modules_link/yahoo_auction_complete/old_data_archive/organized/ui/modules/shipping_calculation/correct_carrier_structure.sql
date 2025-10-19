-- 正確な配送業者構造修正
-- 実際の業者体系に合わせたデータベース再構築

-- 既存の不正確なデータをクリア
DELETE FROM carrier_group_members;
DELETE FROM carrier_groups;
DELETE FROM shipping_carriers WHERE carrier_id > 2;

-- 正確な配送業者グループ定義
INSERT INTO carrier_groups (group_name, group_description, group_priority) VALUES
('Cpass', '海外配送代行サービス', 1),
('Eloji', '配送統合サービス', 2),
('日本郵便', '日本国内郵便サービス', 3)
ON CONFLICT (group_name) DO UPDATE SET
    group_description = EXCLUDED.group_description,
    group_priority = EXCLUDED.group_priority;

-- 正確な配送業者登録
INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions, is_active) VALUES
-- Cpass傘下
('Cpass FedEx', 'CPASS_FEDEX', 11, '["WORLDWIDE"]', true),
('Cpass DHL', 'CPASS_DHL', 12, '["WORLDWIDE"]', true),
('Cpass SpeedPak', 'CPASS_SPEEDPAK', 13, '["WORLDWIDE"]', true),

-- Eloji傘下 (既存のELOJI_FEDEXを更新)
('Eloji DHL', 'ELOJI_DHL', 21, '["WORLDWIDE"]', true),
('Eloji UPS', 'ELOJI_UPS', 22, '["WORLDWIDE"]', true),

-- 日本郵便傘下
('日本郵便 小型包装物', 'JP_POST_SMALL_PACKET', 31, '["WORLDWIDE"]', true),
('日本郵便 書状書留', 'JP_POST_REGISTERED_LETTER', 32, '["WORLDWIDE"]', true),
('日本郵便 書状', 'JP_POST_LETTER', 33, '["WORLDWIDE"]', true),
('日本郵便 小型包装物書留', 'JP_POST_SMALL_PACKET_REG', 34, '["WORLDWIDE"]', true),
('日本郵便 EMS', 'JP_POST_EMS', 35, '["WORLDWIDE"]', true)
ON CONFLICT (carrier_code) DO UPDATE SET
    carrier_name = EXCLUDED.carrier_name,
    priority_order = EXCLUDED.priority_order,
    coverage_regions = EXCLUDED.coverage_regions,
    is_active = EXCLUDED.is_active;

-- Eloji FedXの名前を正確に更新
UPDATE shipping_carriers SET 
    carrier_name = 'Eloji FedX',
    priority_order = 20
WHERE carrier_code = 'ELOJI_FEDX';

-- Orange Connexを削除（実際には存在しない）
DELETE FROM shipping_carriers WHERE carrier_code = 'ORANGE_CONNEX';

-- グループメンバー関係設定
INSERT INTO carrier_group_members (group_id, carrier_id, member_priority) 
SELECT 
    cg.group_id,
    sc.carrier_id,
    CASE 
        WHEN sc.carrier_code LIKE 'CPASS_%' THEN 10 + ROW_NUMBER() OVER (ORDER BY sc.carrier_code)
        WHEN sc.carrier_code LIKE 'ELOJI_%' THEN 20 + ROW_NUMBER() OVER (ORDER BY sc.carrier_code)
        WHEN sc.carrier_code LIKE 'JP_POST_%' THEN 30 + ROW_NUMBER() OVER (ORDER BY sc.carrier_code)
    END
FROM carrier_groups cg
CROSS JOIN shipping_carriers sc
WHERE 
    (cg.group_name = 'Cpass' AND sc.carrier_code LIKE 'CPASS_%')
    OR (cg.group_name = 'Eloji' AND sc.carrier_code LIKE 'ELOJI_%')
    OR (cg.group_name = '日本郵便' AND sc.carrier_code LIKE 'JP_POST_%')
ON CONFLICT (group_id, carrier_id) DO NOTHING;

-- 配送サービス定義
INSERT INTO shipping_services (carrier_id, service_code, service_name, service_type, display_order)
SELECT 
    sc.carrier_id,
    service_data.service_code,
    service_data.service_name,
    service_data.service_type,
    service_data.display_order
FROM shipping_carriers sc
CROSS JOIN (
    VALUES 
        ('economy', 'エコノミー配送', 'economy', 1),
        ('express', 'エクスプレス配送', 'express', 2),
        ('standard', '標準配送', 'standard', 3)
) AS service_data(service_code, service_name, service_type, display_order)
WHERE sc.is_active = true
ON CONFLICT (carrier_id, service_code) DO NOTHING;

-- 地域制約を実際の運用に合わせて設定
-- 現時点では制約なしで全業者利用可能
INSERT INTO regional_carrier_restrictions (carrier_id, country_code, is_allowed, restriction_reason)
SELECT 
    sc.carrier_id,
    'ALL',
    true,
    '制約なし'
FROM shipping_carriers sc
WHERE sc.is_active = true
ON CONFLICT (carrier_id, country_code) DO NOTHING;

-- 正確な管理ビュー更新
CREATE OR REPLACE VIEW accurate_shipping_management_view AS
SELECT 
    sc.carrier_id,
    sc.carrier_name,
    sc.carrier_code,
    cg.group_name as carrier_group,
    
    -- サービス情報
    COALESCE(
        STRING_AGG(DISTINCT ss.service_name, ', ' ORDER BY ss.service_name), 
        '未設定'
    ) as available_services,
    
    -- 料金情報（既存データはEloji FedXのみ）
    CASE 
        WHEN sc.carrier_code = 'ELOJI_FEDX' THEN 
            (SELECT COUNT(*) FROM carrier_rates_extended cr 
             JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id 
             WHERE cp.carrier_id = sc.carrier_id AND cr.is_active = true)
        ELSE 0
    END as total_rates,
    
    CASE 
        WHEN sc.carrier_code = 'ELOJI_FEDX' THEN 
            (SELECT MIN(cr.cost_usd) FROM carrier_rates_extended cr 
             JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id 
             WHERE cp.carrier_id = sc.carrier_id AND cr.is_active = true)
        ELSE NULL
    END as min_cost,
    
    CASE 
        WHEN sc.carrier_code = 'ELOJI_FEDX' THEN 
            (SELECT MAX(cr.cost_usd) FROM carrier_rates_extended cr 
             JOIN carrier_policies_extended cp ON cr.policy_id = cp.policy_id 
             WHERE cp.carrier_id = sc.carrier_id AND cr.is_active = true)
        ELSE NULL
    END as max_cost,
    
    sc.is_active as carrier_active,
    
    CASE 
        WHEN sc.carrier_code = 'ELOJI_FEDX' THEN '料金データ投入済み'
        ELSE '料金データ未投入'
    END as data_status
    
FROM shipping_carriers sc
LEFT JOIN carrier_group_members cgm ON sc.carrier_id = cgm.carrier_id
LEFT JOIN carrier_groups cg ON cgm.group_id = cg.group_id
LEFT JOIN shipping_services ss ON sc.carrier_id = ss.carrier_id AND ss.is_active = TRUE
WHERE sc.is_active = TRUE
GROUP BY sc.carrier_id, sc.carrier_name, sc.carrier_code, cg.group_name, sc.is_active
ORDER BY cg.group_name, sc.priority_order;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ 正確な配送業者構造に修正完了';
    RAISE NOTICE '📦 Cpass: FedX, DHL, SpeedPak';
    RAISE NOTICE '🚚 Eloji: FedX(データ投入済み), DHL, UPS';
    RAISE NOTICE '📮 日本郵便: 小型包装物, 書状書留, 書状, 小型包装物書留, EMS';
    RAISE NOTICE '⚡ 現在料金データが投入されているのはEloji FedXのみ';
END $$;
