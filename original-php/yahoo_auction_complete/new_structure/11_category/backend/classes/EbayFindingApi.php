<?php
/**
 * eBay Finding API実装
 * 実際のeBay APIから商品情報（画像・タイトル・価格）を取得
 */

class EbayFindingApi {
    private $appId;
    private $apiUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';
    
    public function __construct($appId = null) {
        // 環境変数またはconfig.phpから取得
        $this->appId = $appId ?? getenv('EBAY_APP_ID') ?? 'YOUR_EBAY_APP_ID_HERE';
    }
    
    /**
     * 完売商品検索（90日間）
     */
    public function findCompletedItems($keywords, $categoryId = null, $limit = 10) {
        $params = [
            'OPERATION-NAME' => 'findCompletedItems',
            'SERVICE-VERSION' => '1.0.0',
            'SECURITY-APPNAME' => $this->appId,
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'keywords' => $keywords,
            'paginationInput.entriesPerPage' => $limit,
            'sortOrder' => 'EndTimeSoonest',
            'itemFilter(0).name' => 'SoldItemsOnly',
            'itemFilter(0).value' => 'true',
            'itemFilter(1).name' => 'EndTimeFrom',
            'itemFilter(1).value' => date('c', strtotime('-90 days'))
        ];
        
        if ($categoryId) {
            $params['categoryId'] = $categoryId;
        }
        
        return $this->makeRequest($params);
    }
    
    /**
     * 現在の出品商品検索
     */
    public function findItemsAdvanced($keywords, $categoryId = null, $limit = 10) {
        $params = [
            'OPERATION-NAME' => 'findItemsAdvanced',
            'SERVICE-VERSION' => '1.0.0',
            'SECURITY-APPNAME' => $this->appId,
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'keywords' => $keywords,
            'paginationInput.entriesPerPage' => $limit,
            'sortOrder' => 'PricePlusShippingLowest',
            'itemFilter(0).name' => 'ListingType',
            'itemFilter(0).value(0)' => 'FixedPrice',
            'itemFilter(0).value(1)' => 'Auction'
        ];
        
        if ($categoryId) {
            $params['categoryId'] = $categoryId;
        }
        
        return $this->makeRequest($params);
    }
    
    /**
     * API リクエスト実行
     */
    private function makeRequest($params) {
        $url = $this->apiUrl . '?' . http_build_query($params);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        if ($error) {
            throw new Exception("eBay API Error: " . $error);
        }
        
        if ($httpCode !== 200) {
            throw new Exception("eBay API returned HTTP $httpCode");
        }
        
        $data = json_decode($response, true);
        
        if (!$data) {
            throw new Exception("eBay API returned invalid JSON");
        }
        
        return $data;
    }
    
    /**
     * レスポンスから商品情報を抽出
     */
    public function parseItems($apiResponse, $includeSoldInfo = false) {
        $items = [];
        
        if (!isset($apiResponse['findCompletedItemsResponse']) && 
            !isset($apiResponse['findItemsAdvancedResponse'])) {
            return $items;
        }
        
        $responseKey = isset($apiResponse['findCompletedItemsResponse']) ? 
            'findCompletedItemsResponse' : 'findItemsAdvancedResponse';
        
        $searchResult = $apiResponse[$responseKey][0]['searchResult'][0] ?? null;
        
        if (!$searchResult || !isset($searchResult['item'])) {
            return $items;
        }
        
        foreach ($searchResult['item'] as $item) {
            $itemData = [
                'item_id' => $item['itemId'][0] ?? '',
                'title' => $item['title'][0] ?? '',
                'image_url' => $item['galleryURL'][0] ?? $item['pictureURLLarge'][0] ?? '',
                'url' => $item['viewItemURL'][0] ?? '',
                'price' => floatval($item['sellingStatus'][0]['currentPrice'][0]['__value__'] ?? 0),
                'currency' => $item['sellingStatus'][0]['currentPrice'][0]['@currencyId'] ?? 'USD',
                'shipping_cost' => floatval($item['shippingInfo'][0]['shippingServiceCost'][0]['__value__'] ?? 0),
                'total_price' => 0,
                'listing_type' => $item['listingInfo'][0]['listingType'][0] ?? 'FixedPrice',
                'condition' => $item['condition'][0]['conditionDisplayName'][0] ?? 'Used',
                'seller_feedback' => intval($item['sellerInfo'][0]['feedbackScore'][0] ?? 0),
                'watch_count' => intval($item['listingInfo'][0]['watchCount'][0] ?? 0)
            ];
            
            // 送料込み合計価格
            $itemData['total_price'] = $itemData['price'] + $itemData['shipping_cost'];
            
            // 完売商品の場合、販売情報を追加
            if ($includeSoldInfo && isset($item['sellingStatus'][0]['sellingState'][0])) {
                $itemData['sold'] = $item['sellingStatus'][0]['sellingState'][0] === 'EndedWithSales';
                $itemData['end_time'] = $item['listingInfo'][0]['endTime'][0] ?? '';
            }
            
            $items[] = $itemData;
        }
        
        return $items;
    }
}
?>
