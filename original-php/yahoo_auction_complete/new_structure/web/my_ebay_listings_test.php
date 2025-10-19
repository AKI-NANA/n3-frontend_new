<?php
// eBay自分の出品データ取得・表示ツール
// 自分のアカウントの出品商品を画像付きで完全表示

header('Content-Type: application/json; charset=UTF-8');
error_reporting(E_ALL & ~E_DEPRECATED);
ini_set('display_errors', 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'test';
    
    try {
        switch ($action) {
            case 'get_my_listings':
                $result = getMyListings();
                break;
            case 'get_my_item_details':
                $result = getMyItemDetails();
                break;
            case 'save_my_listing_data':
                $result = saveMyListingData();
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

function getMyListings() {
    try {
        // 自分のアカウントを指定（実際のセラー名に変更してください）
        $my_seller_name = $_POST['seller_name'] ?? 'electronics_store_pro'; // 自分のeBayセラー名
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        
        // Finding API - 自分の出品のみ検索
        $url = 'https://svcs.ebay.com/services/search/FindingService/v1';
        $params = [
            'OPERATION-NAME' => 'findItemsByKeywords',
            'SERVICE-VERSION' => '1.0.0',
            'SECURITY-APPNAME' => $app_id,
            'RESPONSE-DATA-FORMAT' => 'JSON',
            'REST-PAYLOAD' => '',
            'keywords' => '*', // 全商品検索
            'paginationInput.entriesPerPage' => '50',
            'paginationInput.pageNumber' => '1',
            
            // 自分のセラー名のみ検索
            'itemFilter(0).name' => 'Seller',
            'itemFilter(0).value' => $my_seller_name,
            
            'itemFilter(1).name' => 'ListingType',
            'itemFilter(1).value(0)' => 'FixedPrice',
            'itemFilter(1).value(1)' => 'Auction',
            
            'sortOrder' => 'StartTimeNewest'
        ];
        
        $query_string = http_build_query($params);
        $full_url = $url . '?' . $query_string;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_USERAGENT, 'NAGANO3-MyListings/1.0');
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
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
        
        $findItemsByKeywordsResponse = $data['findItemsByKeywordsResponse'][0] ?? [];
        $ack = $findItemsByKeywordsResponse['ack'][0] ?? '';
        
        if ($ack !== 'Success') {
            $errorMessage = 'Unknown API Error';
            if (isset($findItemsByKeywordsResponse['errorMessage'][0]['error'][0]['message'][0])) {
                $errorMessage = $findItemsByKeywordsResponse['errorMessage'][0]['error'][0]['message'][0];
            }
            throw new Exception('eBay API Error: ' . $errorMessage);
        }
        
        $searchResult = $findItemsByKeywordsResponse['searchResult'][0] ?? [];
        $items = $searchResult['item'] ?? [];
        
        // 自分の出品データを詳細に整理
        $my_listings = [];
        foreach ($items as $index => $item) {
            try {
                $selling_status = $item['sellingStatus'][0] ?? [];
                $shipping_info = $item['shippingInfo'][0] ?? [];
                $condition = $item['condition'][0] ?? [];
                $seller_info = $item['sellerInfo'][0] ?? [];
                $primary_category = $item['primaryCategory'][0] ?? [];
                $listing_info = $item['listingInfo'][0] ?? [];
                
                $my_listings[] = [
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
                    'watch_count' => intval($listing_info['watchCount'][0] ?? 0),
                    'bid_count' => intval($selling_status['bidCount'][0] ?? 0),
                    'current_bid_price' => floatval($selling_status['currentPrice'][0]['__value__'] ?? 0)
                ];
            } catch (Exception $e) {
                continue;
            }
        }
        
        return [
            'success' => true,
            'message' => '自分の出品データ取得成功',
            'seller_name' => $my_seller_name,
            'total_listings' => intval($searchResult['@count'] ?? 0),
            'returned_listings' => count($my_listings),
            'listings' => $my_listings,
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
            'error' => 'My listings fetch failed: ' . $e->getMessage(),
            'debug_info' => [
                'seller_name' => $my_seller_name ?? '',
                'api_url' => substr($full_url ?? '', 0, 200) . '...',
                'http_code' => $http_code ?? 0,
                'curl_error' => $curl_error ?? '',
                'response_preview' => substr($response ?? '', 0, 500)
            ]
        ];
    }
}

function getMyItemDetails() {
    try {
        $item_id = $_POST['item_id'] ?? '';
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        
        if (empty($item_id)) {
            throw new Exception('商品IDが指定されていません');
        }
        
        // Shopping API で詳細データと画像を取得
        $url = 'https://open.api.ebay.com/shopping';
        $params = [
            'callname' => 'GetSingleItem',
            'responseencoding' => 'JSON',
            'appid' => $app_id,
            'siteid' => '0',
            'version' => '967',
            'ItemID' => $item_id,
            'IncludeSelector' => 'Description,Details,ItemSpecifics,ShippingCosts,Pictures'
        ];
        
        $query_string = http_build_query($params);
        $full_url = $url . '?' . $query_string;
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $full_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        curl_setopt($ch, CURLOPT_USERAGENT, 'NAGANO3-MyItemDetails/1.0');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            throw new Exception('CURL Error: ' . $curl_error);
        }
        
        if ($http_code !== 200) {
            throw new Exception('Shopping API HTTP Error: ' . $http_code . ' - Response: ' . substr($response, 0, 500));
        }
        
        $data = json_decode($response, true);
        
        if (!$data || !isset($data['Item'])) {
            throw new Exception('Invalid JSON response or no item data: ' . json_last_error_msg());
        }
        
        $item = $data['Item'];
        
        // 画像URLを全て取得
        $image_urls = [];
        
        // メイン画像
        if (isset($item['GalleryURL']) && !empty($item['GalleryURL'])) {
            $image_urls[] = $item['GalleryURL'];
        }
        
        // 追加画像
        if (isset($item['PictureURL'])) {
            if (is_array($item['PictureURL'])) {
                $image_urls = array_merge($image_urls, $item['PictureURL']);
            } else {
                $image_urls[] = $item['PictureURL'];
            }
        }
        
        // 画像URLを重複除去
        $image_urls = array_unique($image_urls);
        
        // 商品仕様を整理
        $item_specifics = [];
        if (isset($item['ItemSpecifics']['NameValueList'])) {
            foreach ($item['ItemSpecifics']['NameValueList'] as $specific) {
                $name = $specific['Name'] ?? '';
                $value = $specific['Value'] ?? '';
                if (is_array($value)) {
                    $value = implode(', ', $value);
                }
                if (!empty($name) && !empty($value)) {
                    $item_specifics[$name] = $value;
                }
            }
        }
        
        $detailed_data = [
            'basic_info' => [
                'itemId' => $item['ItemID'] ?? '',
                'title' => $item['Title'] ?? '',
                'subtitle' => $item['SubTitle'] ?? '',
                'description' => strip_tags($item['Description'] ?? ''),
                'short_description' => substr(strip_tags($item['Description'] ?? ''), 0, 300) . '...',
                'condition' => $item['ConditionDisplayName'] ?? '',
                'condition_id' => $item['ConditionID'] ?? '',
                'location' => $item['Location'] ?? '',
                'country' => $item['Country'] ?? '',
                'postal_code' => $item['PostalCode'] ?? ''
            ],
            'pricing' => [
                'current_price' => floatval($item['CurrentPrice']['Value'] ?? 0),
                'currency' => $item['CurrentPrice']['CurrencyID'] ?? '',
                'buy_it_now_price' => floatval($item['BuyItNowPrice']['Value'] ?? 0),
                'start_price' => floatval($item['StartPrice']['Value'] ?? 0),
                'reserve_met' => $item['ReserveMet'] ?? false,
                'minimum_to_bid' => floatval($item['MinimumToBid']['Value'] ?? 0)
            ],
            'seller_info' => [
                'seller_username' => $item['Seller']['UserID'] ?? '',
                'feedback_score' => intval($item['Seller']['FeedbackScore'] ?? 0),
                'positive_feedback_percent' => floatval($item['Seller']['PositiveFeedbackPercent'] ?? 0),
                'feedback_private' => $item['Seller']['FeedbackPrivate'] ?? false,
                'feedback_rating_star' => $item['Seller']['FeedbackRatingStar'] ?? '',
                'id_verified' => $item['Seller']['IDVerified'] ?? false,
                'registration_date' => $item['Seller']['RegistrationDate'] ?? '',
                'site' => $item['Seller']['Site'] ?? '',
                'status' => $item['Seller']['Status'] ?? '',
                'user_id_changed' => $item['Seller']['UserIDChanged'] ?? false,
                'vat_status' => $item['Seller']['VATStatus'] ?? '',
                'seller_business_type' => $item['Seller']['SellerBusinessType'] ?? '',
                'store_name' => $item['Seller']['StoreName'] ?? '',
                'store_url' => $item['Seller']['StoreURL'] ?? '',
                'top_rated_seller' => $item['Seller']['TopRatedSeller'] ?? false
            ],
            'images' => [
                'total_images' => count($image_urls),
                'image_urls' => $image_urls,
                'gallery_url' => $item['GalleryURL'] ?? '',
                'picture_urls' => $item['PictureURL'] ?? []
            ],
            'item_specifics' => $item_specifics,
            'shipping_info' => [
                'shipping_cost_summary' => $item['ShippingCostSummary'] ?? [],
                'ship_to_locations' => $item['ShipToLocations'] ?? [],
                'expedited_shipping' => $item['ExpeditedShipping'] ?? false,
                'one_day_shipping_available' => $item['OneDayShippingAvailable'] ?? false,
                'handling_time' => $item['HandlingTime'] ?? 0
            ],
            'listing_details' => [
                'listing_type' => $item['ListingType'] ?? '',
                'start_time' => $item['StartTime'] ?? '',
                'end_time' => $item['EndTime'] ?? '',
                'time_left' => $item['TimeLeft'] ?? '',
                'hit_count' => intval($item['HitCount'] ?? 0),
                'watch_count' => intval($item['WatchCount'] ?? 0),
                'question_count' => intval($item['QuestionCount'] ?? 0),
                'bid_count' => intval($item['BidCount'] ?? 0),
                'high_bidder_user_id' => $item['HighBidder']['UserID'] ?? '',
                'converted_current_price' => $item['ConvertedCurrentPrice'] ?? [],
                'listing_status' => $item['ListingStatus'] ?? '',
                'quantity_sold' => intval($item['QuantitySold'] ?? 0),
                'quantity' => intval($item['Quantity'] ?? 0),
                'auto_pay' => $item['AutoPay'] ?? false,
                'integration_id' => $item['IntegratedMerchantCreditCardEnabled'] ?? false,
                'variations' => $item['Variations'] ?? [],
                'discount_price_info' => $item['DiscountPriceInfo'] ?? []
            ],
            'category_info' => [
                'primary_category_id' => $item['PrimaryCategoryID'] ?? '',
                'primary_category_name' => $item['PrimaryCategoryName'] ?? '',
                'secondary_category_id' => $item['SecondaryCategoryID'] ?? '',
                'secondary_category_name' => $item['SecondaryCategoryName'] ?? ''
            ],
            'raw_api_response' => $item
        ];
        
        return [
            'success' => true,
            'message' => '自分の商品詳細データ取得成功',
            'item_id' => $item_id,
            'detailed_data' => $detailed_data,
            'data_points_count' => count($detailed_data, COUNT_RECURSIVE),
            'api_source' => 'eBay Shopping API',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'My item details fetch failed: ' . $e->getMessage(),
            'debug_info' => [
                'item_id' => $item_id ?? '',
                'http_code' => $http_code ?? 0,
                'curl_error' => $curl_error ?? '',
                'response_preview' => substr($response ?? '', 0, 500)
            ]
        ];
    }
}

function saveMyListingData() {
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
        
        // 自分の出品データ専用テーブル
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS my_ebay_listings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                item_id VARCHAR(50) UNIQUE NOT NULL,
                title TEXT,
                subtitle TEXT,
                description TEXT,
                short_description TEXT,
                price DECIMAL(12,2),
                currency VARCHAR(10),
                condition VARCHAR(100),
                condition_id VARCHAR(20),
                seller_username VARCHAR(100),
                location TEXT,
                country VARCHAR(100),
                postal_code VARCHAR(20),
                listing_type VARCHAR(50),
                start_time TIMESTAMP,
                end_time TIMESTAMP,
                time_left VARCHAR(50),
                quantity INTEGER,
                quantity_sold INTEGER,
                watch_count INTEGER,
                hit_count INTEGER,
                bid_count INTEGER,
                category_id VARCHAR(50),
                category_name VARCHAR(200),
                gallery_url TEXT,
                view_item_url TEXT,
                total_images INTEGER,
                image_urls JSONB,
                item_specifics JSONB,
                shipping_info JSONB,
                seller_info JSONB,
                listing_details JSONB,
                pricing_info JSONB,
                full_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        ");
        
        $detailed_data = $item_data['detailed_data'] ?? [];
        $basic_info = $detailed_data['basic_info'] ?? [];
        $pricing = $detailed_data['pricing'] ?? [];
        $seller_info = $detailed_data['seller_info'] ?? [];
        $images = $detailed_data['images'] ?? [];
        $listing_details = $detailed_data['listing_details'] ?? [];
        $category_info = $detailed_data['category_info'] ?? [];
        
        // 日時の変換
        $start_time = null;
        $end_time = null;
        if (!empty($listing_details['start_time'])) {
            $start_time = date('Y-m-d H:i:s', strtotime($listing_details['start_time']));
        }
        if (!empty($listing_details['end_time'])) {
            $end_time = date('Y-m-d H:i:s', strtotime($listing_details['end_time']));
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO my_ebay_listings (
                item_id, title, subtitle, description, short_description, price, currency,
                condition, condition_id, seller_username, location, country, postal_code,
                listing_type, start_time, end_time, time_left, quantity, quantity_sold,
                watch_count, hit_count, bid_count, category_id, category_name,
                gallery_url, view_item_url, total_images, image_urls,
                item_specifics, shipping_info, seller_info, listing_details, pricing_info, full_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (item_id) DO UPDATE SET
                title = EXCLUDED.title,
                price = EXCLUDED.price,
                watch_count = EXCLUDED.watch_count,
                hit_count = EXCLUDED.hit_count,
                full_data = EXCLUDED.full_data,
                updated_at = NOW()
        ");
        
        $stmt->execute([
            $basic_info['itemId'] ?? '',
            $basic_info['title'] ?? '',
            $basic_info['subtitle'] ?? '',
            $basic_info['description'] ?? '',
            $basic_info['short_description'] ?? '',
            $pricing['current_price'] ?? 0,
            $pricing['currency'] ?? 'USD',
            $basic_info['condition'] ?? '',
            $basic_info['condition_id'] ?? '',
            $seller_info['seller_username'] ?? '',
            $basic_info['location'] ?? '',
            $basic_info['country'] ?? '',
            $basic_info['postal_code'] ?? '',
            $listing_details['listing_type'] ?? '',
            $start_time,
            $end_time,
            $listing_details['time_left'] ?? '',
            $listing_details['quantity'] ?? 0,
            $listing_details['quantity_sold'] ?? 0,
            $listing_details['watch_count'] ?? 0,
            $listing_details['hit_count'] ?? 0,
            $listing_details['bid_count'] ?? 0,
            $category_info['primary_category_id'] ?? '',
            $category_info['primary_category_name'] ?? '',
            $images['gallery_url'] ?? '',
            $detailed_data['listing_details']['view_item_url'] ?? '',
            $images['total_images'] ?? 0,
            json_encode($images['image_urls'] ?? []),
            json_encode($detailed_data['item_specifics'] ?? []),
            json_encode($detailed_data['shipping_info'] ?? []),
            json_encode($seller_info),
            json_encode($listing_details),
            json_encode($pricing),
            json_encode($detailed_data)
        ]);
        
        // 保存確認
        $stmt = $pdo->prepare("SELECT id, item_id, title, price, currency, total_images FROM my_ebay_listings WHERE item_id = ?");
        $stmt->execute([$basic_info['itemId'] ?? '']);
        $saved_record = $stmt->fetch();
        
        return [
            'success' => true,
            'message' => '自分の出品データをデータベースに保存成功',
            'item_id' => $basic_info['itemId'] ?? '',
            'saved_record_id' => $saved_record['id'] ?? '',
            'saved_title' => $saved_record['title'] ?? '',
            'saved_price' => $saved_record['price'] ?? 0,
            'saved_image_count' => $saved_record['total_images'] ?? 0,
            'data_size_bytes' => strlen(json_encode($detailed_data)),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'My listing data save failed: ' . $e->getMessage()
        ];
    }
}

?>
