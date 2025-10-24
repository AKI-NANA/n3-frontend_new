-- Add extended scraping columns to scraped_products table
-- Date: 2025-10-24
-- Purpose: Support comprehensive Yahoo Auction data collection

-- Add shipping cost column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS shipping_cost INTEGER;

-- Add total cost column (仕入れ値 = price + shipping_cost)
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS total_cost INTEGER;

-- Add images array column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS images TEXT[];

-- Add product description column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS description TEXT;

-- Add seller information columns
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS seller_rating TEXT;

-- Add auction end time column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS end_time TEXT;

-- Add category column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS category TEXT;

-- Add comments for documentation
COMMENT ON COLUMN scraped_products.shipping_cost IS '送料（円）- 0 = 無料、null = 不明';
COMMENT ON COLUMN scraped_products.total_cost IS '仕入れ値 = 価格 + 送料';
COMMENT ON COLUMN scraped_products.images IS 'Product images array (Yahoo image server URLs)';
COMMENT ON COLUMN scraped_products.description IS 'Product description text';
COMMENT ON COLUMN scraped_products.seller_name IS 'Seller username';
COMMENT ON COLUMN scraped_products.seller_rating IS 'Seller rating/reputation';
COMMENT ON COLUMN scraped_products.end_time IS 'Auction end time';
COMMENT ON COLUMN scraped_products.category IS 'Product category from breadcrumbs';

-- Create indexes for new searchable columns
CREATE INDEX IF NOT EXISTS idx_scraped_products_total_cost ON scraped_products(total_cost);
CREATE INDEX IF NOT EXISTS idx_scraped_products_seller_name ON scraped_products(seller_name);
CREATE INDEX IF NOT EXISTS idx_scraped_products_category ON scraped_products(category);

-- Note: This migration is idempotent (can be run multiple times safely)
