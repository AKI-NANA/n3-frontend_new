-- ==========================================
-- 在庫監視システム マイグレーション
-- 作成日: 2025-10-22
-- ==========================================

-- ==========================================
-- 1. products テーブルに在庫監視用フィールドを追加
-- ==========================================

-- 在庫監視関連フィールド
ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS monitoring_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_monitored_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS monitoring_status TEXT DEFAULT 'inactive';
ALTER TABLE products ADD COLUMN IF NOT EXISTS monitoring_error_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_monitoring_error TEXT;

-- 前回値（変動検知用）
ALTER TABLE products ADD COLUMN IF NOT EXISTS previous_price_jpy NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS previous_stock INTEGER;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_monitoring_enabled ON products(monitoring_enabled) WHERE monitoring_enabled = true;
CREATE INDEX IF NOT EXISTS idx_products_source_url ON products(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_monitoring_status ON products(monitoring_status);

-- コメント追加
COMMENT ON COLUMN products.source_url IS '元の商品ページURL（スクレイピング対象）';
COMMENT ON COLUMN products.monitoring_enabled IS '在庫監視が有効かどうか';
COMMENT ON COLUMN products.monitoring_started_at IS '在庫監視開始日時';
COMMENT ON COLUMN products.last_monitored_at IS '最後に監視を実行した日時';
COMMENT ON COLUMN products.monitoring_status IS '監視ステータス: active/paused/stopped/error/inactive';
COMMENT ON COLUMN products.monitoring_error_count IS '連続エラー回数';
COMMENT ON COLUMN products.previous_price_jpy IS '前回取得時の価格（変動検知用）';
COMMENT ON COLUMN products.previous_stock IS '前回取得時の在庫数（変動検知用）';


-- ==========================================
-- 2. yahoo_scraped_products テーブルに監視用フィールドを追加
-- ==========================================

ALTER TABLE yahoo_scraped_products ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT false;
ALTER TABLE yahoo_scraped_products ADD COLUMN IF NOT EXISTS monitoring_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE yahoo_scraped_products ADD COLUMN IF NOT EXISTS last_monitored_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE yahoo_scraped_products ADD COLUMN IF NOT EXISTS previous_price_jpy NUMERIC(10,2);
ALTER TABLE yahoo_scraped_products ADD COLUMN IF NOT EXISTS previous_stock INTEGER;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_products_monitoring ON yahoo_scraped_products(monitoring_enabled) WHERE monitoring_enabled = true;


-- ==========================================
-- 3. inventory_monitoring_logs テーブル作成
-- ==========================================

CREATE TABLE IF NOT EXISTS inventory_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_type TEXT NOT NULL CHECK (execution_type IN ('scheduled', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

  -- 対象商品
  target_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- タイミング
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- 結果サマリー
  changes_detected INTEGER DEFAULT 0,
  price_changes INTEGER DEFAULT 0,
  stock_changes INTEGER DEFAULT 0,
  page_errors INTEGER DEFAULT 0,

  -- 詳細情報
  product_ids UUID[],
  settings JSONB,

  -- エラー情報
  error_message TEXT,
  error_details JSONB,

  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_status ON inventory_monitoring_logs(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_execution_type ON inventory_monitoring_logs(execution_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_created_at ON inventory_monitoring_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_scheduled_at ON inventory_monitoring_logs(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- コメント追加
COMMENT ON TABLE inventory_monitoring_logs IS '在庫監視の実行ログ';
COMMENT ON COLUMN inventory_monitoring_logs.execution_type IS '実行タイプ: scheduled（自動）/ manual（手動）';
COMMENT ON COLUMN inventory_monitoring_logs.status IS 'ステータス: pending/running/completed/failed/cancelled';
COMMENT ON COLUMN inventory_monitoring_logs.settings IS '実行時の設定（待機時間、バッチサイズなど）';


-- ==========================================
-- 4. inventory_changes テーブル作成
-- ==========================================

CREATE TABLE IF NOT EXISTS inventory_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  log_id UUID REFERENCES inventory_monitoring_logs(id) ON DELETE SET NULL,

  -- 変動タイプ
  change_type TEXT NOT NULL CHECK (change_type IN ('price', 'stock', 'page_deleted', 'page_changed', 'page_error')),

  -- 変動前後の値
  old_value TEXT,
  new_value TEXT,
  old_price_jpy NUMERIC(10,2),
  new_price_jpy NUMERIC(10,2),
  old_stock INTEGER,
  new_stock INTEGER,

  -- 再計算された値（価格変動時）
  recalculated_data JSONB,
  recalculated_profit_margin NUMERIC(5,2),
  recalculated_ebay_price_usd NUMERIC(10,2),
  recalculated_shipping_cost NUMERIC(10,2),

  -- ステータス管理
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'applied', 'ignored', 'error')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,

  -- マーケットプレイス更新状況
  applied_to_marketplace BOOLEAN DEFAULT false,
  marketplace_update_status JSONB,
  ebay_update_attempted_at TIMESTAMP WITH TIME ZONE,
  ebay_update_success BOOLEAN,
  ebay_update_error TEXT,

  -- メタデータ
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_inventory_changes_product_id ON inventory_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_log_id ON inventory_changes(log_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_status ON inventory_changes(status);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_change_type ON inventory_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_detected_at ON inventory_changes(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_pending ON inventory_changes(status) WHERE status = 'pending';

-- コメント追加
COMMENT ON TABLE inventory_changes IS '在庫・価格変動の履歴';
COMMENT ON COLUMN inventory_changes.change_type IS '変動タイプ: price/stock/page_deleted/page_changed/page_error';
COMMENT ON COLUMN inventory_changes.status IS 'ステータス: pending（未対応）/reviewed（確認済み）/applied（適用済み）/ignored（無視）/error';
COMMENT ON COLUMN inventory_changes.recalculated_data IS '再計算された全データ（JSON形式）';
COMMENT ON COLUMN inventory_changes.marketplace_update_status IS 'マーケットプレイス別の更新状況 {ebay: "success", yahoo: "pending"}';


-- ==========================================
-- 5. monitoring_schedules テーブル作成
-- ==========================================

CREATE TABLE IF NOT EXISTS monitoring_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- スケジュール設定
  enabled BOOLEAN DEFAULT true,
  name TEXT DEFAULT 'デフォルトスケジュール',
  frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('hourly', 'daily', 'custom')),
  time_window_start TIME DEFAULT '01:00:00',
  time_window_end TIME DEFAULT '06:00:00',

  -- バッチ設定
  max_items_per_batch INTEGER DEFAULT 50,
  delay_min_seconds INTEGER DEFAULT 30,
  delay_max_seconds INTEGER DEFAULT 120,

  -- ロボット検知回避設定
  random_time_offset_minutes INTEGER DEFAULT 60,
  use_random_user_agent BOOLEAN DEFAULT true,

  -- 通知設定
  email_notification BOOLEAN DEFAULT true,
  notification_emails TEXT[],
  notify_on_changes_only BOOLEAN DEFAULT true,
  notify_on_errors BOOLEAN DEFAULT true,

  -- 実行制御
  next_execution_at TIMESTAMP WITH TIME ZONE,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  last_execution_log_id UUID REFERENCES inventory_monitoring_logs(id),

  -- エラー制御
  max_consecutive_errors INTEGER DEFAULT 5,
  pause_on_error_threshold BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_enabled ON monitoring_schedules(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_monitoring_schedules_next_execution ON monitoring_schedules(next_execution_at) WHERE enabled = true;

-- デフォルトスケジュールを挿入
INSERT INTO monitoring_schedules (name, enabled, frequency, notification_emails)
VALUES ('デフォルト在庫監視スケジュール', true, 'daily', ARRAY[]::TEXT[])
ON CONFLICT DO NOTHING;

-- コメント追加
COMMENT ON TABLE monitoring_schedules IS '在庫監視のスケジュール設定';
COMMENT ON COLUMN monitoring_schedules.frequency IS '実行頻度: hourly/daily/custom';
COMMENT ON COLUMN monitoring_schedules.random_time_offset_minutes IS '開始時刻のランダムオフセット（±分）';


-- ==========================================
-- 6. monitoring_errors テーブル作成（詳細エラーログ）
-- ==========================================

CREATE TABLE IF NOT EXISTS monitoring_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES inventory_monitoring_logs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,

  source_url TEXT,
  http_status_code INTEGER,
  retry_count INTEGER DEFAULT 0,

  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_monitoring_errors_log_id ON monitoring_errors(log_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_errors_product_id ON monitoring_errors(product_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_errors_error_type ON monitoring_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_errors_occurred_at ON monitoring_errors(occurred_at DESC);

-- コメント追加
COMMENT ON TABLE monitoring_errors IS '在庫監視のエラー詳細ログ';


-- ==========================================
-- 7. トリガー作成（自動更新）
-- ==========================================

-- inventory_changes の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_inventory_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_changes_updated_at
  BEFORE UPDATE ON inventory_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_changes_updated_at();

-- inventory_monitoring_logs の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_monitoring_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_monitoring_logs_updated_at
  BEFORE UPDATE ON inventory_monitoring_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_logs_updated_at();

-- monitoring_schedules の updated_at 自動更新
CREATE OR REPLACE FUNCTION update_monitoring_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_monitoring_schedules_updated_at
  BEFORE UPDATE ON monitoring_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_schedules_updated_at();


-- ==========================================
-- 8. RLS（Row Level Security）設定
-- ==========================================

-- inventory_monitoring_logs
ALTER TABLE inventory_monitoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON inventory_monitoring_logs
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable insert access for authenticated users" ON inventory_monitoring_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable update access for authenticated users" ON inventory_monitoring_logs
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- inventory_changes
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON inventory_changes
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable insert access for authenticated users" ON inventory_changes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable update access for authenticated users" ON inventory_changes
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- monitoring_schedules
ALTER TABLE monitoring_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON monitoring_schedules
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable update access for authenticated users" ON monitoring_schedules
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- monitoring_errors
ALTER TABLE monitoring_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON monitoring_errors
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Enable insert access for authenticated users" ON monitoring_errors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');


-- ==========================================
-- 9. 承認時に自動的に監視対象に追加するトリガー
-- ==========================================

-- products テーブル用
CREATE OR REPLACE FUNCTION auto_enable_monitoring_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- approval_status が approved に変更された場合
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    -- source_url があれば監視を有効化
    IF NEW.source_url IS NOT NULL AND NEW.source_url != '' THEN
      NEW.monitoring_enabled = true;
      NEW.monitoring_started_at = NOW();
      NEW.monitoring_status = 'active';
      NEW.previous_price_jpy = NEW.acquired_price_jpy;
      NEW.previous_stock = NEW.current_stock;
    END IF;
  END IF;

  -- approval_status が rejected に変更された場合は監視を停止
  IF NEW.approval_status = 'rejected' AND OLD.approval_status = 'approved' THEN
    NEW.monitoring_enabled = false;
    NEW.monitoring_status = 'stopped';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_enable_monitoring
  BEFORE UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION auto_enable_monitoring_on_approval();

-- yahoo_scraped_products テーブル用
CREATE OR REPLACE FUNCTION auto_enable_monitoring_on_approval_yahoo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS NULL OR OLD.approval_status != 'approved') THEN
    NEW.monitoring_enabled = true;
    NEW.monitoring_started_at = NOW();
    NEW.previous_price_jpy = NEW.price_jpy;
    NEW.previous_stock = NEW.current_stock;
  END IF;

  IF NEW.approval_status = 'rejected' AND OLD.approval_status = 'approved' THEN
    NEW.monitoring_enabled = false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_enable_monitoring_yahoo
  BEFORE UPDATE ON yahoo_scraped_products
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION auto_enable_monitoring_on_approval_yahoo();


-- ==========================================
-- マイグレーション完了
-- ==========================================
