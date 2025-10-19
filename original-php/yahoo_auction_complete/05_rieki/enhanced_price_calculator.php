<?php
/**
 * Enhanced PriceCalculator - 変動手数料完全対応版
 * 
 * 新機能:
 * - ボリュームディスカウント自動計算
 * - セラーレベル連動手数料
 * - 売上履歴データベース管理
 * - 複数通貨・サイト対応
 * - 海外決済手数料・為替手数料計算
 * 
 * @author Claude AI
 * @version 3.0.0
 * @date 2025-09-17
 */

class EnhancedPriceCalculator {
    private $pdo;
    private $logger;
    private $cache;
    
    // セラー情報
    private $current_seller_id;
    private $seller_profile;
    
    // 手数料レート定数
    const INTERNATIONAL_FEE_BASE_RATE = 0.0135; // 1.35%
    const CURRENCY_CONVERSION_FEE_RATE = 0.030; // 3.0%
    const EXCHANGE_SAFETY_MARGIN = 0.05; // 5%
    
    // eBayサイト通貨マッピング
    const EBAY_SITE_CURRENCIES = [
        'ebay.com' => 'USD',
        'ebay.co.uk' => 'GBP',
        'ebay.de' => 'EUR',
        'ebay.com.au' => 'AUD',
        'ebay.ca' => 'CAD',
        'ebay.fr' => 'EUR',
        'ebay.it' => 'EUR',
        'ebay.es' => 'EUR'
    ];
    
    public function __construct(PDO $pdo, $seller_id = 'sample_seller_001') {
        $this->pdo = $pdo;
        $this->cache = [];
        $this->current_seller_id = $seller_id;
        $this->initializeLogger();
        $this->loadSellerProfile();
    }
    
