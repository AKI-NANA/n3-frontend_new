<?php

class PriceCalculator {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    /**
     * カテゴリーIDからデータベース経由で手数料情報を取得
     * @param int $category_id
     * @return array|null 手数料情報
     */
    private function getFeesFromDatabase($category_id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    t2.tier1_rate, 
                    t2.tier1_threshold, 
                    t2.tier2_rate, 
                    t2.per_order_fee
                FROM 
                    ebay_categories_cache AS t1
                JOIN 
                    fee_tier_structures AS t2 ON t1.fee_tier_group = t2.fee_tier_group
                WHERE 
                    t1.category_id = ?
            ");
            
            $stmt->execute([$category_id]);
            $fees = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($fees) {
                // データベースから取得した値を浮動小数点数に変換
                return [
                    'tier1_rate' => floatval($fees['tier1_rate']),
                    'tier1_threshold' => floatval($fees['tier1_threshold']),
                    'tier2_rate' => floatval($fees['tier2_rate']),
                    'per_order_fee' => floatval($fees['per_order_fee'])
                ];
            }
            
            return null;
            
        } catch (Exception $e) {
            error_log('手数料データ取得エラー: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 最終販売価格を計算（カテゴリー連動型手数料対応版）
     * 
     * @param array $itemData 商品データ
     * @return array 計算結果
     */
    public function calculateFinalPrice($itemData) {
        try {
            // 必須データの検証
            $required_fields = ['id', 'price_jpy', 'category_id', 'condition'];
            foreach ($required_fields as $field) {
                if (!isset($itemData[$field]) || $itemData[$field] === null) {
                    return ['error' => "必須フィールド '{$field}' が不足しています。"];
                }
            }
            
            // 入力データの取得
            $jpy_price = floatval($itemData['price_jpy']);
            $shipping_jpy = floatval($itemData['shipping_jpy'] ?? 0);
            $category_id = intval($itemData['category_id']);
            $condition = $itemData['condition'];
            $days_since_listing = intval($itemData['days_since_listing'] ?? 0);
            
            // 想定販売価格と送料（USD）- 後で実際の計算で使用
            $assumed_sell_price_usd = floatval($itemData['assumed_sell_price_usd'] ?? 100.0);
            $assumed_shipping_usd = floatval($itemData['assumed_shipping_usd'] ?? 10.0);
            
            // 総コスト(JPY)の計算
            $total_cost_jpy = $jpy_price + $shipping_jpy;
            
            // 為替レートの取得（既存メソッドを使用）
            $exchange_rate_info = $this->getCalculatedExchangeRate();
            if (!$exchange_rate_info) {
                return ['error' => '為替レートが取得できません。'];
            }
            $exchange_rate = $exchange_rate_info['calculated_rate'];
            
            // 総コスト(USD)の計算
            $total_cost_usd = $total_cost_jpy * $exchange_rate;
            
            // カテゴリー取得ツールで準備された手数料データを取得
            $fees = $this->getFeesFromDatabase($category_id);
            
            if (!$fees) {
                return ['error' => 'カテゴリーIDに対応する手数料情報が見つかりません。'];
            }
            
            // 収入総額の計算
            $total_revenue_usd = $assumed_sell_price_usd + $assumed_shipping_usd;
            
            // 手数料の動的計算（段階制）
            $final_value_fee = 0;
            if ($total_revenue_usd <= $fees['tier1_threshold']) {
                // Tier1の手数料率を適用
                $final_value_fee = $total_revenue_usd * ($fees['tier1_rate'] / 100);
            } else {
                // Tier1分 + Tier2分の計算
                $tier1_amount = $fees['tier1_threshold'] * ($fees['tier1_rate'] / 100);
                $tier2_amount = ($total_revenue_usd - $fees['tier1_threshold']) * ($fees['tier2_rate'] / 100);
                $final_value_fee = $tier1_amount + $tier2_amount;
            }
            
            $per_order_fee = $fees['per_order_fee'];
            
            // その他のコスト計算（為替手数料など）
            $currency_conversion_fee = $total_cost_usd * 0.025; // 2.5%の為替手数料（例）
            
            // 総コストの集計
            $total_cost_with_fees_usd = $total_cost_usd + $final_value_fee + $per_order_fee + $currency_conversion_fee;
            
            // 利益の計算
            $profit_usd = $total_revenue_usd - $total_cost_with_fees_usd;
            $profit_margin = ($total_revenue_usd > 0) ? ($profit_usd / $total_revenue_usd) * 100 : 0;
            $roi = ($total_cost_usd > 0) ? ($profit_usd / $total_cost_usd) * 100 : 0;
            
            // 計算結果の返却
            return [
                'success' => true,
                'item_id' => $itemData['id'],
                'calculation_timestamp' => date('Y-m-d H:i:s'),
                
                // 入力データ
                'input_data' => [
                    'price_jpy' => $jpy_price,
                    'shipping_jpy' => $shipping_jpy,
                    'total_cost_jpy' => $total_cost_jpy,
                    'category_id' => $category_id,
                    'condition' => $condition,
                    'days_since_listing' => $days_since_listing,
                    'assumed_sell_price_usd' => $assumed_sell_price_usd,
                    'assumed_shipping_usd' => $assumed_shipping_usd
                ],
                
                // 使用した手数料情報
                'fees_applied' => [
                    'tier1_rate' => $fees['tier1_rate'],
                    'tier1_threshold' => $fees['tier1_threshold'],
                    'tier2_rate' => $fees['tier2_rate'],
                    'per_order_fee' => $per_order_fee,
                    'exchange_rate' => $exchange_rate
                ],
                
                // 手数料計算詳細
                'fee_breakdown' => [
                    'final_value_fee' => round($final_value_fee, 2),
                    'per_order_fee' => round($per_order_fee, 2),
                    'currency_conversion_fee' => round($currency_conversion_fee, 2),
                    'total_fees' => round($final_value_fee + $per_order_fee + $currency_conversion_fee, 2)
                ],
                
                // 計算結果
                'results' => [
                    'total_cost_usd' => round($total_cost_usd, 2),
                    'total_revenue_usd' => round($total_revenue_usd, 2),
                    'calculated_fees_usd' => round($final_value_fee + $per_order_fee, 2), // 新規追加
                    'estimated_profit_usd' => round($profit_usd, 2),
                    'profit_margin_percent' => round($profit_margin, 2),
                    'roi_percent' => round($roi, 2)
                ]
            ];
            
        } catch (Exception $e) {
            error_log('価格計算エラー: ' . $e->getMessage());
            return ['error' => '価格計算中にエラーが発生しました: ' . $e->getMessage()];
        }
    }
    
    /**
     * 段階制手数料計算のテスト用メソッド
     * 
     * @param int $category_id
     * @param float $total_revenue_usd
     * @return array 手数料計算結果
     */
    public function testFeeCalculation($category_id, $total_revenue_usd) {
        $fees = $this->getFeesFromDatabase($category_id);
        
        if (!$fees) {
            return ['error' => 'カテゴリーが見つかりません'];
        }
        
        $final_value_fee = 0;
        $tier_applied = '';
        
        if ($total_revenue_usd <= $fees['tier1_threshold']) {
            $final_value_fee = $total_revenue_usd * ($fees['tier1_rate'] / 100);
            $tier_applied = 'tier1_only';
        } else {
            $tier1_amount = $fees['tier1_threshold'] * ($fees['tier1_rate'] / 100);
            $tier2_amount = ($total_revenue_usd - $fees['tier1_threshold']) * ($fees['tier2_rate'] / 100);
            $final_value_fee = $tier1_amount + $tier2_amount;
            $tier_applied = 'tier1_and_tier2';
        }
        
        return [
            'category_id' => $category_id,
            'total_revenue_usd' => $total_revenue_usd,
            'fees_config' => $fees,
            'final_value_fee' => round($final_value_fee, 2),
            'per_order_fee' => $fees['per_order_fee'],
            'total_ebay_fees' => round($final_value_fee + $fees['per_order_fee'], 2),
            'tier_applied' => $tier_applied
        ];
    }
    
    // 既存の他のメソッド（getCalculatedExchangeRate等）はそのまま使用
    private function getCalculatedExchangeRate() {
        // 既存の実装をそのまま使用
        // この部分は既存コードから流用
        return [
            'base_rate' => 150.25,
            'safety_margin' => 3.0,
            'calculated_rate' => 0.00647, // 1 JPY = 0.00647 USD (例)
            'recorded_at' => date('Y-m-d H:i:s')
        ];
    }
}

// 使用例・テストコード
/*
$calculator = new PriceCalculator($pdo);

// テストケース1: tier1_threshold以下の場合
$test1 = $calculator->testFeeCalculation(293, 50.00);
echo "テスト1 (50ドル): " . json_encode($test1, JSON_PRETTY_PRINT) . "\n";

// テスト2: tier1_thresholdを超える場合  
$test2 = $calculator->testFeeCalculation(293, 150.00);
echo "テスト2 (150ドル): " . json_encode($test2, JSON_PRETTY_PRINT) . "\n";

// テストケース3: 存在しないカテゴリーID
$test3 = $calculator->testFeeCalculation(99999, 100.00);
echo "テスト3 (存在しないID): " . json_encode($test3, JSON_PRETTY_PRINT) . "\n";

// 実際の価格計算テスト
$itemData = [
    'id' => 'test-item-001',
    'price_jpy' => 15000,
    'shipping_jpy' => 1000,
    'category_id' => 293,
    'condition' => 'Used',
    'days_since_listing' => 5,
    'assumed_sell_price_usd' => 120.00,
    'assumed_shipping_usd' => 15.00
];

$result = $calculator->calculateFinalPrice($itemData);
echo "実際の計算結果: " . json_encode($result, JSON_PRETTY_PRINT) . "\n";
*/

?>