-- ================================================================
-- AI仕入れ先特定機能用のDB拡張
-- ================================================================

-- 1. 仕入れ先候補テーブルの作成
CREATE TABLE IF NOT EXISTS supplier_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,

  -- 仕入れ先情報
  supplier_url TEXT NOT NULL,
  supplier_platform TEXT NOT NULL, -- 'amazon_jp', 'rakuten', 'yahoo_shopping', etc.
  supplier_name TEXT,

  -- 価格情報
  candidate_price_jpy NUMERIC(10, 2) NOT NULL, -- 本体価格（税抜）
  estimated_domestic_shipping_jpy NUMERIC(10, 2) DEFAULT 0, -- 推定国内送料
  total_cost_jpy NUMERIC(10, 2) GENERATED ALWAYS AS (candidate_price_jpy + estimated_domestic_shipping_jpy) STORED,

  -- 信頼度情報
  confidence_score NUMERIC(5, 4) DEFAULT 0.5, -- 0.0 ~ 1.0 (AIの特定信頼度)
  matching_method TEXT, -- 'title_match', 'image_search', 'database_match'
  similarity_score NUMERIC(5, 4), -- タイトル/画像の類似度スコア

  -- 在庫・可用性
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INTEGER,
  stock_checked_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by_human BOOLEAN DEFAULT false,
  verification_notes TEXT,

  -- 検索に使用したデータ
  search_keywords TEXT[],
  image_search_used BOOLEAN DEFAULT false,

  CONSTRAINT unique_supplier_per_product UNIQUE(product_id, supplier_url)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_product_id ON supplier_candidates(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_confidence ON supplier_candidates(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_price ON supplier_candidates(candidate_price_jpy ASC);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_created_at ON supplier_candidates(created_at DESC);

-- 2. products_master テーブルへの拡張
ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS research_status TEXT DEFAULT 'NEW'
    CHECK (research_status IN ('NEW', 'SCORED', 'AI_QUEUED', 'AI_COMPLETED', 'VERIFIED')),
  ADD COLUMN IF NOT EXISTS last_research_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_cost_status BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS provisional_ui_score NUMERIC(10, 2), -- 暫定Uiスコア（仕入れ先未定時）
  ADD COLUMN IF NOT EXISTS final_ui_score NUMERIC(10, 2), -- 最終Uiスコア（仕入れ先確定後）
  ADD COLUMN IF NOT EXISTS best_supplier_id UUID REFERENCES supplier_candidates(id),
  ADD COLUMN IF NOT EXISTS supplier_search_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_search_last_error TEXT;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_products_research_status ON products_master(research_status);
CREATE INDEX IF NOT EXISTS idx_products_ai_cost_status ON products_master(ai_cost_status);
CREATE INDEX IF NOT EXISTS idx_products_provisional_ui_score ON products_master(provisional_ui_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_products_final_ui_score ON products_master(final_ui_score DESC NULLS LAST);

-- 3. リサーチキューテーブル（オプション：非同期処理管理用）
CREATE TABLE IF NOT EXISTS ai_research_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,

  -- キュー状態
  status TEXT DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  priority INTEGER DEFAULT 0, -- 高優先度: 大きい値

  -- 処理情報
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- 結果情報
  suppliers_found INTEGER DEFAULT 0,
  best_price_jpy NUMERIC(10, 2),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- メタデータ
  requested_by TEXT, -- ユーザーID
  processing_node TEXT, -- 処理サーバー識別子

  CONSTRAINT unique_active_queue UNIQUE(product_id, status)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON ai_research_queue(status, priority DESC, queued_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_queue_product_id ON ai_research_queue(product_id);

-- 4. トリガー：updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_candidates_updated_at
  BEFORE UPDATE ON supplier_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. ビュー：リサーチ結果管理用
CREATE OR REPLACE VIEW research_management_view AS
SELECT
  pm.id,
  pm.title,
  pm.english_title,
  pm.research_status,
  pm.ai_cost_status,
  pm.provisional_ui_score,
  pm.final_ui_score,
  pm.listing_score as legacy_score,

  -- eBayリサーチデータ
  pm.sm_sales_count,
  pm.sm_competitor_count,
  pm.sm_lowest_price,
  pm.sm_profit_margin,

  -- 仕入れ先情報（最安値）
  sc.candidate_price_jpy as best_supplier_price,
  sc.supplier_url as best_supplier_url,
  sc.supplier_platform as best_supplier_platform,
  sc.confidence_score as supplier_confidence,

  -- タイムスタンプ
  pm.last_research_date,
  sc.created_at as supplier_found_at,

  -- キュー状態
  arq.status as queue_status,
  arq.priority as queue_priority

FROM products_master pm
LEFT JOIN supplier_candidates sc ON pm.best_supplier_id = sc.id
LEFT JOIN ai_research_queue arq ON pm.id = arq.product_id AND arq.status IN ('QUEUED', 'PROCESSING')
WHERE pm.research_status IS NOT NULL
ORDER BY pm.provisional_ui_score DESC NULLS LAST;

-- 6. コメント追加
COMMENT ON TABLE supplier_candidates IS 'AI特定の仕入れ先候補データ';
COMMENT ON TABLE ai_research_queue IS 'AI仕入れ先探索の非同期処理キュー';
COMMENT ON COLUMN products_master.research_status IS 'リサーチ処理状態: NEW, SCORED, AI_QUEUED, AI_COMPLETED, VERIFIED';
COMMENT ON COLUMN products_master.provisional_ui_score IS '暫定Uiスコア（仕入れ先価格未確定時）';
COMMENT ON COLUMN products_master.final_ui_score IS '最終Uiスコア（AI特定価格を使用）';
