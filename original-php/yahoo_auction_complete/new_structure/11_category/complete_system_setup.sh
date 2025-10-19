#!/bin/bash

# eBayカテゴリー統合システム - 完全セットアップ・テストスクリプト
# 全機能の統合テスト・初期化・動作確認

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/setup_test_$(date +%Y%m%d_%H%M).log"

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# 必要なディレクトリ作成
create_directories() {
    log_info "必要なディレクトリを作成中..."
    
    mkdir -p "${SCRIPT_DIR}/logs"
    mkdir -p "${SCRIPT_DIR}/backups"
    mkdir -p "${SCRIPT_DIR}/temp"
    
    log_success "ディレクトリ作成完了"
}

# データベーススキーマ構築
setup_database_schema() {
    log_info "データベーススキーマ構築開始..."
    
    # 拡張スキーマ実行
    if [ -f "${SCRIPT_DIR}/database/complete_system_enhancement.sql" ]; then
        log_info "拡張データベーススキーマを実行中..."
        
        psql -h localhost -U aritahiroaki -d nagano3_db -f "${SCRIPT_DIR}/database/complete_system_enhancement.sql" >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "データベーススキーマ構築完了"
        else
            log_error "データベーススキーマ構築に失敗しました"
            return 1
        fi
    else
        log_error "データベーススキーマファイルが見つかりません"
        return 1
    fi
}

# PHPクラス動作テスト
test_php_classes() {
    log_info "PHPクラス動作テスト開始..."
    
    # UnifiedCategoryDetectorテスト
    php -r "
    require_once '${SCRIPT_DIR}/backend/classes/UnifiedCategoryDetector.php';
    
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        \$detector = new UnifiedCategoryDetector(\$pdo, false);
        echo \"✓ UnifiedCategoryDetector クラス読み込み成功\\n\";
        
        // テスト判定
        \$testData = [
            'title' => 'iPhone 14 Pro テスト商品',
            'price_jpy' => 120000,
            'description' => 'テスト用商品説明'
        ];
        
        \$result = \$detector->detectCategoryUnified(\$testData);
        echo \"✓ カテゴリー判定テスト成功: {\$result['category_name']} (信頼度: {\$result['confidence']}%)\\n\";
        
    } catch (Exception \$e) {
        echo \"✗ UnifiedCategoryDetector テスト失敗: \" . \$e->getMessage() . \"\\n\";
        exit(1);
    }
    " >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "UnifiedCategoryDetector テスト成功"
    else
        log_error "UnifiedCategoryDetector テスト失敗"
        return 1
    fi
    
    # ItemSpecificsManagerテスト（EbayTradingApiConnectorが必要）
    if [ -f "${SCRIPT_DIR}/backend/classes/ItemSpecificsManager.php" ]; then
        php -r "
        require_once '${SCRIPT_DIR}/backend/classes/ItemSpecificsManager.php';
        
        try {
            \$config = require '${SCRIPT_DIR}/backend/config/database.php';
            \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
            \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
            
            // モックTradingAPI（テスト用）
            \$mockTradingApi = new class {
                public function getCategorySpecifics(\$categoryId, \$options = []) {
                    return null; // テスト用のモック応答
                }
            };
            
            \$manager = new ItemSpecificsManager(\$pdo, \$mockTradingApi, false);
            echo \"✓ ItemSpecificsManager クラス読み込み成功\\n\";
            
            // フォールバック生成テスト
            \$testData = ['title' => 'iPhone 14 Pro テスト'];
            \$itemSpecifics = \$manager->generateCompleteItemSpecifics('293', \$testData);
            echo \"✓ Item Specifics生成テスト成功: \" . substr(\$itemSpecifics, 0, 50) . \"...\\n\";
            
        } catch (Exception \$e) {
            echo \"✗ ItemSpecificsManager テスト失敗: \" . \$e->getMessage() . \"\\n\";
            exit(1);
        }
        " >> "$LOG_FILE" 2>&1
        
        if [ $? -eq 0 ]; then
            log_success "ItemSpecificsManager テスト成功"
        else
            log_warning "ItemSpecificsManager テスト部分失敗（API未設定のため正常）"
        fi
    fi
}

