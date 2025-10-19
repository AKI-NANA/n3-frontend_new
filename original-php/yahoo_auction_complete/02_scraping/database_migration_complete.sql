-- ===============================================
-- 完全連携のためのデータベース拡張
-- ===============================================

-- 1. yahoo_scraped_products に価格計算カラム追加
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS listing_price_usd DECIMAL(10,2) COMMENT '出品価格（USD）';

ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS profit_calculation JSONB COMMENT '利益計算詳細（JSON）';

ALTER TABLE yahoo_scraped_products
ADD COLUMN IF NOT EXISTS price_recalculated_at TIMESTAMP NULL COMMENT '価格再計算日時';

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_price_recalculated 
    ON yahoo_scraped_products(price_recalculated_at DESC);

-- 2. inventory_management テーブルの確認・作成
CREATE TABLE IF NOT EXISTS inventory_management (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 仕入れ先情報
    source_platform VARCHAR(20) NOT NULL, -- 'yahoo', 'amazon', 'ebay'
    source_url TEXT NOT NULL,
    source_product_id VARCHAR(100),
    
    -- 現在の在庫・価格情報
    current_stock INTEGER DEFAULT 0,
    current_price DECIMAL(10,2) DEFAULT 0.00,
    
    -- 商品検証
    title_hash VARCHAR(64), -- タイトルのハッシュ値
    url_status VARCHAR(20) DEFAULT 'active', -- 'active', 'dead', 'changed'
    last_verified_at TIMESTAMP NULL,
    
    -- システム管理
    monitoring_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_product_monitoring ON inventory_management(product_id, monitoring_enabled);
CREATE INDEX IF NOT EXISTS idx_source_platform ON inventory_management(source_platform);
CREATE INDEX IF NOT EXISTS idx_updated_at ON inventory_management(updated_at);
CREATE INDEX IF NOT EXISTS idx_url_status ON inventory_management(url_status);

-- 3. stock_history テーブルの確認・作成
CREATE TABLE IF NOT EXISTS stock_history (
    id BIGSERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    
    -- 変更前後の値
    previous_stock INTEGER,
    new_stock INTEGER,
    previous_price DECIMAL(10,2),
    new_price DECIMAL(10,2),
    
    -- 変更詳細
    change_type VARCHAR(20) NOT NULL, -- 'stock_change', 'price_change', 'both', 'initial'
    change_source VARCHAR(20) NOT NULL, -- 'yahoo', 'amazon', 'manual'
    
    -- パフォーマンス
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_product_time ON stock_history(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_type ON stock_history(change_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_created_at ON stock_history(created_at);

-- 4. 既存データの整合性チェック
-- yahoo_scraped_products に存在するが inventory_management に未登録の商品を表示
SELECT 
    ysp.id,
    ysp.active_title,
    ysp.price_jpy,
    ysp.created_at
FROM yahoo_scraped_products ysp
LEFT JOIN inventory_management im ON ysp.id = im.product_id
WHERE im.id IS NULL
  AND ysp.status = 'scraped'
ORDER BY ysp.created_at DESC
LIMIT 10;

-- 5. データベース統計情報
SELECT 
    'yahoo_scraped_products' as table_name,
    COUNT(*) as total_records
FROM yahoo_scraped_products
UNION ALL
SELECT 
    'inventory_management',
    COUNT(*)
FROM inventory_management
UNION ALL
SELECT 
    'stock_history',
    COUNT(*)
FROM stock_history;

-- 6. 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ データベーステーブル作成・拡張完了';
    RAISE NOTICE '  - yahoo_scraped_products: 拡張済み';
    RAISE NOTICE '  - inventory_management: 準備完了';
    RAISE NOTICE '  - stock_history: 準備完了';
END $$;
