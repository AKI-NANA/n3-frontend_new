# 統合配送システム 実装ロードマップ

## 🚀 Phase 1: 基盤構築（完了済み）
- [x] データベーススキーマ設計・実装
- [x] 統合UI作成（両プラットフォーム並列表示）
- [x] 統合API実装（並列計算・比較分析）
- [x] シンガポール（SG）初期データ投入

## 🌏 Phase 2: 多国展開（Week 1-2）

### 2.1 フィリピン（PH）対応
```sql
-- フィリピンデータ投入
INSERT INTO shopee_markets (country_code, country_name, market_code, currency_code, flag_emoji, exchange_rate) VALUES
('PH', 'Philippines', 'PH_18046_18066', 'PHP', '🇵🇭', 2.7);

-- Zone A, B設定
INSERT INTO shopee_zones (market_id, zone_code, zone_name, is_default) VALUES
((SELECT id FROM shopee_markets WHERE country_code = 'PH'), 'A', 'Metro Manila & Major Cities', TRUE),
((SELECT id FROM shopee_markets WHERE country_code = 'PH'), 'B', 'Provincial Areas', FALSE);

-- 料金データ投入（実データ要確認）
INSERT INTO shopee_sls_rates (market_id, zone_code, weight_from_g, weight_to_g, esf_amount, actual_amount, currency_code) VALUES
((SELECT id FROM shopee_markets WHERE country_code = 'PH'), 'A', 100, 500, 65.00, 45.00, 'PHP'),
((SELECT id FROM shopee_markets WHERE country_code = 'PH'), 'A', 501, 1000, 85.00, 60.00, 'PHP');
```

### 2.2 マレーシア（MY）対応
```sql
INSERT INTO shopee_markets (country_code, country_name, market_code, currency_code, flag_emoji, exchange_rate) VALUES
('MY', 'Malaysia', 'MY_18047_18067', 'MYR', '🇲🇾', 34.5);

-- Zone A, B, C設定（西マレーシア/東マレーシア）
INSERT INTO shopee_zones (market_id, zone_code, zone_name, is_default) VALUES
((SELECT id FROM shopee_markets WHERE country_code = 'MY'), 'A', 'Peninsular Malaysia - Urban', TRUE),
((SELECT id FROM shopee_markets WHERE country_code = 'MY'), 'B', 'Peninsular Malaysia - Rural', FALSE),
((SELECT id FROM shopee_markets WHERE country_code = 'MY'), 'C', 'East Malaysia (Sabah/Sarawak)', FALSE);
```

### 2.3 台湾（TW）対応
```sql
INSERT INTO shopee_markets (country_code, country_name, market_code, currency_code, flag_emoji, exchange_rate) VALUES
('TW', 'Taiwan', 'TW_18048_18068', 'TWD', '🇹🇼', 4.8);

INSERT INTO shopee_zones (market_id, zone_code, zone_name, is_default) VALUES
((SELECT id FROM shopee_markets WHERE country_code = 'TW'), 'A', 'Taiwan Island', TRUE);
```

## 🔧 Phase 3: 既存システム統合（Week 2-3）

### 3.1 Yahoo Auctionシステム統合
```php
// new_structure/02_scraping/integration/shopee_shipping_addon.php
class ShopeeShippingIntegration {
    
    /**
     * Yahoo商品スクレイピング時に送料も自動計算
     */
    public function enhanceYahooProduct($productData) {
        $weightG = $this->estimateWeight($productData);
        
        // 主要Shopee市場での送料計算
        $shippingOptions = [];
        $markets = ['SG', 'PH', 'MY', 'TW'];
        
        foreach ($markets as $market) {
            $shipping = $this->calculateShopeeShipping($market, $weightG);
            if ($shipping) {
                $shippingOptions[$market] = $shipping;
            }
        }
        
        // 商品データに送料情報を追加
        $productData['shopee_shipping_estimates'] = $shippingOptions;
        $productData['recommended_shopee_markets'] = $this->rankMarketsByProfitability($shippingOptions, $productData['price_jpy']);
        
        return $productData;
    }
}
```

