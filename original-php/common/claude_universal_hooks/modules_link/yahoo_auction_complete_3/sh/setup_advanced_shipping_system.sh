#!/bin/bash

# 配送料金システム改良版 統合セットアップスクリプト
# setup_advanced_shipping_system.sh

set -e  # エラー時に停止

echo "🚀 配送料金システム改良版 統合セットアップ開始"
echo "=================================================="

# 色付きログ関数
log_info() {
    echo -e "\033[36m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[33m[WARNING]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# 設定
DB_NAME="nagano3_db"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"
BASE_DIR="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_tool"

# 現在のディレクトリ確認
if [ ! -f "index.php" ]; then
    log_error "yahoo_auction_toolディレクトリで実行してください"
    exit 1
fi

log_info "現在のディレクトリ: $(pwd)"

# PostgreSQL接続確認
log_info "PostgreSQL接続確認中..."
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "PostgreSQL接続エラー。データベースが起動していることを確認してください。"
    exit 1
fi
log_success "PostgreSQL接続確認完了"

# 実行権限付与
log_info "スクリプトファイルに実行権限を付与中..."
chmod +x database_setup_v2.sh 2>/dev/null || true
chmod +x *.sh 2>/dev/null || true
log_success "実行権限付与完了"

# Step 1: データベーススキーマ更新
echo ""
echo "📊 Step 1: データベーススキーマ更新"
echo "=================================="

log_info "改良版データベーススキーマを適用中..."
if [ -f "database_schema_v2_detailed.sql" ]; then
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database_schema_v2_detailed.sql
    if [ $? -eq 0 ]; then
        log_success "データベーススキーマ適用完了"
    else
        log_error "スキーマ適用エラー"
        exit 1
    fi
else
    log_warning "database_schema_v2_detailed.sql が見つかりません"
fi

# Step 2: テストデータ投入
echo ""
echo "🎯 Step 2: テストデータ投入"
echo "========================"

log_info "テストデータを投入中..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- より詳細なサンプル料金データ（0.1kg刻み）
DO $$
BEGIN
    -- 既存データの重複チェック
    IF NOT EXISTS (SELECT 1 FROM shipping_rates_detailed WHERE data_source = 'setup_script' LIMIT 1) THEN
        
        -- イギリス（高価格帯）- 0.1kg刻み
        INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
        SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'gb'), weight_g, weight_g + 100, 
               12.50 + (weight_g - 100) * 0.007, 1, 3, 
               CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
               'setup_script'
        FROM generate_series(100, 3000, 100) as weight_g;

        -- ドイツ（中価格帯）
        INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
        SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'de'), weight_g, weight_g + 100, 
               11.80 + (weight_g - 100) * 0.006, 1, 3, 
               CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
               'setup_script'
        FROM generate_series(100, 3000, 100) as weight_g;

        -- アメリカ（基準価格）
        INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
        SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'us'), weight_g, weight_g + 100, 
               8.50 + (weight_g - 100) * 0.004, 1, 2, 
               CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
               'setup_script'
        FROM generate_series(100, 3000, 100) as weight_g;

        -- 中国（アジア地域）
        INSERT INTO shipping_rates_detailed (carrier_id, service_id, region_id, from_weight_g, to_weight_g, rate_usd, delivery_days_min, delivery_days_max, min_packaging_type, data_source) 
        SELECT 1, 1, (SELECT id FROM shipping_regions_v2 WHERE code = 'cn'), weight_g, weight_g + 100, 
               7.20 + (weight_g - 100) * 0.003, 2, 4, 
               CASE WHEN weight_g <= 500 THEN 'envelope' WHEN weight_g <= 2000 THEN 'pak' ELSE 'small_box' END,
               'setup_script'
        FROM generate_series(100, 3000, 100) as weight_g;

        -- 円建て料金のキャッシュ更新
        UPDATE shipping_rates_detailed 
        SET rate_jpy = ROUND(rate_usd * 148.5, 0)
        WHERE rate_jpy IS NULL AND rate_usd IS NOT NULL;

        RAISE NOTICE 'テストデータ投入完了';
    ELSE
        RAISE NOTICE 'テストデータは既に存在します';
    END IF;
