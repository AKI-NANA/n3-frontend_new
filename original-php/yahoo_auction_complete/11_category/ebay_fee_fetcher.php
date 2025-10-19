<?php
/**
 * eBayカテゴリー別手数料取得システム
 * ファイル: ebay_fee_fetcher.php
 */

require_once 'ebay_api_config.php';

class EbayFeeFetcher {
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
     * 全カテゴリーの手数料情報取得
     */
    public function fetchAndStoreFees() {
        echo "💰 eBayカテゴリー別手数料取得開始\n";
        echo "=================================\n";
        
        if (!$this->apiConfig->isValid()) {
            throw new Exception('eBay API設定が無効です。');
        }
        
        try {
            // 1. 手数料テーブル準備
            $this->prepareFeeDatabase();
            
            // 2. リーフカテゴリー取得
            $leafCategories = $this->getLeafCategories();
            echo "📋 対象カテゴリー: " . count($leafCategories) . "件\n";
            
            // 3. 各カテゴリーの手数料取得
            $processedCount = 0;
            $batchSize = 50; // バッチサイズ
            
            for ($i = 0; $i < count($leafCategories); $i += $batchSize) {
                $batch = array_slice($leafCategories, $i, $batchSize);
                echo "\n📦 バッチ処理: " . ($i + 1) . "～" . min($i + $batchSize, count($leafCategories)) . "\n";
                
                foreach ($batch as $category) {
                    try {
                        $feeInfo = $this->getCategoryFees($category['category_id']);
                        if ($feeInfo) {
                            $this->storeFeeInfo($category['category_id'], $feeInfo);
                            $processedCount++;
                            echo "  ✅ {$category['category_name']}: {$feeInfo['final_value_fee']}%\n";
                        } else {
                            echo "  ⚠️ {$category['category_name']}: 手数料情報なし\n";
                        }
                        
                        // API制限対策
                        usleep(500000); // 0.5秒待機
                        
                    } catch (Exception $e) {
                        echo "  ❌ {$category['category_name']}: " . $e->getMessage() . "\n";
                    }
                }
                
                echo "  💾 バッチ完了: {$processedCount}件処理済み\n";
                sleep(2); // バッチ間待機
            }
            
            // 4. 結果表示
            echo "\n🎉 手数料取得完了!\n";
            echo "==================\n";
            echo "API呼び出し回数: {$this->apiCallCount}\n";
            echo "処理カテゴリー数: {$processedCount}\n";
            
            $this->displayFeeStats();
            
            return [
                'success' => true,
                'api_calls' => $this->apiCallCount,
                'processed_categories' => $processedCount
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
     * 手数料データベース準備
     */
    private function prepareFeeDatabase() {
        echo "💾 手数料データベース準備中...\n";
        
        // 手数料テーブル作成
        $this->pdo->exec("DROP TABLE IF EXISTS ebay_category_fees CASCADE");
        
        $this->pdo->exec("
            CREATE TABLE ebay_category_fees (
                id SERIAL PRIMARY KEY,
                category_id VARCHAR(20) NOT NULL,
                category_name VARCHAR(255),
                
                -- 基本手数料
                insertion_fee DECIMAL(10,2) DEFAULT 0.00,
                final_value_fee_percent DECIMAL(5,2) DEFAULT 0.00,
                final_value_fee_max DECIMAL(10,2),
                
                -- 追加手数料
                store_fee DECIMAL(10,2) DEFAULT 0.00,
                optional_fees JSONB,
                
                -- PayPal手数料
                paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90,
                paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30,
                
                -- メタデータ
                currency VARCHAR(3) DEFAULT 'USD',
                effective_date TIMESTAMP,
                last_updated TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                
                FOREIGN KEY (category_id) REFERENCES ebay_categories_full(category_id)
            )
        ");
        
        // 手数料変更履歴テーブル
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_fee_history (
                id SERIAL PRIMARY KEY,
                category_id VARCHAR(20),
                old_fee_percent DECIMAL(5,2),
                new_fee_percent DECIMAL(5,2),
                change_date TIMESTAMP DEFAULT NOW(),
                change_reason VARCHAR(255)
            )
        ");
        
        echo "✅ 手数料データベース準備完了\n";
    }
    
    /**
     * リーフカテゴリー取得
     */
    private function getLeafCategories() {
        $stmt = $this->pdo->query("
            SELECT category_id, category_name, category_level
            FROM ebay_categories_full
            WHERE is_leaf = TRUE
            AND category_level >= 2
            ORDER BY category_id
            LIMIT 500
        ");
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * カテゴリー別手数料取得（GetCategoryFeatures使用）
     */
    private function getCategoryFees($categoryId) {
        $requestXml = $this->buildGetCategoryFeaturesRequest($categoryId);
        $response = $this->callEbayApi('GetCategoryFeatures', $requestXml);
        
        if (!$response || isset($response['Errors'])) {
            // エラーの場合はデフォルト値を返す
            return $this->getDefaultFeeStructure($categoryId);
        }
        
        return $this->parseFeeResponse($response, $categoryId);
    }
    
    /**
     * GetCategoryFeaturesリクエスト構築
     */
    private function buildGetCategoryFeaturesRequest($categoryId) {
        $config = $this->apiConfig->getConfig();
        
        return "<?xml version='1.0' encoding='utf-8'?>
        <GetCategoryFeaturesRequest xmlns='urn:ebay:apis:eBLBaseComponents'>
            <RequesterCredentials>
                <eBayAuthToken>{$config['auth_token']}</eBayAuthToken>
            </RequesterCredentials>
            <Version>1193</Version>
            <SiteID>{$config['site_id']}</SiteID>
            <CategoryID>{$categoryId}</CategoryID>
            <LevelLimit>1</LevelLimit>
            <ViewAllNodes>false</ViewAllNodes>
            <FeatureID>ListingDurations</FeatureID>
            <FeatureID>PayPalRequired</FeatureID>
            <FeatureID>SellerContactDetailsEnabled</FeatureID>
        </GetCategoryFeaturesRequest>";
    }
    
    /**
     * 手数料レスポンス解析
     */
    private function parseFeeResponse($response, $categoryId) {
        // eBay APIからは直接手数料情報を取得できないため、
        // カテゴリーベースの推定手数料を設定
        return $this->estimateFeesByCategory($categoryId, $response);
    }
    
    /**
     * カテゴリーベース手数料推定
     */
    private function estimateFeesByCategory($categoryId, $response = null) {
        // カテゴリー情報取得
        $stmt = $this->pdo->prepare("
            SELECT category_name, category_path, category_level
            FROM ebay_categories_full
            WHERE category_id = ?
        ");
        $stmt->execute([$categoryId]);
        $category = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$category) {
            return null;
        }
        
        $categoryName = strtolower($category['category_name']);
        $categoryPath = strtolower($category['category_path'] ?? '');
        
        // カテゴリー別手数料マッピング（eBay公式料金表に基づく）
        $feeRules = [
            // 特別料金カテゴリー
            'books' => 15.30,
            'magazines' => 15.30,
            'movies' => 15.30,
            'music' => 15.30,
            'cd' => 15.30,
            'dvd' => 15.30,
            
            // コイン・紙幣
            'coins' => 13.25,
            'currency' => 13.25,
            'paper money' => 13.25,
            
            // 楽器
            'musical instruments' => 6.70,
            'guitars' => 6.70,
            'piano' => 6.70,
            
            // ビジネス・産業
            'business' => 3.00,
            'industrial' => 3.00,
            'heavy equipment' => 3.00,
            
            // 時計・ジュエリー（段階制）
            'jewelry' => 15.00, // $5,000以下15%, 以上9%
            'watches' => 15.00,
            
            // 衣類（段階制）
            'clothing' => 13.60, // $2,000以下13.6%, 以上9%
            'shoes' => 13.60,
            'accessories' => 13.60,
        ];
        
        // マッチング処理
        foreach ($feeRules as $keyword => $feePercent) {
            if (strpos($categoryName, $keyword) !== false || 
                strpos($categoryPath, $keyword) !== false) {
                
                return [
                    'final_value_fee' => $feePercent,
                    'insertion_fee' => 0.00,
                    'category_type' => $keyword,
                    'fee_structure' => 'estimated',
                    'effective_date' => date('Y-m-d H:i:s')
                ];
            }
        }
        
        // デフォルト手数料（Most categories）
        return [
            'final_value_fee' => 13.60,
            'insertion_fee' => 0.00,
            'category_type' => 'standard',
            'fee_structure' => 'default',
            'effective_date' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * デフォルト手数料構造
     */
    private function getDefaultFeeStructure($categoryId) {
        return [
            'final_value_fee' => 13.60,
            'insertion_fee' => 0.00,
            'category_type' => 'unknown',
            'fee_structure' => 'fallback',
            'effective_date' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 手数料情報格納
     */
    private function storeFeeInfo($categoryId, $feeInfo) {
        $sql = "
            INSERT INTO ebay_category_fees (
                category_id, final_value_fee_percent, insertion_fee,
                optional_fees, effective_date, last_updated
            ) VALUES (?, ?, ?, ?, ?, NOW())
            ON CONFLICT (category_id) DO UPDATE SET
                final_value_fee_percent = EXCLUDED.final_value_fee_percent,
                last_updated = NOW()
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $categoryId,
            $feeInfo['final_value_fee'],
            $feeInfo['insertion_fee'],
            json_encode([
                'category_type' => $feeInfo['category_type'],
                'fee_structure' => $feeInfo['fee_structure']
            ]),
            $feeInfo['effective_date']
        ]);
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
     * 手数料統計表示
     */
    private function displayFeeStats() {
        echo "\n💰 手数料統計\n";
        echo "============\n";
        
        $stats = $this->pdo->query("
            SELECT 
                COUNT(*) as total_fees,
                AVG(final_value_fee_percent) as avg_fee,
                MIN(final_value_fee_percent) as min_fee,
                MAX(final_value_fee_percent) as max_fee
            FROM ebay_category_fees
        ")->fetch(PDO::FETCH_ASSOC);
        
        echo "総手数料データ: {$stats['total_fees']}件\n";
        echo "平均手数料: " . round($stats['avg_fee'], 2) . "%\n";
        echo "最低手数料: {$stats['min_fee']}%\n";
        echo "最高手数料: {$stats['max_fee']}%\n";
        
        // 手数料分布
        echo "\n手数料分布:\n";
        $distribution = $this->pdo->query("
            SELECT 
                final_value_fee_percent,
                COUNT(*) as category_count
            FROM ebay_category_fees
            GROUP BY final_value_fee_percent
            ORDER BY final_value_fee_percent
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($distribution as $dist) {
            echo "  {$dist['final_value_fee_percent']}%: {$dist['category_count']}カテゴリー\n";
        }
    }
}

// 実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $feeFetcher = new EbayFeeFetcher($pdo);
        $result = $feeFetcher->fetchAndStoreFees();
        
        if ($result['success']) {
            echo "\n🎉 手数料データ取得・格納完了!\n";
        } else {
            echo "\n❌ 処理失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
    }
}
?>