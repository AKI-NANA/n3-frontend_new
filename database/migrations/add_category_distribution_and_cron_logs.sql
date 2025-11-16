-- データベース拡張: カテゴリ分散とCronログ

-- 1. listing_schedulesテーブルにカテゴリ分布カラムを追加
ALTER TABLE listing_schedules 
ADD COLUMN IF NOT EXISTS category_distribution JSONB,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Cron実行ログテーブルの作成
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

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_cron_logs_execution_time 
ON cron_execution_logs(execution_time DESC);

-- 3. カテゴリ分散設定テーブルの作成
CREATE TABLE IF NOT EXISTS category_distribution_settings (
  id SERIAL PRIMARY KEY,
  lookback_days INTEGER DEFAULT 7,
  min_categories_per_day INTEGER DEFAULT 1,
  category_balance_weight DECIMAL(3,2) DEFAULT 0.3,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- デフォルト設定を挿入
INSERT INTO category_distribution_settings (
  lookback_days, 
  min_categories_per_day, 
  category_balance_weight,
  enabled
) VALUES (7, 1, 0.3, true)
ON CONFLICT DO NOTHING;

-- 4. listing_historyテーブルにインデックス追加（カテゴリ統計用）
CREATE INDEX IF NOT EXISTS idx_listing_history_listed_at 
ON listing_history(listed_at DESC) 
WHERE status = 'success';

CREATE INDEX IF NOT EXISTS idx_listing_history_product_id 
ON listing_history(product_id);

-- 5. yahoo_scraped_productsのcategory_idカラム確認・追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS category_id VARCHAR(50);

-- ebay_api_dataからcategory_idを抽出してセット（既存データ用）
UPDATE yahoo_scraped_products 
SET category_id = (ebay_api_data->>'category_id')::VARCHAR
WHERE category_id IS NULL 
  AND ebay_api_data IS NOT NULL 
  AND ebay_api_data->>'category_id' IS NOT NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_category_id 
ON yahoo_scraped_products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_scheduled_date 
ON yahoo_scraped_products(scheduled_listing_date);

CREATE INDEX IF NOT EXISTS idx_products_session_id 
ON yahoo_scraped_products(listing_session_id);

-- 6. listing_schedulesのインデックス追加
CREATE INDEX IF NOT EXISTS idx_schedules_status_time 
ON listing_schedules(status, scheduled_time);

CREATE INDEX IF NOT EXISTS idx_schedules_date_status 
ON listing_schedules(date, status);

-- 7. コメント追加
COMMENT ON TABLE cron_execution_logs IS 'Cron自動実行の履歴ログ';
COMMENT ON TABLE category_distribution_settings IS 'カテゴリ分散の設定（SEO最適化）';
COMMENT ON COLUMN listing_schedules.category_distribution IS 'セッション内のカテゴリ分布（JSON）';
COMMENT ON COLUMN listing_schedules.error_message IS 'スケジュール実行時のエラーメッセージ';
