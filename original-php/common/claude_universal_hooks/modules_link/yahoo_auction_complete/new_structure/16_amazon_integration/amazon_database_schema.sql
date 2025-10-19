-- =============================================
-- Amazon統合システム - データベーススキーマ
-- new_structure/16_amazon_integration/schema/
-- =============================================

-- Amazon商品リサーチデータ（メインテーブル）
CREATE TABLE amazon_research_data (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) UNIQUE NOT NULL,
    
    -- 基本情報
    title TEXT,
    brand VARCHAR(255),
    manufacturer VARCHAR(255),
    product_group VARCHAR(100),
    binding VARCHAR(100),
    
    -- 価格・在庫情報
    current_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    savings_amount DECIMAL(10,2),
    savings_percentage DECIMAL(5,2),
    
    -- 在庫状況
    availability_status VARCHAR(50), -- 'In Stock', 'Out of Stock', 'Limited Stock'
    availability_message TEXT,
    max_order_quantity INTEGER,
    min_order_quantity INTEGER DEFAULT 1,
    
    -- プライム・配送情報
    is_prime_eligible BOOLEAN DEFAULT FALSE,
    is_free_shipping_eligible BOOLEAN DEFAULT FALSE,
    is_amazon_fulfilled BOOLEAN DEFAULT FALSE,
    shipping_charges DECIMAL(8,2),
    
    -- レビュー・評価
    review_count INTEGER DEFAULT 0,
    star_rating DECIMAL(3,2),
    
    -- ランキング情報（JSON）
    sales_rank JSONB,
    category_ranks JSONB,
    
    -- 画像情報（JSON配列）
    images_primary JSONB, -- {small, medium, large}
    images_variants JSONB, -- [{small, medium, large}, ...]
    
    -- 商品詳細情報（JSON）
    features JSONB, -- ["特徴1", "特徴2", ...]
    product_dimensions JSONB, -- {height, width, length, weight}
    item_specifics JSONB, -- {color, size, model, etc...}
    technical_details JSONB,
    
    -- カテゴリ情報
    browse_nodes JSONB, -- [{id, name, ancestor}, ...]
    
    -- 関連商品情報
    parent_asin VARCHAR(10),
    variation_summary JSONB, -- {count, price_range}
    
    -- 外部ID
    external_ids JSONB, -- {ean, upc, isbn, etc...}
    
    -- メーカー・販売者情報
    merchant_info JSONB,
    
    -- プロモーション情報
    promotions JSONB,
    
    -- 監視・管理情報
    is_high_priority BOOLEAN DEFAULT FALSE,
    price_fluctuation_count INTEGER DEFAULT 0,
    stock_change_count INTEGER DEFAULT 0,
    
    -- チェック履歴
    last_price_check_at TIMESTAMP,
    last_stock_check_at TIMESTAMP,
    last_api_update_at TIMESTAMP,
    
    -- データ品質管理
    data_completeness_score DECIMAL(3,2) DEFAULT 0.00, -- 0.00-1.00
    api_error_count INTEGER DEFAULT 0,
    last_api_error TEXT,
    
    -- システム情報
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- データ取得元・バージョン管理
    api_version VARCHAR(10) DEFAULT '5.0',
    marketplace VARCHAR(10) DEFAULT 'US', -- US, JP, UK, etc
    data_source VARCHAR(20) DEFAULT 'PA-API'
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_amazon_asin ON amazon_research_data(asin);
CREATE INDEX idx_amazon_brand ON amazon_research_data(brand);
CREATE INDEX idx_amazon_price ON amazon_research_data(current_price);
CREATE INDEX idx_amazon_availability ON amazon_research_data(availability_status);
CREATE INDEX idx_amazon_prime ON amazon_research_data(is_prime_eligible);
CREATE INDEX idx_amazon_priority ON amazon_research_data(is_high_priority);
CREATE INDEX idx_amazon_updated ON amazon_research_data(updated_at);
CREATE INDEX idx_amazon_parent ON amazon_research_data(parent_asin);

