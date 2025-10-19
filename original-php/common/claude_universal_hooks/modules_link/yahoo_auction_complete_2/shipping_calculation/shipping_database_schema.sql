-- 送料計算システム データベーススキーマ
-- 作成日: 2025-09-05
-- 目的: eBay配送ポリシー自動化のためのテーブル設計

-- 1. 国・地域ゾーンマスター
CREATE TABLE IF NOT EXISTS shipping_zones (
    zone_id INT PRIMARY KEY AUTO_INCREMENT,
    zone_name VARCHAR(100) NOT NULL COMMENT 'ゾーン名（例: North America, Europe）',
    zone_type ENUM('international', 'domestic') NOT NULL DEFAULT 'international',
    zone_priority INT NOT NULL DEFAULT 1 COMMENT '優先順位（1が最高）',
    countries_json TEXT COMMENT 'JSON形式の国リスト',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_zone_name (zone_name)
);

-- 2. USA国内ゾーン（ZIP範囲ベース）
CREATE TABLE IF NOT EXISTS usa_domestic_zones (
    usa_zone_id INT PRIMARY KEY AUTO_INCREMENT,
    zone_number INT NOT NULL COMMENT 'USPSゾーン番号（1-8）',
    zone_name VARCHAR(50) NOT NULL COMMENT 'ゾーン名（例: Zone 1-3 Local）',
    zip_ranges_json TEXT COMMENT 'ZIP範囲のJSON配列',
    base_cost_multiplier DECIMAL(3,2) DEFAULT 1.00 COMMENT '基準送料に対する倍率',
    special_handling ENUM('standard', 'alaska_hawaii', 'apo_fpo') DEFAULT 'standard',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_zone_number (zone_number)
);

-- 3. 配送ポリシーマスター（eBay連携）
CREATE TABLE IF NOT EXISTS shipping_policies (
    policy_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_name VARCHAR(100) NOT NULL,
    policy_type ENUM('economy', 'standard', 'express') NOT NULL,
    ebay_policy_id VARCHAR(50) COMMENT 'eBay APIから返されるポリシーID',
    usa_base_cost DECIMAL(8,2) NOT NULL COMMENT 'USA基準送料（USD）',
    fuel_surcharge_percent DECIMAL(4,2) DEFAULT 0.00 COMMENT '燃油サーチャージ率',
    handling_fee DECIMAL(6,2) DEFAULT 0.00 COMMENT '手数料（USD）',
    max_weight_kg DECIMAL(6,2) COMMENT '最大重量制限',
    max_dimensions_cm VARCHAR(20) COMMENT '最大サイズ（L×W×H）',
    policy_status ENUM('draft', 'active', 'inactive') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_policy_type (policy_type),
    UNIQUE KEY unique_ebay_policy (ebay_policy_id)
);

-- 4. 送料料金テーブル（重量・サイズベース）
CREATE TABLE IF NOT EXISTS shipping_rates (
    rate_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_id INT NOT NULL,
    zone_id INT,
    usa_zone_id INT,
    weight_min_kg DECIMAL(6,3) NOT NULL DEFAULT 0.000,
    weight_max_kg DECIMAL(6,3) NOT NULL,
    length_max_cm DECIMAL(5,1) COMMENT '最大長さ制限',
    cost_usd DECIMAL(8,2) NOT NULL,
    delivery_days_min INT COMMENT '最短配送日数',
    delivery_days_max INT COMMENT '最長配送日数',
    tracking_included BOOLEAN DEFAULT TRUE,
    insurance_included BOOLEAN DEFAULT FALSE,
    signature_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES shipping_policies(policy_id) ON DELETE CASCADE,
    FOREIGN KEY (zone_id) REFERENCES shipping_zones(zone_id) ON DELETE SET NULL,
    FOREIGN KEY (usa_zone_id) REFERENCES usa_domestic_zones(usa_zone_id) ON DELETE SET NULL,
    INDEX idx_weight_range (weight_min_kg, weight_max_kg),
    INDEX idx_policy_zone (policy_id, zone_id)
);

-- 5. 商品サイズ・重量テーブル（計算用）
CREATE TABLE IF NOT EXISTS product_shipping_dimensions (
    product_id VARCHAR(50) PRIMARY KEY,
    length_cm DECIMAL(5,1) NOT NULL,
    width_cm DECIMAL(5,1) NOT NULL,
    height_cm DECIMAL(5,1) NOT NULL,
    weight_kg DECIMAL(6,3) NOT NULL,
    volume_weight_kg DECIMAL(6,3) COMMENT '容積重量',
    final_weight_kg DECIMAL(6,3) COMMENT '課金重量（実重量 vs 容積重量の大きい方）',
    package_type ENUM('envelope', 'box', 'tube', 'irregular') DEFAULT 'box',
    fragile BOOLEAN DEFAULT FALSE,
    hazardous BOOLEAN DEFAULT FALSE,
    selected_policy_id INT,
    calculated_shipping_usd DECIMAL(8,2),
    last_calculated TIMESTAMP,
    FOREIGN KEY (selected_policy_id) REFERENCES shipping_policies(policy_id),
    INDEX idx_dimensions (length_cm, width_cm, height_cm),
    INDEX idx_weight (final_weight_kg)
);

-- 6. 送料計算履歴（デバッグ・監査用）
CREATE TABLE IF NOT EXISTS shipping_calculation_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id VARCHAR(50),
    destination_country VARCHAR(3),
    destination_zone_id INT,
    used_policy_id INT,
    input_weight_kg DECIMAL(6,3),
    input_dimensions VARCHAR(50),
    calculated_cost_usd DECIMAL(8,2),
    calculation_details JSON COMMENT '計算過程の詳細',
    calculation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_zone_id) REFERENCES shipping_zones(zone_id),
    FOREIGN KEY (used_policy_id) REFERENCES shipping_policies(policy_id),
    INDEX idx_product_calc (product_id, calculation_time),
    INDEX idx_country_calc (destination_country, calculation_time)
);

-- 初期データ挿入

-- 基本的な国際ゾーン
INSERT INTO shipping_zones (zone_name, zone_type, countries_json, zone_priority) VALUES
('USA Domestic', 'domestic', '["US"]', 1),
('North America', 'international', '["CA", "MX"]', 2),
('Europe', 'international', '["GB", "DE", "FR", "IT", "ES", "NL", "BE"]', 3),
('Asia Pacific', 'international', '["AU", "NZ", "SG", "HK", "KR"]', 4),
('Rest of World', 'international', '["*"]', 99);

-- USA国内ゾーン（簡略版）
INSERT INTO usa_domestic_zones (zone_number, zone_name, base_cost_multiplier, special_handling) VALUES
(1, 'Local Zone 1-3', 1.00, 'standard'),
(4, 'Regional Zone 4', 1.15, 'standard'),
(5, 'Regional Zone 5', 1.30, 'standard'),
(6, 'National Zone 6', 1.50, 'standard'),
(7, 'National Zone 7', 1.70, 'standard'),
(8, 'National Zone 8', 1.90, 'standard'),
(9, 'Alaska/Hawaii', 2.50, 'alaska_hawaii'),
(10, 'APO/FPO', 1.80, 'apo_fpo');

-- 基本的な配送ポリシー（テンプレート）
INSERT INTO shipping_policies (policy_name, policy_type, usa_base_cost, fuel_surcharge_percent, max_weight_kg) VALUES
('Economy Shipping', 'economy', 15.00, 5.00, 2.000),
('Standard Shipping', 'standard', 25.00, 5.00, 10.000),
('Express Shipping', 'express', 45.00, 5.00, 30.000);
