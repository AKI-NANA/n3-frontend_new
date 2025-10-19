<?php
/**
 * PriceCalculator - 価格・利益計算システムのコアクラス
 * 
 * 機能:
 * - 為替レート管理（安全マージン適用）
 * - 階層型利益率設定の管理
 * - eBayカテゴリー別手数料計算
 * - 最終販売価格の自動計算
 * - 計算履歴の保存
 * 
 * @author Claude
 * @version 1.0.0
 * @date 2025-09-17
 */

class PriceCalculator {
    private $pdo;
    private $logger;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->initializeLogger();
    }
    
    /**
     * ログ機能の初期化
     */
    private function initializeLogger() {
        $this->logger = function($message, $type = 'INFO') {
            $timestamp = date('Y-m-d H:i:s');
            error_log("[{$timestamp}] [{$type}] PriceCalculator: {$message}");
        };
    }
    
    /**
     * ログ出力
     */
    private function log($message, $type = 'INFO') {
        if ($this->logger) {
            call_user_func($this->logger, $message, $type);
        }
    }
    
    /**
     * 最新の計算用為替レートを取得
     * 
     * @param float $custom_safety_margin カスタム安全マージン（%）
     * @return array|null レート情報
     */
    public function getCalculatedExchangeRate($custom_safety_margin = null) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT rate, safety_margin, calculated_rate, recorded_at
                FROM exchange_rates
                WHERE currency_from = 'JPY' AND currency_to = 'USD'
                ORDER BY recorded_at DESC
                LIMIT 1
            ");
            $stmt->execute();
            $rateData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rateData) {
                $this->log('為替レートデータが見つかりません', 'WARNING');
                return null;
            }
            
            // カスタム安全マージンが指定された場合は再計算
            if ($custom_safety_margin !== null) {
                $safety_margin = $custom_safety_margin;
                $calculated_rate = $rateData['rate'] * (1 + ($safety_margin / 100));
            } else {
                $safety_margin = $rateData['safety_margin'];
                $calculated_rate = $rateData['calculated_rate'];
            }
            
            return [
                'base_rate' => $rateData['rate'],
                'safety_margin' => $safety_margin,
                'calculated_rate' => $calculated_rate,
                'recorded_at' => $rateData['recorded_at']
            ];
            
        } catch (Exception $e) {
            $this->log('為替レート取得エラー: ' . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    /**
     * 階層型設定に基づいて利益率設定を取得
     * 
     * @param string $itemId 商品ID
     * @param int $categoryId カテゴリーID
     * @param string $condition コンディション
     * @param int $daysSinceListing 出品からの経過日数
     * @return array|null 利益率設定
     */
    public function getProfitSettings($itemId, $categoryId, $condition, $daysSinceListing) {
        try {
            // 階層的優先順位で設定を検索
            $sql = "
                SELECT profit_margin_target, minimum_profit_amount, maximum_price_usd, setting_type, description
                FROM profit_settings
                WHERE active = TRUE AND (
                    (setting_type = 'period' AND target_value = :days_since_listing) OR
                    (setting_type = 'condition' AND target_value = :condition_name) OR
                    (setting_type = 'category' AND target_value = :category_id) OR
                    (setting_type = 'global' AND target_value = 'default')
                )
                ORDER BY priority_order ASC
                LIMIT 1
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':days_since_listing' => (string)$daysSinceListing,
                ':condition_name' => $condition,
                ':category_id' => (string)$categoryId
            ]);
            
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($settings) {
                $this->log("利益率設定取得成功: タイプ={$settings['setting_type']}, 利益率={$settings['profit_margin_target']}%");
                return $settings;
            }
            
            $this->log('利益率設定が見つかりません', 'WARNING');
            return null;
            
        } catch (Exception $e) {
            $this->log('利益率設定取得エラー: ' . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    /**
     * eBayカテゴリーの手数料率を取得
     * 
     * @param int $categoryId カテゴリーID
     * @return array|null 手数料情報
     */
    public function getEbayCategoryFees($categoryId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT category_name, final_value_fee, insertion_fee, store_final_value_fee
                FROM ebay_categories
                WHERE category_id = ? AND active = TRUE
            ");
            $stmt->execute([$categoryId]);
            $fees = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($fees) {
                $this->log("カテゴリー手数料取得成功: {$fees['category_name']} (ID: {$categoryId})");
                return $fees;
            }
            
            $this->log("カテゴリーID {$categoryId} の手数料情報が見つかりません", 'WARNING');
            
            // デフォルト手数料を返す
            return [
                'category_name' => 'Unknown Category',
                'final_value_fee' => 10.00,
                'insertion_fee' => 0.35,
                'store_final_value_fee' => 9.15
            ];
            
        } catch (Exception $e) {
            $this->log('カテゴリー手数料取得エラー: ' . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    /**
     * 最終販売価格を計算（すべての要素を考慮）
     * 
     * @param array $itemData 商品データ
     * @return array 計算結果
     */
    public function calculateFinalPrice($itemData) {
        try {
            $this->log("価格計算開始: 商品ID={$itemData['id']}");
            
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
            
            // 設定とレートの取得
            $rateInfo = $this->getCalculatedExchangeRate();
            $fees = $this->getEbayCategoryFees($category_id);
            $settings = $this->getProfitSettings($itemData['id'], $category_id, $condition, $days_since_listing);
            
            if (!$rateInfo || !$fees || !$settings) {
                return ['error' => '計算に必要なデータが不足しています。為替レート、カテゴリー手数料、利益率設定を確認してください。'];
            }
            
            // 基本コストをUSDに換算
            $total_cost_jpy = $jpy_price + $shipping_jpy;
            $total_cost_usd = $total_cost_jpy * $rateInfo['calculated_rate'];
            $insertion_fee_usd = $fees['insertion_fee'];
            
            // 利益率から目標販売価格を計算
            // 方程式: 最終価格 = (総コスト + 出品手数料 + 目標利益) / (1 - ファイナルバリューフィー率)
            $target_profit_usd = max(
                $total_cost_usd * ($settings['profit_margin_target'] / 100),
                $settings['minimum_profit_amount']
            );
            
            $base_amount = $total_cost_usd + $insertion_fee_usd + $target_profit_usd;
            $final_sell_price_usd = $base_amount / (1 - ($fees['final_value_fee'] / 100));
            
            // 最大価格制限の適用
            if (isset($settings['maximum_price_usd']) && $settings['maximum_price_usd'] > 0) {
                $final_sell_price_usd = min($final_sell_price_usd, $settings['maximum_price_usd']);
            }
            
            // 実際の利益とマージンを計算
            $final_value_fee_amount = $final_sell_price_usd * ($fees['final_value_fee'] / 100);
            $total_fees = $insertion_fee_usd + $final_value_fee_amount;
            $actual_profit_usd = $final_sell_price_usd - $total_cost_usd - $total_fees;
            $actual_profit_margin = ($actual_profit_usd / $final_sell_price_usd) * 100;
            $roi = ($actual_profit_usd / $total_cost_usd) * 100;
            
            // 計算結果
            $result = [
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
                    'days_since_listing' => $days_since_listing
                ],
                
                // 使用したレートと設定
                'calculation_settings' => [
                    'exchange_rate' => $rateInfo['calculated_rate'],
                    'base_rate' => $rateInfo['base_rate'],
                    'safety_margin' => $rateInfo['safety_margin'],
                    'profit_margin_target' => $settings['profit_margin_target'],
                    'minimum_profit_amount' => $settings['minimum_profit_amount'],
                    'category_name' => $fees['category_name'],
                    'final_value_fee_percent' => $fees['final_value_fee'],
                    'insertion_fee_usd' => $insertion_fee_usd
                ],
                
                // 計算結果
                'results' => [
                    'total_cost_usd' => round($total_cost_usd, 2),
                    'recommended_price_usd' => round($final_sell_price_usd, 2),
                    'estimated_profit_usd' => round($actual_profit_usd, 2),
                    'actual_profit_margin' => round($actual_profit_margin, 2),
                    'roi' => round($roi, 2),
                    'total_fees_usd' => round($total_fees, 2),
                    'final_value_fee_amount' => round($final_value_fee_amount, 2)
                ],
                
                // 推奨事項
                'recommendations' => $this->generateRecommendations($actual_profit_margin, $roi, $days_since_listing)
            ];
            
            // 計算履歴の保存
            $this->saveCalculationHistory($result);
            
            $this->log("価格計算完了: 推奨価格=$" . round($final_sell_price_usd, 2) . ", 利益率=" . round($actual_profit_margin, 2) . "%");
            
            return $result;
            
        } catch (Exception $e) {
            $this->log('価格計算エラー: ' . $e->getMessage(), 'ERROR');
            return ['error' => '価格計算中にエラーが発生しました: ' . $e->getMessage()];
        }
    }
    
    /**
     * 計算結果に基づく推奨事項を生成
     */
    private function generateRecommendations($profit_margin, $roi, $days_since_listing) {
        $recommendations = [];
        
        if ($profit_margin < 15) {
            $recommendations[] = '利益率が低めです。価格の見直しまたはコスト削減を検討してください。';
        } elseif ($profit_margin > 40) {
            $recommendations[] = '利益率が高めです。価格を下げて競争力を向上させることも検討できます。';
        } else {
            $recommendations[] = '適切な利益率です。この価格設定を維持することをお勧めします。';
        }
        
        if ($roi < 20) {
            $recommendations[] = 'ROIが低めです。より高利益の商品選択を検討してください。';
        } elseif ($roi > 50) {
            $recommendations[] = '優秀なROIです。同様の商品の仕入れを増やすことを検討してください。';
        }
        
        if ($days_since_listing > 30) {
            $recommendations[] = '出品から時間が経過しています。価格調整を検討してください。';
        }
        
        return $recommendations;
    }
    
    /**
     * 計算履歴をデータベースに保存
     */
    private function saveCalculationHistory($calculationResult) {
        try {
            if (!$calculationResult['success']) {
                return false;
            }
            
            $input = $calculationResult['input_data'];
            $settings = $calculationResult['calculation_settings'];
            $results = $calculationResult['results'];
            
            $stmt = $this->pdo->prepare("
                INSERT INTO profit_calculations (
                    item_id, category_id, item_condition, days_since_listing,
                    price_jpy, shipping_jpy,
                    exchange_rate, safety_margin, profit_margin_target, minimum_profit_amount,
                    final_value_fee_percent, insertion_fee_usd,
                    total_cost_jpy, total_cost_usd, recommended_price_usd,
                    estimated_profit_usd, actual_profit_margin, roi,
                    calculation_type, notes
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?
                )
            ");
            
            $stmt->execute([
                $calculationResult['item_id'],
                $input['category_id'],
                $input['condition'],
                $input['days_since_listing'],
                $input['price_jpy'],
                $input['shipping_jpy'],
                $settings['exchange_rate'],
                $settings['safety_margin'],
                $settings['profit_margin_target'],
                $settings['minimum_profit_amount'],
                $settings['final_value_fee_percent'],
                $settings['insertion_fee_usd'],
                $input['total_cost_jpy'],
                $results['total_cost_usd'],
                $results['recommended_price_usd'],
                $results['estimated_profit_usd'],
                $results['actual_profit_margin'],
                $results['roi'],
                'advanced',
                implode('; ', $calculationResult['recommendations'])
            ]);
            
            $this->log('計算履歴保存完了');
            return true;
            
        } catch (Exception $e) {
            $this->log('計算履歴保存エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * システム設定の取得
     */
    public function getSystemSetting($key, $default = null) {
        try {
            $stmt = $this->pdo->prepare("SELECT setting_value, setting_type FROM system_settings WHERE setting_key = ?");
            $stmt->execute([$key]);
            $setting = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$setting) {
                return $default;
            }
            
            // 型変換
            switch ($setting['setting_type']) {
                case 'number':
                    return floatval($setting['setting_value']);
                case 'boolean':
                    return filter_var($setting['setting_value'], FILTER_VALIDATE_BOOLEAN);
                case 'json':
                    return json_decode($setting['setting_value'], true);
                default:
                    return $setting['setting_value'];
            }
            
        } catch (Exception $e) {
            $this->log('システム設定取得エラー: ' . $e->getMessage(), 'ERROR');
            return $default;
        }
    }
    
    /**
     * 計算統計の取得
     */
    public function getCalculationStats($days = 30) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total_calculations,
                    AVG(actual_profit_margin) as avg_profit_margin,
                    AVG(roi) as avg_roi,
                    AVG(recommended_price_usd) as avg_price,
                    MIN(recommended_price_usd) as min_price,
                    MAX(recommended_price_usd) as max_price
                FROM profit_calculations 
                WHERE created_at >= NOW() - INTERVAL '{$days} days'
            ");
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            $this->log('統計取得エラー: ' . $e->getMessage(), 'ERROR');
            return null;
        }
    }
}