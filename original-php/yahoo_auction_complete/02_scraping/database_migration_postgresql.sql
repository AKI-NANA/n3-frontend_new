-- ===============================================
-- PostgreSQL対応 完全連携データベースマイグレーション
-- ===============================================

-- 1. yahoo_scraped_products に価格計算カラム追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS listing_price_usd NUMERIC(10,2);

ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS profit_calculation JSONB;

ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS price_recalculated_at TIMESTAMP;

-- コメント追加
COMMENT ON COLUMN yahoo_scraped_products.listing_price_usd IS '出品価格（USD）';
COMMENT ON COLUMN yahoo_scraped_products.profit_calculation IS '利益計算詳細（JSON）';
COMMENT ON COLUMN yahoo_scraped_products.price_recalculated_at IS '価格再計算日時';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_price_recalculated 
    ON yahoo_scraped_products(price_recalculated_at DESC);

-- 2. inventory_management テーブルの作成
-- まず既存テーブルを削除（テスト環境のみ）
DROP TABLE IF EXISTS inventory_management CASCADE;

CREATE TABLE inventory_management (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 仕入れ先情報
    source_platform VARCHAR(20) NOT NULL, -- 'yahoo', 'amazon', 'ebay'
    source_url TEXT NOT NULL,
    source_product_id VARCHAR(100),
    
    -- 現在の在庫・価格情報
    current_stock INTEGER DEFAULT 0,
    current_price NUMERIC(10,2) DEFAULT 0.00,
    
    -- 商品検証
    title_hash VARCHAR(64), -- タイトルのハッシュ値
    url_status VARCHAR(20) DEFAULT 'active', -- 'active', 'dead', 'changed'
    last_verified_at TIMESTAMP,
    
    -- システム管理
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コメント追加
COMMENT ON TABLE inventory_management IS '在庫管理メインテーブル';
COMMENT ON COLUMN inventory_management.source_platform IS 'yahoo, amazon, ebay';
COMMENT ON COLUMN inventory_management.url_status IS 'active, dead, changed';

-- インデックス追加
CREATE INDEX idx_product_monitoring ON inventory_management(product_id, monitoring_enabled);
CREATE INDEX idx_source_platform ON inventory_management(source_platform);
CREATE INDEX idx_updated_at ON inventory_management(updated_at);
CREATE INDEX idx_url_status ON inventory_management(url_status);

-- 外部キー制約
ALTER TABLE inventory_management 
ADD CONSTRAINT fk_inventory_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE;

-- 3. stock_history テーブルの作成
-- まず既存テーブルを削除（テスト環境のみ）
DROP TABLE IF EXISTS stock_history CASCADE;

CREATE TABLE stock_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 変更前後の値
    previous_stock INTEGER,
    new_stock INTEGER,
    previous_price NUMERIC(10,2),
    new_price NUMERIC(10,2),
    
    -- 変更詳細
    change_type VARCHAR(20) NOT NULL, -- 'stock_change', 'price_change', 'both', 'initial'
    change_source VARCHAR(20) NOT NULL, -- 'yahoo', 'amazon', 'manual'
    
    -- パフォーマンス
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コメント追加
COMMENT ON TABLE stock_history IS '在庫・価格変更履歴テーブル';
COMMENT ON COLUMN stock_history.change_type IS 'stock_change, price_change, both, initial';
COMMENT ON COLUMN stock_history.change_source IS 'yahoo, amazon, manual';

-- インデックス追加
CREATE INDEX idx_product_time ON stock_history(product_id, created_at DESC);
CREATE INDEX idx_change_type ON stock_history(change_type, created_at DESC);
CREATE INDEX idx_created_at ON stock_history(created_at);

-- 外部キー制約
ALTER TABLE stock_history 
ADD CONSTRAINT fk_history_product 
FOREIGN KEY (product_id) REFERENCES yahoo_scraped_products(id) ON DELETE CASCADE;

-- 4. updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inventory_management_updated_at ON inventory_management;
CREATE TRIGGER update_inventory_management_updated_at
    BEFORE UPDATE ON inventory_management
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. データベース統計情報
DO $$
DECLARE
    yahoo_count INTEGER;
    inventory_count INTEGER;
    history_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO yahoo_count FROM yahoo_scraped_products;
    SELECT COUNT(*) INTO inventory_count FROM inventory_management;
    SELECT COUNT(*) INTO history_count FROM stock_history;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ データベーステーブル作成完了';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'yahoo_scraped_products: % レコード', yahoo_count;
    RAISE NOTICE 'inventory_management: % レコード', inventory_count;
    RAISE NOTICE 'stock_history: % レコード', history_count;
    RAISE NOTICE '====================================';
END $$;
