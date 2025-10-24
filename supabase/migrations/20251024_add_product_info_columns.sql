-- Add product info section columns to scraped_products table
-- Date: 2025-10-24
-- Purpose: Support detailed Yahoo Auction product info for eBay category mapping

-- Add category_path column (full category path for eBay mapping)
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS category_path TEXT;

-- Add quantity column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS quantity TEXT;

-- Add shipping_days column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS shipping_days TEXT;

-- Add auction_id column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS auction_id TEXT;

-- Add starting_price column
ALTER TABLE scraped_products ADD COLUMN IF NOT EXISTS starting_price INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN scraped_products.category_path IS 'Full category path (e.g., "コミック、アニメグッズ > 作品別 > は行 > ポケットモンスター > その他") - for eBay category mapping';
COMMENT ON COLUMN scraped_products.quantity IS '個数 (quantity)';
COMMENT ON COLUMN scraped_products.shipping_days IS '発送までの日数 (days until shipping)';
COMMENT ON COLUMN scraped_products.auction_id IS 'オークションID (auction ID from product info or URL)';
COMMENT ON COLUMN scraped_products.starting_price IS '開始時の価格 (starting price in JPY)';

-- Create index for category_path (useful for eBay mapping queries)
CREATE INDEX IF NOT EXISTS idx_scraped_products_category_path ON scraped_products(category_path);
CREATE INDEX IF NOT EXISTS idx_scraped_products_auction_id ON scraped_products(auction_id);

-- Note: This migration is idempotent (can be run multiple times safely)