-- JSON フィールドのGINインデックス（高速検索）
CREATE INDEX idx_amazon_features_gin ON amazon_research_data USING GIN (features);
CREATE INDEX idx_amazon_specifics_gin ON amazon_research_data USING GIN (item_specifics);
CREATE INDEX idx_amazon_sales_rank_gin ON amazon_research_data USING GIN (sales_rank);

-- =============================================
-- 価格履歴テーブル（価格変動追跡）
-- =============================================
CREATE TABLE amazon_price_history (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) NOT NULL REFERENCES amazon_research_data(asin) ON DELETE CASCADE,
    
    -- 価格情報
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_type VARCHAR(20) DEFAULT 'listing', -- 'listing', 'sale', 'discount'
    
    -- 変動情報
    previous_price DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    change_percentage DECIMAL(5,2),
    
    -- コンテキスト情報
    availability_status VARCHAR(50),
    is_prime_eligible BOOLEAN,
    promotion_active BOOLEAN DEFAULT FALSE,
    
    -- 記録情報
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detection_method VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'manual', 'alert'
    
    -- 監視設定
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMP
);

CREATE INDEX idx_price_history_asin ON amazon_price_history(asin);
CREATE INDEX idx_price_history_recorded ON amazon_price_history(recorded_at);
CREATE INDEX idx_price_history_change ON amazon_price_history(change_percentage);

-- =============================================
-- 在庫変動履歴テーブル
-- =============================================
CREATE TABLE amazon_stock_history (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) NOT NULL REFERENCES amazon_research_data(asin) ON DELETE CASCADE,
    
    -- 在庫状況
    availability_status VARCHAR(50) NOT NULL,
    availability_message TEXT,
    previous_status VARCHAR(50),
    
    -- 在庫数量（取得可能な場合）
    stock_quantity INTEGER,
    max_order_quantity INTEGER,
    min_order_quantity INTEGER,
    
    -- 変動情報
    status_changed BOOLEAN DEFAULT FALSE,
    back_in_stock BOOLEAN DEFAULT FALSE,
    out_of_stock BOOLEAN DEFAULT FALSE,
    
    -- 記録情報
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    detection_method VARCHAR(20) DEFAULT 'scheduled',
    
    -- アラート管理
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMP
);

CREATE INDEX idx_stock_history_asin ON amazon_stock_history(asin);
CREATE INDEX idx_stock_history_status ON amazon_stock_history(availability_status);
CREATE INDEX idx_stock_history_recorded ON amazon_stock_history(recorded_at);

-- =============================================
-- API リクエスト履歴・監視テーブル
-- =============================================
CREATE TABLE amazon_api_requests (
    id SERIAL PRIMARY KEY,
    
    -- リクエスト情報
    request_type VARCHAR(20) NOT NULL, -- 'GetItems', 'SearchItems'
    asin_list TEXT, -- カンマ区切りASINリスト
    asin_count INTEGER DEFAULT 0,
    
    -- レスポンス情報
    success BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER,
    http_status_code INTEGER,
    api_error_code VARCHAR(50),
    api_error_message TEXT,
    
    -- データ取得結果
    items_returned INTEGER DEFAULT 0,
    items_requested INTEGER DEFAULT 0,
    data_size_bytes INTEGER,
    
    -- レート制限情報
    rate_limit_remaining INTEGER,
    rate_limit_reset_time TIMESTAMP,
    
    -- 記録情報
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marketplace VARCHAR(10) DEFAULT 'US',
    api_version VARCHAR(10) DEFAULT '5.0'
);

CREATE INDEX idx_api_requests_time ON amazon_api_requests(requested_at);
CREATE INDEX idx_api_requests_success ON amazon_api_requests(success);
CREATE INDEX idx_api_requests_type ON amazon_api_requests(request_type);

