<?php
/**
 * eBayデータテスト・ビューアー（画像表示専用・シンプル版）
 * eBay APIから取得した実データの画像を表示するのみ
 */

// PHPエラーをJSONとして表示するための設定
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

try {
    if (!defined('SECURE_ACCESS')) {
        define('SECURE_ACCESS', true);
    }

// 正しい絶対パス
$connector_path = '/System/Volumes/Data/Users/aritahiroaki/NAGANO-3/N3-Development/modules/tanaoroshi/database_universal_connector.php';
if (!file_exists($connector_path)) {
    throw new Exception("必要なファイルが見つかりません。パスを確認してください: " . $connector_path);
}
require_once $connector_path;

    // もしクラスが存在しなければエラーを投げる
    if (!class_exists('DatabaseUniversalConnector')) {
        throw new Exception("DatabaseUniversalConnectorクラスが定義されていません。");
    }

    $connector = new DatabaseUniversalConnector();
    
    // 1. 基本統計
    $statsSql = "
        SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN picture_urls IS NOT NULL AND CAST(picture_urls AS TEXT) != '' AND CAST(picture_urls AS TEXT) != '[]' THEN 1 END) as records_with_images
        FROM ebay_complete_api_data
    ";
    
    $statsStmt = $connector->pdo->prepare($statsSql);
    $statsStmt->execute();
    $tableStats = $statsStmt->fetch();

    // 2. 存在が確認できたすべてのカラムを正確に取得
    $sql = "
        SELECT
            id,
            ebay_item_id,
            title,
            description,
            sku,
            current_price_value,
            current_price_currency,
            start_price_value,
            buy_it_now_price_value,
            quantity,
            quantity_sold,
            condition_id,
            condition_display_name,
            category_id,
            category_name,
            listing_type,
            listing_status,
            start_time,
            end_time,
            seller_user_id,
            seller_feedback_score,
            seller_positive_feedback_percent,
            location,
            picture_urls,
            gallery_url,
            item_details_html,
            item_specifics_backup,
            shipping_details,
            shipping_costs,
            shipping_methods,
            watch_count,
            hit_count,
            bid_count,
            view_item_url,
            data_completeness_score,
            api_fetch_timestamp,
            fetch_success,
            created_at,
            updated_at,
            picture_urls_new,
            item_specifics,
            picture_urls_safe,
            item_specifics_safe
        FROM ebay_complete_api_data
        ORDER BY ebay_item_id DESC
    ";

    $stmt = $connector->pdo->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processedData = [];
    foreach ($products as $row) {
        $image_url = '';
        
        // ① `picture_urls` カラムのJSONデータを処理
        if (!empty($row['picture_urls'])) {
            $pictures = json_decode($row['picture_urls'], true);
            if (is_array($pictures) && count($pictures) > 0) {
                $image_url = $pictures[0];
            }
        }
        
        // ② `picture_urls`が空の場合、`gallery_url`からURLを生成
        if (empty($image_url) && !empty($row['gallery_url'])) {
            $image_url = $row['gallery_url'];
        }
        
        // ③ それも空の場合、`picture_urls_new`からURLを生成
        if (empty($image_url) && !empty($row['picture_urls_new'])) {
            $pictures = json_decode($row['picture_urls_new'], true);
            if (is_array($pictures) && count($pictures) > 0) {
                $image_url = $pictures[0];
            }
        }
        
        // ④ それでも空の場合、プレースホルダー画像を使用
        if (empty($image_url)) {
            $image_url = 'https://via.placeholder.com/150';
        }

        $processedData[] = [
            'image'               => $image_url,
            'ebay_item_id'        => $row['ebay_item_id'] ?? null,
            'sku'                 => $row['sku'] ?? null,
            'title'               => $row['title'] ?? null,
            'current_price_value' => $row['current_price_value'] ?? null,
            'shipping_cost'       => $row['shipping_costs'] ?? null,
        ];
    }
    
    // 4. 最終的なJSONレスポンスを生成
    $response = [
        'success' => true,
        'data' => [
            'columns' => array_keys($processedData[0] ?? []),
            'field_details' => [],
            'sample_data' => $processedData,
            'database_tables' => ['ebay_complete_api_data'],
            'table_data_counts' => ['ebay_complete_api_data' => (int)$tableStats['total_records']],
            'diagnosis' => [
                'total_items' => (int)$tableStats['total_records'],
                'reason_for_zero_listings' => (int)$tableStats['total_records'] === 0 ? 
                    'ebay_complete_api_dataテーブルにデータがありません' : 
                    "データ取得成功 - " . (int)$tableStats['total_records'] . "件のeBay商品データが存在（画像: " . (int)$tableStats['records_with_images'] . "件）"
            ],
            'connection_details' => [
                'database' => 'nagano3_db',
                'table' => 'ebay_complete_api_data',
                'available_columns' => $availableColumns,
                'used_columns' => $existingColumns ?? []
            ]
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error_code' => $e->getCode(),
        'message' => 'データベースエラー: ' . $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>