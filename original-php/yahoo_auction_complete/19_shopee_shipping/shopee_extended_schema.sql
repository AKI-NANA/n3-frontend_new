-- Shopee拡張データベーススキーマ（API連携・利益計算対応）
-- 実際のShopee Partner API連携に必要なテーブル追加

-- ==================== Shopee API管理テーブル ====================

-- Shopee Partner API設定
CREATE TABLE shopee_api_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    
    -- API認証情報
    partner_id BIGINT NOT NULL,
    partner_key TEXT NOT NULL, -- 暗号化推奨
    shop_id BIGINT NOT NULL,
    access_token TEXT NOT NULL, -- 暗号化推奨
    refresh_token TEXT NOT NULL, -- 暗号化推奨
    
    -- API設定
    base_url TEXT NOT NULL,
    api_version VARCHAR(10) DEFAULT 'v2',
    
    -- トークン管理
    token_expires_at TIMESTAMPTZ,
    last_token_refresh TIMESTAMPTZ,
    
    -- ステータス
    is_active BOOLEAN DEFAULT TRUE,
    last_success_call TIMESTAMPTZ,
    last_error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country_code, shop_id)
);

-- Shopeeカテゴリーマッピング
CREATE TABLE shopee_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    
    -- Shopeeカテゴリー情報
    shopee_category_id BIGINT NOT NULL,
    category_name TEXT NOT NULL,
    parent_category_id BIGINT,
    category_path TEXT, -- "Electronics > Audio > Headphones"
    
    -- 属性情報
    attributes JSONB, -- カテゴリー固有の属性
    brand_required BOOLEAN DEFAULT FALSE,
    size_chart_required BOOLEAN DEFAULT FALSE,
    
    -- マッピング情報
    internal_category_id INTEGER, -- 内部カテゴリーID
    ebay_category_id INTEGER, -- eBayカテゴリーID
    mapping_confidence INTEGER DEFAULT 100, -- マッピング信頼度
    
    -- メタデータ
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country_code, shopee_category_id)
);

-- Shopeeブランドマッピング
CREATE TABLE shopee_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    category_id BIGINT NOT NULL,
    
    -- ブランド情報
    shopee_brand_id BIGINT NOT NULL,
    brand_name TEXT NOT NULL,
    original_brand_name TEXT,
    
    -- マッピング
    internal_brand_name TEXT,
    brand_aliases TEXT[], -- ブランド別名
    
    -- メタデータ
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(country_code, shopee_brand_id)
);

-- ==================== 出品管理テーブル ====================

-- Shopee出品記録
CREATE TABLE shopee_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 基本情報
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    
    -- Shopee情報
    shopee_item_id BIGINT,
    shopee_item_sku TEXT,
    shopee_item_name TEXT,
    
    -- ステータス管理
    listing_status VARCHAR(20) DEFAULT 'draft', -- draft, pending, active, inactive, deleted, error
    last_sync_status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    last_sync_at TIMESTAMPTZ,
    last_error_message TEXT,
    
    -- 元データ
    source_system VARCHAR(50), -- 'ebay', 'yahoo', 'manual'
    source_item_id TEXT,
    original_data JSONB,
    
    -- Shopee送信データ
    shopee_request_data JSONB,
    shopee_response_data JSONB,
    
    -- 価格・在庫
    current_price_local DECIMAL(10,2),
    current_stock INTEGER DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0,
    
    -- パフォーマンス指標
    view_count INTEGER DEFAULT 0,
    wishlist_count INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    
    -- 利益分析データ
    profit_analysis_data JSONB,
    last_profit_calculation TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sku, country_code)
);

-- インデックス作成
CREATE INDEX idx_shopee_listings_sku ON shopee_listings(sku);
CREATE INDEX idx_shopee_listings_country ON shopee_listings(country_code);
CREATE INDEX idx_shopee_listings_status ON shopee_listings(listing_status);
CREATE INDEX idx_shopee_listings_shopee_item_id ON shopee_listings(shopee_item_id);
CREATE INDEX idx_shopee_listings_sync_status ON shopee_listings(last_sync_status);

-- ==================== 利益計算テーブル ====================

