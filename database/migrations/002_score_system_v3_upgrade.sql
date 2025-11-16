-- ============================================
-- スコア管理システム v3 データベース更新
-- 将来性スコア (F) と日本人セラー競合 (C2) 対応
-- ============================================

-- 1. score_settings テーブルに新しいカラムを追加
ALTER TABLE score_settings 
ADD COLUMN IF NOT EXISTS weight_future NUMERIC DEFAULT 15;

ALTER TABLE score_settings 
ADD COLUMN IF NOT EXISTS score_jp_seller_penalty NUMERIC DEFAULT -70;

ALTER TABLE score_settings 
ADD COLUMN IF NOT EXISTS score_future_release_boost NUMERIC DEFAULT 200;

ALTER TABLE score_settings 
ADD COLUMN IF NOT EXISTS score_future_premium_boost NUMERIC DEFAULT 150;

-- 2. products_master テーブルに将来性スコア用カラムを追加
ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS sm_jp_sellers INTEGER;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS release_date DATE;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS msrp_jpy NUMERIC;

ALTER TABLE products_master
ADD COLUMN IF NOT EXISTS discontinued_at DATE;

-- 3. 既存のデフォルト設定を更新（重み配分を調整）
UPDATE score_settings
SET 
  weight_profit = 40,
  weight_competition = 25,  -- 30 → 25 に減少
  weight_future = 15,       -- 新規追加
  weight_trend = 5,         -- 10 → 5 に減少
  weight_scarcity = 5,      -- 10 → 5 に減少
  weight_reliability = 10,
  score_jp_seller_penalty = -70,
  score_future_release_boost = 200,
  score_future_premium_boost = 150,
  description = 'バランス型デフォルト設定 v3 - 将来性スコア対応',
  updated_at = NOW()
WHERE name = 'default';

-- 4. プリセット設定を更新
UPDATE score_settings
SET 
  weight_future = 10,
  score_jp_seller_penalty = -70,
  score_future_release_boost = 200,
  score_future_premium_boost = 150,
  updated_at = NOW()
WHERE name = 'profit_focus';

UPDATE score_settings
SET 
  weight_future = 10,
  score_jp_seller_penalty = -70,
  score_future_release_boost = 200,
  score_future_premium_boost = 150,
  updated_at = NOW()
WHERE name = 'low_competition';

-- 5. 新しいプリセット: 将来性重視型
INSERT INTO score_settings (
  name, 
  description,
  weight_profit,
  weight_competition,
  weight_future,
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
  score_jp_seller_penalty,
  score_discontinued_bonus,
  score_trend_boost,
  score_success_rate_bonus,
  score_future_release_boost,
  score_future_premium_boost,
  is_active
) 
VALUES (
  'future_focus', 
  '将来性重視型 - 新商品・レア商品・高騰期待商品優先',
  30,  -- 利益
  20,  -- 競合
  30,  -- 将来性に30点配分！
  5,   -- データ鮮度
  5,   -- 希少性
  10,  -- 実績
  1.0,
  1000,
  0.1,
  500,
  0.5,
  100,
  -50,
  -70,
  100,
  50,
  10,
  200,
  150,
  false
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  weight_future = EXCLUDED.weight_future,
  score_jp_seller_penalty = EXCLUDED.score_jp_seller_penalty,
  score_future_release_boost = EXCLUDED.score_future_release_boost,
  score_future_premium_boost = EXCLUDED.score_future_premium_boost,
  updated_at = NOW();

-- 6. インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_release_date 
ON products_master(release_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_products_discontinued_at 
ON products_master(discontinued_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_products_sm_jp_sellers 
ON products_master(sm_jp_sellers);

-- 完了メッセージ
DO $$ 
BEGIN 
  RAISE NOTICE '✅ スコア管理システム v3 アップグレード完了';
  RAISE NOTICE '📊 新機能: 将来性スコア (F) 追加';
  RAISE NOTICE '👥 新機能: 日本人セラー競合スコア (C2) 追加';
  RAISE NOTICE '🎯 新プリセット: 将来性重視型 追加';
  RAISE NOTICE '';
  RAISE NOTICE '📋 重み配分（デフォルト設定）:';
  RAISE NOTICE '  利益: 40点';
  RAISE NOTICE '  競合: 25点';
  RAISE NOTICE '  将来性: 15点 ⭐NEW';
  RAISE NOTICE '  鮮度: 5点';
  RAISE NOTICE '  希少性: 5点';
  RAISE NOTICE '  実績: 10点';
END $$;
