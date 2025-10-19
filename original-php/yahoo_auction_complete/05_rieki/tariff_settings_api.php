<?php
/**
 * Advanced Tariff Calculator 設定管理API - 完全修正版
 * 設定保存・読み込み・プリセット管理
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * リクエストデータを正しく取得する関数
 */
function getRequestData() {
    $inputData = [];
    
    // POST データを取得
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // JSON データを取得
        $rawInput = file_get_contents('php://input');
        if (!empty($rawInput)) {
            $jsonData = json_decode($rawInput, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($jsonData)) {
                $inputData = $jsonData;
            }
        }
        
        // form-data も考慮
        if (empty($inputData) && !empty($_POST)) {
            $inputData = $_POST;
        }
    }
    
    return $inputData;
}

/**
 * データベース接続
 */
function getDatabaseConnection() {
    try {
        $pdo = new PDO(
            "pgsql:host=localhost;dbname=nagano3_db", 
            "postgres", 
            "Kn240914",
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        throw new Exception('データベース接続失敗: ' . $e->getMessage());
    }
}

/**
 * 設定管理クラス
 */
class TariffSettingsManager {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * 設定読み込み
     */
    public function loadSettings($category = null, $userId = 'default') {
        try {
            $sql = "SELECT setting_key, setting_value, setting_type FROM advanced_tariff_settings 
                    WHERE user_id = ? AND is_active = TRUE";
            $params = [$userId];
            
            if ($category) {
                $sql .= " AND setting_category = ?";
                $params[] = $category;
            }
            
            $sql .= " ORDER BY setting_category, setting_key";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $settings = $stmt->fetchAll();
            
            error_log("[TariffSettings] 読み込み - Category: $category, Found: " . count($settings));
            
            $result = [];
            foreach ($settings as $setting) {
                $key = $setting['setting_key'];
                $value = $setting['setting_value'];
                
                // 型変換
                switch ($setting['setting_type']) {
                    case 'number':
                        $value = floatval($value);
                        break;
                    case 'boolean':
                        $value = ($value === 'true' || $value === '1');
                        break;
                    case 'json':
                        $value = json_decode($value, true);
                        break;
                }
                
                $result[$key] = $value;
            }
            
            return [
                'success' => true,
                'settings' => $result,
                'count' => count($result)
            ];
            
        } catch (Exception $e) {
            error_log("[TariffSettings] 読み込みエラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => '設定読み込みエラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 設定保存
     */
    public function saveSettings($category, $settings, $userId = 'default') {
        try {
            error_log("[TariffSettings] 🚀 保存開始 - Category: $category");
            error_log("[TariffSettings] 📝 保存データ: " . json_encode($settings));
            
            $this->pdo->beginTransaction();
            
            $savedCount = 0;
            foreach ($settings as $key => $value) {
                // 型判定
                $type = 'text';
                $originalValue = $value;
                
                if (is_numeric($value)) {
                    $type = 'number';
                    $value = (string)$value;
                } elseif (is_bool($value)) {
                    $type = 'boolean';
                    $value = $value ? 'true' : 'false';
                } elseif (is_array($value)) {
                    $type = 'json';
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE);
                }
                
                error_log("[TariffSettings] 💾 保存項目 - Key: $key, Value: $value, Type: $type, Original: $originalValue");
                
                $stmt = $this->pdo->prepare("
                    INSERT INTO advanced_tariff_settings 
                    (user_id, setting_category, setting_key, setting_value, setting_type, updated_at)
                    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, setting_category, setting_key)
                    DO UPDATE SET 
                        setting_value = EXCLUDED.setting_value,
                        setting_type = EXCLUDED.setting_type,
                        updated_at = CURRENT_TIMESTAMP
                ");
                
                $stmt->execute([$userId, $category, $key, $value, $type]);
                $savedCount++;
            }
            
            $this->pdo->commit();
            
            // 保存確認
            $verifyStmt = $this->pdo->prepare("
                SELECT setting_key, setting_value FROM advanced_tariff_settings 
                WHERE user_id = ? AND setting_category = ?
            ");
            $verifyStmt->execute([$userId, $category]);
            $savedData = $verifyStmt->fetchAll();
            
            error_log("[TariffSettings] ✅ 保存確認 - 保存数: $savedCount");
            error_log("[TariffSettings] 📊 保存後データ: " . json_encode($savedData));
            
            return [
                'success' => true,
                'message' => '設定保存完了',
                'saved_count' => $savedCount,
                'saved_data' => $savedData
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("[TariffSettings] ❌ 保存エラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => '設定保存エラー: ' . $e->getMessage()
            ];
        }
    }
}

/**
 * メイン処理
 */
try {
    // リクエストデータを取得
    $inputData = getRequestData();
    $action = $_GET['action'] ?? $inputData['action'] ?? 'load_settings';
    
    // 完全なリクエストログ
    error_log("[TariffAPI] 🚀 API呼び出し開始");
    error_log("[TariffAPI] 📍 HTTP Method: " . $_SERVER['REQUEST_METHOD']);
    error_log("[TariffAPI] 🎯 Action: $action");
    error_log("[TariffAPI] 📥 GET: " . json_encode($_GET));
    error_log("[TariffAPI] 📥 POST: " . json_encode($_POST));
    error_log("[TariffAPI] 📥 Input Data: " . json_encode($inputData));
    error_log("[TariffAPI] 📥 Raw Input: " . file_get_contents('php://input'));
    
    $pdo = getDatabaseConnection();
    $settingsManager = new TariffSettingsManager($pdo);
    
    switch ($action) {
        case 'load_settings':
            $category = $_GET['category'] ?? $inputData['category'] ?? null;
            error_log("[TariffAPI] 📖 設定読み込み処理 - Category: $category");
            $result = $settingsManager->loadSettings($category);
            break;
            
        case 'save_settings':
            $category = $inputData['category'] ?? 'general';
            $settings = $inputData['settings'] ?? [];
            
            error_log("[TariffAPI] 💾 設定保存処理開始");
            error_log("[TariffAPI] 📂 Category: $category");
            error_log("[TariffAPI] 📝 Settings: " . json_encode($settings));
            
            // 外注工賃費の特別確認
            if (isset($settings['outsource_fee'])) {
                error_log("[TariffAPI] 🎯 外注工賃費確認 - Value: {$settings['outsource_fee']}, Type: " . gettype($settings['outsource_fee']));
            } else {
                error_log("[TariffAPI] ❌ 外注工賃費がsettingsに含まれていません");
                error_log("[TariffAPI] 📋 利用可能なキー: " . implode(', ', array_keys($settings)));
            }
            
            if (empty($settings)) {
                throw new Exception('設定データが空です');
            }
            
            $result = $settingsManager->saveSettings($category, $settings);
            break;
            
        case 'health':
            $result = [
                'success' => true,
                'message' => 'Settings API稼働中',
                'version' => '1.1.0',
                'debug_info' => [
                    'http_method' => $_SERVER['REQUEST_METHOD'],
                    'has_input_data' => !empty($inputData),
                    'input_keys' => array_keys($inputData),
                    'get_params' => array_keys($_GET),
                    'post_params' => array_keys($_POST)
                ]
            ];
            break;
            
        default:
            throw new Exception('無効なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    error_log("[TariffAPI] ❌ システムエラー: " . $e->getMessage());
    $result = [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => [
            'action' => $action ?? 'unknown',
            'input_data' => $inputData ?? [],
            'error_line' => $e->getLine(),
            'error_file' => basename($e->getFile())
        ]
    ];
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>
