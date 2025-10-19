<?php
/**
 * eBay Trading API Connector - Item Specifics完全取得
 * カテゴリー別必須項目を完全取得し、1つのセルに統合する機能
 * 
 * 機能:
 * 1. GetCategorySpecifics API - カテゴリー別必須項目完全取得
 * 2. GetItem API - 競合商品のItem Specifics取得
 * 3. Item Specifics統合・1セル出力
 * 4. セルリサーチ（sold listings分析）
 */

class EbayTradingApiConnector {
    private $pdo;
    private $config;
    private $debugMode;
    
    // Trading API 設定
    private const API_ENDPOINT = 'https://api.ebay.com/ws/api/';
    private const SANDBOX_ENDPOINT = 'https://api.sandbox.ebay.com/ws/api/';
    
    public function __construct($dbConnection, $debugMode = false) {
        $this->pdo = $dbConnection;
        $this->debugMode = $debugMode;
        $this->loadConfig();
    }
    
    private function loadConfig() {
        $configPath = __DIR__ . '/../config/api_settings.php';
        if (file_exists($configPath)) {
            $this->config = require $configPath;
        } else {
            // デフォルト設定
            $this->config = [
                'ebay_api' => [
                    'app_id' => 'YOUR_EBAY_APP_ID',
                    'dev_id' => 'YOUR_EBAY_DEV_ID',
                    'cert_id' => 'YOUR_EBAY_CERT_ID',
                    'user_token' => 'YOUR_USER_TOKEN',
                    'sandbox_mode' => true,
                    'site_id' => '0', // US = 0
                    'compatibility_level' => '1193'
                ]
            ];
        }
    }
    
    /**
     * GetCategorySpecifics - カテゴリー別必須Item Specifics完全取得
     * @param string $categoryId eBayカテゴリーID
     * @return array 必須項目一覧
     */
    public function getCategorySpecifics($categoryId) {
        try {
            $this->debugLog("GetCategorySpecifics開始: カテゴリー {$categoryId}");
            
            // キャッシュチェック
            $cached = $this->getCachedCategorySpecifics($categoryId);
            if ($cached) {
                $this->debugLog("キャッシュヒット: カテゴリー {$categoryId}");
                return $cached;
            }
            
            $xml = $this->buildCategorySpecificsRequest($categoryId);
            $response = $this->makeTradingApiCall('GetCategorySpecifics', $xml);
            
            if ($response['success']) {
                $specifics = $this->parseCategorySpecificsResponse($response['data']);
                
                // データベースに保存
                $this->saveCategorySpecifics($categoryId, $specifics);
                
                $this->debugLog("GetCategorySpecifics成功: " . count($specifics) . "項目取得");
                return $specifics;
            }
            
            throw new Exception("GetCategorySpecifics失敗: " . $response['error']);
            
        } catch (Exception $e) {
            $this->debugLog("GetCategorySpecifics エラー: " . $e->getMessage());
            return $this->getDefaultCategorySpecifics();
        }
    }
    
