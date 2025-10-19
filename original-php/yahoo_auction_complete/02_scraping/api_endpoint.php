<?php
/**
 * ハイブリッド価格計算API - Gemini推奨方式
 * マスターデータ（円）+ キャッシュ（ドル）+ 動的計算
 */

header('Content-Type: application/json; charset=utf-8');

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("価格計算API: データベース接続失敗: " . $e->getMessage());
        return null;
    }
}

// 最新為替レート取得
function getCurrentExchangeRate($from = 'JPY', $to = 'USD') {
    $pdo = getDatabaseConnection();
    if (!$pdo) return 150.0; // フォールバック
    
    try {
        $sql = "SELECT rate FROM exchange_rates 
                WHERE currency_from = ? AND currency_to = ? AND is_active = true 
                ORDER BY recorded_at DESC 
                LIMIT 1";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$from, $to]);
        $result = $stmt->fetch();
        
        return $result ? (float)$result['rate'] : 150.0; // デフォルト150円/ドル
    } catch (Exception $e) {
        error_log("為替レート取得エラー: " . $e->getMessage());
        return 150.0;
    }
}

// 基本価格換算（キャッシュ用）
function calculateBasicUSDPrice($price_jpy, $exchange_rate = null) {
    $rate = $exchange_rate ?? getCurrentExchangeRate();
    return round($price_jpy / $rate, 2);
}

// 送料計算
function calculateShippingCost($price_jpy, $destination = 'US') {
    // 送料計算ロジック（簡易版）
    $shipping_rates = [
        'domestic_jpy' => 500,  // 国内送料
        'international_base' => 1200, // 国際送料ベース
        'international_rate' => 0.02  // 商品価格の2%
    ];
    
    $domestic_shipping = $shipping_rates['domestic_jpy'];
    $international_shipping = $shipping_rates['international_base'] + ($price_jpy * $shipping_rates['international_rate']);
    
    return [
        'domestic_jpy' => $domestic_shipping,
        'international_jpy' => (int)$international_shipping,
        'total_shipping_jpy' => $domestic_shipping + (int)$international_shipping
    ];
}

// 最終出品価格計算（送料・利益込み）
function calculateFinalListingPrice($price_jpy, $options = []) {
    $defaults = [
        'profit_margin' => 20.0,  // 利益率20%
        'ebay_fee_rate' => 10.0,  // eBay手数料10%
        'paypal_fee_rate' => 3.0, // PayPal手数料3%
        'exchange_rate' => null,
        'destination' => 'US'
    ];
    
    $opts = array_merge($defaults, $options);
    $exchange_rate = $opts['exchange_rate'] ?? getCurrentExchangeRate();
    
    // 1. 送料計算
    $shipping = calculateShippingCost($price_jpy, $opts['destination']);
    $total_cost_jpy = $price_jpy + $shipping['total_shipping_jpy'];
    
    // 2. ドル換算
    $cost_usd = $total_cost_jpy / $exchange_rate;
    
    // 3. 手数料を考慮した価格計算
    $total_fee_rate = $opts['ebay_fee_rate'] + $opts['paypal_fee_rate']; // 13%
    $markup_rate = $opts['profit_margin']; // 20%
    
    // 手数料と利益を考慮した最終価格
    $base_multiplier = (100 + $markup_rate) / (100 - $total_fee_rate);
    $final_price_usd = round($cost_usd * $base_multiplier, 2);
    
    return [
        'calculation_steps' => [
            'original_price_jpy' => $price_jpy,
            'shipping_cost_jpy' => $shipping['total_shipping_jpy'],
            'total_cost_jpy' => $total_cost_jpy,
            'exchange_rate' => $exchange_rate,
            'cost_usd' => round($cost_usd, 2),
            'fee_rate_percent' => $total_fee_rate,
            'profit_margin_percent' => $markup_rate,
            'markup_multiplier' => round($base_multiplier, 4)
        ],
        'shipping_breakdown' => $shipping,
        'final_price_usd' => $final_price_usd,
        'profit_usd' => round($final_price_usd - $cost_usd, 2),
        'calculated_at' => date('Y-m-d H:i:s'),
        'rate_source' => 'database'
    ];
}

// 商品価格キャッシュ更新
function updatePriceCache($product_id, $cached_price_usd, $exchange_rate) {
    $pdo = getDatabaseConnection();
    if (!$pdo) return false;
    
    try {
        $sql = "UPDATE yahoo_scraped_products 
                SET cached_price_usd = ?,
                    cache_rate = ?,
                    cache_updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute([$cached_price_usd, $exchange_rate, $product_id]);
    } catch (Exception $e) {
        error_log("価格キャッシュ更新エラー: " . $e->getMessage());
        return false;
    }
}

