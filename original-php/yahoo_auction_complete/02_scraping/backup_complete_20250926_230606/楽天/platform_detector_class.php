<?php
/**
 * プラットフォーム判定クラス
 * 
 * 作成日: 2025-09-25
 * 用途: URLからプラットフォームを自動判定
 * 場所: 02_scraping/common/PlatformDetector.php
 */

class PlatformDetector {
    
    private $platformPatterns;
    private $fallbackPatterns;
    
    /**
     * コンストラクタ
     */
    public function __construct() {
        $this->initializePlatformPatterns();
        $this->initializeFallbackPatterns();
    }
    
    /**
     * URLからプラットフォームを判定
     * 
     * @param string $url 判定対象のURL
     * @return string プラットフォーム名
     */
    public function detect($url) {
        if (!$this->isValidUrl($url)) {
            return 'unknown';
        }
        
        // 正規化
        $normalizedUrl = $this->normalizeUrl($url);
        
        // メインパターンでの判定
        foreach ($this->platformPatterns as $platform => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $normalizedUrl)) {
                    return $platform;
                }
            }
        }
        
        // フォールバックパターンでの判定
        foreach ($this->fallbackPatterns as $platform => $patterns) {
            foreach ($patterns as $pattern) {
                if (preg_match($pattern, $normalizedUrl)) {
                    return $platform;
                }
            }
        }
        
        // ドメイン部分のみでの判定（最後の手段）
        $domain = $this->extractDomain($normalizedUrl);
        return $this->detectByDomain($domain);
    }
    
    /**
     * プラットフォーム情報を詳細取得
     * 
     * @param string $url 判定対象のURL
     * @return array プラットフォーム詳細情報
     */
    public function detectWithDetails($url) {
        $platform = $this->detect($url);
        $domain = $this->extractDomain($url);
        $confidence = $this->calculateConfidence($url, $platform);
        
        return [
            'platform' => $platform,
            'domain' => $domain,
            'confidence' => $confidence,
            'url' => $url,
            'normalized_url' => $this->normalizeUrl($url),
            'is_supported' => $this->isSupportedPlatform($platform),
            'detection_method' => $this->getDetectionMethod($url, $platform)
        ];
    }
    
    /**
     * 複数URLを一括判定
     * 
     * @param array $urls URL配列
     * @return array 判定結果配列
     */
    public function detectBatch($urls) {
        $results = [];
        
        foreach ($urls as $url) {
            $results[] = [
                'url' => $url,
                'platform' => $this->detect($url),
                'details' => $this->detectWithDetails($url)
            ];
        }
        
        return $results;
    }
    
    /**
     * サポートされているプラットフォーム一覧を取得
     * 
     * @return array プラットフォーム一覧
     */
    public function getSupportedPlatforms() {
        return array_keys($this->platformPatterns);
    }
    
    /**
     * プラットフォームの説明を取得
     * 
     * @param string $platform プラットフォーム名
     * @return array プラットフォーム情報
     */
    public function getPlatformInfo($platform) {
        $platformInfo = [
            'yahoo_auction' => [
                'name' => 'Yahoo オークション',
                'name_en' => 'Yahoo Auctions',
                'domains' => ['auctions.yahoo.co.jp', 'page.auctions.yahoo.co.jp'],
                'url_example' => 'https://auctions.yahoo.co.jp/jp/auction/x123456789',
                'status' => 'active',
                'scraping_difficulty' => 'medium',
                'rate_limit' => 2000, // milliseconds
                'features' => ['auction', 'bidding', 'buyitnow']
            ],
            'rakuten' => [
                'name' => '楽天市場',
                'name_en' => 'Rakuten Ichiba',
                'domains' => ['item.rakuten.co.jp', 'rakuten.co.jp'],
                'url_example' => 'https://item.rakuten.co.jp/shop/item/',
                'status' => 'active',
                'scraping_difficulty' => 'easy',
                'rate_limit' => 1000, // milliseconds
                'features' => ['marketplace', 'reviews', 'shop_system']
            ],
            'mercari' => [
                'name' => 'メルカリ',
                'name_en' => 'Mercari',
                'domains' => ['jp.mercari.com', 'mercari.com'],
                'url_example' => 'https://jp.mercari.com/item/m12345678901',
                'status' => 'planned',
                'scraping_difficulty' => 'hard',
                'rate_limit' => 3000,
                'features' => ['freemarket', 'mobile_first', 'shipping']
            ],
            'paypayfleamarket' => [
                'name' => 'PayPayフリマ',
                'name_en' => 'PayPay Flea Market',
                'domains' => ['paypayfleamarket.yahoo.co.jp'],
                'url_example' => 'https://paypayfleamarket.yahoo.co.jp/item/xxx',
                'status' => 'planned',
                'scraping_difficulty' => 'medium',
                'rate_limit' => 2000,
                'features' => ['freemarket', 'paypay_payment']
            ],
            'pokemon_center' => [
                'name' => 'ポケモンセンター',
                'name_en' => 'Pokemon Center',
                'domains' => ['pokemoncenter-online.com'],
                'url_example' => 'https://www.pokemoncenter-online.com/?p_cd=4521329365084',
                'status' => 'planned',
                'scraping_difficulty' => 'medium',
                'rate_limit' => 2000,
                'features' => ['official_store', 'limited_items']
            ],
            'yodobashi' => [
                'name' => 'ヨドバシカメラ',
                'name_en' => 'Yodobashi Camera',
                'domains' => ['yodobashi.com'],
                'url_example' => 'https://www.yodobashi.com/product/100000001007654321/',
                'status' => 'planned',
                'scraping_difficulty' => 'medium',
                'rate_limit' => 2000,
                'features' => ['electronics', 'point_system']
            ],
            'golfdo' => [
                'name' => 'ゴルフドゥ',
                'name_en' => 'Golf Do',
                'domains' => ['golfdo.com'],
                'url_example' => 'https://www.golfdo.com/products/xxxxx',
                'status' => 'planned',
                'scraping_difficulty' => 'medium',
                'rate_limit' => 2000,
                'features' => ['golf_equipment', 'specialized']
            ]
        ];
        
        return $platformInfo[$platform] ?? [
            'name' => '不明',
            'name_en' => 'Unknown',
            'domains' => [],
            'status' => 'unknown',
            'scraping_difficulty' => 'unknown'
        ];
    }
    
    /**
     * プラットフォームパターンを初期化
     */
    private function initializePlatformPatterns() {
        $this->platformPatterns = [
            'yahoo_auction' => [
                '/auctions\.yahoo\.co\.jp\/jp\/auction\/[a-z0-9]+/i',
                '/page\.auctions\.yahoo\.co\.jp\/jp\/auction\/[a-z0-9]+/i',
                '/auctions\.yahoo\.co\.jp.*auction.*[a-z0-9]+/i'
            ],
            'rakuten' => [
                '/item\.rakuten\.co\.jp\/[^\/]+\/[^\/]+\/?/i',
                '/rakuten\.co\.jp\/[^\/]+\/.*?\.html/i',
                '/item\.rakuten\.co\.jp\/.*\?/i'
            ],
            'mercari' => [
                '/jp\.mercari\.com\/item\/m[0-9]+/i',
                '/mercari\.com\/jp\/items\/m[0-9]+/i',
                '/mercari\.com.*item.*m[0-9]+/i'
            ],
            'paypayfleamarket' => [
                '/paypayfleamarket\.yahoo\.co\.jp\/item\/[a-z0-9_-]+/i',
                '/paypayfleamarket\.yahoo\.co\.jp.*item/i'
            ],
            'pokemon_center' => [
                '/pokemoncenter-online\.com\/.*p_cd=/i',
                '/pokemoncenter-online\.com.*product/i',
                '/pokemoncenter-online\.com.*\.html/i'
            ],
            'yodobashi' => [
                '/yodobashi\.com\/product\/[0-9]+\//i',
                '/yodobashi\.com.*pd\//i',
                '/yodobashi\.com.*product/i'
            ],
            'golfdo' => [
                '/golfdo\.com\/products?\/[a-z0-9_-]+/i',
                '/golfdo\.com.*item/i'
            ]
        ];
    }
    
    /**
     * フォールバックパターンを初期化
     */
    private function initializeFallbackPatterns() {
        $this->fallbackPatterns = [
            'yahoo_auction' => [
                '/yahoo\.co\.jp.*auction/i',
                '/auctions\.yahoo/i'
            ],
            'rakuten' => [
                '/rakuten\.co\.jp/i',
                '/rakuten\.ne\.jp/i'
            ],
            'mercari' => [
                '/mercari\.com/i'
            ],
            'paypayfleamarket' => [
                '/paypayfleamarket/i',
                '/paypay.*flea/i'
            ],
            'pokemon_center' => [
                '/pokemoncenter/i',
                '/pokemon.*center/i'
            ],
            'yodobashi' => [
                '/yodobashi/i'
            ],
            'golfdo' => [
                '/golfdo/i',
                '/golf.*do/i'
            ]
        ];
    }
    
    /**
     * URLの正規化
     * 
     * @param string $url URL
     * @return string 正規化されたURL
     */
    private function normalizeUrl($url) {
        // プロトコルの統一
        $url = preg_replace('/^https?:\/\//i', 'https://', $url);
        
        // wwwの除去（必要に応じて）
        $url = preg_replace('/^https:\/\/www\./i', 'https://', $url);
        
        // 末尾スラッシュの統一
        $url = rtrim($url, '/');
        
        // パラメータの正規化（一部）
        $url = preg_replace('/[?&]utm_[^=]*=[^&]*/i', '', $url);
        $url = preg_replace('/[?&]ref=[^&]*/i', '', $url);
        
        return $url;
    }
    
    /**
     * ドメインを抽出
     * 
     * @param string $url URL
     * @return string ドメイン
     */
    private function extractDomain($url) {
        $parsed = parse_url($url);
        return $parsed['host'] ?? '';
    }
    
    /**
     * ドメインベースでの判定
     * 
     * @param string $domain ドメイン
     * @return string プラットフォーム名
     */
    private function detectByDomain($domain) {
        $domainMappings = [
            'auctions.yahoo.co.jp' => 'yahoo_auction',
            'page.auctions.yahoo.co.jp' => 'yahoo_auction',
            'item.rakuten.co.jp' => 'rakuten',
            'rakuten.co.jp' => 'rakuten',
            'jp.mercari.com' => 'mercari',
            'mercari.com' => 'mercari',
            'paypayfleamarket.yahoo.co.jp' => 'paypayfleamarket',
            'pokemoncenter-online.com' => 'pokemon_center',
            'yodobashi.com' => 'yodobashi',
            'golfdo.com' => 'golfdo'
        ];
        
        // 完全一致
        if (isset($domainMappings[$domain])) {
            return $domainMappings[$domain];
        }
        
        // 部分一致
        foreach ($domainMappings as $mappedDomain => $platform) {
            if (strpos($domain, $mappedDomain) !== false) {
                return $platform;
            }
        }
        
        return 'unknown';
    }
    
    /**
     * URLの有効性チェック
     * 
     * @param string $url URL
     * @return bool 有効性
     */
    private function isValidUrl($url) {
        return !empty($url) && filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    /**
     * 判定信頼度を計算
     * 
     * @param string $url URL
     * @param string $platform プラットフォーム
     * @return float 信頼度 (0.0-1.0)
     */
    private function calculateConfidence($url, $platform) {
        if ($platform === 'unknown') {
            return 0.0;
        }
        
        $confidence = 0.5; // ベース信頼度
        
        // メインパターンマッチで判定された場合
        if (isset($this->platformPatterns[$platform])) {
            foreach ($this->platformPatterns[$platform] as $pattern) {
                if (preg_match($pattern, $url)) {
                    $confidence = 0.9;
                    break;
                }
            }
        }
        
        // ドメイン完全一致の場合
        $domain = $this->extractDomain($url);
        $platformInfo = $this->getPlatformInfo($platform);
        if (in_array($domain, $platformInfo['domains'] ?? [])) {
            $confidence = max($confidence, 0.8);
        }
        
        return $confidence;
    }
    
    /**
     * サポートされているプラットフォームかチェック
     * 
     * @param string $platform プラットフォーム名
     * @return bool サポート状況
     */
    private function isSupportedPlatform($platform) {
        $supportedStatuses = ['active', 'beta'];
        $platformInfo = $this->getPlatformInfo($platform);
        return in_array($platformInfo['status'] ?? 'unknown', $supportedStatuses);
    }
    
    /**
     * 判定方法を取得
     * 
     * @param string $url URL
     * @param string $platform プラットフォーム
     * @return string 判定方法
     */
    private function getDetectionMethod($url, $platform) {
        // メインパターンチェック
        if (isset($this->platformPatterns[$platform])) {
            foreach ($this->platformPatterns[$platform] as $pattern) {
                if (preg_match($pattern, $url)) {
                    return 'main_pattern';
                }
            }
        }
        
        // フォールバックパターンチェック
        if (isset($this->fallbackPatterns[$platform])) {
            foreach ($this->fallbackPatterns[$platform] as $pattern) {
                if (preg_match($pattern, $url)) {
                    return 'fallback_pattern';
                }
            }
        }
        
        // ドメイン判定
        $domain = $this->extractDomain($url);
        if ($this->detectByDomain($domain) === $platform) {
            return 'domain_match';
        }
        
        return 'unknown';
    }
}
?>