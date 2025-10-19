-- Gmail Cleaner Database Schema - Performance Optimized Version

-- メールデータテーブル（最適化版）
CREATE TABLE emails (
    id VARCHAR(255) PRIMARY KEY,
    thread_id VARCHAR(255) NOT NULL,
    subject TEXT,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255) NOT NULL,
    snippet TEXT,
    date_received DATETIME NOT NULL,
    is_unread BOOLEAN DEFAULT TRUE,
    is_replied BOOLEAN DEFAULT FALSE,
    category ENUM('important', 'unclassified', 'ignore', 'delete-candidate') DEFAULT 'unclassified',
    sender_type ENUM('amazon', 'rakuten', 'yahoo', 'mercari', 'ebay', 'customer', 'business', 'notification', 'ads', 'unknown') DEFAULT 'unknown',
    gmail_labels JSON,
    internal_date BIGINT,
    classification_confidence DECIMAL(3,2) DEFAULT 0.00,
    matched_rule_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- パフォーマンス最適化インデックス
    INDEX idx_sender_email (sender_email),
    INDEX idx_date_received (date_received DESC),
    INDEX idx_category_unread (category, is_unread),
    INDEX idx_sender_type (sender_type),
    INDEX idx_thread_id (thread_id),
    INDEX idx_classification (classification_confidence, matched_rule_id),
    
    -- 複合インデックス（よく使用される検索条件）
    INDEX idx_category_sender_date (category, sender_type, date_received DESC),
    INDEX idx_unread_category (is_unread, category, date_received DESC),
    
    -- 全文検索インデックス
    FULLTEXT INDEX idx_subject_snippet (subject, snippet),
    
    FOREIGN KEY (matched_rule_id) REFERENCES classification_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分類ルールテーブル（拡張版）