-- 商品原価マスター
CREATE TABLE product_cost_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    
    -- 原価情報
    purchase_price_jpy DECIMAL(10,2) NOT NULL,
    domestic_shipping_jpy DECIMAL(10,2) DEFAULT 500,
    processing_fee_jpy DECIMAL(10,2) DEFAULT 0,
    packaging_cost_jpy DECIMAL(10,2) DEFAULT 100,
    other_costs_jpy DECIMAL(10,2) DEFAULT 0,
    
    -- 計算値
    total_cost_jpy DECIMAL(10,2) GENERATED ALWAYS AS (
        purchase_price_jpy + domestic_shipping_jpy + processing_fee_jpy + packaging_cost_jpy + other_costs_jpy
    ) STORED,
    
    -- メタデータ
    cost_source VARCHAR(50), -- 'manual', 'ebay', 'yahoo', 'calculated'
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(sku)
);

-- 利益計算履歴
CREATE TABLE profit_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL REFERENCES shopee_markets(country_code),
    
    -- 計算条件
    selling_price_local DECIMAL(10,2) NOT NULL,
    selling_price_jpy DECIMAL(10,2) NOT NULL,
    weight_g INTEGER NOT NULL,
    zone_code VARCHAR(10) DEFAULT 'A',
    
    -- 原価内訳
    purchase_price_jpy DECIMAL(10,2) NOT NULL,
    domestic_shipping_jpy DECIMAL(10,2) DEFAULT 0,
    processing_fee_jpy DECIMAL(10,2) DEFAULT 0,
    packaging_cost_jpy DECIMAL(10,2) DEFAULT 0,
    total_cost_jpy DECIMAL(10,2) NOT NULL,
    
    -- Shopee手数料内訳
    commission_fee_jpy DECIMAL(10,2) NOT NULL,
    payment_fee_jpy DECIMAL(10,2) NOT NULL,
    withdrawal_fee_jpy DECIMAL(10,2) DEFAULT 0,
    advertising_fee_jpy DECIMAL(10,2) DEFAULT 0,
    total_shopee_fees_jpy DECIMAL(10,2) NOT NULL,
    
    -- 送料内訳
    esf_fee_jpy DECIMAL(10,2) NOT NULL,
    actual_shipping_jpy DECIMAL(10,2) NOT NULL,
    seller_shipping_benefit_jpy DECIMAL(10,2) NOT NULL,
    
    -- 利益計算結果
    gross_profit_jpy DECIMAL(10,2) NOT NULL, -- 売上 - 原価
    net_profit_jpy DECIMAL(10,2) NOT NULL,   -- 粗利 - 手数料 + 送料利益
    profit_margin_percent DECIMAL(5,2) NOT NULL,
    roi_percent DECIMAL(5,2) NOT NULL,
    
    -- 分析結果
    break_even_price_jpy DECIMAL(10,2) NOT NULL,
    recommended_price_jpy DECIMAL(10,2) NOT NULL,
    competitiveness_score INTEGER CHECK (competitiveness_score >= 0 AND competitiveness_score <= 100),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    
    -- 計算メタデータ
    calculation_version VARCHAR(10) DEFAULT '1.0',
    exchange_rate DECIMAL(10,4) NOT NULL,
    calculation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_latest BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 利益計算インデックス
CREATE INDEX idx_profit_calculations_sku ON profit_calculations(sku);
CREATE INDEX idx_profit_calculations_country ON profit_calculations(country_code);
CREATE INDEX idx_profit_calculations_timestamp ON profit_calculations(calculation_timestamp);
CREATE INDEX idx_profit_calculations_latest ON profit_calculations(is_latest) WHERE is_latest = TRUE;

-- ==================== API呼び出し履歴テーブル ====================

-- Shopee API呼び出しログ
CREATE TABLE shopee_api_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code VARCHAR(3) NOT NULL,
    
    -- API情報
    api_endpoint TEXT NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    partner_id BIGINT NOT NULL,
    shop_id BIGINT NOT NULL,
    
    -- リクエスト情報
    request_data JSONB,
    request_headers JSONB,
    request_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- レスポンス情報
    response_status_code INTEGER,
    response_data JSONB,
    response_headers JSONB,
    response_timestamp TIMESTAMPTZ,
    response_time_ms INTEGER,
    
    -- エラー情報
    error_code VARCHAR(50),
    error_message TEXT,
    is_success BOOLEAN DEFAULT FALSE,
    
    -- 関連情報
    operation_type VARCHAR(50), -- 'add_item', 'update_stock', 'get_categories'
    related_sku VARCHAR(100),
    related_item_id BIGINT,
    
    -- メタデータ
    user_id UUID, -- 操作ユーザー
    session_id VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API呼び出しログのインデックス
