-- API呼び出し回数管理テーブル
CREATE TABLE IF NOT EXISTS api_call_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(api_name, call_date)
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_api_call_tracker_date 
ON api_call_tracker(api_name, call_date);

-- コメント追加
COMMENT ON TABLE api_call_tracker IS 'API呼び出し回数を日次で追跡';
COMMENT ON COLUMN api_call_tracker.api_name IS 'API名（例: ebay_finding_completed）';
COMMENT ON COLUMN api_call_tracker.call_date IS '呼び出し日';
COMMENT ON COLUMN api_call_tracker.call_count IS '当日の呼び出し回数';
COMMENT ON COLUMN api_call_tracker.daily_limit IS '1日の上限回数';

-- RLS有効化
ALTER TABLE api_call_tracker ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが参照可能
CREATE POLICY "api_call_tracker_select_policy" ON api_call_tracker
  FOR SELECT USING (true);

-- サービスロールのみ更新可能
CREATE POLICY "api_call_tracker_update_policy" ON api_call_tracker
  FOR ALL USING (auth.role() = 'service_role');
