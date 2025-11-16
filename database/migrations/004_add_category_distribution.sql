-- カテゴリ分散設定テーブルの作成
CREATE TABLE IF NOT EXISTS category_distribution_settings (
  id SERIAL PRIMARY KEY,
  lookback_days INTEGER DEFAULT 7 NOT NULL,
  min_categories_per_day INTEGER DEFAULT 1 NOT NULL,
  category_priority VARCHAR(50) DEFAULT 'balanced' NOT NULL,
  enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- デフォルト設定を挿入
INSERT INTO category_distribution_settings (lookback_days, min_categories_per_day, category_priority, enabled)
VALUES (7, 1, 'balanced', true)
ON CONFLICT DO NOTHING;

-- listing_schedulesテーブルにcategory_id列を追加（存在しない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'listing_schedules' 
    AND column_name = 'category_id'
  ) THEN
    ALTER TABLE listing_schedules 
    ADD COLUMN category_id VARCHAR(50);
  END IF;
END $$;

-- Cron実行ログテーブルの作成
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id SERIAL PRIMARY KEY,
  execution_time TIMESTAMP NOT NULL,
  schedules_processed INTEGER DEFAULT 0,
  products_listed INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_cron_logs_execution_time ON cron_execution_logs(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_listing_schedules_category ON listing_schedules(category_id);
CREATE INDEX IF NOT EXISTS idx_listing_schedules_scheduled_time ON listing_schedules(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_listing_schedules_status ON listing_schedules(status);

-- コメント追加
COMMENT ON TABLE category_distribution_settings IS 'カテゴリ分散設定 - SEO最適化のため';
COMMENT ON TABLE cron_execution_logs IS 'Cron自動実行ログ';
COMMENT ON COLUMN listing_schedules.category_id IS 'セッションの主要カテゴリID';