CREATE INDEX idx_api_calls_timestamp ON shopee_api_calls(request_timestamp);
CREATE INDEX idx_api_calls_country ON shopee_api_calls(country_code);
CREATE INDEX idx_api_calls_endpoint ON shopee_api_calls(api_endpoint);
CREATE INDEX idx_api_calls_success ON shopee_api_calls(is_success);
CREATE INDEX idx_api_calls_operation ON shopee_api_calls(operation_type);

-- ==================== 価格監視・競合分析テーブル ====================

-- 価格履歴
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- 価格情報
    price_local DECIMAL(10,2) NOT NULL,
    price_jpy DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    
    -- 変更情報
    price_change_reason VARCHAR(100), -- 'manual', 'auto_optimization', 'competitor_match'
    previous_price_local DECIMAL(10,2),
    price_change_percentage DECIMAL(5,2),
    
    -- 効果測定
    views_before INTEGER DEFAULT 0,
    views_after INTEGER DEFAULT 0,
    sales_before INTEGER DEFAULT 0,
    sales_after INTEGER DEFAULT 0,
    
    -- メタデータ
    changed_by VARCHAR(100),
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 競合商品情報
CREATE TABLE competitor_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    our_sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- 競合商品情報
    competitor_platform VARCHAR(50), -- 'shopee', 'lazada', 'tokopedia'
    competitor_item_id TEXT,
    competitor_shop_name TEXT,
    competitor_item_name TEXT,
    competitor_price_local DECIMAL(10,2),
    competitor_currency VARCHAR(3),
    
    -- 比較指標
    price_difference_percent DECIMAL(5,2),
    rating_score DECIMAL(3,2),
    review_count INTEGER,
    sold_count INTEGER,
    
    -- 特徴比較
    features_comparison JSONB,
    quality_assessment TEXT,
    
    -- データ取得情報
    data_source VARCHAR(50), -- 'manual', 'scraping', 'api'
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== 在庫管理拡張テーブル ====================

-- 在庫予約管理
CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    
    -- 予約情報
    reserved_quantity INTEGER NOT NULL,
    reservation_type VARCHAR(50), -- 'order', 'promotion', 'manual'
    reservation_reason TEXT,
    
    -- 関連情報
    order_id TEXT,
    customer_id TEXT,
    promotion_id TEXT,
    
    -- 期限管理
    reserved_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    
    -- ステータス
    status VARCHAR(20) DEFAULT 'active', -- active, expired, released, fulfilled
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 在庫アラート設定
CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) NOT NULL,
    country_code VARCHAR(3),
    
    -- アラート設定
    alert_type VARCHAR(50) NOT NULL, -- 'low_stock', 'out_of_stock', 'overstock'
    threshold_value INTEGER NOT NULL,
    alert_message TEXT,
    
    -- 通知設定
    notification_methods TEXT[], -- ['email', 'slack', 'webhook']
    notification_recipients TEXT[],
    
    -- ステータス
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ビュー作成 ====================

-- 出品状況サマリー
CREATE VIEW listing_summary AS
SELECT 
    l.country_code,
    m.country_name,
    COUNT(*) as total_listings,
    COUNT(CASE WHEN l.listing_status = 'active' THEN 1 END) as active_listings,
    COUNT(CASE WHEN l.listing_status = 'inactive' THEN 1 END) as inactive_listings,
    COUNT(CASE WHEN l.listing_status = 'error' THEN 1 END) as error_listings,
    SUM(l.current_stock) as total_stock,
    AVG(l.current_price_local) as avg_price_local,
    SUM(l.sold_count) as total_sold
FROM shopee_listings l
JOIN shopee_markets m ON l.country_code = m.country_code
GROUP BY l.country_code, m.country_name;

-- 利益分析サマリー
CREATE VIEW profit_summary AS
SELECT 
    pc.country_code,
    COUNT(*) as calculated_products,
    AVG(pc.profit_margin_percent) as avg_profit_margin,
    AVG(pc.roi_percent) as avg_roi,
    SUM(pc.net_profit_jpy) as total_net_profit_jpy,
    AVG(pc.competitiveness_score) as avg_competitiveness,
    AVG(pc.risk_score) as avg_risk_score,
    COUNT(CASE WHEN pc.profit_margin_percent > 20 THEN 1 END) as high_margin_products,
    COUNT(CASE WHEN pc.profit_margin_percent < 10 THEN 1 END) as low_margin_products
