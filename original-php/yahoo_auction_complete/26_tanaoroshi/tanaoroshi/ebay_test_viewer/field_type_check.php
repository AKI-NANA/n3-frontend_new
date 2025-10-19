<?php
/**
 * PostgreSQL フィールド型確認ツール
 * picture_urls フィールドの実際の型を調査
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// エラー出力を抑制
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

ob_start();

try {
    require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
    
    header('Content-Type: application/json; charset=utf-8');
    ob_clean();
    
    $connector = new DatabaseUniversalConnector();
    $pdo = $connector->pdo;
    
    // テーブル構造確認
    $schema_query = "
        SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_name = 'ebay_complete_api_data'
        AND column_name = 'picture_urls'
        ORDER BY ordinal_position
    ";
    $schema_stmt = $pdo->prepare($schema_query);
    $schema_stmt->execute();
    $schema_info = $schema_stmt->fetchAll();
    
    // 実際のデータサンプル取得（安全版）
    $sample_query = "
        SELECT 
            ebay_item_id,
            picture_urls,
            pg_typeof(picture_urls) as field_type
        FROM ebay_complete_api_data 
        LIMIT 5
    ";
    $sample_stmt = $pdo->prepare($sample_query);
    $sample_stmt->execute();
    $sample_data = $sample_stmt->fetchAll();
    
    // 空/NULL値の状況確認（安全版）
    $null_analysis_query = "
        SELECT 
            COUNT(*) as total_items,
            COUNT(CASE WHEN picture_urls IS NULL THEN 1 END) as null_count,
            COUNT(CASE WHEN picture_urls IS NOT NULL THEN 1 END) as not_null_count
        FROM ebay_complete_api_data
    ";
    $null_stmt = $pdo->prepare($null_analysis_query);
    $null_stmt->execute();
    $null_analysis = $null_stmt->fetch();
    
    // 型に応じた安全な分析
    $safe_analysis = [];
    if (!empty($sample_data)) {
        $first_sample = $sample_data[0];
        $field_type = $first_sample['field_type'];
        
        if (strpos($field_type, 'array') !== false || strpos($field_type, '[]') !== false) {
            // 配列型の場合
            try {
                $array_analysis_query = "
                    SELECT 
                        COUNT(*) as total_items,
                        COUNT(CASE WHEN array_length(picture_urls, 1) > 0 THEN 1 END) as items_with_images,
                        COUNT(CASE WHEN array_length(picture_urls, 1) IS NULL OR array_length(picture_urls, 1) = 0 THEN 1 END) as items_without_images
                    FROM ebay_complete_api_data
                    WHERE picture_urls IS NOT NULL
                ";
                $array_stmt = $pdo->prepare($array_analysis_query);
                $array_stmt->execute();
                $safe_analysis = $array_stmt->fetch();
            } catch (Exception $e) {
                $safe_analysis = ['error' => 'Array analysis failed: ' . $e->getMessage()];
            }
        } else {
            // テキスト型の場合
            try {
                $text_analysis_query = "
                    SELECT 
                        COUNT(*) as total_items,
                        COUNT(CASE WHEN picture_urls IS NOT NULL AND picture_urls != '' THEN 1 END) as items_with_images,
                        COUNT(CASE WHEN picture_urls IS NULL OR picture_urls = '' THEN 1 END) as items_without_images
                    FROM ebay_complete_api_data
                ";
                $text_stmt = $pdo->prepare($text_analysis_query);
                $text_stmt->execute();
                $safe_analysis = $text_stmt->fetch();
            } catch (Exception $e) {
                $safe_analysis = ['error' => 'Text analysis failed: ' . $e->getMessage()];
            }
        }
    }
    
    $response = [
        'success' => true,
        'schema_info' => $schema_info,
        'sample_data' => $sample_data,
        'null_analysis' => $null_analysis,
        'safe_analysis' => $safe_analysis,
        'recommendations' => [
            'detected_field_type' => !empty($sample_data) ? $sample_data[0]['field_type'] : 'unknown',
            'is_array_type' => !empty($sample_data) && (strpos($sample_data[0]['field_type'], 'array') !== false || strpos($sample_data[0]['field_type'], '[]') !== false),
            'sql_strategy' => !empty($sample_data) && (strpos($sample_data[0]['field_type'], 'array') !== false || strpos($sample_data[0]['field_type'], '[]') !== false) ? 'use_array_length' : 'use_string_comparison'
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    
    echo json_encode([
        'success' => false,
        'error' => 'フィールド型確認エラー: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} finally {
    if (ob_get_level()) {
        ob_end_flush();
    }
}
?>
