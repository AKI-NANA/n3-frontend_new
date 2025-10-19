<?php
/**
 * eBay最適カテゴリー自動選択システム - 統合最新版
 * ファイル: EbayOptimalCategorySelector.php
 * 
 * 機能:
 * 1. eBay APIから最新カテゴリー取得・DB保存
 * 2. 商品情報から最適カテゴリー自動選択
 * 3. 手数料情報統合管理
 * 4. 高精度マッチングアルゴリズム
 */

class EbayOptimalCategorySelector {
    private $pdo;
    private $ebayApiConfig;
    private $cacheTtl = 3600; // 1時間キャッシュ
    
    public function __construct($dbConnection, $ebayConfig = null) {
        $this->pdo = $dbConnection;
        $this->ebayApiConfig = $ebayConfig ?? $this->getDefaultEbayConfig();
    }
    
    /**
     * メイン機能: 商品情報から最適なeBayカテゴリーを自動選択
     * 
     * @param array $productInfo [
     *   'title' => '商品タイトル',
     *   'description' => '商品説明', 
     *   'brand' => 'ブランド名',
     *   'condition' => '状態',
     *   'yahoo_category' => 'Yahooカテゴリー',
     *   'price_jpy' => '日本円価格'
     * ]
     * @return array 最適カテゴリー情報
     */
    public function selectOptimalCategory($productInfo) {
        try {
            // 1️⃣ 入力データ検証
            $this->validateProductInfo($productInfo);
            
            // 2️⃣ eBay API GetSuggestedCategories 使用
            $suggestedCategories = $this->getEbaySuggestedCategories($productInfo);
            
            // 3️⃣ 内部データベースとのクロス照合
            $dbMatches = $this->findDatabaseMatches($productInfo);
            
            // 4️⃣ 総合スコア計算・最適カテゴリー選択
            $optimalCategory = $this->calculateOptimalCategory($suggestedCategories, $dbMatches, $productInfo);
            
            // 5️⃣ 手数料情報付加
            $optimalCategory['fee_info'] = $this->getFeeInfo($optimalCategory['category_id']);
            
            // 6️⃣ Item Specifics生成
            $optimalCategory['item_specifics'] = $this->generateItemSpecifics($optimalCategory['category_id'], $productInfo);
            
            return [
                'success' => true,
                'optimal_category' => $optimalCategory,
                'alternatives' => array_slice($suggestedCategories, 1, 2), // 代替案
                'processing_time' => microtime(true) - $startTime,
                'method' => 'ebay_api_enhanced'
            ];
            
        } catch (Exception $e) {
            error_log("Category selection error: " . $e->getMessage());
            return $this->fallbackCategorySelection($productInfo);
        }
    }
    
    /**
     * eBay API GetSuggestedCategories 呼び出し
     */
    private function getEbaySuggestedCategories($productInfo) {
        // キャッシュ確認
        $cacheKey = 'suggested_' . md5(json_encode($productInfo));
        $cached = $this->getCache($cacheKey);
        if ($cached) return $cached;
        
        $requestXml = $this->buildGetSuggestedCategoriesRequest($productInfo);
        
        $response = $this->callEbayApi('GetSuggestedCategories', $requestXml);
        
        if (!$response || isset($response['Errors'])) {
            throw new Exception('eBay API call failed: ' . ($response['Errors'][0]['LongMessage'] ?? 'Unknown error'));
        }
        
        $categories = $this->parseEbayCategoriesResponse($response);
        
        // キャッシュ保存
        $this->setCache($cacheKey, $categories);
        
        return $categories;
    }
    
    /**
     * GetSuggestedCategories リクエスト構築
     */
    private function buildGetSuggestedCategoriesRequest($productInfo) {
        $title = htmlspecialchars($productInfo['title'], ENT_XML1, 'UTF-8');
        
        return "<?xml version='1.0' encoding='utf-8'?>
        <GetSuggestedCategoriesRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
            <RequesterCredentials>
                <eBayAuthToken>{$this->ebayApiConfig['auth_token']}</eBayAuthToken>
            </RequesterCredentials>
            <Version>{$this->ebayApiConfig['version']}</Version>
            <Query>{$title}</Query>
            <MaxSuggestions>10</MaxSuggestions>
        </GetSuggestedCategoriesRequest>";
    }
    
