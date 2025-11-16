-- ====================================================================
-- 在庫監視システム - 実行ログとスケジュール管理テーブル
-- ====================================================================
-- 作成日: 2025-11-02
-- 目的: 実行履歴とスケジュール設定のテーブルを追加
-- ====================================================================

-- ====================================================================
-- 1. 実行ログテーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS inventory_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- ステータス
  status VARCHAR(20) NOT NULL DEFAULT 'running',
  -- 'running': 実行中
  -- 'completed': 完了
  -- 'failed': 失敗
  -- 'partial': 部分的成功
  
  -- 実行情報
  trigger_type VARCHAR(50),
  -- 'manual': 手動実行
  -- 'cron': Cron自動実行
  -- 'schedule': スケジュール実行
  
  -- 処理統計
  products_processed INTEGER DEFAULT 0,
  changes_detected INTEGER DEFAULT 0,
  price_changes_count INTEGER DEFAULT 0,
  inventory_changes_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- 実行時間
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  
  -- エラー情報
  error_message TEXT,
  error_details JSONB,
  
  -- メタデータ
  executed_by VARCHAR(100),
  execution_config JSONB,
  -- 例: {
  --   "max_products": 50,
  --   "timeout_seconds": 300,
  --   "retry_on_error": true
  -- }
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_status ON inventory_monitoring_logs(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_started ON inventory_monitoring_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_trigger ON inventory_monitoring_logs(trigger_type);

-- コメント
COMMENT ON TABLE inventory_monitoring_logs IS '在庫監視実行ログ：各実行の詳細記録';
COMMENT ON COLUMN inventory_monitoring_logs.status IS 'ステータス：running/completed/failed/partial';
COMMENT ON COLUMN inventory_monitoring_logs.trigger_type IS '実行トリガー：manual/cron/schedule';

-- ====================================================================
-- 2. スケジュール設定テーブル
-- ====================================================================

CREATE TABLE IF NOT EXISTS monitoring_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- スケジュール基本情報
  name VARCHAR(100) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  
  -- 実行頻度
  frequency VARCHAR(50) NOT NULL,
  -- 'hourly': 毎時
  -- 'every_3h': 3時間ごと
  -- 'every_6h': 6時間ごと
  -- 'daily': 毎日
  -- 'weekly': 毎週
  -- 'custom': カスタムCron式
  
  -- Cron式（customの場合に使用）
  cron_expression VARCHAR(100),
  
  -- 実行時間帯の制限
  execution_window_start TIME,
  execution_window_end TIME,
  
  -- 実行設定
  max_products_per_run INTEGER DEFAULT 50,
  timeout_seconds INTEGER DEFAULT 300,
  retry_on_error BOOLEAN DEFAULT TRUE,
  
  -- 対象フィルター (JSON)
  target_filters JSONB DEFAULT '{}',
  -- 例: {
  --   "marketplaces": ["yahoo_auctions", "mercari"],
  --   "categories": ["Trading Cards", "Cameras"],
  --   "min_price_jpy": 1000,
  --   "max_price_jpy": 100000,
  --   "priority_only": false
  -- }
  
  -- 通知設定
  notify_on_completion BOOLEAN DEFAULT FALSE,
  notify_on_error BOOLEAN DEFAULT TRUE,
  notification_email VARCHAR(255),
  notification_slack_webhook TEXT,
  
  -- 実行統計
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  
  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(100),
  
  -- アクティブ制御
  paused_until TIMESTAMP,
  pause_reason TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_enabled ON monitoring_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_next_run ON monitoring_schedules(next_run);
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_frequency ON monitoring_schedules(frequency);

-- コメント
COMMENT ON TABLE monitoring_schedules IS 'スケジュール設定：自動監視のスケジュール管理';
COMMENT ON COLUMN monitoring_schedules.frequency IS '実行頻度：hourly/every_3h/every_6h/daily/weekly/custom';
COMMENT ON COLUMN monitoring_schedules.target_filters IS '対象フィルター：マーケットプレイス、カテゴリ、価格帯などで絞り込み';

-- ====================================================================
-- 3. デフォルトスケジュールの挿入
-- ====================================================================

-- デフォルトスケジュール: 毎日午前3時に実行
INSERT INTO monitoring_schedules (
  name,
  description,
  enabled,
  frequency,
  execution_window_start,
  execution_window_end,
  max_products_per_run,
  notify_on_error,
  target_filters
) VALUES (
  'デフォルト在庫監視',
  '毎日午前3時に全商品を監視',
  true,
  'daily',
  '03:00:00',
  '06:00:00',
  50,
  true,
  '{}'
) ON CONFLICT DO NOTHING;

-- ====================================================================
-- 4. ビューの作成
-- ====================================================================

-- アクティブなスケジュールのビュー
CREATE OR REPLACE VIEW active_monitoring_schedules AS
SELECT 
  s.*,
  CASE 
    WHEN s.next_run IS NULL THEN 'not_scheduled'
    WHEN s.next_run <= NOW() THEN 'ready_to_run'
    WHEN s.paused_until IS NOT NULL AND s.paused_until > NOW() THEN 'paused'
    ELSE 'scheduled'
  END as schedule_status
FROM monitoring_schedules s
WHERE s.enabled = true
  AND (s.paused_until IS NULL OR s.paused_until <= NOW())
ORDER BY s.next_run ASC NULLS FIRST;

-- 最近の実行ログのビュー
CREATE OR REPLACE VIEW recent_monitoring_logs AS
SELECT 
  l.*,
  CASE 
    WHEN l.duration_seconds IS NOT NULL THEN 
      CONCAT(FLOOR(l.duration_seconds / 60), '分', MOD(l.duration_seconds, 60), '秒')
    ELSE NULL
  END as duration_formatted,
  CASE 
    WHEN l.products_processed > 0 THEN 
      ROUND((l.changes_detected::numeric / l.products_processed) * 100, 2)
    ELSE 0
  END as change_detection_rate
FROM inventory_monitoring_logs l
WHERE l.started_at >= NOW() - INTERVAL '30 days'
ORDER BY l.started_at DESC
LIMIT 100;

-- ====================================================================
-- 5. トリガー関数の作成
-- ====================================================================

-- 実行完了時に統計を更新
CREATE OR REPLACE FUNCTION update_monitoring_log_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 実行時間を計算
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
  END IF;
  
  -- ステータスが完了に変更された場合
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_update_monitoring_log_stats ON inventory_monitoring_logs;
CREATE TRIGGER trigger_update_monitoring_log_stats
  BEFORE UPDATE ON inventory_monitoring_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_log_stats();

-- スケジュール実行後に統計を更新
CREATE OR REPLACE FUNCTION update_schedule_stats()
RETURNS TRIGGER AS $$
DECLARE
  schedule_id UUID;
BEGIN
  -- 実行ログに関連するスケジュールIDを取得（execution_configから）
  IF NEW.execution_config ? 'schedule_id' THEN
    schedule_id := (NEW.execution_config->>'schedule_id')::UUID;
    
    -- スケジュールの統計を更新
    UPDATE monitoring_schedules
    SET 
      last_run = NEW.started_at,
      total_runs = total_runs + 1,
      successful_runs = CASE WHEN NEW.status = 'completed' THEN successful_runs + 1 ELSE successful_runs END,
      failed_runs = CASE WHEN NEW.status = 'failed' THEN failed_runs + 1 ELSE failed_runs END
    WHERE id = schedule_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
DROP TRIGGER IF EXISTS trigger_update_schedule_stats ON inventory_monitoring_logs;
CREATE TRIGGER trigger_update_schedule_stats
  AFTER INSERT OR UPDATE ON inventory_monitoring_logs
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'failed'))
  EXECUTE FUNCTION update_schedule_stats();

-- updated_atの自動更新
DROP TRIGGER IF EXISTS update_monitoring_schedules_updated_at ON monitoring_schedules;
CREATE TRIGGER update_monitoring_schedules_updated_at
  BEFORE UPDATE ON monitoring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 6. 検証クエリ
-- ====================================================================

-- テーブルの存在確認
DO $$
BEGIN
  RAISE NOTICE 'テーブル作成確認中...';
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_monitoring_logs') THEN
    RAISE NOTICE '✓ inventory_monitoring_logs テーブル作成済み';
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'monitoring_schedules') THEN
    RAISE NOTICE '✓ monitoring_schedules テーブル作成済み';
  END IF;
END $$;

-- デフォルトスケジュールの確認
SELECT 
  name,
  enabled,
  frequency,
  execution_window_start,
  execution_window_end,
  max_products_per_run
FROM monitoring_schedules
ORDER BY created_at;

-- 実行ログの統計
SELECT 
  status,
  COUNT(*) as count,
  AVG(duration_seconds) as avg_duration_sec,
  AVG(products_processed) as avg_products,
  AVG(changes_detected) as avg_changes
FROM inventory_monitoring_logs
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