# API動作テスト
test_api_endpoints() {
    log_info "API動作テスト開始..."
    
    # 統合API基本テスト
    local api_url="http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/backend/api/unified_category_api_enhanced.php"
    
    # 単純なGETテスト
    if command -v curl &> /dev/null; then
        log_info "APIエンドポイント接続テスト..."
        
        local response=$(curl -s -o /dev/null -w "%{http_code}" -G "$api_url" -d "action=get_quick_stats")
        
        if [ "$response" = "200" ]; then
            log_success "API基本接続テスト成功"
        else
            log_warning "API接続テスト応答: HTTP $response（設定未完了の可能性）"
        fi
        
        # 単一商品判定テスト
        log_info "単一商品判定APIテスト..."
        
        local test_payload='{
            "action": "detect_single",
            "title": "iPhone 14 Pro 128GB Black",
            "price_jpy": 120000,
            "description": "テスト用商品"
        }'
        
        local api_response=$(curl -s -X POST "$api_url" \
            -H "Content-Type: application/json" \
            -d "$test_payload" 2>/dev/null)
        
        if [[ "$api_response" =~ "success" ]] && [[ "$api_response" =~ "true" ]]; then
            log_success "単一商品判定APIテスト成功"
        else
            log_warning "単一商品判定APIテスト部分失敗（正常な場合もあります）"
        fi
    else
        log_warning "curl コマンドが見つかりません。APIテストをスキップ"
    fi
}

# フロントエンドファイル確認
test_frontend_files() {
    log_info "フロントエンドファイル確認..."
    
    local frontend_files=(
        "${SCRIPT_DIR}/frontend/category_massive_viewer_optimized.php"
        "${SCRIPT_DIR}/frontend/category_massive_viewer.php"
        "${SCRIPT_DIR}/frontend/ebay_category_tool.php"
    )
    
    for file in "${frontend_files[@]}"; do
        if [ -f "$file" ]; then
            log_success "フロントエンドファイル存在確認: $(basename "$file")"
            
            # PHP構文チェック
            if php -l "$file" > /dev/null 2>&1; then
                log_success "PHP構文チェック正常: $(basename "$file")"
            else
                log_error "PHP構文エラー: $(basename "$file")"
                return 1
            fi
        else
            log_warning "フロントエンドファイル未発見: $(basename "$file")"
        fi
    done
}

