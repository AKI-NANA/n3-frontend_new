<?php
/**
 * NAGANO-3 価格比較API統合システム
 * 
 * 機能: Amazon・楽天・Yahoo!ショッピング価格取得・比較・分析
 * アーキテクチャ: orchestrator層・外部API統合
 * AI連携: 最適仕入れ先選定・価格トレンド分析
 */

class PriceComparisonAPI {
    
    private $config;
    private $cache_manager;
    private $rate_limiter;
    private $api_clients;
    
    // API プロバイダー定数
    private const PROVIDER_AMAZON = 'amazon';
    private const PROVIDER_RAKUTEN = 'rakuten';
    private const PROVIDER_YAHOO = 'yahoo';
    private const PROVIDER_KAKAKU = 'kakaku';
    
    public function __construct() {
        $this->loadConfiguration();
        $this->initializeCacheManager();
        $this->initializeRateLimiter();
        $this->initializeApiClients();
        
        error_log("価格比較API統合システム 初期化完了");
    }
    
    /**
     * 設定読み込み
     */
    private function loadConfiguration() {
        $config_file = '../../../config/price_comparison_config.php';
        
        if (!file_exists($config_file)) {
            $this->createDefaultConfig($config_file);
        }
        
        $this->config = include $config_file;
    }
    
