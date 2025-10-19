-- 送料計算システム データベースセットアップ
-- 作成日: 2025年9月20日

-- 既存テーブル削除（順序重要）
DROP TABLE IF EXISTS shipping_calculations CASCADE;
DROP TABLE IF EXISTS country_exceptions CASCADE;
DROP TABLE IF EXISTS shipping_rules CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS carriers CASCADE;

-- =============================================================================
-- 1. 配送業者マスター
-- =============================================================================
CREATE TABLE carriers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    website VARCHAR(255),
    contact_info JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 2. 配送サービス
-- =============================================================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
    service_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(30) DEFAULT 'standard' CHECK (service_type IN ('economy', 'standard', 'express', 'courier')),
    has_tracking BOOLEAN DEFAULT TRUE,
    has_insurance BOOLEAN DEFAULT FALSE,
    max_weight_kg DECIMAL(8,2) DEFAULT 30.00,
    max_length_cm DECIMAL(8,2) DEFAULT 150.00,
    max_width_cm DECIMAL(8,2) DEFAULT 150.00,
    max_height_cm DECIMAL(8,2) DEFAULT 150.00,
    min_delivery_days INTEGER DEFAULT 3,
    max_delivery_days INTEGER DEFAULT 14,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(carrier_id, service_code)
);

