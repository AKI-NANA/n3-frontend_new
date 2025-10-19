<?php
/**
 * Yahoo→eBay 商品承認システム - 統合モーダル対応バックエンド
 * modules/yahoo_auction_complete/new_structure/03_approval/approval.php
 * 
 * 統合モーダルシステムと同等のデータ取得機能
 * - 複数画像対応 (all_images配列)
 * - active_image_url対応
 * - scraped_yahoo_dataからの詳細情報取得
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// ヘッダー設定
if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

/**
 * JSON応答送信
 */
function sendResponse($data, $success = true, $message = '', $httpCode = 200) {
    if (php_sapi_name() === 'cli') {
        echo $message . "\n";
        return;
    }
    
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'module' => '03_approval_enhanced'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続（統合モーダル対応）
 */
function getDatabaseConnection() {
    $configs = [
        // メイン：統合モーダルと同じ接続設定
        [
            'dsn' => 'pgsql:host=localhost;port=5432;dbname=nagano3_db', 
            'user' => 'postgres', 
            'pass' => 'Kn240914'  // 統合モーダルと同じパスワード
        ],
        // フォールバック
        [
            'dsn' => 'pgsql:host=localhost;port=5432;dbname=nagano3_db', 
            'user' => 'nagano3_user', 
            'pass' => ''
        ]
    ];
    
    foreach ($configs as $config) {
        try {
            $pdo = new PDO($config['dsn'], $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            return $pdo;
            
        } catch (PDOException $e) {
            error_log("DB接続失敗: " . $e->getMessage());
            continue;
        }
    }
    
    throw new Exception('データベース接続に失敗しました');
}

/**
 * 統合データ取得クラス（統合モーダルと同等機能）
 */
class IntegratedDataManager {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * 商品データ統合取得（統合モーダル準拠）
     */
    public function getProductData($productId) {
        $sql = "SELECT 
                    id, 
                    source_item_id, 
                    active_title,
                    price_jpy,
                    active_image_url,
                    scraped_yahoo_data,
                    approval_status,
                    created_at
                FROM yahoo_scraped_products 
                WHERE id = ?";
                
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$productId]);
        $product = $stmt->fetch();
        
        if (!$product) {
            return null;
        }
        
        // scraped_yahoo_dataからの詳細情報取得
        $yahoo_data = json_decode($product['scraped_yahoo_data'], true) ?: [];
        
        // 画像配列の取得（統合モーダル方式）
        $images = [];
        if (isset($yahoo_data['validation_info']['image']['all_images'])) {
            $images = $yahoo_data['validation_info']['image']['all_images'];
        } elseif (isset($yahoo_data['all_images'])) {
            $images = $yahoo_data['all_images'];
        } elseif ($product['active_image_url']) {
            $images = [$product['active_image_url']];
        }
        
        return [
            'id' => $product['id'],
            'source_item_id' => $product['source_item_id'],
            'title' => $product['active_title'],
            'price_jpy' => $product['price_jpy'],
            'active_image_url' => $product['active_image_url'],
            'all_images' => $images,
            'yahoo_data' => $yahoo_data,
            'approval_status' => $product['approval_status'],
            'scraped_at' => $product['created_at']
        ];
    }
}

/**
 * 承認キュー取得（統合モーダル対応版）
 */
