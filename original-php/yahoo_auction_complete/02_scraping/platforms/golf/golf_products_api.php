<?php
/**
 * ゴルフ商品専用API
 * 
 * ゴルフクラブ検索・管理機能
 */

require_once __DIR__ . '/CompleteScraperFactory.php';
require_once __DIR__ . '/../shared/core/api_response.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    $pdo = getDbConnection();
    $factory = new CompleteScraperFactory($pdo);
    $service = new CompleteScrapingService($pdo);
    
    switch ($action) {
        case 'search_golf_clubs':
            $clubType = $_GET['club_type'] ?? null;
            $brand = $_GET['brand'] ?? null;
            $flex = $_GET['flex'] ?? null;
            $minPrice = isset($_GET['min_price']) ? (float)$_GET['min_price'] : null;
            $maxPrice = isset($_GET['max_price']) ? (float)$_GET['max_price'] : null;
            $status = $_GET['status'] ?? null;
            $limit = min((int)($_GET['limit'] ?? 50), 100);
            
            $stmt = $pdo->prepare("CALL sp_search_golf_clubs(?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$clubType, $brand, $flex, $minPrice, $maxPrice, $status, $limit]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'results' => $results,
                'count' => count($results),
                'filters' => [
                    'club_type' => $clubType,
                    'brand' => $brand,
                    'flex' => $flex,
                    'price_range' => [$minPrice, $maxPrice],
                    'status' => $status
                ]
            ]);
            break;
            
        case 'get_golf_specs':
            $productId = (int)($_GET['product_id'] ?? 0);
            
            if ($productId <= 0) {
                throw new InvalidArgumentException('商品IDが不正です');
            }
            
            $stmt = $pdo->prepare("
                SELECT gps.*, sp.product_title, sp.purchase_price, sp.source_url
                FROM golf_product_specifications gps
                JOIN supplier_products sp ON gps.supplier_product_id = sp.id
                WHERE sp.id = ?
            ");
            $stmt->execute([$productId]);
            $specs = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$specs) {
                throw new Exception('ゴルフ仕様が見つかりません');
            }
            
            sendJsonResponse([
                'success' => true,
                'specs' => $specs
            ]);
            break;
            
        case 'register_golf_specs':
            $productId = (int)($_POST['product_id'] ?? 0);
            $clubType = $_POST['club_type'] ?? null;
            $brand = $_POST['brand'] ?? null;
            $model = $_POST['model'] ?? null;
            $loft = isset($_POST['loft']) ? (float)$_POST['loft'] : null;
            $flex = $_POST['flex'] ?? null;
            $shaftName = $_POST['shaft_name'] ?? null;
            $conditionRank = $_POST['condition_rank'] ?? null;
            
            if ($productId <= 0) {
                throw new InvalidArgumentException('商品IDが不正です');
            }
            
            $stmt = $pdo->prepare("CALL sp_register_golf_specs(?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $productId, $clubType, $brand, $model,
                $loft, $flex, $shaftName, $conditionRank
            ]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'specs_id' => $result['specs_id'],
                'message' => 'ゴルフ仕様を登録しました'
            ]);
            break;
            
        case 'get_golf_inventory_alerts':
            $stmt = $pdo->query("SELECT * FROM v_golf_inventory_alerts ORDER BY days_unverified DESC");
            $alerts = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $summary = [
                'total' => count($alerts),
                'sold_out' => 0,
                'dead_link' => 0,
                'needs_check' => 0,
                'low_price' => 0
            ];
            
            foreach ($alerts as $alert) {
                switch ($alert['alert_type']) {
                    case 'SOLD_OUT':
                        $summary['sold_out']++;
                        break;
                    case 'DEAD_LINK':
                        $summary['dead_link']++;
                        break;
                    case 'NEEDS_CHECK':
                        $summary['needs_check']++;
                        break;
                    case 'LOW_PRICE_ALERT':
                        $summary['low_price']++;
                        break;
                }
            }
            
            sendJsonResponse([
                'success' => true,
                'alerts' => $alerts,
                'summary' => $summary
            ]);
            break;
            
        case 'get_category_stats':
            $stmt = $pdo->query("SELECT * FROM v_category_statistics");
            $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'statistics' => $stats
            ]);
            break;
            
        case 'scrape_golf_product':
            $url = $_POST['url'] ?? '';
            
            if (empty($url)) {
                throw new InvalidArgumentException('URLが指定されていません');
            }
            
            $result = $service->scrapeGolfProduct($url, [
                'download_images' => filter_var($_POST['download_images'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'force' => filter_var($_POST['force'] ?? false, FILTER_VALIDATE_BOOLEAN)
            ]);
            
            sendJsonResponse($result);
            break;
            
        case 'batch_scrape_golf':
            $urls = json_decode($_POST['urls'] ?? '[]', true);
            
            if (empty($urls) || !is_array($urls)) {
                throw new InvalidArgumentException('URLリストが不正です');
            }
            
            $results = [];
            foreach ($urls as $url) {
                $result = $service->scrapeGolfProduct($url);
                $results[] = $result;
            }
            
            $summary = [
                'total' => count($results),
                'successful' => 0,
                'failed' => 0,
                'duplicates' => 0
            ];
            
            foreach ($results as $result) {
                if ($result['success']) {
                    $summary['successful']++;
                    if ($result['duplicate'] ?? false) {
                        $summary['duplicates']++;
                    }
                } else {
                    $summary['failed']++;
                }
            }
            
            sendJsonResponse([
                'success' => true,
                'results' => $results,
                'summary' => $summary
            ]);
            break;
            
        case 'get_platform_info':
            $info = $factory->getPlatformInfo();
            $categories = $factory->getPlatformsByCategory();
            
            sendJsonResponse([
                'success' => true,
                'platforms' => $info,
                'categories' => $categories,
                'total_count' => count($info)
            ]);
            break;
            
        case 'get_golf_brands':
            $stmt = $pdo->query("
                SELECT DISTINCT brand, COUNT(*) as product_count
                FROM golf_product_specifications
                WHERE brand IS NOT NULL AND brand != ''
                GROUP BY brand
                ORDER BY product_count DESC
                LIMIT 100
            ");
            $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'brands' => $brands,
                'count' => count($brands)
            ]);
            break;
            
        case 'get_popular_clubs':
            $limit = min((int)($_GET['limit'] ?? 20), 50);
            
            $stmt = $pdo->prepare("
                SELECT 
                    gps.club_type,
                    gps.brand,
                    gps.model,
                    COUNT(*) as listing_count,
                    AVG(sp.purchase_price) as avg_price,
                    MIN(sp.purchase_price) as min_price,
                    MAX(sp.purchase_price) as max_price
                FROM golf_product_specifications gps
                JOIN supplier_products sp ON gps.supplier_product_id = sp.id
                WHERE sp.url_status = 'available'
                    AND gps.brand IS NOT NULL
                    AND gps.model IS NOT NULL
                GROUP BY gps.club_type, gps.brand, gps.model
                HAVING listing_count >= 2
                ORDER BY listing_count DESC, avg_price ASC
                LIMIT ?
            ");
            $stmt->execute([$limit]);
            $clubs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'popular_clubs' => $clubs,
                'count' => count($clubs)
            ]);
            break;
            
        case 'update_golf_specs':
            $specsId = (int)($_POST['specs_id'] ?? 0);
            
            if ($specsId <= 0) {
                throw new InvalidArgumentException('仕様IDが不正です');
            }
            
            $updateFields = [];
            $params = [];
            
            $allowedFields = [
                'club_type', 'brand', 'model', 'loft', 'flex', 
                'shaft_name', 'club_length', 'club_weight',
                'condition_rank', 'condition_detail', 'accessories'
            ];
            
            foreach ($allowedFields as $field) {
                if (isset($_POST[$field])) {
                    $updateFields[] = "{$field} = ?";
                    $params[] = $_POST[$field];
                }
            }
            
            if (empty($updateFields)) {
                throw new InvalidArgumentException('更新するフィールドがありません');
            }
            
            $params[] = $specsId;
            
            $sql = "UPDATE golf_product_specifications SET " . 
                   implode(', ', $updateFields) . 
                   ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            sendJsonResponse([
                'success' => true,
                'specs_id' => $specsId,
                'updated_fields' => count($updateFields),
                'message' => 'ゴルフ仕様を更新しました'
            ]);
            break;
            
        default:
            throw new InvalidArgumentException('無効なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    sendJsonResponse([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 400);
}
?>