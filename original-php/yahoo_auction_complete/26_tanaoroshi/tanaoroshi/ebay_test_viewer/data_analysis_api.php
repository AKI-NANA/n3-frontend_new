<?php
/**
 * eBayデータ完全分析API - 実際のデータ数・画像状況・同期状況の完全調査
 * エラーハンドリング強化版
 */

// エラー出力を完全に抑制してJSON出力を保護
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// 出力バッファリングを開始してHTMLエラーを防止
ob_start();

try {
    require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
    
    header('Content-Type: application/json; charset=utf-8');
    
    // 出力バッファをクリア
    ob_clean();
    
    $connector = new DatabaseUniversalConnector();
    $pdo = $connector->pdo;
    
    // 📊 完全データ数分析
    $total_count_query = "SELECT COUNT(*) as total_count FROM ebay_complete_api_data";
    $total_stmt = $pdo->prepare($total_count_query);
    $total_stmt->execute();
    $total_result = $total_stmt->fetch();
    $actual_total_count = (int)$total_result['total_count'];
    
    // 🖼️ 画像データ分析（PostgreSQL配列対応）
    $image_analysis_query = "
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN picture_urls IS NOT NULL AND picture_urls != '{}' AND array_length(picture_urls, 1) > 0 THEN 1 END) as items_with_images,
            COUNT(CASE WHEN picture_urls IS NULL OR picture_urls = '{}' OR array_length(picture_urls, 1) IS NULL THEN 1 END) as items_without_images
        FROM ebay_complete_api_data
    ";
    $image_stmt = $pdo->prepare($image_analysis_query);
    $image_stmt->execute();
    $image_result = $image_stmt->fetch();
    
    // 📈 リスティング状況分析
    $listing_status_query = "
        SELECT 
            listing_status,
            COUNT(*) as count
        FROM ebay_complete_api_data 
        GROUP BY listing_status 
        ORDER BY count DESC
    ";
    $listing_stmt = $pdo->prepare($listing_status_query);
    $listing_stmt->execute();
    $listing_results = $listing_stmt->fetchAll();
    
    // 🔍 重複チェック
    $duplicate_query = "
        SELECT 
            ebay_item_id, 
            COUNT(*) as duplicate_count 
        FROM ebay_complete_api_data 
        GROUP BY ebay_item_id 
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
    ";
    $duplicate_stmt = $pdo->prepare($duplicate_query);
    $duplicate_stmt->execute();
    $duplicates = $duplicate_stmt->fetchAll();
    
    // 🖼️ 実際の画像URL形式サンプル取得（PostgreSQL配列対応）
    $image_sample_query = "
        SELECT 
            ebay_item_id,
            title,
            picture_urls,
            CASE 
                WHEN picture_urls IS NULL THEN 'null'
                WHEN picture_urls = '{}' THEN 'empty_array'
                WHEN array_length(picture_urls, 1) IS NULL THEN 'null_array'
                WHEN array_length(picture_urls, 1) = 0 THEN 'zero_length_array'
                ELSE 'has_data'
            END as image_status
        FROM ebay_complete_api_data 
        WHERE picture_urls IS NOT NULL 
        AND picture_urls != '{}'
        AND array_length(picture_urls, 1) > 0
        LIMIT 5
    ";
    $image_sample_stmt = $pdo->prepare($image_sample_query);
    $image_sample_stmt->execute();
    $image_samples = $image_sample_stmt->fetchAll();
    
    // 📅 データ作成日時分析
    $date_analysis_query = "
        SELECT 
            DATE(created_at) as creation_date,
            COUNT(*) as items_created
        FROM ebay_complete_api_data 
        WHERE created_at IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY creation_date DESC
        LIMIT 7
    ";
    $date_stmt = $pdo->prepare($date_analysis_query);
    $date_stmt->execute();
    $date_results = $date_stmt->fetchAll();
    
    // 💰 価格データ分析
    $price_analysis_query = "
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN current_price_value IS NOT NULL AND current_price_value > 0 THEN 1 END) as items_with_price,
            AVG(CASE WHEN current_price_value > 0 THEN current_price_value END) as avg_price,
            MIN(CASE WHEN current_price_value > 0 THEN current_price_value END) as min_price,
            MAX(current_price_value) as max_price
        FROM ebay_complete_api_data
    ";
    $price_stmt = $pdo->prepare($price_analysis_query);
    $price_stmt->execute();
    $price_result = $price_stmt->fetch();
    
    // 🎯 総合分析結果
    $comprehensive_analysis = [
        'success' => true,
        'analysis_timestamp' => date('Y-m-d H:i:s'),
        'database_analysis' => [
            'actual_total_records' => $actual_total_count,
            'sync_log_vs_actual' => [
                'sync_log_claimed' => '50件処理完了',
                'actual_db_records' => $actual_total_count,
                'discrepancy' => $actual_total_count != 50,
                'discrepancy_amount' => $actual_total_count - 50
            ]
        ],
        'image_analysis' => [
            'total_items' => (int)$image_result['total_items'],
            'items_with_images' => (int)$image_result['items_with_images'],
            'items_without_images' => (int)$image_result['items_without_images'],
            'image_coverage_percentage' => $actual_total_count > 0 ? round(((int)$image_result['items_with_images'] / $actual_total_count) * 100, 1) : 0,
            'image_url_samples' => $image_samples
        ],
        'listing_status_breakdown' => $listing_results,
        'data_quality_analysis' => [
            'duplicate_items' => count($duplicates),
            'duplicate_details' => array_slice($duplicates, 0, 10), // 最大10件表示
            'unique_items' => $actual_total_count - array_sum(array_column($duplicates, 'duplicate_count')) + count($duplicates)
        ],
        'price_analysis' => [
            'items_with_valid_price' => (int)$price_result['items_with_price'],
            'average_price' => round((float)$price_result['avg_price'], 2),
            'price_range' => [
                'min' => (float)$price_result['min_price'],
                'max' => (float)$price_result['max_price']
            ],
            'price_coverage_percentage' => $actual_total_count > 0 ? round(((int)$price_result['items_with_price'] / $actual_total_count) * 100, 1) : 0
        ],
        'data_creation_timeline' => $date_results,
        'recommendations' => [
            'image_display_fix' => $image_result['items_with_images'] > 0 ? '画像データは存在するため、フロントエンド表示修正が必要' : '画像データが不足しています',
            'pagination_needed' => $actual_total_count > 50 ? 'ページネーション実装が必要' : '現在のデータ量では不要',
            'sync_verification' => $actual_total_count != 50 ? '同期処理の検証が必要' : '同期処理は正常',
            'data_quality' => count($duplicates) > 0 ? '重複データの処理が必要' : 'データ品質は良好'
        ]
    ];
    
    echo json_encode($comprehensive_analysis, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // 出力バッファをクリアしてエラーメッセージを出力
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    
    $error_response = [
        'success' => false,
        'error' => 'データ分析エラー: ' . $e->getMessage(),
        'error_type' => 'analysis_error',
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'connector_available' => class_exists('DatabaseUniversalConnector'),
            'pdo_available' => extension_loaded('pdo')
        ]
    ];
    
    echo json_encode($error_response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} catch (Error $e) {
    // 致命的エラーのハンドリング
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    
    echo json_encode([
        'success' => false,
        'error' => 'システムエラー: ' . $e->getMessage(),
        'error_type' => 'fatal_error',
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} finally {
    // 最終的なバッファクリーンアップ
    if (ob_get_level()) {
        ob_end_flush();
    }
}
?>
