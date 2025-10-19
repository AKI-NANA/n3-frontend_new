<?php
/**
 * eBay手数料AI解析APIエンドポイント
 * ファイル: ai_fee_parser.php
 * フロントエンドからのAI解析リクエストを処理
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    require_once '../classes/EbayFeeAIParser.php';
    
    // データベース接続
    function getDatabaseConnection() {
        $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
        $env = [];
        
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($key, $value) = explode('=', $line, 2);
                $env[trim($key)] = trim($value, '"');
            }
        }
        
        $dsn = sprintf("pgsql:host=%s;dbname=%s;port=%s", 
            $env['DB_HOST'] ?? 'localhost',
            $env['DB_NAME'] ?? 'nagano3_db', 
            $env['DB_PORT'] ?? '5432'
        );
        
        $pdo = new PDO($dsn, $env['DB_USER'] ?? 'aritahiroaki', $env['DB_PASS'] ?? '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    $openaiKey = $input['openai_api_key'] ?? null;
    $parser = new EbayFeeAIParser($pdo, $openaiKey);
    
    switch ($action) {
        case 'parse_fee_data':
            // 手動入力データの解析
            $feeData = $input['fee_data'] ?? '';
            
            if (empty($feeData)) {
                throw new Exception('手数料データが必要です');
            }
            
            $result = $parser->parseAndStoreFeeData($feeData);
            
            // 詳細情報を追加で取得
            if ($result['success']) {
                $result['details'] = getLatestParseResults($pdo);
            }
            
            echo json_encode($result);
            break;
            
        case 'fetch_and_parse':
            // 自動取得・解析
            $sourceUrl = $input['source_url'] ?? '';
            
            if (empty($sourceUrl)) {
                throw new Exception('取得元URLが必要です');
            }
            
            $result = $parser->fetchAndParseFeeData($sourceUrl);
            
            if ($result['success']) {
                $result['details'] = getLatestParseResults($pdo);
            }
            
            echo json_encode($result);
            break;
            
        case 'get_parsed_fees':
            // 解析済みデータの取得
            $fees = getStoredFeeData($pdo);
            
            echo json_encode([
                'success' => true,
                'fees' => $fees,
                'count' => count($fees)
            ]);
            break;
            
        case 'update_fee':
            // 手数料データの手動更新
            $feeId = $input['fee_id'] ?? '';
            $updates = $input['updates'] ?? [];
            
            if (empty($feeId) || empty($updates)) {
                throw new Exception('更新するデータが不足しています');
            }
            
            $result = updateFeeData($pdo, $feeId, $updates);
            echo json_encode($result);
            break;
            
        case 'validate_parsing':
            // 解析結果の妥当性確認
            $validation = validateParsedData($pdo);
            echo json_encode($validation);
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log('AI Fee Parser API エラー: ' . $e->getMessage());
    echo json_encode($response);
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * 最新の解析結果詳細を取得
 */
function getLatestParseResults($pdo) {
    $stmt = $pdo->query("
        SELECT 
            category_id, category_name, final_value_fee_percent, 
            final_value_fee_max, confidence_score, source_text, updated_at
        FROM ebay_category_fees 
        WHERE is_active = TRUE AND data_source = 'ai_parsed'
        ORDER BY updated_at DESC 
        LIMIT 20
    ");
    
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return [
        'categories' => $categories,
        'total_count' => count($categories),
        'last_updated' => $categories[0]['updated_at'] ?? null
    ];
}

/**
 * 格納済み手数料データ取得
 */
function getStoredFeeData($pdo) {
    $stmt = $pdo->query("
        SELECT 
            id, category_id, category_name, final_value_fee_percent, 
            final_value_fee_max, confidence_score, data_source,
            is_active, created_at, updated_at
        FROM ebay_category_fees 
        WHERE is_active = TRUE
        ORDER BY 
            CASE WHEN data_source = 'ai_parsed' THEN 1 ELSE 2 END,
            confidence_score DESC,
            category_name ASC
    ");
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * 手数料データ更新
 */
function updateFeeData($pdo, $feeId, $updates) {
    $allowedFields = [
        'final_value_fee_percent',
        'final_value_fee_max', 
        'category_name',
        'confidence_score'
    ];
    
    $setParts = [];
    $values = [];
    
    foreach ($updates as $field => $value) {
        if (in_array($field, $allowedFields)) {
            $setParts[] = "{$field} = ?";
            $values[] = $value;
        }
    }
    
    if (empty($setParts)) {
        throw new Exception('更新可能なフィールドがありません');
    }
    
    $setParts[] = "updated_at = NOW()";
    $values[] = $feeId;
    
    $sql = "UPDATE ebay_category_fees SET " . implode(', ', $setParts) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($values);
    
    return [
        'success' => true,
        'updated_rows' => $stmt->rowCount(),
        'fee_id' => $feeId
    ];
}

/**
 * 解析データの妥当性確認
 */
function validateParsedData($pdo) {
    $validation = [
        'success' => true,
        'issues' => [],
        'statistics' => []
    ];
    
    // 1. 重複カテゴリーチェック
    $stmt = $pdo->query("
        SELECT category_id, COUNT(*) as count 
        FROM ebay_category_fees 
        WHERE is_active = TRUE AND category_id IS NOT NULL
        GROUP BY category_id 
        HAVING COUNT(*) > 1
    ");
    $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($duplicates)) {
        $validation['issues'][] = [
            'type' => 'duplicate_categories',
            'count' => count($duplicates),
            'details' => $duplicates
        ];
    }
    
    // 2. 異常な手数料率チェック
    $stmt = $pdo->query("
        SELECT category_name, final_value_fee_percent 
        FROM ebay_category_fees 
        WHERE is_active = TRUE 
        AND (final_value_fee_percent > 20 OR final_value_fee_percent < 0)
    ");
    $abnormalRates = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($abnormalRates)) {
        $validation['issues'][] = [
            'type' => 'abnormal_fee_rates',
            'count' => count($abnormalRates),
            'details' => $abnormalRates
        ];
    }
    
    // 3. 低信頼度データチェック
    $stmt = $pdo->query("
        SELECT category_name, confidence_score 
        FROM ebay_category_fees 
        WHERE is_active = TRUE 
        AND confidence_score < 60
    ");
    $lowConfidence = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($lowConfidence)) {
        $validation['issues'][] = [
            'type' => 'low_confidence',
            'count' => count($lowConfidence),
            'details' => $lowConfidence
        ];
    }
    
    // 統計情報
    $stmt = $pdo->query("
        SELECT 
            COUNT(*) as total_categories,
            AVG(final_value_fee_percent) as avg_fee_rate,
            AVG(confidence_score) as avg_confidence,
            COUNT(CASE WHEN data_source = 'ai_parsed' THEN 1 END) as ai_parsed_count
        FROM ebay_category_fees 
        WHERE is_active = TRUE
    ");
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $validation['statistics'] = [
        'total_categories' => intval($stats['total_categories']),
        'average_fee_rate' => round($stats['avg_fee_rate'], 2),
        'average_confidence' => round($stats['avg_confidence'], 1),
        'ai_parsed_count' => intval($stats['ai_parsed_count'])
    ];
    
    // 問題がある場合はsuccessをfalseに
    if (!empty($validation['issues'])) {
        $validation['success'] = false;
    }
    
    return $validation;
}
?>