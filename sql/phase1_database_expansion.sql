-- Phase 1: データモデル拡張

-- 1. 商品テーブルに追加カラム
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS target_marketplaces JSONB DEFAULT '[]';
-- 例: ["ebay_main", "yahoo_main", "mercari_sub1"]

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS scheduled_listing_date TIMESTAMP;
-- スケジュールされた出品日時

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS listing_session_id VARCHAR(50);
-- どのセッションで出品するか

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS listing_priority VARCHAR(20) DEFAULT 'medium';
-- 優先度: high, medium, low

-- 2. 出品スケジュールテーブル
CREATE TABLE IF NOT EXISTS listing_schedules (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  session_number INT NOT NULL,
  scheduled_time TIMESTAMP NOT NULL,
  actual_time TIMESTAMP,
  marketplace VARCHAR(50) NOT NULL,
  account VARCHAR(50) NOT NULL,
  planned_count INT NOT NULL,
  actual_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  avg_ai_score FLOAT,
  item_interval_min INT DEFAULT 20,
  item_interval_max INT DEFAULT 90,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, session_number, marketplace, account)
);

-- 3. 出品履歴テーブル
CREATE TABLE IF NOT EXISTS listing_history (
  id SERIAL PRIMARY KEY,
  product_id INT REFERENCES yahoo_scraped_products(id),
  schedule_id INT REFERENCES listing_schedules(id),
  marketplace VARCHAR(50),
  account VARCHAR(50),
  listed_at TIMESTAMP,
  listing_id VARCHAR(100),
  status VARCHAR(20),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. スケジュール設定テーブル
CREATE TABLE IF NOT EXISTS schedule_settings (
  id SERIAL PRIMARY KEY,
  setting_name VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- デフォルト設定を挿入
INSERT INTO schedule_settings (setting_name, settings) VALUES (
  'default',
  '{
    "limits": {
      "dailyMin": 10,
      "dailyMax": 50,
      "weeklyMin": 70,
      "weeklyMax": 200,
      "monthlyMax": 500
    },
    "randomization": {
      "weeklyPatternVariation": true,
      "dayCountVariation": {
        "enabled": true,
        "variance": 0.3
      },
      "sessionsPerDay": {
        "min": 2,
        "max": 6
      },
      "timeRandomization": {
        "enabled": true,
        "range": 30
      },
      "itemInterval": {
        "min": 20,
        "max": 120
      }
    },
    "marketplaceAccounts": [
      {
        "marketplace": "ebay",
        "account": "main",
        "weight": 50,
        "dailyLimit": 30
      },
      {
        "marketplace": "ebay",
        "account": "sub1",
        "weight": 20,
        "dailyLimit": 20
      },
      {
        "marketplace": "yahoo",
        "account": "main",
        "weight": 20,
        "dailyLimit": 50
      },
      {
        "marketplace": "mercari",
        "account": "main",
        "weight": 10,
        "dailyLimit": 20
      }
    ]
  }'::jsonb
) ON CONFLICT (setting_name) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_target_marketplaces ON yahoo_scraped_products USING GIN (target_marketplaces);
CREATE INDEX IF NOT EXISTS idx_scheduled_listing_date ON yahoo_scraped_products(scheduled_listing_date);
CREATE INDEX IF NOT EXISTS idx_listing_session_id ON yahoo_scraped_products(listing_session_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON listing_schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON listing_schedules(status);
CREATE INDEX IF NOT EXISTS idx_listing_history_product ON listing_history(product_id);
CREATE INDEX IF NOT EXISTS idx_listing_history_schedule ON listing_history(schedule_id);

-- 完了メッセージ
SELECT '✅ Phase 1: データベース拡張完了' as message;
