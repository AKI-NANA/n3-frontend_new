<?php
/**
 * データ表示用API - 修正版（エラー対応）
 * 不足テーブル・カラムに対応したセーフバージョン
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
            
            // テーブル存在確認
            if (!tableExists($pdo, 'ebay_categories')) {
                // ダミーデータを返す
                $response = [
                    'success' => true,
                    'action' => 'get_categories',
                    'categories' => generateDummyCategories(),
                    'count' => 5,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'note' => 'ダミーデータ表示中（ebay_categoriesテーブルが存在しません）'
                ];
                break;
            }
            
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
            
            // テーブル存在確認
            if (!tableExists($pdo, 'category_required_fields')) {
                $response = [
                    'success' => true,
                    'action' => 'get_requirements',
                    'requirements' => generateDummyRequirements(),
                    'count' => 8,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'note' => 'ダミーデータ表示中（category_required_fieldsテーブルが存在しません）'
                ];
                break;
            }
            
            $sql = "SELECT 
                        crf.category_id,
                        COALESCE(ec.category_name, crf.category_id) as category_name,
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
            
            // テーブル存在確認とカラム確認
            if (!tableExists($pdo, 'ebay_category_fees')) {
                $response = [
                    'success' => true,
                    'action' => 'get_fees',
                    'fees' => generateDummyFees(),
                    'count' => 6,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'note' => 'ダミーデータ表示中（ebay_category_feesテーブルが存在しません）'
                ];
                break;
            }
            
            // 利用可能なカラムを動的に取得
            $availableColumns = getTableColumns($pdo, 'ebay_category_fees');
            
            $selectColumns = [
                'ecf.category_id',
                'COALESCE(ec.category_name, ecf.category_id) as category_name'
            ];
            
            // 存在するカラムのみ追加
            if (in_array('listing_type', $availableColumns)) {
                $selectColumns[] = 'ecf.listing_type';
            } else {
                $selectColumns[] = "'fixed_price' as listing_type";
            }
            
            if (in_array('insertion_fee', $availableColumns)) {
                $selectColumns[] = 'ecf.insertion_fee';
            } else {
                $selectColumns[] = '0.30 as insertion_fee';
            }
            
            if (in_array('final_value_fee_percent', $availableColumns)) {
                $selectColumns[] = 'ecf.final_value_fee_percent';
            } else {
                $selectColumns[] = '13.25 as final_value_fee_percent';
            }
            
            if (in_array('final_value_fee_max', $availableColumns)) {
                $selectColumns[] = 'ecf.final_value_fee_max';
            } else {
                $selectColumns[] = 'NULL as final_value_fee_max';
            }
            
            if (in_array('store_fee', $availableColumns)) {
                $selectColumns[] = 'ecf.store_fee';
            } else {
                $selectColumns[] = '0.00 as store_fee';
            }
            
            if (in_array('paypal_fee_percent', $availableColumns)) {
                $selectColumns[] = 'ecf.paypal_fee_percent';
            } else {
                $selectColumns[] = '2.90 as paypal_fee_percent';
            }
            
            if (in_array('paypal_fee_fixed', $availableColumns)) {
                $selectColumns[] = 'ecf.paypal_fee_fixed';
            } else {
                $selectColumns[] = '0.30 as paypal_fee_fixed';
            }
            
            if (in_array('fee_group', $availableColumns)) {
                $selectColumns[] = 'ecf.fee_group';
            } else {
                $selectColumns[] = "'General' as fee_group";
            }
            
            if (in_array('updated_at', $availableColumns)) {
                $selectColumns[] = 'ecf.updated_at';
            } else {
                $selectColumns[] = 'NOW() as updated_at';
            }
            
            $sql = "SELECT " . implode(', ', $selectColumns) . "
                    FROM ebay_category_fees ecf
                    LEFT JOIN ebay_categories ec ON ecf.category_id = ec.category_id
                    WHERE " . (in_array('is_active', $availableColumns) ? 'ecf.is_active = TRUE' : '1=1');
            
            $params = [];
            
            // 検索条件追加
            if (!empty($search)) {
                $sql .= " AND (ecf.category_id ILIKE ? OR ec.category_name ILIKE ?)";
                $params[] = "%{$search}%";
                $params[] = "%{$search}%";
            }
            
            $orderByColumn = in_array('final_value_fee_percent', $availableColumns) ? 
                'ecf.final_value_fee_percent DESC' : 'ecf.category_id ASC';
            
            $sql .= " ORDER BY {$orderByColumn}, ecf.category_id ASC LIMIT ?";
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
            
            // yahoo_scraped_products テーブル存在確認
            if (!tableExists($pdo, 'yahoo_scraped_products')) {
                $response = [
                    'success' => true,
                    'action' => 'get_processing_status',
                    'products' => generateDummyProcessingData(),
                    'count' => 5,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'note' => 'ダミーデータ表示中（yahoo_scraped_productsテーブルが存在しません）'
                ];
                break;
            }
            
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

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * テーブル存在確認
 */
