<?php
/**
 * 高度統合利益計算API - 関税・DDP/DDU対応
 * eBay USA & Shopee 7カ国完全対応
 * 
 * 機能:
 * - eBay USA DDP/DDU計算（関税込み・関税別）
 * - Shopee 7カ国関税計算（国別税制対応）
 * - 外注工賃費・梱包費・為替変動マージン
 * - 設定保存・自動計算機能
 * - 計算式表示・ロジック解析
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    switch ($action) {
        case 'ebay_usa_calculate':
            $response = calculateEbayUSA($input);
            break;
            
        case 'shopee_7countries_calculate':
            $response = calculateShopee7Countries($input);
            break;
            
        case 'save_config':
            $response = saveConfiguration($input);
            break;
            
        case 'load_config':
            $response = loadConfiguration($input);
            break;
            
        case 'get_exchange_rates':
            $response = getExchangeRates();
            break;
            
        case 'validate_data':
            $response = validateCalculationData($input);
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log('高度統合利益計算API エラー: ' . $e->getMessage());
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

/**
 * eBay USA利益計算
 */
function calculateEbayUSA($data) {
    // データ検証
    if (!validateEbayUSAData($data)) {
        throw new Exception('入力データが不正です');
    }
    
    // 基本設定
    $baseExchangeRate = getCurrentExchangeRate('USD', 'JPY');
    $safeExchangeRate = $baseExchangeRate * (1 + ($data['additional_costs']['exchange_margin'] ?? 5.0) / 100);
    
    // 総コスト計算
    $purchasePrice = $data['purchase_price'] ?? 0;
    $outsourceFee = $data['additional_costs']['outsource_fee'] ?? 0;
    $packagingFee = $data['additional_costs']['packaging_fee'] ?? 0;
    $domesticShipping = $data['additional_costs']['domestic_shipping'] ?? 500; // デフォルト500円
    $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $domesticShipping;
    
    // 収入計算
    $sellPrice = $data['sell_price'] ?? 0;
    $shipping = $data['shipping'] ?? 0;
    $revenueUSD = $sellPrice + $shipping;
    
    // 関税計算 (DDP時のみ)
    $tariffUSD = 0;
    $shippingMode = $data['shipping_mode'] ?? 'ddp';
    if ($shippingMode === 'ddp') {
        $category = $data['category'] ?? 'other';
        $tariffRate = getTariffRate('USA', $category, $data['tariff_rates'] ?? []);
        $tariffUSD = $revenueUSD * ($tariffRate / 100);
    }
    
    // eBay手数料計算
    $feeRates = getEbayFeeRates($data['category'] ?? 'other');
    $finalValueFee = $revenueUSD * ($feeRates['final_value_fee'] / 100);
    $paypalFee = $revenueUSD * 0.0349 + 0.49; // 3.49% + $0.49
    $totalFeesUSD = $finalValueFee + $paypalFee;
    
    // 利益計算
    $netRevenueUSD = $revenueUSD - $tariffUSD - $totalFeesUSD;
    $netRevenueJPY = $netRevenueUSD * $safeExchangeRate;
    $profitJPY = $netRevenueJPY - $totalCostJPY;
    
    // 比率計算
    $marginPercent = $netRevenueJPY > 0 ? ($profitJPY / $netRevenueJPY) * 100 : 0;
    $roiPercent = $totalCostJPY > 0 ? ($profitJPY / $totalCostJPY) * 100 : 0;
    
    // 詳細データ生成
    $details = [
        [
            'label' => '販売収入',
            'amount' => number_format(round($revenueUSD * $safeExchangeRate)),
            'amount_raw' => round($revenueUSD * $safeExchangeRate),
            'formula' => sprintf('$%.2f × %.2f円', $revenueUSD, $safeExchangeRate),
            'note' => '売上 + 送料'
        ],
        [
            'label' => '商品原価',
            'amount' => number_format($totalCostJPY),
            'amount_raw' => $totalCostJPY,
            'formula' => sprintf('%d + %d + %d + %d', $purchasePrice, $outsourceFee, $packagingFee, $domesticShipping),
            'note' => '仕入れ + 外注 + 梱包 + 国内送料'
        ],
        [
            'label' => '関税 (' . strtoupper($shippingMode) . ')',
            'amount' => number_format(round($tariffUSD * $safeExchangeRate)),
            'amount_raw' => round($tariffUSD * $safeExchangeRate),
            'formula' => sprintf('$%.2f × %.1f%%', $revenueUSD, $tariffRate ?? 0),
            'note' => $shippingMode === 'ddp' ? '売主負担' : '買主負担'
        ],
        [
            'label' => 'eBay手数料',
            'amount' => number_format(round($totalFeesUSD * $safeExchangeRate)),
            'amount_raw' => round($totalFeesUSD * $safeExchangeRate),
            'formula' => 'FVF + PayPal',
            'note' => sprintf('%.1f%% + 3.49%%', $feeRates['final_value_fee'])
        ],
        [
            'label' => '純利益',
            'amount' => number_format(round($profitJPY)),
            'amount_raw' => round($profitJPY),
            'formula' => '収入 - コスト - 手数料',
            'note' => '税引き前利益'
        ]
    ];
    
    return [
        'success' => true,
        'data' => [
            'platform' => 'eBay USA',
            'shipping_mode' => strtoupper($shippingMode),
            'profit_jpy' => round($profitJPY),
            'margin_percent' => round($marginPercent, 2),
            'roi_percent' => round($roiPercent, 2),
            'tariff_jpy' => round($tariffUSD * $safeExchangeRate),
            'revenue_jpy' => round($netRevenueJPY),
            'total_cost_jpy' => round($totalCostJPY),
            'exchange_rate' => $safeExchangeRate,
            'details' => $details,
            'calculation_timestamp' => date('Y-m-d H:i:s'),
            'used_rates' => [
                'base_exchange_rate' => $baseExchangeRate,
                'safe_exchange_rate' => $safeExchangeRate,
                'tariff_rate' => $tariffRate ?? 0,
                'final_value_fee_rate' => $feeRates['final_value_fee']
            ]
        ]
    ];
}

