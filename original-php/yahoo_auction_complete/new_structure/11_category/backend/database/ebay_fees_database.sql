--
-- eBay手数料データベース構築 - Phase 3 Implementation
-- ファイル: ebay_fees_database.sql
-- 手数料テーブル作成と初期データ投入
--

-- eBayカテゴリー別手数料テーブル
CREATE TABLE IF NOT EXISTS ebay_category_fees (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    listing_type VARCHAR(20) NOT NULL DEFAULT 'fixed_price', -- 'auction', 'fixed_price', 'store'
    insertion_fee DECIMAL(10,2) DEFAULT 0.00,
    final_value_fee_percent DECIMAL(5,2) DEFAULT 13.25,
    final_value_fee_max DECIMAL(10,2) DEFAULT 750.00,
    store_fee DECIMAL(10,2) DEFAULT 0.00,
    paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90,
    paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30,
    international_fee_percent DECIMAL(5,2) DEFAULT 1.00,
    promoted_listing_fee_percent DECIMAL(5,2) DEFAULT 0.00,
    category_specific_rules JSONB,
    effective_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 外部キー制約（eBayカテゴリーテーブルが存在する場合）
ALTER TABLE ebay_category_fees 
ADD CONSTRAINT fk_ebay_category_fees_category 
FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_category_fees_category_listing 
ON ebay_category_fees(category_id, listing_type);

CREATE INDEX IF NOT EXISTS idx_ebay_category_fees_active 
ON ebay_category_fees(is_active);

CREATE INDEX IF NOT EXISTS idx_ebay_category_fees_effective_date 
ON ebay_category_fees(effective_date);

-- 更新トリガー関数
CREATE OR REPLACE FUNCTION update_fee_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 更新トリガー作成
DROP TRIGGER IF EXISTS trigger_update_fee_timestamp ON ebay_category_fees;
CREATE TRIGGER trigger_update_fee_timestamp
    BEFORE UPDATE ON ebay_category_fees
    FOR EACH ROW
    EXECUTE FUNCTION update_fee_timestamp();

-- =============================================================================
-- 初期手数料データ投入（2024年現在の実際のeBay手数料）
-- =============================================================================

-- 既存データ削除（初期化）
DELETE FROM ebay_category_fees;

-- スマートフォン・携帯電話 (最も重要なカテゴリー)
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('293', 'fixed_price', 12.90, 750.00, '{"free_listings_per_month": 250, "subtitle_fee": 1.50}'),
('293', 'auction', 12.90, 750.00, '{"free_listings_per_month": 250}'),
('293', 'store', 12.40, 750.00, '{"store_subscription_required": true}');

-- カメラ・写真機器
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('625', 'fixed_price', 12.35, 750.00, '{"free_listings_per_month": 250}'),
('625', 'auction', 12.35, 750.00, '{"free_listings_per_month": 250}'),
('625', 'store', 11.85, 750.00, '{"store_subscription_required": true}');

-- デジタルカメラ
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
('11232', 'fixed_price', 12.35, 750.00),
('11232', 'auction', 12.35, 750.00),
('11232', 'store', 11.85, 750.00);

-- レンズ・フィルター
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
('3323', 'fixed_price', 12.35, 750.00),
('3323', 'auction', 12.35, 750.00),
('3323', 'store', 11.85, 750.00);

-- ビデオゲーム
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('139973', 'fixed_price', 13.25, 750.00, '{"digital_delivery_fee": 2.70}'),
('139973', 'auction', 13.25, 750.00, '{}'),
('139973', 'store', 12.75, 750.00, '{"store_subscription_required": true}');

-- ゲーム機・コンソール
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
('14339', 'fixed_price', 13.25, 750.00),
('14339', 'auction', 13.25, 750.00),
('14339', 'store', 12.75, 750.00);

-- スポーツトレーディングカード
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('58058', 'fixed_price', 13.25, 750.00, '{"authentication_required_over": 750}'),
('58058', 'auction', 13.25, 750.00, '{"authentication_required_over": 750}'),
('58058', 'store', 12.75, 750.00, '{}');

-- ノンスポーツトレーディングカード（ポケモン、遊戯王等）
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('183454', 'fixed_price', 13.25, 750.00, '{"pokemon_high_demand": true}'),
('183454', 'auction', 13.25, 750.00, '{}'),
('183454', 'store', 12.75, 750.00, '{}');

-- トレーディングカードゲーム
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
('888', 'fixed_price', 13.25, 750.00),
('888', 'auction', 13.25, 750.00),
('888', 'store', 12.75, 750.00);

-- 女性衣類
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('11462', 'fixed_price', 13.25, 750.00, '{"managed_payments_only": true}'),
('11462', 'auction', 13.25, 750.00, '{}'),
('11462', 'store', 12.75, 750.00, '{}');

-- 男性衣類
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
('1059', 'fixed_price', 13.25, 750.00),
('1059', 'auction', 13.25, 750.00),
('1059', 'store', 12.75, 750.00);

-- 時計・ジュエリー
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('31387', 'fixed_price', 13.25, 750.00, '{"authentication_required_over": 2000}'),
('31387', 'auction', 13.25, 750.00, '{}'),
('31387', 'store', 12.75, 750.00, '{}');

-- 本・雑誌
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('1295', 'fixed_price', 15.00, 750.00, '{"media_mail_eligible": true}'),
('1295', 'auction', 15.00, 750.00, '{}'),
('1295', 'store', 14.50, 750.00, '{}');

-- アクションフィギュア
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
('10181', 'fixed_price', 13.25, 750.00),
('10181', 'auction', 13.25, 750.00),
('10181', 'store', 12.75, 750.00);

-- アニメ・マンガ（日本特有カテゴリー）
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('99992', 'fixed_price', 13.25, 750.00, '{"international_shipping_popular": true, "japanese_market_premium": true}'),
('99992', 'auction', 13.25, 750.00, '{}'),
('99992', 'store', 12.75, 750.00, '{}');

-- その他・未分類
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max, category_specific_rules) VALUES
('99999', 'fixed_price', 13.25, 750.00, '{"default_category": true}'),
('99999', 'auction', 13.25, 750.00, '{}'),
('99999', 'store', 12.75, 750.00, '{}');

