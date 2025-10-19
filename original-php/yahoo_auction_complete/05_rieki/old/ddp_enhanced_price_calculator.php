<?php
/**
 * DDP/DDU対応 強化利益計算システム
 * 
 * 最終方針:
 * - アメリカ向け: DDP（関税・VAT込み）
 * - その他の国: DDU（関税・VAT別途）
 * - データベースに両価格を保存し、差額情報を管理
 */

class EnhancedPriceCalculator {
    private $pdo;
    
    // 国別税制設定
    private $taxSettings = [
        'US' => [
            'type' => 'DDP',
            'import_duty_rates' => [
                '8517.12' => 0,      // スマートフォン
                '9001.90' => 0.025,  // 光学機器
                '8528.72' => 0.05,   // 液晶モニター
                '6203.42' => 0.167,  // 衣類・ズボン
                '9503.00' => 0,      // おもちゃ
                '8471.30' => 0       // コンピューター
            ],
            'sales_tax_rate' => 0.08,  // 平均州税
            'threshold_usd' => 800,    // 免税限度額
            'fta_benefits' => true     // 日本-アメリカFTA
        ],
        'DE' => [
            'type' => 'DDU',
            'import_duty_rates' => [
                '8517.12' => 0,
                '9001.90' => 0.025,
                '8528.72' => 0.14,
                '6203.42' => 0.12,
                '9503.00' => 0.047,
                '8471.30' => 0
            ],
            'vat_rate' => 0.19,
            'threshold_eur' => 22,
            'fta_benefits' => true     // 日本-EU EPA
        ],
        'GB' => [
            'type' => 'DDU',
            'import_duty_rates' => [
                '8517.12' => 0,
                '9001.90' => 0.025,
                '8528.72' => 0.14,
                '6203.42' => 0.12,
                '9503.00' => 0.047,
                '8471.30' => 0
            ],
            'vat_rate' => 0.20,
            'threshold_gbp' => 15,
            'fta_benefits' => false    // Brexit後
        ],
        'CA' => [
            'type' => 'DDU',
            'import_duty_rates' => [
                '8517.12' => 0,
                '9001.90' => 0.025,
                '8528.72' => 0.06,
                '6203.42' => 0.18,
                '9503.00' => 0,
                '8471.30' => 0
            ],
            'gst_rate' => 0.13,        // GST + PST平均
            'threshold_cad' => 20,
            'fta_benefits' => true     // USMCA
        ]
    ];

