-- 利益率と利益額のカラムを追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS profit_amount_usd DECIMAL(10,2);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_profit_margin ON yahoo_scraped_products(profit_margin);

COMMENT ON COLUMN yahoo_scraped_products.profit_margin IS '通常の利益率（%）デフォルト15%';
COMMENT ON COLUMN yahoo_scraped_products.profit_amount_usd IS '通常の利益額（USD）';
