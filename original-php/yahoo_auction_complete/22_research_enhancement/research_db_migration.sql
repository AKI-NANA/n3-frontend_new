-- ==========================================
-- リサーチシステム統合DB - マイグレーション
-- 作成日: 2025-10-03
-- ==========================================

-- UUID拡張有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. リサーチ商品メインテーブル
-- ==========================================
CREATE TABLE IF NOT EXISTS research_products_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ebay_item_id TEXT UNIQUE NOT NULL,
  
  -- Finding API基本データ
  title TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT,
  current_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  shipping_cost DECIMAL(10,2),
  listing_type TEXT,
  condition TEXT,
  item_url TEXT,
  primary_image_url TEXT,
  
  -- セラー基本情報
  seller_username TEXT NOT NULL,
  seller_country TEXT,
  seller_feedback_score INTEGER,
  seller_positive_percentage DECIMAL(5,2),
  
  -- 検索メタ情報
  search_query TEXT,
  search_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- セラーミラー連携
  is_exported_to_seller_mirror BOOLEAN DEFAULT false,
  exported_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE research_products_master IS 'リサーチ商品マスタ - Finding API基本データ';
COMMENT ON COLUMN research_products_master.ebay_item_id IS 'eBay商品ID（ユニーク）';
COMMENT ON COLUMN research_products_master.is_exported_to_seller_mirror IS 'セラーミラーへエクスポート済みフラグ';

-- ==========================================
-- 2. Shopping API詳細データ
-- ==========================================
CREATE TABLE IF NOT EXISTS research_shopping_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ebay_item_id TEXT UNIQUE NOT NULL,
  
  -- 人気度指標
  quantity_sold INTEGER DEFAULT 0,
  watch_count INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 0,
  quantity_available INTEGER DEFAULT 0,
  
  -- 出品必須項目
  description TEXT,
  picture_urls JSONB,
  item_specifics JSONB,
  return_policy JSONB,
  shipping_info JSONB,
  
  -- その他
  listing_status TEXT,
  time_left TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (ebay_item_id) REFERENCES research_products_master(ebay_item_id) ON DELETE CASCADE
);

COMMENT ON TABLE research_shopping_details IS 'Shopping API詳細データ';
COMMENT ON COLUMN research_shopping_details.quantity_sold IS '販売済み数量（人気度指標）';
COMMENT ON COLUMN research_shopping_details.item_specifics IS '商品仕様（Brand, Model, Size等）';

-- ==========================================
-- 3. Seller詳細プロファイル
-- ==========================================
CREATE TABLE IF NOT EXISTS research_seller_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  user_id TEXT,
  registration_date TIMESTAMPTZ,
  
  -- 評価情報
  feedback_score INTEGER,
  positive_feedback_percentage DECIMAL(5,2),
  feedback_rating_star TEXT,
  unique_positive_count INTEGER,
  unique_negative_count INTEGER,
  
  -- ビジネス情報
  business_type TEXT,
  top_rated_seller BOOLEAN DEFAULT false,
  store_name TEXT,
  store_url TEXT,
  
  -- 分析用
  total_researched_items INTEGER DEFAULT 0,
  average_item_score DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE research_seller_profiles IS 'セラープロファイル - 成功パターン分析用';
COMMENT ON COLUMN research_seller_profiles.top_rated_seller IS 'トップレート販売者フラグ';

