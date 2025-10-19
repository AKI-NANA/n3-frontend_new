-- =====================================================
-- 高度統合利益計算システム - データベーススキーマ
-- 関税・DDP/DDU・外注工賃・梱包費・為替変動対応
-- =====================================================

-- 1. 高度利益計算履歴テーブル
CREATE TABLE IF NOT EXISTS advanced_profit_calculations (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,                    -- 'eBay USA' または 'Shopee'
    shipping_mode VARCHAR(10),                         -- 'DDP', 'DDU' (eBay用)
    country VARCHAR(2),                                -- 国コード (Shopee用)
    item_title VARCHAR(500),
    purchase_price_jpy DECIMAL(12,2) NOT NULL,
    sell_price_usd DECIMAL(10,2),                      -- eBay用
    sell_price_local DECIMAL(15,2),                    -- Shopee用（現地通貨）
    calculated_profit_jpy DECIMAL(12,2) NOT NULL,
    margin_percent DECIMAL(5,2),
    roi_percent DECIMAL(5,2),
    
    -- 関税・税金
    tariff_jpy DECIMAL(12,2) DEFAULT 0,
    tariff_rate DECIMAL(5,2),                          -- 適用された関税率
    vat_jpy DECIMAL(12,2) DEFAULT 0,                   -- GST/VAT額
    vat_rate DECIMAL(5,2),                             -- 適用されたVAT率
    
    -- 追加費用
    outsource_fee DECIMAL(8,2) DEFAULT 0,              -- 外注工賃費
    packaging_fee DECIMAL(8,2) DEFAULT 0,              -- 梱包費
    exchange_margin DECIMAL(5,2) DEFAULT 0,            -- 為替変動マージン
    
    -- 手数料詳細
    ebay_fees_usd DECIMAL(10,2),                       -- eBay手数料合計
    shopee_fees_local DECIMAL(12,2),                   -- Shopee手数料合計
    
    -- 為替情報
    exchange_rate_used DECIMAL(10,6),
    exchange_rate_base DECIMAL(10,6),
    
    -- メタ情報
    calculation_formula TEXT,                          -- 使用された計算式
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_advanced_profit_platform ON advanced_profit_calculations(platform);
CREATE INDEX IF NOT EXISTS idx_advanced_profit_country ON advanced_profit_calculations(country);
CREATE INDEX IF NOT EXISTS idx_advanced_profit_shipping_mode ON advanced_profit_calculations(shipping_mode);
CREATE INDEX IF NOT EXISTS idx_advanced_profit_calculated_at ON advanced_profit_calculations(calculated_at);

-- 2. 計算設定保存テーブル
CREATE TABLE IF NOT EXISTS calculation_configs (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(20) NOT NULL,                    -- 'eBay USA' または 'Shopee'
    config_data JSONB NOT NULL,                       -- 設定データ（JSON形式）
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_calculation_configs_name ON calculation_configs(config_name);
CREATE INDEX IF NOT EXISTS idx_calculation_configs_platform ON calculation_configs(platform);
CREATE INDEX IF NOT EXISTS idx_calculation_configs_data ON calculation_configs USING GIN (config_data);

-- 3. 国別関税・税制マスターテーブル
CREATE TABLE IF NOT EXISTS country_tariff_master (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    
    -- 基本税制
    standard_tariff_rate DECIMAL(5,2) NOT NULL,
    vat_gst_rate DECIMAL(5,2) NOT NULL,
    duty_free_threshold DECIMAL(15,2) NOT NULL,
    
    -- カテゴリー別関税率（JSON）
    category_tariff_rates JSONB,
    
    -- 為替レート
    base_exchange_rate_jpy DECIMAL(10,4) NOT NULL,
    exchange_rate_updated_at TIMESTAMP WITH TIME ZONE,
    
    -- 特記事項
    special_notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_country_tariff_code ON country_tariff_master(country_code);
CREATE INDEX IF NOT EXISTS idx_country_tariff_rates ON country_tariff_master USING GIN (category_tariff_rates);

-- 4. eBay USA関税・手数料マスターテーブル
CREATE TABLE IF NOT EXISTS ebay_usa_tariff_master (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    
    -- 関税率
    ddp_tariff_rate DECIMAL(5,2) NOT NULL,
    
    -- eBay手数料
    final_value_fee_rate DECIMAL(5,4) NOT NULL,
    insertion_fee DECIMAL(8,2) DEFAULT 0,
    
    -- PayPal手数料
    paypal_rate DECIMAL(5,4) DEFAULT 0.0349,
    paypal_fixed_fee DECIMAL(8,2) DEFAULT 0.49,
    
    -- 国際取引手数料
    international_fee_rate DECIMAL(5,4) DEFAULT 0.015,
    
    -- 特記事項
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_ebay_usa_category ON ebay_usa_tariff_master(category);

-- 5. Shopee国別手数料マスターテーブル
CREATE TABLE IF NOT EXISTS shopee_country_fees (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    
    -- Shopee手数料
    commission_rate DECIMAL(5,2) NOT NULL,
    transaction_fee_rate DECIMAL(5,2) DEFAULT 2.0,
    payment_fee_rate DECIMAL(5,2) DEFAULT 0,
    
    -- カテゴリー別手数料（JSON）
    category_commission_rates JSONB,
    
    -- 最低手数料
    minimum_commission DECIMAL(8,2) DEFAULT 0,
    
    -- 特別プロモーション手数料
    promotion_fee_rate DECIMAL(5,2) DEFAULT 0,
    
    -- 有効期間
    effective_from DATE NOT NULL,
    effective_to DATE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_shopee_country_fees_country ON shopee_country_fees(country_code);
CREATE INDEX IF NOT EXISTS idx_shopee_country_fees_effective ON shopee_country_fees(effective_from, effective_to);

-- 6. 計算履歴分析ビュー
CREATE OR REPLACE VIEW profit_calculation_analysis AS
SELECT 
    platform,
    shipping_mode,
    country,
    COUNT(*) as calculation_count,
    AVG(calculated_profit_jpy) as avg_profit_jpy,
    AVG(margin_percent) as avg_margin_percent,
    AVG(roi_percent) as avg_roi_percent,
    AVG(tariff_jpy) as avg_tariff_jpy,
    AVG(outsource_fee) as avg_outsource_fee,
    AVG(packaging_fee) as avg_packaging_fee,
    AVG(exchange_margin) as avg_exchange_margin,
    MIN(calculated_at) as first_calculation,
    MAX(calculated_at) as last_calculation,
    
    -- 利益性分析
    COUNT(CASE WHEN calculated_profit_jpy > 0 THEN 1 END) as profitable_count,
    COUNT(CASE WHEN margin_percent > 20 THEN 1 END) as high_margin_count,
    COUNT(CASE WHEN roi_percent > 30 THEN 1 END) as high_roi_count
FROM advanced_profit_calculations
WHERE calculated_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY platform, shipping_mode, country;

-- 7. 関税影響分析ビュー
CREATE OR REPLACE VIEW tariff_impact_analysis AS
SELECT 
    platform,
    CASE 
        WHEN platform = 'eBay USA' THEN shipping_mode
        WHEN platform = 'Shopee' THEN country
        ELSE 'Unknown'
    END as segment,
    
    AVG(tariff_jpy) as avg_tariff_amount,
    AVG(tariff_jpy::DECIMAL / NULLIF(calculated_profit_jpy + tariff_jpy, 0) * 100) as tariff_impact_percent,
    AVG(CASE WHEN tariff_jpy > calculated_profit_jpy THEN 1 ELSE 0 END * 100) as tariff_exceeds_profit_percent,
    
    COUNT(*) as total_calculations,
    COUNT(CASE WHEN tariff_jpy > 0 THEN 1 END) as taxed_calculations
FROM advanced_profit_calculations
WHERE calculated_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY platform, segment;

-- 8. 為替レート履歴テーブル（拡張）
CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id SERIAL PRIMARY KEY,
    currency_from VARCHAR(3) NOT NULL,
    currency_to VARCHAR(3) NOT NULL,
    base_rate DECIMAL(12,8) NOT NULL,
    source VARCHAR(50) NOT NULL,                       -- 'api', 'manual', 'calculated'
    
    -- 変動分析
    rate_change_percent DECIMAL(8,4),                  -- 前回からの変動率
    volatility_score DECIMAL(8,4),                     -- ボラティリティスコア
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- メタ情報
    api_response_time_ms INTEGER,
    data_quality_score DECIMAL(3,2),                   -- データ品質スコア (0-1)
    notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_currencies ON exchange_rate_history(currency_from, currency_to);
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_recorded ON exchange_rate_history(recorded_at);

-- =====================================================
-- 初期データ投入
-- =====================================================

-- 国別関税・税制マスターデータ
INSERT INTO country_tariff_master (
    country_code, country_name, currency, 
    standard_tariff_rate, vat_gst_rate, duty_free_threshold, 
    base_exchange_rate_jpy, category_tariff_rates
) VALUES
('SG', 'シンガポール', 'SGD', 7.0, 7.0, 400.00, 110.0, 
 '{"electronics": 0, "textiles": 10, "luxury": 20}'),
('MY', 'マレーシア', 'MYR', 15.0, 10.0, 500.00, 35.0,
 '{"electronics": 5, "textiles": 25, "automotive": 30}'),
('TH', 'タイ', 'THB', 20.0, 7.0, 1500.00, 4.3,
 '{"electronics": 10, "textiles": 30, "luxury": 80}'),
('PH', 'フィリピン', 'PHP', 25.0, 12.0, 10000.00, 2.7,
 '{"electronics": 7, "textiles": 15, "food": 30}'),
('ID', 'インドネシア', 'IDR', 30.0, 11.0, 75.00, 0.01,
 '{"electronics": 20, "textiles": 150, "luxury": 200}'),
('VN', 'ベトナム', 'VND', 35.0, 10.0, 200.00, 0.006,
 '{"electronics": 25, "textiles": 200, "automotive": 100}'),
('TW', '台湾', 'TWD', 10.0, 5.0, 2000.00, 4.8,
 '{"electronics": 3, "textiles": 12, "precision": 40}')
ON CONFLICT (country_code) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;

-- eBay USA関税・手数料マスターデータ
INSERT INTO ebay_usa_tariff_master (
    category, category_name, ddp_tariff_rate, 
    final_value_fee_rate, paypal_rate, paypal_fixed_fee, international_fee_rate
) VALUES
('electronics', 'Consumer Electronics', 7.5, 0.1290, 0.0349, 0.49, 0.015),
('textiles', 'Clothing & Textiles', 12.0, 0.1350, 0.0349, 0.49, 0.015),
('automotive', 'Automotive Parts', 2.5, 0.1290, 0.0349, 0.49, 0.015),
('jewelry', 'Jewelry & Watches', 5.5, 0.1350, 0.0349, 0.49, 0.015),
('sports', 'Sports & Outdoors', 8.5, 0.1290, 0.0349, 0.49, 0.015),
('books', 'Books & Media', 0.0, 0.1290, 0.0349, 0.49, 0.015),
('toys', 'Toys & Games', 0.0, 0.1290, 0.0349, 0.49, 0.015),
('other', 'Other Categories', 5.0, 0.1290, 0.0349, 0.49, 0.015)
ON CONFLICT (category) DO UPDATE SET
    updated_at = CURRENT_TIMESTAMP;

-- Shopee国別手数料データ
INSERT INTO shopee_country_fees (
    country_code, commission_rate, transaction_fee_rate, 
    category_commission_rates, effective_from
) VALUES
('SG', 6.0, 2.0, '{"electronics": 5.5, "fashion": 6.5, "home": 6.0}', '2025-01-01'),
('MY', 5.5, 2.0, '{"electronics": 5.0, "fashion": 6.0, "home": 5.5}', '2025-01-01'),
('TH', 5.0, 2.0, '{"electronics": 4.5, "fashion": 5.5, "home": 5.0}', '2025-01-01'),
('PH', 5.5, 2.0, '{"electronics": 5.0, "fashion": 6.0, "home": 5.5}', '2025-01-01'),
('ID', 5.0, 2.0, '{"electronics": 4.5, "fashion": 5.5, "home": 5.0}', '2025-01-01'),
('VN', 6.0, 2.0, '{"electronics": 5.5, "fashion": 6.5, "home": 6.0}', '2025-01-01'),
('TW', 5.5, 2.0, '{"electronics": 5.0, "fashion": 6.0, "home": 5.5}', '2025-01-01');

-- デフォルト計算設定
INSERT INTO calculation_configs (config_name, platform, config_data, description, is_default) VALUES
('eBay_Electronics_DDP', 'eBay USA', 
 '{"category": "electronics", "shipping_mode": "ddp", "tariff_rates": {"electronics": 7.5}, "additional_costs": {"outsource_fee": 500, "packaging_fee": 200, "exchange_margin": 5.0}}',
 'eBay エレクトロニクス DDP デフォルト設定', true),

('eBay_Textiles_DDU', 'eBay USA',
 '{"category": "textiles", "shipping_mode": "ddu", "tariff_rates": {"textiles": 12.0}, "additional_costs": {"outsource_fee": 300, "packaging_fee": 150, "exchange_margin": 4.0}}',
 'eBay テキスタイル DDU デフォルト設定', false),

('Shopee_SG_Electronics', 'Shopee',
 '{"country": "SG", "category": "electronics", "tariff_settings": {"tariff_rate": 7.0, "vat_rate": 7.0, "duty_free_amount": 400}, "additional_costs": {"outsource_fee": 300, "packaging_fee": 150, "exchange_margin": 3.0}}',
 'Shopee シンガポール エレクトロニクス デフォルト設定', true),

('Shopee_TH_Fashion', 'Shopee',
 '{"country": "TH", "category": "fashion", "tariff_settings": {"tariff_rate": 30.0, "vat_rate": 7.0, "duty_free_amount": 1500}, "additional_costs": {"outsource_fee": 250, "packaging_fee": 100, "exchange_margin": 5.0}}',
 'Shopee タイ ファッション デフォルト設定', false);

-- =====================================================
-- 分析・レポート用プロシージャ
-- =====================================================

-- 利益性分析プロシージャ
CREATE OR REPLACE FUNCTION analyze_profitability(
    p_platform VARCHAR(20) DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    segment VARCHAR(50),
    total_calculations INTEGER,
    profitable_count INTEGER,
    profitability_rate DECIMAL(5,2),
    avg_profit_jpy DECIMAL(10,2),
    avg_margin_percent DECIMAL(5,2),
    avg_roi_percent DECIMAL(5,2),
    avg_tariff_impact DECIMAL(5,2)
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN apc.platform = 'eBay USA' THEN CONCAT(apc.platform, ' - ', UPPER(apc.shipping_mode))
            WHEN apc.platform = 'Shopee' THEN CONCAT(apc.platform, ' - ', ctm.country_name)
            ELSE apc.platform
        END as segment,
        COUNT(*)::INTEGER as total_calculations,
        COUNT(CASE WHEN apc.calculated_profit_jpy > 0 THEN 1 END)::INTEGER as profitable_count,
        (COUNT(CASE WHEN apc.calculated_profit_jpy > 0 THEN 1 END)::DECIMAL / COUNT(*) * 100) as profitability_rate,
        AVG(apc.calculated_profit_jpy) as avg_profit_jpy,
        AVG(apc.margin_percent) as avg_margin_percent,
        AVG(apc.roi_percent) as avg_roi_percent,
        AVG(apc.tariff_jpy::DECIMAL / NULLIF(apc.calculated_profit_jpy + apc.tariff_jpy, 0) * 100) as avg_tariff_impact
    FROM advanced_profit_calculations apc
    LEFT JOIN country_tariff_master ctm ON apc.country = ctm.country_code
    WHERE 
        (p_platform IS NULL OR apc.platform = p_platform)
        AND apc.calculated_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
    GROUP BY segment
    ORDER BY profitability_rate DESC;
END;
$ LANGUAGE plpgsql;

-- 関税影響度分析プロシージャ
CREATE OR REPLACE FUNCTION analyze_tariff_impact(
    p_platform VARCHAR(20) DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    segment VARCHAR(50),
    avg_tariff_amount DECIMAL(10,2),
    max_tariff_amount DECIMAL(10,2),
    tariff_kills_profit_rate DECIMAL(5,2),
    high_tariff_threshold DECIMAL(10,2)
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN apc.platform = 'eBay USA' THEN CONCAT(apc.platform, ' - ', UPPER(apc.shipping_mode))
            WHEN apc.platform = 'Shopee' THEN CONCAT(apc.platform, ' - ', ctm.country_name)
            ELSE apc.platform
        END as segment,
        AVG(apc.tariff_jpy) as avg_tariff_amount,
        MAX(apc.tariff_jpy) as max_tariff_amount,
        (COUNT(CASE WHEN apc.tariff_jpy > apc.calculated_profit_jpy THEN 1 END)::DECIMAL / COUNT(*) * 100) as tariff_kills_profit_rate,
        PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY apc.tariff_jpy) as high_tariff_threshold
    FROM advanced_profit_calculations apc
    LEFT JOIN country_tariff_master ctm ON apc.country = ctm.country_code
    WHERE 
        (p_platform IS NULL OR apc.platform = p_platform)
        AND apc.calculated_at >= CURRENT_DATE - INTERVAL '%s days' % p_days_back
        AND apc.tariff_jpy > 0
    GROUP BY segment
    ORDER BY tariff_kills_profit_rate DESC;
END;
$ LANGUAGE plpgsql;

-- データクリーンアップ プロシージャ
CREATE OR REPLACE FUNCTION cleanup_old_calculations()
RETURNS INTEGER AS $
DECLARE
    deleted_count INTEGER;
BEGIN
    -- 1年以上古い計算履歴を削除
    DELETE FROM advanced_profit_calculations 
    WHERE calculated_at < CURRENT_DATE - INTERVAL '365 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- 為替レート履歴の古いデータも削除（6ヶ月以上）
    DELETE FROM exchange_rate_history 
    WHERE recorded_at < CURRENT_DATE - INTERVAL '180 days';
    
    RETURN deleted_count;
END;
$ LANGUAGE plpgsql;

-- =====================================================
-- 自動実行設定（cron job で実行）
-- =====================================================

-- 毎日午前2時にデータクリーンアップを実行
-- SELECT cron.schedule('cleanup-calculations', '0 2 * * *', 'SELECT cleanup_old_calculations();');

-- =====================================================
-- パフォーマンス最適化
-- =====================================================

-- パーティション設定（月別）
-- CREATE TABLE advanced_profit_calculations_y2025m01 PARTITION OF advanced_profit_calculations
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- 統計情報更新
ANALYZE advanced_profit_calculations;
ANALYZE calculation_configs;
ANALYZE country_tariff_master;
ANALYZE ebay_usa_tariff_master;
ANALYZE shopee_country_fees;

-- =====================================================
-- セキュリティ設定
-- =====================================================

-- アプリケーション用ロール作成
-- CREATE ROLE profit_calculator_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO profit_calculator_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO profit_calculator_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO profit_calculator_app;

-- 読み取り専用ロール作成
-- CREATE ROLE profit_calculator_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO profit_calculator_readonly;
-- GRANT EXECUTE ON FUNCTION analyze_profitability(VARCHAR, INTEGER) TO profit_calculator_readonly;
-- GRANT EXECUTE ON FUNCTION analyze_tariff_impact(VARCHAR, INTEGER) TO profit_calculator_readonly;

-- =====================================================
-- 完了メッセージ
-- =====================================================

DO $
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '高度統合利益計算システム';
    RAISE NOTICE 'データベースセットアップ完了';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ テーブル作成完了:';
    RAISE NOTICE '   - advanced_profit_calculations (高度利益計算履歴)';
    RAISE NOTICE '   - calculation_configs (計算設定保存)';
    RAISE NOTICE '   - country_tariff_master (国別関税マスター)';
    RAISE NOTICE '   - ebay_usa_tariff_master (eBay USA関税マスター)';
    RAISE NOTICE '   - shopee_country_fees (Shopee手数料マスター)';
    RAISE NOTICE '   - exchange_rate_history (為替レート履歴)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ ビュー作成完了:';
    RAISE NOTICE '   - profit_calculation_analysis (利益分析)';
    RAISE NOTICE '   - tariff_impact_analysis (関税影響分析)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ プロシージャ作成完了:';
    RAISE NOTICE '   - analyze_profitability() (利益性分析)';
    RAISE NOTICE '   - analyze_tariff_impact() (関税影響分析)';
    RAISE NOTICE '   - cleanup_old_calculations() (データクリーンアップ)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ 初期データ投入完了:';
    RAISE NOTICE '   - 7カ国の関税・税制データ';
    RAISE NOTICE '   - eBay USA カテゴリー別関税・手数料';
    RAISE NOTICE '   - Shopee 7カ国手数料データ';
    RAISE NOTICE '   - デフォルト計算設定';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 主要機能:';
    RAISE NOTICE '   ✓ eBay USA DDP/DDU関税計算';
    RAISE NOTICE '   ✓ Shopee 7カ国関税・税制計算';
    RAISE NOTICE '   ✓ 外注工賃・梱包費・為替変動対応';
    RAISE NOTICE '   ✓ 設定保存・自動計算';
    RAISE NOTICE '   ✓ 利益性・関税影響度分析';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 次のステップ:';
    RAISE NOTICE '   1. rieki_advanced.php の DB接続設定確認';
    RAISE NOTICE '   2. Webサーバーの設定確認';
    RAISE NOTICE '   3. http://localhost:8081/.../rieki_advanced.php?action=health でテスト';
    RAISE NOTICE '   4. フロントエンド HTML ファイルの配置';
    RAISE NOTICE '';
    RAISE NOTICE '📊 分析クエリ例:';
    RAISE NOTICE '   SELECT * FROM analyze_profitability();';
    RAISE NOTICE '   SELECT * FROM analyze_tariff_impact();';
    RAISE NOTICE '   SELECT * FROM profit_calculation_analysis;';
    RAISE NOTICE '';
    RAISE NOTICE 'セットアップ完了！🎉';
END $;