-- ===== 記帳自動化ツール PostgreSQLテーブル設計 =====
-- 実行方法: psql -d your_database -f kicho_database_schema.sql

-- UUIDエクステンション有効化（既存システムで設定済みの場合はスキップ）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 取引データテーブル（kicho_transactions）
CREATE TABLE IF NOT EXISTS kicho_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本情報
    transaction_no VARCHAR(50) NOT NULL,
    transaction_date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    
    -- 借方情報
    debit_account_code VARCHAR(20) NOT NULL,
    debit_subaccount_code VARCHAR(20),
    debit_department VARCHAR(50),
    debit_client VARCHAR(100),
    debit_tax_type VARCHAR(20),
    debit_invoice_no VARCHAR(50),
    
    -- 貸方情報
    credit_account_code VARCHAR(20) NOT NULL,
    credit_subaccount_code VARCHAR(20),
    credit_department VARCHAR(50),
    credit_client VARCHAR(100),
    credit_tax_type VARCHAR(20),
    credit_invoice_no VARCHAR(50),
    
    -- メタデータ
    description TEXT,
    tags TEXT[], -- PostgreSQL配列型
    memo TEXT,
    applied_rule_id UUID,
    confidence_score DECIMAL(5, 4), -- 0.0000 - 1.0000
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sent')),
    data_source VARCHAR(20) DEFAULT 'manual' CHECK (data_source IN ('mf_api', 'csv', 'manual')),
    
    -- マルチテナント対応
    tenant_id UUID NOT NULL,
    
    -- 監査情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- インデックス用
    CONSTRAINT fk_kicho_transactions_tenant FOREIGN KEY (tenant_id) REFERENCES users(id),
    CONSTRAINT fk_kicho_transactions_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_kicho_transactions_rule FOREIGN KEY (applied_rule_id) REFERENCES kicho_rules(id)
);

-- 2. 仕訳ルールテーブル（kicho_rules）
CREATE TABLE IF NOT EXISTS kicho_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- ルール基本情報
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(20) DEFAULT 'manual' CHECK (rule_type IN ('ai_generated', 'manual', 'learned')),
    
    -- 条件設定
    keywords TEXT[], -- マッチング用キーワード配列
    amount_min DECIMAL(15, 2),
    amount_max DECIMAL(15, 2),
    client_pattern VARCHAR(200),
    
    -- 優先度
    priority INTEGER DEFAULT 100, -- 数値が高いほど優先
    
    -- 仕訳設定（テンプレート）
    template_debit_account VARCHAR(20) NOT NULL,
    template_debit_subaccount VARCHAR(20),
    template_debit_department VARCHAR(50),
    template_debit_client VARCHAR(100),
    template_debit_tax_type VARCHAR(20),
    
    template_credit_account VARCHAR(20) NOT NULL,
    template_credit_subaccount VARCHAR(20),
    template_credit_department VARCHAR(50),
    template_credit_client VARCHAR(100),
    template_credit_tax_type VARCHAR(20),
    
    -- テンプレート
    tag_template TEXT[],
    memo_template TEXT,
    
    -- AI学習データ
    confidence_score DECIMAL(5, 4) DEFAULT 0.5000,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 4) DEFAULT 0.0000,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'inactive')),
    
    -- マルチテナント対応
    tenant_id UUID NOT NULL,
    
    -- 監査情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    -- 制約
    CONSTRAINT fk_kicho_rules_tenant FOREIGN KEY (tenant_id) REFERENCES users(id),
    CONSTRAINT fk_kicho_rules_creator FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 3. AI学習データテーブル（kicho_learning_data）
CREATE TABLE IF NOT EXISTS kicho_learning_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- データ種別
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('text', 'transaction', 'feedback')),
    
    -- 学習データ（JSON形式）
    source_data JSONB, -- 元データ
    processed_data JSONB, -- 処理済みデータ
    learning_result JSONB, -- 学習結果
    
    -- メタデータ
    confidence_score DECIMAL(5, 4),
    processing_time INTEGER, -- ミリ秒
    
    -- マルチテナント対応
    tenant_id UUID NOT NULL,
    
    -- 監査情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_kicho_learning_tenant FOREIGN KEY (tenant_id) REFERENCES users(id)
);

