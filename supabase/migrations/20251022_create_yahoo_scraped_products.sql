-- yahoo_scraped_productsテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS yahoo_scraped_products (
  id BIGSERIAL PRIMARY KEY,

  -- 基本情報
  source_item_id TEXT NOT NULL,
  sku TEXT,
  master_key TEXT,
  title TEXT NOT NULL,
  english_title TEXT,

  -- 価格
  price_jpy DECIMAL(10,2),
  price_usd DECIMAL(10,2),
  current_stock INTEGER,
  status TEXT DEFAULT 'draft',

  -- 利益計算
  profit_margin DECIMAL(5,2),
  profit_amount_usd DECIMAL(10,2),

  -- SellerMirror分析結果
  sm_lowest_price DECIMAL(10,2),
  sm_average_price DECIMAL(10,2),
  sm_competitor_count INTEGER,
  sm_profit_margin DECIMAL(5,2),
  sm_profit_amount_usd DECIMAL(10,2),

  -- JSONBデータ
  ebay_api_data JSONB,
  scraped_data JSONB,
  listing_data JSONB,

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 出品情報
  listed_at TIMESTAMPTZ,
  listing_session_id TEXT
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_products_sku ON yahoo_scraped_products(sku);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_products_master_key ON yahoo_scraped_products(master_key);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_products_status ON yahoo_scraped_products(status);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_products_created_at ON yahoo_scraped_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_products_listing_session ON yahoo_scraped_products(listing_session_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_yahoo_scraped_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_yahoo_scraped_products_timestamp ON yahoo_scraped_products;
CREATE TRIGGER update_yahoo_scraped_products_timestamp
    BEFORE UPDATE ON yahoo_scraped_products
    FOR EACH ROW
    EXECUTE FUNCTION update_yahoo_scraped_products_updated_at();

-- コメント
COMMENT ON TABLE yahoo_scraped_products IS 'Yahoo/Amazon/その他のソースから取得した商品データ。データ編集ページで使用。';
COMMENT ON COLUMN yahoo_scraped_products.source_item_id IS '元のソース商品ID（ASIN、Yahoo商品IDなど）';
COMMENT ON COLUMN yahoo_scraped_products.master_key IS '商品のマスターキー（重複チェック用）';
COMMENT ON COLUMN yahoo_scraped_products.sm_lowest_price IS 'SellerMirror分析：eBay最安値（USD）';
COMMENT ON COLUMN yahoo_scraped_products.sm_competitor_count IS 'SellerMirror分析：競合出品者数';