function tableExists($pdo, $tableName) {
    try {
        $sql = "SELECT 1 FROM information_schema.tables WHERE table_name = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$tableName]);
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * テーブルのカラム一覧取得
 */
function getTableColumns($pdo, $tableName) {
    try {
        $sql = "SELECT column_name FROM information_schema.columns WHERE table_name = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$tableName]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (Exception $e) {
        return [];
    }
}

/**
 * ダミーカテゴリーデータ生成
 */
function generateDummyCategories() {
    return [
        [
            'category_id' => '293',
            'category_name' => 'Cell Phones & Smartphones',
            'parent_id' => '15032',
            'category_level' => 2,
            'is_leaf' => true,
            'is_active' => true,
            'sort_order' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '625',
            'category_name' => 'Cameras & Photo',
            'parent_id' => '0',
            'category_level' => 1,
            'is_leaf' => false,
            'is_active' => true,
            'sort_order' => 2,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '139973',
            'category_name' => 'Video Games',
            'parent_id' => '1249',
            'category_level' => 2,
            'is_leaf' => true,
            'is_active' => true,
            'sort_order' => 3,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '58058',
            'category_name' => 'Sports Trading Cards',
            'parent_id' => '64482',
            'category_level' => 2,
            'is_leaf' => true,
            'is_active' => true,
            'sort_order' => 4,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '99999',
            'category_name' => 'Other/Unclassified',
            'parent_id' => '0',
            'category_level' => 1,
            'is_leaf' => true,
            'is_active' => true,
            'sort_order' => 999,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]
    ];
}

/**
 * ダミー必須項目データ生成
 */
function generateDummyRequirements() {
    return [
        [
            'category_id' => '293',
            'category_name' => 'Cell Phones & Smartphones',
            'field_name' => 'Brand',
            'field_type' => 'required',
            'field_data_type' => 'enum',
            'possible_values' => ['Apple', 'Samsung', 'Google', 'Sony', 'Other'],
            'default_value' => 'Unknown',
            'sort_order' => 1,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '293',
            'category_name' => 'Cell Phones & Smartphones',
            'field_name' => 'Model',
            'field_type' => 'required',
            'field_data_type' => 'text',
            'possible_values' => null,
            'default_value' => 'Unknown',
            'sort_order' => 2,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '293',
            'category_name' => 'Cell Phones & Smartphones',
            'field_name' => 'Condition',
            'field_type' => 'required',
            'field_data_type' => 'enum',
            'possible_values' => ['New', 'Used', 'Refurbished', 'For parts or not working'],
            'default_value' => 'Used',
            'sort_order' => 5,
            'is_active' => true,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ]
    ];
}

/**
 * ダミー手数料データ生成
 */
function generateDummyFees() {
    return [
        [
            'category_id' => '293',
            'category_name' => 'Cell Phones & Smartphones',
            'listing_type' => 'fixed_price',
            'insertion_fee' => 0.30,
            'final_value_fee_percent' => 12.90,
            'final_value_fee_max' => null,
            'store_fee' => 0.00,
            'paypal_fee_percent' => 2.90,
            'paypal_fee_fixed' => 0.30,
            'fee_group' => 'Electronics',
            'updated_at' => date('Y-m-d H:i:s')
        ],
        [
            'category_id' => '625',
            'category_name' => 'Cameras & Photo',
            'listing_type' => 'fixed_price',
            'insertion_fee' => 0.30,
            'final_value_fee_percent' => 12.35,
            'final_value_fee_max' => null,
            'store_fee' => 0.00,
            'paypal_fee_percent' => 2.90,
            'paypal_fee_fixed' => 0.30,
            'fee_group' => 'Electronics',
            'updated_at' => date('Y-m-d H:i:s')
        ]
    ];
}

/**
 * ダミー処理状況データ生成
 */
function generateDummyProcessingData() {
    return [
        [
            'id' => 1,
            'source_item_id' => 'y123456789',
            'title' => 'iPhone 14 Pro 128GB スペースブラック',
            'price_jpy' => 120000,
            'category_id' => '293',
            'category_name' => 'Cell Phones & Smartphones',
            'confidence' => 95,
            'stage' => 'profit_enhanced',
            'item_specifics' => 'Brand=Apple■Model=iPhone 14 Pro■Color=Space Black',
            'updated_at' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s')
        ],
        [
            'id' => 2,
            'source_item_id' => 'y987654321',
            'title' => 'Canon EOS R6 Mark II ボディ',
            'price_jpy' => 280000,
            'category_id' => '625',
            'category_name' => 'Cameras & Photo',
            'confidence' => 88,
            'stage' => 'basic',
            'item_specifics' => 'Brand=Canon■Type=Mirrorless■Condition=Used',
            'updated_at' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s')
        ]
    ];
}
?>