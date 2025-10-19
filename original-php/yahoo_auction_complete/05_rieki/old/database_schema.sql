-- Yahoo Auction Tool - 利益計算システム完全版データベーススキーマ
-- PostgreSQL 13+ 対応
-- @author Claude AI
-- @version 2.0.0
-- @date 2025-09-17

-- ====================
-- 1. eBayカテゴリー情報
-- ====================
CREATE TABLE ebay_categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    category_path TEXT,
    final_value_fee DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    insertion_fee DECIMAL(5,2) NOT NULL DEFAULT 0.35,
    store_final_value_fee DECIMAL(5,2),
    international_fee DECIMAL(5,2),
    active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_ebay_categories_active ON ebay_categories(active);
CREATE INDEX idx_ebay_categories_updated ON ebay_categories(last_updated);

-- 初期データ投入（主要カテゴリー）
INSERT INTO ebay_categories (category_id, category_name, final_value_fee, insertion_fee, category_path) VALUES
(293, 'Consumer Electronics', 10.00, 0.35, 'Electronics > Consumer Electronics'),
(11450, 'Clothing, Shoes & Accessories', 12.90, 0.30, 'Fashion > Clothing, Shoes & Accessories'),
(58058, 'Collectibles', 9.15, 0.35, 'Collectibles'),
(267, 'Books', 15.00, 0.30, 'Media > Books'),
(550, 'Art', 12.90, 0.35, 'Art'),
(11233, 'Music', 12.90, 0.30, 'Media > Music'),
(625, 'Cameras & Photo', 10.00, 0.35, 'Electronics > Cameras & Photo'),
(888, 'Sporting Goods', 12.90, 0.35, 'Sports & Recreation > Sporting Goods'),
(281, 'Jewelry & Watches', 13.25, 0.30, 'Fashion > Jewelry & Watches'),
(11700, 'Home & Garden', 10.00, 0.35, 'Home & Garden');

-- ====================
-- 2. 為替レート管理
-- ====================
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    currency_from VARCHAR(3) NOT NULL DEFAULT 'JPY',
    currency_to VARCHAR(3) NOT NULL DEFAULT 'USD',
    rate DECIMAL(10,4) NOT NULL,
    safety_margin DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    calculated_rate DECIMAL(10,4) NOT NULL,
    data_source VARCHAR(50) DEFAULT 'openexchangerates',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_exchange_rates_currency ON exchange_rates(currency_from, currency_to);
CREATE INDEX idx_exchange_rates_recorded ON exchange_rates(recorded_at DESC);

-- ビュー作成（最新レート取得用）
CREATE VIEW latest_exchange_rate AS
SELECT * FROM exchange_rates 
WHERE currency_from = 'JPY' AND currency_to = 'USD'
ORDER BY recorded_at DESC 
LIMIT 1;

-- 初期データ投入
INSERT INTO exchange_rates (rate, safety_margin, calculated_rate, data_source) VALUES
(148.50, 5.00, 155.93, 'initial_setup');

-- ====================
-- 3. 階層型利益率設定
-- ====================
CREATE TABLE profit_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(50) NOT NULL, -- 'global', 'category', 'condition', 'period'
    target_value VARCHAR(100) NOT NULL, -- 対象値（カテゴリーID、コンディション名等）
    profit_margin_target DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    minimum_profit_amount DECIMAL(8,2) NOT NULL DEFAULT 5.00,
    priority_order INTEGER NOT NULL DEFAULT 999,
    conditions TEXT, -- JSON形式で複雑な条件を保存
    active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_profit_settings_type_value ON profit_settings(setting_type, target_value);
CREATE INDEX idx_profit_settings_priority ON profit_settings(priority_order);
CREATE INDEX idx_profit_settings_active ON profit_settings(active);

-- 初期利益率設定投入
INSERT INTO profit_settings (setting_type, target_value, profit_margin_target, minimum_profit_amount, priority_order) VALUES
-- グローバル設定（デフォルト）
('global', 'default', 25.00, 5.00, 999),

-- カテゴリー別設定
('category', '293', 30.00, 8.00, 100), -- Consumer Electronics
('category', '11450', 35.00, 10.00, 100), -- Clothing
('category', '58058', 25.00, 6.00, 100), -- Collectibles
('category', '267', 20.00, 3.00, 100), -- Books
('category', '550', 40.00, 15.00, 100), -- Art

-- コンディション別設定
('condition', 'New', 35.00, 12.00, 200),
('condition', 'Used', 25.00, 5.00, 200),
('condition', 'Refurbished', 30.00, 8.00, 200),

-- 期間別設定（出品経過日数に応じた調整）
('period', '30', 20.00, 3.00, 50), -- 30日経過後
('period', '60', 15.00, 2.00, 50), -- 60日経過後
('period', '90', 10.00, 1.00, 50); -- 90日経過後

