<?php
/**
 * ログ管理クラス
 * 在庫管理システム用統合ロガー
 */

class Logger {
    private $channel;
    private $logPath;
    private $maxFileSize;
    private $retentionDays;
    
    const LEVEL_DEBUG = 100;
    const LEVEL_INFO = 200;
    const LEVEL_WARNING = 300;
    const LEVEL_ERROR = 400;
    const LEVEL_CRITICAL = 500;
    
    private $levelNames = [
        self::LEVEL_DEBUG => 'DEBUG',
        self::LEVEL_INFO => 'INFO',
        self::LEVEL_WARNING => 'WARNING',
        self::LEVEL_ERROR => 'ERROR',
        self::LEVEL_CRITICAL => 'CRITICAL'
    ];
    
    public function __construct($channel = 'default') {
        $this->channel = $channel;
        $this->logPath = LOG_PATH;
        $this->maxFileSize = LOG_MAX_SIZE;
        $this->retentionDays = LOG_RETENTION_DAYS;
        
        $this->ensureLogDirectory();
    }
    
    /**
     * ログディレクトリ確保
     */
    private function ensureLogDirectory() {
        if (!is_dir($this->logPath)) {
            mkdir($this->logPath, 0755, true);
        }
        
        // チャンネル別ディレクトリ作成
        $channelPath = $this->logPath . $this->channel . '/';
        if (!is_dir($channelPath)) {
            mkdir($channelPath, 0755, true);
        }
    }
    
    /**
     * ログファイルパス生成
     */
    private function getLogFilePath($level) {
        $date = date('Y-m-d');
        $levelName = strtolower($this->levelNames[$level]);
        
        return $this->logPath . $this->channel . '/' . 
               $date . '_' . $levelName . '.log';
    }
    
    /**
     * ログメッセージフォーマット
     */
    private function formatMessage($level, $message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $levelName = $this->levelNames[$level];
        $memoryUsage = round(memory_get_usage(true) / 1024 / 1024, 2);
        
        $logData = [
            'timestamp' => $timestamp,
            'level' => $levelName,
            'channel' => $this->channel,
            'message' => $message,
            'memory_mb' => $memoryUsage,
            'process_id' => getmypid(),
            'request_id' => $this->getRequestId()
        ];
        
        if (!empty($context)) {
            $logData['context'] = $context;
        }
        
        // スタックトレース（エラーレベル以上）
        if ($level >= self::LEVEL_ERROR) {
            $logData['stack_trace'] = $this->getStackTrace();
        }
        
        return json_encode($logData, JSON_UNESCAPED_UNICODE) . "\n";
    }
    
    /**
     * リクエストID生成
     */
    private function getRequestId() {
        static $requestId = null;
        
        if ($requestId === null) {
            $requestId = substr(md5(uniqid(mt_rand(), true)), 0, 8);
        }
        
        return $requestId;
    }
    
    /**
     * スタックトレース取得
     */
    private function getStackTrace() {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS);
        
        // Logger関連の呼び出しを除外
        $filteredTrace = array_filter($trace, function($frame) {
            return !isset($frame['class']) || 
                   $frame['class'] !== 'Logger';
        });
        
