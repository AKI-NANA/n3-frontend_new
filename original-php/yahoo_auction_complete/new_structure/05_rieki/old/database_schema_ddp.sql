-- DDP/DDU対応システム - データベーススキーマ
-- 既存の利益計算システムに統合するためのテーブル設計

-- 1. 拡張利益計算テーブル（メインテーブル）
CREATE TABLE IF NOT EXISTS enhanced_profit_calculations (
    id SERIAL PRIMARY KEY,
    
    -- 基本商品情報
    item_id VARCHAR(100) NOT NULL,
    yahoo_product_id INTEGER,  -- yahoo_scraped_products.id との連携
    category_id INTEGER NOT NULL,
    hs_code VARCHAR(20),
    origin_country VARCHAR(3) DEFAULT 'JP',
    
    -- 入力データ
    input_price_jpy DECIMAL(12,2) NOT NULL,
    input_shipping_jpy DECIMAL(10,2) NOT NULL,
    input_weight_kg DECIMAL(8,3),
    
    -- 計算タイプ
    calculation_type VARCHAR(20) DEFAULT 'DUAL_CALCULATION',
    target_countries JSON, -- ['US', 'DE', 'GB', 'CA']
    
    -- DDU計算結果
    ddu_price_usd DECIMAL(10,2) NOT NULL,
    ddu_base_cost_usd DECIMAL(10,2),
    ddu_profit_usd DECIMAL(10,2),
    ddu_profit_margin DECIMAL(5,2),
    ddu_roi DECIMAL(5,2),
    ddu_ebay_fees_usd DECIMAL(8,2),
    
    -- DDP計算結果（アメリカ向け）
    ddp_price_usd DECIMAL(10,2) NOT NULL,
    ddp_base_cost_usd DECIMAL(10,2),
    ddp_profit_usd DECIMAL(10,2),
    ddp_profit_margin DECIMAL(5,2),
    ddp_roi DECIMAL(5,2),
    ddp_ebay_fees_usd DECIMAL(8,2),
    
    -- 税金・関税詳細
    import_duty_usd DECIMAL(8,2) DEFAULT 0,
    import_duty_rate DECIMAL(5,4),
    sales_tax_usd DECIMAL(8,2) DEFAULT 0,
    sales_tax_rate DECIMAL(5,4),
    total_tax_burden_usd DECIMAL(8,2) DEFAULT 0,
    fta_applied BOOLEAN DEFAULT FALSE,
    
    -- 価格差分分析
    price_difference_usd DECIMAL(10,2) AS (ddp_price_usd - ddu_price_usd) STORED,
    price_difference_percent DECIMAL(5,2) AS (
        CASE 
            WHEN ddu_price_usd > 0 THEN ((ddp_price_usd - ddu_price_usd) / ddu_price_usd * 100)
            ELSE 0 
        END
    ) STORED,
    
    -- 戦略指標
    competitiveness_score INTEGER DEFAULT 0,
    competitiveness_grade ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR'),
    coupon_recommended BOOLEAN DEFAULT FALSE,
    coupon_discount_rate DECIMAL(4,2),
    
    -- 推奨戦略
    recommended_strategy ENUM('DDP_PRIORITY', 'DDU_PRIORITY', 'MIXED_STRATEGY') DEFAULT 'MIXED_STRATEGY',
    strategy_confidence DECIMAL(3,2) DEFAULT 0.5,
    
    -- 為替・手数料情報
    exchange_rate_used DECIMAL(8,4),
    exchange_rate_margin DECIMAL(4,2),
    category_fee_tier VARCHAR(20),
    
    -- メタデータ
    calculated_by VARCHAR(50) DEFAULT 'system',
    calculation_version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_item_id (item_id),
    INDEX idx_yahoo_product (yahoo_product_id),
    INDEX idx_category (category_id),
    INDEX idx_price_difference (price_difference_percent),
    INDEX idx_competitiveness (competitiveness_score),
    INDEX idx_created_date (created_at),
    INDEX idx_strategy (recommended_strategy),
    
    -- 外部キー制約
    FOREIGN KEY (yahoo_product_id) REFERENCES yahoo_scraped_products(id) ON DELETE SET NULL
);

