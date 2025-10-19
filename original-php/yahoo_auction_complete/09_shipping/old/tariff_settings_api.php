<?php
/**
 * Advanced Tariff Calculator 設定管理API
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
            $this->pdo->beginTransaction();
            
            foreach ($settings as $key => $value) {
                // 型判定
                $type = 'text';
                if (is_numeric($value)) {
                    $type = 'number';
                } elseif (is_bool($value)) {
                    $type = 'boolean';
                    $value = $value ? 'true' : 'false';
                } elseif (is_array($value)) {
                    $type = 'json';
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE);
                }
                
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
            }
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => '設定保存完了',
                'saved_count' => count($settings)
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return [
                'success' => false,
                'error' => '設定保存エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * プリセット一覧取得
     */
    public function getPresets($userId = 'default') {
        try {
            $stmt = $this->pdo->prepare("
                SELECT setting_key, setting_value, description 
                FROM advanced_tariff_settings 
                WHERE user_id = ? AND setting_category = 'presets' AND is_active = TRUE
                ORDER BY setting_key
            ");
            $stmt->execute([$userId]);
            $presets = $stmt->fetchAll();
            
            $result = [];
            foreach ($presets as $preset) {
                $result[$preset['setting_key']] = [
                    'data' => json_decode($preset['setting_value'], true),
                    'description' => $preset['description']
                ];
            }
            
            return [
                'success' => true,
                'presets' => $result
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'プリセット取得エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * プリセット保存
     */
    public function savePreset($name, $data, $description = '', $userId = 'default') {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO advanced_tariff_settings 
                (user_id, setting_category, setting_key, setting_value, setting_type, description, updated_at)
                VALUES (?, 'presets', ?, ?, 'json', ?, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, setting_category, setting_key)
                DO UPDATE SET 
                    setting_value = EXCLUDED.setting_value,
                    description = EXCLUDED.description,
                    updated_at = CURRENT_TIMESTAMP
            ");
            
            $stmt->execute([$userId, $name, json_encode($data, JSON_UNESCAPED_UNICODE), $description]);
            
            return [
                'success' => true,
                'message' => 'プリセット保存完了'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'プリセット保存エラー: ' . $e->getMessage()
            ];
        }
    }
}

/**
 * メイン処理
 */
try {
    $action = $_GET['action'] ?? $_POST['action'] ?? 'load_settings';
    $pdo = getDatabaseConnection();
    $settingsManager = new TariffSettingsManager($pdo);
    
    $inputData = json_decode(file_get_contents('php://input'), true) ?: [];
    
    switch ($action) {
        case 'load_settings':
            $category = $_GET['category'] ?? $inputData['category'] ?? null;
            $result = $settingsManager->loadSettings($category);
            break;
            
        case 'save_settings':
            $category = $inputData['category'] ?? 'general';
            $settings = $inputData['settings'] ?? [];
            $result = $settingsManager->saveSettings($category, $settings);
            break;
            
        case 'load_presets':
            $result = $settingsManager->getPresets();
            break;
            
        case 'save_preset':
            $name = $inputData['name'] ?? '';
            $data = $inputData['data'] ?? [];
            $description = $inputData['description'] ?? '';
            $result = $settingsManager->savePreset($name, $data, $description);
            break;
            
        case 'load_ebay_defaults':
            $result = $settingsManager->loadSettings('ebay_usa');
            break;
            
        case 'load_shopee_defaults':
            $result = $settingsManager->loadSettings('shopee');
            break;
            
        case 'health':
            $result = [
                'success' => true,
                'message' => 'Settings API稼働中',
                'version' => '1.0.0',
                'endpoints' => [
                    'load_settings' => '?action=load_settings&category=ebay_usa',
                    'save_settings' => 'POST with {category, settings}',
                    'load_presets' => '?action=load_presets',
                    'save_preset' => 'POST with {name, data, description}'
                ]
            ];
            break;
            
        default:
            $result = [
                'success' => false,
                'error' => '無効なアクション: ' . $action
            ];
    }
    
} catch (Exception $e) {
    $result = [
        'success' => false,
        'error' => 'システムエラー: ' . $e->getMessage()
    ];
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>