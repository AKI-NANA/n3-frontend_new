-- Yahoo Auction Tool 承認システム統合用データベーススキーマ
-- PostgreSQL用（N3統合版）

-- 1. 既存テーブルに承認関連カラム追加
ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS ai_recommendation VARCHAR(20) DEFAULT 'pending'
    CHECK (ai_recommendation IN ('approved', 'rejected', 'pending'));

ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high'));

ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100) DEFAULT 'system';

ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE yahoo_products 
ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

-- 2. 出品キューテーブル作成
CREATE TABLE IF NOT EXISTS listing_queue (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    listing_status VARCHAR(20) DEFAULT 'queued'
        CHECK (listing_status IN ('queued', 'processing', 'listed', 'failed', 'cancelled')),
    ebay_item_id VARCHAR(50),
    listing_created_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_product_queue UNIQUE (product_id)
);

-- 3. 承認履歴テーブル作成
CREATE TABLE IF NOT EXISTS approval_history (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('approved', 'rejected', 'hold')),
    decision_by VARCHAR(100) DEFAULT 'system',
    ai_recommendation VARCHAR(20),
    risk_level VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_yahoo_products_status ON yahoo_products(status);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_ai_recommendation ON yahoo_products(ai_recommendation);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_risk_level ON yahoo_products(risk_level);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_approval_status ON yahoo_products(approval_status);

CREATE INDEX IF NOT EXISTS idx_listing_queue_status ON listing_queue(listing_status);
CREATE INDEX IF NOT EXISTS idx_approval_history_product_id ON approval_history(product_id);

-- 5. トリガー関数作成（自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. トリガー設定
DROP TRIGGER IF EXISTS update_listing_queue_updated_at ON listing_queue;
CREATE TRIGGER update_listing_queue_updated_at
    BEFORE UPDATE ON listing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. 統計ビュー作成
CREATE OR REPLACE VIEW approval_statistics AS
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN status = 'ready_for_approval' THEN 1 END) as pending_approval,
    COUNT(CASE WHEN status = 'approved_for_listing' THEN 1 END) as approved_items,
    COUNT(CASE WHEN status = 'listed' THEN 1 END) as listed_items,
    COUNT(CASE WHEN ai_recommendation = 'approved' THEN 1 END) as ai_approved,
    COUNT(CASE WHEN ai_recommendation = 'rejected' THEN 1 END) as ai_rejected,
    COUNT(CASE WHEN ai_recommendation = 'pending' THEN 1 END) as ai_pending,
    COALESCE(AVG(profit_margin), 0) as avg_profit_margin
FROM yahoo_products
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- スキーマ更新完了
SELECT 'Yahoo Auction Tool承認システム統合用データベーススキーマの設定が完了しました。' as setup_complete;