    // eBay送料上限設定
    private $shippingLimits = [
        'US' => ['standard' => 50, 'express' => 100],
        'DE' => ['standard' => 50, 'express' => 100],
        'GB' => ['standard' => 40, 'express' => 80],
        'AU' => ['standard' => 70, 'express' => 150]
    ];

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    /**
     * DDP/DDU両方の価格を計算するメイン関数
     */
    public function calculateBothPrices($itemData) {
        try {
            // 基本データ検証
            $validatedData = $this->validateItemData($itemData);
            
            // 基本計算（共通）
            $baseCalculation = $this->calculateBaseMetrics($validatedData);
            
            // DDU価格計算（関税・VAT別途）
            $dduResult = $this->calculateDDUPrice($validatedData, $baseCalculation);
            
            // DDP価格計算（関税・VAT込み）
            $ddpResult = $this->calculateDDPPrice($validatedData, $baseCalculation);
            
            // 価格差分分析
            $priceAnalysis = $this->analyzePriceDifference($dduResult, $ddpResult);
            
            // 国別出品戦略
            $listingStrategy = $this->generateListingStrategy($dduResult, $ddpResult, $validatedData);
            
            // データベース保存
            $calculationId = $this->saveBothCalculations($validatedData, $dduResult, $ddpResult, $priceAnalysis);
            
            return [
                'success' => true,
                'calculation_id' => $calculationId,
                'item_data' => $validatedData,
                'ddu_result' => $dduResult,
                'ddp_result' => $ddpResult,
                'price_analysis' => $priceAnalysis,
                'listing_strategy' => $listingStrategy,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * 基本指標計算
     */
    private function calculateBaseMetrics($itemData) {
        // 為替レート取得
        $exchangeRate = $this->getExchangeRate();
        
        // カテゴリー別手数料取得
        $categoryFees = $this->getEbayCategoryFees($itemData['category_id']);
        
        // 基本コスト計算（円→USD）
        $totalCostJPY = $itemData['price_jpy'] + $itemData['shipping_jpy'];
        $totalCostUSD = $totalCostJPY / $exchangeRate['calculated_rate'];
        
        // 利益設定取得
        $profitSettings = $this->getProfitSettings($itemData);
        
        return [
            'exchange_rate' => $exchangeRate,
            'category_fees' => $categoryFees,
            'total_cost_usd' => $totalCostUSD,
            'profit_settings' => $profitSettings
        ];
    }

    /**
     * DDU価格計算（関税・VAT別途）
     */
    private function calculateDDUPrice($itemData, $baseCalc) {
        $targetProfitUSD = $baseCalc['total_cost_usd'] * ($baseCalc['profit_settings']['profit_margin_target'] / 100);
        
        // 基本販売価格（関税・VAT抜き）
        $baseSellingPrice = $baseCalc['total_cost_usd'] + $targetProfitUSD;
        
        // eBay手数料計算
        $fees = $this->calculateEbayFees($baseSellingPrice, $baseCalc['category_fees']);
        
        // 逆算による推奨価格
        $recommendedPrice = ($baseCalc['total_cost_usd'] + $targetProfitUSD + $fees['insertion_fee']) / 
                           (1 - $fees['final_value_rate']);
        
        // 実際の利益計算
        $actualFees = $this->calculateEbayFees($recommendedPrice, $baseCalc['category_fees']);
        $actualProfit = $recommendedPrice - $baseCalc['total_cost_usd'] - $actualFees['total_fees'];
        $profitMargin = ($actualProfit / $recommendedPrice) * 100;
        $roi = ($actualProfit / $baseCalc['total_cost_usd']) * 100;
        
        return [
            'pricing_type' => 'DDU',
            'recommended_price_usd' => round($recommendedPrice, 2),
            'base_product_price_usd' => round($recommendedPrice, 2),
            'shipping_cost_usd' => 0, // 別途設定
            'taxes_and_duties' => [
                'included_in_price' => false,
                'buyer_responsibility' => true,
                'estimated_duties' => 'Varies by country'
            ],
            'fees' => $actualFees,
            'profit_metrics' => [
                'profit_usd' => round($actualProfit, 2),
                'profit_margin_percent' => round($profitMargin, 2),
                'roi_percent' => round($roi, 2)
            ]
        ];
    }

    /**
     * DDP価格計算（関税・VAT込み）- アメリカ向け
     */
    private function calculateDDPPrice($itemData, $baseCalc) {
        $targetCountry = 'US'; // アメリカ向けDDP
        $taxConfig = $this->taxSettings[$targetCountry];
        
        // HSコード取得（商品カテゴリーから推定）
        $hsCode = $this->estimateHSCode($itemData['category_id']);
        
        // 基本価格（DDU価格をベースに）
        $basePrice = $baseCalc['total_cost_usd'] * (1 + $baseCalc['profit_settings']['profit_margin_target'] / 100);
        
        // アメリカの関税計算
        $dutyRate = $taxConfig['import_duty_rates'][$hsCode] ?? 0.05; // デフォルト5%
        
        // FTA適用チェック（日本原産の場合）
        if ($itemData['origin_country'] === 'JP' && $taxConfig['fta_benefits']) {
            $dutyRate = max(0, $dutyRate - 0.02); // FTA優遇
        }
        
        $importDuty = $basePrice * $dutyRate;
        
        // 州税計算（商品価格+送料+関税に対して）
        $taxableAmount = $basePrice + $importDuty;
        $salesTax = $taxableAmount * $taxConfig['sales_tax_rate'];
        
        // 総税額
        $totalTaxes = $importDuty + $salesTax;
        
        // DDP価格（税込み価格）
        $ddpProductPrice = $basePrice + $totalTaxes;
        
        // eBay手数料計算
        $fees = $this->calculateEbayFees($ddpProductPrice, $baseCalc['category_fees']);
        
        // 送料上限チェックと調整
        $shippingAdjustment = $this->checkShippingLimitAdjustment($ddpProductPrice, 'US');
        
        $finalProductPrice = $ddpProductPrice + $shippingAdjustment['price_adjustment'];
        
        // 実際の利益計算
        $actualFees = $this->calculateEbayFees($finalProductPrice, $baseCalc['category_fees']);
        $actualProfit = $finalProductPrice - $baseCalc['total_cost_usd'] - $actualFees['total_fees'] - $totalTaxes;
        $profitMargin = ($actualProfit / $finalProductPrice) * 100;
        $roi = ($actualProfit / $baseCalc['total_cost_usd']) * 100;
        
        return [
            'pricing_type' => 'DDP',
            'target_country' => $targetCountry,
            'recommended_price_usd' => round($finalProductPrice, 2),
            'base_product_price_usd' => round($basePrice, 2),
            'shipping_cost_usd' => $shippingAdjustment['adjusted_shipping'],
            'taxes_and_duties' => [
                'included_in_price' => true,
                'import_duty_usd' => round($importDuty, 2),
                'sales_tax_usd' => round($salesTax, 2),
                'total_taxes_usd' => round($totalTaxes, 2),
                'duty_rate_percent' => round($dutyRate * 100, 2),
                'sales_tax_rate_percent' => round($taxConfig['sales_tax_rate'] * 100, 2),
                'fta_applied' => $taxConfig['fta_benefits'] && $itemData['origin_country'] === 'JP'
            ],
            'fees' => $actualFees,
            'shipping_adjustment' => $shippingAdjustment,
            'profit_metrics' => [
                'profit_usd' => round($actualProfit, 2),
                'profit_margin_percent' => round($profitMargin, 2),
                'roi_percent' => round($roi, 2)
            ]
        ];
    }

    /**
     * 価格差分分析
     */
    private function analyzePriceDifference($dduResult, $ddpResult) {
        $priceDiff = $ddpResult['recommended_price_usd'] - $dduResult['recommended_price_usd'];
        $percentDiff = ($priceDiff / $dduResult['recommended_price_usd']) * 100;
        
        // クーポン戦略提案
        $couponStrategy = $this->generateCouponStrategy($priceDiff, $percentDiff);
        
        return [
            'price_difference_usd' => round($priceDiff, 2),
            'percentage_difference' => round($percentDiff, 2),
            'tax_burden_shift' => round($ddpResult['taxes_and_duties']['total_taxes_usd'] ?? 0, 2),
            'competitiveness_impact' => $this->assessCompetitiveness($percentDiff),
            'coupon_strategy' => $couponStrategy,
            'recommendation' => $this->generatePricingRecommendation($dduResult, $ddpResult, $percentDiff)
        ];
    }

    /**
     * クーポン戦略生成
     */
    private function generateCouponStrategy($priceDiff, $percentDiff) {
        if ($percentDiff <= 5) {
            return [
                'recommended' => false,
                'reason' => '価格差が小さいため、クーポンは不要。DDP価格で競争力を維持できます。'
            ];
        } elseif ($percentDiff <= 15) {
            return [
                'recommended' => true,
                'type' => 'percentage_discount',
                'discount_rate' => min(10, round($percentDiff / 2, 1)),
                'target_countries' => ['DE', 'GB', 'FR', 'CA'],
                'reason' => 'DDU市場での価格競争力向上のため、限定的なクーポン使用を推奨。',
                'note' => '最安値表示への影響を最小化しつつ、実質価格を調整。'
            ];
        } else {
            return [
                'recommended' => false,
                'reason' => '価格差が大きすぎるため、クーポンではなく価格戦略の見直しを推奨。',
                'alternative' => '商品選択基準の見直しまたは利益率調整を検討してください。'
            ];
        }
    }

    /**
     * 国別出品戦略生成
     */
    private function generateListingStrategy($dduResult, $ddpResult, $itemData) {
        return [
            'us_listing' => [
                'pricing_type' => 'DDP',
                'product_price_usd' => $ddpResult['recommended_price_usd'],
                'shipping_usd' => $ddpResult['shipping_cost_usd'],
                'shipping_exclusions' => ['Worldwide except US'],
                'title_addition' => '[Tax & Duty Included - No Hidden Fees]',
                'description_note' => 'Price includes all taxes and duties. No additional charges upon delivery.',
                'ebay_settings' => [
                    'global_shipping_program' => true,
                    'calculated_shipping' => false,
                    'returns_accepted' => true
                ]
            ],
            'international_listing' => [
                'pricing_type' => 'DDU',
                'product_price_usd' => $dduResult['recommended_price_usd'],
                'shipping_usd' => 0, // 別途計算
                'shipping_exclusions' => ['United States'],
                'title_addition' => '[International Shipping Available]',
                'description_note' => 'Import duties and taxes may apply and are buyer\'s responsibility.',
                'ebay_settings' => [
                    'global_shipping_program' => false,
                    'calculated_shipping' => true,
                    'returns_accepted' => true
                ]
            ],
            'automation_settings' => [
                'auto_create_both_listings' => true,
                'sync_inventory' => true,
                'price_monitoring' => true,
                'competitor_tracking' => true
            ]
        ];
    }

    /**
     * データベース保存
     */
    private function saveBothCalculations($itemData, $dduResult, $ddpResult, $analysis) {
        try {
            $this->pdo->beginTransaction();
            
            // メイン計算レコード
            $stmt = $this->pdo->prepare("
                INSERT INTO enhanced_profit_calculations (
                    item_id, category_id, calculation_type, 
                    ddu_price_usd, ddp_price_usd, price_difference_usd, price_difference_percent,
                    ddu_profit_margin, ddp_profit_margin, ddu_roi, ddp_roi,
                    tax_burden_usd, competitiveness_score, coupon_recommended,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $itemData['id'],
                $itemData['category_id'],
                'DUAL_CALCULATION',
                $dduResult['recommended_price_usd'],
                $ddpResult['recommended_price_usd'],
                $analysis['price_difference_usd'],
                $analysis['percentage_difference'],
                $dduResult['profit_metrics']['profit_margin_percent'],
                $ddpResult['profit_metrics']['profit_margin_percent'],
                $dduResult['profit_metrics']['roi_percent'],
                $ddpResult['profit_metrics']['roi_percent'],
                $ddpResult['taxes_and_duties']['total_taxes_usd'] ?? 0,
                $this->calculateCompetitivenessScore($analysis),
                $analysis['coupon_strategy']['recommended'] ? 1 : 0
            ]);
            
            $calculationId = $this->pdo->lastInsertId();
            
            // 詳細データを別テーブルに保存
            $this->saveCalculationDetails($calculationId, $dduResult, $ddpResult);
            
            $this->pdo->commit();
            return $calculationId;
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw new Exception("計算結果保存エラー: " . $e->getMessage());
        }
    }

    /**
     * 既存のメソッドを活用したヘルパー関数群
     */
    
    private function getExchangeRate() {
        // 既存のExchangeRateクラスを使用
        return [
            'base_rate' => 148.50,
            'safety_margin' => 5.0,
            'calculated_rate' => 155.93
        ];
    }
    
    private function getEbayCategoryFees($categoryId) {
        // 既存のカテゴリー連携機能を使用
        $stmt = $this->pdo->prepare("
            SELECT t2.tier1_rate, t2.tier1_threshold, t2.tier2_rate, t2.per_order_fee
            FROM ebay_categories_cache AS t1
            JOIN fee_tier_structures AS t2 ON t1.fee_tier_group = t2.fee_tier_group
            WHERE t1.category_id = ?
        ");
        $stmt->execute([$categoryId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: [
            'tier1_rate' => 0.10,
            'tier1_threshold' => 250,
            'tier2_rate' => 0.12,
            'per_order_fee' => 0.35
        ];
    }
    
    private function calculateEbayFees($price, $categoryFees) {
        $insertionFee = $categoryFees['per_order_fee'];
        
        if ($price <= $categoryFees['tier1_threshold']) {
            $finalValueFee = $price * $categoryFees['tier1_rate'];
        } else {
            $finalValueFee = ($categoryFees['tier1_threshold'] * $categoryFees['tier1_rate']) +
                           (($price - $categoryFees['tier1_threshold']) * $categoryFees['tier2_rate']);
        }
        
        return [
            'insertion_fee' => $insertionFee,
            'final_value_fee' => $finalValueFee,
            'total_fees' => $insertionFee + $finalValueFee,
            'final_value_rate' => $categoryFees['tier1_rate']
        ];
    }
    
    private function estimateHSCode($categoryId) {
        // カテゴリーIDからHSコードを推定
        $categoryMapping = [
            293 => '8517.12',    // Consumer Electronics
            11450 => '6203.42',  // Clothing
            58058 => '9503.00',  // Collectibles
            267 => '4901.99',    // Books
            550 => '9703.00'     // Art
        ];
        
        return $categoryMapping[$categoryId] ?? '9999.99';
    }
    
    private function checkShippingLimitAdjustment($price, $country) {
        $limit = $this->shippingLimits[$country]['standard'] ?? 50;
        $estimatedShipping = min(25, $price * 0.1); // 推定送料
        
        if ($estimatedShipping > $limit) {
            return [
                'exceeds_limit' => true,
                'price_adjustment' => $estimatedShipping - $limit,
                'adjusted_shipping' => $limit
            ];
        }
        
        return [
            'exceeds_limit' => false,
            'price_adjustment' => 0,
            'adjusted_shipping' => $estimatedShipping
        ];
    }
    
    private function validateItemData($data) {
        // 必要なデータ検証
        return array_merge([
            'id' => '',
            'price_jpy' => 0,
            'shipping_jpy' => 0,
            'category_id' => 293,
            'origin_country' => 'JP'
        ], $data);
    }
    
    private function getProfitSettings($itemData) {
        return [
            'profit_margin_target' => 25.0,
            'minimum_profit_amount' => 5.0
        ];
    }
    
    private function assessCompetitiveness($percentDiff) {
        if ($percentDiff <= 5) return 'EXCELLENT';
        if ($percentDiff <= 10) return 'GOOD';
        if ($percentDiff <= 15) return 'FAIR';
        return 'POOR';
    }
    
    private function generatePricingRecommendation($ddu, $ddp, $percentDiff) {
        if ($percentDiff <= 10) {
            return 'DDP戦略推奨: 価格差が小さく、購入ハードル軽減効果が大きい。';
        } else {
            return 'DDU戦略検討: 価格差が大きいため、市場分析と価格調整が必要。';
        }
    }
    
    private function calculateCompetitivenessScore($analysis) {
        $score = 100;
        $score -= min(50, $analysis['percentage_difference'] * 2);
        return max(0, $score);
    }
    
    private function saveCalculationDetails($calculationId, $dduResult, $ddpResult) {
        // 詳細データ保存ロジック
        return true;
    }
}

// データベーステーブル作成SQL
$createTableSQL = "
-- DDP/DDU対応拡張計算テーブル
CREATE TABLE IF NOT EXISTS enhanced_profit_calculations (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(50),
    category_id INTEGER,
    calculation_type VARCHAR(20) DEFAULT 'DUAL_CALCULATION',
    
    -- DDU価格データ
    ddu_price_usd DECIMAL(10,2),
    ddu_profit_margin DECIMAL(5,2),
    ddu_roi DECIMAL(5,2),
    
    -- DDP価格データ  
    ddp_price_usd DECIMAL(10,2),
    ddp_profit_margin DECIMAL(5,2),
    ddp_roi DECIMAL(5,2),
    
    -- 価格差分分析
    price_difference_usd DECIMAL(10,2),
    price_difference_percent DECIMAL(5,2),
    tax_burden_usd DECIMAL(10,2),
    
    -- 戦略指標
    competitiveness_score INTEGER,
    coupon_recommended BOOLEAN DEFAULT FALSE,
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_item_calculation (item_id, calculation_type),
    INDEX idx_price_difference (price_difference_percent),
    INDEX idx_competitiveness (competitiveness_score)
);

-- 出品戦略テーブル
CREATE TABLE IF NOT EXISTS listing_strategies (
    id SERIAL PRIMARY KEY,
    calculation_id INTEGER REFERENCES enhanced_profit_calculations(id),
    market_type ENUM('US_DDP', 'INTERNATIONAL_DDU'),
    listing_price_usd DECIMAL(10,2),
    shipping_price_usd DECIMAL(10,2),
    ebay_listing_id VARCHAR(50),
    status ENUM('PLANNED', 'ACTIVE', 'ENDED') DEFAULT 'PLANNED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
";

// 使用例
/*
$calculator = new EnhancedPriceCalculator($pdo);

$itemData = [
    'id' => 'YAHOO_12345',
    'price_jpy' => 15000,
    'shipping_jpy' => 800,
    'category_id' => 293,
    'origin_country' => 'JP'
];

$result = $calculator->calculateBothPrices($itemData);

if ($result['success']) {
    echo "DDU価格: $" . $result['ddu_result']['recommended_price_usd'] . "\n";
    echo "DDP価格: $" . $result['ddp_result']['recommended_price_usd'] . "\n";
    echo "価格差: " . $result['price_analysis']['percentage_difference'] . "%\n";
    echo "クーポン推奨: " . ($result['price_analysis']['coupon_strategy']['recommended'] ? 'Yes' : 'No') . "\n";
}
*/
?>