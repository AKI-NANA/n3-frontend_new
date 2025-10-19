-- Advanced Tariff Calculator 設定保存テーブル
-- ユーザー設定・デフォルト値保存用

-- 設定保存テーブル作成
CREATE TABLE IF NOT EXISTS advanced_tariff_settings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) DEFAULT 'default',  -- 将来のマルチユーザー対応
    setting_category VARCHAR(50) NOT NULL,  -- 'ebay_usa', 'shopee', 'general'
    setting_key VARCHAR(100) NOT NULL,      -- 'electronics_tariff', 'outsource_fee' etc.
    setting_value TEXT NOT NULL,            -- 設定値（JSON形式も対応）
    setting_type VARCHAR(20) DEFAULT 'text', -- 'number', 'text', 'json', 'boolean'
    description TEXT,                        -- 設定の説明
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, setting_category, setting_key)
);

-- デフォルト設定データ投入
INSERT INTO advanced_tariff_settings (setting_category, setting_key, setting_value, setting_type, description) VALUES

-- eBay USA デフォルト設定
('ebay_usa', 'electronics_tariff', '7.5', 'number', 'Electronics関税率(%)'),
('ebay_usa', 'textiles_tariff', '12.0', 'number', 'Textiles関税率(%)'),
('ebay_usa', 'other_tariff', '5.0', 'number', 'Other関税率(%)'),
('ebay_usa', 'outsource_fee', '500', 'number', '外注工賃費(円)'),
('ebay_usa', 'packaging_fee', '200', 'number', '梱包費(円)'),
('ebay_usa', 'exchange_margin', '5.0', 'number', '為替変動マージン(%)'),
('ebay_usa', 'default_shipping', '25', 'number', 'デフォルト送料(USD)'),
('ebay_usa', 'shipping_mode', 'ddp', 'text', 'デフォルト配送モード'),

-- Shopee デフォルト設定  
('shopee', 'default_country', 'SG', 'text', 'デフォルト販売国'),
('shopee', 'default_outsource_fee', '300', 'number', '外注工賃費(円)'),
('shopee', 'default_packaging_fee', '150', 'number', '梱包費(円)'),
('shopee', 'default_exchange_margin', '3.0', 'number', '為替変動マージン(%)'),
('shopee', 'default_shipping_local', '10', 'number', 'デフォルト送料(現地通貨)'),

-- 一般設定
('general', 'default_domestic_shipping', '300', 'number', '国内送料(円)'),
('general', 'auto_save_calculations', 'true', 'boolean', '計算結果自動保存'),
('general', 'show_detailed_breakdown', 'true', 'boolean', '詳細内訳表示'),
('general', 'currency_update_interval', '3600', 'number', '為替レート更新間隔(秒)'),

-- プリセット商品（よく計算する商品）
('presets', 'ebay_iphone_15_pro', '{"title":"iPhone 15 Pro Max 256GB","purchase_price":150000,"sell_price":1200,"category":"electronics"}', 'json', 'iPhone 15 Pro プリセット'),
('presets', 'shopee_earphones', '{"title":"ワイヤレスイヤホン Bluetooth","purchase_price":3000,"sell_price":100,"category":"electronics"}', 'json', 'イヤホン プリセット');

-- インデックス作成
CREATE INDEX idx_tariff_settings_category ON advanced_tariff_settings(setting_category);
CREATE INDEX idx_tariff_settings_user ON advanced_tariff_settings(user_id);

-- 設定取得用ビュー
CREATE VIEW current_tariff_settings AS
SELECT 
    setting_category,
    setting_key,
    setting_value,
    setting_type,
    description
FROM advanced_tariff_settings 
WHERE is_active = TRUE 
AND user_id = 'default'
ORDER BY setting_category, setting_key;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE '=== Advanced Tariff Settings テーブル作成完了 ===';
    RAISE NOTICE 'テーブル: advanced_tariff_settings';
    RAISE NOTICE 'デフォルト設定: % 件挿入', (SELECT COUNT(*) FROM advanced_tariff_settings);
    RAISE NOTICE '設定保存・読み込み機能が利用可能になりました！';
END $$;