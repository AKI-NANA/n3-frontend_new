-- =====================================
-- 🎯 KICHO記帳ツール PostgreSQLテーブル作成
-- Phase2詳細実装に基づく完全版
-- =====================================

-- 1. 取引データテーブル（メインテーブル）
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE,  -- 取引ID（重複防止用）
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100),
    account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    applied_rule_id INTEGER,
    ai_processed BOOLEAN DEFAULT FALSE,
    mf_sync_status VARCHAR(20) DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI学習セッションテーブル
CREATE TABLE IF NOT EXISTS ai_learning_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    text_content TEXT NOT NULL,
    learning_mode VARCHAR(50) DEFAULT 'incremental',
    status VARCHAR(20) DEFAULT 'processing',
    accuracy DECIMAL(5,4),
    confidence DECIMAL(5,4),
    rules_generated INTEGER DEFAULT 0,
    processing_time INTEGER, -- 秒
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 削除ログテーブル
CREATE TABLE IF NOT EXISTS delete_log (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL, -- 'transaction', 'import_session', etc
    deleted_data JSONB, -- 削除されたデータのバックアップ
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_by VARCHAR(100) DEFAULT 'system'
);

-- 4. インポートセッションテーブル
CREATE TABLE IF NOT EXISTS import_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'mf_cloud', 'csv_upload', 'text_learning'
    file_name VARCHAR(255),
    record_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing',
    description TEXT,
    import_settings JSONB, -- インポート設定のJSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 記帳ルールテーブル
