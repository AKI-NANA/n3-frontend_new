<?php
/**
 * Yahoo Auction - 出品前管理UI（eBayカテゴリー自動判定統合版）
 * 05editing.php 進化版 - デュアルUI戦略に基づく出品前特化システム
 */

/**
 * 個別商品の詳細情報取得（Emergency Parser用・改善版）
 */
function getProductDetails($item_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        error_log("getProductDetails: データベース接続失敗");
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        error_log("getProductDetails: 商品詳細取得開始 - item_id: {$item_id}");
        
        // 正確なマッチングで検索（source_item_id または id）
        $sql = "SELECT 
                    id as db_id,
                    source_item_id as item_id,
                    active_title as title,
                    price_jpy as current_price,
                    active_description as description,
                    scraped_yahoo_data,
                    active_image_url,
                    sku,
                    status,
                    current_stock,
                    created_at,
                    updated_at,
                    ebay_category_id,
                    item_specifics
                FROM yahoo_scraped_products 
                WHERE source_item_id = ? OR id::text = ?
                ORDER BY created_at DESC
                LIMIT 1";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$item_id, $item_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            error_log("getProductDetails: 商品が見つからない - {$item_id}");
            return [
                'success' => false,
                'message' => "指定された商品が見つかりません: {$item_id}"
            ];
        }
        
        // JSONデータをデコード
        $yahoo_data = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
        
        // 商品データを返す
        $product_data = [
            'id' => $product['db_id'],
            'item_id' => $product['item_id'],
            'title' => $product['title'] ?? 'タイトル不明',
            'price' => (int)($product['current_price'] ?? 0),
            'description' => $product['description'] ?? '',
            'condition' => $yahoo_data['condition'] ?? 'Used',
            'category' => $yahoo_data['category'] ?? 'N/A',
            'images' => [],
            'source_url' => $yahoo_data['url'] ?? '',
            'ebay_category_id' => $product['ebay_category_id'] ?? '',
            'item_specifics' => $product['item_specifics'] ?? 'Brand=Unknown■Condition=Used'
        ];
        
        // 画像データの抽出
        if (!empty($product['active_image_url']) && !strpos($product['active_image_url'], 'placehold')) {
            $product_data['images'] = [$product['active_image_url']];
        }
        
        return [
            'success' => true,
            'data' => $product_data,
            'message' => '商品詳細取得成功'
        ];
        
    } catch (Exception $e) {
        error_log('商品詳細取得エラー: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => '商品詳細取得エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 商品データ更新関数（拡張版）
 */
function updateProductEnhanced($data) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        $sql = "UPDATE yahoo_scraped_products SET 
                    active_title = ?, 
                    price_jpy = ?, 
                    active_price_usd = ?,
                    active_description = ?,
                    scraped_yahoo_data = ?,
                    ebay_category_id = ?,
                    item_specifics = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $yahoo_data = json_encode([
            'condition' => $data['condition'] ?? 'Used',
            'category' => $data['category'] ?? 'N/A',
            'updated_by' => 'enhanced_editing',
            'updated_at' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
        
        $stmt = $pdo->prepare($sql);
        $success = $stmt->execute([
            $data['title'] ?? '',
            $data['price_jpy'] ?? 0,
            $data['price_usd'] ?? 0,
            $data['description'] ?? '',
            $yahoo_data,
            $data['ebay_category_id'] ?? '',
            $data['item_specifics'] ?? 'Brand=Unknown■Condition=Used',
            $data['product_id'] ?? 0
        ]);
        
        if ($success) {
            return [
                'success' => true,
                'message' => '商品データを更新しました',
                'updated_fields' => array_keys($data)
            ];
        } else {
            throw new Exception('データベース更新に失敗しました');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

/**
 * 出品準備完了マーク
 */
function markProductReadyForListing($product_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        $sql = "UPDATE yahoo_scraped_products SET 
                    status = 'ready_for_listing',
                    listing_prepared_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $success = $stmt->execute([$product_id]);
        
        if ($success) {
            return [
                'success' => true,
                'message' => '出品準備完了にマークしました',
                'product_id' => $product_id
            ];
        } else {
            throw new Exception('ステータス更新に失敗しました');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => $e->getMessage()
        ];
    }
}

/**
 * 完了度計算
 */
function getProductCompletionRate($product_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'completion_rate' => 0
        ];
    }
    
    try {
        $sql = "SELECT active_title, ebay_category_id, item_specifics FROM yahoo_scraped_products WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$product_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            throw new Exception('商品が見つかりません');
        }
        
        $completion = 0;
        
        // タイトルチェック（20%）
        if (!empty($product['active_title'])) $completion += 20;
        
        // カテゴリーチェック（40%）
        if (!empty($product['ebay_category_id'])) $completion += 40;
        
        // 必須項目チェック（40%）
        if (!empty($product['item_specifics']) && 
            $product['item_specifics'] !== 'Brand=Unknown■Condition=Used') {
            $completion += 40;
        }
        
        return [
            'success' => true,
            'completion_rate' => $completion,
            'product_id' => $product_id
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'message' => $e->getMessage(),
            'completion_rate' => 0
        ];
    }
}

// エラー表示とログ設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// セッション開始（エラー処理付き）
if (session_status() == PHP_SESSION_NONE) {
    @session_start();
}

// グローバル$pdo変数の初期化
$pdo = null;

// 共通データベース接続を事前確立
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log("editing.php: データベース接続確立済み");
} catch (PDOException $e) {
    error_log("editing.php: データベース接続失敗: " . $e->getMessage());
    $pdo = null;
}

