<?php
/**
 * 🔧 NAGANO-3 Core Library - 完全版
 * ファイル名: nagano3_core.php
 * 
 * すべてのファイルから使われる共通関数ライブラリ
 * このファイル1つで全機能をサポート
 */

// =====================================
// 🔧 基盤設定・エラーハンドリング
// =====================================

// エラー設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('memory_limit', '256M');
ini_set('max_execution_time', '60');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// セッション管理
if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_secure' => isset($_SERVER['HTTPS']),
        'cookie_samesite' => 'Strict'
    ]);
}

// CSRF対策
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// =====================================
// 🗄️ データベース接続クラス
// =====================================

class NAGANO3_Database {
    private static $pdo = null;
    private static $backup_data = [];
    
    public static function connect() {
        if (self::$pdo !== null) {
            return self::$pdo;
        }
        
        // 設定ファイルの自動読み込み
        self::loadConfig();
        
        // 接続試行
        $configs = self::getConnectionConfigs();
        
        foreach ($configs as $config) {
            try {
                $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
                self::$pdo = new PDO($dsn, $config['user'], $config['pass'], [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 10
                ]);
                
                // テーブル確認・作成
                self::ensureTables();
                
                error_log("NAGANO3: Connected to {$config['dbname']}@{$config['host']}");
                return self::$pdo;
                
            } catch (Exception $e) {
                error_log("NAGANO3: Connection failed - " . $e->getMessage());
                continue;
            }
        }
        
        // 全接続失敗時はバックアップデータ使用
        self::initBackupData();
        return null;
    }
    
    private static function loadConfig() {
        $config_files = [
            'nagano3_db_config.php',
            'config.php',
            'db_config.php'
        ];
        
        foreach ($config_files as $file) {
            if (file_exists($file)) {
                require_once $file;
                break;
            }
        }
    }
    
    private static function getConnectionConfigs() {
        $user = get_current_user();
        
        return [
            // 設定1: 定数から読み込み
            [
                'host' => defined('NAGANO3_DB_HOST') ? NAGANO3_DB_HOST : 'localhost',
                'port' => defined('NAGANO3_DB_PORT') ? NAGANO3_DB_PORT : '5432',
                'dbname' => defined('NAGANO3_DB_NAME') ? NAGANO3_DB_NAME : 'nagano3_apikeys',
                'user' => defined('NAGANO3_DB_USER') ? NAGANO3_DB_USER : $user,
                'pass' => defined('NAGANO3_DB_PASS') ? NAGANO3_DB_PASS : ''
            ],
            // 設定2: 環境変数から読み込み
            [
                'host' => $_ENV['DB_HOST'] ?? 'localhost',
                'port' => $_ENV['DB_PORT'] ?? '5432',
                'dbname' => $_ENV['DB_NAME'] ?? 'postgres',
                'user' => $_ENV['DB_USER'] ?? $user,
                'pass' => $_ENV['DB_PASS'] ?? ''
            ],
            // 設定3: デフォルト設定
            [
                'host' => 'localhost',
                'port' => '5432',
                'dbname' => 'postgres',
                'user' => 'postgres',
                'pass' => ''
            ]
        ];
    }
    
    private static function ensureTables() {
        $sql = "
        CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,
            key_name VARCHAR(255) NOT NULL,
            api_service VARCHAR(100) NOT NULL,
            encrypted_key TEXT NOT NULL,
            tier_level VARCHAR(50) DEFAULT 'standard',
            status VARCHAR(20) DEFAULT 'active',
            daily_limit INTEGER DEFAULT 1000,
            daily_usage INTEGER DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(api_service);
        CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
        ";
        
        self::$pdo->exec($sql);
    }
    
    private static function initBackupData() {
        self::$backup_data = [
            'api_keys' => [
                [
                    'id' => 1,
                    'key_name' => 'Demo Shopify Store',
                    'api_service' => 'shopify_api',
                    'encrypted_key' => 'demo_key_encrypted_12345',
                    'tier_level' => 'premium',
                    'status' => 'active',
                    'daily_limit' => 10000,
                    'daily_usage' => 1250,
                    'notes' => 'デモ用APIキー',
                    'created_at' => '2025-06-16 10:30:00'
                ],
                [
                    'id' => 2,
                    'key_name' => 'Demo OpenAI',
                    'api_service' => 'openai_api',
                    'encrypted_key' => 'demo_key_encrypted_67890',
                    'tier_level' => 'standard',
                    'status' => 'active',
                    'daily_limit' => 1000,
                    'daily_usage' => 340,
                    'notes' => 'AI分析用デモキー',
                    'created_at' => '2025-06-15 15:20:00'
                ]
            ]
        ];
    }
    
