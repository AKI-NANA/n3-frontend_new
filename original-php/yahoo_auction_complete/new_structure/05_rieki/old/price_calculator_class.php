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
 * - 価格自動調整ルールの適用
 * 
 * @author Claude AI
 * @version 2.0.0
 * @date 2025-09-17
 */

class PriceCalculator {
    private $pdo;
    private $logger;
    private $cache;
    
    // 定数定義
    const DEFAULT_SAFETY_MARGIN = 5.0;
    const DEFAULT_PROFIT_MARGIN = 25.0;
    const DEFAULT_MINIMUM_PROFIT = 5.0;
    const EXCHANGE_CACHE_DURATION = 3600; // 1時間
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->cache = [];
        $this->initializeLogger();
        $this->validateDependencies();
    }
    
    /**
     * ログ機能の初期化
     */
    private function initializeLogger() {
        $this->logger = function($message, $level = 'INFO', $context = []) {
            try {
                $stmt = $this->pdo->prepare("
                    INSERT INTO system_logs (log_level, component, message, context) 
                    VALUES (?, 'PriceCalculator', ?, ?)
                ");
                $stmt->execute([
                    $level,
                    $message,
                    json_encode($context)
                ]);
            } catch (Exception $e) {
                error_log("[PriceCalculator] Log error: " . $e->getMessage());
            }
        };
    }
    
    /**
     * ログ出力
     */
    private function log($message, $level = 'INFO', $context = []) {
        if ($this->logger) {
            call_user_func($this->logger, $message, $level, $context);
        }
        
        // ファイルログも出力
        $timestamp = date('Y-m-d H:i:s');
        error_log("[{$timestamp}] [{$level}] PriceCalculator: {$message}");
    }
    
    /**
     * 依存関係の検証
     */
    private function validateDependencies() {
        $required_tables = [
            'ebay_categories',
            'exchange_rates', 
            'profit_settings',
            'profit_calculations',
            'system_settings'
        ];
        
        foreach ($required_tables as $table) {
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_name = ? AND table_schema = 'public'
            ");
            $stmt->execute([$table]);
            
            if ($stmt->fetchColumn() == 0) {
                throw new Exception("Required table '{$table}' not found. Please run database setup.");
            }
        }
        
        $this->log('Dependencies validated successfully');
    }
    
    /**
     * 最新の計算用為替レートを取得
     * 
     * @param float $custom_safety_margin カスタム安全マージン（%）
     * @return array|null レート情報
     */
    public function getCalculatedExchangeRate($custom_safety_margin = null) {
        try {
            // キャッシュチェック
            $cache_key = 'exchange_rate_' . ($custom_safety_margin ?? 'default');
            if (isset($this->cache[$cache_key])) {
                $cached_data = $this->cache[$cache_key];
                if (time() - $cached_data['timestamp'] < self::EXCHANGE_CACHE_DURATION) {
                    return $cached_data['data'];
                }
            }
            
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
                return $this->getDefaultExchangeRate();
            }
            
            // カスタム安全マージンが指定された場合は再計算
            if ($custom_safety_margin !== null) {
                $safety_margin = $custom_safety_margin;
                $calculated_rate = $rateData['rate'] * (1 + ($safety_margin / 100));
            } else {
                $safety_margin = $rateData['safety_margin'];
                $calculated_rate = $rateData['calculated_rate'];
            }
            
            $result = [
                'base_rate' => floatval($rateData['rate']),
                'safety_margin' => floatval($safety_margin),
                'calculated_rate' => floatval($calculated_rate),
                'recorded_at' => $rateData['recorded_at'],
                'is_current' => $this->isExchangeRateCurrent($rateData['recorded_at'])
            ];
            
            // キャッシュに保存
            $this->cache[$cache_key] = [
                'data' => $result,
                'timestamp' => time()
            ];
            
            return $result;
            
        } catch (Exception $e) {
            $this->log('為替レート取得エラー: ' . $e->getMessage(), 'ERROR');
            return $this->getDefaultExchangeRate();
        }
    }
    
    /**
     * デフォルト為替レートを返す（フォールバック）
     */
    private function getDefaultExchangeRate() {
        $default_rate = 150.0;
        $safety_margin = self::DEFAULT_SAFETY_MARGIN;
        
        return [
            'base_rate' => $default_rate,
            'safety_margin' => $safety_margin,
            'calculated_rate' => $default_rate * (1 + ($safety_margin / 100)),
            'recorded_at' => date('Y-m-d H:i:s'),
            'is_current' => false
        ];
    }
    
    /**
     * 為替レートが最新かどうかチェック
     */
    private function isExchangeRateCurrent($recorded_at) {
        $recorded_timestamp = strtotime($recorded_at);
        $hours_old = (time() - $recorded_timestamp) / 3600;
        
        return $hours_old <= 24; // 24時間以内なら最新とする
    }
    
    /**
     * 階層型設定から適用すべき利益率設定を取得
     * 
     * @param string $itemId 商品ID
     * @param int $categoryId カテゴリーID
     * @param string $condition コンディション
     * @param int $daysSinceListing 出品経過日数
     * @return array 利益率設定
     */
    public function getProfitSettings($itemId, $categoryId, $condition, $daysSinceListing) {
        try {
            // 優先順位に従って設定を検索
            $search_conditions = [
                // 1. 期間別設定（最高優先）
                [
                    'type' => 'period',
                    'value' => (string)$daysSinceListing,
                    'operator' => '>='
                ],
                // 2. コンディション別設定
                [
                    'type' => 'condition',
                    'value' => $condition,
                    'operator' => '='
                ],
                // 3. カテゴリー別設定
                [
                    'type' => 'category',
                    'value' => (string)$categoryId,
                    'operator' => '='
                ],
                // 4. グローバル設定（最低優先）
                [
                    'type' => 'global',
                    'value' => 'default',
                    'operator' => '='
                ]
            ];
            
            foreach ($search_conditions as $condition_set) {
                $settings = $this->findProfitSettingByCondition($condition_set);
                if ($settings) {
                    $this->log("利益率設定適用: {$condition_set['type']} - {$condition_set['value']}", 'INFO', [
                        'item_id' => $itemId,
                        'settings_id' => $settings['id']
                    ]);
                    return $settings;
                }
            }
            
            // フォールバック: デフォルト設定を返す
            return $this->getDefaultProfitSettings();
            
        } catch (Exception $e) {
            $this->log('利益率設定取得エラー: ' . $e->getMessage(), 'ERROR', [
                'item_id' => $itemId,
                'category_id' => $categoryId
            ]);
            return $this->getDefaultProfitSettings();
        }
    }
    
    /**
     * 条件に基づいて利益率設定を検索
     */
    private function findProfitSettingByCondition($condition) {
        $sql = "
            SELECT id, setting_type, target_value, profit_margin_target, 
                   minimum_profit_amount, priority_order, conditions
            FROM profit_settings 
            WHERE setting_type = ? AND active = TRUE
        ";
        
        $params = [$condition['type']];
        
        if ($condition['operator'] === '=') {
            $sql .= " AND target_value = ?";
            $params[] = $condition['value'];
        } elseif ($condition['operator'] === '>=' && $condition['type'] === 'period') {
            $sql .= " AND ? >= CAST(target_value AS INTEGER)";
            $params[] = intval($condition['value']);
        }
        
        $sql .= " ORDER BY priority_order ASC LIMIT 1";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * デフォルト利益率設定を返す
     */
    private function getDefaultProfitSettings() {
        return [
            'id' => null,
            'setting_type' => 'default',
            'target_value' => 'fallback',
            'profit_margin_target' => self::DEFAULT_PROFIT_MARGIN,
            'minimum_profit_amount' => self::DEFAULT_MINIMUM_PROFIT,
            'priority_order' => 9999,
            'conditions' => null
        ];
    }
    
    /**
     * eBayカテゴリー別手数料情報を取得
     * 
     * @param int $categoryId カテゴリーID
     * @return array|null 手数料情報
     */
    public function getEbayCategoryFees($categoryId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT category_id, category_name, category_path,
                       final_value_fee, insertion_fee, store_final_value_fee,
                       international_fee, last_updated
                FROM ebay_categories 
                WHERE category_id = ? AND active = TRUE
            ");
            $stmt->execute([$categoryId]);
            $categoryData = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$categoryData) {
                $this->log("カテゴリー情報が見つかりません: {$categoryId}", 'WARNING');
                return $this->getDefaultCategoryFees($categoryId);
            }
            
            return [
                'category_id' => intval($categoryData['category_id']),
                'category_name' => $categoryData['category_name'],
                'category_path' => $categoryData['category_path'],
                'final_value_fee' => floatval($categoryData['final_value_fee']),
                'insertion_fee' => floatval($categoryData['insertion_fee']),
                'store_final_value_fee' => floatval($categoryData['store_final_value_fee'] ?? 0),
                'international_fee' => floatval($categoryData['international_fee'] ?? 0),
                'last_updated' => $categoryData['last_updated'],
                'is_current' => $this->isCategoryDataCurrent($categoryData['last_updated'])
            ];
            
        } catch (Exception $e) {
            $this->log('カテゴリー手数料取得エラー: ' . $e->getMessage(), 'ERROR');
            return $this->getDefaultCategoryFees($categoryId);
        }
    }
    
    /**
     * デフォルトカテゴリー手数料を返す
     */
    private function getDefaultCategoryFees($categoryId) {
        return [
            'category_id' => $categoryId,
            'category_name' => 'Unknown Category',
            'category_path' => 'Unknown',
            'final_value_fee' => 12.9, // 一般的な手数料
            'insertion_fee' => 0.35,
            'store_final_value_fee' => 0,
            'international_fee' => 0,
            'last_updated' => null,
            'is_current' => false
        ];
    }
    
    /**
     * カテゴリーデータが最新かどうかチェック
     */
    private function isCategoryDataCurrent($last_updated) {
        if (!$last_updated) return false;
        
        $updated_timestamp = strtotime($last_updated);
        $days_old = (time() - $updated_timestamp) / (24 * 3600);
        
        return $days_old <= 30; // 30日以内なら最新とする
    }
    
    /**
     * 全要素を考慮した最終価格計算（メイン関数）
     * 
     * @param array $itemData 商品データ
     * @return array 計算結果
     */
    public function calculateFinalPrice($itemData) {
        try {
            $this->log('価格計算開始', 'INFO', $itemData);
            
            // 入力データの検証
            $validatedData = $this->validateItemData($itemData);
            
            // 必要な設定データを取得
            $exchangeRate = $this->getCalculatedExchangeRate();
            $profitSettings = $this->getProfitSettings(
                $validatedData['id'],
                $validatedData['category_id'], 
                $validatedData['condition'], 
                $validatedData['days_since_listing']
            );
            $categoryFees = $this->getEbayCategoryFees($validatedData['category_id']);
            
            if (!$exchangeRate || !$categoryFees) {
                throw new Exception('必要な設定データの取得に失敗しました');
            }
            
            // 価格計算実行
            $calculation = $this->performPriceCalculation($validatedData, $exchangeRate, $profitSettings, $categoryFees);
            
            // 計算結果を履歴に保存
            $calculationId = $this->saveCalculationHistory($validatedData, $calculation, $exchangeRate, $profitSettings);
            
            $this->log('価格計算完了', 'INFO', [
                'item_id' => $validatedData['id'],
                'calculation_id' => $calculationId,
                'recommended_price' => $calculation['results']['recommended_price_usd']
            ]);
            
            return $calculation;
            
        } catch (Exception $e) {
            $this->log('価格計算エラー: ' . $e->getMessage(), 'ERROR', $itemData);
            throw $e;
        }
    }
    
    /**
     * 入力データの検証とサニタイゼーション
     */
    private function validateItemData($itemData) {
        $required_fields = ['price_jpy', 'category_id', 'condition'];
        
        foreach ($required_fields as $field) {
            if (!isset($itemData[$field]) || $itemData[$field] === '') {
                throw new Exception("必須フィールドが不足しています: {$field}");
            }
        }
        
        return [
            'id' => $itemData['id'] ?? 'CALC-' . uniqid(),
            'price_jpy' => floatval($itemData['price_jpy']),
            'shipping_jpy' => floatval($itemData['shipping_jpy'] ?? 0),
            'category_id' => intval($itemData['category_id']),
            'condition' => trim($itemData['condition']),
            'days_since_listing' => intval($itemData['days_since_listing'] ?? 0)
        ];
    }
    
    /**
     * 実際の価格計算処理
     */
    private function performPriceCalculation($itemData, $exchangeRate, $profitSettings, $categoryFees) {
        // 1. 総コスト計算（円 → ドル）
        $totalCostJPY = $itemData['price_jpy'] + $itemData['shipping_jpy'];
        $totalCostUSD = $totalCostJPY / $exchangeRate['calculated_rate'];
        
        // 2. 目標利益計算
        $profitMarginTarget = $profitSettings['profit_margin_target'] / 100;
        $minimumProfitUSD = $profitSettings['minimum_profit_amount'];
        
        $calculatedProfitUSD = $totalCostUSD * $profitMarginTarget;
        $targetProfitUSD = max($calculatedProfitUSD, $minimumProfitUSD);
        
        // 3. eBay手数料計算
        $insertionFee = $categoryFees['insertion_fee'];
        $finalValueFeeRate = $categoryFees['final_value_fee'] / 100;
        
        // 4. 推奨販売価格計算
        // Price = (Cost + Insertion Fee + Target Profit) / (1 - Final Value Fee Rate)
        $recommendedPriceUSD = ($totalCostUSD + $insertionFee + $targetProfitUSD) / (1 - $finalValueFeeRate);
        
        // 5. 実際の手数料と利益計算
        $finalValueFee = $recommendedPriceUSD * $finalValueFeeRate;
        $totalFeesUSD = $insertionFee + $finalValueFee;
        $actualProfitUSD = $recommendedPriceUSD - $totalCostUSD - $totalFeesUSD;
        
        // 6. 比率計算
        $actualProfitMargin = ($actualProfitUSD / $recommendedPriceUSD) * 100;
        $roi = ($actualProfitUSD / $totalCostUSD) * 100;
        
        // 7. 価格自動調整の適用（該当する場合）
        $adjustmentInfo = $this->checkPriceAdjustment($itemData, $recommendedPriceUSD);
        
        return [
            'item_id' => $itemData['id'],
            'calculation_timestamp' => date('Y-m-d H:i:s'),
            'input_data' => $itemData,
            'calculation_settings' => [
                'exchange_rate' => $exchangeRate,
                'profit_settings' => $profitSettings,
                'category_fees' => $categoryFees
            ],
            'results' => [
                'total_cost_usd' => round($totalCostUSD, 2),
                'recommended_price_usd' => round($recommendedPriceUSD, 2),
                'estimated_profit_usd' => round($actualProfitUSD, 2),
                'actual_profit_margin' => round($actualProfitMargin, 2),
                'roi' => round($roi, 2),
                'total_fees_usd' => round($totalFeesUSD, 2),
                'breakdown' => [
                    'insertion_fee' => round($insertionFee, 2),
                    'final_value_fee' => round($finalValueFee, 2),
                    'target_profit' => round($targetProfitUSD, 2)
                ]
            ],
            'adjustment_info' => $adjustmentInfo,
            'recommendations' => $this->generateRecommendations($actualProfitMargin, $roi, $actualProfitUSD)
        ];
    }
    
    /**
     * 価格自動調整の適用チェック
     */
    private function checkPriceAdjustment($itemData, $currentPrice) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT id, rule_name, adjustment_type, adjustment_value, min_price_limit
                FROM price_adjustment_rules 
                WHERE (category_id = ? OR category_id IS NULL)
                  AND (condition_type = ? OR condition_type IS NULL)
                  AND days_since_listing <= ?
                  AND active = TRUE
                ORDER BY days_since_listing DESC, category_id ASC
                LIMIT 1
            ");
            $stmt->execute([
                $itemData['category_id'],
                $itemData['condition'],
                $itemData['days_since_listing']
            ]);
            
            $rule = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rule) {
                return [
                    'applicable' => false,
                    'reason' => '適用可能な調整ルールなし'
                ];
            }
            
            // 調整価格計算
            if ($rule['adjustment_type'] === 'percentage') {
                $adjustedPrice = $currentPrice * (1 + ($rule['adjustment_value'] / 100));
            } else {
                $adjustedPrice = $currentPrice + $rule['adjustment_value'];
            }
            
            // 最低価格制限チェック
            if ($rule['min_price_limit'] && $adjustedPrice < $rule['min_price_limit']) {
                $adjustedPrice = $rule['min_price_limit'];
            }
            
            return [
                'applicable' => true,
                'rule_id' => $rule['id'],
                'rule_name' => $rule['rule_name'],
                'original_price' => $currentPrice,
                'adjusted_price' => $adjustedPrice,
                'adjustment_amount' => $adjustedPrice - $currentPrice,
                'adjustment_percentage' => (($adjustedPrice - $currentPrice) / $currentPrice) * 100
            ];
            
        } catch (Exception $e) {
            $this->log('価格調整チェックエラー: ' . $e->getMessage(), 'ERROR');
            return [
                'applicable' => false,
                'reason' => 'エラーが発生しました'
            ];
        }
    }
    
    /**
     * 推奨事項生成
     */
    private function generateRecommendations($profitMargin, $roi, $profitAmount) {
        $recommendations = [];
        
        if ($profitAmount <= 0) {
            $recommendations[] = '⚠️ 損失が発生する設定です。価格や仕入先の見直しが必要です。';
        } elseif ($profitMargin < 10) {
            $recommendations[] = '🔴 利益率が低すぎます。リスクが高いため推奨できません。';
        } elseif ($profitMargin < 20) {
            $recommendations[] = '🟡 利益率が低めです。価格調整を検討してください。';
        } elseif ($profitMargin < 30) {
            $recommendations[] = '✅ 適切な利益率です。この価格設定で問題ありません。';
        } else {
            $recommendations[] = '🎉 優秀な利益率です！積極的に販売を進めてください。';
        }
        
        if ($roi > 50) {
            $recommendations[] = 'ROIが非常に良好です。同種商品の仕入れ拡大を検討してください。';
        } elseif ($roi < 15) {
            $recommendations[] = 'ROIが低めです。より効率的な商品選択を検討してください。';
        }
        
        return $recommendations;
    }
    
    /**
     * 計算履歴の保存
     */
    private function saveCalculationHistory($itemData, $calculation, $exchangeRate, $profitSettings) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO profit_calculations (
                    item_id, category_id, item_condition, price_jpy, shipping_jpy,
                    days_since_listing, applied_profit_setting_id, exchange_rate_used,
                    safety_margin_used, total_cost_usd, recommended_price_usd,
                    estimated_profit_usd, actual_profit_margin, roi, total_fees_usd,
                    calculation_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api')
            ");
            
            $stmt->execute([
                $itemData['id'],
                $itemData['category_id'],
                $itemData['condition'],
                $itemData['price_jpy'],
                $itemData['shipping_jpy'],
                $itemData['days_since_listing'],
                $profitSettings['id'],
                $exchangeRate['calculated_rate'],
                $exchangeRate['safety_margin'],
                $calculation['results']['total_cost_usd'],
                $calculation['results']['recommended_price_usd'],
                $calculation['results']['estimated_profit_usd'],
                $calculation['results']['actual_profit_margin'],
                $calculation['results']['roi'],
                $calculation['results']['total_fees_usd']
            ]);
            
            return $this->pdo->lastInsertId();
            
        } catch (Exception $e) {
            $this->log('計算履歴保存エラー: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * 利益率設定の保存
     */
    public function saveProfitSetting($settingData) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO profit_settings (
                    setting_type, target_value, profit_margin_target, 
                    minimum_profit_amount, priority_order, conditions, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'user')
            ");
            
            $stmt->execute([
                $settingData['setting_type'],
                $settingData['target_value'],
                $settingData['profit_margin_target'],
                $settingData['minimum_profit_amount'],
                $settingData['priority_order'],
                $settingData['conditions'] ?? null
            ]);
            
            $settingId = $this->pdo->lastInsertId();
            
            $this->log('利益率設定保存完了', 'INFO', [
                'setting_id' => $settingId,
                'type' => $settingData['setting_type']
            ]);
            
            return [
                'id' => $settingId,
                'message' => '設定が正常に保存されました'
            ];
            
        } catch (Exception $e) {
            $this->log('利益率設定保存エラー: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * システム設定の取得
     */
    public function getSystemSetting($key, $default = null) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT setting_value, setting_type 
                FROM system_settings 
                WHERE setting_key = ?
            ");
            $stmt->execute([$key]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                return $default;
            }
            
            // 型変換
            switch ($result['setting_type']) {
                case 'number':
                    return is_numeric($result['setting_value']) ? floatval($result['setting_value']) : $default;
                case 'boolean':
                    return filter_var($result['setting_value'], FILTER_VALIDATE_BOOLEAN);
                case 'json':
                    return json_decode($result['setting_value'], true) ?: $default;
                default:
                    return $result['setting_value'];
            }
            
        } catch (Exception $e) {
            $this->log('システム設定取得エラー: ' . $e->getMessage(), 'ERROR');
            return $default;
        }
    }
    
    /**
     * システム設定の更新
     */
    public function updateSystemSetting($key, $value, $type = 'string') {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at) 
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = EXCLUDED.setting_value, 
                             setting_type = EXCLUDED.setting_type,
                             updated_at = CURRENT_TIMESTAMP
            ");
            
            $stmt->execute([$key, $value, $type]);
            
            $this->log("システム設定更新: {$key}", 'INFO');
            return true;
            
        } catch (Exception $e) {
            $this->log('システム設定更新エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * ヘルスチェック
     */
    public function healthCheck() {
        $status = [
            'status' => 'healthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'checks' => []
        ];
        
        try {
            // データベース接続チェック
            $stmt = $this->pdo->query("SELECT 1");
            $status['checks']['database'] = $stmt ? 'OK' : 'ERROR';
            
            // 為替レートチェック
            $exchangeRate = $this->getCalculatedExchangeRate();
            $status['checks']['exchange_rate'] = $exchangeRate && $exchangeRate['is_current'] ? 'OK' : 'WARNING';
            
            // カテゴリーデータチェック
            $stmt = $this->pdo->query("SELECT COUNT(*) FROM ebay_categories WHERE active = TRUE");
            $categoryCount = $stmt->fetchColumn();
            $status['checks']['categories'] = $categoryCount > 0 ? 'OK' : 'ERROR';
            
            // 全体ステータス判定
            foreach ($status['checks'] as $check => $result) {
                if ($result === 'ERROR') {
                    $status['status'] = 'unhealthy';
                    break;
                } elseif ($result === 'WARNING' && $status['status'] === 'healthy') {
                    $status['status'] = 'degraded';
                }
            }
            
        } catch (Exception $e) {
            $status['status'] = 'unhealthy';
            $status['error'] = $e->getMessage();
            $this->log('ヘルスチェックエラー: ' . $e->getMessage(), 'ERROR');
        }
        
        return $status;
    }
    
    /**
     * デストラクタ
     */
    public function __destruct() {
        // クリーンアップ処理があれば実行
        $this->pdo = null;
    }
}

/**
 * 為替レート自動更新クラス
 */
class ExchangeRateUpdater {
    private $pdo;
    private $calculator;
    private $apiKey;
    
    public function __construct(PDO $pdo, PriceCalculator $calculator) {
        $this->pdo = $pdo;
        $this->calculator = $calculator;
        $this->apiKey = $calculator->getSystemSetting('exchange_api_key');
    }
    
    /**
     * 為替レートの更新実行
     */
    public function updateRates() {
        try {
            $apiProvider = $this->calculator->getSystemSetting('exchange_api_provider', 'openexchangerates');
            $safetyMargin = $this->calculator->getSystemSetting('default_safety_margin', 5.0);
            
            $baseRate = $this->fetchRateFromAPI($apiProvider);
            
            if ($baseRate) {
                $calculatedRate = $baseRate * (1 + ($safetyMargin / 100));
                
                $stmt = $this->pdo->prepare("
                    INSERT INTO exchange_rates (rate, safety_margin, calculated_rate, data_source) 
                    VALUES (?, ?, ?, ?)
                ");
                
                $stmt->execute([$baseRate, $safetyMargin, $calculatedRate, $apiProvider]);
                
                return [
                    'success' => true,
                    'base_rate' => $baseRate,
                    'calculated_rate' => $calculatedRate,
                    'safety_margin' => $safetyMargin
                ];
            }
            
            throw new Exception('APIからのレート取得に失敗');
            
        } catch (Exception $e) {
            error_log('Exchange rate update error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * APIから為替レートを取得
     */
    private function fetchRateFromAPI($provider) {
        switch ($provider) {
            case 'openexchangerates':
                return $this->fetchFromOpenExchangeRates();
            default:
                throw new Exception('Unsupported API provider: ' . $provider);
        }
    }
    
    /**
     * Open Exchange Rates APIからレート取得
     */
    private function fetchFromOpenExchangeRates() {
        if (!$this->apiKey) {
            throw new Exception('API key not configured');
        }
        
        $url = "https://openexchangerates.org/api/latest.json?app_id={$this->apiKey}&base=USD";
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'user_agent' => 'Yahoo-Auction-Tool/2.0'
            ]
        ]);
        
        $response = file_get_contents($url, false, $context);
        
        if ($response === false) {
            throw new Exception('API request failed');
        }
        
        $data = json_decode($response, true);
        
        if (!isset($data['rates']['JPY'])) {
            throw new Exception('JPY rate not found in API response');
        }
        
        // USD→JPYレートを取得（1 USD = X JPY）
        return floatval($data['rates']['JPY']);
    }
}
?>