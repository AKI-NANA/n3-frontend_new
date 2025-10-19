<?php
/**
 * Amazon 在庫・価格監視エンジン
 * new_structure/10_zaiko/AmazonStockMonitor.php
 * 
 * 動的ポーリング・変動検知・アラート機能を実装
 */

require_once __DIR__ . '/../02_scraping/amazon/AmazonDataProcessor.php';
require_once __DIR__ . '/../shared/core/database_manager.php';
require_once __DIR__ . '/../shared/core/common_functions.php';

class AmazonStockMonitor {
    
    private $dataProcessor;
    private $db;
    private $config;
    private $monitoringSession;
    
    /**
     * コンストラクタ
     * 
     * @param string $marketplace マーケットプレイス
     */
    public function __construct($marketplace = 'US') {
        $this->dataProcessor = new AmazonDataProcessor($marketplace);
        $this->db = getDatabaseConnection();
        $this->config = require __DIR__ . '/../shared/config/amazon_api.php';
        
        if (!$this->db) {
            throw new Exception("Database connection failed");
        }
        
        $this->monitoringSession = [
            'start_time' => microtime(true),
            'session_id' => uniqid('monitor_'),
            'marketplace' => $marketplace,
            'processed_count' => 0,
            'error_count' => 0,
            'alerts_sent' => 0
        ];
        
        $this->logMessage("Amazon Stock Monitor initialized for marketplace: $marketplace", 'INFO');
    }
    