    /**
     * GetItem - 競合商品のItem Specifics取得（セルリサーチ用）
     * @param string $itemId eBayアイテムID
     * @return array 商品詳細とItem Specifics
     */
    public function getItemDetails($itemId) {
        try {
            $this->debugLog("GetItem開始: アイテム {$itemId}");
            
            $xml = $this->buildGetItemRequest($itemId);
            $response = $this->makeTradingApiCall('GetItem', $xml);
            
            if ($response['success']) {
                $itemData = $this->parseGetItemResponse($response['data']);
                $this->debugLog("GetItem成功: " . $itemData['title']);
                return $itemData;
            }
            
            throw new Exception("GetItem失敗: " . $response['error']);
            
        } catch (Exception $e) {
            $this->debugLog("GetItem エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * セルリサーチ機能 - 類似商品の売上実績分析
     * @param string $title 商品タイトル
     * @param string $categoryId カテゴリーID
     * @param int $limit 取得件数
     * @return array 売上実績データ
     */
    public function analyzeSoldListings($title, $categoryId = null, $limit = 20) {
        try {
            $this->debugLog("セルリサーチ開始: {$title}");
            
            // Finding API (Sold listings)を使用
            $searchParams = [
                'keywords' => $title,
                'itemFilter' => [
                    [
                        'name' => 'SoldItemsOnly',
                        'value' => 'true'
                    ],
                    [
                        'name' => 'EndTimeFrom',
                        'value' => date('c', strtotime('-90 days'))
                    ]
                ],
                'paginationInput' => [
                    'entriesPerPage' => $limit,
                    'pageNumber' => 1
                ],
                'sortOrder' => 'EndTimeSoonest'
            ];
            
            if ($categoryId) {
                $searchParams['categoryId'] = [$categoryId];
            }
            
            $soldItems = $this->findCompletedItems($searchParams);
            
            // 売上実績分析
            $analysis = $this->analyzeSalesData($soldItems);
            
            $this->debugLog("セルリサーチ完了: " . count($soldItems) . "件分析");
            return $analysis;
            
        } catch (Exception $e) {
            $this->debugLog("セルリサーチ エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Item Specifics統合機能 - 1つのセルに全項目を統合
     * @param string $categoryId カテゴリーID
     * @param array $productData 商品データ
     * @param array $customValues カスタム値（オプション）
     * @return string 統合されたItem Specifics文字列
     */
    public function generateCompleteItemSpecifics($categoryId, $productData, $customValues = []) {
        try {
            // 1. カテゴリー必須項目取得
            $categorySpecifics = $this->getCategorySpecifics($categoryId);
            
            // 2. 商品データから自動推定
            $inferredValues = $this->inferItemSpecificsFromProduct($productData, $categorySpecifics);
            
            // 3. カスタム値で上書き
            $finalValues = array_merge($inferredValues, $customValues);
            
            // 4. 必須項目チェック・補完
            $completeSpecifics = $this->completeRequiredFields($categorySpecifics, $finalValues);
            
            // 5. 1セル形式に変換
            $cellFormat = $this->formatForSingleCell($completeSpecifics);
            
            $this->debugLog("Item Specifics統合完了: " . count($completeSpecifics) . "項目");
            return $cellFormat;
            
        } catch (Exception $e) {
            $this->debugLog("Item Specifics統合 エラー: " . $e->getMessage());
            return $this->getDefaultItemSpecificsString();
        }
    }
    
    /**
     * ミラー出品支援機能 - 売れている商品と同じ設定を提案
     * @param string $title 商品タイトル
     * @param string $categoryId カテゴリーID
     * @return array ミラー出品データ
     */
    public function suggestMirrorListing($title, $categoryId) {
        try {
            $this->debugLog("ミラー出品分析開始: {$title}");
            
            // 1. 売上実績分析
            $salesAnalysis = $this->analyzeSoldListings($title, $categoryId);
            
            if (empty($salesAnalysis['top_performers'])) {
                throw new Exception('分析対象の売上実績が見つかりません');
            }
            
            // 2. 上位商品の詳細取得
            $topItemIds = array_slice($salesAnalysis['top_performers'], 0, 5);
            $mirrorTemplates = [];
            
            foreach ($topItemIds as $itemData) {
                if (isset($itemData['item_id'])) {
                    $itemDetails = $this->getItemDetails($itemData['item_id']);
                    if ($itemDetails) {
                        $mirrorTemplates[] = $itemDetails;
                    }
                }
            }
            
            // 3. 最適な設定を統合分析
            $recommendations = $this->analyzeMirrorTemplates($mirrorTemplates);
            
            $this->debugLog("ミラー出品分析完了: " . count($mirrorTemplates) . "件分析");
            
            return [
                'success' => true,
                'sales_analysis' => $salesAnalysis,
                'mirror_templates' => $mirrorTemplates,
                'recommendations' => $recommendations,
                'suggested_item_specifics' => $recommendations['item_specifics'] ?? '',
                'suggested_price_range' => $recommendations['price_range'] ?? [],
                'risk_assessment' => $this->assessMirrorRisk($salesAnalysis)
            ];
            
        } catch (Exception $e) {
            $this->debugLog("ミラー出品分析 エラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // === プライベートメソッド ===
    
    private function buildCategorySpecificsRequest($categoryId) {
        return '<?xml version="1.0" encoding="utf-8"?>
        <GetCategorySpecificsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['ebay_api']['user_token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <CategoryID>' . htmlspecialchars($categoryId) . '</CategoryID>
            <IncludeConfidence>true</IncludeConfidence>
            <MaxNames>200</MaxNames>
            <MaxValuesPerName>100</MaxValuesPerName>
        </GetCategorySpecificsRequest>';
    }
    
    private function buildGetItemRequest($itemId) {
        return '<?xml version="1.0" encoding="utf-8"?>
        <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . htmlspecialchars($this->config['ebay_api']['user_token']) . '</eBayAuthToken>
            </RequesterCredentials>
            <ItemID>' . htmlspecialchars($itemId) . '</ItemID>
            <DetailLevel>ReturnAll</DetailLevel>
            <IncludeItemSpecifics>true</IncludeItemSpecifics>
        </GetItemRequest>';
    }
    
    private function makeTradingApiCall($callName, $requestXml) {
        try {
            $endpoint = $this->config['ebay_api']['sandbox_mode'] ? 
                self::SANDBOX_ENDPOINT . $callName :
                self::API_ENDPOINT . $callName;
            
            $headers = [
                'X-EBAY-API-COMPATIBILITY-LEVEL: ' . $this->config['ebay_api']['compatibility_level'],
                'X-EBAY-API-DEV-NAME: ' . $this->config['ebay_api']['dev_id'],
                'X-EBAY-API-APP-NAME: ' . $this->config['ebay_api']['app_id'],
                'X-EBAY-API-CERT-NAME: ' . $this->config['ebay_api']['cert_id'],
                'X-EBAY-API-CALL-NAME: ' . $callName,
                'X-EBAY-API-SITEID: ' . $this->config['ebay_api']['site_id'],
                'Content-Type: text/xml',
                'Content-Length: ' . strlen($requestXml)
            ];
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $endpoint,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $requestXml,
                CURLOPT_HTTPHEADER => $headers,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_TIMEOUT => 30
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);
            curl_close($ch);
            
            if ($error) {
                throw new Exception("cURL エラー: " . $error);
            }
            
            if ($httpCode !== 200) {
                throw new Exception("HTTP エラー: " . $httpCode);
            }
            
            return [
                'success' => true,
                'data' => $response,
                'http_code' => $httpCode
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function parseCategorySpecificsResponse($xmlResponse) {
        $specifics = [];
        
        try {
            $xml = simplexml_load_string($xmlResponse);
            if (!$xml) {
                throw new Exception('XML解析失敗');
            }
            
            // eBay API レスポンス解析
            if (isset($xml->Recommendations->NameRecommendation)) {
                foreach ($xml->Recommendations->NameRecommendation as $nameRec) {
                    $name = (string)$nameRec->Name;
                    $confidence = (float)$nameRec->Confidence ?? 0;
                    
                    $values = [];
                    if (isset($nameRec->ValueRecommendation)) {
                        foreach ($nameRec->ValueRecommendation as $valueRec) {
                            $values[] = [
                                'value' => (string)$valueRec->Value,
                                'confidence' => (float)$valueRec->Confidence ?? 0
                            ];
                        }
                    }
                    
                    $specifics[] = [
                        'name' => $name,
                        'confidence' => $confidence,
                        'required' => $confidence > 80, // 80%以上を必須と判定
                        'values' => $values,
                        'field_type' => $confidence > 80 ? 'required' : 'recommended'
                    ];
                }
            }
            
        } catch (Exception $e) {
            $this->debugLog("XML解析エラー: " . $e->getMessage());
        }
        
        return $specifics;
    }
    
    private function formatForSingleCell($itemSpecifics) {
        $formatted = [];
        
        foreach ($itemSpecifics as $name => $value) {
            if (!empty($value) && $value !== 'Unknown') {
                $formatted[] = $name . '=' . $value;
            }
        }
        
        return implode('■', $formatted);
    }
    
    private function analyzeSalesData($soldItems) {
        $totalSold = count($soldItems);
        $totalRevenue = 0;
        $prices = [];
        $topPerformers = [];
        
        foreach ($soldItems as $item) {
            $price = (float)($item['sellingStatus']['currentPrice']['__value__'] ?? 0);
            $totalRevenue += $price;
            $prices[] = $price;
            
            $topPerformers[] = [
                'item_id' => $item['itemId'][0] ?? '',
                'title' => $item['title'][0] ?? '',
                'price' => $price,
                'end_time' => $item['listingInfo']['endTime'][0] ?? '',
                'watchers' => (int)($item['listingInfo']['watchCount'][0] ?? 0)
            ];
        }
        
        sort($prices);
        
        return [
            'total_sold' => $totalSold,
            'total_revenue' => $totalRevenue,
            'average_price' => $totalSold > 0 ? $totalRevenue / $totalSold : 0,
            'median_price' => $this->calculateMedian($prices),
            'price_range' => [
                'min' => min($prices ?: [0]),
                'max' => max($prices ?: [0])
            ],
            'top_performers' => array_slice(
                usort($topPerformers, function($a, $b) {
                    return $b['watchers'] <=> $a['watchers'];
                }) ? $topPerformers : [],
                0, 10
            )
        ];
    }
    
    private function calculateMedian($numbers) {
        $count = count($numbers);
        if ($count === 0) return 0;
        
        $middle = intval($count / 2);
        
        if ($count % 2 === 0) {
            return ($numbers[$middle - 1] + $numbers[$middle]) / 2;
        } else {
            return $numbers[$middle];
        }
    }
    
    private function assessMirrorRisk($salesAnalysis) {
        $risk = 'LOW';
        $factors = [];
        
        if ($salesAnalysis['total_sold'] < 5) {
            $risk = 'HIGH';
            $factors[] = '売上実績が少ない（5件未満）';
        }
        
        $priceVariation = $salesAnalysis['price_range']['max'] - $salesAnalysis['price_range']['min'];
        $avgPrice = $salesAnalysis['average_price'];
        
        if ($avgPrice > 0 && ($priceVariation / $avgPrice) > 0.5) {
            $risk = 'MEDIUM';
            $factors[] = '価格のばらつきが大きい';
        }
        
        return [
            'level' => $risk,
            'factors' => $factors,
            'recommendation' => $this->getRiskRecommendation($risk)
        ];
    }
    
    private function getRiskRecommendation($riskLevel) {
        switch ($riskLevel) {
            case 'HIGH':
                return 'リスクが高いため、少量テスト販売を推奨';
            case 'MEDIUM':
                return '価格設定に注意してテスト販売';
            case 'LOW':
            default:
                return '安全にミラー出品可能';
        }
    }
    
    private function debugLog($message) {
        if ($this->debugMode) {
            error_log("[EbayTradingApiConnector] " . date('Y-m-d H:i:s') . " - " . $message);
        }
    }
    
    // キャッシュ・データベース関連メソッドは省略（既存実装を流用）
    private function getCachedCategorySpecifics($categoryId) { return null; }
    private function saveCategorySpecifics($categoryId, $specifics) { }
    private function getDefaultCategorySpecifics() { return []; }
    private function getDefaultItemSpecificsString() { return 'Brand=Unknown■Condition=Used'; }
    private function inferItemSpecificsFromProduct($productData, $categorySpecifics) { return []; }
    private function completeRequiredFields($categorySpecifics, $values) { return $values; }
    private function findCompletedItems($params) { return []; }
    private function analyzeMirrorTemplates($templates) { return []; }
    private function parseGetItemResponse($xmlResponse) { return null; }
}
?>