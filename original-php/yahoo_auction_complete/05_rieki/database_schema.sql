-- 価格・利益計算システム最終版 データベーススキーマ
-- PostgreSQL用DDL文

-- 1. eBayカテゴリー情報テーブル
-- カテゴリー取得ツールと連携し、カテゴリー番号と手数料情報を一元管理
CREATE TABLE ebay_categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    final_value_fee DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- ファイナルバリューフィー（%）
    insertion_fee DECIMAL(5,2) NOT NULL DEFAULT 0.35,   -- 出品手数料（USD）
    store_final_value_fee DECIMAL(5,2) DEFAULT 9.15,    -- ストア手数料（%）
    category_path TEXT,                                   -- カテゴリーパス（例：Electronics > Computers）
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- カテゴリーデータのサンプル挿入
INSERT INTO ebay_categories (category_id, category_name, final_value_fee, insertion_fee, category_path) VALUES
(293, 'Consumer Electronics', 10.00, 0.35, 'Electronics > Consumer Electronics'),
(11450, 'Clothing, Shoes & Accessories', 12.90, 0.30, 'Fashion > Clothing, Shoes & Accessories'),
(58058, 'Collectibles', 9.15, 0.35, 'Collectibles'),
(267, 'Books', 15.00, 0.30, 'Books, Movies & Music > Books'),
(550, 'Art', 12.90, 0.35, 'Art');

