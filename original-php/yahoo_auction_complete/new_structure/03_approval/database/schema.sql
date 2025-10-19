-- 03_approval 最適化データベーススキーマ
-- フィードバック反映：パフォーマンス向上のための専用カラムとインデックス

-- ワークフロー管理テーブル（最適化済み）
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    yahoo_auction_id VARCHAR(255) UNIQUE NOT NULL,
    product_id VARCHAR(255), -- 頻繁にクエリされるため独立カラム
    status VARCHAR(50) DEFAULT 'processing', -- processing, filtered, approved, listed, failed
    current_step INTEGER DEFAULT 1,
    next_step INTEGER, -- 次のステップを明示的に管理
    priority INTEGER DEFAULT 0, -- 優先度管理（高い値が優先）
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- パフォーマンス向上インデックス
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_current_step ON workflows(current_step);
CREATE INDEX IF NOT EXISTS idx_workflows_product_id ON workflows(product_id);
CREATE INDEX IF NOT EXISTS idx_workflows_priority ON workflows(priority DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_updated_at ON workflows(updated_at DESC);

-- ワークフロー実行履歴テーブル（最適化済み）
CREATE TABLE IF NOT EXISTS workflow_executions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(50) NOT NULL, -- success, failed, pending, skipped
    error_message TEXT,
    processing_time INTEGER DEFAULT 0, -- milliseconds
    retry_count INTEGER DEFAULT 0,
    memory_usage BIGINT DEFAULT 0, -- bytes
    created_at TIMESTAMP DEFAULT NOW()
);

-- 実行履歴インデックス
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_step_name ON workflow_executions(step_name);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at DESC);

-- 承認キューテーブル（拡張機能付き）
CREATE TABLE IF NOT EXISTS approval_queue (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL,
    title VARCHAR(1000),
    price_jpy INTEGER,
    current_price INTEGER,
    image_url TEXT,
    all_images JSONB, -- 複数画像対応
    bids INTEGER DEFAULT 0,
    time_left VARCHAR(100),
    url TEXT,
    ai_confidence_score INTEGER DEFAULT 0,
    ai_recommendation TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    reviewer_notes TEXT,
    approved_at TIMESTAMP,
    approved_by VARCHAR(100),
    deadline TIMESTAMP, -- 承認期限
    escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 承認キューインデックス
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_product_id ON approval_queue(product_id);
CREATE INDEX IF NOT EXISTS idx_approval_queue_ai_score ON approval_queue(ai_confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_approval_queue_price ON approval_queue(price_jpy DESC);
CREATE INDEX IF NOT EXISTS idx_approval_queue_deadline ON approval_queue(deadline);
CREATE INDEX IF NOT EXISTS idx_approval_queue_created_at ON approval_queue(created_at DESC);

-- 承認履歴テーブル
CREATE TABLE IF NOT EXISTS approval_history (
    id SERIAL PRIMARY KEY,
    approval_id INTEGER REFERENCES approval_queue(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- approved, rejected, updated
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reviewer_id VARCHAR(100),
    reviewer_notes TEXT,
    changed_fields JSONB, -- 変更されたフィールドの記録
    created_at TIMESTAMP DEFAULT NOW()
);

-- 承認履歴インデックス
CREATE INDEX IF NOT EXISTS idx_approval_history_approval_id ON approval_history(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_action ON approval_history(action);
CREATE INDEX IF NOT EXISTS idx_approval_history_reviewer ON approval_history(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_created_at ON approval_history(created_at DESC);

-- 統計用マテリアライズドビュー（パフォーマンス向上）
CREATE MATERIALIZED VIEW IF NOT EXISTS approval_stats AS
SELECT 
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE ai_confidence_score >= 80) as ai_recommended_count,
    AVG(ai_confidence_score) as avg_ai_score,
    AVG(price_jpy) as avg_price,
    MIN(created_at) as oldest_item,
    MAX(created_at) as newest_item
FROM approval_queue;

-- 統計ビューの定期更新用関数
CREATE OR REPLACE FUNCTION refresh_approval_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW approval_stats;
END;
$$ LANGUAGE plpgsql;

-- 承認期限アラート用関数
CREATE OR REPLACE FUNCTION check_approval_deadlines()
RETURNS TABLE(
    id INTEGER,
    product_id VARCHAR(255),
    title VARCHAR(1000),
    deadline TIMESTAMP,
    hours_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aq.id,
        aq.product_id,
        aq.title,
        aq.deadline,
        EXTRACT(HOUR FROM (NOW() - aq.deadline))::INTEGER as hours_overdue
    FROM approval_queue aq
    WHERE aq.status = 'pending' 
    AND aq.deadline < NOW()
    ORDER BY aq.deadline;
END;
$$ LANGUAGE plpgsql;

-- 自動エスカレーション用トリガー
CREATE OR REPLACE FUNCTION auto_escalate_overdue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deadline < NOW() AND NEW.status = 'pending' AND NOT NEW.escalated THEN
        NEW.escalated = TRUE;
        -- ここで通知システムを呼び出すことも可能
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_escalate_overdue
    BEFORE UPDATE ON approval_queue
    FOR EACH ROW
    EXECUTE FUNCTION auto_escalate_overdue();

-- 承認履歴自動記録トリガー
CREATE OR REPLACE FUNCTION log_approval_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO approval_history (
            approval_id, action, previous_status, new_status, 
            reviewer_id, reviewer_notes, changed_fields
        ) VALUES (
            NEW.id, 
            CASE NEW.status 
                WHEN 'approved' THEN 'approved'
                WHEN 'rejected' THEN 'rejected'
                ELSE 'updated'
            END,
            OLD.status, 
            NEW.status,
            NEW.approved_by,
            NEW.reviewer_notes,
            jsonb_build_object(
                'old', row_to_json(OLD),
                'new', row_to_json(NEW)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_approval_changes
    AFTER UPDATE ON approval_queue
    FOR EACH ROW
    EXECUTE FUNCTION log_approval_changes();

-- サンプルデータ投入（開発用）
INSERT INTO workflows (yahoo_auction_id, product_id, status, current_step, data) VALUES
('y1001', 'p1001', 'pending_approval', 7, '{"title": "Canon EOS R5 カメラ", "price": 350000}'),
('y1002', 'p1002', 'pending_approval', 7, '{"title": "Nintendo Switch OLED", "price": 38000}'),
('y1003', 'p1003', 'pending_approval', 7, '{"title": "MacBook Pro M2", "price": 280000}')
ON CONFLICT (yahoo_auction_id) DO NOTHING;

INSERT INTO approval_queue (workflow_id, product_id, title, price_jpy, current_price, bids, time_left, ai_confidence_score, status, deadline) VALUES
(1, 'p1001', 'Canon EOS R5 ミラーレス一眼カメラ 新品同様', 350000, 350000, 12, '2日3時間', 92, 'pending', NOW() + INTERVAL '24 hours'),
(2, 'p1002', 'Nintendo Switch OLED ホワイト 未開封品', 38000, 38000, 5, '1日18時間', 88, 'pending', NOW() + INTERVAL '12 hours'),
(3, 'p1003', 'MacBook Pro M2 13inch 512GB スペースグレイ', 280000, 280000, 8, '3日5時間', 95, 'pending', NOW() + INTERVAL '6 hours')
ON CONFLICT DO NOTHING;
