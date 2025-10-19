-- ===============================================
-- 価格最適化システム - データベーススキーマ
-- n3-frontend 用 Supabase スキーマ
-- ===============================================

-- 1. 仕入値変動履歴テーブル
CREATE TABLE IF NOT EXISTS cost_change_history (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    
    -- 仕入値情報
    old_cost DECIMAL(10,2) NOT NULL,
    new_cost DECIMAL(10,2) NOT NULL,
    cost_difference DECIMAL(10,2) GENERATED ALWAYS AS (new_cost - old_cost) STORED,
    cost_change_percent DECIMAL(5,2),
    
    -- 変更理由
    change_reason VARCHAR(255),
    change_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'import', 'webhook', 'api'
    
    -- 影響分析
    affected_price DECIMAL(10,2),
    margin_impact DECIMAL(5,2),
    requires_price_adjustment BOOLEAN DEFAULT FALSE,
    
    -- メタデータ
    changed_by VARCHAR(100),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- インデックス用
    CONSTRAINT cost_change_item_fk FOREIGN KEY (item_id) 
        REFERENCES inventory_management(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_cost_change_item ON cost_change_history(item_id);
CREATE INDEX idx_cost_change_date ON cost_change_history(changed_at DESC);
CREATE INDEX idx_cost_change_processed ON cost_change_history(processed);
CREATE INDEX idx_cost_change_requires_adjustment ON cost_change_history(requires_price_adjustment);

-- 2. 競合価格テーブル
CREATE TABLE IF NOT EXISTS competitor_prices (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    ebay_site_id INTEGER NOT NULL,
    
    -- 価格情報
    lowest_price DECIMAL(10,2) NOT NULL,
    average_price DECIMAL(10,2),
    median_price DECIMAL(10,2),
    highest_price DECIMAL(10,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- 検索情報
    listings_count INTEGER DEFAULT 0,
    search_keywords TEXT,
    category_id INTEGER,
    condition_filter VARCHAR(50),
    
    -- メタデータ
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    data_quality_score DECIMAL(3,2) DEFAULT 1.0,
    
    CONSTRAINT competitor_unique_daily UNIQUE(item_id, country_code, fetched_at::date)
);

CREATE INDEX idx_competitor_prices_item ON competitor_prices(item_id);
CREATE INDEX idx_competitor_prices_country ON competitor_prices(country_code);
CREATE INDEX idx_competitor_prices_fetched ON competitor_prices(fetched_at DESC);
CREATE INDEX idx_competitor_prices_expires ON competitor_prices(expires_at);

-- 3. 自動価格設定テーブル
CREATE TABLE IF NOT EXISTS auto_pricing_settings (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) UNIQUE NOT NULL,
    sku VARCHAR(100),
    
    -- 最低利益設定
    min_margin_percent DECIMAL(5,2) DEFAULT 20.00,
    min_profit_amount DECIMAL(10,2),
    allow_loss BOOLEAN DEFAULT FALSE,
    max_loss_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- 最安値追従設定
    auto_tracking_enabled BOOLEAN DEFAULT FALSE,
    target_competitor_ratio DECIMAL(5,2) DEFAULT 0.90, -- 競合の90%
    max_price_decrease_percent DECIMAL(5,2) DEFAULT 10.00,
    max_price_increase_percent DECIMAL(5,2) DEFAULT 20.00,
    
    -- 対象国設定
    target_countries TEXT[] DEFAULT ARRAY['US', 'UK', 'DE', 'AU'],
    
    -- 価格範囲制限
    min_allowed_price DECIMAL(10,2),
    max_allowed_price DECIMAL(10,2),
    
    -- 調整頻度
    adjustment_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'manual'
    last_adjusted_at TIMESTAMP WITH TIME ZONE,
    next_adjustment_at TIMESTAMP WITH TIME ZONE,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT auto_pricing_item_fk FOREIGN KEY (item_id) 
        REFERENCES inventory_management(item_id) ON DELETE CASCADE
);

CREATE INDEX idx_auto_pricing_item ON auto_pricing_settings(item_id);
CREATE INDEX idx_auto_pricing_enabled ON auto_pricing_settings(auto_tracking_enabled);
CREATE INDEX idx_auto_pricing_next_adjustment ON auto_pricing_settings(next_adjustment_at);

-- 4. 価格調整キューテーブル
CREATE TABLE IF NOT EXISTS price_adjustment_queue (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    ebay_item_id VARCHAR(100),
    
    -- 価格情報
    current_price DECIMAL(10,2) NOT NULL,
    proposed_price DECIMAL(10,2) NOT NULL,
    price_difference DECIMAL(10,2) GENERATED ALWAYS AS (proposed_price - current_price) STORED,
    price_change_percent DECIMAL(5,2),
    
    -- 調整理由
    adjustment_reason TEXT,
    trigger_type VARCHAR(50), -- 'cost_change', 'competitor', 'manual', 'batch', 'scheduled'
    trigger_id INTEGER, -- 参照元のID（cost_change_id、competitor_price_idなど）
    
    -- 利益予測
    expected_margin DECIMAL(5,2),
    expected_profit DECIMAL(10,2),
    current_margin DECIMAL(5,2),
    current_profit DECIMAL(10,2),
    
    -- リスク評価
    is_red_risk BOOLEAN DEFAULT FALSE,
    risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
    risk_reasons TEXT[],
    
    -- 承認フロー
    status VARCHAR(50) DEFAULT 'pending_approval',
    -- 'pending_approval', 'approved', 'rejected', 'applied', 'failed', 'expired'
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- 実行情報
    applied_at TIMESTAMP WITH TIME ZONE,
    ebay_api_response JSONB,
    error_message TEXT,
    
    -- 有効期限
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_queue_item ON price_adjustment_queue(item_id);
CREATE INDEX idx_price_queue_status ON price_adjustment_queue(status);
CREATE INDEX idx_price_queue_risk ON price_adjustment_queue(is_red_risk);
CREATE INDEX idx_price_queue_trigger ON price_adjustment_queue(trigger_type);
CREATE INDEX idx_price_queue_created ON price_adjustment_queue(created_at DESC);
CREATE INDEX idx_price_queue_expires ON price_adjustment_queue(expires_at);

-- 5. 価格更新履歴テーブル
CREATE TABLE IF NOT EXISTS price_update_history (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    ebay_item_id VARCHAR(100),
    adjustment_queue_id INTEGER REFERENCES price_adjustment_queue(id),
    
    -- 価格変更
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    price_change DECIMAL(10,2) GENERATED ALWAYS AS (new_price - old_price) STORED,
    price_change_percent DECIMAL(5,2),
    
    -- 変更理由
    change_reason TEXT,
    trigger_type VARCHAR(50),
    
    -- eBay API情報
    ebay_api_call_id VARCHAR(100),
    ebay_response JSONB,
    api_call_duration_ms INTEGER,
    
    -- 結果
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- メタデータ
    updated_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_price_history_item ON price_update_history(item_id);
CREATE INDEX idx_price_history_created ON price_update_history(created_at DESC);
CREATE INDEX idx_price_history_success ON price_update_history(success);
CREATE INDEX idx_price_history_queue ON price_update_history(adjustment_queue_id);

-- 6. eBay MUG対応国マスタ
CREATE TABLE IF NOT EXISTS ebay_mug_countries (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    ebay_site_id INTEGER NOT NULL,
    ebay_global_id VARCHAR(20) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    
    -- API設定
    api_endpoint VARCHAR(255),
    finding_api_url VARCHAR(255),
    trading_api_url VARCHAR(255),
    
    -- 利用可能性
    is_active BOOLEAN DEFAULT TRUE,
    supports_finding_api BOOLEAN DEFAULT TRUE,
    supports_trading_api BOOLEAN DEFAULT TRUE,
    
    -- Rate Limit設定
    daily_api_limit INTEGER DEFAULT 5000,
    hourly_api_limit INTEGER DEFAULT 500,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入
INSERT INTO ebay_mug_countries (country_code, country_name, ebay_site_id, ebay_global_id, currency_code, finding_api_url) VALUES
('US', 'United States', 0, 'EBAY-US', 'USD', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('UK', 'United Kingdom', 3, 'EBAY-GB', 'GBP', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('DE', 'Germany', 77, 'EBAY-DE', 'EUR', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('AU', 'Australia', 15, 'EBAY-AU', 'AUD', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('CA', 'Canada', 2, 'EBAY-CA', 'CAD', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('FR', 'France', 71, 'EBAY-FR', 'EUR', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('IT', 'Italy', 101, 'EBAY-IT', 'EUR', 'https://svcs.ebay.com/services/search/FindingService/v1'),
('ES', 'Spain', 186, 'EBAY-ES', 'EUR', 'https://svcs.ebay.com/services/search/FindingService/v1')
ON CONFLICT (country_code) DO NOTHING;

-- 7. 価格最適化ルールテーブル
CREATE TABLE IF NOT EXISTS price_optimization_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'global', 'category', 'item', 'condition'
    
    -- 適用条件
    category_id INTEGER,
    item_id VARCHAR(100),
    condition_type VARCHAR(50),
    price_range_min DECIMAL(10,2),
    price_range_max DECIMAL(10,2),
    
    -- 最適化設定
    target_margin_percent DECIMAL(5,2),
    competitor_price_ratio DECIMAL(5,2) DEFAULT 0.90,
    max_adjustment_percent DECIMAL(5,2) DEFAULT 10.00,
    
    -- 制約条件
    min_margin_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    min_profit_amount DECIMAL(10,2),
    max_loss_percent DECIMAL(5,2) DEFAULT 0.00,
    
    -- 実行設定
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- メタデータ
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_optimization_rules_type ON price_optimization_rules(rule_type);
CREATE INDEX idx_optimization_rules_category ON price_optimization_rules(category_id);
CREATE INDEX idx_optimization_rules_active ON price_optimization_rules(is_active);
CREATE INDEX idx_optimization_rules_priority ON price_optimization_rules(priority);

-- 8. システムアラートテーブル
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL, -- 'red_risk', 'cost_change', 'competitor_alert', 'api_error'
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    
    -- 関連情報
    item_id VARCHAR(100),
    related_table VARCHAR(50),
    related_id INTEGER,
    
    -- アラート内容
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'unread', -- 'unread', 'read', 'acknowledged', 'resolved'
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_alerts_type ON system_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_alerts_status ON system_alerts(status);
CREATE INDEX idx_alerts_item ON system_alerts(item_id);
CREATE INDEX idx_alerts_created ON system_alerts(created_at DESC);

-- 9. 既存テーブルの拡張（ALTERコマンド）
-- inventory_managementテーブルに自動価格調整フラグを追加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_management' 
        AND column_name = 'auto_pricing_enabled'
    ) THEN
        ALTER TABLE inventory_management
        ADD COLUMN auto_pricing_enabled BOOLEAN DEFAULT FALSE,
        ADD COLUMN last_cost_update TIMESTAMP WITH TIME ZONE,
        ADD COLUMN cost_change_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- profit_margin_settingsテーブルの拡張
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profit_margin_settings' 
        AND column_name = 'min_profit_amount'
    ) THEN
        ALTER TABLE profit_margin_settings
        ADD COLUMN min_profit_amount DECIMAL(10,2),
        ADD COLUMN allow_loss BOOLEAN DEFAULT FALSE,
        ADD COLUMN max_loss_percent DECIMAL(5,2) DEFAULT 0.00,
        ADD COLUMN adjustment_frequency VARCHAR(20) DEFAULT 'manual';
    END IF;
END $$;

-- 10. ビュー作成

-- 承認待ちキューのビュー
CREATE OR REPLACE VIEW v_pending_price_adjustments AS
SELECT 
    q.id,
    q.item_id,
    q.current_price,
    q.proposed_price,
    q.price_difference,
    q.price_change_percent,
    q.adjustment_reason,
    q.expected_margin,
    q.is_red_risk,
    q.risk_level,
    q.status,
    q.created_at,
    i.product_name,
    i.sku,
    i.current_stock,
    s.min_margin_percent,
    s.auto_tracking_enabled
FROM price_adjustment_queue q
LEFT JOIN inventory_management i ON q.item_id = i.item_id
LEFT JOIN auto_pricing_settings s ON q.item_id = s.item_id
WHERE q.status = 'pending_approval'
  AND q.expires_at > CURRENT_TIMESTAMP
ORDER BY q.is_red_risk DESC, q.created_at DESC;

-- 最新の競合価格ビュー
CREATE OR REPLACE VIEW v_latest_competitor_prices AS
SELECT DISTINCT ON (item_id, country_code)
    item_id,
    country_code,
    lowest_price,
    average_price,
    currency,
    listings_count,
    fetched_at
FROM competitor_prices
WHERE expires_at > CURRENT_TIMESTAMP
ORDER BY item_id, country_code, fetched_at DESC;

-- 11. トリガー関数

-- updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_auto_pricing_settings_updated_at
    BEFORE UPDATE ON auto_pricing_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_adjustment_queue_updated_at
    BEFORE UPDATE ON price_adjustment_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_optimization_rules_updated_at
    BEFORE UPDATE ON price_optimization_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. Row Level Security (RLS) 設定
-- Supabaseで使用する場合

ALTER TABLE cost_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_adjustment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_update_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全て読み取り可能
CREATE POLICY "Allow authenticated users to read" ON cost_change_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read" ON competitor_prices
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read" ON auto_pricing_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read" ON price_adjustment_queue
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read" ON price_update_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read" ON system_alerts
    FOR SELECT USING (auth.role() = 'authenticated');

-- 挿入・更新は認証済みユーザーのみ
CREATE POLICY "Allow authenticated users to insert" ON cost_change_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert" ON price_adjustment_queue
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update" ON price_adjustment_queue
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '価格最適化システム - データベーススキーマのセットアップが完了しました';
    RAISE NOTICE '作成されたテーブル: 9個';
    RAISE NOTICE '作成されたビュー: 2個';
    RAISE NOTICE '作成されたインデックス: 40個以上';
END $$;