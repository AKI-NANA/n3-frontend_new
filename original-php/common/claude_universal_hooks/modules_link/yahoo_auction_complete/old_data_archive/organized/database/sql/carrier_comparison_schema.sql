-- 配送業者比較システム用データベース拡張
-- 既存テーブルに加えて、業者別データベースを追加

-- 配送業者マスター
CREATE TABLE shipping_carriers (
    carrier_id INT PRIMARY KEY AUTO_INCREMENT,
    carrier_name VARCHAR(50) NOT NULL UNIQUE,
    carrier_code VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    priority_order INT DEFAULT 50,
    coverage_regions JSON, -- 対応地域
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 初期データ挿入
INSERT INTO shipping_carriers (carrier_name, carrier_code, priority_order, coverage_regions) VALUES
('Eloji (FedEx)', 'ELOJI_FEDEX', 1, '["WORLDWIDE"]'),
('Orange Connex', 'ORANGE_CONNEX', 2, '["WORLDWIDE_EXCEPT_USA"]');

-- 業者別ポリシーテーブル
CREATE TABLE carrier_policies (
    policy_id INT PRIMARY KEY AUTO_INCREMENT,
    carrier_id INT NOT NULL,
    policy_name VARCHAR(255) NOT NULL,
    policy_type ENUM('economy', 'express') NOT NULL,
    service_name VARCHAR(255), -- FedEx International Priority等
    
    -- 基本設定
    usa_base_cost DECIMAL(10,2) DEFAULT 0.00,
    fuel_surcharge_percent DECIMAL(5,2) DEFAULT 5.0,
    handling_fee DECIMAL(10,2) DEFAULT 2.50,
    max_weight_kg DECIMAL(8,3) DEFAULT 30.0,
    max_length_cm DECIMAL(8,2) DEFAULT 200.0,
    
    -- 配送設定
    default_delivery_days_min INT DEFAULT 3,
    default_delivery_days_max INT DEFAULT 7,
    tracking_included BOOLEAN DEFAULT TRUE,
    signature_required BOOLEAN DEFAULT FALSE,
    
    -- 制約・地域設定
    excluded_countries JSON,
    restricted_items JSON,
    
    policy_status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (carrier_id) REFERENCES shipping_carriers(carrier_id),
    UNIQUE KEY unique_carrier_policy (carrier_id, policy_type),
    INDEX idx_carrier_type (carrier_id, policy_type, policy_status)
);

-- 業者別料金テーブル
CREATE TABLE carrier_rates (
    rate_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_id INT NOT NULL,
    zone_id INT NOT NULL,
    
    -- 重量・サイズ範囲
    weight_min_kg DECIMAL(8,3) NOT NULL DEFAULT 0.0,
    weight_max_kg DECIMAL(8,3) NOT NULL,
    length_max_cm DECIMAL(8,2),
    width_max_cm DECIMAL(8,2),
    height_max_cm DECIMAL(8,2),
    
    -- 料金設定
    cost_usd DECIMAL(10,2) NOT NULL,
    cost_jpy DECIMAL(10,2), -- 円建て料金
    
    -- 配送設定
    delivery_days_min INT,
    delivery_days_max INT,
    
    -- 特別料金
    oversized_surcharge DECIMAL(10,2) DEFAULT 0.00,
    remote_area_surcharge DECIMAL(10,2) DEFAULT 0.00,
    
    -- 有効性
    effective_date DATE DEFAULT (CURRENT_DATE),
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (policy_id) REFERENCES carrier_policies(policy_id),
    FOREIGN KEY (zone_id) REFERENCES shipping_zones(zone_id),
    
    INDEX idx_policy_zone_weight (policy_id, zone_id, weight_min_kg, weight_max_kg),
    INDEX idx_active_rates (is_active, effective_date, expiry_date)
);

-- 料金比較ログテーブル
CREATE TABLE rate_comparison_log (
    comparison_id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- リクエスト情報
    product_id VARCHAR(255),
    weight_kg DECIMAL(8,3) NOT NULL,
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    destination_country VARCHAR(3) NOT NULL,
    destination_zone_id INT,
    
    -- 比較結果
    best_carrier_id INT,
    best_policy_id INT,
    best_rate_id INT,
    best_cost_usd DECIMAL(10,2),
    best_delivery_days VARCHAR(20),
    
    -- 全比較データ
    comparison_results JSON, -- 全業者の結果
    
    -- メタデータ
    calculation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_session_id VARCHAR(255),
    
    FOREIGN KEY (best_carrier_id) REFERENCES shipping_carriers(carrier_id),
    FOREIGN KEY (best_policy_id) REFERENCES carrier_policies(policy_id),
    FOREIGN KEY (best_rate_id) REFERENCES carrier_rates(rate_id),
    FOREIGN KEY (destination_zone_id) REFERENCES shipping_zones(zone_id),
    
    INDEX idx_calculation_time (calculation_time),
    INDEX idx_destination (destination_country, destination_zone_id)
);

-- 配送業者比較ビュー
CREATE VIEW carrier_comparison_view AS
SELECT 
    cl.comparison_id,
    cl.product_id,
    cl.weight_kg,
    cl.destination_country,
    
    -- 最安業者情報
    sc.carrier_name as best_carrier,
    cp.policy_name as best_policy,
    cp.policy_type as best_service_type,
    cl.best_cost_usd,
    cl.best_delivery_days,
    
    -- ゾーン情報
    sz.zone_name as destination_zone,
    
    cl.calculation_time
FROM rate_comparison_log cl
LEFT JOIN shipping_carriers sc ON cl.best_carrier_id = sc.carrier_id
LEFT JOIN carrier_policies cp ON cl.best_policy_id = cp.policy_id
LEFT JOIN shipping_zones sz ON cl.destination_zone_id = sz.zone_id
ORDER BY cl.calculation_time DESC;
