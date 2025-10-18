-- リサーチシステム統合用テーブル定義
-- Gemini統合戦略に基づく設計

-- 1. リサーチ結果マスタ
CREATE TABLE IF NOT EXISTS research_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  -- 検索情報
  search_type VARCHAR(50) NOT NULL,
  search_query TEXT,
  search_params JSONB,
  
  -- スコアリング設定
  scoring_weights JSONB DEFAULT '{"profitRate":30,"salesVolume":20,"competition":15,"riskLevel":25,"trendScore":10}',
  
  -- 統計情報
  total_results INTEGER DEFAULT 0,
  high_score_count INTEGER DEFAULT 0,
  low_risk_count INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_search_type CHECK (search_type IN ('product', 'seller', 'reverse', 'ai', 'bulk'))
);

-- 2. スコア付き商品テーブル
CREATE TABLE IF NOT EXISTS scored_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID REFERENCES research_results(id) ON DELETE CASCADE,
  
  -- eBay商品情報
  ebay_item_id VARCHAR(255),
  title TEXT NOT NULL,
  title_jp TEXT,
  price DECIMAL(10,2) NOT NULL,
  sold_count INTEGER DEFAULT 0,
  competitor_count INTEGER DEFAULT 0,
  
  -- スコア情報
  total_score DECIMAL(5,2) NOT NULL,
  rank INTEGER,
  score_breakdown JSONB,
  
  -- DDP利益計算結果
  profit_calculation JSONB,
  
  -- リスク評価
  risk_factors JSONB,
  risk_level VARCHAR(20),
  
  -- 商品詳細
  origin_country VARCHAR(5),
  hs_code VARCHAR(20),
  weight_kg DECIMAL(8,3),
  category VARCHAR(255),
  condition VARCHAR(50),
  
  -- 仕入先マッチング
  supplier_matches JSONB,
  best_supplier_source VARCHAR(50),
  best_supplier_price DECIMAL(10,2),
  
  -- 画像・URL
  image_url TEXT,
  ebay_url TEXT,
  
  -- ステータス
  status VARCHAR(50) DEFAULT 'pending',
  
  -- メタデータ
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 仕入先マッチング詳細テーブル
CREATE TABLE IF NOT EXISTS supplier_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES scored_products(id) ON DELETE CASCADE,
  
  -- 仕入先情報
  source VARCHAR(50) NOT NULL,
  supplier_product_name TEXT,
  supplier_product_url TEXT,
  supplier_image_url TEXT,
  
  -- 価格情報
  price DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2),
  
  -- 在庫・配送
  availability BOOLEAN DEFAULT TRUE,
  stock_count INTEGER,
  estimated_delivery_days INTEGER,
  
  -- マッチング精度
  match_score DECIMAL(5,2),
  match_method VARCHAR(50),
  
  -- メタデータ
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. バッチ処理ジョブテーブル
CREATE TABLE IF NOT EXISTS batch_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID REFERENCES research_results(id) ON DELETE CASCADE,
  
  -- ジョブ情報
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  
  -- 処理対象
  target_product_ids JSONB,
  total_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- 結果
  results JSONB,
  error_message TEXT,
  
  -- パフォーマンス
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. API呼び出しキャッシュテーブル
CREATE TABLE IF NOT EXISTS api_call_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- キャッシュキー
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  api_type VARCHAR(50) NOT NULL,
  
  -- リクエスト情報
  request_params JSONB,
  
  -- レスポンス
  response_data JSONB,
  response_status INTEGER,
  
  -- キャッシュ有効期限
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- 統計
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_research_user ON research_results(user_id);
CREATE INDEX IF NOT EXISTS idx_research_created ON research_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scored_research ON scored_products(research_id);
CREATE INDEX IF NOT EXISTS idx_scored_score ON scored_products(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_scored_risk ON scored_products(risk_level);
CREATE INDEX IF NOT EXISTS idx_scored_status ON scored_products(status);
CREATE INDEX IF NOT EXISTS idx_supplier_product ON supplier_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_source ON supplier_matches(source);
CREATE INDEX IF NOT EXISTS idx_batch_research ON batch_processing_jobs(research_id);
CREATE INDEX IF NOT EXISTS idx_batch_status ON batch_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cache_key ON api_call_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON api_call_cache(expires_at);
