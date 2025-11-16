-- 競合分析データテーブル
-- ルール10: 競合信頼度プレミアム用

CREATE TABLE IF NOT EXISTS competitor_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER REFERENCES products_master(id) ON DELETE CASCADE,
  competitor_listing_id TEXT NOT NULL,
  competitor_seller TEXT,
  competitor_price_usd NUMERIC(10,2),
  
  -- セラー評価データ
  seller_feedback_score INTEGER DEFAULT 0,
  seller_positive_percent NUMERIC(5,2) DEFAULT 0,
  
  -- 信頼度計算結果
  trust_score INTEGER DEFAULT 0,
  trust_premium_percent NUMERIC(5,2) DEFAULT 0,
  adjusted_price_usd NUMERIC(10,2),
  
  -- メタデータ
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- インデックス
  CONSTRAINT unique_competitor_per_product UNIQUE(product_id, competitor_listing_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_analysis_product 
ON competitor_analysis(product_id);

CREATE INDEX IF NOT EXISTS idx_competitor_analysis_created 
ON competitor_analysis(created_at DESC);

-- global_pricing_strategy にフラグ追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'global_pricing_strategy' 
    AND column_name = 'competitor_trust_enabled'
  ) THEN
    ALTER TABLE global_pricing_strategy 
    ADD COLUMN competitor_trust_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

COMMENT ON TABLE competitor_analysis IS 'ルール10: 競合信頼度プレミアム - セラー評価に基づく価格調整データ';
COMMENT ON COLUMN competitor_analysis.trust_score IS '信頼度スコア (0-100)';
COMMENT ON COLUMN competitor_analysis.trust_premium_percent IS '価格プレミアム率 (0-10%)';
COMMENT ON COLUMN competitor_analysis.adjusted_price_usd IS '信頼度調整後の価格';
