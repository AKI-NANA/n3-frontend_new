<?php
/**
 * 統合ログクラス
 * Yahoo Auction統合システム - shared 基盤
 */

class Logger {
    private $name;
    private $logFile;
    private $logLevel;
    
    // ログレベル定数
    const DEBUG = 1;
    const INFO = 2;
    const WARNING = 3;
    const ERROR = 4;
    const CRITICAL = 5;
    
    /**
     * コンストラクタ
     * 
     * @param string $name ログ名
     * @param string $logFile ログファイルパス（省略時は自動生成）
     * @param int $logLevel ログレベル
     */
    public function __construct($name = 'System', $logFile = null, $logLevel = self::INFO) {
        $this->name = $name;
        $this->logLevel = $logLevel;
        
        // ログファイルパスの決定
        if ($logFile === null) {
            $logDir = __DIR__ . '/../../logs';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            $this->logFile = $logDir . '/' . strtolower($name) . '_' . date('Y-m-d') . '.log';
        } else {
            $this->logFile = $logFile;
        }
    }
    
    /**
     * デバッグログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     * @return void
     */
    public function debug($message, $context = []) {
        $this->log(self::DEBUG, $message, $context);
    }
    
    /**
     * 情報ログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     * @return void
     */
    public function info($message, $context = []) {
        $this->log(self::INFO, $message, $context);
    }
    
    /**
     * 警告ログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     * @return void
     */
    public function warning($message, $context = []) {
        $this->log(self::WARNING, $message, $context);
    }
    
    /**
     * エラーログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     * @return void
     */
    public function error($message, $context = []) {
        $this->log(self::ERROR, $message, $context);
    }
    
    /**
     * 重大エラーログ
     * 
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     * @return void
     */
    public function critical($message, $context = []) {
        $this->log(self::CRITICAL, $message, $context);
    }
    
    /**
     * ログ出力メイン処理
     * 
     * @param int $level ログレベル
     * @param string $message メッセージ
     * @param array $context コンテキスト情報
     * @return void
     */
    private function log($level, $message, $context = []) {
        // ログレベルチェック
        if ($level < $this->logLevel) {
            return;
        }
        
        $levelName = $this->getLevelName($level);
        $timestamp = date('Y-m-d H:i:s');
        $pid = getmypid();
        
        // コンテキスト情報を文字列化
        $contextStr = empty($context) ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
        
        // ログフォーマット
        $logEntry = "[{$timestamp}] [{$this->name}] [{$levelName}] [PID:{$pid}] {$message}{$contextStr}" . PHP_EOL;
        
        // ファイル出力
        $this->writeToFile($logEntry);
        
        // 重要ログはerror_logにも出力
        if ($level >= self::ERROR) {
            error_log("[{$this->name}] [{$levelName}] {$message}");
        }
    }
    
    /**
     * ファイルにログを書き込み
     * 
     * @param string $logEntry ログエントリ
     * @return void
     */
    private function writeToFile($logEntry) {
        try {
            // ディレクトリが存在しない場合は作成
            $logDir = dirname($this->logFile);
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            // ファイルに書き込み（ロック付き）
            file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
            
            // ファイルサイズチェック（10MBを超えたらローテーション）
            if (file_exists($this->logFile) && filesize($this->logFile) > 10 * 1024 * 1024) {
                $this->rotateLogFile();
            }
            
        } catch (Exception $e) {
            // ログ出力自体がエラーの場合はerror_logにフォールバック
            error_log("Logger write error: " . $e->getMessage());
        }
    }
    
    /**
     * ログファイルローテーション
     * 
     * @return void
     */
    private function rotateLogFile() {
        try {
            $rotatedFile = $this->logFile . '.' . date('His');
            rename($this->logFile, $rotatedFile);
            
            // 古いログファイルを削除（7日以上前）
            $this->cleanOldLogs();
            
        } catch (Exception $e) {
            error_log("Log rotation error: " . $e->getMessage());
        }
    }
    
    /**
     * 古いログファイルの削除
     * 
     * @return void
     */
    private function cleanOldLogs() {
        try {
            $logDir = dirname($this->logFile);
            $files = glob($logDir . '/*.log.*');
            $cutoffTime = time() - (7 * 24 * 60 * 60); // 7日前
            
            foreach ($files as $file) {
                if (filemtime($file) < $cutoffTime) {
                    unlink($file);
                }
            }
            
        } catch (Exception $e) {
            error_log("Log cleanup error: " . $e->getMessage());
        }
    }
    
    /**
     * ログレベル名取得
     * 
     * @param int $level ログレベル
     * @return string ログレベル名
     */
    private function getLevelName($level) {
        switch ($level) {
            case self::DEBUG:
                return 'DEBUG';
            case self::INFO:
                return 'INFO';
            case self::WARNING:
                return 'WARNING';
            case self::ERROR:
                return 'ERROR';
            case self::CRITICAL:
                return 'CRITICAL';
            default:
                return 'UNKNOWN';
        }
    }
    
    /**
     * ログレベル設定
     * 
     * @param int $level ログレベル
     * @return void
     */
    public function setLogLevel($level) {
        $this->logLevel = $level;
    }
    
    /**
     * ログファイルパス取得
     * 
     * @return string ログファイルパス
     */
    public function getLogFile() {
        return $this->logFile;
    }
    
    /**
     * 最近のログエントリ取得
     * 
     * @param int $lines 取得行数
     * @return array ログエントリ配列
     */
    public function getRecentLogs($lines = 100) {
        try {
            if (!file_exists($this->logFile)) {
                return [];
            }
            
            $file = new SplFileObject($this->logFile);
            $file->seek(PHP_INT_MAX);
            $totalLines = $file->key() + 1;
            
            $startLine = max(0, $totalLines - $lines);
            $logs = [];
            
            $file->seek($startLine);
            while (!$file->eof()) {
                $line = trim($file->current());
                if (!empty($line)) {
                    $logs[] = $line;
                }
                $file->next();
            }
            
            return $logs;
            
        } catch (Exception $e) {
            error_log("Get recent logs error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ログ統計情報取得
     * 
     * @return array 統計情報
     */
    public function getLogStats() {
        try {
            if (!file_exists($this->logFile)) {
                return [
                    'file_size' => 0,
                    'total_lines' => 0,
                    'created_at' => null,
                    'modified_at' => null
                ];
            }
            
            $fileSize = filesize($this->logFile);
            $totalLines = count(file($this->logFile));
            $createdAt = date('Y-m-d H:i:s', filectime($this->logFile));
            $modifiedAt = date('Y-m-d H:i:s', filemtime($this->logFile));
            
            return [
                'file_size' => $fileSize,
                'file_size_formatted' => $this->formatBytes($fileSize),
                'total_lines' => $totalLines,
                'created_at' => $createdAt,
                'modified_at' => $modifiedAt
            ];
            
        } catch (Exception $e) {
            error_log("Get log stats error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * バイト数フォーマット
     * 
     * @param int $bytes バイト数
     * @return string フォーマット済み文字列
     */
    private function formatBytes($bytes) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $factor = floor((strlen($bytes) - 1) / 3);
        
        return sprintf("%.2f %s", $bytes / pow(1024, $factor), $units[$factor]);
    }
}
?>
