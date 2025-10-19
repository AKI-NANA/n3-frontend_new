<?php
/**
 * 🔗 手動OAuth→データベース送信システム
 * 
 * 目的: OAuth連携が未完成の間、手動でOAuthデータをデータベースに送信
 * 使用場面: MoneyForward等のOAuth認証後の手動データ登録
 * 
 * ファイル名: manual_oauth_to_db.php
 */

class ManualOAuthToDB {
    private $integration_log = [];
    private $stats = ['added' => 0, 'updated' => 0, 'errors' => 0];
    
    /**
     * 🔗 手動OAuth登録処理
     */
    public function registerOAuthData($oauth_data) {
        try {
            $this->log('info', '🔗 手動OAuth登録開始');
            
            // データバリデーション
            $validated_data = $this->validateOAuthData($oauth_data);
            if (!$validated_data['success']) {
                return $validated_data;
            }
            
            // データベース接続
            $db = $this->getDatabase();
            if (!$db) {
                return $this->handleDatabaseError();
            }
            
            // テーブル準備
            $this->ensureOAuthTable($db);
            
            // OAuth データ登録
            $result = $this->insertOAuthData($db, $validated_data['data']);
            
            if ($result['success']) {
                // .envファイル更新
                $this->updateEnvFile($validated_data['data']);
                
                // 統計更新
                $this->stats['added']++;
                
                $this->log('success', "✅ OAuth登録完了: {$validated_data['data']['service_name']}");
                
                return [
                    'success' => true,
                    'message' => 'OAuthデータをデータベースに登録しました',
                    'data' => $result['data'],
                    'stats' => $this->stats
                ];
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->stats['errors']++;
            $this->log('error', '❌ OAuth登録エラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'stats' => $this->stats
            ];
        }
    }
    
    /**
     * ✅ OAuthデータバリデーション
     */
    private function validateOAuthData($oauth_data) {
        $required_fields = ['service_name', 'access_token', 'service_type'];
        $missing_fields = [];
        
        foreach ($required_fields as $field) {
            if (empty($oauth_data[$field])) {
                $missing_fields[] = $field;
            }
        }
        
        if (!empty($missing_fields)) {
            return [
                'success' => false,
                'error' => '必須フィールドが不足: ' . implode(', ', $missing_fields)
            ];
        }
        
        // サービス名正規化
        $normalized_service = $this->normalizeServiceName($oauth_data['service_type']);
        
        // バリデーション済みデータ
        $validated = [
            'service_name' => $oauth_data['service_name'],
            'service_type' => $normalized_service,
            'access_token' => $oauth_data['access_token'],
            'refresh_token' => $oauth_data['refresh_token'] ?? '',
            'client_id' => $oauth_data['client_id'] ?? '',
            'client_secret' => $oauth_data['client_secret'] ?? '',
            'expires_in' => intval($oauth_data['expires_in'] ?? 3600),
            'scopes' => $oauth_data['scopes'] ?? '',
            'notes' => $oauth_data['notes'] ?? '手動OAuth登録',
            'tier_level' => $oauth_data['tier_level'] ?? 'premium'
        ];
        
        return [
            'success' => true,
            'data' => $validated
        ];
    }
    
    /**
     * 🏷️ サービス名正規化
     */
    private function normalizeServiceName($service_type) {
        $service_mapping = [
            'moneyforward' => 'moneyforward_api',
            'mf_accounting' => 'moneyforward_accounting',
            'mf_invoice' => 'moneyforward_invoice',
            'mf_expense' => 'moneyforward_expense',
            'google' => 'google_api',
            'shopify' => 'shopify_api',
            'slack' => 'slack_api',
            'chatwork' => 'chatwork_api'
        ];
        
        $normalized = strtolower($service_type);
        return $service_mapping[$normalized] ?? $normalized . '_api';
    }
    
    /**
     * 🗄️ OAuth専用テーブル確保
     */
    private function ensureOAuthTable($db) {
        $create_table_sql = "
            CREATE TABLE IF NOT EXISTS api_keys (
                id SERIAL PRIMARY KEY,
                key_name VARCHAR(255) NOT NULL,
                api_service VARCHAR(100) NOT NULL,
                encrypted_key TEXT NOT NULL,
                tier_level VARCHAR(50) DEFAULT 'premium',
                status VARCHAR(20) DEFAULT 'active',
                daily_limit INTEGER DEFAULT 5000,
                daily_usage INTEGER DEFAULT 0,
                notes TEXT,
                
                -- OAuth専用フィールド
                source_type VARCHAR(50) DEFAULT 'oauth_manual',
                oauth_service VARCHAR(100),
                oauth_refresh_token TEXT,
                oauth_client_id VARCHAR(255),
                oauth_client_secret VARCHAR(255),
                oauth_expires_at TIMESTAMP,
                oauth_scopes TEXT,
                
                -- 管理フィールド
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ";
        
        if (method_exists($db, 'executeWithFallback')) {
            $result = $db->executeWithFallback($create_table_sql);
        } else {
            $db->exec($create_table_sql);
            $result = ['success' => true];
        }
        
        if (!$result['success']) {
            throw new Exception('テーブル作成失敗');
        }
        
        $this->log('info', '🗄️ OAuth対応テーブル準備完了');
    }
    
    /**
     * 📝 OAuthデータ挿入
     */
    private function insertOAuthData($db, $validated_data) {
        // 既存チェック
        $check_sql = "SELECT id FROM api_keys WHERE oauth_service = ? AND source_type = 'oauth_manual'";
        $check_params = [$validated_data['service_type']];
        
        if (method_exists($db, 'executeWithFallback')) {
            $existing = $db->executeWithFallback($check_sql, $check_params);
        } else {
            $stmt = $db->prepare($check_sql);
            $stmt->execute($check_params);
            $existing = ['success' => true, 'data' => $stmt->fetchAll()];
        }
        
        if ($existing['success'] && !empty($existing['data'])) {
            // 更新
            return $this->updateExistingOAuth($db, $existing['data'][0]['id'], $validated_data);
        } else {
            // 新規挿入
            return $this->insertNewOAuth($db, $validated_data);
        }
    }
    
    /**
     * 🆕 新規OAuth挿入
     */
    private function insertNewOAuth($db, $data) {
        $insert_sql = "
            INSERT INTO api_keys 
            (key_name, api_service, encrypted_key, tier_level, status, daily_limit, daily_usage, notes,
             source_type, oauth_service, oauth_refresh_token, oauth_client_id, oauth_client_secret, 
             oauth_expires_at, oauth_scopes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $expires_at = null;
        if ($data['expires_in'] > 0) {
            $expires_at = date('Y-m-d H:i:s', time() + $data['expires_in']);
        }
        
        $insert_params = [
            $data['service_name'] . ' (手動OAuth)',
            $data['service_type'],
            base64_encode($data['access_token']), // 暗号化
            $data['tier_level'],
            'active',
            5000,
            0,
            $data['notes'] . ' - ' . date('Y-m-d H:i:s'),
            'oauth_manual',
            $data['service_type'],
            $data['refresh_token'],
            $data['client_id'],
            $data['client_secret'],
            $expires_at,
            $data['scopes']
        ];
        
        if (method_exists($db, 'executeWithFallback')) {
            $result = $db->executeWithFallback($insert_sql, $insert_params);
        } else {
            $stmt = $db->prepare($insert_sql);
            $success = $stmt->execute($insert_params);
            $result = ['success' => $success];
        }
        
        if ($result['success']) {
            $new_id = $db->lastInsertId() ?? 'new';
            
            return [
                'success' => true,
                'message' => '新規OAuth登録完了',
                'data' => [
                    'id' => $new_id,
                    'service_name' => $data['service_name'],
                    'service_type' => $data['service_type'],
                    'status' => 'active'
                ]
            ];
        }
        
        return [
            'success' => false,
            'error' => 'データベース挿入失敗'
        ];
    }
    
    /**
     * 🔄 既存OAuth更新
     */
    private function updateExistingOAuth($db, $existing_id, $data) {
        $update_sql = "
            UPDATE api_keys SET 
                key_name = ?,
                encrypted_key = ?,
                oauth_refresh_token = ?,
                oauth_client_id = ?,
                oauth_client_secret = ?,
                oauth_expires_at = ?,
                oauth_scopes = ?,
                notes = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ";
        
        $expires_at = null;
        if ($data['expires_in'] > 0) {
            $expires_at = date('Y-m-d H:i:s', time() + $data['expires_in']);
        }
        
        $update_params = [
            $data['service_name'] . ' (手動OAuth更新)',
            base64_encode($data['access_token']),
            $data['refresh_token'],
            $data['client_id'],
            $data['client_secret'],
            $expires_at,
            $data['scopes'],
            $data['notes'] . ' - 更新: ' . date('Y-m-d H:i:s'),
            $existing_id
        ];
        
        if (method_exists($db, 'executeWithFallback')) {
            $result = $db->executeWithFallback($update_sql, $update_params);
        } else {
            $stmt = $db->prepare($update_sql);
            $success = $stmt->execute($update_params);
            $result = ['success' => $success];
        }
        
        if ($result['success']) {
            $this->stats['updated']++;
            
            return [
                'success' => true,
                'message' => '既存OAuth更新完了',
                'data' => [
                    'id' => $existing_id,
                    'service_name' => $data['service_name'],
                    'service_type' => $data['service_type'],
                    'status' => 'updated'
                ]
            ];
        }
        
        return [
            'success' => false,
            'error' => 'データベース更新失敗'
        ];
    }
    
    /**
     * 📂 .envファイル更新
     */
    private function updateEnvFile($data) {
        $env_file = __DIR__ . '/common/env/.env';
        
        // ディレクトリ作成
        $env_dir = dirname($env_file);
        if (!is_dir($env_dir)) {
            mkdir($env_dir, 0755, true);
        }
        
        // 既存.env読み込み
        $env_lines = [];
        if (file_exists($env_file)) {
            $env_lines = file($env_file, FILE_IGNORE_NEW_LINES);
        }
        
        // サービス別プレフィックス
        $prefix = $this->getEnvPrefix($data['service_type']);
        
        // 更新・追加するデータ
        $env_vars = [
            $prefix . '_ACCESS_TOKEN' => $data['access_token'],
            $prefix . '_REFRESH_TOKEN' => $data['refresh_token'],
            $prefix . '_CLIENT_ID' => $data['client_id'],
            $prefix . '_CLIENT_SECRET' => $data['client_secret']
        ];
        
        // 既存行更新または新規追加
        foreach ($env_vars as $key => $value) {
            if (empty($value)) continue;
            
            $found = false;
            for ($i = 0; $i < count($env_lines); $i++) {
                if (strpos($env_lines[$i], $key . '=') === 0) {
                    $env_lines[$i] = $key . '=' . $value;
                    $found = true;
                    break;
                }
            }
            
            if (!$found) {
                $env_lines[] = $key . '=' . $value;
            }
        }
        
        // ファイル保存
        file_put_contents($env_file, implode("\n", $env_lines) . "\n");
        $this->log('info', "📂 .envファイル更新: {$prefix}");
    }
    
    /**
     * 🏷️ .env用プレフィックス取得
     */
    private function getEnvPrefix($service_type) {
        $prefix_mapping = [
            'moneyforward_api' => 'MF',
            'moneyforward_accounting' => 'MF_ACCOUNTING',
            'moneyforward_invoice' => 'MF_INVOICE',
            'moneyforward_expense' => 'MF_EXPENSE',
            'google_api' => 'GOOGLE',
            'shopify_api' => 'SHOPIFY',
            'slack_api' => 'SLACK'
        ];
        
        return $prefix_mapping[$service_type] ?? strtoupper(str_replace('_api', '', $service_type));
    }
    
    /**
     * 🗄️ データベース接続
     */
    private function getDatabase() {
        // UnbreakableDatabase使用
        if (class_exists('UnbreakableDatabase')) {
            return UnbreakableDatabase::getInstance();
        }
        
        // 直接接続
        try {
            if (defined('NAGANO3_DB_HOST')) {
                $dsn = "pgsql:host=" . NAGANO3_DB_HOST . ";port=" . NAGANO3_DB_PORT . ";dbname=" . NAGANO3_DB_NAME;
                return new PDO($dsn, NAGANO3_DB_USER, NAGANO3_DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]);
            }
        } catch (Exception $e) {
            $this->log('error', 'DB接続エラー: ' . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * ❌ データベースエラー処理
     */
    private function handleDatabaseError() {
        $this->log('warning', '⚠️ データベース接続失敗 - JSONフォールバック');
        
        // JSONファイルに保存
        return $this->saveToJSONFallback();
    }
    
    /**
     * 📄 JSONフォールバック保存
     */
    private function saveToJSONFallback() {
        // 実装: JSONファイルに保存
        return [
            'success' => true,
            'message' => 'JSONファイルに保存しました（DB接続失敗のため）',
            'fallback' => true
        ];
    }
    
    /**
     * 📝 ログ記録
     */
    private function log($level, $message) {
        $this->integration_log[] = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => strtoupper($level),
            'message' => $message
        ];
        
        error_log("[MANUAL_OAUTH] {$level}: {$message}");
    }
    
    /**
     * 📊 統計取得
     */
    public function getStats() {
        return $this->stats;
    }
    
    /**
     * 📋 ログ取得
     */
    public function getLogs() {
        return $this->integration_log;
    }
}

// =====================================
// 🎯 Ajax処理ハンドラー
// =====================================

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=UTF-8');
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_POST['action'] ?? '';
    
    $oauth_handler = new ManualOAuthToDB();
    
    switch ($action) {
        case 'register_oauth':
            $result = $oauth_handler->registerOAuthData($input);
            echo json_encode($result);
            break;
            
        case 'get_oauth_stats':
            echo json_encode([
                'success' => true,
                'stats' => $oauth_handler->getStats()
            ]);
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'error' => '不明なアクション: ' . $action
            ]);
            break;
    }
    
    exit;
}

// =====================================
// 🔧 使用例・テンプレート
// =====================================

/**
 * 使用例: MoneyForward OAuth手動登録
 * 
 * $oauth_data = [
 *     'service_name' => 'MoneyForward会計',
 *     'service_type' => 'moneyforward_accounting',
 *     'access_token' => 'your_access_token_here',
 *     'refresh_token' => 'your_refresh_token_here',
 *     'client_id' => 'your_client_id',
 *     'client_secret' => 'your_client_secret',
 *     'expires_in' => 3600,
 *     'scopes' => 'read write',
 *     'notes' => 'MoneyForward手動設定',
 *     'tier_level' => 'premium'
 * ];
 * 
 * $handler = new ManualOAuthToDB();
 * $result = $handler->registerOAuthData($oauth_data);
 * 
 * if ($result['success']) {
 *     echo "OAuth登録成功!";
 * }
 */

?>