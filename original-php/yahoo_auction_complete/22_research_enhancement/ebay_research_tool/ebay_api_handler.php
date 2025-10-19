<?php
// error_reporting(E_ALL);
// ini_set('display_errors', 1);

define('EBAY_API_KEY', 'YOUR_EBAY_API_KEY_HERE');
define('EBAY_BASE_URL', 'https://api.ebay.com/buy/browse/v1/');
define('EBAY_AUTH_TOKEN', 'YOUR_EBAY_AUTH_TOKEN_HERE');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

function sendJsonResponse($data, $success = true, $message = '') {
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message]);
    exit;
}

// データベース接続関数
function getDatabaseConnection() {
    $db = new PDO('pgsql:host=localhost;dbname=your_database_name', 'your_username', 'your_password');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    return $db;
}

try {
    $action = $_POST['action'] ?? $_GET['action'] ?? '';
    
    switch ($action) {
        case 'search_products':
            $query = $_POST['query'] ?? '';
            $filters = json_decode($_POST['filters'] ?? '{}', true);
            $results = searchEbayProducts($query, $filters);
            sendJsonResponse($results);
            break;

        case 'get_seller_items':
            $sellerUrl = $_POST['seller_url'] ?? '';
            $results = getSellerItems($sellerUrl);
            sendJsonResponse($results);
            break;
            
        case 'save_profitable_seller':
            $sellerData = json_decode($_POST['seller_data'] ?? '{}', true);
            saveProfitableSeller($sellerData);
            sendJsonResponse(null, true, 'セラー情報を保存しました');
            break;

        default:
            sendJsonResponse(null, false, '不明なアクションです。');
    }
} catch (Exception $e) {
    sendJsonResponse(null, false, $e->getMessage());
}

function searchEbayProducts($query, $filters) {
    if (empty($query)) {
        throw new Exception('検索キーワードを入力してください。');
    }
    
    // API呼び出しのためのURLを構築
    $url = EBAY_BASE_URL . 'item_summary/search?q=' . urlencode($query);
    
    // フィルターを追加
    if (!empty($filters['condition'])) {
        $url .= '&filter=condition:[' . $filters['condition'] . ']';
    }
    if (!empty($filters['price_min']) && !empty($filters['price_max'])) {
        $url .= '&filter=price:[' . $filters['price_min'] . '..'.$filters['price_max'].']';
    }
    // ここに他のフィルター（セラーの国など）を追加します
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Authorization: Bearer ' . EBAY_AUTH_TOKEN,
        'X-EBAY-C-MARKETPLACE-ID: EBAY_US', // 例: 米国市場
        'Content-Type: application/json'
    ));

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        throw new Exception('cURLエラー: ' . curl_error($ch));
    }
    curl_close($ch);
    
    $responseData = json_decode($response, true);
    if (empty($responseData['itemSummaries'])) {
        return ['items' => []];
    }
    
    $db = getDatabaseConnection();
    $stmt = $db->prepare("INSERT INTO ebay_research_cache (item_id, title, current_price, currency, condition, seller_country, estimated_profit_jpy, estimated_profit_rate, profit_score, is_profitable, is_currently_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (item_id) DO UPDATE SET title=EXCLUDED.title, current_price=EXCLUDED.current_price, estimated_profit_jpy=EXCLUDED.estimated_profit_jpy");

    $items = [];
    foreach ($responseData['itemSummaries'] as $item) {
        // 簡易利益計算とスコアリング
        $ebay_price = $item['price']['value'] ?? 0;
        $profit_jpy = calculateProfit($ebay_price, $item['seller']['country']);
        $profit_rate = calculateProfitRate($ebay_price, $profit_jpy);
        $profit_score = calculateProfitScore($profit_jpy, $profit_rate, $item['buyingOptions'][0]);
        $is_profitable = $profit_jpy > 500; // 500円以上で利益ありと判断

        $items[] = [
            'item' => $item,
            'analysis' => [
                'estimated_profit_jpy' => $profit_jpy,
                'estimated_profit_rate' => $profit_rate,
                'profit_score' => $profit_score,
                'is_profitable' => $is_profitable,
                'is_currently_available' => in_array('BUY_IT_NOW', $item['buyingOptions'])
            ]
        ];

        // データベースに保存
        $stmt->execute([
            $item['itemId'],
            $item['title'],
            $item['price']['value'],
            $item['price']['currency'],
            $item['condition'],
            $item['seller']['country'],
            $profit_jpy,
            $profit_rate,
            $profit_score,
            $is_profitable,
            in_array('BUY_IT_NOW', $item['buyingOptions'])
        ]);
    }

    // スコアの高い順に並び替え
    usort($items, function($a, $b) {
        return $b['analysis']['profit_score'] - $a['analysis']['profit_score'];
    });

    return $items;
}

// 簡易利益計算ロジック
function calculateProfit($ebayPrice, $sellerCountry) {
    if ($sellerCountry == 'JP') {
        return -1; // 日本セラーの利益は計算しない
    }
    $exchange_rate = 150; // 固定値
    $item_cost_jpy = $ebayPrice * 0.7 * $exchange_rate; // ヤフオク価格をeBay価格の70%と仮定
    $total_fees_jpy = $ebayPrice * 0.17 * $exchange_rate; // 手数料計17%と仮定
    $shipping_jpy = 2000; // 固定送料
    return ($ebayPrice * $exchange_rate) - ($item_cost_jpy + $total_fees_jpy + $shipping_jpy);
}

// 利益率計算ロジック
function calculateProfitRate($ebayPrice, $profit) {
    if ($ebayPrice <= 0) return 0;
    $exchange_rate = 150;
    return ($profit / ($ebayPrice * $exchange_rate)) * 100;
}

// スコアリングロジック
function calculateProfitScore($profit_jpy, $profit_rate, $buyingOptions) {
    $score = 0;
    if ($profit_jpy > 0) {
        $score += min($profit_jpy / 50, 50); // 利益額で最大50点
        $score += min($profit_rate / 2, 30);  // 利益率で最大30点
    }
    if (in_array('BUY_IT_NOW', $buyingOptions)) {
        $score += 20; // 即決商品にボーナス20点
    }
    return $score;
}

function getSellerItems($sellerUrl) {
    // セラーの販売アイテムを取得するAPI呼び出しロジック
    // （未実装、今後の拡張で）
    return ['items' => []];
}

function saveProfitableSeller($sellerData) {
    $db = getDatabaseConnection();
    $stmt = $db->prepare("INSERT INTO profitable_sellers (seller_id, username, seller_url, country, positive_feedback_rate) VALUES (?, ?, ?, ?, ?) ON CONFLICT (seller_id) DO NOTHING");
    $stmt->execute([
        $sellerData['seller_id'],
        $sellerData['username'],
        $sellerData['seller_url'],
        $sellerData['country'],
        $sellerData['positive_feedback_rate']
    ]);
}
?>