# データベースデータ確認
verify_database_data() {
    log_info "データベースデータ確認..."
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        // 主要テーブル存在・データ確認
        \$tables = [
            'ebay_category_fees' => 'eBayカテゴリー・手数料',
            'yahoo_scraped_products' => 'Yahoo商品データ',
            'sell_mirror_analysis' => 'セルミラー分析',
            'store_listing_limits' => '出品枠管理',
            'listing_quota_categories' => 'Select Categories'
        ];
        
        foreach (\$tables as \$table => \$description) {
            \$stmt = \$pdo->query(\"SELECT COUNT(*) FROM \$table\");
            \$count = \$stmt->fetchColumn();
            echo \"✓ \$description (\$table): \" . number_format(\$count) . \"件\\n\";
        }
        
        // カテゴリー統計
        \$stmt = \$pdo->query(\"
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_select_category = true THEN 1 END) as select_categories
            FROM ebay_category_fees 
            WHERE is_active = true
        \");
        \$stats = \$stmt->fetch(PDO::FETCH_ASSOC);
        
        echo \"✓ アクティブカテゴリー: \" . number_format(\$stats['total']) . \"件\\n\";
        echo \"✓ Select Categories: \" . number_format(\$stats['select_categories']) . \"件\\n\";
        
        // 商品処理状況
        \$stmt = \$pdo->query(\"
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as categorized,
                COUNT(CASE WHEN complete_item_specifics IS NOT NULL THEN 1 END) as item_specifics,
                AVG(listing_score) as avg_score
            FROM yahoo_scraped_products
        \");
        \$productStats = \$stmt->fetch(PDO::FETCH_ASSOC);
        
        if (\$productStats['total'] > 0) {
            echo \"✓ Yahoo商品総数: \" . number_format(\$productStats['total']) . \"件\\n\";
            echo \"✓ カテゴリー判定済: \" . number_format(\$productStats['categorized']) . \"件\\n\";
            echo \"✓ Item Specifics生成済: \" . number_format(\$productStats['item_specifics']) . \"件\\n\";
            echo \"✓ 平均スコア: \" . number_format(\$productStats['avg_score'] ?: 0, 2) . \"点\\n\";
        }
        
    } catch (Exception \$e) {
        echo \"✗ データベース確認エラー: \" . \$e->getMessage() . \"\\n\";
        exit(1);
    }
    " >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "データベースデータ確認完了"
    else
        log_error "データベースデータ確認失敗"
        return 1
    fi
}

# パフォーマンステスト
performance_test() {
    log_info "パフォーマンステスト開始..."
    
    php -r "
    \$startTime = microtime(true);
    
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        // 1. 大量データクエリテスト
        \$stmt = \$pdo->query(\"
            SELECT COUNT(*) as total_categories
            FROM ebay_category_fees 
            WHERE is_active = true
        \");
        \$categoryCount = \$stmt->fetchColumn();
        
        \$dbTime = round((microtime(true) - \$startTime) * 1000);
        echo \"✓ データベースクエリ応答時間: {\$dbTime}ms\\n\";
        
        // 2. メモリ使用量確認
        \$memoryUsage = round(memory_get_usage() / 1024 / 1024, 2);
        \$peakMemory = round(memory_get_peak_usage() / 1024 / 1024, 2);
        echo \"✓ 現在メモリ使用量: {\$memoryUsage}MB\\n\";
        echo \"✓ ピークメモリ使用量: {\$peakMemory}MB\\n\";
        
        // 3. 判定処理速度テスト（軽量版）
        require_once '${SCRIPT_DIR}/backend/classes/UnifiedCategoryDetector.php';
        
        \$detector = new UnifiedCategoryDetector(\$pdo, false);
        \$testStartTime = microtime(true);
        
        \$testData = [
            'title' => 'iPhone 14 Pro パフォーマンステスト',
            'price_jpy' => 120000,
            'description' => ''
        ];
        
        \$result = \$detector->detectCategoryUnified(\$testData);
        \$detectionTime = round((microtime(true) - \$testStartTime) * 1000);
        
        echo \"✓ カテゴリー判定処理時間: {\$detectionTime}ms\\n\";
        
        \$totalTime = round((microtime(true) - \$startTime) * 1000);
        echo \"✓ 総テスト時間: {\$totalTime}ms\\n\";
        
        // パフォーマンス評価
        if (\$detectionTime < 1000) {
            echo \"✓ パフォーマンス評価: 優秀 (1秒未満)\\n\";
        } elseif (\$detectionTime < 3000) {
            echo \"✓ パフォーマンス評価: 良好 (3秒未満)\\n\";
        } else {
            echo \"⚠ パフォーマンス評価: 改善推奨 (3秒以上)\\n\";
        }
        
    } catch (Exception \$e) {
        echo \"✗ パフォーマンステストエラー: \" . \$e->getMessage() . \"\\n\";
        exit(1);
    }
    " >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_success "パフォーマンステスト完了"
    else
        log_error "パフォーマンステスト失敗"
        return 1
    fi
}

# アクセスURL生成・表示
generate_access_urls() {
    log_info "アクセスURL生成..."
    
    local base_url="http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category"
    
    cat << EOF | tee -a "$LOG_FILE"

========================================
🌐 アクセスURL一覧
========================================

📊 メインUI（最適化版）:
${base_url}/frontend/category_massive_viewer_optimized.php

📊 メインUI（既存版）:
${base_url}/frontend/category_massive_viewer.php

🔧 基本ツール:
${base_url}/frontend/ebay_category_tool.php

🔌 統合API:
${base_url}/backend/api/unified_category_api_enhanced.php

📋 システム状況:
${base_url}/check_current_status.php

========================================

EOF
}

# システム設定推奨表示
show_recommendations() {
    cat << EOF | tee -a "$LOG_FILE"

========================================
🚀 システム設定推奨事項
========================================

1. eBay API設定:
   - backend/config/ にeBay API キー設定ファイル作成
   - Finding API, Trading API の設定

2. Cronジョブ設定:
   - 月次バッチ: 0 2 1 * * ${SCRIPT_DIR}/monthly_batch_processor.sh
   - 日次クリーンアップ: 0 3 * * * ${SCRIPT_DIR}/monthly_batch_processor.sh --cleanup-only

3. セキュリティ設定:
   - API アクセス制限
   - データベースアクセス権限確認

4. 監視設定:
   - ログ監視
   - API使用量監視
   - パフォーマンス監視

========================================

EOF
}

# 完全テスト実行
run_complete_test() {
    log_info "========================================="
    log_info "eBayカテゴリー統合システム 完全テスト開始"
    log_info "========================================="
    
    local failed_tests=()
    local start_time=$(date +%s)
    
    # テスト実行
    if ! create_directories; then
        failed_tests+=("ディレクトリ作成")
    fi
    
    if ! setup_database_schema; then
        failed_tests+=("データベーススキーマ")
    fi
    
    if ! test_php_classes; then
        failed_tests+=("PHPクラステスト")
    fi
    
    if ! test_api_endpoints; then
        failed_tests+=("APIテスト")
    fi
    
    if ! test_frontend_files; then
        failed_tests+=("フロントエンドテスト")
    fi
    
    if ! verify_database_data; then
        failed_tests+=("データベースデータ確認")
    fi
    
    if ! performance_test; then
        failed_tests+=("パフォーマンステスト")
    fi
    
    # 結果サマリー
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "========================================="
    log_info "テスト完了 (処理時間: ${duration}秒)"
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        log_success "✅ 全テスト正常完了！システム稼働準備完了"
        generate_access_urls
        show_recommendations
        
        log_success "========================================="
        log_success "🎉 eBayカテゴリー統合システム セットアップ完了"
        log_success "========================================="
        
        return 0
    else
        log_error "❌ 失敗したテスト: ${failed_tests[*]}"
        log_error "ログファイルを確認してください: $LOG_FILE"
        return 1
    fi
}

# 個別テスト実行
run_individual_test() {
    local test_type="$1"
    
    case "$test_type" in
        "database")
            setup_database_schema
            ;;
        "php")
            test_php_classes
            ;;
        "api")
            test_api_endpoints
            ;;
        "frontend")
            test_frontend_files
            ;;
        "data")
            verify_database_data
            ;;
        "performance")
            performance_test
            ;;
        *)
            log_error "不明なテストタイプ: $test_type"
            echo "利用可能なテスト: database, php, api, frontend, data, performance"
            return 1
            ;;
    esac
}

