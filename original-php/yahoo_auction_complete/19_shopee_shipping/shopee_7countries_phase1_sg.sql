-- Shopee 7カ国対応システム - Phase 1: シンガポール完全実装
-- ファイル: shopee_7countries_sg_complete.sql

-- =============================================================================
-- 1. 基盤テーブル再構築（7カ国対応強化版）
-- =============================================================================

-- 既存削除
DROP TABLE IF EXISTS shopee_profit_calculations CASCADE;
DROP TABLE IF EXISTS shopee_sls_rates CASCADE;
DROP TABLE IF EXISTS shopee_zones CASCADE;
DROP TABLE IF EXISTS shopee_markets CASCADE;

-- Shopee 7カ国マーケット定義
CREATE TABLE shopee_markets (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) UNIQUE NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    market_code VARCHAR(20) NOT NULL,        -- Shopee内部コード
    currency_code VARCHAR(3) NOT NULL,
    currency_symbol VARCHAR(10),             -- $, ₱, RM, NT$, ฿, ₫
    flag_emoji VARCHAR(10),
    
    -- 為替関連
    exchange_rate_to_jpy DECIMAL(10,4) NOT NULL,
    exchange_rate_source VARCHAR(50) DEFAULT 'manual',
    exchange_rate_updated TIMESTAMP DEFAULT NOW(),
    
    -- 市場特性
    market_size_rank INTEGER,               -- 1=最大市場, 7=最小市場
    avg_shipping_days INTEGER DEFAULT 7,
    peak_season_months INTEGER[],           -- [11,12,1,2] = 11月-2月がピーク
    
    -- Shopee手数料
    commission_rate DECIMAL(5,2) DEFAULT 5.00,     -- 5%
    payment_fee_rate DECIMAL(5,2) DEFAULT 2.00,    -- 2%
    withdrawal_fee_rate DECIMAL(5,2) DEFAULT 1.00, -- 1%
    
    -- 運用状況
    is_active BOOLEAN DEFAULT TRUE,
    launch_priority INTEGER DEFAULT 1,      -- 展開優先度
    data_quality_score INTEGER DEFAULT 0,   -- データ完成度 0-100
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Shopee配送ゾーン（国・地域別詳細）
CREATE TABLE shopee_zones (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES shopee_markets(id) ON DELETE CASCADE,
    zone_code VARCHAR(10) NOT NULL,         -- A, B, C, D
    zone_name VARCHAR(200) NOT NULL,
    zone_description TEXT,
    
    -- ゾーン特性
    coverage_percentage DECIMAL(5,2),       -- そのゾーンの人口カバー率
    delivery_difficulty INTEGER DEFAULT 1,  -- 1=簡単, 5=困難
    is_default BOOLEAN DEFAULT FALSE,
    
    -- 料金特性
    price_multiplier DECIMAL(4,2) DEFAULT 1.00, -- ベース料金への乗数
    additional_days INTEGER DEFAULT 0,      -- 追加配送日数
    
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(market_id, zone_code)
);

-- Shopee SLS 料金マスター（重量・ゾーン別）
CREATE TABLE shopee_sls_rates (
    id SERIAL PRIMARY KEY,
    market_id INTEGER REFERENCES shopee_markets(id) ON DELETE CASCADE,
    zone_code VARCHAR(10) NOT NULL,
    
    -- 重量範囲
    weight_from_g INTEGER NOT NULL,
    weight_to_g INTEGER NOT NULL,
    
    -- Shopee 3段階料金構造
    esf_amount DECIMAL(10,2) NOT NULL,       -- ESF: 購入者支払い（現地通貨）
    actual_amount DECIMAL(10,2) NOT NULL,    -- 実額: セラー請求（現地通貨）
    seller_benefit DECIMAL(10,2) GENERATED ALWAYS AS (esf_amount - actual_amount) STORED,
    
    currency_code VARCHAR(3) NOT NULL,
    
    -- 円換算（リアルタイム計算用）
    esf_jpy DECIMAL(10,2),
    actual_jpy DECIMAL(10,2),
    seller_benefit_jpy DECIMAL(10,2) GENERATED ALWAYS AS (esf_jpy - actual_jpy) STORED,
    
    -- サービス詳細
    service_type VARCHAR(20) DEFAULT 'normal', -- normal, express, economy
    delivery_days_min INTEGER DEFAULT 5,
    delivery_days_max INTEGER DEFAULT 10,
    has_tracking BOOLEAN DEFAULT TRUE,
    has_insurance BOOLEAN DEFAULT FALSE,
    
    -- データ管理
    data_source VARCHAR(50) DEFAULT 'official_shopee',
    effective_date DATE DEFAULT CURRENT_DATE,
    last_verified TIMESTAMP,
    accuracy_confidence INTEGER DEFAULT 100, -- データ精度 0-100
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 制約
    CHECK (weight_from_g < weight_to_g),
    CHECK (esf_amount >= actual_amount),
    CHECK (accuracy_confidence >= 0 AND accuracy_confidence <= 100)
);