-- =============================================
-- 監視設定・アラート設定テーブル
-- =============================================
CREATE TABLE amazon_monitoring_rules (
    id SERIAL PRIMARY KEY,
    
    -- 監視対象
    asin VARCHAR(10) REFERENCES amazon_research_data(asin) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    
    -- 監視設定
    monitor_price BOOLEAN DEFAULT TRUE,
    monitor_stock BOOLEAN DEFAULT TRUE,
    monitor_rating BOOLEAN DEFAULT FALSE,
    
    -- 価格監視閾値
    price_change_threshold_percent DECIMAL(5,2) DEFAULT 5.00,
    price_increase_alert BOOLEAN DEFAULT TRUE,
    price_decrease_alert BOOLEAN DEFAULT TRUE,
    target_price_max DECIMAL(10,2),
    target_price_min DECIMAL(10,2),
    
    -- 在庫監視設定
    stock_out_alert BOOLEAN DEFAULT TRUE,
    stock_in_alert BOOLEAN DEFAULT TRUE,
    low_stock_threshold INTEGER DEFAULT 5,
    
    -- 監視頻度
    check_frequency_minutes INTEGER DEFAULT 30, -- 高頻度: 30分, 低頻度: 1440分(1日)
    priority_level VARCHAR(10) DEFAULT 'normal', -- 'high', 'normal', 'low'
    
    -- アラート設定
    email_alerts BOOLEAN DEFAULT FALSE,
    webhook_url TEXT,
    slack_channel VARCHAR(50),
    
    -- 状態管理
    is_active BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMP,
    next_check_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monitoring_asin ON amazon_monitoring_rules(asin);
CREATE INDEX idx_monitoring_active ON amazon_monitoring_rules(is_active);
CREATE INDEX idx_monitoring_next_check ON amazon_monitoring_rules(next_check_at);

-- =============================================
-- ASIN管理・キューテーブル
-- =============================================
CREATE TABLE amazon_asin_queue (
    id SERIAL PRIMARY KEY,
    
    -- ASIN情報
    asin VARCHAR(10) NOT NULL,
    priority INTEGER DEFAULT 5, -- 1(最高) - 10(最低)
    
    -- 処理状態
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    -- データ取得設定
    force_update BOOLEAN DEFAULT FALSE,
    data_resources TEXT, -- 取得するリソースのリスト
    
    -- エラー情報
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    
    -- メタデータ
    source VARCHAR(50), -- 'manual', 'csv_import', 'scheduler', 'monitoring'
    batch_id VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asin_queue_status ON amazon_asin_queue(status);
CREATE INDEX idx_asin_queue_priority ON amazon_asin_queue(priority);
CREATE INDEX idx_asin_queue_asin ON amazon_asin_queue(asin);
CREATE INDEX idx_asin_queue_batch ON amazon_asin_queue(batch_id);

-- =============================================
-- 統計・サマリービュー
-- =============================================
CREATE VIEW amazon_data_summary AS
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN availability_status = 'In Stock' THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN is_prime_eligible = true THEN 1 END) as prime_eligible_count,
    AVG(current_price) as avg_price,
    MIN(current_price) as min_price,
    MAX(current_price) as max_price,
    COUNT(CASE WHEN is_high_priority = true THEN 1 END) as high_priority_count,
    AVG(star_rating) as avg_rating,
    AVG(review_count) as avg_review_count,
    COUNT(CASE WHEN last_api_update_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_last_24h
FROM amazon_research_data;

-- =============================================
-- 自動更新トリガー
-- =============================================

-- updated_atの自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_amazon_research_data_updated_at 
    BEFORE UPDATE ON amazon_research_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amazon_monitoring_rules_updated_at 
    BEFORE UPDATE ON amazon_monitoring_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amazon_asin_queue_updated_at 
    BEFORE UPDATE ON amazon_asin_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 初期データ・設定
-- =============================================

-- デフォルト監視ルール
INSERT INTO amazon_monitoring_rules (
    rule_name, 
    price_change_threshold_percent,
    check_frequency_minutes,
    priority_level
) VALUES 
('デフォルト高頻度監視', 5.00, 30, 'high'),
('デフォルト標準監視', 10.00, 120, 'normal'),
('デフォルト低頻度監視', 15.00, 1440, 'low');

-- パフォーマンス最適化の追加設定
-- VACUUM と ANALYZE の自動実行を推奨
-- pg_cron 拡張がある場合の自動メンテナンス例：
-- SELECT cron.schedule('amazon-vacuum', '0 2 * * *', 'VACUUM ANALYZE amazon_research_data;');
-- SELECT cron.schedule('amazon-cleanup', '0 3 * * *', 'DELETE FROM amazon_api_requests WHERE requested_at < NOW() - INTERVAL ''30 days'';');