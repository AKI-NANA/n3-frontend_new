-- ===============================================
-- 02_scraping 在庫管理拡張テーブル作成スクリプト
-- PostgreSQL対応版
-- ===============================================

-- 在庫管理メインテーブル
CREATE TABLE IF NOT EXISTS inventory_management (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 仕入れ先情報
    source_platform VARCHAR(20) NOT NULL DEFAULT 'yahoo',
    source_url TEXT NOT NULL,
    source_product_id VARCHAR(100),
    
    -- 現在の在庫・価格情報（高速アクセス用）
    current_stock INTEGER DEFAULT 0,
    current_price DECIMAL(10,2) DEFAULT 0.00,
    
    -- 商品検証・監視設定
    title_hash VARCHAR(64), -- タイトルのハッシュ値で商品変更検知
    url_status VARCHAR(20) DEFAULT 'active', -- active, dead, changed
    last_verified_at TIMESTAMP,
    monitoring_enabled BOOLEAN DEFAULT true,
    check_interval_hours INTEGER DEFAULT 2,
    price_alert_threshold DECIMAL(4,2) DEFAULT 0.05, -- 5%変動でアラート
    
    -- システム管理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) 
        REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_inventory_product_monitoring 
    ON inventory_management(product_id, monitoring_enabled);
CREATE INDEX IF NOT EXISTS idx_inventory_source_platform 
    ON inventory_management(source_platform);
CREATE INDEX IF NOT EXISTS idx_inventory_updated_at 
    ON inventory_management(updated_at);
CREATE INDEX IF NOT EXISTS idx_inventory_url_status 
    ON inventory_management(url_status);
CREATE INDEX IF NOT EXISTS idx_inventory_last_verified 
    ON inventory_management(last_verified_at);

