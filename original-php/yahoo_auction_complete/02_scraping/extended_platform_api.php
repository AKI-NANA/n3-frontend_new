<?php
/**
 * 拡張プラットフォーム在庫管理API
 * 
 * 新規追加プラットフォームの在庫管理機能
 */

require_once __DIR__ . '/ExtendedScraperFactory.php';
require_once __DIR__ . '/../shared/core/api_response.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    $pdo = getDbConnection();
    $factory = new ExtendedScraperFactory($pdo);
    $service = new ExtendedScrapingService($pdo);
    
    switch ($action) {
        case 'scrape_new_platform':
            $url = $_POST['url'] ?? '';
            $options = [
                'download_images' => filter_var($_POST['download_images'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'force' => filter_var($_POST['force'] ?? false, FILTER_VALIDATE_BOOLEAN)
            ];
            
            if (empty($url)) {
                throw new InvalidArgumentException('URLが指定されていません');
            }
            
            $result = $service->scrapeAnyPlatform($url, $options);
            sendJsonResponse($result);
            break;
            
        case 'batch_scrape':
            $urls = json_decode($_POST['urls'] ?? '[]', true);
            
            if (empty($urls) || !is_array($urls)) {
                throw new InvalidArgumentException('URLリストが不正です');
            }
            
            $options = [
                'download_images' => filter_var($_POST['download_images'] ?? true, FILTER_VALIDATE_BOOLEAN),
                'force' => filter_var($_POST['force'] ?? false, FILTER_VALIDATE_BOOLEAN)
            ];
            
            $result = $service->scrapeBatch($urls, $options);
            sendJsonResponse($result);
            break;
            
        case 'get_platform_products':
            $platform = $_GET['platform'] ?? '';
            $limit = min((int)($_GET['limit'] ?? 50), 100);
            $offset = (int)($_GET['offset'] ?? 0);
            
            if (empty($platform)) {
                throw new InvalidArgumentException('プラットフォームが指定されていません');
            }
            
            $stmt = $pdo->prepare("
                SELECT 
                    id,
                    platform,
                    product_title,
                    purchase_price,
                    current_stock,
                    url_status,
                    condition_type,
                    seller_info,
                    last_verified_at,
                    created_at
                FROM supplier_products
                WHERE platform = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ");
            
            $stmt->execute([$platform, $limit, $offset]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 総数取得
            $countStmt = $pdo->prepare("
                SELECT COUNT(*) FROM supplier_products WHERE platform = ?
            ");
            $countStmt->execute([$platform]);
            $total = $countStmt->fetchColumn();
            
            sendJsonResponse([
                'success' => true,
                'platform' => $platform,
                'products' => $products,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ]);
            break;
            
        case 'get_supported_platforms':
            $platforms = $factory->getSupportedPlatforms();
            $stats = $factory->getPlatformStatistics();
            
            sendJsonResponse([
                'success' => true,
                'platforms' => array_keys($platforms),
                'stats' => $stats
            ]);
            break;
            
        case 'check_inventory':
            $productId = (int)($_POST['product_id'] ?? 0);
            
            if ($productId <= 0) {
                throw new InvalidArgumentException('商品IDが不正です');
            }
            
            // 商品情報取得
            $stmt = $pdo->prepare("
                SELECT * FROM supplier_products WHERE id = ?
            ");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                throw new Exception('商品が見つかりません');
            }
            
            // スクレイパーで最新情報を取得
            $scraper = $factory->createScraper($product['source_url']);
            $result = $scraper->scrapeProduct($product['source_url'], ['force' => true]);
            
            sendJsonResponse($result);
            break;
            
        case 'update_inventory_status':
            $productId = (int)($_POST['product_id'] ?? 0);
            $status = $_POST['status'] ?? '';
            
            if ($productId <= 0 || empty($status)) {
                throw new InvalidArgumentException('パラメータが不正です');
            }
            
            $validStatuses = ['available', 'sold_out', 'dead', 'changed'];
            if (!in_array($status, $validStatuses)) {
                throw new InvalidArgumentException('無効なステータス: ' . $status);
            }
            
            $stmt = $pdo->prepare("
                UPDATE supplier_products
                SET 
                    url_status = ?,
                    last_verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([$status, $productId]);
            
            sendJsonResponse([
                'success' => true,
                'product_id' => $productId,
                'status' => $status,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'get_platform_summary':
            // 全プラットフォームのサマリー情報
            $stmt = $pdo->query("
                SELECT 
                    platform,
                    COUNT(*) as total_products,
                    SUM(CASE WHEN url_status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN url_status = 'sold_out' THEN 1 ELSE 0 END) as sold_out,
                    AVG(purchase_price) as avg_price,
                    SUM(purchase_price) as total_value,
                    MAX(created_at) as last_added
                FROM supplier_products
                GROUP BY platform
                ORDER BY total_products DESC
            ");
            
            $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'summary' => $summary,
                'generated_at' => date('Y-m-d H:i:s')
            ]);
            break;
            
        case 'search_products':
            $keyword = $_GET['keyword'] ?? '';
            $platform = $_GET['platform'] ?? '';
            $status = $_GET['status'] ?? '';
            $limit = min((int)($_GET['limit'] ?? 50), 100);
            $offset = (int)($_GET['offset'] ?? 0);
            
            $sql = "SELECT * FROM supplier_products WHERE 1=1";
            $params = [];
            
            if (!empty($keyword)) {
                $sql .= " AND product_title LIKE ?";
                $params[] = "%{$keyword}%";
            }
            
            if (!empty($platform)) {
                $sql .= " AND platform = ?";
                $params[] = $platform;
            }
            
            if (!empty($status)) {
                $sql .= " AND url_status = ?";
                $params[] = $status;
            }
            
            $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            sendJsonResponse([
                'success' => true,
                'products' => $products,
                'keyword' => $keyword,
                'platform' => $platform,
                'status' => $status
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