function getApprovalQueue($pdo, $params = []) {
    $where = ['scraped_yahoo_data IS NOT NULL'];
    $bindings = [];
    
    // 承認ステータスフィルター
    if (!empty($params['status'])) {
        $where[] = 'COALESCE(approval_status, \'pending\') = ?';
        $bindings[] = $params['status'];
    }
    
    // 価格フィルター
    if (!empty($params['min_price']) || !empty($params['max_price'])) {
        if (!empty($params['min_price'])) {
            $where[] = 'price_jpy >= ?';
            $bindings[] = (int)$params['min_price'];
        }
        if (!empty($params['max_price'])) {
            $where[] = 'price_jpy <= ?';
            $bindings[] = (int)$params['max_price'];
        }
    }
    
    // タイトル検索
    if (!empty($params['search'])) {
        $where[] = "active_title ILIKE ?";
        $bindings[] = '%' . $params['search'] . '%';
    }
    
    // ページネーション
    $limit = min((int)($params['limit'] ?? 50), 100);
    $offset = ((int)($params['page'] ?? 1) - 1) * $limit;
    
    $sql = "
        SELECT 
            id,
            source_item_id,
            active_title,
            price_jpy,
            active_image_url,
            scraped_yahoo_data,
            COALESCE(approval_status, 'pending') as approval_status,
            created_at
        FROM yahoo_scraped_products 
        WHERE " . implode(' AND ', $where) . "
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $bindings[] = $limit;
    $bindings[] = $offset;
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($bindings);
        $results = $stmt->fetchAll();
        
        // データを統合モーダル形式に変換
        $manager = new IntegratedDataManager($pdo);
        $products = [];
        
        foreach ($results as $row) {
            $yahoo_data = json_decode($row['scraped_yahoo_data'], true) ?: [];
            
            // 画像配列の取得
            $images = [];
            if (isset($yahoo_data['validation_info']['image']['all_images'])) {
                $images = $yahoo_data['validation_info']['image']['all_images'];
            } elseif (isset($yahoo_data['all_images'])) {
                $images = $yahoo_data['all_images'];
            } elseif ($row['active_image_url']) {
                $images = [$row['active_image_url']];
            }
            
            // Yahoo データから詳細情報を取得
            $bids = 0;
            $time_left = '不明';
            $seller = '';
            $category = '';
            $condition = '';
            
            if (isset($yahoo_data['bids'])) {
                $bids = (int)$yahoo_data['bids'];
            }
            if (isset($yahoo_data['time_left'])) {
                $time_left = $yahoo_data['time_left'];
            }
            if (isset($yahoo_data['seller'])) {
                $seller = $yahoo_data['seller'];
            }
            if (isset($yahoo_data['category'])) {
                $category = $yahoo_data['category'];
            }
            if (isset($yahoo_data['condition'])) {
                $condition = $yahoo_data['condition'];
            }
            
            // AI信頼度スコアの計算
            $ai_confidence_score = 75; // デフォルト
            if ($row['price_jpy'] > 50000) {
                $ai_confidence_score = 95;
            } elseif ($row['price_jpy'] > 20000) {
                $ai_confidence_score = 85;
            }
            
            $products[] = [
                'id' => $row['id'],
                'item_id' => $row['source_item_id'],
                'title' => $row['active_title'] ?: 'タイトル不明',
                'active_title' => $row['active_title'],
                'current_price' => (int)$row['price_jpy'],
                'price_jpy' => (int)$row['price_jpy'],
                'image' => $images[0] ?? 'https://via.placeholder.com/350x250?text=画像なし',
                'active_image_url' => $row['active_image_url'],
                'all_images' => $images,
                'bids' => $bids,
                'time_left' => $time_left,
                'seller' => $seller,
                'category' => $category,
                'condition_info' => $condition,
                'ai_confidence_score' => $ai_confidence_score,
                'approval_status' => $row['approval_status'],
                'scraped_at' => $row['created_at'],
                'url' => isset($yahoo_data['url']) ? $yahoo_data['url'] : ''
            ];
        }
        
        return $products;
        
    } catch (Exception $e) {
        error_log("承認キュー取得エラー: " . $e->getMessage());
        throw new Exception("データ取得に失敗しました: " . $e->getMessage());
    }
}

/**
 * 統計情報取得（統合モーダル対応）
 */
function getStatistics($pdo) {
    try {
        $sql = "
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN COALESCE(approval_status, 'pending') = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved,
                COUNT(CASE WHEN approval_status = 'rejected' THEN 1 END) as rejected,
                COUNT(CASE WHEN price_jpy >= 50000 THEN 1 END) as high_value,
                AVG(price_jpy) as avg_price
            FROM yahoo_scraped_products
            WHERE scraped_yahoo_data IS NOT NULL
        ";
        
        $stmt = $pdo->query($sql);
        $result = $stmt->fetch();
        
        return [
            'total' => (int)$result['total'],
            'pending' => (int)$result['pending'],
            'approved' => (int)$result['approved'],
            'rejected' => (int)$result['rejected'],
            'ai_recommended' => (int)$result['high_value'],
            'avg_price' => (float)$result['avg_price']
        ];
        
    } catch (Exception $e) {
        error_log("統計取得エラー: " . $e->getMessage());
        return [
            'total' => 0,
            'pending' => 0,
            'approved' => 0,
            'rejected' => 0,
            'ai_recommended' => 0,
            'avg_price' => 0
        ];
    }
}