-- 在庫履歴テーブル（追記型で変更履歴を保存）
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 変更前後の値
    previous_stock INTEGER,
    new_stock INTEGER,
    previous_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    
    -- 変更詳細
    change_type VARCHAR(20) NOT NULL, -- stock_change, price_change, both, url_dead
    change_source VARCHAR(20) NOT NULL DEFAULT 'yahoo', -- yahoo, amazon, manual
    change_details JSONB, -- 詳細情報をJSON形式で保存
    
    -- パフォーマンス
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_history_product FOREIGN KEY (product_id) 
        REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_history_product_time 
    ON stock_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_change_type 
    ON stock_history(change_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_created_at 
    ON stock_history(created_at);

-- 出品先管理テーブル
CREATE TABLE IF NOT EXISTS listing_platforms (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 出品先情報
    platform VARCHAR(20) NOT NULL DEFAULT 'ebay', -- ebay, mercari, amazon_seller
    platform_product_id VARCHAR(100),
    listing_url TEXT,
    
    -- 出品状態
    listing_status VARCHAR(20) DEFAULT 'active', -- active, paused, ended
    current_quantity INTEGER DEFAULT 0,
    listed_price DECIMAL(10,2),
    
    -- 同期設定
    auto_sync_enabled BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP,
    sync_queue_status VARCHAR(20) DEFAULT 'idle', -- idle, queued, processing
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_listing_product FOREIGN KEY (product_id) 
        REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_listing_sync_status 
    ON listing_platforms(auto_sync_enabled, sync_queue_status);
CREATE INDEX IF NOT EXISTS idx_listing_product_platform 
    ON listing_platforms(product_id, platform);

-- 実行ログテーブル
CREATE TABLE IF NOT EXISTS inventory_execution_logs (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(64) DEFAULT gen_random_uuid()::text,
    
    -- 実行情報・排他制御
    process_type VARCHAR(50) NOT NULL, -- stock_check, price_check, sync
    execution_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_end TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed, partial
    worker_id VARCHAR(50), -- ワーカープロセス識別子
    
    -- 統計
    total_products INTEGER DEFAULT 0,
    processed_products INTEGER DEFAULT 0,
    updated_products INTEGER DEFAULT 0,
    error_products INTEGER DEFAULT 0,
    
    -- 詳細
    details JSONB,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（排他制御用）
CREATE UNIQUE INDEX IF NOT EXISTS idx_execution_running 
    ON inventory_execution_logs(process_type, status) 
    WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_execution_type_status 
    ON inventory_execution_logs(process_type, status);
CREATE INDEX IF NOT EXISTS idx_execution_date 
    ON inventory_execution_logs(created_at DESC);

-- キュー管理テーブル
CREATE TABLE IF NOT EXISTS processing_queue (
    id BIGSERIAL PRIMARY KEY,
    queue_name VARCHAR(50) NOT NULL, -- stock_check, price_sync, validation
    product_id INTEGER,
    
    -- キュー状態
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 5, -- 1(高) - 10(低)
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- 処理データ
    payload JSONB,
    result JSONB,
    error_message TEXT,
    
    -- 時間管理
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_queue_product FOREIGN KEY (product_id) 
        REFERENCES yahoo_scraped_products(id) ON DELETE SET NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_queue_processing 
    ON processing_queue(queue_name, status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_queue_retry 
    ON processing_queue(status, retry_count, max_retries);

-- エラーログテーブル
CREATE TABLE IF NOT EXISTS inventory_errors (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(64),
    product_id INTEGER,
    
    -- エラー詳細
    error_type VARCHAR(50) NOT NULL, -- url_dead, price_changed, stock_unavailable, api_error
    error_code VARCHAR(20),
    error_message TEXT,
    stack_trace TEXT, -- デバッグ用スタックトレース
    
    -- 商品情報（エラー発生時点のスナップショット）
    product_title VARCHAR(500),
    source_url TEXT,
    platform VARCHAR(20),
    
    -- 対処状況
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外部キー制約
    CONSTRAINT fk_error_product FOREIGN KEY (product_id) 
        REFERENCES yahoo_scraped_products(id) ON DELETE SET NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_errors_severity_resolved 
    ON inventory_errors(severity, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_type_product 
    ON inventory_errors(error_type, product_id);

-- 暗号化認証情報テーブル（機密情報保護）
CREATE TABLE IF NOT EXISTS encrypted_credentials (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- セキュリティ監査ログテーブル
CREATE TABLE IF NOT EXISTS security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(128),
    details JSONB,
    severity VARCHAR(20) DEFAULT 'low',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_security_event_time 
    ON security_audit_log(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_severity 
    ON security_audit_log(severity, timestamp DESC);

-- 更新トリガー関数作成
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 更新トリガー設定
DROP TRIGGER IF EXISTS update_inventory_management_updated_at ON inventory_management;
CREATE TRIGGER update_inventory_management_updated_at
    BEFORE UPDATE ON inventory_management
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_listing_platforms_updated_at ON listing_platforms;
CREATE TRIGGER update_listing_platforms_updated_at
    BEFORE UPDATE ON listing_platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_encrypted_credentials_updated_at ON encrypted_credentials;
CREATE TRIGGER update_encrypted_credentials_updated_at
    BEFORE UPDATE ON encrypted_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期テストデータ投入
INSERT INTO encrypted_credentials (platform, encrypted_key) VALUES 
('yahoo', 'encrypted_yahoo_session_key_placeholder')
ON CONFLICT (platform) DO NOTHING;

-- コメント追加
COMMENT ON TABLE inventory_management IS '在庫管理メインテーブル - 出品済み商品専用';
COMMENT ON TABLE stock_history IS '在庫・価格変更履歴テーブル（追記型）';
COMMENT ON TABLE listing_platforms IS '出品先管理テーブル';
COMMENT ON TABLE inventory_execution_logs IS '実行ログテーブル';
COMMENT ON TABLE processing_queue IS 'キュー管理テーブル';
COMMENT ON TABLE inventory_errors IS 'エラーログテーブル';
COMMENT ON TABLE encrypted_credentials IS '暗号化API認証情報テーブル';
COMMENT ON TABLE security_audit_log IS 'セキュリティ監査ログテーブル';

-- 権限設定（必要に応じて）
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scraping_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scraping_user;

-- テーブル作成完了メッセージ
SELECT 'データベーステーブル作成完了' as status;