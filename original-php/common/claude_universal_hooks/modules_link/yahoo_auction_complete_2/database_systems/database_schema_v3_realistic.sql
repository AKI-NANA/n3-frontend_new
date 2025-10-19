-- 配送料金システム改良版 - 実際の業界慣習に合わせた重量設定
-- database_schema_v3_realistic.sql

-- 既存テーブルへの重量データ修正（0.5kg刻み + グラム単位）
DO $$
BEGIN
    -- 既存のテストデータをクリア
    DELETE FROM shipping_rates_detailed WHERE data_source IN ('api', 'setup_script');
    
    -- 【FedEx/DHL標準】0.5kg刻み（業界標準）
    -- イギリス（高価格帯）
    INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
    SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), weight_g, weight_g + 500, 
           12.50 + (weight_g - 500) * 0.0035, 1, 3, 
           CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
           'realistic_rates'
    FROM generate_series(500, 25000, 500) as weight_g; -- 0.5kg刻み

    -- ドイツ（中価格帯）
    INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
    SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), weight_g, weight_g + 500, 
           11.80 + (weight_g - 500) * 0.003, 1, 3, 
           CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
           'realistic_rates'
    FROM generate_series(500, 25000, 500) as weight_g;

    -- アメリカ（基準価格）
    INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
    SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'us'), weight_g, weight_g + 500, 
           8.50 + (weight_g - 500) * 0.002, 1, 2, 
           CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
           'realistic_rates'
    FROM generate_series(500, 25000, 500) as weight_g;

    -- 【日本郵便】グラム単位（小型包装物専用）
    -- イギリス向け小型包装物（50g～2kg、50g刻み）
    INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
    SELECT 3, 3, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), weight_g, weight_g + 50, 
           3.20 + (weight_g - 50) * 0.0008, 7, 14, 'envelope',
           'jp_post_small_packet'
    FROM generate_series(50, 2000, 50) as weight_g -- 50g刻み
    WHERE EXISTS (SELECT 1 FROM shipping_carriers WHERE carrier_id = 3);

    -- ドイツ向け小型包装物
    INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
    SELECT 3, 3, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), weight_g, weight_g + 50, 
           3.00 + (weight_g - 50) * 0.0007, 7, 14, 'envelope',
           'jp_post_small_packet'
    FROM generate_series(50, 2000, 50) as weight_g
    WHERE EXISTS (SELECT 1 FROM shipping_carriers WHERE carrier_id = 3);

    -- 円建て料金のキャッシュ更新
    UPDATE shipping_rates_detailed 
    SET rate_jpy = ROUND(rate_usd * 148.5, 0)
    WHERE rate_jpy IS NULL AND rate_usd IS NOT NULL;

    RAISE NOTICE '実際的な重量データ投入完了';
END $$;

-- 日本郵便のキャリア・サービス追加（存在しない場合）
INSERT INTO shipping_carriers (carrier_name, carrier_code, is_active) 
SELECT 'Japan Post', 'JP_POST', TRUE
WHERE NOT EXISTS (SELECT 1 FROM shipping_carriers WHERE carrier_id = 3);

INSERT INTO shipping_services (carrier_id, service_name, service_type, is_active) 
SELECT 3, 'Small Packet', 'economy', TRUE
WHERE NOT EXISTS (SELECT 1 FROM shipping_services WHERE carrier_id = 3 AND service_id = 3);

-- 重量単位設定テーブル（キャリア別重量刻み管理）
CREATE TABLE IF NOT EXISTS carrier_weight_units (
    id SERIAL PRIMARY KEY,
    carrier_id INT REFERENCES shipping_carriers(carrier_id),
    service_id INT REFERENCES shipping_services(service_id),
    weight_increment_g INT NOT NULL, -- 重量刻み（グラム）
    min_weight_g INT NOT NULL,       -- 最小重量
    max_weight_g INT NOT NULL,       -- 最大重量
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- キャリア別重量刻み設定
INSERT INTO carrier_weight_units (carrier_id, service_id, weight_increment_g, min_weight_g, max_weight_g, description) VALUES
(1, 1, 500, 500, 68000, 'FedEx Express - 0.5kg刻み（業界標準）'),
(2, 2, 500, 500, 68000, 'DHL Express - 0.5kg刻み（業界標準）'),
(3, 3, 50, 50, 2000, '日本郵便小型包装物 - 50g刻み（特別サービス）')
ON CONFLICT DO NOTHING;
