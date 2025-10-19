<?php
/**
 * NAGANO-3 eBay受注管理システム - AI推奨エンジン
 * 
 * @version 3.0.0
 * @date 2025-06-11
 * @description AI分析による仕入れ推奨・利益最適化システム
 */

class AIRecommendationEngine {
    
    private $db;
    private $cache_manager;
    private $notification_manager;
    private $config;
    
    public function __construct() {
        $this->db = new PDO(
            "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']}",
            $_ENV['DB_USER'],
            $_ENV['DB_PASS'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        $this->cache_manager = new CacheManager();
        $this->notification_manager = new NotificationManager();
        $this->config = $this->loadAIConfig();
    }
    
    /**
     * 受注に基づく仕入れ推奨の実行
     * 
     * @param string $order_id eBay受注ID
     * @return array 推奨結果
     */
    public function generateShiireRecommendation($order_id) {
        try {
            // 受注データ取得
            $order_data = $this->getOrderDetails($order_id);
            if (!$order_data) {
                throw new Exception("受注データが見つかりません: {$order_id}");
            }
            
            // 在庫状況確認
            $zaiko_status = $this->checkZaikoStatus($order_data['custom_label']);
            
            // 仕入れ候補検索
            $shiire_candidates = $this->searchShiireCandidates($order_data);
            
            // AI分析実行
            $ai_analysis = $this->performAIAnalysis($order_data, $shiire_candidates);
            
            // 推奨結果生成
            $recommendation = $this->generateRecommendation($order_data, $ai_analysis);
            
            // 結果をキャッシュ
            $this->cache_manager->set("ai_rec_{$order_id}", $recommendation, 3600);
            
            // 高利益案件の通知
            if ($recommendation['predicted_profit_rate'] > $this->config['high_profit_threshold']) {
                $this->notification_manager->sendHighProfitAlert($recommendation);
            }
            
            return $recommendation;
            
        } catch (Exception $e) {
            error_log("AI推奨エンジンエラー: " . $e->getMessage());
            return $this->getFallbackRecommendation($order_id);
        }
    }
    
    /**
     * リアルタイム利益計算
     * 
     * @param array $order_data 受注データ
     * @param array $shiire_data 仕入れデータ
     * @return array 利益計算結果
     */
    public function calculateRealTimeProfit($order_data, $shiire_data) {
        // 売上価格
        $uriage_kakaku = floatval($order_data['sale_price']);
        
        // eBay手数料計算（カテゴリ別）
        $ebay_tesuryo = $this->calculateEbayFees($order_data);
        
        // PayPal手数料
        $paypal_tesuryo = $uriage_kakaku * 0.036 + 40; // 3.6% + 40円
        
        // 仕入れ原価
        $shiire_genka = floatval($shiire_data['price']);
        
        // 配送料計算（重量・サイズ・配送先ベース）
        $haisoiryo = $this->calculateShippingCost($order_data);
        
        // 税金・その他費用
        $zeikin_sonota = $this->calculateTaxAndOtherFees($order_data);
        
        // 利益計算
        $saishu_rieki = $uriage_kakaku - $ebay_tesuryo - $paypal_tesuryo - $shiire_genka - $haisoiryo - $zeikin_sonota;
        $rieki_ritsu = ($saishu_rieki / $uriage_kakaku) * 100;
        
        return [
            'breakdown' => [
                'uriage_kakaku' => $uriage_kakaku,
                'ebay_tesuryo' => $ebay_tesuryo,
                'paypal_tesuryo' => $paypal_tesuryo,
                'shiire_genka' => $shiire_genka,
                'haisoiryo' => $haisoiryo,
                'zeikin_sonota' => $zeikin_sonota
            ],
            'saishu_rieki' => $saishu_rieki,
            'rieki_ritsu' => $rieki_ritsu,
            'risk_level' => $this->calculateRiskLevel($order_data, $rieki_ritsu),
            'recommendation_score' => $this->calculateAIScore($order_data, $rieki_ritsu)
        ];
    }
    
    /**
     * 仕入れタイミング最適化
     * 
     * @param string $sku 商品SKU
     * @return array タイミング推奨
     */
    public function optimizeShiireTiming($sku) {
        // 過去の販売データ分析
        $sales_history = $this->getSalesHistory($sku);
        
        // 季節性分析
        $seasonal_trends = $this->analyzeSeasonalTrends($sku);
        
        // 在庫回転率計算
        $inventory_turnover = $this->calculateInventoryTurnover($sku);
        
        // 価格トレンド分析
        $price_trends = $this->analyzePriceTrends($sku);
        
        // AI推奨タイミング計算
        $optimal_timing = $this->calculateOptimalTiming([
            'sales_history' => $sales_history,
            'seasonal_trends' => $seasonal_trends,
            'inventory_turnover' => $inventory_turnover,
            'price_trends' => $price_trends
        ]);
        
        return [
            'recommended_action' => $optimal_timing['action'], // 'buy_now', 'wait', 'buy_bulk'
            'confidence_score' => $optimal_timing['confidence'],
            'predicted_demand' => $optimal_timing['demand_forecast'],
            'price_prediction' => $optimal_timing['price_forecast'],
            'timing_reason' => $optimal_timing['reason'],
            'next_review_date' => $optimal_timing['next_review']
        ];
    }
    
    /**
     * 顧客行動分析による注意フラグ
     * 
     * @param string $buyer_id eBayバイヤーID
     * @return array 分析結果
     */
    public function analyzeCustomerBehavior($buyer_id) {
        // 過去の取引履歴
        $transaction_history = $this->getBuyerHistory($buyer_id);
        
        // 問い合わせ履歴
        $inquiry_history = $this->getInquiryHistory($buyer_id);
        
        // 返品・キャンセル履歴
        $return_history = $this->getReturnHistory($buyer_id);
        
        // リスクスコア計算
        $risk_factors = [
            'frequent_inquiries' => count($inquiry_history) > 3,
            'multiple_returns' => count($return_history) > 1,
            'price_complaints' => $this->hasPriceComplaints($inquiry_history),
            'shipping_complaints' => $this->hasShippingComplaints($inquiry_history),
            'new_account' => $this->isNewAccount($transaction_history),
            'unusual_orders' => $this->hasUnusualOrderPattern($transaction_history)
        ];
        
        $risk_score = array_sum($risk_factors) / count($risk_factors) * 100;
        
        return [
            'risk_score' => $risk_score,
            'risk_level' => $this->getRiskLevel($risk_score),
            'risk_factors' => array_filter($risk_factors),
            'recommended_actions' => $this->getRecommendedActions($risk_score, $risk_factors),
            'special_notes' => $this->generateSpecialNotes($buyer_id, $risk_factors)
        ];
    }
    
    /**
     * 自動仕入れ判定システム
     * 
     * @param array $shiire_candidate 仕入れ候補
     * @return array 自動実行判定
     */
    public function evaluateAutoShiire($shiire_candidate) {
        $criteria = [
            'profit_rate' => $shiire_candidate['predicted_profit_rate'] >= $this->config['auto_shiire_profit_threshold'],
            'reliability_score' => $shiire_candidate['supplier_reliability'] >= $this->config['min_supplier_reliability'],
            'inventory_level' => $shiire_candidate['current_stock'] <= $this->config['low_stock_threshold'],
            'demand_forecast' => $shiire_candidate['demand_score'] >= $this->config['min_demand_score'],
            'risk_assessment' => $shiire_candidate['risk_score'] <= $this->config['max_risk_score']
        ];
        
        $auto_approval = array_sum($criteria) === count($criteria);
        
        return [
            'auto_approve' => $auto_approval,
            'criteria_met' => $criteria,
            'confidence_level' => $this->calculateConfidenceLevel($criteria),
            'manual_review_required' => !$auto_approval,
            'review_reasons' => array_keys(array_filter($criteria, function($v) { return !$v; })),
            'recommended_action' => $auto_approval ? 'execute' : 'review'
        ];
    }
    
    /**
     * 市場トレンド分析
     * 
     * @param string $product_category 商品カテゴリ
     * @return array トレンド分析結果
     */
    public function analyzeMarketTrends($product_category) {
        // 外部APIからトレンドデータ取得
        $google_trends = $this->getGoogleTrendsData($product_category);
        $amazon_trends = $this->getAmazonTrendsData($product_category);
        $ebay_trends = $this->getEbayTrendsData($product_category);
        
        // トレンド統合分析
        $trend_analysis = $this->integrateTrendData([
            'google' => $google_trends,
            'amazon' => $amazon_trends,
            'ebay' => $ebay_trends
        ]);
        
        return [
            'trend_direction' => $trend_analysis['direction'], // 'up', 'down', 'stable'
            'trend_strength' => $trend_analysis['strength'], // 1-10
            'seasonal_factor' => $trend_analysis['seasonal'],
            'market_saturation' => $trend_analysis['saturation'],
            'opportunity_score' => $trend_analysis['opportunity'],
            'competitive_analysis' => $trend_analysis['competition'],
            'forecast_3months' => $trend_analysis['forecast_short'],
            'forecast_12months' => $trend_analysis['forecast_long']
        ];
    }
    
    /**
     * 配送最適化推奨
     * 
     * @param array $order_data 受注データ
     * @return array 配送推奨
     */
    public function optimizeShippingMethod($order_data) {
        $destination = $order_data['shipping_address'];
        $product_specs = $order_data['product_specs'];
        
        // 配送オプション分析
        $shipping_options = [
            'fedex_express' => $this->analyzeFedExExpress($destination, $product_specs),
            'fedex_economy' => $this->analyzeFedExEconomy($destination, $product_specs),
            'dhl_express' => $this->analyzeDHLExpress($destination, $product_specs),
            'japan_post_ems' => $this->analyzeJapanPostEMS($destination, $product_specs),
            'japan_post_airmail' => $this->analyzeJapanPostAirmail($destination, $product_specs)
        ];
        
        // コスト・時間・信頼性のバランス分析
        $optimal_method = $this->selectOptimalShipping($shipping_options, $order_data);
        
        return [
            'recommended_method' => $optimal_method['method'],
            'estimated_cost' => $optimal_method['cost'],
            'estimated_delivery' => $optimal_method['delivery_time'],
            'reliability_score' => $optimal_method['reliability'],
            'tracking_capability' => $optimal_method['tracking'],
            'insurance_coverage' => $optimal_method['insurance'],
            'alternative_options' => $optimal_method['alternatives']
        ];
    }
    
    // ========== プライベートメソッド ==========
    
    private function loadAIConfig() {
        return [
            'high_profit_threshold' => 25.0, // 25%以上で高利益アラート
            'auto_shiire_profit_threshold' => 20.0, // 20%以上で自動仕入れ検討
            'min_supplier_reliability' => 85, // 最低サプライヤー信頼度
            'low_stock_threshold' => 5, // 在庫5個以下で仕入れ検討
            'min_demand_score' => 70, // 最低需要スコア
            'max_risk_score' => 30 // 最大リスクスコア
        ];
    }
    
    private function getOrderDetails($order_id) {
        $stmt = $this->db->prepare("
            SELECT * FROM ebay_orders 
            WHERE order_id = ? OR item_id = ?
        ");
        $stmt->execute([$order_id, $order_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    private function checkZaikoStatus($sku) {
        // 在庫管理システム連携
        $zaiko_integration = new ZaikoKanriIntegration();
        return $zaiko_integration->getCurrentStock($sku);
    }
    
    private function searchShiireCandidates($order_data) {
        // 価格比較API活用
        $price_comparison = new PriceComparisonAPI();
        return $price_comparison->searchProducts($order_data['custom_label']);
    }
    
    private function performAIAnalysis($order_data, $candidates) {
        // 機械学習モデル実行（Python連携）
        $ml_service = new MachineLearningService();
        return $ml_service->analyzeProfitability($order_data, $candidates);
    }
    
    private function calculateEbayFees($order_data) {
        $category_rates = [
            'Electronics' => 0.12, // 12%
            'Fashion' => 0.13,     // 13%
            'Home' => 0.11,        // 11%
            'Sports' => 0.12,      // 12%
            'default' => 0.125     // 12.5%
        ];
        
        $rate = $category_rates[$order_data['category']] ?? $category_rates['default'];
        return floatval($order_data['sale_price']) * $rate;
    }
    
    private function calculateShippingCost($order_data) {
        $shipping_api = new ShippingCostAPI();
        return $shipping_api->calculateCost(
            $order_data['shipping_address'],
            $order_data['product_specs']
        );
    }
    
    private function calculateTaxAndOtherFees($order_data) {
        // 消費税・関税・その他手数料計算
        $base_amount = floatval($order_data['sale_price']);
        return $base_amount * 0.015; // 1.5%概算
    }
    
    private function calculateRiskLevel($order_data, $profit_rate) {
        $risk_factors = [
            'low_profit' => $profit_rate < 10,
            'new_customer' => $order_data['buyer_feedback_score'] < 50,
            'high_value' => floatval($order_data['sale_price']) > 50000,
            'international' => $order_data['shipping_country'] !== 'JP'
        ];
        
        $risk_count = array_sum($risk_factors);
        
        if ($risk_count >= 3) return 'high';
        if ($risk_count >= 2) return 'medium';
        return 'low';
    }
    
    private function calculateAIScore($order_data, $profit_rate) {
        // 複合スコア計算
        $score_components = [
            'profit_score' => min(100, $profit_rate * 3), // 利益率の3倍（最大100）
            'customer_score' => min(100, $order_data['buyer_feedback_score']), // フィードバックスコア
            'demand_score' => $this->getDemandScore($order_data['custom_label']), // 需要スコア
            'trend_score' => $this->getTrendScore($order_data['category']), // トレンドスコア
            'competition_score' => $this->getCompetitionScore($order_data['custom_label']) // 競合スコア
        ];
        
        return array_sum($score_components) / count($score_components);
    }
    
    private function getFallbackRecommendation($order_id) {
        // エラー時のフォールバック推奨
        return [
            'status' => 'fallback',
            'message' => 'AI分析が一時的に利用できません。基本的な推奨を表示します。',
            'basic_recommendation' => 'manual_review',
            'predicted_profit_rate' => 0,
            'confidence_score' => 0,
            'risk_level' => 'unknown'
        ];
    }
    
    // その他のプライベートメソッドは実装簡略化のため省略
    private function getSalesHistory($sku) { return []; }
    private function analyzeSeasonalTrends($sku) { return []; }
    private function calculateInventoryTurnover($sku) { return 0; }
    private function analyzePriceTrends($sku) { return []; }
    private function calculateOptimalTiming($data) { return []; }
    private function getBuyerHistory($buyer_id) { return []; }
    private function getInquiryHistory($buyer_id) { return []; }
    private function getReturnHistory($buyer_id) { return []; }
    private function hasPriceComplaints($history) { return false; }
    private function hasShippingComplaints($history) { return false; }
    private function isNewAccount($history) { return false; }
    private function hasUnusualOrderPattern($history) { return false; }
    private function getRiskLevel($score) { return 'low'; }
    private function getRecommendedActions($score, $factors) { return []; }
    private function generateSpecialNotes($buyer_id, $factors) { return ''; }
    private function calculateConfidenceLevel($criteria) { return 0; }
    private function getGoogleTrendsData($category) { return []; }
    private function getAmazonTrendsData($category) { return []; }
    private function getEbayTrendsData($category) { return []; }
    private function integrateTrendData($data) { return []; }
    private function analyzeFedExExpress($dest, $specs) { return []; }
    private function analyzeFedExEconomy($dest, $specs) { return []; }
    private function analyzeDHLExpress($dest, $specs) { return []; }
    private function analyzeJapanPostEMS($dest, $specs) { return []; }
    private function analyzeJapanPostAirmail($dest, $specs) { return []; }
    private function selectOptimalShipping($options, $order) { return []; }
    private function getDemandScore($sku) { return 50; }
    private function getTrendScore($category) { return 50; }
    private function getCompetitionScore($sku) { return 50; }
    
    private function generateRecommendation($order_data, $ai_analysis) {
        return [
            'order_id' => $order_data['order_id'],
            'recommended_action' => $ai_analysis['action'] ?? 'review',
            'predicted_profit_rate' => $ai_analysis['profit_rate'] ?? 0,
            'confidence_score' => $ai_analysis['confidence'] ?? 0,
            'risk_assessment' => $ai_analysis['risk'] ?? 'medium',
            'shiire_candidates' => $ai_analysis['candidates'] ?? [],
            'timing_recommendation' => $ai_analysis['timing'] ?? 'immediate',
            'special_notes' => $ai_analysis['notes'] ?? ''
        ];
    }
}

/**
 * キャッシュ管理クラス
 */
class CacheManager {
    private $redis;
    
    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect($_ENV['REDIS_HOST'], $_ENV['REDIS_PORT']);
    }
    
    public function set($key, $value, $ttl = 3600) {
        return $this->redis->setex($key, $ttl, json_encode($value));
    }
    
    public function get($key) {
        $value = $this->redis->get($key);
        return $value ? json_decode($value, true) : null;
    }
    
    public function delete($key) {
        return $this->redis->del($key);
    }
}

/**
 * 通知管理クラス
 */
class NotificationManager {
    
    public function sendHighProfitAlert($recommendation) {
        $message = "🎯 高利益案件発見！\n";
        $message .= "受注ID: {$recommendation['order_id']}\n";
        $message .= "予想利益率: {$recommendation['predicted_profit_rate']}%\n";
        $message .= "信頼度: {$recommendation['confidence_score']}%";
        
        // Slack通知
        $this->sendSlackNotification($message);
        
        // メール通知
        $this->sendEmailNotification($message);
    }
    
    private function sendSlackNotification($message) {
        // Slack Webhook実装
        $webhook_url = $_ENV['SLACK_WEBHOOK_URL'];
        $payload = json_encode(['text' => $message]);
        
        $ch = curl_init($webhook_url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        curl_close($ch);
    }
    
    private function sendEmailNotification($message) {
        // メール送信実装
        mail($_ENV['ADMIN_EMAIL'], 'NAGANO-3 高利益アラート', $message);
    }
}

/**
 * 機械学習サービス連携クラス
 */
class MachineLearningService {
    
    public function analyzeProfitability($order_data, $candidates) {
        // Python機械学習サービスとの連携
        $api_url = $_ENV['ML_SERVICE_URL'] . '/analyze';
        $payload = json_encode([
            'order_data' => $order_data,
            'candidates' => $candidates
        ]);
        
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            return json_decode($response, true);
        } else {
            throw new Exception("ML Service Error: HTTP {$http_code}");
        }
    }
}

/**
 * 配送コストAPI連携クラス
 */
class ShippingCostAPI {
    
    public function calculateCost($destination, $product_specs) {
        // 配送業者API連携による正確なコスト計算
        $weight = $product_specs['weight'] ?? 1.0;
        $dimensions = $product_specs['dimensions'] ?? ['length' => 20, 'width' => 15, 'height' => 10];
        $country = $destination['country'] ?? 'US';
        
        // 基本料金計算（実際のAPIに置き換え）
        $base_cost = $this->getBaseCost($country);
        $weight_cost = $weight * $this->getWeightRate($country);
        $size_cost = $this->calculateSizeCost($dimensions, $country);
        
        return $base_cost + $weight_cost + $size_cost;
    }
    
    private function getBaseCost($country) {
        $rates = [
            'US' => 1200,
            'GB' => 1500,
            'DE' => 1500,
            'AU' => 1800,
            'default' => 2000
        ];
        return $rates[$country] ?? $rates['default'];
    }
    
    private function getWeightRate($country) {
        $rates = [
            'US' => 800,
            'GB' => 900,
            'DE' => 900,
            'AU' => 1000,
            'default' => 1200
        ];
        return $rates[$country] ?? $rates['default'];
    }
    
    private function calculateSizeCost($dimensions, $country) {
        $volume = $dimensions['length'] * $dimensions['width'] * $dimensions['height'];
        $volume_rate = $country === 'US' ? 0.5 : 0.8;
        return $volume * $volume_rate;
    }
}

?>