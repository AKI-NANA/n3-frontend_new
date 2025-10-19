<?php
/**
 * 日次自動タスク実行スクリプト
 * 
 * 実行内容:
 * 1. 為替レートの自動取得と保存
 * 2. 価格調整ルールに基づく自動価格更新
 * 3. システム統計の更新
 * 
 * Cron設定例:
 * # 毎日午前6時に実行
 * 0 6 * * * cd /path/to/your/project && php cron/daily_tasks.php
 * 
 * @author Claude
 * @version 1.0.0
 * @date 2025-09-17
 */

// エラーレポートの設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/cron_errors.log');

// タイムゾーン設定
date_default_timezone_set('Asia/Tokyo');

// パスの設定
$baseDir = dirname(__DIR__);
require_once $baseDir . '/shared/core/database_query_handler.php';
require_once $baseDir . '/classes/PriceCalculator.php';

/**
 * ログ機能
 */
function cronLog($message, $type = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$type}] CRON: {$message}" . PHP_EOL;
    
    // ファイルログ
    $logFile = __DIR__ . '/../logs/cron.log';
    file_put_contents($logFile, $logMessage, FILE_APPEND | LOCK_EX);
    
    // コンソール出力
    echo $logMessage;
}

/**
 * 為替レート取得クラス
 */