/**
 * 商品承認処理（統合モーダル対応）
 */
function approveProducts($pdo, $productIds, $approvedBy = 'web_user') {
    if (empty($productIds)) {
        throw new Exception('商品IDが指定されていません');
    }
    
    // approval_statusカラムの存在確認・追加
    try {
        $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'approval_status'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE yahoo_scraped_products ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'");
        }
    } catch (Exception $e) {
        error_log("カラム確認エラー: " . $e->getMessage());
    }
    
    $pdo->beginTransaction();
    try {
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        $updateSql = "
            UPDATE yahoo_scraped_products 
            SET approval_status = 'approved',
                updated_at = CURRENT_TIMESTAMP
            WHERE id IN ($placeholders)
        ";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute($productIds);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => count($productIds) . '件の商品を承認しました',
            'updated_count' => count($productIds)
        ];
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

/**
 * 商品否認処理（統合モーダル対応）
 */
function rejectProducts($pdo, $productIds, $reason = '手動否認', $rejectedBy = 'web_user') {
    if (empty($productIds)) {
        throw new Exception('商品IDが指定されていません');
    }
    
    // approval_statusカラムの存在確認・追加
    try {
        $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'approval_status'");
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE yahoo_scraped_products ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending'");
        }
    } catch (Exception $e) {
        error_log("カラム確認エラー: " . $e->getMessage());
    }
    
    $pdo->beginTransaction();
    try {
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        $updateSql = "
            UPDATE yahoo_scraped_products 
            SET approval_status = 'rejected',
                updated_at = CURRENT_TIMESTAMP
            WHERE id IN ($placeholders)
        ";
        $stmt = $pdo->prepare($updateSql);
        $stmt->execute($productIds);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => count($productIds) . '件の商品を否認しました',
            'updated_count' => count($productIds)
        ];
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

// メイン処理
try {
    $pdo = getDatabaseConnection();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? '';
    
    if ($method === 'GET') {
        switch ($action) {
            case 'get_approval_queue':
                $products = getApprovalQueue($pdo, $_GET);
                sendResponse($products, true, count($products) . '件の統合データを取得しました');
                break;
                
            case 'get_statistics':
                $stats = getStatistics($pdo);
                sendResponse($stats, true, '統計情報を取得しました');
                break;
                
            case 'health_check':
                sendResponse([
                    'status' => 'healthy',
                    'database' => 'nagano3_db connected (integrated)',
                    'timestamp' => date('Y-m-d H:i:s'),
                    'features' => [
                        'multi_image_support' => true,
                        'active_image_url' => true,
                        'yahoo_data_integration' => true,
                        'approval_workflow' => true
                    ]
                ], true, '統合モーダル対応システムが正常に動作しています');
                break;
                
            default:
                $products = getApprovalQueue($pdo, ['limit' => 20]);
                sendResponse($products, true, '統合データのデフォルト表示を取得しました');
        }
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendResponse(null, false, '無効なJSONデータです', 400);
        }
        
        switch ($input['action'] ?? '') {
            case 'approve_products':
                $productIds = $input['product_ids'] ?? [];
                $approvedBy = $input['approved_by'] ?? 'web_user';
                $result = approveProducts($pdo, $productIds, $approvedBy);
                sendResponse($result, $result['success'], $result['message']);
                break;
                
            case 'reject_products':
                $productIds = $input['product_ids'] ?? [];
                $reason = $input['reason'] ?? '手動否認';
                $rejectedBy = $input['rejected_by'] ?? 'web_user';
                $result = rejectProducts($pdo, $productIds, $reason, $rejectedBy);
                sendResponse($result, $result['success'], $result['message']);
                break;
                
            default:
                sendResponse(null, false, '無効なアクションです', 400);
        }
    }
    
} catch (Exception $e) {
    error_log("統合システムエラー: " . $e->getMessage());
    sendResponse(null, false, 'システムエラー: ' . $e->getMessage(), 500);
}
?>