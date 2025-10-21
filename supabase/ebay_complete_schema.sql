-- =========================================
-- eBay出品完全対応スキーマ
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
  
  -- 必須Item Specifics
  required_aspects JSONB DEFAULT '[]'::jsonb,
  -- 例: [{"name": "Brand", "required": true}, {"name": "MPN", "required": false}]
  
  -- 推奨Item Specifics
  recommended_aspects JSONB DEFAULT '[]'::jsonb,
  
  -- Aspect値の選択肢（ドロップダウン用）
  aspect_values JSONB DEFAULT '{}'::jsonb,
  -- 例: {"Brand": ["Sony", "Nintendo", "Apple"], "Condition": ["New", "Used"]}
  
  -- SellerMirrorから取得した競合データ
  competitor_aspects JSONB DEFAULT '{}'::jsonb,
  -- 例: {"most_common": ["Brand", "Model", "Color"], "usage_rate": {"Brand": 0.95}}
  
  -- カテゴリ固有設定
  allows_variations BOOLEAN DEFAULT false,
  requires_upc BOOLEAN DEFAULT false,
  requires_ean BOOLEAN DEFAULT false,
  requires_isbn BOOLEAN DEFAULT false,
  
  -- 手数料情報
  fvf_percentage NUMERIC(5,2),
  insertion_fee NUMERIC(10,2),
  
  -- メタデータ
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. eBay配送ポリシーテーブル（既存の場合はスキップ）
-- ==========================================
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ebay_fulfillment_policies'
    ) THEN
        CREATE TABLE ebay_fulfillment_policies (
          id BIGSERIAL PRIMARY KEY,
          policy_name VARCHAR(255) NOT NULL,
          description TEXT,
          ebay_policy_id VARCHAR(100) UNIQUE,
          
          -- マーケットプレイス
          marketplace_id VARCHAR(20) DEFAULT 'EBAY_US',
          
          -- ハンドリング設定
          handling_time_days INTEGER DEFAULT 3,
          
          -- 配送オプション
          free_shipping BOOLEAN DEFAULT false,
          domestic_shipping_cost NUMERIC(10,2),
          international_shipping_cost NUMERIC(10,2),
          
          -- 除外国リスト
          excluded_countries TEXT[] DEFAULT ARRAY['KP', 'SY', 'IR', 'CU']::TEXT[],
          
          -- ステータス
          is_active BOOLEAN DEFAULT true,
          is_default BOOLEAN DEFAULT false,
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ ebay_fulfillment_policiesテーブルを作成しました';
    ELSE
        RAISE NOTICE 'ℹ️ ebay_fulfillment_policiesテーブルは既に存在します（スキップ）';
    END IF;
END $;

-- ==========================================
-- 3. eBay支払いポリシーテーブル（既存の場合はスキップ）
-- ==========================================
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ebay_payment_policies'
    ) THEN
        CREATE TABLE ebay_payment_policies (
          id BIGSERIAL PRIMARY KEY,
          policy_name VARCHAR(255) NOT NULL,
          description TEXT,
          ebay_policy_id VARCHAR(100) UNIQUE,
          
          marketplace_id VARCHAR(20) DEFAULT 'EBAY_US',
          
          -- 支払い方法
          immediate_payment_required BOOLEAN DEFAULT false,
          
          is_active BOOLEAN DEFAULT true,
          is_default BOOLEAN DEFAULT false,
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ ebay_payment_policiesテーブルを作成しました';
    ELSE
        RAISE NOTICE 'ℹ️ ebay_payment_policiesテーブルは既に存在します（スキップ）';
    END IF;
END $;

-- ==========================================
-- 4. eBay返品ポリシーテーブル（既存の場合はスキップ）
-- ==========================================
DO $ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ebay_return_policies'
    ) THEN
        CREATE TABLE ebay_return_policies (
          id BIGSERIAL PRIMARY KEY,
          policy_name VARCHAR(255) NOT NULL,
          description TEXT,
          ebay_policy_id VARCHAR(100) UNIQUE,
          
          marketplace_id VARCHAR(20) DEFAULT 'EBAY_US',
          
          -- 返品設定
          returns_accepted BOOLEAN DEFAULT true,
          return_period_days INTEGER DEFAULT 30,
          refund_method TEXT DEFAULT 'MONEY_BACK', -- MONEY_BACK, EXCHANGE
          return_shipping_cost_payer TEXT DEFAULT 'BUYER', -- BUYER, SELLER
          
          is_active BOOLEAN DEFAULT true,
          is_default BOOLEAN DEFAULT false,
          
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE '✅ ebay_return_policiesテーブルを作成しました';
    ELSE
        RAISE NOTICE 'ℹ️ ebay_return_policiesテーブルは既に存在します（スキップ）';
    END IF;
END $;

-- ==========================================
-- 5. SellerMirror分析結果テーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS sellermirror_analysis (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id TEXT,
  
  -- 競合分析
  competitor_count INTEGER,
  avg_price_usd NUMERIC(10,2),
  min_price_usd NUMERIC(10,2),
  max_price_usd NUMERIC(10,2),
  
  -- よく使われるItem Specifics
  common_aspects JSONB DEFAULT '{}'::jsonb,
  -- 例: {"Brand": ["Sony": 45, "Nintendo": 30], "Condition": ["New": 60, "Used": 40]}
  
  -- 推奨価格
  recommended_price_usd NUMERIC(10,2),
  profit_margin_estimate NUMERIC(5,2),
  
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- インデックス作成
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_category_metadata_category_id ON ebay_category_metadata(category_id);
CREATE INDEX IF NOT EXISTS idx_category_metadata_parent ON ebay_category_metadata(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_policies_active ON ebay_fulfillment_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_payment_policies_active ON ebay_payment_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_return_policies_active ON ebay_return_policies(is_active);
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

-- 2. デフォルト配送ポリシー（既存の場合はスキップ）
DO $
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ebay_fulfillment_policies'
    ) AND NOT EXISTS (
        SELECT 1 FROM ebay_fulfillment_policies WHERE policy_name = 'Standard Shipping Policy'
    ) THEN
        INSERT INTO ebay_fulfillment_policies (
          policy_name, handling_time_days, free_shipping,
          domestic_shipping_cost, international_shipping_cost,
          is_default
        ) VALUES (
          'Standard Shipping Policy',
          3,
          false,
          5.99,
          15.99,
          true
        );
        RAISE NOTICE '✅ デフォルト配送ポリシーを追加しました';
    END IF;
END $;

-- 3. デフォルト支払いポリシー（既存の場合はスキップ）
DO $
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ebay_payment_policies'
    ) AND NOT EXISTS (
        SELECT 1 FROM ebay_payment_policies WHERE policy_name = 'Standard Payment Policy'
    ) THEN
        INSERT INTO ebay_payment_policies (
          policy_name, immediate_payment_required, is_default
        ) VALUES (
          'Standard Payment Policy',
          false,
          true
        );
        RAISE NOTICE '✅ デフォルト支払いポリシーを追加しました';
    END IF;
END $;

-- 4. デフォルト返品ポリシー（既存の場合はスキップ）
DO $
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ebay_return_policies'
    ) AND NOT EXISTS (
        SELECT 1 FROM ebay_return_policies WHERE policy_name = '30-Day Return Policy'
    ) THEN
        INSERT INTO ebay_return_policies (
          policy_name, returns_accepted, return_period_days, is_default
        ) VALUES (
          '30-Day Return Policy',
          true,
          30,
          true
        );
        RAISE NOTICE '✅ デフォルト返品ポリシーを追加しました';
    END IF;
END $;

-- ==========================================
-- コメント
-- ==========================================
COMMENT ON TABLE ebay_category_metadata IS 'eBayカテゴリ別の必須・推奨Item Specifics';
COMMENT ON TABLE ebay_fulfillment_policies IS 'eBay配送ポリシー';
COMMENT ON TABLE ebay_payment_policies IS 'eBay支払いポリシー';
COMMENT ON TABLE ebay_return_policies IS 'eBay返品ポリシー';
COMMENT ON TABLE sellermirror_analysis IS 'SellerMirror競合分析結果';

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ eBay出品完全対応スキーマ作成完了！';
  RAISE NOTICE '📊 カテゴリ別必須項目管理';
  RAISE NOTICE '📦 配送・支払い・返品ポリシー管理';
  RAISE NOTICE '🔍 SellerMirror分析結果保存';
END $$;