-- 4. 統計テーブル（kicho_statistics）
CREATE TABLE IF NOT EXISTS kicho_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 統計期間
    period_date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'monthly', 'yearly')),
    
    -- 統計データ
    pending_count INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    
    active_rules_count INTEGER DEFAULT 0,
    automation_rate DECIMAL(5, 4) DEFAULT 0.0000, -- 自動化率
    error_count INTEGER DEFAULT 0,
    
    total_amount DECIMAL(15, 2) DEFAULT 0.00,
    avg_processing_time INTEGER DEFAULT 0, -- ミリ秒
    
    -- マルチテナント対応
    tenant_id UUID NOT NULL,
    
    -- 監査情報
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT fk_kicho_statistics_tenant FOREIGN KEY (tenant_id) REFERENCES users(id),
    CONSTRAINT uk_kicho_statistics_period UNIQUE (tenant_id, period_date, period_type)
);

-- ===== インデックス作成 =====

-- 取引データ用インデックス
CREATE INDEX IF NOT EXISTS idx_kicho_transactions_date ON kicho_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_kicho_transactions_status ON kicho_transactions(status);
CREATE INDEX IF NOT EXISTS idx_kicho_transactions_tenant ON kicho_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kicho_transactions_source ON kicho_transactions(data_source);
CREATE INDEX IF NOT EXISTS idx_kicho_transactions_compound ON kicho_transactions(tenant_id, status, transaction_date);

-- ルール用インデックス
CREATE INDEX IF NOT EXISTS idx_kicho_rules_priority ON kicho_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_kicho_rules_status ON kicho_rules(status);
CREATE INDEX IF NOT EXISTS idx_kicho_rules_tenant ON kicho_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kicho_rules_type ON kicho_rules(rule_type);

-- 学習データ用インデックス
CREATE INDEX IF NOT EXISTS idx_kicho_learning_type ON kicho_learning_data(data_type);
CREATE INDEX IF NOT EXISTS idx_kicho_learning_tenant ON kicho_learning_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kicho_learning_created ON kicho_learning_data(created_at);

-- 統計用インデックス
CREATE INDEX IF NOT EXISTS idx_kicho_statistics_period ON kicho_statistics(period_date, period_type);
CREATE INDEX IF NOT EXISTS idx_kicho_statistics_tenant ON kicho_statistics(tenant_id);

-- ===== 関数・トリガー =====

-- updated_atを自動更新する関数
CREATE OR REPLACE FUNCTION update_kicho_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_atトリガー設定
CREATE TRIGGER trigger_kicho_transactions_updated_at
    BEFORE UPDATE ON kicho_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_kicho_updated_at();

CREATE TRIGGER trigger_kicho_rules_updated_at
    BEFORE UPDATE ON kicho_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_kicho_updated_at();

CREATE TRIGGER trigger_kicho_statistics_updated_at
    BEFORE UPDATE ON kicho_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_kicho_updated_at();

-- ===== 初期データ投入 =====

-- デモ用仕訳ルール（例）
INSERT INTO kicho_rules (
    rule_name, rule_type, keywords, template_debit_account, template_credit_account,
    tenant_id, created_by, priority, status
) VALUES 
(
    '電気料金自動仕訳', 'manual', 
    ARRAY['電気料金', '東京電力', '関西電力'], 
    '552', '111', -- 水道光熱費 / 現金
    (SELECT id FROM users LIMIT 1), -- 最初のユーザー
    (SELECT id FROM users LIMIT 1),
    200, 'active'
),
(
    '交通費自動仕訳', 'manual',
    ARRAY['交通費', 'JR', '電車', 'バス'],
    '554', '111', -- 旅費交通費 / 現金
    (SELECT id FROM users LIMIT 1),
    (SELECT id FROM users LIMIT 1),
    150, 'active'
)
ON CONFLICT DO NOTHING;

-- 統計初期化（当月分）
INSERT INTO kicho_statistics (
    period_date, period_type, tenant_id
) VALUES 
(
    DATE_TRUNC('month', CURRENT_DATE)::DATE, 'monthly',
    (SELECT id FROM users LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- ===== 完了メッセージ =====
SELECT 
    'kicho_transactions' as table_name, 
    count(*) as record_count 
FROM kicho_transactions
UNION ALL
SELECT 
    'kicho_rules' as table_name, 
    count(*) as record_count 
FROM kicho_rules
UNION ALL
SELECT 
    'kicho_learning_data' as table_name, 
    count(*) as record_count 
FROM kicho_learning_data
UNION ALL
SELECT 
    'kicho_statistics' as table_name, 
    count(*) as record_count 
FROM kicho_statistics;

-- 権限確認
SELECT 
    schemaname, 
    tablename, 
    tableowner 
FROM pg_tables 
WHERE tablename LIKE 'kicho_%';