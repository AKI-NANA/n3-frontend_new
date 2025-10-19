-- Enhanced Database Schema - 変動手数料対応版
-- eBayの複雑な手数料構造に対応したデータベース設計
-- @version 3.0.0

-- ====================
-- 1. セラー情報テーブル（新規追加）
-- ====================
CREATE TABLE seller_profiles (
    id SERIAL PRIMARY KEY,
    seller_id VARCHAR(100) UNIQUE NOT NULL,
    registered_country VARCHAR(2) DEFAULT 'JP', -- ISO国コード
    store_subscription_type VARCHAR(20) DEFAULT 'basic', -- basic, premium, anchor, enterprise
    seller_level VARCHAR(20) DEFAULT 'standard', -- above_standard, standard, below_standard
    last_level_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================
-- 2. 売上履歴テーブル（ボリュームディスカウント計算用）
-- ====================
CREATE TABLE ebay_sales_history (
    id SERIAL PRIMARY KEY,
    seller_id VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    sale_date DATE NOT NULL,
    ebay_site VARCHAR(10) NOT NULL, -- ebay.com, ebay.co.uk, ebay.de, etc.
    item_id VARCHAR(50),
    sale_amount_original DECIMAL(12,2) NOT NULL, -- 元通貨での売上
    sale_amount_usd DECIMAL(12,2) NOT NULL, -- USD換算売上
    original_currency VARCHAR(3) NOT NULL,
    buyer_country VARCHAR(2),
    is_international BOOLEAN DEFAULT FALSE,
    fees_paid DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (seller_id) REFERENCES seller_profiles(seller_id)
);

-- インデックス作成
CREATE INDEX idx_sales_history_seller_date ON ebay_sales_history(seller_id, sale_date);
CREATE INDEX idx_sales_history_site ON ebay_sales_history(ebay_site);
CREATE INDEX idx_sales_history_international ON ebay_sales_history(is_international);

-- ====================
-- 3. 手数料設定テーブル（拡張版）
-- ====================
CREATE TABLE fee_structures (
    id SERIAL PRIMARY KEY,
    fee_type VARCHAR(50) NOT NULL, -- 'final_value', 'insertion', 'international', 'currency_conversion', 'volume_discount'
    category_id INTEGER,
    store_type VARCHAR(20), -- basic, premium, anchor, enterprise
    ebay_site VARCHAR(10), -- ebay.com, ebay.co.uk, etc.
    seller_country VARCHAR(2), -- セラーの国
    condition_type VARCHAR(50), -- 適用条件（売上額など）
    fee_rate DECIMAL(8,4), -- パーセンテージ
    fixed_fee DECIMAL(8,2), -- 固定額
    min_amount DECIMAL(8,2), -- 最低額
    max_amount DECIMAL(8,2), -- 最高額
    effective_from DATE NOT NULL,
    effective_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id)
);

-- インデックス作成
CREATE INDEX idx_fee_structures_type_category ON fee_structures(fee_type, category_id);
CREATE INDEX idx_fee_structures_site_country ON fee_structures(ebay_site, seller_country);
CREATE INDEX idx_fee_structures_effective ON fee_structures(effective_from, effective_until);