        return array_slice($filteredTrace, 0, 10); // 最大10フレーム
    }
    
    /**
     * ログ書き込み
     */
    private function writeLog($level, $message, $context = []) {
        try {
            $filePath = $this->getLogFilePath($level);
            $formattedMessage = $this->formatMessage($level, $message, $context);
            
            // ファイルサイズチェック
            if (file_exists($filePath) && filesize($filePath) > $this->maxFileSize) {
                $this->rotateLogFile($filePath);
            }
            
            // ログ書き込み
            file_put_contents($filePath, $formattedMessage, FILE_APPEND | LOCK_EX);
            
            // クリティカルエラーの場合は即座に通知
            if ($level >= self::LEVEL_CRITICAL) {
                $this->sendCriticalAlert($message, $context);
            }
            
        } catch (Exception $e) {
            // ログ書き込み失敗時はエラーログに記録
            error_log('Logger: ログ書き込み失敗 - ' . $e->getMessage());
        }
    }
    
    /**
     * ログファイルローテーション
     */
    private function rotateLogFile($filePath) {
        $backupPath = $filePath . '.' . time() . '.backup';
        rename($filePath, $backupPath);
        
        // 古いバックアップファイル削除
        $this->cleanupOldBackups();
    }
    
    /**
     * 古いログファイル削除
     */
    private function cleanupOldBackups() {
        $cutoffTime = time() - ($this->retentionDays * 24 * 60 * 60);
        $channelPath = $this->logPath . $this->channel . '/';
        
        if (is_dir($channelPath)) {
            $files = glob($channelPath . '*.backup');
            
            foreach ($files as $file) {
                if (filemtime($file) < $cutoffTime) {
                    unlink($file);
                }
            }
        }
    }
    
    /**
     * クリティカルアラート送信
     */
    private function sendCriticalAlert($message, $context) {
        // Web版では無効化
        if (!SMTP_ENABLED) {
            return;
        }
        
        // 実装は省略（本番環境で必要に応じて実装）
    }
    
    /**
     * DEBUGレベルログ
     */
    public function debug($message, $context = []) {
        if (SYSTEM_ENVIRONMENT === 'development') {
            $this->writeLog(self::LEVEL_DEBUG, $message, $context);
        }
    }
    
    /**
     * INFOレベルログ
     */
    public function info($message, $context = []) {
        $this->writeLog(self::LEVEL_INFO, $message, $context);
    }
    
    /**
     * WARNINGレベルログ
     */
    public function warning($message, $context = []) {
        $this->writeLog(self::LEVEL_WARNING, $message, $context);
    }
    
    /**
     * ERRORレベルログ
     */
    public function error($message, $context = []) {
        $this->writeLog(self::LEVEL_ERROR, $message, $context);
    }
    
    /**
     * CRITICALレベルログ
     */
    public function critical($message, $context = []) {
        $this->writeLog(self::LEVEL_CRITICAL, $message, $context);
    }
    
    /**
     * ログレベル指定ログ
     */
    public function log($level, $message, $context = []) {
        $this->writeLog($level, $message, $context);
    }
    
    /**
     * ログファイル取得
     */
    public function getLogFile($level, $date = null) {
        if ($date === null) {
            $date = date('Y-m-d');
        }
        
        $levelName = strtolower($this->levelNames[$level]);
        $filePath = $this->logPath . $this->channel . '/' . 
                   $date . '_' . $levelName . '.log';
        
        if (file_exists($filePath)) {
            return file_get_contents($filePath);
        }
        
        return null;
    }
    
    /**
     * 最新ログエントリ取得
     */
    public function getRecentLogs($limit = 100, $level = null) {
        $logs = [];
        $channelPath = $this->logPath . $this->channel . '/';
        
        if (!is_dir($channelPath)) {
            return $logs;
        }
        
        $files = glob($channelPath . '*.log');
        rsort($files); // 新しい順にソート
        
        foreach ($files as $file) {
            if ($level !== null) {
                $levelName = strtolower($this->levelNames[$level]);
                if (strpos(basename($file), $levelName) === false) {
                    continue;
                }
            }
            
            $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            
            foreach (array_reverse($lines) as $line) {
                $logEntry = json_decode($line, true);
                if ($logEntry) {
                    $logs[] = $logEntry;
                    
                    if (count($logs) >= $limit) {
                        break 2;
                    }
                }
            }
        }
        
        return $logs;
    }
    
    /**
     * ログ統計取得
     */
    public function getLogStats($hours = 24) {
        $cutoffTime = time() - ($hours * 3600);
        $stats = [
            'total' => 0,
            'by_level' => array_fill_keys($this->levelNames, 0),
            'by_hour' => []
        ];
        
        $recentLogs = $this->getRecentLogs(10000);
        
        foreach ($recentLogs as $log) {
            $logTime = strtotime($log['timestamp']);
            
            if ($logTime >= $cutoffTime) {
                $stats['total']++;
                $stats['by_level'][$log['level']]++;
                
                $hour = date('H:00', $logTime);
                if (!isset($stats['by_hour'][$hour])) {
                    $stats['by_hour'][$hour] = 0;
                }
                $stats['by_hour'][$hour]++;
            }
        }
        
        return $stats;
    }
}
?>