-- Create table for scraped Yahoo Auction products
CREATE TABLE IF NOT EXISTS scraped_products (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  source_url TEXT NOT NULL,
  condition TEXT,
  stock_status TEXT,
  bid_count TEXT,
  platform TEXT DEFAULT 'Yahoo Auction',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  scraping_method TEXT DEFAULT 'structure_based_puppeteer_v2025',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scraped_products_scraped_at ON scraped_products(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_products_platform ON scraped_products(platform);
CREATE INDEX IF NOT EXISTS idx_scraped_products_source_url ON scraped_products(source_url);

-- Add RLS (Row Level Security) policies
ALTER TABLE scraped_products ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON scraped_products
  FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE scraped_products IS 'Stores scraped product data from Yahoo Auction and other platforms';
COMMENT ON COLUMN scraped_products.title IS 'Product title';
COMMENT ON COLUMN scraped_products.price IS 'Product price in JPY';
COMMENT ON COLUMN scraped_products.source_url IS 'Original auction/product URL';
COMMENT ON COLUMN scraped_products.condition IS 'Product condition (新品, 目立った傷や汚れなし, etc.)';
COMMENT ON COLUMN scraped_products.stock_status IS 'Stock availability';
COMMENT ON COLUMN scraped_products.bid_count IS 'Number of bids (for auctions)';
COMMENT ON COLUMN scraped_products.platform IS 'Platform source (Yahoo Auction, Mercari, etc.)';
COMMENT ON COLUMN scraped_products.scraping_method IS 'Method used for scraping (for debugging)';
