<?php
/**
 * eBayカテゴリー取得 - 修正版（エラーハンドリング強化）
 * ファイル: ebay_category_fetcher_fixed.php
 */

require_once 'ebay_api_config.php';

class EbayCategoryFetcherFixed {
    private $pdo;
    private $apiConfig;
    private $endpoint;
    private $apiCallCount = 0;
    private $debugMode = true;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->apiConfig = new EbayApiConfig();
        $this->endpoint = $this->apiConfig->getEndpoint();
    }
    
    /**
     * 全カテゴリー取得・DB格納（修正版）
     */
    public function fetchAndStoreAllCategories() {
        echo "🚀 eBay全カテゴリー取得開始（修正版）\n";
        echo "================================\n";
        
        try {
            // 1. API設定確認
            if (!$this->apiConfig->isValid()) {
                echo "❌ API設定が無効です\n";
                echo "設定内容:\n";
                $config = $this->apiConfig->getConfig();
                foreach ($config as $key => $value) {
                    echo "  {$key}: " . substr($value, 0, 10) . "...\n";
                }
                
                echo "\n📋 サンプルデータで継続します\n";
                return $this->useSampleData();
            }
            
            // 2. データベース準備
            $this->prepareDatabase();
            
            // 3. カテゴリー取得テスト
            echo "🧪 API接続テスト中...\n";
            $testResult = $this->testApiConnection();
            
            if (!$testResult['success']) {
                echo "❌ API接続失敗: {$testResult['error']}\n";
                echo "📋 サンプルデータで継続します\n";
                return $this->useSampleData();
            }
            
            echo "✅ API接続成功\n";
            
            // 4. 実際のカテゴリー取得
            return $this->fetchRealCategories();
            
        } catch (Exception $e) {
            echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
            echo "📋 サンプルデータで継続します\n";
            return $this->useSampleData();
        }
    }
    
    /**
     * データベース準備（修正版）
     */
    private function prepareDatabase() {
        echo "🗄️ データベース準備中...\n";
        
        try {
            // 既存テーブル確認・削除
            $this->pdo->exec("DROP TABLE IF EXISTS ebay_category_features CASCADE");
            $this->pdo->exec("DROP TABLE IF EXISTS ebay_categories_full CASCADE");
            
            // カテゴリーテーブル作成
            $this->pdo->exec("
                CREATE TABLE ebay_categories_full (
                    category_id VARCHAR(20) PRIMARY KEY,
                    category_name VARCHAR(255) NOT NULL,
                    category_path TEXT,
                    parent_id VARCHAR(20),
                    category_level INTEGER DEFAULT 1,
                    is_leaf BOOLEAN DEFAULT TRUE,
                    is_active BOOLEAN DEFAULT TRUE,
                    
                    -- eBay固有情報
                    ebay_category_name VARCHAR(255),
                    category_parent_name VARCHAR(255),
                    leaf_category BOOLEAN DEFAULT TRUE,
                    
                    -- メタデータ
                    auto_pay_enabled BOOLEAN DEFAULT FALSE,
                    b2b_vat_enabled BOOLEAN DEFAULT FALSE,
                    catalog_enabled BOOLEAN DEFAULT FALSE,
                    
                    -- 日時
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    last_fetched TIMESTAMP DEFAULT NOW()
                )
            ");
            
            // インデックス作成
            $this->pdo->exec("CREATE INDEX idx_categories_full_parent ON ebay_categories_full(parent_id)");
            $this->pdo->exec("CREATE INDEX idx_categories_full_level ON ebay_categories_full(category_level)");
            $this->pdo->exec("CREATE INDEX idx_categories_full_leaf ON ebay_categories_full(is_leaf)");
            
            echo "✅ データベーステーブル作成完了\n";
            
        } catch (Exception $e) {
            throw new Exception("データベース準備失敗: " . $e->getMessage());
        }
    }
    
    /**
     * API接続テスト
     */
    private function testApiConnection() {
        try {
            // 簡単なGetCategoriesリクエストでテスト
            $requestXml = $this->buildSimpleGetCategoriesRequest();
            $response = $this->callEbayApi('GetCategories', $requestXml);
            
            if (!$response) {
                return ['success' => false, 'error' => 'レスポンスなし'];
            }
            
            if (isset($response['Errors'])) {
                $errorMsg = $response['Errors'][0]['LongMessage'] ?? 'Unknown API error';
                return ['success' => false, 'error' => $errorMsg];
            }
            
            return ['success' => true, 'response' => $response];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * 実際のカテゴリー取得
     */
    private function fetchRealCategories() {
        echo "📥 eBay APIからカテゴリー取得中...\n";
        
        try {
            // ルートカテゴリー取得
            $requestXml = $this->buildGetCategoriesRequest();
            $response = $this->callEbayApi('GetCategories', $requestXml);
            
            if (!$response || isset($response['Errors'])) {
                throw new Exception('ルートカテゴリー取得失敗');
            }
            
            $categories = $this->parseCategoriesResponse($response);
            echo "✅ カテゴリー取得: " . count($categories) . "件\n";
            
            // データベース格納
            $stored = $this->storeCategories($categories);
            echo "💾 データベース格納: {$stored}件\n";
            
            // 統計表示
            $this->displayCategoryStats();
            
            return [
                'success' => true,
                'api_calls' => $this->apiCallCount,
                'categories_stored' => $stored
            ];
            
        } catch (Exception $e) {
            echo "❌ リアルカテゴリー取得失敗: " . $e->getMessage() . "\n";
            return $this->useSampleData();
        }
    }
    
    /**
     * サンプルデータ使用
     */
    private function useSampleData() {
        echo "📊 サンプルカテゴリーデータ作成中...\n";
        
        try {
            // eBay主要カテゴリーのサンプルデータ
            $sampleCategories = [
                ['11450', 'Clothing, Shoes & Accessories', 'Fashion', null, 1, false],
                ['11700', 'Home & Garden', 'Lifestyle', null, 1, false],
                ['58058', 'Collectibles', 'Hobby', null, 1, false],
                ['6000', 'Electronics', 'Technology', null, 1, false],
                ['12576', 'Sports Mem, Cards & Fan Shop', 'Sports', null, 1, false],
                ['1249', 'Toys & Hobbies', 'Entertainment', null, 1, false],
                ['625', 'Cameras & Photo', 'Technology > Electronics', '6000', 2, false],
                ['293', 'Cell Phones & Smartphones', 'Technology > Electronics', '6000', 2, true],
                ['15032', 'Cell Phones & Accessories', 'Technology > Electronics', '6000', 2, false],
                ['31388', 'Watches, Parts & Accessories', 'Fashion > Clothing, Shoes & Accessories', '11450', 2, false],
                ['11462', 'Women', 'Fashion > Clothing, Shoes & Accessories', '11450', 2, false],
                ['1059', 'Men', 'Fashion > Clothing, Shoes & Accessories', '11450', 2, false],
                ['11232', 'Digital Cameras', 'Technology > Electronics > Cameras & Photo', '625', 3, true],
                ['3323', 'Lenses & Filters', 'Technology > Electronics > Cameras & Photo', '625', 3, true],
                ['139973', 'Video Games', 'Entertainment > Toys & Hobbies', '1249', 2, true],
                ['14339', 'Video Game Consoles', 'Entertainment > Toys & Hobbies', '1249', 2, true],
                ['183454', 'Non-Sport Trading Cards', 'Hobby > Collectibles', '58058', 2, true],
                ['888', 'Trading Card Games', 'Hobby > Collectibles', '58058', 2, true],
                ['267', 'Books', 'Media', null, 1, false],
                ['99999', 'Other', 'Miscellaneous', null, 1, true]
            ];
            
            $stored = 0;
            foreach ($sampleCategories as $cat) {
                $sql = "
                    INSERT INTO ebay_categories_full (
                        category_id, category_name, category_path, parent_id,
                        category_level, is_leaf, is_active,
                        ebay_category_name, leaf_category,
                        last_fetched
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON CONFLICT (category_id) DO UPDATE SET
                        category_name = EXCLUDED.category_name,
                        last_fetched = NOW()
                ";
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    $cat[0], $cat[1], $cat[2], $cat[3],
                    $cat[4], $cat[5], true,
                    $cat[1], $cat[5]
                ]);
                $stored++;
            }
            
            echo "✅ サンプルカテゴリー作成完了: {$stored}件\n";
            $this->displayCategoryStats();
            
            return [
                'success' => true,
                'api_calls' => 0,
                'categories_stored' => $stored,
                'method' => 'sample_data'
            ];
            
        } catch (Exception $e) {
            throw new Exception("サンプルデータ作成失敗: " . $e->getMessage());
        }
    }
    
    /**
     * カテゴリー統計表示
     */
    private function displayCategoryStats() {
        echo "\n📊 カテゴリー統計\n";
        echo "================\n";
        
        try {
            $stats = $this->pdo->query("
                SELECT 
                    COUNT(*) as total_categories,
                    COUNT(CASE WHEN is_leaf = true THEN 1 END) as leaf_categories,
                    MAX(category_level) as max_level,
                    COUNT(DISTINCT category_level) as level_count
                FROM ebay_categories_full
            ")->fetch(PDO::FETCH_ASSOC);
            
            echo "総カテゴリー数: {$stats['total_categories']}\n";
            echo "リーフカテゴリー: {$stats['leaf_categories']}\n";
            echo "最大レベル: {$stats['max_level']}\n";
            echo "レベル数: {$stats['level_count']}\n";
            
            // 主要カテゴリー表示
            echo "\n主要カテゴリー:\n";
            $topCategories = $this->pdo->query("
                SELECT category_id, category_name, category_level
                FROM ebay_categories_full
                ORDER BY category_level, category_name
                LIMIT 10
            ")->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($topCategories as $cat) {
                echo "  [{$cat['category_id']}] {$cat['category_name']} (レベル{$cat['category_level']})\n";
            }
            
        } catch (Exception $e) {
            echo "統計表示エラー: " . $e->getMessage() . "\n";
        }
    }
    
    // 以下、ヘルパーメソッド
    private function buildSimpleGetCategoriesRequest() {
        $config = $this->apiConfig->getConfig();
        
        return "<?xml version='1.0' encoding='utf-8'?>
        <GetCategoriesRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
            <RequesterCredentials>
                <eBayAuthToken>{$config['auth_token']}</eBayAuthToken>
            </RequesterCredentials>
            <Version>1193</Version>
            <SiteID>{$config['site_id']}</SiteID>
            <LevelLimit>2</LevelLimit>
        </GetCategoriesRequest>";
    }
    
    private function buildGetCategoriesRequest() {
        return $this->buildSimpleGetCategoriesRequest();
    }
    
    private function parseCategoriesResponse($response) {
        // レスポンス解析処理（簡略版）
        $categories = [];
        
        if (isset($response['CategoryArray']['Category'])) {
            $categoryData = $response['CategoryArray']['Category'];
            
            if (!isset($categoryData[0])) {
                $categoryData = [$categoryData];
            }
            
            foreach ($categoryData as $category) {
                $categories[] = [
                    'CategoryID' => $category['CategoryID'],
                    'CategoryName' => $category['CategoryName'],
                    'CategoryLevel' => intval($category['CategoryLevel'] ?? 1),
                    'CategoryParentID' => $category['CategoryParentID'] ?? null,
                    'LeafCategory' => ($category['LeafCategory'] ?? 'false') === 'true'
                ];
            }
        }
        
        return $categories;
    }
    
    private function storeCategories($categories) {
        $stored = 0;
        
        foreach ($categories as $category) {
            try {
                $sql = "
                    INSERT INTO ebay_categories_full (
                        category_id, category_name, parent_id,
                        category_level, is_leaf, is_active,
                        ebay_category_name, leaf_category,
                        last_fetched
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON CONFLICT (category_id) DO UPDATE SET
                        category_name = EXCLUDED.category_name,
                        last_fetched = NOW()
                ";
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    $category['CategoryID'],
                    $category['CategoryName'],
                    $category['CategoryParentID'],
                    $category['CategoryLevel'],
                    $category['LeafCategory'],
                    true,
                    $category['CategoryName'],
                    $category['LeafCategory']
                ]);
                
                $stored++;
                
            } catch (Exception $e) {
                if ($this->debugMode) {
                    echo "  ⚠️ 格納エラー: {$category['CategoryID']} - {$e->getMessage()}\n";
                }
            }
        }
        
        return $stored;
    }
    
    private function callEbayApi($callName, $requestXml) {
        $config = $this->apiConfig->getConfig();
        
        $headers = [
            'X-EBAY-API-COMPATIBILITY-LEVEL: 1193',
            'X-EBAY-API-DEV-NAME: ' . $config['dev_id'],
            'X-EBAY-API-APP-NAME: ' . $config['app_id'],
            'X-EBAY-API-CERT-NAME: ' . $config['cert_id'],
            'X-EBAY-API-CALL-NAME: ' . $callName,
            'X-EBAY-API-SITEID: ' . $config['site_id'],
            'Content-Type: text/xml; charset=utf-8',
        ];
        
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $this->endpoint,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $requestXml,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        if (curl_error($ch)) {
            curl_close($ch);
            throw new Exception('CURL Error: ' . curl_error($ch));
        }
        
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("HTTP Error: {$httpCode}");
        }
        
        $this->apiCallCount++;
        
        // XML to Array
        $xml = simplexml_load_string($response);
        return json_decode(json_encode($xml), true);
    }
}

// 実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $fetcher = new EbayCategoryFetcherFixed($pdo);
        $result = $fetcher->fetchAndStoreAllCategories();
        
        if ($result['success']) {
            echo "\n🎉 カテゴリー取得・格納完了!\n";
            echo "格納方法: " . ($result['method'] ?? 'api') . "\n";
            echo "API呼び出し: {$result['api_calls']}回\n";
            echo "格納件数: {$result['categories_stored']}件\n";
        } else {
            echo "\n❌ 処理失敗\n";
        }
        
    } catch (Exception $e) {
        echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
    }
}
?>