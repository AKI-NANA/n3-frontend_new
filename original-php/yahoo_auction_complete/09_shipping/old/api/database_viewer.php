<?php
/**
 * データベース表示・操作API（完全版）
 * エンドポイント: api/database_viewer.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // データベース接続
    function getDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            throw new Exception('データベース接続失敗: ' . $e->getMessage());
        }
    }
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    
    switch ($action) {
        case 'import_ems_data':
            // EMS実データ投入（既に83件投入済みなので確認のみ）
            $result = getEMSDataStatus($pdo);
            sendResponse($result, true, 'EMS実データ確認完了');
            break;
            
        case 'get_shipping_data':
            // 配送データ取得
            $filters = $input['filters'] ?? [];
            $result = getShippingData($pdo, $filters);
            sendResponse($result, true, 'データ取得完了');
            break;
            
        case 'get_statistics':
            // 統計情報取得
            $result = getStatistics($pdo);
            sendResponse($result, true, '統計取得完了');
            break;
            
        case 'clear_data':
            // データクリア
            $result = clearShippingData($pdo);
            sendResponse($result, true, 'データクリア完了');
            break;
            
        case 'execute_raw_sql':
            // 生SQL実行
            $sql = $input['sql'] ?? '';
            if (empty($sql)) {
                throw new Exception('SQLクエリが必要です');
            }
            $result = executeRawSQL($pdo, $sql);
            sendResponse($result, true, 'SQL実行完了');
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    sendResponse(null, false, $e->getMessage());
    error_log('データベース操作API エラー: ' . $e->getMessage());
}

/**
 * EMS実データ状況確認
 */
function getEMSDataStatus($pdo) {
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT country_code) as countries,
            MIN(price_jpy) as min_price,
            MAX(price_jpy) as max_price
        FROM shipping_service_rates 
        WHERE company_code = 'JPPOST' AND service_code = 'EMS'
    ");
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $result['status'] = $result['total_records'] > 0 ? 'データ投入済み' : 'データなし';
    
    return $result;
}

/**
 * 配送データ取得
 */
function getShippingData($pdo, $filters) {
    $sql = "
        SELECT 
            company_code,
            carrier_code,
            service_code,
            country_code,
            zone_code,
            weight_from_g,
            weight_to_g,
            price_jpy,
            data_source,
            created_at
        FROM shipping_service_rates 
        WHERE 1=1
    ";
    
    $params = [];
    
    if (!empty($filters['company']) && $filters['company'] !== 'ALL') {
        $sql .= " AND company_code = ?";
        $params[] = $filters['company'];
    }
    
    if (!empty($filters['service']) && $filters['service'] !== 'ALL') {
        $sql .= " AND service_code = ?";
        $params[] = $filters['service'];
    }
    
    if (!empty($filters['country']) && $filters['country'] !== 'ALL') {
        $sql .= " AND country_code = ?";
        $params[] = $filters['country'];
    }
    
    if (!empty($filters['zone']) && $filters['zone'] !== 'ALL') {
        $sql .= " AND zone_code = ?";
        $params[] = $filters['zone'];
    }
    
    $sql .= " ORDER BY company_code, country_code, weight_from_g LIMIT 500";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * 統計情報取得
 */
function getStatistics($pdo) {
    $stats = [];
    
    // 総レコード数
    $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates");
    $stats['total_records'] = $stmt->fetchColumn();
    
    // 配送会社数
    $stmt = $pdo->query("SELECT COUNT(DISTINCT company_code) FROM shipping_service_rates");
    $stats['companies'] = $stmt->fetchColumn();
    
    // サービス数
    $stmt = $pdo->query("SELECT COUNT(DISTINCT service_code) FROM shipping_service_rates");
    $stats['services'] = $stmt->fetchColumn();
    
    // 対応国数
    $stmt = $pdo->query("SELECT COUNT(DISTINCT country_code) FROM shipping_service_rates");
    $stats['countries'] = $stmt->fetchColumn();
    
    // ゾーン数
    $stmt = $pdo->query("SELECT COUNT(DISTINCT zone_code) FROM shipping_service_rates");
    $stats['zones'] = $stmt->fetchColumn();
    
    // EMS料金データ数
    $stmt = $pdo->query("SELECT COUNT(*) FROM shipping_service_rates WHERE company_code = 'JPPOST' AND service_code = 'EMS'");
    $stats['ems_records'] = $stmt->fetchColumn();
    
    // アメリカ向けEMS料金確認
    $stmt = $pdo->query("
        SELECT 
            weight_from_g, weight_to_g, price_jpy 
        FROM shipping_service_rates 
        WHERE company_code = 'JPPOST' AND service_code = 'EMS' AND country_code = 'US'
        ORDER BY weight_from_g
        LIMIT 6
    ");
    $stats['us_ems_sample'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return $stats;
}

/**
 * データクリア
 */
function clearShippingData($pdo) {
    $stmt = $pdo->prepare("DELETE FROM shipping_service_rates");
    $stmt->execute();
    
    return ['cleared_count' => $stmt->rowCount()];
}

/**
 * 生SQL実行
 */
function executeRawSQL($pdo, $sql) {
    try {
        // SELECT文のみ許可（安全性のため）
        if (!preg_match('/^\s*SELECT\s+/i', trim($sql))) {
            throw new Exception('SELECT文のみ実行可能です');
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
        
    } catch (PDOException $e) {
        throw new Exception('SQL実行エラー: ' . $e->getMessage());
    }
}

function sendResponse($data, $success = true, $message = '') {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'php_version' => phpversion(),
            'memory_usage' => memory_get_usage(true),
            'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
        ]
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

?>