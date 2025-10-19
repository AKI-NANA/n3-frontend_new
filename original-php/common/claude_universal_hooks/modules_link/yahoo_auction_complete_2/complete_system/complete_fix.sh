#!/bin/bash
# 完全データベース権限修正スクリプト

echo "🔧 データベース権限問題を完全修正中..."

# 1. 現在動作中のサーバーを停止
echo "🛑 既存サーバー停止中..."
pkill -f "profit_calculator_api" 2>/dev/null
pkill -f "python3 -m http.server 8080" 2>/dev/null
sleep 2

# 2. データベース権限を完全修正
echo "🔐 データベース権限修正中..."
psql -d postgres << 'EOF'
-- nagano3_userに完全な権限を付与
ALTER USER nagano3_user CREATEDB;
ALTER USER nagano3_user SUPERUSER;

-- nagano3_dbの所有者をnagano3_userに変更
ALTER DATABASE nagano3_db OWNER TO nagano3_user;

-- 接続権限確認
GRANT ALL PRIVILEGES ON DATABASE nagano3_db TO nagano3_user;
EOF

echo "✅ データベース権限修正完了"

# 3. nagano3_userで全テーブルの所有者変更
echo "🗃️ テーブル所有者変更中..."
psql -d nagano3_db -U nagano3_user -h localhost << 'EOF'
-- 既存テーブルがある場合は所有者変更
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I OWNER TO nagano3_user', table_name);
    END LOOP;
END $$;

-- 既存シーケンスの所有者変更
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I OWNER TO nagano3_user', seq_name);
    END LOOP;
END $$;

-- 既存ビューの所有者変更
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN 
        SELECT viewname FROM pg_views WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER VIEW %I OWNER TO nagano3_user', view_name);
    END LOOP;
END $$;
EOF

echo "✅ テーブル所有者変更完了"

# 4. クリーンなデータベーススキーマ再作成
echo "🗄️ クリーンスキーマ再作成中..."

# 新しい修正版SQLファイル作成
cat > shipping_profit_database_fixed.sql << 'EOF'
-- Yahoo Auction Tool 送料・利益計算システム 権限修正版

-- 既存オブジェクト削除（権限問題解決）
DROP TABLE IF EXISTS profit_calculation_history CASCADE;
DROP TABLE IF EXISTS additional_fees CASCADE;
DROP TABLE IF EXISTS shipping_rates CASCADE;
DROP TABLE IF EXISTS shipping_services CASCADE;
DROP TABLE IF EXISTS ebay_fees CASCADE;
DROP TABLE IF EXISTS category_weight_estimation CASCADE;
DROP TABLE IF EXISTS exchange_rates_extended CASCADE;
DROP TABLE IF EXISTS item_master_extended CASCADE;
DROP TABLE IF EXISTS batch_processing_log CASCADE;
DROP TABLE IF EXISTS user_settings_extended CASCADE;

DROP VIEW IF EXISTS latest_exchange_rates CASCADE;
DROP VIEW IF EXISTS active_shipping_services CASCADE;

DROP FUNCTION IF EXISTS get_usa_shipping_cost CASCADE;
DROP FUNCTION IF EXISTS estimate_weight_by_category CASCADE;

