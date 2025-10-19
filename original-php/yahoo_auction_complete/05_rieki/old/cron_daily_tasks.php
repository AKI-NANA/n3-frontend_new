<?php
/**
 * Yahoo Auction Tool - 定期実行タスク（cronジョブ）
 * 
 * 実行タスク:
 * - 為替レート自動更新
 * - 価格自動調整
 * - 古いデータのクリーンアップ
 * - システム統計の更新
 * 
 * 実行方法:
 * 0 6 * * * cd /path/to/project && php cron/daily_tasks.php >> logs/cron.log 2>&1
 * 
 * @author Claude AI
 * @version 2.0.0
 * @date 2025-09-17
 */

// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// 実行開始時刻記録
$start_time = microtime(true);
$execution_date = date('Y-m-d H:i:s');

echo "=== Yahoo Auction Tool 定期タスク実行開始 ===\n";
echo "実行日時: {$execution_date}\n";
echo "PHP Version: " . PHP_VERSION . "\n\n";

// 設定ファイル読み込み（実際のパスに調整してください）
$config = [
    'db_host' => 'localhost',
    'db_name' => 'yahoo_auction_tool',
    'db_user' => 'your_db_user',
    'db_password' => 'your_db_password',
    'log_file' => __DIR__ . '/../logs/cron.log'
];

// ログファイルディレクトリの作成
$log_dir = dirname($config['log_file']);
if (!is_dir($log_dir)) {
    mkdir($log_dir, 0755, true);
}