CREATE TABLE IF NOT EXISTS kicho_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(200) NOT NULL,
    rule_pattern TEXT NOT NULL, -- マッチングパターン
    target_category VARCHAR(100) NOT NULL,
    target_account VARCHAR(100),
    confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
    status VARCHAR(20) DEFAULT 'active',
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'ai_learning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. MF連携状態テーブル
CREATE TABLE IF NOT EXISTS mf_connection_status (
    id SERIAL PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    last_sync_at TIMESTAMP,
    sync_count INTEGER DEFAULT 0,
    error_message TEXT,
    api_key_status VARCHAR(20) DEFAULT 'unknown',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 重複処理履歴テーブル
CREATE TABLE IF NOT EXISTS duplicate_resolution_log (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    duplicate_type VARCHAR(50) NOT NULL, -- 'transaction_no', 'date_amount_desc', etc
    resolution_method VARCHAR(50) NOT NULL, -- 'skip', 'replace', 'merge', etc
    original_record JSONB,
    duplicate_record JSONB,
    resolved_record JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- インデックス作成（パフォーマンス向上）
-- =====================================

-- トランザクション検索用インデックス
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- AI学習セッション検索用
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_learning_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_created_at ON ai_learning_sessions(created_at);

-- インポートセッション検索用
CREATE INDEX IF NOT EXISTS idx_import_sessions_source_type ON import_sessions(source_type);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);

-- ルール検索用
CREATE INDEX IF NOT EXISTS idx_kicho_rules_status ON kicho_rules(status);
CREATE INDEX IF NOT EXISTS idx_kicho_rules_category ON kicho_rules(target_category);

-- =====================================
-- 初期データ投入
-- =====================================

-- MF連携状態の初期化
INSERT INTO mf_connection_status (status, last_sync_at, sync_count, api_key_status, updated_at)
VALUES ('disconnected', NULL, 0, 'not_configured', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- サンプル取引データ（テスト用）
INSERT INTO transactions (transaction_id, date, description, amount, category, account, status, confidence_score, ai_processed, created_at) VALUES
('tx-001', '2025-01-07', 'Amazon購入 - 消耗品', -1500, '消耗品費', '現金', 'pending', 0.85, true, CURRENT_TIMESTAMP),
('tx-002', '2025-01-07', 'Google Ads広告費', -25000, '広告宣伝費', 'クレジット', 'approved', 0.95, true, CURRENT_TIMESTAMP),
('tx-003', '2025-01-07', '電車代', -420, '旅費交通費', '現金', 'pending', 0.90, true, CURRENT_TIMESTAMP),
('tx-004', '2025-01-06', 'セブンイレブン', -800, '消耗品費', '現金', 'approved', 0.88, true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('tx-005', '2025-01-06', '売上入金', 350000, '売上高', '銀行', 'approved', 1.0, false, CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (transaction_id) DO NOTHING;

-- サンプルAI学習セッション
INSERT INTO ai_learning_sessions (session_id, text_content, learning_mode, status, accuracy, confidence, rules_generated, processing_time, created_at) VALUES
('ai_20250107143015_1', 'Amazonは消耗品費として処理\n交通費で5000円以下は旅費交通費として処理\nGoogle Adsは広告宣伝費に計上', 'incremental', 'completed', 0.952, 0.87, 3, 45, CURRENT_TIMESTAMP),
('ai_20250107101542_2', 'セブンイレブンでの購入は消耗品費\n電車代は旅費交通費で処理', 'incremental', 'completed', 0.887, 0.82, 2, 32, CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (session_id) DO NOTHING;

-- サンプルインポートセッション
INSERT INTO import_sessions (session_id, source_type, file_name, record_count, status, description, created_at) VALUES
('import_mf_20250107_1', 'mf_cloud', '2025-01-01〜2025-01-07 MFデータ', 150, 'completed', '取得日: 2025-01-07 10:30 | 記帳処理用', CURRENT_TIMESTAMP),
('import_csv_20250105_1', 'csv_upload', '取引履歴_2025年1月.csv', 45, 'completed', 'アップロード: 2025-01-05 14:20 | 重複: 3件検出・解決済み', CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (session_id) DO NOTHING;

-- サンプル記帳ルール
INSERT INTO kicho_rules (rule_name, rule_pattern, target_category, target_account, confidence_threshold, usage_count, last_used_at, created_at) VALUES
('Amazon購入ルール', '%Amazon%', '消耗品費', '現金', 0.85, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('Google広告ルール', '%Google Ads%', '広告宣伝費', 'クレジット', 0.95, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('電車代ルール', '%電車%', '旅費交通費', '現金', 0.90, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('セブンイレブンルール', '%セブンイレブン%', '消耗品費', '現金', 0.88, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- =====================================
-- 権限設定（必要に応じて）
-- =====================================

-- アプリケーション用ユーザーに権限付与（実環境の場合）
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kicho_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kicho_app_user;

-- =====================================
-- 動作確認用クエリ
-- =====================================

-- テーブル作成確認
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
    AND table_name LIKE '%transaction%' 
    OR table_name LIKE '%ai_%' 
    OR table_name LIKE '%import_%'
    OR table_name LIKE '%kicho_%'
    OR table_name LIKE '%mf_%'
    OR table_name LIKE '%delete_%'
    OR table_name LIKE '%duplicate_%'
ORDER BY table_name;

-- データ投入確認
SELECT 'transactions' as table_name, COUNT(*) as record_count FROM transactions
UNION ALL
SELECT 'ai_learning_sessions', COUNT(*) FROM ai_learning_sessions
UNION ALL  
SELECT 'import_sessions', COUNT(*) FROM import_sessions
UNION ALL
SELECT 'kicho_rules', COUNT(*) FROM kicho_rules
UNION ALL
SELECT 'mf_connection_status', COUNT(*) FROM mf_connection_status;

COMMENT ON TABLE transactions IS 'メイン取引データテーブル - Phase2詳細実装対応';
COMMENT ON TABLE ai_learning_sessions IS 'AI学習セッション履歴 - execute-integrated-ai-learning対応';
COMMENT ON TABLE delete_log IS '削除ログ - delete-data-item完全トレーサビリティ対応';
COMMENT ON TABLE import_sessions IS 'インポートセッション管理 - MF・CSV・テキスト統合管理';
COMMENT ON TABLE kicho_rules IS '記帳ルール管理 - AI生成ルール永続化';
COMMENT ON TABLE mf_connection_status IS 'MFクラウド連携状態管理';
COMMENT ON TABLE duplicate_resolution_log IS '重複処理履歴 - CSV重複防止システム対応';

-- 完了メッセージ
SELECT 'KICHO記帳ツール データベースセットアップ完了' as status;