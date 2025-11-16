-- ====================================================================
-- 季節・時期変動管理テーブル（ルール3）
-- ====================================================================

CREATE TABLE IF NOT EXISTS seasonal_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  product_type TEXT,
  keywords TEXT[],
  adjustment_name TEXT NOT NULL,
  adjust_percent NUMERIC(5,2) NOT NULL,
  start_month INTEGER NOT NULL,
  start_day INTEGER,
  end_month INTEGER NOT NULL,
  end_day INTEGER,
  is_gradual BOOLEAN DEFAULT false,
  gradual_steps INTEGER DEFAULT 1,
  gradual_interval_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS temporary_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL,
  target_value TEXT NOT NULL,
  adjustment_name TEXT NOT NULL,
  adjust_percent NUMERIC(5,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  min_price_usd NUMERIC(10,2),
  max_price_usd NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  auto_expire BOOLEAN DEFAULT true,
  reason TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO seasonal_adjustments (category, adjustment_name, adjust_percent, start_month, end_month, is_active) VALUES
  ('Winter Apparel', '冬物値上げ', 20, 11, 2, true),
  ('Winter Apparel', '冬物値下げ', -15, 3, 5, true),
  ('Summer Sports', '夏物値上げ', 15, 6, 8, true),
  ('Summer Sports', '夏物値下げ', -10, 9, 11, true),
  ('Holiday Items', 'ホリデーシーズン値上げ', 25, 11, 12, true),
  ('Holiday Items', 'ホリデー後値下げ', -30, 1, 2, true)
ON CONFLICT DO NOTHING;