// データベース接続
try {
    $pdo = new PDO(
        "pgsql:host={$config['db_host']};dbname={$config['db_name']}", 
        $config['db_user'], 
        $config['db_password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "データベース接続成功\n";
} catch (PDOException $e) {
    echo "データベース接続エラー: " . $e->getMessage() . "\n";
    exit(1);
}

// 必要なクラスを読み込み
require_once __DIR__ . '/../classes/PriceCalculator.php';

// メインクラスのインスタンス化
$calculator = new PriceCalculator($pdo);
$exchangeUpdater = new ExchangeRateUpdater($pdo, $calculator);

/**
 * ログ出力関数
 */
function writeLog($message, $level = 'INFO') {
    global $config;
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[{$timestamp}] [{$level}] {$message}\n";
    echo $log_message;
    file_put_contents($config['log_file'], $log_message, FILE_APPEND | LOCK_EX);
}

/**
 * タスク実行結果の記録
 */
function recordTaskExecution($task_name, $status, $message = '', $execution_time = 0) {
    global $pdo;
    try {
        $stmt = $pdo->prepare("
            INSERT INTO system_logs (log_level, component, message, context) 
            VALUES (?, 'CronTask', ?, ?)
        ");
        $stmt->execute([
            $status === 'SUCCESS' ? 'INFO' : 'ERROR',
            "{$task_name}: {$message}",
            json_encode([
                'task_name' => $task_name,
                'status' => $status,
                'execution_time_ms' => round($execution_time * 1000, 2)
            ])
        ]);
    } catch (Exception $e) {
        writeLog("タスク実行記録エラー: " . $e->getMessage(), 'ERROR');
    }
}

// =============================================================================
// タスク1: 為替レート自動更新
// =============================================================================
writeLog("タスク1: 為替レート更新開始");
$task_start = microtime(true);

try {
    $result = $exchangeUpdater->updateRates();
    $task_time = microtime(true) - $task_start;
    
    if ($result['success']) {
        $message = "為替レート更新成功 - Base: {$result['base_rate']}, Calculated: {$result['calculated_rate']}";
        writeLog($message);
        recordTaskExecution('ExchangeRateUpdate', 'SUCCESS', $message, $task_time);
    } else {
        $message = "為替レート更新失敗: " . $result['error'];
        writeLog($message, 'ERROR');
        recordTaskExecution('ExchangeRateUpdate', 'ERROR', $result['error'], $task_time);
    }
} catch (Exception $e) {
    $task_time = microtime(true) - $task_start;
    $message = "為替レート更新例外: " . $e->getMessage();
    writeLog($message, 'ERROR');
    recordTaskExecution('ExchangeRateUpdate', 'ERROR', $message, $task_time);
}

// =============================================================================
// タスク2: 価格自動調整
// =============================================================================
writeLog("タスク2: 価格自動調整開始");
$task_start = microtime(true);

try {
    $adjustments_made = 0;
    $adjustment_errors = 0;
    
    // 調整対象商品の検索（実際の在庫管理システムとの連携が必要）
    $stmt = $pdo->prepare("
        SELECT DISTINCT item_id, category_id, item_condition, 
               EXTRACT(DAY FROM NOW() - created_at) as days_since_listing,
               recommended_price_usd as current_price
        FROM profit_calculations pc
        WHERE pc.created_at >= NOW() - INTERVAL '90 days'
          AND NOT EXISTS (
              SELECT 1 FROM price_adjustments pa 
              WHERE pa.item_id = pc.item_id 
              AND pa.applied_at >= NOW() - INTERVAL '7 days'
          )
    ");
    $stmt->execute();
    $items_for_adjustment = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($items_for_adjustment as $item) {
        try {
            // 価格調整ルールの確認
            $stmt = $pdo->prepare("
                SELECT id, rule_name, adjustment_type, adjustment_value, 
                       min_price_limit, max_adjustments
                FROM price_adjustment_rules 
                WHERE (category_id = ? OR category_id IS NULL)
                  AND (condition_type = ? OR condition_type IS NULL)
                  AND days_since_listing <= ?
                  AND active = TRUE
                ORDER BY category_id ASC, days_since_listing DESC
                LIMIT 1
            ");
            $stmt->execute([
                $item['category_id'],
                $item['item_condition'],
                $item['days_since_listing']
            ]);
            
            $rule = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($rule) {
                // 既存の調整回数チェック
                $stmt = $pdo->prepare("
                    SELECT COUNT(*) FROM price_adjustments 
                    WHERE item_id = ?
                ");
                $stmt->execute([$item['item_id']]);
                $adjustment_count = $stmt->fetchColumn();
                
                if ($adjustment_count < $rule['max_adjustments']) {
                    // 価格調整計算
                    $current_price = floatval($item['current_price']);
                    
                    if ($rule['adjustment_type'] === 'percentage') {
                        $new_price = $current_price * (1 + ($rule['adjustment_value'] / 100));
                    } else {
                        $new_price = $current_price + $rule['adjustment_value'];
                    }
                    
                    // 最低価格制限適用
                    if ($rule['min_price_limit'] && $new_price < $rule['min_price_limit']) {
                        $new_price = $rule['min_price_limit'];
                    }
                    
                    $adjustment_amount = $new_price - $current_price;
                    
                    // 調整履歴記録
                    $stmt = $pdo->prepare("
                        INSERT INTO price_adjustments (item_id, rule_id, original_price, adjusted_price, adjustment_amount, adjustment_reason)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $item['item_id'],
                        $rule['id'],
                        $current_price,
                        $new_price,
                        $adjustment_amount,
                        "自動調整ルール適用: {$rule['rule_name']}"
                    ]);
                    
                    $adjustments_made++;
                    
                    writeLog("価格調整実行: {$item['item_id']} - \${$current_price} → \${$new_price}");
                }
            }
        } catch (Exception $e) {
            $adjustment_errors++;
            writeLog("商品 {$item['item_id']} の価格調整エラー: " . $e->getMessage(), 'ERROR');
        }
    }
    
    $task_time = microtime(true) - $task_start;
    $message = "価格自動調整完了 - 調整数: {$adjustments_made}, エラー数: {$adjustment_errors}";
    writeLog($message);
    recordTaskExecution('PriceAdjustment', 'SUCCESS', $message, $task_time);
    
} catch (Exception $e) {
    $task_time = microtime(true) - $task_start;
    $message = "価格自動調整例外: " . $e->getMessage();
    writeLog($message, 'ERROR');
    recordTaskExecution('PriceAdjustment', 'ERROR', $message, $task_time);
}

// =============================================================================
// タスク3: データクリーンアップ
// =============================================================================
writeLog("タスク3: データクリーンアップ開始");
$task_start = microtime(true);

try {
    // 古い計算履歴削除
    $stmt = $pdo->prepare("SELECT cleanup_old_calculations()");
    $stmt->execute();
    $deleted_calculations = $stmt->fetchColumn();
    
    // 古い為替レートデータ削除
    $stmt = $pdo->prepare("SELECT cleanup_old_exchange_rates()");
    $stmt->execute();
    $deleted_rates = $stmt->fetchColumn();
    
    // 古いシステムログ削除（90日以上）
    $stmt = $pdo->prepare("
        DELETE FROM system_logs 
        WHERE created_at < NOW() - INTERVAL '90 days'
    ");
    $stmt->execute();
    $deleted_logs = $stmt->rowCount();
    
    $task_time = microtime(true) - $task_start;
    $message = "データクリーンアップ完了 - 計算履歴: {$deleted_calculations}件, 為替データ: {$deleted_rates}件, ログ: {$deleted_logs}件削除";
    writeLog($message);
    recordTaskExecution('DataCleanup', 'SUCCESS', $message, $task_time);
    
} catch (Exception $e) {
    $task_time = microtime(true) - $task_start;
    $message = "データクリーンアップ例外: " . $e->getMessage();
    writeLog($message, 'ERROR');
    recordTaskExecution('DataCleanup', 'ERROR', $message, $task_time);
}

// =============================================================================
// タスク4: システム統計更新
// =============================================================================
writeLog("タスク4: システム統計更新開始");
$task_start = microtime(true);

try {
    // 日次統計の計算と更新
    $today = date('Y-m-d');
    
    // 本日の計算回数
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as calculation_count,
               AVG(actual_profit_margin) as avg_margin,
               AVG(roi) as avg_roi,
               COUNT(DISTINCT category_id) as categories_used
        FROM profit_calculations 
        WHERE DATE(created_at) = ?
    ");
    $stmt->execute([$today]);
    $daily_stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // カテゴリー別統計
    $stmt = $pdo->prepare("
        SELECT category_id, COUNT(*) as count, AVG(actual_profit_margin) as avg_margin
        FROM profit_calculations 
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY category_id
        ORDER BY count DESC
        LIMIT 5
    ");
    $stmt->execute();
    $category_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // システム設定に統計情報を保存
    $stats_data = [
        'daily_calculations' => $daily_stats['calculation_count'],
        'daily_avg_margin' => round($daily_stats['avg_margin'], 2),
        'daily_avg_roi' => round($daily_stats['avg_roi'], 2),
        'categories_used_today' => $daily_stats['categories_used'],
        'top_categories_week' => $category_stats,
        'last_updated' => date('Y-m-d H:i:s')
    ];
    
    $calculator->updateSystemSetting('daily_statistics', json_encode($stats_data), 'json');
    
    // システムヘルスチェック実行
    $health_status = $calculator->healthCheck();
    $calculator->updateSystemSetting('system_health_status', json_encode($health_status), 'json');
    
    $task_time = microtime(true) - $task_start;
    $message = "システム統計更新完了 - 本日の計算: {$daily_stats['calculation_count']}件";
    writeLog($message);
    recordTaskExecution('StatisticsUpdate', 'SUCCESS', $message, $task_time);
    
} catch (Exception $e) {
    $task_time = microtime(true) - $task_start;
    $message = "システム統計更新例外: " . $e->getMessage();
    writeLog($message, 'ERROR');
    recordTaskExecution('StatisticsUpdate', 'ERROR', $message, $task_time);
}

// =============================================================================
// タスク5: システムヘルスモニタリング
// =============================================================================
writeLog("タスク5: システムヘルスモニタリング開始");
$task_start = microtime(true);

try {
    $health = $calculator->healthCheck();
    
    // ヘルス状態に応じてアラート生成
    if ($health['status'] === 'unhealthy') {
        writeLog("システムヘルス警告: " . ($health['error'] ?? 'システムが正常に動作していません'), 'WARNING');
        
        // 必要に応じてメール通知やSlack通知を実装
        // sendHealthAlert($health);
        
    } elseif ($health['status'] === 'degraded') {
        writeLog("システムヘルス注意: 一部機能に問題があります", 'WARNING');
    }
    
    // ディスク使用量チェック
    $disk_free = disk_free_space(__DIR__);
    $disk_total = disk_total_space(__DIR__);
    $disk_usage_percent = (1 - ($disk_free / $disk_total)) * 100;
    
    if ($disk_usage_percent > 90) {
        writeLog("ディスク使用量警告: {$disk_usage_percent}%", 'WARNING');
    }
    
    // メモリ使用量チェック
    $memory_usage = memory_get_peak_usage(true);
    $memory_limit = ini_get('memory_limit');
    
    if ($memory_usage > (128 * 1024 * 1024)) { // 128MB超過
        writeLog("メモリ使用量注意: " . round($memory_usage / 1024 / 1024, 2) . "MB", 'INFO');
    }
    
    $task_time = microtime(true) - $task_start;
    $message = "システムヘルスモニタリング完了 - ステータス: {$health['status']}";
    writeLog($message);
    recordTaskExecution('HealthMonitoring', 'SUCCESS', $message, $task_time);
    
} catch (Exception $e) {
    $task_time = microtime(true) - $task_start;
    $message = "システムヘルスモニタリング例外: " . $e->getMessage();
    writeLog($message, 'ERROR');
    recordTaskExecution('HealthMonitoring', 'ERROR', $message, $task_time);
}

// =============================================================================
// 実行完了レポート
// =============================================================================
$total_execution_time = microtime(true) - $start_time;
$end_time = date('Y-m-d H:i:s');

writeLog("=== 定期タスク実行完了 ===");
writeLog("開始時刻: {$execution_date}");
writeLog("終了時刻: {$end_time}");
writeLog("実行時間: " . round($total_execution_time, 2) . "秒");
writeLog("メモリ使用量: " . round(memory_get_peak_usage(true) / 1024 / 1024, 2) . "MB");

// 実行完了を記録
try {
    $stmt = $pdo->prepare("
        INSERT INTO system_logs (log_level, component, message, context) 
        VALUES ('INFO', 'CronJob', 'Daily tasks completed successfully', ?)
    ");
    $stmt->execute([json_encode([
        'execution_time' => round($total_execution_time, 2),
        'memory_usage_mb' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
        'start_time' => $execution_date,
        'end_time' => $end_time
    ])]);
} catch (Exception $e) {
    writeLog("実行完了記録エラー: " . $e->getMessage(), 'ERROR');
}

// 接続クローズ
$pdo = null;

writeLog("全てのタスクが完了しました。");
exit(0);

/**
 * ヘルスアラート送信関数（実装例）
 * 実際の運用では、メール送信ライブラリやSlack APIを使用
 */
function sendHealthAlert($health_status) {
    // メール送信やSlack通知の実装
    // 例: PHPMailer, Slack Webhook, etc.
    
    $alert_message = "Yahoo Auction Tool システムアラート\n";
    $alert_message .= "ステータス: {$health_status['status']}\n";
    $alert_message .= "時刻: " . date('Y-m-d H:i:s') . "\n";
    
    if (isset($health_status['error'])) {
        $alert_message .= "エラー: {$health_status['error']}\n";
    }
    
    if (isset($health_status['checks'])) {
        $alert_message .= "チェック結果:\n";
        foreach ($health_status['checks'] as $check => $result) {
            $alert_message .= "  {$check}: {$result}\n";
        }
    }
    
    // ログファイルに記録（実際の通知実装に置き換え）
    writeLog("ヘルスアラート生成: " . str_replace("\n", " | ", $alert_message), 'WARNING');
}

/**
 * 緊急停止チェック関数
 * 重要なエラーが発生した場合にタスクを停止
 */
function checkEmergencyStop($pdo) {
    try {
        $stmt = $pdo->prepare("
            SELECT setting_value FROM system_settings 
            WHERE setting_key = 'emergency_stop' AND setting_value = 'true'
        ");
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            writeLog("緊急停止フラグが設定されています。タスクを中断します。", 'ERROR');
            exit(1);
        }
    } catch (Exception $e) {
        writeLog("緊急停止チェックエラー: " . $e->getMessage(), 'ERROR');
    }
}
?>