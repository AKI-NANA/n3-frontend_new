-- =========================================
-- eBay出品完全対応スキーマ（修正版）
-- カテゴリ別必須項目 + ポリシー管理
-- =========================================

-- ==========================================
-- 1. eBayカテゴリメタデータテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS ebay_category_metadata (
  id BIGSERIAL PRIMARY KEY,
  category_id TEXT UNIQUE NOT NULL,
  category_name TEXT NOT NULL,
  category_path TEXT,
  parent_category_id TEXT,
  level INTEGER,
  
  required_aspects JSONB DEFAULT '[]'::jsonb,
  recommended_aspects JSONB DEFAULT '[]'::jsonb,
  aspect_values JSONB DEFAULT '{}'::jsonb,
  competitor_aspects JSONB DEFAULT '{}'::jsonb,
  
  allows_variations BOOLEAN DEFAULT false,
  requires_upc BOOLEAN DEFAULT false,
  requires_ean BOOLEAN DEFAULT false,
  requires_isbn BOOLEAN DEFAULT false,
  
  fvf_percentage NUMERIC(5,2),
  insertion_fee NUMERIC(10,2),
  
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. SellerMirror分析結果テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS sellermirror_analysis (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id TEXT,
  
  competitor_count INTEGER,
  avg_price_usd NUMERIC(10,2),
  min_price_usd NUMERIC(10,2),
  max_price_usd NUMERIC(10,2),
  
  common_aspects JSONB DEFAULT '{}'::jsonb,
  
  recommended_price_usd NUMERIC(10,2),
  profit_margin_estimate NUMERIC(5,2),
  
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- インデックス作成
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_category_metadata_category_id ON ebay_category_metadata(category_id);
CREATE INDEX IF NOT EXISTS idx_category_metadata_parent ON ebay_category_metadata(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_sellermirror_product ON sellermirror_analysis(product_id);
CREATE INDEX IF NOT EXISTS idx_sellermirror_category ON sellermirror_analysis(category_id);

-- GINインデックス（JSONB検索用）
CREATE INDEX IF NOT EXISTS idx_category_metadata_required_gin ON ebay_category_metadata USING GIN(required_aspects);
CREATE INDEX IF NOT EXISTS idx_category_metadata_aspect_values_gin ON ebay_category_metadata USING GIN(aspect_values);

-- ==========================================
-- サンプルデータ投入
-- ==========================================

-- 1. カテゴリメタデータサンプル
INSERT INTO ebay_category_metadata (
  category_id, category_name, category_path,
  required_aspects, recommended_aspects, aspect_values
) VALUES 
(
  '183454',
  'Trading Card Games',
  'Collectibles > Trading Cards > Trading Card Games',
  '[
    {"name": "Game", "required": true, "type": "selection"},
    {"name": "Card Condition", "required": true, "type": "selection"},
    {"name": "Language", "required": true, "type": "selection"}
  ]'::jsonb,
  '[
    {"name": "Grading", "type": "selection"},
    {"name": "Rarity", "type": "text"}
  ]'::jsonb,
  '{
    "Game": ["Pokémon TCG", "Yu-Gi-Oh!", "Magic: The Gathering"],
    "Card Condition": ["Near Mint or Better", "Lightly Played", "Moderately Played", "Heavily Played"],
    "Language": ["Japanese", "English", "French", "German"]
  }'::jsonb
)
ON CONFLICT (category_id) DO NOTHING;

-- ==========================================
-- コメント
-- ==========================================
COMMENT ON TABLE ebay_category_metadata IS 'eBayカテゴリ別の必須・推奨Item Specifics';
COMMENT ON TABLE sellermirror_analysis IS 'SellerMirror競合分析結果';

-- 完了メッセージ
SELECT 
  '✅ eBay出品完全対応スキーマ作成完了！' as status,
  '📊 カテゴリ別必須項目管理テーブル作成' as feature1,
  '🔍 SellerMirror分析結果テーブル作成' as feature2;
