<?php
/**
 * サンプルデータ作成API（既存DB確認版）
 * 既存のebay_complete_api_dataテーブルの状況確認
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// 既存のデータベース接続クラスを使用
require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $connector = new DatabaseUniversalConnector();
    
    // データ統計確認
    $stats = $connector->getDataStats();
    
    if ($stats['total_items'] > 0) {
        // 既にデータが存在する場合
        $response = [
            'success' => true,
            'message' => "既存データを確認しました: {$stats['total_items']}件のeBay商品データが存在します",
            'data' => [
                'total_items' => $stats['total_items'],
                'avg_completeness' => $stats['avg_completeness'],
                'newest_data' => $stats['newest_data'],
                'action_taken' => 'データ確認のみ（新規作成不要）'
            ]
        ];
    } else {
        // データが存在しない場合のメッセージ
        $response = [
            'success' => false,
            'message' => 'ebay_complete_api_dataテーブルにデータが存在しません。実際のeBayデータを取得する必要があります。',
            'data' => [
                'total_items' => 0,
                'table_exists' => true,
                'suggestion' => 'eBay API連携システムを使用してデータを取得してください'
            ]
        ];
    }
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => '既存データベース確認エラー: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
