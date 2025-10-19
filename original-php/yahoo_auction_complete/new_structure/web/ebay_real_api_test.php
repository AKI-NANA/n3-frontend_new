<?php
// eBay商品データ実際取得テスト - 本物のAPI使用
// 実際のeBay APIからリアルデータを取得

header('Content-Type: application/json; charset=UTF-8');
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'test';
    
    try {
        switch ($action) {
            case 'search_products_real':
                $result = searchRealEbayProducts();
                break;
            case 'get_real_product_details':
                $result = getRealProductDetails();
                break;
            case 'save_real_data':
                $result = saveRealDataToDatabase();
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

function searchRealEbayProducts() {
    try {
        $search_term = $_POST['search_term'] ?? 'iphone';
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        
        // 実際のeBay Finding API呼び出し
        $url = 'https://svcs.ebay.com/services/search/FindingService/v1';
        $params = [
            'OPERATION-NAME' => 'findItemsByKeywords',
            'SERVICE-VERSION' => '1.0.0',
            'SECURITY-APPNAME' => $app_id,
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'keywords' => $search_term,
            'paginationInput.entriesPerPage' => '10',
            'itemFilter(0).name' => 'ListingType',
            'itemFilter(0).value' => 'FixedPrice',
            'itemFilter(1).name' => 'Condition',
            'itemFilter(1).value(0)' => 'New',
            'itemFilter(1).value(1)' => 'Used',
            'sortOrder' => 'PricePlusShipping'
        ];
        
        $query_string = http_build_query($params);
        $full_url = $url . '?' . $query_string;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_USERAGENT, 'NAGANO3-eBay-RealData/1.0');
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            throw new Exception('CURL Error: ' . $curl_error);
        }
        
        if ($http_code !== 200) {
            throw new Exception('eBay API HTTP Error: ' . $http_code . ' - Response: ' . substr($response, 0, 500));
        }
        
        $data = json_decode($response, true);
        
        if (!$data) {
            throw new Exception('Invalid JSON response: ' . json_last_error_msg());
        }
        
        // レスポンス構造の確認
        $findItemsByKeywordsResponse = $data['findItemsByKeywordsResponse'][0] ?? [];
        $ack = $findItemsByKeywordsResponse['ack'][0] ?? '';
        
        if ($ack !== 'Success') {
            $errorMessage = $findItemsByKeywordsResponse['errorMessage'][0]['error'][0]['message'][0] ?? 'Unknown API Error';
            throw new Exception('eBay API Error: ' . $errorMessage);
        }
        
        $searchResult = $findItemsByKeywordsResponse['searchResult'][0] ?? [];
        $items = $searchResult['item'] ?? [];
        
        // 実際のデータを整理
        $formatted_items = [];
        foreach ($items as $item) {
            $selling_status = $item['sellingStatus'][0] ?? [];
            $shipping_info = $item['shippingInfo'][0] ?? [];
            $condition = $item['condition'][0] ?? [];
            $seller_info = $item['sellerInfo'][0] ?? [];
            $primary_category = $item['primaryCategory'][0] ?? [];
            
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
                'location' => $item['location'][0] ?? '',
                'country' => $item['country'][0] ?? '',
                'shipping_cost' => floatval($shipping_info['shippingServiceCost'][0]['__value__'] ?? 0),
                'shipping_type' => $shipping_info['shippingType'][0] ?? '',
                'expedited_shipping' => ($shipping_info['expeditedShipping'][0] ?? 'false') === 'true',
                'handling_time' => intval($shipping_info['handlingTime'][0] ?? 0),
                'view_item_url' => $item['viewItemURL'][0] ?? '',
                'gallery_url' => $item['galleryURL'][0] ?? '',
                'time_left' => $item['sellingStatus'][0]['timeLeft'][0] ?? '',
                'category_id' => $primary_category['categoryId'][0] ?? '',
                'category_name' => $primary_category['categoryName'][0] ?? '',
                'listing_type' => $item['listingInfo'][0]['listingType'][0] ?? '',
                'best_offer_enabled' => ($item['listingInfo'][0]['bestOfferEnabled'][0] ?? 'false') === 'true',
                'buy_it_now_available' => ($item['listingInfo'][0]['buyItNowAvailable'][0] ?? 'false') === 'true',
                'start_time' => $item['listingInfo'][0]['startTime'][0] ?? '',
                'end_time' => $item['listingInfo'][0]['endTime'][0] ?? '',
                'watch_count' => intval($item['listingInfo'][0]['watchCount'][0] ?? 0)
            ];
        }
        
        return [
            'success' => true,
            'message' => '実際のeBayデータ取得成功',
            'search_term' => $search_term,
            'total_results' => intval($searchResult['@count'] ?? 0),
            'returned_items' => count($formatted_items),
            'items' => $formatted_items,
            'api_response_info' => [
                'timestamp' => $findItemsByKeywordsResponse['timestamp'][0] ?? '',
                'version' => $findItemsByKeywordsResponse['version'][0] ?? '',
                'ack' => $ack
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Real eBay search failed: ' . $e->getMessage(),
            'debug_info' => [
                'search_term' => $search_term ?? '',
                'api_url' => $full_url ?? '',
                'http_code' => $http_code ?? 0,
                'curl_error' => $curl_error ?? ''
            ]
        ];
    }
}