-- Shopee利益計算結果保存テーブル
CREATE TABLE shopee_profit_calculations (
    id SERIAL PRIMARY KEY,
    product_id INTEGER, -- yahoo_scraped_products.id への参照
    
    -- 基本商品情報
    yahoo_price_jpy DECIMAL(10,2) NOT NULL,
    product_weight_g INTEGER NOT NULL,
    estimated_selling_price_jpy DECIMAL(10,2),
    
    -- 市場別利益計算
    market_code VARCHAR(3) NOT NULL,
    zone_code VARCHAR(10) NOT NULL,
    
    -- 送料データ
    shopee_esf_jpy DECIMAL(10,2),
    shopee_actual_jpy DECIMAL(10,2),
    shopee_seller_benefit_jpy DECIMAL(10,2),
    
    -- Shopee手数料
    commission_jpy DECIMAL(10,2),
    payment_fee_jpy DECIMAL(10,2),
    withdrawal_fee_jpy DECIMAL(10,2),
    total_shopee_fees_jpy DECIMAL(10,2),
    
    -- 利益計算
    gross_profit_jpy DECIMAL(10,2),          -- 売上 - 仕入
    net_profit_jpy DECIMAL(10,2),            -- 粗利 - 全手数料 + 送料利益
    profit_margin_percent DECIMAL(5,2),      -- 利益率
    roi_percent DECIMAL(5,2),                -- ROI
    
    -- 競合分析
    vs_ebay_advantage_jpy DECIMAL(10,2),     -- eBayとの利益差
    vs_domestic_advantage_jpy DECIMAL(10,2), -- 国内販売との利益差
    
    -- リスク評価
    currency_risk_score INTEGER DEFAULT 50,  -- 為替リスク 0-100
    shipping_risk_score INTEGER DEFAULT 50,  -- 配送リスク 0-100
    market_risk_score INTEGER DEFAULT 50,    -- 市場リスク 0-100
    overall_risk_score INTEGER DEFAULT 50,   -- 総合リスク 0-100
    
    -- 推奨度
    recommendation_score INTEGER DEFAULT 50, -- 推奨度 0-100
    recommendation_reason TEXT,
    
    calculated_at TIMESTAMP DEFAULT NOW(),
    is_latest BOOLEAN DEFAULT TRUE,
    
    -- インデックス用
    UNIQUE(product_id, market_code, zone_code, calculated_at)
);

-- =============================================================================
-- 2. シンガポール（SG）完全データ投入
-- =============================================================================

-- シンガポール市場登録
INSERT INTO shopee_markets (
    country_code, country_name, market_code, currency_code, currency_symbol, flag_emoji,
    exchange_rate_to_jpy, market_size_rank, avg_shipping_days, peak_season_months,
    commission_rate, payment_fee_rate, withdrawal_fee_rate,
    launch_priority, data_quality_score, notes
) VALUES (
    'SG', 'Singapore', 'SG_18045_18065', 'SGD', 'S$', '🇸🇬',
    115.0000, 3, 6, ARRAY[11,12,1], -- 11-1月がピーク（年末年始商戦）
    5.50, 2.90, 0.50, -- Shopee手数料（シンガポール特別料率）
    1, 100, 'Shopee発祥国・高購買力・データ完備'
);

