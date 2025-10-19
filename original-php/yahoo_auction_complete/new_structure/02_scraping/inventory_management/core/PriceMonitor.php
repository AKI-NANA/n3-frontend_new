<?php
/**
 * 02_scraping/includes/PriceMonitor.php
 * 
 * 価格変動検知・分析クラス
 * 高度な価格追跡とトレンド分析機能
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/Logger.php';

class PriceMonitor {
    private $db;
    private $logger;
    private $config;
    
    public function __construct($config = null) {
        $this->db = Database::getInstance();
        $this->logger = new Logger('price_monitor');
        $this->config = $config ?: require __DIR__ . '/../config/inventory.php';
    }
    
    /**
     * 価格変動検知・分析
     */
    public function detectPriceChange($productId, $oldPrice, $newPrice, $metadata = []) {
        try {
            $changeAmount = $newPrice - $oldPrice;
            $changePercent = $oldPrice > 0 ? ($changeAmount / $oldPrice) : 0;
            $threshold = $this->config['monitoring']['price_change_threshold'];
            $significantThreshold = $this->config['monitoring']['significant_change_threshold'];
            
            $changeData = [
                'product_id' => $productId,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'change_amount' => $changeAmount,
                'change_percent' => $changePercent,
                'change_direction' => $changeAmount > 0 ? 'increase' : ($changeAmount < 0 ? 'decrease' : 'stable'),
                'is_significant' => abs($changePercent) >= $threshold,
                'is_major_change' => abs($changePercent) >= $significantThreshold,
                'detected_at' => date('Y-m-d H:i:s'),
                'metadata' => $metadata
            ];
            
            // 価格履歴分析
            $historicalAnalysis = $this->analyzeHistoricalTrends($productId, $newPrice);
            $changeData = array_merge($changeData, $historicalAnalysis);
            
            // 変動が閾値を超える場合のみ記録
            if ($changeData['is_significant']) {
                $this->recordPriceChange($changeData);
                
                // 重要な変動の場合はアラート
                if ($changeData['is_major_change']) {
                    $this->triggerPriceAlert($changeData);
                }
            }
            
            return $changeData;
            
        } catch (Exception $e) {
            $this->logger->error("価格変動検知エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 価格履歴トレンド分析
     */
    public function analyzeHistoricalTrends($productId, $currentPrice) {
        try {
            // 過去30日の価格履歴取得
            $history = $this->getPriceHistory($productId, 30);
            
            if (empty($history)) {
                return [
                    'trend_direction' => 'unknown',
                    'volatility' => 0,
                    'average_price_30d' => $currentPrice,
                    'price_vs_average' => 0
                ];
            }
            
            $prices = array_column($history, 'new_price');
            $dates = array_column($history, 'created_at');
            
            // トレンド方向計算
            $trendDirection = $this->calculateTrendDirection($prices, $dates);
            
            // ボラティリティ計算
            $volatility = $this->calculateVolatility($prices);
            
            // 平均価格計算
            $averagePrice = array_sum($prices) / count($prices);
            $priceVsAverage = ($currentPrice - $averagePrice) / $averagePrice;
            
            // 価格レンジ分析
            $priceRange = $this->analyzePriceRange($prices);
            
            return [
                'trend_direction' => $trendDirection,
                'volatility' => $volatility,
                'average_price_30d' => round($averagePrice, 2),
                'price_vs_average' => round($priceVsAverage, 4),
                'price_range' => $priceRange,
                'data_points' => count($prices)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("履歴トレンド分析エラー: " . $e->getMessage());
            return [
                'trend_direction' => 'error',
                'volatility' => 0,
                'average_price_30d' => $currentPrice,
                'price_vs_average' => 0
            ];
        }
    }
    
    /**
     * 価格予測分析
     */
    public function predictPriceTrend($productId, $days = 7) {
        try {
            $history = $this->getPriceHistory($productId, 60); // 60日履歴
            
            if (count($history) < 5) {
                return [
                    'prediction' => 'insufficient_data',
                    'confidence' => 0,
                    'predicted_price_range' => null
                ];
            }
            
            $prices = array_column($history, 'new_price');
            $timestamps = array_map(function($date) {
                return strtotime($date);
            }, array_column($history, 'created_at'));
            
            // 線形回帰による予測
            $prediction = $this->performLinearRegression($timestamps, $prices, $days);
            
            // 季節性分析
            $seasonality = $this->analyzeSeasonality($history);
            
            // 予測信頼度計算
            $confidence = $this->calculatePredictionConfidence($prices, $prediction);
            
            return [
                'prediction' => $prediction,
                'confidence' => $confidence,
                'seasonality' => $seasonality,
                'predicted_price_range' => [
                    'min' => $prediction['predicted_price'] * (1 - $prediction['margin_of_error']),
                    'max' => $prediction['predicted_price'] * (1 + $prediction['margin_of_error'])
                ]
            ];
            
        } catch (Exception $e) {
            $this->logger->error("価格予測エラー: " . $e->getMessage());
            return [
                'prediction' => 'error',
                'confidence' => 0,
                'predicted_price_range' => null
            ];
        }
    }
    
    /**
     * 価格アラート管理
     */
    public function managePriceAlerts($productId, $alertSettings) {
        try {
            // 既存アラート設定取得
            $existingAlerts = $this->getPriceAlerts($productId);
            
            // 新しいアラート設定
            $alertTypes = [
                'price_drop' => $alertSettings['price_drop_threshold'] ?? 0.1,
                'price_spike' => $alertSettings['price_spike_threshold'] ?? 0.2,
                'target_price' => $alertSettings['target_price'] ?? null,
                'stop_loss' => $alertSettings['stop_loss_price'] ?? null
            ];
            
            foreach ($alertTypes as $type => $threshold) {
                if ($threshold !== null) {
                    $this->setPriceAlert($productId, $type, $threshold);
                }
            }
            
            return [
                'success' => true,
                'alert_count' => count($alertTypes),
                'message' => '価格アラート設定完了'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("価格アラート管理エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 価格変動レポート生成
     */
    public function generatePriceReport($productIds = null, $period = 30) {
        try {
            $sql = "
                SELECT 
                    p.id as product_id,
                    p.title,
                    p.price as original_price,
                    im.current_price,
                    COUNT(sh.id) as price_changes,
                    AVG(sh.new_price) as avg_price,
                    MIN(sh.new_price) as min_price,
                    MAX(sh.new_price) as max_price,
                    STDDEV(sh.new_price) as price_volatility
                FROM yahoo_scraped_products p
                JOIN inventory_management im ON p.id = im.product_id
                LEFT JOIN stock_history sh ON p.id = sh.product_id 
                    AND sh.change_type IN ('price_change', 'both')
                    AND sh.created_at >= NOW() - INTERVAL '{$period} days'
                WHERE im.monitoring_enabled = true
            ";
            
            $params = [];
            if ($productIds) {
                $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
                $sql .= " AND p.id IN ({$placeholders})";
                $params = $productIds;
            }
            
            $sql .= " GROUP BY p.id, p.title, p.price, im.current_price ORDER BY price_changes DESC";
            
            $reportData = $this->db->query($sql, $params)->fetchAll();
            
            // レポート統計計算
            $summary = $this->calculateReportSummary($reportData);
            
            return [
                'report_data' => $reportData,
                'summary' => $summary,
                'period_days' => $period,
                'generated_at' => date('Y-m-d H:i:s'),
                'total_products' => count($reportData)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("価格レポート生成エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    // ===============================================
    // プライベートヘルパーメソッド
    // ===============================================
    
    /**
     * 価格変動記録
     */
    private function recordPriceChange($changeData) {
        $this->db->insert('stock_history', [
            'product_id' => $changeData['product_id'],
            'previous_price' => $changeData['old_price'],
            'new_price' => $changeData['new_price'],
            'change_type' => 'price_change',
            'change_source' => 'yahoo',
            'change_details' => json_encode($changeData),
            'created_at' => $changeData['detected_at']
        ]);
        
        $this->logger->info("価格変動記録: 商品ID {$changeData['product_id']}, {$changeData['change_percent']}% 変動");
    }
    
    /**
     * 価格アラート発動
     */
    private function triggerPriceAlert($changeData) {
        $alertData = [
            'type' => 'price_alert',
            'product_id' => $changeData['product_id'],
            'change_percent' => $changeData['change_percent'],
            'old_price' => $changeData['old_price'],
            'new_price' => $changeData['new_price'],
            'severity' => abs($changeData['change_percent']) > 0.3 ? 'high' : 'medium',
            'detected_at' => $changeData['detected_at']
        ];
        
        // アラートログ記録
        $this->db->insert('inventory_errors', [
            'product_id' => $changeData['product_id'],
            'error_type' => 'price_alert',
            'error_message' => "重要な価格変動検知: {$changeData['change_percent']}%",
            'severity' => $alertData['severity'],
            'created_at' => $changeData['detected_at']
        ]);
        
        $this->logger->warning("価格アラート: 商品ID {$changeData['product_id']}, {$changeData['change_percent']}% 変動");
        
        // 10_zaikoに通知
        $this->notifyPriceAlert($alertData);
    }
    
    /**
     * 価格履歴取得
     */
    private function getPriceHistory($productId, $days) {
        $sql = "
            SELECT new_price, created_at
            FROM stock_history 
            WHERE product_id = ? 
              AND change_type IN ('price_change', 'both')
              AND created_at >= NOW() - INTERVAL '{$days} days'
            ORDER BY created_at DESC
        ";
        
        return $this->db->query($sql, [$productId])->fetchAll();
    }
    
    /**
     * トレンド方向計算
     */
    private function calculateTrendDirection($prices, $dates) {
        if (count($prices) < 2) return 'stable';
        
        // 線形回帰の傾き計算
        $n = count($prices);
        $timestamps = array_map('strtotime', $dates);
        
        $sumX = array_sum($timestamps);
        $sumY = array_sum($prices);
        $sumXY = 0;
        $sumX2 = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $sumXY += $timestamps[$i] * $prices[$i];
            $sumX2 += $timestamps[$i] * $timestamps[$i];
        }
        
        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        
        if ($slope > 0.01) return 'increasing';
        if ($slope < -0.01) return 'decreasing';
        return 'stable';
    }
    
    /**
     * ボラティリティ計算
     */
    private function calculateVolatility($prices) {
        if (count($prices) < 2) return 0;
        
        $mean = array_sum($prices) / count($prices);
        $variance = 0;
        
        foreach ($prices as $price) {
            $variance += pow($price - $mean, 2);
        }
        
        $variance /= count($prices);
        return sqrt($variance) / $mean; // 相対ボラティリティ
    }
    
    /**
     * 価格レンジ分析
     */
    private function analyzePriceRange($prices) {
        if (empty($prices)) return null;
        
        $min = min($prices);
        $max = max($prices);
        $range = $max - $min;
        $mean = array_sum($prices) / count($prices);
        
        return [
            'min' => $min,
            'max' => $max,
            'range' => $range,
            'range_percent' => $mean > 0 ? ($range / $mean) : 0
        ];
    }
    
    /**
     * 線形回帰予測
     */
    private function performLinearRegression($timestamps, $prices, $forecastDays) {
        $n = count($prices);
        
        if ($n < 2) {
            return [
                'predicted_price' => end($prices),
                'margin_of_error' => 0.1,
                'r_squared' => 0
            ];
        }
        
        // 線形回帰計算
        $sumX = array_sum($timestamps);
        $sumY = array_sum($prices);
        $sumXY = 0;
        $sumX2 = 0;
        $sumY2 = 0;
        
        for ($i = 0; $i < $n; $i++) {
            $sumXY += $timestamps[$i] * $prices[$i];
            $sumX2 += $timestamps[$i] * $timestamps[$i];
            $sumY2 += $prices[$i] * $prices[$i];
        }
        
        $slope = ($n * $sumXY - $sumX * $sumY) / ($n * $sumX2 - $sumX * $sumX);
        $intercept = ($sumY - $slope * $sumX) / $n;
        
        // 予測価格計算
        $futureTimestamp = time() + ($forecastDays * 24 * 60 * 60);
        $predictedPrice = $slope * $futureTimestamp + $intercept;
        
        // R二乗値計算
        $rSquared = $this->calculateRSquared($timestamps, $prices, $slope, $intercept);
        
        // 誤差マージン計算
        $marginOfError = max(0.05, 1 - $rSquared); // 最低5%の誤差
        
        return [
            'predicted_price' => max(0, $predictedPrice),
            'margin_of_error' => $marginOfError,
            'r_squared' => $rSquared,
            'slope' => $slope,
            'days_forecast' => $forecastDays
        ];
    }
    
    /**
     * R二乗値計算
     */
    private function calculateRSquared($x, $y, $slope, $intercept) {
        $yMean = array_sum($y) / count($y);
        $ssRes = 0; // 残差平方和
        $ssTot = 0; // 全平方和
        
        for ($i = 0; $i < count($y); $i++) {
            $predicted = $slope * $x[$i] + $intercept;
            $ssRes += pow($y[$i] - $predicted, 2);
            $ssTot += pow($y[$i] - $yMean, 2);
        }
        
        return $ssTot > 0 ? 1 - ($ssRes / $ssTot) : 0;
    }
    
    /**
     * 季節性分析
     */
    private function analyzeSeasonality($history) {
        // 簡易的な季節性分析
        $weekdayPrices = [];
        $hourlyPrices = [];
        
        foreach ($history as $record) {
            $timestamp = strtotime($record['created_at']);
            $weekday = date('w', $timestamp);
            $hour = date('H', $timestamp);
            
            $weekdayPrices[$weekday][] = $record['new_price'];
            $hourlyPrices[$hour][] = $record['new_price'];
        }
        
        return [
            'weekday_variation' => $this->calculateVariation($weekdayPrices),
            'hourly_variation' => $this->calculateVariation($hourlyPrices)
        ];
    }
    
    /**
     * 変動係数計算
     */
    private function calculateVariation($groupedPrices) {
        $variations = [];
        
        foreach ($groupedPrices as $group => $prices) {
            if (count($prices) > 1) {
                $mean = array_sum($prices) / count($prices);
                $variance = 0;
                
                foreach ($prices as $price) {
                    $variance += pow($price - $mean, 2);
                }
                
                $stddev = sqrt($variance / count($prices));
                $variations[$group] = $mean > 0 ? ($stddev / $mean) : 0;
            }
        }
        
        return $variations;
    }
    
    /**
     * 予測信頼度計算
     */
    private function calculatePredictionConfidence($prices, $prediction) {
        $baseConfidence = $prediction['r_squared'];
        $dataPoints = count($prices);
        
        // データ点数による調整
        $dataPointsFactor = min(1.0, $dataPoints / 30); // 30点で最大
        
        // ボラティリティによる調整
        $volatility = $this->calculateVolatility($prices);
        $volatilityFactor = max(0.1, 1 - $volatility);
        
        $confidence = $baseConfidence * $dataPointsFactor * $volatilityFactor;
        
        return round(min(1.0, max(0.0, $confidence)), 3);
    }
    
    /**
     * レポート統計計算
     */
    private function calculateReportSummary($reportData) {
        if (empty($reportData)) {
            return [
                'total_products' => 0,
                'avg_volatility' => 0,
                'most_volatile' => null,
                'price_trend' => 'stable'
            ];
        }
        
        $totalProducts = count($reportData);
        $volatilities = array_column($reportData, 'price_volatility');
        $avgVolatility = array_sum($volatilities) / $totalProducts;
        
        // 最もボラティリティの高い商品
        $maxVolatilityIndex = array_search(max($volatilities), $volatilities);
        $mostVolatile = $reportData[$maxVolatilityIndex];
        
        return [
            'total_products' => $totalProducts,
            'avg_volatility' => round($avgVolatility, 4),
            'most_volatile' => $mostVolatile,
            'price_trend' => $this->calculateOverallTrend($reportData)
        ];
    }
    
    /**
     * 全体トレンド計算
     */
    private function calculateOverallTrend($reportData) {
        $increases = 0;
        $decreases = 0;
        
        foreach ($reportData as $product) {
            $change = $product['current_price'] - $product['original_price'];
            if ($change > 0) $increases++;
            if ($change < 0) $decreases++;
        }
        
        if ($increases > $decreases * 1.5) return 'increasing';
        if ($decreases > $increases * 1.5) return 'decreasing';
        return 'stable';
    }
    
    /**
     * 価格アラート設定
     */
    private function setPriceAlert($productId, $type, $threshold) {
        // 実装は必要に応じて
    }
    
    /**
     * 価格アラート取得
     */
    private function getPriceAlerts($productId) {
        // 実装は必要に応じて
        return [];
    }
    
    /**
     * 10_zaikoアラート通知
     */
    private function notifyPriceAlert($alertData) {
        // 非同期通知実装
    }
}
?>