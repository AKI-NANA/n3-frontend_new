<?php
/**
 * eBayカテゴリー自動判定API - new_structure統合版
 * エンドポイント: detect_category.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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
    // 必須クラス読み込み
    require_once '../classes/CategoryDetector.php';
    require_once '../classes/ItemSpecificsGenerator.php';
    
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
    $detector = new CategoryDetector($pdo, true);
    $specificsGenerator = new ItemSpecificsGenerator($pdo);
    
    switch ($action) {
        case 'detect_single':
            // 単一商品のカテゴリー判定
            $title = $input['title'] ?? '';
            $price = floatval($input['price'] ?? 0);
            $description = $input['description'] ?? '';
            
            if (empty($title)) {
                throw new Exception('商品タイトルが必要です');
            }
            
            $productData = [
                'title' => $title,
                'price' => $price,
                'description' => $description
            ];
            
            $categoryResult = $detector->detectCategory($productData);
            
            // 必須項目生成
            $itemSpecifics = $specificsGenerator->generateItemSpecificsString(
                $categoryResult['category_id'],
                [],
                $productData
            );
            
            $response = [
                'success' => true,
                'result' => array_merge($categoryResult, [
                    'item_specifics' => $itemSpecifics,
                    'processing_time' => 50, // ms
                    'timestamp' => date('Y-m-d H:i:s')
                ])
            ];
            break;
            
        case 'detect_batch':
            // バッチ処理
            $products = $input['products'] ?? [];
            
            if (empty($products)) {
                throw new Exception('商品データが必要です');
            }
            
            $results = [];
            $startTime = microtime(true);
            
            foreach ($products as $index => $productData) {
                try {
                    $categoryResult = $detector->detectCategory($productData);
                    
                    $itemSpecifics = $specificsGenerator->generateItemSpecificsString(
                        $categoryResult['category_id'],
                        [],
                        $productData
                    );
                    
                    $results[] = [
                        'index' => $index,
                        'success' => true,
                        'category_result' => array_merge($categoryResult, [
                            'item_specifics' => $itemSpecifics
                        ]),
                        'original_data' => $productData
                    ];
                    
                } catch (Exception $e) {
                    $results[] = [
                        'index' => $index,
                        'success' => false,
                        'error' => $e->getMessage(),
                        'original_data' => $productData
                    ];
                }
            }
            
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            $response = [
                'success' => true,
                'results' => $results,
                'summary' => [
                    'total_items' => count($products),
                    'success_items' => count(array_filter($results, function($r) { return $r['success']; })),
                    'processing_time' => $processingTime
                ]
            ];
            break;
            
        case 'get_categories':
            // 利用可能カテゴリー一覧
            $categories = $detector->getAvailableCategories();
            
            $response = [
                'success' => true,
                'categories' => $categories
            ];
            break;
            
        case 'get_required_fields':
            // カテゴリー別必須項目取得
            $categoryId = $input['category_id'] ?? '';
            
            if (empty($categoryId)) {
                throw new Exception('カテゴリーIDが必要です');
            }
            
            $fields = $specificsGenerator->getRequiredFields($categoryId);
            
            $response = [
                'success' => true,
                'category_id' => $categoryId,
                'required_fields' => $fields
            ];
            break;
            
        case 'validate_item_specifics':
            // Item Specifics検証
            $categoryId = $input['category_id'] ?? '';
            $itemSpecifics = $input['item_specifics'] ?? '';
            
            if (empty($categoryId) || empty($itemSpecifics)) {
                throw new Exception('カテゴリーIDとItem Specificsが必要です');
            }
            
            $validation = $specificsGenerator->validateItemSpecifics($categoryId, $itemSpecifics);
            
            $response = [
                'success' => true,
                'validation' => $validation
            ];
            break;
            
        case 'get_stats':
            // システム統計情報
            $stats = $detector->getCategoryStats();
            
            $response = [
                'success' => true,
                'stats' => $stats,
                'system_info' => [
                    'version' => '1.0.0',
                    'last_updated' => date('Y-m-d H:i:s'),
                    'database_status' => 'connected'
                ]
            ];
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
    
    error_log('eBayカテゴリー判定API エラー: ' . $e->getMessage());
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>