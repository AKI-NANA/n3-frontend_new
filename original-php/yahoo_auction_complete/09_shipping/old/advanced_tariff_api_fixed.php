<?php
/**
 * 高度統合利益計算API - 関税・DDP/DDU対応（データベース不要版）
 * eBay USA & Shopee 7カ国完全対応
 * 
 * 機能:
 * - eBay USA DDP/DDU計算（関税込み・関税別）
 * - Shopee 7カ国関税計算（国別税制対応）
 * - 外注工賃費・梱包費・為替変動マージン
 * - 設定保存・自動計算機能（ローカルストレージ）
 * - 計算式表示・ロジック解析
 * 
 * @author Claude AI
 * @version 4.1.0
 * @date 2025-09-22
 */

// エラーレポートの設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエストの処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * データベース接続（オプション）
 */
function getDatabaseConnection() {
    // 既存のnagano3_dbを試す
    $configs = [
        [
            'host' => 'localhost',
            'dbname' => 'nagano3_db',
            'username' => 'postgres',
            'password' => 'Kn240914'
        ],
        [
            'host' => 'localhost',
            'dbname' => 'yahoo_auction_tool',
            'username' => 'postgres',
            'password' => 'password'
        ]
    ];
    
    foreach ($configs as $config) {
        try {
            $pdo = new PDO(
                "pgsql:host={$config['host']};dbname={$config['dbname']}", 
                $config['username'], 
                $config['password'], 
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
            return $pdo;
        } catch (PDOException $e) {
            continue; // 次の設定を試す
        }
    }
    
    return null; // データベース接続失敗
}

/**
 * eBay USA 高度利益計算クラス
 */
class EbayUSAAdvancedCalculator {
    private $pdo;
    
    public function __construct($pdo = null) {
        $this->pdo = $pdo;
    }
    
    /**
     * DDP/DDU対応利益計算
     */
    public function calculateAdvancedProfit($data) {
        try {
            $validation = $this->validateData($data);
            if (!$validation['valid']) {
                return ['success' => false, 'error' => $validation['message']];
            }
            
            // 基本計算
            $calculation = $this->performAdvancedCalculation($data);
            
            // 計算履歴保存（データベースがある場合のみ）
            if ($this->pdo) {
                $this->saveCalculationHistory($data, $calculation);
            }
            
            return [
                'success' => true,
                'platform' => 'eBay USA',
                'shipping_mode' => strtoupper($data['shipping_mode']),
                'calculation_formula' => $this->generateCalculationFormula($data),
                'data' => $calculation,
                'database_used' => $this->pdo ? true : false,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'eBay USA計算エラー: ' . $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * 高度計算実行
     */
    private function performAdvancedCalculation($data) {
        // 1. 基本為替レート取得
        $baseExchangeRate = $this->getExchangeRate('USD', 'JPY');
        $exchangeMargin = floatval($data['additional_costs']['exchange_margin'] ?? 5.0) / 100;
        $safeExchangeRate = $baseExchangeRate * (1 + $exchangeMargin);
        
        // 2. 総コスト計算
        $purchasePrice = floatval($data['purchase_price'] ?? 0);
        $outsourceFee = floatval($data['additional_costs']['outsource_fee'] ?? 500);
        $packagingFee = floatval($data['additional_costs']['packaging_fee'] ?? 200);
        $domesticShipping = 300; // 国内送料（固定）
        $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $domesticShipping;
        
        // 3. 収入計算
        $sellPriceUSD = floatval($data['sell_price'] ?? 0);
        $shippingUSD = floatval($data['shipping'] ?? 25);
        $totalRevenueUSD = $sellPriceUSD + $shippingUSD;
        
        // 4. 関税計算（DDP/DDU分岐）
        $tariffUSD = 0;
        $tariffNote = '';
        
        if (($data['shipping_mode'] ?? 'ddp') === 'ddp') {
            $category = $data['category'] ?? 'electronics';
            $tariffRate = $this->getTariffRate($category, $data['tariff_rates'] ?? []);
            $tariffUSD = $totalRevenueUSD * ($tariffRate / 100);
            $tariffNote = "DDP: 売主負担 ({$tariffRate}%)";
        } else {
            $tariffNote = "DDU: 買主負担";
        }
        
        // 5. eBay手数料計算
        $finalValueFeeRate = $this->getEbayFeeRate($data['category'] ?? 'electronics');
        $finalValueFee = $totalRevenueUSD * $finalValueFeeRate;
        $paypalFee = $totalRevenueUSD * 0.0349 + 0.49; // PayPal手数料
        $internationalFee = $totalRevenueUSD * 0.015; // 国際取引手数料
        $totalFeesUSD = $finalValueFee + $paypalFee + $internationalFee;
        
        // 6. 利益計算
        $netRevenueUSD = $totalRevenueUSD - $tariffUSD - $totalFeesUSD;
        $netRevenueJPY = $netRevenueUSD * $safeExchangeRate;
        $profitJPY = $netRevenueJPY - $totalCostJPY;
        
        // 7. 比率計算
        $marginPercent = $netRevenueJPY > 0 ? ($profitJPY / $netRevenueJPY) * 100 : -100;
        $roiPercent = $totalCostJPY > 0 ? ($profitJPY / $totalCostJPY) * 100 : 0;
        
        return [
            'profit_jpy' => round($profitJPY, 0),
            'profit_usd' => round($profitJPY / $safeExchangeRate, 2),
            'margin_percent' => round($marginPercent, 2),
            'roi_percent' => round($roiPercent, 2),
            'revenue_jpy' => round($netRevenueJPY, 0),
            'revenue_usd' => round($netRevenueUSD, 2),
            'total_cost_jpy' => round($totalCostJPY, 0),
            'tariff_jpy' => round($tariffUSD * $safeExchangeRate, 0),
            'tariff_usd' => round($tariffUSD, 2),
            'fees_jpy' => round($totalFeesUSD * $safeExchangeRate, 0),
            'fees_usd' => round($totalFeesUSD, 2),
            'exchange_rate' => $safeExchangeRate,
            'exchange_rate_base' => $baseExchangeRate,
            'exchange_margin' => $exchangeMargin * 100,
            'breakdown' => [
                'purchase_price' => $purchasePrice,
                'outsource_fee' => $outsourceFee,
                'packaging_fee' => $packagingFee,
                'domestic_shipping' => $domesticShipping,
                'final_value_fee' => round($finalValueFee, 2),
                'paypal_fee' => round($paypalFee, 2),
                'international_fee' => round($internationalFee, 2),
                'tariff_rate_percent' => ($data['shipping_mode'] ?? 'ddp') === 'ddp' ? $this->getTariffRate($data['category'] ?? 'electronics', $data['tariff_rates'] ?? []) : 0
            ],
            'details' => [
                ['label' => '販売収入', 'amount' => '¥' . number_format(round($totalRevenueUSD * $safeExchangeRate, 0)), 'formula' => '$' . $totalRevenueUSD . ' × ' . round($safeExchangeRate, 2) . '円', 'note' => '売上 + 送料'],
                ['label' => '商品原価', 'amount' => '¥' . number_format($totalCostJPY, 0), 'formula' => $purchasePrice . ' + ' . $outsourceFee . ' + ' . $packagingFee . ' + ' . $domesticShipping, 'note' => '仕入れ + 外注 + 梱包 + 国内送料'],
                ['label' => '関税', 'amount' => '¥' . number_format(round($tariffUSD * $safeExchangeRate, 0)), 'formula' => '$' . round($tariffUSD, 2) . ' × ' . round($safeExchangeRate, 2), 'note' => $tariffNote],
                ['label' => 'eBay手数料', 'amount' => '¥' . number_format(round($totalFeesUSD * $safeExchangeRate, 0)), 'formula' => 'FVF + PayPal + 国際取引', 'note' => 'Final Value Fee + 決済手数料'],
                ['label' => '純利益', 'amount' => '¥' . number_format(round($profitJPY, 0)), 'formula' => '収入 - コスト - 関税 - 手数料', 'note' => '税引き前利益']
            ]
        ];
    }
    
    /**
     * 関税率取得
     */
    private function getTariffRate($category, $tariffRates) {
        $rates = [
            'electronics' => floatval($tariffRates['electronics'] ?? 7.5),
            'textiles' => floatval($tariffRates['textiles'] ?? 12.0),
            'other' => floatval($tariffRates['other'] ?? 5.0)
        ];
        
        return $rates[$category] ?? $rates['other'];
    }
    
    /**
     * eBay手数料率取得
     */
    private function getEbayFeeRate($category) {
        $rates = [
            'electronics' => 0.129,   // 12.9%
            'textiles' => 0.135,      // 13.5%
            'other' => 0.129          // 12.9%
        ];
        
        return $rates[$category] ?? $rates['other'];
    }
    
    /**
     * 為替レート取得
     */
    private function getExchangeRate($from, $to) {
        if ($this->pdo) {
            try {
                $stmt = $this->pdo->prepare("
                    SELECT calculated_rate 
                    FROM exchange_rates 
                    WHERE currency_from = ? AND currency_to = ?
                    ORDER BY recorded_at DESC 
                    LIMIT 1
                ");
                $stmt->execute([$from, $to]);
                $rate = $stmt->fetch();
                
                if ($rate) {
                    return floatval($rate['calculated_rate']);
                }
            } catch (Exception $e) {
                // データベースエラーの場合、デフォルト値を使用
            }
        }
        
        // デフォルト為替レート
        $defaultRates = [
            'USD_JPY' => 150.0,
            'EUR_JPY' => 165.0,
            'GBP_JPY' => 185.0
        ];
        
        return $defaultRates["{$from}_{$to}"] ?? 150.0;
    }
    
    /**
     * 計算式生成
     */
    private function generateCalculationFormula($data) {
        $mode = strtoupper($data['shipping_mode'] ?? 'DDP');
        
        return [
            'title' => "eBay USA {$mode} 計算式",
            'steps' => [
                '1. 総コスト = 仕入れ価格 + 外注工賃 + 梱包費 + 国内送料',
                '2. 安全為替レート = 基本レート × (1 + 為替マージン%)',
                '3. 収入総額 = 販売価格 + 送料',
                $mode === 'DDP' ? '4. 関税額 = 収入総額 × 関税率% (売主負担)' : '4. 関税額 = 0 (買主負担)',
                '5. eBay手数料 = FVF + PayPal + 国際取引手数料',
                '6. 純利益 = (収入総額 - 関税 - 手数料) × 安全為替レート - 総コスト'
            ]
        ];
    }
    
    /**
     * データ検証
     */
    private function validateData($data) {
        if (empty($data['item_title'])) {
            return ['valid' => false, 'message' => '商品タイトルが必要です'];
        }
        if (!isset($data['purchase_price']) || $data['purchase_price'] <= 0) {
            return ['valid' => false, 'message' => '仕入れ価格が必要です'];
        }
        if (!isset($data['sell_price']) || $data['sell_price'] <= 0) {
            return ['valid' => false, 'message' => '販売価格が必要です'];
        }
        if (!in_array($data['shipping_mode'] ?? '', ['ddp', 'ddu'])) {
            return ['valid' => false, 'message' => '配送モード(DDP/DDU)を選択してください'];
        }
        return ['valid' => true];
    }
    
    /**
     * 計算履歴保存
     */
    private function saveCalculationHistory($inputData, $result) {
        if (!$this->pdo) return;
        
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO advanced_profit_calculations 
                (platform, shipping_mode, item_title, purchase_price_jpy, sell_price_usd, 
                 calculated_profit_jpy, margin_percent, roi_percent, tariff_jpy, 
                 outsource_fee, packaging_fee, exchange_margin, calculated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                'eBay USA',
                strtoupper($inputData['shipping_mode']),
                $inputData['item_title'],
                $inputData['purchase_price'],
                $inputData['sell_price'],
                $result['profit_jpy'],
                $result['margin_percent'],
                $result['roi_percent'],
                $result['tariff_jpy'],
                $inputData['additional_costs']['outsource_fee'] ?? 500,
                $inputData['additional_costs']['packaging_fee'] ?? 200,
                $inputData['additional_costs']['exchange_margin'] ?? 5.0
            ]);
        } catch (Exception $e) {
            error_log("計算履歴保存エラー: " . $e->getMessage());
        }
    }
}

/**
 * Shopee 7カ国高度利益計算クラス
 */
class Shopee7CountriesAdvancedCalculator {
    private $pdo;
    private $countrySettings;
    
    public function __construct($pdo = null) {
        $this->pdo = $pdo;
        $this->initializeCountrySettings();
    }
    
    /**
     * 国別設定初期化
     */
    private function initializeCountrySettings() {
        $this->countrySettings = [
            'SG' => [
                'name' => 'シンガポール',
                'currency' => 'SGD',
                'base_exchange_rate' => 110,
                'default_tariff_rate' => 7.0,
                'default_vat_rate' => 7.0,
                'default_duty_free' => 400,
                'commission_rate' => 6.0,
                'transaction_fee' => 2.0
            ],
            'MY' => [
                'name' => 'マレーシア',
                'currency' => 'MYR',
                'base_exchange_rate' => 35,
                'default_tariff_rate' => 15.0,
                'default_vat_rate' => 10.0,
                'default_duty_free' => 500,
                'commission_rate' => 5.5,
                'transaction_fee' => 2.0
            ],
            'TH' => [
                'name' => 'タイ',
                'currency' => 'THB',
                'base_exchange_rate' => 4.3,
                'default_tariff_rate' => 20.0,
                'default_vat_rate' => 7.0,
                'default_duty_free' => 1500,
                'commission_rate' => 5.0,
                'transaction_fee' => 2.0
            ],
            'PH' => [
                'name' => 'フィリピン',
                'currency' => 'PHP',
                'base_exchange_rate' => 2.7,
                'default_tariff_rate' => 25.0,
                'default_vat_rate' => 12.0,
                'default_duty_free' => 10000,
                'commission_rate' => 5.5,
                'transaction_fee' => 2.0
            ],
            'ID' => [
                'name' => 'インドネシア',
                'currency' => 'IDR',
                'base_exchange_rate' => 0.01,
                'default_tariff_rate' => 30.0,
                'default_vat_rate' => 11.0,
                'default_duty_free' => 75,
                'commission_rate' => 5.0,
                'transaction_fee' => 2.0
            ],
            'VN' => [
                'name' => 'ベトナム',
                'currency' => 'VND',
                'base_exchange_rate' => 0.006,
                'default_tariff_rate' => 35.0,
                'default_vat_rate' => 10.0,
                'default_duty_free' => 200,
                'commission_rate' => 6.0,
                'transaction_fee' => 2.0
            ],
            'TW' => [
                'name' => '台湾',
                'currency' => 'TWD',
                'base_exchange_rate' => 4.8,
                'default_tariff_rate' => 10.0,
                'default_vat_rate' => 5.0,
                'default_duty_free' => 2000,
                'commission_rate' => 5.5,
                'transaction_fee' => 2.0
            ]
        ];
    }
    
    /**
     * 7カ国対応利益計算
     */
    public function calculateAdvancedProfit($data) {
        try {
            $validation = $this->validateData($data);
            if (!$validation['valid']) {
                return ['success' => false, 'error' => $validation['message']];
            }
            
            $country = $data['country'];
            $settings = $this->countrySettings[$country];
            
            // 計算実行
            $calculation = $this->performAdvancedCalculation($data, $settings);
            
            // 計算履歴保存（データベースがある場合のみ）
            if ($this->pdo) {
                $this->saveCalculationHistory($data, $calculation);
            }
            
            return [
                'success' => true,
                'platform' => 'Shopee',
                'country' => $settings['name'],
                'currency' => $settings['currency'],
                'calculation_formula' => $this->generateCalculationFormula($data, $settings),
                'data' => $calculation,
                'database_used' => $this->pdo ? true : false,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Shopee計算エラー: ' . $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * 高度計算実行
     */
    private function performAdvancedCalculation($data, $settings) {
        // 1. 為替レート計算
        $baseExchangeRate = $settings['base_exchange_rate'];
        $exchangeMargin = floatval($data['additional_costs']['exchange_margin'] ?? 3.0) / 100;
        $safeExchangeRate = $baseExchangeRate * (1 + $exchangeMargin);
        
        // 2. 総コスト計算
        $purchasePrice = floatval($data['purchase_price'] ?? 0);
        $outsourceFee = floatval($data['additional_costs']['outsource_fee'] ?? 300);
        $packagingFee = floatval($data['additional_costs']['packaging_fee'] ?? 150);
        $internationalShipping = 500; // 国際送料（固定）
        $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $internationalShipping;
        
        // 3. 収入計算
        $sellPriceLocal = floatval($data['sell_price'] ?? 0);
        $shippingLocal = floatval($data['shipping'] ?? 0);
        $totalRevenueLocal = $sellPriceLocal + $shippingLocal;
        
        // 4. 関税・税計算
        $tariffRate = floatval($data['tariff_settings']['tariff_rate'] ?? $settings['default_tariff_rate']);
        $vatRate = floatval($data['tariff_settings']['vat_rate'] ?? $settings['default_vat_rate']);
        $dutyFreeAmount = floatval($data['tariff_settings']['duty_free_amount'] ?? $settings['default_duty_free']);
        
        $taxableAmount = max(0, $totalRevenueLocal - $dutyFreeAmount);
        $tariffAmount = $taxableAmount * ($tariffRate / 100);
        $vatAmount = ($taxableAmount + $tariffAmount) * ($vatRate / 100);
        $totalTaxLocal = $tariffAmount + $vatAmount;
        
        // 5. Shopee手数料計算
        $commissionFee = $totalRevenueLocal * ($settings['commission_rate'] / 100);
        $transactionFee = $totalRevenueLocal * ($settings['transaction_fee'] / 100);
        $totalFeesLocal = $commissionFee + $transactionFee;
        
        // 6. 利益計算
        $netRevenueLocal = $totalRevenueLocal - $totalTaxLocal - $totalFeesLocal;
        $netRevenueJPY = $netRevenueLocal * $safeExchangeRate;
        $profitJPY = $netRevenueJPY - $totalCostJPY;
        
        // 7. 比率計算
        $marginPercent = $netRevenueJPY > 0 ? ($profitJPY / $netRevenueJPY) * 100 : -100;
        $roiPercent = $totalCostJPY > 0 ? ($profitJPY / $totalCostJPY) * 100 : 0;
        
        return [
            'profit_jpy' => round($profitJPY, 0),
            'profit_local' => round($profitJPY / $safeExchangeRate, 2),
            'margin_percent' => round($marginPercent, 2),
            'roi_percent' => round($roiPercent, 2),
            'revenue_jpy' => round($netRevenueJPY, 0),
            'revenue_local' => round($netRevenueLocal, 2),
            'total_cost_jpy' => round($totalCostJPY, 0),
            'tariff_jpy' => round($totalTaxLocal * $safeExchangeRate, 0),
            'tariff_local' => round($totalTaxLocal, 2),
            'fees_jpy' => round($totalFeesLocal * $safeExchangeRate, 0),
            'fees_local' => round($totalFeesLocal, 2),
            'exchange_rate' => $safeExchangeRate,
            'exchange_rate_base' => $baseExchangeRate,
            'exchange_margin' => $exchangeMargin * 100,
            'breakdown' => [
                'purchase_price' => $purchasePrice,
                'outsource_fee' => $outsourceFee,
                'packaging_fee' => $packagingFee,
                'international_shipping' => $internationalShipping,
                'tariff_amount' => round($tariffAmount, 2),
                'vat_amount' => round($vatAmount, 2),
                'commission_fee' => round($commissionFee, 2),
                'transaction_fee' => round($transactionFee, 2),
                'duty_free_amount' => $dutyFreeAmount,
                'tariff_rate_percent' => $tariffRate,
                'vat_rate_percent' => $vatRate
            ],
            'details' => [
                ['label' => '販売収入', 'amount' => '¥' . number_format(round($totalRevenueLocal * $safeExchangeRate, 0)), 'formula' => number_format($totalRevenueLocal, 2) . ' ' . $settings['currency'] . ' × ' . $safeExchangeRate, 'note' => '売上 + 送料'],
                ['label' => '商品原価', 'amount' => '¥' . number_format($totalCostJPY, 0), 'formula' => $purchasePrice . ' + ' . $outsourceFee . ' + ' . $packagingFee . ' + ' . $internationalShipping, 'note' => '仕入れ + 外注 + 梱包 + 国際送料'],
                ['label' => '関税', 'amount' => '¥' . number_format(round($tariffAmount * $safeExchangeRate, 0)), 'formula' => 'max(0, ' . $totalRevenueLocal . ' - ' . $dutyFreeAmount . ') × ' . $tariffRate . '%', 'note' => '免税額: ' . $dutyFreeAmount . ' ' . $settings['currency']],
                ['label' => 'GST/VAT', 'amount' => '¥' . number_format(round($vatAmount * $safeExchangeRate, 0)), 'formula' => '(課税額 + 関税) × ' . $vatRate . '%', 'note' => $settings['name'] . ' 標準税率'],
                ['label' => 'Shopee手数料', 'amount' => '¥' . number_format(round($totalFeesLocal * $safeExchangeRate, 0)), 'formula' => '販売手数料 + 決済手数料', 'note' => $settings['commission_rate'] . '% + ' . $settings['transaction_fee'] . '%'],
                ['label' => '純利益', 'amount' => '¥' . number_format(round($profitJPY, 0)), 'formula' => '収入 - コスト - 税金 - 手数料', 'note' => '税引き前利益']
            ]
        ];
    }
    
    /**
     * 計算式生成
     */
    private function generateCalculationFormula($data, $settings) {
        return [
            'title' => "Shopee {$settings['name']} 計算式",
            'steps' => [
                '1. 総コスト = 仕入れ価格 + 外注工賃 + 梱包費 + 国際送料',
                '2. 安全為替レート = 基本レート × (1 + 為替マージン%)',
                '3. 課税対象額 = max(0, 販売価格 + 送料 - 免税額)',
                '4. 関税額 = 課税対象額 × 関税率%',
                '5. GST/VAT額 = (課税対象額 + 関税額) × GST/VAT率%',
                '6. Shopee手数料 = 販売手数料 + 決済手数料',
                '7. 純利益 = (収入総額 - 関税 - GST/VAT - 手数料) × 安全為替レート - 総コスト'
            ]
        ];
    }
    
    /**
     * データ検証
     */
    private function validateData($data) {
        if (empty($data['item_title'])) {
            return ['valid' => false, 'message' => '商品タイトルが必要です'];
        }
        if (!isset($data['purchase_price']) || $data['purchase_price'] <= 0) {
            return ['valid' => false, 'message' => '仕入れ価格が必要です'];
        }
        if (!isset($data['sell_price']) || $data['sell_price'] <= 0) {
            return ['valid' => false, 'message' => '販売価格が必要です'];
        }
        if (empty($data['country']) || !isset($this->countrySettings[$data['country']])) {
            return ['valid' => false, 'message' => '有効な販売国を選択してください'];
        }
        return ['valid' => true];
    }
    
    /**
     * 計算履歴保存
     */
    private function saveCalculationHistory($inputData, $result) {
        if (!$this->pdo) return;
        
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO advanced_profit_calculations 
                (platform, country, item_title, purchase_price_jpy, sell_price_local, 
                 calculated_profit_jpy, margin_percent, roi_percent, tariff_jpy,
                 outsource_fee, packaging_fee, exchange_margin, calculated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                'Shopee',
                $inputData['country'],
                $inputData['item_title'],
                $inputData['purchase_price'],
                $inputData['sell_price'],
                $result['profit_jpy'],
                $result['margin_percent'],
                $result['roi_percent'],
                $result['tariff_jpy'],
                $inputData['additional_costs']['outsource_fee'] ?? 300,
                $inputData['additional_costs']['packaging_fee'] ?? 150,
                $inputData['additional_costs']['exchange_margin'] ?? 3.0
            ]);
        } catch (Exception $e) {
            error_log("計算履歴保存エラー: " . $e->getMessage());
        }
    }
}

/**
 * ユーティリティクラス
 */
class ApiUtils {
    public static function sendJsonResponse($data, $httpCode = 200) {
        http_response_code($httpCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
    
    public static function sendError($message, $httpCode = 400) {
        self::sendJsonResponse([
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ], $httpCode);
    }
    
    public static function getInputData() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data && !empty($_POST)) {
            $data = $_POST;
        }
        
        if (!$data && !empty($_GET)) {
            $data = $_GET;
        }
        
        return $data ?: [];
    }
}

/**
 * メイン処理
 */
try {
    $action = $_GET['action'] ?? $_POST['action'] ?? 'health';
    
    // ヘルスチェック
    if ($action === 'health') {
        $pdo = getDatabaseConnection();
        
        ApiUtils::sendJsonResponse([
            'success' => true,
            'message' => '高度統合利益計算API稼働中',
            'version' => '4.1.0',
            'database_status' => $pdo ? 'connected' : 'disconnected (fallback mode)',
            'features' => [
                'eBay USA DDP/DDU計算',
                'Shopee 7カ国関税計算',
                '外注工賃・梱包費・為替変動対応',
                '設定保存・自動計算',
                '計算式表示',
                'データベース不要モード'
            ],
            'endpoints' => [
                'ebay_usa_calculate' => '?action=ebay_usa_calculate',
                'shopee_7countries_calculate' => '?action=shopee_7countries_calculate',
                'test_ebay' => '?action=test_ebay',
                'test_shopee' => '?action=test_shopee'
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    // データベース接続（オプション）
    $pdo = getDatabaseConnection();
    
    $inputData = ApiUtils::getInputData();
    
    switch ($action) {
        case 'ebay_usa_calculate':
            $calculator = new EbayUSAAdvancedCalculator($pdo);
            $result = $calculator->calculateAdvancedProfit($inputData);
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'shopee_7countries_calculate':
            $calculator = new Shopee7CountriesAdvancedCalculator($pdo);
            $result = $calculator->calculateAdvancedProfit($inputData);
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'test_ebay':
            $testData = [
                'item_title' => 'iPhone 15 Pro Max 256GB Space Black (Test)',
                'purchase_price' => 150000,
                'sell_price' => 1200,
                'shipping' => 25,
                'category' => 'electronics',
                'shipping_mode' => 'ddp',
                'tariff_rates' => [
                    'electronics' => 7.5,
                    'textiles' => 12.0,
                    'other' => 5.0
                ],
                'additional_costs' => [
                    'outsource_fee' => 500,
                    'packaging_fee' => 200,
                    'exchange_margin' => 5.0
                ]
            ];
            
            $calculator = new EbayUSAAdvancedCalculator($pdo);
            $result = $calculator->calculateAdvancedProfit($testData);
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'test_shopee':
            $testData = [
                'item_title' => 'ワイヤレスイヤホン Bluetooth (Test)',
                'purchase_price' => 3000,
                'sell_price' => 100,
                'shipping' => 8,
                'country' => 'SG',
                'category' => 'electronics',
                'tariff_settings' => [
                    'tariff_rate' => 7.0,
                    'vat_rate' => 7.0,
                    'duty_free_amount' => 400
                ],
                'additional_costs' => [
                    'outsource_fee' => 300,
                    'packaging_fee' => 150,
                    'exchange_margin' => 3.0
                ]
            ];
            
            $calculator = new Shopee7CountriesAdvancedCalculator($pdo);
            $result = $calculator->calculateAdvancedProfit($testData);
            ApiUtils::sendJsonResponse($result);
            break;
            
        default:
            ApiUtils::sendError('無効なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    error_log("advanced_tariff_api.php エラー: " . $e->getMessage());
    ApiUtils::sendError('システムエラーが発生しました: ' . $e->getMessage(), 500);
}
?>
