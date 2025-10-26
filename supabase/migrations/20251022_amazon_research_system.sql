-- Amazon商品リサーチデータ（メインテーブル）
CREATE TABLE IF NOT EXISTS amazon_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asin VARCHAR(10) UNIQUE NOT NULL,

    -- 基本情報
    title TEXT NOT NULL,
    brand VARCHAR(255),
    manufacturer VARCHAR(255),
    product_group VARCHAR(100),
    binding VARCHAR(100),

    -- 価格・在庫情報
    current_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    savings_amount DECIMAL(10,2),
    savings_percentage DECIMAL(5,2),

    -- 在庫状況
    availability_status VARCHAR(50),
    availability_message TEXT,
    max_order_quantity INTEGER,
    min_order_quantity INTEGER DEFAULT 1,

    -- プライム・配送情報
    is_prime_eligible BOOLEAN DEFAULT FALSE,
    is_free_shipping_eligible BOOLEAN DEFAULT FALSE,
    is_amazon_fulfilled BOOLEAN DEFAULT FALSE,
    shipping_charges DECIMAL(8,2),

    -- レビュー・評価
    review_count INTEGER DEFAULT 0,
    star_rating DECIMAL(3,2),

    -- ランキング情報（JSON）
    sales_rank JSONB,
    category_ranks JSONB,

    -- 画像情報（JSON配列）
    images_primary JSONB,
    images_variants JSONB,

    -- 商品詳細情報（JSON）
    features JSONB,
    product_dimensions JSONB,
    item_specifics JSONB,
    technical_details JSONB,

    -- カテゴリ情報
    browse_nodes JSONB,

    -- 関連商品情報
    parent_asin VARCHAR(10),
    variation_summary JSONB,

    -- 外部ID
    external_ids JSONB,

    -- メーカー・販売者情報
    merchant_info JSONB,

    -- プロモーション情報
    promotions JSONB,

    -- 利益計算・スコアリング
    profit_score INTEGER DEFAULT 0,
    profit_amount DECIMAL(10,2),
    roi_percentage DECIMAL(5,2),
    ebay_competitive_price DECIMAL(10,2),
    ebay_lowest_price DECIMAL(10,2),
    seller_mirror_data JSONB,

    -- 監視・管理情報
    is_high_priority BOOLEAN DEFAULT FALSE,
    is_listed_on_ebay BOOLEAN DEFAULT FALSE,
    price_fluctuation_count INTEGER DEFAULT 0,
    stock_change_count INTEGER DEFAULT 0,

    -- チェック履歴
    last_price_check_at TIMESTAMPTZ,
    last_stock_check_at TIMESTAMPTZ,
    last_api_update_at TIMESTAMPTZ,
    last_profit_calculation_at TIMESTAMPTZ,

    -- データ品質管理
    data_completeness_score DECIMAL(3,2) DEFAULT 0.00,
    api_error_count INTEGER DEFAULT 0,
    last_api_error TEXT,

    -- システム情報
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- データ取得元・バージョン管理
    api_version VARCHAR(10) DEFAULT '5.0',
    marketplace VARCHAR(10) DEFAULT 'US',
    data_source VARCHAR(20) DEFAULT 'PA-API',

    -- ユーザー管理
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- 全文検索用
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(brand, ''))
    ) STORED
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_amazon_products_asin ON amazon_products(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_products_user_id ON amazon_products(user_id);
CREATE INDEX IF NOT EXISTS idx_amazon_products_profit_score ON amazon_products(profit_score DESC);
CREATE INDEX IF NOT EXISTS idx_amazon_products_availability ON amazon_products(availability_status);
CREATE INDEX IF NOT EXISTS idx_amazon_products_search_vector ON amazon_products USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_amazon_products_created_at ON amazon_products(created_at DESC);

-- 価格履歴テーブル
CREATE TABLE IF NOT EXISTS amazon_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES amazon_products(id) ON DELETE CASCADE,
    asin VARCHAR(10) NOT NULL,

    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    price_type VARCHAR(20) DEFAULT 'listing',

    previous_price DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    change_percentage DECIMAL(5,2),

    availability_status VARCHAR(50),
    is_prime_eligible BOOLEAN,
    promotion_active BOOLEAN DEFAULT FALSE,

    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    detection_method VARCHAR(20) DEFAULT 'scheduled',

    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON amazon_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_asin ON amazon_price_history(asin);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON amazon_price_history(recorded_at DESC);

-- 在庫変動履歴テーブル
CREATE TABLE IF NOT EXISTS amazon_stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES amazon_products(id) ON DELETE CASCADE,
    asin VARCHAR(10) NOT NULL,

    availability_status VARCHAR(50) NOT NULL,
    availability_message TEXT,
    previous_status VARCHAR(50),

    stock_quantity INTEGER,
    max_order_quantity INTEGER,
    min_order_quantity INTEGER,

    status_changed BOOLEAN DEFAULT FALSE,
    back_in_stock BOOLEAN DEFAULT FALSE,
    out_of_stock BOOLEAN DEFAULT FALSE,

    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    detection_method VARCHAR(20) DEFAULT 'scheduled',

    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON amazon_stock_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_asin ON amazon_stock_history(asin);
CREATE INDEX IF NOT EXISTS idx_stock_history_recorded_at ON amazon_stock_history(recorded_at DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE amazon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_stock_history ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分のデータのみアクセス可能
DROP POLICY IF EXISTS "Users can view their own amazon products" ON amazon_products;
CREATE POLICY "Users can view their own amazon products"
    ON amazon_products FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own amazon products" ON amazon_products;
CREATE POLICY "Users can insert their own amazon products"
    ON amazon_products FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own amazon products" ON amazon_products;
CREATE POLICY "Users can update their own amazon products"
    ON amazon_products FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own amazon products" ON amazon_products;
CREATE POLICY "Users can delete their own amazon products"
    ON amazon_products FOR DELETE
    USING (auth.uid() = user_id);

-- 価格履歴と在庫履歴も同様のポリシー
DROP POLICY IF EXISTS "Users can view their own price history" ON amazon_price_history;
CREATE POLICY "Users can view their own price history"
    ON amazon_price_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM amazon_products
            WHERE amazon_products.id = amazon_price_history.product_id
            AND amazon_products.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own price history" ON amazon_price_history;
CREATE POLICY "Users can insert their own price history"
    ON amazon_price_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM amazon_products
            WHERE amazon_products.id = amazon_price_history.product_id
            AND amazon_products.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view their own stock history" ON amazon_stock_history;
CREATE POLICY "Users can view their own stock history"
    ON amazon_stock_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM amazon_products
            WHERE amazon_products.id = amazon_stock_history.product_id
            AND amazon_products.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert their own stock history" ON amazon_stock_history;
CREATE POLICY "Users can insert their own stock history"
    ON amazon_stock_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM amazon_products
            WHERE amazon_products.id = amazon_stock_history.product_id
            AND amazon_products.user_id = auth.uid()
        )
    );
