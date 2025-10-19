<?php
/**
 * Amazon データ処理クラス
 * new_structure/02_scraping/amazon/AmazonDataProcessor.php
 */

require_once __DIR__ . '/AmazonApiClient.php';
require_once __DIR__ . '/../../../shared/core/Database.php';
require_once __DIR__ . '/../../../shared/core/Logger.php';

class AmazonDataProcessor {
    private $apiClient;
    private $db;
    private $logger;
    private $config;
    
    public function __construct() {
        $this->apiClient = new AmazonApiClient();
        $this->db = new Database();
        $this->logger = new Logger('AmazonDataProcessor');
        $this->config = require __DIR__ . '/../../../shared/config/amazon_api.php';
        
        $this->ensureTablesExist();
    }
    
    /**
     * 必要なテーブルの存在確認・作成
     */
    private function ensureTablesExist() {
        try {
            // amazon_research_data テーブル作成
            $this->createAmazonResearchDataTable();
            
            // amazon_price_history テーブル作成
            $this->createPriceHistoryTable();
            
            // product_cross_reference テーブル作成
            $this->createCrossReferenceTable();
            
            $this->logger->info('必要なテーブルの確認・作成完了');
            
        } catch (Exception $e) {
            $this->logger->error('テーブル作成エラー: ' . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * amazon_research_data テーブル作成
     */
    private function createAmazonResearchDataTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS amazon_research_data (
                id SERIAL PRIMARY KEY,
                asin VARCHAR(10) UNIQUE NOT NULL,
                title TEXT,
                brand VARCHAR(255),
                model VARCHAR(255),
                
                -- 価格関連
                current_price DECIMAL(10,2),
                currency_code VARCHAR(3) DEFAULT 'USD',
                price_min DECIMAL(10,2),
                price_max DECIMAL(10,2),
                price_fluctuation_count INTEGER DEFAULT 0,
                
                -- 在庫関連
                current_stock_status VARCHAR(20),
                availability_message TEXT,
                is_prime BOOLEAN DEFAULT FALSE,
                
                -- 商品詳細
                product_images JSONB,
                item_specifics JSONB,
                features JSONB,
                description TEXT,
                
                -- レビュー・評価
                reviews_count INTEGER DEFAULT 0,
                average_rating DECIMAL(3,2),
                reviews_json JSONB,
                
                -- ランキング
                sales_rank JSONB,
                
                -- 監視設定
                is_high_priority BOOLEAN DEFAULT FALSE,
                monitor_frequency VARCHAR(20) DEFAULT 'daily',
                
                -- タイムスタンプ
                last_api_check_at TIMESTAMP,
                last_price_change_at TIMESTAMP,
                last_stock_change_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ";
        
        $this->db->exec($sql);
        
        // インデックス作成
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_amazon_asin ON amazon_research_data(asin)",
            "CREATE INDEX IF NOT EXISTS idx_amazon_priority ON amazon_research_data(is_high_priority)",
            "CREATE INDEX IF NOT EXISTS idx_amazon_stock_status ON amazon_research_data(current_stock_status)",
            "CREATE INDEX IF NOT EXISTS idx_amazon_last_check ON amazon_research_data(last_api_check_at)"
        ];
        
        foreach ($indexes as $index) {
            $this->db->exec($index);
        }
    }
    
    /**
     * amazon_price_history テーブル作成
     */
    private function createPriceHistoryTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS amazon_price_history (
                id SERIAL PRIMARY KEY,
                asin VARCHAR(10) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                currency_code VARCHAR(3) DEFAULT 'USD',
                stock_status VARCHAR(20),
                change_percentage DECIMAL(5,2),
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                change_trigger VARCHAR(50),
                notes TEXT,
                
                FOREIGN KEY (asin) REFERENCES amazon_research_data(asin) ON DELETE CASCADE
            )
        ";
        
        $this->db->exec($sql);
        
        // インデックス作成
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_price_history_asin ON amazon_price_history(asin)",
            "CREATE INDEX IF NOT EXISTS idx_price_history_date ON amazon_price_history(recorded_at)"
        ];
        
        foreach ($indexes as $index) {
            $this->db->exec($index);
        }
    }
    
