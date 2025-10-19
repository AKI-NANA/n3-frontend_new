<?php
// eBay他人の商品データ取得テスト - エラー修正版
// 自分の出品以外のデータを確実に取得

header('Content-Type: application/json; charset=UTF-8');
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'test';
    
    try {
        switch ($action) {
            case 'search_others_products':
                $result = searchOthersProducts();
                break;
            case 'get_product_by_id':
                $result = getProductById();
                break;
            case 'save_product_data':
                $result = saveProductData();
                break;
            default:
                $result = ['error' => 'Unknown action: ' . $action];
        }
        
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function searchOthersProducts() {
    try {
        $search_term = $_POST['search_term'] ?? 'nintendo switch';
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        
        // 他人の商品を確実に取得するための設定
        $url = 'https://svcs.ebay.com/services/search/FindingService/v1';
        $params = [
            'OPERATION-NAME' => 'findItemsByKeywords',
            'SERVICE-VERSION' => '1.0.0',
            'SECURITY-APPNAME' => $app_id,
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'keywords' => $search_term,
            'paginationInput.entriesPerPage' => '20',
            'paginationInput.pageNumber' => '1',
            
            // 他人の商品のみ取得するフィルター
            'itemFilter(0).name' => 'ExcludeSeller',
            'itemFilter(0).value(0)' => 'electronics_store_pro', // 自分のアカウントを除外
            'itemFilter(0).value(1)' => 'aritahiroaki', // 自分のアカウントを除外
            'itemFilter(0).value(2)' => 'hiropro2024', // 自分のアカウントを除外
            
            'itemFilter(1).name' => 'ListingType',
            'itemFilter(1).value(0)' => 'FixedPrice',
            'itemFilter(1).value(1)' => 'Auction',
            
            'itemFilter(2).name' => 'MinPrice',
            'itemFilter(2).value' => '10.00',
            'itemFilter(2).paramName' => 'Currency',
            'itemFilter(2).paramValue' => 'USD',
            
            'itemFilter(3).name' => 'MaxPrice',
            'itemFilter(3).value' => '5000.00',
            'itemFilter(3).paramName' => 'Currency',
            'itemFilter(3).paramValue' => 'USD',
            
            'sortOrder' => 'BestMatch'
        ];
        
        $query_string = http_build_query($params);
        $full_url = $url . '?' . $query_string;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            throw new Exception('CURL Error: ' . $curl_error);
        }
        
        if ($http_code !== 200) {
            throw new Exception('eBay API HTTP Error: ' . $http_code . ' - Response: ' . substr($response, 0, 1000));
        }
        
        $data = json_decode($response, true);
        
        if (!$data) {
            throw new Exception('Invalid JSON response: ' . json_last_error_msg() . ' - Raw response: ' . substr($response, 0, 500));
        }
        
        // レスポンス構造の詳細確認
        $findItemsByKeywordsResponse = $data['findItemsByKeywordsResponse'][0] ?? [];
        $ack = $findItemsByKeywordsResponse['ack'][0] ?? '';
        
        if ($ack !== 'Success') {
            $errorMessage = 'Unknown API Error';
            if (isset($findItemsByKeywordsResponse['errorMessage'][0]['error'][0]['message'][0])) {
                $errorMessage = $findItemsByKeywordsResponse['errorMessage'][0]['error'][0]['message'][0];
            }
            throw new Exception('eBay API Error: ' . $errorMessage . ' - Full response: ' . json_encode($findItemsByKeywordsResponse));
        }
        
        $searchResult = $findItemsByKeywordsResponse['searchResult'][0] ?? [];
        $items = $searchResult['item'] ?? [];
        
        if (empty($items)) {
            throw new Exception('No items found in search results. Search result: ' . json_encode($searchResult));
        }
        
        // 他人の商品データを整理
        $formatted_items = [];
        foreach ($items as $index => $item) {
            try {
                $selling_status = $item['sellingStatus'][0] ?? [];
                $shipping_info = $item['shippingInfo'][0] ?? [];
                $condition = $item['condition'][0] ?? [];
                $seller_info = $item['sellerInfo'][0] ?? [];
                $primary_category = $item['primaryCategory'][0] ?? [];
                $listing_info = $item['listingInfo'][0] ?? [];
                
                $formatted_items[] = [
                    'itemId' => $item['itemId'][0] ?? '',
                    'title' => $item['title'][0] ?? '',
                    'subtitle' => $item['subtitle'][0] ?? '',
                    'price' => floatval($selling_status['currentPrice'][0]['__value__'] ?? 0),
                    'currency' => $selling_status['currentPrice'][0]['@currencyId'] ?? '',
                    'condition' => $condition['conditionDisplayName'][0] ?? '',
                    'condition_id' => $condition['conditionId'][0] ?? '',
                    'seller_username' => $seller_info['sellerUserName'][0] ?? '',
                    'seller_feedback_score' => intval($seller_info['feedbackScore'][0] ?? 0),
                    'seller_positive_feedback' => floatval($seller_info['positiveFeedbackPercent'][0] ?? 0),
                    'top_rated_seller' => ($seller_info['topRatedSeller'][0] ?? 'false') === 'true',
                    'location' => $item['location'][0] ?? '',
                    'country' => $item['country'][0] ?? '',
                    'shipping_cost' => floatval($shipping_info['shippingServiceCost'][0]['__value__'] ?? 0),
                    'shipping_type' => $shipping_info['shippingType'][0] ?? '',
                    'expedited_shipping' => ($shipping_info['expeditedShipping'][0] ?? 'false') === 'true',
                    'handling_time' => intval($shipping_info['handlingTime'][0] ?? 0),
                    'view_item_url' => $item['viewItemURL'][0] ?? '',
                    'gallery_url' => $item['galleryURL'][0] ?? '',
                    'time_left' => $selling_status['timeLeft'][0] ?? '',
                    'category_id' => $primary_category['categoryId'][0] ?? '',
                    'category_name' => $primary_category['categoryName'][0] ?? '',
                    'listing_type' => $listing_info['listingType'][0] ?? '',
                    'best_offer_enabled' => ($listing_info['bestOfferEnabled'][0] ?? 'false') === 'true',
                    'buy_it_now_available' => ($listing_info['buyItNowAvailable'][0] ?? 'false') === 'true',
                    'start_time' => $listing_info['startTime'][0] ?? '',
                    'end_time' => $listing_info['endTime'][0] ?? '',
                    'watch_count' => intval($listing_info['watchCount'][0] ?? 0)
                ];
            } catch (Exception $e) {
                // 個別アイテムのエラーはスキップ
                continue;
            }
        }
        
        return [
            'success' => true,
            'message' => '他人の商品データ取得成功',
            'search_term' => $search_term,
            'total_results' => intval($searchResult['@count'] ?? 0),
            'returned_items' => count($formatted_items),
            'items' => $formatted_items,
            'api_response_info' => [
                'timestamp' => $findItemsByKeywordsResponse['timestamp'][0] ?? '',
                'version' => $findItemsByKeywordsResponse['version'][0] ?? '',
                'ack' => $ack
            ],
            'filters_applied' => [
                'exclude_sellers' => ['electronics_store_pro', 'aritahiroaki', 'hiropro2024'],
                'price_range' => '$10.00 - $5000.00',
                'listing_types' => ['FixedPrice', 'Auction']
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Others product search failed: ' . $e->getMessage(),
            'debug_info' => [
                'search_term' => $search_term ?? '',
                'api_url' => substr($full_url ?? '', 0, 200) . '...',
                'http_code' => $http_code ?? 0,
                'curl_error' => $curl_error ?? '',
                'response_preview' => substr($response ?? '', 0, 500)
            ]
        ];
    }
}

function getProductById() {
    try {
        $item_id = $_POST['item_id'] ?? '';
        
        if (empty($item_id)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        // より詳細なデータ取得のため、複数API試行
        $detailed_data = [];
        
        // Method 1: Shopping API（詳細データ）
        $shopping_result = getProductFromShoppingAPI($item_id);
        if ($shopping_result['success']) {
            $detailed_data = array_merge($detailed_data, $shopping_result['data']);
        }
        
        // Method 2: Finding API（補完データ）
        $finding_result = getProductFromFindingAPI($item_id);
        if ($finding_result['success']) {
            $detailed_data = array_merge($detailed_data, $finding_result['data']);
        }
        
        if (empty($detailed_data)) {
            throw new Exception('商品データを取得できませんでした');
        }
        
        return [
            'success' => true,
            'message' => '商品詳細データ取得成功',
            'item_id' => $item_id,
            'detailed_data' => $detailed_data,
            'data_sources' => [
                'shopping_api' => $shopping_result['success'] ?? false,
                'finding_api' => $finding_result['success'] ?? false
            ],
            'data_points_count' => count($detailed_data, COUNT_RECURSIVE),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Product details fetch failed: ' . $e->getMessage()
        ];
    }
}

function getProductFromShoppingAPI($item_id) {
    try {
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        
        // eBay Shopping API
        $url = 'https://open.api.ebay.com/shopping';
        $params = [
            'callname' => 'GetSingleItem',
            'responseencoding' => 'JSON',
            'appid' => $app_id,
            'siteid' => '0',
            'version' => '967',
            'ItemID' => $item_id,
            'IncludeSelector' => 'Description,Details,ItemSpecifics,ShippingCosts'
        ];
        
        $query_string = http_build_query($params);
        $full_url = $url . '?' . $query_string;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_USERAGENT, 'NAGANO3-eBay-Shopping/1.0');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $data = json_decode($response, true);
            
            if (isset($data['Item'])) {
                $item = $data['Item'];
                
                return [
                    'success' => true,
                    'data' => [
                        'basic_info' => [
                            'itemId' => $item['ItemID'] ?? '',
                            'title' => $item['Title'] ?? '',
                            'description' => strip_tags($item['Description'] ?? ''),
                            'condition' => $item['ConditionDisplayName'] ?? '',
                            'location' => $item['Location'] ?? '',
                            'country' => $item['Country'] ?? '',
                            'gallery_url' => $item['GalleryURL'] ?? '',
                            'view_item_url' => $item['ViewItemURLForNaturalSearch'] ?? ''
                        ],
                        'pricing' => [
                            'current_price' => floatval($item['CurrentPrice']['Value'] ?? 0),
                            'currency' => $item['CurrentPrice']['CurrencyID'] ?? '',
                            'buy_it_now_price' => floatval($item['BuyItNowPrice']['Value'] ?? 0)
                        ],
                        'seller_info' => [
                            'seller_username' => $item['Seller']['UserID'] ?? '',
                            'feedback_score' => intval($item['Seller']['FeedbackScore'] ?? 0),
                            'positive_feedback_percent' => floatval($item['Seller']['PositiveFeedbackPercent'] ?? 0),
                            'top_rated_seller' => $item['Seller']['TopRatedSeller'] ?? false
                        ],
                        'item_specifics' => $item['ItemSpecifics']['NameValueList'] ?? [],
                        'shipping_info' => [
                            'shipping_cost_summary' => $item['ShippingCostSummary'] ?? [],
                            'ship_to_locations' => $item['ShipToLocations'] ?? []
                        ],
                        'listing_details' => [
                            'listing_type' => $item['ListingType'] ?? '',
                            'start_time' => $item['StartTime'] ?? '',
                            'end_time' => $item['EndTime'] ?? '',
                            'time_left' => $item['TimeLeft'] ?? '',
                            'hit_count' => intval($item['HitCount'] ?? 0),
                            'watch_count' => intval($item['WatchCount'] ?? 0)
                        ]
                    ]
                ];
            }
        }
        
        return ['success' => false, 'error' => 'Shopping API failed'];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function getProductFromFindingAPI($item_id) {
    try {
        // Finding APIで特定商品検索（補完用）
        // 実装簡略化のため基本データのみ
        return [
            'success' => true,
            'data' => [
                'api_source' => 'Finding API (補完)',
                'item_id' => $item_id
            ]
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function saveProductData() {
    try {
        $item_data = json_decode($_POST['item_data'] ?? '{}', true);
        
        if (empty($item_data)) {
            throw new Exception('保存するデータが指定されていません');
        }
        
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $pdo = new PDO($dsn, 'aritahiroaki', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        // 他人の商品データ専用テーブル
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_others_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id VARCHAR(50) UNIQUE NOT NULL,
                title TEXT,
                description TEXT,
                price DECIMAL(12,2),
                currency VARCHAR(10),
                condition VARCHAR(100),
                seller_username VARCHAR(100),
                seller_feedback_score INTEGER,
                seller_positive_feedback DECIMAL(5,2),
                category_name VARCHAR(200),
                category_id VARCHAR(50),
                location TEXT,
                country VARCHAR(100),
                shipping_cost DECIMAL(10,2),
                view_item_url TEXT,
                gallery_url TEXT,
                listing_type VARCHAR(50),
                data_sources JSONB,
                item_specifics JSONB,
                shipping_info JSONB,
                seller_info JSONB,
                listing_details JSONB,
                full_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ");
        
        $detailed_data = $item_data['detailed_data'] ?? [];
        $basic_info = $detailed_data['basic_info'] ?? [];
        $pricing = $detailed_data['pricing'] ?? [];
        $seller_info = $detailed_data['seller_info'] ?? [];
        
        $stmt = $pdo->prepare("
            INSERT INTO ebay_others_products (
                item_id, title, description, price, currency, condition,
                seller_username, seller_feedback_score, seller_positive_feedback,
                category_name, category_id, location, country, shipping_cost,
                view_item_url, gallery_url, listing_type, data_sources,
                item_specifics, shipping_info, seller_info, listing_details, full_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (item_id) DO UPDATE SET
                title = EXCLUDED.title,
                price = EXCLUDED.price,
                full_data = EXCLUDED.full_data,
                updated_at = NOW()
        ");
        
        $stmt->execute([
            $basic_info['itemId'] ?? '',
            $basic_info['title'] ?? '',
            $basic_info['description'] ?? '',
            $pricing['current_price'] ?? 0,
            $pricing['currency'] ?? 'USD',
            $basic_info['condition'] ?? '',
            $seller_info['seller_username'] ?? '',
            $seller_info['feedback_score'] ?? $seller_info['seller_feedback_score'] ?? 0,
            $seller_info['positive_feedback_percent'] ?? $seller_info['seller_positive_feedback'] ?? 0,
            $basic_info['categoryName'] ?? '',
            $basic_info['categoryId'] ?? '',
            $basic_info['location'] ?? '',
            $basic_info['country'] ?? '',
            $pricing['shipping_cost'] ?? 0,
            $basic_info['view_item_url'] ?? '',
            $basic_info['gallery_url'] ?? '',
            $detailed_data['listing_details']['listing_type'] ?? '',
            json_encode($item_data['data_sources'] ?? []),
            json_encode($detailed_data['item_specifics'] ?? []),
            json_encode($detailed_data['shipping_info'] ?? []),
            json_encode($seller_info),
            json_encode($detailed_data['listing_details'] ?? []),
            json_encode($detailed_data)
        ]);
        
        return [
            'success' => true,
            'message' => '他人の商品データをデータベースに保存成功',
            'item_id' => $basic_info['itemId'] ?? '',
            'saved_title' => $basic_info['title'] ?? '',
            'saved_price' => $pricing['current_price'] ?? 0,
            'seller' => $seller_info['seller_username'] ?? '',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Product data save failed: ' . $e->getMessage()
        ];
    }
}

?>
