-- Migration: Add Dynamic Pricing fields to products_master table
-- Task D-1: products_master テーブルに Performance_Score と Strategy_ID フィールドを追加

-- パフォーマンススコアの型を作成（A-Eランク）
DO $$ BEGIN
  CREATE TYPE performance_score_enum AS ENUM ('A', 'B', 'C', 'D', 'E');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- products_master テーブルにフィールドを追加
ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS performance_score performance_score_enum,
  ADD COLUMN IF NOT EXISTS performance_score_value INTEGER CHECK (performance_score_value >= 0 AND performance_score_value <= 100),
  ADD COLUMN IF NOT EXISTS strategy_id UUID,
  ADD COLUMN IF NOT EXISTS custom_strategy_config JSONB,
  ADD COLUMN IF NOT EXISTS score_calculated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS price_last_adjusted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS active_supplier_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS watcher_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_listed INTEGER DEFAULT 0;

-- インデックスを作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_products_master_performance_score
  ON products_master(performance_score);

CREATE INDEX IF NOT EXISTS idx_products_master_strategy_id
  ON products_master(strategy_id);

CREATE INDEX IF NOT EXISTS idx_products_master_score_calculated_at
  ON products_master(score_calculated_at);

-- コメントを追加（ドキュメント化）
COMMENT ON COLUMN products_master.performance_score IS 'パフォーマンススコア（A-Eランク）- ルール15';
COMMENT ON COLUMN products_master.performance_score_value IS '数値スコア（0-100）';
COMMENT ON COLUMN products_master.strategy_id IS '適用されている価格戦略のID（FK to pricing_strategy_master）';
COMMENT ON COLUMN products_master.custom_strategy_config IS '個別商品の価格戦略設定（JSONB）';
COMMENT ON COLUMN products_master.score_calculated_at IS 'スコアが計算された日時';
COMMENT ON COLUMN products_master.price_last_adjusted_at IS '価格が最後に調整された日時';
COMMENT ON COLUMN products_master.active_supplier_id IS '現在アクティブな仕入れ先ID（ルール9）';
COMMENT ON COLUMN products_master.watcher_count IS 'eBayウォッチャー数（ルール11）';
COMMENT ON COLUMN products_master.view_count IS 'ビュー数（ルール15）';
COMMENT ON COLUMN products_master.sold_count IS '販売数（ルール5, 15）';
COMMENT ON COLUMN products_master.days_listed IS '出品日数（ルール13, 15）';