/**
 * Shopee 7カ国利益計算
 */
function calculateShopee7Countries($data) {
    // データ検証
    if (!validateShopee7CountriesData($data)) {
        throw new Exception('入力データが不正です');
    }
    
    $country = $data['country'] ?? 'SG';
    $countrySettings = getShopeeCountrySettings($country);
    
    // 為替レート取得
    $baseExchangeRate = getCurrentExchangeRate($countrySettings['currency'], 'JPY');
    $safeExchangeRate = $baseExchangeRate * (1 + ($data['additional_costs']['exchange_margin'] ?? 3.0) / 100);
    
    // 総コスト計算
    $purchasePrice = $data['purchase_price'] ?? 0;
    $outsourceFee = $data['additional_costs']['outsource_fee'] ?? 0;
    $packagingFee = $data['additional_costs']['packaging_fee'] ?? 0;
    $internationalShipping = $data['additional_costs']['international_shipping'] ?? 800; // デフォルト800円
    $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $internationalShipping;
    
    // 収入計算
    $sellPrice = $data['sell_price'] ?? 0;
    $shipping = $data['shipping'] ?? 0;
    $revenueLocal = $sellPrice + $shipping;
    
    // 関税・税計算
    $tariffSettings = $data['tariff_settings'] ?? [];
    $dutyFreeAmount = $tariffSettings['duty_free_amount'] ?? $countrySettings['duty_free_amount'];
    $taxableAmount = max(0, $revenueLocal - $dutyFreeAmount);
    
    $tariffRate = $tariffSettings['tariff_rate'] ?? $countrySettings['tariff_rate'];
    $vatRate = $tariffSettings['vat_rate'] ?? $countrySettings['vat_rate'];
    
    $tariffAmount = $taxableAmount * ($tariffRate / 100);
    $vatAmount = ($taxableAmount + $tariffAmount) * ($vatRate / 100);
    $totalTaxLocal = $tariffAmount + $vatAmount;
    
    // Shopee手数料計算
    $commissionRate = $countrySettings['commission_rate'] ?? 6.0;
    $commissionFee = $revenueLocal * ($commissionRate / 100);
    $transactionFee = $revenueLocal * 0.02; // 2%
    $totalFeesLocal = $commissionFee + $transactionFee;
    
    // 利益計算
    $netRevenueLocal = $revenueLocal - $totalTaxLocal - $totalFeesLocal;
    $netRevenueJPY = $netRevenueLocal * $safeExchangeRate;
    $profitJPY = $netRevenueJPY - $totalCostJPY;
    
    // 比率計算
    $marginPercent = $netRevenueJPY > 0 ? ($profitJPY / $netRevenueJPY) * 100 : 0;
    $roiPercent = $totalCostJPY > 0 ? ($profitJPY / $totalCostJPY) * 100 : 0;
    
    // 詳細データ生成
    $details = [
        [
            'label' => '販売収入',
            'amount' => number_format(round($revenueLocal * $safeExchangeRate)),
            'amount_raw' => round($revenueLocal * $safeExchangeRate),
            'formula' => sprintf('%.2f %s × %.2f', $revenueLocal, $countrySettings['currency'], $safeExchangeRate),
            'note' => '売上 + 送料'
        ],
        [
            'label' => '商品原価',
            'amount' => number_format($totalCostJPY),
            'amount_raw' => $totalCostJPY,
            'formula' => sprintf('%d + %d + %d + %d', $purchasePrice, $outsourceFee, $packagingFee, $internationalShipping),
            'note' => '仕入れ + 外注 + 梱包 + 国際送料'
        ],
        [
            'label' => '関税',
            'amount' => number_format(round($tariffAmount * $safeExchangeRate)),
            'amount_raw' => round($tariffAmount * $safeExchangeRate),
            'formula' => sprintf('max(0, %.2f - %.0f) × %.1f%%', $revenueLocal, $dutyFreeAmount, $tariffRate),
            'note' => sprintf('免税額: %.0f %s', $dutyFreeAmount, $countrySettings['currency'])
        ],
        [
            'label' => 'GST/VAT',
            'amount' => number_format(round($vatAmount * $safeExchangeRate)),
            'amount_raw' => round($vatAmount * $safeExchangeRate),
            'formula' => sprintf('(課税額 + 関税) × %.1f%%', $vatRate),
            'note' => sprintf('%s 標準税率', $countrySettings['name'])
        ],
        [
            'label' => 'Shopee手数料',
            'amount' => number_format(round($totalFeesLocal * $safeExchangeRate)),
            'amount_raw' => round($totalFeesLocal * $safeExchangeRate),
            'formula' => '販売手数料 + 決済手数料',
            'note' => sprintf('%.1f%% + 2%%', $commissionRate)
        ],
        [
            'label' => '純利益',
            'amount' => number_format(round($profitJPY)),
            'amount_raw' => round($profitJPY),
            'formula' => '収入 - コスト - 税金 - 手数料',
            'note' => '税引き前利益'
        ]
    ];
    
    return [
        'success' => true,
        'data' => [
            'platform' => 'Shopee',
            'country' => $countrySettings['name'],
            'currency' => $countrySettings['currency'],
            'profit_jpy' => round($profitJPY),
            'margin_percent' => round($marginPercent, 2),
            'roi_percent' => round($roiPercent, 2),
            'tariff_jpy' => round($totalTaxLocal * $safeExchangeRate),
            'revenue_jpy' => round($netRevenueJPY),
            'total_cost_jpy' => round($totalCostJPY),
            'exchange_rate' => $safeExchangeRate,
            'details' => $details,
            'calculation_timestamp' => date('Y-m-d H:i:s'),
            'used_rates' => [
                'base_exchange_rate' => $baseExchangeRate,
                'safe_exchange_rate' => $safeExchangeRate,
                'tariff_rate' => $tariffRate,
                'vat_rate' => $vatRate,
                'commission_rate' => $commissionRate
            ]
        ]
    ];
}