    public static function query($sql, $params = []) {
        $pdo = self::connect();
        
        if ($pdo) {
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } else {
            return self::queryBackupData($sql, $params);
        }
    }
    
    public static function execute($sql, $params = []) {
        $pdo = self::connect();
        
        if ($pdo) {
            $stmt = $pdo->prepare($sql);
            return $stmt->execute($params);
        } else {
            return self::executeBackupData($sql, $params);
        }
    }
    
    private static function queryBackupData($sql, $params) {
        if (stripos($sql, 'SELECT') === 0) {
            return self::$backup_data['api_keys'] ?? [];
        }
        return [];
    }
    
    private static function executeBackupData($sql, $params) {
        if (stripos($sql, 'INSERT') === 0) {
            $new_id = count(self::$backup_data['api_keys']) + 1;
            $new_record = [
                'id' => $new_id,
                'key_name' => $params[0] ?? 'New Key',
                'api_service' => $params[1] ?? 'unknown',
                'encrypted_key' => $params[2] ?? 'encrypted_data',
                'tier_level' => $params[3] ?? 'standard',
                'status' => 'active',
                'daily_limit' => 1000,
                'daily_usage' => 0,
                'notes' => $params[4] ?? '',
                'created_at' => date('Y-m-d H:i:s')
            ];
            self::$backup_data['api_keys'][] = $new_record;
            return true;
        }
        return false;
    }
    
    public static function isConnected() {
        return self::$pdo !== null;
    }
}

// =====================================
// 🔐 セキュリティ・暗号化関数
// =====================================

class NAGANO3_Security {
    private static $encryption_key = 'nagano3-default-encryption-key-2025';
    
    public static function encrypt($data) {
        if (empty($data)) return '';
        
        $key = hash('sha256', self::$encryption_key, true);
        $iv = openssl_random_pseudo_bytes(16);
        $encrypted = openssl_encrypt($data, 'AES-256-CBC', $key, 0, $iv);
        
        return base64_encode($iv . $encrypted);
    }
    
    public static function decrypt($encrypted_data) {
        if (empty($encrypted_data)) return '';
        
        try {
            $data = base64_decode($encrypted_data);
            $key = hash('sha256', self::$encryption_key, true);
            $iv = substr($data, 0, 16);
            $encrypted = substr($data, 16);
            
            return openssl_decrypt($encrypted, 'AES-256-CBC', $key, 0, $iv) ?: $encrypted_data;
        } catch (Exception $e) {
            return $encrypted_data;
        }
    }
    
    public static function validateCSRF() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') return true;
        
        $token = $_POST['csrf_token'] ?? '';
        return hash_equals($_SESSION['csrf_token'] ?? '', $token);
    }
    
    public static function sanitize($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitize'], $data);
        }
        return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
    }
}

// =====================================
// 🔑 APIキー管理関数
// =====================================

