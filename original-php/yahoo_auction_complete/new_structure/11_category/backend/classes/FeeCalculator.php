<?php
/**
 * 手数料計算クラス - Phase 2 Implementation
 * new_structure/11_category/backend/classes/FeeCalculator.php
 */

class FeeCalculator {
    private $pdo;
    private $ebayApi;
    private $exchangeRate;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->loadExchangeRate();
    }
    
    /**
     * 為替レート読み込み
     */
    private function loadExchangeRate() {
        try {
            // 共通設定から為替レート取得
            require_once '../shared/api/EbayApiConnector.php';
            $this->ebayApi = new EbayApiConnector();
            $this->exchangeRate = $this->ebayApi->getExchangeRate();
        } catch (Exception $e) {
            // フォールバック: デフォルトレート使用
            $this->exchangeRate = 150.0; // JPY to USD
        }
    }
    
    /**
     * eBay手数料計算（メイン機能）
     * @param string $categoryId eBayカテゴリーID
     * @param float $priceUsd 販売価格（USD）
     * @param string $listingFormat 出品形式
     * @param array $options 追加オプション
     * @return array 手数料詳細
     */
    public function calculateEbayFees($categoryId, $priceUsd, $listingFormat = 'fixed_price', $options = []) {
        try {
            // カテゴリー別手数料データ取得
            $feeData = $this->getCategoryFeeData($categoryId, $listingFormat);
            
            // 基本手数料計算
            $insertionFee = $this->calculateInsertionFee($feeData, $priceUsd, $listingFormat);
            $finalValueFee = $this->calculateFinalValueFee($feeData, $priceUsd);
            $paypalFee = $this->calculatePayPalFee($feeData, $priceUsd);
            $internationalFee = $this->calculateInternationalFee($feeData, $priceUsd, $options);
            
            // オプション手数料
            $optionalFees = $this->calculateOptionalFees($options, $priceUsd);
            
            // 合計計算
            $totalFees = $insertionFee + $finalValueFee + $paypalFee + $internationalFee + $optionalFees['total'];
            $netAmount = $priceUsd - $totalFees;
            $feePercentage = $priceUsd > 0 ? ($totalFees / $priceUsd) * 100 : 0;
            
            return [
                'category_id' => $categoryId,
                'price_usd' => $priceUsd,
                'listing_format' => $listingFormat,
                'fees' => [
                    'insertion_fee' => round($insertionFee, 2),
                    'final_value_fee' => round($finalValueFee, 2),
                    'paypal_fee' => round($paypalFee, 2),
                    'international_fee' => round($internationalFee, 2),
                    'optional_fees' => $optionalFees,
                    'total_fees' => round($totalFees, 2)
                ],
                'summary' => [
                    'gross_amount' => round($priceUsd, 2),
                    'total_fees' => round($totalFees, 2),
                    'net_amount' => round($netAmount, 2),
                    'fee_percentage' => round($feePercentage, 2)
                ],
                'calculated_at' => date('Y-m-d H:i:s'),
                'exchange_rate' => $this->exchangeRate
            ];
            
        } catch (Exception $e) {
            error_log('FeeCalculator Error: ' . $e->getMessage());
            return $this->getDefaultFeeCalculation($priceUsd);
        }
    }
    
    /**
     * 利益計算（Yahoo Auction価格からeBay利益算出）
     * @param float $yahooYenPrice Yahoo Auction価格（円）
     * @param float $ebayUsdPrice eBay販売価格（USD）
     * @param string $categoryId eBayカテゴリーID
     * @param array $options 追加オプション
     * @return array 利益計算結果
     */
    public function calculateProfit($yahooYenPrice, $ebayUsdPrice, $categoryId, $options = []) {
        try {
            // 手数料計算
            $feeCalculation = $this->calculateEbayFees($categoryId, $ebayUsdPrice, 'fixed_price', $options);
            
            // Yahoo価格をUSDに換算
            $yahooPriceUsd = $yahooYenPrice * $this->exchangeRate;
            
            // 追加コスト計算
            $additionalCosts = $this->calculateAdditionalCosts($options);
            
            // 利益計算
            $grossProfit = $ebayUsdPrice - $yahooPriceUsd;
            $netProfit = $feeCalculation['summary']['net_amount'] - $yahooPriceUsd - $additionalCosts['total'];
            
            // 利益率計算
            $profitMarginGross = $ebayUsdPrice > 0 ? ($grossProfit / $ebayUsdPrice) * 100 : 0;
            $profitMarginNet = $ebayUsdPrice > 0 ? ($netProfit / $ebayUsdPrice) * 100 : 0;
            
            return [
                'input' => [
                    'yahoo_price_yen' => $yahooYenPrice,
                    'yahoo_price_usd' => round($yahooPriceUsd, 2),
                    'ebay_price_usd' => $ebayUsdPrice,
                    'category_id' => $categoryId,
                    'exchange_rate' => $this->exchangeRate
                ],
                'costs' => [
                    'purchase_cost_usd' => round($yahooPriceUsd, 2),
                    'ebay_fees' => $feeCalculation['fees'],
                    'additional_costs' => $additionalCosts,
                    'total_costs' => round($yahooPriceUsd + $feeCalculation['summary']['total_fees'] + $additionalCosts['total'], 2)
                ],
                'profit' => [
                    'gross_profit_usd' => round($grossProfit, 2),
                    'net_profit_usd' => round($netProfit, 2),
                    'profit_margin_gross' => round($profitMarginGross, 2),
                    'profit_margin_net' => round($profitMarginNet, 2)
                ],
                'analysis' => [
                    'is_profitable' => $netProfit > 0,
                    'roi_percentage' => $yahooPriceUsd > 0 ? round(($netProfit / $yahooPriceUsd) * 100, 2) : 0,
                    'break_even_price_usd' => round($yahooPriceUsd + $feeCalculation['summary']['total_fees'] + $additionalCosts['total'], 2),
                    'risk_level' => $this->calculateRiskLevel($profitMarginNet, $netProfit)
                ],
                'calculated_at' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            error_log('Profit Calculation Error: ' . $e->getMessage());
            return $this->getDefaultProfitCalculation($yahooYenPrice, $ebayUsdPrice);
        }
    }
    
    /**
     * カテゴリー別手数料データ取得
     */
    private function getCategoryFeeData($categoryId, $listingFormat) {
        $sql = "SELECT * FROM ebay_category_fees WHERE category_id = ? AND listing_type = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$categoryId, $listingFormat]);
        
        $feeData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$feeData) {
            // デフォルト手数料データ
            return [
                'category_id' => $categoryId,
                'listing_type' => $listingFormat,
                'insertion_fee' => 0.00,
                'final_value_fee_percent' => 13.25,
                'final_value_fee_max' => 750.00,
                'store_fee' => 0.00,
                'paypal_fee_percent' => 2.90,
                'paypal_fee_fixed' => 0.30,
                'international_fee_percent' => 1.00
            ];
        }
        
        return $feeData;
    }
    
    /**
     * 出品手数料計算
     */
    private function calculateInsertionFee($feeData, $priceUsd, $listingFormat) {
        // ほとんどのカテゴリーで出品手数料は無料
        if ($listingFormat === 'store') {
            return $feeData['store_fee'] ?? 0.00;
        }
        
        return $feeData['insertion_fee'] ?? 0.00;
    }
    
    /**
     * 最終取引手数料計算
     */
    private function calculateFinalValueFee($feeData, $priceUsd) {
        $percent = $feeData['final_value_fee_percent'] ?? 13.25;
        $max = $feeData['final_value_fee_max'] ?? 750.00;
        
        $fee = ($priceUsd * $percent) / 100;
        return min($fee, $max);
    }
    
    /**
     * PayPal手数料計算
     */
    private function calculatePayPalFee($feeData, $priceUsd) {
        $percent = $feeData['paypal_fee_percent'] ?? 2.90;
        $fixed = $feeData['paypal_fee_fixed'] ?? 0.30;
        
        return ($priceUsd * $percent / 100) + $fixed;
    }
    
    /**
     * 国際送料手数料計算
     */
    private function calculateInternationalFee($feeData, $priceUsd, $options) {
        if (!($options['international_shipping'] ?? false)) {
            return 0.00;
        }
        
        $percent = $feeData['international_fee_percent'] ?? 1.00;
        return ($priceUsd * $percent) / 100;
    }
    
    /**
     * オプション手数料計算
     */
    private function calculateOptionalFees($options, $priceUsd) {
        $fees = [
            'subtitle' => 0.00,
            'gallery_plus' => 0.00,
            'bold' => 0.00,
            'listing_upgrades' => 0.00,
            'total' => 0.00
        ];
        
        // サブタイトル
        if ($options['subtitle'] ?? false) {
            $fees['subtitle'] = 1.50;
        }
        
        // ギャラリープラス
        if ($options['gallery_plus'] ?? false) {
            $fees['gallery_plus'] = 1.00;
        }
        
        // 太字
        if ($options['bold'] ?? false) {
            $fees['bold'] = 2.00;
        }
        
        // その他アップグレード
        if ($options['listing_upgrades'] ?? false) {
            $fees['listing_upgrades'] = $options['upgrade_cost'] ?? 0.00;
        }
        
        $fees['total'] = array_sum($fees) - $fees['total']; // total以外の合計
        
        return $fees;
    }
    
    /**
     * 追加コスト計算（送料、梱包費等）
     */
    private function calculateAdditionalCosts($options) {
        $costs = [
            'shipping_domestic' => $options['shipping_cost_domestic'] ?? 10.00,
            'shipping_international' => $options['shipping_cost_international'] ?? 25.00,
            'packaging' => $options['packaging_cost'] ?? 2.00,
            'handling' => $options['handling_cost'] ?? 5.00,
            'currency_conversion' => $options['currency_conversion_fee'] ?? 1.00,
            'total' => 0.00
        ];
        
        // 国際送料の選択
        $shippingCost = ($options['international_shipping'] ?? false) ? 
            $costs['shipping_international'] : $costs['shipping_domestic'];
        
        $costs['total'] = $shippingCost + $costs['packaging'] + $costs['handling'] + $costs['currency_conversion'];
        
        return $costs;
    }
    
    /**
     * リスクレベル計算
     */
    private function calculateRiskLevel($profitMarginNet, $netProfit) {
        if ($netProfit < 0) {
            return 'HIGH'; // 損失
        } elseif ($profitMarginNet < 10) {
            return 'MEDIUM-HIGH'; // 利益率10%未満
        } elseif ($profitMarginNet < 20) {
            return 'MEDIUM'; // 利益率10-20%
        } elseif ($profitMarginNet < 30) {
            return 'LOW-MEDIUM'; // 利益率20-30%
        } else {
            return 'LOW'; // 利益率30%以上
        }
    }
    
    /**
     * デフォルト手数料計算（エラー時）
     */
    private function getDefaultFeeCalculation($priceUsd) {
        $finalValueFee = min($priceUsd * 0.1325, 750.00);
        $paypalFee = ($priceUsd * 0.029) + 0.30;
        $totalFees = $finalValueFee + $paypalFee;
        
        return [
            'category_id' => '99999',
            'price_usd' => $priceUsd,
            'listing_format' => 'fixed_price',
            'fees' => [
                'insertion_fee' => 0.00,
                'final_value_fee' => round($finalValueFee, 2),
                'paypal_fee' => round($paypalFee, 2),
                'international_fee' => 0.00,
                'optional_fees' => ['total' => 0.00],
                'total_fees' => round($totalFees, 2)
            ],
            'summary' => [
                'gross_amount' => round($priceUsd, 2),
                'total_fees' => round($totalFees, 2),
                'net_amount' => round($priceUsd - $totalFees, 2),
                'fee_percentage' => round(($totalFees / $priceUsd) * 100, 2)
            ],
            'calculated_at' => date('Y-m-d H:i:s'),
            'exchange_rate' => $this->exchangeRate,
            'note' => 'デフォルト計算（エラー時フォールバック）'
        ];
    }
    
    /**
     * デフォルト利益計算（エラー時）
     */
    private function getDefaultProfitCalculation($yahooYenPrice, $ebayUsdPrice) {
        $yahooPriceUsd = $yahooYenPrice * $this->exchangeRate;
        $estimatedFees = $ebayUsdPrice * 0.16; // 概算16%
        $netProfit = $ebayUsdPrice - $yahooPriceUsd - $estimatedFees;
        
        return [
            'input' => [
                'yahoo_price_yen' => $yahooYenPrice,
                'yahoo_price_usd' => round($yahooPriceUsd, 2),
                'ebay_price_usd' => $ebayUsdPrice,
                'exchange_rate' => $this->exchangeRate
            ],
            'profit' => [
                'net_profit_usd' => round($netProfit, 2),
                'profit_margin_net' => round(($netProfit / $ebayUsdPrice) * 100, 2)
            ],
            'analysis' => [
                'is_profitable' => $netProfit > 0,
                'risk_level' => $netProfit > 0 ? 'MEDIUM' : 'HIGH'
            ],
            'calculated_at' => date('Y-m-d H:i:s'),
            'note' => 'デフォルト計算（エラー時フォールバック）'
        ];
    }
    
    /**
     * 複数商品の一括手数料計算
     * @param array $products 商品データ配列
     * @return array 計算結果配列
     */
    public function calculateBatchFees($products) {
        $results = [];
        $summary = [
            'total_items' => count($products),
            'total_gross_amount' => 0,
            'total_fees' => 0,
            'total_net_amount' => 0,
            'average_fee_percentage' => 0
        ];
        
        foreach ($products as $index => $product) {
            try {
                $result = $this->calculateEbayFees(
                    $product['category_id'] ?? '99999',
                    $product['price_usd'] ?? 0,
                    $product['listing_format'] ?? 'fixed_price',
                    $product['options'] ?? []
                );
                
                $results[$index] = $result;
                
                // サマリー更新
                $summary['total_gross_amount'] += $result['summary']['gross_amount'];
                $summary['total_fees'] += $result['summary']['total_fees'];
                $summary['total_net_amount'] += $result['summary']['net_amount'];
                
            } catch (Exception $e) {
                $results[$index] = [
                    'error' => true,
                    'message' => $e->getMessage(),
                    'product_index' => $index
                ];
            }
        }
        
        $summary['average_fee_percentage'] = $summary['total_gross_amount'] > 0 ? 
            ($summary['total_fees'] / $summary['total_gross_amount']) * 100 : 0;
        
        return [
            'results' => $results,
            'summary' => $summary,
            'processed_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 手数料統計情報取得
     */
    public function getFeeStatistics($categoryId = null, $period = '30days') {
        try {
            $whereClause = '';
            $params = [];
            
            if ($categoryId) {
                $whereClause .= " WHERE category_id = ?";
                $params[] = $categoryId;
            }
            
            // 期間指定があれば追加（今回は簡略化）
            
            $sql = "
                SELECT 
                    category_id,
                    AVG(final_value_fee_percent) as avg_fee_percent,
                    MIN(final_value_fee_percent) as min_fee_percent,
                    MAX(final_value_fee_percent) as max_fee_percent,
                    COUNT(*) as category_count
                FROM ebay_category_fees 
                {$whereClause}
                GROUP BY category_id
                ORDER BY avg_fee_percent DESC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log('Fee Statistics Error: ' . $e->getMessage());
            return [];
        }
    }
}
?>