    /**
     * ログ機能初期化
     */
    private function initializeLogger() {
        $this->logger = function($message, $level = 'INFO', $context = []) {
            try {
                $stmt = $this->pdo->prepare("
                    INSERT INTO system_logs (log_level, component, message, context) 
                    VALUES (?, 'EnhancedPriceCalculator', ?, ?)
                ");
                $stmt->execute([
                    $level,
                    $message,
                    json_encode($context)
                ]);
            } catch (Exception $e) {
                error_log("[EnhancedPriceCalculator] Log error: " . $e->getMessage());
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
        error_log("[" . date('Y-m-d H:i:s') . "] [$level] EnhancedPriceCalculator: $message");
    }
    
    /**
     * セラープロファイル読み込み
     */
    private function loadSellerProfile() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM seller_profiles WHERE seller_id = ?
            ");
            $stmt->execute([$this->current_seller_id]);
            $this->seller_profile = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$this->seller_profile) {
                $this->log("セラープロファイルが見つかりません: {$this->current_seller_id}", 'WARNING');
                // デフォルトプロファイルを作成
                $this->createDefaultSellerProfile();
            }
        } catch (Exception $e) {
            $this->log('セラープロファイル読み込みエラー: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * デフォルトセラープロファイル作成
     */
    private function createDefaultSellerProfile() {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO seller_profiles (seller_id, registered_country, store_subscription_type, seller_level)
                VALUES (?, 'JP', 'basic', 'standard')
                ON CONFLICT (seller_id) DO NOTHING
            ");
            $stmt->execute([$this->current_seller_id]);
            
            // 再読み込み
            $this->loadSellerProfile();
            
        } catch (Exception $e) {
            $this->log('デフォルトセラープロファイル作成エラー: ' . $e->getMessage(), 'ERROR');
        }
    }
    
    /**
     * セラーの現在のボリュームディスカウント率を取得
     */
    public function getCurrentVolumeDiscountRate() {
        try {
            $stmt = $this->pdo->prepare("SELECT get_volume_discount_rate(?, ?) as discount_rate");
            $stmt->execute([
                $this->current_seller_id,
                $this->seller_profile['registered_country'] ?? 'JP'
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return floatval($result['discount_rate'] ?? 0);
            
        } catch (Exception $e) {
            $this->log('ボリュームディスカウント取得エラー: ' . $e->getMessage(), 'ERROR');
            return 0;
        }
    }
    
    /**
     * カテゴリー・ストアタイプ別手数料取得
     */
    public function getCategoryFees($category_id, $store_type = null) {
        try {
            $store_type = $store_type ?? $this->seller_profile['store_subscription_type'] ?? 'basic';
            
            $stmt = $this->pdo->prepare("SELECT * FROM get_category_fees(?, ?)");
            $stmt->execute([$category_id, $store_type]);
            
            $fees = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$fees) {
                $this->log("カテゴリー手数料が見つかりません: $category_id, $store_type", 'WARNING');
                return $this->getDefaultCategoryFees();
            }
            
            return [
                'final_value_rate' => floatval($fees['final_value_rate']),
                'insertion_fee' => floatval($fees['insertion_fee']),
                'store_type' => $store_type
            ];
            
        } catch (Exception $e) {
            $this->log('カテゴリー手数料取得エラー: ' . $e->getMessage(), 'ERROR');
            return $this->getDefaultCategoryFees();
        }
    }
    
    /**
     * デフォルトカテゴリー手数料
     */
    private function getDefaultCategoryFees() {
        return [
            'final_value_rate' => 0.1290, // 12.90%
            'insertion_fee' => 0.30,
            'store_type' => 'basic'
        ];
    }
    
    /**
     * 海外決済手数料計算
     */
    public function calculateInternationalFee($total_revenue_usd, $is_international_sale = true) {
        if (!$is_international_sale) {
            return 0;
        }
        
        // ベース手数料率
        $base_rate = self::INTERNATIONAL_FEE_BASE_RATE;
        
        // ボリュームディスカウント適用
        $volume_discount_rate = $this->getCurrentVolumeDiscountRate();
        
        // セラーレベルチェック
        if (($this->seller_profile['seller_level'] ?? 'standard') === 'below_standard') {
            $volume_discount_rate = 0; // Below Standardはディスカウント適用なし
        }
        
        $effective_rate = max(0, $base_rate - $volume_discount_rate);
        
        return $total_revenue_usd * $effective_rate;
    }
    
    /**
     * 為替手数料計算
     */
    public function calculateCurrencyConversionFee($total_revenue_usd, $ebay_site = 'ebay.com') {
        $site_currency = self::EBAY_SITE_CURRENCIES[$ebay_site] ?? 'USD';
        
        // USDサイトの場合は為替手数料なし
        if ($site_currency === 'USD') {
            return 0;
        }
        
        return $total_revenue_usd * self::CURRENCY_CONVERSION_FEE_RATE;
    }
    
    /**
     * 为替レート取得（安全マージン適用済み）
     */
    public function getCalculatedExchangeRate($target_currency = 'USD') {
        try {
            // キャッシュチェック
            $cache_key = "exchange_rate_{$target_currency}";
            if (isset($this->cache[$cache_key])) {
                $cached = $this->cache[$cache_key];
                if (time() - $cached['timestamp'] < 3600) { // 1時間キャッシュ
                    return $cached['data'];
                }
            }
            
            $stmt = $this->pdo->prepare("
                SELECT rate, safety_margin, calculated_rate, recorded_at
                FROM exchange_rates
                WHERE currency_from = 'JPY' AND currency_to = ?
                ORDER BY recorded_at DESC
                LIMIT 1
            ");
            $stmt->execute([$target_currency]);
            $rate_data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$rate_data) {
                throw new Exception("為替レートデータが見つかりません: JPY to $target_currency");
            }
            
            $result = [
                'base_rate' => floatval($rate_data['rate']),
                'safety_margin' => floatval($rate_data['safety_margin']),
                'calculated_rate' => floatval($rate_data['calculated_rate']),
                'recorded_at' => $rate_data['recorded_at'],
                'currency_pair' => "JPY/{$target_currency}"
            ];
            
            // キャッシュに保存
            $this->cache[$cache_key] = [
                'data' => $result,
                'timestamp' => time()
            ];
            
            return $result;
            
        } catch (Exception $e) {
            $this->log('為替レート取得エラー: ' . $e->getMessage(), 'ERROR');
            
            // フォールバック
            return [
                'base_rate' => 150.0,
                'safety_margin' => 5.0,
                'calculated_rate' => 157.5,
                'recorded_at' => date('Y-m-d H:i:s'),
                'currency_pair' => "JPY/{$target_currency}",
                'is_fallback' => true
            ];
        }
    }
    
    /**
     * 包括的価格計算（メイン関数）
     */
    public function calculateComprehensivePrice($calculation_data) {
        try {
            $this->log('包括的価格計算開始', 'INFO', $calculation_data);
            
            // 入力データの検証
            $validated_data = $this->validateCalculationData($calculation_data);
            
            // 必要な設定データを取得
            $exchange_rate = $this->getCalculatedExchangeRate();
            $category_fees = $this->getCategoryFees($validated_data['category_id']);
            $volume_discount_rate = $this->getCurrentVolumeDiscountRate();
            
            // 計算実行
            $calculation_result = $this->performComprehensiveCalculation(
                $validated_data, 
                $exchange_rate, 
                $category_fees, 
                $volume_discount_rate
            );
            
            // 履歴保存
            $calculation_id = $this->saveCalculationHistory($calculation_result);
            
            $this->log('包括的価格計算完了', 'INFO', [
                'calculation_id' => $calculation_id,
                'recommended_price' => $calculation_result['results']['recommended_price_usd']
            ]);
            
            return $calculation_result;
            
        } catch (Exception $e) {
            $this->log('包括的価格計算エラー: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * 計算データの検証
     */
    private function validateCalculationData($data) {
        $required_fields = [
            'yahoo_price_jpy', 'category_id', 'condition',
            'assumed_sell_price_usd', 'assumed_shipping_usd'
        ];
        
        foreach ($required_fields as $field) {
            if (!isset($data[$field]) || $data[$field] === '') {
                throw new Exception("必須フィールドが不足: $field");
            }
        }
        
        return [
            'item_id' => $data['item_id'] ?? 'CALC-' . uniqid(),
            'yahoo_price_jpy' => floatval($data['yahoo_price_jpy']),
            'domestic_shipping_jpy' => floatval($data['domestic_shipping_jpy'] ?? 0),
            'category_id' => intval($data['category_id']),
            'condition' => trim($data['condition']),
            'assumed_sell_price_usd' => floatval($data['assumed_sell_price_usd']),
            'assumed_shipping_usd' => floatval($data['assumed_shipping_usd']),
            'ebay_site' => $data['ebay_site'] ?? 'ebay.com',
            'buyer_country' => $data['buyer_country'] ?? 'US',
            'days_since_listing' => intval($data['days_since_listing'] ?? 0)
        ];
    }
    
    /**
     * 包括的計算処理の実行
     */
    private function performComprehensiveCalculation($data, $exchange_rate, $category_fees, $volume_discount_rate) {
        // 1. 基本コスト計算
        $total_cost_jpy = $data['yahoo_price_jpy'] + $data['domestic_shipping_jpy'];
        $total_cost_usd = $total_cost_jpy / $exchange_rate['calculated_rate'];
        
        // 2. 収入計算
        $total_revenue_usd = $data['assumed_sell_price_usd'] + $data['assumed_shipping_usd'];
        
        // 3. eBay基本手数料計算
        $final_value_fee_usd = $total_revenue_usd * $category_fees['final_value_rate'];
        $insertion_fee_usd = $category_fees['insertion_fee'];
        
        // 4. 海外決済手数料計算
        $seller_country = $this->seller_profile['registered_country'] ?? 'JP';
        $is_international = ($data['buyer_country'] !== $seller_country);
        $international_fee_usd = $this->calculateInternationalFee($total_revenue_usd, $is_international);
        
        // 5. 为替手数料計算
        $currency_conversion_fee_usd = $this->calculateCurrencyConversionFee($total_revenue_usd, $data['ebay_site']);
        
        // 6. 送料コスト
        $shipping_cost_usd = $data['assumed_shipping_usd']; // 実際は計算ツール連携
        
        // 7. 総手数料
        $total_fees_usd = $final_value_fee_usd + $insertion_fee_usd + $international_fee_usd + $currency_conversion_fee_usd;
        
        // 8. 純利益計算
        $net_profit_usd = $total_revenue_usd - $total_cost_usd - $total_fees_usd - $shipping_cost_usd;
        
        // 9. 比率計算
        $profit_margin = ($net_profit_usd / $total_revenue_usd) * 100;
        $roi = ($net_profit_usd / $total_cost_usd) * 100;
        
        // 10. 推奨価格計算（逆算）
        $target_profit_margin = 25.0; // 目標利益率25%
        $target_profit_usd = ($total_cost_usd + $shipping_cost_usd) * ($target_profit_margin / 100);
        
        // 手数料を考慮した推奨販売価格
        $recommended_sell_price_usd = ($total_cost_usd + $shipping_cost_usd + $target_profit_usd + $insertion_fee_usd + $international_fee_usd + $currency_conversion_fee_usd) / (1 - $category_fees['final_value_rate']);
        
        return [
            'item_id' => $data['item_id'],
            'calculation_timestamp' => date('Y-m-d H:i:s'),
            'seller_info' => [
                'seller_id' => $this->current_seller_id,
                'country' => $seller_country,
                'store_type' => $this->seller_profile['store_subscription_type'],
                'seller_level' => $this->seller_profile['seller_level']
            ],
            'input_data' => $data,
            'settings_applied' => [
                'exchange_rate' => $exchange_rate,
                'category_fees' => $category_fees,
                'volume_discount_rate' => $volume_discount_rate,
                'is_international_sale' => $is_international
            ],
            'results' => [
                'total_cost_usd' => round($total_cost_usd, 2),
                'total_revenue_usd' => round($total_revenue_usd, 2),
                'recommended_price_usd' => round($recommended_sell_price_usd, 2),
                'net_profit_usd' => round($net_profit_usd, 2),
                'profit_margin_percent' => round($profit_margin, 2),
                'roi_percent' => round($roi, 2),
                'fee_breakdown' => [
                    'final_value_fee_usd' => round($final_value_fee_usd, 2),
                    'insertion_fee_usd' => round($insertion_fee_usd, 2),
                    'international_fee_usd' => round($international_fee_usd, 2),
                    'currency_conversion_fee_usd' => round($currency_conversion_fee_usd, 2),
                    'total_fees_usd' => round($total_fees_usd, 2)
                ]
            ],
            'recommendations' => $this->generateAdvancedRecommendations($profit_margin, $roi, $net_profit_usd)
        ];
    }
    
    /**
     * 高度な推奨事項生成
     */
    private function generateAdvancedRecommendations($profit_margin, $roi, $profit_amount) {
        $recommendations = [];
        
        // 利益率に基づく推奨
        if ($profit_amount <= 0) {
            $recommendations[] = '⚠️ 損失が予想されます。価格設定の見直しが必要です。';
        } elseif ($profit_margin < 10) {
            $recommendations[] = '🔴 利益率が危険水準です。リスクが高すぎます。';
        } elseif ($profit_margin < 15) {
            $recommendations[] = '🟠 利益率が低めです。価格上昇を検討してください。';
        } elseif ($profit_margin < 25) {
            $recommendations[] = '🟡 標準的な利益率です。競合分析を推奨します。';
        } else {
            $recommendations[] = '🟢 優秀な利益率です！この設定を維持してください。';
        }
        
        // ボリュームディスカウントに基づく推奨
        $current_discount = $this->getCurrentVolumeDiscountRate();
        if ($current_discount > 0) {
            $recommendations[] = "✅ ボリュームディスカウント適用中（{$current_discount}%）";
        } else {
            $recommendations[] = "💡 売上$3,000以上でボリュームディスカウント対象になります。";
        }
        
        // セラーレベルに基づく推奨
        $seller_level = $this->seller_profile['seller_level'] ?? 'standard';
        if ($seller_level === 'below_standard') {
            $recommendations[] = "⚠️ セラーレベルが「Below Standard」のため、ボリュームディスカウントが適用されません。";
        }
        
        return $recommendations;
    }
    
    /**
     * 計算履歴の保存
     */
    private function saveCalculationHistory($calculation_result) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO profit_calculations (
                    item_id, seller_id, category_id, item_condition, price_jpy, shipping_jpy,
                    days_since_listing, exchange_rate_used, safety_margin_used,
                    total_cost_usd, recommended_price_usd, estimated_profit_usd,
                    actual_profit_margin, roi, total_fees_usd,
                    international_fee_usd, currency_conversion_fee_usd, volume_discount_applied,
                    ebay_site, calculation_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'enhanced_api')
            ");
            
            $input = $calculation_result['input_data'];
            $results = $calculation_result['results'];
            $settings = $calculation_result['settings_applied'];
            
            $stmt->execute([
                $input['item_id'],
                $this->current_seller_id,
                $input['category_id'],
                $input['condition'],
                $input['yahoo_price_jpy'],
                $input['domestic_shipping_jpy'],
                $input['days_since_listing'],
                $settings['exchange_rate']['calculated_rate'],
                $settings['exchange_rate']['safety_margin'],
                $results['total_cost_usd'],
                $results['recommended_price_usd'],
                $results['net_profit_usd'],
                $results['profit_margin_percent'],
                $results['roi_percent'],
                $results['fee_breakdown']['total_fees_usd'],
                $results['fee_breakdown']['international_fee_usd'],
                $results['fee_breakdown']['currency_conversion_fee_usd'],
                $settings['volume_discount_rate'],
                $input['ebay_site']
            ]);
            
            return $this->pdo->lastInsertId();
            
        } catch (Exception $e) {
            $this->log('計算履歴保存エラー: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * 売上データの記録（eBay APIから取得したデータの保存用）
     */
    public function recordSaleTransaction($transaction_data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO ebay_sales_history (
                    seller_id, transaction_id, sale_date, ebay_site, item_id,
                    sale_amount_original, sale_amount_usd, original_currency,
                    buyer_country, is_international, fees_paid
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (transaction_id) DO NOTHING
            ");
            
            $is_international = ($transaction_data['buyer_country'] !== ($this->seller_profile['registered_country'] ?? 'JP'));
            
            $stmt->execute([
                $this->current_seller_id,
                $transaction_data['transaction_id'],
                $transaction_data['sale_date'],
                $transaction_data['ebay_site'] ?? 'ebay.com',
                $transaction_data['item_id'] ?? null,
                $transaction_data['sale_amount_original'],
                $transaction_data['sale_amount_usd'],
                $transaction_data['original_currency'],
                $transaction_data['buyer_country'],
                $is_international,
                $transaction_data['fees_paid'] ?? 0
            ]);
            
            $this->log('売上データ記録完了', 'INFO', [
                'transaction_id' => $transaction_data['transaction_id'],
                'amount_usd' => $transaction_data['sale_amount_usd']
            ]);
            
            return true;
            
        } catch (Exception $e) {
            $this->log('売上データ記録エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * セラーレベルの更新
     */
    public function updateSellerLevel($new_level) {
        try {
            $stmt = $this->pdo->prepare("
                UPDATE seller_profiles 
                SET seller_level = ?, last_level_check = CURRENT_TIMESTAMP 
                WHERE seller_id = ?
            ");
            $stmt->execute([$new_level, $this->current_seller_id]);
            
            $this->seller_profile['seller_level'] = $new_level;
            $this->log("セラーレベル更新: $new_level", 'INFO');
            
            return true;
        } catch (Exception $e) {
            $this->log('セラーレベル更新エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * 月次統計の更新
     */
    public function updateMonthlyStats($target_month = null) {
        try {
            $target_month = $target_month ?: date('Y-m-01', strtotime('-2 months'));
            
            $stmt = $this->pdo->prepare("SELECT update_monthly_seller_stats(?, ?)");
            $stmt->execute([$this->current_seller_id, $target_month]);
            
            $this->log("月次統計更新完了: $target_month", 'INFO');
            return true;
            
        } catch (Exception $e) {
            $this->log('月次統計更新エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    /**
     * システムヘルスチェック
     */
    public function performHealthCheck() {
        $health_status = [
            'status' => 'healthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'checks' => [],
            'seller_info' => [
                'seller_id' => $this->current_seller_id,
                'country' => $this->seller_profile['registered_country'] ?? 'Unknown',
                'store_type' => $this->seller_profile['store_subscription_type'] ?? 'Unknown',
                'level' => $this->seller_profile['seller_level'] ?? 'Unknown'
            ]
        ];
        
        try {
            // データベース接続チェック
            $stmt = $this->pdo->query("SELECT 1");
            $health_status['checks']['database'] = $stmt ? 'OK' : 'ERROR';
            
            // 為替レートチェック
            $exchange_rate = $this->getCalculatedExchangeRate();
            $health_status['checks']['exchange_rate'] = isset($exchange_rate['is_fallback']) ? 'WARNING' : 'OK';
            
            // ボリュームディスカウントチェック
            $discount_rate = $this->getCurrentVolumeDiscountRate();
            $health_status['checks']['volume_discount'] = 'OK';
            $health_status['current_discount_rate'] = $discount_rate;
            
            // 売上データの最新性チェック
            $stmt = $this->pdo->prepare("
                SELECT MAX(sale_date) as last_sale_date 
                FROM ebay_sales_history 
                WHERE seller_id = ?
            ");
            $stmt->execute([$this->current_seller_id]);
            $last_sale = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($last_sale['last_sale_date']) {
                $days_since_last_sale = (time() - strtotime($last_sale['last_sale_date'])) / (24 * 3600);
                $health_status['checks']['sales_data'] = $days_since_last_sale <= 30 ? 'OK' : 'WARNING';
                $health_status['last_sale_date'] = $last_sale['last_sale_date'];
            } else {
                $health_status['checks']['sales_data'] = 'NO_DATA';
            }
            
            // 全体ステータス判定
            foreach ($health_status['checks'] as $check => $result) {
                if ($result === 'ERROR') {
                    $health_status['status'] = 'unhealthy';
                    break;
                } elseif ($result === 'WARNING' && $health_status['status'] === 'healthy') {
                    $health_status['status'] = 'degraded';
                }
            }
            
        } catch (Exception $e) {
            $health_status['status'] = 'unhealthy';
            $health_status['error'] = $e->getMessage();
            $this->log('ヘルスチェックエラー: ' . $e->getMessage(), 'ERROR');
        }
        
        return $health_status;
    }
}

/**
 * eBay売上データ取得クラス（APIラッパー）
 */
class EbaySalesDataCollector {
    private $pdo;
    private $calculator;
    private $api_credentials;
    
    public function __construct(PDO $pdo, EnhancedPriceCalculator $calculator) {
        $this->pdo = $pdo;
        $this->calculator = $calculator;
        $this->loadAPICredentials();
    }
    
    /**
     * API認証情報の読み込み
     */
    private function loadAPICredentials() {
        // システム設定から取得
        $stmt = $this->pdo->prepare("
            SELECT setting_key, setting_value 
            FROM system_settings 
            WHERE setting_key IN ('ebay_api_token', 'ebay_app_id', 'ebay_dev_id', 'ebay_cert_id')
        ");
        $stmt->execute();
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        $this->api_credentials = [
            'token' => $settings['ebay_api_token'] ?? '',
            'app_id' => $settings['ebay_app_id'] ?? '',
            'dev_id' => $settings['ebay_dev_id'] ?? '',
            'cert_id' => $settings['ebay_cert_id'] ?? ''
        ];
    }
    
    /**
     * 過去の売上データを取得してデータベースに保存
     */
    public function collectSalesData($start_date, $end_date) {
        try {
            // eBay API呼び出し（実装例）
            $transactions = $this->fetchTransactionsFromAPI($start_date, $end_date);
            
            $imported_count = 0;
            foreach ($transactions as $transaction) {
                $success = $this->calculator->recordSaleTransaction([
                    'transaction_id' => $transaction['TransactionID'],
                    'sale_date' => $transaction['CreatedDate'],
                    'ebay_site' => $transaction['Site'] ?? 'eBay',
                    'item_id' => $transaction['Item']['ItemID'],
                    'sale_amount_original' => $transaction['TransactionPrice'],
                    'sale_amount_usd' => $this->convertToUSD($transaction['TransactionPrice'], $transaction['Currency']),
                    'original_currency' => $transaction['Currency'],
                    'buyer_country' => $transaction['Buyer']['RegistrationAddress']['Country'],
                    'fees_paid' => $transaction['FinalValueFee'] ?? 0
                ]);
                
                if ($success) {
                    $imported_count++;
                }
            }
            
            return [
                'success' => true,
                'imported_count' => $imported_count,
                'total_found' => count($transactions)
            ];
            
        } catch (Exception $e) {
            error_log('売上データ取得エラー: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * eBay APIからトランザクションデータを取得（擬似実装）
     */
    private function fetchTransactionsFromAPI($start_date, $end_date) {
        // 実際のeBay API実装はここに記述
        // GetSellerTransactions APIの使用例
        
        /*
        $xml_request = '<?xml version="1.0" encoding="utf-8"?>
        <GetSellerTransactionsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
            <RequesterCredentials>
                <eBayAuthToken>' . $this->api_credentials['token'] . '</eBayAuthToken>
            </RequesterCredentials>
            <ModTimeFrom>' . $start_date . '</ModTimeFrom>
            <ModTimeTo>' . $end_date . '</ModTimeTo>
            <Pagination>
                <EntriesPerPage>200</EntriesPerPage>
                <PageNumber>1</PageNumber>
            </Pagination>
        </GetSellerTransactionsRequest>';
        */
        
        // デモ用サンプルデータ
        return [
            [
                'TransactionID' => 'TXN001',
                'CreatedDate' => date('Y-m-d'),
                'Site' => 'eBay',
                'Item' => ['ItemID' => 'ITEM001'],
                'TransactionPrice' => 120.00,
                'Currency' => 'USD',
                'Buyer' => ['RegistrationAddress' => ['Country' => 'US']],
                'FinalValueFee' => 12.00
            ]
        ];
    }
    
    /**
     * 通貨換算（USD）
     */
    private function convertToUSD($amount, $currency) {
        if ($currency === 'USD') {
            return $amount;
        }
        
        // 実際の実装では為替レートAPIを使用
        $conversion_rates = [
            'EUR' => 1.08,
            'GBP' => 1.25,
            'CAD' => 0.74,
            'AUD' => 0.66
        ];
        
        return $amount * ($conversion_rates[$currency] ?? 1.0);
    }
}
?>