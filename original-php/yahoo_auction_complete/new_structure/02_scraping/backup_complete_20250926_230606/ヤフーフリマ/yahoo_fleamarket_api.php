<?php
/**
 * Yahoo！フリマ API統合エンドポイント
 * 
 * 既存のメルカリAPIエンドポイントを拡張
 * Yahoo Auctionシステムとの親和性を活用
 * 
 * @version 1.0.0
 * @created 2025-09-25
 */

require_once __DIR__ . '/../../platforms/yahoo_fleamarket/YahooFleaMarketScraper.php';
require_once __DIR__ . '/../mercari_api_endpoints.php'; // 既存のAPI基盤を継承

/**
 * Yahoo！フリマAPI拡張クラス
 */
class YahooFleaMarketApiExtension extends ApiRouter {
    
    /**
     * Yahoo！フリマ専用ルーティング処理
     */
    protected function handleYahooFleaMarketRequests($method, $action, $id) {
        switch ($method) {
            case 'POST':
                switch ($action) {
                    case 'yahoo_fleamarket':
                        $this->scrapeYahooFleaMarketProduct();
                        break;
                    
                    case 'batch_yahoo_fleamarket':
                        $this->scrapeYahooFleaMarketBatch();
                        break;
                    
                    default:
                        ApiResponse::error('未知のYahoo！フリマアクション', 404);
                }
                break;
            
            case 'GET':
                switch ($action) {
                    case 'yahoo_fleamarket_status':
                        $this->getYahooFleaMarketStatus();
                        break;
                        
                    case 'compare_yahoo_platforms':
                        $this->compareYahooPlatforms();
                        break;
                    
                    default:
                        ApiResponse::error('未サポートのGETアクション', 405);
                }
                break;
            
            default:
                ApiResponse::error('未サポートのHTTPメソッド', 405);
        }
    }
    
