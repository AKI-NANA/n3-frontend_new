<?php
/**
 * 商品管理API
 * 在庫監視商品の登録・管理・更新機能
 */

require_once '../config.php';
require_once '../includes/ApiResponse.php';
require_once '../includes/InventoryManager.php';

// セキュリティヘッダー設定
ApiResponse::setSecurityHeaders();

// OPTIONS リクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $manager = new InventoryManager();
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($method) {
        case 'GET':
            handleGetRequests($manager, $action);
            break;
            
        case 'POST':
            handlePostRequests($manager, $action);
            break;
            
        case 'PUT':
            handlePutRequests($manager, $action);
            break;
            
        case 'DELETE':
            handleDeleteRequests($manager, $action);
            break;
            
        default:
            ApiResponse::error('サポートされていないHTTPメソッドです', 405);
    }
    
} catch (Exception $e) {
    ApiResponse::serverError('商品管理APIでエラーが発生しました', $e->getMessage());
}

/**
 * GET リクエスト処理
 */
function handleGetRequests($manager, $action) {
    switch ($action) {
        case 'list':
            getProductList($manager);
            break;
            
        case 'detail':
            getProductDetail($manager);
            break;
            
        case 'history':
            getProductHistory($manager);
            break;
            
        case 'platforms':
            getSupportedPlatforms();
            break;
            
        default:
            ApiResponse::notFound('指定されたアクションが見つかりません');
    }
}

/**
 * POST リクエスト処理
 */
function handlePostRequests($manager, $action) {
    switch ($action) {
        case 'register':
            registerProduct($manager);
            break;
            
        case 'bulk_register':
            bulkRegisterProducts($manager);
            break;
            
        case 'update_stock':
            updateProductStock($manager);
            break;
            
        case 'update_price':
            updateProductPrice($manager);
            break;
            
        default:
            ApiResponse::notFound('指定されたアクションが見つかりません');
    }
}

/**
 * PUT リクエスト処理
 */
function handlePutRequests($manager, $action) {
    switch ($action) {
        case 'toggle_monitoring':
            toggleMonitoring($manager);
            break;
            
        case 'update_settings':
            updateProductSettings($manager);
            break;
            
        default:
            ApiResponse::notFound('指定されたアクションが見つかりません');
    }
}

/**
 * DELETE リクエスト処理
 */
function handleDeleteRequests($manager, $action) {
    switch ($action) {
        case 'remove':
            removeProduct($manager);
            break;
            
        default:
            ApiResponse::notFound('指定されたアクションが見つかりません');
    }
}

/**
 * 商品一覧取得
 */
function getProductList($manager) {
    $validationRules = [
        'page' => ['type' => 'integer', 'min' => 1],
        'limit' => ['type' => 'integer', 'min' => 1, 'max' => 100],
        'platform' => ['type' => 'string', 'in' => ['yahoo', 'amazon', 'ebay']],
        'status' => ['type' => 'string', 'in' => ['active', 'inactive', 'error']],
        'search' => ['type' => 'string', 'max_length' => 255]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $page = $data['page'] ?? 1;
    $limit = $data['limit'] ?? 20;
    $platform = $data['platform'] ?? null;
    $offset = ($page - 1) * $limit;
    
    $result = $manager->getMonitoringProducts($platform, $limit, $offset);
    
    if (!$result['success']) {
        ApiResponse::error('商品一覧の取得に失敗しました');
        return;
    }
    
    // 検索フィルタリング（簡易版）
    if (!empty($data['search'])) {
        $searchTerm = strtolower($data['search']);
        $result['products'] = array_filter($result['products'], function($product) use ($searchTerm) {
            return strpos(strtolower($product['product_title'] ?? ''), $searchTerm) !== false ||
                   strpos(strtolower($product['source_url'] ?? ''), $searchTerm) !== false;
        });
        $result['total_count'] = count($result['products']);
    }
    
    ApiResponse::paginated(
        $result['products'],
        $result['total_count'],
        $page,
        $limit,
        '商品一覧を取得しました'
    );
}

/**
 * 商品詳細取得
 */
function getProductDetail($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $db = new Database();
    
    // 商品詳細取得
    $product = $db->selectRow(
        "SELECT 
            im.*,
            ysp.title as product_title,
            ysp.image_url as product_image,
            ysp.description as product_description
        FROM inventory_management im
        LEFT JOIN yahoo_scraped_products ysp ON im.product_id = ysp.id
        WHERE im.product_id = ?",
        [$data['product_id']]
    );
    
    if (!$product) {
        ApiResponse::notFound('指定された商品が見つかりません');
        return;
    }
    
    // 最近の履歴取得
    $recentHistory = $db->select(
        "SELECT * FROM stock_history 
         WHERE product_id = ? 
         ORDER BY created_at DESC 
         LIMIT 10",
        [$data['product_id']]
    );
    
    // 統計データ計算
    $stats = [
        'total_changes' => $db->selectValue(
            "SELECT COUNT(*) FROM stock_history WHERE product_id = ?",
            [$data['product_id']]
        ),
        'stock_changes_24h' => $db->selectValue(
            "SELECT COUNT(*) FROM stock_history 
             WHERE product_id = ? AND change_type IN ('stock_change', 'both')
             AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)",
            [$data['product_id']]
        ),
        'price_changes_24h' => $db->selectValue(
            "SELECT COUNT(*) FROM stock_history 
             WHERE product_id = ? AND change_type IN ('price_change', 'both')
             AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)",
            [$data['product_id']]
        )
    ];
    
    $response = [
        'product' => $product,
        'recent_history' => $recentHistory,
        'stats' => $stats
    ];
    
    ApiResponse::success($response, '商品詳細を取得しました');
}

