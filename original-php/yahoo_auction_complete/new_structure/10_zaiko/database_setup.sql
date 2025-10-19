-- 在庫管理システム データベース構築スクリプト
-- 計画書に基づく完全版実装

-- 在庫管理テーブル
CREATE TABLE IF NOT EXISTS inventory_management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    
    -- 仕入れ先情報
    source_platform VARCHAR(20) NOT NULL COMMENT 'yahoo, amazon, ebay',
    source_url TEXT NOT NULL,
    source_product_id VARCHAR(100),
    
    -- 現在の在庫・価格情報（高速アクセス用）
    current_stock INT DEFAULT 0,
    current_price DECIMAL(10,2) DEFAULT 0.00,
    
    -- 商品検証
    title_hash VARCHAR(64) COMMENT 'タイトルのハッシュ値で商品変更検知',
    url_status VARCHAR(20) DEFAULT 'active' COMMENT 'active, dead, changed',
    last_verified_at TIMESTAMP NULL,
    
    -- システム管理
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_product_monitoring (product_id, monitoring_enabled),
    INDEX idx_source_platform (source_platform),
    INDEX idx_updated_at (updated_at),
    INDEX idx_url_status (url_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='在庫管理メインテーブル';

-- 在庫履歴テーブル（追記型で変更履歴を保存）
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    
    -- 変更前後の値
    previous_stock INT,
    new_stock INT,
    previous_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    
    -- 変更詳細
    change_type VARCHAR(20) NOT NULL COMMENT 'stock_change, price_change, both',
    change_source VARCHAR(20) NOT NULL COMMENT 'yahoo, amazon, manual',
    
    -- パフォーマンス
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_product_time (product_id, created_at DESC),
    INDEX idx_change_type (change_type, created_at DESC),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='在庫・価格変更履歴テーブル（追記型）';

-- 出品先管理テーブル
CREATE TABLE IF NOT EXISTS listing_platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    
    -- 出品先情報
    platform VARCHAR(20) NOT NULL COMMENT 'ebay, mercari, amazon_seller',
    platform_product_id VARCHAR(100),
    listing_url TEXT,
    
    -- 出品状態
    listing_status VARCHAR(20) DEFAULT 'active' COMMENT 'active, paused, ended',
    current_quantity INT DEFAULT 0,
    listed_price DECIMAL(10,2),
    
    -- 同期設定
    auto_sync_enabled BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP NULL,
    sync_queue_status VARCHAR(20) DEFAULT 'idle' COMMENT 'idle, queued, processing',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_sync_status (auto_sync_enabled, sync_queue_status),
    INDEX idx_product_platform (product_id, platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='出品先管理テーブル';

-- 実行ログテーブル
CREATE TABLE IF NOT EXISTS inventory_execution_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    execution_id VARCHAR(64) DEFAULT (UUID()),
    
    -- 実行情報・排他制御
    process_type VARCHAR(50) NOT NULL COMMENT 'stock_check, price_check, sync',
    execution_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_end TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'running' COMMENT 'running, completed, failed, partial',
    worker_id VARCHAR(50) COMMENT 'ワーカープロセス識別子',
    
    -- 統計
    total_products INT DEFAULT 0,
    processed_products INT DEFAULT 0,
    updated_products INT DEFAULT 0,
    error_products INT DEFAULT 0,
    
    -- 詳細
    details JSON,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    UNIQUE INDEX idx_execution_running (process_type, status) 
        WHERE status = 'running' COMMENT '排他制御用',
    INDEX idx_execution_type_status (process_type, status),
    INDEX idx_execution_date (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='実行ログテーブル';

-- キュー管理テーブル
CREATE TABLE IF NOT EXISTS processing_queue (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    queue_name VARCHAR(50) NOT NULL COMMENT 'stock_check, price_sync, validation',
    product_id INT,
    
    -- キュー状態
    status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending, processing, completed, failed',
    priority INT DEFAULT 5 COMMENT '1(高) - 10(低)',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- 処理データ
    payload JSON,
    result JSON,
    error_message TEXT,
    
    -- 時間管理
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_queue_processing (queue_name, status, priority, scheduled_at),
    INDEX idx_queue_retry (status, retry_count, max_retries)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='キュー管理テーブル';

-- エラーログテーブル
CREATE TABLE IF NOT EXISTS inventory_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    execution_id VARCHAR(64),
    product_id INT,
    
    -- エラー詳細
    error_type VARCHAR(50) NOT NULL COMMENT 'url_dead, price_changed, stock_unavailable, api_error',
    error_code VARCHAR(20),
    error_message TEXT,
    stack_trace TEXT COMMENT 'デバッグ用スタックトレース',
    
    -- 商品情報（エラー発生時点のスナップショット）
    product_title VARCHAR(500),
    source_url TEXT,
    platform VARCHAR(20),
    
    -- 対処状況
    severity VARCHAR(20) DEFAULT 'medium' COMMENT 'low, medium, high, critical',
    resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    resolved_by VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_errors_severity_resolved (severity, resolved, created_at DESC),
    INDEX idx_errors_type_product (error_type, product_id),
    
    -- 外部キー制約
    FOREIGN KEY (execution_id) REFERENCES inventory_execution_logs(execution_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='エラーログテーブル';

-- 暗号化認証情報テーブル（機密情報保護）
CREATE TABLE IF NOT EXISTS encrypted_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(50) NOT NULL UNIQUE,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='暗号化API認証情報テーブル';

-- セキュリティ監査ログテーブル
CREATE TABLE IF NOT EXISTS security_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(128),
    details JSON,
    severity VARCHAR(20) DEFAULT 'low',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_security_event_time (event_type, timestamp DESC),
    INDEX idx_security_severity (severity, timestamp DESC),
    INDEX idx_security_ip (user_ip, timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='セキュリティ監査ログテーブル';

-- ヘルスチェック結果テーブル
CREATE TABLE IF NOT EXISTS health_check_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    overall_status VARCHAR(20) NOT NULL COMMENT 'healthy, warning, unhealthy',
    test_results JSON,
    failed_tests INT DEFAULT 0,
    
    -- インデックス
    INDEX idx_health_timestamp (check_timestamp DESC),
    INDEX idx_health_status (overall_status, check_timestamp DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='ヘルスチェック結果テーブル';

-- 外部キー制約追加
ALTER TABLE inventory_management 
ADD CONSTRAINT fk_inventory_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE;

ALTER TABLE stock_history 
ADD CONSTRAINT fk_history_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE;

ALTER TABLE listing_platforms 
ADD CONSTRAINT fk_listing_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE;

ALTER TABLE processing_queue 
ADD CONSTRAINT fk_queue_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE;

ALTER TABLE inventory_errors 
ADD CONSTRAINT fk_error_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE SET NULL;

-- パフォーマンス最適化用ビュー
CREATE OR REPLACE VIEW monitoring_overview AS
SELECT 
    im.id,
    im.product_id,
    ysp.title as product_title,
    ysp.image_url,
    im.source_platform,
    im.current_stock,
    im.current_price,
    im.url_status,
    im.monitoring_enabled,
    im.last_verified_at,
    im.updated_at,
    (SELECT COUNT(*) FROM stock_history sh WHERE sh.product_id = im.product_id) as total_changes,
    (SELECT COUNT(*) FROM stock_history sh2 
     WHERE sh2.product_id = im.product_id 
     AND sh2.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as changes_24h,
    (SELECT COUNT(*) FROM inventory_errors ie 
     WHERE ie.product_id = im.product_id 
     AND ie.resolved = false) as unresolved_errors
FROM inventory_management im
LEFT JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
WHERE im.monitoring_enabled = true;

-- トリガー設定（自動更新日時管理）
DELIMITER $

CREATE TRIGGER tr_inventory_update_timestamp
    BEFORE UPDATE ON inventory_management
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$

CREATE TRIGGER tr_listing_update_timestamp
    BEFORE UPDATE ON listing_platforms
    FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END$

DELIMITER ;

-- 初期データ挿入
-- システム設定用の初期データ（必要に応じて）
INSERT IGNORE INTO encrypted_credentials (platform, encrypted_key) VALUES 
('system', 'placeholder_encrypted_value'),
('yahoo', 'placeholder_encrypted_value'),
('amazon', 'placeholder_encrypted_value'),
('ebay', 'placeholder_encrypted_value');

-- パーティション設定（大量データ対応）
-- stock_historyテーブルの月次パーティション
-- 注意: MySQLのパーティション機能を使用する場合の設定例
-- 実際の運用では手動で月次パーティションを作成

-- 統計用ストアドプロシージャ
DELIMITER $

CREATE PROCEDURE GetInventoryStats(IN period_hours INT)
BEGIN
    DECLARE cutoff_time TIMESTAMP;
    SET cutoff_time = DATE_SUB(NOW(), INTERVAL period_hours HOUR);
    
    SELECT 
        'monitored_products' as metric,
        COUNT(*) as value
    FROM inventory_management 
    WHERE monitoring_enabled = true
    
    UNION ALL
    
    SELECT 
        'total_changes' as metric,
        COUNT(*) as value
    FROM stock_history 
    WHERE created_at >= cutoff_time
    
    UNION ALL
    
    SELECT 
        'stock_changes' as metric,
        COUNT(*) as value
    FROM stock_history 
    WHERE created_at >= cutoff_time 
    AND change_type IN ('stock_change', 'both')
    
    UNION ALL
    
    SELECT 
        'price_changes' as metric,
        COUNT(*) as value
    FROM stock_history 
    WHERE created_at >= cutoff_time 
    AND change_type IN ('price_change', 'both')
    
    UNION ALL
    
    SELECT 
        'unresolved_errors' as metric,
        COUNT(*) as value
    FROM inventory_errors 
    WHERE resolved = false
    
    UNION ALL
    
    SELECT 
        'active_executions' as metric,
        COUNT(*) as value
    FROM inventory_execution_logs 
    WHERE status = 'running';
END$

DELIMITER ;

-- データベース設定最適化
-- 注意: これらの設定は環境に応じて調整してください

-- インデックス使用状況の確認用クエリ（運用時に使用）
-- SHOW INDEX FROM inventory_management;
-- SHOW INDEX FROM stock_history;

-- テーブル統計情報更新（定期実行推奨）
-- ANALYZE TABLE inventory_management, stock_history, listing_platforms, processing_queue;

-- 設定完了メッセージ
SELECT 'データベース構築完了' as status, NOW() as completed_at;
    