END $$;

EOF

log_success "テストデータ投入完了"

# Step 3: ファイル配置確認
echo ""
echo "📁 Step 3: ファイル配置確認"
echo "=========================="

declare -A required_files=(
    ["shipping_calculator_v2_integrated.js"]="改良版フロントエンド"
    ["shipping_calculation/shipping_api_v2_detailed.php"]="改良版API"
    ["cpass_data_upload.html"]="Cpassデータ投入システム"
    ["database_schema_v2_detailed.sql"]="データベーススキーマ"
)

all_files_exist=true

for file in "${!required_files[@]}"; do
    if [ -f "$file" ]; then
        log_success "✓ ${required_files[$file]}: $file"
    else
        log_error "✗ ${required_files[$file]}: $file が見つかりません"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    log_error "必要なファイルが不足しています"
    exit 1
fi

# Step 4: index.php更新
echo ""
echo "🔧 Step 4: index.php更新"
echo "======================"

log_info "index.phpで改良版システムを読み込むよう更新中..."

# バックアップ作成
cp index.php index.php.backup.$(date +%Y%m%d_%H%M%S)

# 改良版システムの読み込みに更新
if grep -q "shipping_calculator_professional.js" index.php; then
    sed -i '' 's/shipping_calculator_professional.js/shipping_calculator_v2_integrated.js/g' index.php
    log_success "index.php更新完了（professional → v2_integrated）"
elif grep -q "shipping_calculator_simple.js" index.php; then
    sed -i '' 's/shipping_calculator_simple.js/shipping_calculator_v2_integrated.js/g' index.php
    log_success "index.php更新完了（simple → v2_integrated）"
else
    log_warning "既存のJavaScript読み込みが見つかりません。手動で確認してください。"
fi

# Step 5: データ統計確認
echo ""
echo "📈 Step 5: データ統計確認"
echo "======================="

log_info "投入されたデータの統計を確認中..."

psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- 統計情報表示
\echo '=== 地域データ統計 ==='
SELECT 
    sr.type as "地域タイプ",
    COUNT(*) as "件数"
FROM shipping_regions_v2 sr
WHERE sr.is_active = TRUE
GROUP BY sr.type
ORDER BY sr.type;

\echo ''
\echo '=== 料金データ統計 ==='
SELECT 
    srd.data_source as "データソース",
    COUNT(*) as "料金レコード数",
    MIN(srd.from_weight_g::FLOAT/100) as "最小重量(kg)",
    MAX(srd.to_weight_g::FLOAT/100) as "最大重量(kg)",
    MIN(srd.rate_usd) as "最小料金($)",
    MAX(srd.rate_usd) as "最大料金($)"
FROM shipping_rates_detailed srd
WHERE srd.is_active = TRUE
GROUP BY srd.data_source
ORDER BY COUNT(*) DESC;

\echo ''
\echo '=== 梱包制約データ ==='
SELECT 
    packaging_type as "梱包タイプ",
    (max_weight_g::FLOAT/1000) as "最大重量(kg)",
    description as "説明"
FROM packaging_constraints
WHERE is_active = TRUE
ORDER BY max_weight_g;

\echo ''
\echo '=== サンプル料金データ（0.5kg） ==='
SELECT 
    sc.carrier_name as "配送会社",
    sr.name as "地域",
    (srd.from_weight_g::FLOAT/100) as "重量(kg)",
    srd.rate_usd as "料金($)",
    srd.rate_jpy as "料金(¥)",
    srd.min_packaging_type as "梱包"
FROM shipping_rates_detailed srd
JOIN shipping_carriers sc ON srd.carrier_id = sc.carrier_id
JOIN shipping_regions_v2 sr ON srd.region_id = sr.id
WHERE srd.from_weight_g = 500  -- 0.5kg のサンプル
ORDER BY sr.name, sc.carrier_name
LIMIT 10;

EOF

# Step 6: API動作確認
echo ""
echo "🔌 Step 6: API動作確認"
echo "===================="

log_info "改良版APIの動作確認中..."

