-- 仕入れ先候補テーブルの作成
-- AI解析で特定された仕入れ先候補を保存

CREATE TABLE IF NOT EXISTS supplier_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 紐付け情報
  product_id UUID REFERENCES products_master(id) ON DELETE CASCADE,
  ebay_item_id TEXT, -- research_resultsとの紐付け用
  sku TEXT, -- products_masterとの紐付け用（検索高速化）

  -- 商品情報
  product_name TEXT NOT NULL,
  product_model TEXT, -- 型番

  -- 仕入れ先情報
  candidate_price_jpy NUMERIC(10, 2) NOT NULL, -- 候補価格（仮原価）本体価格
  estimated_domestic_shipping_jpy NUMERIC(10, 2) DEFAULT 0, -- 推定国内送料
  total_cost_jpy NUMERIC(10, 2) GENERATED ALWAYS AS (candidate_price_jpy + COALESCE(estimated_domestic_shipping_jpy, 0)) STORED, -- 総仕入れコスト

  supplier_url TEXT NOT NULL, -- 仕入れ先URL
  supplier_name TEXT, -- 仕入れ先名（例: Amazon, 楽天）
  supplier_type TEXT CHECK (supplier_type IN ('amazon_jp', 'rakuten', 'yahoo_shopping', 'mercari', 'other')),

  -- AI解析情報
  confidence_score NUMERIC(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 特定信頼度（0.0-1.0）
  search_method TEXT CHECK (search_method IN ('product_name', 'model_number', 'image_search', 'database_match')), -- 探索方法
  ai_model_used TEXT, -- 使用したAIモデル（例: claude-3.5-sonnet）

  -- 在庫・価格情報
  stock_status TEXT CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')) DEFAULT 'unknown',
  price_checked_at TIMESTAMPTZ DEFAULT NOW(), -- 価格確認日時

  -- メタデータ
  notes JSONB, -- その他の情報（商品説明、配送情報など）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- インデックス用
  is_primary_candidate BOOLEAN DEFAULT FALSE -- 主要候補フラグ
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_product_id ON supplier_candidates(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_ebay_item_id ON supplier_candidates(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_sku ON supplier_candidates(sku);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_confidence ON supplier_candidates(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_candidates_price ON supplier_candidates(candidate_price_jpy);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_supplier_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_supplier_candidates_updated_at
  BEFORE UPDATE ON supplier_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_candidates_updated_at();

-- コメント追加
COMMENT ON TABLE supplier_candidates IS 'AI解析で特定された仕入れ先候補を保存するテーブル';
COMMENT ON COLUMN supplier_candidates.confidence_score IS '特定信頼度スコア（0.0-1.0）。AIが特定した価格の信頼度';
COMMENT ON COLUMN supplier_candidates.total_cost_jpy IS '総仕入れコスト = 候補価格 + 推定国内送料（自動計算）';
