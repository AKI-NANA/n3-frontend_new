-- NAGANO-3 設定駆動型ワークフローシステム用データベーススキーマ
-- Week 3 Phase 3A 拡張

-- =====================================
-- 設定駆動ワークフロー実行管理テーブル
-- =====================================

-- ワークフロー実行記録テーブル
CREATE TABLE IF NOT EXISTS configurable_workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    workflow_version VARCHAR(20) DEFAULT '1.0',
    input_data JSONB,
    options JSONB,
    status VARCHAR(50) DEFAULT 'started',
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER DEFAULT 9,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    execution_time_ms INTEGER,
    
    -- 実行統計
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    skip_count INTEGER DEFAULT 0,
    
    -- メタデータ
    trigger_type VARCHAR(50), -- manual, scheduled, webhook
    triggered_by VARCHAR(100),
    priority INTEGER DEFAULT 50,
    tags TEXT[],
    
    -- 実行環境情報
    server_instance VARCHAR(100),
    process_id VARCHAR(50),
    memory_usage_mb INTEGER,
    
    CONSTRAINT valid_status CHECK (status IN ('started', 'processing', 'waiting_approval', 'completed', 'failed', 'cancelled', 'rollback'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_configurable_workflows_status ON configurable_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_configurable_workflows_workflow_name ON configurable_workflow_executions(workflow_name);
CREATE INDEX IF NOT EXISTS idx_configurable_workflows_started_at ON configurable_workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_configurable_workflows_priority ON configurable_workflow_executions(priority DESC);

-- ステップ実行詳細テーブル
CREATE TABLE IF NOT EXISTS configurable_workflow_step_executions (
    id SERIAL PRIMARY KEY,
    workflow_execution_id INTEGER NOT NULL REFERENCES configurable_workflow_executions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    
    -- 実行情報
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    execution_time_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    
    -- データ
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    error_details JSONB,
    
    -- 実行統計
    items_processed INTEGER DEFAULT 0,
    items_success INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    -- パフォーマンス情報
    memory_usage_mb INTEGER,
    cpu_usage_percent NUMERIC(5,2),
    api_calls_made INTEGER DEFAULT 0,
    
    CONSTRAINT valid_step_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_step_executions_workflow_id ON configurable_workflow_step_executions(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_step_number ON configurable_workflow_step_executions(step_number);
CREATE INDEX IF NOT EXISTS idx_step_executions_status ON configurable_workflow_step_executions(status);
CREATE INDEX IF NOT EXISTS idx_step_executions_service ON configurable_workflow_step_executions(service_name);

-- =====================================
-- ワークフロー承認待ちキュー拡張
-- =====================================

-- 手動承認キューテーブル
CREATE TABLE IF NOT EXISTS workflow_approval_queue (
    id SERIAL PRIMARY KEY,
    workflow_execution_id INTEGER NOT NULL REFERENCES configurable_workflow_executions(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    
    -- 承認情報
    approval_status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_to VARCHAR(100),
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    
    -- 承認データ
    approval_data JSONB, -- 承認対象データ
    reviewer_notes TEXT,
    approval_decision JSONB, -- 承認決定の詳細
    
    -- エスカレーション
    escalation_level INTEGER DEFAULT 0,
    escalated_at TIMESTAMP,
    escalated_to VARCHAR(100),
    
    -- タイムアウト管理
    timeout_at TIMESTAMP,
    auto_action_on_timeout VARCHAR(50), -- approve, reject, escalate
    
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'escalated', 'timeout'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON workflow_approval_queue(approval_status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_assigned_to ON workflow_approval_queue(assigned_to);
CREATE INDEX IF NOT EXISTS idx_approval_queue_timeout ON workflow_approval_queue(timeout_at);

-- =====================================
-- ワークフロー統計・監視テーブル
-- =====================================

-- ワークフロー実行統計テーブル
CREATE TABLE IF NOT EXISTS workflow_execution_statistics (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(100) NOT NULL,
    date_collected DATE DEFAULT CURRENT_DATE,
    
    -- 実行統計
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    cancelled_executions INTEGER DEFAULT 0,
    
    -- パフォーマンス統計
    avg_execution_time_ms INTEGER DEFAULT 0,
    min_execution_time_ms INTEGER DEFAULT 0,
    max_execution_time_ms INTEGER DEFAULT 0,
    total_items_processed INTEGER DEFAULT 0,
    
    -- リソース使用統計
    avg_memory_usage_mb INTEGER DEFAULT 0,
    max_memory_usage_mb INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    
    -- エラー統計
    common_errors JSONB, -- エラーメッセージ別の発生回数
    step_failure_rates JSONB, -- ステップ別失敗率
    
    UNIQUE(workflow_name, date_collected)
);

-- =====================================
-- 便利なビュー定義
-- =====================================

-- ワークフロー実行サマリービュー
CREATE OR REPLACE VIEW workflow_execution_summary AS
SELECT 
    we.id,
    we.workflow_name,
    we.status,
    we.started_at,
    we.completed_at,
    we.execution_time_ms,
    we.success_count,
    we.error_count,
    we.current_step,
    we.total_steps,
    
    -- ステップ統計
    COUNT(wse.id) as executed_steps,
    COUNT(CASE WHEN wse.status = 'completed' THEN 1 END) as completed_steps,
    COUNT(CASE WHEN wse.status = 'failed' THEN 1 END) as failed_steps,
    
    -- パフォーマンス統計
    COALESCE(AVG(wse.execution_time_ms), 0) as avg_step_time_ms,
    COALESCE(MAX(wse.execution_time_ms), 0) as max_step_time_ms,
    COALESCE(SUM(wse.items_processed), 0) as total_items_processed,
    
    -- 進捗計算
    ROUND((we.current_step::float / we.total_steps * 100), 1) as progress_percentage

FROM configurable_workflow_executions we
LEFT JOIN configurable_workflow_step_executions wse ON we.id = wse.workflow_execution_id
GROUP BY we.id, we.workflow_name, we.status, we.started_at, we.completed_at, 
         we.execution_time_ms, we.success_count, we.error_count, we.current_step, we.total_steps;

-- 承認待ちワークフロービュー
CREATE OR REPLACE VIEW workflow_pending_approvals AS
SELECT 
    waq.id as approval_id,
    we.id as workflow_execution_id,
    we.workflow_name,
    waq.step_number,
    waq.step_name,
    waq.approval_status,
    waq.assigned_to,
    waq.requested_at,
    waq.timeout_at,
    
    -- データサマリー
    COALESCE(jsonb_array_length(waq.approval_data->'items'), 0) as items_count,
    
    -- 緊急度判定
    CASE 
        WHEN waq.timeout_at < CURRENT_TIMESTAMP THEN 'timeout'
        WHEN waq.timeout_at < CURRENT_TIMESTAMP + INTERVAL '1 hour' THEN 'urgent'
        WHEN waq.escalation_level > 0 THEN 'escalated'
        ELSE 'normal'
    END as urgency_level,
    
    -- 待機時間
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - waq.requested_at)) / 60 as waiting_minutes

FROM workflow_approval_queue waq
JOIN configurable_workflow_executions we ON waq.workflow_execution_id = we.id
WHERE waq.approval_status = 'pending'
ORDER BY 
    CASE 
        WHEN waq.timeout_at < CURRENT_TIMESTAMP THEN 1
        WHEN waq.timeout_at < CURRENT_TIMESTAMP + INTERVAL '1 hour' THEN 2
        WHEN waq.escalation_level > 0 THEN 3
        ELSE 4
    END,
    waq.requested_at;

-- =====================================
-- 統計情報更新用関数
-- =====================================

-- ワークフロー統計更新関数
CREATE OR REPLACE FUNCTION update_workflow_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 実行完了時の統計更新
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
        INSERT INTO workflow_execution_statistics (
            workflow_name, 
            date_collected,
            total_executions,
            successful_executions,
            failed_executions,
            cancelled_executions,
            avg_execution_time_ms,
            total_items_processed
        )
        VALUES (
            NEW.workflow_name,
            CURRENT_DATE,
            1,
            CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
            COALESCE(NEW.execution_time_ms, 0),
            NEW.success_count
        )
        ON CONFLICT (workflow_name, date_collected)
        DO UPDATE SET
            total_executions = workflow_execution_statistics.total_executions + 1,
            successful_executions = workflow_execution_statistics.successful_executions + 
                CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
            failed_executions = workflow_execution_statistics.failed_executions + 
                CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            cancelled_executions = workflow_execution_statistics.cancelled_executions + 
                CASE WHEN NEW.status = 'cancelled' THEN 1 ELSE 0 END,
            avg_execution_time_ms = (
                workflow_execution_statistics.avg_execution_time_ms * (workflow_execution_statistics.total_executions - 1) + 
                COALESCE(NEW.execution_time_ms, 0)
            ) / workflow_execution_statistics.total_executions,
            total_items_processed = workflow_execution_statistics.total_items_processed + NEW.success_count;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS workflow_statistics_update_trigger ON configurable_workflow_executions;
CREATE TRIGGER workflow_statistics_update_trigger
    AFTER UPDATE ON configurable_workflow_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_workflow_statistics();

-- =====================================
-- 初期インデックス最適化
-- =====================================

-- 複合インデックス（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_workflow_executions_composite ON configurable_workflow_executions(workflow_name, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_step_executions_composite ON configurable_workflow_step_executions(workflow_execution_id, step_number, status);

-- 部分インデックス（条件付きインデックス）
CREATE INDEX IF NOT EXISTS idx_active_workflows ON configurable_workflow_executions(started_at DESC) 
WHERE status IN ('started', 'processing', 'waiting_approval');

CREATE INDEX IF NOT EXISTS idx_failed_steps ON configurable_workflow_step_executions(step_name, error_message) 
WHERE status = 'failed';

-- JSON インデックス（JSONB検索高速化）
CREATE INDEX IF NOT EXISTS idx_workflow_input_data_gin ON configurable_workflow_executions USING gin(input_data);
CREATE INDEX IF NOT EXISTS idx_step_output_data_gin ON configurable_workflow_step_executions USING gin(output_data);

-- =====================================
-- コメント追加（ドキュメント化）
-- =====================================

COMMENT ON TABLE configurable_workflow_executions IS 'ワークフロー実行記録テーブル - 各ワークフローの実行履歴とステータス管理';
COMMENT ON TABLE configurable_workflow_step_executions IS 'ワークフローステップ実行詳細テーブル - 各ステップレベルの実行履歴';
COMMENT ON TABLE workflow_approval_queue IS '手動承認キューテーブル - 承認待ちワークフローの管理';
COMMENT ON TABLE workflow_execution_statistics IS 'ワークフロー実行統計テーブル - 日次集計された実行統計';

COMMENT ON COLUMN configurable_workflow_executions.workflow_name IS 'YAML設定ファイルで定義されたワークフロー名';
COMMENT ON COLUMN configurable_workflow_executions.status IS 'ワークフローの現在のステータス';
COMMENT ON COLUMN configurable_workflow_executions.current_step IS '現在実行中のステップ番号（1-9）';
COMMENT ON COLUMN configurable_workflow_executions.input_data IS '入力データ（YAML設定からの値）';
COMMENT ON COLUMN configurable_workflow_executions.trigger_type IS '実行トリガーの種類（manual/scheduled/webhook）';