/**
 * 商品履歴取得
 */
function getProductHistory($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1],
        'limit' => ['type' => 'integer', 'min' => 1, 'max' => 200],
        'change_type' => ['type' => 'string', 'in' => ['stock_change', 'price_change', 'both']],
        'date_from' => ['type' => 'string'],
        'date_to' => ['type' => 'string']
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $db = new Database();
    
    $whereClause = "product_id = ?";
    $params = [$data['product_id']];
    
    if (!empty($data['change_type'])) {
        $whereClause .= " AND change_type = ?";
        $params[] = $data['change_type'];
    }
    
    if (!empty($data['date_from'])) {
        $whereClause .= " AND created_at >= ?";
        $params[] = $data['date_from'];
    }
    
    if (!empty($data['date_to'])) {
        $whereClause .= " AND created_at <= ?";
        $params[] = $data['date_to'];
    }
    
    $limit = $data['limit'] ?? 50;
    
    $history = $db->select(
        "SELECT * FROM stock_history 
         WHERE {$whereClause}
         ORDER BY created_at DESC 
         LIMIT ?",
        array_merge($params, [$limit])
    );
    
    ApiResponse::success($history, '商品履歴を取得しました');
}

/**
 * サポートプラットフォーム一覧
 */
function getSupportedPlatforms() {
    $platforms = [
        [
            'id' => 'yahoo',
            'name' => 'Yahoo!オークション',
            'description' => 'Yahoo!オークションの商品監視',
            'supported_features' => ['stock_monitoring', 'price_tracking', 'url_validation'],
            'enabled' => true
        ],
        [
            'id' => 'amazon',
            'name' => 'Amazon',
            'description' => 'Amazon商品のAPI連携監視',
            'supported_features' => ['stock_monitoring', 'price_tracking', 'product_details'],
            'enabled' => false // Web版では無効
        ],
        [
            'id' => 'ebay',
            'name' => 'eBay',
            'description' => 'eBay商品のAPI連携監視',
            'supported_features' => ['stock_monitoring', 'price_tracking', 'listing_sync'],
            'enabled' => false // Web版では無効
        ]
    ];
    
    ApiResponse::success($platforms, 'サポートプラットフォーム一覧を取得しました');
}

/**
 * 商品監視登録
 */
function registerProduct($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1],
        'source_url' => ['required' => true, 'type' => 'url'],
        'platform' => ['required' => true, 'type' => 'string', 'in' => ['yahoo', 'amazon', 'ebay']],
        'source_product_id' => ['type' => 'string', 'max_length' => 100]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $result = $manager->registerProduct(
        $data['product_id'],
        $data['source_url'],
        $data['platform'],
        $data['source_product_id'] ?? null
    );
    
    if ($result['success']) {
        ApiResponse::success($result, $result['message']);
    } else {
        ApiResponse::error($result['message'], 400);
    }
}

/**
 * 商品一括登録
 */
