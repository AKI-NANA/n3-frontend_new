<?php
/**
 * 📦 受注管理モジュール Ajax処理
 * ファイル: modules/juchu_kanri/ajax_handler.php
 * 
 * ✅ 受注データ管理
 * ✅ ステータス更新・追跡
 * ✅ 一括処理機能
 * ✅ 利益計算・分析
 * ✅ エクスポート・インポート
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

// CSRFトークン確認
function validateCSRFToken() {
    $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    
    return !empty($token) && hash_equals($_SESSION['csrf_token'], $token);
}

// 入力サニタイズ
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// 日付検証
function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

// 数値検証
function validateNumber($value, $min = null, $max = null) {
    if (!is_numeric($value)) {
        return false;
    }
    
    $num = floatval($value);
    
    if ($min !== null && $num < $min) {
        return false;
    }
    
    if ($max !== null && $num > $max) {
        return false;
    }
    
    return true;
}

// =====================================
// 📁 データファイル管理
// =====================================

function getDataDir() {
    $dataDir = __DIR__ . '/../../data/juchu_kanri';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    return $dataDir;
}

function getOrdersFile() {
    return getDataDir() . '/orders.json';
}

function getCustomersFile() {
    return getDataDir() . '/customers.json';
}

function getStatisticsFile() {
    return getDataDir() . '/statistics.json';
}

function getShippingFile() {
    return getDataDir() . '/shipping.json';
}

function loadOrders() {
    $file = getOrdersFile();
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveOrders($orders) {
    $file = getOrdersFile();
    $dataDir = dirname($file);
    
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    
    $json = json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($file, $json) !== false;
}

function loadCustomers() {
    $file = getCustomersFile();
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveCustomers($customers) {
    $file = getCustomersFile();
    $json = json_encode($customers, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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
    
    // CSRF確認（GET以外）
    if ($_SERVER['REQUEST_METHOD'] !== 'GET' && !validateCSRFToken()) {
        throw new Exception('CSRF token validation failed');
    }
    
    $response = handleJuchuKanriAction($action);
    
    return $response;
    
} catch (Exception $e) {
    error_log("受注管理Ajax処理エラー: " . $e->getMessage());
    
    return [
        'success' => false,
        'error' => $e->getMessage(),
        'debug_info' => defined('DEBUG_MODE') && DEBUG_MODE ? [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ] : null
    ];
}

// =====================================
// 📦 受注管理アクション処理
// =====================================

function handleJuchuKanriAction($action) {
    switch ($action) {
        // === 受注データ管理 ===
        case 'get_orders':
            return handleGetOrders();
        case 'get_order_details':
            return handleGetOrderDetails();
        case 'create_order':
            return handleCreateOrder();
        case 'update_order':
            return handleUpdateOrder();
        case 'delete_order':
            return handleDeleteOrder();
        case 'search_orders':
            return handleSearchOrders();
        
        // === ステータス管理 ===
        case 'update_order_status':
            return handleUpdateOrderStatus();
        case 'bulk_update_orders':
            return handleBulkUpdateOrders();
        case 'get_status_history':
            return handleGetStatusHistory();
        case 'cancel_order':
            return handleCancelOrder();
        
        // === 配送管理 ===
        case 'update_shipping_info':
            return handleUpdateShippingInfo();
        case 'get_shipping_status':
            return handleGetShippingStatus();
        case 'bulk_ship_orders':
            return handleBulkShipOrders();
        case 'print_shipping_labels':
            return handlePrintShippingLabels();
        
        // === 顧客管理 ===
        case 'get_customers':
            return handleGetCustomers();
        case 'get_customer_details':
            return handleGetCustomerDetails();
        case 'update_customer':
            return handleUpdateCustomer();
        case 'get_customer_orders':
            return handleGetCustomerOrders();
        
        // === 利益分析 ===
        case 'calculate_profit':
            return handleCalculateProfit();
        case 'get_profit_analysis':
            return handleGetProfitAnalysis();
        case 'update_cost_data':
            return handleUpdateCostData();
        case 'generate_profit_report':
            return handleGenerateProfitReport();
        
        // === インポート・エクスポート ===
        case 'export_orders':
            return handleExportOrders();
        case 'import_orders':
            return handleImportOrders();
        case 'export_customers':
            return handleExportCustomers();
        case 'validate_import_data':
            return handleValidateImportData();
        
        // === 統計・レポート ===
        case 'get_statistics':
            return handleGetStatistics();
        case 'get_daily_summary':
            return handleGetDailySummary();
        case 'get_monthly_report':
            return handleGetMonthlyReport();
        case 'health_check':
            return handleHealthCheck();
        
        default:
            throw new Exception("未知のアクション: {$action}");
    }
}

// =====================================
// 📋 受注データ管理機能
// =====================================

/**
 * 受注一覧取得
 */