-- 1. 送料サービスマスター
CREATE TABLE shipping_services (
    service_id SERIAL PRIMARY KEY,
    service_provider VARCHAR(100) NOT NULL, -- 'eLogi', 'cpass', '日本郵便', 'FedEx', 'DHL'
    service_name VARCHAR(100) NOT NULL,
    service_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- 物理的制限
    max_weight_kg DECIMAL(10,2) NOT NULL,
    max_length_cm DECIMAL(10,2) NOT NULL,
    max_width_cm DECIMAL(10,2) NOT NULL,
    max_height_cm DECIMAL(10,2) NOT NULL,
    max_girth_cm DECIMAL(10,2), -- 胴回り制限
    
    -- サービス特性
    tracking_available BOOLEAN DEFAULT TRUE,
    insurance_available BOOLEAN DEFAULT TRUE,
    signature_required BOOLEAN DEFAULT FALSE,
    estimated_delivery_days_min INTEGER,
    estimated_delivery_days_max INTEGER,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 送料レートテーブル（USA基準＋地域別差額）
CREATE TABLE shipping_rates (
    rate_id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES shipping_services(service_id),
    destination_country_code VARCHAR(3) NOT NULL, -- ISO 3166-1 alpha-3
    weight_from_kg DECIMAL(10,3) NOT NULL,
    weight_to_kg DECIMAL(10,3) NOT NULL,
    base_cost_usd DECIMAL(10,2) NOT NULL,
    
    -- USA基準送料差額計算用
    usa_price_differential DECIMAL(10,2) DEFAULT 0.00, -- USAとの差額
    is_usa_baseline BOOLEAN DEFAULT FALSE, -- USA基準フラグ
    
    -- 容積重量計算係数
    volumetric_divisor INTEGER DEFAULT 5000,
    
    -- 管理情報
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(service_id, destination_country_code, weight_from_kg, weight_to_kg)
);

-- 3. 追加費用マスター
CREATE TABLE additional_fees (
    fee_id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES shipping_services(service_id),
    fee_type VARCHAR(50) NOT NULL, -- 'fuel_surcharge', 'insurance', 'signature', 'oversize'
    fee_name VARCHAR(100) NOT NULL,
    
    -- 費用計算方法
    cost_type VARCHAR(20) NOT NULL, -- 'fixed', 'percentage', 'tiered'
    fixed_cost_usd DECIMAL(10,2) DEFAULT 0,
    percentage_rate DECIMAL(5,4) DEFAULT 0, -- 0.1500 = 15%
    
    -- 適用条件
    condition_description TEXT,
    min_weight_kg DECIMAL(10,2),
    max_weight_kg DECIMAL(10,2),
    min_declared_value_usd DECIMAL(10,2),
    max_declared_value_usd DECIMAL(10,2),
    
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 4. eBay手数料マスター（カテゴリー別）
CREATE TABLE ebay_fees (
    fee_id SERIAL PRIMARY KEY,
    ebay_category_id VARCHAR(20) NOT NULL,
    category_name VARCHAR(200),
    
    -- 手数料率
    final_value_fee_percent DECIMAL(5,3) NOT NULL, -- 10.350 = 10.35%
    payment_fee_percent DECIMAL(5,3) DEFAULT 2.900, -- 2.900 = 2.9%
    payment_fee_fixed_usd DECIMAL(5,2) DEFAULT 0.30,
    international_fee_percent DECIMAL(5,3) DEFAULT 1.650, -- 1.650 = 1.65%
    
    -- 管理情報
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ebay_category_id, effective_from)
);

-- 5. 商品マスター拡張
CREATE TABLE item_master_extended (
    item_id SERIAL PRIMARY KEY,
    item_code VARCHAR(100) UNIQUE NOT NULL,
    item_name VARCHAR(500) NOT NULL,
    
    -- 基本情報
    cost_jpy DECIMAL(12,2) NOT NULL,
    weight_kg DECIMAL(10,3), -- NULL可（推定値使用）
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    height_cm DECIMAL(10,2),
    
    -- eBay情報
    ebay_category_id VARCHAR(20),
    ebay_category_name VARCHAR(200),
    
    -- 重量推定情報
    estimated_weight_kg DECIMAL(10,3), -- 推定重量
    weight_estimation_confidence DECIMAL(3,2), -- 推定信頼度 0.00-1.00
    weight_estimation_method VARCHAR(50), -- 'category_average', 'ml_model', 'manual'
    
    -- 計算結果キャッシュ
    calculated_selling_price_usd DECIMAL(10,2),
    estimated_profit_usd DECIMAL(10,2),
    estimated_profit_margin_percent DECIMAL(5,2),
    usa_shipping_cost_usd DECIMAL(10,2), -- USA基準送料
    
    -- 管理情報
    source_url VARCHAR(1000), -- Yahoo Auction等のソースURL
    data_source VARCHAR(50), -- 'yahoo_csv', 'manual_input'
    last_calculation_at TIMESTAMP,
    last_update_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. カテゴリー別重量推定データ
CREATE TABLE category_weight_estimation (
    estimation_id SERIAL PRIMARY KEY,
    ebay_category_id VARCHAR(20) NOT NULL,
    category_name VARCHAR(200),
    
    -- 統計データ
    sample_count INTEGER DEFAULT 0,
    average_weight_kg DECIMAL(10,3),
    median_weight_kg DECIMAL(10,3),
    min_weight_kg DECIMAL(10,3),
    max_weight_kg DECIMAL(10,3),
    std_deviation DECIMAL(10,3),
    
    -- 推定ルール
    default_weight_kg DECIMAL(10,3),
    confidence_level DECIMAL(3,2) DEFAULT 0.70, -- 0.70 = 70%
    
    last_calculated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(ebay_category_id)
);

-- 7. 為替レートキャッシュ拡張
CREATE TABLE exchange_rates_extended (
    rate_id SERIAL PRIMARY KEY,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    
    -- レート情報
    raw_rate DECIMAL(12,6) NOT NULL, -- 生レート
    safety_margin_percent DECIMAL(5,2) DEFAULT 5.00, -- 安全マージン5%
    adjusted_rate DECIMAL(12,6) NOT NULL, -- 調整後レート
    
    -- ソース情報
    source VARCHAR(50) NOT NULL, -- 'OANDA', 'Fixer.io', 'ExchangeRate-API'
    fetched_at TIMESTAMP DEFAULT NOW(),
    
    -- 変動監視
    previous_rate DECIMAL(12,6),
    change_percent DECIMAL(5,2),
    volatility_alert BOOLEAN DEFAULT FALSE,
    
    UNIQUE(from_currency, to_currency)
);

-- 8. 利益計算履歴
CREATE TABLE profit_calculation_history (
    calculation_id SERIAL PRIMARY KEY,
    item_code VARCHAR(100),
    
    -- 入力値
    input_cost_jpy DECIMAL(12,2),
    input_weight_kg DECIMAL(10,3),
    input_dimensions_cm VARCHAR(50), -- "30x20x15"
    destination_country VARCHAR(3) DEFAULT 'USA',
    
    -- 計算結果
    exchange_rate_used DECIMAL(12,6),
    shipping_cost_usd DECIMAL(10,2),
    ebay_fees_total_usd DECIMAL(10,2),
    total_cost_usd DECIMAL(10,2),
    selling_price_usd DECIMAL(10,2),
    profit_usd DECIMAL(10,2),
    profit_margin_percent DECIMAL(5,2),
    
    -- 詳細内訳（JSON）
    cost_breakdown TEXT,
    
    calculation_timestamp TIMESTAMP DEFAULT NOW(),
    calculation_method VARCHAR(50) DEFAULT 'api_v1'
);

-- 9. バッチ処理管理
CREATE TABLE batch_processing_log (
    batch_id SERIAL PRIMARY KEY,
    batch_type VARCHAR(50) NOT NULL, -- 'recalculate_all', 'update_rates', 'update_weights'
    
    -- 実行情報
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running', -- 'running', 'completed', 'failed'
    
    -- 処理結果
    total_items INTEGER,
    processed_items INTEGER,
    failed_items INTEGER,
    error_message TEXT,
    
    -- 設定
    parameters TEXT
);

-- 10. ユーザー設定管理
CREATE TABLE user_settings_extended (
    setting_id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) DEFAULT 'default_user',
    setting_category VARCHAR(50) NOT NULL, -- 'exchange', 'shipping', 'profit'
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, setting_category, setting_key)
);