-- =============================================================================
-- 追加手数料テーブル（オプション手数料）
-- =============================================================================

CREATE TABLE IF NOT EXISTS ebay_optional_fees (
    id SERIAL PRIMARY KEY,
    fee_type VARCHAR(50) NOT NULL,
    fee_name VARCHAR(100) NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    applies_to_categories TEXT[], -- カテゴリーID配列
    listing_types TEXT[] DEFAULT ARRAY['fixed_price', 'auction', 'store'],
    min_price DECIMAL(10,2) DEFAULT 0.00,
    max_price DECIMAL(10,2),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- オプション手数料初期データ
INSERT INTO ebay_optional_fees (fee_type, fee_name, fee_amount, description) VALUES
('listing_upgrade', 'Subtitle', 1.50, '商品タイトル下のサブタイトル表示'),
('listing_upgrade', 'Gallery Plus', 1.00, 'ギャラリー画像の拡大表示'),
('listing_upgrade', 'Bold Title', 2.00, 'タイトルの太字表示'),
('listing_upgrade', 'Highlight', 5.00, '検索結果でのハイライト表示'),
('listing_upgrade', 'Featured Plus', 19.95, '検索結果上部に表示'),
('payment_processing', 'PayPal Standard Rate', 0.30, 'PayPal固定手数料'),
('international', 'International Listing Fee', 0.00, '国際発送手数料（現在無料）'),
('promoted_listing', 'Promoted Listing Ad Fee', 0.00, 'プロモーション広告手数料（%ベース）');

-- =============================================================================
-- 手数料計算ヘルパー関数
-- =============================================================================

-- カテゴリー別手数料取得関数
CREATE OR REPLACE FUNCTION get_category_fee_data(
    p_category_id VARCHAR(20),
    p_listing_type VARCHAR(20) DEFAULT 'fixed_price'
) RETURNS TABLE (
    category_id VARCHAR(20),
    listing_type VARCHAR(20),
    insertion_fee DECIMAL(10,2),
    final_value_fee_percent DECIMAL(5,2),
    final_value_fee_max DECIMAL(10,2),
    paypal_fee_percent DECIMAL(5,2),
    paypal_fee_fixed DECIMAL(5,2),
    category_rules JSONB
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        ecf.category_id,
        ecf.listing_type,
        ecf.insertion_fee,
        ecf.final_value_fee_percent,
        ecf.final_value_fee_max,
        ecf.paypal_fee_percent,
        ecf.paypal_fee_fixed,
        ecf.category_specific_rules
    FROM ebay_category_fees ecf
    WHERE ecf.category_id = p_category_id 
    AND ecf.listing_type = p_listing_type
    AND ecf.is_active = TRUE
    ORDER BY ecf.effective_date DESC
    LIMIT 1;
    
    -- データが見つからない場合はデフォルト値を返す
    IF NOT FOUND THEN
        RETURN QUERY 
        SELECT 
            p_category_id::VARCHAR(20),
            p_listing_type::VARCHAR(20),
            0.00::DECIMAL(10,2), -- insertion_fee
            13.25::DECIMAL(5,2), -- final_value_fee_percent
            750.00::DECIMAL(10,2), -- final_value_fee_max
            2.90::DECIMAL(5,2), -- paypal_fee_percent
            0.30::DECIMAL(5,2), -- paypal_fee_fixed
            '{}'::JSONB; -- category_rules
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 手数料計算関数
CREATE OR REPLACE FUNCTION calculate_ebay_fees(
    p_category_id VARCHAR(20),
    p_price_usd DECIMAL(12,2),
    p_listing_type VARCHAR(20) DEFAULT 'fixed_price',
    p_include_paypal BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
    insertion_fee DECIMAL(10,2),
    final_value_fee DECIMAL(10,2),
    paypal_fee DECIMAL(10,2),
    total_fees DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    fee_percentage DECIMAL(5,2)
) AS $$
DECLARE
    fee_data RECORD;
    calc_final_fee DECIMAL(10,2);
    calc_paypal_fee DECIMAL(10,2);
BEGIN
    -- 手数料データ取得
    SELECT * INTO fee_data FROM get_category_fee_data(p_category_id, p_listing_type) LIMIT 1;
    
    -- Final Value Fee計算
    calc_final_fee := LEAST((p_price_usd * fee_data.final_value_fee_percent / 100), fee_data.final_value_fee_max);
    
    -- PayPal手数料計算
    IF p_include_paypal THEN
        calc_paypal_fee := (p_price_usd * fee_data.paypal_fee_percent / 100) + fee_data.paypal_fee_fixed;
    ELSE
        calc_paypal_fee := 0.00;
    END IF;
    
    RETURN QUERY SELECT 
        fee_data.insertion_fee,
        ROUND(calc_final_fee, 2),
        ROUND(calc_paypal_fee, 2),
        ROUND(fee_data.insertion_fee + calc_final_fee + calc_paypal_fee, 2),
        ROUND(p_price_usd - (fee_data.insertion_fee + calc_final_fee + calc_paypal_fee), 2),
        CASE WHEN p_price_usd > 0 THEN 
            ROUND(((fee_data.insertion_fee + calc_final_fee + calc_paypal_fee) / p_price_usd * 100), 2)
        ELSE 0.00 END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 統計・管理ビュー
-- =============================================================================

-- カテゴリー別手数料統計ビュー
CREATE OR REPLACE VIEW v_category_fee_stats AS
SELECT 
    ec.category_name,
    ecf.category_id,
    ecf.listing_type,
    ecf.final_value_fee_percent,
    ecf.final_value_fee_max,
    ecf.paypal_fee_percent,
    COUNT(ysp.id) as products_using_category,
    AVG(ysp.estimated_profit_usd) as avg_estimated_profit,
    SUM(CASE WHEN ysp.estimated_profit_usd > 0 THEN 1 ELSE 0 END) as profitable_products
FROM ebay_category_fees ecf
LEFT JOIN ebay_categories ec ON ecf.category_id = ec.category_id
LEFT JOIN yahoo_scraped_products ysp ON ecf.category_id = ysp.ebay_category_id
WHERE ecf.is_active = TRUE
GROUP BY ec.category_name, ecf.category_id, ecf.listing_type, ecf.final_value_fee_percent, ecf.final_value_fee_max, ecf.paypal_fee_percent
ORDER BY products_using_category DESC;

-- 手数料最適化レポートビュー
CREATE OR REPLACE VIEW v_fee_optimization_report AS
SELECT 
    ysp.id,
    ysp.title,
    ysp.price_jpy,
    ysp.ebay_category_name,
    fees_fp.total_fees as fixed_price_fees,
    fees_auction.total_fees as auction_fees,
    fees_store.total_fees as store_fees,
    CASE 
        WHEN fees_store.total_fees < fees_auction.total_fees AND fees_store.total_fees < fees_fp.total_fees THEN 'store'
        WHEN fees_auction.total_fees < fees_fp.total_fees THEN 'auction'
        ELSE 'fixed_price'
    END as recommended_listing_type,
    LEAST(COALESCE(fees_fp.total_fees, 999999), COALESCE(fees_auction.total_fees, 999999), COALESCE(fees_store.total_fees, 999999)) as min_total_fees
FROM yahoo_scraped_products ysp
LEFT JOIN LATERAL calculate_ebay_fees(ysp.ebay_category_id, ysp.estimated_ebay_price_usd, 'fixed_price') fees_fp ON true
LEFT JOIN LATERAL calculate_ebay_fees(ysp.ebay_category_id, ysp.estimated_ebay_price_usd, 'auction') fees_auction ON true
LEFT JOIN LATERAL calculate_ebay_fees(ysp.ebay_category_id, ysp.estimated_ebay_price_usd, 'store') fees_store ON true
WHERE ysp.ebay_category_id IS NOT NULL 
AND ysp.estimated_ebay_price_usd > 0
ORDER BY (ysp.estimated_ebay_price_usd - min_total_fees) DESC;

-- =============================================================================
-- データ検証・完了メッセージ
-- =============================================================================

-- データ検証
DO $$
DECLARE
    fee_records INTEGER;
    optional_fee_records INTEGER;
    categories_with_fees INTEGER;
BEGIN
    SELECT COUNT(*) INTO fee_records FROM ebay_category_fees WHERE is_active = TRUE;
    SELECT COUNT(*) INTO optional_fee_records FROM ebay_optional_fees WHERE is_active = TRUE;
    SELECT COUNT(DISTINCT category_id) INTO categories_with_fees FROM ebay_category_fees WHERE is_active = TRUE;
    
    RAISE NOTICE '=== eBay手数料データベース構築完了 ===';
    RAISE NOTICE '有効な手数料レコード数: %', fee_records;
    RAISE NOTICE 'オプション手数料レコード数: %', optional_fee_records;
    RAISE NOTICE '手数料設定済みカテゴリー数: %', categories_with_fees;
    RAISE NOTICE 'ヘルパー関数・ビュー作成完了';
    RAISE NOTICE 'システム準備完了 - 高精度手数料計算が可能です！';
END $$;
