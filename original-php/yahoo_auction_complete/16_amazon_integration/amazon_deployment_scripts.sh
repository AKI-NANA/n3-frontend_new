#!/bin/bash
# Amazon統合システム - デプロイメントスクリプト
# new_structure/16_amazon_integration/deploy.sh

set -e

echo "🚀 Amazon統合システム デプロイメント開始"
echo "=================================================="

# プロジェクトルート確認
PROJECT_ROOT="/Users/aritahiroaki/NAGANO-3/N3-Development/modules/yahoo_auction_complete/new_structure"
AMAZON_MODULE="${PROJECT_ROOT}/16_amazon_integration"

if [ ! -d "$PROJECT_ROOT" ]; then
    echo "❌ プロジェクトルートが見つかりません: $PROJECT_ROOT"
    exit 1
fi

cd "$PROJECT_ROOT"

echo "📍 現在のディレクトリ: $(pwd)"

# 1. ディレクトリ構造作成
echo "📁 ディレクトリ構造を作成中..."

mkdir -p 02_scraping/amazon
mkdir -p 07_editing/api
mkdir -p 10_zaiko/logs
mkdir -p 16_amazon_integration
mkdir -p shared/config
mkdir -p shared/cache/amazon_api
mkdir -p logs
mkdir -p tmp

echo "✅ ディレクトリ構造作成完了"

# 2. 権限設定
echo "🔐 権限設定中..."

chmod 755 02_scraping/amazon
chmod 755 07_editing/api
chmod 755 10_zaiko
chmod 777 shared/cache/amazon_api
chmod 777 logs
chmod 777 tmp

echo "✅ 権限設定完了"

# 3. データベーススキーマ作成
echo "🗄️ データベーススキーマ作成中..."

# PostgreSQL接続情報（環境変数から取得）
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-yahoo_auction}
DB_USER=${DB_USER:-postgres}