-- 2. 国別税制設定テーブル
CREATE TABLE IF NOT EXISTS country_tax_settings (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL UNIQUE,
    country_name VARCHAR(100) NOT NULL,
    
    -- 基本税制情報
    pricing_strategy ENUM('DDP', 'DDU', 'MIXED') NOT NULL,
    vat_rate DECIMAL(5,4),
    import_duty_base_rate DECIMAL(5,4),
    
    -- 免税限度額
    duty_free_threshold_usd DECIMAL(10,2),
    vat_free_threshold_usd DECIMAL(10,2),
    
    -- FTA情報
    has_fta_with_japan BOOLEAN DEFAULT FALSE,
    fta_name VARCHAR(100),
    fta_duty_reduction DECIMAL(5,4) DEFAULT 0,
    
    -- 計算パラメーター
    tax_calculation_base ENUM('PRODUCT_ONLY', 'PRODUCT_SHIPPING', 'PRODUCT_SHIPPING_DUTY'),
    customs_processing_fee_usd DECIMAL(6,2) DEFAULT 0,
    
    -- eBay設定
    ebay_site_id INTEGER,
    shipping_limit_standard_usd DECIMAL(8,2),
    shipping_limit_express_usd DECIMAL(8,2),
    
    -- 有効性
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE,
    effective_until DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_country_code (country_code),
    INDEX idx_pricing_strategy (pricing_strategy),
    INDEX idx_is_active (is_active)
);

-- 3. HSコード別関税率テーブル
CREATE TABLE IF NOT EXISTS hs_code_duty_rates (
    id SERIAL PRIMARY KEY,
    hs_code VARCHAR(20) NOT NULL,
    hs_description TEXT,
    country_code VARCHAR(3) NOT NULL,
    
    -- 関税率
    mfn_rate DECIMAL(5,4), -- Most Favored Nation Rate
    preferential_rate DECIMAL(5,4), -- FTA適用レート
    special_rate DECIMAL(5,4), -- 特別レート
    
    -- 適用条件
    minimum_value_threshold DECIMAL(10,2),
    maximum_value_threshold DECIMAL(10,2),
    origin_country_restriction VARCHAR(500), -- JSON形式で複数国対応
    
    -- 有効期間
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- データソース
    data_source VARCHAR(100), -- 'WTO', 'CUSTOMS_JP', 'MANUAL'
    last_verified DATE,
    verification_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_hs_country (hs_code, country_code),
    INDEX idx_hs_code (hs_code),
    INDEX idx_country_code (country_code),
    INDEX idx_is_active (is_active),
    
    UNIQUE KEY uk_hs_country_period (hs_code, country_code, effective_from),
    FOREIGN KEY (country_code) REFERENCES country_tax_settings(country_code)
);

-- 4. 出品戦略テーブル
CREATE TABLE IF NOT EXISTS listing_strategies (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER NOT NULL,
    
    -- 市場情報
    market_type ENUM('US_DDP', 'INTERNATIONAL_DDU', 'COUNTRY_SPECIFIC') NOT NULL,
    target_country VARCHAR(3),
    ebay_site_id INTEGER,
    
    -- 価格設定
    listing_price_usd DECIMAL(10,2) NOT NULL,
    shipping_price_usd DECIMAL(8,2) NOT NULL,
    total_buyer_cost_usd DECIMAL(10,2) AS (listing_price_usd + shipping_price_usd) STORED,
    
    -- eBay設定詳細
    ebay_category_id INTEGER,
    listing_format ENUM('AUCTION', 'FIXED_PRICE', 'BEST_OFFER') DEFAULT 'FIXED_PRICE',
    duration_days INTEGER DEFAULT 7,
    
    -- 配送設定
    shipping_service VARCHAR(100),
    handling_time_days INTEGER DEFAULT 3,
    shipping_exclusions JSON, -- 配送除外国リスト
    global_shipping_program BOOLEAN DEFAULT FALSE,
    
    -- 商品詳細
    title_template TEXT,
    description_template TEXT,
    item_specifics JSON,
    
    -- 返品・保証設定
    returns_accepted BOOLEAN DEFAULT TRUE,
    return_period_days INTEGER DEFAULT 30,
    return_shipping_paid_by ENUM('Buyer', 'Seller') DEFAULT 'Seller',
    
    -- ステータス管理
    status ENUM('PLANNED', 'ACTIVE', 'PAUSED', 'ENDED', 'ERROR') DEFAULT 'PLANNED',
    ebay_listing_id VARCHAR(50),
    ebay_listing_url TEXT,
    
    -- パフォーマンス追跡
    views_count INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    questions_count INTEGER DEFAULT 0,
    sold_quantity INTEGER DEFAULT 0,
    
    -- 自動化設定
    auto_relist BOOLEAN DEFAULT FALSE,
    price_adjustment_enabled BOOLEAN DEFAULT FALSE,
    competitor_monitoring BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    listed_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    
    INDEX idx_calculation_id (calculation_id),
    INDEX idx_market_type (market_type),
    INDEX idx_status (status),
    INDEX idx_ebay_listing_id (ebay_listing_id),
    INDEX idx_target_country (target_country),
    
    FOREIGN KEY (calculation_id) REFERENCES enhanced_profit_calculations(id) ON DELETE CASCADE
);