function getRealProductDetails() {
    try {
        $item_id = $_POST['item_id'] ?? '';
        $access_token = 'v^1.1#i^1#p^3#I^3#f^0#r^1#t^Ul4xMF80OkYyRTU3N0VGRTQyQzRCRjJDQ0I5MTM0QzkzQTlGNjFFXzFfMSNFXjI2MA==';
        
        if (empty($item_id)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        // eBay Browse API (より詳細なデータ取得)
        $url = "https://api.ebay.com/buy/browse/v1/item/{$item_id}";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $access_token,
            'X-EBAY-C-MARKETPLACE-ID: EBAY_US',
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_USERAGENT, 'NAGANO3-eBay-RealData/1.0');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            throw new Exception('CURL Error: ' . $curl_error);
        }
        
        if ($http_code === 200) {
            $item_data = json_decode($response, true);
            
            if (!$item_data) {
                throw new Exception('Invalid JSON response: ' . json_last_error_msg());
            }
            
            // 実際のeBayデータを構造化
            $detailed_data = [
                'basic_info' => [
                    'itemId' => $item_data['itemId'] ?? '',
                    'title' => $item_data['title'] ?? '',
                    'shortDescription' => $item_data['shortDescription'] ?? '',
                    'description' => strip_tags($item_data['description'] ?? ''),
                    'condition' => $item_data['condition'] ?? '',
                    'conditionDescription' => $item_data['conditionDescription'] ?? '',
                    'brand' => $item_data['brand'] ?? '',
                    'mpn' => $item_data['mpn'] ?? '',
                    'gtin' => $item_data['gtin'] ?? '',
                    'itemLocation' => $item_data['itemLocation']['addressLine1'] ?? '' . ' ' . ($item_data['itemLocation']['city'] ?? '') . ' ' . ($item_data['itemLocation']['country'] ?? ''),
                    'categoryPath' => $item_data['categoryPath'] ?? '',
                    'categoryId' => $item_data['categoryId'] ?? ''
                ],
                'pricing' => [
                    'price' => floatval($item_data['price']['value'] ?? 0),
                    'currency' => $item_data['price']['currency'] ?? '',
                    'originalPrice' => floatval($item_data['originalPrice']['value'] ?? 0),
                    'minimumPriceToBid' => floatval($item_data['minimumPriceToBid']['value'] ?? 0),
                    'taxes' => $item_data['taxes'] ?? [],
                    'shippingOptions' => $item_data['shippingOptions'] ?? []
                ],
                'seller_info' => [
                    'seller_username' => $item_data['seller']['username'] ?? '',
                    'seller_feedback_percentage' => $item_data['seller']['feedbackPercentage'] ?? '',
                    'seller_feedback_score' => $item_data['seller']['feedbackScore'] ?? '',
                    'seller_location' => $item_data['seller']['sellerAccountType'] ?? ''
                ],
                'item_specifics' => $item_data['localizedAspects'] ?? [],
                'images' => [
                    'image_urls' => $item_data['image']['imageUrl'] ?? '',
                    'additional_images' => $item_data['additionalImages'] ?? []
                ],
                'listing_details' => [
                    'listing_marketplace_id' => $item_data['listingMarketplaceId'] ?? '',
                    'quantity_limit_per_buyer' => $item_data['quantityLimitPerBuyer'] ?? 0,
                    'quantity_used' => $item_data['estimatedAvailableQuantity'] ?? 0,
                    'bid_count' => $item_data['bidCount'] ?? 0,
                    'current_bid_price' => $item_data['currentBidPrice']['value'] ?? 0,
                    'eligible_for_inline_checkout' => $item_data['eligibleForInlineCheckout'] ?? false,
                    'enable_dfast_express_checkout' => $item_data['enabledForGuestCheckout'] ?? false,
                    'item_affiliate_web_url' => $item_data['itemAffiliateWebUrl'] ?? '',
                    'item_web_url' => $item_data['itemWebUrl'] ?? ''
                ],
                'shipping_info' => [
                    'shipping_options' => $item_data['shippingOptions'] ?? [],
                    'ship_to_locations' => $item_data['shipToLocations'] ?? [],
                    'return_terms' => $item_data['returnTerms'] ?? []
                ],
                'raw_api_response' => $item_data // 完全なAPIレスポンス保存
            ];
            
            return [
                'success' => true,
                'message' => '実際の商品詳細データ取得成功',
                'item_id' => $item_id,
                'detailed_data' => $detailed_data,
                'data_points_count' => count($detailed_data, COUNT_RECURSIVE),
                'api_source' => 'eBay Browse API v1',
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } else {
            // Browse APIが失敗した場合、Finding APIの追加情報を試す
            return getRealProductDetailsFromFindingAPI($item_id);
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Real product details fetch failed: ' . $e->getMessage(),
            'debug_info' => [
                'item_id' => $item_id ?? '',
                'http_code' => $http_code ?? 0,
                'curl_error' => $curl_error ?? ''
            ]
        ];
    }
}

