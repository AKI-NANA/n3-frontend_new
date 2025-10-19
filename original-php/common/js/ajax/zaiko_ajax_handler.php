<?php
/**
 * 📦 在庫管理モジュール Ajax処理
 * ファイル: modules/zaiko/ajax_handler.php
 * 
 * ✅ 在庫追跡・管理
 * ✅ 入出庫記録
 * ✅ アラート・通知
 * ✅ 棚卸し機能
 * ✅ レポート生成
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
    $dataDir = __DIR__ . '/../../data/zaiko';
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    return $dataDir;
}

function getInventoryFile() {
    return getDataDir() . '/inventory.json';
}

function getMovementsFile() {
    return getDataDir() . '/movements.json';
}

function getAlertsFile() {
    return getDataDir() . '/alerts.json';
}

function loadInventory() {
    $file = getInventoryFile();
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveInventory($inventory) {
    $file = getInventoryFile();
    $dataDir = dirname($file);
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    $json = json_encode($inventory, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    return file_put_contents($file, $json) !== false;
}

function loadMovements() {
    $file = getMovementsFile();
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    $data = json_decode($content, true);
    return is_array($data) ? $data : [];
}

function saveMovements($movements) {
    $file = getMovementsFile();
    $json = json_encode($movements, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
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
    
    $response = handleZaikoAction($action);
    return $response;
    
} catch (Exception $e) {
    error_log("在庫管理Ajax処理エラー: " . $e->getMessage());
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
// 📦 在庫管理アクション処理
// =====================================

function handleZaikoAction($action) {
    switch ($action) {
        // === 在庫照会・管理 ===
        case 'get_inventory':
            return handleGetInventory();
        case 'get_item_details':
            return handleGetItemDetails();
        case 'update_stock':
            return handleUpdateStock();
        case 'bulk_update_stock':
            return handleBulkUpdateStock();
        case 'search_inventory':
            return handleSearchInventory();
        
        // === 入出庫管理 ===
        case 'record_inbound':
            return handleRecordInbound();
        case 'record_outbound':
            return handleRecordOutbound();
        case 'get_movements':
            return handleGetMovements();
        case 'cancel_movement':
            return handleCancelMovement();
        case 'adjust_inventory':
            return handleAdjustInventory();
        
        // === アラート・通知 ===
        case 'low_stock_alert':
            return handleLowStockAlert();
        case 'get_alerts':
            return handleGetAlerts();
        case 'mark_alert_read':
            return handleMarkAlertRead();
        case 'create_custom_alert':
            return handleCreateCustomAlert();
        case 'reorder_suggestion':
            return handleReorderSuggestion();
        
        // === 棚卸し ===
        case 'start_stocktake':
            return handleStartStocktake();
        case 'record_count':
            return handleRecordCount();
        case 'complete_stocktake':
            return handleCompleteStocktake();
        case 'get_stocktake_history':
            return handleGetStocktakeHistory();
        
        // === レポート・分析 ===
        case 'inventory_report':
            return handleInventoryReport();
        case 'movement_report':
            return handleMovementReport();
        case 'turnover_analysis':
            return handleTurnoverAnalysis();
        case 'abc_analysis':
            return handleABCAnalysis();
        case 'stock_aging_report':
            return handleStockAgingReport();
        
        // === システム管理 ===
        case 'get_statistics':
            return handleGetStatistics();
        case 'health_check':
            return handleHealthCheck();
        case 'sync_with_products':
            return handleSyncWithProducts();
        case 'optimize_storage':
            return handleOptimizeStorage();
        
        default:
            throw new Exception("未知のアクション: {$action}");
    }
}

// =====================================
// 📊 在庫照会・管理機能
// =====================================

function handleGetInventory() {
    try {
        $inventory = loadInventory();
        $page = intval($_GET['page'] ?? 1);
        $pageSize = intval($_GET['page_size'] ?? 25);
        $location = $_GET['location'] ?? '';
        $alertLevel = $_GET['alert_level'] ?? '';
        $search = $_GET['search'] ?? '';
        $sortBy = $_GET['sort_by'] ?? 'product_name';
        $sortOrder = $_GET['sort_order'] ?? 'asc';
        
        // フィルタリング
        $filteredInventory = array_filter($inventory, function($item) use ($location, $alertLevel, $search) {
            $matchLocation = empty($location) || $item['location'] === $location;
            
            $currentAlertLevel = calculateAlertLevel($item);
            $matchAlert = empty($alertLevel) || $currentAlertLevel === $alertLevel;
            
            $matchSearch = empty($search) || 
                          stripos($item['product_name'], $search) !== false ||
                          stripos($item['sku'], $search) !== false ||
                          stripos($item['location'], $search) !== false;
            
            return $matchLocation && $matchAlert && $matchSearch;
        });
        
        // ソート
        usort($filteredInventory, function($a, $b) use ($sortBy, $sortOrder) {
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
        $totalItems = count($filteredInventory);
        $totalPages = ceil($totalItems / $pageSize);
        $offset = ($page - 1) * $pageSize;
        $pagedInventory = array_slice($filteredInventory, $offset, $pageSize);
        
        // 追加情報計算
        foreach ($pagedInventory as &$item) {
            $item['alert_level'] = calculateAlertLevel($item);
            $item['stock_value'] = ($item['unit_cost'] ?? 0) * ($item['current_stock'] ?? 0);
            $item['days_of_stock'] = calculateDaysOfStock($item);
            $item['turnover_rate'] = calculateTurnoverRate($item);
        }
        
        $summary = calculateInventorySummary($filteredInventory);
        
        return [
            'success' => true,
            'data' => [
                'inventory' => array_values($pagedInventory),
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalItems,
                    'page_size' => $pageSize
                ],
                'summary' => $summary
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("在庫一覧取得エラー: " . $e->getMessage());
    }
}

function handleUpdateStock() {
    try {
        $itemId = $_POST['item_id'] ?? '';
        $newQuantity = intval($_POST['quantity'] ?? 0);
        $adjustmentType = $_POST['adjustment_type'] ?? 'set'; // set, add, subtract
        $reason = sanitizeInput($_POST['reason'] ?? '');
        $location = sanitizeInput($_POST['location'] ?? '');
        
        if (empty($itemId)) {
            throw new Exception('アイテムIDが指定されていません');
        }
        
        if ($newQuantity < 0 && $adjustmentType === 'set') {
            throw new Exception('在庫数量を負の値にすることはできません');
        }
        
        $inventory = loadInventory();
        $itemIndex = findInventoryItemIndex($inventory, $itemId);
        
        if ($itemIndex === false) {
            throw new Exception('指定されたアイテムが見つかりません');
        }
        
        $oldQuantity = $inventory[$itemIndex]['current_stock'] ?? 0;
        $finalQuantity = 0;
        
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
            throw new Exception('調整後の在庫数量が負の値になります');
        }
        
        // 在庫更新
        $inventory[$itemIndex]['current_stock'] = $finalQuantity;
        $inventory[$itemIndex]['last_updated'] = date('Y-m-d H:i:s');
        $inventory[$itemIndex]['updated_by'] = $_SESSION['user_id'] ?? 'system';
        
        if (!empty($location)) {
            $inventory[$itemIndex]['location'] = $location;
        }
        
        if (!saveInventory($inventory)) {
            throw new Exception('在庫更新の保存に失敗しました');
        }
        
        // 入出庫記録
        recordStockMovement($itemId, $oldQuantity, $finalQuantity, $adjustmentType, $reason, $location);
        
        // アラートチェック
        checkAndCreateAlerts($inventory[$itemIndex]);
        
        return [
            'success' => true,
            'message' => '在庫を更新しました',
            'data' => [
                'item_id' => $itemId,
                'old_quantity' => $oldQuantity,
                'new_quantity' => $finalQuantity,
                'adjustment' => $finalQuantity - $oldQuantity,
                'alert_level' => calculateAlertLevel($inventory[$itemIndex])
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("在庫更新エラー: " . $e->getMessage());
    }
}

function handleBulkUpdateStock() {
    try {
        $updates = $_POST['updates'] ?? [];
        $reason = sanitizeInput($_POST['reason'] ?? '');
        
        if (empty($updates) || !is_array($updates)) {
            throw new Exception('更新データが指定されていません');
        }
        
        $inventory = loadInventory();
        $updatedCount = 0;
        $errors = [];
        $movements = [];
        
        foreach ($updates as $update) {
            $itemId = $update['item_id'] ?? '';
            $newQuantity = intval($update['quantity'] ?? 0);
            $adjustmentType = $update['adjustment_type'] ?? 'set';
            
            if (empty($itemId)) {
                $errors[] = "アイテムIDが不正: " . json_encode($update);
                continue;
            }
            
            $itemIndex = findInventoryItemIndex($inventory, $itemId);
            if ($itemIndex === false) {
                $errors[] = "アイテムが見つかりません: {$itemId}";
                continue;
            }
            
            $oldQuantity = $inventory[$itemIndex]['current_stock'] ?? 0;
            $finalQuantity = 0;
            
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
                    $errors[] = "無効な調整タイプ: {$itemId}";
                    continue 2;
            }
            
            if ($finalQuantity < 0) {
                $errors[] = "負の在庫になります: {$itemId}";
                continue;
            }
            
            $inventory[$itemIndex]['current_stock'] = $finalQuantity;
            $inventory[$itemIndex]['last_updated'] = date('Y-m-d H:i:s');
            $inventory[$itemIndex]['updated_by'] = $_SESSION['user_id'] ?? 'system';
            
            // 入出庫記録データ準備
            $movements[] = [
                'item_id' => $itemId,
                'old_quantity' => $oldQuantity,
                'new_quantity' => $finalQuantity,
                'adjustment_type' => $adjustmentType,
                'reason' => $reason
            ];
            
            $updatedCount++;
        }
        
        if ($updatedCount === 0) {
            throw new Exception('更新されたアイテムがありません');
        }
        
        if (!saveInventory($inventory)) {
            throw new Exception('一括在庫更新の保存に失敗しました');
        }
        
        // 一括入出庫記録
        foreach ($movements as $movement) {
            recordStockMovement(
                $movement['item_id'],
                $movement['old_quantity'],
                $movement['new_quantity'],
                $movement['adjustment_type'],
                $movement['reason']
            );
        }
        
        return [
            'success' => true,
            'message' => "{$updatedCount}件のアイテムを更新しました",
            'data' => [
                'updated_count' => $updatedCount,
                'error_count' => count($errors),
                'errors' => $errors
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("一括在庫更新エラー: " . $e->getMessage());
    }
}

// =====================================
// 📝 入出庫管理機能
// =====================================

function handleRecordInbound() {
    try {
        $itemId = $_POST['item_id'] ?? '';
        $quantity = intval($_POST['quantity'] ?? 0);
        $unitCost = floatval($_POST['unit_cost'] ?? 0);
        $supplier = sanitizeInput($_POST['supplier'] ?? '');
        $invoiceNumber = sanitizeInput($_POST['invoice_number'] ?? '');
        $receivedDate = $_POST['received_date'] ?? date('Y-m-d');
        $location = sanitizeInput($_POST['location'] ?? '');
        $notes = sanitizeInput($_POST['notes'] ?? '');
        
        if (empty($itemId) || $quantity <= 0) {
            throw new Exception('有効なアイテムIDと数量を指定してください');
        }
        
        $inventory = loadInventory();
        $itemIndex = findInventoryItemIndex($inventory, $itemId);
        
        if ($itemIndex === false) {
            throw new Exception('指定されたアイテムが見つかりません');
        }
        
        $oldQuantity = $inventory[$itemIndex]['current_stock'] ?? 0;
        $newQuantity = $oldQuantity + $quantity;
        
        // 在庫更新
        $inventory[$itemIndex]['current_stock'] = $newQuantity;
        $inventory[$itemIndex]['last_inbound'] = $receivedDate;
        $inventory[$itemIndex]['last_updated'] = date('Y-m-d H:i:s');
        
        // 加重平均コスト更新
        if ($unitCost > 0) {
            $currentValue = $oldQuantity * ($inventory[$itemIndex]['unit_cost'] ?? 0);
            $inboundValue = $quantity * $unitCost;
            $totalValue = $currentValue + $inboundValue;
            $inventory[$itemIndex]['unit_cost'] = $newQuantity > 0 ? $totalValue / $newQuantity : $unitCost;
        }
        
        if (!empty($location)) {
            $inventory[$itemIndex]['location'] = $location;
        }
        
        if (!saveInventory($inventory)) {
            throw new Exception('入庫記録の保存に失敗しました');
        }
        
        // 入庫記録
        $movementId = recordInboundMovement([
            'item_id' => $itemId,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'supplier' => $supplier,
            'invoice_number' => $invoiceNumber,
            'received_date' => $receivedDate,
            'location' => $location,
            'notes' => $notes,
            'old_stock' => $oldQuantity,
            'new_stock' => $newQuantity
        ]);
        
        return [
            'success' => true,
            'message' => '入庫を記録しました',
            'data' => [
                'movement_id' => $movementId,
                'item_id' => $itemId,
                'quantity' => $quantity,
                'old_stock' => $oldQuantity,
                'new_stock' => $newQuantity,
                'new_unit_cost' => $inventory[$itemIndex]['unit_cost']
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("入庫記録エラー: " . $e->getMessage());
    }
}

function handleRecordOutbound() {
    try {
        $itemId = $_POST['item_id'] ?? '';
        $quantity = intval($_POST['quantity'] ?? 0);
        $destination = sanitizeInput($_POST['destination'] ?? '');
        $orderNumber = sanitizeInput($_POST['order_number'] ?? '');
        $shippedDate = $_POST['shipped_date'] ?? date('Y-m-d');
        $location = sanitizeInput($_POST['location'] ?? '');
        $notes = sanitizeInput($_POST['notes'] ?? '');
        
        if (empty($itemId) || $quantity <= 0) {
            throw new Exception('有効なアイテムIDと数量を指定してください');
        }
        
        $inventory = loadInventory();
        $itemIndex = findInventoryItemIndex($inventory, $itemId);
        
        if ($itemIndex === false) {
            throw new Exception('指定されたアイテムが見つかりません');
        }
        
        $oldQuantity = $inventory[$itemIndex]['current_stock'] ?? 0;
        
        if ($quantity > $oldQuantity) {
            throw new Exception('出庫数量が現在の在庫数量を超えています');
        }
        
        $newQuantity = $oldQuantity - $quantity;
        
        // 在庫更新
        $inventory[$itemIndex]['current_stock'] = $newQuantity;
        $inventory[$itemIndex]['last_outbound'] = $shippedDate;
        $inventory[$itemIndex]['last_updated'] = date('Y-m-d H:i:s');
        
        if (!saveInventory($inventory)) {
            throw new Exception('出庫記録の保存に失敗しました');
        }
        
        // 出庫記録
        $movementId = recordOutboundMovement([
            'item_id' => $itemId,
            'quantity' => $quantity,
            'destination' => $destination,
            'order_number' => $orderNumber,
            'shipped_date' => $shippedDate,
            'location' => $location,
            'notes' => $notes,
            'old_stock' => $oldQuantity,
            'new_stock' => $newQuantity,
            'unit_cost' => $inventory[$itemIndex]['unit_cost'] ?? 0
        ]);
        
        // アラートチェック
        checkAndCreateAlerts($inventory[$itemIndex]);
        
        return [
            'success' => true,
            'message' => '出庫を記録しました',
            'data' => [
                'movement_id' => $movementId,
                'item_id' => $itemId,
                'quantity' => $quantity,
                'old_stock' => $oldQuantity,
                'new_stock' => $newQuantity,
                'alert_level' => calculateAlertLevel($inventory[$itemIndex])
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("出庫記録エラー: " . $e->getMessage());
    }
}

// =====================================
// 🚨 アラート・通知機能
// =====================================

function handleLowStockAlert() {
    try {
        $inventory = loadInventory();
        $lowStockItems = [];
        
        foreach ($inventory as $item) {
            $alertLevel = calculateAlertLevel($item);
            if (in_array($alertLevel, ['critical', 'warning'])) {
                $lowStockItems[] = array_merge($item, [
                    'alert_level' => $alertLevel,
                    'urgency_score' => calculateUrgencyScore($item)
                ]);
            }
        }
        
        // 緊急度でソート
        usort($lowStockItems, function($a, $b) {
            return $b['urgency_score'] - $a['urgency_score'];
        });
        
        return [
            'success' => true,
            'data' => [
                'low_stock_items' => $lowStockItems,
                'critical_count' => count(array_filter($lowStockItems, fn($i) => $i['alert_level'] === 'critical')),
                'warning_count' => count(array_filter($lowStockItems, fn($i) => $i['alert_level'] === 'warning')),
                'total_affected_value' => array_sum(array_map(function($item) {
                    return ($item['unit_cost'] ?? 0) * ($item['current_stock'] ?? 0);
                }, $lowStockItems))
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("低在庫アラート取得エラー: " . $e->getMessage());
    }
}

function handleReorderSuggestion() {
    try {
        $itemId = $_GET['item_id'] ?? '';
        $algorithm = $_GET['algorithm'] ?? 'economic_order_quantity'; // eoq, lead_time_demand, safety_stock
        
        if (!empty($itemId)) {
            // 特定アイテムの推奨発注量
            $inventory = loadInventory();
            $itemIndex = findInventoryItemIndex($inventory, $itemId);
            
            if ($itemIndex === false) {
                throw new Exception('指定されたアイテムが見つかりません');
            }
            
            $suggestion = calculateReorderSuggestion($inventory[$itemIndex], $algorithm);
            
            return [
                'success' => true,
                'data' => $suggestion
            ];
        } else {
            // 全アイテムの発注推奨
            $inventory = loadInventory();
            $suggestions = [];
            
            foreach ($inventory as $item) {
                $alertLevel = calculateAlertLevel($item);
                if (in_array($alertLevel, ['critical', 'warning'])) {
                    $suggestions[] = calculateReorderSuggestion($item, $algorithm);
                }
            }
            
            return [
                'success' => true,
                'data' => [
                    'suggestions' => $suggestions,
                    'total_items' => count($suggestions),
                    'estimated_total_cost' => array_sum(array_column($suggestions, 'estimated_cost'))
                ]
            ];
        }
        
    } catch (Exception $e) {
        throw new Exception("発注推奨エラー: " . $e->getMessage());
    }
}

// =====================================
// 📊 レポート・分析機能
// =====================================

function handleInventoryReport() {
    try {
        $reportType = $_GET['report_type'] ?? 'summary';
        $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
        $dateTo = $_GET['date_to'] ?? date('Y-m-d');
        $category = $_GET['category'] ?? '';
        $location = $_GET['location'] ?? '';
        
        $inventory = loadInventory();
        $movements = loadMovements();
        
        // フィルタリング
        if (!empty($category)) {
            $inventory = array_filter($inventory, fn($i) => $i['category'] === $category);
        }
        
        if (!empty($location)) {
            $inventory = array_filter($inventory, fn($i) => $i['location'] === $location);
        }
        
        $report = [
            'report_type' => $reportType,
            'period' => ['from' => $dateFrom, 'to' => $dateTo],
            'filters' => ['category' => $category, 'location' => $location],
            'generated_at' => date('Y-m-d H:i:s'),
            'summary' => calculateInventorySummary($inventory),
            'details' => []
        ];
        
        if ($reportType === 'detailed') {
            foreach ($inventory as $item) {
                $itemMovements = array_filter($movements, function($m) use ($item, $dateFrom, $dateTo) {
                    return $m['item_id'] === $item['id'] && 
                           $m['movement_date'] >= $dateFrom && 
                           $m['movement_date'] <= $dateTo;
                });
                
                $report['details'][] = [
                    'item' => $item,
                    'movements_count' => count($itemMovements),
                    'total_inbound' => array_sum(array_column(array_filter($itemMovements, fn($m) => $m['type'] === 'inbound'), 'quantity')),
                    'total_outbound' => array_sum(array_column(array_filter($itemMovements, fn($m) => $m['type'] === 'outbound'), 'quantity')),
                    'turnover_rate' => calculateTurnoverRate($item),
                    'alert_level' => calculateAlertLevel($item)
                ];
            }
        }
        
        return [
            'success' => true,
            'data' => $report
        ];
        
    } catch (Exception $e) {
        throw new Exception("在庫レポート生成エラー: " . $e->getMessage());
    }
}

function handleTurnoverAnalysis() {
    try {
        $period = $_GET['period'] ?? 'monthly'; // weekly, monthly, quarterly, yearly
        $minTurnover = floatval($_GET['min_turnover'] ?? 0);
        $maxTurnover = floatval($_GET['max_turnover'] ?? 999);
        
        $inventory = loadInventory();
        $analysis = [];
        
        foreach ($inventory as $item) {
            $turnoverRate = calculateTurnoverRate($item);
            
            if ($turnoverRate >= $minTurnover && $turnoverRate <= $maxTurnover) {
                $analysis[] = [
                    'item_id' => $item['id'],
                    'product_name' => $item['product_name'],
                    'sku' => $item['sku'],
                    'current_stock' => $item['current_stock'],
                    'unit_cost' => $item['unit_cost'],
                    'stock_value' => ($item['unit_cost'] ?? 0) * ($item['current_stock'] ?? 0),
                    'turnover_rate' => $turnoverRate,
                    'turnover_category' => categorizeTurnoverRate($turnoverRate),
                    'days_of_stock' => calculateDaysOfStock($item),
                    'recommendation' => getTurnoverRecommendation($turnoverRate)
                ];
            }
        }
        
        // 回転率でソート
        usort($analysis, function($a, $b) {
            return $b['turnover_rate'] - $a['turnover_rate'];
        });
        
        return [
            'success' => true,
            'data' => [
                'analysis' => $analysis,
                'summary' => [
                    'total_items' => count($analysis),
                    'average_turnover' => count($analysis) > 0 ? array_sum(array_column($analysis, 'turnover_rate')) / count($analysis) : 0,
                    'fast_moving' => count(array_filter($analysis, fn($a) => $a['turnover_category'] === 'fast')),
                    'slow_moving' => count(array_filter($analysis, fn($a) => $a['turnover_category'] === 'slow')),
                    'dead_stock' => count(array_filter($analysis, fn($a) => $a['turnover_category'] === 'dead'))
                ]
            ]
        ];
        
    } catch (Exception $e) {
        throw new Exception("回転率分析エラー: " . $e->getMessage());
    }
}

function handleHealthCheck() {
    try {
        $checks = [
            'data_directory' => is_dir(getDataDir()) && is_writable(getDataDir()),
            'inventory_file' => !file_exists(getInventoryFile()) || is_readable(getInventoryFile()),
            'movements_file' => !file_exists(getMovementsFile()) || is_readable(getMovementsFile()),
            'alerts_file' => !file_exists(getAlertsFile()) || is_readable(getAlertsFile()),
            'session_active' => session_status() === PHP_SESSION_ACTIVE,
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

function generateUniqueId() {
    return date('YmdHis') . '_' . bin2hex(random_bytes(4));
}

function findInventoryItemIndex($inventory, $itemId) {
    foreach ($inventory as $index => $item) {
        if ($item['id'] === $itemId) {
            return $index;
        }
    }
    return false;
}

function calculateAlertLevel($item) {
    $currentStock = $item['current_stock'] ?? 0;
    $minThreshold = $item['min_threshold'] ?? 0;
    $criticalThreshold = $item['critical_threshold'] ?? ($minThreshold * 0.5);
    
    if ($currentStock <= 0) {
        return 'out_of_stock';
    } elseif ($currentStock <= $criticalThreshold) {
        return 'critical';
    } elseif ($currentStock <= $minThreshold) {
        return 'warning';
    } else {
        return 'normal';
    }
}

function calculateDaysOfStock($item) {
    $currentStock = $item['current_stock'] ?? 0;
    $averageDailyUsage = $item['average_daily_usage'] ?? ($item['monthly_usage'] ?? 0) / 30;
    
    return $averageDailyUsage > 0 ? $currentStock / $averageDailyUsage : 999;
}

function calculateTurnoverRate($item) {
    $averageStock = ($item['current_stock'] ?? 0);
    $annualUsage = ($item['annual_usage'] ?? 0);
    
    return $averageStock > 0 ? $annualUsage / $averageStock : 0;
}

function categorizeTurnoverRate($rate) {
    if ($rate >= 12) {
        return 'fast'; // 月1回以上
    } elseif ($rate >= 4) {
        return 'medium'; // 3ヶ月に1回以上
    } elseif ($rate >= 1) {
        return 'slow'; // 年1回以上
    } else {
        return 'dead'; // 年1回未満
    }
}

function getTurnoverRecommendation($rate) {
    if ($rate >= 12) {
        return '高回転商品：発注頻度を上げて在庫レベルを最適化';
    } elseif ($rate >= 4) {
        return '中回転商品：定期的な発注で安定した在庫を維持';
    } elseif ($rate >= 1) {
        