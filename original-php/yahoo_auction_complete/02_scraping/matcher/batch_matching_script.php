<?php
/**
 * バッチマッチング処理スクリプト
 * new_structure/02_scraping/matcher/batch_matching.php
 */

require_once __DIR__ . '/ProductMatcher.php';
require_once __DIR__ . '/../../shared/core/Logger.php';

class BatchMatchingRunner {
    private $matcher;
    private $logger;
    private $startTime;
    
    public function __construct() {
        $this->matcher = new ProductMatcher();
        $this->logger = new Logger('BatchMatching');
        $this->startTime = microtime(true);
        
        // エラーハンドリング設定
        set_error_handler([$this, 'errorHandler']);
        set_exception_handler([$this, 'exceptionHandler']);
    }
    
    /**
     * バッチ処理実行
     */
    public function run(array $argv) {
        try {
            $this->logger->info('バッチマッチング処理開始');
            
            $options = $this->parseArguments($argv);
            
            if (isset($options['help']) || isset($options['h'])) {
                $this->showHelp();
                return;
            }
            
            $limit = intval($options['limit'] ?? 50);
            $dryRun = isset($options['dry-run']);
            $verbose = isset($options['verbose']) || isset($options['v']);
            
            if ($dryRun) {
                echo "DRY RUN モード: 実際の処理は行いません\n";
                $this->runDryRun($limit);
            } else {
                $results = $this->runActualMatching($limit, $verbose);
                $this->showResults($results);
            }
            
            $this->logExecutionSummary(true);
            
        } catch (Exception $e) {
            $this->logger->error('バッチマッチング処理エラー: ' . $e->getMessage());
            $this->logExecutionSummary(false, $e->getMessage());
            exit(1);
        }
    }
    
    /**
     * 実際のマッチング処理実行
     */
    private function runActualMatching(int $limit, bool $verbose) {
        echo "バッチマッチング処理を開始します (制限: {$limit}件)\n";
        echo str_repeat("=", 50) . "\n";
        
        $results = $this->matcher->runBatchMatching($limit);
        
        if ($verbose) {
            echo "処理中...\n";
            $this->showProgressDetails($results);
        }
        
        return $results;
    }
    
    /**
     * ドライラン実行
     */
    private function runDryRun(int $limit) {
        echo "未マッチング商品の分析を実行します (制限: {$limit}件)\n";
        echo str_repeat("=", 50) . "\n";
        
        try {
            $db = new Database();
            
            // 未マッチング商品数
            $totalUnmatched = $db->query("
                SELECT COUNT(*) as count 
                FROM yahoo_scraped_products 
                WHERE id NOT IN (SELECT yahoo_product_id FROM product_cross_reference)
                AND title IS NOT NULL AND title != ''
            ")->fetch()['count'];
            
            echo "総未マッチング商品数: {$totalUnmatched}件\n";
            
            // サンプル商品表示
            $samples = $db->query("
                SELECT id, title, current_price, brand 
                FROM yahoo_scraped_products 
                WHERE id NOT IN (SELECT yahoo_product_id FROM product_cross_reference)
                AND title IS NOT NULL AND title != ''
                ORDER BY created_at DESC 
                LIMIT {$limit}
            ")->fetchAll();
            
            echo "\nマッチング対象サンプル:\n";
            foreach ($samples as $sample) {
                echo sprintf("ID: %d | %s | ¥%s | %s\n", 
                    $sample['id'], 
                    mb_substr($sample['title'], 0, 50),
                    number_format($sample['current_price'] ?? 0),
                    $sample['brand'] ?? 'ブランド不明'
                );
            }
            
        } catch (Exception $e) {
            echo "ドライラン実行エラー: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * 進捗詳細表示
     */
    private function showProgressDetails(array $results) {
        echo "処理済み: {$results['processed']}件\n";
        echo "マッチング成功: {$results['matched']}件\n";
        echo "エラー: {$results['errors']}件\n";
        echo "実行時間: {$results['execution_time']}秒\n";
    }
    
    /**
     * 結果表示
     */
    private function showResults(array $results) {
        echo "\n" . str_repeat("=", 50) . "\n";
        echo "バッチマッチング処理完了\n";
        echo str_repeat("=", 50) . "\n";
        
        echo sprintf("処理済み商品数: %d件\n", $results['processed']);
        echo sprintf("マッチング成功: %d件 (%.1f%%)\n", 
            $results['matched'], 
            $results['processed'] > 0 ? ($results['matched'] / $results['processed']) * 100 : 0
        );
        echo sprintf("エラー件数: %d件\n", $results['errors']);
        echo sprintf("実行時間: %d秒\n", $results['execution_time']);
        
        if ($results['matched'] > 0) {
            echo "\n✓ マッチング処理が正常に完了しました\n";
        } else {
            echo "\n⚠ マッチングされた商品がありませんでした\n";
        }
    }
    
    /**
     * ヘルプ表示
     */
    private function showHelp() {
        echo "バッチマッチング処理スクリプト\n";
        echo str_repeat("=", 40) . "\n";
        echo "使用方法: php batch_matching.php [オプション]\n\n";
        
        echo "オプション:\n";
        echo "  --limit=N         処理件数制限 (デフォルト: 50)\n";
        echo "  --dry-run         実際の処理を行わず、対象商品のみ表示\n";
        echo "  --verbose, -v     詳細な進捗を表示\n";
        echo "  --help, -h        このヘルプを表示\n\n";
        
        echo "使用例:\n";
        echo "  php batch_matching.php --limit=100 --verbose\n";
        echo "  php batch_matching.php --dry-run\n\n";
        
        echo "Cronジョブ設定例:\n";
        echo "# 日次自動マッチング処理（深夜2時実行）\n";
        echo "0 2 * * * php /path/to/batch_matching.php --limit=100\n\n";
        echo "# 新規Yahoo!商品の即座マッチング（1時間ごと）\n";
        echo "0 * * * * php /path/to/batch_matching.php --limit=10\n\n";
    }
    
    /**
     * コマンドライン引数解析
     */
    private function parseArguments(array $argv) {
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
     * エラーハンドラ
     */
    public function errorHandler($severity, $message, $file, $line) {
        if (error_reporting() & $severity) {
            $this->logger->error("PHPエラー: {$message} in {$file}:{$line}");
        }
    }
    
    /**
     * 例外ハンドラ
     */
    public function exceptionHandler(Exception $e) {
        $this->logger->error("未処理例外: " . $e->getMessage());
        echo "致命的エラー: " . $e->getMessage() . "\n";
        exit(1);
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
        
        $this->logger->info('バッチマッチング実行完了', $summary);
    }
}

// スクリプト実行
if (php_sapi_name() === 'cli') {
    try {
        $runner = new BatchMatchingRunner();
        $runner->run($argv);
        
    } catch (Exception $e) {
        error_log("バッチマッチング致命的エラー: " . $e->getMessage());
        exit(1);
    }
} else {
    echo "このスクリプトはコマンドラインからのみ実行可能です\n";
    exit(1);
}
?>