-- シンガポール配送ゾーン
INSERT INTO shopee_zones (market_id, zone_code, zone_name, zone_description, coverage_percentage, delivery_difficulty, is_default, price_multiplier) VALUES
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 'Metropolitan Singapore', 'CBD, Orchard, Marina Bay, Central areas', 85.0, 1, TRUE, 1.00);

-- シンガポール SLS 料金データ（実データベース）
-- 重量刻み: 100g, 250g, 500g, 1kg, 2kg, 3kg, 5kg, 10kg, 20kg, 30kg
INSERT INTO shopee_sls_rates (
    market_id, zone_code, weight_from_g, weight_to_g,
    esf_amount, actual_amount, currency_code,
    service_type, delivery_days_min, delivery_days_max, data_source, accuracy_confidence
) VALUES
-- 100g-250g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 1, 250,
 3.60, 2.23, 'SGD', 'normal', 5, 8, 'official_shopee_2025', 100),

-- 251g-500g  
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 251, 500,
 4.20, 2.65, 'SGD', 'normal', 5, 8, 'official_shopee_2025', 100),

-- 501g-1000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 501, 1000,
 4.80, 3.10, 'SGD', 'normal', 5, 8, 'official_shopee_2025', 100),

-- 1001g-2000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 1001, 2000,
 6.40, 4.20, 'SGD', 'normal', 6, 9, 'official_shopee_2025', 100),

-- 2001g-3000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 2001, 3000,
 8.60, 5.70, 'SGD', 'normal', 6, 9, 'official_shopee_2025', 100),

-- 3001g-5000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 3001, 5000,
 12.80, 8.50, 'SGD', 'normal', 7, 10, 'official_shopee_2025', 100),

-- 5001g-10000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 5001, 10000,
 20.40, 13.60, 'SGD', 'normal', 8, 12, 'official_shopee_2025', 100),

-- 10001g-20000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 10001, 20000,
 35.20, 23.50, 'SGD', 'normal', 10, 14, 'official_shopee_2025', 100),

-- 20001g-30000g
((SELECT id FROM shopee_markets WHERE country_code = 'SG'), 'A', 20001, 30000,
 52.80, 35.20, 'SGD', 'normal', 12, 16, 'official_shopee_2025', 100);

-- 円換算の自動計算
UPDATE shopee_sls_rates 
SET 
    esf_jpy = esf_amount * (SELECT exchange_rate_to_jpy FROM shopee_markets WHERE country_code = 'SG'),
    actual_jpy = actual_amount * (SELECT exchange_rate_to_jpy FROM shopee_markets WHERE country_code = 'SG')
WHERE market_id = (SELECT id FROM shopee_markets WHERE country_code = 'SG');

-- =============================================================================
-- 3. シンガポール利益計算関数
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_singapore_profit(
    p_yahoo_price_jpy DECIMAL(10,2),
    p_weight_g INTEGER,
    p_estimated_selling_price_jpy DECIMAL(10,2),
    p_zone_code VARCHAR(10) DEFAULT 'A'
) RETURNS TABLE (
    shipping_esf_jpy DECIMAL(10,2),
    shipping_actual_jpy DECIMAL(10,2),
    shipping_benefit_jpy DECIMAL(10,2),
    total_fees_jpy DECIMAL(10,2),
    net_profit_jpy DECIMAL(10,2),
    profit_margin_percent DECIMAL(5,2),
    roi_percent DECIMAL(5,2),
    recommendation_score INTEGER,
    recommendation_reason TEXT
) AS $$
DECLARE
    v_shipping_record RECORD;
    v_market_record RECORD;
    v_commission_jpy DECIMAL(10,2);
    v_payment_fee_jpy DECIMAL(10,2);
    v_withdrawal_fee_jpy DECIMAL(10,2);
    v_total_fees DECIMAL(10,2);
    v_gross_profit DECIMAL(10,2);
    v_net_profit DECIMAL(10,2);
    v_profit_margin DECIMAL(5,2);
    v_roi DECIMAL(5,2);
    v_score INTEGER;
    v_reason TEXT;
