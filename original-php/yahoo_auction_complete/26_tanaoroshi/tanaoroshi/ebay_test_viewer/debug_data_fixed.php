<?php
/**
 * eBayデータテスト・ビューアー（エラーハンドリング完全版）
 * SyntaxError: Unexpected token '<' 修正版
 */

// 🔧 重要：PHP出力をJSON専用に制限
ini_set('display_errors', 0);  // HTMLエラー出力を無効化
ini_set('log_errors', 1);      // ログへのエラー記録は有効
error_reporting(E_ALL);

// 🔧 JSON専用ヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

// 🔧 エラーハンドラー：全てのエラーをJSON形式で返す
function handleError($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'php_error',
        'severity' => $severity,
        'message' => $message,
        'file' => basename($file),
        'line' => $line,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function handleException($e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'exception',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

set_error_handler('handleError');
set_exception_handler('handleException');

try {
    // 🔧 セキュリティ定義
    if (!defined('SECURE_ACCESS')) {
        define('SECURE_ACCESS', true);
    }

    // 🔧 相対パスでの安全な接続（Webサーバー対応）
    $possible_connector_paths = [
        __DIR__ . '/../../database_universal_connector.php',
        __DIR__ . '/../database_universal_connector.php',
        __DIR__ . '/database_universal_connector.php',
        dirname(__DIR__) . '/database_universal_connector.php'
    ];

    $connector_path = null;
    foreach ($possible_connector_paths as $path) {
        if (file_exists($path)) {
            $connector_path = $path;
            break;
        }
    }

    if (!$connector_path) {
        throw new Exception("database_universal_connector.php が見つかりません。確認したパス: " . implode(', ', $possible_connector_paths));
    }

    require_once $connector_path;

    // 🔧 クラス存在確認
    if (!class_exists('DatabaseUniversalConnector')) {
        throw new Exception("DatabaseUniversalConnectorクラスが定義されていません。ファイル: " . basename($connector_path));
    }

    // 🔧 データベース接続
    $connector = new DatabaseUniversalConnector();
    
    if (!$connector->pdo) {
        throw new Exception("データベース接続に失敗しました");
    }

    // 🔧 テーブル存在確認
    $tableCheckSql = "SELECT count(*) FROM information_schema.tables WHERE table_name = 'ebay_complete_api_data'";
    $tableCheckStmt = $connector->pdo->prepare($tableCheckSql);
    $tableCheckStmt->execute();
    $tableExists = $tableCheckStmt->fetchColumn() > 0;

    if (!$tableExists) {
        throw new Exception("テーブル 'ebay_complete_api_data' が存在しません");
    }

    // 🔧 基本統計（エラーハンドリング付き）
    $statsSql = "
        SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN picture_urls IS NOT NULL AND CAST(picture_urls AS TEXT) != '' AND CAST(picture_urls AS TEXT) != '[]' THEN 1 END) as records_with_images
        FROM ebay_complete_api_data
    ";
    
    $statsStmt = $connector->pdo->prepare($statsSql);
    $statsStmt->execute();
    $tableStats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    if (!$tableStats) {
        throw new Exception("統計データの取得に失敗しました");
    }

    // 🔧 存在するカラムの動的取得
    $columnsSql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'ebay_complete_api_data' ORDER BY ordinal_position";
    $columnsStmt = $connector->pdo->prepare($columnsSql);
    $columnsStmt->execute();
    $availableColumns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);

    // 🔧 必要な最小カラムセット
    $requiredColumns = ['id', 'ebay_item_id', 'title', 'sku', 'current_price_value', 'picture_urls'];
    $missingColumns = array_diff($requiredColumns, $availableColumns);
    
    if (!empty($missingColumns)) {
        throw new Exception("必要なカラムが不足しています: " . implode(', ', $missingColumns));
    }

    // 🔧 安全なデータ取得（LIMIT付き）
    $safeSql = "
        SELECT
            id,
            ebay_item_id,
            title,
            sku,
            current_price_value,
            picture_urls,
            gallery_url,
            created_at,
            updated_at
        FROM ebay_complete_api_data
        ORDER BY id DESC
        LIMIT 100
    ";

    $stmt = $connector->pdo->prepare($safeSql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 🔧 データ処理（エラー安全）
    $processedData = [];
    foreach ($products as $row) {
        $image_url = 'https://via.placeholder.com/150';
        
        // 安全な画像URL処理
        if (!empty($row['picture_urls'])) {
            $pictures = json_decode($row['picture_urls'], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($pictures) && count($pictures) > 0) {
                $image_url = $pictures[0];
            }
        }
        
        if (empty($image_url) || $image_url === 'https://via.placeholder.com/150') {
            if (!empty($row['gallery_url'])) {
                $image_url = $row['gallery_url'];
            }
        }

        $processedData[] = [
            'id' => $row['id'] ?? null,
            'image' => $image_url,
            'ebay_item_id' => $row['ebay_item_id'] ?? null,
            'sku' => $row['sku'] ?? null,
            'title' => $row['title'] ?? 'タイトルなし',
            'current_price_value' => $row['current_price_value'] ?? 0,
            'created_at' => $row['created_at'] ?? null
        ];
    }
    
    // 🔧 成功レスポンス
    $response = [
        'success' => true,
        'version' => 'debug_data_fixed_v1.0',
        'data' => [
            'columns' => ['id', 'image', 'ebay_item_id', 'sku', 'title', 'current_price_value', 'created_at'],
            'sample_data' => $processedData,
            'database_info' => [
                'connection_status' => 'successful',
                'database' => 'nagano3_db',
                'table' => 'ebay_complete_api_data',
                'available_columns' => $availableColumns,
                'connector_path' => basename($connector_path)
            ]
        ],
        'statistics' => [
            'total_items' => (int)$tableStats['total_records'],
            'items_with_images' => (int)$tableStats['records_with_images'],
            'items_returned' => count($processedData)
        ],
        'diagnosis' => [
            'status' => (int)$tableStats['total_records'] > 0 ? 'データ取得成功' : 'データなし',
            'message' => (int)$tableStats['total_records'] === 0 ? 
                'ebay_complete_api_dataテーブルにデータがありません' : 
                "正常にデータを取得しました（" . (int)$tableStats['total_records'] . "件中" . count($processedData) . "件表示）"
        ],
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'memory_usage' => memory_get_usage(true),
            'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
        ]
    ];
    
    // 🔧 JSON出力（エラー安全）
    $json_output = json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("JSON encoding failed: " . json_last_error_msg());
    }
    
    echo $json_output;
    
} catch (Exception $e) {
    // 🔧 例外も完全JSON形式で返す
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'system_exception',
        'message' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'code' => $e->getCode(),
        'debug_info' => [
            'php_version' => PHP_VERSION,
            'available_extensions' => get_loaded_extensions(),
            'memory_usage' => memory_get_usage(true)
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

// 🔧 出力バッファクリア（余分なHTML出力防止）
if (ob_get_contents()) {
    ob_end_clean();
}
?>