function getRealProductDetailsFromFindingAPI($item_id) {
    try {
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        
        // eBay Finding API で単一アイテム検索
        $url = 'https://svcs.ebay.com/services/search/FindingService/v1';
        $params = [
            'OPERATION-NAME' => 'findItemsAdvanced',
            'SERVICE-VERSION' => '1.0.0',
            'SECURITY-APPNAME' => $app_id,
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'itemFilter(0).name' => 'Seller',
            'itemFilter(0).value' => '%',
            'keywords' => $item_id,
            'paginationInput.entriesPerPage' => '1'
        ];
        
        $query_string = http_build_query($params);
        $full_url = $url . '?' . $query_string;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $data = json_decode($response, true);
            $items = $data['findItemsAdvancedResponse'][0]['searchResult'][0]['item'] ?? [];
            
            if (!empty($items)) {
                $item = $items[0];
                
                $detailed_data = [
                    'basic_info' => [
                        'itemId' => $item['itemId'][0] ?? '',
                        'title' => $item['title'][0] ?? '',
                        'subtitle' => $item['subtitle'][0] ?? '',
                        'condition' => $item['condition'][0]['conditionDisplayName'][0] ?? '',
                        'categoryName' => $item['primaryCategory'][0]['categoryName'][0] ?? '',
                        'categoryId' => $item['primaryCategory'][0]['categoryId'][0] ?? '',
                        'location' => $item['location'][0] ?? '',
                        'country' => $item['country'][0] ?? ''
                    ],
                    'pricing' => [
                        'price' => floatval($item['sellingStatus'][0]['currentPrice'][0]['__value__'] ?? 0),
                        'currency' => $item['sellingStatus'][0]['currentPrice'][0]['@currencyId'] ?? '',
                        'shipping_cost' => floatval($item['shippingInfo'][0]['shippingServiceCost'][0]['__value__'] ?? 0)
                    ],
                    'seller_info' => [
                        'seller_username' => $item['sellerInfo'][0]['sellerUserName'][0] ?? '',
                        'feedback_score' => intval($item['sellerInfo'][0]['feedbackScore'][0] ?? 0),
                        'positive_feedback_percent' => floatval($item['sellerInfo'][0]['positiveFeedbackPercent'][0] ?? 0),
                        'top_rated_seller' => ($item['sellerInfo'][0]['topRatedSeller'][0] ?? 'false') === 'true'
                    ],
                    'listing_details' => [
                        'listing_type' => $item['listingInfo'][0]['listingType'][0] ?? '',
                        'start_time' => $item['listingInfo'][0]['startTime'][0] ?? '',
                        'end_time' => $item['listingInfo'][0]['endTime'][0] ?? '',
                        'view_item_url' => $item['viewItemURL'][0] ?? '',
                        'watch_count' => intval($item['listingInfo'][0]['watchCount'][0] ?? 0)
                    ],
                    'images' => [
                        'gallery_url' => $item['galleryURL'][0] ?? ''
                    ],
                    'raw_api_response' => $item
                ];
                
                return [
                    'success' => true,
                    'message' => '実際の商品詳細データ取得成功（Finding API）',
                    'item_id' => $item_id,
                    'detailed_data' => $detailed_data,
                    'api_source' => 'eBay Finding API',
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
        }
        
        throw new Exception('商品が見つかりませんでした');
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Finding API fallback failed: ' . $e->getMessage()
        ];
    }
}

