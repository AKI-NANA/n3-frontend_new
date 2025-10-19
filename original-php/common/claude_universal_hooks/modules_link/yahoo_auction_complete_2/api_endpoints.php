<?php
/**
 * Yahoo Auction Tool - PostgreSQL対応APIエンドポイント
 * N3統合版
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// N3データベース接続
require_once '../../config/database.php'; // N3の共通DB設定を使用

class YahooAuctionAPI {
    private $pdo;
    
    public function __construct() {
        // PostgreSQL接続（N3標準）
        $this->pdo = new PDO(
            "pgsql:host=localhost;port=5432;dbname=nagano3_db",
            DB_USERNAME,
            DB_PASSWORD,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
    
    /**
     * データベース検索API
     * GET /api_endpoints.php?action=search&query=キーワード
     */
    public function searchProducts($query, $status = '', $date_filter = '') {
        $sql = "SELECT * FROM yahoo_products WHERE 1=1";
        $params = [];
        
        if (!empty($query)) {
            $sql .= " AND (title_jp ILIKE ? OR title_en ILIKE ? OR sku ILIKE ?)";
            $params[] = "%{$query}%";
            $params[] = "%{$query}%";
            $params[] = "%{$query}%";
        }
        
        if (!empty($status)) {
            $sql .= " AND status = ?";
            $params[] = $status;
        }
        
        if (!empty($date_filter)) {
            switch($date_filter) {
                case 'today':
                    $sql .= " AND created_at >= CURRENT_DATE";
                    break;
                case 'week':
                    $sql .= " AND created_at >= CURRENT_DATE - INTERVAL '7 days'";
                    break;
                case 'month':
                    $sql .= " AND created_at >= CURRENT_DATE - INTERVAL '30 days'";
                    break;
            }
        }
        
        $sql .= " ORDER BY created_at DESC LIMIT 100";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 在庫統計API
     * GET /api_endpoints.php?action=inventory_stats
     */
    public function getInventoryStats() {
        $stats = [];
        
        // 基本統計
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN status = 'scraped' THEN 1 END) as scraped_count,
                COUNT(CASE WHEN status = 'edited' THEN 1 END) as edited_count,
                COUNT(CASE WHEN status = 'listed' THEN 1 END) as listed_count,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_scraped
            FROM yahoo_products
        ");
        $stats['basic'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 在庫状況
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as total_inventory,
                COUNT(CASE WHEN current_stock = 0 THEN 1 END) as out_of_stock,
                COUNT(CASE WHEN current_stock <= min_stock AND current_stock > 0 THEN 1 END) as low_stock
            FROM inventory_status
        ");
        $stats['inventory'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 利益統計
        $stmt = $this->pdo->query("
            SELECT 
                COALESCE(SUM(price_usd - (price_jpy / 150.0) - shipping_usd), 0) as total_profit,
                COALESCE(AVG(profit_margin), 0) as avg_margin,
                COALESCE(MAX(profit_margin), 0) as max_margin
            FROM yahoo_products 
            WHERE price_usd > 0 AND profit_margin > 0
        ");
        $stats['profit'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $stats;
    }
    
    /**
     * 送料計算API
     * POST /api_endpoints.php?action=calculate_shipping
     * Body: {weight_kg, length_cm, width_cm, height_cm}
     */
    public function calculateShipping($data) {
        $weight = $data['weight_kg'] ?? 0;
        $length = $data['length_cm'] ?? 0;
        $width = $data['width_cm'] ?? 0;
        $height = $data['height_cm'] ?? 0;
        
        // 送料設定から適切なレートを取得
        $stmt = $this->pdo->prepare("
            SELECT * FROM shipping_settings 
            WHERE is_active = true 
            AND (weight_from IS NULL OR ? >= weight_from)
            AND (weight_to IS NULL OR ? <= weight_to)
            ORDER BY weight_to ASC NULLS LAST
            LIMIT 1
        ");
        $stmt->execute([$weight, $weight]);
        $rate = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($rate) {
            $volume = $length * $width * $height;
            $shipping_cost = $rate['base_cost_usd'] + 
                           ($weight * ($rate['additional_cost_usd'] ?? 0)) +
                           ($volume * 0.001);
        } else {
            // デフォルト計算
            $shipping_cost = 15.00 + ($weight * 8.50) + (($length * $width * $height) * 0.002);
        }
        
        return [
            'shipping_usd' => round($shipping_cost, 2),
            'weight_kg' => $weight,
            'volume_cm3' => $length * $width * $height,
            'rate_used' => $rate['carrier'] ?? 'default',
            'calculation_time' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * フィルター適用API
     * POST /api_endpoints.php?action=apply_filters
     * Body: {title, description}
     */
    public function applyFilters($title, $description) {
        $text = strtolower($title . ' ' . $description);
        $violations = [];
        
        $stmt = $this->pdo->prepare("
            SELECT filter_content, severity, description 
            FROM filter_settings 
            WHERE is_active = true
        ");
        $stmt->execute();
        $filters = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($filters as $filter) {
            $keywords = explode("\n", $filter['filter_content']);
            foreach ($keywords as $keyword) {
                $keyword = trim(strtolower($keyword));
                if (!empty($keyword) && strpos($text, $keyword) !== false) {
                    $violations[] = [
                        'keyword' => $keyword,
                        'severity' => $filter['severity'],
                        'description' => $filter['description']
                    ];
                }
            }
        }
        
        return [
            'is_prohibited' => !empty($violations),
            'violations' => $violations,
            'check_time' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 商品保存API
     * POST /api_endpoints.php?action=save_product
     */
    public function saveProduct($data) {
        $stmt = $this->pdo->prepare("
            INSERT INTO yahoo_products (
                product_id, sku, title_jp, title_en, description_jp, description_en,
                price_jpy, price_usd, weight_kg, length_cm, width_cm, height_cm,
                shipping_usd, profit_margin, category_jp, category_en, 
                image_urls, yahoo_url, seller_name, end_time, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (product_id) DO UPDATE SET
                title_jp = EXCLUDED.title_jp,
                title_en = EXCLUDED.title_en,
                price_usd = EXCLUDED.price_usd,
                updated_at = NOW()
        ");
        
        return $stmt->execute([
            $data['product_id'],
            $data['sku'] ?? null,
            $data['title_jp'],
            $data['title_en'] ?? null,
            $data['description_jp'] ?? null,
            $data['description_en'] ?? null,
            $data['price_jpy'],
            $data['price_usd'] ?? null,
            $data['weight_kg'] ?? null,
            $data['length_cm'] ?? null,
            $data['width_cm'] ?? null,
            $data['height_cm'] ?? null,
            $data['shipping_usd'] ?? null,
            $data['profit_margin'] ?? null,
            $data['category_jp'] ?? null,
            $data['category_en'] ?? null,
            $data['image_urls'] ?? null,
            $data['yahoo_url'] ?? null,
            $data['seller_name'] ?? null,
            $data['end_time'] ?? null,
            $data['status'] ?? 'scraped'
        ]);
    }
}

// API実行
try {
    $api = new YahooAuctionAPI();
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    switch ($action) {
        case 'search':
            $result = $api->searchProducts(
                $_GET['query'] ?? '',
                $_GET['status'] ?? '',
                $_GET['date_filter'] ?? ''
            );
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'inventory_stats':
            $result = $api->getInventoryStats();
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'calculate_shipping':
            $data = json_decode(file_get_contents('php://input'), true);
            $result = $api->calculateShipping($data);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'apply_filters':
            $data = json_decode(file_get_contents('php://input'), true);
            $result = $api->applyFilters($data['title'] ?? '', $data['description'] ?? '');
            echo json_encode(['success' => true, 'data' => $result]);
            break;
            
        case 'save_product':
            $data = json_decode(file_get_contents('php://input'), true);
            $result = $api->saveProduct($data);
            echo json_encode(['success' => $result]);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>