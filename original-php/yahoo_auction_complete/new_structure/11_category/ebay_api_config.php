<?php
/**
 * eBay API設定管理システム
 * ファイル: ebay_api_config.php
 */

class EbayApiConfig {
    private $config = [];
    
    public function __construct() {
        $this->loadConfig();
    }
    
    /**
     * 設定ファイル読み込み（複数パスを試行）
     */
    private function loadConfig() {
        $possiblePaths = [
            // 環境変数から
            $_ENV,
            
            // 設定ファイルから
            __DIR__ . '/.env',
            __DIR__ . '/../../.env',
            __DIR__ . '/../../../.env',
            
            // common_envフォルダから
            __DIR__ . '/../../common_env/.env',
            __DIR__ . '/../../../common_env/.env',
            
            // 設定ファイル
            __DIR__ . '/config/ebay_api.php',
        ];
        
        // 環境変数チェック
        if (!empty($_ENV['EBAY_APP_ID'])) {
            $this->config = [
                'app_id' => $_ENV['EBAY_APP_ID'],
                'dev_id' => $_ENV['EBAY_DEV_ID'] ?? '',
                'cert_id' => $_ENV['EBAY_CERT_ID'] ?? '',
                'auth_token' => $_ENV['EBAY_AUTH_TOKEN'] ?? '',
                'site_id' => $_ENV['EBAY_SITE_ID'] ?? '0'
            ];
            return;
        }
        
        // .envファイルチェック
        foreach ($possiblePaths as $path) {
            if (is_string($path) && file_exists($path)) {
                $this->loadEnvFile($path);
                if (!empty($this->config['app_id'])) {
                    return;
                }
            }
        }
        
        // デフォルト設定（サンドボックス）
        $this->config = [
            'app_id' => 'YourAppId-5e5b-4b1c-9b8b-f1b2a3c4d5e6',
            'dev_id' => 'YourDevId-5e5b-4b1c-9b8b-f1b2a3c4d5e6',
            'cert_id' => 'YourCertId-5e5b-4b1c-9b8b-f1b2a3c4d5e6',
            'auth_token' => 'YourAuthToken',
            'site_id' => '0',
            'sandbox' => true
        ];
    }
    
    /**
     * .envファイル読み込み
     */
    private function loadEnvFile($filePath) {
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            
            switch ($key) {
                case 'EBAY_APP_ID':
                    $this->config['app_id'] = $value;
                    break;
                case 'EBAY_DEV_ID':
                    $this->config['dev_id'] = $value;
                    break;
                case 'EBAY_CERT_ID':
                    $this->config['cert_id'] = $value;
                    break;
                case 'EBAY_AUTH_TOKEN':
                    $this->config['auth_token'] = $value;
                    break;
                case 'EBAY_SITE_ID':
                    $this->config['site_id'] = $value;
                    break;
            }
        }
    }
    
    /**
     * 設定取得
     */
    public function getConfig() {
        return $this->config;
    }
    
    /**
     * API設定の有効性チェック
     */
    public function isValid() {
        return !empty($this->config['app_id']) && 
               !empty($this->config['dev_id']) && 
               !empty($this->config['cert_id']);
    }
    
    /**
     * エンドポイントURL取得
     */
    public function getEndpoint() {
        $isSandbox = $this->config['sandbox'] ?? true;
        
        return $isSandbox 
            ? 'https://api.sandbox.ebay.com/ws/api/'
            : 'https://api.ebay.com/ws/api/';
    }
}

// テスト実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    echo "🔧 eBay API設定確認\n";
    echo "==================\n";
    
    $apiConfig = new EbayApiConfig();
    $config = $apiConfig->getConfig();
    
    echo "設定状況:\n";
    echo "  App ID: " . substr($config['app_id'], 0, 10) . "...\n";
    echo "  Dev ID: " . substr($config['dev_id'], 0, 10) . "...\n";
    echo "  Cert ID: " . substr($config['cert_id'], 0, 10) . "...\n";
    echo "  Site ID: " . $config['site_id'] . "\n";
    echo "  Endpoint: " . $apiConfig->getEndpoint() . "\n";
    echo "  有効: " . ($apiConfig->isValid() ? "✅ YES" : "❌ NO") . "\n";
    
    if (!$apiConfig->isValid()) {
        echo "\n📝 設定方法:\n";
        echo "1. .envファイル作成:\n";
        echo "   EBAY_APP_ID=your_app_id\n";
        echo "   EBAY_DEV_ID=your_dev_id\n";
        echo "   EBAY_CERT_ID=your_cert_id\n";
        echo "   EBAY_AUTH_TOKEN=your_auth_token\n";
        echo "\n2. または環境変数設定\n";
    }
}
?>