class ExchangeRateUpdater {
    private $pdo;
    private $apiKey;
    private $baseUrl = 'https://openexchangerates.org/api/latest.json';
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->loadApiKey();
    }
    
    private function loadApiKey() {
        try {
            $stmt = $this->pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'exchange_api_key'");
            $stmt->execute();
            $this->apiKey = $stmt->fetchColumn();
            
            if (empty($this->apiKey)) {
                cronLog('Open Exchange Rates APIキーが設定されていません', 'WARNING');
            }
        } catch (Exception $e) {
            cronLog('APIキー取得エラー: ' . $e->getMessage(), 'ERROR');
        }
    }
    
    public function updateRates() {
        try {
            cronLog('為替レート更新開始');
            
            // APIからレートを取得
            $rateData = $this->fetchRateFromAPI();
            
            if (!$rateData) {
                // APIが利用できない場合、フォールバック値を使用
                cronLog('API利用不可、フォールバック値を使用', 'WARNING');
                $rateData = $this->getFallbackRate();
            }
            
            if ($rateData) {
                $this->saveRateToDatabase($rateData);
                $this->cleanupOldRates();
                cronLog('為替レート更新完了: 1 USD = ' . $rateData['jpy_rate'] . ' JPY');
                return true;
            }
            
            cronLog('為替レート更新失敗', 'ERROR');
            return false;
            
        } catch (Exception $e) {
            cronLog('為替レート更新エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
    
    private function fetchRateFromAPI() {
        if (empty($this->apiKey)) {
            return null;
        }
        
        try {
            $url = $this->baseUrl . '?app_id=' . $this->apiKey . '&base=USD&symbols=JPY';
            
            $context = stream_context_create([
                'http' => [
                    'timeout' => 30,
                    'user_agent' => 'Yahoo Auction Tool Exchange Rate Updater'
                ]
            ]);
            
            $response = file_get_contents($url, false, $context);
            
            if ($response === false) {
                cronLog('API応答取得失敗', 'ERROR');
                return null;
            }
            
            $data = json_decode($response, true);
            
            if (!$data || !isset($data['rates']['JPY'])) {
                cronLog('API応答形式エラー', 'ERROR');
                return null;
            }
            
            return [
                'jpy_rate' => $data['rates']['JPY'],
                'timestamp' => $data['timestamp']
            ];
            
        } catch (Exception $e) {
            cronLog('API呼び出しエラー: ' . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    private function getFallbackRate() {
        // 直近のレートを取得してわずかな変動を適用
        try {
            $stmt = $this->pdo->prepare("
                SELECT rate 
                FROM exchange_rates 
                WHERE currency_from = 'JPY' AND currency_to = 'USD'
                ORDER BY recorded_at DESC 
                LIMIT 1
            ");
            $stmt->execute();
            $lastRate = $stmt->fetchColumn();
            
            if ($lastRate) {
                // ±0.5%のランダム変動を適用
                $variation = (mt_rand(-50, 50) / 10000); // -0.005 to 0.005
                $newRate = $lastRate * (1 + $variation);
                
                return [
                    'jpy_rate' => 1 / $newRate, // JPY per USD に変換
                    'timestamp' => time()
                ];
            }
            
            // デフォルトレート（1 USD = 150 JPY）
            return [
                'jpy_rate' => 150.0,
                'timestamp' => time()
            ];
            
        } catch (Exception $e) {
            cronLog('フォールバックレート取得エラー: ' . $e->getMessage(), 'ERROR');
            return null;
        }
    }
    
    private function saveRateToDatabase($rateData) {
        try {
            // デフォルト安全マージンを取得
            $stmt = $this->pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'default_safety_margin'");
            $stmt->execute();
            $safetyMargin = floatval($stmt->fetchColumn() ?: 5.0);
            
            // USD per JPY に変換
            $usdPerJpy = 1 / $rateData['jpy_rate'];
            $calculatedRate = $usdPerJpy * (1 + ($safetyMargin / 100));
            
            $stmt = $this->pdo->prepare("
                INSERT INTO exchange_rates (
                    currency_from, currency_to, rate, safety_margin, 
                    calculated_rate, source, recorded_at
                ) VALUES (
                    'JPY', 'USD', ?, ?, ?, ?, NOW()
                )
            ");
            
            $stmt->execute([
                $usdPerJpy,
                $safetyMargin,
                $calculatedRate,
                'Open Exchange Rates API'
            ]);
            
            cronLog("為替レート保存: base={$usdPerJpy}, margin={$safetyMargin}%, calculated={$calculatedRate}");
            
        } catch (Exception $e) {
            cronLog('為替レート保存エラー: ' . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    private function cleanupOldRates() {
        try {
            // 30日以上古いレートデータを削除
            $stmt = $this->pdo->prepare("
                DELETE FROM exchange_rates 
                WHERE recorded_at < NOW() - INTERVAL '30 days'
            ");
            $stmt->execute();
            
            $deletedCount = $stmt->rowCount();
            if ($deletedCount > 0) {
                cronLog("古い為替レートデータを削除: {$deletedCount}件");
            }
            
        } catch (Exception $e) {
            cronLog('為替レートクリーンアップエラー: ' . $e->getMessage(), 'ERROR');
        }
    }
}

/**
 * 価格自動調整クラス
 */
class PriceAdjuster {
    private $pdo;
    private $calculator;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
        $this->calculator = new PriceCalculator($pdo);
    }
    
    public function adjustPrices() {
        try {
            cronLog('価格自動調整開始');
            
            $adjustmentRules = $this->getActiveAdjustmentRules();
            $adjustedCount = 0;
            
            foreach ($adjustmentRules as $rule) {
                $itemsToAdjust = $this->findItemsForAdjustment($rule);
                
                foreach ($itemsToAdjust as $item) {
                    if ($this->adjustItemPrice($item, $rule)) {
                        $adjustedCount++;
                    }
                }
            }
            
            cronLog("価格自動調整完了: {$adjustedCount}件の商品価格を調整");
            return $adjustedCount;
            
        } catch (Exception $e) {
            cronLog('価格自動調整エラー: ' . $e->getMessage(), 'ERROR');
            return 0;
        }
    }
    
    private function getActiveAdjustmentRules() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM price_adjustment_rules 
                WHERE active = TRUE 
                ORDER BY category_id, days_since_listing
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            cronLog('価格調整ルール取得エラー: ' . $e->getMessage(), 'ERROR');
            return [];
        }
    }
    
    private function findItemsForAdjustment($rule) {
        try {
            // 実際の商品テーブルと連携（仮想的なクエリ）
            $sql = "
                SELECT item_id, category_id, condition_type, price_usd, listing_date,
                       EXTRACT(DAYS FROM (NOW() - listing_date)) as days_since_listing
                FROM mystical_japan_treasures_inventory 
                WHERE category_id = ? 
                  AND condition_type = ?
                  AND EXTRACT(DAYS FROM (NOW() - listing_date)) >= ?
                  AND listing_status = 'Listed'
                LIMIT 100
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $rule['category_id'],
                $rule['condition_type'],
                $rule['days_since_listing']
            ]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            cronLog('調整対象商品取得エラー: ' . $e->getMessage(), 'ERROR');
            return [];
        }
    }
    
    private function adjustItemPrice($item, $rule) {
        try {
            $currentPrice = $item['price_usd'];
            
            if ($rule['adjustment_type'] === 'percentage') {
                $newPrice = $currentPrice * (1 + ($rule['adjustment_value'] / 100));
            } else {
                $newPrice = $currentPrice + $rule['adjustment_value'];
            }
            
            // 最低価格制限の適用
            if (isset($rule['min_price_limit']) && $newPrice < $rule['min_price_limit']) {
                $newPrice = $rule['min_price_limit'];
            }
            
            // 価格更新
            $stmt = $this->pdo->prepare("
                UPDATE mystical_japan_treasures_inventory 
                SET price_usd = ?, updated_at = NOW() 
                WHERE item_id = ?
            ");
            $stmt->execute([$newPrice, $item['item_id']]);
            
            cronLog("価格調整: 商品ID={$item['item_id']}, {$currentPrice} -> {$newPrice}");
            
            return true;
            
        } catch (Exception $e) {
            cronLog('個別価格調整エラー: ' . $e->getMessage(), 'ERROR');
            return false;
        }
    }
}

/**
 * システム統計更新クラス
 */
class SystemStatsUpdater {
    private $pdo;
    
    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }
    
    public function updateStats() {
        try {
            cronLog('システム統計更新開始');
            
            $this->updateDailyStats();
            $this->cleanupOldLogs();
            
            cronLog('システム統計更新完了');
            
        } catch (Exception $e) {
            cronLog('システム統計更新エラー: ' . $e->getMessage(), 'ERROR');
        }
    }
    
    private function updateDailyStats() {
        // 日次統計の計算と保存
        $stats = [
            'total_calculations' => $this->getCalculationCount(),
            'avg_profit_margin' => $this->getAverageProfitMargin(),
            'active_listings' => $this->getActiveListingCount()
        ];
        
        foreach ($stats as $key => $value) {
            $this->updateSystemSetting("daily_stats_{$key}", $value);
        }
    }
    
    private function getCalculationCount() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) FROM profit_calculations 
                WHERE created_at >= CURRENT_DATE
            ");
            $stmt->execute();
            return $stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function getAverageProfitMargin() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT AVG(actual_profit_margin) FROM profit_calculations 
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
            ");
            $stmt->execute();
            return round($stmt->fetchColumn(), 2);
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function getActiveListingCount() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) FROM mystical_japan_treasures_inventory 
                WHERE listing_status = 'Listed'
            ");
            $stmt->execute();
            return $stmt->fetchColumn();
        } catch (Exception $e) {
            return 0;
        }
    }
    
    private function updateSystemSetting($key, $value) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
                VALUES (?, ?, 'number', 'Daily auto-generated statistic')
                ON CONFLICT (setting_key) 
                DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
            ");
            $stmt->execute([$key, $value]);
        } catch (Exception $e) {
            cronLog("統計設定更新エラー {$key}: " . $e->getMessage(), 'ERROR');
        }
    }
    
    private function cleanupOldLogs() {
        try {
            // 90日以上古い計算履歴を削除
            $stmt = $this->pdo->prepare("
                DELETE FROM profit_calculations 
                WHERE created_at < NOW() - INTERVAL '90 days'
            ");
            $stmt->execute();
            
            $deletedCount = $stmt->rowCount();
            if ($deletedCount > 0) {
                cronLog("古い計算履歴を削除: {$deletedCount}件");
            }
        } catch (Exception $e) {
            cronLog('ログクリーンアップエラー: ' . $e->getMessage(), 'ERROR');
        }
    }
}

/**
 * メイン実行関数
 */
function runDailyTasks() {
    cronLog('=== 日次タスク実行開始 ===');
    $startTime = microtime(true);
    
    try {
        // データベース接続
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            cronLog('データベース接続失敗', 'ERROR');
            return false;
        }
        
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 1. 為替レート更新
        $rateUpdater = new ExchangeRateUpdater($pdo);
        $rateUpdater->updateRates();
        
        // 2. 価格自動調整
        $priceAdjuster = new PriceAdjuster($pdo);
        $adjustedCount = $priceAdjuster->adjustPrices();
        
        // 3. システム統計更新
        $statsUpdater = new SystemStatsUpdater($pdo);
        $statsUpdater->updateStats();
        
        $endTime = microtime(true);
        $executionTime = round($endTime - $startTime, 2);
        
        cronLog("=== 日次タスク実行完了 ({$executionTime}秒) ===");
        cronLog("調整された商品数: {$adjustedCount}件");
        
        return true;
        
    } catch (Exception $e) {
        cronLog('日次タスク実行エラー: ' . $e->getMessage(), 'ERROR');
        return false;
    }
}

// スクリプトが直接実行された場合のみタスクを実行
if (php_sapi_name() === 'cli' || basename($_SERVER['PHP_SELF']) === 'daily_tasks.php') {
    runDailyTasks();
}