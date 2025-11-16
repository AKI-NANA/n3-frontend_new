-- database/migrations/005_create_inventory_history.sql

CREATE TABLE IF NOT EXISTS inventory_history (
    id SERIAL PRIMARY KEY,
    product_sku TEXT NOT NULL,
    asin_id TEXT,
    
    -- スクレイピングで取得するコアデータ
    scraped_price NUMERIC, -- 現在の販売価格
    current_stock INTEGER, -- 監視対象商品の現在の在庫数
    total_sellers INTEGER, -- その商品の出品者総数
    
    -- 連携フラグ
    is_reconciliation_needed BOOLEAN DEFAULT FALSE, -- 棚卸し連携が必要か（在庫差異等）
    
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_product_sku
        FOREIGN KEY (product_sku) 
        REFERENCES products_master(sku) 
        ON DELETE CASCADE
);

COMMENT ON TABLE inventory_history IS 'スクレイピングによる在庫状況と市場データの履歴';