# 地域階層取得テスト
if curl -s "http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/shipping_api_v2_detailed.php?action=regions_hierarchy" | grep -q "success"; then
    log_success "✓ 地域階層API動作確認"
else
    log_warning "⚠ 地域階層APIの動作確認に失敗（Webサーバーが起動していない可能性があります）"
fi

# 統計情報取得テスト
if curl -s "http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/shipping_api_v2_detailed.php?action=statistics" | grep -q "success"; then
    log_success "✓ 統計情報API動作確認"
else
    log_warning "⚠ 統計情報APIの動作確認に失敗"
fi

# Step 7: 最終確認・使用方法表示
echo ""
echo "🎉 Step 7: セットアップ完了"
echo "========================"

log_success "配送料金システム改良版のセットアップが完了しました！"

echo ""
echo "📋 使用方法:"
echo "============"
echo ""
echo "1. メインシステム:"
echo "   http://localhost:8080/modules/yahoo_auction_tool/index.php"
echo "   └ 「送料計算」タブから改良版システムを使用"
echo ""
echo "2. Cpassデータ投入:"
echo "   http://localhost:8080/modules/yahoo_auction_tool/cpass_data_upload.html"
echo "   └ CSVファイルで手動データ投入"
echo ""
echo "3. 直接API:"
echo "   http://localhost:8080/modules/yahoo_auction_tool/shipping_calculation/shipping_api_v2_detailed.php"
echo "   └ 利用可能アクション: regions_hierarchy, search_rates, calculate_profit, check_packaging, rate_matrix, export_csv, statistics"
echo ""

echo "🎯 新機能:"
echo "==========="
echo "• 0.1kg刻みの詳細料金設定"
echo "• 階層的地域管理（ゾーン→地域グループ→国）"
echo "• 利益計算統合（仕入価格→利益率計算）"
echo "• 動的梱包制約チェック"
echo "• 最適配送方法推奨"
echo "• 条件フィルター付きCSV出力"
echo "• Cpass手動データ投入システム"
echo ""

echo "🔧 トラブルシューティング:"
echo "========================"
echo "• JavaScriptエラー: ブラウザのデベロッパーツール（F12）でコンソール確認"
echo "• API接続エラー: Webサーバー（Apache/Nginx）が起動していることを確認"
echo "• データベースエラー: PostgreSQLサービスが起動していることを確認"
echo "• 表示問題: ブラウザのハードリロード（Ctrl+F5 / Cmd+Shift+R）を実行"
echo ""

echo "📚 ファイル構成:"
echo "=============="
echo "📁 modules/yahoo_auction_tool/"
echo "├── 📄 index.php（メインシステム）"
echo "├── 📄 shipping_calculator_v2_integrated.js（改良版フロントエンド）"
echo "├── 📄 cpass_data_upload.html（Cpassデータ投入）"
echo "├── 📄 database_schema_v2_detailed.sql（データベーススキーマ）"
echo "└── 📁 shipping_calculation/"
echo "    └── 📄 shipping_api_v2_detailed.php（改良版API）"
echo ""

# データベース接続情報表示
echo "💾 データベース情報:"
echo "==================="
echo "データベース: $DB_NAME"
echo "ユーザー: $DB_USER"
echo "ホスト: $DB_HOST:$DB_PORT"
echo ""

# 最終統計
TOTAL_RATES=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM shipping_rates_detailed WHERE is_active = TRUE;")
TOTAL_REGIONS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM shipping_regions_v2 WHERE is_active = TRUE;")
TOTAL_PACKAGING=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM packaging_constraints WHERE is_active = TRUE;")

echo "📊 投入データ統計:"
echo "================="
echo "料金データ: ${TOTAL_RATES// }件"
echo "地域データ: ${TOTAL_REGIONS// }件"
echo "梱包制約: ${TOTAL_PACKAGING// }件"
echo ""

log_success "🎉 改良版配送料金システムの準備が完了しました！"
echo "ブラウザで http://localhost:8080/modules/yahoo_auction_tool/index.php にアクセスして"
echo "「送料計算」タブから新しいシステムをお試しください。"