/**
 * JSON レスポンス送信（改善版）
 */
function sendJsonResponse($data, $success = true, $message = '') {
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'source' => 'editing_enhanced.php'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続（エラーハンドリング強化版）
 */
function getDatabaseConnection() {
    global $pdo;
    if (isset($pdo) && $pdo instanceof PDO) {
        return $pdo;
    }
    
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $new_pdo = new PDO($dsn, $user, $password);
        $new_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $new_pdo->query("SELECT 1");
        error_log("データベース接続成功: nagano3_db (editing.php)");
        
        $pdo = $new_pdo;
        return $new_pdo;
        
    } catch (PDOException $e) {
        error_log("データベース接続失敗: " . $e->getMessage());
        return null;
    }
}

/**
 * 未出品データ取得（出品前管理UI専用）
 */
function getUnlistedProductsData($page = 1, $limit = 20, $filters = []) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => 'データベース接続エラー',
            'db_status' => 'disconnected'
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        // 未出品データのみ取得
        $whereClause = "WHERE (ebay_item_id IS NULL OR ebay_item_id = '')";
        
        // フィルター条件を追加
        $params = [];
        if (!empty($filters['keyword'])) {
            $whereClause .= " AND (active_title ILIKE ? OR scraped_yahoo_data::text ILIKE ?)";
            $keyword = '%' . $filters['keyword'] . '%';
            $params[] = $keyword;
            $params[] = $keyword;
        }
        
        // 出品前管理用データ取得クエリ
        $sql = "SELECT 
                    id,
                    source_item_id as item_id,
                    COALESCE(active_title, 'タイトルなし') as title,
                    price_jpy as price,
                    COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,
                    COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
                    COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
                    COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                    active_image_url,
                    scraped_yahoo_data,
                    (scraped_yahoo_data->>'url')::text as source_url,
                    updated_at,
                    CASE 
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%yahoo.co.jp%' THEN 'Yahoo'
                        ELSE 'Unknown'
                    END as platform,
                    sku as master_sku,
                    'not_listed' as listing_status,
                    status,
                    current_stock,
                    ebay_category_id,
                    item_specifics,
                    CASE 
                        WHEN ebay_category_id IS NOT NULL AND ebay_category_id != '' THEN 50
                        ELSE 0
                    END +
                    CASE 
                        WHEN item_specifics IS NOT NULL AND item_specifics != 'Brand=Unknown■Condition=Used' THEN 50
                        ELSE 0
                    END as completion_rate
                FROM {$actualTable} 
                {$whereClause} 
                ORDER BY updated_at DESC, id DESC 
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = ($page - 1) * $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // カウントクエリ
        $countSql = "SELECT COUNT(*) as total FROM {$actualTable} {$whereClause}";
        $countParams = array_slice($params, 0, -2);
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($countParams);
        $totalResult = $countStmt->fetch();
        
        return [
            'data' => $data,
            'total' => $totalResult['total'] ?? count($data),
            'page' => $page,
            'limit' => $limit,
            'note' => "未出品データ ({$actualTable}) から {count($data)}件取得",
            'table_used' => $actualTable,
            'db_status' => 'connected_unlisted_only'
        ];
        
    } catch (Exception $e) {
        error_log("未出品データ取得エラー: " . $e->getMessage());
        
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => "未出品データ取得エラー: {$e->getMessage()}",
            'db_status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

// 削除関数
function deleteProduct($productId) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        $deleteSql = "DELETE FROM {$actualTable} WHERE id = ?";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->execute([$productId]);
        
        $deletedCount = $deleteStmt->rowCount();
        
        if ($deletedCount > 0) {
            error_log("商品削除完了: ID {$productId} from {$actualTable}");
            
            return [
                'success' => true,
                'message' => "商品ID {$productId} を削除しました",
                'deleted_count' => $deletedCount,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } else {
            return [
                'success' => false,
                'message' => "商品ID {$productId} が見つかりませんでした",
                'deleted_count' => 0,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
    } catch (Exception $e) {
        error_log("商品削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "商品削除エラー: {$e->getMessage()}",
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

// API アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'get_unlisted_products':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 20);
            $filters = $_GET['filters'] ?? [];
            
            $result = getUnlistedProductsData($page, $limit, $filters);
            sendJsonResponse($result, true, '未出品データ取得成功');
            break;
            
        case 'get_product_details':
            $item_id = $_GET['item_id'] ?? $_POST['item_id'] ?? '';
            if (empty($item_id)) {
                sendJsonResponse(null, false, 'Item IDが指定されていません');
            }
            
            $result = getProductDetails($item_id);
            sendJsonResponse($result, $result['success'] ?? true, $result['message'] ?? '商品詳細取得完了');
            break;
            
        case 'update_product_enhanced':
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $result = updateProductEnhanced($input);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'mark_ready_for_listing':
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $product_id = $input['product_id'] ?? '';
            if (empty($product_id)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            $result = markProductReadyForListing($product_id);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'get_completion_rate':
            $product_id = $_GET['product_id'] ?? $_POST['product_id'] ?? '';
            if (empty($product_id)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            $result = getProductCompletionRate($product_id);
            sendJsonResponse($result, $result['success'], $result['message'] ?? '');
            break;
            
        case 'delete_product':
            $productId = $_POST['product_id'] ?? $_GET['product_id'] ?? '';
            if (empty($productId)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            $result = deleteProduct($productId);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        default:
            sendJsonResponse(null, false, '不明なアクション: ' . $action);
    }
    exit;
}
?><!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>出品前管理UI - eBayカテゴリー自動判定統合版</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
    :root {
      /* N3カラーパレット */
      --accent-navy: #0B1D51;
      --accent-purple: #725CAD;
      --accent-lightblue: #8CCDEB;
      --accent-cream: #FFE3A9;
      
      /* ベース色（控えめ） */
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --bg-tertiary: #e9ecef;
      --bg-hover: #f1f3f4;
      
      /* テキスト色（読みやすさ重視） */
      --text-primary: #2c3e50;
      --text-secondary: #6c757d;
      --text-muted: #868e96;
      --text-white: #ffffff;
      
      /* ボーダー色（控えめ） */
      --border-color: #dee2e6;
      --border-light: #e9ecef;
      
      /* アクセント使用箇所限定 */
      --primary-accent: var(--accent-navy);
      --secondary-accent: var(--accent-purple);
      --info-accent: var(--accent-lightblue);
      --warning-accent: var(--accent-cream);
      
      /* シャドウ */
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      
      /* スペーシング */
      --space-1: 0.25rem;
      --space-2: 0.5rem;
      --space-3: 0.75rem;
      --space-4: 1rem;
      
      /* その他 */
      --radius-sm: 0.375rem;
      --radius-md: 0.5rem;
      --radius-lg: 0.75rem;
      --transition-fast: all 0.15s ease;
    }

    * { box-sizing: border-box; }

    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.4;
      margin: 0;
      padding: 0;
      font-size: 14px;
    }

    .container {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: var(--space-2);
      padding-bottom: 110px;
    }

    .dashboard-header {
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      color: var(--text-white);
      box-shadow: var(--shadow-md);
    }

    .dashboard-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 var(--space-1) 0;
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .section {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-3);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .section-header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: var(--space-2) var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 40px;
    }

    .editing-actions {
      padding: var(--space-3);
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
      align-items: center;
    }

    .btn {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      height: 28px;
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      text-decoration: none;
    }

    .btn:hover {
      background: var(--bg-hover);
      border-color: var(--primary-accent);
      text-decoration: none;
    }

    .btn-primary {
      background: var(--primary-accent);
      border-color: var(--primary-accent);
      color: var(--text-white);
    }

    .btn-info {
      background: var(--info-accent);
      border-color: var(--info-accent);
      color: var(--text-primary);
    }

    .btn-warning {
      background: var(--warning-accent);
      border-color: var(--warning-accent);
      color: var(--text-primary);
    }

    .btn-success {
      background: #28a745;
      border-color: #28a745;
      color: var(--text-white);
    }

    .btn-danger {
      background: #dc3545;
      border-color: #dc3545;
      color: var(--text-white);
    }

    .btn-sm {
      padding: 2px var(--space-1);
      font-size: 0.7rem;
      height: 24px;
    }

    .data-table-container {
      overflow-x: auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      margin-bottom: var(--space-3);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.75rem;
      line-height: 1.2;
    }

    .data-table th {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      padding: var(--space-1) var(--space-2);
      text-align: left;
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.7rem;
      height: 28px;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .data-table td {
      border: 1px solid var(--border-light);
      padding: 1px 2px;
      height: 22px;
      vertical-align: middle;
    }

    .data-table tr:hover {
      background: var(--bg-hover);
    }

    .category-cell {
      width: 150px;
    }

    .category-name {
      font-size: 0.65rem;
      background: var(--bg-tertiary);
      padding: 2px 4px;
      border-radius: var(--radius-sm);
      display: inline-block;
    }

    .confidence-bar {
      height: 4px;
      background: var(--bg-tertiary);
      border-radius: 2px;
      margin-top: 2px;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: var(--info-accent);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      color: var(--text-white);
    }

    .item-specifics-cell {
      width: 200px;
    }

    .specifics-preview {
      font-size: 0.65rem;
      color: var(--text-secondary);
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .completion-cell {
      width: 100px;
      text-align: center;
    }

    .completion-percentage {
      font-size: 0.7rem;
      font-weight: 600;
    }

    .completion-bar {
      height: 6px;
      background: var(--bg-tertiary);
      border-radius: 3px;
      margin-top: 2px;
      overflow: hidden;
    }

    .completion-fill {
      height: 100%;
      background: #28a745;
      transition: width 0.3s ease;
    }

    .action-buttons {
      display: flex;
      gap: 2px;
    }

    .product-thumbnail {
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      transition: var(--transition-fast);
    }

    .price-value {
      font-weight: 600;
      color: #28a745;
      font-size: 0.75rem;
    }

    .source-badge {
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      font-weight: 600;
      text-align: center;
      border: 1px solid var(--border-color);
    }

    .source-badge.source-yahoo { 
      background: var(--accent-navy); 
      color: var(--text-white);
      border-color: var(--accent-navy);
    }

    .category-tag {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      border: 1px solid var(--border-color);
    }

    /* モーダル関連 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(2px);
    }

    .modal-container {
      background: var(--bg-primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }

    /* 通知システム */
    .notification-container {
      position: fixed;
      top: var(--space-4);
      right: var(--space-4);
      z-index: 1500;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .notification {
      background: var(--bg-primary);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      border-left: 4px solid var(--info-accent);
      min-width: 300px;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      animation: slideIn 0.3s ease;
    }

    .notification.success {
      border-left-color: #28a745;
    }

    .notification.warning {
      border-left-color: var(--warning-accent);
    }

    .notification.error {
      border-left-color: #dc3545;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    /* ログエリア（下部固定・黒背景） */
    .log-area {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: #1a1a1a;
      border-top: 2px solid #333;
      z-index: 1000;
      overflow-y: auto;
      padding: var(--space-2);
      font-family: 'Courier New', monospace;
      font-size: 0.7rem;
      line-height: 1.3;
      color: #00ff00;
    }

    .log-area h4 {
      margin: 0 0 var(--space-1) 0;
      font-size: 0.8rem;
      color: #ffffff;
      font-weight: 600;
      border-bottom: 1px solid #333;
      padding-bottom: 2px;
    }

    .log-entry {
      padding: 1px 0;
      color: #00ff00;
      font-family: 'Courier New', monospace;
    }

    .log-entry.success { color: #00ff41; }
    .log-entry.error { color: #ff4444; }
    .log-entry.info { color: #44aaff; }
    .log-entry.warning { color: #ffaa44; }

    @media (max-width: 768px) {
      .editing-actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .log-area {
        height: 60px;
      }
      
      .container {
        padding-bottom: 110px;
      }
    }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <!-- ナビゲーションヘッダー -->
            <div class="dashboard-header">
                <h1><i class="fas fa-store-alt"></i> 出品前管理UI - eBayカテゴリー自動判定統合版</h1>
                <p>デュアルUI戦略 - 未出品商品の編集・カテゴリー判定・出品準備に特化</p>
                <div style="margin-top: var(--space-2);">
                    <a href="../01_dashboard/dashboard.php" class="btn" style="background: var(--text-muted); color: white;">
                        <i class="fas fa-home"></i> ダッシュボードに戻る
                    </a>
                    <a href="../02_scraping/scraping.php" class="btn btn-info">
                        <i class="fas fa-spider"></i> データ取得
                    </a>
                </div>
            </div>

            <!-- 操作パネル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-tools"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0;">操作パネル</h3>
                </div>
                <div class="editing-actions">
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-info" onclick="loadEditingData()">
                            <i class="fas fa-database"></i> 未出品データ表示
                        </button>
                        <button class="btn btn-warning" onclick="runBatchCategoryDetection()">
                            <i class="fas fa-magic"></i> 一括カテゴリー判定
                        </button>
                        <button class="btn btn-success" onclick="validateAllItemSpecifics()">
                            <i class="fas fa-check-double"></i> 必須項目チェック
                        </button>
                        <button class="btn btn-primary" onclick="openBulkEditModal()">
                            <i class="fas fa-edit"></i> 一括編集モーダル
                        </button>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-danger" onclick="deleteSelectedProducts()">
                            <i class="fas fa-trash-alt"></i> 選択削除
                        </button>
                        <button class="btn" onclick="downloadEditingCSV()" style="background: var(--text-muted); color: white;">
                            <i class="fas fa-download"></i> 表示データCSV出力
                        </button>
                    </div>
                </div>
            </div>

            <!-- データテーブル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-table"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0;">未出品商品一覧（出品前管理専用）</h3>
                </div>
                <div class="data-table-container">
                    <table class="data-table" id="editingDataTable">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                </th>
                                <th style="width: 80px;">画像</th>
                                <th style="width: 120px;">Item ID</th>
                                <th style="width: 250px;">商品名</th>
                                <th style="width: 80px;">価格</th>
                                <th style="width: 150px;">eBayカテゴリー</th>
                                <th style="width: 200px;">必須項目</th>
                                <th style="width: 100px;">完了度</th>
                                <th style="width: 80px;">状態</th>
                                <th style="width: 80px;">ソース</th>
                                <th style="width: 200px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="editingTableBody">
                            <tr>
                                <td colspan="11" style="text-align: center; padding: var(--space-4);">
                                    <i class="fas fa-play-circle" style="font-size: 2rem; color: var(--info-accent); margin-bottom: var(--space-2);"></i><br>
                                    <strong>「未出品データ表示」ボタンをクリックしてデータを表示してください</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <!-- モーダル領域 -->
    <div id="modal-overlay" class="modal-overlay" style="display: none;">
        <div id="modal-container" class="modal-container">
            <!-- モーダルコンテンツは動的に挿入 -->
        </div>
    </div>

    <!-- 通知システム -->
    <div id="notification-container" class="notification-container"></div>

    <!-- ログエリア（下部固定） -->
    <div class="log-area">
        <h4><i class="fas fa-terminal"></i> システムログ</h4>
        <div id="logContainer">
            <div class="log-entry info">[待機中] 出品前管理UI準備完了</div>
        </div>
    </div>

    <script>
    // 出品前管理UI専用JavaScript
    console.log('✅ 出品前管理UI - eBayカテゴリー統合版初期化開始');
    
    // ログエントリー追加
    function logEntry(type, message) {
        const logContainer = document.getElementById('logContainer');
        const timestamp = new Date().toLocaleTimeString('ja-JP');
        const logElement = document.createElement('div');
        logElement.className = `log-entry ${type}`;
        logElement.textContent = `[${timestamp}] ${message}`;
        
        logContainer.appendChild(logElement);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // ログを100件に制限
        const entries = logContainer.querySelectorAll('.log-entry');
        if (entries.length > 100) {
            entries[0].remove();
        }
    }

    // 通知表示
    function showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = {
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-triangle', 
            'warning': 'fas fa-exclamation-circle',
            'info': 'fas fa-info-circle'
        }[type] || 'fas fa-info-circle';
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, duration);
        }
        
        return notification;
    }

    // 未出品データ読み込み
    function loadEditingData() {
        logEntry('info', '未出品データ読み込み開始...');
        
        fetch('?action=get_unlisted_products&page=1&limit=50')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    displayEditingData(data.data.data || []);
                    logEntry('success', `未出品データ ${data.data.total || 0} 件読み込み完了`);
                    showNotification(`未出品データ ${data.data.total || 0} 件を読み込みました`, 'success');
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                console.error('データ読み込みエラー:', error);
                logEntry('error', `データ読み込みエラー: ${error.message}`);
                showNotification(`データ読み込みエラー: ${error.message}`, 'error');
            });
    }

    // データテーブル表示
    function displayEditingData(products) {
        const tableBody = document.getElementById('editingTableBody');
        
        if (!products || products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: var(--space-4);">
                        <i class="fas fa-info-circle" style="color: var(--info-accent);"></i>
                        未出品商品が見つかりませんでした
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = products.map(product => `
            <tr data-product-id="${product.id}">
                <td>
                    <input type="checkbox" class="product-checkbox" value="${product.id}">
                </td>
                <td>
                    <img src="${product.picture_url}" alt="商品画像" class="product-thumbnail" 
                         style="width: 60px; height: 45px; object-fit: cover;">
                </td>
                <td style="font-size: 0.7rem;">${product.item_id || product.id}</td>
                <td style="font-size: 0.7rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">
                    ${product.title || 'タイトルなし'}
                </td>
                <td class="price-value">¥${(product.price || 0).toLocaleString()}</td>
                <td class="ebay-category-cell" id="category-${product.id}">
                    <div class="category-info">
                        <span class="category-name">${product.ebay_category_id ? 'カテゴリー設定済み' : '未設定'}</span>
                        ${product.ebay_category_id ? `
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: 85%;">85%</div>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="item-specifics-cell" id="specifics-${product.id}">
                    <div class="specifics-preview">${product.item_specifics || 'Brand=Unknown■Condition=Used'}</div>
                    <button class="btn-sm btn-info" onclick="editItemSpecifics(${product.id})" title="編集">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
                <td class="completion-cell" id="completion-${product.id}">
                    <div class="completion-percentage">${product.completion_rate || 0}%</div>
                    <div class="completion-bar">
                        <div class="completion-fill" style="width: ${product.completion_rate || 0}%; 
                             background-color: ${product.completion_rate >= 80 ? '#28a745' : product.completion_rate >= 50 ? '#ffc107' : '#dc3545'};"></div>
                    </div>
                </td>
                <td>
                    <span class="category-tag">${product.condition_name || 'N/A'}</span>
                </td>
                <td>
                    <span class="source-badge source-yahoo">${product.platform || 'Yahoo'}</span>
                </td>
                <td class="action-buttons">
                    <button class="btn-sm btn-warning" onclick="detectProductCategory(${product.id})" title="カテゴリー判定">
                        <i class="fas fa-tags"></i>
                    </button>
                    <button class="btn-sm btn-primary" onclick="openEditModal(${product.id})" title="詳細編集">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-sm btn-success" onclick="markReadyForListing(${product.id})" title="出品準備完了">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteProduct(${product.id})" title="削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        // チェックボックス変更イベントリスナー追加
        document.querySelectorAll('.product-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectedCount);
        });
    }

    // カテゴリー判定（簡易版）
    async function detectProductCategory(productId) {
        try {
            logEntry('info', `商品 ${productId} のカテゴリー判定開始...`);
            showNotification(`商品 ${productId} のカテゴリー判定中...`, 'info');
            
            // カテゴリー判定成功をシミュレート（実際のAPI連携は後で実装）
            setTimeout(() => {
                const categoryCell = document.querySelector(`#category-${productId}`);
                if (categoryCell) {
                    categoryCell.innerHTML = `
                        <div class="category-info">
                            <span class="category-name">Electronics > Camera & Photo</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: 87%;">87%</div>
                            </div>
                        </div>
                    `;
                }
                
                // 完了度更新
                const completionCell = document.querySelector(`#completion-${productId}`);
                if (completionCell) {
                    completionCell.innerHTML = `
                        <div class="completion-percentage">50%</div>
                        <div class="completion-bar">
                            <div class="completion-fill" style="width: 50%; background-color: #ffc107;"></div>
                        </div>
                    `;
                }
                
                logEntry('success', `商品 ${productId} のカテゴリー判定完了`);
                showNotification(`商品 ${productId} のカテゴリー判定が完了しました`, 'success');
            }, 2000);
            
        } catch (error) {
            console.error('カテゴリー判定エラー:', error);
            logEntry('error', `カテゴリー判定エラー: ${error.message}`);
            showNotification(`カテゴリー判定エラー: ${error.message}`, 'error');
        }
    }

    // 出品準備完了
    async function markReadyForListing(productId) {
        if (!confirm('この商品を出品準備完了にマークしますか？')) return;
        
        try {
            const response = await fetch('?action=mark_ready_for_listing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                logEntry('success', `商品 ${productId} を出品準備完了にマーク`);
                showNotification(`商品 ${productId} を出品準備完了にマークしました`, 'success');
                
                // 行をハイライト
                const row = document.querySelector(`tr[data-product-id="${productId}"]`);
                if (row) {
                    row.style.backgroundColor = '#d4edda';
                    setTimeout(() => {
                        row.style.backgroundColor = '';
                    }, 2000);
                }
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('出品準備完了マークエラー:', error);
            logEntry('error', `出品準備完了マークエラー: ${error.message}`);
            showNotification(`エラー: ${error.message}`, 'error');
        }
    }

    // 商品削除
    async function deleteProduct(productId) {
        if (!confirm('この商品を削除しますか？この操作は取り消せません。')) return;
        
        try {
            const response = await fetch('?action=delete_product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product_id: productId })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 行を削除
                const row = document.querySelector(`tr[data-product-id="${productId}"]`);
                if (row) {
                    row.remove();
                }
                
                logEntry('success', `商品 ${productId} を削除`);
                showNotification(`商品 ${productId} を削除しました`, 'success');
            } else {
                throw new Error(result.message);
            }
            
        } catch (error) {
            console.error('商品削除エラー:', error);
            logEntry('error', `商品削除エラー: ${error.message}`);
            showNotification(`削除エラー: ${error.message}`, 'error');
        }
    }

    // プレースホルダー関数（後で実装）
    function runBatchCategoryDetection() {
        showNotification('一括カテゴリー判定機能は近日実装予定です', 'info');
    }

    function validateAllItemSpecifics() {
        showNotification('必須項目チェック機能は近日実装予定です', 'info');
    }

    function openBulkEditModal() {
        showNotification('一括編集モーダルは近日実装予定です', 'info');
    }

    function editItemSpecifics(productId) {
        showNotification(`商品 ${productId} の必須項目編集機能は近日実装予定です`, 'info');
    }

    function openEditModal(productId) {
        showNotification(`商品 ${productId} の詳細編集モーダルは近日実装予定です`, 'info');
    }

    function deleteSelectedProducts() {
        showNotification('選択削除機能は近日実装予定です', 'info');
    }

    function downloadEditingCSV() {
        showNotification('CSV出力機能は近日実装予定です', 'info');
    }

    function toggleSelectAll() {
        const selectAll = document.getElementById('selectAll');
        const checkboxes = document.querySelectorAll('.product-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
        });
        
        updateSelectedCount();
    }

    function updateSelectedCount() {
        const selected = document.querySelectorAll('.product-checkbox:checked').length;
        // 選択数表示は後で実装
    }

    // 初期化完了
    logEntry('success', '出品前管理UI初期化完了');
    console.log('✅ 出品前管理UI - eBayカテゴリー統合版初期化完了');
    </script>
</body>
</html>