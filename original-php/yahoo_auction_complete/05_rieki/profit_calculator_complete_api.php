<?php
/**
 * 利益計算システム完全統合API
 * Yahoo Auction Tool - 利益計算バックエンド
 * 
 * @version 3.0.0 COMPLETE
 * @date 2025-09-23
 * @author Claude AI
 */

// エラー設定とヘッダー
ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * データベース接続（フォールバック対応）
 */
function getDatabaseConnection() {
    // 1. PostgreSQL接続試行
    try {
        $pdo = new PDO(
            "pgsql:host=localhost;dbname=yahoo_auction_tool",
            "postgres",
            "password",
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return ['success' => true, 'connection' => $pdo, 'type' => 'postgresql'];
    } catch (Exception $e) {
        // PostgreSQL接続失敗時はSQLiteにフォールバック
    }
    
    // 2. SQLite接続試行
    try {
        $dbPath = __DIR__ . '/profit_calculator.db';
        $pdo = new PDO("sqlite:$dbPath", null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        // SQLite用テーブル初期化
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS profit_calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                item_title TEXT,
                purchase_price_jpy DECIMAL(10,2),
                sell_price_usd DECIMAL(10,2),
                calculated_profit_jpy DECIMAL(10,2),
                margin_percent DECIMAL(5,2),
                roi_percent DECIMAL(5,2),
                exchange_rate DECIMAL(8,4),
                calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                country TEXT,
                category_id INTEGER,
                calculation_data TEXT
            )
        ");
        
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS exchange_rates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                currency_from TEXT NOT NULL,
                currency_to TEXT NOT NULL,
                rate DECIMAL(10,6),
                safety_margin DECIMAL(5,2),
                calculated_rate DECIMAL(10,6),
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS fee_structures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                platform TEXT NOT NULL,
                category_id INTEGER,
                category_name TEXT,
                tier1_rate DECIMAL(6,4),
                tier1_threshold DECIMAL(10,2),
                tier2_rate DECIMAL(6,4),
                insertion_fee DECIMAL(6,2),
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        return ['success' => true, 'connection' => $pdo, 'type' => 'sqlite'];
    } catch (Exception $e) {
        return ['success' => false, 'error' => 'データベース接続に失敗しました: ' . $e->getMessage()];
    }
}

/**
 * 高精度利益計算クラス
 */
class EnhancedProfitCalculator {
    private $pdo;
    private $dbType;
    
    // 基本設定
    private $baseExchangeRate = 148.50;
    private $defaultSafetyMargin = 5.0;
    private $globalMinProfitUSD = 5.00;
    private $globalTargetMargin = 25.0;
    
    // eBay手数料設定（カテゴリー別）
    private $ebayFees = [
        '293' => ['tier1' => 10.0, 'tier2' => 12.35, 'threshold' => 7500, 'insertion' => 0.35], // Consumer Electronics
        '11450' => ['tier1' => 12.9, 'tier2' => 14.70, 'threshold' => 10000, 'insertion' => 0.30], // Clothing
        '58058' => ['tier1' => 9.15, 'tier2' => 11.70, 'threshold' => 5000, 'insertion' => 0.35], // Collectibles
        '267' => ['tier1' => 15.0, 'tier2' => 15.0, 'threshold' => 999999, 'insertion' => 0.30], // Books
        '550' => ['tier1' => 12.9, 'tier2' => 15.0, 'threshold' => 10000, 'insertion' => 0.35] // Art
    ];
    
    // Shopee国別設定
    private $shopeeCountries = [
        'SG' => ['name' => 'シンガポール', 'currency' => 'SGD', 'rate' => 110.45, 'tariff' => 7.0, 'vat' => 7.0, 'dutyFree' => 400, 'commission' => 6.0],
        'MY' => ['name' => 'マレーシア', 'currency' => 'MYR', 'rate' => 33.78, 'tariff' => 15.0, 'vat' => 10.0, 'dutyFree' => 500, 'commission' => 5.5],
        'TH' => ['name' => 'タイ', 'currency' => 'THB', 'rate' => 4.23, 'tariff' => 20.0, 'vat' => 7.0, 'dutyFree' => 1500, 'commission' => 5.0],
        'PH' => ['name' => 'フィリピン', 'currency' => 'PHP', 'rate' => 2.68, 'tariff' => 25.0, 'vat' => 12.0, 'dutyFree' => 10000, 'commission' => 5.5],
        'ID' => ['name' => 'インドネシア', 'currency' => 'IDR', 'rate' => 0.0098, 'tariff' => 30.0, 'vat' => 11.0, 'dutyFree' => 75, 'commission' => 5.0],
        'VN' => ['name' => 'ベトナム', 'currency' => 'VND', 'rate' => 0.0061, 'tariff' => 35.0, 'vat' => 10.0, 'dutyFree' => 200, 'commission' => 6.0],
        'TW' => ['name' => '台湾', 'currency' => 'TWD', 'rate' => 4.75, 'tariff' => 10.0, 'vat' => 5.0, 'dutyFree' => 2000, 'commission' => 5.5]
    ];
    
    // 階層型利益設定
    private $profitSettings = [
        'new' => ['targetMargin' => 28.0, 'minProfit' => 7.00],
        'used' => ['targetMargin' => 20.0, 'minProfit' => 3.00],
        'refurbished' => ['targetMargin' => 25.0, 'minProfit' => 5.00],
        'forparts' => ['targetMargin' => 15.0, 'minProfit' => 2.00]
    ];
    
    public function __construct($dbConnection) {
        if ($dbConnection['success']) {
            $this->pdo = $dbConnection['connection'];
            $this->dbType = $dbConnection['type'];
        }
    }
    
    /**
     * 高精度利益計算（メイン機能）
     */
    public function advancedCalculate($data) {
        try {
            // 入力データ検証
            $validation = $this->validateInputData($data);
            if (!$validation['valid']) {
                return ['success' => false, 'error' => $validation['message']];
            }
            
            // 基本データ取得
            $yahooPrice = floatval($data['yahooPrice']);
            $domesticShipping = floatval($data['domesticShipping'] ?? 300);
            $outsourceFee = floatval($data['outsourceFee'] ?? 500);
            $packagingFee = floatval($data['packagingFee'] ?? 200);
            $assumedPrice = floatval($data['assumedPrice']);
            $assumedShipping = floatval($data['assumedShipping']);
            $daysSince = intval($data['daysSince'] ?? 0);
            $category = $data['ebayCategory'] ?? '293';
            $condition = strtolower($data['itemCondition'] ?? 'used');
            $strategy = $data['strategy'] ?? 'standard';
            
            // 為替レート計算（安全マージン込み）
            $safeExchangeRate = $this->baseExchangeRate * (1 + $this->defaultSafetyMargin / 100);
            
            // 段階手数料計算
            $feeInfo = $this->calculateTieredFees($category, $assumedPrice);
            
            // 追加手数料計算
            $paypalFee = $assumedPrice * 0.034 + 0.30;
            $internationalFee = $assumedPrice * 0.013;
            $totalFees = $feeInfo['finalValueFee'] + $feeInfo['insertionFee'] + $paypalFee + $internationalFee;
            
            // コスト・収入計算
            $totalCostJPY = $yahooPrice + $domesticShipping + $outsourceFee + $packagingFee;
            $totalCostUSD = $totalCostJPY / $safeExchangeRate;
            $totalRevenueUSD = $assumedPrice + $assumedShipping;
            
            // 階層型利益設定適用
            $appliedSettings = $this->getHierarchicalSettings($condition, $category, $daysSince, $strategy);
            
            // 利益計算
            $netProfitUSD = $totalRevenueUSD - $totalCostUSD - $totalFees;
            $profitMargin = ($netProfitUSD / $totalRevenueUSD) * 100;
            $roi = ($netProfitUSD / $totalCostUSD) * 100;
            
            // 推奨価格計算
            $recommendedPrice = $this->calculateRecommendedPrice($totalCostUSD, $totalFees, $assumedShipping, $appliedSettings['targetMargin']);
            $breakEvenPrice = $totalCostUSD + $totalFees + $assumedShipping;
            
            $result = [
                'success' => true,
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => [
                    'totalRevenue' => number_format($totalRevenueUSD, 2),
                    'totalCost' => number_format($totalCostUSD, 2),
                    'totalFees' => number_format($totalFees, 2),
                    'netProfit' => number_format($netProfitUSD, 2),
                    'profitMargin' => number_format($profitMargin, 1),
                    'roi' => number_format($roi, 1),
                    'recommendedPrice' => number_format($recommendedPrice, 2),
                    'breakEvenPrice' => number_format($breakEvenPrice, 2),
                    'exchangeRate' => $safeExchangeRate,
                    'appliedSettings' => $appliedSettings,
                    'feeDetails' => $feeInfo
                ]
            ];
            
            // データベース保存
            if ($this->pdo) {
                $this->saveCalculationHistory('enhanced', $data, $result['data']);
            }
            
            return $result;
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => '高精度計算エラー: ' . $e->getMessage()];
        }
    }
    
    /**
     * eBay USA利益計算
     */
    public function ebayCalculate($data) {
        try {
            $purchasePrice = floatval($data['purchasePrice']);
            $sellPrice = floatval($data['sellPrice']);
            $shipping = floatval($data['shipping']);
            $category = $data['category'] ?? 'electronics';
            $condition = $data['condition'] ?? 'used';
            $weight = floatval($data['weight'] ?? 0.5);
            $shippingMode = $data['shippingMode'] ?? 'ddp';
            $outsourceFee = floatval($data['outsourceFee'] ?? 500);
            $packagingFee = floatval($data['packagingFee'] ?? 200);
            $exchangeMargin = floatval($data['exchangeMargin'] ?? 5.0);
            
            // 為替レート（マージン込み）
            $safeExchangeRate = $this->baseExchangeRate * (1 + $exchangeMargin / 100);
            
            // 関税計算（DDPの場合のみ）
            $tariffRates = [
                'electronics' => 7.5,
                'textiles' => 12.0,
                'other' => 5.0
            ];
            
            $tariffUSD = 0;
            if ($shippingMode === 'ddp') {
                $tariffRate = $tariffRates[$category] ?? 5.0;
                $tariffUSD = $sellPrice * ($tariffRate / 100);
            }
            
            // 手数料計算
            $finalValueFee = $sellPrice * 0.129; // 平均手数料
            $paypalFee = $sellPrice * 0.0349 + 0.49;
            $totalFeesUSD = $finalValueFee + $paypalFee + $tariffUSD;
            
            // コスト計算
            $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee;
            $totalCostUSD = $totalCostJPY / $safeExchangeRate;
            
            // 利益計算
            $totalRevenueUSD = $sellPrice + $shipping;
            $netProfitUSD = $totalRevenueUSD - $totalCostUSD - $totalFeesUSD;
            $netProfitJPY = $netProfitUSD * $safeExchangeRate;
            $marginPercent = ($netProfitUSD / $totalRevenueUSD) * 100;
            $roiPercent = ($netProfitUSD / $totalCostUSD) * 100;
            
            $result = [
                'success' => true,
                'platform' => 'eBay USA',
                'shippingMode' => strtoupper($shippingMode),
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => [
                    'profitJPY' => round($netProfitJPY),
                    'marginPercent' => number_format($marginPercent, 2),
                    'roiPercent' => number_format($roiPercent, 2),
                    'tariffJPY' => round($tariffUSD * $safeExchangeRate),
                    'exchangeRate' => number_format($safeExchangeRate, 2),
                    'details' => [
                        ['label' => '総収入', 'amount' => '$' . number_format($totalRevenueUSD, 2)],
                        ['label' => '商品原価', 'amount' => '¥' . number_format($totalCostJPY)],
                        ['label' => '関税', 'amount' => '$' . number_format($tariffUSD, 2)],
                        ['label' => 'eBay手数料', 'amount' => '$' . number_format($totalFeesUSD, 2)],
                        ['label' => '純利益', 'amount' => '¥' . number_format($netProfitJPY)]
                    ]
                ]
            ];
            
            // データベース保存
            if ($this->pdo) {
                $this->saveCalculationHistory('ebay', $data, $result['data']);
            }
            
            return $result;
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => 'eBay計算エラー: ' . $e->getMessage()];
        }
    }
    
    /**
     * Shopee 7カ国利益計算
     */
    public function shopeeCalculate($data) {
        try {
            $purchasePrice = floatval($data['purchasePrice']);
            $sellPrice = floatval($data['sellPrice']);
            $shipping = floatval($data['shipping']);
            $country = $data['country'] ?? 'SG';
            $tariffRate = floatval($data['tariffRate']);
            $vatRate = floatval($data['vatRate']);
            $dutyFreeAmount = floatval($data['dutyFreeAmount']);
            $outsourceFee = floatval($data['outsourceFee'] ?? 300);
            $packagingFee = floatval($data['packagingFee'] ?? 150);
            
            if (!isset($this->shopeeCountries[$country])) {
                return ['success' => false, 'error' => 'サポートされていない国です'];
            }
            
            $settings = $this->shopeeCountries[$country];
            
            // 追加コスト
            $internationalShipping = 500; // 国際送料
            $totalCostJPY = $purchasePrice + $outsourceFee + $packagingFee + $internationalShipping;
            
            // 収入計算
            $totalRevenueLocal = $sellPrice + $shipping;
            $totalRevenueJPY = $totalRevenueLocal * $settings['rate'];
            
            // 関税・VAT計算
            $taxableAmount = max(0, $totalRevenueLocal - $dutyFreeAmount);
            $tariffAmount = $taxableAmount * ($tariffRate / 100);
            $vatAmount = ($taxableAmount + $tariffAmount) * ($vatRate / 100);
            $totalTaxLocal = $tariffAmount + $vatAmount;
            $totalTaxJPY = $totalTaxLocal * $settings['rate'];
            
            // Shopee手数料
            $commissionFee = $totalRevenueLocal * ($settings['commission'] / 100);
            $transactionFee = $totalRevenueLocal * 0.024;
            $totalFeesLocal = $commissionFee + $transactionFee;
            $totalFeesJPY = $totalFeesLocal * $settings['rate'];
            
            // 利益計算
            $netRevenueLocal = $totalRevenueLocal - $totalTaxLocal - $totalFeesLocal;
            $netRevenueJPY = $netRevenueLocal * $settings['rate'];
            $profitJPY = $netRevenueJPY - $totalCostJPY;
            $marginPercent = ($profitJPY / $netRevenueJPY) * 100;
            $roiPercent = ($profitJPY / $totalCostJPY) * 100;
            
            $result = [
                'success' => true,
                'platform' => 'Shopee',
                'country' => $settings['name'],
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => [
                    'profitJPY' => round($profitJPY),
                    'marginPercent' => number_format($marginPercent, 2),
                    'roiPercent' => number_format($roiPercent, 2),
                    'tariffJPY' => round($totalTaxJPY),
                    'exchangeRate' => number_format($settings['rate'], 4),
                    'details' => [
                        ['label' => '総収入', 'amount' => '¥' . number_format(round($totalRevenueJPY))],
                        ['label' => '商品原価', 'amount' => '¥' . number_format($totalCostJPY)],
                        ['label' => '関税・税', 'amount' => '¥' . number_format(round($totalTaxJPY))],
                        ['label' => 'Shopee手数料', 'amount' => '¥' . number_format(round($totalFeesJPY))],
                        ['label' => '純利益', 'amount' => '¥' . number_format(round($profitJPY))]
                    ]
                ]
            ];
            
            // データベース保存
            if ($this->pdo) {
                $this->saveCalculationHistory('shopee', $data, $result['data']);
            }
            
            return $result;
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => 'Shopee計算エラー: ' . $e->getMessage()];
        }
    }
    
    /**
     * 段階手数料計算
     */
    private function calculateTieredFees($categoryId, $sellPrice) {
        $fees = $this->ebayFees[$categoryId] ?? $this->ebayFees['293'];
        
        $finalValueFee = 0;
        if ($sellPrice <= $fees['threshold']) {
            $finalValueFee = $sellPrice * ($fees['tier1'] / 100);
            $tier = 1;
            $rate = $fees['tier1'];
        } else {
            $tier1Amount = $fees['threshold'] * ($fees['tier1'] / 100);
            $tier2Amount = ($sellPrice - $fees['threshold']) * ($fees['tier2'] / 100);
            $finalValueFee = $tier1Amount + $tier2Amount;
            $tier = 2;
            $rate = $fees['tier2'];
        }
        
        return [
            'finalValueFee' => $finalValueFee,
            'insertionFee' => $fees['insertion'],
            'tier' => $tier,
            'rate' => $rate,
            'threshold' => $fees['threshold']
        ];
    }
    
    /**
     * 階層型利益設定取得
     */
    private function getHierarchicalSettings($condition, $category, $daysSince, $strategy) {
        // 基本設定取得
        $settings = $this->profitSettings[$condition] ?? $this->profitSettings['used'];
        
        // 期間調整（最優先）
        if ($daysSince >= 60) {
            $settings['targetMargin'] = 10.0;
            $settings['minProfit'] = 2.00;
            $settings['type'] = '期間（60日経過）';
        } elseif ($daysSince >= 30) {
            $settings['targetMargin'] = 15.0;
            $settings['minProfit'] = 2.50;
            $settings['type'] = '期間（30日経過）';
        } else {
            $settings['type'] = 'コンディション（' . $condition . '）';
        }
        
        // 戦略調整
        $strategyAdjustments = [
            'quick' => -5,
            'premium' => 10,
            'volume' => -3,
            'standard' => 0
        ];
        
        $adjustment = $strategyAdjustments[$strategy] ?? 0;
        $settings['targetMargin'] += $adjustment;
        $settings['strategyAdjustment'] = $adjustment;
        $settings['appliedStrategy'] = $strategy;
        
        return $settings;
    }
    
    /**
     * 推奨価格計算
     */
    private function calculateRecommendedPrice($totalCost, $totalFees, $shipping, $targetMargin) {
        $requiredRevenue = ($totalCost + $totalFees) / (1 - $targetMargin / 100);
        return max($requiredRevenue - $shipping, $totalCost + $totalFees + 5.00); // 最低5ドルの利益確保
    }
    
    /**
     * 入力データ検証
     */
    private function validateInputData($data) {
        if (!isset($data['yahooPrice']) || floatval($data['yahooPrice']) <= 0) {
            return ['valid' => false, 'message' => 'Yahoo価格を正しく入力してください'];
        }
        
        if (!isset($data['assumedPrice']) || floatval($data['assumedPrice']) <= 0) {
            return ['valid' => false, 'message' => '想定販売価格を正しく入力してください'];
        }
        
        return ['valid' => true, 'message' => 'OK'];
    }
    
    /**
     * 計算履歴保存
     */
    private function saveCalculationHistory($platform, $inputData, $result) {
        if (!$this->pdo) return;
        
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO profit_calculations 
                (platform, item_title, purchase_price_jpy, sell_price_usd, calculated_profit_jpy, 
                 margin_percent, roi_percent, exchange_rate, country, calculation_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $platform,
                $inputData['title'] ?? 'シミュレーション',
                $inputData['yahooPrice'] ?? $inputData['purchasePrice'] ?? 0,
                $inputData['assumedPrice'] ?? $inputData['sellPrice'] ?? 0,
                is_array($result) && isset($result['profitJPY']) ? $result['profitJPY'] : 0,
                is_array($result) && isset($result['marginPercent']) ? floatval($result['marginPercent']) : 0,
                is_array($result) && isset($result['roiPercent']) ? floatval($result['roiPercent']) : 0,
                $this->baseExchangeRate,
                $inputData['country'] ?? null,
                json_encode($inputData, JSON_UNESCAPED_UNICODE)
            ]);
        } catch (Exception $e) {
            error_log("計算履歴保存エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 為替レート更新
     */
    public function updateExchangeRates() {
        try {
            // 模擬的な為替変動（実際のAPI実装時は外部APIを使用）
            $rates = [
                'USD' => $this->baseExchangeRate * (1 + (rand(-200, 200) / 10000)), // ±2%変動
                'SGD' => 110.45 * (1 + (rand(-150, 150) / 10000)),
                'MYR' => 33.78 * (1 + (rand(-150, 150) / 10000)),
                'THB' => 4.23 * (1 + (rand(-100, 100) / 10000)),
                'PHP' => 2.68 * (1 + (rand(-100, 100) / 10000)),
                'IDR' => 0.0098 * (1 + (rand(-100, 100) / 10000)),
                'VND' => 0.0061 * (1 + (rand(-100, 100) / 10000)),
                'TWD' => 4.75 * (1 + (rand(-100, 100) / 10000))
            ];
            
            $updatedCount = 0;
            if ($this->pdo) {
                foreach ($rates as $currency => $rate) {
                    $stmt = $this->pdo->prepare("
                        INSERT OR REPLACE INTO exchange_rates 
                        (currency_from, currency_to, rate, safety_margin, calculated_rate, updated_at)
                        VALUES ('JPY', ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ");
                    $stmt->execute([$currency, $rate, $this->defaultSafetyMargin, $rate * (1 + $this->defaultSafetyMargin / 100)]);
                    $updatedCount++;
                }
            }
            
            // レート変化率計算
            $rateData = [];
            foreach ($rates as $currency => $rate) {
                $changePercent = (($rate - $this->baseExchangeRate) / $this->baseExchangeRate) * 100;
                $rateData[$currency] = [
                    'rate' => number_format($rate, 4),
                    'change_percent' => number_format($changePercent, 2)
                ];
            }
            
            return [
                'success' => true,
                'updated_count' => $updatedCount,
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => $rateData
            ];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => '為替レート更新エラー: ' . $e->getMessage()];
        }
    }
    
    /**
     * 段階手数料データ取得
     */
    public function getTieredFeesData() {
        try {
            $feeData = [];
            foreach ($this->ebayFees as $categoryId => $fees) {
                $feeData[] = [
                    'category_id' => $categoryId,
                    'tier1_rate' => $fees['tier1'],
                    'tier2_rate' => $fees['tier2'],
                    'threshold' => $fees['threshold'],
                    'insertion_fee' => $fees['insertion']
                ];
            }
            
            return [
                'success' => true,
                'count' => count($feeData),
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => $feeData
            ];
            
        } catch (Exception $e) {
            return ['success' => false, 'error' => '段階手数料データ取得エラー: ' . $e->getMessage()];
        }
    }
}

/**
 * ユーティリティクラス
 */
class ApiUtils {
    /**
     * JSON応答送信
     */
    public static function sendJsonResponse($data, $httpCode = 200) {
        http_response_code($httpCode);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit();
    }
    
    /**
     * エラー応答送信
     */
    public static function sendError($message, $httpCode = 400) {
        self::sendJsonResponse([
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ], $httpCode);
    }
    
    /**
     * 入力データの取得
     */
    public static function getInputData() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        // POSTデータも考慮
        if (!$data && !empty($_POST)) {
            $data = $_POST;
        }
        
        // GETパラメータも考慮
        if (!$data && !empty($_GET)) {
            $data = $_GET;
        }
        
        return $data ?: [];
    }
}

/**
 * システム状態チェック
 */
function checkSystemHealth() {
    $health = [
        'database' => false,
        'api' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'php_version' => PHP_VERSION,
        'memory_usage' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB'
    ];
    
    // データベース接続チェック
    $dbResult = getDatabaseConnection();
    if ($dbResult['success']) {
        $health['database'] = true;
        $health['database_type'] = $dbResult['type'];
    } else {
        $health['database_error'] = $dbResult['error'];
    }
    
    return $health;
}

// メイン処理
try {
    // アクションの取得
    $action = $_GET['action'] ?? $_POST['action'] ?? ApiUtils::getInputData()['action'] ?? '';
    
    if (empty($action)) {
        ApiUtils::sendError('アクションが指定されていません');
    }
    
    // データベース接続
    $dbConnection = getDatabaseConnection();
    $calculator = new EnhancedProfitCalculator($dbConnection);
    
    // アクション別処理
    switch ($action) {
        case 'advanced_calculate':
            $data = ApiUtils::getInputData();
            $result = $calculator->advancedCalculate($data);
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'ebay_calculate':
            $data = ApiUtils::getInputData();
            $result = $calculator->ebayCalculate($data);
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'shopee_calculate':
            $data = ApiUtils::getInputData();
            $result = $calculator->shopeeCalculate($data);
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'update_rates':
            $result = $calculator->updateExchangeRates();
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'tiered_fees':
            $result = $calculator->getTieredFeesData();
            ApiUtils::sendJsonResponse($result);
            break;
            
        case 'health_check':
            $health = checkSystemHealth();
            ApiUtils::sendJsonResponse($health);
            break;
            
        default:
            ApiUtils::sendError('未知のアクション: ' . $action);
    }
    
} catch (Exception $e) {
    ApiUtils::sendError('システムエラー: ' . $e->getMessage(), 500);
}
?>