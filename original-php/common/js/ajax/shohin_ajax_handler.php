<?php
/**
 * 📦 商品管理モジュール Ajax処理
 * ファイル: modules/shohin/ajax_handler.php
 * 
 * ✅ 商品CRUD操作
 * ✅ 在庫管理連携
 * ✅ 価格管理・更新
 * ✅ カテゴリ管理
 * ✅ 一括処理機能
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    http_response_code(403);
    exit('Direct access forbidden');
}

// セッション確保
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// =====================================
// 🛡️ セキュリティ・初期設定
// =====================================

function validateCSRFToken() {
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return !empty($token) && hash_equals($_SESSION['csrf_token'], $token);
}

function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// =====================================
// 📁 データファイル管理
// =====================================

function getDataDir() {
    $dataDir = __DIR__ . '/../../data/shohin';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    return $dataDir;
}

function getProductsFile() {
    return getDataDir() . '/products.json';
}

function getCategoriesFile() {
    return getDataDir() . '/categories.json';
}

function loadProducts() {
    $file = getProductsFile();
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveProducts($products) {
    $file = getProductsFile();
    $dataDir = dirname($file);
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    $json = json_encode($products, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($file, $json) !== false;
}

// =====================================
// 🎯 メインAjax処理振り分け
// =====================================

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !validateCSRFToken()) {
        throw new Exception('CSRF token validation failed');
    }
    
    $response = handleShohinAction($action);
    return $response;
    
} catch (Exception $e) {
    error_log("商品管理Ajax処理エラー: " . $e->getMessage());
    return [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => defined('DEBUG_MODE') && DEBUG_MODE ? [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ] : null
    ];
}

// =====================================
// 📦 商品管理アクション処理
// =====================================

function handleShohinAction($action) {
    switch ($action) {
        // === 商品CRUD ===
        case 'get_products':
            return handleGetProducts();
        case 'get_product_details':
            return handleGetProductDetails();
        case 'create_product':
            return handleCreateProduct();
        case 'update_product':
            return handleUpdateProduct();
        case 'delete_product':
            return handleDeleteProduct();
        case 'search_products':
            return handleSearchProducts();
        
        // === 在庫管理 ===
        case 'update_inventory':
            return handleUpdateInventory();
        case 'bulk_update_stock':
            return handleBulkUpdateStock();
        case 'get_low_stock':
            return handleGetLowStock();
        case 'set_reorder_point':
            return handleSetReorderPoint();
        
        // === 価格管理 ===
        case 'update_pricing':
            return handleUpdatePricing();
        case 'bulk_price_update':
            return handleBulkPriceUpdate();
        case 'price_history':
            return handlePriceHistory();
        case 'calculate_margin':
            return handleCalculateMargin();
        
        // === カテゴリ管理 ===
        case 'get_categories':
            return handleGetCategories();
        case 'create_category':
            return handleCreateCategory();
        case 'update_category':
            return handleUpdateCategory();
        case 'delete_category':
            return handleDeleteCategory();
        
        // === インポート・エクスポート ===
        case 'import_products':
            return handleImportProducts();
        case 'export_products':
            return handleExportProducts();
        case 'validate_import':
            return handleValidateImport();
        
        // === 統計・レポート ===
        case 'get_statistics':
            return handleGetStatistics();
        case 'sales_report':
            return handleSalesReport();
        case 'inventory_report':
            return handleInventoryReport();
        case 'health_check':
            return handleHealthCheck();
        
        default:
            throw new Exception("未知のアクション: {$action}");
    }
}

// =====================================
// 📋 商品CRUD操作
// =====================================

function handleGetProducts() {
    try {
        $products = loadProducts();
        $page = intval($_GET['page'] ?? 1);
        $pageSize = intval($_GET['page_size'] ?? 25);
        $category = $_GET['category'] ?? '';
        $status = $_GET['status'] ?? '';
        $search = $_GET['search'] ?? '';
        $sortBy = $_GET['sort_by'] ?? 'name';
        $sortOrder = $_GET['sort_order'] ?? 'asc';
        
        // フィルタリング
        $filteredProducts = array_filter($products, function($product) use ($category, $status, $search) {
            $matchCategory = empty($category) || $product['category'] === $category;
            $matchStatus = empty($status) || $product['status'] === $status;
            $matchSearch = empty($search) || 
                          stripos($product['name'], $search) !== false ||
                          stripos($product['sku'], $search) !== false ||
                          stripos($product['description'], $search) !== false;
            
            return $matchCategory && $matchStatus && $matchSearch;
        });
        
        // ソート
        usort($filteredProducts, function($a, $b) use ($sortBy, $sortOrder) {
            $valueA = $a[$sortBy] ?? '';
            $valueB = $b[$sortBy] ?? '';
            
            if (is_numeric($valueA) && is_numeric($valueB)) {
                $result = $valueA - $valueB;
            } else {
                $result = strcmp($valueA, $valueB);
            }
            
            return $sortOrder === 'desc' ? -$result : $result;
        });
        
        // ページネーション
        $totalItems = count($filteredProducts);
        $totalPages = ceil($totalItems / $pageSize);
        $offset = ($page - 1) * $pageSize;
        $pagedProducts = array_slice($filteredProducts, $offset, $pageSize);
        
        // 追加情報計算
        foreach ($pagedProducts as &$product) {
            $product['stock_status'] = calculateStockStatus($product);
            $product['profit_margin'] = calculateProfitMargin($product);
            $product['days_since_updated'] = calculateDaysSince($product['updated_at'] ?? $product['created_at']);
        }
        
        return [
            'success' => true,
            'data' => [
                'products' => array_values($pagedProducts),
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'page_size' => $pageSize
                ],
                'summary' => [
                    'total_products' => $totalItems,
                    'total_value' => array_sum(array_map(function($p) {
                        return ($p['price'] ?? 0) * ($p['stock_quantity'] ?? 0);
                    }, $filteredProducts)),
                    'low_stock_count' => count(array_filter($filteredProducts, function($p) {
                        return ($p['stock_quantity'] ?? 0) <= ($p['reorder_point'] ?? 0);
                    }))
                ]
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("商品一覧取得エラー: " . $e->getMessage());
    }
}

function handleCreateProduct() {
    try {
        $requiredFields = ['name', 'sku', 'price', 'category'];
        
        foreach ($requiredFields as $field) {
            if (empty($_POST[$field])) {
                throw new Exception("必須項目が入力されていません: {$field}");
            }
        }
        
        $products = loadProducts();
        
        // SKU重複チェック
        foreach ($products as $product) {
            if ($product['sku'] === $_POST['sku']) {
                throw new Exception('同じSKUの商品が既に存在します');
            }
        }
        
        $newProduct = [
            'id' => generateUniqueId(),
            'name' => sanitizeInput($_POST['name']),
            'sku' => sanitizeInput($_POST['sku']),
            'description' => sanitizeInput($_POST['description'] ?? ''),
            'category' => sanitizeInput($_POST['category']),
            'subcategory' => sanitizeInput($_POST['subcategory'] ?? ''),
            'price' => floatval($_POST['price']),
            'cost' => floatval($_POST['cost'] ?? 0),
            'currency' => sanitizeInput($_POST['currency'] ?? 'JPY'),
            'stock_quantity' => intval($_POST['stock_quantity'] ?? 0),
            'reorder_point' => intval($_POST['reorder_point'] ?? 10),
            'max_stock' => intval($_POST['max_stock'] ?? 100),
            'weight' => floatval($_POST['weight'] ?? 0),
            'dimensions' => sanitizeInput($_POST['dimensions'] ?? ''),
            'status' => sanitizeInput($_POST['status'] ?? 'active'),
            'tags' => explode(',', sanitizeInput($_POST['tags'] ?? '')),
            'images' => json_decode($_POST['images'] ?? '[]', true),
            'attributes' => json_decode($_POST['attributes'] ?? '{}', true),
            'supplier_info' => [
                'supplier_name' => sanitizeInput($_POST['supplier_name'] ?? ''),
                'supplier_code' => sanitizeInput($_POST['supplier_code'] ?? ''),
                'lead_time' => intval($_POST['lead_time'] ?? 0)
            ],
            'seo' => [
                'meta_title' => sanitizeInput($_POST['meta_title'] ?? ''),
                'meta_description' => sanitizeInput($_POST['meta_description'] ?? ''),
                'keywords' => explode(',', sanitizeInput($_POST['keywords'] ?? ''))
            ],
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
            'created_by' => $_SESSION['user_id'] ?? 'system'
        ];
        
        // データ検証
        $validation = validateProductData($newProduct);
        if (!$validation['valid']) {
            throw new Exception('入力データに問題があります: ' . implode(', ', $validation['errors']));
        }
        
        $products[] = $newProduct;
        
        if (!saveProducts($products)) {
            throw new Exception('商品データの保存に失敗しました');
        }
        
        // 統計更新
        updateStatistics(['new_products' => 1]);
        
        return [
            'success' => true,
            'message' => '商品を作成しました',
            'data' => $newProduct
        ];
        
    } catch (Exception $e) {
        throw new Exception("商品作成エラー: " . $e->getMessage());
    }
}

function handleUpdateProduct() {
    try {
        $productId = $_POST['id'] ?? '';
        if (empty($productId)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        $products = loadProducts();
        $productIndex = findProductIndex($products, $productId);
        
        if ($productIndex === false) {
            throw new Exception('指定された商品が見つかりません');
        }
        
        // 更新可能フィールド
        $updateableFields = [
            'name', 'description', 'category', 'subcategory', 'price', 'cost',
            'stock_quantity', 'reorder_point', 'max_stock', 'weight', 'dimensions',
            'status', 'tags', 'images', 'attributes', 'supplier_info', 'seo'
        ];
        
        foreach ($updateableFields as $field) {
            if (isset($_POST[$field])) {
                if (in_array($field, ['tags', 'keywords'])) {
                    $products[$productIndex][$field] = explode(',', sanitizeInput($_POST[$field]));
                } elseif (in_array($field, ['images', 'attributes', 'supplier_info', 'seo'])) {
                    $products[$productIndex][$field] = json_decode($_POST[$field], true) ?: [];
                } elseif (in_array($field, ['price', 'cost', 'weight'])) {
                    $products[$productIndex][$field] = floatval($_POST[$field]);
                } elseif (in_array($field, ['stock_quantity', 'reorder_point', 'max_stock'])) {
                    $products[$productIndex][$field] = intval($_POST[$field]);
                } else {
                    $products[$productIndex][$field] = sanitizeInput($_POST[$field]);
                }
            }
        }
        
        $products[$productIndex]['updated_at'] = date('Y-m-d H:i:s');
        $products[$productIndex]['updated_by'] = $_SESSION['user_id'] ?? 'system';
        
        // 価格変更履歴記録
        if (isset($_POST['price']) && $_POST['price'] != $products[$productIndex]['price']) {
            recordPriceHistory($productId, $products[$productIndex]['price'], $_POST['price']);
        }
        
        if (!saveProducts($products)) {
            throw new Exception('商品データの更新に失敗しました');
        }
        
        return [
            'success' => true,
            'message' => '商品を更新しました'
        ];
        
    } catch (Exception $e) {
        throw new Exception("商品更新エラー: " . $e->getMessage());
    }
}

function handleDeleteProduct() {
    try {
        $productId = $_POST['id'] ?? '';
        if (empty($productId)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        $products = loadProducts();
        $productIndex = findProductIndex($products, $productId);
        
        if ($productIndex === false) {
            throw new Exception('指定された商品が見つかりません');
        }
        
        $deletedProduct = $products[$productIndex];
        
        // ソフト削除（ステータス変更）
        $softDelete = $_POST['soft_delete'] ?? true;
        
        if ($softDelete) {
            $products[$productIndex]['status'] = 'deleted';
            $products[$productIndex]['deleted_at'] = date('Y-m-d H:i:s');
            $products[$productIndex]['deleted_by'] = $_SESSION['user_id'] ?? 'system';
        } else {
            unset($products[$productIndex]);
            $products = array_values($products);
        }
        
        if (!saveProducts($products)) {
            throw new Exception('商品の削除に失敗しました');
        }
        
        return [
            'success' => true,
            'message' => $softDelete ? '商品を無効化しました' : '商品を削除しました',
            'data' => [
                'deleted_product_name' => $deletedProduct['name'],
                'soft_delete' => $softDelete,
                'remaining_count' => count($products)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("商品削除エラー: " . $e->getMessage());
    }
}

// =====================================
// 📊 在庫管理機能
// =====================================

function handleUpdateInventory() {
    try {
        $productId = $_POST['product_id'] ?? '';
        $newQuantity = intval($_POST['quantity'] ?? 0);
        $adjustmentType = $_POST['adjustment_type'] ?? 'set'; // set, add, subtract
        $reason = sanitizeInput($_POST['reason'] ?? '');
        
        if (empty($productId)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        $products = loadProducts();
        $productIndex = findProductIndex($products, $productId);
        
        if ($productIndex === false) {
            throw new Exception('指定された商品が見つかりません');
        }
        
        $oldQuantity = $products[$productIndex]['stock_quantity'] ?? 0;
        
        switch ($adjustmentType) {
            case 'set':
                $finalQuantity = $newQuantity;
                break;
            case 'add':
                $finalQuantity = $oldQuantity + $newQuantity;
                break;
            case 'subtract':
                $finalQuantity = $oldQuantity - $newQuantity;
                break;
            default:
                throw new Exception('無効な調整タイプです');
        }
        
        if ($finalQuantity < 0) {
            throw new Exception('在庫数量を負の値にすることはできません');
        }
        
        $products[$productIndex]['stock_quantity'] = $finalQuantity;
        $products[$productIndex]['last_stock_update'] = date('Y-m-d H:i:s');
        
        if (!saveProducts($products)) {
            throw new Exception('在庫更新の保存に失敗しました');
        }
        
        // 在庫変動履歴記録
        recordStockHistory($productId, $oldQuantity, $finalQuantity, $adjustmentType, $reason);
        
        return [
            'success' => true,
            'message' => '在庫を更新しました',
            'data' => [
                'product_id' => $productId,
                'old_quantity' => $oldQuantity,
                'new_quantity' => $finalQuantity,
                'adjustment' => $finalQuantity - $oldQuantity,
                'stock_status' => calculateStockStatus($products[$productIndex])
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("在庫更新エラー: " . $e->getMessage());
    }
}

function handleGetLowStock() {
    try {
        $products = loadProducts();
        $threshold = intval($_GET['threshold'] ?? 0);
        
        $lowStockProducts = array_filter($products, function($product) use ($threshold) {
            $currentStock = $product['stock_quantity'] ?? 0;
            $reorderPoint = $product['reorder_point'] ?? ($threshold > 0 ? $threshold : 10);
            
            return $currentStock <= $reorderPoint && $product['status'] === 'active';
        });
        
        // 緊急度でソート
        usort($lowStockProducts, function($a, $b) {
            $urgencyA = calculateStockUrgency($a);
            $urgencyB = calculateStockUrgency($b);
            return $urgencyB - $urgencyA;
        });
        
        return [
            'success' => true,
            'data' => [
                'low_stock_products' => array_values($lowStockProducts),
                'count' => count($lowStockProducts),
                'total_value_at_risk' => array_sum(array_map(function($p) {
                    return ($p['price'] ?? 0) * ($p['stock_quantity'] ?? 0);
                }, $lowStockProducts))
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("低在庫商品取得エラー: " . $e->getMessage());
    }
}

// =====================================
// 💰 価格管理機能
// =====================================

function handleUpdatePricing() {
    try {
        $productId = $_POST['product_id'] ?? '';
        $newPrice = floatval($_POST['price'] ?? 0);
        $newCost = floatval($_POST['cost'] ?? 0);
        $reason = sanitizeInput($_POST['reason'] ?? '');
        
        if (empty($productId)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        if ($newPrice <= 0) {
            throw new Exception('有効な価格を入力してください');
        }
        
        $products = loadProducts();
        $productIndex = findProductIndex($products, $productId);
        
        if ($productIndex === false) {
            throw new Exception('指定された商品が見つかりません');
        }
        
        $oldPrice = $products[$productIndex]['price'] ?? 0;
        $