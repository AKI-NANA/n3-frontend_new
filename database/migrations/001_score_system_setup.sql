-- ============================================
-- スコア管理システム v2 データベース初期化
-- ============================================

-- UUID拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. score_settings テーブル作成
CREATE TABLE IF NOT EXISTS score_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  
  -- 重み設定 (Wk) - 合計100点
  weight_profit         NUMERIC DEFAULT 40,   -- P: 利益額の重み
  weight_competition    NUMERIC DEFAULT 30,   -- C: 競合の少なさの重み
  weight_trend          NUMERIC DEFAULT 10,   -- T: 分析データ鮮度の重み
  weight_scarcity       NUMERIC DEFAULT 10,   -- S: 希少性・廃盤品の重み
  weight_reliability    NUMERIC DEFAULT 10,   -- R: 実績スコアの重み
  
  -- 利益乗数設定 (M_Profit)
  profit_multiplier_base       NUMERIC DEFAULT 1.0,
  profit_multiplier_threshold  NUMERIC DEFAULT 1000,  -- 優遇開始ライン(円)
  profit_multiplier_increment  NUMERIC DEFAULT 0.1,   -- 優遇の強さ(増加率)
  
  -- ペナルティ設定 (M_Penalty)
  penalty_low_profit_threshold NUMERIC DEFAULT 500,   -- ペナルティ開始ライン(円)
  penalty_multiplier           NUMERIC DEFAULT 0.5,   -- 排除の厳しさ(ペナルティ倍率)
  
  -- 基本点設定 (Sk の基準値) - 上級者設定
  score_profit_per_1000_jpy    NUMERIC DEFAULT 100,   -- 利益1000円あたりの加点
  score_competitor_penalty     NUMERIC DEFAULT -50,   -- 競合1件あたりの減点
  score_discontinued_bonus     NUMERIC DEFAULT 100,   -- 廃盤品ボーナス
  score_trend_boost            NUMERIC DEFAULT 50,    -- トレンドブースト
  score_success_rate_bonus     NUMERIC DEFAULT 10,    -- 成功率ボーナス
  
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- デフォルト設定を挿入
INSERT INTO score_settings (
  name, 
  description,
  weight_profit,
  weight_competition,
  weight_trend,
  weight_scarcity,
  weight_reliability,
  profit_multiplier_base,
  profit_multiplier_threshold,
  profit_multiplier_increment,
  penalty_low_profit_threshold,
  penalty_multiplier,
  score_profit_per_1000_jpy,
  score_competitor_penalty,
  score_discontinued_bonus,
  score_trend_boost,
  score_success_rate_bonus,
  is_active
) 
VALUES (
  'default', 
  'バランス型デフォルト設定 - 初心者推奨',
  40,  -- 利益重視
  30,  -- 競合考慮
  10,  -- データ鮮度
  10,  -- 希少性
  10,  -- 実績スコア
  1.0, -- 乗数ベース
  1000, -- 1000円超でブースト開始
  0.1,  -- ブースト増加率
  500,  -- 500円未満でペナルティ
  0.5,  -- ペナルティ倍率(半減)
  100,  -- 基本点: 利益
  -50,  -- 基本点: 競合ペナルティ
  100,  -- 基本点: 廃盤ボーナス
  50,   -- 基本点: トレンド
  10,   -- 基本点: 実績
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  weight_profit = EXCLUDED.weight_profit,
  weight_competition = EXCLUDED.weight_competition,
  weight_trend = EXCLUDED.weight_trend,
  weight_scarcity = EXCLUDED.weight_scarcity,
  weight_reliability = EXCLUDED.weight_reliability,
  profit_multiplier_base = EXCLUDED.profit_multiplier_base,
  profit_multiplier_threshold = EXCLUDED.profit_multiplier_threshold,
  profit_multiplier_increment = EXCLUDED.profit_multiplier_increment,
  penalty_low_profit_threshold = EXCLUDED.penalty_low_profit_threshold,
  penalty_multiplier = EXCLUDED.penalty_multiplier,
  score_profit_per_1000_jpy = EXCLUDED.score_profit_per_1000_jpy,
  score_competitor_penalty = EXCLUDED.score_competitor_penalty,
  score_discontinued_bonus = EXCLUDED.score_discontinued_bonus,
  score_trend_boost = EXCLUDED.score_trend_boost,
  score_success_rate_bonus = EXCLUDED.score_success_rate_bonus,
  updated_at = NOW();

-- プリセット設定1: 利益最優先型
INSERT INTO score_settings (
  name, 
  description,
  weight_profit,
  weight_competition,
  weight_trend,
  weight_scarcity,
  weight_reliability,
  profit_multiplier_base,
  profit_multiplier_threshold,
  profit_multiplier_increment,
  penalty_low_profit_threshold,
  penalty_multiplier,
  score_profit_per_1000_jpy,
  score_competitor_penalty,
  score_discontinued_bonus,
  score_trend_boost,
  score_success_rate_bonus,
  is_active
) 
VALUES (
  'profit_focus', 
  '利益最優先型 - キャッシュフロー重視戦略',
  60,  -- 利益に60点配分
  20,  -- 競合は軽視
  5,   -- データ鮮度
  5,   -- 希少性
  10,  -- 実績スコア
  1.0,
  800,  -- 800円超でブースト(低めに設定)
  0.15, -- より強いブースト
  800,  -- 800円未満で厳格にペナルティ
  0.4,  -- より厳しいペナルティ
  100,
  -50,
  100,
  50,
  10,
  false
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  weight_profit = EXCLUDED.weight_profit,
  weight_competition = EXCLUDED.weight_competition,
  updated_at = NOW();

-- プリセット設定2: 低競合優先型
INSERT INTO score_settings (
  name, 
  description,
  weight_profit,
  weight_competition,
  weight_trend,
  weight_scarcity,
  weight_reliability,
  profit_multiplier_base,
  profit_multiplier_threshold,
  profit_multiplier_increment,
  penalty_low_profit_threshold,
  penalty_multiplier,
  score_profit_per_1000_jpy,
  score_competitor_penalty,
  score_discontinued_bonus,
  score_trend_boost,
  score_success_rate_bonus,
  is_active
) 
VALUES (
  'low_competition', 
  '低競合優先型 - 確実に売れる商品重視',
  30,  -- 利益は控えめ
  50,  -- 競合の少なさに50点配分
  5,
  5,
  10,
  1.0,
  1000,
  0.1,
  500,
  0.5,
  100,
  -50,
  100,
  50,
  10,
  false
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  weight_profit = EXCLUDED.weight_profit,
  weight_competition = EXCLUDED.weight_competition,
  updated_at = NOW();

-- 2. products_master テーブルにスコア関連カラムを追加
DO $$ 
BEGIN
  -- listing_score カラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'listing_score'
  ) THEN
    ALTER TABLE products_master ADD COLUMN listing_score NUMERIC;
  END IF;

  -- score_calculated_at カラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'score_calculated_at'
  ) THEN
    ALTER TABLE products_master ADD COLUMN score_calculated_at TIMESTAMP;
  END IF;

  -- score_details カラム (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products_master' AND column_name = 'score_details'
  ) THEN
    ALTER TABLE products_master ADD COLUMN score_details JSONB;
  END IF;
END $$;

-- 3. インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_listing_score 
ON products_master(listing_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_products_score_calculated 
ON products_master(score_calculated_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_score_settings_active 
ON score_settings(is_active) WHERE is_active = true;

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
  RAISE NOTICE '✅ スコア管理システム v2 のデータベースセットアップ完了';
  RAISE NOTICE '📊 デフォルト設定: 1件';
  RAISE NOTICE '🎯 プリセット設定: 2件（利益優先型、低競合優先型）';
END $$;