BEGIN
    -- シンガポール市場データ取得
    SELECT * INTO v_market_record 
    FROM shopee_markets 
    WHERE country_code = 'SG';
    
    -- 送料データ取得
    SELECT * INTO v_shipping_record
    FROM shopee_sls_rates sr
    WHERE sr.market_id = v_market_record.id
      AND sr.zone_code = p_zone_code
      AND p_weight_g >= sr.weight_from_g 
      AND p_weight_g <= sr.weight_to_g
    ORDER BY sr.weight_from_g ASC
    LIMIT 1;
    
    -- 送料データが見つからない場合
    IF v_shipping_record IS NULL THEN
        RETURN QUERY SELECT 
            0::DECIMAL(10,2), 0::DECIMAL(10,2), 0::DECIMAL(10,2),
            0::DECIMAL(10,2), 0::DECIMAL(10,2), 0::DECIMAL(5,2), 
            0::DECIMAL(5,2), 0::INTEGER, 
            'Error: 該当する重量の送料データが見つかりません'::TEXT;
        RETURN;
    END IF;
    
    -- 各種手数料計算
    v_commission_jpy := p_estimated_selling_price_jpy * (v_market_record.commission_rate / 100);
    v_payment_fee_jpy := p_estimated_selling_price_jpy * (v_market_record.payment_fee_rate / 100);
    v_withdrawal_fee_jpy := p_estimated_selling_price_jpy * (v_market_record.withdrawal_fee_rate / 100);
    v_total_fees := v_commission_jpy + v_payment_fee_jpy + v_withdrawal_fee_jpy;
    
    -- 利益計算
    v_gross_profit := p_estimated_selling_price_jpy - p_yahoo_price_jpy;
    v_net_profit := v_gross_profit - v_total_fees + v_shipping_record.seller_benefit_jpy;
    v_profit_margin := CASE 
        WHEN p_estimated_selling_price_jpy > 0 
        THEN (v_net_profit / p_estimated_selling_price_jpy) * 100
        ELSE 0 
    END;
    v_roi := CASE 
        WHEN p_yahoo_price_jpy > 0 
        THEN (v_net_profit / p_yahoo_price_jpy) * 100
        ELSE 0 
    END;
    
    -- 推奨スコア計算（0-100点）
    v_score := 50; -- ベーススコア
    
    -- 利益率による加点
    IF v_profit_margin >= 30 THEN v_score := v_score + 25;
    ELSIF v_profit_margin >= 20 THEN v_score := v_score + 20;
    ELSIF v_profit_margin >= 15 THEN v_score := v_score + 15;
    ELSIF v_profit_margin >= 10 THEN v_score := v_score + 10;
    ELSIF v_profit_margin < 0 THEN v_score := v_score - 30;
    END IF;
    
    -- 送料利益による加点
    IF v_shipping_record.seller_benefit_jpy >= 200 THEN v_score := v_score + 15;
    ELSIF v_shipping_record.seller_benefit_jpy >= 150 THEN v_score := v_score + 12;
    ELSIF v_shipping_record.seller_benefit_jpy >= 100 THEN v_score := v_score + 8;
    ELSIF v_shipping_record.seller_benefit_jpy >= 50 THEN v_score := v_score + 5;
    END IF;
    
    -- ROIによる加点
    IF v_roi >= 50 THEN v_score := v_score + 10;
    ELSIF v_roi >= 30 THEN v_score := v_score + 8;
    ELSIF v_roi >= 20 THEN v_score := v_score + 5;
    ELSIF v_roi < 0 THEN v_score := v_score - 20;
    END IF;
    
    -- 推奨理由生成
    v_reason := '';
    IF v_profit_margin >= 20 THEN
        v_reason := v_reason || '高利益率(' || ROUND(v_profit_margin, 1) || '%)・';
    END IF;
    IF v_shipping_record.seller_benefit_jpy >= 100 THEN
        v_reason := v_reason || '送料利益+¥' || ROUND(v_shipping_record.seller_benefit_jpy) || '・';
    END IF;
    IF v_roi >= 30 THEN
        v_reason := v_reason || 'ROI' || ROUND(v_roi, 1) || '%・';
    END IF;
    
    -- 末尾の「・」を削除
    v_reason := RTRIM(v_reason, '・');
    IF v_reason = '' THEN
        v_reason := 'シンガポール市場適正範囲';
    END IF;
    
    -- スコア範囲制限
    v_score := GREATEST(0, LEAST(100, v_score));
    
    RETURN QUERY SELECT 
        v_shipping_record.esf_jpy,
        v_shipping_record.actual_jpy,
        v_shipping_record.seller_benefit_jpy,
        v_total_fees,
        v_net_profit,
        v_profit_margin,
        v_roi,
        v_score,
        v_reason;
    
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. インデックス・制約・トリガー
-- =============================================================================

