-- Yahoo Auction Tool 承認システム統合用データベーススキーマ（完全版）
-- PostgreSQL用（N3統合版）

-- まず基本テーブルを作成
CREATE TABLE IF NOT EXISTS yahoo_products (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    sku VARCHAR(100),
    title_jp TEXT,
    title_en TEXT,
    description_jp TEXT,
    description_en TEXT,
    price_jpy DECIMAL(10,2),
    price_usd DECIMAL(10,2),
    cost_price_jpy DECIMAL(10,2),
    profit_margin DECIMAL(5,2) DEFAULT 0.00,
    weight_kg DECIMAL(8,3),
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    shipping_usd DECIMAL(10,2),
    category_jp VARCHAR(200),
    category_en VARCHAR(200),
    platform VARCHAR(50) DEFAULT 'yahoo',
    image_urls TEXT,
    main_image_url TEXT,
    yahoo_url TEXT,
    seller_name VARCHAR(200),
    end_time TIMESTAMP,
    status VARCHAR(50) DEFAULT 'scraped',
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    
    -- 承認システム関連カラム
    ai_recommendation VARCHAR(20) DEFAULT 'pending'
        CHECK (ai_recommendation IN ('approved', 'rejected', 'pending')),
    risk_level VARCHAR(20) DEFAULT 'low'
        CHECK (risk_level IN ('low', 'medium', 'high')),
    approval_status VARCHAR(50) DEFAULT 'pending',
    approved_at TIMESTAMP,
    approved_by VARCHAR(100) DEFAULT 'system',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 出品キューテーブル作成
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

-- 承認履歴テーブル作成
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

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_yahoo_products_product_id ON yahoo_products(product_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_status ON yahoo_products(status);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_ai_recommendation ON yahoo_products(ai_recommendation);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_risk_level ON yahoo_products(risk_level);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_approval_status ON yahoo_products(approval_status);
CREATE INDEX IF NOT EXISTS idx_yahoo_products_platform ON yahoo_products(platform);

CREATE INDEX IF NOT EXISTS idx_listing_queue_product_id ON listing_queue(product_id);
CREATE INDEX IF NOT EXISTS idx_listing_queue_status ON listing_queue(listing_status);
CREATE INDEX IF NOT EXISTS idx_approval_history_product_id ON approval_history(product_id);

-- トリガー関数作成（自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
DROP TRIGGER IF EXISTS update_yahoo_products_updated_at ON yahoo_products;
CREATE TRIGGER update_yahoo_products_updated_at
    BEFORE UPDATE ON yahoo_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_listing_queue_updated_at ON listing_queue;
CREATE TRIGGER update_listing_queue_updated_at
    BEFORE UPDATE ON listing_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 統計ビュー作成
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

-- サンプルデータ投入（テスト用）
INSERT INTO yahoo_products (
    product_id, title_jp, price_jpy, price_usd, profit_margin, current_stock,
    platform, category_jp, ai_recommendation, risk_level, status
) VALUES 
(
    'YA001', 
    'Nintendo Switch 本体 有機ELモデル ホワイト', 
    35800, 241.22, 25.5, 1,
    'yahoo', 'ゲーム・おもちゃ', 'approved', 'low', 'ready_for_approval'
),
(
    'YA002',
    'Apple AirPods Pro (第2世代) USB-C',
    28000, 188.81, 18.2, 2,
    'yahoo', 'オーディオ機器', 'pending', 'medium', 'ready_for_approval'  
),
(
    'YA003',
    'ルイヴィトン モノグラム バッグ',
    120000, 809.46, 45.0, 1,
    'yahoo', 'ファッション', 'rejected', 'high', 'ready_for_approval'
),
(
    'YA004',
    'SONY WH-1000XM4 ワイヤレスヘッドホン',
    25000, 168.57, 22.1, 3,
    'yahoo', 'オーディオ機器', 'approved', 'low', 'ready_for_approval'
),
(
    'YA005',
    'ポケモンカード 未開封BOX',
    8500, 57.30, 35.8, 5,
    'yahoo', 'トレーディングカード', 'approved', 'low', 'ready_for_approval'
)
ON CONFLICT (product_id) DO UPDATE SET
    title_jp = EXCLUDED.title_jp,
    price_jpy = EXCLUDED.price_jpy,
    price_usd = EXCLUDED.price_usd,
    updated_at = CURRENT_TIMESTAMP;

-- スキーマ更新完了
SELECT 'Yahoo Auction Tool承認システム統合用データベーススキーマ（完全版）の設定が完了しました。' as setup_complete,
       'サンプルデータ ' || COUNT(*) || ' 件を投入しました。' as sample_data_info
FROM yahoo_products;