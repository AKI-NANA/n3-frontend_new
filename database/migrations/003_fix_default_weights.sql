-- ============================================
-- スコア設定の重み合計を100点に修正
-- ============================================

-- デフォルト設定を100点に修正
UPDATE score_settings
SET 
  weight_profit = 40,
  weight_competition = 25,
  weight_future = 15,
  weight_trend = 5,
  weight_scarcity = 5,
  weight_reliability = 10,
  description = '🌟 バランス型デフォルト設定 v3（おすすめ）',
  updated_at = NOW()
WHERE name = 'default';

-- 確認メッセージ
DO $$ 
DECLARE
  total_weight NUMERIC;
BEGIN 
  SELECT 
    weight_profit + weight_competition + weight_future + weight_trend + weight_scarcity + weight_reliability
  INTO total_weight
  FROM score_settings 
  WHERE name = 'default';
  
  RAISE NOTICE '✅ デフォルト設定の重み合計: %点', total_weight;
  RAISE NOTICE '📊 配分: 利益=%点, 競合=%点, 将来性=%点, 鮮度=%点, 希少性=%点, 実績=%点', 
    (SELECT weight_profit FROM score_settings WHERE name = 'default'),
    (SELECT weight_competition FROM score_settings WHERE name = 'default'),
    (SELECT weight_future FROM score_settings WHERE name = 'default'),
    (SELECT weight_trend FROM score_settings WHERE name = 'default'),
    (SELECT weight_scarcity FROM score_settings WHERE name = 'default'),
    (SELECT weight_reliability FROM score_settings WHERE name = 'default');
END $$;
