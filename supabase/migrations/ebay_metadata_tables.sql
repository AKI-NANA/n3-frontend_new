-- =========================================
-- eBayメタデータ管理テーブル
-- シンプル版（ビューなし）
-- =========================================

-- ==========================================
-- 1. eBayカテゴリメタデータテーブル
-- SellerMirror分析結果 or eBay API取得データを保存
-- ==========================================
CREATE TABLE IF NOT EXISTS ebay_category_metadata (
  id BIGSERIAL PRIMARY KEY,
  category_id TEXT NOT NULL UNIQUE,
  category_name TEXT,
  category_path TEXT,
  parent_category_id TEXT,
  
  -- 必須Item Specifics (eBay APIまたはSellerMirrorから取得)
  required_aspects JSONB DEFAULT '[]'::jsonb,
  -- 推奨Item Specifics
  recommended_aspects JSONB DEFAULT '[]'::jsonb,
  -- Aspect値の選択肢（ドロップダウン用）
  aspect_values JSONB DEFAULT '{}'::jsonb,
  
  -- データソース追跡
  data_source TEXT DEFAULT 'ebay_api', -- 'ebay_api' or 'sellermirror'
  sellermirror_analyzed BOOLEAN DEFAULT false,
  
  -- SellerMirror分析データ
  sm_competitor_count INTEGER,
  sm_average_price_usd NUMERIC(10,2),
  sm_min_price_usd NUMERIC(10,2),
  sm_max_price_usd NUMERIC(10,2),
  sm_common_aspects JSONB DEFAULT '{}'::jsonb,
  sm_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- メタデータ
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_category_metadata_category_id 
  ON ebay_category_metadata(category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_category_metadata_parent 
  ON ebay_category_metadata(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_category_metadata_source 
  ON ebay_category_metadata(data_source);
CREATE INDEX IF NOT EXISTS idx_ebay_category_metadata_sm_analyzed 
  ON ebay_category_metadata(sellermirror_analyzed) 
  WHERE sellermirror_analyzed = true;

-- ==========================================
-- 2. SellerMirror分析履歴テーブル
-- 各商品のSellerMirror分析結果を保存
-- ==========================================
CREATE TABLE IF NOT EXISTS sellermirror_analysis_history (
  id BIGSERIAL PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  item_id TEXT,
  
  -- 分析結果
  competitor_count INTEGER,
  average_price_usd NUMERIC(10,2),
  min_price_usd NUMERIC(10,2),
  max_price_usd NUMERIC(10,2),
  recommended_price_usd NUMERIC(10,2),
  
  -- よく使われるItem Specifics
  common_item_specifics JSONB DEFAULT '{}'::jsonb,
  -- カテゴリ情報
  ebay_category_id TEXT,
  category_name TEXT,
  
  -- 利益分析
  profit_margin NUMERIC(5,2),
  profit_amount_usd NUMERIC(10,2),
  
  -- 分析メタデータ
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_latest BOOLEAN DEFAULT true,
  
  -- 検索インデックス用
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sm_history_product_id 
  ON sellermirror_analysis_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sm_history_item_id 
  ON sellermirror_analysis_history(item_id);
CREATE INDEX IF NOT EXISTS idx_sm_history_latest 
  ON sellermirror_analysis_history(is_latest) 
  WHERE is_latest = true;
CREATE INDEX IF NOT EXISTS idx_sm_history_category 
  ON sellermirror_analysis_history(ebay_category_id);

-- ==========================================
-- 3. カテゴリメタデータ自動更新トリガー
-- ==========================================
CREATE OR REPLACE FUNCTION update_category_metadata_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_category_metadata_timestamp ON ebay_category_metadata;
CREATE TRIGGER trigger_update_category_metadata_timestamp
  BEFORE UPDATE ON ebay_category_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_category_metadata_timestamp();

-- ==========================================
-- 4. SellerMirror分析結果の最新フラグ管理
-- ==========================================
CREATE OR REPLACE FUNCTION update_sellermirror_latest_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- 同じproduct_idの古いレコードのis_latestをfalseに更新
  UPDATE sellermirror_analysis_history
  SET is_latest = false
  WHERE product_id = NEW.product_id
    AND id != NEW.id
    AND is_latest = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sellermirror_latest ON sellermirror_analysis_history;
CREATE TRIGGER trigger_update_sellermirror_latest
  BEFORE INSERT ON sellermirror_analysis_history
  FOR EACH ROW
  EXECUTE FUNCTION update_sellermirror_latest_flag();

-- ==========================================
-- 5. サンプルデータ投入
-- ==========================================

-- サンプル：eBay Trading Card Gamesカテゴリ
INSERT INTO ebay_category_metadata (
  category_id, 
  category_name, 
  category_path,
  required_aspects,
  recommended_aspects,
  aspect_values,
  data_source
) VALUES 
(
  '183454',
  'Pokémon Individual Cards',
  'Toys & Hobbies > Games > Trading Card Games > Pokémon',
  '[
    {"name": "Card Name", "type": "text", "required": true},
    {"name": "Set", "type": "selection", "required": true},
    {"name": "Card Condition", "type": "selection", "required": true},
    {"name": "Language", "type": "selection", "required": true}
  ]'::jsonb,
  '[
    {"name": "Graded", "type": "selection"},
    {"name": "Professional Grader", "type": "selection"},
    {"name": "Grade", "type": "text"},
    {"name": "Card Type", "type": "selection"},
    {"name": "Rarity", "type": "selection"}
  ]'::jsonb,
  '{
    "Set": ["Base Set", "Jungle", "Fossil", "Team Rocket", "Gym Heroes", "Gym Challenge", "Neo Genesis", "Neo Discovery", "Neo Revelation", "Neo Destiny"],
    "Card Condition": ["Near Mint or Better", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"],
    "Language": ["English", "Japanese", "French", "German", "Spanish", "Italian", "Korean", "Chinese"],
    "Graded": ["Yes", "No"],
    "Professional Grader": ["PSA", "BGS", "CGC", "SGC"],
    "Card Type": ["Pokémon", "Trainer", "Energy"],
    "Rarity": ["Common", "Uncommon", "Rare", "Rare Holo", "Ultra Rare", "Secret Rare"]
  }'::jsonb,
  'ebay_api'
),
(
  '260328',
  'Magic: The Gathering Individual Cards',
  'Toys & Hobbies > Games > Trading Card Games > Magic: The Gathering',
  '[
    {"name": "Card Name", "type": "text", "required": true},
    {"name": "Set", "type": "selection", "required": true},
    {"name": "Card Condition", "type": "selection", "required": true},
    {"name": "Language", "type": "selection", "required": true}
  ]'::jsonb,
  '[
    {"name": "Finish", "type": "selection"},
    {"name": "Color", "type": "selection"},
    {"name": "Rarity", "type": "selection"}
  ]'::jsonb,
  '{
    "Card Condition": ["Near Mint or Better", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"],
    "Language": ["English", "Japanese", "French", "German", "Spanish", "Italian", "Portuguese", "Russian", "Korean", "Chinese"],
    "Finish": ["Regular", "Foil", "Etched Foil"],
    "Color": ["White", "Blue", "Black", "Red", "Green", "Colorless", "Multicolor"],
    "Rarity": ["Common", "Uncommon", "Rare", "Mythic Rare"]
  }'::jsonb,
  'ebay_api'
),
(
  '31395',
  'Yu-Gi-Oh! Individual Cards',
  'Toys & Hobbies > Games > Trading Card Games > Yu-Gi-Oh!',
  '[
    {"name": "Card Name", "type": "text", "required": true},
    {"name": "Set", "type": "selection", "required": true},
    {"name": "Card Condition", "type": "selection", "required": true},
    {"name": "Language", "type": "selection", "required": true}
  ]'::jsonb,
  '[
    {"name": "Card Type", "type": "selection"},
    {"name": "Rarity", "type": "selection"},
    {"name": "Edition", "type": "selection"}
  ]'::jsonb,
  '{
    "Card Condition": ["Near Mint or Better", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"],
    "Language": ["English", "Japanese", "French", "German", "Spanish", "Italian"],
    "Card Type": ["Monster", "Spell", "Trap"],
    "Rarity": ["Common", "Rare", "Super Rare", "Ultra Rare", "Secret Rare"],
    "Edition": ["1st Edition", "Unlimited", "Limited"]
  }'::jsonb,
  'ebay_api'
)
ON CONFLICT (category_id) DO UPDATE SET
  required_aspects = EXCLUDED.required_aspects,
  recommended_aspects = EXCLUDED.recommended_aspects,
  aspect_values = EXCLUDED.aspect_values,
  updated_at = NOW();