    /**
     * eBay APIレスポンス解析
     */
    private function parseEbayCategoriesResponse($response) {
        $categories = [];
        
        if (isset($response['SuggestedCategoryArray']['SuggestedCategory'])) {
            $suggestions = $response['SuggestedCategoryArray']['SuggestedCategory'];
            
            // 単一結果の場合は配列に変換
            if (!isset($suggestions[0])) {
                $suggestions = [$suggestions];
            }
            
            foreach ($suggestions as $suggestion) {
                $categories[] = [
                    'category_id' => $suggestion['Category']['CategoryID'],
                    'category_name' => $suggestion['Category']['CategoryName'],
                    'category_path' => $this->buildCategoryPath($suggestion['Category']),
                    'percentage_match' => floatval($suggestion['PercentItemFound'] ?? 0),
                    'ebay_score' => floatval($suggestion['PercentItemFound'] ?? 0),
                    'source' => 'ebay_suggested'
                ];
            }
        }
        
        return $categories;
    }
    
    /**
     * データベースマッチング検索
     */
    private function findDatabaseMatches($productInfo) {
        $matches = [];
        
        // キーワードベース検索
        $keywords = $this->extractKeywords($productInfo['title'] . ' ' . ($productInfo['description'] ?? ''));
        
        $sql = "
            SELECT 
                ec.category_id,
                ec.category_name,
                ec.category_path,
                ck.keyword,
                ck.weight,
                COUNT(*) as keyword_matches
            FROM ebay_categories ec
            JOIN category_keywords ck ON ec.category_id = ck.category_id
            WHERE ec.is_active = true 
            AND (";
        
        $params = [];
        $conditions = [];
        
        foreach ($keywords as $keyword) {
            $conditions[] = "LOWER(ck.keyword) LIKE ?";
            $params[] = '%' . strtolower($keyword) . '%';
        }
        
        $sql .= implode(' OR ', $conditions) . ")
            GROUP BY ec.category_id, ec.category_name, ec.category_path, ck.keyword, ck.weight
            ORDER BY keyword_matches DESC, ck.weight DESC
            LIMIT 20";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // スコア計算
        foreach ($results as $result) {
            $categoryId = $result['category_id'];
            if (!isset($matches[$categoryId])) {
                $matches[$categoryId] = [
                    'category_id' => $result['category_id'],
                    'category_name' => $result['category_name'],
                    'category_path' => $result['category_path'],
                    'db_score' => 0,
                    'matched_keywords' => [],
                    'source' => 'database'
                ];
            }
            
            $matches[$categoryId]['db_score'] += $result['weight'] * $result['keyword_matches'];
            $matches[$categoryId]['matched_keywords'][] = $result['keyword'];
        }
        
        return array_values($matches);
    }
    
    /**
     * 最適カテゴリー計算
     */
    private function calculateOptimalCategory($suggestedCategories, $dbMatches, $productInfo) {
        $allCandidates = [];
        
        // eBay提案カテゴリー（高重み）
        foreach ($suggestedCategories as $category) {
            $category['final_score'] = $category['ebay_score'] * 2.0; // eBay APIを重視
            $allCandidates[] = $category;
        }
        
        // DB マッチカテゴリー
        foreach ($dbMatches as $category) {
            $category['final_score'] = $category['db_score'] * 1.0;
            
            // 既存のeBay提案と重複チェック
            $exists = false;
            foreach ($allCandidates as &$existing) {
                if ($existing['category_id'] === $category['category_id']) {
                    $existing['final_score'] += $category['db_score'] * 0.5; // 重複時はボーナス
                    $existing['source'] = 'ebay_and_database';
                    $exists = true;
                    break;
                }
            }
            
            if (!$exists) {
                $allCandidates[] = $category;
            }
        }
        
        // 価格帯適正性チェック
        if (isset($productInfo['price_jpy'])) {
            $priceUsd = $productInfo['price_jpy'] / 150; // 概算
            foreach ($allCandidates as &$candidate) {
                $priceAdjustment = $this->calculatePriceCompatibility($candidate['category_id'], $priceUsd);
                $candidate['final_score'] *= $priceAdjustment;
            }
        }
        
        // 最高スコアのカテゴリーを選択
        usort($allCandidates, function($a, $b) {
            return $b['final_score'] <=> $a['final_score'];
        });
        
        if (empty($allCandidates)) {
            throw new Exception('No suitable categories found');
        }
        
        $optimal = $allCandidates[0];
        $optimal['confidence'] = min(100, max(50, $optimal['final_score']));
        
        return $optimal;
    }
    
    /**
     * eBay API 呼び出し
     */
    private function callEbayApi($callName, $requestXml) {
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->ebayApiConfig['version'],
            'X-EBAY-API-DEV-NAME: ' . $this->ebayApiConfig['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $this->ebayApiConfig['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $this->ebayApiConfig['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $callName,
            'Content-Type: text/xml; charset=utf-8',
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->ebayApiConfig['endpoint'],
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $requestXml,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("eBay API HTTP error: {$httpCode}");
        }
        
        // XML to Array conversion
        $xml = simplexml_load_string($response);
        return json_decode(json_encode($xml), true);
    }
    
    /**
     * 手数料情報取得
     */
    private function getFeeInfo($categoryId) {
        $stmt = $this->pdo->prepare("
            SELECT * FROM fee_matches 
            WHERE category_id = ? 
            ORDER BY confidence DESC 
            LIMIT 1
        ");
        $stmt->execute([$categoryId]);
        $fee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fee) {
            return [
                'final_value_fee_percent' => $fee['fee_percent'],
                'confidence' => $fee['confidence'],
                'last_updated' => $fee['created_at'] ?? null,
                'source' => 'database'
            ];
        }
        
        // デフォルト手数料
        return [
            'final_value_fee_percent' => 13.25,
            'confidence' => 50,
            'source' => 'default'
        ];
    }
    
    /**
     * フォールバック処理
     */
    private function fallbackCategorySelection($productInfo) {
        // 基本的なキーワードマッチング
        $keywords = $this->extractKeywords($productInfo['title']);
        
        $defaultCategories = [
            'iphone|smartphone|phone' => '293', // Cell Phones
            'camera|photo|canon|nikon' => '625', // Cameras
            'book|magazine' => '267', // Books
            'clothing|shirt|dress' => '11450', // Clothing
            'watch|jewelry' => '14324', // Jewelry & Watches
        ];
        
        foreach ($defaultCategories as $pattern => $categoryId) {
            if (preg_match("/{$pattern}/i", implode(' ', $keywords))) {
                return [
                    'success' => true,
                    'optimal_category' => [
                        'category_id' => $categoryId,
                        'category_name' => 'Fallback Category',
                        'confidence' => 40,
                        'source' => 'fallback'
                    ],
                    'method' => 'fallback'
                ];
            }
        }
        
        // 最終フォールバック
        return [
            'success' => true,
            'optimal_category' => [
                'category_id' => '99999',
                'category_name' => 'Other',
                'confidence' => 30,
                'source' => 'default'
            ],
            'method' => 'default'
        ];
    }
    
    // ユーティリティメソッド
    private function extractKeywords($text) {
        return array_filter(explode(' ', strtolower(preg_replace('/[^\w\s]/', ' ', $text))), function($word) {
            return strlen($word) >= 3;
        });
    }
    
    private function getDefaultEbayConfig() {
        return [
            'endpoint' => 'https://api.sandbox.ebay.com/ws/api/',
            'version' => '1193',
            'app_id' => getenv('EBAY_APP_ID') ?: 'YOUR_APP_ID',
            'dev_id' => getenv('EBAY_DEV_ID') ?: 'YOUR_DEV_ID',
            'cert_id' => getenv('EBAY_CERT_ID') ?: 'YOUR_CERT_ID',
            'auth_token' => getenv('EBAY_AUTH_TOKEN') ?: 'YOUR_AUTH_TOKEN'
        ];
    }
    
    private function getCache($key) {
        // Redis/Memcached実装 (簡易版はファイルキャッシュ)
        $file = sys_get_temp_dir() . '/ebay_cache_' . md5($key);
        if (file_exists($file) && (time() - filemtime($file)) < $this->cacheTtl) {
            return unserialize(file_get_contents($file));
        }
        return null;
    }
    
    private function setCache($key, $value) {
        $file = sys_get_temp_dir() . '/ebay_cache_' . md5($key);
        file_put_contents($file, serialize($value));
    }
}

// 使用例
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $selector = new EbayOptimalCategorySelector($pdo);
        
        // テスト用商品情報
        $testProduct = [
            'title' => 'iPhone 14 Pro 128GB Space Black 美品',
            'description' => 'Apple iPhone 14 Pro 128GB SIMフリー',
            'brand' => 'Apple',
            'condition' => 'Used',
            'yahoo_category' => '携帯電話、スマートフォン',
            'price_jpy' => 120000
        ];
        
        echo "🚀 eBay最適カテゴリー自動選択テスト\n";
        echo "=====================================\n";
        
        $result = $selector->selectOptimalCategory($testProduct);
        
        if ($result['success']) {
            $cat = $result['optimal_category'];
            echo "✅ 最適カテゴリー選択完了\n";
            echo "カテゴリーID: {$cat['category_id']}\n";
            echo "カテゴリー名: {$cat['category_name']}\n";
            echo "信頼度: {$cat['confidence']}%\n";
            echo "手数料: {$cat['fee_info']['final_value_fee_percent']}%\n";
            echo "処理時間: " . round($result['processing_time'] * 1000) . "ms\n";
            echo "判定方法: {$result['method']}\n";
        } else {
            echo "❌ カテゴリー選択失敗\n";
        }
        
    } catch (Exception $e) {
        echo "❌ エラー: " . $e->getMessage() . "\n";
    }
}
?>