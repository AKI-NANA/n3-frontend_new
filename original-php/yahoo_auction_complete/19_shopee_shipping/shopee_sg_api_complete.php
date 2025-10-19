<?php
/**
 * Shopee シンガポール専用API - 完全実装版
 * ファイル: shopee_singapore_api.php
 * 機能: 送料計算・利益分析・為替管理・データ管理
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // データベース接続
    function getDatabaseConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            throw new Exception('データベース接続失敗: ' . $e->getMessage());
        }
    }

    /**
     * Shopee シンガポール専用管理クラス
     */
    class ShopeeSingaporeManager {
        private $pdo;
        private $marketId;
        
        public function __construct($dbConnection) {
            $this->pdo = $dbConnection;
            
            // シンガポール市場ID取得
            $stmt = $this->pdo->prepare("SELECT id FROM shopee_markets WHERE country_code = 'SG'");
            $stmt->execute();
            $this->marketId = $stmt->fetchColumn();
            
            if (!$this->marketId) {
                throw new Exception('シンガポール市場データが見つかりません');
            }
        }
        
        /**
         * シンガポール利益計算（完全版）
         */
        public function calculateProfit($yahooPrice, $weightG, $sellingPrice, $zoneCode = 'A') {
            try {
                // データ検証
                if ($yahooPrice <= 0 || $weightG <= 0 || $sellingPrice <= 0) {
                    throw new Exception('価格と重量は正の値である必要があります');
                }
                
                if ($weightG > 30000) {
                    throw new Exception('重量は30kg以下である必要があります');
                }
                
                // PostgreSQL関数を使用した利益計算
                $sql = "SELECT * FROM calculate_singapore_profit(?, ?, ?, ?)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([$yahooPrice, $weightG, $sellingPrice, $zoneCode]);
                
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$result) {
                    throw new Exception('利益計算に失敗しました');
                }
                
                // 追加分析データを付加
                $analysisData = $this->generateAnalysisData($result, $yahooPrice, $weightG, $sellingPrice);
                
                return array_merge($result, $analysisData);
                
            } catch (Exception $e) {
                throw new Exception('シンガポール利益計算エラー: ' . $e->getMessage());
            }
        }
        
        /**
         * 送料データ取得
         */
        public function getShippingRates($zoneCode = 'A') {
            $sql = "
                SELECT 
                    sr.weight_from_g,
                    sr.weight_to_g,
                    sr.esf_amount,
                    sr.actual_amount,
                    sr.seller_benefit,
                    sr.esf_jpy,
                    sr.actual_jpy,
                    sr.seller_benefit_jpy,
                    sr.service_type,
                    sr.delivery_days_min,
                    sr.delivery_days_max,
                    sr.accuracy_confidence,
                    sm.currency_code,
                    sm.currency_symbol
                FROM shopee_sls_rates sr
                JOIN shopee_markets sm ON sr.market_id = sm.id
                WHERE sr.market_id = ? AND sr.zone_code = ?
                ORDER BY sr.weight_from_g ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->marketId, $zoneCode]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        /**
         * 為替レート更新
         */
        public function updateExchangeRate($newRate, $source = 'manual') {
            if ($newRate <= 0) {
                throw new Exception('為替レートは正の値である必要があります');
            }
            
            $sql = "
                UPDATE shopee_markets 
                SET exchange_rate_to_jpy = ?, 
                    exchange_rate_source = ?,
                    exchange_rate_updated = NOW(),
                    updated_at = NOW()
                WHERE id = ?
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$newRate, $source, $this->marketId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('為替レート更新に失敗しました');
            }
            
            // 履歴記録
            $this->logExchangeRateChange($newRate, $source);
            
            return [
                'old_rate' => $this->getCurrentExchangeRate()['exchange_rate_to_jpy'] ?? 0,
                'new_rate' => $newRate,
                'updated_at' => date('Y-m-d H:i:s'),
                'affected_rates' => $this->countAffectedRates()
            ];
        }
        
        /**
         * 現在の為替レート取得
         */
        public function getCurrentExchangeRate() {
            $sql = "
                SELECT 
                    exchange_rate_to_jpy,
                    exchange_rate_source,
                    exchange_rate_updated,
                    currency_code,
                    currency_symbol
                FROM shopee_markets 
                WHERE id = ?
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->marketId]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        /**
         * 市場統計情報取得
         */
        public function getMarketStats() {
            $stats = [];
            
            // 基本市場情報
            $sql = "
                SELECT 
                    country_name,
                    currency_code,
                    exchange_rate_to_jpy,
                    market_size_rank,
                    commission_rate,
                    data_quality_score
                FROM shopee_markets 
                WHERE id = ?
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->marketId]);
            $stats['market_info'] = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 送料統計
            $sql = "
                SELECT 
                    COUNT(*) as rate_count,
                    MIN(weight_from_g) as min_weight,
                    MAX(weight_to_g) as max_weight,
                    AVG(seller_benefit_jpy) as avg_seller_benefit,
                    MIN(seller_benefit_jpy) as min_benefit,
                    MAX(seller_benefit_jpy) as max_benefit
                FROM shopee_sls_rates 
                WHERE market_id = ?
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->marketId]);
            $stats['shipping_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 利益計算履歴統計
            $sql = "
                SELECT 
                    COUNT(*) as calculation_count,
                    AVG(recommendation_score) as avg_score,
                    COUNT(CASE WHEN recommendation_score >= 80 THEN 1 END) as excellent_count,
                    COUNT(CASE WHEN recommendation_score >= 60 THEN 1 END) as good_count
                FROM shopee_profit_calculations 
                WHERE market_code = 'SG' AND calculated_at >= CURRENT_DATE - INTERVAL '30 days'
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $stats['profit_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $stats;
        }
        
        /**
         * 商品の利益履歴保存
         */
        public function saveProfitCalculation($productId, $yahooPrice, $weightG, $sellingPrice, $profitData) {
            // 既存計算を非最新に設定
            $sql = "UPDATE shopee_profit_calculations SET is_latest = FALSE WHERE product_id = ? AND market_code = 'SG'";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$productId]);
            
            // 新しい計算結果を保存
            $sql = "
                INSERT INTO shopee_profit_calculations (
                    product_id, yahoo_price_jpy, product_weight_g, estimated_selling_price_jpy,
                    market_code, zone_code, shopee_esf_jpy, shopee_actual_jpy, shopee_seller_benefit_jpy,
                    commission_jpy, payment_fee_jpy, withdrawal_fee_jpy, total_shopee_fees_jpy,
                    gross_profit_jpy, net_profit_jpy, profit_margin_percent, roi_percent,
                    recommendation_score, recommendation_reason, is_latest
                ) VALUES (?, ?, ?, ?, 'SG', 'A', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $productId, $yahooPrice, $weightG, $sellingPrice,
                $profitData['shipping_esf_jpy'], $profitData['shipping_actual_jpy'], $profitData['shipping_benefit_jpy'],
                $profitData['commission_jpy'] ?? 0, $profitData['payment_fee_jpy'] ?? 0, $profitData['withdrawal_fee_jpy'] ?? 0,
                $profitData['total_fees_jpy'], $profitData['gross_profit_jpy'] ?? 0, $profitData['net_profit_jpy'],
                $profitData['profit_margin_percent'], $profitData['roi_percent'],
                $profitData['recommendation_score'], $profitData['recommendation_reason']
            ]);
            
            return $this->pdo->lastInsertId();
        }
        
        /**
         * 重量から適用送料検索
         */
        public function findShippingRateByWeight($weightG, $zoneCode = 'A') {
            $sql = "
                SELECT * FROM shopee_sls_rates 
                WHERE market_id = ? AND zone_code = ? 
                AND ? >= weight_from_g AND ? <= weight_to_g
                ORDER BY weight_from_g ASC
                LIMIT 1
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->marketId, $zoneCode, $weightG, $weightG]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        /**
         * 分析データ生成
         */
        private function generateAnalysisData($profitResult, $yahooPrice, $weightG, $sellingPrice) {
            // 競合比較分析
            $ebayEstimate = $this->estimateEbayProfit($yahooPrice, $weightG, $sellingPrice);
            $domesticEstimate = $this->estimateDomesticProfit($yahooPrice, $sellingPrice);
            
            // リスク分析
            $riskAnalysis = $this->analyzeRisks($weightG, $sellingPrice);
            
            // 季節性分析
            $seasonalAnalysis = $this->analyzeSeasonality();
            
            return [
                'analysis' => [
                    'vs_ebay_advantage' => $profitResult['net_profit_jpy'] - $ebayEstimate,
                    'vs_domestic_advantage' => $profitResult['net_profit_jpy'] - $domesticEstimate,
                    'shipping_efficiency_score' => $this->calculateShippingEfficiency($profitResult),
                    'price_competitiveness' => $this->analyzePriceCompetitiveness($sellingPrice),
                    'weight_optimization' => $this->analyzeWeightOptimization($weightG),
                    'risk_analysis' => $riskAnalysis,
                    'seasonal_factors' => $seasonalAnalysis
                ],
                'recommendations' => $this->generateRecommendations($profitResult, $weightG, $sellingPrice)
            ];
        }
        
        /**
         * eBay利益概算
         */
        private function estimateEbayProfit($yahooPrice, $weightG, $sellingPrice) {
            $shippingCost = max(800, $weightG * 0.8); // 概算送料
            $ebayFees = $sellingPrice * 0.13; // 13%手数料
            return $sellingPrice - $yahooPrice - $shippingCost - $ebayFees;
        }
        
        /**
         * 国内販売利益概算
         */
        private function estimateDomesticProfit($yahooPrice, $sellingPrice) {
            $platformFees = $sellingPrice * 0.10; // 10%概算
            $shippingCost = 500; // 国内送料
            return $sellingPrice - $yahooPrice - $platformFees - $shippingCost;
        }
        
        /**
         * リスク分析
         */
        private function analyzeRisks($weightG, $sellingPrice) {
            $risks = [];
            
            // 重量リスク
            if ($weightG > 10000) {
                $risks[] = '重量物配送リスク（10kg超）';
            }
            
            // 価格リスク
            if ($sellingPrice > 50000) {
                $risks[] = '高額商品紛失リスク';
            }
            
            // 為替リスク
            $risks[] = 'SGD/JPY為替変動リスク';
            
            return $risks;
        }
        
        /**
         * 季節性分析
         */
        private function analyzeSeasonality() {
            $month = (int)date('n');
            
            if (in_array($month, [11, 12, 1])) {
                return ['season' => 'peak', 'factor' => 1.2, 'description' => '年末年始商戦期'];
            } elseif (in_array($month, [6, 7, 8])) {
                return ['season' => 'low', 'factor' => 0.9, 'description' => '夏季低調期'];
            } else {
                return ['season' => 'normal', 'factor' => 1.0, 'description' => '通常期'];
            }
        }
        
        /**
         * 送料効率スコア計算
         */
        private function calculateShippingEfficiency($profitResult) {
            $benefit = $profitResult['shipping_benefit_jpy'];
            if ($benefit >= 200) return 95;
            if ($benefit >= 150) return 85;
            if ($benefit >= 100) return 75;
            if ($benefit >= 50) return 60;
            return 40;
        }
        
        /**
         * 価格競争力分析
         */
        private function analyzePriceCompetitiveness($sellingPrice) {
            // SGDでの価格帯分析
            $sgdPrice = $sellingPrice / 115; // 現在レート想定
            
            if ($sgdPrice < 20) return ['level' => 'budget', 'score' => 90];
            if ($sgdPrice < 50) return ['level' => 'mid-range', 'score' => 80];
            if ($sgdPrice < 100) return ['level' => 'premium', 'score' => 70];
            return ['level' => 'luxury', 'score' => 60];
        }
        
        /**
         * 重量最適化分析
         */
        private function analyzeWeightOptimization($weightG) {
            $thresholds = [250, 500, 1000, 2000, 3000, 5000, 10000, 20000, 30000];
            
            foreach ($thresholds as $threshold) {
                if ($weightG <= $threshold) {
                    $nextThreshold = null;
                    $currentIndex = array_search($threshold, $thresholds);
                    if ($currentIndex < count($thresholds) - 1) {
                        $nextThreshold = $thresholds[$currentIndex + 1];
                    }
                    
                    return [
                        'current_tier' => $threshold,
                        'next_tier' => $nextThreshold,
                        'efficiency' => ($threshold - $weightG) / $threshold * 100
                    ];
                }
            }
            
            return ['current_tier' => 30000, 'next_tier' => null, 'efficiency' => 0];
        }
        
        /**
         * 推奨事項生成
         */
        private function generateRecommendations($profitResult, $weightG, $sellingPrice) {
            $recommendations = [];
            
            if ($profitResult['profit_margin_percent'] < 15) {
                $recommendations[] = '価格見直し推奨（利益率15%未満）';
            }
            
            if ($profitResult['shipping_benefit_jpy'] > 150) {
                $recommendations[] = 'Shopee送料メリット大（+¥' . round($profitResult['shipping_benefit_jpy']) . '）';
            }
            
            if ($weightG > 2000) {
                $recommendations[] = '軽量化検討（送料効率向上）';
            }
            
            if ($profitResult['recommendation_score'] >= 80) {
                $recommendations[] = '即出品推奨（高スコア）';
            }
            
            return $recommendations;
        }
        
        /**
         * 為替レート変更ログ
         */
        private function logExchangeRateChange($newRate, $source) {
            $sql = "
                INSERT INTO shopee_exchange_rates (currency_from, currency_to, exchange_rate, rate_source)
                VALUES ('SGD', 'JPY', ?, ?)
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$newRate, $source]);
        }
        
        /**
         * 影響を受ける料金データ数
         */
        private function countAffectedRates() {
            $sql = "SELECT COUNT(*) FROM shopee_sls_rates WHERE market_id = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$this->marketId]);
            return $stmt->fetchColumn();
        }
    }

    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? '';
    
    $pdo = getDatabaseConnection();
    $sgManager = new ShopeeSingaporeManager($pdo);
    
    switch ($action) {
        case 'calculate_profit':
            $yahooPrice = (float)($input['yahoo_price'] ?? 0);
            $weightG = (int)($input['weight_g'] ?? 0);
            $sellingPrice = (float)($input['selling_price'] ?? 0);
            $zoneCode = $input['zone_code'] ?? 'A';
            $productId = $input['product_id'] ?? null;
            
            $profitData = $sgManager->calculateProfit($yahooPrice, $weightG, $sellingPrice, $zoneCode);
            
            // 商品IDがある場合は履歴保存
            if ($productId) {
                $sgManager->saveProfitCalculation($productId, $yahooPrice, $weightG, $sellingPrice, $profitData);
            }
            
            $response = [
                'success' => true,
                'profit_data' => $profitData,
                'input_params' => [
                    'yahoo_price' => $yahooPrice,
                    'weight_g' => $weightG,
                    'selling_price' => $sellingPrice,
                    'zone_code' => $zoneCode
                ],
                'calculation_time' => microtime(true)
            ];
            break;
            
        case 'get_shipping_rates':
            $zoneCode = $input['zone_code'] ?? 'A';
            $rates = $sgManager->getShippingRates($zoneCode);
            
            $response = [
                'success' => true,
                'shipping_rates' => $rates,
                'zone_code' => $zoneCode,
                'total_rates' => count($rates)
            ];
            break;
            
        case 'update_exchange_rate':
            $newRate = (float)($input['new_rate'] ?? 0);
            $source = $input['source'] ?? 'manual';
            
            $updateResult = $sgManager->updateExchangeRate($newRate, $source);
            
            $response = [
                'success' => true,
                'update_result' => $updateResult,
                'message' => 'SGD為替レートを更新しました'
            ];
            break;
            
        case 'get_current_rate':
            $rateData = $sgManager->getCurrentExchangeRate();
            
            $response = [
                'success' => true,
                'exchange_rate' => $rateData
            ];
            break;
            
        case 'get_market_stats':
            $stats = $sgManager->getMarketStats();
            
            $response = [
                'success' => true,
                'market_stats' => $stats,
                'generated_at' => date('Y-m-d H:i:s')
            ];
            break;
            
        case 'find_shipping_by_weight':
            $weightG = (int)($input['weight_g'] ?? 0);
            $zoneCode = $input['zone_code'] ?? 'A';
            
            $shippingRate = $sgManager->findShippingRateByWeight($weightG, $zoneCode);
            
            $response = [
                'success' => true,
                'shipping_rate' => $shippingRate,
                'search_params' => ['weight_g' => $weightG, 'zone_code' => $zoneCode]
            ];
            break;
            
        case 'health_check':
            // システム健全性チェック
            $stats = $sgManager->getMarketStats();
            $rateData = $sgManager->getCurrentExchangeRate();
            
            $response = [
                'success' => true,
                'system_status' => 'healthy',
                'singapore_market' => 'active',
                'data_quality' => $stats['market_info']['data_quality_score'] ?? 0,
                'exchange_rate_age' => time() - strtotime($rateData['exchange_rate_updated'] ?? 'now'),
                'shipping_rates_count' => $stats['shipping_stats']['rate_count'] ?? 0,
                'api_version' => '1.0.0-sg-complete'
            ];
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'error_code' => 'SG_API_ERROR',
        'timestamp' => date('Y-m-d H:i:s'),
        'debug_info' => [
            'action' => $action ?? 'unknown',
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ];
    
    error_log('Shopee Singapore API エラー: ' . $e->getMessage());
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>