-- ====================
-- 4. 利益計算履歴
-- ====================
CREATE TABLE profit_calculations (
    id SERIAL PRIMARY KEY,
    calculation_uuid UUID DEFAULT gen_random_uuid(),
    item_id VARCHAR(100),
    category_id INTEGER REFERENCES ebay_categories(category_id),
    item_condition VARCHAR(50) NOT NULL,
    price_jpy DECIMAL(10,2) NOT NULL,
    shipping_jpy DECIMAL(10,2) NOT NULL DEFAULT 0,
    days_since_listing INTEGER DEFAULT 0,
    
    -- 計算に使用された設定
    applied_profit_setting_id INTEGER REFERENCES profit_settings(id),
    exchange_rate_used DECIMAL(10,4) NOT NULL,
    safety_margin_used DECIMAL(5,2) NOT NULL,
    
    -- 計算結果
    total_cost_usd DECIMAL(10,2) NOT NULL,
    recommended_price_usd DECIMAL(10,2) NOT NULL,
    estimated_profit_usd DECIMAL(10,2) NOT NULL,
    actual_profit_margin DECIMAL(5,2) NOT NULL,
    roi DECIMAL(5,2) NOT NULL,
    total_fees_usd DECIMAL(10,2) NOT NULL,
    
    -- メタデータ
    calculation_source VARCHAR(50) DEFAULT 'manual',
    calculation_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_profit_calculations_item_id ON profit_calculations(item_id);
CREATE INDEX idx_profit_calculations_category ON profit_calculations(category_id);
CREATE INDEX idx_profit_calculations_created ON profit_calculations(created_at DESC);
CREATE INDEX idx_profit_calculations_condition ON profit_calculations(item_condition);

-- ====================
-- 5. 価格自動調整ルール
-- ====================
CREATE TABLE price_adjustment_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES ebay_categories(category_id),
    condition_type VARCHAR(50),
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    days_since_listing INTEGER NOT NULL,
    adjustment_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount'
    adjustment_value DECIMAL(8,2) NOT NULL,
    max_adjustments INTEGER DEFAULT 3,
    min_price_limit DECIMAL(10,2),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_price_adjustment_category ON price_adjustment_rules(category_id);
CREATE INDEX idx_price_adjustment_days ON price_adjustment_rules(days_since_listing);

-- 初期調整ルール投入
INSERT INTO price_adjustment_rules (rule_name, category_id, condition_type, days_since_listing, adjustment_type, adjustment_value, min_price_limit) VALUES
('Electronics Used 30day', 293, 'Used', 30, 'percentage', -5.00, 10.00),
('Electronics New 45day', 293, 'New', 45, 'percentage', -3.00, 20.00),
('Clothing Used 21day', 11450, 'Used', 21, 'percentage', -7.00, 8.00),
('Collectibles 60day', 58058, 'Used', 60, 'percentage', -10.00, 15.00);

-- ====================
-- 6. 価格調整履歴
-- ====================
CREATE TABLE price_adjustments (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    rule_id INTEGER REFERENCES price_adjustment_rules(id),
    original_price DECIMAL(10,2) NOT NULL,
    adjusted_price DECIMAL(10,2) NOT NULL,
    adjustment_amount DECIMAL(10,2) NOT NULL,
    adjustment_reason TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_price_adjustments_item_id ON price_adjustments(item_id);
CREATE INDEX idx_price_adjustments_applied ON price_adjustments(applied_at);

-- ====================
-- 7. システム設定
-- ====================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期システム設定
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category) VALUES
-- API設定
('exchange_api_key', 'your_openexchangerates_api_key', 'string', 'Open Exchange Rates API Key', 'api'),
('exchange_api_provider', 'openexchangerates', 'string', 'Exchange rate API provider', 'api'),
('exchange_update_frequency', '24', 'number', 'Exchange rate update frequency (hours)', 'api'),

-- デフォルト設定
('default_safety_margin', '5.0', 'number', 'Default exchange rate safety margin (%)', 'calculation'),
('global_profit_margin', '25.0', 'number', 'Global default profit margin (%)', 'calculation'),
('minimum_profit_usd', '5.0', 'number', 'Global minimum profit amount (USD)', 'calculation'),

-- 価格調整設定
('price_adjustment_enabled', 'true', 'boolean', 'Enable automatic price adjustments', 'automation'),
('max_price_adjustments', '3', 'number', 'Maximum number of adjustments per item', 'automation'),

-- システム動作設定
('calculation_history_retention_days', '365', 'number', 'Days to retain calculation history', 'system'),
('log_level', 'INFO', 'string', 'System log level', 'system'),
('enable_detailed_logging', 'true', 'boolean', 'Enable detailed operation logging', 'system');

-- ====================
-- 8. システムログ
-- ====================
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL, -- DEBUG, INFO, WARNING, ERROR, CRITICAL
    component VARCHAR(50) NOT NULL, -- PriceCalculator, ExchangeRateUpdater, etc.
    message TEXT NOT NULL,
    context JSON, -- 追加情報をJSON形式で保存
    user_id VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_component ON system_logs(component);
CREATE INDEX idx_system_logs_created ON system_logs(created_at DESC);

-- ====================
-- 9. 統計・分析用ビュー
-- ====================

-- 日次統計ビュー
CREATE VIEW daily_calculation_stats AS
SELECT 
    DATE(created_at) as calculation_date,
    COUNT(*) as total_calculations,
    AVG(actual_profit_margin) as avg_profit_margin,
    AVG(roi) as avg_roi,
    AVG(recommended_price_usd) as avg_recommended_price,
    COUNT(DISTINCT category_id) as categories_used
FROM profit_calculations
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY calculation_date DESC;

-- カテゴリー別パフォーマンスビュー
CREATE VIEW category_performance AS
SELECT 
    ec.category_name,
    ec.category_id,
    COUNT(pc.*) as calculation_count,
    AVG(pc.actual_profit_margin) as avg_profit_margin,
    AVG(pc.roi) as avg_roi,
    AVG(pc.recommended_price_usd) as avg_price,
    MIN(pc.created_at) as first_calculation,
    MAX(pc.created_at) as last_calculation
FROM ebay_categories ec
LEFT JOIN profit_calculations pc ON ec.category_id = pc.category_id
WHERE pc.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ec.category_id, ec.category_name
ORDER BY calculation_count DESC;

-- ====================
-- 10. トリガー関数（自動更新用）
-- ====================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー適用
CREATE TRIGGER update_ebay_categories_modtime 
    BEFORE UPDATE ON ebay_categories 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_profit_settings_modtime 
    BEFORE UPDATE ON profit_settings 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_price_adjustment_rules_modtime 
    BEFORE UPDATE ON price_adjustment_rules 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_system_settings_modtime 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ====================
-- 11. データクリーンアップ関数
-- ====================

-- 古い計算履歴削除関数
CREATE OR REPLACE FUNCTION cleanup_old_calculations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    retention_days INTEGER;
BEGIN
    -- システム設定から保持期間を取得
    SELECT setting_value::INTEGER INTO retention_days
    FROM system_settings 
    WHERE setting_key = 'calculation_history_retention_days';
    
    -- デフォルト値設定
    IF retention_days IS NULL THEN
        retention_days := 365;
    END IF;
    
    -- 古いレコード削除
    DELETE FROM profit_calculations 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- ログ記録
    INSERT INTO system_logs (log_level, component, message, context)
    VALUES ('INFO', 'DataCleanup', 'Old calculation records cleaned up', 
            json_build_object('deleted_count', deleted_count, 'retention_days', retention_days));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 古い為替レートデータ削除関数
CREATE OR REPLACE FUNCTION cleanup_old_exchange_rates()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 30日以上古い為替レートデータを削除（最新1件は保持）
    DELETE FROM exchange_rates 
    WHERE recorded_at < CURRENT_DATE - INTERVAL '30 days'
    AND id NOT IN (
        SELECT id FROM exchange_rates 
        ORDER BY recorded_at DESC 
        LIMIT 1
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- ログ記録
    INSERT INTO system_logs (log_level, component, message, context)
    VALUES ('INFO', 'DataCleanup', 'Old exchange rate records cleaned up', 
            json_build_object('deleted_count', deleted_count));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 12. 権限設定（本番環境用）
-- ====================

-- アプリケーション用ユーザー作成（本番環境で実行）
-- CREATE USER yahoo_auction_app WITH PASSWORD 'secure_password';
-- GRANT CONNECT ON DATABASE yahoo_auction_tool TO yahoo_auction_app;
-- GRANT USAGE ON SCHEMA public TO yahoo_auction_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO yahoo_auction_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO yahoo_auction_app;

-- ====================
-- 13. 初期化完了確認
-- ====================

-- システム初期化ログ
INSERT INTO system_logs (log_level, component, message, context)
VALUES ('INFO', 'DatabaseSetup', 'Database schema initialization completed', 
        json_build_object('version', '2.0.0', 'timestamp', CURRENT_TIMESTAMP));

-- 設定確認用クエリ
-- SELECT 'Database schema setup completed successfully' as status,
--        COUNT(*) as total_tables
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('ebay_categories', 'exchange_rates', 'profit_settings', 'profit_calculations', 'system_settings');

COMMIT;