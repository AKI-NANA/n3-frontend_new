-- 08_listing データベーススキーマ
-- eBay出品システム用の最適化されたテーブル設計

-- 出品キューテーブル（承認済みアイテムの出品待ち）
CREATE TABLE IF NOT EXISTS listing_queue (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    approval_id INTEGER REFERENCES approval_queue(id) ON DELETE SET NULL,
    product_id VARCHAR(255) NOT NULL,
    marketplace VARCHAR(50) DEFAULT 'ebay', -- ebay, yahoo, mercari
    
    -- 商品基本情報
    title VARCHAR(1000) NOT NULL,
    description TEXT,
    price_usd DECIMAL(10,2),
    price_jpy INTEGER,
    category_id VARCHAR(100),
    condition_id VARCHAR(50) DEFAULT 'New',
    
    -- 出品設定
    listing_type VARCHAR(50) DEFAULT 'FixedPriceItem', -- FixedPriceItem, Chinese
    duration INTEGER DEFAULT 7, -- 出品期間（日数）
    quantity INTEGER DEFAULT 1,
    payment_methods JSONB DEFAULT '["PayPal"]',
    shipping_methods JSONB,
    return_policy JSONB,
    
    -- 画像・メディア
    images JSONB, -- 画像URL配列
    gallery_image VARCHAR(500),
    
    -- 出品状態管理
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, listed, failed, cancelled
    priority INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP, -- 予約出品時刻
    
    -- 外部システム連携
    ebay_item_id VARCHAR(100) UNIQUE, -- eBay出品後のアイテムID
    external_data JSONB, -- 外部APIレスポンス保存
    
    -- エラー・リトライ管理
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_retry_at TIMESTAMP,
    
    -- 処理時間記録
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    processing_time INTEGER, -- milliseconds
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_listing_queue_status ON listing_queue(status);
CREATE INDEX IF NOT EXISTS idx_listing_queue_marketplace ON listing_queue(marketplace);
CREATE INDEX IF NOT EXISTS idx_listing_queue_scheduled ON listing_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_listing_queue_priority ON listing_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_listing_queue_product_id ON listing_queue(product_id);
CREATE INDEX IF NOT EXISTS idx_listing_queue_ebay_id ON listing_queue(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_listing_queue_created_at ON listing_queue(created_at DESC);

-- 出品履歴テーブル
CREATE TABLE IF NOT EXISTS listing_history (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER REFERENCES listing_queue(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- started, completed, failed, cancelled, retried
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- 詳細情報
    marketplace VARCHAR(50),
    ebay_item_id VARCHAR(100),
    error_details JSONB,
    api_response JSONB,
    processing_time INTEGER,
    
    -- 実行者・システム情報
    executed_by VARCHAR(100), -- user_id or 'system'
    execution_method VARCHAR(50), -- manual, scheduled, auto
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_history_listing_id ON listing_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_history_action ON listing_history(action);
CREATE INDEX IF NOT EXISTS idx_listing_history_marketplace ON listing_history(marketplace);
CREATE INDEX IF NOT EXISTS idx_listing_history_created_at ON listing_history(created_at DESC);

-- 出品スケジュールテーブル
CREATE TABLE IF NOT EXISTS listing_schedules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- スケジュール設定
    frequency_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly
    frequency_details JSONB NOT NULL, -- 曜日、時間等の詳細
    
    -- ランダム化設定
    random_items_min INTEGER DEFAULT 1,
    random_items_max INTEGER DEFAULT 10,
    random_interval_min INTEGER DEFAULT 30, -- minutes
    random_interval_max INTEGER DEFAULT 180,
    random_price_variation DECIMAL(5,2) DEFAULT 0.00, -- percentage
    timing_mode VARCHAR(50) DEFAULT 'random', -- random, peak, off-peak
    
    -- 対象・条件設定
    marketplace VARCHAR(50) DEFAULT 'ebay',
    category_filters JSONB, -- カテゴリー条件
    price_range_min INTEGER,
    price_range_max INTEGER,
    condition_filters JSONB,
    
    -- スケジュール状態
    is_active BOOLEAN DEFAULT true,
    last_execution_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_schedules_active ON listing_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_listing_schedules_next_exec ON listing_schedules(next_execution_at);
CREATE INDEX IF NOT EXISTS idx_listing_schedules_marketplace ON listing_schedules(marketplace);

-- スケジュール実行履歴テーブル
CREATE TABLE IF NOT EXISTS schedule_executions (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES listing_schedules(id) ON DELETE CASCADE,
    execution_type VARCHAR(50) NOT NULL, -- scheduled, manual, test
    
    -- 実行結果
    status VARCHAR(50) NOT NULL, -- success, partial, failed
    items_processed INTEGER DEFAULT 0,
    items_successful INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    -- 実行詳細
    execution_details JSONB,
    error_summary TEXT,
    processing_time INTEGER, -- milliseconds
    
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_executions_schedule_id ON schedule_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_started_at ON schedule_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_executions_status ON schedule_executions(status);

-- CSV アップロード履歴テーブル
CREATE TABLE IF NOT EXISTS csv_uploads (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_hash VARCHAR(64), -- ファイルの重複チェック用
    
    -- 処理結果
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    
    -- 処理状況
    status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, completed, failed
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    -- エラー・警告情報
    validation_errors JSONB,
    warnings JSONB,
    
    uploaded_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csv_uploads_status ON csv_uploads(status);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_uploaded_by ON csv_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_csv_uploads_created_at ON csv_uploads(created_at DESC);

-- CSV行データテーブル（アップロードされた個別行データ）
CREATE TABLE IF NOT EXISTS csv_row_data (
    id SERIAL PRIMARY KEY,
    upload_id INTEGER REFERENCES csv_uploads(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    
    -- 元データ
    raw_data JSONB NOT NULL,
    
    -- 検証結果
    is_valid BOOLEAN DEFAULT false,
    validation_errors JSONB,
    warnings JSONB,
    
    -- 処理状況
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processed, failed, skipped
    listing_queue_id INTEGER REFERENCES listing_queue(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_csv_row_data_upload_id ON csv_row_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_csv_row_data_valid ON csv_row_data(is_valid);
CREATE INDEX IF NOT EXISTS idx_csv_row_data_status ON csv_row_data(processing_status);

-- eBay API制限管理テーブル
CREATE TABLE IF NOT EXISTS ebay_api_limits (
    id SERIAL PRIMARY KEY,
    api_type VARCHAR(50) NOT NULL, -- trading, finding, shopping, etc.
    limit_type VARCHAR(50) NOT NULL, -- daily, hourly
    
    current_usage INTEGER DEFAULT 0,
    max_usage INTEGER NOT NULL,
    reset_at TIMESTAMP NOT NULL,
    
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_api_limits_unique ON ebay_api_limits(api_type, limit_type);

-- 出品テンプレートテーブル
CREATE TABLE IF NOT EXISTS listing_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    marketplace VARCHAR(50) DEFAULT 'ebay',
    
    -- テンプレート設定
    template_data JSONB NOT NULL, -- 各種設定値のテンプレート
    is_default BOOLEAN DEFAULT false,
    
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_templates_marketplace ON listing_templates(marketplace);
CREATE INDEX IF NOT EXISTS idx_listing_templates_default ON listing_templates(is_default);

-- 統計用マテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS listing_stats AS
SELECT 
    COUNT(*) as total_listings,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE status = 'listed') as listed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE marketplace = 'ebay') as ebay_count,
    AVG(price_usd) as avg_price_usd,
    AVG(processing_time) as avg_processing_time,
    MIN(created_at) as oldest_listing,
    MAX(created_at) as newest_listing,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count
FROM listing_queue;

-- 統計更新関数
CREATE OR REPLACE FUNCTION refresh_listing_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW listing_stats;
END;
$$ LANGUAGE plpgsql;

-- 次回実行時刻計算関数
CREATE OR REPLACE FUNCTION calculate_next_execution(
    schedule_id_param INTEGER
) RETURNS TIMESTAMP AS $$
DECLARE
    schedule_record RECORD;
    next_time TIMESTAMP;
    freq_details JSONB;
BEGIN
    SELECT * INTO schedule_record 
    FROM listing_schedules 
    WHERE id = schedule_id_param;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    freq_details := schedule_record.frequency_details;
    
    CASE schedule_record.frequency_type
        WHEN 'daily' THEN
            next_time := CURRENT_DATE + INTERVAL '1 day' + 
                        (freq_details->>'hour')::INTEGER * INTERVAL '1 hour' +
                        (freq_details->>'minute')::INTEGER * INTERVAL '1 minute';
                        
        WHEN 'weekly' THEN
            -- 週次スケジュールの計算（曜日指定）
            next_time := date_trunc('week', CURRENT_DATE) + 
                        (freq_details->>'day')::INTEGER * INTERVAL '1 day' +
                        (freq_details->>'hour')::INTEGER * INTERVAL '1 hour' +
                        (freq_details->>'minute')::INTEGER * INTERVAL '1 minute';
            
            -- 今週の実行時刻が過ぎている場合は来週に
            IF next_time <= NOW() THEN
                next_time := next_time + INTERVAL '1 week';
            END IF;
            
        WHEN 'monthly' THEN
            next_time := date_trunc('month', CURRENT_DATE) + 
                        ((freq_details->>'day')::INTEGER - 1) * INTERVAL '1 day' +
                        (freq_details->>'hour')::INTEGER * INTERVAL '1 hour' +
                        (freq_details->>'minute')::INTEGER * INTERVAL '1 minute';
            
            -- 今月の実行時刻が過ぎている場合は来月に
            IF next_time <= NOW() THEN
                next_time := next_time + INTERVAL '1 month';
            END IF;
    END CASE;
    
    RETURN next_time;
END;
$$ LANGUAGE plpgsql;

-- 出品処理完了時のトリガー関数
CREATE OR REPLACE FUNCTION handle_listing_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- 出品完了時に在庫システムに通知
    IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
        -- 10_zaiko システムへの通知（実装時に有効化）
        -- PERFORM notify_inventory_system(NEW.id, NEW.ebay_item_id);
        
        -- ワークフローの次ステップ設定
        UPDATE workflows 
        SET current_step = 9, 
            next_step = 9,
            status = 'listed',
            updated_at = NOW()
        WHERE id = NEW.workflow_id;
    END IF;
    
    -- 処理時間の計算
    IF NEW.status IN ('listed', 'failed') AND OLD.status = 'processing' THEN
        NEW.processing_time := EXTRACT(EPOCH FROM (NOW() - NEW.processing_started_at)) * 1000;
        NEW.processing_completed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listing_completion
    BEFORE UPDATE ON listing_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_listing_completion();

-- 出品履歴自動記録トリガー
CREATE OR REPLACE FUNCTION log_listing_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status != NEW.status OR OLD.retry_count != NEW.retry_count) THEN
        INSERT INTO listing_history (
            listing_id, action, previous_status, new_status,
            marketplace, ebay_item_id, processing_time, 
            executed_by, execution_method
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.status = 'processing' THEN 'started'
                WHEN NEW.status = 'listed' THEN 'completed'
                WHEN NEW.status = 'failed' THEN 'failed'
                WHEN NEW.retry_count > OLD.retry_count THEN 'retried'
                ELSE 'updated'
            END,
            OLD.status,
            NEW.status,
            NEW.marketplace,
            NEW.ebay_item_id,
            NEW.processing_time,
            'system', -- 実際の実装では適切なユーザーIDを設定
            'auto'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_listing_changes
    AFTER UPDATE ON listing_queue
    FOR EACH ROW
    EXECUTE FUNCTION log_listing_changes();

-- サンプルデータ投入（開発用）
INSERT INTO listing_templates (name, description, marketplace, template_data, is_default) VALUES
('eBay標準テンプレート', 'eBay出品用の標準設定テンプレート', 'ebay', 
 '{"listing_type": "FixedPriceItem", "duration": 7, "condition_id": "New", "payment_methods": ["PayPal"], "return_policy": {"returnsAccepted": true, "refundOption": "MoneyBack", "returnsWithinOption": "Days_30"}}', 
 true),
('eBayオークション形式', 'eBayオークション出品用テンプレート', 'ebay',
 '{"listing_type": "Chinese", "duration": 7, "condition_id": "Used", "payment_methods": ["PayPal"], "return_policy": {"returnsAccepted": false}}',
 false)
ON CONFLICT DO NOTHING;

-- 開発用のサンプルスケジュール
INSERT INTO listing_schedules (name, description, frequency_type, frequency_details, random_items_min, random_items_max, is_active, created_by) VALUES
('平日夜間出品', '平日の夜間に自動出品を行う', 'weekly', 
 '{"days": [1, 2, 3, 4, 5], "hour": 20, "minute": 0}', 
 5, 15, true, 'system'),
('週末集中出品', '週末に集中的に出品を行う', 'weekly',
 '{"days": [6, 0], "hour": 10, "minute": 0}',
 10, 30, true, 'system')
ON CONFLICT DO NOTHING;

-- 初期API制限設定
INSERT INTO ebay_api_limits (api_type, limit_type, current_usage, max_usage, reset_at) VALUES
('trading', 'daily', 0, 5000, CURRENT_DATE + INTERVAL '1 day'),
('trading', 'hourly', 0, 200, date_trunc('hour', NOW()) + INTERVAL '1 hour')
ON CONFLICT (api_type, limit_type) DO NOTHING;
