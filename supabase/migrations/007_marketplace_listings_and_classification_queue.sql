-- ========================================
-- Migration 007: marketplace_listings & stock_classification_queue
-- 作成日: 2025-11-16
-- 目的: 有在庫判定システムの基盤構築
-- ========================================

-- ========================================
-- 1. marketplace_listings (各モールの出品記録)
-- ========================================
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES inventory_master(id) ON DELETE SET NULL,
    marketplace TEXT NOT NULL,                -- 'ebay', 'mercari', 'amazon', etc
    account TEXT NOT NULL,                    -- 'mjt', 'green', etc
    listing_id TEXT NOT NULL,                 -- モール側のID
    listing_quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',    -- 'active', 'ended', 'sold'
    scraped_data JSONB,
    api_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(marketplace, account, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_listing_inventory_id ON marketplace_listings (inventory_id);
CREATE INDEX IF NOT EXISTS idx_listing_marketplace ON marketplace_listings (marketplace, account);
CREATE INDEX IF NOT EXISTS idx_listing_status ON marketplace_listings (status);

COMMENT ON TABLE marketplace_listings IS '各モールの出品記録（eBay、Mercari等）';
COMMENT ON COLUMN marketplace_listings.inventory_id IS '棚卸しマスターへの参照（有在庫判定後に設定）';
COMMENT ON COLUMN marketplace_listings.listing_quantity IS 'このモールでの出品数';
COMMENT ON COLUMN marketplace_listings.status IS 'active: 出品中, ended: 終了, sold: 売却済';

-- ========================================
-- 2. stock_classification_queue (有在庫判定待ちキュー)
-- ========================================
CREATE TABLE IF NOT EXISTS stock_classification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marketplace TEXT NOT NULL,
    account TEXT NOT NULL,
    listing_id TEXT NOT NULL,
    product_name TEXT,
    images JSONB,
    scraped_data JSONB,
    
    -- 判定結果
    is_stock BOOLEAN,                         -- TRUE: 有在庫, FALSE: 無在庫, NULL: 未判定
    classified_by TEXT,
    classified_at TIMESTAMPTZ,
    inventory_id UUID REFERENCES inventory_master(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(marketplace, account, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_is_stock ON stock_classification_queue (is_stock);
CREATE INDEX IF NOT EXISTS idx_queue_marketplace ON stock_classification_queue (marketplace, account);
CREATE INDEX IF NOT EXISTS idx_queue_created ON stock_classification_queue (created_at DESC);

COMMENT ON TABLE stock_classification_queue IS '有在庫判定待ちキュー';
COMMENT ON COLUMN stock_classification_queue.is_stock IS 'TRUE: 有在庫, FALSE: 無在庫, NULL: 未判定';
COMMENT ON COLUMN stock_classification_queue.inventory_id IS '判定後の紐づけ先（inventory_master.id）';

-- ========================================
-- 3. サンプルデータ挿入（テスト用）
-- ========================================
-- eBay MJTアカウントのサンプルデータ
INSERT INTO stock_classification_queue (marketplace, account, listing_id, product_name, images, scraped_data)
VALUES 
    ('ebay', 'mjt', '12345678', 'iPhone 14 Pro Max 256GB', 
     '["https://i.ebayimg.com/images/g/abc/s-l1600.jpg"]'::jsonb,
     '{"price": "$899.99", "condition": "Used", "category": "Cell Phones & Smartphones"}'::jsonb),
    ('ebay', 'mjt', '23456789', 'Sony PlayStation 5', 
     '["https://i.ebayimg.com/images/g/def/s-l1600.jpg"]'::jsonb,
     '{"price": "$549.99", "condition": "New", "category": "Video Game Consoles"}'::jsonb),
    ('ebay', 'green', '34567890', 'Nintendo Switch OLED', 
     '["https://i.ebayimg.com/images/g/ghi/s-l1600.jpg"]'::jsonb,
     '{"price": "$349.99", "condition": "Used", "category": "Video Game Consoles"}'::jsonb)
ON CONFLICT (marketplace, account, listing_id) DO NOTHING;

-- ========================================
-- Migration完了
-- ========================================