    /**
     * メイン監視実行（スケジューラーから呼び出し）
     * 
     * @param string $mode 監視モード ('high-priority', 'normal', 'low-priority', 'all')
     * @return array 監視結果
     */
    public function runMonitoring($mode = 'all') {
        $this->logMessage("Starting monitoring session: {$this->monitoringSession['session_id']} - Mode: $mode", 'INFO');
        
        try {
            $monitoringRules = $this->getActiveMonitoringRules($mode);
            
            if (empty($monitoringRules)) {
                return [
                    'success' => true,
                    'message' => 'No active monitoring rules found',
                    'session' => $this->monitoringSession
                ];
            }
            
            $this->logMessage("Found " . count($monitoringRules) . " active monitoring rules", 'INFO');
            
            // 優先度別にグループ化
            $groupedRules = $this->groupRulesByPriority($monitoringRules);
            
            $results = [];
            
            // 高優先度から順次処理
            foreach (['high', 'normal', 'low'] as $priority) {
                if (!isset($groupedRules[$priority])) {
                    continue;
                }
                
                $priorityResults = $this->processMonitoringGroup($groupedRules[$priority], $priority);
                $results[$priority] = $priorityResults;
                
                // レート制限を考慮した間隔調整
                if ($priority === 'high') {
                    sleep(1); // 高優先度は短い間隔
                } else {
                    sleep(2); // その他は長めの間隔
                }
            }
            
            // セッション統計更新
            $this->updateSessionStats($results);
            
            // 次回チェック時間更新
            $this->updateNextCheckTimes($monitoringRules);
            
            $sessionResult = [
                'success' => true,
                'session' => $this->monitoringSession,
                'results' => $results,
                'summary' => $this->generateSummaryReport($results)
            ];
            
            $this->logMessage("Monitoring session completed: " . json_encode($sessionResult['summary']), 'INFO');
            
            return $sessionResult;
            
        } catch (Exception $e) {
            $this->logMessage("Monitoring session failed: " . $e->getMessage(), 'ERROR');
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'session' => $this->monitoringSession
            ];
        }
    }
    
    /**
     * アクティブ監視ルール取得
     * 
     * @param string $mode 監視モード
     * @return array 監視ルール配列
     */
    private function getActiveMonitoringRules($mode) {
        $whereClause = "WHERE is_active = true AND (next_check_at IS NULL OR next_check_at <= NOW())";
        
        // モード別フィルタ
        switch ($mode) {
            case 'high-priority':
                $whereClause .= " AND priority_level = 'high'";
                break;
            case 'normal':
                $whereClause .= " AND priority_level = 'normal'";
                break;
            case 'low-priority':
                $whereClause .= " AND priority_level = 'low'";
                break;
            case 'all':
                // フィルタなし
                break;
        }
        
        $sql = "SELECT mr.*, ard.title, ard.current_price, ard.availability_status, ard.last_api_update_at
                FROM amazon_monitoring_rules mr
                LEFT JOIN amazon_research_data ard ON mr.asin = ard.asin
                $whereClause
                ORDER BY 
                    CASE mr.priority_level 
                        WHEN 'high' THEN 1 
                        WHEN 'normal' THEN 2 
                        WHEN 'low' THEN 3 
                    END,
                    mr.next_check_at ASC
                LIMIT 100"; // レート制限考慮
        
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 監視ルールの優先度別グループ化
     * 
     * @param array $rules 監視ルール配列
     * @return array グループ化されたルール
     */
    private function groupRulesByPriority($rules) {
        $grouped = [];
        
        foreach ($rules as $rule) {
            $priority = $rule['priority_level'];
            if (!isset($grouped[$priority])) {
                $grouped[$priority] = [];
            }
            $grouped[$priority][] = $rule;
        }
        
        return $grouped;
    }
    
    /**
     * 監視グループ処理
     * 
     * @param array $rules 同優先度の監視ルール
     * @param string $priority 優先度
     * @return array 処理結果
     */
    private function processMonitoringGroup($rules, $priority) {
        $asins = array_column($rules, 'asin');
        $results = [
            'priority' => $priority,
            'total_rules' => count($rules),
            'processed' => 0,
            'changes_detected' => 0,
            'alerts_sent' => 0,
            'errors' => 0,
            'details' => []
        ];
        
        $this->logMessage("Processing $priority priority group: " . count($asins) . " ASINs", 'INFO');
        
        try {
            // データ取得・更新
            $processingResult = $this->dataProcessor->processAsinList($asins, [
                'resource_set' => 'optimized',
                'force_update' => true,
                'save_to_db' => true,
                'track_changes' => true
            ]);
            
            if (!$processingResult['success']) {
                throw new Exception("Data processing failed: " . $processingResult['message']);
            }
            
            // 各ASINの変動チェック・アラート処理
            foreach ($rules as $rule) {
                try {
                    $changeResult = $this->checkAndProcessChanges($rule);
                    $results['details'][$rule['asin']] = $changeResult;
                    $results['processed']++;
                    
                    if ($changeResult['changes_detected']) {
                        $results['changes_detected']++;
                    }
                    
                    if ($changeResult['alert_sent']) {
                        $results['alerts_sent']++;
                        $this->monitoringSession['alerts_sent']++;
                    }
                    
                } catch (Exception $e) {
                    $results['errors']++;
                    $this->monitoringSession['error_count']++;
                    $this->logMessage("Error processing rule for ASIN {$rule['asin']}: " . $e->getMessage(), 'ERROR');
                }
            }
            
            $this->monitoringSession['processed_count'] += $results['processed'];
            
        } catch (Exception $e) {
            $results['group_error'] = $e->getMessage();
            $this->logMessage("Group processing failed for $priority priority: " . $e->getMessage(), 'ERROR');
        }
        
        return $results;
    }
    
    /**
     * 変動チェック・アラート処理
     * 
     * @param array $rule 監視ルール
     * @return array 処理結果
     */
    private function checkAndProcessChanges($rule) {
        $asin = $rule['asin'];
        $result = [
            'asin' => $asin,
            'changes_detected' => false,
            'alert_sent' => false,
            'price_change' => null,
            'stock_change' => null,
            'rating_change' => null
        ];
        
        // 最新データと前回データの比較
        $currentData = $this->getCurrentData($asin);
        $previousData = $this->getPreviousData($asin);
        
        if (!$currentData) {
            throw new Exception("Current data not found for ASIN: $asin");
        }
        
        // 価格変動チェック
        if ($rule['monitor_price'] && $previousData) {
            $priceChange = $this->checkPriceChange($currentData, $previousData, $rule);
            if ($priceChange) {
                $result['price_change'] = $priceChange;
                $result['changes_detected'] = true;
                
                if ($this->shouldTriggerPriceAlert($priceChange, $rule)) {
                    $this->triggerAlert($asin, 'price_change', $priceChange, $rule);
                    $result['alert_sent'] = true;
                }
            }
        }
        
        // 在庫変動チェック
        if ($rule['monitor_stock'] && $previousData) {
            $stockChange = $this->checkStockChange($currentData, $previousData, $rule);
            if ($stockChange) {
                $result['stock_change'] = $stockChange;
                $result['changes_detected'] = true;
                
                if ($this->shouldTriggerStockAlert($stockChange, $rule)) {
                    $this->triggerAlert($asin, 'stock_change', $stockChange, $rule);
                    $result['alert_sent'] = true;
                }
            }
        }
        
        // 評価変動チェック
        if ($rule['monitor_rating'] && $previousData) {
            $ratingChange = $this->checkRatingChange($currentData, $previousData, $rule);
            if ($ratingChange) {
                $result['rating_change'] = $ratingChange;
                $result['changes_detected'] = true;
            }
        }
        
        return $result;
    }
    
    /**
     * 価格変動チェック
     * 
     * @param array $current 現在のデータ
     * @param array $previous 前回のデータ
     * @param array $rule 監視ルール
     * @return array|null 変動情報
     */
    private function checkPriceChange($current, $previous, $rule) {
        $currentPrice = floatval($current['current_price']);
        $previousPrice = floatval($previous['current_price']);
        
        if ($currentPrice === 0.0 || $previousPrice === 0.0) {
            return null;
        }
        
        $changeAmount = $currentPrice - $previousPrice;
        $changePercentage = ($changeAmount / $previousPrice) * 100;
        
        $threshold = $rule['price_change_threshold_percent'];
        
        // 閾値以上の変動がある場合のみ
        if (abs($changePercentage) >= $threshold) {
            return [
                'type' => $changePercentage > 0 ? 'increase' : 'decrease',
                'previous_price' => $previousPrice,
                'current_price' => $currentPrice,
                'change_amount' => $changeAmount,
                'change_percentage' => $changePercentage,
                'threshold' => $threshold,
                'detected_at' => date('Y-m-d H:i:s')
            ];
        }
        
        return null;
    }
    
    /**
     * 在庫変動チェック
     * 
     * @param array $current 現在のデータ
     * @param array $previous 前回のデータ
     * @param array $rule 監視ルール
     * @return array|null 変動情報
     */
    private function checkStockChange($current, $previous, $rule) {
        $currentStatus = $current['availability_status'];
        $previousStatus = $previous['availability_status'];
        
        if ($currentStatus === $previousStatus) {
            return null;
        }
        
        $changeType = 'status_change';
        
        // 具体的な変動タイプ判定
        if ($previousStatus === 'Out of Stock' && $currentStatus === 'In Stock') {
            $changeType = 'back_in_stock';
        } elseif ($previousStatus === 'In Stock' && $currentStatus === 'Out of Stock') {
            $changeType = 'out_of_stock';
        } elseif ($currentStatus === 'Limited Stock') {
            $changeType = 'low_stock';
        }
        
        return [
            'type' => $changeType,
            'previous_status' => $previousStatus,
            'current_status' => $currentStatus,
            'current_message' => $current['availability_message'],
            'detected_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 評価変動チェック
     * 
     * @param array $current 現在のデータ
     * @param array $previous 前回のデータ
     * @param array $rule 監視ルール
     * @return array|null 変動情報
     */
    private function checkRatingChange($current, $previous, $rule) {
        $currentRating = floatval($current['star_rating']);
        $previousRating = floatval($previous['star_rating']);
        
        $currentReviews = intval($current['review_count']);
        $previousReviews = intval($previous['review_count']);
        
        $ratingChanged = abs($currentRating - $previousRating) >= 0.1;
        $reviewsChanged = ($currentReviews - $previousReviews) >= 5;
        
        if ($ratingChanged || $reviewsChanged) {
            return [
                'rating_change' => $currentRating - $previousRating,
                'reviews_change' => $currentReviews - $previousReviews,
                'previous_rating' => $previousRating,
                'current_rating' => $currentRating,
                'previous_reviews' => $previousReviews,
                'current_reviews' => $currentReviews,
                'detected_at' => date('Y-m-d H:i:s')
            ];
        }
        
        return null;
    }
    
    /**
     * 価格アラート条件判定
     * 
     * @param array $priceChange 価格変動情報
     * @param array $rule 監視ルール
     * @return bool アラート送信要否
     */
    private function shouldTriggerPriceAlert($priceChange, $rule) {
        // 値上がり・値下がりの設定チェック
        if ($priceChange['type'] === 'increase' && !$rule['price_increase_alert']) {
            return false;
        }
        
        if ($priceChange['type'] === 'decrease' && !$rule['price_decrease_alert']) {
            return false;
        }
        
        // 目標価格範囲チェック
        $currentPrice = $priceChange['current_price'];
        
        if ($rule['target_price_max'] && $currentPrice > $rule['target_price_max']) {
            return true; // 上限超過
        }
        
        if ($rule['target_price_min'] && $currentPrice < $rule['target_price_min']) {
            return true; // 目標価格到達
        }
        
        // デフォルト: 閾値超過の場合はアラート
        return true;
    }
    
    /**
     * 在庫アラート条件判定
     * 
     * @param array $stockChange 在庫変動情報
     * @param array $rule 監視ルール
     * @return bool アラート送信要否
     */
    private function shouldTriggerStockAlert($stockChange, $rule) {
        switch ($stockChange['type']) {
            case 'out_of_stock':
                return $rule['stock_out_alert'];
                
            case 'back_in_stock':
                return $rule['stock_in_alert'];
                
            case 'low_stock':
                return true; // 在庫僅少は常にアラート
                
            default:
                return false;
        }
    }
    
    /**
     * アラート送信
     * 
     * @param string $asin ASIN
     * @param string $alertType アラートタイプ
     * @param array $changeData 変動データ
     * @param array $rule 監視ルール
     */
    private function triggerAlert($asin, $alertType, $changeData, $rule) {
        $alertData = $this->buildAlertData($asin, $alertType, $changeData, $rule);
        
        try {
            // メール送信
            if ($this->config['notifications']['email_alerts']['enabled'] && $rule['email_alerts']) {
                $this->sendEmailAlert($alertData);
            }
            
            // Webhook送信
            if (!empty($rule['webhook_url'])) {
                $this->sendWebhookAlert($rule['webhook_url'], $alertData);
            }
            
            // Slack送信
            if ($this->config['notifications']['slack']['enabled'] && !empty($rule['slack_channel'])) {
                $this->sendSlackAlert($rule['slack_channel'], $alertData);
            }
            
            // アラート履歴記録
            $this->recordAlertHistory($asin, $alertType, $alertData);
            
            $this->logMessage("Alert sent for ASIN $asin: $alertType", 'INFO');
            
        } catch (Exception $e) {
            $this->logMessage("Failed to send alert for ASIN $asin: " . $e->getMessage(), 'ERROR');
        }
    }
    
    /**
     * アラートデータ構築
     * 
     * @param string $asin ASIN
     * @param string $alertType アラートタイプ
     * @param array $changeData 変動データ
     * @param array $rule 監視ルール
     * @return array アラートデータ
     */
    private function buildAlertData($asin, $alertType, $changeData, $rule) {
        $productData = $this->getCurrentData($asin);
        
        $alertData = [
            'asin' => $asin,
            'alert_type' => $alertType,
            'product_title' => $productData['title'] ?? 'Unknown Product',
            'current_price' => $productData['current_price'],
            'current_availability' => $productData['availability_status'],
            'change_data' => $changeData,
            'rule_name' => $rule['rule_name'],
            'priority_level' => $rule['priority_level'],
            'timestamp' => date('Y-m-d H:i:s'),
            'marketplace' => $this->monitoringSession['marketplace']
        ];
        
        // アラートタイプ別の追加情報
        switch ($alertType) {
            case 'price_change':
                $alertData['alert_title'] = $changeData['type'] === 'increase' ? 
                    '価格上昇アラート' : '価格下降アラート';
                $alertData['alert_message'] = sprintf(
                    '価格が %.2f%% %sしました (%.2f → %.2f)',
                    abs($changeData['change_percentage']),
                    $changeData['type'] === 'increase' ? '上昇' : '下降',
                    $changeData['previous_price'],
                    $changeData['current_price']
                );
                break;
                
            case 'stock_change':
                $stockMessages = [
                    'out_of_stock' => '在庫切れアラート',
                    'back_in_stock' => '在庫復活アラート',
                    'low_stock' => '在庫僅少アラート'
                ];
                $alertData['alert_title'] = $stockMessages[$changeData['type']] ?? '在庫変動アラート';
                $alertData['alert_message'] = sprintf(
                    '在庫状況が変更されました (%s → %s)',
                    $changeData['previous_status'],
                    $changeData['current_status']
                );
                break;
        }
        
        return $alertData;
    }
    
    /**
     * 現在データ取得
     * 
     * @param string $asin ASIN
     * @return array|null 現在データ
     */
    private function getCurrentData($asin) {
        $sql = "SELECT * FROM amazon_research_data WHERE asin = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    
    /**
     * 前回データ取得
     * 
     * @param string $asin ASIN
     * @return array|null 前回データ
     */
    private function getPreviousData($asin) {
        // 価格履歴から前回価格取得
        $sql = "SELECT * FROM amazon_price_history 
                WHERE asin = ? AND recorded_at < (
                    SELECT MAX(recorded_at) FROM amazon_price_history WHERE asin = ?
                )
                ORDER BY recorded_at DESC LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin, $asin]);
        $priceHistory = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 在庫履歴から前回在庫取得
        $sql = "SELECT * FROM amazon_stock_history 
                WHERE asin = ? AND recorded_at < (
                    SELECT MAX(recorded_at) FROM amazon_stock_history WHERE asin = ?
                )
                ORDER BY recorded_at DESC LIMIT 1";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin, $asin]);
        $stockHistory = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$priceHistory && !$stockHistory) {
            return null;
        }
        
        // 過去データ構築
        return [
            'current_price' => $priceHistory['previous_price'] ?? 0,
            'availability_status' => $stockHistory['previous_status'] ?? 'Unknown',
            'star_rating' => 0, // 履歴未実装
            'review_count' => 0 // 履歴未実装
        ];
    }
    
    /**
     * 次回チェック時間更新
     * 
     * @param array $monitoringRules 監視ルール配列
     */
    private function updateNextCheckTimes($monitoringRules) {
        foreach ($monitoringRules as $rule) {
            $nextCheckAt = date('Y-m-d H:i:s', time() + ($rule['check_frequency_minutes'] * 60));
            
            $sql = "UPDATE amazon_monitoring_rules 
                    SET last_checked_at = NOW(), next_check_at = ? 
                    WHERE id = ?";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$nextCheckAt, $rule['id']]);
        }
    }
    
    /**
     * セッション統計更新
     * 
     * @param array $results 処理結果
     */
    private function updateSessionStats($results) {
        $totalChanges = 0;
        $totalAlerts = 0;
        
        foreach ($results as $priorityResults) {
            $totalChanges += $priorityResults['changes_detected'] ?? 0;
            $totalAlerts += $priorityResults['alerts_sent'] ?? 0;
        }
        
        $this->monitoringSession['changes_detected'] = $totalChanges;
        $this->monitoringSession['processing_time'] = round(microtime(true) - $this->monitoringSession['start_time'], 2);
    }
    
    /**
     * サマリーレポート生成
     * 
     * @param array $results 処理結果
     * @return array サマリー
     */
    private function generateSummaryReport($results) {
        $summary = [
            'session_id' => $this->monitoringSession['session_id'],
            'processing_time' => $this->monitoringSession['processing_time'],
            'total_rules_processed' => 0,
            'total_changes_detected' => 0,
            'total_alerts_sent' => 0,
            'total_errors' => $this->monitoringSession['error_count'],
            'priority_breakdown' => []
        ];
        
        foreach ($results as $priority => $priorityResults) {
            $summary['total_rules_processed'] += $priorityResults['processed'] ?? 0;
            $summary['total_changes_detected'] += $priorityResults['changes_detected'] ?? 0;
            $summary['total_alerts_sent'] += $priorityResults['alerts_sent'] ?? 0;
            
            $summary['priority_breakdown'][$priority] = [
                'processed' => $priorityResults['processed'] ?? 0,
                'changes' => $priorityResults['changes_detected'] ?? 0,
                'alerts' => $priorityResults['alerts_sent'] ?? 0,
                'errors' => $priorityResults['errors'] ?? 0
            ];
        }
        
        $summary['success_rate'] = $summary['total_rules_processed'] > 0 ? 
            (($summary['total_rules_processed'] - $summary['total_errors']) / $summary['total_rules_processed']) * 100 : 0;
        
        return $summary;
    }
    
    /**
     * アラート履歴記録
     * 
     * @param string $asin ASIN
     * @param string $alertType アラートタイプ
     * @param array $alertData アラートデータ
     */
    private function recordAlertHistory($asin, $alertType, $alertData) {
        $sql = "INSERT INTO amazon_alert_history 
                (asin, alert_type, alert_data, sent_at) 
                VALUES (?, ?, ?, NOW())";
        
        // テーブルが存在しない場合のため、エラーハンドリング付きで実行
        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin, $alertType, json_encode($alertData)]);
        } catch (PDOException $e) {
            // テーブル未作成の場合はログのみ
            $this->logMessage("Alert history table not found, logging to file: $asin - $alertType", 'WARNING');
            
            $logEntry = date('Y-m-d H:i:s') . " | $asin | $alertType | " . json_encode($alertData) . "\n";
            file_put_contents(__DIR__ . '/../logs/amazon_alerts.log', $logEntry, FILE_APPEND);
        }
    }
    
    /**
     * メールアラート送信
     * 
     * @param array $alertData アラートデータ
     */
    private function sendEmailAlert($alertData) {
        if (!function_exists('sendEmail')) {
            throw new Exception("sendEmail function not available");
        }
        
        $subject = "[Amazon Monitor] {$alertData['alert_title']} - {$alertData['asin']}";
        
        $body = "商品: {$alertData['product_title']}\n";
        $body .= "ASIN: {$alertData['asin']}\n";
        $body .= "アラート: {$alertData['alert_message']}\n";
        $body .= "現在価格: {$alertData['current_price']}\n";
        $body .= "在庫状況: {$alertData['current_availability']}\n";
        $body .= "優先度: {$alertData['priority_level']}\n";
        $body .= "検知時刻: {$alertData['timestamp']}\n";
        
        $emails = $this->config['notifications']['email_alerts']['to_emails'];
        foreach ($emails as $email) {
            sendEmail($email, $subject, $body);
        }
    }
    
    /**
     * Webhookアラート送信
     * 
     * @param string $url WebhookURL
     * @param array $alertData アラートデータ
     */
    private function sendWebhookAlert($url, $alertData) {
        $payload = json_encode($alertData);
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: Amazon-Monitor-Webhook/1.0'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Webhook failed with HTTP $httpCode: $response");
        }
    }
    
    /**
     * Slackアラート送信
     * 
     * @param string $channel チャンネル
     * @param array $alertData アラートデータ
     */
    private function sendSlackAlert($channel, $alertData) {
        $webhookUrl = $this->config['notifications']['slack']['webhook_url'];
        
        if (empty($webhookUrl)) {
            throw new Exception("Slack webhook URL not configured");
        }
        
        $color = $this->getSlackAlertColor($alertData['alert_type']);
        
        $attachment = [
            'color' => $color,
            'title' => $alertData['alert_title'],
            'text' => $alertData['alert_message'],
            'fields' => [
                ['title' => 'ASIN', 'value' => $alertData['asin'], 'short' => true],
                ['title' => '商品名', 'value' => $alertData['product_title'], 'short' => false],
                ['title' => '現在価格', 'value' => '$' . $alertData['current_price'], 'short' => true],
                ['title' => '在庫状況', 'value' => $alertData['current_availability'], 'short' => true],
                ['title' => '優先度', 'value' => $alertData['priority_level'], 'short' => true],
                ['title' => '検知時刻', 'value' => $alertData['timestamp'], 'short' => true]
            ],
            'ts' => time()
        ];
        
        $payload = [
            'channel' => $channel,
            'username' => $this->config['notifications']['slack']['username'],
            'attachments' => [$attachment]
        ];
        
        $ch = curl_init($webhookUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception("Slack webhook failed with HTTP $httpCode: $response");
        }
    }
    
    /**
     * Slackアラート色取得
     * 
     * @param string $alertType アラートタイプ
     * @return string 色コード
     */
    private function getSlackAlertColor($alertType) {
        $colors = [
            'price_change' => '#ff9900', // Amazon orange
            'stock_change' => '#36a64f', // Green
            'out_of_stock' => '#ff0000', // Red
            'back_in_stock' => '#00ff00', // Bright green
            'low_stock' => '#ffaa00'     // Yellow-orange
        ];
        
        return $colors[$alertType] ?? '#cccccc';
    }
    
    /**
     * 手動監視実行（特定ASIN）
     * 
     * @param array $asins ASIN配列
     * @param array $options 監視オプション
     * @return array 監視結果
     */
    public function runManualMonitoring($asins, $options = []) {
        $defaultOptions = [
            'force_update' => true,
            'send_alerts' => false,
            'priority_override' => 'high'
        ];
        
        $options = array_merge($defaultOptions, $options);
        
        $this->logMessage("Starting manual monitoring for ASINs: " . implode(', ', $asins), 'INFO');
        
        $results = [];
        
        foreach ($asins as $asin) {
            try {
                // データ更新
                $processingResult = $this->dataProcessor->processAsinList([$asin], [
                    'resource_set' => 'complete',
                    'force_update' => $options['force_update'],
                    'save_to_db' => true,
                    'track_changes' => true
                ]);
                
                // 監視ルール取得（なければデフォルト作成）
                $rule = $this->getOrCreateMonitoringRule($asin, $options['priority_override']);
                
                // 変動チェック
                $changeResult = $this->checkAndProcessChanges($rule);
                
                $results[$asin] = [
                    'processing_success' => $processingResult['success'],
                    'change_result' => $changeResult,
                    'current_data' => $this->getCurrentData($asin)
                ];
                
            } catch (Exception $e) {
                $results[$asin] = [
                    'error' => $e->getMessage(),
                    'processing_success' => false
                ];
                
                $this->logMessage("Manual monitoring failed for ASIN $asin: " . $e->getMessage(), 'ERROR');
            }
        }
        
        return [
            'success' => true,
            'results' => $results,
            'summary' => [
                'total_asins' => count($asins),
                'successful' => count(array_filter($results, function($r) { return $r['processing_success'] ?? false; })),
                'failed' => count(array_filter($results, function($r) { return !($r['processing_success'] ?? true); }))
            ]
        ];
    }
    
    /**
     * 監視ルール取得・作成
     * 
     * @param string $asin ASIN
     * @param string $priority 優先度
     * @return array 監視ルール
     */
    private function getOrCreateMonitoringRule($asin, $priority = 'normal') {
        $sql = "SELECT * FROM amazon_monitoring_rules WHERE asin = ? LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        $rule = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($rule) {
            return $rule;
        }
        
        // デフォルトルール作成
        $checkFrequency = $this->getCheckFrequencyByPriority($priority);
        
        $sql = "INSERT INTO amazon_monitoring_rules 
                (asin, rule_name, priority_level, check_frequency_minutes, 
                 monitor_price, monitor_stock, price_change_threshold_percent,
                 stock_out_alert, stock_in_alert, email_alerts, is_active, 
                 created_at, updated_at) 
                VALUES (?, ?, ?, ?, true, true, 5.0, true, true, false, true, NOW(), NOW())";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            $asin,
            "Auto-generated rule for $asin",
            $priority,
            $checkFrequency
        ]);
        
        // 作成したルールを取得
        return $this->getOrCreateMonitoringRule($asin, $priority);
    }
    
    /**
     * 優先度による監視頻度取得
     * 
     * @param string $priority 優先度
     * @return int 監視頻度（分）
     */
    private function getCheckFrequencyByPriority($priority) {
        $frequencies = [
            'high' => 30,    // 30分
            'normal' => 120, // 2時間
            'low' => 1440    // 24時間
        ];
        
        return $frequencies[$priority] ?? $frequencies['normal'];
    }
    
    /**
     * 監視統計取得
     * 
     * @param string $period 期間 ('today', 'week', 'month')
     * @return array 統計情報
     */
    public function getMonitoringStats($period = 'today') {
        $dateFilter = $this->getDateFilter($period);
        
        // 基本統計
        $sql = "SELECT 
                    COUNT(DISTINCT asin) as monitored_products,
                    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_rules,
                    SUM(CASE WHEN priority_level = 'high' THEN 1 ELSE 0 END) as high_priority,
                    SUM(CASE WHEN priority_level = 'normal' THEN 1 ELSE 0 END) as normal_priority,
                    SUM(CASE WHEN priority_level = 'low' THEN 1 ELSE 0 END) as low_priority
                FROM amazon_monitoring_rules";
        
        $stmt = $this->db->query($sql);
        $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 価格変動統計
        $sql = "SELECT 
                    COUNT(*) as price_changes,
                    AVG(ABS(change_percentage)) as avg_change_percent,
                    MIN(change_percentage) as max_decrease,
                    MAX(change_percentage) as max_increase
                FROM amazon_price_history 
                WHERE recorded_at >= $dateFilter";
        
        $stmt = $this->db->query($sql);
        $priceStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 在庫変動統計
        $sql = "SELECT 
                    COUNT(*) as stock_changes,
                    SUM(CASE WHEN out_of_stock = true THEN 1 ELSE 0 END) as out_of_stock_count,
                    SUM(CASE WHEN back_in_stock = true THEN 1 ELSE 0 END) as back_in_stock_count
                FROM amazon_stock_history 
                WHERE recorded_at >= $dateFilter";
        
        $stmt = $this->db->query($sql);
        $stockStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // API使用統計
        $sql = "SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful_requests,
                    AVG(response_time_ms) as avg_response_time,
                    SUM(items_returned) as total_items_retrieved
                FROM amazon_api_requests 
                WHERE requested_at >= $dateFilter";
        
        $stmt = $this->db->query($sql);
        $apiStats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'period' => $period,
            'basic_stats' => $basicStats,
            'price_stats' => $priceStats,
            'stock_stats' => $stockStats,
            'api_stats' => $apiStats,
            'generated_at' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 日付フィルター取得
     * 
     * @param string $period 期間
     * @return string SQL日付フィルター
     */
    private function getDateFilter($period) {
        switch ($period) {
            case 'today':
                return "DATE(NOW())";
            case 'week':
                return "NOW() - INTERVAL '7 days'";
            case 'month':
                return "NOW() - INTERVAL '30 days'";
            default:
                return "DATE(NOW())";
        }
    }
    
    /**
     * 監視ルール一括更新
     * 
     * @param array $updates 更新データ配列
     * @return array 更新結果
     */
    public function bulkUpdateMonitoringRules($updates) {
        $results = [
            'updated' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        $this->db->beginTransaction();
        
        try {
            foreach ($updates as $update) {
                $asin = $update['asin'] ?? null;
                unset($update['asin']);
                
                if (!$asin) {
                    $results['failed']++;
                    $results['errors'][] = 'Missing ASIN in update data';
                    continue;
                }
                
                $setClause = [];
                $params = [];
                
                foreach ($update as $field => $value) {
                    $setClause[] = "$field = ?";
                    $params[] = $value;
                }
                
                if (empty($setClause)) {
                    continue;
                }
                
                $params[] = $asin; // WHERE句用
                
                $sql = "UPDATE amazon_monitoring_rules 
                        SET " . implode(', ', $setClause) . ", updated_at = NOW() 
                        WHERE asin = ?";
                
                $stmt = $this->db->prepare($sql);
                $success = $stmt->execute($params);
                
                if ($success && $stmt->rowCount() > 0) {
                    $results['updated']++;
                } else {
                    $results['failed']++;
                    $results['errors'][] = "No rule found or no changes for ASIN: $asin";
                }
            }
            
            $this->db->commit();
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
        
        $this->logMessage("Bulk update completed: {$results['updated']} updated, {$results['failed']} failed", 'INFO');
        
        return $results;
    }
    
    /**
     * 停止中のルール再開
     * 
     * @param array $asins 対象ASIN配列（空の場合は全て）
     * @return array 再開結果
     */
    public function resumeMonitoring($asins = []) {
        $whereClause = "is_active = false";
        $params = [];
        
        if (!empty($asins)) {
            $placeholders = implode(',', array_fill(0, count($asins), '?'));
            $whereClause .= " AND asin IN ($placeholders)";
            $params = $asins;
        }
        
        $sql = "UPDATE amazon_monitoring_rules 
                SET is_active = true, next_check_at = NOW() + INTERVAL check_frequency_minutes MINUTE, updated_at = NOW() 
                WHERE $whereClause";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        
        $resumedCount = $stmt->rowCount();
        
        $this->logMessage("Resumed monitoring for $resumedCount rules", 'INFO');
        
        return [
            'success' => true,
            'resumed_count' => $resumedCount,
            'message' => "Resumed monitoring for $resumedCount rules"
        ];
    }
    
    /**
     * 監視一時停止
     * 
     * @param array $asins 対象ASIN配列
     * @param string $reason 停止理由
     * @return array 停止結果
     */
    public function pauseMonitoring($asins, $reason = 'Manual pause') {
        if (empty($asins)) {
            return ['success' => false, 'message' => 'No ASINs provided'];
        }
        
        $placeholders = implode(',', array_fill(0, count($asins), '?'));
        
        $sql = "UPDATE amazon_monitoring_rules 
                SET is_active = false, updated_at = NOW() 
                WHERE asin IN ($placeholders)";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($asins);
        
        $pausedCount = $stmt->rowCount();
        
        $this->logMessage("Paused monitoring for $pausedCount rules. Reason: $reason", 'INFO');
        
        return [
            'success' => true,
            'paused_count' => $pausedCount,
            'message' => "Paused monitoring for $pausedCount rules",
            'reason' => $reason
        ];
    }
    
    /**
     * 古いデータクリーンアップ
     * 
     * @param int $daysToKeep 保持日数
     * @return array クリーンアップ結果
     */
    public function cleanupOldData($daysToKeep = 30) {
        $results = [
            'price_history_deleted' => 0,
            'stock_history_deleted' => 0,
            'api_requests_deleted' => 0
        ];
        
        $this->db->beginTransaction();
        
        try {
            // 価格履歴クリーンアップ
            $sql = "DELETE FROM amazon_price_history WHERE recorded_at < NOW() - INTERVAL '$daysToKeep days'";
            $stmt = $this->db->query($sql);
            $results['price_history_deleted'] = $stmt->rowCount();
            
            // 在庫履歴クリーンアップ
            $sql = "DELETE FROM amazon_stock_history WHERE recorded_at < NOW() - INTERVAL '$daysToKeep days'";
            $stmt = $this->db->query($sql);
            $results['stock_history_deleted'] = $stmt->rowCount();
            
            // APIリクエスト履歴クリーンアップ
            $sql = "DELETE FROM amazon_api_requests WHERE requested_at < NOW() - INTERVAL '$daysToKeep days'";
            $stmt = $this->db->query($sql);
            $results['api_requests_deleted'] = $stmt->rowCount();
            
            $this->db->commit();
            
            $totalDeleted = array_sum($results);
            $this->logMessage("Cleanup completed: $totalDeleted records deleted (keeping $daysToKeep days)", 'INFO');
            
        } catch (Exception $e) {
            $this->db->rollback();
            throw $e;
        }
        
        return $results;
    }
    
    /**
     * ヘルスチェック実行
     * 
     * @return array ヘルスチェック結果
     */
    public function healthCheck() {
        $health = [
            'overall_status' => 'healthy',
            'checks' => [],
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        try {
            // データベース接続チェック
            $this->db->query("SELECT 1");
            $health['checks']['database'] = ['status' => 'ok', 'message' => 'Database connection successful'];
        } catch (Exception $e) {
            $health['checks']['database'] = ['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()];
            $health['overall_status'] = 'unhealthy';
        }
        
        try {
            // アクティブルール数チェック
            $sql = "SELECT COUNT(*) FROM amazon_monitoring_rules WHERE is_active = true";
            $activeRules = $this->db->query($sql)->fetchColumn();
            $health['checks']['active_rules'] = ['status' => 'ok', 'count' => $activeRules];
        } catch (Exception $e) {
            $health['checks']['active_rules'] = ['status' => 'error', 'message' => $e->getMessage()];
        }
        
        try {
            // 最近のAPI成功率チェック
            $sql = "SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful
                    FROM amazon_api_requests 
                    WHERE requested_at > NOW() - INTERVAL '1 hour'";
            
            $stmt = $this->db->query($sql);
            $apiStats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $successRate = $apiStats['total'] > 0 ? ($apiStats['successful'] / $apiStats['total']) * 100 : 0;
            
            if ($successRate >= 90) {
                $health['checks']['api_success_rate'] = ['status' => 'ok', 'rate' => $successRate];
            } else {
                $health['checks']['api_success_rate'] = ['status' => 'warning', 'rate' => $successRate];
                if ($health['overall_status'] !== 'unhealthy') {
                    $health['overall_status'] = 'warning';
                }
            }
        } catch (Exception $e) {
            $health['checks']['api_success_rate'] = ['status' => 'error', 'message' => $e->getMessage()];
        }
        
        try {
            // 保留中のキューチェック
            $sql = "SELECT COUNT(*) FROM amazon_asin_queue WHERE status = 'pending'";
            $pendingCount = $this->db->query($sql)->fetchColumn();
            
            if ($pendingCount < 100) {
                $health['checks']['queue_size'] = ['status' => 'ok', 'pending' => $pendingCount];
            } else {
                $health['checks']['queue_size'] = ['status' => 'warning', 'pending' => $pendingCount];
                if ($health['overall_status'] !== 'unhealthy') {
                    $health['overall_status'] = 'warning';
                }
            }
        } catch (Exception $e) {
            $health['checks']['queue_size'] = ['status' => 'error', 'message' => $e->getMessage()];
        }
        
        return $health;
    }
    
    /**
     * ログメッセージ出力
     * 
     * @param string $message メッセージ
     * @param string $level ログレベル
     */
    private function logMessage($message, $level = 'INFO') {
        if (function_exists('logSystemMessage')) {
            logSystemMessage($message, $level);
        } else {
            error_log("[$level] AmazonStockMonitor: $message");
        }
    }
}

?>