FROM profit_calculations pc
WHERE pc.is_latest = TRUE
GROUP BY pc.country_code;

-- API使用状況サマリー
CREATE VIEW api_usage_summary AS
SELECT 
    country_code,
    DATE(request_timestamp) as call_date,
    COUNT(*) as total_calls,
    COUNT(CASE WHEN is_success = TRUE THEN 1 END) as successful_calls,
    COUNT(CASE WHEN is_success = FALSE THEN 1 END) as failed_calls,
    AVG(response_time_ms) as avg_response_time_ms,
    COUNT(DISTINCT operation_type) as operation_types_used
FROM shopee_api_calls
GROUP BY country_code, DATE(request_timestamp)
ORDER BY call_date DESC;

-- 在庫アラート状況
CREATE VIEW inventory_alert_status AS
SELECT 
    ia.sku,
    ia.country_code,
    l.current_stock,
    ia.alert_type,
    ia.threshold_value,
    CASE 
        WHEN ia.alert_type = 'low_stock' AND l.current_stock <= ia.threshold_value THEN TRUE
        WHEN ia.alert_type = 'out_of_stock' AND l.current_stock = 0 THEN TRUE
        WHEN ia.alert_type = 'overstock' AND l.current_stock >= ia.threshold_value THEN TRUE
        ELSE FALSE
    END as alert_triggered,
    ia.last_triggered,
    ia.is_active
FROM inventory_alerts ia
LEFT JOIN shopee_listings l ON ia.sku = l.sku AND ia.country_code = l.country_code
WHERE ia.is_active = TRUE;

-- ==================== 関数・プロシージャ ====================

-- 利益計算関数
CREATE OR REPLACE FUNCTION calculate_profit_for_sku(
    p_sku VARCHAR(100),
    p_country_code VARCHAR(3),
    p_selling_price_local DECIMAL(10,2),
    p_weight_g INTEGER DEFAULT 100
) RETURNS TABLE (
    net_profit_jpy DECIMAL(10,2),
    profit_margin_percent DECIMAL(5,2),
    roi_percent DECIMAL(5,2),
    break_even_price_jpy DECIMAL(10,2)
) AS $
DECLARE
    v_cost_data RECORD;
    v_market_config RECORD;
    v_shipping_data RECORD;
    v_selling_price_jpy DECIMAL(10,2);
    v_commission_fee DECIMAL(10,2);
    v_payment_fee DECIMAL(10,2);
    v_total_fees DECIMAL(10,2);
    v_gross_profit DECIMAL(10,2);
    v_net_profit DECIMAL(10,2);
    v_profit_margin DECIMAL(5,2);
    v_roi DECIMAL(5,2);
    v_break_even DECIMAL(10,2);
BEGIN
    -- 原価データ取得
    SELECT * INTO v_cost_data 
    FROM product_cost_master 
    WHERE sku = p_sku AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SKU % の原価データが見つかりません', p_sku;
    END IF;
    
    -- 市場設定取得
    SELECT * INTO v_market_config 
    FROM shopee_markets 
    WHERE country_code = p_country_code;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION '国コード % の市場設定が見つかりません', p_country_code;
    END IF;
    
    -- 円換算価格
    v_selling_price_jpy := p_selling_price_local * v_market_config.exchange_rate_to_jpy;
    
    -- 手数料計算
    v_commission_fee := v_selling_price_jpy * (v_market_config.commission_rate / 100);
    v_payment_fee := v_selling_price_jpy * (v_market_config.payment_fee_rate / 100);
    v_total_fees := v_commission_fee + v_payment_fee;
    
    -- 送料取得（簡易版）
    SELECT 
        (esf_amount * v_market_config.exchange_rate_to_jpy) as esf_jpy,
        (actual_amount * v_market_config.exchange_rate_to_jpy) as actual_jpy
    INTO v_shipping_data
    FROM shopee_sls_rates 
    WHERE country_code = p_country_code 
      AND weight_from_g <= p_weight_g 
      AND weight_to_g >= p_weight_g
      AND is_active = TRUE
    LIMIT 1;
    
    IF NOT FOUND THEN
        -- デフォルト送料
        v_shipping_data.esf_jpy := 500;
        v_shipping_data.actual_jpy := 300;
    END IF;
    
    -- 利益計算
    v_gross_profit := v_selling_price_jpy - v_cost_data.total_cost_jpy;
    v_net_profit := v_gross_profit - v_total_fees + (v_shipping_data.esf_jpy - v_shipping_data.actual_jpy);
    
    -- 率計算
    v_profit_margin := CASE 
        WHEN v_selling_price_jpy > 0 THEN (v_net_profit / v_selling_price_jpy) * 100 
        ELSE 0 
    END;
    
    v_roi := CASE 
        WHEN v_cost_data.total_cost_jpy > 0 THEN (v_net_profit / v_cost_data.total_cost_jpy) * 100 
        ELSE 0 
    END;
    
    -- 損益分岐点
    v_break_even := v_cost_data.total_cost_jpy + v_total_fees - (v_shipping_data.esf_jpy - v_shipping_data.actual_jpy);
    
    -- 結果返却
    RETURN QUERY SELECT v_net_profit, v_profit_margin, v_roi, v_break_even;