// 複数商品の価格キャッシュ一括更新
function batchUpdatePriceCache($limit = 100) {
    $pdo = getDatabaseConnection();
    if (!$pdo) return 0;
    
    try {
        $current_rate = getCurrentExchangeRate();
        
        // キャッシュが古い商品を取得
        $sql = "SELECT id, price_jpy 
                FROM yahoo_scraped_products 
                WHERE price_jpy > 0 AND (
                    cached_price_usd IS NULL OR 
                    cache_updated_at < NOW() - INTERVAL '1 day'
                )
                LIMIT ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $updated_count = 0;
        foreach ($products as $product) {
            $cached_usd = calculateBasicUSDPrice($product['price_jpy'], $current_rate);
            if (updatePriceCache($product['id'], $cached_usd, $current_rate)) {
                $updated_count++;
            }
        }
        
        return $updated_count;
    } catch (Exception $e) {
        error_log("一括価格キャッシュ更新エラー: " . $e->getMessage());
        return 0;
    }
}

// API エンドポイント処理
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'get_current_rate':
        $from = $_GET['from'] ?? 'JPY';
        $to = $_GET['to'] ?? 'USD';
        $rate = getCurrentExchangeRate($from, $to);
        
        echo json_encode([
            'success' => true,
            'rate' => $rate,
            'currency_pair' => "{$from}/{$to}",
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'calculate_basic_price':
        $price_jpy = (int)($_GET['price_jpy'] ?? 0);
        
        if ($price_jpy <= 0) {
            echo json_encode([
                'success' => false,
                'error' => '有効な円価格を指定してください'
            ]);
            break;
        }
        
        $rate = getCurrentExchangeRate();
        $usd_price = calculateBasicUSDPrice($price_jpy, $rate);
        
        echo json_encode([
            'success' => true,
            'price_jpy' => $price_jpy,
            'price_usd' => $usd_price,
            'exchange_rate' => $rate,
            'calculation_type' => 'basic',
            'calculated_at' => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'calculate_final_price':
        $price_jpy = (int)($_GET['price_jpy'] ?? $_POST['price_jpy'] ?? 0);
        $options = [
            'profit_margin' => (float)($_GET['profit_margin'] ?? $_POST['profit_margin'] ?? 20.0),
            'destination' => $_GET['destination'] ?? $_POST['destination'] ?? 'US'
        ];
        
        if ($price_jpy <= 0) {
            echo json_encode([
                'success' => false,
                'error' => '有効な円価格を指定してください'
            ]);
            break;
        }
        
        $calculation = calculateFinalListingPrice($price_jpy, $options);
        
        echo json_encode([
            'success' => true,
            'input' => [
                'price_jpy' => $price_jpy,
                'options' => $options
            ],
            'result' => $calculation
        ]);
        break;
        
    case 'update_cache':
        $product_id = (int)($_POST['product_id'] ?? 0);
        $force_update = $_POST['force_update'] ?? false;
        
        if ($product_id <= 0) {
            echo json_encode([
                'success' => false,
                'error' => '有効な商品IDを指定してください'
            ]);
            break;
        }
        
        // 商品データ取得
        $pdo = getDatabaseConnection();
        $sql = "SELECT price_jpy FROM yahoo_scraped_products WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$product_id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            echo json_encode([
                'success' => false,
                'error' => '商品が見つかりません'
            ]);
            break;
        }
        
        $rate = getCurrentExchangeRate();
        $cached_usd = calculateBasicUSDPrice($product['price_jpy'], $rate);
        $updated = updatePriceCache($product_id, $cached_usd, $rate);
        
        echo json_encode([
            'success' => $updated,
            'product_id' => $product_id,
            'cached_price_usd' => $cached_usd,
            'exchange_rate' => $rate,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'batch_update_cache':
        $limit = (int)($_POST['limit'] ?? 100);
        $updated_count = batchUpdatePriceCache($limit);
        
        echo json_encode([
            'success' => true,
            'updated_count' => $updated_count,
            'limit' => $limit,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        break;
        
    case 'price_statistics':
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            echo json_encode(['success' => false, 'error' => 'データベース接続失敗']);
            break;
        }
        
        $sql = "SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN cached_price_usd IS NOT NULL THEN 1 END) as cached_products,
                    COUNT(CASE WHEN final_listing_price_usd IS NOT NULL THEN 1 END) as final_priced_products,
                    AVG(price_jpy) as avg_price_jpy,
                    AVG(cached_price_usd) as avg_cached_usd,
                    MIN(price_jpy) as min_price_jpy,
                    MAX(price_jpy) as max_price_jpy
                FROM yahoo_scraped_products
                WHERE price_jpy > 0";
        
        $stmt = $pdo->query($sql);
        $stats = $stmt->fetch();
        
        echo json_encode([
            'success' => true,
            'statistics' => $stats,
            'current_exchange_rate' => getCurrentExchangeRate(),
            'generated_at' => date('Y-m-d H:i:s')
        ]);
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'error' => '不明なアクション',
            'available_actions' => [
                'get_current_rate',
                'calculate_basic_price',
                'calculate_final_price',
                'update_cache',
                'batch_update_cache',
                'price_statistics'
            ]
        ]);
}
?>
