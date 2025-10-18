-- SellerMirror分析結果のカラムを追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS sm_lowest_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sm_average_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER,
ADD COLUMN IF NOT EXISTS sm_profit_margin DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS sm_profit_amount_usd DECIMAL(10,2);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_sm_lowest_price ON yahoo_scraped_products(sm_lowest_price);
CREATE INDEX IF NOT EXISTS idx_sm_profit_margin ON yahoo_scraped_products(sm_profit_margin);

COMMENT ON COLUMN yahoo_scraped_products.sm_lowest_price IS 'SellerMirrorで取得した最安値（USD）';
COMMENT ON COLUMN yahoo_scraped_products.sm_average_price IS 'SellerMirrorで取得した平均価格（USD）';
COMMENT ON COLUMN yahoo_scraped_products.sm_competitor_count IS 'SellerMirrorで取得した競合数';
COMMENT ON COLUMN yahoo_scraped_products.sm_profit_margin IS 'SellerMirrorで計算した利益率（%）';
COMMENT ON COLUMN yahoo_scraped_products.sm_profit_amount_usd IS 'SellerMirrorで計算した利益額（USD）';
