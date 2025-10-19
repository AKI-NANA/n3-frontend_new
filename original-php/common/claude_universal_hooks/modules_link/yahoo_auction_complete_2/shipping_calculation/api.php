<?php
/**
 * 送料計算API（テスト・実装用）
 * エンドポイント: /shipping_calculation/api.php
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

$calculator = new ShippingCalculator($pdo);
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    
    case 'calculate_shipping':
        handleCalculateShipping($calculator);
        break;
        
    case 'get_policies':
        handleGetPolicies($pdo);
        break;
        
    case 'get_zones':
        handleGetZones($pdo);
        break;
        
    case 'bulk_calculate':
        handleBulkCalculate($calculator);
        break;
        
    case 'test_calculation':
        handleTestCalculation($calculator);
        break;
        
    case 'get_calculation_history':
        handleGetCalculationHistory($pdo);
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => '無効なアクション']);
        break;
}

/**
 * 個別商品の送料計算
 */
function handleCalculateShipping($calculator) {
    $required = ['product_id', 'weight', 'length', 'width', 'height'];
    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            echo json_encode(['success' => false, 'error' => "必須項目が不足: {$field}"]);
            return;
        }
    }
    
    $result = $calculator->calculateShipping(
        $data['product_id'],
        floatval($data['weight']),
        [floatval($data['length']), floatval($data['width']), floatval($data['height'])],
        $data['destination'] ?? 'US'
    );
    
    echo json_encode($result);
}

/**
 * 配送ポリシー一覧取得
 */
function handleGetPolicies($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT p.*, 
                   COUNT(sr.rate_id) as rate_count,
                   COALESCE(MIN(sr.cost_usd), 0) as min_cost,
                   COALESCE(MAX(sr.cost_usd), 0) as max_cost
            FROM shipping_policies p
            LEFT JOIN shipping_rates sr ON p.policy_id = sr.policy_id AND sr.is_active = 1
            WHERE p.policy_status = 'active'
            GROUP BY p.policy_id
            ORDER BY 
                CASE p.policy_type 
                    WHEN 'economy' THEN 1 
                    WHEN 'standard' THEN 2 
                    WHEN 'express' THEN 3 
                END
        ");
        
        $policies = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $policies
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * 送付先ゾーン一覧取得
 */
function handleGetZones($pdo) {
    try {
        $stmt = $pdo->query("
            SELECT zone_id, zone_name, zone_type, countries_json, zone_priority
            FROM shipping_zones 
            WHERE is_active = 1 
            ORDER BY zone_priority ASC
        ");
        
        $zones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // JSON文字列を配列に変換
        foreach ($zones as &$zone) {
            $zone['countries'] = json_decode($zone['countries_json'], true);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $zones
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

/**
 * 複数商品の一括計算
 */
function handleBulkCalculate($calculator) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['products']) || !is_array($data['products'])) {
        echo json_encode(['success' => false, 'error' => '商品データが無効です']);
        return;
    }
    
    $destination = $data['destination'] ?? 'US';
    $results = $calculator->calculateBulkShipping($data['products'], $destination);
    
    echo json_encode([
        'success' => true,
        'data' => $results,
        'summary' => [
            'total_products' => count($results),
            'destination' => $destination,
            'calculated_at' => date('Y-m-d H:i:s')
        ]
    ]);
}

/**
 * テスト計算（フロントエンド用）
 */
function handleTestCalculation($calculator) {
    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    
    // デフォルト値
    $testData = [
        'product_id' => 'TEST-' . time(),
        'weight' => floatval($data['weight'] ?? 1.0),
        'length' => floatval($data['length'] ?? 20),
        'width' => floatval($data['width'] ?? 15),
        'height' => floatval($data['height'] ?? 10),
        'destination' => $data['destination'] ?? 'US'
    ];
    
    $result = $calculator->calculateShipping(
        $testData['product_id'],
        $testData['weight'],
        [$testData['length'], $testData['width'], $testData['height']],
        $testData['destination']
    );
    
    if ($result['success']) {
        $result['test_data'] = $testData;
    }
    
    echo json_encode($result);
}

/**
 * 計算履歴取得
 */
function handleGetCalculationHistory($pdo) {
    $limit = intval($_GET['limit'] ?? 50);
    $offset = intval($_GET['offset'] ?? 0);
    $productId = $_GET['product_id'] ?? null;
    
    try {
        $whereClause = '';
        $params = [];
        
        if ($productId) {
            $whereClause = ' WHERE scl.product_id = ?';
            $params[] = $productId;
        }
        
        $stmt = $pdo->prepare("
            SELECT scl.*, 
                   sz.zone_name, 
                   sp.policy_name, sp.policy_type
            FROM shipping_calculation_log scl
            LEFT JOIN shipping_zones sz ON scl.destination_zone_id = sz.zone_id
            LEFT JOIN shipping_policies sp ON scl.used_policy_id = sp.policy_id
            {$whereClause}
            ORDER BY scl.calculation_time DESC
            LIMIT {$limit} OFFSET {$offset}
        ");
        
        $stmt->execute($params);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総件数取得
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM shipping_calculation_log" . $whereClause);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetchColumn();
        
        echo json_encode([
            'success' => true,
            'data' => $history,
            'pagination' => [
                'total' => intval($totalCount),
                'limit' => $limit,
                'offset' => $offset,
                'has_more' => ($offset + $limit) < $totalCount
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