-- ==========================================
-- 4. AI分析結果（フィルター判定結果を蓄積）
-- ==========================================
CREATE TABLE IF NOT EXISTS research_ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ebay_item_id TEXT UNIQUE NOT NULL,
  
  -- 🔥 HSコード（必須）
  hs_code TEXT NOT NULL,
  hs_description TEXT,
  hs_confidence DECIMAL(3,2),
  
  -- 🔥 原産国（必須・デフォルトCN）
  origin_country TEXT NOT NULL DEFAULT 'CN',
  origin_reasoning TEXT,
  origin_confidence DECIMAL(3,2),
  origin_source TEXT, -- 'ai_detected', 'item_specifics', 'brand_mapping', 'default_cn'
  
  -- サイズ・重量（AI推測）
  estimated_length_cm DECIMAL(10,2),
  estimated_width_cm DECIMAL(10,2),
  estimated_height_cm DECIMAL(10,2),
  estimated_weight_kg DECIMAL(10,3),
  size_confidence DECIMAL(3,2),
  size_source TEXT, -- 'ai_estimate', 'similar_products', 'category_average'
  
  -- 🔥 危険物判定結果（フィルターDB検索結果を蓄積）
  is_hazardous BOOLEAN DEFAULT false,
  hazard_type TEXT, -- 'lithium_battery', 'flammable', 'liquid', 'powder'
  hazard_keywords_matched JSONB,
  hazard_checked_at TIMESTAMPTZ,
  
  -- 🔥 禁制品判定結果
  is_prohibited BOOLEAN DEFAULT false,
  prohibited_reason TEXT,
  prohibited_keywords_matched JSONB,
  prohibited_checked_at TIMESTAMPTZ,
  
  -- 🔥 航空便判定結果
  air_shippable BOOLEAN DEFAULT true,
  air_restriction_reason TEXT,
  air_restriction_keywords_matched JSONB,
  air_checked_at TIMESTAMPTZ,
  
  -- 🔥 VERO判定結果
  vero_risk TEXT, -- 'low', 'medium', 'high'
  vero_brand_matched TEXT,
  vero_checked_at TIMESTAMPTZ,
  
  -- 🔥 特許リスク判定結果
  patent_troll_risk TEXT, -- 'low', 'medium', 'high'
  patent_category_matched TEXT,
  patent_checked_at TIMESTAMPTZ,
  
  -- AI分析メタ
  ai_model TEXT DEFAULT 'claude-sonnet-4-5',
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  recommended_checks JSONB,
  
  -- 実測値（出品時更新）
  actual_length_cm DECIMAL(10,2),
  actual_width_cm DECIMAL(10,2),
  actual_height_cm DECIMAL(10,2),
  actual_weight_kg DECIMAL(10,3),
  actual_origin_country TEXT,
  measured_at TIMESTAMPTZ,
  
  -- 統計・分析用
  total_checks_performed INTEGER DEFAULT 0,
  last_recheck_at TIMESTAMPTZ,
  
  FOREIGN KEY (ebay_item_id) REFERENCES research_products_master(ebay_item_id) ON DELETE CASCADE
);

COMMENT ON TABLE research_ai_analysis IS 'AI分析結果 - フィルター判定結果を蓄積';
COMMENT ON COLUMN research_ai_analysis.origin_country IS '原産国（不明時は安全のためCN）';
COMMENT ON COLUMN research_ai_analysis.is_hazardous IS '危険物フラグ（フィルターDB検索結果）';
COMMENT ON COLUMN research_ai_analysis.hazard_keywords_matched IS 'マッチした危険物キーワード';

-- ==========================================
-- 5. 仕入れ先候補
-- ==========================================
CREATE TABLE IF NOT EXISTS research_supplier_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ebay_item_id TEXT NOT NULL,
  
  supplier_type TEXT NOT NULL, -- 'amazon_jp', 'rakuten', 'yahoo_shopping', 'mercari'
  supplier_name TEXT,
  product_url TEXT,
  product_price DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  
  is_best_price BOOLEAN DEFAULT false,
  availability TEXT,
  
  -- AI検索ソース情報
  found_by_ai BOOLEAN DEFAULT false,
  search_keywords JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (ebay_item_id) REFERENCES research_products_master(ebay_item_id) ON DELETE CASCADE
);

COMMENT ON TABLE research_supplier_candidates IS '仕入れ先候補 - AI自動検索結果';
COMMENT ON COLUMN research_supplier_candidates.is_best_price IS '最安値フラグ';

