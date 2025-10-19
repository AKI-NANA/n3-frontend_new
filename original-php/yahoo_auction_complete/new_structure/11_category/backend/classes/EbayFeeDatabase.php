<?php
/**
 * eBay手数料マスターデータ管理システム - 現実版
 * ファイル: EbayFeeDatabase.php
 * 手動メンテナンス + 公式監視による現実的手数料管理
 */

class EbayFeeDatabase {
    
    /**
     * 2024年最新eBay手数料データ（手動メンテナンス）
     * 最終更新: 2024年2月14日（eBay公式発表に基づく）
     */
    public static function getFeeStructure2024() {
        return [
            // メタデータ
            'meta' => [
                'last_updated' => '2024-02-14',
                'source' => 'eBay Seller Center Official',
                'next_review_date' => '2024-05-15', // 四半期レビュー
                'currency' => 'USD',
                'region' => 'US'
            ],
            
            // 基本手数料構造
            'base_fees' => [
                'insertion_fee' => 0.35, // 250件超過時
                'per_order_fee_over_10' => 0.40,
                'per_order_fee_under_10' => 0.30,
                'final_value_fee_max' => 750.00, // 多くのカテゴリー
                'international_fee_percent' => 1.65
            ],
            
            // カテゴリー別Final Value Fee（主要カテゴリーのみ）
            'category_fees' => [
                // エレクトロニクス
                '293' => [
                    'name' => 'Cell Phones & Smartphones',
                    'final_value_fee_percent' => 12.90,
                    'final_value_fee_max' => 750.00
                ],
                '625' => [
                    'name' => 'Cameras & Photo',
                    'final_value_fee_percent' => 12.35,
                    'final_value_fee_max' => 750.00
                ],
                '58058' => [
                    'name' => 'Sports Trading Cards', 
                    'final_value_fee_percent' => 12.35,
                    'final_value_fee_max' => 750.00
                ],
                
                // 衣類・アクセサリー
                '11450' => [
                    'name' => 'Clothing, Shoes & Accessories',
                    'final_value_fee_percent' => 13.25, // 2024年変更
                    'final_value_fee_max' => 750.00
                ],
                '15032' => [
                    'name' => 'Jewelry & Watches',
                    'final_value_fee_percent' => 13.25,
                    'final_value_fee_max' => 750.00
                ],
                
                // メディア
                '267' => [
                    'name' => 'Books, Movies & Music',
                    'final_value_fee_percent' => 15.30, // 高い手数料
                    'final_value_fee_max' => 750.00
                ],
                
                // 特殊カテゴリー（低い手数料）
                '10542' => [
                    'name' => 'Musical Instruments & Gear',
                    'final_value_fee_percent' => 6.35, // 優遇カテゴリー
                    'final_value_fee_max' => 350.00
                ],
                '12576' => [
                    'name' => 'Business & Industrial Equipment',
                    'final_value_fee_percent' => 3.00, // 最低手数料
                    'final_value_fee_max' => 250.00
                ],
                
                // eBay Motors（特殊）
                '6001' => [
                    'name' => 'eBay Motors - Vehicles',
                    'final_value_fee_percent' => 0, // パーセンテージなし
                    'final_value_fee_fixed' => 125.00, // 固定手数料
                    'deposit_processing_fee' => 2.80 // デポジット手数料%
                ]
            ],
            
            // デフォルト手数料（上記以外のカテゴリー）
            'default_category' => [
                'final_value_fee_percent' => 13.25, // 2024年標準
                'final_value_fee_max' => 750.00
            ],
            
            // Store会員特典（手数料割引）
            'store_discounts' => [
                'starter' => [
                    'monthly_fee' => 7.95,
                    'fee_discount_percent' => 0 // 割引なし
                ],
                'basic' => [
                    'monthly_fee' => 27.95,
                    'fee_discount_percent' => 4 // 4%割引
                ],
                'premium' => [
                    'monthly_fee' => 74.95,
                    'fee_discount_percent' => 6 // 6%割引
                ],
                'anchor' => [
                    'monthly_fee' => 349.95,
                    'fee_discount_percent' => 8 // 8%割引
                ],
                'enterprise' => [
                    'monthly_fee' => 2999.95,
                    'fee_discount_percent' => 10 // 10%割引
                ]
            ],
            
            // Top Rated Seller特典
            'top_rated_discount' => 10, // 10%割引
            
            // 手数料変更履歴
            'change_history' => [
                [
                    'date' => '2024-02-14',
                    'changes' => [
                        'Most categories increased by 0.35%',
                        'Clothing category fee adjusted to 13.25%'
                    ],
                    'source' => 'eBay Seller Center Announcement'
                ],
                [
                    'date' => '2023-08-01',
                    'changes' => [
                        'Per order fee increased to $0.40 for orders >$10'
                    ],
                    'source' => 'eBay Fee Update'
                ]
            ]
        ];
    }
    
