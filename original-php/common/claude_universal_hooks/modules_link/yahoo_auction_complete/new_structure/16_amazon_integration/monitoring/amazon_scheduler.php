<?php
/**
 * 統合スケジューラ (Amazon監視機能拡張版)
 * new_structure/10_zaiko/scheduler.php
 */

require_once __DIR__ . '/AmazonStockMonitor.php';
require_once __DIR__ . '/../../shared/core/Logger.php';

// エラーハンドリング設定
set_error_handler(function($severity, $message, $file, $line) {
    if (error_reporting() & $severity) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    }
});

class SchedulerManager {
    private $logger;
    private $amazonMonitor;
    private $startTime;
    
    public function __construct() {
        $this->logger = new Logger('Scheduler');
        $this->amazonMonitor = new AmazonStockMonitor();
        $this->startTime = microtime(true);
        
        $this->logger->info('スケジューラ起動');
    }
    
    /**
     * スケジューラメイン実行
     */
    public function run(array $argv) {
        try {
            $this->parseArguments($argv);
            
        } catch (Exception $e) {
            $this->logger->error('スケジューラエラー: ' . $e->getMessage());
            $this->logExecutionSummary(false, $e->getMessage());
            exit(1);
        }
    }
    
    /**
     * コマンドライン引数の解析
     */
    private function parseArguments(array $argv) {
        $options = $this->getOptions($argv);
        
        if (isset($options['help']) || isset($options['h'])) {
            $this->showHelp();
            return;
        }
        
        if (isset($options['amazon'])) {
            $this->runAmazonScheduler($options);
        } elseif (isset($options['yahoo'])) {
            $this->runYahooScheduler($options);
        } elseif (isset($options['health-check'])) {
            $this->runHealthCheck();
        } elseif (isset($options['stats'])) {
            $this->showStats();
        } else {
            $this->runDefaultScheduler($options);
        }
        
        $this->logExecutionSummary(true);
    }
    
    /**
     * Amazon監視スケジューラ実行
     */
    private function runAmazonScheduler(array $options) {
        $this->logger->info('Amazon監視スケジューラ開始');
        
        $priority = 'all';
        if (isset($options['high-priority'])) {
            $priority = 'high';
        } elseif (isset($options['normal-priority'])) {
            $priority = 'normal';
        }
        
        $results = $this->amazonMonitor->runMonitoring($priority);
        
        $this->logger->info('Amazon監視完了', [
            'priority' => $priority,
            'total_processed' => $results['total_api_calls'],
            'high_priority_processed' => $results['high_priority']['processed'],
            'normal_priority_processed' => $results['normal_priority']['processed']
        ]);
        
        // 結果出力
        if (isset($options['verbose']) || isset($options['v'])) {
            echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
        } else {
            echo "処理完了: {$results['total_api_calls']}件\n";
        }
    }
    
    /**
     * Yahoo!スケジューラ実行（既存機能保護）
     */
    private function runYahooScheduler(array $options) {
        $this->logger->info('Yahoo!スケジューラ開始');
        
        // 既存のYahoo!システム処理をここに実装
        // 既存コードを保護しつつ実行
        
        echo "Yahoo!スケジューラ実行完了\n";
    }
    
    /**
     * デフォルトスケジューラ（既存との互換性維持）
     */
    private function runDefaultScheduler(array $options) {
        $this->logger->info('デフォルトスケジューラ開始');
        
        // 時刻に基づく自動判定
        $hour = date('H');
        $minute = date('i');
        
        // 30分ごと：Amazon高優先度監視
        if ($minute % 30 == 0) {
            $this->logger->info('30分間隔: Amazon高優先度監視実行');
            $this->amazonMonitor->runMonitoring('high');
        }
        
        // 8時間ごと（0, 8, 16時）：Amazon通常監視
        if (in_array($hour, [0, 8, 16]) && $minute == 0) {
            $this->logger->info('8時間間隔: Amazon通常監視実行');
            $this->amazonMonitor->runMonitoring('normal');
        }
        
        // 深夜2時：データクリーンアップ
        if ($hour == 2 && $minute == 0) {
            $this->logger->info('日次クリーンアップ実行');
            $this->amazonMonitor->cleanupOldData(90);
        }
        
        echo "自動スケジューラ実行完了\n";
    }
    
    /**
     * ヘルスチェック実行
     */
    private function runHealthCheck() {
        echo "システムヘルスチェック実行中...\n";
        
        $health = $this->amazonMonitor->healthCheck();
        
        echo "ステータス: " . strtoupper($health['status']) . "\n";
        echo "チェック時刻: " . $health['timestamp'] . "\n";
        echo "\n";
        
        foreach ($health['checks'] as $check => $result) {
            $status = $result === 'ok' ? '✓' : '✗';
            echo sprintf("%-25s %s %s\n", $check, $status, $result);
        }
        
        if (isset($health['error'])) {
            echo "\nエラー: " . $health['error'] . "\n";
        }
        
        exit($health['status'] === 'ok' ? 0 : 1);
    }
    