-- 5. クーポン戦略テーブル
CREATE TABLE IF NOT EXISTS coupon_strategies (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER NOT NULL,
    
    -- クーポン基本情報
    strategy_name VARCHAR(100) NOT NULL,
    coupon_type ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'SHIPPING_DISCOUNT') NOT NULL,
    discount_value DECIMAL(8,2) NOT NULL,
    
    -- 適用条件
    target_countries JSON, -- ['DE', 'GB', 'FR']
    minimum_purchase_amount DECIMAL(10,2),
    maximum_discount_amount DECIMAL(8,2),
    usage_limit_per_buyer INTEGER DEFAULT 1,
    total_usage_limit INTEGER,
    
    -- 有効期間
    valid_from DATETIME NOT NULL,
    valid_until DATETIME NOT NULL,
    
    -- 戦略的目的
    purpose ENUM('PRICE_COMPETITION', 'MARKET_PENETRATION', 'INVENTORY_CLEARANCE', 'CUSTOMER_ACQUISITION'),
    expected_impact_percent DECIMAL(5,2),
    
    -- パフォーマンス追跡
    usage_count INTEGER DEFAULT 0,
    total_discount_given DECIMAL(10,2) DEFAULT 0,
    conversion_rate DECIMAL(5,4),
    
    -- メタデータ
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50),
    approval_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_calculation_id (calculation_id),
    INDEX idx_coupon_type (coupon_type),
    INDEX idx_valid_period (valid_from, valid_until),
    INDEX idx_is_active (is_active),
    
    FOREIGN KEY (calculation_id) REFERENCES enhanced_profit_calculations(id) ON DELETE CASCADE
);

-- 6. 競合分析テーブル
CREATE TABLE IF NOT EXISTS competitor_analysis (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER NOT NULL,
    
    -- 競合商品情報
    competitor_listing_id VARCHAR(100),
    competitor_seller VARCHAR(100),
    competitor_price_usd DECIMAL(10,2),
    competitor_shipping_usd DECIMAL(8,2),
    competitor_total_cost DECIMAL(10,2) AS (competitor_price_usd + competitor_shipping_usd) STORED,
    
    -- 比較分析
    our_price_advantage_usd DECIMAL(10,2),
    our_price_advantage_percent DECIMAL(5,2),
    competitiveness_ranking INTEGER,
    
    -- 商品詳細比較
    condition_comparison ENUM('BETTER', 'SAME', 'WORSE'),
    shipping_speed_comparison ENUM('FASTER', 'SAME', 'SLOWER'),
    seller_rating_comparison ENUM('HIGHER', 'SAME', 'LOWER'),
    
    -- マーケット情報
    market_country VARCHAR(3),
    market_position ENUM('CHEAPEST', 'TOP_3', 'TOP_10', 'BELOW_AVERAGE'),
    total_competitors_found INTEGER,
    
    -- データ収集情報
    analysis_date DATE NOT NULL,
    data_source VARCHAR(50), -- 'EBAY_API', 'SCRAPING', 'MANUAL'
    confidence_score DECIMAL(3,2) DEFAULT 0.8,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_calculation_id (calculation_id),
    INDEX idx_analysis_date (analysis_date),
    INDEX idx_market_country (market_country),
    INDEX idx_competitiveness_ranking (competitiveness_ranking),
    
    FOREIGN KEY (calculation_id) REFERENCES enhanced_profit_calculations(id) ON DELETE CASCADE
);

