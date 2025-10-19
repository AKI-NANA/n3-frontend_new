<?php
/**
 * 実用的な為替手数料対応システム
 * 
 * 戦略:
 * - デフォルトはUSA市場（USD）ベース
 * - 複数市場想定時のみ3%手数料を加算
 * - UIは最小限の変更で対応
 */

class PracticalCurrencyCalculator extends EnhancedPriceCalculator {
    
    /**
     * 実用的な価格計算（為替手数料の現実的対応）
     */
    public function calculatePracticalPrice($calculation_data) {
        // 基本計算を実行
        $base_calculation = parent::calculateComprehensivePrice($calculation_data);
        
        // 販売エリア戦略に応じて調整
        $primary_market = $calculation_data['primary_market'] ?? 'USA';
        
        switch ($primary_market) {
            case 'USA':
                // USAベース：為替手数料なし
                return $this->applyUSAStrategy($base_calculation);
                
            case 'MULTI':
                // 複数エリア：為替手数料3%を安全マージンとして加算
                return $this->applyMultiMarketStrategy($base_calculation);
                
            default:
                return $base_calculation;
        }
    }
    
    /**
     * USAベース戦略
     */
    private function applyUSAStrategy($calculation) {
        // 為替手数料は0として計算
        $calculation['results']['fee_breakdown']['currency_conversion_fee_usd'] = 0.00;
        $calculation['market_strategy'] = [
            'primary_market' => 'USA',
            'currency_conversion_risk' => 'LOW',
            'recommended_approach' => 'USA市場をメインターゲットとして価格設定。他国は送料で調整。'
        ];
        
        // 総手数料を再計算
        $fee_breakdown = $calculation['results']['fee_breakdown'];
        $total_fees = $fee_breakdown['final_value_fee_usd'] + 
                     $fee_breakdown['insertion_fee_usd'] + 
                     $fee_breakdown['international_fee_usd'];
        
        $calculation['results']['fee_breakdown']['total_fees_usd'] = round($total_fees, 2);
        
        // 利益を再計算
        $total_revenue = $calculation['results']['total_revenue_usd'];
        $total_cost = $calculation['results']['total_cost_usd'];
        $net_profit = $total_revenue - $total_cost - $total_fees;
        
        $calculation['results']['net_profit_usd'] = round($net_profit, 2);
        $calculation['results']['profit_margin_percent'] = round(($net_profit / $total_revenue) * 100, 2);
        
        return $calculation;
    }
    
    /**
     * 複数市場戦略
     */
    private function applyMultiMarketStrategy($calculation) {
        // 3%の為替手数料を想定してマージンに加算
        $revenue = $calculation['results']['total_revenue_usd'];
        $currency_fee = $revenue * 0.03;
        
        $calculation['results']['fee_breakdown']['currency_conversion_fee_usd'] = round($currency_fee, 2);
        $calculation['market_strategy'] = [
            'primary_market' => 'MULTI',
            'currency_conversion_risk' => 'HIGH',
            'recommended_approach' => '為替手数料3%を想定した安全マージン込み価格。実際の手数料は販売時に確定。'
        ];
        
        // 総手数料を再計算
        $fee_breakdown = $calculation['results']['fee_breakdown'];
        $total_fees = $fee_breakdown['final_value_fee_usd'] + 
                     $fee_breakdown['insertion_fee_usd'] + 
                     $fee_breakdown['international_fee_usd'] + 
                     $currency_fee;
        
        $calculation['results']['fee_breakdown']['total_fees_usd'] = round($total_fees, 2);
        
        // 利益を再計算
        $total_revenue = $calculation['results']['total_revenue_usd'];
        $total_cost = $calculation['results']['total_cost_usd'];
        $net_profit = $total_revenue - $total_cost - $total_fees;
        
        $calculation['results']['net_profit_usd'] = round($net_profit, 2);
        $calculation['results']['profit_margin_percent'] = round(($net_profit / $total_revenue) * 100, 2);
        
        // 推奨価格の調整（為替手数料分を上乗せ）
        $current_recommended = $calculation['results']['recommended_price_usd'];
        $adjusted_recommended = $current_recommended / (1 - 0.03); // 3%分を逆算して上乗せ
        $calculation['results']['recommended_price_usd'] = round($adjusted_recommended, 2);
        
        return $calculation;
    }
    
    /**
     * 送料による地域別価格調整の提案
     */
    public function suggestRegionalPricing($base_price_usd) {
        return [
            'USA' => [
                'item_price' => $base_price_usd,
                'shipping' => 15.00,
                'total' => $base_price_usd + 15.00,
                'notes' => 'ベース価格'
            ],
            'UK' => [
                'item_price' => $base_price_usd,
                'shipping' => 25.00, // 為替リスク分を送料に含める
                'total' => $base_price_usd + 25.00,
                'notes' => '為替リスク分を送料に含める'
            ],
            'EU' => [
                'item_price' => $base_price_usd,
                'shipping' => 28.00,
                'total' => $base_price_usd + 28.00,
                'notes' => '為替・VAT考慮'
            ],
            'AU' => [
                'item_price' => $base_price_usd,
                'shipping' => 22.00,
                'total' => $base_price_usd + 22.00,
                'notes' => 'オーストラリア向け調整'
            ]
        ];
    }
}

/**
 * UI用のヘルパー関数
 */
class CurrencyUIHelper {
    
    /**
     * 販売戦略選択UI生成
     */
    public static function generateMarketStrategySelector() {
        return '
        <div class="form-group">
            <label>販売戦略</label>
            <select id="primaryMarket" name="primary_market" onchange="updateCurrencyStrategy()">
                <option value="USA" selected>USA中心（推奨）</option>
                <option value="MULTI">複数国対応（為替リスク込み）</option>
            </select>
            <small style="color: var(--text-muted); font-size: 0.75rem;">
                USA中心：為替手数料なし、他国は送料で調整<br>
                複数国：3%の為替手数料を想定した価格設定
            </small>
        </div>';
    }
    
    /**
     * 為替戦略説明の生成
     */
    public static function generateStrategyExplanation($strategy) {
        $explanations = [
            'USA' => [
                'title' => 'USA市場中心戦略',
                'description' => 'eBay.comでの販売を主軸とし、為替手数料なしで最適化された価格設定です。',
                'benefits' => [
                    '為替手数料0%',
                    'シンプルな価格構造', 
                    '予測しやすい利益'
                ],
                'considerations' => [
                    '他国販売時は送料で調整',
                    'USDベースの価格設定'
                ]
            ],
            'MULTI' => [
                'title' => '複数市場対応戦略',
                'description' => '複数のeBayサイトでの販売を想定し、為替手数料3%を安全マージンとして含めた価格設定です。',
                'benefits' => [
                    '為替リスクを事前に考慮',
                    '複数市場での競争力',
                    '安全マージン確保'
                ],
                'considerations' => [
                    '実際の為替手数料は売れた時に確定',
                    'USA市場では若干高めの価格'
                ]
            ]
        ];
        
        return $explanations[$strategy] ?? $explanations['USA'];
    }
}
?>