CREATE TABLE classification_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    rule_type ENUM('domain', 'keyword', 'pattern', 'composite', 'learned') DEFAULT 'composite',
    
    -- 条件設定
    sender_domain VARCHAR(255),
    sender_pattern VARCHAR(500),
    subject_keywords JSON,
    subject_pattern VARCHAR(500),
    content_keywords JSON,
    
    -- 分類結果
    target_category ENUM('important', 'unclassified', 'ignore', 'delete-candidate') NOT NULL,
    target_sender_type ENUM('amazon', 'rakuten', 'yahoo', 'mercari', 'ebay', 'customer', 'business', 'notification', 'ads', 'unknown') NOT NULL,
    
    -- 信頼度・優先度
    base_confidence TINYINT UNSIGNED DEFAULT 70,
    priority INT DEFAULT 50,
    
    -- 学習・統計
    match_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    last_matched_at DATETIME,
    
    -- ステータス
    is_active BOOLEAN DEFAULT TRUE,
    is_system_rule BOOLEAN DEFAULT FALSE,
    created_by_user_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_rule_type_active (rule_type, is_active),
    INDEX idx_priority_confidence (priority DESC, base_confidence DESC),
    INDEX idx_sender_domain (sender_domain),
    INDEX idx_performance (is_active, priority DESC, base_confidence DESC),
    
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 分類結果ログテーブル
CREATE TABLE classification_results (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_id VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    sender_domain VARCHAR(255),
    subject VARCHAR(500),
    predicted_category ENUM('important', 'unclassified', 'ignore', 'delete-candidate'),
    predicted_sender_type ENUM('amazon', 'rakuten', 'yahoo', 'mercari', 'ebay', 'customer', 'business', 'notification', 'ads', 'unknown'),
    confidence DECIMAL(3,2),
    matched_rule VARCHAR(255),
    matched_rule_id INT,
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- パーティション用日付（月次パーティション想定）
    partition_date DATE GENERATED ALWAYS AS (DATE(created_at)) STORED,
    
    INDEX idx_email_id (email_id),
    INDEX idx_sender_domain_date (sender_domain, created_at DESC),
    INDEX idx_confidence (confidence DESC),
    INDEX idx_partition_date (partition_date),
    
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_rule_id) REFERENCES classification_rules(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザーフィードバックテーブル
CREATE TABLE user_feedback (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email_id VARCHAR(255) NOT NULL,
    original_prediction JSON,
    correct_classification JSON,
    feedback_type ENUM('correction', 'confirmation', 'manual_classification') DEFAULT 'correction',
    user_id INT,
    confidence_before DECIMAL(3,2),
    confidence_after DECIMAL(3,2),
    rule_created BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email_feedback (email_id, feedback_type),
    INDEX idx_user_date (user_id, created_at DESC),
    
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザー設定テーブル
CREATE TABLE user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    gmail_access_token TEXT,
    gmail_refresh_token TEXT,
    gmail_user_email VARCHAR(255),
    last_sync_time DATETIME,
    auto_classification BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INT DEFAULT 5,
    max_emails_per_sync INT DEFAULT 500,
    enable_learning BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user (user_id),
    INDEX idx_last_sync (last_sync_time),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ユーザーテーブル
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username_active (username, is_active),
    INDEX idx_email_active (email, is_active)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 同期ログテーブル（パフォーマンス監視用）
CREATE TABLE sync_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sync_type ENUM('full', 'incremental', 'manual') DEFAULT 'incremental',
    emails_processed INT DEFAULT 0,
    emails_new INT DEFAULT 0,
    emails_updated INT DEFAULT 0,
    processing_time_seconds DECIMAL(8,3),
    memory_peak_mb DECIMAL(8,2),
    api_calls_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_details JSON,
    sync_query VARCHAR(500),
    sync_status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_user_status_date (user_id, sync_status, started_at DESC),
    INDEX idx_sync_type_date (sync_type, started_at DESC),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- システム統計テーブル
CREATE TABLE system_stats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    total_emails INT DEFAULT 0,
    emails_by_category JSON,
    emails_by_sender_type JSON,
    classification_accuracy DECIMAL(5,2),
    avg_processing_time_ms DECIMAL(8,3),
    total_api_calls INT DEFAULT 0,
    total_users_active INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_stat_date (stat_date),
    INDEX idx_stat_date (stat_date DESC)
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初期データ挿入
INSERT INTO classification_rules (rule_name, rule_type, sender_domain, target_category, target_sender_type, base_confidence, priority, is_system_rule) VALUES
-- Amazon関連
('amazon_seller_central', 'domain', 'amazon.co.jp', 'important', 'amazon', 95, 100, TRUE),
('amazon_seller_central_global', 'domain', 'amazon.com', 'important', 'amazon', 95, 100, TRUE),
('amazon_sellercentral_comm', 'domain', 'sellercentral-communications.amazon.com', 'important', 'amazon', 98, 100, TRUE),

-- 楽天関連
('rakuten_main', 'domain', 'rakuten.co.jp', 'important', 'rakuten', 90, 95, TRUE),
('rakuten_rms', 'domain', 'rms.rakuten.co.jp', 'important', 'rakuten', 95, 100, TRUE),
('rakuten_shop', 'domain', 'shop.rakuten.co.jp', 'important', 'rakuten', 85, 90, TRUE),

-- Yahoo関連
('yahoo_shopping', 'domain', 'shopping.yahoo.co.jp', 'important', 'yahoo', 90, 95, TRUE),
('yahoo_store', 'domain', 'store.yahoo.co.jp', 'important', 'yahoo', 92, 95, TRUE),

-- メルカリ関連
('mercari_main', 'domain', 'mercari.com', 'important', 'mercari', 90, 95, TRUE),
('mercari_jp', 'domain', 'mercari.jp', 'important', 'mercari', 90, 95, TRUE),

-- eBay関連
('ebay_main', 'domain', 'ebay.com', 'important', 'ebay', 88, 90, TRUE),
('ebay_jp', 'domain', 'ebay.co.jp', 'important', 'ebay', 88, 90, TRUE),

-- キーワードベースルール
('customer_critical', 'keyword', NULL, 'important', 'customer', 95, 100, TRUE),
('customer_inquiry', 'keyword', NULL, 'important', 'customer', 85, 90, TRUE),
('promotional_content', 'keyword', NULL, 'ignore', 'ads', 75, 80, TRUE);

-- キーワードデータの更新
UPDATE classification_rules SET subject_keywords = JSON_ARRAY('返品', '返金', 'クレーム', '苦情', '不良品', '壊れ', '問題', 'トラブル', '至急', '緊急') 
WHERE rule_name = 'customer_critical';

UPDATE classification_rules SET subject_keywords = JSON_ARRAY('問い合わせ', 'お問い合わせ', '質問', '相談', 'サイズ', '色', '在庫', '配送', 'inquiry', 'question') 
WHERE rule_name = 'customer_inquiry';

UPDATE classification_rules SET subject_keywords = JSON_ARRAY('キャンペーン', 'セール', 'プロモーション', '広告', 'newsletter', 'campaign', '特価', '割引') 
WHERE rule_name = 'promotional_content';

-- パフォーマンス最適化のための追加設定

-- 月次パーティション（classification_results用）
-- ALTER TABLE classification_results PARTITION BY RANGE (TO_DAYS(partition_date)) (
--     PARTITION p_202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
--     PARTITION p_202402 VALUES LESS THAN (TO_DAYS('2024-03-01')),
--     PARTITION p_202403 VALUES LESS THAN (TO_DAYS('2024-04-01')),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- メール件数が多い場合のアーカイブ戦略
CREATE TABLE emails_archive (
    LIKE emails INCLUDING ALL
) ENGINE=InnoDB CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 定期クリーンアップ用のストアドプロシージャ
DELIMITER //
CREATE PROCEDURE CleanupOldData(IN days_to_keep INT DEFAULT 90)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- 古いメールをアーカイブテーブルに移動
    INSERT INTO emails_archive 
    SELECT * FROM emails 
    WHERE date_received < DATE_SUB(NOW(), INTERVAL days_to_keep DAY)
    AND category = 'delete-candidate';
    
    -- 古いメールを削除
    DELETE FROM emails 
    WHERE date_received < DATE_SUB(NOW(), INTERVAL days_to_keep DAY)
    AND category = 'delete-candidate';
    
    -- 古い分類結果ログを削除
    DELETE FROM classification_results 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- 古い同期ログを削除
    DELETE FROM sync_logs 
    WHERE started_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    COMMIT;
END//
DELIMITER ;

-- 統計情報更新用のストアドプロシージャ
DELIMITER //
CREATE PROCEDURE UpdateDailyStats(IN target_date DATE DEFAULT NULL)
BEGIN
    SET target_date = IFNULL(target_date, CURDATE());
    
    INSERT INTO system_stats (
        stat_date, 
        total_emails, 
        emails_by_category, 
        emails_by_sender_type,
        classification_accuracy,
        avg_processing_time_ms,
        total_api_calls,
        total_users_active
    ) VALUES (
        target_date,
        (SELECT COUNT(*) FROM emails WHERE DATE(date_received) = target_date),
        (SELECT JSON_OBJECTAGG(category, cnt) FROM (
            SELECT category, COUNT(*) as cnt 
            FROM emails 
            WHERE DATE(date_received) = target_date 
            GROUP BY category
        ) t),
        (SELECT JSON_OBJECTAGG(sender_type, cnt) FROM (
            SELECT sender_type, COUNT(*) as cnt 
            FROM emails 
            WHERE DATE(date_received) = target_date 
            GROUP BY sender_type
        ) t),
        (SELECT AVG(confidence) FROM classification_results WHERE DATE(created_at) = target_date),
        (SELECT AVG(processing_time_ms) FROM classification_results WHERE DATE(created_at) = target_date),
        (SELECT COUNT(*) FROM sync_logs WHERE DATE(started_at) = target_date),
        (SELECT COUNT(DISTINCT user_id) FROM sync_logs WHERE DATE(started_at) = target_date)
    ) ON DUPLICATE KEY UPDATE
        total_emails = VALUES(total_emails),
        emails_by_category = VALUES(emails_by_category),
        emails_by_sender_type = VALUES(emails_by_sender_type),
        classification_accuracy = VALUES(classification_accuracy),
        avg_processing_time_ms = VALUES(avg_processing_time_ms),
        total_api_calls = VALUES(total_api_calls),
        total_users_active = VALUES(total_users_active);
END//
DELIMITER ;