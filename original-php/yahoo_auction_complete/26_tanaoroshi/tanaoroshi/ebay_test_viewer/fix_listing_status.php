<?php
/**
 * eBay listing_status修正システム
 * 空のlisting_statusを実際のeBayページから取得して修正
 */

require_once(__DIR__ . '/../../common/config/database.php');

header('Content-Type: application/json');

try {
    $pdo = getDBConnection();
    
    // 空のlisting_statusを持つ商品を取得
    $query = $pdo->query("
        SELECT ebay_item_id, view_item_url, title 
        FROM ebay_complete_api_data 
        WHERE listing_status IS NULL OR listing_status = ''
        ORDER BY updated_at DESC
        LIMIT 20
    ");
    
    $items = $query->fetchAll(PDO::FETCH_ASSOC);
    $results = [];
    
    foreach ($items as $item) {
        $itemId = $item['ebay_item_id'];
        $url = $item['view_item_url'];
        
        if (!$url) {
            $url = "https://www.ebay.com/itm/{$itemId}";
        }
        
        // eBayページにアクセスしてステータス確認
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: Mozilla/5.0 (compatible; StatusChecker/1.0)',
                ],
                'timeout' => 10
            ]
        ]);
        
        $response = @file_get_contents($url, false, $context);
        $httpCode = 200; // デフォルト
        
        if (isset($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (strpos($header, 'HTTP/') === 0) {
                    $httpCode = intval(substr($header, 9, 3));
                }
            }
        }
        
        $status = 'Unknown';
        
        if ($httpCode === 200 && $response !== false) {
            // ページ内容から出品状況を判定
            if (strpos($response, 'This listing has ended') !== false ||
                strpos($response, 'listing ended') !== false) {
                $status = 'Ended';
            } elseif (strpos($response, 'Buy It Now') !== false ||
                     strpos($response, 'Add to cart') !== false ||
                     strpos($response, 'Place bid') !== false) {
                $status = 'Active';
            } elseif (strpos($response, 'Not available') !== false) {
                $status = 'Ended';
            } else {
                $status = 'Active'; // デフォルトでActive
            }
        } elseif ($httpCode === 404) {
            $status = 'Ended';
        } else {
            $status = 'Unknown';
        }
        
        // データベース更新
        $updateQuery = $pdo->prepare("
            UPDATE ebay_complete_api_data 
            SET listing_status = :status,
                updated_at = CURRENT_TIMESTAMP
            WHERE ebay_item_id = :item_id
        ");
        
        $updated = $updateQuery->execute([
            'status' => $status,
            'item_id' => $itemId
        ]);
        
        $results[] = [
            'item_id' => $itemId,
            'title' => substr($item['title'], 0, 50) . '...',
            'url' => $url,
            'http_code' => $httpCode,
            'detected_status' => $status,
            'updated' => $updated
        ];
        
        // レート制限対策
        usleep(500000); // 0.5秒待機
    }
    
    // 統計情報取得
    $statsQuery = $pdo->query("
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active,
            COUNT(CASE WHEN listing_status = 'Ended' THEN 1 END) as ended,
            COUNT(CASE WHEN listing_status IS NULL OR listing_status = '' THEN 1 END) as unknown
        FROM ebay_complete_api_data
    ");
    
    $stats = $statsQuery->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'processed' => count($results),
        'results' => $results,
        'statistics' => $stats
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