function handleGetOrders() {
    try {
        $orders = loadOrders();
        $page = intval($_GET['page'] ?? 1);
        $pageSize = intval($_GET['page_size'] ?? 25);
        $status = $_GET['status'] ?? '';
        $dateFrom = $_GET['date_from'] ?? '';
        $dateTo = $_GET['date_to'] ?? '';
        $search = $_GET['search'] ?? '';
        $sortBy = $_GET['sort_by'] ?? 'order_date';
        $sortOrder = $_GET['sort_order'] ?? 'desc';
        
        // フィルタリング
        $filteredOrders = array_filter($orders, function($order) use ($status, $dateFrom, $dateTo, $search) {
            $matchStatus = empty($status) || $order['status'] === $status;
            $matchDateFrom = empty($dateFrom) || $order['order_date'] >= $dateFrom;
            $matchDateTo = empty($dateTo) || $order['order_date'] <= $dateTo;
            $matchSearch = empty($search) || 
                          stripos($order['order_number'], $search) !== false ||
                          stripos($order['customer_name'], $search) !== false ||
                          stripos($order['customer_email'], $search) !== false;
            
            return $matchStatus && $matchDateFrom && $matchDateTo && $matchSearch;
        });
        
        // ソート
        usort($filteredOrders, function($a, $b) use ($sortBy, $sortOrder) {
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
        $totalItems = count($filteredOrders);
        $totalPages = ceil($totalItems / $pageSize);
        $offset = ($page - 1) * $pageSize;
        $pagedOrders = array_slice($filteredOrders, $offset, $pageSize);
        
        // 追加情報計算
        foreach ($pagedOrders as &$order) {
            $order['total_profit'] = calculateOrderProfit($order);
            $order['profit_margin'] = calculateProfitMargin($order);
            $order['days_since_order'] = (time() - strtotime($order['order_date'])) / (60 * 60 * 24);
            $order['urgency_level'] = calculateUrgencyLevel($order);
        }
        
        return [
            'success' => true,
            'data' => [
                'orders' => array_values($pagedOrders),
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'page_size' => $pageSize
                ],
                'summary' => [
                    'total_orders' => $totalItems,
                    'total_amount' => array_sum(array_column($filteredOrders, 'total_amount')),
                    'average_order_value' => $totalItems > 0 ? array_sum(array_column($filteredOrders, 'total_amount')) / $totalItems : 0
                ]
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("受注一覧取得エラー: " . $e->getMessage());
    }
}

/**
 * 受注詳細取得
 */
function handleGetOrderDetails() {
    try {
        $orderId = $_GET['order_id'] ?? '';
        if (empty($orderId)) {
            throw new Exception('受注IDが指定されていません');
        }
        
        $orders = loadOrders();
        $order = findOrderById($orders, $orderId);
        
        if (!$order) {
            throw new Exception('指定された受注が見つかりません');
        }
        
        // 詳細情報追加
        $order['profit_analysis'] = calculateDetailedProfitAnalysis($order);
        $order['status_history'] = getOrderStatusHistory($orderId);
        $order['shipping_info'] = getOrderShippingInfo($orderId);
        $order['customer_info'] = getCustomerInfo($order['customer_id'] ?? '');
        
        return [
            'success' => true,
            'data' => $order
        ];
        
    } catch (Exception $e) {
        throw new Exception("受注詳細取得エラー: " . $e->getMessage());
    }
}

/**
 * 受注作成
 */
function handleCreateOrder() {
    try {
        $requiredFields = ['customer_name', 'customer_email', 'items', 'total_amount'];
        
        foreach ($requiredFields as $field) {
            if (empty($_POST[$field])) {
                throw new Exception("必須項目が入力されていません: {$field}");
            }
        }
        
        $orders = loadOrders();
        
        // 新しい受注データ作成
        $newOrder = [
            'id' => generateUniqueId(),
            'order_number' => generateOrderNumber(),
            'customer_name' => sanitizeInput($_POST['customer_name']),
            'customer_email' => sanitizeInput($_POST['customer_email']),
            'customer_phone' => sanitizeInput($_POST['customer_phone'] ?? ''),
            'customer_address' => sanitizeInput($_POST['customer_address'] ?? ''),
            'items' => validateAndSanitizeItems($_POST['items']),
            'total_amount' => floatval($_POST['total_amount']),
            'tax_amount' => floatval($_POST['tax_amount'] ?? 0),
            'shipping_fee' => floatval($_POST['shipping_fee'] ?? 0),
            'discount_amount' => floatval($_POST['discount_amount'] ?? 0),
            'payment_method' => sanitizeInput($_POST['payment_method'] ?? ''),
            'payment_status' => 'pending',
            'status' => 'received',
            'order_date' => date('Y-m-d H:i:s'),
            'shipping_method' => sanitizeInput($_POST['shipping_method'] ?? ''),
            'notes' => sanitizeInput($_POST['notes'] ?? ''),
            'source' => sanitizeInput($_POST['source'] ?? 'manual'),
            'created_by' => $_SESSION['user_id'] ?? 'system',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // データ検証
        $validation = validateOrderData($newOrder);
        if (!$validation['valid']) {
            throw new Exception('入力データに問題があります: ' . implode(', ', $validation['errors']));
        }
        
        $orders[] = $newOrder;
        
        if (!saveOrders($orders)) {
            throw new Exception('受注データの保存に失敗しました');
        }
        
        // 顧客データ更新
        updateCustomerData($newOrder);
        
        // 統計更新
        updateStatistics(['new_orders' => 1]);
        
        return [
            'success' => true,
            'message' => '受注を作成しました',
            'data' => $newOrder
        ];
        
    } catch (Exception $e) {
        throw new Exception("受注作成エラー: " . $e->getMessage());
    }
}

/**
 * 受注ステータス更新
 */
function handleUpdateOrderStatus() {
    try {
        $orderId = $_POST['order_id'] ?? '';
        $newStatus = $_POST['status'] ?? '';
        $reason = sanitizeInput($_POST['reason'] ?? '');
        
        if (empty($orderId) || empty($newStatus)) {
            throw new Exception('受注IDとステータスは必須です');
        }
        
        $validStatuses = ['received', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
        if (!in_array($newStatus, $validStatuses)) {
            throw new Exception('無効なステータスです');
        }
        
        $orders = loadOrders();
        $orderIndex = findOrderIndex($orders, $orderId);
        
        if ($orderIndex === false) {
            throw new Exception('指定された受注が見つかりません');
        }
        
        $oldStatus = $orders[$orderIndex]['status'];
        
        // ステータス変更の妥当性チェック
        if (!isValidStatusTransition($oldStatus, $newStatus)) {
            throw new Exception("ステータスを {$oldStatus} から {$newStatus} に変更することはできません");
        }
        
        // ステータス更新
        $orders[$orderIndex]['status'] = $newStatus;
        $orders[$orderIndex]['updated_at'] = date('Y-m-d H:i:s');
        $orders[$orderIndex]['updated_by'] = $_SESSION['user_id'] ?? 'system';
        
        // ステータス固有の処理
        switch ($newStatus) {
            case 'processing':
                $orders[$orderIndex]['processing_started_at'] = date('Y-m-d H:i:s');
                break;
            case 'shipped':
                $orders[$orderIndex]['shipped_at'] = date('Y-m-d H:i:s');
                $orders[$orderIndex]['tracking_number'] = $_POST['tracking_number'] ?? '';
                break;
            case 'delivered':
                $orders[$orderIndex]['delivered_at'] = date('Y-m-d H:i:s');
                break;
            case 'cancelled':
                $orders[$orderIndex]['cancelled_at'] = date('Y-m-d H:i:s');
                $orders[$orderIndex]['cancellation_reason'] = $reason;
                break;
        }
        
        if (!saveOrders($orders)) {
            throw new Exception('ステータス更新の保存に失敗しました');
        }
        
        // ステータス履歴記録
        recordStatusHistory($orderId, $oldStatus, $newStatus, $reason);
        
        // 統計更新
        updateStatistics([
            'status_updates' => 1,
            'last_status_update' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => 'ステータスを更新しました',
            'data' => [
                'order_id' => $orderId,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'updated_at' => $orders[$orderIndex]['updated_at']
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ステータス更新エラー: " . $e->getMessage());
    }
}

/**
 * 一括受注更新
 */
function handleBulkUpdateOrders() {
    try {
        $orderIds = $_POST['order_ids'] ?? [];
        $updateData = $_POST['update_data'] ?? [];
        
        if (empty($orderIds) || !is_array($orderIds)) {
            throw new Exception('更新対象の受注IDが指定されていません');
        }
        
        if (empty($updateData) || !is_array($updateData)) {
            throw new Exception('更新データが指定されていません');
        }
        
        $orders = loadOrders();
        $updatedCount = 0;
        $errors = [];
        
        foreach ($orderIds as $orderId) {
            $orderIndex = findOrderIndex($orders, $orderId);
            
            if ($orderIndex === false) {
                $errors[] = "受注ID {$orderId} が見つかりません";
                continue;
            }
            
            // 更新可能フィールドのチェック
            $allowedFields = ['status', 'payment_status', 'shipping_method', 'notes', 'priority'];
            
            foreach ($updateData as $field => $value) {
                if (in_array($field, $allowedFields)) {
                    $orders[$orderIndex][$field] = sanitizeInput($value);
                }
            }
            
            $orders[$orderIndex]['updated_at'] = date('Y-m-d H:i:s');
            $orders[$orderIndex]['updated_by'] = $_SESSION['user_id'] ?? 'system';
            $updatedCount++;
        }
        
        if ($updatedCount === 0) {
            throw new Exception('更新された受注がありません');
        }
        
        if (!saveOrders($orders)) {
            throw new Exception('一括更新の保存に失敗しました');
        }
        
        // 統計更新
        updateStatistics([
            'bulk_updates' => 1,
            'orders_bulk_updated' => $updatedCount
        ]);
        
        return [
            'success' => true,
            'message' => "{$updatedCount}件の受注を更新しました",
            'data' => [
                'updated_count' => $updatedCount,
                'errors' => $errors,
                'update_data' => $updateData
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("一括更新エラー: " . $e->getMessage());
    }
}

// =====================================
// 💰 利益計算・分析機能
// =====================================

/**
 * 利益計算
 */
function handleCalculateProfit() {
    try {
        $orderId = $_POST['order_id'] ?? '';
        $costData = $_POST['cost_data'] ?? [];
        
        if (empty($orderId)) {
            throw new Exception('受注IDが指定されていません');
        }
        
        $orders = loadOrders();
        $orderIndex = findOrderIndex($orders, $orderId);
        
        if ($orderIndex === false) {
            throw new Exception('指定された受注が見つかりません');
        }
        
        $order = $orders[$orderIndex];
        
        // コストデータ更新
        if (!empty($costData)) {
            $order['cost_data'] = array_merge($order['cost_data'] ?? [], $costData);
            $orders[$orderIndex] = $order;
            saveOrders($orders);
        }
        
        // 利益計算実行
        $profitAnalysis = calculateDetailedProfitAnalysis($order);
        
        return [
            'success' => true,
            'message' => '利益計算が完了しました',
            'data' => $profitAnalysis
        ];
        
    } catch (Exception $e) {
        throw new Exception("利益計算エラー: " . $e->getMessage());
    }
}

/**
 * 利益分析取得
 */
function handleGetProfitAnalysis() {
    try {
        $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
        $dateTo = $_GET['date_to'] ?? date('Y-m-d');
        $groupBy = $_GET['group_by'] ?? 'daily';
        
        $orders = loadOrders();
        
        // 期間フィルタリング
        $filteredOrders = array_filter($orders, function($order) use ($dateFrom, $dateTo) {
            $orderDate = substr($order['order_date'], 0, 10);
            return $orderDate >= $dateFrom && $orderDate <= $dateTo;
        });
        
        // グループ別集計
        $analysis = [];
        
        foreach ($filteredOrders as $order) {
            $groupKey = getGroupKey($order['order_date'], $groupBy);
            
            if (!isset($analysis[$groupKey])) {
                $analysis[$groupKey] = [
                    'period' => $groupKey,
                    'order_count' => 0,
                    'total_revenue' => 0,
                    'total_cost' => 0,
                    'total_profit' => 0,
                    'average_order_value' => 0,
                    'profit_margin' => 0
                ];
            }
            
            $orderProfit = calculateOrderProfit($order);
            $orderCost = calculateOrderCost($order);
            
            $analysis[$groupKey]['order_count']++;
            $analysis[$groupKey]['total_revenue'] += $order['total_amount'];
            $analysis[$groupKey]['total_cost'] += $orderCost;
            $analysis[$groupKey]['total_profit'] += $orderProfit;
        }
        
        // 平均値・利益率計算
        foreach ($analysis as &$period) {
            if ($period['order_count'] > 0) {
                $period['average_order_value'] = $period['total_revenue'] / $period['order_count'];
            }
            
            if ($period['total_revenue'] > 0) {
                $period['profit_margin'] = ($period['total_profit'] / $period['total_revenue']) * 100;
            }
        }
        
        return [
            'success' => true,
            'data' => [
                'analysis' => array_values($analysis),
                'summary' => [
                    'total_orders' => count($filteredOrders),
                    'total_revenue' => array_sum(array_column($analysis, 'total_revenue')),
                    'total_profit' => array_sum(array_column($analysis, 'total_profit')),
                    'average_profit_margin' => count($analysis) > 0 ? 
                        array_sum(array_column($analysis, 'profit_margin')) / count($analysis) : 0
                ],
                'period' => [
                    'from' => $dateFrom,
                    'to' => $dateTo,
                    'group_by' => $groupBy
                ]
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("利益分析取得エラー: " . $e->getMessage());
    }
}

// =====================================
// 📤 インポート・エクスポート機能
// =====================================

/**
 * 受注データエクスポート
 */
function handleExportOrders() {
    try {
        $format = $_POST['format'] ?? 'csv';
        $dateFrom = $_POST['date_from'] ?? '';
        $dateTo = $_POST['date_to'] ?? '';
        $status = $_POST['status'] ?? '';
        $includeCustomerData = isset($_POST['include_customer_data']) && $_POST['include_customer_data'] === '1';
        $includeProfitData = isset($_POST['include_profit_data']) && $_POST['include_profit_data'] === '1';
        
        $orders = loadOrders();
        $exportData = [];
        
        // フィルタリング
        foreach ($orders as $order) {
            $include = true;
            
            if (!empty($dateFrom) && substr($order['order_date'], 0, 10) < $dateFrom) {
                $include = false;
            }
            if (!empty($dateTo) && substr($order['order_date'], 0, 10) > $dateTo) {
                $include = false;
            }
            if (!empty($status) && $order['status'] !== $status) {
                $include = false;
            }
            
            if ($include) {
                $exportOrder = $order;
                
                // 利益データ追加
                if ($includeProfitData) {
                    $exportOrder['profit_analysis'] = calculateDetailedProfitAnalysis($order);
                }
                
                // 顧客データ追加
                if ($includeCustomerData) {
                    $exportOrder['customer_details'] = getCustomerInfo($order['customer_id'] ?? '');
                }
                
                $exportData[] = $exportOrder;
            }
        }
        
        if (empty($exportData)) {
            throw new Exception('エクスポート対象のデータがありません');
        }
        
        // フォーマット別処理
        $result = [];
        switch ($format) {
            case 'csv':
                $result = exportToCSV($exportData);
                break;
            case 'excel':
                $result = exportToExcel($exportData);
                break;
            case 'json':
                $result = exportToJSON($exportData);
                break;
            default:
                throw new Exception('サポートされていないエクスポート形式です');
        }
        
        return [
            'success' => true,
            'message' => count($exportData) . "件の受注を{$format}形式でエクスポートしました",
            'data' => [
                'format' => $format,
                'record_count' => count($exportData),
                'filename' => $result['filename'],
                'download_url' => $result['download_url'],
                'file_size' => $result['file_size']
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("エクスポートエラー: " . $e->getMessage());
    }
}

/**
 * 受注データインポート
 */
function handleImportOrders() {
    try {
        if (!isset($_FILES['import_file'])) {
            throw new Exception('インポートファイルが選択されていません');
        }
        
        $file = $_FILES['import_file'];
        $updateExisting = isset($_POST['update_existing']) && $_POST['update_existing'] === '1';
        $dryRun = isset($_POST['dry_run']) && $_POST['dry_run'] === '1';
        
        // ファイル検証
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('ファイルアップロードエラー: ' . getUploadErrorMessage($file['error']));
        }
        
        if ($file['size'] > 50 * 1024 * 1024) { // 50MB制限
            throw new Exception('ファイルサイズが大きすぎます（50MB以下にしてください）');
        }
        
        // ファイル形式判定・データ読み込み
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $importData = [];
        
        switch ($extension) {
            case 'csv':
                $importData = parseCSVFile($file['tmp_name']);
                break;
            case 'json':
                $importData = parseJSONFile($file['tmp_name']);
                break;
            default:
                throw new Exception('サポートされていないファイル形式です（CSV, JSONのみ）');
        }
        
        if (empty($importData)) {
            throw new Exception('インポートデータが空です');
        }
        
        // データ検証・変換
        $validOrders = [];
        $errors = [];
        
        foreach ($importData as $index => $orderData) {
            $validation = validateImportOrderData($orderData);
            
            if ($validation['valid']) {
                $order = convertImportDataToOrder($orderData);
                $validOrders[] = $order;
            } else {
                $errors[] = [
                    'row' => $index + 1,
                    'errors' => $validation['errors'],
                    'data' => $orderData
                ];
            }
        }
        
        if (empty($validOrders)) {
            throw new Exception('有効な受注データがありません');
        }
        
        $result = [
            'total_rows' => count($importData),
            'valid_orders' => count($validOrders),
            'error_count' => count($errors),
            'errors' => $errors
        ];
        
        // ドライラン（実際の保存なし）
        if ($dryRun) {
            $result['dry_run'] = true;
            $result['preview'] = array_slice($validOrders, 0, 5);
            
            return [
                'success' => true,
                'message' => 'インポートプレビュー完了',
                'data' => $result
            ];
        }
        
        // 実際のインポート実行
        $existingOrders = loadOrders();
        $newOrders = [];
        $updatedOrders = [];
        
        foreach ($validOrders as $importOrder) {
            $existingIndex = findOrderByNumber($existingOrders, $importOrder['order_number']);
            
            if ($existingIndex !== false) {
                if ($updateExisting) {
                    $existingOrders[$existingIndex] = array_merge($existingOrders[$existingIndex], $importOrder);
                    $existingOrders[$existingIndex]['updated_at'] = date('Y-m-d H:i:s');
                    $updatedOrders[] = $importOrder['order_number'];
                }
            } else {
                $importOrder['id'] = generateUniqueId();
                $importOrder['created_at'] = date('Y-m-d H:i:s');
                $importOrder['updated_at'] = date('Y-m-d H:i:s');
                $importOrder['imported'] = true;
                
                $existingOrders[] = $importOrder;
                $newOrders[] = $importOrder['order_number'];
            }
        }
        
        if (!saveOrders($existingOrders)) {
            throw new Exception('インポートデータの保存に失敗しました');
        }
        
        $result['new_orders'] = count($newOrders);
        $result['updated_orders'] = count($updatedOrders);
        
        // 統計更新
        updateStatistics([
            'imported_orders' => count($newOrders),
            'last_import' => date('Y-m-d H:i:s')
        ]);
        
        return [
            'success' => true,
            'message' => "インポート完了: 新規{$result['new_orders']}件、更新{$result['updated_orders']}件",
            'data' => $result
        ];
        
    } catch (Exception $e) {
        throw new Exception("インポートエラー: " . $e->getMessage());
    }
}

// =====================================
// 📊 統計・レポート機能
// =====================================

/**
 * 統計情報取得
 */
function handleGetStatistics() {
    try {
        $orders = loadOrders();
        $customers = loadCustomers();
        
        $stats = [
            'orders' => [
                'total' => count($orders),
                'received' => count(array_filter($orders, fn($o) => $o['status'] === 'received')),
                'processing' => count(array_filter($orders, fn($o) => $o['status'] === 'processing')),
                'shipped' => count(array_filter($orders, fn($o) => $o['status'] === 'shipped')),
                'delivered' => count(array_filter($orders, fn($o) => $o['status'] === 'delivered')),
                'cancelled' => count(array_filter($orders, fn($o) => $o['status'] === 'cancelled'))
            ],
            'revenue' => [
                'total' => array_sum(array_column($orders, 'total_amount')),
                'this_month' => getMonthlyRevenue($orders, date('Y-m')),
                'last_month' => getMonthlyRevenue($orders, date('Y-m', strtotime('-1 month'))),
                'average_order_value' => count($orders) > 0 ? array_sum(array_column($orders, 'total_amount')) / count($orders) : 0
            ],
            'customers' => [
                'total' => count($customers),
                'new_this_month' => getNewCustomersThisMonth($customers),
                'repeat_customers' => getRepeatCustomerCount($orders)
            ],
            'performance' => [
                'average_processing_time' => calculateAverageProcessingTime($orders),
                'fulfillment_rate' => calculateFulfillmentRate($orders),
                'return_rate' => calculateReturnRate($orders)
            ],
            'trends' => [
                'daily_orders' => getDailyOrderTrend($orders, 7),
                'top_products' => getTopProducts($orders, 10),
                'peak_hours' => getPeakOrderHours($orders)
            ]
        ];
        
        return [
            'success' => true,
            'data' => $stats
        ];
        
    } catch (Exception $e) {
        throw new Exception("統計取得エラー: " . $e->getMessage());
    }
}

/**
 * 日次サマリー取得
 */
function handleGetDailySummary() {
    try {
        $date = $_GET['date'] ?? date('Y-m-d');
        
        if (!validateDate($date)) {
            throw new Exception('無効な日付形式です');
        }
        
        $orders = loadOrders();
        $dailyOrders = array_filter($orders, function($order) use ($date) {
            return substr($order['order_date'], 0, 10) === $date;
        });
        
        $summary = [
            'date' => $date,
            'order_count' => count($dailyOrders),
            'total_revenue' => array_sum(array_column($dailyOrders, 'total_amount')),
            'status_breakdown' => [],
            'hourly_distribution' => [],
            'payment_methods' => [],
            'shipping_methods' => []
        ];
        
        // ステータス別集計
        foreach ($dailyOrders as $order) {
            $status = $order['status'];
            if (!isset($summary['status_breakdown'][$status])) {
                $summary['status_breakdown'][$status] = 0;
            }
            $summary['status_breakdown'][$status]++;
        }
        
        // 時間別分布
        for ($hour = 0; $hour < 24; $hour++) {
            $summary['hourly_distribution'][$hour] = 0;
        }
        
        foreach ($dailyOrders as $order) {
            $hour = intval(date('H', strtotime($order['order_date'])));
            $summary['hourly_distribution'][$hour]++;
        }
        
        return [
            'success' => true,
            'data' => $summary
        ];
        
    } catch (Exception $e) {
        throw new Exception("日次サマリー取得エラー: " . $e->getMessage());
    }
}

/**
 * ヘルスチェック
 */
function handleHealthCheck() {
    try {
        $checks = [
            'data_directory' => is_dir(getDataDir()) && is_writable(getDataDir()),
            'orders_file' => !file_exists(getOrdersFile()) || is_readable(getOrdersFile()),
            'customers_file' => !file_exists(getCustomersFile()) || is_readable(getCustomersFile()),
            'upload_directory' => is_dir(sys_get_temp_dir()) && is_writable(sys_get_temp_dir()),
            'session_active' => session_status() === PHP_SESSION_ACTIVE,
            'file_upload_enabled' => ini_get('file_uploads') == 1,
            'max_upload_size' => ini_get('upload_max_filesize'),
            'memory_limit' => ini_get('memory_limit')
        ];
        
        $allHealthy = array_reduce($checks, function($carry, $check) {
            return $carry && ($check === true || is_string($check));
        }, true);
        
        return [
            'success' => true,
            'data' => [
                'status' => $allHealthy ? 'healthy' : 'warning',
                'checks' => $checks,
                'timestamp' => date('Y-m-d H:i:s'),
                'memory_usage' => memory_get_usage(true),
                'peak_memory' => memory_get_peak_usage(true)
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("ヘルスチェックエラー: " . $e->getMessage());
    }
}

// =====================================
// 🛠️ ユーティリティ関数
// =====================================

/**
 * ユニークID生成
 */
function generateUniqueId() {
    return date('YmdHis') . '_' . bin2hex(random_bytes(4));
}

/**
 * 受注番号生成
 */
function generateOrderNumber() {
    return 'ORD-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
}

/**
 * 受注検索（ID）
 */
function findOrderById($orders, $orderId) {
    foreach ($orders as $order) {
        if ($order['id'] === $orderId) {
            return $order;
        }
    }
    return null;
}

/**
 * 受注インデックス検索
 */
function findOrderIndex($orders, $orderId) {
    foreach ($orders as $index => $order) {
        if ($order['id'] === $orderId) {
            return $index;
        }
    }
    return false;
}

/**
 * 受注番号で検索
 */
function findOrderByNumber($orders, $orderNumber) {
    foreach ($orders as $index => $order) {
        if ($order['order_number'] === $orderNumber) {
            return $index;
        }
    }
    return false;
}

/**
 * 受注利益計算
 */
function calculateOrderProfit($order) {
    $revenue = $order['total_amount'];
    $cost = calculateOrderCost($order);
    return $revenue - $cost;
}

/**
 * 受注コスト計算
 */
function calculateOrderCost($order) {
    $cost = 0;
    
    // 商品原価
    if (isset($order['items']) && is_array($order['items'])) {
        foreach ($order['items'] as $item) {
            $cost += ($item['cost'] ?? 0) * ($item['quantity'] ?? 1);
        }
    }
    
    // 配送費
    $cost += $order['shipping_cost'] ?? 0;
    
    // 手数料
    $cost += $order['processing_fee'] ?? 0;
    
    // その他費用
    $cost += $order['other_costs'] ?? 0;
    
    return $cost;
}

/**
 * 利益率計算
 */
function calculateProfitMargin($order) {
    $revenue = $order['total_amount'];
    if ($revenue <= 0) {
        return 0;
    }
    
    $profit = calculateOrderProfit($order);
    return ($profit / $revenue) * 100;
}

/**
 * 詳細利益分析
 */
function calculateDetailedProfitAnalysis($order) {
    $revenue = $order['total_amount'];
    $cost = calculateOrderCost($order);
    $profit = $revenue - $cost;
    
    return [
        'revenue' => $revenue,
        'total_cost' => $cost,
        'gross_profit' => $profit,
        'profit_margin' => $revenue > 0 ? ($profit / $revenue) * 100 : 0,
        'cost_breakdown' => [
            'product_cost' => calculateProductCost($order),
            'shipping_cost' => $order['shipping_cost'] ?? 0,
            'processing_fee' => $order['processing_fee'] ?? 0,
            'other_costs' => $order['other_costs'] ?? 0
        ],
        'profitability_rating' => getProfitabilityRating($profit, $revenue)
    ];
}

/**
 * 商品原価計算
 */
function calculateProductCost($order) {
    $cost = 0;
    
    if (isset($order['items']) && is_array($order['items'])) {
        foreach ($order['items'] as $item) {
            $cost += ($item['cost'] ?? 0) * ($item['quantity'] ?? 1);
        }
    }
    
    return $cost;
}

/**
 * 収益性評価
 */
function getProfitabilityRating($profit, $revenue) {
    if ($revenue <= 0) {
        return 'unknown';
    }
    
    $margin = ($profit / $revenue) * 100;
    
    if ($margin >= 30) {
        return 'excellent';
    } elseif ($margin >= 20) {
        return 'good';
    } elseif ($margin >= 10) {
        return 'fair';
    } elseif ($margin >= 0) {
        return 'poor';
    } else {
        return 'loss';
    }
}

/**
 * 緊急度レベル計算
 */
function calculateUrgencyLevel($order) {
    $daysSinceOrder = (time() - strtotime($order['order_date'])) / (60 * 60 * 24);
    
    if ($order['status'] === 'cancelled' || $order['status'] === 'delivered') {
        return 'none';
    }
    
    if ($daysSinceOrder > 7) {
        return 'high';
    } elseif ($daysSinceOrder > 3) {
        return 'medium';
    } else {
        return 'low';
    }
}

/**
 * ステータス変更妥当性チェック
 */
function isValidStatusTransition($fromStatus, $toStatus) {
    $validTransitions = [
        'received' => ['processing', 'cancelled'],
        'processing' => ['shipped', 'cancelled'],
        'shipped' => ['delivered', 'returned'],
        'delivered' => ['returned'],
        'cancelled' => [],
        'returned' => []
    ];
    
    return in_array($toStatus, $validTransitions[$fromStatus] ?? []);
}

/**
 * ステータス履歴記録
 */
function recordStatusHistory($orderId, $oldStatus, $newStatus, $reason = '') {
    $historyFile = getDataDir() . '/status_history.json';
    $history = [];
    
    if (file_exists($historyFile)) {
        $content = file_get_contents($historyFile);
        $history = json_decode($content, true) ?: [];
    }
    
    $history[] = [
        'order_id' => $orderId,
        'old_status' => $oldStatus,
        'new_status' => $newStatus,
        'reason' => $reason,
        'changed_by' => $_SESSION['user_id'] ?? 'system',
        'changed_at' => date('Y-m-d H:i:s')
    ];
    
    $json = json_encode($history, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents($historyFile, $json);
}

/**
 * 受注ステータス履歴取得
 */
function getOrderStatusHistory($orderId) {
    $historyFile = getDataDir() . '/status_history.json';
    
    if (!file_exists($historyFile)) {
        return [];
    }
    
    $content = file_get_contents($historyFile);
    $allHistory = json_decode($content, true) ?: [];
    
    return array_filter($allHistory, function($record) use ($orderId) {
        return $record['order_id'] === $orderId;
    });
}

/**
 * 顧客情報取得
 */
function getCustomerInfo($customerId) {
    if (empty($customerId)) {
        return null;
    }
    
    $customers = loadCustomers();
    
    foreach ($customers as $customer) {
        if ($customer['id'] === $customerId) {
            return $customer;
        }
    }
    
    return null;
}

/**
 * 顧客データ更新
 */
function updateCustomerData($order) {
    $customers = loadCustomers();
    $customerIndex = null;
    
    // 既存顧客検索
    foreach ($customers as $index => $customer) {
        if ($customer['email'] === $order['customer_email']) {
            $customerIndex = $index;
            break;
        }
    }
    
    if ($customerIndex !== null) {
        // 既存顧客更新
        $customers[$customerIndex]['last_order_date'] = $order['order_date'];
        $customers[$customerIndex]['total_orders'] = ($customers[$customerIndex]['total_orders'] ?? 0) + 1;
        $customers[$customerIndex]['total_spent'] = ($customers[$customerIndex]['total_spent'] ?? 0) + $order['total_amount'];
    } else {
        // 新規顧客追加
        $customers[] = [
            'id' => generateUniqueId(),
            'name' => $order['customer_name'],
            'email' => $order['customer_email'],
            'phone' => $order['customer_phone'] ?? '',
            'address' => $order['customer_address'] ?? '',
            'first_order_date' => $order['order_date'],
            'last_order_date' => $order['order_date'],
            'total_orders' => 1,
            'total_spent' => $order['total_amount'],
            'created_at' => date('Y-m-d H:i:s')
        ];
    }
    
    saveCustomers($customers);
}

/**
 * 商品アイテム検証・サニタイズ
 */
function validateAndSanitizeItems($items) {
    if (!is_array($items)) {
        if (is_string($items)) {
            $items = json_decode($items, true);
        } else {
            return [];
        }
    }
    
    $validatedItems = [];
    
    foreach ($items as $item) {
        if (isset($item['name']) && isset($item['quantity']) && isset($item['price'])) {
            $validatedItems[] = [
                'name' => sanitizeInput($item['name']),
                'quantity' => intval($item['quantity']),
                'price' => floatval($item['price']),
                'cost' => floatval($item['cost'] ?? 0),
                'sku' => sanitizeInput($item['sku'] ?? ''),
                'description' => sanitizeInput($item['description'] ?? '')
            ];
        }
    }
    
    return $validatedItems;
}

/**
 * 受注データ検証
 */
function validateOrderData($order) {
    $errors = [];
    
    if (empty($order['customer_name'])) {
        $errors[] = '顧客名が入力されていません';
    }
    
    if (empty($order['customer_email']) || !filter_var($order['customer_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = '有効なメールアドレスが入力されていません';
    }
    
    if (!validateNumber($order['total_amount'], 0)) {
        $errors[] = '有効な合計金額が入力されていません';
    }
    
    if (empty($order['items']) || !is_array($order['items'])) {
        $errors[] = '商品アイテムが入力されていません';
    }
    
    return [
        'valid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * 統計情報更新
 */
function updateStatistics($newStats) {
    $statsFile = getStatisticsFile();
    $currentStats = [];
    
    if (file_exists($statsFile)) {
        $content = file_get_contents($statsFile);
        $currentStats = json_decode($content, true) ?: [];
    }
    
    $currentStats = array_merge($currentStats, $newStats);
    $currentStats['last_updated'] = date('Y-m-d H:i:s');
    
    $json = json_encode($currentStats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents($statsFile, $json);
}

/**
 * 月次売上取得
 */
function getMonthlyRevenue($orders, $month) {
    $monthlyOrders = array_filter($orders, function($order) use ($month) {
        return substr($order['order_date'], 0, 7) === $month;
    });
    
    return array_sum(array_column($monthlyOrders, 'total_amount'));
}

/**
 * 今月の新規顧客数
 */
function getNewCustomersThisMonth($customers) {
    $thisMonth = date('Y-m');
    
    return count(array_filter($customers, function($customer) use ($thisMonth) {
        return substr($customer['created_at'], 0, 7) === $thisMonth;
    }));
}

/**
 * リピート顧客数
 */
function getRepeatCustomerCount($orders) {
    $customerOrderCounts = [];
    
    foreach ($orders as $order) {
        $email = $order['customer_email'];
        $customerOrderCounts[$email] = ($customerOrderCounts[$email] ?? 0) + 1;
    }
    
    return count(array_filter($customerOrderCounts, function($count) {
        return $count > 1;
    }));
}

/**
 * 平均処理時間計算
 */
function calculateAverageProcessingTime($orders) {
    $processingTimes = [];
    
    foreach ($orders as $order) {
        if (isset($order['shipped_at']) && isset($order['order_date'])) {
            $processingTime = strtotime($order['shipped_at']) - strtotime($order['order_date']);
            $processingTimes[] = $processingTime / (60 * 60 * 24); // 日数に変換
        }
    }
    
    return !empty($processingTimes) ? array_sum($processingTimes) / count($processingTimes) : 0;
}

/**
 * フルフィルメント率計算
 */
function calculateFulfillmentRate($orders) {
    $totalOrders = count($orders);
    if ($totalOrders === 0) {
        return 0;
    }
    
    $fulfilledOrders = count(array_filter($orders, function($order) {
        return in_array($order['status'], ['shipped', 'delivered']);
    }));
    
    return ($fulfilledOrders / $totalOrders) * 100;
}

/**
 * 返品率計算
 */
function calculateReturnRate($orders) {
    $totalOrders = count($orders);
    if ($totalOrders === 0) {
        return 0;
    }
    
    $returnedOrders = count(array_filter($orders, function($order) {
        return $order['status'] === 'returned';
    }));
    
    return ($returnedOrders / $totalOrders) * 100;
}

/**
 * 日次受注トレンド取得
 */
function getDailyOrderTrend($orders, $days) {
    $trend = [];
    
    for ($i = $days - 1; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-{$i} days"));
        $dayOrders = array_filter($orders, function($order) use ($date) {
            return substr($order['order_date'], 0, 10) === $date;
        });
        
        $trend[] = [
            'date' => $date,
            'order_count' => count($dayOrders),
            'revenue' => array_sum(array_column($dayOrders, 'total_amount'))
        ];
    }
    
    return $trend;
}

/**
 * 人気商品トップ取得
 */
function getTopProducts($orders, $limit) {
    $productCounts = [];
    
    foreach ($orders as $order) {
        if (isset($order['items']) && is_array($order['items'])) {
            foreach ($order['items'] as $item) {
                $productName = $item['name'];
                $quantity = $item['quantity'] ?? 1;
                
                if (!isset($productCounts[$productName])) {
                    $productCounts[$productName] = [
                        'name' => $productName,
                        'total_quantity' => 0,
                        'total_revenue' => 0,
                        'order_count' => 0
                    ];
                }
                
                $productCounts[$productName]['total_quantity'] += $quantity;
                $productCounts[$productName]['total_revenue'] += ($item['price'] ?? 0) * $quantity;
                $productCounts[$productName]['order_count']++;
            }
        }
    }
    
    // 販売数量でソート
    uasort($productCounts, function($a, $b) {
        return $b['total_quantity'] - $a['total_quantity'];
    });
    
    return array_slice(array_values($productCounts), 0, $limit);
}

/**
 * ピーク時間帯取得
 */
function getPeakOrderHours($orders) {
    $hourCounts = array_fill(0, 24, 0);
    
    foreach ($orders as $order) {
        $hour = intval(date('H', strtotime($order['order_date'])));
        $hourCounts[$hour]++;
    }
    
    $peakHours = [];
    for ($hour = 0; $hour < 24; $hour++) {
        $peakHours[] = [
            'hour' => $hour,
            'order_count' => $hourCounts[$hour]
        ];
    }
    
    // 受注数でソート
    usort($peakHours, function($a, $b) {
        return $b['order_count'] - $a['order_count'];
    });
    
    return array_slice($peakHours, 0, 5);
}

/**
 * グループキー生成
 */
function getGroupKey($date, $groupBy) {
    switch ($groupBy) {
        case 'daily':
            return date('Y-m-d', strtotime($date));
        case 'weekly':
            return date('Y-W', strtotime($date));
        case 'monthly':
            return date('Y-m', strtotime($date));
        case 'yearly':
            return date('Y', strtotime($date));
        default:
            return date('Y-m-d', strtotime($date));
    }
}

/**
 * CSV解析
 */
function parseCSVFile($filePath) {
    $data = [];
    
    if (($handle = fopen($filePath, 'r')) !== false) {
        $header = null;
        $rowIndex = 0;
        
        while (($row = fgetcsv($handle, 1000, ',')) !== false) {
            if ($rowIndex === 0) {
                $header = $row;
            } else {
                if (count($row) === count($header)) {
                    $data[] = array_combine($header, $row);
                }
            }
            $rowIndex++;
        }
        
        fclose($handle);
    }
    
    return $data;
}

/**
 * JSON解析
 */
function parseJSONFile($filePath) {
    $content = file_get_contents($filePath);
    $data = json_decode($content, true);
    
    return is_array($data) ? $data : [];
}

/**
 * インポートデータ検証
 */
function validateImportOrderData($orderData) {
    $errors = [];
    
    $requiredFields = ['order_number', 'customer_name', 'customer_email', 'total_amount'];
    
    foreach ($requiredFields as $field) {
        if (empty($orderData[$field])) {
            $errors[] = "必須項目が不足: {$field}";
        }
    }
    
    if (!empty($orderData['customer_email']) && !filter_var($orderData['customer_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = '無効なメールアドレス';
    }
    
    if (!empty($orderData['total_amount']) && !is_numeric($orderData['total_amount'])) {
        $errors[] = '無効な金額';
    }
    
    return [
        'valid' => empty($errors),
        'errors' => $errors
    ];
}

/**
 * インポートデータ→受注データ変換
 */
function convertImportDataToOrder($importData) {
    return [
        'order_number' => sanitizeInput($importData['order_number']),
        'customer_name' => sanitizeInput($importData['customer_name']),
        'customer_email' => sanitizeInput($importData['customer_email']),
        'customer_phone' => sanitizeInput($importData['customer_phone'] ?? ''),
        'customer_address' => sanitizeInput($importData['customer_address'] ?? ''),
        'total_amount' => floatval($importData['total_amount']),
        'status' => sanitizeInput($importData['status'] ?? 'received'),
        'order_date' => $importData['order_date'] ?? date('Y-m-d H:i:s'),
        'payment_method' => sanitizeInput($importData['payment_method'] ?? ''),
        'shipping_method' => sanitizeInput($importData['shipping_method'] ?? ''),
        'notes' => sanitizeInput($importData['notes'] ?? ''),
        'items' => isset($importData['items']) ? json_decode($importData['items'], true) : []
    ];
}

/**
 * CSVエクスポート
 */
function exportToCSV($data) {
    $filename = 'orders_export_' . date('Y-m-d_H-i-s') . '.csv';
    $tempFile = sys_get_temp_dir() . '/' . $filename;
    
    $fp = fopen($tempFile, 'w');
    
    if (!empty($data)) {
        // ヘッダー行
        $headers = array_keys($data[0]);
        fputcsv($fp, $headers);
        
        // データ行
        foreach ($data as $row) {
            fputcsv($fp, $row);
        }
    }
    
    fclose($fp);
    
    return [
        'filename' => $filename,
        'download_url' => '/download.php?file=' . urlencode($filename),
        'file_size' => filesize($tempFile)
    ];
}

/**
 * JSONエクスポート
 */
function exportToJSON($data) {
    $filename = 'orders_export_' . date('Y-m-d_H-i-s') . '.json';
    $tempFile = sys_get_temp_dir() . '/' . $filename;
    
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    file_put_contents($tempFile, $json);
    
    return [
        'filename' => $filename,
        'download_url' => '/download.php?file=' . urlencode($filename),
        'file_size' => filesize($tempFile)
    ];
}

/**
 * アップロードエラーメッセージ取得
 */
function getUploadErrorMessage($errorCode) {
    $errors = [
        UPLOAD_ERR_OK => 'エラーなし',
        UPLOAD_ERR_INI_SIZE => 'php.iniの upload_max_filesize を超過',
        UPLOAD_ERR_FORM_SIZE => 'HTMLフォームの MAX_FILE_SIZE を超過',
        UPLOAD_ERR_PARTIAL => 'ファイルが一部のみアップロード',
        UPLOAD_ERR_NO_FILE => 'ファイルがアップロードされていません',
        UPLOAD_ERR_NO_TMP_DIR => '一時ディレクトリがありません',
        UPLOAD_ERR_CANT_WRITE => 'ディスクへの書き込みに失敗',
        UPLOAD_ERR_EXTENSION => 'PHPエクステンションがアップロードを停止'
    ];
    
    return $errors[$errorCode] ?? '不明なエラー';
}

?>