    /**
     * Amazon商品検索
     */
    public function searchAmazon($sku, $options = []) {
        try {
            // キャッシュ確認
            $cache_key = "amazon_search_{$sku}";
            $cached_data = $this->cache_manager->get($cache_key);
            
            if ($cached_data && !$this->isCacheExpired($cached_data)) {
                return $cached_data['data'];
            }
            
            // レート制限チェック
            $this->rate_limiter->checkLimit(self::PROVIDER_AMAZON);
            
            // Amazon Product Advertising API呼び出し
            $amazon_client = $this->api_clients[self::PROVIDER_AMAZON];
            $search_results = $amazon_client->searchProducts($sku, $options);
            
            // データ変換
            $transformed_results = $this->transformAmazonResults($search_results);
            
            // キャッシュ保存
            $this->cache_manager->set($cache_key, [
                'data' => $transformed_results,
                'timestamp' => time(),
                'ttl' => $this->config['cache']['search_ttl']
            ]);
            
            // レート制限更新
            $this->rate_limiter->incrementUsage(self::PROVIDER_AMAZON);
            
            return $transformed_results;
            
        } catch (Exception $e) {
            error_log("Amazon検索エラー (SKU: {$sku}): " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 楽天商品検索
     */
    public function searchRakuten($sku, $options = []) {
        try {
            $cache_key = "rakuten_search_{$sku}";
            $cached_data = $this->cache_manager->get($cache_key);
            
            if ($cached_data && !$this->isCacheExpired($cached_data)) {
                return $cached_data['data'];
            }
            
            $this->rate_limiter->checkLimit(self::PROVIDER_RAKUTEN);
            
            // 楽天商品検索API呼び出し
            $rakuten_client = $this->api_clients[self::PROVIDER_RAKUTEN];
            $search_results = $rakuten_client->searchProducts($sku, $options);
            
            $transformed_results = $this->transformRakutenResults($search_results);
            
            $this->cache_manager->set($cache_key, [
                'data' => $transformed_results,
                'timestamp' => time(),
                'ttl' => $this->config['cache']['search_ttl']
            ]);
            
            $this->rate_limiter->incrementUsage(self::PROVIDER_RAKUTEN);
            
            return $transformed_results;
            
        } catch (Exception $e) {
            error_log("楽天検索エラー (SKU: {$sku}): " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Yahoo!ショッピング検索
     */
    public function searchYahoo($sku, $options = []) {
        try {
            $cache_key = "yahoo_search_{$sku}";
            $cached_data = $this->cache_manager->get($cache_key);
            
            if ($cached_data && !$this->isCacheExpired($cached_data)) {
                return $cached_data['data'];
            }
            
            $this->rate_limiter->checkLimit(self::PROVIDER_YAHOO);
            
            // Yahoo!ショッピングAPI呼び出し
            $yahoo_client = $this->api_clients[self::PROVIDER_YAHOO];
            $search_results = $yahoo_client->searchProducts($sku, $options);
            
            $transformed_results = $this->transformYahooResults($search_results);
            
            $this->cache_manager->set($cache_key, [
                'data' => $transformed_results,
                'timestamp' => time(),
                'ttl' => $this->config['cache']['search_ttl']
            ]);
            
            $this->rate_limiter->incrementUsage(self::PROVIDER_YAHOO);
            
            return $transformed_results;
            
        } catch (Exception $e) {
            error_log("Yahoo!検索エラー (SKU: {$sku}): " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 全プロバイダー横断検索
     */
    public function searchAllProviders($sku, $options = []) {
        $all_results = [];
        
        // 並列実行でパフォーマンス向上
        $providers = [
            self::PROVIDER_AMAZON => [$this, 'searchAmazon'],
            self::PROVIDER_RAKUTEN => [$this, 'searchRakuten'],
            self::PROVIDER_YAHOO => [$this, 'searchYahoo']
        ];
        
        foreach ($providers as $provider => $search_method) {
            try {
                $results = call_user_func($search_method, $sku, $options);
                
                foreach ($results as &$result) {
                    $result['provider'] = $provider;
                    $result['search_timestamp'] = time();
                }
                
                $all_results = array_merge($all_results, $results);
                
            } catch (Exception $e) {
                error_log("プロバイダー検索エラー ({$provider}): " . $e->getMessage());
                continue;
            }
        }
        
        // 結果をスコア順でソート
        usort($all_results, [$this, 'compareSearchResults']);
        
        return $all_results;
    }
    
    /**
     * 価格履歴取得
     */
    public function getPriceHistory($sku, $provider = null, $days = 30) {
        $query = "
            SELECT 
                provider,
                price,
                availability,
                recorded_at,
                product_url,
                shop_name
            FROM price_history 
            WHERE sku = :sku
        ";
        
        $params = [':sku' => $sku];
        
        if ($provider) {
            $query .= " AND provider = :provider";
            $params[':provider'] = $provider;
        }
        
        $query .= " AND recorded_at >= DATE_SUB(NOW(), INTERVAL :days DAY)";
        $params[':days'] = $days;
        
        $query .= " ORDER BY recorded_at DESC";
        
        $stmt = $this->db_connection->prepare($query);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 価格トレンド分析
     */
    public function analyzePriceTrend($sku, $days = 30) {
        $history = $this->getPriceHistory($sku, null, $days);
        
        if (empty($history)) {
            return null;
        }
        
        // 価格統計計算
        $prices = array_column($history, 'price');
        $min_price = min($prices);
        $max_price = max($prices);
        $avg_price = array_sum($prices) / count($prices);
        $current_price = $prices[0]; // 最新価格
        
        // トレンド方向計算
        $recent_prices = array_slice($prices, 0, 7); // 直近7件
        $older_prices = array_slice($prices, 7, 7); // その前7件
        
        $recent_avg = array_sum($recent_prices) / count($recent_prices);
        $older_avg = count($older_prices) > 0 ? array_sum($older_prices) / count($older_prices) : $recent_avg;
        
        $trend_direction = 'stable';
        $trend_percentage = 0;
        
        if ($recent_avg > $older_avg * 1.05) {
            $trend_direction = 'rising';
            $trend_percentage = (($recent_avg - $older_avg) / $older_avg) * 100;
        } elseif ($recent_avg < $older_avg * 0.95) {
            $trend_direction = 'falling';
            $trend_percentage = (($older_avg - $recent_avg) / $older_avg) * 100;
        }
        
        // 最安値プロバイダー特定
        $min_price_entry = array_reduce($history, function($carry, $item) {
            return ($carry === null || $item['price'] < $carry['price']) ? $item : $carry;
        });
        
        return [
            'sku' => $sku,
            'analysis_period_days' => $days,
            'price_statistics' => [
                'current_price' => $current_price,
                'min_price' => $min_price,
                'max_price' => $max_price,
                'average_price' => round($avg_price, 2),
                'price_range' => $max_price - $min_price,
                'volatility' => $this->calculatePriceVolatility($prices)
            ],
            'trend_analysis' => [
                'direction' => $trend_direction,
                'percentage_change' => round($trend_percentage, 2),
                'strength' => $this->calculateTrendStrength($trend_percentage)
            ],
            'recommendations' => [
                'best_price_provider' => $min_price_entry['provider'],
                'best_price_shop' => $min_price_entry['shop_name'] ?? '',
                'best_price_url' => $min_price_entry['product_url'],
                'purchase_timing' => $this->getPurchaseTimingRecommendation($trend_direction, $current_price, $min_price, $avg_price)
            ],
            'data_quality' => [
                'sample_size' => count($history),
                'data_freshness' => $this->calculateDataFreshness($history),
                'coverage_providers' => array_unique(array_column($history, 'provider'))
            ]
        ];
    }
    
    /**
     * Amazon結果変換
     */
    private function transformAmazonResults($raw_results) {
        $transformed = [];
        
        foreach ($raw_results as $item) {
            $transformed[] = [
                'asin' => $item['ASIN'],
                'title' => $item['ItemInfo']['Title']['DisplayValue'] ?? '',
                'url' => $item['DetailPageURL'] ?? '',
                'price' => $this->extractAmazonPrice($item),
                'currency' => 'JPY',
                'availability' => $this->mapAmazonAvailability($item),
                'prime' => $this->isAmazonPrimeEligible($item),
                'rating' => $this->extractAmazonRating($item),
                'review_count' => $this->extractAmazonReviewCount($item),
                'image_url' => $this->extractAmazonImageUrl($item),
                'delivery_days' => $this->estimateAmazonDeliveryDays($item),
                'seller_info' => $this->extractAmazonSellerInfo($item),
                'features' => $this->extractAmazonFeatures($item)
            ];
        }
        
        return $transformed;
    }
    
    /**
     * 楽天結果変換
     */
    private function transformRakutenResults($raw_results) {
        $transformed = [];
        
        foreach ($raw_results['Items'] as $item) {
            $item_data = $item['Item'];
            
            $transformed[] = [
                'item_code' => $item_data['itemCode'],
                'title' => $item_data['itemName'],
                'url' => $item_data['itemUrl'],
                'price' => (int) $item_data['itemPrice'],
                'currency' => 'JPY',
                'availability' => 'in_stock', // 楽天は基本的に在庫ありとして扱う
                'points' => (int) $item_data['pointRate'],
                'shop_name' => $item_data['shopName'],
                'shop_url' => $item_data['shopUrl'],
                'image_url' => $item_data['mediumImageUrls'][0]['imageUrl'] ?? '',
                'delivery_days' => $this->parseRakutenDeliveryInfo($item_data),
                'review_info' => [
                    'rating' => (float) $item_data['reviewAverage'],
                    'count' => (int) $item_data['reviewCount']
                ],
                'tax_included' => $this->isRakutenTaxIncluded($item_data),
                'shipping_info' => $this->extractRakutenShippingInfo($item_data)
            ];
        }
        
        return $transformed;
    }
    
    /**
     * Yahoo!結果変換
     */
    private function transformYahooResults($raw_results) {
        $transformed = [];
        
        foreach ($raw_results['hits'] as $item) {
            $transformed[] = [
                'item_code' => $item['code'],
                'title' => $item['name'],
                'url' => $item['url'],
                'price' => (int) $item['price'],
                'currency' => 'JPY',
                'availability' => $this->mapYahooAvailability($item),
                'points' => $this->calculateYahooPoints($item),
                'shop_name' => $item['seller']['name'],
                'shop_url' => $item['seller']['url'],
                'image_url' => $item['image']['small'] ?? '',
                'delivery_days' => $this->parseYahooDeliveryInfo($item),
                'review_info' => [
                    'rating' => (float) $item['review']['rate'],
                    'count' => (int) $item['review']['count']
                ],
                'brand' => $item['brand']['name'] ?? '',
                'category' => $item['category']['name'] ?? ''
            ];
        }
        
        return $transformed;
    }
    
    /**
     * 検索結果比較関数
     */
    private function compareSearchResults($a, $b) {
        // 価格優先ソート（安い順）
        $price_diff = $a['price'] - $b['price'];
        
        if ($price_diff !== 0) {
            return $price_diff;
        }
        
        // 価格が同じ場合は評価・在庫状況で判定
        $score_a = $this->calculateResultScore($a);
        $score_b = $this->calculateResultScore($b);
        
        return $score_b - $score_a; // 高スコア順
    }
    
    /**
     * 結果スコア計算
     */
    private function calculateResultScore($result) {
        $score = 0;
        
        // 在庫状況
        if ($result['availability'] === 'in_stock') {
            $score += 50;
        } elseif ($result['availability'] === 'limited') {
            $score += 25;
        }
        
        // 評価
        if (isset($result['rating'])) {
            $score += $result['rating'] * 10;
        }
        
        // Prime/送料無料ボーナス
        if (isset($result['prime']) && $result['prime']) {
            $score += 20;
        }
        
        // 配送日数（早い方が高得点）
        if (isset($result['delivery_days'])) {
            $score += max(0, 10 - $result['delivery_days']);
        }
        
        return $score;
    }
    
    /**
     * Amazon価格抽出
     */
    private function extractAmazonPrice($item) {
        $price_info = $item['Offers']['Listings'][0]['Price'] ?? null;
        
        if ($price_info && isset($price_info['Amount'])) {
            return (int) $price_info['Amount'];
        }
        
        // フォールバック: DisplayAmountから数値抽出
        if (isset($price_info['DisplayAmount'])) {
            return (int) preg_replace('/[^\d]/', '', $price_info['DisplayAmount']);
        }
        
        return 0;
    }
    
    /**
     * Amazon在庫状況マッピング
     */
    private function mapAmazonAvailability($item) {
        $availability = $item['Offers']['Listings'][0]['Availability']['Message'] ?? '';
        
        if (strpos($availability, '在庫あり') !== false) {
            return 'in_stock';
        } elseif (strpos($availability, '残り') !== false) {
            return 'limited';
        } else {
            return 'out_of_stock';
        }
    }
    
    /**
     * AmazonプライムEligible判定
     */
    private function isAmazonPrimeEligible($item) {
        return isset($item['Offers']['Listings'][0]['DeliveryInfo']['IsPrimeMember']) &&
               $item['Offers']['Listings'][0]['DeliveryInfo']['IsPrimeMember'];
    }
    
    /**
     * Amazon評価抽出
     */
    private function extractAmazonRating($item) {
        return (float) ($item['CustomerReviews']['StarRating']['Value'] ?? 0);
    }
    
    /**
     * Amazonレビュー数抽出
     */
    private function extractAmazonReviewCount($item) {
        return (int) ($item['CustomerReviews']['Count'] ?? 0);
    }
    
    /**
     * Amazon画像URL抽出
     */
    private function extractAmazonImageUrl($item) {
        return $item['Images']['Primary']['Medium']['URL'] ?? '';
    }
    
    /**
     * Amazon配送日数推定
     */
    private function estimateAmazonDeliveryDays($item) {
        $delivery_info = $item['Offers']['Listings'][0]['DeliveryInfo'] ?? [];
        
        if (isset($delivery_info['IsPrimeMember']) && $delivery_info['IsPrimeMember']) {
            return 1; // Prime会員なら翌日配送
        }
        
        return 3; // 標準配送
    }
    
    /**
     * Amazon販売者情報抽出
     */
    private function extractAmazonSellerInfo($item) {
        $merchant = $item['Offers']['Listings'][0]['MerchantInfo'] ?? [];
        
        return [
            'name' => $merchant['Name'] ?? 'Amazon',
            'id' => $merchant['Id'] ?? ''
        ];
    }
    
    /**
     * Amazon特徴抽出
     */
    private function extractAmazonFeatures($item) {
        return $item['ItemInfo']['Features']['DisplayValues'] ?? [];
    }
    
    /**
     * 楽天配送情報解析
     */
    private function parseRakutenDeliveryInfo($item_data) {
        // 楽天の配送情報から配送日数を推定
        $shipping_info = $item_data['asurakuArea'] ?? '';
        
        if (strpos($shipping_info, 'あす楽') !== false) {
            return 1;
        }
        
        return 3; // 標準配送
    }
    
    /**
     * 楽天税込み判定
     */
    private function isRakutenTaxIncluded($item_data) {
        return isset($item_data['taxFlag']) && $item_data['taxFlag'] === 1;
    }
    
    /**
     * 楽天送料情報抽出
     */
    private function extractRakutenShippingInfo($item_data) {
        return [
            'free_shipping' => isset($item_data['postageFlag']) && $item_data['postageFlag'] === 1,
            'shipping_cost' => $item_data['shippingCost'] ?? 0
        ];
    }
    
    /**
     * Yahoo!在庫状況マッピング
     */
    private function mapYahooAvailability($item) {
        // Yahoo!の在庫情報から判定
        return 'in_stock'; // デフォルト値
    }
    
    /**
     * Yahoo!ポイント計算
     */
    private function calculateYahooPoints($item) {
        return (int) ($item['point']['amount'] ?? 0);
    }
    
    /**
     * Yahoo!配送情報解析
     */
    private function parseYahooDeliveryInfo($item) {
        // Yahoo!の配送情報から配送日数を推定
        return 3; // 標準配送
    }
    
    /**
     * 価格変動性計算
     */
    private function calculatePriceVolatility($prices) {
        if (count($prices) < 2) {
            return 0;
        }
        
        $mean = array_sum($prices) / count($prices);
        $variance = array_sum(array_map(function($price) use ($mean) {
            return pow($price - $mean, 2);
        }, $prices)) / count($prices);
        
        return round(sqrt($variance), 2);
    }
    
    /**
     * トレンド強度計算
     */
    private function calculateTrendStrength($percentage_change) {
        $abs_change = abs($percentage_change);
        
        if ($abs_change >= 20) {
            return 'strong';
        } elseif ($abs_change >= 10) {
            return 'moderate';
        } elseif ($abs_change >= 5) {
            return 'weak';
        } else {
            return 'minimal';
        }
    }
    
    /**
     * 購入タイミング推奨
     */
    private function getPurchaseTimingRecommendation($trend_direction, $current_price, $min_price, $avg_price) {
        $price_position = ($current_price - $min_price) / ($avg_price - $min_price + 1);
        
        if ($trend_direction === 'falling' && $price_position < 0.3) {
            return 'excellent'; // 下降トレンド + 安値圏
        } elseif ($trend_direction === 'falling') {
            return 'good'; // 下降トレンド
        } elseif ($trend_direction === 'stable' && $price_position < 0.5) {
            return 'good'; // 安定 + 平均以下
        } elseif ($trend_direction === 'rising' && $price_position < 0.2) {
            return 'fair'; // 上昇トレンドだが安値
        } else {
            return 'wait'; // 様子見推奨
        }
    }
    
    /**
     * データ鮮度計算
     */
    private function calculateDataFreshness($history) {
        if (empty($history)) {
            return 0;
        }
        
        $latest_timestamp = strtotime($history[0]['recorded_at']);
        $hours_old = (time() - $latest_timestamp) / 3600;
        
        if ($hours_old < 1) {
            return 'excellent';
        } elseif ($hours_old < 6) {
            return 'good';
        } elseif ($hours_old < 24) {
            return 'fair';
        } else {
            return 'stale';
        }
    }
    
    /**
     * キャッシュ有効期限確認
     */
    private function isCacheExpired($cached_data) {
        $cache_age = time() - $cached_data['timestamp'];
        $max_age = $cached_data['ttl'] ?? $this->config['cache']['search_ttl'];
        
        return $cache_age > $max_age;
    }
    
    /**
     * APIクライアント初期化
     */
    private function initializeApiClients() {
        $this->api_clients = [];
        
        // Amazon Product Advertising APIクライアント
        if ($this->config['providers']['amazon']['enabled']) {
            require_once 'clients/amazon_pa_api_client.php';
            $this->api_clients[self::PROVIDER_AMAZON] = new AmazonPAApiClient(
                $this->config['providers']['amazon']
            );
        }
        
        // 楽天商品検索APIクライアント
        if ($this->config['providers']['rakuten']['enabled']) {
            require_once 'clients/rakuten_api_client.php';
            $this->api_clients[self::PROVIDER_RAKUTEN] = new RakutenApiClient(
                $this->config['providers']['rakuten']
            );
        }
        
        // Yahoo!ショッピングAPIクライアント
        if ($this->config['providers']['yahoo']['enabled']) {
            require_once 'clients/yahoo_shopping_client.php';
            $this->api_clients[self::PROVIDER_YAHOO] = new YahooShoppingClient(
                $this->config['providers']['yahoo']
            );
        }
    }
    
    /**
     * キャッシュマネージャー初期化
     */
    private function initializeCacheManager() {
        require_once '../../../common/utils/cache_manager.php';
        $this->cache_manager = new CacheManager('price_comparison');
    }
    
    /**
     * レート制限管理初期化
     */
    private function initializeRateLimiter() {
        require_once '../../../common/utils/rate_limiter.php';
        $this->rate_limiter = new RateLimiter('price_comparison_api');
    }
    
    /**
     * デフォルト設定作成
     */
    private function createDefaultConfig($config_file) {
        $default_config = [
            'providers' => [
                'amazon' => [
                    'enabled' => true,
                    'access_key' => $_ENV['AMAZON_PA_ACCESS_KEY'] ?? '',
                    'secret_key' => $_ENV['AMAZON_PA_SECRET_KEY'] ?? '',
                    'partner_tag' => $_ENV['AMAZON_PA_PARTNER_TAG'] ?? '',
                    'host' => 'webservices.amazon.co.jp',
                    'region' => 'us-west-2'
                ],
                'rakuten' => [
                    'enabled' => true,
                    'application_id' => $_ENV['RAKUTEN_APP_ID'] ?? '',
                    'affiliate_id' => $_ENV['RAKUTEN_AFFILIATE_ID'] ?? ''
                ],
                'yahoo' => [
                    'enabled' => true,
                    'client_id' => $_ENV['YAHOO_CLIENT_ID'] ?? '',
                    'client_secret' => $_ENV['YAHOO_CLIENT_SECRET'] ?? ''
                ]
            ],
            'cache' => [
                'search_ttl' => 1800, // 30分
                'price_history_ttl' => 3600 // 1時間
            ],
            'rate_limits' => [
                'amazon' => ['requests_per_second' => 1, 'requests_per_hour' => 8640],
                'rakuten' => ['requests_per_second' => 2, 'requests_per_hour' => 10000],
                'yahoo' => ['requests_per_second' => 5, 'requests_per_hour' => 50000]
            ]
        ];
        
        $config_dir = dirname($config_file);
        if (!is_dir($config_dir)) {
            mkdir($config_dir, 0755, true);
        }
        
        file_put_contents($config_file, "<?php\nreturn " . var_export($default_config, true) . ";\n");
    }
}
?>