/**
 * 設定保存
 */
function saveConfiguration($data) {
    $configName = $data['config_name'] ?? '';
    $configData = $data['config_data'] ?? [];
    $configType = $data['config_type'] ?? '';
    
    if (empty($configName) || empty($configData)) {
        throw new Exception('設定名と設定データが必要です');
    }
    
    // 設定をファイルに保存（実際の実装では適切なストレージを使用）
    $configDir = __DIR__ . '/saved_configs/';
    if (!is_dir($configDir)) {
        mkdir($configDir, 0755, true);
    }
    
    $configFile = $configDir . 'config_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $configName) . '.json';
    
    $configStructure = [
        'name' => $configName,
        'type' => $configType,
        'data' => $configData,
        'created_at' => date('Y-m-d H:i:s'),
        'version' => '1.0.0'
    ];
    
    if (file_put_contents($configFile, json_encode($configStructure, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        return [
            'success' => true,
            'message' => "設定「{$configName}」を保存しました",
            'config_id' => basename($configFile, '.json')
        ];
    } else {
        throw new Exception('設定の保存に失敗しました');
    }
}

/**
 * 設定読込
 */
function loadConfiguration($data) {
    $configId = $data['config_id'] ?? '';
    
    if (empty($configId)) {
        throw new Exception('設定IDが必要です');
    }
    
    $configFile = __DIR__ . '/saved_configs/' . $configId . '.json';
    
    if (!file_exists($configFile)) {
        throw new Exception('指定された設定が見つかりません');
    }
    
    $configData = json_decode(file_get_contents($configFile), true);
    
    if (!$configData) {
        throw new Exception('設定データの読み込みに失敗しました');
    }
    
    return [
        'success' => true,
        'config' => $configData
    ];
}

/**
 * 現在の為替レート取得
 */
function getCurrentExchangeRate($from, $to) {
    // 実際の実装では外部APIから取得
    // ここでは固定値を返す
    $rates = [
        'USD_JPY' => 150.0,
        'SGD_JPY' => 110.0,
        'MYR_JPY' => 35.0,
        'THB_JPY' => 4.3,
        'PHP_JPY' => 2.7,
        'IDR_JPY' => 0.01,
        'VND_JPY' => 0.006,
        'TWD_JPY' => 4.8
    ];
    
    $key = strtoupper($from . '_' . $to);
    return $rates[$key] ?? 1.0;
}

/**
 * 為替レート一覧取得
 */
function getExchangeRates() {
    return [
        'success' => true,
        'rates' => [
            'USD_JPY' => getCurrentExchangeRate('USD', 'JPY'),
            'SGD_JPY' => getCurrentExchangeRate('SGD', 'JPY'),
            'MYR_JPY' => getCurrentExchangeRate('MYR', 'JPY'),
            'THB_JPY' => getCurrentExchangeRate('THB', 'JPY'),
            'PHP_JPY' => getCurrentExchangeRate('PHP', 'JPY'),
            'IDR_JPY' => getCurrentExchangeRate('IDR', 'JPY'),
            'VND_JPY' => getCurrentExchangeRate('VND', 'JPY'),
            'TWD_JPY' => getCurrentExchangeRate('TWD', 'JPY')
        ],
        'last_updated' => date('Y-m-d H:i:s')
    ];
}

/**
 * 関税率取得
 */
function getTariffRate($country, $category, $customRates = []) {
    // カスタム関税率が指定されている場合
    if (!empty($customRates[$category])) {
        return $customRates[$category];
    }
    
    // デフォルト関税率
    $defaultRates = [
        'USA' => [
            'electronics' => 7.5,
            'textiles' => 12.0,
            'other' => 5.0
        ]
    ];
    
    return $defaultRates[$country][$category] ?? $defaultRates[$country]['other'] ?? 5.0;
}

/**
 * eBay手数料率取得
 */
function getEbayFeeRates($category) {
    $feeRates = [
        'electronics' => ['final_value_fee' => 12.9],
        'textiles' => ['final_value_fee' => 13.25],
        'other' => ['final_value_fee' => 13.25]
    ];
    
    return $feeRates[$category] ?? $feeRates['other'];
}

/**
 * Shopee国別設定取得
 */
function getShopeeCountrySettings($countryCode) {
    $settings = [
        'SG' => [
            'name' => 'シンガポール',
            'currency' => 'SGD',
            'tariff_rate' => 7.0,
            'vat_rate' => 7.0,
            'duty_free_amount' => 400,
            'commission_rate' => 6.0
        ],
        'MY' => [
            'name' => 'マレーシア',
            'currency' => 'MYR',
            'tariff_rate' => 15.0,
            'vat_rate' => 10.0,
            'duty_free_amount' => 500,
            'commission_rate' => 5.5
        ],
        'TH' => [
            'name' => 'タイ',
            'currency' => 'THB',
            'tariff_rate' => 20.0,
            'vat_rate' => 7.0,
            'duty_free_amount' => 1500,
            'commission_rate' => 5.0
        ],
        'PH' => [
            'name' => 'フィリピン',
            'currency' => 'PHP',
            'tariff_rate' => 25.0,
            'vat_rate' => 12.0,
            'duty_free_amount' => 10000,
            'commission_rate' => 5.5
        ],
        'ID' => [
            'name' => 'インドネシア',
            'currency' => 'IDR',
            'tariff_rate' => 30.0,
            'vat_rate' => 11.0,
            'duty_free_amount' => 75,
            'commission_rate' => 5.0
        ],
        'VN' => [
            'name' => 'ベトナム',
            'currency' => 'VND',
            'tariff_rate' => 35.0,
            'vat_rate' => 10.0,
            'duty_free_amount' => 200,
            'commission_rate' => 6.0
        ],
        'TW' => [
            'name' => '台湾',
            'currency' => 'TWD',
            'tariff_rate' => 10.0,
            'vat_rate' => 5.0,
            'duty_free_amount' => 2000,
            'commission_rate' => 5.5
        ]
    ];
    
    return $settings[$countryCode] ?? $settings['SG'];
}

/**
 * eBay USAデータ検証
 */
function validateEbayUSAData($data) {
    if (empty($data['item_title'])) {
        throw new Exception('商品タイトルが必要です');
    }
    
    if (!isset($data['purchase_price']) || $data['purchase_price'] <= 0) {
        throw new Exception('有効な仕入れ価格が必要です');
    }
    
    if (!isset($data['sell_price']) || $data['sell_price'] <= 0) {
        throw new Exception('有効な販売価格が必要です');
    }
    
    return true;
}

/**
 * Shopee 7カ国データ検証
 */
function validateShopee7CountriesData($data) {
    if (empty($data['item_title'])) {
        throw new Exception('商品タイトルが必要です');
    }
    
    if (!isset($data['purchase_price']) || $data['purchase_price'] <= 0) {
        throw new Exception('有効な仕入れ価格が必要です');
    }
    
    if (!isset($data['sell_price']) || $data['sell_price'] <= 0) {
        throw new Exception('有効な販売価格が必要です');
    }
    
    if (empty($data['country'])) {
        throw new Exception('販売国の選択が必要です');
    }
    
    return true;
}

/**
 * 計算データ検証
 */
function validateCalculationData($data) {
    $errors = [];
    
    // 基本データ検証
    if (empty($data['type'])) {
        $errors[] = '計算タイプが指定されていません';
    } elseif ($data['type'] === 'ebay_usa') {
        try {
            validateEbayUSAData($data);
        } catch (Exception $e) {
            $errors[] = $e->getMessage();
        }
    } elseif ($data['type'] === 'shopee_7countries') {
        try {
            validateShopee7CountriesData($data);
        } catch (Exception $e) {
            $errors[] = $e->getMessage();
        }
    }
    
    return [
        'success' => empty($errors),
        'errors' => $errors,
        'message' => empty($errors) ? 'データ検証完了' : 'データ検証エラー'
    ];
}

?>
