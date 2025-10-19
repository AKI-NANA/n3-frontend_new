<?php
/**
 * eBay全カテゴリー取得・DB格納システム
 * ファイル: ebay_category_fetcher.php
 */

require_once 'ebay_api_config.php';

class EbayCategoryFetcher {
    private $pdo;
    private $apiConfig;
    private $endpoint;
    private $apiCallCount = 0;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->apiConfig = new EbayApiConfig();
        $this->endpoint = $this->apiConfig->getEndpoint();
    }
    
    /**
     * 全カテゴリー取得・DB格納（メイン処理）
     */
    public function fetchAndStoreAllCategories() {
        echo "🚀 eBay全カテゴリー取得開始\n";
        echo "==========================\n";
        
        if (!$this->apiConfig->isValid()) {
            throw new Exception('eBay API設定が無効です。設定を確認してください。');
        }
        
        try {
            // 1. データベース準備
            $this->prepareDatabase();
            
            // 2. ルートカテゴリー取得
            echo "📥 ルートカテゴリー取得中...\n";
            $rootCategories = $this->getRootCategories();
            echo "✅ ルートカテゴリー: " . count($rootCategories) . "件取得\n";
            
            // 3. 各カテゴリーの詳細取得
            $totalCategories = 0;
            $processedCategories = 0;
            
            foreach ($rootCategories as $rootCategory) {
                echo "\n📂 カテゴリーツリー取得: {$rootCategory['CategoryName']}\n";
                
                $subCategories = $this->getCategoryTree($rootCategory['CategoryID']);
                $stored = $this->storeCategories($subCategories, $rootCategory);
                
                $processedCategories += $stored;
                echo "  💾 格納: {$stored}件\n";
                
                // API制限対策（1秒待機）
                sleep(1);
            }
            
            // 4. 結果表示
            echo "\n🎉 全カテゴリー取得完了!\n";
            echo "========================\n";
            echo "API呼び出し回数: {$this->apiCallCount}\n";
            echo "格納カテゴリー数: {$processedCategories}\n";
            
            // 5. カテゴリー統計
            $this->displayCategoryStats();
            
            return [
                'success' => true,
                'api_calls' => $this->apiCallCount,
                'categories_stored' => $processedCategories
            ];
            
        } catch (Exception $e) {
            echo "❌ エラー: " . $e->getMessage() . "\n";
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'api_calls' => $this->apiCallCount
            ];
        }
    }
    
    /**
     * データベース準備
     */
    private function prepareDatabase() {
        echo "🗄️ データベース準備中...\n";
        
        // テーブル再作成
        $this->pdo->exec("DROP TABLE IF EXISTS ebay_categories_full CASCADE");
        
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
                category_tree_id VARCHAR(20),
                
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
        
        // カテゴリー固有情報テーブル
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_category_features (
                id SERIAL PRIMARY KEY,
                category_id VARCHAR(20) NOT NULL,
                feature_name VARCHAR(100),
                feature_value TEXT,
                is_enabled BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                
                FOREIGN KEY (category_id) REFERENCES ebay_categories_full(category_id) ON DELETE CASCADE
            )
        ");
        
        echo "✅ データベース準備完了\n";
    }
    
    /**
     * ルートカテゴリー取得
     */
    private function getRootCategories() {
        $requestXml = $this->buildGetCategoriesRequest();
        $response = $this->callEbayApi('GetCategories', $requestXml);
        
        if (!$response || isset($response['Errors'])) {
            throw new Exception('ルートカテゴリー取得失敗: ' . ($response['Errors'][0]['LongMessage'] ?? 'Unknown error'));
        }
        
        return $this->parseCategoriesResponse($response);
    }
    
    /**
     * カテゴリーツリー取得
     */
    private function getCategoryTree($categoryId) {
        $requestXml = $this->buildGetCategoriesRequest($categoryId, true);
        $response = $this->callEbayApi('GetCategories', $requestXml);
        
        if (!$response || isset($response['Errors'])) {
            echo "  ⚠️ カテゴリーツリー取得失敗: {$categoryId}\n";
            return [];
        }
        
        return $this->parseCategoriesResponse($response, true);
    }
    
    /**
     * GetCategoriesリクエスト構築
     */
    private function buildGetCategoriesRequest($categoryParent = null, $detailed = false) {
        $config = $this->apiConfig->getConfig();
        
        $categoryParentXml = $categoryParent ? "<CategoryParent>{$categoryParent}</CategoryParent>" : '';
        $detailLevelXml = $detailed ? '<DetailLevel>ReturnAll</DetailLevel>' : '';
        
        return "<?xml version='1.0' encoding='utf-8'?>
        <GetCategoriesRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
            <RequesterCredentials>
                <eBayAuthToken>{$config['auth_token']}</eBayAuthToken>
            </RequesterCredentials>
            <Version>1193</Version>
            <SiteID>{$config['site_id']}</SiteID>
            {$categoryParentXml}
            {$detailLevelXml}
            <ViewAllNodes>true</ViewAllNodes>
            <LevelLimit>6</LevelLimit>
        </GetCategoriesRequest>";
    }
    
    /**
     * eBay APIレスポンス解析
     */
    private function parseCategoriesResponse($response, $detailed = false) {
        $categories = [];
        
        if (!isset($response['CategoryArray']['Category'])) {
            return $categories;
        }
        
        $categoryData = $response['CategoryArray']['Category'];
        
        // 単一カテゴリーの場合は配列に変換
        if (!isset($categoryData[0])) {
            $categoryData = [$categoryData];
        }
        
        foreach ($categoryData as $category) {
            $categoryInfo = [
                'CategoryID' => $category['CategoryID'],
                'CategoryName' => $category['CategoryName'],
                'CategoryLevel' => intval($category['CategoryLevel'] ?? 1),
                'CategoryParentID' => $category['CategoryParentID'][0] ?? null,
                'LeafCategory' => ($category['LeafCategory'] ?? 'false') === 'true',
                'AutoPayEnabled' => ($category['AutoPayEnabled'] ?? 'false') === 'true',
                'B2BVATEnabled' => ($category['B2BVATEnabled'] ?? 'false') === 'true',
                'CatalogEnabled' => ($category['CatalogEnabled'] ?? 'false') === 'true'
            ];
            
            // カテゴリーパス構築
            if (isset($category['CategoryParentName'])) {
                $categoryInfo['CategoryPath'] = is_array($category['CategoryParentName']) 
                    ? implode(' > ', $category['CategoryParentName']) . ' > ' . $category['CategoryName']
                    : $category['CategoryParentName'] . ' > ' . $category['CategoryName'];
            } else {
                $categoryInfo['CategoryPath'] = $category['CategoryName'];
            }
            
            $categories[] = $categoryInfo;
        }
        
        return $categories;
    }
    
    /**
     * カテゴリーデータベース格納
     */
    private function storeCategories($categories, $parentInfo = null) {
        $stored = 0;
        
        foreach ($categories as $category) {
            try {
                $sql = "
                    INSERT INTO ebay_categories_full (
                        category_id, category_name, category_path, parent_id,
                        category_level, is_leaf, is_active,
                        ebay_category_name, leaf_category,
                        auto_pay_enabled, b2b_vat_enabled, catalog_enabled,
                        last_fetched
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                    ON CONFLICT (category_id) DO UPDATE SET
                        category_name = EXCLUDED.category_name,
                        category_path = EXCLUDED.category_path,
                        last_fetched = NOW()
                ";
                
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([
                    $category['CategoryID'],
                    $category['CategoryName'],
                    $category['CategoryPath'],
                    $category['CategoryParentID'],
                    $category['CategoryLevel'],
                    $category['LeafCategory'],
                    true,
                    $category['CategoryName'],
                    $category['LeafCategory'],
                    $category['AutoPayEnabled'],
                    $category['B2BVATEnabled'],
                    $category['CatalogEnabled']
                ]);
                
                $stored++;
                
            } catch (Exception $e) {
                echo "  ⚠️ 格納エラー: {$category['CategoryID']} - {$e->getMessage()}\n";
            }
        }
        
        return $stored;
    }
    
    /**
     * eBay API呼び出し
     */
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
            throw new Exception("eBay API HTTP Error: {$httpCode}");
        }
        
        $this->apiCallCount++;
        
        // XML to Array
        $xml = simplexml_load_string($response);
        return json_decode(json_encode($xml), true);
    }
    
    /**
     * カテゴリー統計表示
     */
    private function displayCategoryStats() {
        echo "\n📊 カテゴリー統計\n";
        echo "================\n";
        
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
        
        // レベル別統計
        echo "\nレベル別統計:\n";
        $levelStats = $this->pdo->query("
            SELECT category_level, COUNT(*) as count
            FROM ebay_categories_full
            GROUP BY category_level
            ORDER BY category_level
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($levelStats as $level) {
            echo "  レベル {$level['category_level']}: {$level['count']}件\n";
        }
        
        // 主要カテゴリー表示
        echo "\n主要カテゴリー（レベル1）:\n";
        $topCategories = $this->pdo->query("
            SELECT category_id, category_name
            FROM ebay_categories_full
            WHERE category_level = 1
            ORDER BY category_name
            LIMIT 10
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($topCategories as $cat) {
            echo "  {$cat['category_id']}: {$cat['category_name']}\n";
        }
    }
}

// 実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $fetcher = new EbayCategoryFetcher($pdo);
        $result = $fetcher->fetchAndStoreAllCategories();
        
        if ($result['success']) {
            echo "\n🎉 全カテゴリー取得・格納完了!\n";
        } else {
            echo "\n❌ 処理失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
    }
}
?>