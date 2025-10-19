<?php
/**
 * スクレイピングログ管理クラス
 * 
 * 作成日: 2025-09-25
 * 用途: 統合ログ管理・レベル別ログ出力・ログローテーション
 * 場所: 02_scraping/common/ScrapingLogger.php
 */

class ScrapingLogger {
    
    const LEVEL_DEBUG = 0;
    const LEVEL_INFO = 1;
    const LEVEL_WARNING = 2;
    const LEVEL_ERROR = 3;
    const LEVEL_CRITICAL = 4;
    
    private $logLevel;
    private $logDirectory;
    private $maxFileSize;
    private $maxFiles;
    private $dateFormat;
    
    /**
     * コンストラクタ
     * 
     * @param array $config 設定配列
     */
    public function __construct($config = []) {
        $this->logLevel = $config['log_level'] ?? self::LEVEL_INFO;
        $this->logDirectory = $config['log_directory'] ?? __DIR__ . '/../logs/common/';
        $this->maxFileSize = $config['max_file_size'] ?? 10 * 1024 * 1024; // 10MB
        $this->maxFiles = $config['max_files'] ?? 30;
        $this->dateFormat = $config['date_format'] ?? 'Y-m-d H:i:s';
        
        $this->ensureLogDirectory();
    }
    