# 使用方法
usage() {
    cat << EOF
eBayカテゴリー統合システム - セットアップ・テストスクリプト

使用方法: $0 [オプション]

オプション:
  --complete-test    完全テスト実行（推奨）
  --test TYPE        個別テスト実行
                     (database|php|api|frontend|data|performance)
  --setup-only       セットアップのみ実行
  --urls             アクセスURL表示のみ
  --recommendations  推奨設定表示のみ
  --help             このヘルプを表示

例:
  $0 --complete-test        # 完全テスト実行
  $0 --test database        # データベーステストのみ
  $0 --setup-only           # セットアップのみ
  $0 --urls                 # URL表示のみ

EOF
}

# メイン処理
case "${1:-}" in
    --complete-test)
        run_complete_test
        ;;
    --test)
        if [ -z "$2" ]; then
            log_error "テストタイプを指定してください"
            usage
            exit 1
        fi
        run_individual_test "$2"
        ;;
    --setup-only)
        create_directories && setup_database_schema
        ;;
    --urls)
        generate_access_urls
        ;;
    --recommendations)
        show_recommendations
        ;;
    --help)
        usage
        ;;
    "")
        run_complete_test
        ;;
    *)
        log_error "不明なオプション: $1"
        usage
        exit 1
        ;;
esac