    /**
     * Yahoo！フリマ商品スクレイピング
     */
    private function scrapeYahooFleaMarketProduct() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['url'])) {
            ApiResponse::error('URLが必要です', 400);
        }
        
        $url = $input['url'];
        $expectedPrice = $input['expected_price'] ?? null;
        
        try {
            $scraper = new YahooFleaMarketScraper($this->pdo);
            $result = $scraper->scrapeProduct($url);
            
            // 販売予定価格を設定
            if ($expectedPrice && $result['success']) {
                $this->updateExpectedPrice($result['product_id'], $expectedPrice);
                $result['data']['expected_selling_price'] = $expectedPrice;
            }
            
            $this->logger->info("Yahoo！フリマスクレイピング完了: {$url}");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("Yahoo！フリマスクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * Yahoo！フリマ一括スクレイピング
     */
    private function scrapeYahooFleaMarketBatch() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($input['urls']) || !is_array($input['urls'])) {
            ApiResponse::error('URLs配列が必要です', 400);
        }
        
        $urls = $input['urls'];
        
        if (count($urls) > 30) { // Yahoo系は少し制限を緩和
            ApiResponse::error('一度に処理できるのは最大30件です', 400);
        }
        
        try {
            $processor = new YahooFleaMarketBatchProcessor($this->pdo);
            $result = $processor->processBatch($urls);
            
            $this->logger->info("Yahoo！フリマ一括スクレイピング完了: " . count($urls) . "件");
            ApiResponse::success($result);
            
        } catch (Exception $e) {
            $this->logger->error("Yahoo！フリマ一括スクレイピングエラー: " . $e->getMessage());
            ApiResponse::error($e->getMessage(), 500);
        }
    }
    
    /**
     * Yahoo！フリマ状態取得
     */
    private function getYahooFleaMarketStatus() {
        try {
            // Yahoo！フリマ固有の統計
            $stmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN url_status = 'active' THEN 1 ELSE 0 END) as active_products,
                    SUM(CASE WHEN url_status = 'sold' THEN 1 ELSE 0 END) as sold_products,
                    AVG(purchase_price) as avg_price,
                    MAX(purchase_price) as max_price,
                    MIN(purchase_price) as min_price
                FROM supplier_products 
                WHERE platform = 'yahoo_fleamarket'
            ");
            
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 最近の処理状況
            $recentStmt = $this->pdo->query("
                SELECT 
                    COUNT(*) as products_today,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as products_last_hour
                FROM supplier_products 
                WHERE platform = 'yahoo_fleamarket' 
                AND created_at >= CURDATE()
            ");
            
            $recentStats = $recentStmt->fetch(PDO::FETCH_ASSOC);
            
            ApiResponse::success([
                'platform' => 'yahoo_fleamarket',
                'statistics' => $stats,
                'recent_activity' => $recentStats,
                'server_time' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("Yahoo！フリマ状態取得エラー: " . $e->getMessage());
            ApiResponse::error('状態の取得に失敗しました', 500);
        }
    }
    
    /**
     * Yahoo系プラットフォーム比較
     */
    private function compareYahooPlatforms() {
        try {
            // Yahoo AuctionとYahoo！フリマの比較統計
            $stmt = $this->pdo->query("
                SELECT 
                    platform,
                    COUNT(*) as product_count,
                    AVG(purchase_price) as avg_price,
                    MAX(purchase_price) as max_price,
                    MIN(purchase_price) as min_price,
                    SUM(CASE WHEN url_status = 'active' THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN url_status = 'sold' THEN 1 ELSE 0 END) as sold_count
                FROM supplier_products 
                WHERE platform IN ('yahoo_auction', 'yahoo_fleamarket')
                GROUP BY platform
            ");
            
            $comparison = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // カテゴリ別比較（additional_dataからカテゴリを抽出）
            $categoryStmt = $this->pdo->query("
                SELECT 
                    platform,
                    JSON_EXTRACT(additional_data, '$.category') as category,
                    COUNT(*) as count
                FROM supplier_products 
                WHERE platform IN ('yahoo_auction', 'yahoo_fleamarket')
                AND JSON_EXTRACT(additional_data, '$.category') IS NOT NULL
                GROUP BY platform, JSON_EXTRACT(additional_data, '$.category')
                ORDER BY platform, count DESC
            ");
            
            $categoryComparison = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
            
            ApiResponse::success([
                'platform_comparison' => $comparison,
                'category_comparison' => $categoryComparison,
                'insights' => $this->generateYahooInsights($comparison)
            ]);
            
        } catch (Exception $e) {
            $this->logger->error("Yahoo プラットフォーム比較エラー: " . $e->getMessage());
            ApiResponse::error('比較データの取得に失敗しました', 500);
        }
    }
    
    /**
     * Yahoo系プラットフォームのインサイト生成
     */
    private function generateYahooInsights($comparison) {
        $insights = [];
        
        $auctionData = null;
        $fleamarketData = null;
        
        foreach ($comparison as $data) {
            if ($data['platform'] === 'yahoo_auction') {
                $auctionData = $data;
            } elseif ($data['platform'] === 'yahoo_fleamarket') {
                $fleamarketData = $data;
            }
        }
        
        if ($auctionData && $fleamarketData) {
            // 価格比較インサイト
            if ($fleamarketData['avg_price'] > $auctionData['avg_price']) {
                $priceDiff = round(($fleamarketData['avg_price'] - $auctionData['avg_price']) / $auctionData['avg_price'] * 100, 1);
                $insights[] = "Yahoo！フリマの平均価格はヤフオクより{$priceDiff}%高い";
            } else {
                $priceDiff = round(($auctionData['avg_price'] - $fleamarketData['avg_price']) / $fleamarketData['avg_price'] * 100, 1);
                $insights[] = "ヤフオクの平均価格はYahoo！フリマより{$priceDiff}%高い";
            }
            
            // 成約率比較
            $auctionSoldRate = $auctionData['active_count'] > 0 ? 
                round($auctionData['sold_count'] / ($auctionData['sold_count'] + $auctionData['active_count']) * 100, 1) : 0;
            $fleamarketSoldRate = $fleamarketData['active_count'] > 0 ? 
                round($fleamarketData['sold_count'] / ($fleamarketData['sold_count'] + $fleamarketData['active_count']) * 100, 1) : 0;
            
            if ($auctionSoldRate > $fleamarketSoldRate) {
                $insights[] = "ヤフオクの方が成約率が高い（{$auctionSoldRate}% vs {$fleamarketSoldRate}%）";
            } else {
                $insights[] = "Yahoo！フリマの方が成約率が高い（{$fleamarketSoldRate}% vs {$auctionSoldRate}%）";
            }
            
            // 商品数比較
            if ($auctionData['product_count'] > $fleamarketData['product_count']) {
                $insights[] = "ヤフオクの登録商品数が多い（{$auctionData['product_count']} vs {$fleamarketData['product_count']}）";
            } else {
                $insights[] = "Yahoo！フリマの登録商品数が多い（{$fleamarketData['product_count']} vs {$auctionData['product_count']}）";
            }
        }
        
        return $insights;
    }
}

/**
 * Yahoo！フリマ用API統合管理クラス
 */
class YahooFleaMarketApiManager {
    private $apiExtension;
    
    public function __construct() {
        $this->apiExtension = new YahooFleaMarketApiExtension();
    }
    
    /**
     * リクエスト処理
     */
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $pathParts = explode('/', trim($path, '/'));
        
        // Yahoo！フリマ専用パスの処理
        if (count($pathParts) >= 3 && $pathParts[0] === 'api' && $pathParts[1] === 'yahoo_fleamarket') {
            $action = $pathParts[2] ?? '';
            $id = $pathParts[3] ?? null;
            
            $this->apiExtension->handleYahooFleaMarketRequests($method, $action, $id);
        } else {
            // 既存のAPIルーターに委譲
            $this->apiExtension->handleRequest();
        }
    }
}

// ルートファイル用の設定
if (!defined('API_ROUTER_INCLUDED')) {
    define('API_ROUTER_INCLUDED', true);
    
    // .htaccess リライトルール（参考）
    /*
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^api/yahoo_fleamarket/(.*)$ /api_unified/yahoo_fleamarket_api.php [QSA,L]
    */
    
    // 直接呼び出し時の処理
    try {
        $manager = new YahooFleaMarketApiManager();
        $manager->handleRequest();
    } catch (Exception $e) {
        error_log('Yahoo！フリマ API エラー: ' . $e->getMessage());
        ApiResponse::error('システムエラーが発生しました', 500);
    }
}

?>