function bulkRegisterProducts($manager) {
    $validationRules = [
        'products' => ['required' => true],
        'skip_errors' => ['type' => 'integer', 'in' => [0, 1]]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    if (!is_array($data['products']) || empty($data['products'])) {
        ApiResponse::error('商品データが正しくありません');
        return;
    }
    
    $results = [];
    $successCount = 0;
    $errorCount = 0;
    $skipErrors = !empty($data['skip_errors']);
    
    foreach ($data['products'] as $index => $product) {
        try {
            // 個別商品バリデーション
            if (empty($product['product_id']) || empty($product['source_url']) || empty($product['platform'])) {
                throw new Exception("必須フィールドが不足しています");
            }
            
            $result = $manager->registerProduct(
                $product['product_id'],
                $product['source_url'],
                $product['platform'],
                $product['source_product_id'] ?? null
            );
            
            $results[] = [
                'index' => $index,
                'product_id' => $product['product_id'],
                'success' => $result['success'],
                'message' => $result['message'],
                'inventory_id' => $result['inventory_id'] ?? null
            ];
            
            if ($result['success']) {
                $successCount++;
            } else {
                $errorCount++;
                if (!$skipErrors) {
                    break;
                }
            }
            
        } catch (Exception $e) {
            $errorCount++;
            $results[] = [
                'index' => $index,
                'product_id' => $product['product_id'] ?? 'unknown',
                'success' => false,
                'message' => $e->getMessage()
            ];
            
            if (!$skipErrors) {
                break;
            }
        }
    }
    
    $response = [
        'total_processed' => count($results),
        'success_count' => $successCount,
        'error_count' => $errorCount,
        'results' => $results
    ];
    
    if ($errorCount > 0 && !$skipErrors) {
        ApiResponse::error('一括登録中にエラーが発生しました', 400, 'BULK_REGISTER_ERROR', $response);
    } else {
        ApiResponse::success($response, "一括登録完了: 成功 {$successCount}件, エラー {$errorCount}件");
    }
}

/**
 * 在庫数更新
 */
function updateProductStock($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1],
        'new_stock' => ['required' => true, 'type' => 'integer', 'min' => 0],
        'platform' => ['type' => 'string', 'in' => ['yahoo', 'amazon', 'ebay']]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $result = $manager->updateStock(
        $data['product_id'],
        $data['new_stock'],
        $data['platform'] ?? null
    );
    
    if ($result['success']) {
        ApiResponse::success($result, $result['message']);
    } else {
        ApiResponse::error($result['message'], 400);
    }
}

/**
 * 価格更新
 */
function updateProductPrice($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1],
        'new_price' => ['required' => true, 'type' => 'float', 'min' => 0],
        'platform' => ['type' => 'string', 'in' => ['yahoo', 'amazon', 'ebay']]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $result = $manager->updatePrice(
        $data['product_id'],
        $data['new_price'],
        $data['platform'] ?? null
    );
    
    if ($result['success']) {
        ApiResponse::success($result, $result['message']);
    } else {
        ApiResponse::error($result['message'], 400);
    }
}

/**
 * 監視状態切り替え
 */
function toggleMonitoring($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1],
        'enabled' => ['required' => true, 'type' => 'integer', 'in' => [0, 1]]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $db = new Database();
    
    $affectedRows = $db->update(
        'inventory_management',
        [
            'monitoring_enabled' => $data['enabled'],
            'updated_at' => date('Y-m-d H:i:s')
        ],
        ['product_id' => $data['product_id']]
    );
    
    if ($affectedRows > 0) {
        $status = $data['enabled'] ? '有効' : '無効';
        ApiResponse::success(['affected_rows' => $affectedRows], "監視状態を{$status}に変更しました");
    } else {
        ApiResponse::notFound('指定された商品が見つかりません');
    }
}

/**
 * 商品削除
 */
function removeProduct($manager) {
    $validationRules = [
        'product_id' => ['required' => true, 'type' => 'integer', 'min' => 1],
        'confirm' => ['required' => true, 'type' => 'integer', 'in' => [1]]
    ];
    
    $data = ApiResponse::validateRequest($validationRules);
    
    $db = new Database();
    
    try {
        $db->beginTransaction();
        
        // 履歴データ削除
        $historyDeleted = $db->delete('stock_history', ['product_id' => $data['product_id']]);
        
        // 在庫管理データ削除
        $inventoryDeleted = $db->delete('inventory_management', ['product_id' => $data['product_id']]);
        
        if ($inventoryDeleted > 0) {
            $db->commit();
            ApiResponse::success([
                'deleted_inventory_records' => $inventoryDeleted,
                'deleted_history_records' => $historyDeleted
            ], '商品監視を削除しました');
        } else {
            $db->rollback();
            ApiResponse::notFound('指定された商品が見つかりません');
        }
        
    } catch (Exception $e) {
        $db->rollback();
        ApiResponse::serverError('商品削除中にエラーが発生しました', $e->getMessage());
    }
}
?>