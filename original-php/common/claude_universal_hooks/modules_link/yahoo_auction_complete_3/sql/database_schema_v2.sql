-- ファイル作成: database_schema_v2.sql
-- PostgreSQL完全対応スキーマ

-- 商品出品情報テーブル
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL, -- 'yahoo', 'amazon', 'other'
    source_url TEXT,
    yahoo_auction_id VARCHAR(50),
    amazon_asin VARCHAR(20),
    
    -- 基本商品情報
    title_jp TEXT,
    title_en TEXT,
    description_jp TEXT,
    description_en TEXT,
    
    -- eBay情報
    ebay_category_id INTEGER,
    ebay_listing_url TEXT,
    ebay_account_id VARCHAR(50), -- 複数アカウント管理
    
    -- 在庫・価格管理
    current_price_jpy DECIMAL(10,2),
    stock_quantity INTEGER DEFAULT 1,
    is_available BOOLEAN DEFAULT TRUE,
    
    -- 配送情報
    estimated_weight_kg DECIMAL(5,2),
    estimated_shipping_cost_jpy DECIMAL(8,2),
    ebay_shipping_policy_id VARCHAR(100),
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'scraped',
    -- 'scraped', 'translated', 'validated', 'listed', 'sold', 'error'
    
    -- 監視・ログ
    last_checked_at TIMESTAMP,
    error_log JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 複数販路管理テーブル
CREATE TABLE IF NOT EXISTS marketplace_accounts (
    id SERIAL PRIMARY KEY,
    marketplace VARCHAR(20) NOT NULL, -- 'ebay', 'shopee', 'shopify', 'amazon'
    account_id VARCHAR(100) NOT NULL UNIQUE,
    account_name VARCHAR(200),
    api_credentials JSONB, -- 暗号化推奨
    daily_listing_limit INTEGER DEFAULT 1000,
    current_daily_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);