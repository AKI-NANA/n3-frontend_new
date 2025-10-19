<?php
/**
 * データベーステーブル確認ツール
 * 実際のデータがある場所を特定
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// 複数のデータベース・テーブル組み合わせをチェック
$testConfigs = [
    [
        'label' => 'nagano3_db - ebay_complete_api_data',
        'host' => 'localhost',
        'dbname' => 'nagano3_db',
        'user' => 'postgres',
        'password' => '',
        'table' => 'ebay_complete_api_data'
    ],
    [
        'label' => 'ebay_kanri_db - ebay_listings',
        'host' => 'localhost',
        'dbname' => 'ebay_kanri_db',
        'user' => 'postgres',
        'password' => '',
        'table' => 'ebay_listings'
    ],
    [
        'label' => 'nagano_db - ebay_complete_api_data',
        'host' => 'localhost',
        'dbname' => 'nagano_db',
        'user' => 'postgres',
        'password' => '',
        'table' => 'ebay_complete_api_data'
    ]
];

header('Content-Type: application/json; charset=utf-8');

$results = [];

foreach ($testConfigs as $config) {
    try {
        $dsn = "pgsql:host={$config['host']};dbname={$config['dbname']}";
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5
        ]);
        
        // データ数確認
        $countStmt = $pdo->query("SELECT COUNT(*) as count FROM {$config['table']}");
        $count = $countStmt->fetchColumn();
        
        // 画像データ数確認
        $imageCountStmt = $pdo->query("
            SELECT COUNT(*) as count 
            FROM {$config['table']} 
            WHERE picture_urls IS NOT NULL 
            AND CAST(picture_urls AS TEXT) != '' 
            AND CAST(picture_urls AS TEXT) != '[]'
        ");
        $imageCount = $imageCountStmt->fetchColumn();
        
        // サンプルデータ取得
        $sampleStmt = $pdo->query("
            SELECT 
                ebay_item_id, 
                title, 
                CAST(picture_urls AS TEXT) as picture_urls_text
            FROM {$config['table']} 
            LIMIT 3
        ");
        $samples = $sampleStmt->fetchAll();
        
        $results[] = [
            'config' => $config['label'],
            'status' => 'success',
            'total_records' => (int)$count,
            'image_records' => (int)$imageCount,
            'has_data' => $count > 0,
            'samples' => $samples
        ];
        
    } catch (Exception $e) {
        $results[] = [
            'config' => $config['label'],
            'status' => 'error',
            'error' => $e->getMessage(),
            'total_records' => 0,
            'image_records' => 0,
            'has_data' => false,
            'samples' => []
        ];
    }
}

echo json_encode([
    'success' => true,
    'results' => $results,
    'recommendation' => 'largest_dataset',
    'timestamp' => date('Y-m-d H:i:s')
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