-- ==========================================
-- 6. 便利な関数
-- ==========================================

-- カテゴリの必須項目を取得する関数
CREATE OR REPLACE FUNCTION get_category_required_aspects(p_category_id TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT required_aspects INTO result
  FROM ebay_category_metadata
  WHERE category_id = p_category_id
    AND is_active = true;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 商品の最新SellerMirror分析結果を取得する関数
CREATE OR REPLACE FUNCTION get_latest_sellermirror_analysis(p_product_id UUID)
RETURNS TABLE (
  competitor_count INTEGER,
  average_price_usd NUMERIC,
  recommended_price_usd NUMERIC,
  profit_margin NUMERIC,
  analyzed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sma.competitor_count,
    sma.average_price_usd,
    sma.recommended_price_usd,
    sma.profit_margin,
    sma.analyzed_at
  FROM sellermirror_analysis_history sma
  WHERE sma.product_id = p_product_id
    AND sma.is_latest = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- カテゴリにSellerMirrorデータを統合する関数
CREATE OR REPLACE FUNCTION merge_sellermirror_to_category(
  p_category_id TEXT,
  p_competitor_count INTEGER,
  p_avg_price NUMERIC,
  p_min_price NUMERIC,
  p_max_price NUMERIC,
  p_common_aspects JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ebay_category_metadata (
    category_id,
    sm_competitor_count,
    sm_average_price_usd,
    sm_min_price_usd,
    sm_max_price_usd,
    sm_common_aspects,
    sm_analyzed_at,
    sellermirror_analyzed,
    data_source
  ) VALUES (
    p_category_id,
    p_competitor_count,
    p_avg_price,
    p_min_price,
    p_max_price,
    p_common_aspects,
    NOW(),
    true,
    'sellermirror'
  )
  ON CONFLICT (category_id) DO UPDATE SET
    sm_competitor_count = EXCLUDED.sm_competitor_count,
    sm_average_price_usd = EXCLUDED.sm_average_price_usd,
    sm_min_price_usd = EXCLUDED.sm_min_price_usd,
    sm_max_price_usd = EXCLUDED.sm_max_price_usd,
    sm_common_aspects = EXCLUDED.sm_common_aspects,
    sm_analyzed_at = NOW(),
    sellermirror_analyzed = true,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- コメント
-- ==========================================
COMMENT ON TABLE ebay_category_metadata IS 'eBayカテゴリ別の必須・推奨Item Specifics（eBay APIまたはSellerMirrorから取得）';
COMMENT ON TABLE sellermirror_analysis_history IS 'SellerMirror分析結果の履歴（productsテーブルのsm_*カラムと連携）';
COMMENT ON COLUMN ebay_category_metadata.data_source IS 'データ取得元: ebay_api または sellermirror';
COMMENT ON COLUMN ebay_category_metadata.required_aspects IS 'eBay API GetCategorySpecificsで取得した必須項目';
COMMENT ON COLUMN ebay_category_metadata.sm_common_aspects IS 'SellerMirrorで分析した競合がよく使う項目';

-- ==========================================
-- 実行完了メッセージ
-- ==========================================
DO $$
BEGIN
  RAISE NOTICE '✅ eBayメタデータテーブル作成完了！';
  RAISE NOTICE '';
  RAISE NOTICE '📊 作成されたもの:';
  RAISE NOTICE '  ✅ ebay_category_metadata テーブル';
  RAISE NOTICE '  ✅ sellermirror_analysis_history テーブル';
  RAISE NOTICE '  ✅ 3つの便利な関数';
  RAISE NOTICE '  ✅ サンプルデータ（Pokémon, MTG, Yu-Gi-Oh!）';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 既存システムとの連携:';
  RAISE NOTICE '  ✅ products.fulfillment_policy_id - 利益計算ツールが設定（参照のみ）';
  RAISE NOTICE '  ✅ products.ebay_category_id - カテゴリ判定ツールが設定';
  RAISE NOTICE '  ✅ products.sm_* - SellerMirror分析結果を保存';
  RAISE NOTICE '  ✅ ebay_fulfillment_policies など - 既存30テーブルと連携';
  RAISE NOTICE '';
  RAISE NOTICE '📝 データフロー:';
  RAISE NOTICE '  1️⃣ 利益計算実行 → fulfillment_policy_id自動設定';
  RAISE NOTICE '  2️⃣ SellerMirror分析 → 分析履歴保存 + カテゴリ統合';
  RAISE NOTICE '  3️⃣ SellerMirrorなし → eBay API GetCategorySpecifics実行';
  RAISE NOTICE '  4️⃣ 出品時 → カテゴリの必須項目を取得して検証';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 次のステップ:';
  RAISE NOTICE '  1. SELECT * FROM ebay_category_metadata; でデータ確認';
  RAISE NOTICE '  2. SELECT get_category_required_aspects(''183454''); で関数テスト';
  RAISE NOTICE '  3. SellerMirrorツール・カテゴリ判定ツールと連携実装';
END $$;