END;
$ LANGUAGE plpgsql;

-- 在庫アラートチェック関数
CREATE OR REPLACE FUNCTION check_inventory_alerts()
RETURNS INTEGER AS $
DECLARE
    alert_record RECORD;
    triggered_count INTEGER := 0;
BEGIN
    FOR alert_record IN 
        SELECT * FROM inventory_alert_status WHERE alert_triggered = TRUE
    LOOP
        -- アラート通知処理（実装は省略）
        INSERT INTO api_logs (
            method, endpoint, country_code, status_code, 
            timestamp, request_id
        ) VALUES (
            'ALERT', '/inventory/alert', alert_record.country_code, 200,
            NOW(), 'alert-' || alert_record.sku
        );
        
        -- 最終トリガー時刻更新
        UPDATE inventory_alerts 
        SET last_triggered = NOW(), trigger_count = trigger_count + 1
        WHERE sku = alert_record.sku 
          AND country_code = alert_record.country_code
          AND alert_type = alert_record.alert_type;
          
        triggered_count := triggered_count + 1;
    END LOOP;
    
    RETURN triggered_count;
END;
$ LANGUAGE plpgsql;

-- ==================== トリガー ====================

-- 在庫変更時の自動アラートチェック
CREATE OR REPLACE FUNCTION trigger_inventory_alert_check()
RETURNS TRIGGER AS $
BEGIN
    -- 在庫が変更された場合のみ実行
    IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
        PERFORM check_inventory_alerts();
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER shopee_listings_stock_change
    AFTER UPDATE OF current_stock ON shopee_listings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_inventory_alert_check();

-- 利益計算の最新フラグ管理
CREATE OR REPLACE FUNCTION manage_latest_profit_calculation()
RETURNS TRIGGER AS $
BEGIN
    -- 同じSKU・国の過去の計算結果のlatestフラグをFALSEに
    UPDATE profit_calculations 
    SET is_latest = FALSE 
    WHERE sku = NEW.sku 
      AND country_code = NEW.country_code 
      AND id != NEW.id;
    
    -- 新しいレコードのlatestフラグをTRUEに
    NEW.is_latest := TRUE;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER profit_calculations_latest_flag
    BEFORE INSERT ON profit_calculations
    FOR EACH ROW
    EXECUTE FUNCTION manage_latest_profit_calculation();

-- ==================== サンプルデータ投入 ====================

-- サンプルAPI設定（テスト用）
INSERT INTO shopee_api_configs (
    country_code, partner_id, partner_key, shop_id, 
    access_token, refresh_token, base_url
) VALUES 
('SG', 123456, 'test-partner-key-sg', 789012, 
 'test-access-token-sg', 'test-refresh-token-sg', 'https://partner.shopeemobile.com'),
('MY', 123456, 'test-partner-key-my', 789013, 
 'test-access-token-my', 'test-refresh-token-my', 'https://partner.shopeemobile.com'),
('TH', 123456, 'test-partner-key-th', 789014, 
 'test-access-token-th', 'test-refresh-token-th', 'https://partner.uat.shopeemobile.com');

-- サンプルカテゴリー
INSERT INTO shopee_categories (
    country_code, shopee_category_id, category_name, parent_category_id, 
    category_path, internal_category_id
) VALUES 
('SG', 100001, 'Electronics', NULL, 'Electronics', 1001),
('SG', 100002, 'Mobile & Gadgets', 100001, 'Electronics > Mobile & Gadgets', 1002),
('SG', 100003, 'Audio', 100001, 'Electronics > Audio', 1003),
('MY', 100001, 'Electronics', NULL, 'Electronics', 1001),
('MY', 100002, 'Mobile & Gadgets', 100001, 'Electronics > Mobile & Gadgets', 1002),
('TH', 100001, 'Electronics', NULL, 'Electronics', 1001);