    /**
     * 統計情報表示
     */
    private function showStats() {
        echo "Amazon監視システム統計情報\n";
        echo str_repeat("=", 40) . "\n";
        
        $stats = $this->amazonMonitor->getMonitoringStats();
        
        echo sprintf("総商品数: %d\n", $stats['total_products'] ?? 0);
        echo sprintf("高優先度商品数: %d\n", $stats['high_priority_products'] ?? 0);
        echo sprintf("過去24時間の価格変動: %d件\n", $stats['price_changes_24h'] ?? 0);
        echo sprintf("過去24時間の在庫変動: %d件\n", $stats['stock_changes_24h'] ?? 0);
        echo sprintf("在庫切れ商品数: %d\n", $stats['out_of_stock_products'] ?? 0);
        
        if (isset($stats['check_distribution'])) {
            echo "\n最終チェック時刻別分布:\n";
            echo sprintf("  1時間以内: %d\n", $stats['check_distribution']['checked_1h'] ?? 0);
            echo sprintf("  6時間以内: %d\n", $stats['check_distribution']['checked_6h'] ?? 0);
            echo sprintf("  24時間以内: %d\n", $stats['check_distribution']['checked_24h'] ?? 0);
            echo sprintf("  未チェック: %d\n", $stats['check_distribution']['never_checked'] ?? 0);
        }
    }
    
    /**
     * ヘルプ表示
     */
    private function showHelp() {
        echo "Amazon統合システム スケジューラ\n";
        echo str_repeat("=", 40) . "\n";
        echo "使用方法: php scheduler.php [オプション]\n\n";
        
        echo "Amazon監視オプション:\n";
        echo "  --amazon              Amazon監視実行\n";
        echo "  --high-priority       高優先度商品のみ監視\n";
        echo "  --normal-priority     通常優先度商品のみ監視\n\n";
        
        echo "Yahoo!オプション（既存機能）:\n";
        echo "  --yahoo               Yahoo!処理実行\n\n";
        
        echo "システムオプション:\n";
        echo "  --health-check        ヘルスチェック実行\n";
        echo "  --stats               統計情報表示\n";
        echo "  --verbose, -v         詳細出力\n";
        echo "  --help, -h            このヘルプを表示\n\n";
        
        echo "Cronジョブ設定例:\n";
        echo "# 高優先度監視（30分間隔）\n";
        echo "*/30 * * * * php /path/to/scheduler.php --amazon --high-priority\n\n";
        echo "# 通常監視（8時間間隔）\n";
        echo "0 */8 * * * php /path/to/scheduler.php --amazon --normal-priority\n\n";
        echo "# 日次クリーンアップ（深夜2時）\n";
        echo "0 2 * * * php /path/to/scheduler.php --amazon --cleanup\n\n";
    }
    
    /**
     * コマンドライン引数解析
     */
    private function getOptions(array $argv) {
        $options = [];
        
        for ($i = 1; $i < count($argv); $i++) {
            $arg = $argv[$i];
            
            if (strpos($arg, '--') === 0) {
                $key = substr($arg, 2);
                if (strpos($key, '=') !== false) {
                    list($key, $value) = explode('=', $key, 2);
                    $options[$key] = $value;
                } else {
                    $options[$key] = true;
                }
            } elseif (strpos($arg, '-') === 0 && strlen($arg) > 1) {
                $keys = str_split(substr($arg, 1));
                foreach ($keys as $key) {
                    $options[$key] = true;
                }
            }
        }
        
        return $options;
    }
    
    /**
     * 実行サマリーログ
     */
    private function logExecutionSummary(bool $success, string $error = '') {
        $executionTime = round(microtime(true) - $this->startTime, 2);
        $memoryUsage = round(memory_get_peak_usage() / 1024 / 1024, 2);
        
        $summary = [
            'success' => $success,
            'execution_time' => $executionTime,
            'memory_usage_mb' => $memoryUsage,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if (!$success && $error) {
            $summary['error'] = $error;
        }
        
        $this->logger->info('スケジューラ実行完了', $summary);
    }
}

// スクリプト実行
if (php_sapi_name() === 'cli') {
    try {
        $scheduler = new SchedulerManager();
        $scheduler->run($argv);
        
    } catch (Exception $e) {
        error_log("スケジューラ致命的エラー: " . $e->getMessage());
        exit(1);
    }
} else {
    // Web経由でのアクセスの場合
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'このスクリプトはコマンドラインからのみ実行可能です',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit(1);
}
?>