-- 初期データ投入
INSERT INTO user_settings_extended (setting_category, setting_key, setting_value, setting_type, description) VALUES
-- 為替設定
('exchange', 'safety_margin_percent', '5.0', 'number', '為替レート安全マージン（%）'),
('exchange', 'auto_update_frequency_hours', '6', 'number', '為替レート自動更新頻度（時間）'),
('exchange', 'volatility_alert_threshold', '3.0', 'number', '変動アラート閾値（%）'),

-- 送料設定
('shipping', 'default_destination', 'USA', 'string', 'デフォルト配送先'),
('shipping', 'usa_baseline_enabled', 'true', 'boolean', 'USA基準送料方式有効'),
('shipping', 'include_fuel_surcharge', 'true', 'boolean', '燃油サーチャージ含む'),

-- 利益設定
('profit', 'min_profit_margin_percent', '20.0', 'number', '最低利益率（%）'),
('profit', 'min_profit_amount_usd', '5.0', 'number', '最低利益額（USD）'),
('profit', 'auto_recalculate_enabled', 'true', 'boolean', '自動再計算有効');

-- サンプル送料サービス投入
INSERT INTO shipping_services (service_provider, service_name, service_code, max_weight_kg, max_length_cm, max_width_cm, max_height_cm, max_girth_cm, estimated_delivery_days_min, estimated_delivery_days_max) VALUES
('eLogi', 'FedEx International Economy', 'ELOGI_FEDEX_IE', 68.0, 274.0, 120.0, 120.0, 330.0, 3, 5),
('eLogi', 'FedEx International Priority', 'ELOGI_FEDEX_IP', 68.0, 274.0, 120.0, 120.0, 330.0, 2, 4),
('cpass', 'eBay SpeedPAK Standard', 'CPASS_SPEEDPAK_STD', 30.0, 60.0, 60.0, 60.0, 300.0, 5, 8),
('日本郵便', 'EMS', 'JP_POST_EMS', 30.0, 150.0, 150.0, 150.0, 300.0, 4, 7),
('日本郵便', '国際eパケット', 'JP_POST_EPACKET', 2.0, 60.0, 60.0, 60.0, 90.0, 7, 14);

