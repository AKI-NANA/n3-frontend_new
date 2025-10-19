<?php
/**
 * CSV送料データ処理API
 * Eloji送料データのアップロード・処理・検証
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'ShippingCalculator.php';

// データベース接続
try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=nagano3_db;charset=utf8mb4",
        "your_username",
        "your_password",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'データベース接続エラー: ' . $e->getMessage()]);
    exit;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'upload_csv':
        handleCSVUpload($pdo);
        break;
        
    case 'validate_csv':
        handleCSVValidation();
        break;
        
    case 'get_upload_status':
        handleGetUploadStatus($pdo);
        break;
        
    case 'download_template':
        handleDownloadTemplate();
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => '無効なアクション']);
        break;
}

/**
 * CSVファイルアップロード処理
 */
function handleCSVUpload($pdo) {
    if (!isset($_FILES['csv_file'])) {
        echo json_encode(['success' => false, 'error' => 'CSVファイルが選択されていません']);
        return;
    }
    
    $file = $_FILES['csv_file'];
    
    // ファイル検証
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'error' => 'ファイルアップロードエラー']);
        return;
    }
    
    if ($file['size'] > 5 * 1024 * 1024) { // 5MB制限
        echo json_encode(['success' => false, 'error' => 'ファイルサイズが大きすぎます (最大5MB)']);
        return;
    }
    
    // CSV処理実行
    try {
        $processor = new CSVShippingProcessor($pdo);
        $result = $processor->processCSVFile($file['tmp_name']);
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * CSV検証のみ実行
 */
function handleCSVValidation() {
    if (!isset($_FILES['csv_file'])) {
        echo json_encode(['success' => false, 'error' => 'CSVファイルが選択されていません']);
        return;
    }
    
    try {
        $processor = new CSVShippingProcessor(null);
        $result = $processor->validateCSVFile($_FILES['csv_file']['tmp_name']);
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * CSVテンプレートダウンロード
 */
function handleDownloadTemplate() {
    $template = [
        ['zone_name', 'country_codes', 'service_type', 'weight_min_kg', 'weight_max_kg', 'length_max_cm', 'cost_usd', 'delivery_days_min', 'delivery_days_max', 'fuel_surcharge_percent', 'notes'],
        ['North America', 'US,CA,MX', 'economy', '0.000', '0.500', '30', '15.50', '7', '14', '5.0', 'Small packet'],
        ['North America', 'US,CA,MX', 'standard', '0.000', '0.500', '30', '22.00', '5', '10', '5.0', 'Standard delivery'],
        ['North America', 'US,CA,MX', 'express', '0.000', '0.500', '30', '35.00', '2', '5', '5.0', 'Express delivery'],
        ['Europe', 'GB,DE,FR,IT,ES', 'economy', '0.000', '0.500', '30', '18.50', '10', '21', '5.0', 'Small packet Europe'],
        ['USA Domestic Zone 1-3', 'US', 'economy', '0.000', '0.500', '30', '8.50', '3', '7', '3.0', 'Local zones']
    ];
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="eloji_shipping_template.csv"');
    
    $output = fopen('php://output', 'w');
    
    // BOM追加（Excel対応）
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    foreach ($template as $row) {
        fputcsv($output, $row);
    }
    
    fclose($output);
    exit;
}

/**
 * CSV送料データ処理クラス
 */
class CSVShippingProcessor {
    private $pdo;
    private $requiredFields = [
        'zone_name', 'country_codes', 'service_type', 
        'weight_min_kg', 'weight_max_kg', 'cost_usd'
    ];
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * CSVファイル処理メイン
     */
    public function processCSVFile($filePath) {
        // 1. 検証
        $validation = $this->validateCSVFile($filePath);
        if (!$validation['success']) {
            return $validation;
        }
        
        // 2. データ解析
        $data = $this->parseCSVFile($filePath);
        
        // 3. データベース更新
        $updateResult = $this->updateDatabase($data);
        
        return [
            'success' => true,
            'message' => 'CSV処理が完了しました',
            'validation' => $validation,
            'processed_records' => count($data),
            'database_update' => $updateResult
        ];
    }
    
    /**
     * CSV検証
     */
    public function validateCSVFile($filePath) {
        $errors = [];
        $warnings = [];
        
        // ファイル存在確認
        if (!file_exists($filePath)) {
            return ['success' => false, 'error' => 'ファイルが見つかりません'];
        }
        
        // CSV読み込み
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return ['success' => false, 'error' => 'ファイルの読み込みに失敗しました'];
        }
        
        // ヘッダー行チェック
        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return ['success' => false, 'error' => 'ヘッダー行が読み込めません'];
        }
        
        // 必須フィールドチェック
        foreach ($this->requiredFields as $field) {
            if (!in_array($field, $header)) {
                $errors[] = "必須フィールドが不足: {$field}";
            }
        }
        
        // データ行検証
        $rowNum = 2; // ヘッダーの次から
        $totalRows = 0;
        
        while (($row = fgetcsv($handle)) !== FALSE) {
            $totalRows++;
            
            if (count($row) !== count($header)) {
                $errors[] = "行{$rowNum}: カラム数が一致しません";
                $rowNum++;
                continue;
            }
            
            $rowData = array_combine($header, $row);
            
            // 必須フィールド検証
            foreach ($this->requiredFields as $field) {
                if (empty($rowData[$field])) {
                    $errors[] = "行{$rowNum}: {$field} が空です";
                }
            }
            
            // データ型検証
            if (!empty($rowData['weight_min_kg']) && !is_numeric($rowData['weight_min_kg'])) {
                $errors[] = "行{$rowNum}: weight_min_kg が数値ではありません";
            }
            
            if (!empty($rowData['weight_max_kg']) && !is_numeric($rowData['weight_max_kg'])) {
                $errors[] = "行{$rowNum}: weight_max_kg が数値ではありません";
            }
            
            if (!empty($rowData['cost_usd']) && !is_numeric($rowData['cost_usd'])) {
                $errors[] = "行{$rowNum}: cost_usd が数値ではありません";
            }
            
            // サービスタイプ検証
            if (!empty($rowData['service_type']) && 
                !in_array($rowData['service_type'], ['economy', 'standard', 'express'])) {
                $errors[] = "行{$rowNum}: service_type が無効です (economy/standard/express)";
            }
            
            // 重量範囲検証
            if (!empty($rowData['weight_min_kg']) && !empty($rowData['weight_max_kg'])) {
                if (floatval($rowData['weight_min_kg']) > floatval($rowData['weight_max_kg'])) {
                    $errors[] = "行{$rowNum}: weight_min_kg > weight_max_kg";
                }
            }
            
            $rowNum++;
        }
        
        fclose($handle);
        
        return [
            'success' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'total_rows' => $totalRows,
            'header_fields' => $header
        ];
    }
    
    /**
     * CSVデータ解析
     */
    private function parseCSVFile($filePath) {
        $data = [];
        $handle = fopen($filePath, 'r');
        
        $header = fgetcsv($handle);
        
        while (($row = fgetcsv($handle)) !== FALSE) {
            if (count($row) === count($header)) {
                $rowData = array_combine($header, $row);
                
                // 国コード配列に変換
                $rowData['countries'] = array_map('trim', explode(',', $rowData['country_codes']));
                
                $data[] = $rowData;
            }
        }
        
        fclose($handle);
        return $data;
    }
    
    /**
     * データベース更新
     */
    private function updateDatabase($data) {
        if (!$this->pdo) {
            throw new Exception('データベース接続が必要です');
        }
        
        $this->pdo->beginTransaction();
        
        try {
            $insertedZones = [];
            $insertedRates = 0;
            
            foreach ($data as $row) {
                // 1. ゾーン作成・取得
                $zoneId = $this->createOrGetZone($row);
                if (!in_array($zoneId, $insertedZones)) {
                    $insertedZones[] = $zoneId;
                }
                
                // 2. 各ポリシーに対して料金設定
                $policyIds = $this->getPolicyIds();
                
                foreach ($policyIds as $policyType => $policyId) {
                    if ($row['service_type'] === $policyType) {
                        $this->insertShippingRate($policyId, $zoneId, $row);
                        $insertedRates++;
                    }
                }
            }
            
            $this->pdo->commit();
            
            return [
                'zones_created' => count($insertedZones),
                'rates_inserted' => $insertedRates
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
    
    /**
     * ゾーン作成または取得
     */
    private function createOrGetZone($row) {
        // 既存ゾーン確認
        $stmt = $this->pdo->prepare("SELECT zone_id FROM shipping_zones WHERE zone_name = ?");
        $stmt->execute([$row['zone_name']]);
        $existingZone = $stmt->fetchColumn();
        
        if ($existingZone) {
            return $existingZone;
        }
        
        // 新規ゾーン作成
        $stmt = $this->pdo->prepare("
            INSERT INTO shipping_zones (zone_name, zone_type, countries_json, zone_priority) 
            VALUES (?, 'international', ?, 50)
        ");
        
        $stmt->execute([
            $row['zone_name'],
            json_encode($row['countries'])
        ]);
        
        return $this->pdo->lastInsertId();
    }
    
    /**
     * ポリシーID取得
     */
    private function getPolicyIds() {
        $stmt = $this->pdo->query("SELECT policy_id, policy_type FROM shipping_policies WHERE policy_status = 'active'");
        $policies = [];
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $policies[$row['policy_type']] = $row['policy_id'];
        }
        
        return $policies;
    }
    
    /**
     * 送料レート挿入
     */
    private function insertShippingRate($policyId, $zoneId, $row) {
        $stmt = $this->pdo->prepare("
            INSERT INTO shipping_rates 
            (policy_id, zone_id, weight_min_kg, weight_max_kg, length_max_cm, cost_usd, 
             delivery_days_min, delivery_days_max, tracking_included, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
            ON DUPLICATE KEY UPDATE
            cost_usd = VALUES(cost_usd),
            delivery_days_min = VALUES(delivery_days_min),
            delivery_days_max = VALUES(delivery_days_max)
        ");
        
        $stmt->execute([
            $policyId,
            $zoneId,
            floatval($row['weight_min_kg']),
            floatval($row['weight_max_kg']),
            !empty($row['length_max_cm']) ? floatval($row['length_max_cm']) : null,
            floatval($row['cost_usd']),
            !empty($row['delivery_days_min']) ? intval($row['delivery_days_min']) : null,
            !empty($row['delivery_days_max']) ? intval($row['delivery_days_max']) : null
        ]);
    }
}
?>
