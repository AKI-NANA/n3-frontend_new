<?php
/**
 * 在庫管理システム ロガー
 */

class InventoryLogger {
    private $logDir;
    
    public function __construct() {
        $this->logDir = __DIR__ . '/../logs/';
        if (!is_dir($this->logDir)) {
            mkdir($this->logDir, 0755, true);
        }
    }
    
    public function info($message, $context = []) {
        $this->log('INFO', $message, $context);
    }
    
    public function error($message, $context = []) {
        $this->log('ERROR', $message, $context);
    }
    
    public function warning($message, $context = []) {
        $this->log('WARNING', $message, $context);
    }
    
    private function log($level, $message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = empty($context) ? '' : ' ' . json_encode($context, JSON_UNESCAPED_UNICODE);
        $logMessage = "[{$timestamp}] [{$level}] {$message}{$contextStr}\n";
        
        $logFile = $this->logDir . 'inventory_' . date('Y-m-d') . '.log';
        file_put_contents($logFile, $logMessage, FILE_APPEND);
    }
}
?>
