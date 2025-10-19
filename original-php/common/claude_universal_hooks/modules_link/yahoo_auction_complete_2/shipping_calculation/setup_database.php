<?php
/**
 * データベースセットアップAPI
 * 送料計算システム用テーブル作成・初期データ投入
 */

// データベース接続設定
$dbConfig = [
    'host' => 'localhost',
    'dbname' => 'nagano3_db', 
    'username' => 'your_username',
    'password' => 'your_password'
];

try {
    $pdo = new PDO(
        "mysql:host={$dbConfig['host']};dbname={$dbConfig['dbname']};charset=utf8mb4",
        $dbConfig['username'],
        $dbConfig['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    // SQLファイル実行
    $sqlFile = __DIR__ . '/shipping_database_schema.sql';
    
    if (!file_exists($sqlFile)) {
        throw new Exception("SQLファイルが見つかりません: {$sqlFile}");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // セミコロンで分割して複数のSQL文を実行
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    $pdo->beginTransaction();
    
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => '送料計算システムのデータベース初期化が完了しました',
        'tables_created' => [
            'shipping_zones',
            'usa_domestic_zones', 
            'shipping_policies',
            'shipping_rates',
            'product_shipping_dimensions',
            'shipping_calculation_log'
        ]
    ]);
    
} catch (Exception $e) {
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