-- 7. パフォーマンス追跡テーブル
CREATE TABLE IF NOT EXISTS strategy_performance (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER NOT NULL,
    listing_strategy_id INTEGER,
    
    -- 期間設定
    tracking_period_start DATE NOT NULL,
    tracking_period_end DATE NOT NULL,
    
    -- 販売実績
    total_sales_count INTEGER DEFAULT 0,
    total_revenue_usd DECIMAL(12,2) DEFAULT 0,
    total_profit_usd DECIMAL(12,2) DEFAULT 0,
    average_selling_price DECIMAL(10,2),
    
    -- 市場反応
    total_views INTEGER DEFAULT 0,
    total_watchers INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4),
    average_time_to_sell_days DECIMAL(6,2),
    
    -- 地域別パフォーマンス
    us_sales_count INTEGER DEFAULT 0,
    us_revenue_usd DECIMAL(10,2) DEFAULT 0,
    international_sales_count INTEGER DEFAULT 0,
    international_revenue_usd DECIMAL(10,2) DEFAULT 0,
    
    -- 戦略効果測定
    ddp_strategy_effectiveness DECIMAL(3,2), -- 0.0-1.0
    coupon_usage_impact DECIMAL(3,2),
    price_optimization_impact DECIMAL(3,2),
    
    -- ROI分析
    marketing_cost_usd DECIMAL(8,2) DEFAULT 0,
    ebay_fees_total_usd DECIMAL(8,2) DEFAULT 0,
    net_roi_percent DECIMAL(6,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_calculation_id (calculation_id),
    INDEX idx_listing_strategy_id (listing_strategy_id),
    INDEX idx_tracking_period (tracking_period_start, tracking_period_end),
    
    FOREIGN KEY (calculation_id) REFERENCES enhanced_profit_calculations(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_strategy_id) REFERENCES listing_strategies(id) ON DELETE SET NULL
);

-- 8. システム設定テーブル
CREATE TABLE IF NOT EXISTS ddp_system_settings (
    id SERIAL PRIMARY KEY,
    setting_category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'JSON') DEFAULT 'STRING',
    
    -- 設定説明
    display_name VARCHAR(200),
    description TEXT,
    default_value TEXT,
    
    -- 制約
    validation_rules JSON, -- 最小値、最大値、正規表現など
    is_user_configurable BOOLEAN DEFAULT TRUE,
    requires_restart BOOLEAN DEFAULT FALSE,
    
    -- 環境設定
    environment ENUM('PRODUCTION', 'STAGING', 'DEVELOPMENT') DEFAULT 'PRODUCTION',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    
    UNIQUE KEY uk_category_key_env (setting_category, setting_key, environment),
    INDEX idx_setting_category (setting_category),
    INDEX idx_is_user_configurable (is_user_configurable)
);

-- 初期データ挿入

-- 国別税制設定の初期データ
INSERT INTO country_tax_settings (
    country_code, country_name, pricing_strategy, vat_rate, 
    duty_free_threshold_usd, has_fta_with_japan, ebay_site_id,
    shipping_limit_standard_usd, shipping_limit_express_usd
) VALUES 
('US', 'United States', 'DDP', 0.08, 800, TRUE, 0, 50, 100),
('DE', 'Germany', 'DDU', 0.19, 22, TRUE, 77, 50, 100),
('GB', 'United Kingdom', 'DDU', 0.20, 15, FALSE, 3, 40, 80),
('FR', 'France', 'DDU', 0.20, 22, TRUE, 71, 50, 100),
('CA', 'Canada', 'DDU', 0.13, 20, TRUE, 2, 60, 120),
('AU', 'Australia', 'DDU', 0.10, 1000, TRUE, 15, 70, 150);

-- HSコード別関税率の初期データ（サンプル）
INSERT INTO hs_code_duty_rates (
    hs_code, hs_description, country_code, mfn_rate, preferential_rate, effective_from
) VALUES 
('8517.12', 'Smartphones', 'US', 0.000, 0.000, '2025-01-01'),
('8517.12', 'Smartphones', 'DE', 0.000, 0.000, '2025-01-01'),
('9001.90', 'Optical instruments', 'US', 0.025, 0.020, '2025-01-01'),
('9001.90', 'Optical instruments', 'DE', 0.025, 0.020, '2025-01-01'),
('8528.72', 'LCD monitors', 'US', 0.050, 0.040, '2025-01-01'),
('8528.72', 'LCD monitors', 'DE', 0.140, 0.120, '2025-01-01'),
('6203.42', 'Mens trousers', 'US', 0.167, 0.150, '2025-01-01'),
('6203.42', 'Mens trousers', 'DE', 0.120, 0.100, '2025-01-01');

