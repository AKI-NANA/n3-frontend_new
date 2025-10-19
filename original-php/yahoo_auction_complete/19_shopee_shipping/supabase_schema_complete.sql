-- Supabase完全データベーススキーマ（Shopee 7ヶ国対応）
-- Geminiの最適化推奨に基づく統合テーブル + フィルター設計

-- ==================== 拡張機能有効化 ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==================== 基盤テーブル ====================

-- Shopee 7ヶ国マーケット定義
CREATE TABLE shopee_markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    market_code VARCHAR(20) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    currency_symbol VARCHAR(10),
    flag_emoji VARCHAR(10),
    
    -- 為替・価格関連
    exchange_rate_to_jpy DECIMAL(10,4) NOT NULL,
    exchange_rate_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Shopee手数料
    commission_rate DECIMAL(5,2) DEFAULT 5.00,
    payment_fee_rate DECIMAL(5,2) DEFAULT 2.00,
    
    -- 市場特性
    is_active BOOLEAN DEFAULT TRUE,
    data_quality_score INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX idx_shopee_markets_country_code ON shopee_markets(country_code);
CREATE INDEX idx_shopee_markets_active ON shopee_markets(is_active) WHERE is_active = TRUE;

-- ==================== 商品管理テーブル（統合設計） ====================

-- メイン商品テーブル（Gemini推奨の統合テーブル設計）
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    
    -- 商品基本情報
    product_name_ja TEXT NOT NULL,
    product_name_en TEXT NOT NULL,
    optimized_title TEXT, -- 国別最適化タイトル
    description TEXT,
    category_id INTEGER NOT NULL,
    
    -- 価格情報
    price_jpy DECIMAL(10,2) NOT NULL,
    local_price DECIMAL(10,2), -- 現地通貨価格
    local_currency VARCHAR(3),
    
    -- 物理属性
    weight_g INTEGER NOT NULL,
    dimensions_cm JSONB, -- {"length": 10, "width": 5, "height": 3}
    
    -- 在庫管理（オプティミスティックロック対応）
    stock_quantity INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0, -- 予約在庫
    version INTEGER DEFAULT 1, -- オプティミスティックロック用
    
    -- 画像・メディア
    image_urls JSONB, -- ["url1", "url2", ...]
    primary_image_url TEXT,
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, inactive, deleted
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    
    -- 国別カスタム設定
    country_specific_config JSONB, -- 国別の特別設定
    
    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT products_stock_non_negative CHECK (stock_quantity >= 0),
    CONSTRAINT products_reserved_stock_non_negative CHECK (reserved_stock >= 0),
    CONSTRAINT products_price_positive CHECK (price_jpy > 0),
    CONSTRAINT products_weight_positive CHECK (weight_g > 0)
);

-- 複合ユニーク制約（同一SKU・国での重複防止）
CREATE UNIQUE INDEX idx_products_sku_country ON products(sku, country_code);

-- パフォーマンス最適化インデックス（Gemini推奨）
CREATE INDEX idx_products_country_code ON products(country_code);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_published ON products(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_created_at ON products(created_at);

-- GINインデックス（JSONB検索用）
CREATE INDEX idx_products_image_urls_gin ON products USING GIN(image_urls);
CREATE INDEX idx_products_country_config_gin ON products USING GIN(country_specific_config);

-- ==================== 配送・送料テーブル ====================

-- 配送ゾーン定義
CREATE TABLE shopee_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    zone_code VARCHAR(10) NOT NULL,
    zone_name VARCHAR(200) NOT NULL,
    zone_description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country_code, zone_code)
);

-- 送料レート（Gemini推奨のJSONB活用）
CREATE TABLE shopee_sls_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    zone_code VARCHAR(10) NOT NULL,
    
    -- 重量範囲
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    
    -- 料金
    esf_amount DECIMAL(10,2) NOT NULL,
    actual_amount DECIMAL(10,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    
    -- 追加設定（JSONB活用）
    rate_config JSONB, -- {"bulk_discount": 0.1, "express_surcharge": 5.0}
    
    -- 有効期間
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 制約
    CONSTRAINT sls_rates_weight_range_valid CHECK (weight_from_g < weight_to_g),
    CONSTRAINT sls_rates_amounts_positive CHECK (esf_amount >= 0 AND actual_amount >= 0)
);

-- 送料計算用インデックス（パフォーマンス重要）
CREATE INDEX idx_sls_rates_country_zone ON shopee_sls_rates(country_code, zone_code);
CREATE INDEX idx_sls_rates_weight_range ON shopee_sls_rates(weight_from_g, weight_to_g);
CREATE INDEX idx_sls_rates_active ON shopee_sls_rates(is_active) WHERE is_active = TRUE;

-- ==================== コンプライアンス・禁止品テーブル ====================