    /**
     * カテゴリー別手数料取得
     */
    public static function getCategoryFee($categoryId) {
        $feeStructure = self::getFeeStructure2024();
        
        if (isset($feeStructure['category_fees'][$categoryId])) {
            return $feeStructure['category_fees'][$categoryId];
        }
        
        // デフォルト手数料を返す
        return array_merge(
            $feeStructure['default_category'],
            ['name' => 'Other Category']
        );
    }
    
    /**
     * 手数料計算（実用的計算エンジン）
     */
    public static function calculateFees($categoryId, $salePrice, $shippingCost = 0, $options = []) {
        $categoryFee = self::getCategoryFee($categoryId);
        $feeStructure = self::getFeeStructure2024();
        
        $totalSaleAmount = $salePrice + $shippingCost;
        
        // Final Value Fee計算
        if (isset($categoryFee['final_value_fee_fixed'])) {
            // 固定手数料（eBay Motors等）
            $finalValueFee = $categoryFee['final_value_fee_fixed'];
        } else {
            // パーセンテージベース手数料
            $feePercent = $categoryFee['final_value_fee_percent'];
            $finalValueFee = ($totalSaleAmount * $feePercent) / 100;
            
            // 最大手数料キャップ適用
            $maxFee = $categoryFee['final_value_fee_max'] ?? 750.00;
            $finalValueFee = min($finalValueFee, $maxFee);
        }
        
        // Per Order Fee
        $perOrderFee = $totalSaleAmount > 10 ? 
            $feeStructure['base_fees']['per_order_fee_over_10'] : 
            $feeStructure['base_fees']['per_order_fee_under_10'];
        
        // Store割引適用
        if (isset($options['store_level'])) {
            $storeData = $feeStructure['store_discounts'][$options['store_level']] ?? null;
            if ($storeData) {
                $discount = ($finalValueFee * $storeData['fee_discount_percent']) / 100;
                $finalValueFee -= $discount;
            }
        }
        
        // Top Rated Seller割引
        if ($options['is_top_rated'] ?? false) {
            $topRatedDiscount = ($finalValueFee * $feeStructure['top_rated_discount']) / 100;
            $finalValueFee -= $topRatedDiscount;
        }
        
        // 国際手数料
        $internationalFee = 0;
        if ($options['is_international'] ?? false) {
            $internationalFee = ($totalSaleAmount * $feeStructure['base_fees']['international_fee_percent']) / 100;
        }
        
        $totalFees = $finalValueFee + $perOrderFee + $internationalFee;
        $netAmount = $totalSaleAmount - $totalFees;
        
        return [
            'breakdown' => [
                'sale_price' => $salePrice,
                'shipping_cost' => $shippingCost,
                'total_sale_amount' => $totalSaleAmount,
                'final_value_fee' => round($finalValueFee, 2),
                'per_order_fee' => $perOrderFee,
                'international_fee' => round($internationalFee, 2),
                'total_fees' => round($totalFees, 2)
            ],
            'summary' => [
                'net_amount' => round($netAmount, 2),
                'total_fee_percentage' => round(($totalFees / $totalSaleAmount) * 100, 2),
                'category_name' => $categoryFee['name']
            ]
        ];
    }
    
    /**
     * 手数料データの妥当性確認
     */
    public static function validateFeeData() {
        $feeData = self::getFeeStructure2024();
        $lastUpdated = strtotime($feeData['meta']['last_updated']);
        $threeMonthsAgo = strtotime('-3 months');
        
        if ($lastUpdated < $threeMonthsAgo) {
            return [
                'status' => 'outdated',
                'message' => '手数料データが3ヶ月以上更新されていません。eBay公式サイトで最新情報を確認してください。',
                'last_updated' => $feeData['meta']['last_updated']
            ];
        }
        
        return [
            'status' => 'current',
            'message' => '手数料データは最新です。',
            'last_updated' => $feeData['meta']['last_updated']
        ];
    }
    
