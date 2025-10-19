<?php
/**
 * 必須項目取得API - 修正版
 * カテゴリー別必須項目とデフォルト値を返すAPI
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // 必要なクラスファイル読み込み
    require_once dirname(__DIR__) . '/classes/ItemSpecificsGenerator.php';
    
    // データベース接続設定
    $config = [
        'host' => 'localhost',
        'port' => '5432',
        'database' => 'nagano3_db',
        'username' => 'postgres',
        'password' => 'your_password'
    ];
    
    $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']);
    $pdo = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // リクエストメソッド確認
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        throw new Exception('Only GET method allowed', 405);
    }
    
    // パラメータ取得・検証
    $categoryId = $_GET['category_id'] ?? null;
    if (empty($categoryId)) {
        throw new Exception('category_id parameter is required', 400);
    }
    
    // カテゴリーIDの形式検証
    if (!preg_match('/^[0-9]+$/', $categoryId)) {
        throw new Exception('Invalid category_id format', 400);
    }
    
    // ItemSpecificsGenerator初期化
    $itemSpecificsGenerator = new ItemSpecificsGenerator($pdo);
    
    // 必須項目取得
    $fields = $itemSpecificsGenerator->getRequiredFields($categoryId);
    
    // カテゴリー存在確認
    if (empty($fields)) {
        // カテゴリーIDが存在するか確認
        $stmt = $pdo->prepare("SELECT category_name FROM ebay_categories WHERE category_id = ? AND is_active = TRUE");
        $stmt->execute([$categoryId]);
        $categoryExists = $stmt->fetch();
        
        if (!$categoryExists) {
            throw new Exception('Category not found or inactive', 404);
        }
    }
    
    // フィールド統計情報取得
    $fieldStatistics = $itemSpecificsGenerator->getFieldStatistics($categoryId);
    
    // カテゴリー名取得
    $stmt = $pdo->prepare("SELECT category_name FROM ebay_categories WHERE category_id = ?");
    $stmt->execute([$categoryId]);
    $categoryInfo = $stmt->fetch();
    
    // レスポンス構築
    $response = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => [
            'category_id' => $categoryId,
            'category_name' => $categoryInfo['category_name'] ?? 'Unknown Category',
            'fields' => $fields,
            'field_count' => count($fields),
            'statistics' => $fieldStatistics
        ]
    ];
    
    // デバッグ情報追加（開発環境のみ）
    if (isset($_GET['debug']) && $_GET['debug'] === '1') {
        $response['debug_info'] = [
            'memory_usage' => memory_get_usage(true),
            'query_count' => 2, // 実行したクエリ数
            'processing_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
        ];
    }
    
    // サンプルItem Specifics文字列生成（オプション）
    if (isset($_GET['generate_sample']) && $_GET['generate_sample'] === '1') {
        $sampleItemSpecifics = $itemSpecificsGenerator->generateItemSpecificsString($categoryId);
        $response['data']['sample_item_specifics'] = $sampleItemSpecifics;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'database_error',
        'message' => 'Database connection failed',
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => isset($_GET['debug']) && $_GET['debug'] === '1' ? $e->getMessage() : null
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('GetRequiredFields API Database Error: ' . $e->getMessage());

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    
    echo json_encode([
        'success' => false,
        'error_type' => 'processing_error',
        'message' => $e->getMessage(),
        'status_code' => $statusCode,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('GetRequiredFields API Error: ' . $e->getMessage());

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'system_error',
        'message' => 'Unexpected system error occurred',
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('GetRequiredFields API Fatal Error: ' . $e->getMessage());
}
?>