    /**
     * product_cross_reference テーブル作成
     */
    private function createCrossReferenceTable() {
        $sql = "
            CREATE TABLE IF NOT EXISTS product_cross_reference (
                id SERIAL PRIMARY KEY,
                yahoo_product_id INTEGER,
                amazon_asin VARCHAR(10),
                match_confidence DECIMAL(3,2),
                match_type VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (amazon_asin) REFERENCES amazon_research_data(asin) ON DELETE CASCADE
            )
        ";
        
        $this->db->exec($sql);
        
        // インデックス作成
        $indexes = [
            "CREATE INDEX IF NOT EXISTS idx_cross_ref_yahoo ON product_cross_reference(yahoo_product_id)",
            "CREATE INDEX IF NOT EXISTS idx_cross_ref_amazon ON product_cross_reference(amazon_asin)",
            "CREATE INDEX IF NOT EXISTS idx_cross_ref_confidence ON product_cross_reference(match_confidence)"
        ];
        
        foreach ($indexes as $index) {
            $this->db->exec($index);
        }
    }
    
    /**
     * ASINリストの処理
     * 
     * @param array $asins ASIN配列
     * @return array 処理結果
     */
    public function processAsinList(array $asins) {
        $results = [
            'processed' => 0,
            'inserted' => 0,
            'updated' => 0,
            'errors' => 0,
            'error_details' => []
        ];
        
        try {
            // API制限を考慮して分割処理
            $chunks = array_chunk($asins, 10); // PA-APIの制限
            
            foreach ($chunks as $chunk) {
                $this->logger->info('ASIN チャンク処理開始', ['asins' => $chunk]);
                
                try {
                    $apiData = $this->apiClient->getItemsByAsin($chunk);
                    $chunkResult = $this->processApiResponse($apiData);
                    
                    $results['processed'] += $chunkResult['processed'];
                    $results['inserted'] += $chunkResult['inserted'];
                    $results['updated'] += $chunkResult['updated'];
                    
                } catch (Exception $e) {
                    $results['errors']++;
                    $results['error_details'][] = [
                        'asins' => $chunk,
                        'error' => $e->getMessage()
                    ];
                    
                    $this->logger->error('ASIN チャンク処理エラー', [
                        'asins' => $chunk,
                        'error' => $e->getMessage()
                    ]);
                }
                
                // レート制限考慮の待機
                sleep(1);
            }
            
        } catch (Exception $e) {
            $this->logger->error('ASIN リスト処理の全体エラー: ' . $e->getMessage());
            throw $e;
        }
        
        return $results;
    }
    
    /**
     * API レスポンスの処理
     * 
     * @param array $apiData API レスポンスデータ
     * @return array 処理結果
     */
    private function processApiResponse(array $apiData) {
        $results = ['processed' => 0, 'inserted' => 0, 'updated' => 0];
        
        if (!isset($apiData['ItemsResult']['Items'])) {
            $this->logger->warning('API レスポンスに商品データがありません');
            return $results;
        }
        
        foreach ($apiData['ItemsResult']['Items'] as $item) {
            try {
                $normalizedData = $this->normalizeItemData($item);
                
                if ($this->saveOrUpdateItem($normalizedData)) {
                    $results['updated']++;
                } else {
                    $results['inserted']++;
                }
                
                $results['processed']++;
                
            } catch (Exception $e) {
                $this->logger->error('商品データ処理エラー', [
                    'asin' => $item['ASIN'] ?? 'unknown',
                    'error' => $e->getMessage()
                ]);
            }
        }
        
        return $results;
    }
    