-- ==========================================
-- 6. 利益計算結果
-- ==========================================
CREATE TABLE IF NOT EXISTS research_profit_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ebay_item_id TEXT NOT NULL,
  
  stage TEXT NOT NULL, -- 'stage1_estimated' or 'stage2_actual'
  
  -- コストパラメータ
  ebay_price DECIMAL(10,2),
  japan_cost DECIMAL(10,2),
  hs_code TEXT,
  
  -- サイズ・重量
  length_cm DECIMAL(10,2),
  width_cm DECIMAL(10,2),
  height_cm DECIMAL(10,2),
  weight_kg DECIMAL(10,3),
  is_estimated BOOLEAN DEFAULT true,
  
  -- 計算結果
  fees_breakdown JSONB,
  total_cost DECIMAL(10,2),
  profit DECIMAL(10,2),
  profit_rate DECIMAL(5,2),
  is_profitable BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  FOREIGN KEY (ebay_item_id) REFERENCES research_products_master(ebay_item_id) ON DELETE CASCADE
);

COMMENT ON TABLE research_profit_calculations IS '利益計算結果 - Stage1推測値・Stage2実測値';
COMMENT ON COLUMN research_profit_calculations.stage IS 'stage1_estimated: AI推測, stage2_actual: 実測値';

-- ==========================================
-- インデックス作成
-- ==========================================

-- research_products_master
CREATE INDEX idx_research_products_search_date ON research_products_master(search_date DESC);
CREATE INDEX idx_research_products_seller ON research_products_master(seller_username);
CREATE INDEX idx_research_products_category ON research_products_master(category_name);
CREATE INDEX idx_research_products_exported ON research_products_master(is_exported_to_seller_mirror);

-- research_shopping_details
CREATE INDEX idx_shopping_quantity_sold ON research_shopping_details(quantity_sold DESC);
CREATE INDEX idx_shopping_watch_count ON research_shopping_details(watch_count DESC);

-- research_seller_profiles
CREATE INDEX idx_seller_username ON research_seller_profiles(username);
CREATE INDEX idx_seller_top_rated ON research_seller_profiles(top_rated_seller);

-- research_ai_analysis
CREATE INDEX idx_ai_hs_code ON research_ai_analysis(hs_code);
CREATE INDEX idx_ai_origin_country ON research_ai_analysis(origin_country);
CREATE INDEX idx_ai_is_hazardous ON research_ai_analysis(is_hazardous);
CREATE INDEX idx_ai_vero_risk ON research_ai_analysis(vero_risk);
CREATE INDEX idx_ai_patent_risk ON research_ai_analysis(patent_troll_risk);

-- research_supplier_candidates
CREATE INDEX idx_supplier_ebay_item ON research_supplier_candidates(ebay_item_id);
CREATE INDEX idx_supplier_best_price ON research_supplier_candidates(is_best_price);

-- research_profit_calculations
CREATE INDEX idx_profit_ebay_item ON research_profit_calculations(ebay_item_id);
CREATE INDEX idx_profit_stage ON research_profit_calculations(stage);
CREATE INDEX idx_profit_is_profitable ON research_profit_calculations(is_profitable);

-- ==========================================
-- サンプルデータ（開発用）
-- ==========================================

-- テストデータは本番環境では実行しない
-- INSERT INTO research_products_master ...

-- ==========================================
-- 完了
-- ==========================================

-- マイグレーション完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'リサーチシステム統合DB マイグレーション完了';
  RAISE NOTICE '作成されたテーブル:';
  RAISE NOTICE '  1. research_products_master';
  RAISE NOTICE '  2. research_shopping_details';
  RAISE NOTICE '  3. research_seller_profiles';
  RAISE NOTICE '  4. research_ai_analysis';
  RAISE NOTICE '  5. research_supplier_candidates';
  RAISE NOTICE '  6. research_profit_calculations';
  RAISE NOTICE '==============================================';
END $$;
