-- ============================================
-- スコア管理システム データベーススキーマ
-- ============================================

-- 1. score_settings テーブル作成
CREATE TABLE IF NOT EXISTS score_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  
  -- 重み設定 (Wk)
  weight_profit         NUMERIC DEFAULT 40,   -- P カテゴリ
  weight_competition    NUMERIC DEFAULT 30,   -- C カテゴリ
  weight_trend          NUMERIC DEFAULT 10,   -- T カテゴリ
  weight_scarcity       NUMERIC DEFAULT 10,   -- S カテゴリ
  weight_reliability    NUMERIC DEFAULT 10,   -- R カテゴリ
  
  -- 利益乗数設定 (M_Profit)
  profit_multiplier_base       NUMERIC DEFAULT 1.0,
  profit_multiplier_threshold  NUMERIC DEFAULT 1000,  -- 基準利益額(円)
  profit_multiplier_increment  NUMERIC DEFAULT 0.1,   -- 増加率
  
  -- ペナルティ設定 (M_Penalty)
  penalty_low_profit_threshold NUMERIC DEFAULT 500,   -- 低利益基準(円)
  penalty_multiplier           NUMERIC DEFAULT 0.5,   -- ペナルティ倍率
  
  -- 基本点設定 (Sk の基準値)
  score_profit_per_1000_jpy    NUMERIC DEFAULT 100,   -- 1000円あたりの加点
  score_competitor_penalty     NUMERIC DEFAULT -50,   -- 競合1件あたりの減点
  score_discontinued_bonus     NUMERIC DEFAULT 100,   -- 廃盤品ボーナス
  score_trend_boost            NUMERIC DEFAULT 50,    -- トレンドブースト
  score_success_rate_bonus     NUMERIC DEFAULT 10,    -- 成功率ボーナス
  
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- デフォルト設定を挿入
INSERT INTO score_settings (name, description) 
VALUES ('default', 'デフォルトスコア設定')
ON CONFLICT (name) DO NOTHING;

-- 2. products_master テーブルに score_details カラムを追加
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS score_details JSONB;

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_listing_score 
ON products_master(listing_score DESC);

CREATE INDEX IF NOT EXISTS idx_products_score_calculated 
ON products_master(score_calculated_at DESC);

-- 4. updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_score_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS score_settings_updated_at ON score_settings;
CREATE TRIGGER score_settings_updated_at
BEFORE UPDATE ON score_settings
FOR EACH ROW
EXECUTE FUNCTION update_score_settings_timestamp();

-- 完了メッセージ
DO $$ 
BEGIN 
  RAISE NOTICE 'スコア管理システムのデータベーススキーマ作成完了';
END $$;
