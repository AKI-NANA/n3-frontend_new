-- Advanced Tariff Calculator データベーステーブル作成
-- nagano3_db用 計算履歴保存テーブル

-- 既存テーブル削除（もしあれば）
DROP TABLE IF EXISTS advanced_profit_calculations CASCADE;

-- メインテーブル: 高度利益計算履歴
CREATE TABLE advanced_profit_calculations (
    id SERIAL PRIMARY KEY,
    
    -- プラットフォーム・モード情報
    platform VARCHAR(50) NOT NULL,           -- 'eBay USA' / 'Shopee'
    shipping_mode VARCHAR(10),               -- 'DDP' / 'DDU' / NULL
    country VARCHAR(10),                     -- 'SG', 'MY', 'TH', 'PH', 'ID', 'VN', 'TW' / NULL for eBay
    
    -- 商品情報
    item_title TEXT NOT NULL,               -- 商品タイトル
    category VARCHAR(50),                    -- 商品カテゴリー
    weight_kg DECIMAL(8,2),                 -- 重量（kg）
    
    -- 価格情報
    purchase_price_jpy DECIMAL(12,2) NOT NULL,  -- 仕入れ価格（円）
    sell_price_usd DECIMAL(12,2),              -- 販売価格（USD）
    sell_price_local DECIMAL(12,2),            -- 販売価格（現地通貨）
    shipping_fee_usd DECIMAL(10,2),            -- 送料（USD）
    shipping_fee_local DECIMAL(10,2),          -- 送料（現地通貨）
    
    -- 計算結果
    calculated_profit_jpy DECIMAL(12,2) NOT NULL,  -- 計算利益（円）
    margin_percent DECIMAL(8,2),                   -- 利益率（%）
    roi_percent DECIMAL(8,2),                      -- ROI（%）
    
    -- 税金・手数料
    tariff_jpy DECIMAL(12,2) DEFAULT 0,        -- 関税額（円）
    tariff_rate_percent DECIMAL(5,2) DEFAULT 0, -- 関税率（%）
    vat_jpy DECIMAL(12,2) DEFAULT 0,           -- VAT/GST額（円）
    vat_rate_percent DECIMAL(5,2) DEFAULT 0,   -- VAT/GST率（%）
    platform_fees_jpy DECIMAL(12,2) DEFAULT 0, -- プラットフォーム手数料（円）
    
    -- 追加コスト
    outsource_fee DECIMAL(10,2) DEFAULT 0,     -- 外注工賃費
    packaging_fee DECIMAL(10,2) DEFAULT 0,     -- 梱包費
    domestic_shipping DECIMAL(10,2) DEFAULT 300, -- 国内送料
    international_shipping DECIMAL(10,2) DEFAULT 500, -- 国際送料
    
    -- 為替情報
    exchange_rate DECIMAL(10,4),               -- 使用為替レート
    exchange_rate_base DECIMAL(10,4),          -- 基本為替レート
    exchange_margin DECIMAL(5,2) DEFAULT 0,    -- 為替変動マージン（%）
    currency_local VARCHAR(3),                 -- 現地通貨コード
    
    -- 免税・税制情報
    duty_free_amount DECIMAL(12,2) DEFAULT 0,  -- 免税額
    taxable_amount DECIMAL(12,2) DEFAULT 0,    -- 課税対象額
    
    -- メタデータ
    calculation_status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'error', 'test'
    error_message TEXT,                        -- エラーメッセージ（もしあれば）
    
    -- タイムスタンプ
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成（検索高速化）
CREATE INDEX idx_advanced_profit_platform ON advanced_profit_calculations(platform);
CREATE INDEX idx_advanced_profit_country ON advanced_profit_calculations(country);
CREATE INDEX idx_advanced_profit_calculated_at ON advanced_profit_calculations(calculated_at);
CREATE INDEX idx_advanced_profit_item_title ON advanced_profit_calculations USING gin(to_tsvector('english', item_title));

-- 統計用ビュー作成
CREATE VIEW profit_calculation_summary AS
SELECT 
    platform,
    country,
    COUNT(*) as calculation_count,
    AVG(calculated_profit_jpy) as avg_profit_jpy,
    AVG(margin_percent) as avg_margin_percent,
    AVG(roi_percent) as avg_roi_percent,
    MIN(calculated_at) as first_calculation,
    MAX(calculated_at) as latest_calculation
FROM advanced_profit_calculations 
WHERE calculation_status = 'completed'
GROUP BY platform, country;

-- サンプルデータ挿入（テスト用）
INSERT INTO advanced_profit_calculations (
    platform, shipping_mode, item_title, category, 
    purchase_price_jpy, sell_price_usd, shipping_fee_usd,
    calculated_profit_jpy, margin_percent, roi_percent,
    tariff_jpy, tariff_rate_percent, platform_fees_jpy,
    outsource_fee, packaging_fee, exchange_rate, exchange_rate_base,
    exchange_margin, currency_local, calculation_status
) VALUES 
(
    'eBay USA', 'DDP', 'iPhone 15 Pro Max 256GB Space Black (Sample)', 'electronics',
    150000, 1200.00, 25.00,
    45000, 30.00, 30.00,
    13500, 7.5, 18000,
    500, 200, 150.0, 148.5,
    5.0, 'USD', 'completed'
),
(
    'Shopee', NULL, 'ワイヤレスイヤホン Bluetooth 5.0 (Sample)', 'electronics',
    3000, NULL, NULL,
    2500, 45.67, 83.33,
    700, 7.0, 800,
    300, 150, 110.0, 108.5,
    3.0, 'SGD', 'completed'
);

-- 権限設定
GRANT ALL PRIVILEGES ON TABLE advanced_profit_calculations TO postgres;
GRANT ALL PRIVILEGES ON SEQUENCE advanced_profit_calculations_id_seq TO postgres;
GRANT SELECT ON profit_calculation_summary TO postgres;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '=== Advanced Profit Calculations テーブル作成完了 ===';
    RAISE NOTICE 'テーブル: advanced_profit_calculations';
    RAISE NOTICE 'インデックス: 4個作成済み';
    RAISE NOTICE 'ビュー: profit_calculation_summary';
    RAISE NOTICE 'サンプルデータ: 2件挿入済み';
    RAISE NOTICE 'advanced_tariff_calculator.php 保存機能が利用可能になりました！';
END $$;
