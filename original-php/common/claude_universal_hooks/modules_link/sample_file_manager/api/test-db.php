<?php
/**
 * 📊 データベース接続テストAPI
 * CAIDS統合システム対応
 */

require_once '../config/config.php';

// CORSヘッダー設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // データベース接続テスト
    $pdo = getDBConnection();
    
    // 基本的な接続確認
    $stmt = $pdo->query('SELECT version() as version');
    $result = $stmt->fetch();
    
    // テーブル存在確認
    $tables = [];
    $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    while ($row = $stmt->fetch()) {
        $tables[] = $row['table_name'];
    }
    
    successResponse([
        'database_version' => $result['version'],
        'connection_status' => 'success',
        'host' => DB_HOST,
        'database' => DB_NAME,
        'tables_count' => count($tables),
        'tables' => $tables,
        'test_time' => date('Y-m-d H:i:s')
    ], 'データベース接続成功');
    
} catch (Exception $e) {
    // 接続失敗時のフォールバック
    errorResponse('データベース接続失敗: ' . $e->getMessage(), 500, [
        'host' => DB_HOST,
        'database' => DB_NAME,
        'error_details' => $e->getMessage(),
        'suggested_solutions' => [
            'PostgreSQLサーバーが起動しているか確認',
            'データベース設定の確認',
            '接続権限の確認'
        ]
    ]);
}
?>