-- eBayリサーチ結果を保存するテーブル
CREATE TABLE IF NOT EXISTS research_results (
  id BIGSERIAL PRIMARY KEY,
  
  -- 検索情報
  search_keyword TEXT NOT NULL,
  search_date TIMESTAMP DEFAULT NOW(),
  
  -- eBay商品情報
  ebay_item_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  sold_count INTEGER DEFAULT 0,
  category_id TEXT,
  category_name TEXT,
  condition TEXT,
  seller_username TEXT,
  image_url TEXT,
  view_item_url TEXT,
  
  -- SellerMirror分析結果
  lowest_price_usd DECIMAL(10,2),        -- 最安値
  average_price_usd DECIMAL(10,2),       -- 平均価格
  competitor_count INTEGER,              -- 競合数
  estimated_weight_g INTEGER,            -- 推定重量
  
  -- 利益計算結果（最安値での）
  profit_margin_at_lowest DECIMAL(5,2),  -- 最安値での利益率
  profit_amount_at_lowest_usd DECIMAL(10,2), -- 最安値での利益額（USD）
  profit_amount_at_lowest_jpy INTEGER,   -- 最安値での利益額（JPY）
  recommended_cost_jpy INTEGER,          -- 推奨仕入れ価格
  
  -- Item Specifics（カテゴリ必須項目）
  item_specifics JSONB,
  
  -- その他のメタデータ
  listing_type TEXT,
  location_country TEXT,
  location_city TEXT,
  shipping_cost_usd DECIMAL(10,2),
  
  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_research_results_keyword ON research_results(search_keyword);
CREATE INDEX IF NOT EXISTS idx_research_results_ebay_item_id ON research_results(ebay_item_id);
CREATE INDEX IF NOT EXISTS idx_research_results_category ON research_results(category_id);
CREATE INDEX IF NOT EXISTS idx_research_results_created_at ON research_results(created_at DESC);

-- カテゴリ必須項目のキャッシュテーブル
CREATE TABLE IF NOT EXISTS ebay_category_aspects (
  id BIGSERIAL PRIMARY KEY,
  category_id TEXT NOT NULL UNIQUE,
  category_name TEXT,
  aspects JSONB NOT NULL, -- 必須項目のリスト
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_aspects_category_id ON ebay_category_aspects(category_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_research_results_updated_at
    BEFORE UPDATE ON research_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ebay_category_aspects_updated_at
    BEFORE UPDATE ON ebay_category_aspects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE research_results IS 'eBayリサーチ結果の保存テーブル。検索時に最安値情報も含めて保存する。';
COMMENT ON TABLE ebay_category_aspects IS 'eBayカテゴリ別の必須項目キャッシュ。API呼び出しを削減するため。';
