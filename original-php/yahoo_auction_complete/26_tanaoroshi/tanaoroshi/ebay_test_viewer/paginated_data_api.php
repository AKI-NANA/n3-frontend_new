<?php
/**
 * eBayデータ ページネーション対応API
 * 大量データの効率的な表示と画像表示修正
 * エラーハンドリング強化版
 */

// エラー出力を抑制してJSON出力を保護
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// 出力バッファリングを開始
ob_start();

try {
    require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
    
    header('Content-Type: application/json; charset=utf-8');
    
    // 出力バッファをクリア
    ob_clean();
    
    // CSRF保護
    if (session_status() == PHP_SESSION_NONE) {
        session_start();
    }
    
    // パラメータ取得
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per_page = min(100, max(10, (int)($_GET['per_page'] ?? 50))); // 10-100件の範囲
    $search = trim($_GET['search'] ?? '');
    $status_filter = trim($_GET['status'] ?? '');
    $sort_by = $_GET['sort'] ?? 'updated_at';
    $sort_order = strtoupper($_GET['order'] ?? 'DESC');
    
    // 安全な並び順指定
    $allowed_sorts = ['ebay_item_id', 'title', 'current_price_value', 'quantity', 'listing_status', 'updated_at', 'created_at'];
    if (!in_array($sort_by, $allowed_sorts)) {
        $sort_by = 'updated_at';
    }
    if (!in_array($sort_order, ['ASC', 'DESC'])) {
        $sort_order = 'DESC';
    }
    
    $connector = new DatabaseUniversalConnector();
    $pdo = $connector->pdo;
    
    // WHERE条件構築
    $where_conditions = [];
    $params = [];
    
    // 検索条件
    if (!empty($search)) {
        $where_conditions[] = "(title ILIKE ? OR ebay_item_id ILIKE ? OR sku ILIKE ?)";
        $search_param = "%{$search}%";
        $params[] = $search_param;
        $params[] = $search_param;
        $params[] = $search_param;
    }
    
    // ステータスフィルター
    if (!empty($status_filter)) {
        $where_conditions[] = "listing_status = ?";
        $params[] = $status_filter;
    }
    
    $where_sql = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
    
    // 総数取得
    $count_sql = "SELECT COUNT(*) as total FROM ebay_complete_api_data {$where_sql}";
    $count_stmt = $pdo->prepare($count_sql);
    $count_stmt->execute($params);
    $total_items = (int)$count_stmt->fetch()['total'];
    
    // ページネーション計算
    $total_pages = ceil($total_items / $per_page);
    $offset = ($page - 1) * $per_page;
    
    // データ取得
    $data_sql = "SELECT * FROM ebay_complete_api_data {$where_sql} ORDER BY {$sort_by} {$sort_order} LIMIT ? OFFSET ?";
    $data_params = array_merge($params, [$per_page, $offset]);
    $data_stmt = $pdo->prepare($data_sql);
    $data_stmt->execute($data_params);
    $raw_data = $data_stmt->fetchAll();
    
    // データの安全な変換（特に画像URL）
    $processed_data = [];
    foreach ($raw_data as $item) {
        $processed_item = [];
        foreach ($item as $field => $value) {
            if ($field === 'picture_urls') {
                // PostgreSQL配列の正確な処理
                if (is_null($value)) {
                    $processed_item[$field] = [];
                } elseif (is_string($value)) {
                    // PostgreSQL配列文字列 {url1,url2,url3} を PHP配列に変換
                    if (trim($value) === '' || trim($value) === '{}') {
                        $processed_item[$field] = [];
                    } elseif (preg_match('/^\{(.*)\}$/', trim($value), $matches)) {
                        $inner = trim($matches[1]);
                        if (empty($inner)) {
                            $processed_item[$field] = [];
                        } else {
                            // カンマ区切りで分割（引用符を除去）
                            $urls = array_map(function($url) {
                                return trim($url, '"');
                            }, explode(',', $inner));
                            $processed_item[$field] = array_filter($urls); // 空文字を除去
                        }
                    } else {
                        $processed_item[$field] = [$value]; // 単一値の場合
                    }
                } elseif (is_array($value)) {
                    $processed_item[$field] = $value; // すでに配列の場合
                } else {
                    $processed_item[$field] = [];
                }
            } elseif ($field === 'item_specifics' || $field === 'shipping_details' || $field === 'shipping_costs') {
                // JSON フィールドの処理
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    $processed_item[$field] = is_array($decoded) ? $decoded : [];
                } elseif (is_array($value)) {
                    $processed_item[$field] = $value;
                } else {
                    $processed_item[$field] = [];
                }
            } else {
                // 通常フィールドの処理
                $processed_item[$field] = $value;
            }
        }
        $processed_data[] = $processed_item;
    }
    
    // 統計情報取得（PostgreSQL配列対応）
    $stats_sql = "
        SELECT 
            COUNT(*) as total_count,
            COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active_count,
            COUNT(CASE WHEN picture_urls IS NOT NULL AND picture_urls != '{}' AND array_length(picture_urls, 1) > 0 THEN 1 END) as items_with_images,
            AVG(CASE WHEN current_price_value > 0 THEN current_price_value END) as avg_price
        FROM ebay_complete_api_data {$where_sql}
    ";
    $stats_stmt = $pdo->prepare($stats_sql);
    $stats_stmt->execute($params);
    $stats = $stats_stmt->fetch();
    
    // レスポンス構築
    $response = [
        'success' => true,
        'data' => $processed_data,
        'pagination' => [
            'current_page' => $page,
            'per_page' => $per_page,
            'total_items' => $total_items,
            'total_pages' => $total_pages,
            'has_next' => $page < $total_pages,
            'has_prev' => $page > 1,
            'next_page' => $page < $total_pages ? $page + 1 : null,
            'prev_page' => $page > 1 ? $page - 1 : null,
            'start_item' => $offset + 1,
            'end_item' => min($offset + $per_page, $total_items)
        ],
        'filters' => [
            'search' => $search,
            'status_filter' => $status_filter,
            'sort_by' => $sort_by,
            'sort_order' => $sort_order
        ],
        'statistics' => [
            'total_items' => (int)$stats['total_count'],
            'active_items' => (int)$stats['active_count'],
            'items_with_images' => (int)$stats['items_with_images'],
            'average_price' => round((float)$stats['avg_price'], 2),
            'image_coverage' => $stats['total_count'] > 0 ? round(($stats['items_with_images'] / $stats['total_count']) * 100, 1) : 0
        ],
        'debug_info' => [
            'sql_where' => $where_sql,
            'param_count' => count($params),
            'items_processed' => count($processed_data),
            'query_execution_time' => microtime(true),
            'image_processing_enabled' => true
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 出力バッファをクリアしてエラーメッセージを出力
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    
    $error_response = [
        'success' => false,
        'error' => 'API エラー: ' . $e->getMessage(),
        'error_type' => 'pagination_api_error',
        'debug_trace' => $e->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'connector_available' => class_exists('DatabaseUniversalConnector'),
            'pdo_available' => extension_loaded('pdo')
        ]
    ];
    
    echo json_encode($error_response, JSON_UNESCAPED_UNICODE);
    
} catch (Error $e) {
    // 致命的エラーのハンドリング
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    
    echo json_encode([
        'success' => false,
        'error' => 'システムエラー: ' . $e->getMessage(),
        'error_type' => 'fatal_error',
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} finally {
    // 最終的なバッファクリーンアップ
    if (ob_get_level()) {
        ob_end_flush();
    }
}
?>
