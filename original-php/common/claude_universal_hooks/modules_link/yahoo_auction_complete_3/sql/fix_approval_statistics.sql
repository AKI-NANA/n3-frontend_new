-- 承認システム修正SQL
-- approval_statisticsテーブルの構造確認と修正

-- 現在のテーブル構造確認
\d approval_statistics

-- もしVIEWの場合は削除して再作成
DROP VIEW IF EXISTS approval_statistics;

-- 正しいテーブル作成
CREATE TABLE IF NOT EXISTS approval_statistics (
    stat_id SERIAL PRIMARY KEY,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    total_pending INTEGER DEFAULT 0,
    total_approved INTEGER DEFAULT 0,
    total_rejected INTEGER DEFAULT 0,
    total_held INTEGER DEFAULT 0,
    avg_approval_time_minutes NUMERIC(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date_recorded)
);

-- 修正された統計更新関数
CREATE OR REPLACE FUNCTION update_approval_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO approval_statistics (
        date_recorded,
        total_pending,
        total_approved,
        total_rejected,
        total_held
    )
    SELECT 
        CURRENT_DATE,
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(*) FILTER (WHERE status = 'held')
    FROM approval_queue
    ON CONFLICT (date_recorded) DO UPDATE SET
        total_pending = EXCLUDED.total_pending,
        total_approved = EXCLUDED.total_approved,
        total_rejected = EXCLUDED.total_rejected,
        total_held = EXCLUDED.total_held;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガー再作成
DROP TRIGGER IF EXISTS trigger_update_approval_stats ON approval_queue;
CREATE TRIGGER trigger_update_approval_stats
    AFTER INSERT OR UPDATE OR DELETE ON approval_queue
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_approval_statistics();

-- 初期統計データ作成
INSERT INTO approval_statistics (date_recorded) VALUES (CURRENT_DATE) 
ON CONFLICT (date_recorded) DO NOTHING;

-- 確認
SELECT 'Approval statistics table fixed successfully!' as message;