    /**
     * 手数料比較（カテゴリー間）
     */
    public static function compareCategoryFees($salePrice = 100) {
        $feeStructure = self::getFeeStructure2024();
        $comparisons = [];
        
        foreach ($feeStructure['category_fees'] as $categoryId => $categoryData) {
            $fees = self::calculateFees($categoryId, $salePrice);
            $comparisons[$categoryId] = [
                'category_name' => $categoryData['name'],
                'fee_percentage' => $fees['summary']['total_fee_percentage'],
                'total_fees' => $fees['breakdown']['total_fees'],
                'net_amount' => $fees['summary']['net_amount']
            ];
        }
        
        // 手数料の低い順にソート
        usort($comparisons, function($a, $b) {
            return $a['fee_percentage'] <=> $b['fee_percentage'];
        });
        
        return $comparisons;
    }
}

/**
 * eBay公式情報監視システム
 */
class EbayOfficialMonitor {
    private $monitorUrls = [
        'seller_updates' => 'https://www.ebay.com/sellercenter/resources/seller-updates',
        'fee_structure' => 'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees',
        'developer_updates' => 'https://developer.ebay.com/support'
    ];
    
    private $feeChangeKeywords = [
        'final value fee',
        'fee changes',
        'selling fees',
        'fee increase',
        'fee decrease',
        'commission',
        'percentage'
    ];
    
    /**
     * 手数料変更の監視
     */
    public function checkForFeeUpdates() {
        $alerts = [];
        
        foreach ($this->monitorUrls as $source => $url) {
            try {
                $content = $this->fetchPageContent($url);
                
                foreach ($this->feeChangeKeywords as $keyword) {
                    if ($this->containsKeyword($content, $keyword)) {
                        $alerts[] = [
                            'source' => $source,
                            'url' => $url,
                            'keyword' => $keyword,
                            'detected_at' => date('Y-m-d H:i:s'),
                            'priority' => $this->getPriorityLevel($keyword)
                        ];
                    }
                }
                
            } catch (Exception $e) {
                error_log("Monitor error for {$source}: " . $e->getMessage());
            }
        }
        
        if (!empty($alerts)) {
            $this->sendAlerts($alerts);
        }
        
        return $alerts;
    }
    
    /**
     * ページ内容取得
     */
    private function fetchPageContent($url) {
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'user_agent' => 'eBay Fee Monitor 1.0'
            ]
        ]);
        
        $content = file_get_contents($url, false, $context);
        
        if ($content === false) {
            throw new Exception("Failed to fetch content from {$url}");
        }
        
        return strtolower($content);
    }
    
    /**
     * キーワード検出
     */
    private function containsKeyword($content, $keyword) {
        return strpos($content, strtolower($keyword)) !== false;
    }
    
    /**
     * 優先度レベル判定
     */
    private function getPriorityLevel($keyword) {
        $highPriorityKeywords = ['fee increase', 'final value fee'];
        return in_array($keyword, $highPriorityKeywords) ? 'high' : 'medium';
    }
    
    /**
     * アラート送信
     */
    private function sendAlerts($alerts) {
        $message = "eBay手数料変更の可能性を検出しました:\n\n";
        
        foreach ($alerts as $alert) {
            $message .= "- {$alert['source']}: {$alert['keyword']} ({$alert['url']})\n";
        }
        
        $message .= "\neBay公式サイトで詳細を確認し、必要に応じて手数料マスターデータを更新してください。";
        
        // ログ出力
        error_log("[FEE_MONITOR] " . $message);
        
        // 実装可能なアラート方法:
        // - メール送信
        // - Slack webhook
        // - ファイル書き出し
        
        $this->writeAlertFile($message);
    }
    
    /**
     * アラートファイル出力
     */
    private function writeAlertFile($message) {
        $alertFile = __DIR__ . '/logs/fee_alerts.log';
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents($alertFile, "[{$timestamp}] {$message}\n\n", FILE_APPEND | LOCK_EX);
    }
}

// 使用例
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    // 手数料計算テスト
    echo "=== eBay手数料計算テスト ===\n";
    
    $testPrice = 100;
    $categories = ['293', '625', '11450', '267', '10542'];
    
    foreach ($categories as $categoryId) {
        $fees = EbayFeeDatabase::calculateFees($categoryId, $testPrice);
        echo "カテゴリー {$categoryId} ({$fees['summary']['category_name']}): " .
             "{$fees['summary']['total_fee_percentage']}% (${$fees['breakdown']['total_fees']})\n";
    }
    
    echo "\n=== 手数料データ妥当性確認 ===\n";
    $validation = EbayFeeDatabase::validateFeeData();
    echo "{$validation['status']}: {$validation['message']}\n";
    
    echo "\n=== 公式情報監視テスト ===\n";
    $monitor = new EbayOfficialMonitor();
    $alerts = $monitor->checkForFeeUpdates();
    echo "検出されたアラート: " . count($alerts) . "件\n";
}
?>