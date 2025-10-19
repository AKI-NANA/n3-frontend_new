-- NAGANO3記帳ツール データベーススキーマ
-- PostgreSQL版

-- 1. 取引データテーブル
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(100),
    account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    confidence_score DECIMAL(3, 2) DEFAULT 0.0,
    source VARCHAR(50) DEFAULT 'manual',
    mf_transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ルールテーブル
CREATE TABLE IF NOT EXISTS rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    pattern TEXT NOT NULL,
    action TEXT NOT NULL,
    category VARCHAR(100),
    account VARCHAR(100),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. AI学習セッションテーブル
CREATE TABLE IF NOT EXISTS ai_learning_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    learning_text TEXT NOT NULL,
    result_status VARCHAR(20) DEFAULT 'pending',
    accuracy_score DECIMAL(3, 2) DEFAULT 0.0,
    learning_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 4. インポート履歴テーブル
CREATE TABLE IF NOT EXISTS import_history (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    import_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 5. バックアップ履歴テーブル
CREATE TABLE IF NOT EXISTS backup_history (
    id SERIAL PRIMARY KEY,
    backup_id VARCHAR(100) UNIQUE NOT NULL,
    backup_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 6. システム設定テーブル
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
CREATE INDEX IF NOT EXISTS idx_rules_active ON rules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_status ON ai_learning_sessions(result_status);

-- 初期データ挿入
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('auto_refresh_interval', '30000', '自動更新間隔（ミリ秒）'),
('ai_learning_enabled', 'true', 'AI学習機能の有効化'),
('mf_cloud_integration', 'false', 'MFクラウド連携の有効化'),
('backup_retention_days', '30', 'バックアップ保持期間（日）')
ON CONFLICT (setting_key) DO NOTHING;

-- サンプルデータ挿入（テスト用）
INSERT INTO transactions (date, description, amount, category, account, status, confidence_score, source) VALUES
('2025-07-01', 'コンビニエンスストア', -1200, '食費', '現金', 'approved', 0.95, 'mf_import'),
('2025-07-02', '給与振込', 300000, '給与', '銀行', 'approved', 1.00, 'mf_import'),
('2025-07-03', '電気代', -8500, '光熱費', '銀行', 'pending', 0.85, 'csv_import'),
('2025-07-04', 'スーパーマーケット', -3200, '食費', 'クレジット', 'pending', 0.90, 'manual'),
('2025-07-05', '書籍購入', -2800, '教養・娯楽費', 'クレジット', 'approved', 0.92, 'csv_import')
ON CONFLICT DO NOTHING;

INSERT INTO rules (name, pattern, action, category, account, priority) VALUES
('コンビニ支出ルール', 'コンビニ|セブン|ローソン|ファミマ', '{"category": "食費", "account": "現金"}', '食費', '現金', 1),
('給与ルール', '給与|賞与|ボーナス', '{"category": "給与", "account": "銀行"}', '給与', '銀行', 2),
('光熱費ルール', '電気|ガス|水道', '{"category": "光熱費", "account": "銀行"}', '光熱費', '銀行', 1),
('交通費ルール', '電車|バス|タクシー|交通', '{"category": "交通費", "account": "現金"}', '交通費', '現金', 1)
ON CONFLICT DO NOTHING;

-- 統計ビュー作成
CREATE OR REPLACE VIEW transaction_statistics AS
SELECT
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 THEN 
                (COUNT(CASE WHEN status = 'approved' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100
            ELSE 0 
        END, 1
    ) as automation_rate,
    MAX(updated_at) as last_updated
FROM transactions;

-- 月別統計ビュー
CREATE OR REPLACE VIEW monthly_statistics AS
SELECT
    DATE_TRUNC('month', date) as month,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_expense,
    SUM(amount) as net_amount
FROM transactions
WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY DATE_TRUNC('month', date)
ORDER BY month DESC;

-- コメント追加
COMMENT ON TABLE transactions IS '取引データテーブル';
COMMENT ON TABLE rules IS 'AI学習用ルールテーブル';
COMMENT ON TABLE ai_learning_sessions IS 'AI学習セッション履歴';
COMMENT ON TABLE import_history IS 'データインポート履歴';
COMMENT ON TABLE backup_history IS 'バックアップ実行履歴';
COMMENT ON TABLE system_settings IS 'システム設定';

-- 権限設定（必要に応じて）
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nagano3_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nagano3_user;