function saveRealDataToDatabase() {
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
        
        // 実際のeBayデータテーブル作成
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_real_products (
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
                shipping_cost DECIMAL(10,2),
                view_item_url TEXT,
                gallery_url TEXT,
                listing_type VARCHAR(50),
                api_source VARCHAR(50),
                item_specifics JSONB,
                shipping_info JSONB,
                seller_info JSONB,
                images_info JSONB,
                listing_details JSONB,
                full_raw_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ");
        
        $detailed_data = $item_data['detailed_data'] ?? [];
        $basic_info = $detailed_data['basic_info'] ?? [];
        $pricing = $detailed_data['pricing'] ?? [];
        $seller_info = $detailed_data['seller_info'] ?? [];
        
        // 実データをデータベースに保存
        $stmt = $pdo->prepare("
            INSERT INTO ebay_real_products (
                item_id, title, description, price, currency, condition,
                seller_username, seller_feedback_score, seller_positive_feedback,
                category_name, category_id, location, shipping_cost,
                view_item_url, gallery_url, listing_type, api_source,
                item_specifics, shipping_info, seller_info, images_info,
                listing_details, full_raw_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (item_id) DO UPDATE SET
                title = EXCLUDED.title,
                price = EXCLUDED.price,
                full_raw_data = EXCLUDED.full_raw_data,
                updated_at = NOW()
        ");
        
        $stmt->execute([
            $basic_info['itemId'] ?? '',
            $basic_info['title'] ?? '',
            $basic_info['description'] ?? $basic_info['shortDescription'] ?? '',
            $pricing['price'] ?? 0,
            $pricing['currency'] ?? 'USD',
            $basic_info['condition'] ?? '',
            $seller_info['seller_username'] ?? '',
            $seller_info['seller_feedback_score'] ?? $seller_info['feedback_score'] ?? 0,
            $seller_info['seller_positive_feedback'] ?? $seller_info['positive_feedback_percent'] ?? 0,
            $basic_info['categoryName'] ?? '',
            $basic_info['categoryId'] ?? '',
            $basic_info['location'] ?? $basic_info['itemLocation'] ?? '',
            $pricing['shipping_cost'] ?? 0,
            $detailed_data['listing_details']['view_item_url'] ?? '',
            $detailed_data['images']['gallery_url'] ?? '',
            $detailed_data['listing_details']['listing_type'] ?? '',
            $item_data['api_source'] ?? 'eBay API',
            json_encode($detailed_data['item_specifics'] ?? []),
            json_encode($detailed_data['shipping_info'] ?? []),
            json_encode($seller_info),
            json_encode($detailed_data['images'] ?? []),
            json_encode($detailed_data['listing_details'] ?? []),
            json_encode($detailed_data)
        ]);
        
        // 保存確認
        $stmt = $pdo->prepare("SELECT id, item_id, title, price, currency FROM ebay_real_products WHERE item_id = ?");
        $stmt->execute([$basic_info['itemId'] ?? '']);
        $saved_record = $stmt->fetch();
        
        return [
            'success' => true,
            'message' => '実際のeBayデータをデータベースに保存成功',
            'item_id' => $basic_info['itemId'] ?? '',
            'saved_record_id' => $saved_record['id'] ?? '',
            'saved_title' => $saved_record['title'] ?? '',
            'saved_price' => $saved_record['price'] ?? 0,
            'data_size_bytes' => strlen(json_encode($detailed_data)),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Real data save failed: ' . $e->getMessage()
        ];
    }
}

?>