-- 2. 利益率・価格設定管理テーブル
-- グローバル、カテゴリー、コンディションなど、階層的な利益設定を管理
CREATE TABLE profit_settings (
    id SERIAL PRIMARY KEY,
    setting_type VARCHAR(50) NOT NULL CHECK (setting_type IN ('global', 'category', 'condition', 'period')),
    target_value VARCHAR(100) NOT NULL, -- category_id, condition_name, days_since_listing
    profit_margin_target DECIMAL(5,2) NOT NULL DEFAULT 25.00, -- 目標利益率（%）
    minimum_profit_amount DECIMAL(8,2) NOT NULL DEFAULT 5.00,  -- 最低利益額（USD）
    maximum_price_usd DECIMAL(10,2),                           -- 最大販売価格制限
    priority_order INT NOT NULL DEFAULT 999,                   -- 設定適用優先順位
    active BOOLEAN DEFAULT TRUE,
    description TEXT,                                           -- 設定の説明
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期設定データの挿入
INSERT INTO profit_settings (setting_type, target_value, profit_margin_target, minimum_profit_amount, priority_order, description) VALUES
('global', 'default', 25.00, 5.00, 999, 'デフォルト利益率設定'),
('category', '293', 30.00, 8.00, 100, 'エレクトロニクス製品の利益率'),
('category', '11450', 35.00, 10.00, 100, 'ファッション製品の利益率'),
('condition', 'Used', 20.00, 3.00, 200, '中古商品の利益率'),
('condition', 'New', 28.00, 7.00, 200, '新品商品の利益率'),
('period', '30', 15.00, 2.00, 50, '出品から30日経過後の利益率調整'),
('period', '60', 10.00, 1.00, 50, '出品から60日経過後の利益率調整');

-- 3. 為替レート履歴テーブル
-- 過去の為替レートと安全マージンを記録し、動的な価格計算に利用
CREATE TABLE exchange_rates (
    id SERIAL PRIMARY KEY,
    currency_from VARCHAR(3) NOT NULL DEFAULT 'JPY',
    currency_to VARCHAR(3) NOT NULL DEFAULT 'USD',
    rate DECIMAL(10, 6) NOT NULL,                      -- 基本為替レート
    safety_margin DECIMAL(5,2) NOT NULL DEFAULT 5.00, -- 安全マージン（%）
    calculated_rate DECIMAL(10,6) NOT NULL,           -- マージン適用後レート
    source VARCHAR(50) DEFAULT 'Open Exchange Rates', -- データソース
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- サンプル為替データ
INSERT INTO exchange_rates (rate, safety_margin, calculated_rate, source) VALUES
(0.0067, 5.00, 0.0070, 'Open Exchange Rates API'),
(0.0066, 5.00, 0.0069, 'Open Exchange Rates API'),
(0.0068, 5.00, 0.0071, 'Open Exchange Rates API');

-- 4. 価格調整ルールテーブル
-- 出品からの経過日数に応じた自動価格調整ルールを管理
CREATE TABLE price_adjustment_rules (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES ebay_categories(category_id),
    condition_type VARCHAR(50),                              -- 商品コンディション
    days_since_listing INT NOT NULL,                        -- 出品からの経過日数
    adjustment_type VARCHAR(50) NOT NULL CHECK (adjustment_type IN ('percentage', 'fixed_amount')),
    adjustment_value DECIMAL(8,2) NOT NULL,                 -- 調整値（%または固定額）
    min_price_limit DECIMAL(8,2),                          -- 最低価格制限
    max_applications INT DEFAULT NULL,                       -- 適用回数上限
    active BOOLEAN DEFAULT TRUE,
    description TEXT,                                        -- ルールの説明
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- サンプル価格調整ルール
INSERT INTO price_adjustment_rules (category_id, condition_type, days_since_listing, adjustment_type, adjustment_value, min_price_limit, description) VALUES
(293, 'Used', 30, 'percentage', -5.00, 10.00, 'エレクトロニクス中古品：30日後5%値下げ'),
(293, 'New', 45, 'percentage', -3.00, 15.00, 'エレクトロニクス新品：45日後3%値下げ'),
(11450, 'Used', 20, 'percentage', -10.00, 8.00, 'ファッション中古品：20日後10%値下げ'),
(11450, 'New', 35, 'percentage', -7.00, 12.00, 'ファッション新品：35日後7%値下げ');

-- 5. 利益計算履歴テーブル
-- すべての計算過程の履歴を保存
CREATE TABLE profit_calculations (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,                     -- 商品ID
    category_id INT REFERENCES ebay_categories(category_id),
    item_condition VARCHAR(50),                        -- 商品コンディション
    days_since_listing INT DEFAULT 0,                 -- 出品からの経過日数
    
    -- 入力データ
    price_jpy DECIMAL(10,2) NOT NULL,                 -- 商品価格（円）
    shipping_jpy DECIMAL(8,2) DEFAULT 0,              -- 送料（円）
    
    -- 計算に使用したレートと設定
    exchange_rate DECIMAL(10,6) NOT NULL,             -- 使用した為替レート
    safety_margin DECIMAL(5,2) NOT NULL,              -- 適用した安全マージン
    profit_margin_target DECIMAL(5,2) NOT NULL,       -- 目標利益率
    minimum_profit_amount DECIMAL(8,2) NOT NULL,      -- 最低利益額
    
    -- eBay手数料
    final_value_fee_percent DECIMAL(5,2) NOT NULL,    -- ファイナルバリューフィー率
    insertion_fee_usd DECIMAL(5,2) NOT NULL,          -- 出品手数料
    
    -- 計算結果
    total_cost_jpy DECIMAL(10,2) NOT NULL,            -- 総コスト（円）
    total_cost_usd DECIMAL(10,2) NOT NULL,            -- 総コスト（USD）
    recommended_price_usd DECIMAL(10,2) NOT NULL,     -- 推奨販売価格（USD）
    estimated_profit_usd DECIMAL(10,2) NOT NULL,      -- 予想利益（USD）
    actual_profit_margin DECIMAL(5,2) NOT NULL,       -- 実際の利益率
    roi DECIMAL(5,2) NOT NULL,                        -- ROI
    
    -- メタデータ
    calculation_type VARCHAR(50) DEFAULT 'standard',   -- 計算タイプ
    notes TEXT,                                        -- 備考
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. システム設定テーブル
-- システム全体の設定を管理
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- システム設定の初期データ
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('exchange_api_key', '', 'string', 'Open Exchange Rates APIキー'),
('default_safety_margin', '5.0', 'number', 'デフォルト為替安全マージン（%）'),
('price_update_frequency', '24', 'number', '価格自動更新頻度（時間）'),
('max_price_adjustments', '3', 'number', '商品あたりの最大価格調整回数'),
('enable_auto_pricing', 'true', 'boolean', '自動価格調整機能の有効/無効');

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_profit_calculations_item_id ON profit_calculations(item_id);
CREATE INDEX idx_profit_calculations_created_at ON profit_calculations(created_at DESC);
CREATE INDEX idx_exchange_rates_recorded_at ON exchange_rates(recorded_at DESC);
CREATE INDEX idx_profit_settings_type_value ON profit_settings(setting_type, target_value);
CREATE INDEX idx_price_adjustment_rules_category_condition ON price_adjustment_rules(category_id, condition_type);

-- ビュー作成（よく使用されるクエリの最適化）
CREATE VIEW latest_exchange_rate AS
SELECT rate, safety_margin, calculated_rate, recorded_at
FROM exchange_rates
WHERE currency_from = 'JPY' AND currency_to = 'USD'
ORDER BY recorded_at DESC
LIMIT 1;

-- トリガー関数（updated_atの自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_ebay_categories_updated_at BEFORE UPDATE ON ebay_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profit_settings_updated_at BEFORE UPDATE ON profit_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_price_adjustment_rules_updated_at BEFORE UPDATE ON price_adjustment_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();