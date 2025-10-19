#!/bin/bash

# eBayカテゴリー統合システム - 月次バッチ処理スクリプト
# API効率化・データ整合性・自動化対応

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/logs/monthly_batch_$(date +%Y%m).log"
ERROR_LOG="${SCRIPT_DIR}/logs/monthly_batch_error_$(date +%Y%m).log"

# ログディレクトリ作成
mkdir -p "${SCRIPT_DIR}/logs"

# ログ関数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG" >&2
}

# メール通知関数（必要に応じて設定）
send_notification() {
    local subject="$1"
    local message="$2"
    
    # Slack通知やメール通知をここに実装
    log_message "通知: $subject - $message"
}

# データベース接続確認
check_database() {
    log_message "データベース接続確認開始"
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        echo 'データベース接続成功\\n';
    } catch (Exception \$e) {
        echo 'データベース接続失敗: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    "
    
    if [ $? -eq 0 ]; then
        log_message "データベース接続確認完了"
        return 0
    else
        log_error "データベース接続に失敗しました"
        return 1
    fi
}

# 期限切れデータクリーンアップ
cleanup_expired_data() {
    log_message "期限切れデータクリーンアップ開始"
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        // 期限切れセルミラー分析データ削除
        \$stmt = \$pdo->query('SELECT cleanup_expired_data()');
        \$deletedCount = \$stmt->fetchColumn();
        echo \"期限切れデータ削除: {\$deletedCount}件\\n\";
        
        // API使用ログクリーンアップ（90日以上前）
        \$stmt = \$pdo->query('DELETE FROM ebay_api_usage_log WHERE date_hour < NOW() - INTERVAL \'90 days\'');
        \$apiLogDeleted = \$stmt->rowCount();
        echo \"古いAPIログ削除: {\$apiLogDeleted}件\\n\";
        
        // 古いミラーテンプレート削除
        \$stmt = \$pdo->query('DELETE FROM mirror_listing_templates WHERE expires_at < NOW()');
        \$templatesDeleted = \$stmt->rowCount();
        echo \"期限切れテンプレート削除: {\$templatesDeleted}件\\n\";
        
    } catch (Exception \$e) {
        echo 'クリーンアップエラー: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    "
    
    if [ $? -eq 0 ]; then
        log_message "期限切れデータクリーンアップ完了"
    else
        log_error "クリーンアップ処理に失敗しました"
        return 1
    fi
}

# カテゴリー仕様更新（Trading API使用）
update_category_specifications() {
    log_message "カテゴリー仕様更新開始（Trading API）"
    
    php -r "
    require_once '${SCRIPT_DIR}/backend/classes/ItemSpecificsManager.php';
    require_once '${SCRIPT_DIR}/backend/classes/EbayTradingApiConnector.php';
    
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        \$ebayTradingApi = new EbayTradingApiConnector(\$pdo, true);
        \$itemSpecificsManager = new ItemSpecificsManager(\$pdo, \$ebayTradingApi, true);
        
        // 主要カテゴリーのみ更新（API制限考慮）
        \$priorityCategories = ['293', '625', '58058', '183454', '139973', '11450'];
        
        \$result = \$itemSpecificsManager->updateCategorySpecificationsBatch(\$priorityCategories, false);
        
        echo \"カテゴリー仕様更新結果:\\n\";
        echo \"処理カテゴリー数: {\$result['processed_categories']}\\n\";
        echo \"API呼び出し数: {\$result['api_calls_used']}\\n\";
        echo \"処理時間: {\$result['processing_time_ms']}ms\\n\";
        
        foreach (\$result['results'] as \$categoryResult) {
            if (\$categoryResult['status'] === 'error') {
                echo \"エラー - カテゴリー {\$categoryResult['category_id']}: {\$categoryResult['message']}\\n\";
            }
        }
        
    } catch (Exception \$e) {
        echo 'カテゴリー仕様更新エラー: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    "
    
    if [ $? -eq 0 ]; then
        log_message "カテゴリー仕様更新完了"
    else
        log_error "カテゴリー仕様更新に失敗しました"
        return 1
    fi
}