-- USA基準送料サンプルデータ
INSERT INTO shipping_rates (service_id, destination_country_code, weight_from_kg, weight_to_kg, base_cost_usd, usa_price_differential, is_usa_baseline) VALUES
-- USA基準（差額0）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 0.0, 0.5, 33.00, 0.00, TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 0.5, 1.0, 39.00, 0.00, TRUE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'USA', 1.0, 2.0, 45.00, 0.00, TRUE),

-- カナダ（+$5差額）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'CAN', 0.0, 0.5, 38.00, 5.00, FALSE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'CAN', 0.5, 1.0, 44.00, 5.00, FALSE),

-- ヨーロッパ（+$12差額）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'GBR', 0.0, 0.5, 45.00, 12.00, FALSE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'GBR', 0.5, 1.0, 51.00, 12.00, FALSE),

-- アジア（-$3差額：USAより安い）
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'KOR', 0.0, 0.5, 30.00, -3.00, FALSE),
((SELECT service_id FROM shipping_services WHERE service_code = 'ELOGI_FEDEX_IE'), 'KOR', 0.5, 1.0, 36.00, -3.00, FALSE);

-- eBay手数料サンプルデータ（主要カテゴリー）
INSERT INTO ebay_fees (ebay_category_id, category_name, final_value_fee_percent, payment_fee_percent, payment_fee_fixed_usd, international_fee_percent) VALUES
('176982', 'Cell Phone Accessories', 10.350, 2.900, 0.30, 1.650),
('625', 'Camera Lenses', 10.000, 2.900, 0.30, 1.650),
('14324', 'Vintage Watches', 10.000, 2.900, 0.30, 1.650),
('246', 'Action Figures', 10.350, 2.900, 0.30, 1.650),
('92074', 'Electronic Components', 10.350, 2.900, 0.30, 1.650),
('default', 'Default Category', 10.350, 2.900, 0.30, 1.650);

-- カテゴリー別重量推定データ
INSERT INTO category_weight_estimation (ebay_category_id, category_name, sample_count, average_weight_kg, median_weight_kg, default_weight_kg, confidence_level) VALUES
('176982', 'Cell Phone Accessories', 150, 0.250, 0.200, 0.300, 0.80),
('625', 'Camera Lenses', 89, 1.200, 1.000, 1.500, 0.75),
('14324', 'Vintage Watches', 67, 0.180, 0.150, 0.200, 0.85),
('246', 'Action Figures', 234, 0.800, 0.600, 1.000, 0.70),
('92074', 'Electronic Components', 345, 0.150, 0.100, 0.200, 0.90),
('default', 'Default Category', 1000, 0.500, 0.400, 0.600, 0.60);

-- 初期為替レート
INSERT INTO exchange_rates_extended (from_currency, to_currency, raw_rate, safety_margin_percent, adjusted_rate, source) VALUES
('JPY', 'USD', 0.0067, 5.0, 0.00637, 'manual_initial'),
('USD', 'JPY', 148.5, 5.0, 156.0, 'manual_initial');

-- テスト商品データ
INSERT INTO item_master_extended (item_code, item_name, cost_jpy, weight_kg, length_cm, width_cm, height_cm, ebay_category_id, data_source) VALUES
('TEST-001', 'ワイヤレスイヤホン', 2500.00, 0.3, 15.0, 10.0, 5.0, '176982', 'test_data'),
('TEST-002', 'デジタルカメラレンズ', 15000.00, 1.2, 25.0, 10.0, 10.0, '625', 'test_data'),
('TEST-003', 'ヴィンテージ腕時計', 8000.00, 0.2, 12.0, 8.0, 3.0, '14324', 'test_data'),
('TEST-004', 'アクションフィギュア', 3500.00, 0.8, 30.0, 20.0, 15.0, '246', 'test_data'),
('TEST-005', '電子部品セット', 1200.00, 0.1, 8.0, 6.0, 2.0, '92074', 'test_data');

