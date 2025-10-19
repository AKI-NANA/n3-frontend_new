<?php
/**
 * データベース診断・デバッグツール
 * 差分検知システムのエラー原因を特定
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
    
    $connector = new DatabaseUniversalConnector();
    $pdo = $connector->pdo;
    
    $diagnosis = [];
    
    // 1. データベース接続確認
    $diagnosis['database_connection'] = [
        'status' => 'success',
        'server_info' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
        'connection_status' => $pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS)
    ];
    
    // 2. テーブル存在確認
    $tableCheckSql = "
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ebay_complete_api_data'
        ) as table_exists
    ";
    $tableStmt = $pdo->prepare($tableCheckSql);
    $tableStmt->execute();
    $tableResult = $tableStmt->fetch();
    
    $diagnosis['table_check'] = [
        'ebay_complete_api_data_exists' => $tableResult['table_exists'] ? 'YES' : 'NO'
    ];
    
    // 3. テーブル構造確認
    if ($tableResult['table_exists']) {
        $columnsSql = "
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'ebay_complete_api_data' 
            ORDER BY ordinal_position
        ";
        $columnsStmt = $pdo->prepare($columnsSql);
        $columnsStmt->execute();
        $columns = $columnsStmt->fetchAll();
        
        $diagnosis['table_structure'] = [
            'total_columns' => count($columns),
            'key_columns_check' => [
                'ebay_item_id' => in_array('ebay_item_id', array_column($columns, 'column_name')),
                'title' => in_array('title', array_column($columns, 'column_name')),
                'description' => in_array('description', array_column($columns, 'column_name')),
                'sku' => in_array('sku', array_column($columns, 'column_name')),
                'picture_urls' => in_array('picture_urls', array_column($columns, 'column_name')),
                'item_specifics' => in_array('item_specifics', array_column($columns, 'column_name')),
                'current_price_value' => in_array('current_price_value', array_column($columns, 'column_name'))
            ],
            'all_columns' => array_column($columns, 'column_name')
        ];
        
        // 4. データ件数確認
        $countSql = "SELECT COUNT(*) as total FROM ebay_complete_api_data";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute();
        $countResult = $countStmt->fetch();
        
        $diagnosis['data_count'] = [
            'total_records' => (int)$countResult['total']
        ];
        
        // 5. データ状況確認（実際のサンプル）
        if ($countResult['total'] > 0) {
            $sampleSql = "
                SELECT 
                    ebay_item_id,
                    title,
                    CASE WHEN description IS NOT NULL AND description != '' THEN length(description) ELSE 0 END as desc_length,
                    CASE WHEN sku IS NOT NULL AND sku != '' THEN 'YES' ELSE 'NO' END as has_sku,
                    picture_urls::text as picture_urls_raw,
                    item_specifics::text as item_specifics_raw,
                    current_price_value,
                    listing_status,
                    updated_at
                FROM ebay_complete_api_data 
                ORDER BY updated_at DESC 
                LIMIT 5
            ";
            $sampleStmt = $pdo->prepare($sampleSql);
            $sampleStmt->execute();
            $sampleData = $sampleStmt->fetchAll();
            
            $diagnosis['sample_data'] = [];
            foreach ($sampleData as $item) {
                $diagnosis['sample_data'][] = [
                    'ebay_item_id' => $item['ebay_item_id'],
                    'title' => substr($item['title'] ?? '', 0, 50) . '...',
                    'description_length' => $item['desc_length'],
                    'has_sku' => $item['has_sku'],
                    'has_price' => $item['current_price_value'] ? 'YES' : 'NO',
                    'picture_urls_sample' => substr($item['picture_urls_raw'] ?? '', 0, 100) . '...',
                    'item_specifics_sample' => substr($item['item_specifics_raw'] ?? '', 0, 100) . '...',
                    'listing_status' => $item['listing_status'],
                    'updated_at' => $item['updated_at']
                ];
            }
            
            // 6. データ品質分析
            $qualitySql = "
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN description IS NOT NULL AND description != '' AND length(description) > 50 THEN 1 END) as with_description,
                    COUNT(CASE WHEN sku IS NOT NULL AND sku != '' THEN 1 END) as with_sku,
                    COUNT(CASE WHEN picture_urls IS NOT NULL AND picture_urls::text != '{}' THEN 1 END) as with_images,
                    COUNT(CASE WHEN item_specifics IS NOT NULL AND item_specifics::text != '{}' THEN 1 END) as with_specifics,
                    COUNT(CASE WHEN current_price_value IS NOT NULL AND current_price_value > 0 THEN 1 END) as with_price,
                    COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active_items,
                    MAX(updated_at) as latest_update
                FROM ebay_complete_api_data
            ";
            $qualityStmt = $pdo->prepare($qualitySql);
            $qualityStmt->execute();
            $qualityResult = $qualityStmt->fetch();
            
            $diagnosis['data_quality'] = [
                'total_items' => (int)$qualityResult['total'],
                'with_description' => (int)$qualityResult['with_description'],
                'with_sku' => (int)$qualityResult['with_sku'],
                'with_images' => (int)$qualityResult['with_images'],
                'with_specifics' => (int)$qualityResult['with_specifics'],
                'with_price' => (int)$qualityResult['with_price'],
                'active_items' => (int)$qualityResult['active_items'],
                'latest_update' => $qualityResult['latest_update'],
                'data_completeness_estimate' => $qualityResult['total'] > 0 ? 
                    round((($qualityResult['with_description'] + $qualityResult['with_sku'] + $qualityResult['with_images'] + $qualityResult['with_specifics'] + $qualityResult['with_price']) / ($qualityResult['total'] * 5)) * 100, 1) : 0
            ];
        } else {
            $diagnosis['sample_data'] = [];
            $diagnosis['data_quality'] = [
                'total_items' => 0,
                'status' => 'NO_DATA_FOUND',
                'suggestion' => 'eBayデータ同期を実行してください'
            ];
        }
    } else {
        $diagnosis['error'] = 'ebay_complete_api_data テーブルが存在しません';
        $diagnosis['suggestion'] = 'データベーステーブルを作成してください';
    }
    
    // 7. 総合診断
    $diagnosis['overall_status'] = [
        'database_ok' => true,
        'table_ok' => $tableResult['table_exists'],
        'data_ok' => isset($diagnosis['data_quality']) && $diagnosis['data_quality']['total_items'] > 0,
        'ready_for_differential_sync' => $tableResult['table_exists'] && 
            isset($diagnosis['data_quality']) && 
            $diagnosis['data_quality']['total_items'] > 0
    ];
    
    echo json_encode([
        'success' => true,
        'diagnosis' => $diagnosis,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ], JSON_UNESCAPED_UNICODE);
}
?>
