-- Migration: Add eBay Category Limit and Offer Management Features
-- Created: 2025-11-22
-- Purpose: Support category-based listing limits and automated offer management

-- ============================================================================
-- Part 1: Create ebay_category_limit table
-- ============================================================================
-- Purpose: Manage eBay listing limits per account and category
-- This table tracks the current listing count and maximum allowed listings
-- for each category within an eBay account.

CREATE TABLE IF NOT EXISTS ebay_category_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ebay_account_id VARCHAR(255) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  limit_type VARCHAR(20) CHECK (limit_type IN ('10000', '50000', 'other')),
  current_listing_count INTEGER DEFAULT 0,
  max_limit INTEGER NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ebay_account_id, category_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ebay_category_limit_account
  ON ebay_category_limit(ebay_account_id);
CREATE INDEX IF NOT EXISTS idx_ebay_category_limit_category
  ON ebay_category_limit(category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_category_limit_account_category
  ON ebay_category_limit(ebay_account_id, category_id);

-- Add comment for documentation
COMMENT ON TABLE ebay_category_limit IS 'Manages eBay listing limits per account and category to prevent exceeding platform restrictions';
COMMENT ON COLUMN ebay_category_limit.limit_type IS 'Type of limit: 10000 (10k item limit), 50000 (50k USD limit), or other';
COMMENT ON COLUMN ebay_category_limit.current_listing_count IS 'Current number of active listings in this category';
COMMENT ON COLUMN ebay_category_limit.max_limit IS 'Maximum allowed listings for this category and account';

-- ============================================================================
-- Part 2: Add offer management fields to products_master
-- ============================================================================
-- Purpose: Enable automated offer functionality with loss prevention
-- These fields allow products to participate in automated offer negotiations
-- while ensuring minimum profit margins are maintained.

ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS auto_offer_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS min_profit_margin_jpy NUMERIC(10,2);

ALTER TABLE products_master
  ADD COLUMN IF NOT EXISTS max_discount_rate NUMERIC(5,4);

-- Add comments for documentation
COMMENT ON COLUMN products_master.auto_offer_enabled IS 'Enable/disable automated offer functionality for this product';
COMMENT ON COLUMN products_master.min_profit_margin_jpy IS 'Minimum profit margin in JPY that must be maintained (loss prevention)';
COMMENT ON COLUMN products_master.max_discount_rate IS 'Maximum discount rate allowed for offers (e.g., 0.10 = 10%)';

-- Create index for querying auto-offer enabled products
CREATE INDEX IF NOT EXISTS idx_products_master_auto_offer
  ON products_master(auto_offer_enabled)
  WHERE auto_offer_enabled = TRUE;

-- ============================================================================
-- Part 3: Create helper function for category limit checking
-- ============================================================================
-- Purpose: Simplify checking if a listing can be created in a category

CREATE OR REPLACE FUNCTION can_list_in_category(
  p_account_id VARCHAR(255),
  p_category_id VARCHAR(50)
)
RETURNS TABLE (
  can_list BOOLEAN,
  current_count INTEGER,
  max_limit INTEGER,
  remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (current_listing_count < max_limit) as can_list,
    current_listing_count,
    max_limit,
    (max_limit - current_listing_count) as remaining
  FROM ebay_category_limit
  WHERE ebay_account_id = p_account_id
    AND category_id = p_category_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_list_in_category IS 'Check if a new listing can be created in the specified category for the given account';

-- ============================================================================
-- Part 4: Create trigger to update last_updated timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ebay_category_limit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ebay_category_limit_timestamp
  BEFORE UPDATE ON ebay_category_limit
  FOR EACH ROW
  EXECUTE FUNCTION update_ebay_category_limit_timestamp();

-- ============================================================================
-- Migration Complete
-- ============================================================================