-- 禁止品・規制データ
CREATE TABLE shopee_prohibited_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    
    -- 規制情報
    category_name VARCHAR(200),
    item_keywords TEXT[], -- PostgreSQL配列型
    prohibition_level VARCHAR(20) NOT NULL, -- 'BANNED', 'RESTRICTED', 'WARNING'
    restriction_details TEXT,
    
    -- 規制の根拠
    regulation_source VARCHAR(200), -- "Consumer Protection Act 2019"
    regulation_url TEXT,
    
    -- 有効性
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GINインデックス（配列検索用）
CREATE INDEX idx_prohibited_items_keywords_gin ON shopee_prohibited_items USING GIN(item_keywords);
CREATE INDEX idx_prohibited_items_country ON shopee_prohibited_items(country_code);
CREATE INDEX idx_prohibited_items_level ON shopee_prohibited_items(prohibition_level);

-- ==================== 在庫管理・イベントソーシング ====================

-- 在庫変動イベントログ（Gemini推奨のイベントソーシング軽量版）
CREATE TABLE inventory_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- 変動情報
    change_amount INTEGER NOT NULL, -- +10, -5など
    new_stock INTEGER NOT NULL,
    previous_stock INTEGER,
    
    -- 変動理由
    source VARCHAR(50) NOT NULL, -- 'api_update', 'shopee_sync', 'manual_adjust'
    reason TEXT,
    reference_id VARCHAR(100), -- 注文ID、調整IDなど
    
    -- メタデータ
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID, -- 操作ユーザー（auth.users参照）
    session_id VARCHAR(100),
    
    -- イベント詳細（JSONB）
    event_details JSONB -- {"order_id": "...", "platform": "shopee"}
);

-- 時系列インデックス（ログ検索用）
CREATE INDEX idx_inventory_events_sku_country ON inventory_events(sku, country_code);
CREATE INDEX idx_inventory_events_timestamp ON inventory_events(timestamp);
CREATE INDEX idx_inventory_events_source ON inventory_events(source);

-- パーティション（大量データ対応）
-- CREATE TABLE inventory_events_y2024m01 PARTITION OF inventory_events
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ==================== API・ログテーブル ====================

-- APIアクセスログ
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- リクエスト情報
    method VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL,
    country_code VARCHAR(3), -- 対象国
    
    -- ユーザー情報
    user_id UUID, -- auth.users参照
    ip_address INET,
    user_agent TEXT,
    
    -- レスポンス情報
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    
    -- エラー情報
    error_message TEXT,
    error_details JSONB,
    
    -- メタデータ
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    request_id VARCHAR(100)
);

-- ログ検索用インデックス
CREATE INDEX idx_api_logs_timestamp ON api_logs(timestamp);
CREATE INDEX idx_api_logs_country_code ON api_logs(country_code);
CREATE INDEX idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);

-- ==================== ユーザー・権限管理 ====================

-- ユーザープロファイル（Gemini推奨のJWT国別アクセス制御）
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 基本情報
    display_name VARCHAR(100),
    company_name VARCHAR(200),
    
    -- アクセス権限
    allowed_countries TEXT[] DEFAULT '{}', -- ['SG', 'MY', 'TH']
    role VARCHAR(50) DEFAULT 'user', -- 'admin', 'manager', 'user'
    
    -- 設定
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    language VARCHAR(5) DEFAULT 'ja',
    preferences JSONB DEFAULT '{}',
    
    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- ==================== Row Level Security (RLS) ポリシー ====================