### 3.2 利益計算システム統合
```php
// new_structure/05_rieki/shopee_profit_calculator.php
class ShopeeProfitCalculator extends ProfitCalculator {
    
    /**
     * Shopee特化利益計算
     */
    public function calculateShopeeProfits($productData, $targetMarkets = ['SG', 'PH', 'MY']) {
        $profits = [];
        
        foreach ($targetMarkets as $market) {
            $marketData = $this->getMarketData($market);
            
            // コスト計算
            $costs = [
                'yahoo_purchase' => $productData['price_jpy'],
                'shipping_to_shopee' => $this->calculateShopeeShipping($market, $productData['weight_g']),
                'shopee_commission' => $productData['selling_price'] * 0.05, // 5%手数料
                'payment_processing' => $productData['selling_price'] * 0.02, // 2%決済手数料
                'currency_conversion' => $productData['selling_price'] * 0.01 // 1%為替手数料
            ];
            
            // セラー利益（Shopee送料差額）
            $shippingBenefit = $costs['shipping_to_shopee']['esf_jpy'] - $costs['shipping_to_shopee']['actual_jpy'];
            
            $totalCosts = array_sum($costs) - $shippingBenefit;
            $profit = $productData['selling_price'] - $totalCosts;
            
            $profits[$market] = [
                'gross_profit' => $profit,
                'shipping_benefit' => $shippingBenefit,
                'profit_margin' => ($profit / $productData['selling_price']) * 100,
                'roi' => ($profit / $productData['price_jpy']) * 100,
                'cost_breakdown' => $costs
            ];
        }
        
        return $profits;
    }
}
```

### 3.3 承認システム統合
```php
// new_structure/03_approval/shopee_approval_enhancement.php
/**
 * 承認システムにShopee送料データを統合
 */
function enhanceApprovalWithShopeeData($productId) {
    $product = getProductById($productId);
    
    // Shopee送料データがない場合は計算
    if (empty($product['shopee_shipping_data'])) {
        $shippingData = calculateAllShopeeShipping($product);
        updateProductShippingData($productId, $shippingData);
        $product['shopee_shipping_data'] = $shippingData;
    }
    
    // 承認判定にShopee要素を追加
    $approvalFactors = [
        'ebay_profitability' => calculateEbayProfit($product),
        'shopee_profitability' => calculateBestShopeeProfit($product),
        'platform_recommendation' => recommendOptimalPlatform($product),
        'shipping_cost_ratio' => calculateShippingRatio($product),
        'multi_platform_viability' => assessMultiPlatformPotential($product)
    ];
    
    return $approvalFactors;
}
```

## 📊 Phase 4: 分析・レポート機能（Week 3-4）

### 4.1 統合ダッシュボード
```html
<!-- new_structure/01_dashboard/unified_shipping_dashboard.php -->
<div class="shipping-analytics-dashboard">
    <div class="platform-comparison-chart">
        <h3>プラットフォーム別送料効率性</h3>
        <canvas id="platformEfficiencyChart"></canvas>
    </div>
    
    <div class="market-profitability-grid">
        <h3>Shopee市場別収益性</h3>
        <div class="market-cards">
            <div class="market-card singapore">
                <div class="flag">🇸🇬</div>
                <div class="metrics">
                    <span class="profit-margin">+15.2%</span>
                    <span class="shipping-benefit">+¥158/件</span>
                </div>
            </div>
            <!-- 他の市場も同様 -->
        </div>
    </div>
    
    <div class="shipping-cost-trends">
        <h3>送料コスト推移</h3>
        <canvas id="shippingTrendsChart"></canvas>
    </div>
</div>
```

### 4.2 収益最適化レポート
```sql
-- 月次収益最適化レポート生成クエリ
CREATE OR REPLACE VIEW monthly_platform_performance AS
SELECT 
    DATE_TRUNC('month', ysp.created_at) as month,
    ysp.recommended_platform,
    COUNT(*) as product_count,
    AVG((ysp.shopee_shipping_data->>'esf_jpy')::DECIMAL - (ysp.shopee_shipping_data->>'actual_jpy')::DECIMAL) as avg_shopee_benefit,
    AVG((ysp.ebay_shipping_data->>'cost_jpy')::DECIMAL) as avg_ebay_cost,
    SUM(CASE 
        WHEN ysp.recommended_platform = 'shopee' 
        THEN (ysp.shopee_shipping_data->>'esf_jpy')::DECIMAL - (ysp.shopee_shipping_data->>'actual_jpy')::DECIMAL
        ELSE 0 
    END) as total_shopee_shipping_profit
FROM yahoo_scraped_products ysp
WHERE ysp.shipping_calculated_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', ysp.created_at), ysp.recommended_platform
ORDER BY month DESC, total_shopee_shipping_profit DESC;
```

