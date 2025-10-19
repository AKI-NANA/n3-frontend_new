<?php
/**
 * データ表示用API - Category Manager Tool専用
 * Excel風テーブル表示のためのデータ取得エンドポイント
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    switch ($action) {
        
        // =================================================================
        // カテゴリー一覧取得
        // =================================================================
        case 'get_categories':
            $limit = min(1000, max(10, intval($_GET['limit'] ?? 500)));
            $search = $_GET['search'] ?? '';
            
            $sql = "SELECT 
                        category_id,
                        category_name,
                        parent_id,
                        category_level,
                        is_leaf,
                        is_active,
                        sort_order,
                        created_at,
                        updated_at
                    FROM ebay_categories 
                    WHERE 1=1";
            
            $params = [];
            
            // 検索条件追加
            if (!empty($search)) {
                $sql .= " AND (category_name ILIKE ? OR category_id ILIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }
            
            $sql .= " ORDER BY 
                        CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END,
                        category_level ASC,
                        sort_order ASC,
                        category_name ASC
                      LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'action' => 'get_categories',
                'categories' => $categories,
                'count' => count($categories),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // 必須項目データ取得
        // =================================================================
        case 'get_requirements':
            $limit = min(1000, max(10, intval($_GET['limit'] ?? 500)));
            $search = $_GET['search'] ?? '';
            
            $sql = "SELECT 
                        crf.category_id,
                        ec.category_name,
                        crf.field_name,
                        crf.field_type,
                        crf.field_data_type,
                        crf.possible_values,
                        crf.default_value,
                        crf.sort_order,
                        crf.is_active,
                        crf.created_at,
                        crf.updated_at
                    FROM category_required_fields crf
                    LEFT JOIN ebay_categories ec ON crf.category_id = ec.category_id
                    WHERE crf.is_active = TRUE";
            
            $params = [];
            
            // 検索条件追加
            if (!empty($search)) {
                $sql .= " AND (crf.category_id ILIKE ? OR crf.field_name ILIKE ? OR ec.category_name ILIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }
            
            $sql .= " ORDER BY 
                        crf.category_id ASC,
                        crf.sort_order ASC,
                        crf.field_name ASC
                      LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $requirements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'action' => 'get_requirements',
                'requirements' => $requirements,
                'count' => count($requirements),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // 手数料データ取得
        // =================================================================
        case 'get_fees':
            $limit = min(1000, max(10, intval($_GET['limit'] ?? 500)));
            $search = $_GET['search'] ?? '';
            
            $sql = "SELECT 
                        ecf.category_id,
                        ec.category_name,
                        ecf.listing_type,
                        ecf.insertion_fee,
                        ecf.final_value_fee_percent,
                        ecf.final_value_fee_max,
                        ecf.store_fee,
                        ecf.paypal_fee_percent,
                        ecf.paypal_fee_fixed,
                        ecf.fee_group,
                        ecf.is_active,
                        ecf.updated_at
                    FROM ebay_category_fees ecf
                    LEFT JOIN ebay_categories ec ON ecf.category_id = ec.category_id
                    WHERE ecf.is_active = TRUE";
            
            $params = [];
            
            // 検索条件追加
            if (!empty($search)) {
                $sql .= " AND (ecf.category_id ILIKE ? OR ec.category_name ILIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }
            
            $sql .= " ORDER BY 
                        ecf.final_value_fee_percent DESC,
                        ecf.category_id ASC,
                        ecf.listing_type ASC
                      LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $fees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'action' => 'get_fees',
                'fees' => $fees,
                'count' => count($fees),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // 処理状況データ取得
        // =================================================================
        case 'get_processing_status':
            $limit = min(1000, max(10, intval($_GET['limit'] ?? 200)));
            $search = $_GET['search'] ?? '';
            $stage_filter = $_GET['stage'] ?? '';
            
            $sql = "SELECT 
                        ysp.id,
                        ysp.source_item_id,
                        (ysp.scraped_yahoo_data->>'title') as title,
                        ysp.price_jpy,
                        (ysp.ebay_api_data->>'category_id') as category_id,
                        (ysp.ebay_api_data->>'category_name') as category_name,
                        CAST(COALESCE(ysp.ebay_api_data->>'confidence', '0') as INTEGER) as confidence,
                        (ysp.ebay_api_data->>'stage') as stage,
                        (ysp.ebay_api_data->>'item_specifics') as item_specifics,
                        ysp.updated_at,
                        ysp.created_at
                    FROM yahoo_scraped_products ysp
                    WHERE 1=1";
            
            $params = [];
            
            // 検索条件追加
            if (!empty($search)) {
                $sql .= " AND (ysp.scraped_yahoo_data->>'title') ILIKE ?";
                $params[] = "%{$search}%";
            }
            
            // Stage フィルター
            if (!empty($stage_filter)) {
                switch ($stage_filter) {
                    case 'unprocessed':
                        $sql .= " AND (ysp.ebay_api_data IS NULL OR (ysp.ebay_api_data->>'category_id') IS NULL)";
                        break;
                    case 'stage1':
                        $sql .= " AND (ysp.ebay_api_data->>'stage') = 'basic'";
                        break;
                    case 'stage2':
                        $sql .= " AND (ysp.ebay_api_data->>'stage') = 'profit_enhanced'";
                        break;
                }
            }
            
            $sql .= " ORDER BY ysp.updated_at DESC LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'action' => 'get_processing_status',
                'products' => $products,
                'count' => count($products),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'action' => $action ?? 'unknown',
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log('データ表示API エラー: ' . $e->getMessage());
    http_response_code(400);
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>