# スキーマ作成SQL実行
psql -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -U "$DB_USER" << 'EOF'
-- Amazon商品リサーチデータ（メインテーブル）
CREATE TABLE IF NOT EXISTS amazon_research_data (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) UNIQUE NOT NULL,
    
    -- 基本情報
    title TEXT,
    brand VARCHAR(255),
    manufacturer VARCHAR(255),
    product_group VARCHAR(100),
    binding VARCHAR(100),
    
    -- 価格・在庫情報
    current_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    savings_amount DECIMAL(10,2),
    savings_percentage DECIMAL(5,2),
    
    -- 在庫状況
    availability_status VARCHAR(50),
    availability_message TEXT,
    max_order_quantity INTEGER,
    min_order_quantity INTEGER DEFAULT 1,
    
    -- プライム・配送情報
    is_prime_eligible BOOLEAN DEFAULT FALSE,
    is_free_shipping_eligible BOOLEAN DEFAULT FALSE,
    is_amazon_fulfilled BOOLEAN DEFAULT FALSE,
    shipping_charges DECIMAL(8,2),
    
    -- レビュー・評価
    review_count INTEGER DEFAULT 0,
    star_rating DECIMAL(3,2),
    
    -- ランキング情報（JSON）
    sales_rank JSONB,
    category_ranks JSONB,
    
    -- 画像情報（JSON配列）
    images_primary JSONB,
    images_variants JSONB,
    
    -- 商品詳細情報（JSON）
    features JSONB,
    product_dimensions JSONB,
    item_specifics JSONB,
    technical_details JSONB,
    
    -- カテゴリ情報
    browse_nodes JSONB,
    
    -- 関連商品情報
    parent_asin VARCHAR(10),
    variation_summary JSONB,
    
    -- 外部ID
    external_ids JSONB,
    
    -- メーカー・販売者情報
    merchant_info JSONB,
    
    -- プロモーション情報
    promotions JSONB,
    
    -- 監視・管理情報
    is_high_priority BOOLEAN DEFAULT FALSE,
    price_fluctuation_count INTEGER DEFAULT 0,
    stock_change_count INTEGER DEFAULT 0,
    
    -- チェック履歴
    last_price_check_at TIMESTAMP,
    last_stock_check_at TIMESTAMP,
    last_api_update_at TIMESTAMP,
    
    -- データ品質管理
    data_completeness_score DECIMAL(3,2) DEFAULT 0.00,
    api_error_count INTEGER DEFAULT 0,
    last_api_error TEXT,
    
    -- システム情報
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- データ取得元・バージョン管理
    api_version VARCHAR(10) DEFAULT '5.0',
    marketplace VARCHAR(10) DEFAULT 'US',
    data_source VARCHAR(20) DEFAULT 'PA-API'
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_amazon_asin ON amazon_research_data(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_brand ON amazon_research_data(brand);
CREATE INDEX IF NOT EXISTS idx_amazon_price ON amazon_research_data(current_price);
CREATE INDEX IF NOT EXISTS idx_amazon_availability ON amazon_research_data(availability_status);
CREATE INDEX IF NOT EXISTS idx_amazon_prime ON amazon_research_data(is_prime_eligible);
CREATE INDEX IF NOT EXISTS idx_amazon_priority ON amazon_research_data(is_high_priority);
CREATE INDEX IF NOT EXISTS idx_amazon_updated ON amazon_research_data(updated_at);

-- 価格履歴テーブル
CREATE TABLE IF NOT EXISTS amazon_price_history (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) NOT NULL REFERENCES amazon_research_data(asin) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    previous_price DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    change_percentage DECIMAL(5,2),
    availability_status VARCHAR(50),
    is_prime_eligible BOOLEAN,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_history_asin ON amazon_price_history(asin);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON amazon_price_history(recorded_at);

-- 在庫履歴テーブル
CREATE TABLE IF NOT EXISTS amazon_stock_history (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) NOT NULL REFERENCES amazon_research_data(asin) ON DELETE CASCADE,
    availability_status VARCHAR(50) NOT NULL,
    availability_message TEXT,
    previous_status VARCHAR(50),
    status_changed BOOLEAN DEFAULT FALSE,
    back_in_stock BOOLEAN DEFAULT FALSE,
    out_of_stock BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_history_asin ON amazon_stock_history(asin);
CREATE INDEX IF NOT EXISTS idx_stock_history_status ON amazon_stock_history(availability_status);
CREATE INDEX IF NOT EXISTS idx_stock_history_recorded ON amazon_stock_history(recorded_at);

-- API リクエスト履歴テーブル
CREATE TABLE IF NOT EXISTS amazon_api_requests (
    id SERIAL PRIMARY KEY,
    request_type VARCHAR(20) NOT NULL,
    asin_list TEXT,
    asin_count INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT FALSE,
    response_time_ms INTEGER,
    http_status_code INTEGER,
    api_error_code VARCHAR(50),
    api_error_message TEXT,
    items_returned INTEGER DEFAULT 0,
    items_requested INTEGER DEFAULT 0,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marketplace VARCHAR(10) DEFAULT 'US'
);

CREATE INDEX IF NOT EXISTS idx_api_requests_time ON amazon_api_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_api_requests_success ON amazon_api_requests(success);

-- 監視設定テーブル
CREATE TABLE IF NOT EXISTS amazon_monitoring_rules (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) REFERENCES amazon_research_data(asin) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    monitor_price BOOLEAN DEFAULT TRUE,
    monitor_stock BOOLEAN DEFAULT TRUE,
    price_change_threshold_percent DECIMAL(5,2) DEFAULT 5.00,
    target_price_max DECIMAL(10,2),
    target_price_min DECIMAL(10,2),
    stock_out_alert BOOLEAN DEFAULT TRUE,
    stock_in_alert BOOLEAN DEFAULT TRUE,
    check_frequency_minutes INTEGER DEFAULT 30,
    priority_level VARCHAR(10) DEFAULT 'normal',
    email_alerts BOOLEAN DEFAULT FALSE,
    webhook_url TEXT,
    slack_channel VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMP,
    next_check_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitoring_asin ON amazon_monitoring_rules(asin);
CREATE INDEX IF NOT EXISTS idx_monitoring_active ON amazon_monitoring_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_monitoring_next_check ON amazon_monitoring_rules(next_check_at);

-- ASIN管理キューテーブル
CREATE TABLE IF NOT EXISTS amazon_asin_queue (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(10) NOT NULL,
    priority INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'pending',
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    source VARCHAR(50),
    batch_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asin_queue_status ON amazon_asin_queue(status);
CREATE INDEX IF NOT EXISTS idx_asin_queue_priority ON amazon_asin_queue(priority);

-- 統計ビュー
CREATE OR REPLACE VIEW amazon_data_summary AS
SELECT 
    COUNT(*) as total_products,
    COUNT(CASE WHEN availability_status = 'In Stock' THEN 1 END) as in_stock_count,
    COUNT(CASE WHEN is_prime_eligible = true THEN 1 END) as prime_eligible_count,
    AVG(current_price) as avg_price,
    MIN(current_price) as min_price,
    MAX(current_price) as max_price,
    COUNT(CASE WHEN is_high_priority = true THEN 1 END) as high_priority_count,
    AVG(star_rating) as avg_rating
FROM amazon_research_data;

-- 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ language 'plpgsql';

-- トリガー作成
DROP TRIGGER IF EXISTS update_amazon_research_data_updated_at ON amazon_research_data;
CREATE TRIGGER update_amazon_research_data_updated_at 
    BEFORE UPDATE ON amazon_research_data 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_amazon_monitoring_rules_updated_at ON amazon_monitoring_rules;
CREATE TRIGGER update_amazon_monitoring_rules_updated_at 
    BEFORE UPDATE ON amazon_monitoring_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_amazon_asin_queue_updated_at ON amazon_asin_queue;
CREATE TRIGGER update_amazon_asin_queue_updated_at 
    BEFORE UPDATE ON amazon_asin_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

EOF

echo "✅ データベーススキーマ作成完了"

# 4. 設定ファイルの確認・作成
echo "⚙️ 設定ファイル確認中..."

ENV_FILE="../../common/env/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  環境設定ファイルが見つかりません。テンプレートを作成します..."
    
    mkdir -p "$(dirname "$ENV_FILE")"
    
    cat > "$ENV_FILE" << 'EOF'
# Amazon PA-API 認証情報
AMAZON_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
AMAZON_SECRET_KEY=YOUR_SECRET_KEY_HERE  
AMAZON_PARTNER_TAG=YOUR_PARTNER_TAG_HERE
AMAZON_API_HOST=webservices.amazon.com
AMAZON_API_REGION=us-east-1
AMAZON_DEFAULT_MARKETPLACE=US
AMAZON_DEFAULT_LANGUAGE=en_US
AMAZON_DEFAULT_CURRENCY=USD

# 通知設定
AMAZON_EMAIL_ALERTS=false
AMAZON_WEBHOOK_ENABLED=false
AMAZON_WEBHOOK_URL=
AMAZON_SLACK_ENABLED=false
AMAZON_SLACK_WEBHOOK=
AMAZON_SLACK_CHANNEL=#alerts

# ログ設定
AMAZON_LOG_LEVEL=info
AMAZON_DEBUG=false

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=yahoo_auction
DB_USER=postgres
DB_PASSWORD=
EOF

    echo "📝 テンプレート設定ファイルを作成しました: $ENV_FILE"
    echo "⚠️  Amazon PA-API認証情報を設定してください！"
fi

echo "✅ 設定ファイル確認完了"

# 5. Cronジョブ設定
echo "⏰ Cronジョブ設定中..."

CRON_FILE="/tmp/amazon_cron_jobs"

cat > "$CRON_FILE" << EOF
# Amazon統合システム - 監視スケジュール

# 高優先度監視（30分間隔）
*/30 * * * * /usr/bin/php ${PROJECT_ROOT}/10_zaiko/amazon_scheduler.php --high-priority >> ${PROJECT_ROOT}/logs/cron_high.log 2>&1

# 標準監視（2時間間隔）
0 */2 * * * /usr/bin/php ${PROJECT_ROOT}/10_zaiko/amazon_scheduler.php --normal >> ${PROJECT_ROOT}/logs/cron_normal.log 2>&1

# 低優先度監視（1日1回 午前9時）
0 9 * * * /usr/bin/php ${PROJECT_ROOT}/10_zaiko/amazon_scheduler.php --low-priority >> ${PROJECT_ROOT}/logs/cron_low.log 2>&1

# メンテナンス（毎日午前2時）
0 2 * * * /usr/bin/php ${PROJECT_ROOT}/10_zaiko/amazon_scheduler.php --maintenance >> ${PROJECT_ROOT}/logs/cron_maintenance.log 2>&1

# ヘルスチェック（15分間隔）
*/15 * * * * /usr/bin/php ${PROJECT_ROOT}/10_zaiko/amazon_scheduler.php --health-check >> ${PROJECT_ROOT}/logs/cron_health.log 2>&1
EOF

echo "📋 Cronジョブファイルを作成しました: $CRON_FILE"
echo "以下のコマンドでCronジョブを登録してください:"
echo "crontab $CRON_FILE"

# 6. テストスクリプト作成
echo "🧪 テストスクリプト作成中..."

cat > "${PROJECT_ROOT}/16_amazon_integration/test.php" << 'EOF'
<?php
/**
 * Amazon統合システム テストスクリプト
 */

require_once __DIR__ . '/../shared/config/amazon_api.php';
require_once __DIR__ . '/../02_scraping/amazon/AmazonApiClient.php';
require_once __DIR__ . '/../02_scraping/amazon/AmazonDataProcessor.php';
require_once __DIR__ . '/../10_zaiko/AmazonStockMonitor.php';

echo "🧪 Amazon統合システム テスト開始\n";
echo str_repeat("=", 50) . "\n";

// 1. 設定ファイルテスト
echo "1️⃣ 設定ファイルテスト...\n";
try {
    $config = require __DIR__ . '/../shared/config/amazon_api.php';
    echo "✅ 設定ファイル読み込み成功\n";
    
    $credentials = $config['credentials'];
    if (empty($credentials['access_key']) || $credentials['access_key'] === 'YOUR_ACCESS_KEY_HERE') {
        echo "⚠️  Amazon API認証情報が設定されていません\n";
    } else {
        echo "✅ Amazon API認証情報設定済み\n";
    }
} catch (Exception $e) {
    echo "❌ 設定ファイルエラー: " . $e->getMessage() . "\n";
}

// 2. データベース接続テスト
echo "\n2️⃣ データベース接続テスト...\n";
try {
    $db = getDatabaseConnection();
    if ($db) {
        echo "✅ データベース接続成功\n";
        
        // テーブル存在確認
        $tables = ['amazon_research_data', 'amazon_price_history', 'amazon_stock_history', 'amazon_monitoring_rules'];
        foreach ($tables as $table) {
            $stmt = $db->query("SELECT COUNT(*) FROM $table");
            if ($stmt) {
                $count = $stmt->fetchColumn();
                echo "✅ テーブル $table 存在確認 (レコード数: $count)\n";
            }
        }
    } else {
        echo "❌ データベース接続失敗\n";
    }
} catch (Exception $e) {
    echo "❌ データベースエラー: " . $e->getMessage() . "\n";
}

// 3. APIクライアントテスト
echo "\n3️⃣ APIクライアントテスト...\n";
try {
    $apiClient = new AmazonApiClient('US');
    echo "✅ APIクライアント初期化成功\n";
} catch (Exception $e) {
    echo "❌ APIクライアントエラー: " . $e->getMessage() . "\n";
}

// 4. データプロセッサテスト
echo "\n4️⃣ データプロセッサテスト...\n";
try {
    $processor = new AmazonDataProcessor('US');
    echo "✅ データプロセッサ初期化成功\n";
} catch (Exception $e) {
    echo "❌ データプロセッサエラー: " . $e->getMessage() . "\n";
}

// 5. 在庫監視エンジンテスト
echo "\n5️⃣ 在庫監視エンジンテスト...\n";
try {
    $monitor = new AmazonStockMonitor('US');
    echo "✅ 在庫監視エンジン初期化成功\n";
    
    // ヘルスチェック実行
    $health = $monitor->healthCheck();
    echo "システムヘルス: " . $health['overall_status'] . "\n";
} catch (Exception $e) {
    echo "❌ 在庫監視エンジンエラー: " . $e->getMessage() . "\n";
}

// 6. ファイル権限テスト
echo "\n6️⃣ ファイル権限テスト...\n";
$directories = [
    __DIR__ . '/../logs',
    __DIR__ . '/../shared/cache/amazon_api',
    __DIR__ . '/../tmp'
];

foreach ($directories as $dir) {
    if (is_dir($dir) && is_writable($dir)) {
        echo "✅ ディレクトリ書き込み権限OK: $dir\n";
    } else {
        echo "❌ ディレクトリ書き込み権限NG: $dir\n";
    }
}

echo "\n🏁 テスト完了\n";

// 統計情報表示
if (isset($monitor)) {
    echo "\n📊 システム統計:\n";
    try {
        $stats = $monitor->getMonitoringStats('today');
        echo "監視対象商品数: " . ($stats['basic_stats']['monitored_products'] ?? 0) . "\n";
        echo "アクティブルール数: " . ($stats['basic_stats']['active_rules'] ?? 0) . "\n";
        echo "本日の価格変動: " . ($stats['price_stats']['price_changes'] ?? 0) . "\n";
        echo "本日の在庫変動: " . ($stats['stock_stats']['stock_changes'] ?? 0) . "\n";
        echo "本日のAPIリクエスト: " . ($stats['api_stats']['total_requests'] ?? 0) . "\n";
    } catch (Exception $e) {
        echo "統計取得エラー: " . $e->getMessage() . "\n";
    }
}
EOF

chmod +x "${PROJECT_ROOT}/16_amazon_integration/test.php"

# 7. 管理スクリプト作成
cat > "${PROJECT_ROOT}/16_amazon_integration/manage.php" << 'EOF'
<?php
/**
 * Amazon統合システム 管理スクリプト
 */

require_once __DIR__ . '/../10_zaiko/AmazonStockMonitor.php';

function showUsage() {
    echo "Amazon統合システム 管理スクリプト\n";
    echo "使用方法: php manage.php [command] [options]\n\n";
    echo "コマンド:\n";
    echo "  status          - システム状態確認\n";
    echo "  monitor [asin]  - 手動監視実行\n";
    echo "  add [asin]      - 監視対象追加\n";
    echo "  remove [asin]   - 監視対象削除\n";
    echo "  pause [asin]    - 監視一時停止\n";
    echo "  resume [asin]   - 監視再開\n";
    echo "  stats [period]  - 統計表示 (today/week/month)\n";
    echo "  cleanup [days]  - 古いデータ削除\n";
    echo "  health          - ヘルスチェック\n";
    echo "\n";
}

if ($argc < 2) {
    showUsage();
    exit(1);
}

$command = $argv[1];
$monitor = new AmazonStockMonitor();

try {
    switch ($command) {
        case 'status':
            $health = $monitor->healthCheck();
            echo "システム状態: " . $health['overall_status'] . "\n";
            foreach ($health['checks'] as $check => $result) {
                echo "- $check: " . $result['status'] . "\n";
            }
            break;
            
        case 'monitor':
            if ($argc < 3) {
                echo "ASIN指定が必要です\n";
                exit(1);
            }
            $asin = $argv[2];
            echo "手動監視実行中: $asin\n";
            $result = $monitor->runManualMonitoring([$asin]);
            echo "結果: " . ($result['success'] ? '成功' : '失敗') . "\n";
            break;
            
        case 'stats':
            $period = $argc > 2 ? $argv[2] : 'today';
            $stats = $monitor->getMonitoringStats($period);
            echo "統計情報 ($period):\n";
            echo "監視商品数: " . $stats['basic_stats']['monitored_products'] . "\n";
            echo "価格変動: " . $stats['price_stats']['price_changes'] . "\n";
            echo "在庫変動: " . $stats['stock_stats']['stock_changes'] . "\n";
            break;
            
        case 'cleanup':
            $days = $argc > 2 ? intval($argv[2]) : 30;
            echo "古いデータクリーンアップ中... ($days日以前)\n";
            $result = $monitor->cleanupOldData($days);
            echo "削除完了:\n";
            foreach ($result as $table => $count) {
                echo "- $table: $count レコード\n";
            }
            break;
            
        case 'health':
            $health = $monitor->healthCheck();
            echo json_encode($health, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
            break;
            
        default:
            echo "不明なコマンド: $command\n";
            showUsage();
            exit(1);
    }
    
} catch (Exception $e) {
    echo "エラー: " . $e->getMessage() . "\n";
    exit(1);
}
EOF

chmod +x "${PROJECT_ROOT}/16_amazon_integration/manage.php"

echo "✅ 管理スクリプト作成完了"

# 8. ログファイル初期化
echo "📝 ログファイル初期化中..."

touch "${PROJECT_ROOT}/logs/amazon_api.log"
touch "${PROJECT_ROOT}/logs/amazon_scheduler.log"
touch "${PROJECT_ROOT}/logs/amazon_alerts.log"
touch "${PROJECT_ROOT}/logs/cron_high.log"
touch "${PROJECT_ROOT}/logs/cron_normal.log"
touch "${PROJECT_ROOT}/logs/cron_low.log"
touch "${PROJECT_ROOT}/logs/cron_maintenance.log"
touch "${PROJECT_ROOT}/logs/cron_health.log"

chmod 666 "${PROJECT_ROOT}"/logs/*.log

echo "✅ ログファイル初期化完了"

# 9. テスト実行
echo "🧪 システムテスト実行中..."

php "${PROJECT_ROOT}/16_amazon_integration/test.php"

echo ""
echo "🎉 Amazon統合システム デプロイメント完了！"
echo "=================================================="
echo ""
echo "📋 次のステップ:"
echo "1. 環境設定ファイルでAmazon PA-API認証情報を設定"
echo "   ファイル: $ENV_FILE"
echo ""
echo "2. Cronジョブを登録"
echo "   コマンド: crontab $CRON_FILE"
echo ""
echo "3. 管理コマンド:"
echo "   - システム状態確認: php ${PROJECT_ROOT}/16_amazon_integration/manage.php status"
echo "   - 統計表示: php ${PROJECT_ROOT}/16_amazon_integration/manage.php stats"
echo "   - ヘルスチェック: php ${PROJECT_ROOT}/16_amazon_integration/manage.php health"
echo ""
echo "4. APIエンドポイント:"
echo "   - 商品一覧: http://localhost:8081/new_structure/07_editing/api/amazon_api.php?action=get_products"
echo "   - 商品詳細: http://localhost:8081/new_structure/07_editing/api/amazon_api.php?action=get_product_details&asin=ASIN"
echo ""
echo "5. ログ確認:"
echo "   - システムログ: tail -f ${PROJECT_ROOT}/logs/amazon_scheduler.log"
echo "   - APIログ: tail -f ${PROJECT_ROOT}/logs/amazon_api.log"
echo ""
echo "⚠️  重要: Amazon PA-API認証情報を設定するまでAPIは動作しません"

exit 0