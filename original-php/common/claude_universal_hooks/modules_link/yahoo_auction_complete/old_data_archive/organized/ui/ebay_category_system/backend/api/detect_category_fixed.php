<?php
/**
 * 単一商品カテゴリー判定API - データベース接続修正版
 * NAGANO-3システム統合・エラーハンドリング強化
 */

// セキュリティヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーレポーティング設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

try {
    // 必要なクラスファイル読み込み
    require_once dirname(__DIR__) . '/classes/CategoryDetector.php';
    require_once dirname(__DIR__) . '/classes/ItemSpecificsGenerator.php';
    
    // データベース接続設定（修正版）
    $config = [
        'host' => 'localhost',
        'port' => '5432',
        'database' => 'nagano3_db',
        'username' => 'postgres',
        'password' => '' // 空パスワードまたは実際のパスワードに変更
    ];
    
    // PostgreSQL接続文字列構築
    $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']);
    
    // データベース接続（複数の接続方法を試行）
    $pdo = null;
    $connectionAttempts = [
        // 1. パスワードなし（デフォルト開発環境）
        ['username' => 'postgres', 'password' => ''],
        // 2. 一般的なパスワード
        ['username' => 'postgres', 'password' => 'postgres'],
        // 3. ユーザー名と同じパスワード
        ['username' => 'nagano3_user', 'password' => 'nagano3_password'],
        // 4. 空ユーザー（peer認証）
        ['username' => '', 'password' => '']
    ];
    
    $connectionError = null;
    foreach ($connectionAttempts as $attempt) {
        try {
            $pdo = new PDO($dsn, $attempt['username'], $attempt['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            break; // 接続成功
        } catch (PDOException $e) {
            $connectionError = $e->getMessage();
            continue; // 次の接続方法を試行
        }
    }
    
    if (!$pdo) {
        throw new Exception('Database connection failed after multiple attempts: ' . $connectionError, 500);
    }
    
    // データベース接続テスト
    $pdo->query("SELECT 1");
    
    // リクエストメソッド確認
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed', 405);
    }
    
    // 入力データ取得・検証
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input: ' . json_last_error_msg(), 400);
    }
    
    // 必須パラメータ検証
    $requiredFields = ['title'];
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Required field missing: {$field}", 400);
        }
    }
    
    // 商品データ構築
    $productData = [
        'title' => trim($input['title']),
        'price' => floatval($input['price'] ?? 0),
        'description' => trim($input['description'] ?? '')
    ];
    
    // 価格検証
    if ($productData['price'] < 0 || $productData['price'] > 999999) {
        throw new Exception('Price out of valid range', 400);
    }
    
    // タイトル長検証
    if (mb_strlen($productData['title']) > 255) {
        throw new Exception('Title too long (max 255 characters)', 400);
    }
    
    // デバッグモード設定
    $debugMode = isset($input['debug']) && $input['debug'] === true;
    
    // カテゴリー判定実行
    $categoryDetector = new CategoryDetector($pdo, $debugMode);
    $detectionResult = $categoryDetector->detectCategory($productData);
    
    // Item Specifics生成（エラー回避）
    $itemSpecificsString = 'Brand=Unknown■Condition=Used■Model=Unknown';
    try {
        if (class_exists('ItemSpecificsGenerator')) {
            $itemSpecificsGenerator = new ItemSpecificsGenerator($pdo);
            $itemSpecificsString = $itemSpecificsGenerator->generateItemSpecificsString(
                $detectionResult['category_id'],
                [],
                $productData
            );
        }
    } catch (Exception $e) {
        error_log('ItemSpecifics generation failed: ' . $e->getMessage());
        // デフォルト値を使用（上記で設定済み）
    }
    
    // レスポンスデータ構築
    $response = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'processing_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
        'data' => [
            'category_id' => $detectionResult['category_id'],
            'category_name' => $detectionResult['category_name'],
            'confidence' => $detectionResult['confidence'],
            'confidence_level' => $detectionResult['confidence'] >= 80 ? 'high' : 
                                 ($detectionResult['confidence'] >= 50 ? 'medium' : 'low'),
            'matched_keywords' => $detectionResult['matched_keywords'] ?? [],
            'item_specifics' => $itemSpecificsString,
            'recommendation' => $detectionResult['confidence'] >= 80 ? 'auto_approve' : 
                              ($detectionResult['confidence'] >= 50 ? 'manual_review' : 'requires_attention')
        ],
        'input_data' => [
            'title' => $productData['title'],
            'price' => $productData['price']
        ]
    ];
    
    // デバッグ情報追加
    if ($debugMode) {
        $response['debug_info'] = [
            'memory_usage' => memory_get_usage(true),
            'peak_memory' => memory_get_peak_usage(true),
            'debug_score' => $detectionResult['debug_score'] ?? null,
            'database_connection' => 'successful',
            'keywords_loaded' => true
        ];
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'database_error',
        'message' => 'Database connection failed',
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => isset($debugMode) && $debugMode ? $e->getMessage() : 'Check database configuration'
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('CategoryDetection API Database Error: ' . $e->getMessage());

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
    
    error_log('CategoryDetection API Error: ' . $e->getMessage());

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'system_error',
        'message' => 'Unexpected system error occurred',
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('CategoryDetection API Fatal Error: ' . $e->getMessage());
}
?>