-- productsテーブルのRLS有効化
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーの国別アクセス制御（Gemini推奨）
CREATE POLICY "products_country_access" ON products
    FOR ALL
    TO authenticated
    USING (
        country_code = ANY (
            SELECT unnest(allowed_countries) 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        country_code = ANY (
            SELECT unnest(allowed_countries) 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- 管理者は全アクセス可能
CREATE POLICY "products_admin_access" ON products
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- その他テーブルのRLS
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_events_country_access" ON inventory_events
    FOR ALL TO authenticated
    USING (
        country_code = ANY (
            SELECT unnest(allowed_countries) 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_logs_own_access" ON api_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- ==================== 初期データ投入 ====================

-- 7ヶ国マーケットデータ
INSERT INTO shopee_markets (country_code, country_name, market_code, currency_code, currency_symbol, flag_emoji, exchange_rate_to_jpy) VALUES
('SG', 'Singapore', 'SG_18046_18066', 'SGD', 'S$', '🇸🇬', 109.0),
('MY', 'Malaysia', 'MY_18047_18067', 'MYR', 'RM', '🇲🇾', 34.5),
('TH', 'Thailand', 'TH_18048_18068', 'THB', '฿', '🇹🇭', 4.2),
('PH', 'Philippines', 'PH_18049_18069', 'PHP', '₱', '🇵🇭', 2.7),
('ID', 'Indonesia', 'ID_18050_18070', 'IDR', 'Rp', '🇮🇩', 0.0098),
('VN', 'Vietnam', 'VN_18051_18071', 'VND', '₫', '🇻🇳', 0.0062),
('TW', 'Taiwan', 'TW_18052_18072', 'TWD', 'NT$', '🇹🇼', 4.8);

-- 各国の配送ゾーン設定
INSERT INTO shopee_zones (country_code, zone_code, zone_name, is_default) VALUES
-- シンガポール
('SG', 'A', 'Singapore Island', TRUE),

-- マレーシア
('MY', 'A', 'Peninsular Malaysia - Urban', TRUE),
('MY', 'B', 'Peninsular Malaysia - Rural', FALSE),
('MY', 'C', 'East Malaysia (Sabah/Sarawak)', FALSE),

-- タイ
('TH', 'A', 'Bangkok Metropolitan', TRUE),
('TH', 'B', 'Central Thailand', FALSE),
('TH', 'C', 'Northern/Southern Thailand', FALSE),

-- フィリピン
('PH', 'A', 'Metro Manila & Luzon', TRUE),
('PH', 'B', 'Visayas Region', FALSE),
('PH', 'C', 'Mindanao Region', FALSE),

-- インドネシア
('ID', 'A', 'Java Island (Jakarta, Surabaya)', TRUE),
('ID', 'B', 'Sumatra Island', FALSE),
('ID', 'C', 'Other Islands (Bali, Kalimantan)', FALSE),

-- ベトナム
('VN', 'A', 'Northern Vietnam (Hanoi)', TRUE),
('VN', 'B', 'Southern Vietnam (Ho Chi Minh)', FALSE),
('VN', 'C', 'Central Vietnam', FALSE),

-- 台湾
('TW', 'A', 'Taiwan Main Island', TRUE),
('TW', 'B', 'Outlying Islands', FALSE);

-- サンプル送料レート（実際の値は要調査）
INSERT INTO shopee_sls_rates (country_code, zone_code, weight_from_g, weight_to_g, esf_amount, actual_amount, currency_code) VALUES
-- シンガポール
('SG', 'A', 0, 500, 2.50, 3.50, 'SGD'),
('SG', 'A', 501, 1000, 3.50, 5.00, 'SGD'),
('SG', 'A', 1001, 2000, 5.00, 7.50, 'SGD'),

-- マレーシア
('MY', 'A', 0, 500, 3.00, 4.00, 'MYR'),
('MY', 'A', 501, 1000, 4.50, 6.00, 'MYR'),
('MY', 'B', 0, 500, 4.00, 6.00, 'MYR'),

-- タイ
('TH', 'A', 0, 500, 25.00, 35.00, 'THB'),
('TH', 'A', 501, 1000, 35.00, 50.00, 'THB'),

-- フィリピン
('PH', 'A', 0, 500, 65.00, 85.00, 'PHP'),
('PH', 'A', 501, 1000, 85.00, 120.00, 'PHP'),

-- インドネシア
('ID', 'A', 0, 500, 15000, 20000, 'IDR'),
('ID', 'A', 501, 1000, 22000, 30000, 'IDR'),

-- ベトナム
('VN', 'A', 0, 500, 25000, 35000, 'VND'),
('VN', 'A', 501, 1000, 35000, 50000, 'VND'),

-- 台湾
('TW', 'A', 0, 500, 60, 80, 'TWD'),
('TW', 'A', 501, 1000, 80, 120, 'TWD');

-- ==================== 関数・トリガー ====================

-- updated_at自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 自動更新トリガー設定
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopee_markets_updated_at 
    BEFORE UPDATE ON shopee_markets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sls_rates_updated_at 
    BEFORE UPDATE ON shopee_sls_rates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== パフォーマンス監視 ====================

-- クエリパフォーマンス監視ビュー
CREATE VIEW query_performance AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%products%' OR query LIKE '%shopee%'
ORDER BY total_time DESC;

-- 在庫レベル監視ビュー
CREATE VIEW low_stock_products AS
SELECT 
    p.sku,
    p.country_code,
    p.product_name_en,
    p.stock_quantity,
    p.reserved_stock,
    (p.stock_quantity - p.reserved_stock) AS available_stock
FROM products p
WHERE (p.stock_quantity - p.reserved_stock) <= 5
AND p.is_published = TRUE
ORDER BY available_stock ASC;

-- 国別在庫サマリー
CREATE VIEW country_inventory_summary AS
SELECT 
    p.country_code,
    m.country_name,
    COUNT(*) AS total_products,
    SUM(p.stock_quantity) AS total_stock,
    SUM(p.reserved_stock) AS total_reserved,
    AVG(p.stock_quantity) AS avg_stock_per_product
FROM products p
JOIN shopee_markets m ON p.country_code = m.country_code
WHERE p.is_published = TRUE
GROUP BY p.country_code, m.country_name
ORDER BY total_products DESC;

-- ==================== 完了 ====================

-- 初期化完了メッセージ
SELECT 'Shopee 7ヶ国対応データベース初期化完了！' AS status;