-- =============================================================================
-- 3. 基本送料ルール
-- =============================================================================
CREATE TABLE shipping_rules (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    destination_zone VARCHAR(10) NOT NULL, -- zone1, zone2, zone3
    weight_from_kg DECIMAL(8,3) NOT NULL DEFAULT 0.000,
    weight_to_kg DECIMAL(8,3) NOT NULL,
    base_cost_jpy DECIMAL(10,2) NOT NULL,
    per_500g_cost_jpy DECIMAL(10,2) DEFAULT 0.00,
    flat_rate BOOLEAN DEFAULT FALSE,
    currency VARCHAR(3) DEFAULT 'JPY',
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- 4. 国別例外料金
-- =============================================================================
CREATE TABLE country_exceptions (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    country_code VARCHAR(2) NOT NULL, -- ISO 2-letter code
    country_name VARCHAR(100),
    zone_override VARCHAR(10), -- zone1, zone2, zone3
    markup_percentage DECIMAL(5,2) DEFAULT 0.00, -- 追加手数料%
    flat_surcharge_jpy DECIMAL(10,2) DEFAULT 0.00, -- 固定追加料金
    restricted BOOLEAN DEFAULT FALSE, -- 配送制限
    restriction_reason TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(service_id, country_code)
);

-- =============================================================================
-- 5. 計算履歴
-- =============================================================================
CREATE TABLE shipping_calculations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    user_ip VARCHAR(45),
    original_weight_kg DECIMAL(8,3) NOT NULL,
    packed_weight_kg DECIMAL(8,3) NOT NULL,
    volumetric_weight_kg DECIMAL(8,3) NOT NULL,
    chargeable_weight_kg DECIMAL(8,3) NOT NULL,
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    destination_country VARCHAR(2) NOT NULL,
    selected_service_id INTEGER REFERENCES services(id),
    selected_cost_jpy DECIMAL(10,2),
    calculation_results JSONB, -- 全ての計算結果
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- インデックス作成
-- =============================================================================
CREATE INDEX idx_carriers_status ON carriers(status);
CREATE INDEX idx_services_carrier_status ON services(carrier_id, status);
CREATE INDEX idx_shipping_rules_service_zone ON shipping_rules(service_id, destination_zone);
CREATE INDEX idx_country_exceptions_service_country ON country_exceptions(service_id, country_code);
CREATE INDEX idx_shipping_calculations_country ON shipping_calculations(destination_country);
CREATE INDEX idx_shipping_calculations_created ON shipping_calculations(created_at);

-- =============================================================================
-- 初期データ投入
-- =============================================================================

-- 配送業者データ
INSERT INTO carriers (name, code, website, status) VALUES
('日本郵便', 'JPPOST', 'https://www.post.japanpost.jp/', 'active'),
('CPass', 'CPASS', 'https://www.cpass.jp/', 'active'),
('Emoji', 'EMOJI', 'https://www.emoji-inc.com/', 'active'),
('ヤマト運輸', 'YAMATO', 'https://www.kuronekoyamato.co.jp/', 'active'),
('佐川急便', 'SAGAWA', 'https://www.sagawa-exp.co.jp/', 'active');

-- 配送サービスデータ
INSERT INTO services (carrier_id, service_code, service_name, service_type, has_tracking, has_insurance, min_delivery_days, max_delivery_days) VALUES
-- 日本郵便
(1, 'EMS', 'EMS（国際スピード郵便）', 'courier', TRUE, TRUE, 2, 7),
(1, 'AIR_SMALL', '航空便小形包装物', 'economy', FALSE, FALSE, 7, 14),
(1, 'AIR_PRINTED', '航空便印刷物', 'economy', FALSE, FALSE, 5, 10),

-- CPass
(2, 'FEDEX_IP', 'Speed Pack FedEx', 'courier', TRUE, TRUE, 2, 5),
(2, 'DHL_EXPRESS', 'Speed Pack DHL', 'courier', TRUE, TRUE, 2, 4),
(2, 'UPS_EXPRESS', 'UPS Express', 'express', TRUE, TRUE, 2, 6),

-- Emoji
(3, 'UPS_WORLDWIDE', 'UPS Worldwide Express', 'courier', TRUE, TRUE, 1, 3),
(3, 'FEDEX_PRIORITY', 'FedEx Priority', 'express', TRUE, TRUE, 2, 4),
(3, 'DHL_WORLDWIDE', 'DHL Worldwide', 'courier', TRUE, TRUE, 1, 3);

-- 基本送料ルール（主要サービス）
INSERT INTO shipping_rules (service_id, destination_zone, weight_from_kg, weight_to_kg, base_cost_jpy, per_500g_cost_jpy) VALUES
-- EMS (service_id = 1)
(1, 'zone1', 0.000, 0.500, 1400, 200),
(1, 'zone1', 0.501, 30.000, 1400, 200),
(1, 'zone2', 0.000, 0.500, 1400, 350),
(1, 'zone2', 0.501, 30.000, 1400, 350),
(1, 'zone3', 0.000, 0.500, 1400, 500),
(1, 'zone3', 0.501, 30.000, 1400, 500),

-- 航空便小形包装物 (service_id = 2)
(2, 'zone1', 0.000, 0.500, 800, 100),
(2, 'zone1', 0.501, 2.000, 800, 100),
(2, 'zone2', 0.000, 0.500, 900, 150),
(2, 'zone2', 0.501, 2.000, 900, 150),
(2, 'zone3', 0.000, 0.500, 1000, 200),
(2, 'zone3', 0.501, 2.000, 1000, 200),

-- CPass FedEx (service_id = 4)
(4, 'zone1', 0.000, 0.500, 2800, 400),
(4, 'zone1', 0.501, 30.000, 2800, 400),
(4, 'zone2', 0.000, 0.500, 3200, 450),
(4, 'zone2', 0.501, 30.000, 3200, 450),
(4, 'zone3', 0.000, 0.500, 3600, 500),
(4, 'zone3', 0.501, 30.000, 3600, 500),

-- CPass DHL (service_id = 5)
(5, 'zone1', 0.000, 0.500, 2600, 380),
(5, 'zone1', 0.501, 30.000, 2600, 380),
(5, 'zone2', 0.000, 0.500, 3000, 420),
(5, 'zone2', 0.501, 30.000, 3000, 420),
(5, 'zone3', 0.000, 0.500, 3400, 480),
(5, 'zone3', 0.501, 30.000, 3400, 480),

-- Emoji UPS (service_id = 7)
(7, 'zone1', 0.000, 0.500, 2500, 350),
(7, 'zone1', 0.501, 30.000, 2500, 350),
(7, 'zone2', 0.000, 0.500, 2900, 400),
(7, 'zone2', 0.501, 30.000, 2900, 400),
(7, 'zone3', 0.000, 0.500, 3300, 450),
(7, 'zone3', 0.501, 30.000, 3300, 450);

-- 国別例外設定（主要国）
INSERT INTO country_exceptions (service_id, country_code, country_name, zone_override) VALUES
-- 主要国のゾーン設定
(1, 'US', 'アメリカ合衆国', 'zone1'),
(1, 'CA', 'カナダ', 'zone1'),
(1, 'KR', '韓国', 'zone1'),
(1, 'TW', '台湾', 'zone1'),
(1, 'HK', '香港', 'zone1'),
(1, 'SG', 'シンガポール', 'zone1'),

(1, 'GB', 'イギリス', 'zone2'),
(1, 'FR', 'フランス', 'zone2'),
(1, 'DE', 'ドイツ', 'zone2'),
(1, 'IT', 'イタリア', 'zone2'),
(1, 'ES', 'スペイン', 'zone2'),
(1, 'AU', 'オーストラリア', 'zone2'),
(1, 'NZ', 'ニュージーランド', 'zone2'),

(1, 'CN', '中国', 'zone3'),
(1, 'TH', 'タイ', 'zone3'),
(1, 'VN', 'ベトナム', 'zone3'),
(1, 'IN', 'インド', 'zone3'),
(1, 'BR', 'ブラジル', 'zone3'),
(1, 'RU', 'ロシア', 'zone3'),
(1, 'ZA', '南アフリカ', 'zone3');

-- =============================================================================
-- 完了メッセージ
-- =============================================================================
DO $$
DECLARE
    carrier_count INTEGER;
    service_count INTEGER;
    rule_count INTEGER;
    country_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO carrier_count FROM carriers;
    SELECT COUNT(*) INTO service_count FROM services;
    SELECT COUNT(*) INTO rule_count FROM shipping_rules;
    SELECT COUNT(*) INTO country_count FROM country_exceptions;

    RAISE NOTICE '=== 送料計算システム データベースセットアップ完了 ===';
    RAISE NOTICE '配送業者: % 社', carrier_count;
    RAISE NOTICE '配送サービス: % 種類', service_count;
    RAISE NOTICE '料金ルール: % 件', rule_count;
    RAISE NOTICE '国別設定: % 件', country_count;
    RAISE NOTICE '送料計算システムが利用可能です！';
END $$;
