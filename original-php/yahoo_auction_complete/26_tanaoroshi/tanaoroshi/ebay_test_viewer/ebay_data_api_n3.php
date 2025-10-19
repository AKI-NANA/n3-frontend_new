<?php
/**
 * N3統合eBayデータビューア APIエンドポイント
 * 
 * @version 1.0
 * @features PostgreSQL連携・画像表示エラー解決・リアルタイム更新
 * @security CSRF保護・入力サニタイゼーション・SQL injection防止
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// N3基本設定読み込み
// require_once('../../common/config/config.php');  // N3独立動作のため不要

// 最小限DB設定
require_once('../../modules/apikey/nagano3_db_config.php');
require_once('ebay_api_n3_operations.php');

// セッション・CSRF確認
session_start();

/**
 * JSON応答送信
 */
function sendJsonResponse($success, $data = null, $error = null, $pagination = null) {
    $response = [
        'success' => $success,
        'timestamp' => date('Y-m-d H:i:s'),
        'server_time' => time()
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if ($error !== null) {
        $response['error'] = $error;
    }
    
    if ($pagination !== null) {
        $response['pagination'] = $pagination;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * CSRF トークン確認
 */
function validateCsrfToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * 入力サニタイゼーション
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

try {
    
    // POST確認
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(false, null, 'POST method required');
    }
    
    // アクション取得
    $action = sanitizeInput($_POST['action'] ?? '');
    
    if (empty($action)) {
        sendJsonResponse(false, null, 'Action parameter required');
    }
    
    // CSRF確認（統計取得以外）
    if ($action !== 'get_statistics') {
        $csrf_token = sanitizeInput($_POST['csrf_token'] ?? '');
        if (!validateCsrfToken($csrf_token)) {
            sendJsonResponse(false, null, 'Invalid CSRF token');
        }
    }
    
// データベース接続
    $pdo = new PDO(
        "pgsql:host=" . NAGANO3_DB_HOST . ";dbname=nagano3;port=" . NAGANO3_DB_PORT,
        NAGANO3_DB_USER,
        NAGANO3_DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    
    // アクション分岐
    switch ($action) {
        
        case 'get_data':
            // データ取得（メイン機能）
            $page = max(1, (int)($_POST['page'] ?? 1));
            $perPage = max(10, min(100, (int)($_POST['per_page'] ?? 50)));
            $search = sanitizeInput($_POST['search'] ?? '');
            $filters = sanitizeInput($_POST['filters'] ?? []);
            
            // WHERE条件構築
            $whereConditions = [];
            $params = [];
            
            // 検索条件
            if (!empty($search)) {
                $whereConditions[] = "(title ILIKE :search OR ebay_item_id ILIKE :search)";
                $params[':search'] = '%' . $search . '%';
            }
            
            // フィルター条件
            if (!empty($filters['status'])) {
                $whereConditions[] = "listing_status = :status";
                $params[':status'] = $filters['status'];
            }
            
            if (isset($filters['has_image'])) {
                if ($filters['has_image'] === 'true') {
                    $whereConditions[] = "picture_url IS NOT NULL AND picture_url != ''";
                } elseif ($filters['has_image'] === 'false') {
                    $whereConditions[] = "(picture_url IS NULL OR picture_url = '')";
                }
            }
            
            // ソート条件
            $sortField = sanitizeInput($_POST['sort_field'] ?? 'updated_at');
            $sortDirection = sanitizeInput($_POST['sort_direction'] ?? 'DESC');
            
            $allowedSortFields = ['ebay_item_id', 'title', 'current_price_value', 'quantity', 'listing_status', 'updated_at'];
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'updated_at';
            }
            
            if (!in_array(strtoupper($sortDirection), ['ASC', 'DESC'])) {
                $sortDirection = 'DESC';
            }
            
            // WHERE文構築
            $whereClause = '';
            if (!empty($whereConditions)) {
                $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);
            }
            
            // 総件数取得
            $countQuery = "SELECT COUNT(*) as total FROM ebay_complete_api_data $whereClause";
            $countStmt = $pdo->prepare($countQuery);
            $countStmt->execute($params);
            $totalCount = (int)$countStmt->fetch()['total'];
            
            // ページネーション計算
            $totalPages = ceil($totalCount / $perPage);
            $offset = ($page - 1) * $perPage;
            
            // データ取得
            $dataQuery = "
                SELECT 
                    ebay_item_id,
                    title,
                    current_price_value,
                    current_price_currency_id,
                    quantity,
                    listing_status,
                    condition_display_name,
                    category_name,
                    picture_url,
                    view_item_url,
                    updated_at,
                    created_at
                FROM ebay_complete_api_data 
                $whereClause 
                ORDER BY $sortField $sortDirection 
                LIMIT :limit OFFSET :offset
            ";
            
            $dataStmt = $pdo->prepare($dataQuery);
            foreach ($params as $key => $value) {
                $dataStmt->bindValue($key, $value);
            }
            $dataStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
            $dataStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $dataStmt->execute();
            
            $data = $dataStmt->fetchAll();
            
            // ページネーション情報
            $pagination = [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_count' => $totalCount,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'start_item' => $offset + 1,
                'end_item' => min($offset + $perPage, $totalCount)
            ];
            
            sendJsonResponse(true, $data, null, $pagination);
            break;
            
        case 'get_statistics':
            // 統計情報取得
            $statsQuery = "
                SELECT 
                    COUNT(*) as total_items,
                    COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active_items,
                    COUNT(CASE WHEN listing_status = 'Ended' THEN 1 END) as ended_items,
                    COUNT(CASE WHEN listing_status = 'Sold' THEN 1 END) as sold_items,
                    COUNT(CASE WHEN picture_url IS NOT NULL AND picture_url != '' THEN 1 END) as items_with_images,
                    AVG(CASE WHEN current_price_value > 0 THEN current_price_value END) as avg_price,
                    SUM(CASE WHEN listing_status = 'Active' THEN quantity ELSE 0 END) as total_active_quantity
                FROM ebay_complete_api_data
            ";
            
            $statsStmt = $pdo->query($statsQuery);
            $stats = $statsStmt->fetch();
            
            // 統計データフォーマット
            $formattedStats = [
                'total_items' => (int)$stats['total_items'],
                'active_items' => (int)$stats['active_items'],
                'ended_items' => (int)$stats['ended_items'],
                'sold_items' => (int)$stats['sold_items'],
                'items_with_images' => (int)$stats['items_with_images'],
                'avg_price' => round((float)$stats['avg_price'], 2),
                'total_active_quantity' => (int)$stats['total_active_quantity'],
                'image_coverage' => $stats['total_items'] > 0 ? 
                    round(($stats['items_with_images'] / $stats['total_items']) * 100, 1) : 0
            ];
            
            sendJsonResponse(true, $formattedStats);
            break;
            
        case 'bulk_stop_listings':
            // 一括停止（実装は既存API継承）
            $itemIds = sanitizeInput($_POST['item_ids'] ?? []);
            
            if (empty($itemIds) || !is_array($itemIds)) {
                sendJsonResponse(false, null, 'Item IDs required');
            }
            
            // eBay API連携（既存システム継承）
            $operations = new EbayApiN3Operations();
            $result = $operations->bulkStopListings($itemIds);
            
            sendJsonResponse($result['success'], $result['data'] ?? null, $result['error'] ?? null);
            break;
            
        case 'bulk_update_inventory':
            // 一括在庫更新
            $itemIds = sanitizeInput($_POST['item_ids'] ?? []);
            $quantity = (int)($_POST['quantity'] ?? 0);
            
            if (empty($itemIds) || !is_array($itemIds)) {
                sendJsonResponse(false, null, 'Item IDs required');
            }
            
            if ($quantity < 0) {
                sendJsonResponse(false, null, 'Invalid quantity');
            }
            
            // eBay API連携（既存システム継承）
            $operations = new EbayApiN3Operations();
            $result = $operations->bulkUpdateInventory($itemIds, $quantity);
            
            sendJsonResponse($result['success'], $result['data'] ?? null, $result['error'] ?? null);
            break;
            
        case 'export_data':
            // データエクスポート
            $format = sanitizeInput($_POST['format'] ?? 'csv');
            $filters = sanitizeInput($_POST['filters'] ?? []);
            
            // エクスポート処理（実装は既存システム継承）
            $operations = new EbayApiN3Operations();
            $result = $operations->exportData($format, $filters);
            
            sendJsonResponse($result['success'], $result['data'] ?? null, $result['error'] ?? null);
            break;
            
        default:
            sendJsonResponse(false, null, 'Unknown action: ' . $action);
            break;
    }
    
} catch (PDOException $e) {
    error_log('eBay Data API Database Error: ' . $e->getMessage());
    sendJsonResponse(false, null, 'Database error occurred');
    
} catch (Exception $e) {
    error_log('eBay Data API Error: ' . $e->getMessage());
    sendJsonResponse(false, null, 'An error occurred: ' . $e->getMessage());
}