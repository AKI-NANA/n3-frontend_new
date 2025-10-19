<?php
/**
 * CSV一括処理API - 高機能版
 * 大量データ対応・詳細ログ・エラーハンドリング強化
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// 実行時間とメモリ制限を拡張
set_time_limit(300); // 5分
ini_set('memory_limit', '512M');

try {
    // 必要なクラスファイル読み込み
    require_once dirname(__DIR__) . '/classes/CSVProcessor.php';
    require_once dirname(__DIR__) . '/classes/CategoryDetector.php';
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
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed', 405);
    }
    
    // ファイルアップロード確認
    if (!isset($_FILES['csv_file'])) {
        throw new Exception('No CSV file uploaded', 400);
    }
    
    $csvFile = $_FILES['csv_file'];
    
    // ファイルアップロードエラー確認
    if ($csvFile['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'File too large (server limit)',
            UPLOAD_ERR_FORM_SIZE => 'File too large (form limit)',
            UPLOAD_ERR_PARTIAL => 'File partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'No temporary directory',
            UPLOAD_ERR_CANT_WRITE => 'Cannot write file',
            UPLOAD_ERR_EXTENSION => 'Upload stopped by extension'
        ];
        
        throw new Exception($uploadErrors[$csvFile['error']] ?? 'Unknown upload error', 400);
    }
    
    // ファイル形式確認
    $allowedExtensions = ['csv', 'txt'];
    $fileExtension = strtolower(pathinfo($csvFile['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Invalid file format. Only CSV files allowed.', 400);
    }
    
    // ファイルサイズ確認
    $maxFileSize = 10 * 1024 * 1024; // 10MB
    if ($csvFile['size'] > $maxFileSize) {
        throw new Exception('File too large. Maximum size: ' . ($maxFileSize / 1024 / 1024) . 'MB', 400);
    }
    
    // 処理オプション取得
    $options = [
        'batch_size' => intval($_POST['batch_size'] ?? 100),
        'max_rows' => intval($_POST['max_rows'] ?? 10000),
        'skip_errors' => ($_POST['skip_errors'] ?? 'true') === 'true',
        'validate_required_fields' => ($_POST['validate_required_fields'] ?? 'true') === 'true',
        'generate_item_specifics' => ($_POST['generate_item_specifics'] ?? 'true') === 'true',
        'save_to_database' => ($_POST['save_to_database'] ?? 'true') === 'true',
        'include_debug_info' => ($_POST['debug'] ?? 'false') === 'true'
    ];
    
    // オプション値検証
    if ($options['batch_size'] < 10 || $options['batch_size'] > 1000) {
        throw new Exception('Invalid batch_size. Must be between 10 and 1000.', 400);
    }
    
    if ($options['max_rows'] < 1 || $options['max_rows'] > 50000) {
        throw new Exception('Invalid max_rows. Must be between 1 and 50000.', 400);
    }
    
    // CSVProcessor初期化
    $csvProcessor = new CSVProcessor($pdo);
    
    // 処理実行
    $startTime = microtime(true);
    $processingResult = $csvProcessor->processBulkCSV($csvFile['tmp_name'], $options);
    
    // 出力CSV生成
    $outputFileInfo = null;
    if (!empty($processingResult['results'])) {
        $outputOptions = [
            'include_debug_info' => $options['include_debug_info'],
            'output_directory' => '/tmp'
        ];
        
        $outputFileInfo = $csvProcessor->generateOutputCSV($processingResult['results'], $outputOptions);
    }
    
    // 処理統計情報取得
    $statistics = $csvProcessor->getProcessingStatistics();
    
    // レスポンス構築
    $response = [
        'success' => $processingResult['success'],
        'timestamp' => date('Y-m-d H:i:s'),
        'processing_summary' => [
            'total_rows_processed' => $processingResult['total_rows'] ?? 0,
            'successful_count' => $processingResult['processed_count'],
            'error_count' => $processingResult['error_count'],
            'success_rate' => $processingResult['processed_count'] > 0 ? 
                round(($processingResult['processed_count'] / 
                       ($processingResult['processed_count'] + $processingResult['error_count'])) * 100, 2) : 0,
            'processing_time_seconds' => $processingResult['processing_time'],
            'memory_peak_mb' => round($processingResult['memory_peak'] / 1024 / 1024, 2)
        ],
        'results' => [
            'processed_data' => $processingResult['results'],
            'errors' => $processingResult['errors']
        ],
        'output_file' => $outputFileInfo,
        'statistics' => $statistics
    ];
    
    // デバッグ情報追加
    if ($options['include_debug_info']) {
        $response['debug_info'] = [
            'server_info' => [
                'php_version' => PHP_VERSION,
                'memory_limit' => ini_get('memory_limit'),
                'max_execution_time' => ini_get('max_execution_time'),
                'upload_max_filesize' => ini_get('upload_max_filesize')
            ],
            'processing_options' => $options,
            'file_info' => [
                'original_name' => $csvFile['name'],
                'size_bytes' => $csvFile['size'],
                'mime_type' => $csvFile['type']
            ]
        ];
    }
    
    // 一時ファイルクリーンアップ（バックグラウンドで）
    register_shutdown_function(function() use ($csvProcessor) {
        $csvProcessor->cleanupTempFiles();
    });
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'database_error',
        'message' => 'Database connection failed',
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => isset($options['include_debug_info']) && $options['include_debug_info'] ? $e->getMessage() : null
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('ProcessCSV API Database Error: ' . $e->getMessage());

} catch (Exception $e) {
    $statusCode = $e->getCode() ?: 500;
    http_response_code($statusCode);
    
    echo json_encode([
        'success' => false,
        'error_type' => 'processing_error',
        'message' => $e->getMessage(),
        'status_code' => $statusCode,
        'timestamp' => date('Y-m-d H:i:s'),
        'processing_summary' => [
            'total_rows_processed' => 0,
            'successful_count' => 0,
            'error_count' => 1,
            'success_rate' => 0
        ]
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('ProcessCSV API Error: ' . $e->getMessage());

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_type' => 'system_error',
        'message' => 'Unexpected system error occurred',
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
    error_log('ProcessCSV API Fatal Error: ' . $e->getMessage());
}
?>