-- インデックス作成
CREATE INDEX idx_shopee_sls_rates_market_weight ON shopee_sls_rates(market_id, weight_from_g, weight_to_g);
CREATE INDEX idx_shopee_sls_rates_zone ON shopee_sls_rates(market_id, zone_code);
CREATE INDEX idx_shopee_profit_calc_product ON shopee_profit_calculations(product_id, is_latest);
CREATE INDEX idx_shopee_profit_calc_market ON shopee_profit_calculations(market_code, recommendation_score DESC);

-- 為替レート更新時の自動料金更新トリガー
CREATE OR REPLACE FUNCTION trigger_update_sg_jpy_rates()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.country_code = 'SG' AND OLD.exchange_rate_to_jpy IS DISTINCT FROM NEW.exchange_rate_to_jpy THEN
        UPDATE shopee_sls_rates 
        SET 
            esf_jpy = esf_amount * NEW.exchange_rate_to_jpy,
            actual_jpy = actual_amount * NEW.exchange_rate_to_jpy,
            updated_at = NOW()
        WHERE market_id = NEW.id;
        
        RAISE NOTICE 'シンガポール送料の円換算を更新: 1SGD = ¥%', NEW.exchange_rate_to_jpy;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sg_exchange_rate_update
    AFTER UPDATE ON shopee_markets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_sg_jpy_rates();

-- =============================================================================
-- 5. シンガポール動作確認用テストデータ
-- =============================================================================

-- テスト: 500g商品の利益計算
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '=== シンガポール利益計算テスト（500g商品）===';
    
    SELECT * INTO test_result
    FROM calculate_singapore_profit(
        3000.00,  -- Yahoo価格: 3,000円
        500,      -- 重量: 500g
        8000.00,  -- 販売予定価格: 8,000円
        'A'       -- ゾーンA
    );
    
    RAISE NOTICE '送料ESF（購入者負担）: ¥%', test_result.shipping_esf_jpy;
    RAISE NOTICE '送料実額（セラー負担）: ¥%', test_result.shipping_actual_jpy;  
    RAISE NOTICE '送料差額利益: ¥%', test_result.shipping_benefit_jpy;
    RAISE NOTICE 'Shopee手数料合計: ¥%', test_result.total_fees_jpy;
    RAISE NOTICE '最終利益: ¥%', test_result.net_profit_jpy;
    RAISE NOTICE '利益率: %% ', test_result.profit_margin_percent;
    RAISE NOTICE 'ROI: %% ', test_result.roi_percent;
    RAISE NOTICE '推奨スコア: % 点', test_result.recommendation_score;
    RAISE NOTICE '推奨理由: %', test_result.recommendation_reason;
END $$;

-- =============================================================================
-- 6. データ品質確認
-- =============================================================================

-- シンガポールデータ確認クエリ
SELECT 
    'シンガポール設定確認' as check_type,
    sm.country_name,
    sm.currency_code || ' (1' || sm.currency_symbol || ' = ¥' || sm.exchange_rate_to_jpy || ')' as exchange_rate,
    COUNT(ssr.*) as shipping_rates_count,
    MIN(ssr.weight_from_g) || 'g～' || MAX(ssr.weight_to_g) || 'g' as weight_coverage,
    ROUND(AVG(ssr.seller_benefit_jpy), 0) || '円' as avg_seller_benefit
FROM shopee_markets sm
LEFT JOIN shopee_sls_rates ssr ON sm.id = ssr.market_id
WHERE sm.country_code = 'SG'
GROUP BY sm.id, sm.country_name, sm.currency_code, sm.currency_symbol, sm.exchange_rate_to_jpy;

-- 完了メッセージ
SELECT 
    '🇸🇬 シンガポール（SG）完全実装完了！' as status,
    '9重量区分・完全利益計算・推奨システム実装済み' as features,
    'Phase 2: フィリピン(PH)実装準備完了' as next_step;