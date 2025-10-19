#!/bin/bash

# 配送料金システム改良版 データベースセットアップスクリプト
# database_setup_v2.sh

echo "🚀 配送料金システム改良版 データベースセットアップ開始"

DB_NAME="nagano3_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# PostgreSQL接続確認
echo "📡 PostgreSQL接続確認中..."
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ PostgreSQL接続エラー。データベースが起動していることを確認してください。"
    exit 1
fi

echo "✅ PostgreSQL接続確認完了"

# 改良版スキーマ適用
echo "🏗️ 改良版データベーススキーマ適用中..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database_schema_v2_detailed.sql

if [ $? -eq 0 ]; then
    echo "✅ データベーススキーマ適用完了"
else
    echo "❌ スキーマ適用エラー"
    exit 1
fi

# サンプルデータ投入確認
echo "📊 投入されたデータの確認中..."

# 地域データ確認
REGION_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM shipping_regions_v2 WHERE is_active = TRUE;")
echo "地域データ: ${REGION_COUNT}件"

# 梱包制約データ確認
PACKAGING_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM packaging_constraints WHERE is_active = TRUE;")
echo "梱包制約データ: ${PACKAGING_COUNT}件"

# 料金データ確認
RATE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM shipping_rates_detailed WHERE is_active = TRUE;")
echo "料金データ: ${RATE_COUNT}件"

# テスト用データの追加投入
echo "🎯 テスト用詳細データ追加投入中..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- より詳細なサンプル料金データ（0.1kg刻み）
-- FedEx Express - ヨーロッパ各国詳細料金

-- イギリス（高価格帯）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), weight_g, weight_g + 100, 
       12.50 + (weight_g - 100) * 0.007, 1, 3, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'api'
FROM generate_series(100, 5000, 100) as weight_g
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_rates_detailed 
    WHERE carrier_id = 1 AND service_id = 1 
    AND region_id = (SELECT id FROM shipping_regions_v2 WHERE code = 'gb')
    AND from_weight_g = weight_g
);

-- ドイツ（中価格帯）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), weight_g, weight_g + 100, 
       11.80 + (weight_g - 100) * 0.006, 1, 3, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'api'
FROM generate_series(100, 5000, 100) as weight_g
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_rates_detailed 
    WHERE carrier_id = 1 AND service_id = 1 
    AND region_id = (SELECT id FROM shipping_regions_v2 WHERE code = 'de')
    AND from_weight_g = weight_g
);

-- フランス
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'fr'), weight_g, weight_g + 100, 
       12.20 + (weight_g - 100) * 0.0065, 1, 3, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'api'
FROM generate_series(100, 5000, 100) as weight_g
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_rates_detailed 
    WHERE carrier_id = 1 AND service_id = 1 
    AND region_id = (SELECT id FROM shipping_regions_v2 WHERE code = 'fr')
    AND from_weight_g = weight_g
);

-- ポーランド（低価格帯・ヨーロッパ地域3）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'pl'), weight_g, weight_g + 100, 
       9.80 + (weight_g - 100) * 0.005, 2, 4, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'api'
FROM generate_series(100, 5000, 100) as weight_g
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_rates_detailed 
    WHERE carrier_id = 1 AND service_id = 1 
    AND region_id = (SELECT id FROM shipping_regions_v2 WHERE code = 'pl')
    AND from_weight_g = weight_g
);

-- アメリカ（基準価格）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'us'), weight_g, weight_g + 100, 
       8.50 + (weight_g - 100) * 0.004, 1, 2, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'api'
FROM generate_series(100, 5000, 100) as weight_g
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_rates_detailed 
    WHERE carrier_id = 1 AND service_id = 1 
    AND region_id = (SELECT id FROM shipping_regions_v2 WHERE code = 'us')
    AND from_weight_g = weight_g
);

-- DHL Express データ（FedExより若干高価格）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 2, 2, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), weight_g, weight_g + 100, 
       13.20 + (weight_g - 100) * 0.0075, 1, 2, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'api'
FROM generate_series(100, 3000, 100) as weight_g
WHERE EXISTS (SELECT 1 FROM shipping_carriers WHERE carrier_id = 2)
AND EXISTS (SELECT 1 FROM shipping_services WHERE service_id = 2);

-- 地域グループレベルの料金（フォールバック用）
INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'eur_1'), weight_g, weight_g + 100, 
       13.00 + (weight_g - 100) * 0.007, 2, 4, 
       CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
       'region_fallback'
FROM generate_series(100, 5000, 100) as weight_g
WHERE NOT EXISTS (
    SELECT 1 FROM shipping_rates_detailed 
    WHERE carrier_id = 1 AND service_id = 1 
    AND region_id = (SELECT id FROM shipping_regions_v2 WHERE code = 'eur_1')
    AND from_weight_g = weight_g
);

-- 円建て料金のキャッシュ更新
UPDATE shipping_rates_detailed 
SET rate_jpy = ROUND(rate_usd * 148.5, 0)
WHERE rate_jpy IS NULL AND rate_usd IS NOT NULL;

EOF

echo "✅ テスト用データ追加完了"

# 最終確認
echo "🔍 最終データ確認中..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- 統計情報表示
SELECT 
    '地域データ' as category,
    sr.type,
    COUNT(*) as count
FROM shipping_regions_v2 sr
WHERE sr.is_active = TRUE
GROUP BY sr.type
ORDER BY sr.type;

SELECT 
    '料金データ' as category,
    srd.data_source,
    COUNT(*) as count,
    MIN(srd.from_weight_g::FLOAT/100) as min_weight_kg,
    MAX(srd.to_weight_g::FLOAT/100) as max_weight_kg
FROM shipping_rates_detailed srd
WHERE srd.is_active = TRUE
GROUP BY srd.data_source
ORDER BY count DESC;

-- サンプル料金表示
SELECT 
    sc.carrier_name,
    sr.name as region,
    (srd.from_weight_g::FLOAT/100) as weight_kg,
    srd.rate_usd,
    srd.rate_jpy,
    srd.min_packaging_type
FROM shipping_rates_detailed srd
JOIN shipping_carriers sc ON srd.carrier_id = sc.carrier_id
JOIN shipping_regions_v2 sr ON srd.region_id = sr.id
WHERE srd.from_weight_g = 500  -- 0.5kg のサンプル
ORDER BY sr.name, sc.carrier_name
LIMIT 10;

EOF

echo "🎉 配送料金システム改良版 データベースセットアップ完了！"
echo ""
echo "📋 次のステップ:"
echo "1. APIテスト: php shipping_calculation/shipping_api_v2_detailed.php"
echo "2. フロントエンド更新: shipping_calculator_professional.js の新API対応"
echo "3. 実データ投入: Cpass等のCSVデータアップロード"