-- ====================
-- 4. ボリュームディスカウント設定
-- ====================
CREATE TABLE volume_discount_tiers (
    id SERIAL PRIMARY KEY,
    seller_country VARCHAR(2) NOT NULL,
    min_monthly_sales DECIMAL(12,2) NOT NULL,
    max_monthly_sales DECIMAL(12,2),
    discount_rate DECIMAL(6,4) NOT NULL, -- 例: 0.0120 = 1.20%
    fee_type VARCHAR(50) DEFAULT 'international', -- 対象手数料タイプ
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ投入（日本セラー向け海外決済手数料ディスカウント）
INSERT INTO volume_discount_tiers (seller_country, min_monthly_sales, max_monthly_sales, discount_rate, fee_type) VALUES
('JP', 3000.00, 9999.99, 0.0120, 'international'),
('JP', 10000.00, 49999.99, 0.0095, 'international'),
('JP', 50000.00, 99999.99, 0.0070, 'international'),
('JP', 100000.00, NULL, 0.0040, 'international');

-- ====================
-- 5. セラー別月次統計テーブル
-- ====================
CREATE TABLE seller_monthly_stats (
    id SERIAL PRIMARY KEY,
    seller_id VARCHAR(100) NOT NULL,
    stats_month DATE NOT NULL, -- 月の開始日（2025-01-01など）
    total_sales_usd DECIMAL(12,2) DEFAULT 0,
    total_international_sales_usd DECIMAL(12,2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    applicable_volume_discount_rate DECIMAL(6,4),
    seller_level_at_month VARCHAR(20),
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (seller_id) REFERENCES seller_profiles(seller_id),
    UNIQUE(seller_id, stats_month)
);

-- インデックス作成
CREATE INDEX idx_monthly_stats_seller_month ON seller_monthly_stats(seller_id, stats_month);

-- ====================
-- 6. 手数料計算履歴テーブル（拡張版）
-- ====================
ALTER TABLE profit_calculations ADD COLUMN international_fee_usd DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profit_calculations ADD COLUMN currency_conversion_fee_usd DECIMAL(10,2) DEFAULT 0;
ALTER TABLE profit_calculations ADD COLUMN volume_discount_applied DECIMAL(6,4);
ALTER TABLE profit_calculations ADD COLUMN ebay_site VARCHAR(10) DEFAULT 'ebay.com';
ALTER TABLE profit_calculations ADD COLUMN seller_id VARCHAR(100);

-- ====================
-- 7. 初期手数料データ投入
-- ====================

-- Final Value Fee（カテゴリー別・ストアタイプ別）
INSERT INTO fee_structures (fee_type, category_id, store_type, fee_rate, fixed_fee, effective_from) VALUES
-- Consumer Electronics
('final_value', 293, 'basic', 0.1290, 0.30, '2025-01-01'),
('final_value', 293, 'premium', 0.1190, 0.30, '2025-01-01'),
('final_value', 293, 'anchor', 0.1040, 0.30, '2025-01-01'),
('final_value', 293, 'enterprise', 0.0915, 0.30, '2025-01-01'),

-- Clothing, Shoes & Accessories
('final_value', 11450, 'basic', 0.1325, 0.30, '2025-01-01'),
('final_value', 11450, 'premium', 0.1225, 0.30, '2025-01-01'),
('final_value', 11450, 'anchor', 0.1070, 0.30, '2025-01-01'),
('final_value', 11450, 'enterprise', 0.0945, 0.30, '2025-01-01'),

-- Books
('final_value', 267, 'basic', 0.1500, 0.30, '2025-01-01'),
('final_value', 267, 'premium', 0.1400, 0.30, '2025-01-01'),
('final_value', 267, 'anchor', 0.1245, 0.30, '2025-01-01'),
('final_value', 267, 'enterprise', 0.1120, 0.30, '2025-01-01');

-- 海外決済手数料（国別）
INSERT INTO fee_structures (fee_type, seller_country, fee_rate, effective_from) VALUES
('international', 'JP', 0.0135, '2025-01-01'), -- 日本: 1.35%
('international', 'US', 0.0135, '2025-01-01'), -- アメリカ: 1.35%
('international', 'GB', 0.0135, '2025-01-01'), -- イギリス: 1.35%
('international', 'DE', 0.0135, '2025-01-01'), -- ドイツ: 1.35%
('international', 'AU', 0.0135, '2025-01-01'); -- オーストラリア: 1.35%

-- 為替手数料
INSERT INTO fee_structures (fee_type, fee_rate, effective_from) VALUES
('currency_conversion', 0.030, '2025-01-01'); -- 3.0%

-- ====================
-- 8. 動的手数料計算関数
-- ====================

-- セラーの現在のボリュームディスカウント率を取得
CREATE OR REPLACE FUNCTION get_volume_discount_rate(
    p_seller_id VARCHAR(100),
    p_seller_country VARCHAR(2) DEFAULT 'JP'
) RETURNS DECIMAL(6,4) AS $$
DECLARE
    v_two_months_ago DATE;
    v_total_sales DECIMAL(12,2);
    v_discount_rate DECIMAL(6,4) := 0;
    v_seller_level VARCHAR(20);
BEGIN
    -- 前々月の期間を計算
    v_two_months_ago := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months');
    
    -- セラーレベルをチェック
    SELECT seller_level INTO v_seller_level
    FROM seller_profiles
    WHERE seller_id = p_seller_id;
    
    -- Below Standardの場合はディスカウント適用なし
    IF v_seller_level = 'below_standard' THEN
        RETURN 0;
    END IF;
    
    -- 前々月の売上を集計
    SELECT COALESCE(SUM(sale_amount_usd), 0) INTO v_total_sales
    FROM ebay_sales_history
    WHERE seller_id = p_seller_id
      AND sale_date >= v_two_months_ago
      AND sale_date < v_two_months_ago + INTERVAL '1 month'
      AND is_international = TRUE;
    
    -- 該当するディスカウント率を取得
    SELECT discount_rate INTO v_discount_rate
    FROM volume_discount_tiers
    WHERE seller_country = p_seller_country
      AND min_monthly_sales <= v_total_sales
      AND (max_monthly_sales IS NULL OR v_total_sales <= max_monthly_sales)
      AND is_active = TRUE
    ORDER BY min_monthly_sales DESC
    LIMIT 1;
    
    RETURN COALESCE(v_discount_rate, 0);
END;
$$ LANGUAGE plpgsql;

-- カテゴリー・ストアタイプ別手数料取得関数
CREATE OR REPLACE FUNCTION get_category_fees(
    p_category_id INTEGER,
    p_store_type VARCHAR(20) DEFAULT 'basic',
    p_fee_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
    final_value_rate DECIMAL(8,4),
    insertion_fee DECIMAL(8,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fs.fee_rate as final_value_rate,
        fs.fixed_fee as insertion_fee
    FROM fee_structures fs
    WHERE fs.fee_type = 'final_value'
      AND fs.category_id = p_category_id
      AND fs.store_type = p_store_type
      AND fs.effective_from <= p_fee_date
      AND (fs.effective_until IS NULL OR fs.effective_until >= p_fee_date)
      AND fs.is_active = TRUE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 9. セラー情報初期化（サンプル）
-- ====================
INSERT INTO seller_profiles (seller_id, registered_country, store_subscription_type, seller_level) VALUES
('sample_seller_001', 'JP', 'basic', 'standard');

-- ====================
-- 10. 月次統計更新バッチ処理用関数
-- ====================
CREATE OR REPLACE FUNCTION update_monthly_seller_stats(
    p_seller_id VARCHAR(100),
    p_stats_month DATE
) RETURNS VOID AS $$
DECLARE
    v_total_sales DECIMAL(12,2);
    v_international_sales DECIMAL(12,2);
    v_transaction_count INTEGER;
    v_discount_rate DECIMAL(6,4);
    v_seller_level VARCHAR(20);
BEGIN
    -- 指定月の統計を計算
    SELECT 
        COALESCE(SUM(sale_amount_usd), 0),
        COALESCE(SUM(CASE WHEN is_international THEN sale_amount_usd ELSE 0 END), 0),
        COUNT(*)
    INTO v_total_sales, v_international_sales, v_transaction_count
    FROM ebay_sales_history
    WHERE seller_id = p_seller_id
      AND sale_date >= p_stats_month
      AND sale_date < p_stats_month + INTERVAL '1 month';
    
    -- セラーレベルを取得
    SELECT seller_level INTO v_seller_level
    FROM seller_profiles
    WHERE seller_profiles.seller_id = p_seller_id;
    
    -- ボリュームディスカウント率を計算
    v_discount_rate := get_volume_discount_rate(p_seller_id, 'JP');
    
    -- 統計データを挿入または更新
    INSERT INTO seller_monthly_stats (
        seller_id, stats_month, total_sales_usd, total_international_sales_usd,
        transaction_count, applicable_volume_discount_rate, seller_level_at_month
    )
    VALUES (
        p_seller_id, p_stats_month, v_total_sales, v_international_sales,
        v_transaction_count, v_discount_rate, v_seller_level
    )
    ON CONFLICT (seller_id, stats_month)
    DO UPDATE SET
        total_sales_usd = EXCLUDED.total_sales_usd,
        total_international_sales_usd = EXCLUDED.total_international_sales_usd,
        transaction_count = EXCLUDED.transaction_count,
        applicable_volume_discount_rate = EXCLUDED.applicable_volume_discount_rate,
        seller_level_at_month = EXCLUDED.seller_level_at_month,
        last_calculated = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 11. データ整合性チェック用ビュー
-- ====================
CREATE VIEW seller_discount_summary AS
SELECT 
    sp.seller_id,
    sp.registered_country,
    sp.store_subscription_type,
    sp.seller_level,
    sms.stats_month,
    sms.total_international_sales_usd,
    sms.applicable_volume_discount_rate,
    CASE 
        WHEN sp.seller_level = 'below_standard' THEN 'ディスカウント適用なし（セラーレベル）'
        WHEN sms.total_international_sales_usd < 3000 THEN 'ディスカウント適用なし（売上不足）'
        ELSE CONCAT(sms.applicable_volume_discount_rate * 100, '% ディスカウント適用')
    END as discount_status
FROM seller_profiles sp
LEFT JOIN seller_monthly_stats sms ON sp.seller_id = sms.seller_id
WHERE sms.stats_month = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
   OR sms.stats_month IS NULL;

COMMIT;