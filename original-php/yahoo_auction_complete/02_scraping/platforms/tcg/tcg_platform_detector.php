<?php
/**
 * TCGプラットフォーム自動判定クラス
 * 
 * URLから自動的にプラットフォームを判定
 * Yahoo Auction統合システムの判定ロジックを継承
 * 
 * @version 1.0.0
 * @created 2025-09-26
 */

class TCGPlatformDetector {
    private $platformConfigs;
    private $logger;
    
    public function __construct() {
        $this->platformConfigs = require __DIR__ . '/../config/tcg_platforms_config.php';
        $this->initializeLogger();
    }
    
    /**
     * ロガー初期化
     */
    private function initializeLogger() {
        $logDir = __DIR__ . '/../../logs/common';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
        
        $this->logger = new class($logDir) {
            private $logDir;
            
            public function __construct($logDir) {
                $this->logDir = $logDir;
            }
            
            public function info($message) {
                $this->writeLog('INFO', $message);
            }
            
            public function error($message) {
                $this->writeLog('ERROR', $message);
            }
            
            private function writeLog($level, $message) {
                $timestamp = date('Y-m-d H:i:s');
                $logFile = $this->logDir . '/' . date('Y-m-d') . '_platform_detector.log';
                $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
                file_put_contents($logFile, $logMessage, FILE_APPEND);
            }
        };
    }
    
    /**
     * URLからプラットフォームを自動判定
     * 
     * @param string $url 判定対象URL
     * @return array ['platform' => string, 'config' => array, 'confidence' => float]
     */
    public function detectPlatform($url) {
        $this->logger->info("プラットフォーム判定開始: {$url}");
        
        // URL正規化
        $url = $this->normalizeUrl($url);
        
        // 各プラットフォームのパターンマッチング
        foreach ($this->platformConfigs as $platformId => $config) {
            $confidence = $this->calculateMatchConfidence($url, $config);
            
            if ($confidence > 0.8) {
                $this->logger->info("プラットフォーム判定成功: {$platformId} (信頼度: {$confidence})");
                return [
                    'platform' => $platformId,
                    'config' => $config,
                    'confidence' => $confidence
                ];
            }
        }
        
        // 判定失敗
        $this->logger->error("プラットフォーム判定失敗: {$url}");
        return [
            'platform' => 'unknown',
            'config' => null,
            'confidence' => 0.0,
            'error' => 'プラットフォームを判定できませんでした'
        ];
    }
    
    /**
     * URL正規化
     */
    private function normalizeUrl($url) {
        // HTTPSに統一
        $url = preg_replace('/^http:/', 'https:', $url);
        
        // wwwの有無を統一
        $url = preg_replace('/^https:\/\/www\./', 'https://', $url);
        
        // 末尾スラッシュ削除
        $url = rtrim($url, '/');
        
        // クエリパラメータ除去（商品ID以外）
        $urlParts = parse_url($url);
        if (isset($urlParts['query'])) {
            parse_str($urlParts['query'], $params);
            // 重要なパラメータのみ保持
            $importantParams = ['id', 'product_id', 'item_id', 'sku'];
            $filteredParams = array_intersect_key($params, array_flip($importantParams));
            if (!empty($filteredParams)) {
                $url = $urlParts['scheme'] . '://' . $urlParts['host'] . $urlParts['path'] . '?' . http_build_query($filteredParams);
            } else {
                $url = $urlParts['scheme'] . '://' . $urlParts['host'] . $urlParts['path'];
            }
        }
        
        return $url;
    }
    
    /**
     * マッチング信頼度計算
     */
    private function calculateMatchConfidence($url, $config) {
        $confidence = 0.0;
        $checks = [];
        
        // 1. URLパターンマッチング (60%)
        if (!empty($config['url_patterns'])) {
            foreach ($config['url_patterns'] as $pattern) {
                if (preg_match($pattern, $url)) {
                    $confidence += 0.6;
                    $checks[] = 'url_pattern_match';
                    break;
                }
            }
        }
        
        // 2. ベースURLマッチング (30%)
        if (!empty($config['base_url'])) {
            $baseHost = parse_url($config['base_url'], PHP_URL_HOST);
            $urlHost = parse_url($url, PHP_URL_HOST);
            
            // ホスト名の部分一致チェック
            if ($baseHost && $urlHost) {
                // www除去して比較
                $baseHost = str_replace('www.', '', $baseHost);
                $urlHost = str_replace('www.', '', $urlHost);
                
                if ($baseHost === $urlHost) {
                    $confidence += 0.3;
                    $checks[] = 'base_url_exact_match';
                } elseif (strpos($urlHost, $baseHost) !== false || strpos($baseHost, $urlHost) !== false) {
                    $confidence += 0.15;
                    $checks[] = 'base_url_partial_match';
                }
            }
        }
        
        // 3. ドメイン特徴マッチング (10%)
        $domainFeatures = $this->extractDomainFeatures($url);
        $configFeatures = $this->extractDomainFeatures($config['base_url'] ?? '');
        
        if (!empty($domainFeatures) && !empty($configFeatures)) {
            $commonFeatures = array_intersect($domainFeatures, $configFeatures);
            if (!empty($commonFeatures)) {
                $confidence += 0.1 * (count($commonFeatures) / max(count($domainFeatures), count($configFeatures)));
                $checks[] = 'domain_features_match';
            }
        }
        
        $this->logger->info("信頼度計算: {$config['platform_id']} = {$confidence} (" . implode(', ', $checks) . ")");
        
        return $confidence;
    }
    