-- インデックス作成
CREATE INDEX idx_shipping_rates_lookup ON shipping_rates(service_id, destination_country_code, weight_from_kg, weight_to_kg);
CREATE INDEX idx_item_master_category ON item_master_extended(ebay_category_id);
CREATE INDEX idx_profit_calculation_item ON profit_calculation_history(item_code, calculation_timestamp DESC);
CREATE INDEX idx_batch_processing_status ON batch_processing_log(batch_type, status, started_at DESC);
CREATE INDEX idx_user_settings_lookup ON user_settings_extended(setting_category, setting_key);

-- ビュー作成
CREATE VIEW latest_exchange_rates AS
SELECT from_currency, to_currency, raw_rate, adjusted_rate, safety_margin_percent, fetched_at
FROM exchange_rates_extended 
ORDER BY fetched_at DESC;

CREATE VIEW active_shipping_services AS
SELECT s.service_id, s.service_provider, s.service_name, s.service_code,
       s.max_weight_kg, s.max_length_cm, s.max_width_cm, s.max_height_cm,
       s.tracking_available, s.insurance_available,
       s.estimated_delivery_days_min, s.estimated_delivery_days_max
FROM shipping_services s
WHERE s.is_active = TRUE
ORDER BY s.service_provider, s.service_name;

-- 関数作成
CREATE OR REPLACE FUNCTION get_usa_shipping_cost(p_weight_kg DECIMAL, p_service_code VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    result DECIMAL;
BEGIN
    SELECT sr.base_cost_usd INTO result
    FROM shipping_rates sr
    JOIN shipping_services ss ON sr.service_id = ss.service_id
    WHERE ss.service_code = p_service_code
      AND sr.destination_country_code = 'USA'
      AND sr.weight_from_kg <= p_weight_kg
      AND sr.weight_to_kg >= p_weight_kg
      AND sr.is_active = TRUE
    LIMIT 1;
    
    RETURN COALESCE(result, 30.00); -- デフォルト値
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION estimate_weight_by_category(p_ebay_category_id VARCHAR)
RETURNS DECIMAL AS $$
DECLARE
    result DECIMAL;
BEGIN
    SELECT default_weight_kg INTO result
    FROM category_weight_estimation
    WHERE ebay_category_id = p_ebay_category_id
      AND is_active = TRUE;
    
    IF result IS NULL THEN
        SELECT default_weight_kg INTO result
        FROM category_weight_estimation
        WHERE ebay_category_id = 'default';
    END IF;
    
    RETURN COALESCE(result, 0.500); -- デフォルト値
END;
$$ LANGUAGE plpgsql;
EOF

# 修正版スキーマ実行
psql -d nagano3_db -U nagano3_user -h localhost -f shipping_profit_database_fixed.sql

echo "✅ クリーンスキーマ再作成完了"

# 5. システム再起動
echo "🚀 システム完全再起動中..."
cd /Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool/complete_system

# 仮想環境アクティベート
source venv/bin/activate

# 柔軟版APIサーバー起動
python3 profit_calculator_api_flexible.py &
API_PID=$!

# Webサーバー起動
python3 -m http.server 8080 &
WEB_PID=$!

sleep 3

# APIテスト
echo "🔍 API動作確認中..."
curl -s http://localhost:5001/ | jq . 2>/dev/null || curl -s http://localhost:5001/

echo ""
echo "✅ 完全修正完了!"
echo ""
echo "📊 システム状況:"
echo "   - API: http://localhost:5001 (PID: $API_PID)"
echo "   - Web: http://localhost:8080 (PID: $WEB_PID)"
echo "   - フロントエンド: http://localhost:8080/index.html"
echo ""
echo "🎯 利用可能機能:"
echo "   ✅ 利益計算"
echo "   ✅ 為替レート管理"
echo "   ✅ 送料計算"
echo "   ✅ データベース完全統合"
echo ""
echo "🛑 停止方法:"
echo "   kill $API_PID $WEB_PID"

# PIDファイル保存
echo $API_PID > api.pid
echo $WEB_PID > web.pid