# 出品枠リセット（月次）
reset_monthly_quotas() {
    log_message "月次出品枠リセット開始"
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        \$currentMonth = date('Y-m');
        
        // 新月のレコード作成（存在しない場合）
        \$plans = ['basic', 'premium', 'anchor', 'enterprise'];
        \$quotas = [
            'basic' => ['all' => 250, 'select' => 250],
            'premium' => ['all' => 1000, 'select' => 1000],
            'anchor' => ['all' => 10000, 'select' => 10000],
            'enterprise' => ['all' => 100000, 'select' => 100000]
        ];
        
        foreach (\$plans as \$plan) {
            \$stmt = \$pdo->prepare(\"
                INSERT INTO store_listing_limits 
                (plan_type, all_categories_limit, select_categories_limit, month_year, current_all_categories, current_select_categories)
                VALUES (?, ?, ?, ?, 0, 0)
                ON CONFLICT (plan_type, month_year) DO UPDATE SET
                    current_all_categories = 0,
                    current_select_categories = 0,
                    last_updated = NOW()
            \");
            
            \$stmt->execute([
                \$plan,
                \$quotas[\$plan]['all'],
                \$quotas[\$plan]['select'],
                \$currentMonth
            ]);
        }
        
        echo \"月次出品枠リセット完了: \$currentMonth\\n\";
        
    } catch (Exception \$e) {
        echo '出品枠リセットエラー: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    "
    
    if [ $? -eq 0 ]; then
        log_message "月次出品枠リセット完了"
    else
        log_error "出品枠リセットに失敗しました"
        return 1
    fi
}

# データ整合性チェック
integrity_check() {
    log_message "データ整合性チェック開始"
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        \$stmt = \$pdo->query('SELECT monthly_data_integrity_check()');
        \$checkResult = \$stmt->fetchColumn();
        
        echo \"整合性チェック結果: \$checkResult\\n\";
        
        // スコア再計算（不整合があった場合）
        if (strpos(\$checkResult, 'inconsistent scores') !== false) {
            \$stmt = \$pdo->query(\"
                UPDATE yahoo_scraped_products 
                SET listing_score = calculate_listing_score(id),
                    listing_rank = calculate_listing_rank(calculate_listing_score(id))
                WHERE ABS(COALESCE(listing_score, 0) - calculate_listing_score(id)) > 1
            \");
            
            \$updatedCount = \$stmt->rowCount();
            echo \"スコア不整合修正: \$updatedCount件\\n\";
        }
        
    } catch (Exception \$e) {
        echo '整合性チェックエラー: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    "
    
    if [ $? -eq 0 ]; then
        log_message "データ整合性チェック完了"
    else
        log_error "整合性チェックに失敗しました"
        return 1
    fi
}

# 統計レポート生成
generate_monthly_report() {
    log_message "月次統計レポート生成開始"
    
    local report_file="${SCRIPT_DIR}/logs/monthly_report_$(date +%Y%m).json"
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$connection['password'], \$config['options']);
        
        // 統計データ収集
        \$report = [];
        
        // 商品統計
        \$stmt = \$pdo->query(\"
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as categorized,
                COUNT(CASE WHEN complete_item_specifics IS NOT NULL THEN 1 END) as item_specifics_generated,
                COUNT(CASE WHEN listing_rank = 'S' THEN 1 END) as s_rank,
                COUNT(CASE WHEN listing_rank = 'A' THEN 1 END) as a_rank,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                AVG(listing_score) as avg_score,
                AVG(category_confidence) as avg_confidence
            FROM yahoo_scraped_products 
            WHERE created_at >= DATE_TRUNC('month', NOW())
        \");
        \$report['product_stats'] = \$stmt->fetch(PDO::FETCH_ASSOC);
        
        // セルミラー統計
        \$stmt = \$pdo->query(\"
            SELECT 
                COUNT(*) as total_analyzed,
                AVG(mirror_confidence) as avg_confidence,
                COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as low_risk_count,
                AVG(sold_count_90days) as avg_sold_count,
                AVG(profit_estimation) as avg_profit
            FROM sell_mirror_analysis 
            WHERE analysis_timestamp >= DATE_TRUNC('month', NOW()) AND is_valid = TRUE
        \");
        \$report['sell_mirror_stats'] = \$stmt->fetch(PDO::FETCH_ASSOC);
        
        // API使用統計
        \$stmt = \$pdo->query(\"
            SELECT 
                api_type,
                SUM(request_count) as total_requests,
                AVG(processing_time_ms) as avg_response_time,
                COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hits
            FROM ebay_api_usage_log 
            WHERE date_hour >= DATE_TRUNC('month', NOW())
            GROUP BY api_type
        \");
        \$report['api_usage_stats'] = \$stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 出品枠使用状況
        \$stmt = \$pdo->query(\"
            SELECT * FROM store_listing_limits 
            WHERE month_year = TO_CHAR(NOW(), 'YYYY-MM')
        \");
        \$report['quota_usage'] = \$stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // タイムスタンプ追加
        \$report['generated_at'] = date('Y-m-d H:i:s');
        \$report['month'] = date('Y-m');
        
        // JSON出力
        echo json_encode(\$report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
    } catch (Exception \$e) {
        echo 'レポート生成エラー: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    " > "$report_file"
    
    if [ $? -eq 0 ]; then
        log_message "月次レポート生成完了: $report_file"
        
        # レポートのサマリー表示
        if command -v jq &> /dev/null; then
            log_message "=== 月次サマリー ==="
            log_message "総商品数: $(jq -r '.product_stats.total_products' "$report_file")"
            log_message "カテゴリー判定済: $(jq -r '.product_stats.categorized' "$report_file")"
            log_message "Sランク商品: $(jq -r '.product_stats.s_rank' "$report_file")"
            log_message "平均スコア: $(jq -r '.product_stats.avg_score' "$report_file" | cut -c1-5)"
            log_message "セルミラー分析数: $(jq -r '.sell_mirror_stats.total_analyzed' "$report_file")"
            log_message "==================="
        fi
    else
        log_error "月次レポート生成に失敗しました"
        return 1
    fi
}

# データベースバックアップ
backup_database() {
    log_message "データベースバックアップ開始"
    
    local backup_file="${SCRIPT_DIR}/backups/ebay_category_system_$(date +%Y%m%d).sql"
    mkdir -p "${SCRIPT_DIR}/backups"
    
    # 主要テーブルのバックアップ
    pg_dump -h localhost -U aritahiroaki -d nagano3_db \
        -t ebay_category_fees \
        -t ebay_complete_item_specifics \
        -t sell_mirror_analysis \
        -t store_listing_limits \
        -t listing_quota_categories \
        --data-only --inserts > "$backup_file" 2>/dev/null
    
    if [ $? -eq 0 ] && [ -s "$backup_file" ]; then
        log_message "データベースバックアップ完了: $backup_file"
        
        # 古いバックアップファイル削除（30日以上前）
        find "${SCRIPT_DIR}/backups" -name "ebay_category_system_*.sql" -mtime +30 -delete
        
        # バックアップファイル圧縮
        gzip "$backup_file" 2>/dev/null
        if [ $? -eq 0 ]; then
            log_message "バックアップファイル圧縮完了: ${backup_file}.gz"
        fi
    else
        log_error "データベースバックアップに失敗しました"
        return 1
    fi
}

# システム設定最適化
optimize_system_settings() {
    log_message "システム設定最適化開始"
    
    php -r "
    try {
        \$config = require '${SCRIPT_DIR}/backend/config/database.php';
        \$dsn = \"pgsql:host={\$config['host']};dbname={\$config['dbname']}\";
        \$pdo = new PDO(\$dsn, \$config['user'], \$config['password'], \$config['options']);
        
        // インデックス使用状況分析
        \$stmt = \$pdo->query(\"
            SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public' 
            AND (idx_scan = 0 OR idx_tup_read = 0)
            ORDER BY schemaname, tablename
        \");
        
        \$unusedIndexes = \$stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty(\$unusedIndexes)) {
            echo \"未使用インデックス検出:\\n\";
            foreach (\$unusedIndexes as \$index) {
                echo \"  {\$index['tablename']}.{\$index['indexname']}\\n\";
            }
        }
        
        // テーブル統計更新
        \$tables = [
            'yahoo_scraped_products',
            'ebay_category_fees', 
            'sell_mirror_analysis',
            'ebay_complete_item_specifics'
        ];
        
        foreach (\$tables as \$table) {
            \$pdo->query(\"ANALYZE \$table\");
        }
        
        echo \"テーブル統計更新完了\\n\";
        
        // 設定推奨値チェック
        \$stmt = \$pdo->query(\"SHOW shared_buffers\");
        \$sharedBuffers = \$stmt->fetchColumn();
        echo \"現在のshared_buffers: \$sharedBuffers\\n\";
        
    } catch (Exception \$e) {
        echo 'システム最適化エラー: ' . \$e->getMessage() . '\\n';
        exit(1);
    }
    "
    
    if [ $? -eq 0 ]; then
        log_message "システム設定最適化完了"
    else
        log_error "システム最適化に失敗しました"
        return 1
    fi
}

# メイン処理
main() {
    local start_time=$(date +%s)
    
    log_message "========================================="
    log_message "eBayカテゴリー統合システム 月次バッチ処理開始"
    log_message "========================================="
    
    # 処理ステップ実行
    local failed_steps=()
    
    if ! check_database; then
        failed_steps+=("データベース接続確認")
    fi
    
    if ! cleanup_expired_data; then
        failed_steps+=("期限切れデータクリーンアップ")
    fi
    
    if ! update_category_specifications; then
        failed_steps+=("カテゴリー仕様更新")
    fi
    
    # 月初のみ実行
    if [ "$(date +%d)" -le 3 ]; then
        if ! reset_monthly_quotas; then
            failed_steps+=("月次出品枠リセット")
        fi
    fi
    
    if ! integrity_check; then
        failed_steps+=("データ整合性チェック")
    fi
    
    if ! generate_monthly_report; then
        failed_steps+=("月次レポート生成")
    fi
    
    if ! backup_database; then
        failed_steps+=("データベースバックアップ")
    fi
    
    if ! optimize_system_settings; then
        failed_steps+=("システム最適化")
    fi
    
    # 処理結果サマリー
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_message "========================================="
    log_message "バッチ処理完了"
    log_message "処理時間: ${duration}秒"
    
    if [ ${#failed_steps[@]} -eq 0 ]; then
        log_message "全ステップ正常完了"
        send_notification "月次バッチ処理成功" "全${duration}秒で正常完了"
        exit 0
    else
        log_error "失敗したステップ: ${failed_steps[*]}"
        send_notification "月次バッチ処理部分失敗" "${#failed_steps[@]}個のステップでエラー"
        exit 1
    fi
}

# 使用方法表示
usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --cleanup-only       期限切れデータクリーンアップのみ実行"
    echo "  --update-specs       カテゴリー仕様更新のみ実行"
    echo "  --reset-quotas       出品枠リセットのみ実行"
    echo "  --integrity-check    整合性チェックのみ実行"
    echo "  --report-only        レポート生成のみ実行"
    echo "  --backup-only        バックアップのみ実行"
    echo "  --dry-run           実際の変更を行わずに実行内容確認"
    echo "  --help              このヘルプを表示"
    echo ""
}

# コマンドライン引数処理
case "${1:-}" in
    --cleanup-only)
        check_database && cleanup_expired_data
        ;;
    --update-specs)
        check_database && update_category_specifications
        ;;
    --reset-quotas)
        check_database && reset_monthly_quotas
        ;;
    --integrity-check)
        check_database && integrity_check
        ;;
    --report-only)
        check_database && generate_monthly_report
        ;;
    --backup-only)
        backup_database
        ;;
    --dry-run)
        log_message "DRY RUN: 実際の処理は実行されません"
        echo "実行予定処理:"
        echo "1. データベース接続確認"
        echo "2. 期限切れデータクリーンアップ"
        echo "3. カテゴリー仕様更新（Trading API）"
        echo "4. 出品枠リセット（月初のみ）"
        echo "5. データ整合性チェック"
        echo "6. 月次レポート生成"
        echo "7. データベースバックアップ"
        echo "8. システム最適化"
        ;;
    --help)
        usage
        ;;
    "")
        main
        ;;
    *)
        echo "エラー: 不明なオプション '$1'"
        usage
        exit 1
        ;;
esac