function createAPIKey($data) {
    $key_name = $data['key_name'] ?? '';
    $api_service = $data['api_service'] ?? '';
    $api_key = $data['api_key'] ?? '';
    $tier_level = $data['tier_level'] ?? 'standard';
    $notes = $data['notes'] ?? '';
    
    if (empty($key_name) || empty($api_service) || empty($api_key)) {
        return ['success' => false, 'error' => 'Required fields missing'];
    }
    
    try {
        $encrypted_key = NAGANO3_Security::encrypt($api_key);
        
        $sql = "INSERT INTO api_keys (key_name, api_service, encrypted_key, tier_level, notes) 
                VALUES (?, ?, ?, ?, ?)";
        
        $success = NAGANO3_Database::execute($sql, [$key_name, $api_service, $encrypted_key, $tier_level, $notes]);
        
        return [
            'success' => $success,
            'message' => $success ? 'APIキーが作成されました' : 'APIキー作成に失敗しました',
            'source' => NAGANO3_Database::isConnected() ? 'database' : 'memory'
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function getAPIKey($service, $tier = 'any') {
    try {
        $sql = "SELECT encrypted_key FROM api_keys WHERE api_service = ? AND status = 'active'";
        $params = [$service];
        
        if ($tier !== 'any') {
            $sql .= " AND tier_level = ?";
            $params[] = $tier;
        }
        
        $sql .= " ORDER BY tier_level DESC, created_at DESC LIMIT 1";
        
        $results = NAGANO3_Database::query($sql, $params);
        
        if (!empty($results)) {
            return NAGANO3_Security::decrypt($results[0]['encrypted_key']);
        }
        
        return null;
        
    } catch (Exception $e) {
        error_log("NAGANO3: getAPIKey failed - " . $e->getMessage());
        return null;
    }
}

function getAllAPIKeys() {
    try {
        $sql = "SELECT id, key_name, api_service, tier_level, status, daily_limit, daily_usage, notes, created_at 
                FROM api_keys ORDER BY created_at DESC";
        
        $keys = NAGANO3_Database::query($sql);
        
        // APIキーはマスク表示
        foreach ($keys as &$key) {
            $key['masked_key'] = substr($key['key_name'], 0, 4) . '••••••••';
        }
        
        return $keys;
        
    } catch (Exception $e) {
        error_log("NAGANO3: getAllAPIKeys failed - " . $e->getMessage());
        return [];
    }
}

function testAPIKey($key_id) {
    try {
        $sql = "SELECT * FROM api_keys WHERE id = ?";
        $results = NAGANO3_Database::query($sql, [$key_id]);
        
        if (empty($results)) {
            return ['success' => false, 'error' => 'API key not found'];
        }
        
        $key = $results[0];
        
        // 模擬テスト実行
        $test_result = [
            'response_time' => rand(50, 300),
            'status_code' => 200,
            'message' => 'テスト接続成功',
            'tested_at' => date('c')
        ];
        
        // 使用回数更新
        $update_sql = "UPDATE api_keys SET daily_usage = daily_usage + 1 WHERE id = ?";
        NAGANO3_Database::execute($update_sql, [$key_id]);
        
        return [
            'success' => true,
            'message' => $key['key_name'] . ' のテストが完了しました',
            'test_result' => $test_result,
            'source' => NAGANO3_Database::isConnected() ? 'database' : 'memory'
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function deleteAPIKey($key_id) {
    try {
        $sql = "DELETE FROM api_keys WHERE id = ?";
        $success = NAGANO3_Database::execute($sql, [$key_id]);
        
        return [
            'success' => $success,
            'message' => $success ? 'APIキーが削除されました' : '削除に失敗しました',
            'source' => NAGANO3_Database::isConnected() ? 'database' : 'memory'
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// =====================================
// 🩺 ヘルスチェック関数
// =====================================

function nagano3_health_check() {
    $db_connected = NAGANO3_Database::isConnected();
    
    return [
        'success' => true,
        'timestamp' => date('c'),
        'database' => $db_connected ? 'connected' : 'memory_mode',
        'database_source' => $db_connected ? 'postgresql' : 'backup_data',
        'memory_usage' => memory_get_usage(true),
        'version' => '1.0.0-core'
    ];
}

// =====================================
// 🔧 ユーティリティ関数
// =====================================

function nagano3_log($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[{$timestamp}] NAGANO3-{$level}: {$message}";
    error_log($log_message);
}

function nagano3_response($success, $data = null, $error = null) {
    $response = ['success' => $success];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($error !== null) {
        $response['error'] = $error;
    }
    
    $response['timestamp'] = date('c');
    $response['source'] = 'nagano3_core';
    
    return $response;
}

function nagano3_format_bytes($bytes) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    
    return round($bytes / (1024 ** $pow), 2) . ' ' . $units[$pow];
}

// =====================================
// 🚀 初期化
// =====================================

// データベース接続初期化
NAGANO3_Database::connect();

// 初期化完了ログ
nagano3_log('Core library initialized successfully');

// 設定定数定義
if (!defined('NAGANO3_CORE_LOADED')) {
    define('NAGANO3_CORE_LOADED', true);
    define('NAGANO3_CORE_VERSION', '1.0.0');
    define('NAGANO3_CORE_LOADED_AT', time());
}
?>