## 🔄 Phase 5: 自動化・最適化（Week 4-5）

### 5.1 自動プラットフォーム選択
```php
// 商品追加時の自動プラットフォーム選択
class AutoPlatformSelector {
    
    public function selectOptimalPlatforms($productData) {
        $analysis = [
            'weight_category' => $this->categorizeWeight($productData['weight_g']),
            'price_category' => $this->categorizePrice($productData['price_jpy']),
            'category_performance' => $this->getCategoryPerformance($productData['category']),
            'seasonal_factors' => $this->getSeasonalFactors(),
            'market_demand' => $this->getMarketDemand($productData['title'])
        ];
        
        $platformScores = [
            'ebay' => $this->calculateEbayScore($analysis),
            'shopee_sg' => $this->calculateShopeeScore($analysis, 'SG'),
            'shopee_ph' => $this->calculateShopeeScore($analysis, 'PH'),
            'shopee_my' => $this->calculateShopeeScore($analysis, 'MY'),
            'shopee_tw' => $this->calculateShopeeScore($analysis, 'TW')
        ];
        
        // 上位3プラットフォームを推奨
        arsort($platformScores);
        return array_slice($platformScores, 0, 3, true);
    }
}
```

### 5.2 動的料金更新
```php
// 為替レート・料金の自動更新システム
class DynamicRateUpdater {
    
    /**
     * 日次自動更新（cron job想定）
     */
    public function dailyUpdate() {
        // 1. 為替レート更新
        $this->updateExchangeRates();
        
        // 2. Shopee料金更新（API可能であれば）
        $this->updateShopeeRates();
        
        // 3. 既存商品の送料再計算
        $this->recalculateProductShipping();
        
        // 4. プラットフォーム推奨の再評価
        $this->reevaluatePlatformRecommendations();
    }
    
    private function updateExchangeRates() {
        $currencies = ['SGD', 'PHP', 'MYR', 'TWD', 'THB', 'VND'];
        
        foreach ($currencies as $currency) {
            $newRate = $this->fetchExchangeRate('JPY', $currency);
            if ($newRate) {
                $this->updateDatabaseRate($currency, $newRate);
            }
        }
    }
}
```

## 📈 期待される効果

### 即効性のある効果（Phase 1-2完了時）
- **送料比較時間**: 手動30分 → 自動10秒（180倍高速化）
- **プラットフォーム選択精度**: 60% → 85%（データ駆動決定）
- **Shopeeセラー利益**: 平均+¥150/件の追加収益

### 中長期的効果（Phase 3-5完了時）
- **多市場同時出品効率**: 3倍向上
- **収益最適化**: 月間+10-15%の利益改善
- **意思決定自動化**: 95%の商品で自動プラットフォーム選択

### システム統合効果
- **Yahoo→eBay→Shopee**: 完全自動ワークフロー
- **データ一元化**: 全配送データの統合管理
- **予測分析**: 季節性・トレンド考慮した最適化

## 🎯 次のアクション

### 今すぐ実行
1. **データベースセットアップ**: 提供されたSQLファイル実行
2. **シンガポール実データ**: Shopee SLSの正確な料金データ取得
3. **UI配置**: 既存システムへの統合

### 今週中に実行
1. **フィリピン・マレーシア**: 2カ国目の料金データ投入
2. **既存システム連携**: Yahoo Auctionからのデータフロー確立
3. **テスト運用**: 実商品での動作確認

### 今月中に完了
1. **6カ国対応**: 全Shopee対象国の料金データ完備
2. **自動化機能**: プラットフォーム選択の自動化
3. **レポート機能**: 月次・週次の収益分析レポート

この統合システムにより、eBayとShopee両方を効率的に活用できる次世代の配送管理が実現します。