-- システム設定の初期データ
INSERT INTO ddp_system_settings (
    setting_category, setting_key, setting_value, setting_type, 
    display_name, description
) VALUES 
('EXCHANGE_RATE', 'safety_margin_percent', '5.0', 'DECIMAL', 
 '為替安全マージン', '為替レートに適用する安全マージンの％'),
('PROFIT', 'default_target_margin', '25.0', 'DECIMAL', 
 'デフォルト利益率', 'デフォルトの目標利益率（％）'),
('EBAY', 'auto_listing_enabled', 'false', 'BOOLEAN', 
 '自動出品有効', 'eBayへの自動出品機能を有効にするか'),
('TAX', 'auto_update_rates', 'true', 'BOOLEAN', 
 '税率自動更新', '関税・VAT率の自動更新を有効にするか'),
('COMPETITOR', 'analysis_frequency_hours', '24', 'INTEGER', 
 '競合分析頻度', '競合分析を実行する間隔（時間）');

-- ビューの作成：計算結果サマリー
CREATE VIEW calculation_summary AS
SELECT 
    epc.id,
    epc.item_id,
    epc.ddu_price_usd,
    epc.ddp_price_usd,
    epc.price_difference_usd,
    epc.price_difference_percent,
    epc.competitiveness_score,
    epc.competitiveness_grade,
    epc.coupon_recommended,
    epc.recommended_strategy,
    COUNT(ls.id) as listing_count,
    COUNT(CASE WHEN ls.status = 'ACTIVE' THEN 1 END) as active_listings,
    epc.created_at
FROM enhanced_profit_calculations epc
LEFT JOIN listing_strategies ls ON epc.id = ls.calculation_id
GROUP BY epc.id
ORDER BY epc.created_at DESC;

-- ストアドプロシージャ：競争力スコア計算
DELIMITER //
CREATE PROCEDURE UpdateCompetitivenessScore(IN calc_id INT)
BEGIN
    DECLARE price_diff_penalty INT DEFAULT 0;
    DECLARE tax_burden_penalty INT DEFAULT 0;
    DECLARE base_score INT DEFAULT 100;
    DECLARE final_score INT;
    
    -- 価格差ペナルティ計算
    SELECT 
        CASE 
            WHEN price_difference_percent <= 5 THEN 0
            WHEN price_difference_percent <= 10 THEN 10
            WHEN price_difference_percent <= 15 THEN 25
            ELSE 50
        END INTO price_diff_penalty
    FROM enhanced_profit_calculations 
    WHERE id = calc_id;
    
    -- 税負担ペナルティ計算
    SELECT 
        CASE 
            WHEN total_tax_burden_usd <= 10 THEN 0
            WHEN total_tax_burden_usd <= 25 THEN 5
            WHEN total_tax_burden_usd <= 50 THEN 15
            ELSE 25
        END INTO tax_burden_penalty
    FROM enhanced_profit_calculations 
    WHERE id = calc_id;
    
    SET final_score = GREATEST(0, base_score - price_diff_penalty - tax_burden_penalty);
    
    -- スコア更新
    UPDATE enhanced_profit_calculations 
    SET 
        competitiveness_score = final_score,
        competitiveness_grade = CASE 
            WHEN final_score >= 80 THEN 'EXCELLENT'
            WHEN final_score >= 60 THEN 'GOOD'
            WHEN final_score >= 40 THEN 'FAIR'
            ELSE 'POOR'
        END
    WHERE id = calc_id;
END //
DELIMITER ;

-- トリガー：計算後の自動処理
CREATE TRIGGER after_calculation_insert 
    AFTER INSERT ON enhanced_profit_calculations
    FOR EACH ROW
BEGIN
    -- 競争力スコア計算
    CALL UpdateCompetitivenessScore(NEW.id);
    
    -- 履歴テーブルへの記録
    INSERT INTO workflow_history (
        product_id, module_name, action, status, notes
    ) VALUES (
        NEW.yahoo_product_id, 'enhanced_profit_calculation', 
        'DDP_DDU_CALCULATION', 'COMPLETED',
        CONCAT('DDU: $', NEW.ddu_price_usd, ', DDP: $', NEW.ddp_price_usd)
    );
END;