    /**
     * ドメイン特徴抽出
     */
    private function extractDomainFeatures($url) {
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) {
            return [];
        }
        
        // ドメインをトークン化
        $tokens = preg_split('/[.\-_]/', $host);
        
        // ストップワード除去
        $stopWords = ['www', 'com', 'co', 'jp', 'net', 'org', 'shop', 'store'];
        $features = array_diff($tokens, $stopWords);
        
        return array_values($features);
    }
    
    /**
     * 複数URL一括判定
     */
    public function detectBatch($urls) {
        $results = [];
        
        foreach ($urls as $url) {
            $results[$url] = $this->detectPlatform($url);
        }
        
        return $results;
    }
    
    /**
     * 対応プラットフォーム一覧取得
     */
    public function getSupportedPlatforms() {
        $platforms = [];
        
        foreach ($this->platformConfigs as $platformId => $config) {
            $platforms[$platformId] = [
                'id' => $platformId,
                'name' => $config['name'],
                'category' => $config['category'],
                'priority' => $config['priority'],
                'base_url' => $config['base_url']
            ];
        }
        
        return $platforms;
    }
    
    /**
     * プラットフォーム設定取得
     */
    public function getPlatformConfig($platformId) {
        if (isset($this->platformConfigs[$platformId])) {
            return $this->platformConfigs[$platformId];
        }
        
        return null;
    }
    
    /**
     * カテゴリ別プラットフォーム取得
     */
    public function getPlatformsByCategory($category) {
        $platforms = [];
        
        foreach ($this->platformConfigs as $platformId => $config) {
            if ($config['category'] === $category) {
                $platforms[$platformId] = $config;
            }
        }
        
        return $platforms;
    }
    
    /**
     * 優先度別プラットフォーム取得
     */
    public function getPlatformsByPriority($priority) {
        $platforms = [];
        
        foreach ($this->platformConfigs as $platformId => $config) {
            if ($config['priority'] === $priority) {
                $platforms[$platformId] = $config;
            }
        }
        
        return $platforms;
    }
    
    /**
     * プラットフォーム判定統計
     */
    public function getDetectionStats($urls) {
        $stats = [
            'total' => count($urls),
            'detected' => 0,
            'unknown' => 0,
            'by_platform' => [],
            'by_category' => [],
            'avg_confidence' => 0.0
        ];
        
        $totalConfidence = 0.0;
        
        foreach ($urls as $url) {
            $result = $this->detectPlatform($url);
            
            if ($result['platform'] !== 'unknown') {
                $stats['detected']++;
                $platform = $result['platform'];
                $category = $result['config']['category'] ?? 'unknown';
                
                // プラットフォーム別カウント
                if (!isset($stats['by_platform'][$platform])) {
                    $stats['by_platform'][$platform] = 0;
                }
                $stats['by_platform'][$platform]++;
                
                // カテゴリ別カウント
                if (!isset($stats['by_category'][$category])) {
                    $stats['by_category'][$category] = 0;
                }
                $stats['by_category'][$category]++;
                
                $totalConfidence += $result['confidence'];
            } else {
                $stats['unknown']++;
            }
        }
        
        // 平均信頼度計算
        if ($stats['detected'] > 0) {
            $stats['avg_confidence'] = round($totalConfidence / $stats['detected'], 3);
        }
        
        return $stats;
    }
}

// ============================================
// 使用例
// ============================================

/*
// 基本的な使用方法
$detector = new TCGPlatformDetector();

// 単一URL判定
$url = 'https://www.singlestar.jp/product/12345';
$result = $detector->detectPlatform($url);

if ($result['platform'] !== 'unknown') {
    echo "プラットフォーム: {$result['config']['name']}" . PHP_EOL;
    echo "カテゴリ: {$result['config']['category']}" . PHP_EOL;
    echo "信頼度: {$result['confidence']}" . PHP_EOL;
}

// 複数URL一括判定
$urls = [
    'https://www.singlestar.jp/product/123',
    'https://www.hareruyamtg.com/ja/products/456',
    'https://pokemon-card-fullahead.com/product/789'
];
$results = $detector->detectBatch($urls);

// 対応プラットフォーム一覧
$platforms = $detector->getSupportedPlatforms();
print_r($platforms);

// カテゴリ別プラットフォーム
$mtgPlatforms = $detector->getPlatformsByCategory('MTG');
$pokemonPlatforms = $detector->getPlatformsByCategory('Pokemon');

// 統計情報
$stats = $detector->getDetectionStats($urls);
print_r($stats);
*/