    /**
     * デバッグレベルログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function debug($message, $context = []) {
        $this->log(self::LEVEL_DEBUG, $message, $context);
    }
    
    /**
     * 情報レベルログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function info($message, $context = []) {
        $this->log(self::LEVEL_INFO, $message, $context);
    }
    
    /**
     * 警告レベルログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function warning($message, $context = []) {
        $this->log(self::LEVEL_WARNING, $message, $context);
    }
    
    /**
     * エラーレベルログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function error($message, $context = []) {
        $this->log(self::LEVEL_ERROR, $message, $context);
    }
    
    /**
     * クリティカルレベルログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function critical($message, $context = []) {
        $this->log(self::LEVEL_CRITICAL, $message, $context);
    }
    
    /**
     * ログ出力メイン処理
     * 
     * @param int $level ログレベル
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function log($level, $message, $context = []) {
        // ログレベルチェック
        if ($level < $this->logLevel) {
            return;
        }
        
        // ログエントリ作成
        $logEntry = $this->formatLogEntry($level, $message, $context);
        
        // ファイルに出力
        $this->writeToFile($level, $logEntry);
        
        // システムログにも出力
        error_log($logEntry);
        
        // クリティカルレベルの場合は追加処理
        if ($level >= self::LEVEL_CRITICAL) {
            $this->handleCriticalError($message, $context);
        }
    }
    
    /**
     * プラットフォーム固有ログ
     * 
     * @param string $platform プラットフォーム名
     * @param int $level ログレベル
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     */
    public function platformLog($platform, $level, $message, $context = []) {
        $context['platform'] = $platform;
        $this->log($level, $message, $context);
        
        // プラットフォーム固有ログファイルにも出力
        $platformLogDir = $this->logDirectory . '../' . strtolower($platform) . '/';
        if (!is_dir($platformLogDir)) {
            mkdir($platformLogDir, 0755, true);
        }
        
        $logEntry = $this->formatLogEntry($level, $message, $context);
        $platformFile = $platformLogDir . 'scraping_' . date('Y-m-d') . '.log';
        file_put_contents($platformFile, $logEntry . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * スクレイピング統計ログ
     * 
     * @param array $stats 統計データ
     */
    public function logStats($stats) {
        $statsDir = $this->logDirectory . 'stats/';
        if (!is_dir($statsDir)) {
            mkdir($statsDir, 0755, true);
        }
        
        $statsEntry = [
            'timestamp' => date($this->dateFormat),
            'stats' => $stats
        ];
        
        $statsFile = $statsDir . 'daily_stats_' . date('Y-m-d') . '.json';
        $existingData = [];
        
        if (file_exists($statsFile)) {
            $existingData = json_decode(file_get_contents($statsFile), true) ?? [];
        }
        
        $existingData[] = $statsEntry;
        file_put_contents($statsFile, json_encode($existingData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    /**
     * パフォーマンスログ
     * 
     * @param string $operation 処理名
     * @param float $executionTime 実行時間
     * @param array $metrics 追加メトリクス
     */
    public function logPerformance($operation, $executionTime, $metrics = []) {
        $perfData = [
            'operation' => $operation,
            'execution_time' => $executionTime,
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'metrics' => $metrics
        ];
        
        $this->info("Performance: {$operation}", $perfData);
        
        // パフォーマンス専用ログファイル
        $perfDir = $this->logDirectory . 'performance/';
        if (!is_dir($perfDir)) {
            mkdir($perfDir, 0755, true);
        }
        
        $perfFile = $perfDir . 'performance_' . date('Y-m-d') . '.json';
        $perfEntry = json_encode([
            'timestamp' => date($this->dateFormat),
            'data' => $perfData
        ]) . PHP_EOL;
        
        file_put_contents($perfFile, $perfEntry, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * ログファイルの取得
     * 
     * @param string $type ログタイプ ('common', 'error', 'platform')
     * @param int $limit 取得件数
     * @return array ログエントリ
     */
    public function getRecentLogs($type = 'common', $limit = 100) {
        $logFile = $this->getLogFilePath($type);
        
        if (!file_exists($logFile)) {
            return [];
        }
        
        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $lines = array_reverse($lines); // 最新から
        $lines = array_slice($lines, 0, $limit);
        
        $logs = [];
        foreach ($lines as $line) {
            $parsed = $this->parseLogLine($line);
            if ($parsed) {
                $logs[] = $parsed;
            }
        }
        
        return $logs;
    }
    
    /**
     * ログ統計を取得
     * 
     * @param string $date 対象日付 (Y-m-d形式)
     * @return array ログ統計
     */
    public function getLogStats($date = null) {
        $date = $date ?? date('Y-m-d');
        $logFile = $this->logDirectory . 'scraping_' . $date . '.log';
        
        if (!file_exists($logFile)) {
            return [
                'date' => $date,
                'total_entries' => 0,
                'by_level' => [],
                'by_platform' => [],
                'file_size' => 0
            ];
        }
        
        $lines = file($logFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $stats = [
            'date' => $date,
            'total_entries' => count($lines),
            'by_level' => [
                'DEBUG' => 0,
                'INFO' => 0,
                'WARNING' => 0,
                'ERROR' => 0,
                'CRITICAL' => 0
            ],
            'by_platform' => [],
            'file_size' => filesize($logFile)
        ];
        
        foreach ($lines as $line) {
            $parsed = $this->parseLogLine($line);
            if ($parsed) {
                $stats['by_level'][$parsed['level']]++;
                
                if (isset($parsed['context']['platform'])) {
                    $platform = $parsed['context']['platform'];
                    $stats['by_platform'][$platform] = ($stats['by_platform'][$platform] ?? 0) + 1;
                }
            }
        }
        
        return $stats;
    }
    
    /**
     * ログローテーション実行
     * 
     * @return bool 実行結果
     */
    public function rotateLogFiles() {
        try {
            $logFiles = glob($this->logDirectory . 'scraping_*.log');
            
            foreach ($logFiles as $logFile) {
                if (filesize($logFile) > $this->maxFileSize) {
                    $this->rotateSingleFile($logFile);
                }
            }
            
            $this->cleanupOldFiles();
            
            $this->info('Log rotation completed');
            return true;
            
        } catch (Exception $e) {
            $this->error('Log rotation failed: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * ログエントリをフォーマット
     * 
     * @param int $level ログレベル
     * @param string $message メッセージ
     * @param array $context コンテキスト
     * @return string フォーマット済みログエントリ
     */
    private function formatLogEntry($level, $message, $context = []) {
        $timestamp = date($this->dateFormat);
        $levelName = $this->getLevelName($level);
        
        $logEntry = "[{$timestamp}] [{$levelName}] {$message}";
        
        // コンテキスト情報の追加
        if (!empty($context)) {
            $contextStr = json_encode($context, JSON_UNESCAPED_UNICODE);
            $logEntry .= " | Context: {$contextStr}";
        }
        
        // メモリ使用量の追加（デバッグレベル時のみ）
        if ($level === self::LEVEL_DEBUG) {
            $memoryUsage = round(memory_get_usage(true) / 1024 / 1024, 2);
            $logEntry .= " | Memory: {$memoryUsage}MB";
        }
        
        return $logEntry;
    }
    
    /**
     * ファイルに書き込み
     * 
     * @param int $level ログレベル
     * @param string $logEntry ログエントリ
     */
    private function writeToFile($level, $logEntry) {
        // 共通ログファイル
        $commonFile = $this->getLogFilePath('common');
        file_put_contents($commonFile, $logEntry . PHP_EOL, FILE_APPEND | LOCK_EX);
        
        // エラー以上のレベルは専用ファイルにも出力
        if ($level >= self::LEVEL_ERROR) {
            $errorFile = $this->getLogFilePath('error');
            file_put_contents($errorFile, $logEntry . PHP_EOL, FILE_APPEND | LOCK_EX);
        }
    }
    
    /**
     * ログファイルパスを取得
     * 
     * @param string $type ログタイプ
     * @return string ファイルパス
     */
    private function getLogFilePath($type) {
        $date = date('Y-m-d');
        
        switch ($type) {
            case 'error':
                return $this->logDirectory . 'errors/error_' . $date . '.log';
            case 'common':
            default:
                return $this->logDirectory . 'scraping_' . $date . '.log';
        }
    }
    
    /**
     * ログレベル名を取得
     * 
     * @param int $level ログレベル
     * @return string レベル名
     */
    private function getLevelName($level) {
        $levels = [
            self::LEVEL_DEBUG => 'DEBUG',
            self::LEVEL_INFO => 'INFO',
            self::LEVEL_WARNING => 'WARNING',
            self::LEVEL_ERROR => 'ERROR',
            self::LEVEL_CRITICAL => 'CRITICAL'
        ];
        
        return $levels[$level] ?? 'UNKNOWN';
    }
    
    /**
     * ログ行をパース
     * 
     * @param string $line ログ行
     * @return array|null パース結果
     */
    private function parseLogLine($line) {
        $pattern = '/^\[([^\]]+)\] \[([^\]]+)\] (.+?)(?:\s\|\sContext:\s(.+?))?(?:\s\|\sMemory:\s(.+?))?$/';
        
        if (preg_match($pattern, $line, $matches)) {
            $context = [];
            if (isset($matches[4])) {
                $context = json_decode($matches[4], true) ?? [];
            }
            
            return [
                'timestamp' => $matches[1],
                'level' => $matches[2],
                'message' => $matches[3],
                'context' => $context,
                'memory' => $matches[5] ?? null
            ];
        }
        
        return null;
    }
    
    /**
     * 単一ファイルをローテーション
     * 
     * @param string $logFile ログファイルパス
     */
    private function rotateSingleFile($logFile) {
        $baseName = pathinfo($logFile, PATHINFO_FILENAME);
        $extension = pathinfo($logFile, PATHINFO_EXTENSION);
        $directory = pathinfo($logFile, PATHINFO_DIRNAME);
        
        $rotatedFile = $directory . '/' . $baseName . '_' . date('His') . '.' . $extension;
        
        if (rename($logFile, $rotatedFile)) {
            // 圧縮（gzipが利用可能な場合）
            if (function_exists('gzencode')) {
                $content = file_get_contents($rotatedFile);
                $compressedFile = $rotatedFile . '.gz';
                file_put_contents($compressedFile, gzencode($content, 9));
                unlink($rotatedFile);
            }
        }
    }
    
    /**
     * 古いファイルを削除
     */
    private function cleanupOldFiles() {
        $files = glob($this->logDirectory . '*.log*');
        
        // ファイルを更新時間でソート
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        // 保持数を超えるファイルを削除
        $filesToDelete = array_slice($files, $this->maxFiles);
        foreach ($filesToDelete as $file) {
            unlink($file);
        }
    }
    
    /**
     * ログディレクトリを確保
     */
    private function ensureLogDirectory() {
        $directories = [
            $this->logDirectory,
            $this->logDirectory . 'errors/',
            $this->logDirectory . 'stats/',
            $this->logDirectory . 'performance/'
        ];
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        }
    }
    
    /**
     * クリティカルエラー処理
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト
     */
    private function handleCriticalError($message, $context) {
        // 将来的にメール通知やSlack通知などを実装
        $criticalFile = $this->logDirectory . 'critical_' . date('Y-m-d') . '.log';
        $criticalEntry = date($this->dateFormat) . " | CRITICAL: {$message}" . PHP_EOL;
        file_put_contents($criticalFile, $criticalEntry, FILE_APPEND | LOCK_EX);
    }
}

/**
 * グローバル関数（既存システムとの互換性のため）
 */
if (!function_exists('writeLog')) {
    function writeLog($message, $type = 'INFO') {
        static $logger = null;
        if ($logger === null) {
            $logger = new ScrapingLogger();
        }
        
        $levelMap = [
            'DEBUG' => ScrapingLogger::LEVEL_DEBUG,
            'INFO' => ScrapingLogger::LEVEL_INFO,
            'SUCCESS' => ScrapingLogger::LEVEL_INFO, // SUCCESS を INFO として扱う
            'WARNING' => ScrapingLogger::LEVEL_WARNING,
            'ERROR' => ScrapingLogger::LEVEL_ERROR,
            'CRITICAL' => ScrapingLogger::LEVEL_CRITICAL
        ];
        
        $level = $levelMap[strtoupper($type)] ?? ScrapingLogger::LEVEL_INFO;
        $logger->log($level, $message);
    }
}
?>