-- サンプル原価データ
INSERT INTO product_cost_master (
    sku, purchase_price_jpy, domestic_shipping_jpy, 
    processing_fee_jpy, packaging_cost_jpy, cost_source
) VALUES 
('PROD-001', 1500.00, 500.00, 45.00, 100.00, 'manual'),
('PROD-002', 2800.00, 500.00, 84.00, 100.00, 'manual'),
('PROD-003', 980.00, 500.00, 29.40, 100.00, 'manual');

-- サンプル在庫アラート設定
INSERT INTO inventory_alerts (
    sku, country_code, alert_type, threshold_value, 
    notification_methods, notification_recipients
) VALUES 
('PROD-001', 'SG', 'low_stock', 10, ARRAY['email'], ARRAY['admin@example.com']),
('PROD-001', 'MY', 'low_stock', 5, ARRAY['email', 'slack'], ARRAY['admin@example.com']),
('PROD-002', NULL, 'out_of_stock', 0, ARRAY['email'], ARRAY['admin@example.com']); -- 全国対象

-- ==================== パフォーマンス最適化 ====================

-- パーティショニング（大量データ対応）
-- API呼び出しログの月次パーティション例
/*
CREATE TABLE shopee_api_calls_y2024m01 PARTITION OF shopee_api_calls
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE shopee_api_calls_y2024m02 PARTITION OF shopee_api_calls
FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
*/

-- 統計情報更新
ANALYZE shopee_listings;
ANALYZE profit_calculations;
ANALYZE shopee_api_calls;

-- ==================== セキュリティ強化 ====================

-- API設定の暗号化（Row Level Security）
ALTER TABLE shopee_api_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_configs_admin_only" ON shopee_api_configs
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 利益計算データのアクセス制御
ALTER TABLE profit_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profit_calculations_country_access" ON profit_calculations
    FOR ALL TO authenticated
    USING (
        country_code = ANY (
            SELECT unnest(allowed_countries) 
            FROM user_profiles 
            WHERE id = auth.uid()
        )
    );

-- ==================== 運用支援機能 ====================

-- データベース健全性チェック関数
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $
BEGIN
    -- 孤立した出品レコードチェック
    RETURN QUERY 
    SELECT 
        'orphaned_listings'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        ('Found ' || COUNT(*) || ' listings without cost data')::TEXT
    FROM shopee_listings l
    LEFT JOIN product_cost_master c ON l.sku = c.sku
    WHERE c.sku IS NULL;
    
    -- 期限切れトークンチェック
    RETURN QUERY
    SELECT 
        'expired_tokens'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
        ('Found ' || COUNT(*) || ' expired API tokens')::TEXT
    FROM shopee_api_configs
    WHERE token_expires_at < NOW() AND is_active = TRUE;
    
    -- 在庫不整合チェック
    RETURN QUERY
    SELECT 
        'stock_inconsistency'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        ('Found ' || COUNT(*) || ' products with negative available stock')::TEXT
    FROM shopee_listings
    WHERE (current_stock - reserved_stock) < 0;
END;
$ LANGUAGE plpgsql;

-- 定期メンテナンス関数
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS TEXT AS $
DECLARE
    result_text TEXT := '';
    cleaned_records INTEGER;
BEGIN
    -- 古いAPI呼び出しログの削除（90日以上）
    DELETE FROM shopee_api_calls 
    WHERE request_timestamp < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS cleaned_records = ROW_COUNT;
    result_text := result_text || 'Cleaned ' || cleaned_records || ' old API logs. ';
    
    -- 古い利益計算履歴の削除（is_latest = FALSE かつ 30日以上）
    DELETE FROM profit_calculations 
    WHERE is_latest = FALSE 
      AND calculation_timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS cleaned_records = ROW_COUNT;
    result_text := result_text || 'Cleaned ' || cleaned_records || ' old profit calculations. ';
    
    -- 統計情報更新
    ANALYZE;
    result_text := result_text || 'Updated statistics.';
    
    RETURN result_text;
END;
$ LANGUAGE plpgsql;

-- ==================== 初期化完了 ====================

-- 初期化メッセージ
SELECT 'Shopee拡張データベース初期化完了！' as status,
       'API連携・利益計算・競合分析機能が利用可能' as details;
    