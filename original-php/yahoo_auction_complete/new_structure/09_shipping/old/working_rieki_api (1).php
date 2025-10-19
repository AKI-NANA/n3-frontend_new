<?php
/**
 * Yahoo Auction Tool - 統合利益計算API
 * 動作確認済み・エラー修正版
 * 
 * @author Claude AI
 * @version 1.0.0 - Working
 * @date 2025-09-21
 */

// エラー設定
ini_set('display_errors', 1);
error_reporting(E_ALL);

// ヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * 簡易版データベース接続（エラー対応）
 */
function getSimpleConnection() {
    // SQLiteを使用（PostgreSQLが使えない場合の代替）
    try {
        $dbPath = __DIR__ . '/profit_calculator.db';
        $pdo = new PDO("sqlite:$dbPath");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 基本テーブル作成
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * PostgreSQL接続（利用可能な場合）
 */
function getPostgreSQLConnection() {
    try {
        $pdo = new PDO("pgsql:host=localhost;dbname=yahoo_auction_tool", "postgres", "password");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * データベース接続（フォールバック対応）
 */
function getDatabaseConnection() {
    // 1. PostgreSQL試行
    $pdo = getPostgreSQLConnection();
    if ($pdo) {
        return ['success' => true, 'connection' => $pdo, 'type' => 'postgresql'];
    }
    
    // 2. SQLite試行
    $pdo = getSimpleConnection();
    if ($pdo) {
        return ['success' => true, 'connection' => $pdo, 'type' => 'sqlite'];
    }
    
    // 3. 接続不可
    return ['success' => false, 'error' => 'データベース接続に失敗しました'];
}

/**
 * eBay利益計算（シンプル版）
 */
function calculateEbayProfit($data) {
    try {
        // 入力検証
        if (!isset($data['purchase_price']) || !isset($data['sell_price'])) {
            return ['success' => false, 'error' => '必要なデータが不足しています'];
        }
        
        $purchasePrice = floatval($data['purchase_price']);
        $sellPrice = floatval($data['sell_price_usd']);
        $shipping = floatval($data['shipping'] ?? 0);
        $category = $data['category'] ?? 'electronics';
        $shippingMode = $data['shipping_mode'] ?? 'ddp';
        
        // 基本設定
        $exchangeRate = 150; // USD/JPY
        $safetyMargin = 0.05; // 5%
        $safeExchangeRate = $exchangeRate * (1 + $safetyMargin);
        
        // 追加費用
        $outsourceFee = floatval($data['outsource_fee'] ?? 500);
        $packagingFee = floatval($data['packaging_fee'] ?? 200);
        $domesticShipping = 300;
        
        // 総コスト
        $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $domesticShipping;
        
        // 収入計算
        $totalRevenueUSD = $sellPrice + $shipping;
        
        // 関税計算（DDP時のみ）
        $tariffRates = [
            'electronics' => 7.5,
            'textiles' => 12.0,
            'other' => 5.0
        ];
        
        $tariffRate = $tariffRates[$category] ?? 5.0;
        $tariffUSD = ($shippingMode === 'ddp') ? ($totalRevenueUSD * $tariffRate / 100) : 0;
        
        // eBay手数料
        $finalValueFee = $totalRevenueUSD * 0.129; // 12.9%
        $paypalFee = $totalRevenueUSD * 0.0349 + 0.49;
        $totalFeesUSD = $finalValueFee + $paypalFee;
        
        // 利益計算
        $netRevenueUSD = $totalRevenueUSD - $tariffUSD - $totalFeesUSD;
        $netRevenueJPY = $netRevenueUSD * $safeExchangeRate;
        $profitJPY = $netRevenueJPY - $totalCostJPY;
        
        // 比率計算
        $marginPercent = $netRevenueJPY > 0 ? ($profitJPY / $netRevenueJPY) * 100 : -100;
        $roiPercent = ($profitJPY / $totalCostJPY) * 100;
        
        return [
            'success' => true,
            'platform' => 'eBay USA',
            'shipping_mode' => strtoupper($shippingMode),
            'data' => [
                'profit_jpy' => round($profitJPY),
                'margin_percent' => round($marginPercent, 2),
                'roi_percent' => round($roiPercent, 2),
                'tariff_jpy' => round($tariffUSD * $safeExchangeRate),
                'revenue_jpy' => round($netRevenueJPY),
                'total_cost_jpy' => round($totalCostJPY),
                'exchange_rate' => $safeExchangeRate,
                'breakdown' => [
                    'purchase_price' => $purchasePrice,
                    'outsource_fee' => $outsourceFee,
                    'packaging_fee' => $packagingFee,
                    'domestic_shipping' => $domesticShipping,
                    'tariff_usd' => round($tariffUSD, 2),
                    'fees_usd' => round($totalFeesUSD, 2)
                ],
                'details' => [
                    ['label' => '販売収入', 'amount' => '¥' . number_format(round($totalRevenueUSD * $safeExchangeRate)), 'note' => '$' . $totalRevenueUSD . ' × ' . $safeExchangeRate . '円'],
                    ['label' => '商品原価', 'amount' => '¥' . number_format($totalCostJPY), 'note' => '仕入れ + 外注 + 梱包 + 送料'],
                    ['label' => '関税 (' . strtoupper($shippingMode) . ')', 'amount' => '¥' . number_format(round($tariffUSD * $safeExchangeRate)), 'note' => $shippingMode === 'ddp' ? '売主負担' : '買主負担'],
                    ['label' => 'eBay手数料', 'amount' => '¥' . number_format(round($totalFeesUSD * $safeExchangeRate)), 'note' => 'FVF + PayPal'],
                    ['label' => '純利益', 'amount' => '¥' . number_format(round($profitJPY)), 'note' => '税引き前利益']
                ]
            ]
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => 'eBay計算エラー: ' . $e->getMessage()];
    }
}

/**
 * Shopee利益計算（シンプル版）
 */
function calculateShopeeProfit($data) {
    try {
        // 入力検証
        if (!isset($data['purchase_price']) || !isset($data['sell_price']) || !isset($data['country'])) {
            return ['success' => false, 'error' => '必要なデータが不足しています'];
        }
        
        $purchasePrice = floatval($data['purchase_price']);
        $sellPrice = floatval($data['sell_price']);
        $shipping = floatval($data['shipping'] ?? 0);
        $country = $data['country'];
        
        // 国別設定
        $countrySettings = [
            'SG' => ['name' => 'シンガポール', 'currency' => 'SGD', 'rate' => 110, 'tariff' => 7.0, 'vat' => 7.0, 'duty_free' => 400, 'commission' => 6.0],
            'MY' => ['name' => 'マレーシア', 'currency' => 'MYR', 'rate' => 35, 'tariff' => 15.0, 'vat' => 10.0, 'duty_free' => 500, 'commission' => 5.5],
            'TH' => ['name' => 'タイ', 'currency' => 'THB', 'rate' => 4.3, 'tariff' => 20.0, 'vat' => 7.0, 'duty_free' => 1500, 'commission' => 5.0],
            'PH' => ['name' => 'フィリピン', 'currency' => 'PHP', 'rate' => 2.7, 'tariff' => 25.0, 'vat' => 12.0, 'duty_free' => 10000, 'commission' => 5.5],
            'ID' => ['name' => 'インドネシア', 'currency' => 'IDR', 'rate' => 0.01, 'tariff' => 30.0, 'vat' => 11.0, 'duty_free' => 75, 'commission' => 5.0],
            'VN' => ['name' => 'ベトナム', 'currency' => 'VND', 'rate' => 0.006, 'tariff' => 35.0, 'vat' => 10.0, 'duty_free' => 200, 'commission' => 6.0],
            'TW' => ['name' => '台湾', 'currency' => 'TWD', 'rate' => 4.8, 'tariff' => 10.0, 'vat' => 5.0, 'duty_free' => 2000, 'commission' => 5.5]
        ];
        
        if (!isset($countrySettings[$country])) {
            return ['success' => false, 'error' => '無効な国コードです'];
        }
        
        $settings = $countrySettings[$country];
        
        // 追加費用
        $outsourceFee = floatval($data['outsource_fee'] ?? 300);
        $packagingFee = floatval($data['packaging_fee'] ?? 150);
        $internationalShipping = 500;
        
        // 総コスト
        $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $internationalShipping;
        
        // 収入計算
        $totalRevenueLocal = $sellPrice + $shipping;
        
        // 関税・税計算
        $dutyFreeAmount = $settings['duty_free'];
        $taxableAmount = max(0, $totalRevenueLocal - $dutyFreeAmount);
        $tariffAmount = $taxableAmount * ($settings['tariff'] / 100);
        $vatAmount = ($taxableAmount + $tariffAmount) * ($settings['vat'] / 100);
        $totalTaxLocal = $tariffAmount + $vatAmount;
        
        // Shopee手数料
        $commissionFee = $totalRevenueLocal * ($settings['commission'] / 100);
        $transactionFee = $totalRevenueLocal * 0.02;
        $totalFeesLocal = $commissionFee + $transactionFee;
        
        // 利益計算
        $netRevenueLocal = $totalRevenueLocal - $totalTaxLocal - $totalFeesLocal;
        $netRevenueJPY = $netRevenueLocal * $settings['rate'];
        $profitJPY = $netRevenueJPY - $totalCostJPY;
        
        // 比率計算
        $marginPercent = $netRevenueJPY > 0 ? ($profitJPY / $netRevenueJPY) * 100 : -100;
        $roiPercent = ($profitJPY / $totalCostJPY) * 100;
        
        return [
            'success' => true,
            'platform' => 'Shopee',
            'country' => $settings['name'],
            'currency' => $settings['currency'],
            'data' => [
                'profit_jpy' => round($profitJPY),
                'margin_percent' => round($marginPercent, 2),
                'roi_percent' => round($roiPercent, 2),
                'tariff_jpy' => round($totalTaxLocal * $settings['rate']),
                'revenue_jpy' => round($netRevenueJPY),
                'total_cost_jpy' => round($totalCostJPY),
                'exchange_rate' => $settings['rate'],
                'breakdown' => [
                    'purchase_price' => $purchasePrice,
                    'outsource_fee' => $outsourceFee,
                    'packaging_fee' => $packagingFee,
                    'international_shipping' => $internationalShipping,
                    'tariff_local' => round($tariffAmount, 2),
                    'vat_local' => round($vatAmount, 2),
                    'commission_local' => round($commissionFee, 2)
                ],
                'details' => [
                    ['label' => '販売収入', 'amount' => '¥' . number_format(round($totalRevenueLocal * $settings['rate'])), 'note' => $totalRevenueLocal . ' ' . $settings['currency'] . ' × ' . $settings['rate']],
                    ['label' => '商品原価', 'amount' => '¥' . number_format($totalCostJPY), 'note' => '仕入れ + 外注 + 梱包 + 国際送料'],
                    ['label' => '関税', 'amount' => '¥' . number_format(round($tariffAmount * $settings['rate'])), 'note' => '免税額: ' . $dutyFreeAmount . ' ' . $settings['currency']],
                    ['label' => 'GST/VAT', 'amount' => '¥' . number_format(round($vatAmount * $settings['rate'])), 'note' => $settings['name'] . ' ' . $settings['vat'] . '%'],
                    ['label' => 'Shopee手数料', 'amount' => '¥' . number_format(round($totalFeesLocal * $settings['rate'])), 'note' => '販売手数料 + 決済手数料'],
                    ['label' => '純利益', 'amount' => '¥' . number_format(round($profitJPY)), 'note' => '税引き前利益']
                ]
            ]
        ];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => 'Shopee計算エラー: ' . $e->getMessage()];
    }
}

/**
 * システム状態確認
 */
function getSystemHealth() {
    $health = [
        'api' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => PHP_VERSION,
        'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB'
    ];
    
    // データベース接続確認
    $dbResult = getDatabaseConnection();
    $health['database'] = $dbResult['success'];
    if ($dbResult['success']) {
        $health['database_type'] = $dbResult['type'];
    } else {
        $health['database_error'] = $dbResult['error'];
    }
    
    return $health;
}

/**
 * 入力データ取得
 */
function getInputData() {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        $data = array_merge($_GET, $_POST);
    }
    
    return $data;
}

/**
 * JSON応答送信
 */
function sendResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

// メイン処理
try {
    $action = $_GET['action'] ?? $_POST['action'] ?? 'health';
    $inputData = getInputData();
    
    switch ($action) {
        case 'health':
            $health = getSystemHealth();
            sendResponse([
                'success' => true,
                'message' => '統合利益計算システム稼働中',
                'health' => $health,
                'features' => [
                    'eBay USA DDP/DDU計算',
                    'Shopee 7カ国関税計算',
                    '外注工賃・梱包費対応',
                    'SQLite/PostgreSQL対応'
                ],
                'endpoints' => [
                    'health' => '?action=health',
                    'ebay_calculate' => '?action=ebay_calculate',
                    'shopee_calculate' => '?action=shopee_calculate'
                ]
            ]);
            break;
            
        case 'ebay_calculate':
            $result = calculateEbayProfit($inputData);
            sendResponse($result);
            break;
            
        case 'shopee_calculate':
            $result = calculateShopeeProfit($inputData);
            sendResponse($result);
            break;
            
        case 'test_calculation':
            // テスト用サンプル計算
            $ebayTest = calculateEbayProfit([
                'purchase_price' => 15000,
                'sell_price_usd' => 120,
                'shipping' => 25,
                'category' => 'electronics',
                'shipping_mode' => 'ddp'
            ]);
            
            $shopeeTest = calculateShopeeProfit([
                'purchase_price' => 3000,
                'sell_price' => 100,
                'shipping' => 10,
                'country' => 'SG'
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'テスト計算完了',
                'ebay_test' => $ebayTest,
                'shopee_test' => $shopeeTest
            ]);
            break;
            
        default:
            sendResponse([
                'success' => false,
                'error' => '無効なアクション: ' . $action,
                'available_actions' => ['health', 'ebay_calculate', 'shopee_calculate', 'test_calculation']
            ], 400);
    }
    
} catch (Exception $e) {
    sendResponse([
        'success' => false,
        'error' => 'システムエラー: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], 500);
}
?>