    /**
     * 商品データの正規化
     * 
     * @param array $item API商品データ
     * @return array 正規化されたデータ
     */
    private function normalizeItemData(array $item) {
        $asin = $item['ASIN'];
        $title = $item['ItemInfo']['Title']['DisplayValue'] ?? '';
        
        // 価格情報の抽出
        $priceInfo = $this->extractPriceInfo($item);
        
        // 在庫情報の抽出
        $stockInfo = $this->extractStockInfo($item);
        
        // 画像情報の抽出
        $images = $this->extractImages($item);
        
        // 商品詳細の抽出
        $itemSpecifics = $this->extractItemSpecifics($item);
        
        // 特徴の抽出
        $features = $this->extractFeatures($item);
        
        return [
            'asin' => $asin,
            'title' => $title,
            'brand' => $itemSpecifics['brand'] ?? null,
            'model' => $itemSpecifics['model'] ?? null,
            'current_price' => $priceInfo['price'],
            'currency_code' => $priceInfo['currency'],
            'current_stock_status' => $stockInfo['status'],
            'availability_message' => $stockInfo['message'],
            'is_prime' => $stockInfo['is_prime'],
            'product_images' => json_encode($images),
            'item_specifics' => json_encode($itemSpecifics),
            'features' => json_encode($features),
            'last_api_check_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 価格情報の抽出
     * 
     * @param array $item 商品データ
     * @return array 価格情報
     */
    private function extractPriceInfo(array $item) {
        $price = null;
        $currency = 'USD';
        
        if (isset($item['Offers']['Listings'][0]['Price']['Amount'])) {
            $price = $item['Offers']['Listings'][0]['Price']['Amount'];
            $currency = $item['Offers']['Listings'][0]['Price']['Currency'] ?? 'USD';
        }
        
        return ['price' => $price, 'currency' => $currency];
    }
    
    /**
     * 在庫情報の抽出
     * 
     * @param array $item 商品データ
     * @return array 在庫情報
     */
    private function extractStockInfo(array $item) {
        $status = 'Unknown';
        $message = '';
        $isPrime = false;
        
        if (isset($item['Offers']['Listings'][0]['Availability'])) {
            $availability = $item['Offers']['Listings'][0]['Availability'];
            $status = $availability['Type'] ?? 'Unknown';
            $message = $availability['Message'] ?? '';
        }
        
        if (isset($item['Offers']['Listings'][0]['DeliveryInfo']['IsPrimeEligible'])) {
            $isPrime = $item['Offers']['Listings'][0]['DeliveryInfo']['IsPrimeEligible'];
        }
        
        return [
            'status' => $status,
            'message' => $message,
            'is_prime' => $isPrime
        ];
    }
    
    /**
     * 画像情報の抽出
     * 
     * @param array $item 商品データ
     * @return array 画像配列
     */
    private function extractImages(array $item) {
        $images = [];
        
        if (isset($item['Images']['Primary'])) {
            $primary = $item['Images']['Primary'];
            $images['primary'] = [
                'small' => $primary['Small']['URL'] ?? null,
                'medium' => $primary['Medium']['URL'] ?? null,
                'large' => $primary['Large']['URL'] ?? null
            ];
        }
        
        if (isset($item['Images']['Variants'])) {
            $images['variants'] = [];
            foreach ($item['Images']['Variants'] as $variant) {
                $images['variants'][] = [
                    'small' => $variant['Small']['URL'] ?? null,
                    'medium' => $variant['Medium']['URL'] ?? null,
                    'large' => $variant['Large']['URL'] ?? null
                ];
            }
        }
        
        return $images;
    }
    
    /**
     * 商品詳細の抽出
     * 
     * @param array $item 商品データ
     * @return array 詳細情報
     */
    private function extractItemSpecifics(array $item) {
        $specifics = [];
        
        if (isset($item['ItemInfo']['ByLineInfo']['Brand']['DisplayValue'])) {
            $specifics['brand'] = $item['ItemInfo']['ByLineInfo']['Brand']['DisplayValue'];
        }
        
        if (isset($item['ItemInfo']['ByLineInfo']['Manufacturer']['DisplayValue'])) {
            $specifics['manufacturer'] = $item['ItemInfo']['ByLineInfo']['Manufacturer']['DisplayValue'];
        }
        
        if (isset($item['ItemInfo']['ProductInfo']['Color']['DisplayValue'])) {
            $specifics['color'] = $item['ItemInfo']['ProductInfo']['Color']['DisplayValue'];
        }
        
        if (isset($item['ItemInfo']['ProductInfo']['Size']['DisplayValue'])) {
            $specifics['size'] = $item['ItemInfo']['ProductInfo']['Size']['DisplayValue'];
        }
        
        return $specifics;
    }
    
    /**
     * 特徴の抽出
     * 
     * @param array $item 商品データ
     * @return array 特徴配列
     */
    private function extractFeatures(array $item) {
        $features = [];
        
        if (isset($item['ItemInfo']['Features']['DisplayValues'])) {
            $features = $item['ItemInfo']['Features']['DisplayValues'];
        }
        
        return $features;
    }
    
    /**
     * 商品データの保存または更新
     * 
     * @param array $data 正規化されたデータ
     * @return bool 更新の場合はtrue、新規挿入の場合はfalse
     */
    private function saveOrUpdateItem(array $data) {
        $asin = $data['asin'];
        
        // 既存データの確認
        $existing = $this->db->prepare("SELECT * FROM amazon_research_data WHERE asin = ?")
                            ->execute([$asin])
                            ->fetch();
        
        if ($existing) {
            // 価格変動の検知と記録
            $this->checkPriceChange($existing, $data);
            
            // 在庫変動の検知と記録
            $this->checkStockChange($existing, $data);
            
            // データ更新
            $this->updateExistingItem($asin, $data);
            
            return true; // 更新
        } else {
            // 新規挿入
            $this->insertNewItem($data);
            
            return false; // 新規挿入
        }
    }
    
    /**
     * 価格変動チェック
     * 
     * @param array $existing 既存データ
     * @param array $newData 新データ
     */
    private function checkPriceChange(array $existing, array $newData) {
        $oldPrice = $existing['current_price'];
        $newPrice = $newData['current_price'];
        
        if ($oldPrice && $newPrice && $oldPrice != $newPrice) {
            $changePercentage = (($newPrice - $oldPrice) / $oldPrice) * 100;
            
            // 設定した閾値以上の変動の場合のみ記録
            if (abs($changePercentage) >= $this->config['monitoring']['price_threshold']) {
                $this->recordPriceChange($newData['asin'], $newPrice, $changePercentage, 'scheduled');
                
                // 変動回数を増加
                $newData['price_fluctuation_count'] = $existing['price_fluctuation_count'] + 1;
                $newData['last_price_change_at'] = date('Y-m-d H:i:s');
                
                // 最高・最低価格の更新
                $newData['price_min'] = min($existing['price_min'] ?: $newPrice, $newPrice);
                $newData['price_max'] = max($existing['price_max'] ?: $newPrice, $newPrice);
                
                $this->logger->info('価格変動検知', [
                    'asin' => $newData['asin'],
                    'old_price' => $oldPrice,
                    'new_price' => $newPrice,
                    'change_percentage' => round($changePercentage, 2)
                ]);
            }
        }
    }
    
    /**
     * 在庫変動チェック
     * 
     * @param array $existing 既存データ
     * @param array $newData 新データ
     */
    private function checkStockChange(array $existing, array $newData) {
        $oldStock = $existing['current_stock_status'];
        $newStock = $newData['current_stock_status'];
        
        if ($oldStock !== $newStock) {
            $this->recordStockChange(
                $newData['asin'], 
                $newData['current_price'], 
                $newStock, 
                "在庫状況変更: {$oldStock} → {$newStock}"
            );
            
            $newData['last_stock_change_at'] = date('Y-m-d H:i:s');
            
            $this->logger->info('在庫変動検知', [
                'asin' => $newData['asin'],
                'old_stock' => $oldStock,
                'new_stock' => $newStock
            ]);
            
            // 在庫切れアラート
            if ($oldStock === 'InStock' && $newStock === 'OutOfStock') {
                $this->sendStockOutAlert($newData['asin']);
            }
        }
    }
    
    /**
     * 価格変動記録
     * 
     * @param string $asin ASIN
     * @param float $price 新価格
     * @param float $changePercentage 変動率
     * @param string $trigger トリガー
     */
    private function recordPriceChange(string $asin, float $price, float $changePercentage, string $trigger) {
        $sql = "INSERT INTO amazon_price_history 
                (asin, price, change_percentage, change_trigger, recorded_at) 
                VALUES (?, ?, ?, ?, NOW())";
        
        $this->db->prepare($sql)->execute([$asin, $price, round($changePercentage, 2), $trigger]);
    }
    
    /**
     * 在庫変動記録
     * 
     * @param string $asin ASIN
     * @param float $price 価格
     * @param string $stockStatus 在庫状況
     * @param string $notes 備考
     */
    private function recordStockChange(string $asin, ?float $price, string $stockStatus, string $notes) {
        $sql = "INSERT INTO amazon_price_history 
                (asin, price, stock_status, change_trigger, notes, recorded_at) 
                VALUES (?, ?, ?, 'stock_change', ?, NOW())";
        
        $this->db->prepare($sql)->execute([$asin, $price ?: 0, $stockStatus, $notes]);
    }
    
    /**
     * 在庫切れアラート送信
     * 
     * @param string $asin ASIN
     */
    private function sendStockOutAlert(string $asin) {
        if ($this->config['notifications']['stock_out_alert']) {
            $this->logger->warning('在庫切れアラート', ['asin' => $asin]);
            
            // ここで実際の通知処理を実装
            // 例: メール送信、Slack通知など
        }
    }
    
    /**
     * 既存商品データの更新
     * 
     * @param string $asin ASIN
     * @param array $data データ
     */
    private function updateExistingItem(string $asin, array $data) {
        $sql = "UPDATE amazon_research_data SET 
                title = ?, 
                brand = ?, 
                model = ?, 
                current_price = ?, 
                currency_code = ?,
                current_stock_status = ?,
                availability_message = ?,
                is_prime = ?,
                product_images = ?,
                item_specifics = ?,
                features = ?,
                last_api_check_at = ?,
                updated_at = NOW()
                WHERE asin = ?";
        
        $this->db->prepare($sql)->execute([
            $data['title'],
            $data['brand'],
            $data['model'],
            $data['current_price'],
            $data['currency_code'],
            $data['current_stock_status'],
            $data['availability_message'],
            $data['is_prime'],
            $data['product_images'],
            $data['item_specifics'],
            $data['features'],
            $data['last_api_check_at'],
            $asin
        ]);
    }
    
    /**
     * 新規商品データの挿入
     * 
     * @param array $data データ
     */
    private function insertNewItem(array $data) {
        $sql = "INSERT INTO amazon_research_data 
                (asin, title, brand, model, current_price, currency_code, 
                 current_stock_status, availability_message, is_prime,
                 product_images, item_specifics, features, 
                 price_min, price_max, last_api_check_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $this->db->prepare($sql)->execute([
            $data['asin'],
            $data['title'],
            $data['brand'],
            $data['model'],
            $data['current_price'],
            $data['currency_code'],
            $data['current_stock_status'],
            $data['availability_message'],
            $data['is_prime'],
            $data['product_images'],
            $data['item_specifics'],
            $data['features'],
            $data['current_price'], // 初期最低価格
            $data['current_price'], // 初期最高価格
            $data['last_api_check_at']
        ]);
    }
    
    /**
     * キーワード検索とデータ保存
     * 
     * @param string $keywords 検索キーワード
     * @param array $options 検索オプション
     * @return array 処理結果
     */
    public function searchAndSaveProducts(string $keywords, array $options = []) {
        try {
            $searchResults = $this->apiClient->searchItems($keywords, $options);
            
            if (isset($searchResults['SearchResult']['Items'])) {
                return $this->processApiResponse(['ItemsResult' => ['Items' => $searchResults['SearchResult']['Items']]]);
            }
            
            return ['processed' => 0, 'inserted' => 0, 'updated' => 0];
            
        } catch (Exception $e) {
            $this->logger->error('検索・保存処理エラー: ' . $e->getMessage());
            throw $e;
        }
    }
}
?>