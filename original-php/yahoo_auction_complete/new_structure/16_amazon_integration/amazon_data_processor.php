<?php
/**
 * Amazon データ取得・処理・保存システム
 * new_structure/02_scraping/amazon/AmazonDataProcessor.php
 * 
 * PA-APIから取得したデータの変換・検証・データベース保存を処理
 */

require_once __DIR__ . '/AmazonApiClient.php';
require_once __DIR__ . '/../../shared/core/database_manager.php';
require_once __DIR__ . '/../../shared/core/common_functions.php';

class AmazonDataProcessor {
    
    private $apiClient;
    private $db;
    private $config;
    private $processedCount = 0;
    private $errorCount = 0;
    private $startTime;
    
    /**
     * コンストラクタ
     * 
     * @param string $marketplace マーケットプレイス
     */
    public function __construct($marketplace = 'US') {
        $this->apiClient = new AmazonApiClient($marketplace);
        $this->db = getDatabaseConnection();
        $this->config = require __DIR__ . '/../../shared/config/amazon_api.php';
        $this->startTime = microtime(true);
        
        if (!$this->db) {
            throw new Exception("Database connection failed");
        }
        
        $this->logMessage("Amazon Data Processor initialized for marketplace: $marketplace", 'INFO');
    }
    
    /**
     * ASINリストの一括処理（メイン処理関数）
     * 
     * @param array $asins ASIN配列
     * @param array $options 処理オプション
     * @return array 処理結果
     */
    public function processAsinList(array $asins, array $options = []) {
        if (empty($asins)) {
            return ['success' => false, 'message' => 'ASIN list is empty'];
        }
        
        // オプションのデフォルト値
        $defaultOptions = [
            'resource_set' => 'optimized',
            'force_update' => false,
            'batch_size' => 10,
            'save_to_db' => true,
            'track_changes' => true,
            'update_monitoring' => true,
            'priority_level' => 'normal'
        ];
        
        $options = array_merge($defaultOptions, $options);
        
        // ASIN重複除去・検証
        $asins = array_unique($asins);
        $validAsins = $this->validateAndFilterAsins($asins, $options['force_update']);
        
        if (empty($validAsins)) {
            return [
                'success' => true,
                'message' => 'No ASINs require processing',
                'stats' => $this->getProcessingStats()
            ];
        }
        
        $this->logMessage("Starting processing of " . count($validAsins) . " ASINs", 'INFO');
        
        // 進捗コールバック設定
        $progressCallback = function($progress) {
            $this->logMessage(
                "Batch {$progress['current_batch']}/{$progress['total_batches']} - " .
                "Items: {$progress['processed_items']}/{$progress['total_items']} - " .
                "Success Rate: " . round($progress['success_rate'], 2) . "%", 
                'INFO'
            );
        };
        
        try {
            // API経由でデータ取得
            $apiResults = $this->apiClient->getItemsLargeBatch(
                $validAsins, 
                $options['resource_set'], 
                $progressCallback
            );
            
            $processedItems = [];
            $errors = [];
            
            if (!empty($apiResults['items'])) {
                // 各アイテムの処理・保存
                foreach ($apiResults['items'] as $itemData) {
                    try {
                        $processed = $this->processAndSaveItem($itemData, $options);
                        if ($processed) {
                            $processedItems[] = $processed;
                            $this->processedCount++;
                        }
                    } catch (Exception $e) {
                        $this->errorCount++;
                        $errors[] = [
                            'asin' => $itemData['asin'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ];
                        $this->logMessage("Error processing ASIN {$itemData['asin']}: " . $e->getMessage(), 'ERROR');
                    }
                }
            }
            
            // 処理結果サマリー
            $result = [
                'success' => true,
                'stats' => [
                    'total_requested' => count($asins),
                    'total_processed' => $this->processedCount,
                    'api_retrieved' => $apiResults['total_retrieved'],
                    'errors' => $this->errorCount,
                    'success_rate' => count($asins) > 0 ? ($this->processedCount / count($asins)) * 100 : 0,
                    'processing_time' => round(microtime(true) - $this->startTime, 2)
                ],
                'items' => $processedItems,
                'errors' => $errors
            ];
            
            $this->logMessage("Processing completed. Stats: " . json_encode($result['stats']), 'INFO');
            
            return $result;
            
        } catch (Exception $e) {
            $this->logMessage("Processing failed: " . $e->getMessage(), 'ERROR');
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'stats' => $this->getProcessingStats()
            ];
        }
    }
    
    /**
     * 個別商品データの処理・保存
     * 
     * @param array $itemData API取得データ
     * @param array $options 処理オプション
     * @return array|null 処理済みデータ
     */
    private function processAndSaveItem($itemData, $options) {
        if (empty($itemData['asin'])) {
            throw new InvalidArgumentException('ASIN is required');
        }
        
        $asin = $itemData['asin'];
        
        // データベース保存用に変換
        $dbData = $this->convertToDbFormat($itemData);
        
        if ($options['save_to_db']) {
            // 既存データ確認
            $existingData = $this->getExistingData($asin);
            
            if ($existingData && $options['track_changes']) {
                // 変更検知・履歴記録
                $changes = $this->detectChanges($existingData, $dbData);
                if (!empty($changes)) {
                    $this->recordChanges($asin, $changes);
                }
            }
            
            // データ保存（UPSERT）
            $saved = $this->saveToDatabase($dbData, $existingData !== null);
            
            if (!$saved) {
                throw new Exception("Failed to save data to database");
            }
            
            // 監視設定更新
            if ($options['update_monitoring']) {
                $this->updateMonitoringSettings($asin, $options['priority_level']);
            }
        }
        
        return $dbData;
    }
    
    /**
     * APIデータをデータベース形式に変換
     * 
     * @param array $itemData API取得データ
     * @return array データベース用データ
     */
    private function convertToDbFormat($itemData) {
        $dbData = [
            // 基本情報
            'asin' => $itemData['asin'],
            'title' => $this->cleanText($itemData['title'] ?? ''),
            'brand' => $this->cleanText($itemData['brand'] ?? ''),
            'manufacturer' => $this->cleanText($itemData['manufacturer'] ?? ''),
            'product_group' => $itemData['product_group'] ?? '',
            'binding' => $itemData['binding'] ?? '',
            
            // 価格情報
            'current_price' => $this->extractPrice($itemData['price_info'] ?? []),
            'currency' => $itemData['price_info']['currency'] ?? 'USD',
            'savings_amount' => $itemData['price_info']['savings'] ?? null,
            'savings_percentage' => $itemData['price_info']['savings_percentage'] ?? null,
            
            // 在庫情報
            'availability_status' => $this->normalizeAvailabilityStatus($itemData['availability']['message'] ?? ''),
            'availability_message' => $itemData['availability']['message'] ?? '',
            'max_order_quantity' => $itemData['availability']['max_order_quantity'] ?? null,
            'min_order_quantity' => $itemData['availability']['min_order_quantity'] ?? 1,
            
            // プライム・配送情報
            'is_prime_eligible' => $itemData['price_info']['is_prime_eligible'] ?? false,
            'is_free_shipping_eligible' => $itemData['price_info']['is_free_shipping'] ?? false,
            'is_amazon_fulfilled' => $itemData['price_info']['is_amazon_fulfilled'] ?? false,
            'shipping_charges' => null, // API v5では直接取得不可
            
            // レビュー・評価
            'review_count' => $itemData['reviews']['count'] ?? 0,
            'star_rating' => $itemData['reviews']['star_rating'] ?? null,
            
            // JSON格納データ
            'sales_rank' => json_encode($itemData['sales_rank'] ?? []),
            'category_ranks' => json_encode($itemData['categories'] ?? []),
            'images_primary' => json_encode($itemData['images']['primary'] ?? []),
            'images_variants' => json_encode($itemData['images']['variants'] ?? []),
            'features' => json_encode($itemData['features'] ?? []),
            'product_dimensions' => json_encode($this->extractDimensions($itemData)),
            'item_specifics' => json_encode($itemData['specifications'] ?? []),
            'technical_details' => json_encode([]), // 技術詳細は別途処理が必要
            'browse_nodes' => json_encode($itemData['categories'] ?? []),
            
            // 関連商品情報
            'parent_asin' => $itemData['parent_asin'] ?? null,
            'variation_summary' => json_encode($itemData['variation_summary'] ?? []),
            
            // 外部ID
            'external_ids' => json_encode($itemData['specifications'] ?? []),
            
            // メーカー・販売者情報（今後拡張予定）
            'merchant_info' => json_encode([]),
            'promotions' => json_encode([]),
            
            // システム情報
            'last_api_update_at' => date('Y-m-d H:i:s'),
            'api_version' => $itemData['api_version'] ?? '5.0',
            'marketplace' => $itemData['marketplace'] ?? 'US',
            'data_source' => 'PA-API',
            
            // データ品質スコア計算
            'data_completeness_score' => $this->calculateCompletenessScore($itemData),
            
            // 処理情報
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        // 価格履歴用のmin/max設定
        if ($dbData['current_price']) {
            $dbData['price_min'] = $dbData['current_price'];
            $dbData['price_max'] = $dbData['current_price'];
        }
        
        return $dbData;
    }
    
    /**
     * データベースへの保存（UPSERT処理）
     * 
     * @param array $data 保存データ
     * @param bool $isUpdate 更新モードかどうか
     * @return bool 成功可否
     */
    private function saveToDatabase($data, $isUpdate = false) {
        try {
            $this->db->beginTransaction();
            
            if ($isUpdate) {
                $result = $this->updateExistingRecord($data);
            } else {
                $result = $this->insertNewRecord($data);
            }
            
            // 価格履歴記録
            if ($data['current_price']) {
                $this->recordPriceHistory($data['asin'], $data['current_price'], $data['currency']);
            }
            
            // 在庫履歴記録
            $this->recordStockHistory($data['asin'], $data['availability_status'], $data['availability_message']);
            
            $this->db->commit();
            return $result;
            
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Database save failed for ASIN {$data['asin']}: " . $e->getMessage(), 'ERROR');
            throw $e;
        }
    }
    
    /**
     * 新規レコード挿入
     * 
     * @param array $data データ
     * @return bool 成功可否
     */
    private function insertNewRecord($data) {
        $columns = array_keys($data);
        $placeholders = ':' . implode(', :', $columns);
        
        $sql = "INSERT INTO amazon_research_data (" . implode(', ', $columns) . ") 
                VALUES ($placeholders)";
        
        $stmt = $this->db->prepare($sql);
        
        foreach ($data as $column => $value) {
            $stmt->bindValue(":$column", $value);
        }
        
        return $stmt->execute();
    }
    
    /**
     * 既存レコード更新
     * 
     * @param array $data データ
     * @return bool 成功可否
     */
    private function updateExistingRecord($data) {
        $asin = $data['asin'];
        unset($data['asin']); // WHERE句で使用するため除外
        
        // 価格のmin/max更新処理
        $priceUpdateSql = "";
        if (isset($data['current_price']) && $data['current_price']) {
            $priceUpdateSql = ", 
                price_min = LEAST(COALESCE(price_min, :current_price_min), :current_price_min),
                price_max = GREATEST(COALESCE(price_max, :current_price_max), :current_price_max),
                price_fluctuation_count = price_fluctuation_count + 
                    CASE WHEN ABS(COALESCE(current_price, 0) - :current_price_compare) / 
                         GREATEST(COALESCE(current_price, 0.01), 0.01) > 0.05 THEN 1 ELSE 0 END";
        }
        
        $setClause = [];
        foreach ($data as $column => $value) {
            $setClause[] = "$column = :$column";
        }
        
        $sql = "UPDATE amazon_research_data 
                SET " . implode(', ', $setClause) . $priceUpdateSql . "
                WHERE asin = :asin";
        
        $stmt = $this->db->prepare($sql);
        
        // 基本データバインド
        foreach ($data as $column => $value) {
            $stmt->bindValue(":$column", $value);
        }
        
        // 価格比較用バインド
        if (isset($data['current_price']) && $data['current_price']) {
            $stmt->bindValue(':current_price_min', $data['current_price']);
            $stmt->bindValue(':current_price_max', $data['current_price']);
            $stmt->bindValue(':current_price_compare', $data['current_price']);
        }
        
        $stmt->bindValue(':asin', $asin);
        
        return $stmt->execute();
    }
    
    /**
     * 価格履歴記録
     * 
     * @param string $asin ASIN
     * @param float $price 価格
     * @param string $currency 通貨
     */
    private function recordPriceHistory($asin, $price, $currency) {
        // 最新価格と比較
        $sql = "SELECT current_price FROM amazon_research_data WHERE asin = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        $lastPrice = $stmt->fetchColumn();
        
        // 価格変動がある場合のみ記録
        if ($lastPrice === false || abs($lastPrice - $price) / max($lastPrice, 0.01) > 0.01) { // 1%以上の変動
            $changeAmount = $lastPrice ? ($price - $lastPrice) : 0;
            $changePercentage = $lastPrice ? (($price - $lastPrice) / $lastPrice) * 100 : 0;
            
            $sql = "INSERT INTO amazon_price_history 
                    (asin, price, currency, previous_price, change_amount, change_percentage, recorded_at) 
                    VALUES (?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin, $price, $currency, $lastPrice, $changeAmount, $changePercentage]);
            
            $this->logMessage("Price change recorded for ASIN $asin: $lastPrice -> $price ({$changePercentage}%)", 'INFO');
        }
    }
    
    /**
     * 在庫履歴記録
     * 
     * @param string $asin ASIN
     * @param string $status 在庫状況
     * @param string $message 在庫メッセージ
     */
    private function recordStockHistory($asin, $status, $message) {
        // 最新在庫状況と比較
        $sql = "SELECT availability_status FROM amazon_research_data WHERE asin = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        $lastStatus = $stmt->fetchColumn();
        
        // 在庫状況変更がある場合のみ記録
        if ($lastStatus !== $status) {
            $statusChanged = true;
            $backInStock = ($lastStatus === 'Out of Stock' && $status === 'In Stock');
            $outOfStock = ($lastStatus === 'In Stock' && $status === 'Out of Stock');
            
            $sql = "INSERT INTO amazon_stock_history 
                    (asin, availability_status, availability_message, previous_status, 
                     status_changed, back_in_stock, out_of_stock, recorded_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$asin, $status, $message, $lastStatus, $statusChanged, $backInStock, $outOfStock]);
            
            $this->logMessage("Stock change recorded for ASIN $asin: $lastStatus -> $status", 'INFO');
            
            // 在庫切れアラート
            if ($outOfStock) {
                $this->triggerStockAlert($asin, 'out_of_stock');
            }
            // 在庫復活アラート
            if ($backInStock) {
                $this->triggerStockAlert($asin, 'back_in_stock');
            }
        }
    }
    
    /**
     * 在庫アラート送信
     * 
     * @param string $asin ASIN
     * @param string $alertType アラートタイプ
     */
    private function triggerStockAlert($asin, $alertType) {
        // 監視ルールチェック
        $sql = "SELECT * FROM amazon_monitoring_rules WHERE asin = ? AND is_active = true";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        $monitoringRule = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$monitoringRule) {
            return; // 監視対象でない
        }
        
        // アラート条件チェック
        if ($alertType === 'out_of_stock' && !$monitoringRule['stock_out_alert']) {
            return;
        }
        if ($alertType === 'back_in_stock' && !$monitoringRule['stock_in_alert']) {
            return;
        }
        
        // アラート送信（メール・Webhook等）
        $this->sendAlert($asin, $alertType, $monitoringRule);
    }
    
    /**
     * アラート送信処理
     * 
     * @param string $asin ASIN
     * @param string $alertType アラートタイプ
     * @param array $monitoringRule 監視ルール
     */
    private function sendAlert($asin, $alertType, $monitoringRule) {
        $message = $this->buildAlertMessage($asin, $alertType);
        
        // メールアラート
        if ($this->config['notifications']['email_alerts']['enabled'] && $monitoringRule['email_alerts']) {
            $this->sendEmailAlert($message);
        }
        
        // Webhookアラート
        if ($this->config['notifications']['webhook']['enabled'] && !empty($monitoringRule['webhook_url'])) {
            $this->sendWebhookAlert($monitoringRule['webhook_url'], $message);
        }
        
        // Slackアラート
        if ($this->config['notifications']['slack']['enabled'] && !empty($monitoringRule['slack_channel'])) {
            $this->sendSlackAlert($monitoringRule['slack_channel'], $message);
        }
        
        $this->logMessage("Alert sent for ASIN $asin: $alertType", 'INFO');
    }
    
    /**
     * 既存データ取得
     * 
     * @param string $asin ASIN
     * @return array|null 既存データ
     */
    private function getExistingData($asin) {
        $sql = "SELECT * FROM amazon_research_data WHERE asin = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    
    /**
     * データ変更検知
     * 
     * @param array $oldData 既存データ
     * @param array $newData 新データ
     * @return array 変更点
     */
    private function detectChanges($oldData, $newData) {
        $changes = [];
        $trackFields = ['current_price', 'availability_status', 'star_rating', 'review_count'];
        
        foreach ($trackFields as $field) {
            $oldValue = $oldData[$field] ?? null;
            $newValue = $newData[$field] ?? null;
            
            if ($oldValue != $newValue) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                    'changed_at' => date('Y-m-d H:i:s')
                ];
            }
        }
        
        return $changes;
    }
    
    /**
     * 変更記録
     * 
     * @param string $asin ASIN
     * @param array $changes 変更点
     */
    private function recordChanges($asin, $changes) {
        foreach ($changes as $field => $change) {
            $this->logMessage("Data change detected for ASIN $asin - $field: {$change['old']} -> {$change['new']}", 'INFO');
        }
    }
    
    /**
     * ASIN検証・フィルタリング
     * 
     * @param array $asins ASIN配列
     * @param bool $forceUpdate 強制更新
     * @return array 有効なASIN配列
     */
    private function validateAndFilterAsins($asins, $forceUpdate = false) {
        $validAsins = [];
        
        foreach ($asins as $asin) {
            // ASIN形式検証
            if (!$this->isValidAsin($asin)) {
                $this->logMessage("Invalid ASIN format: $asin", 'WARNING');
                continue;
            }
            
            // 強制更新でない場合、最近更新されたものをスキップ
            if (!$forceUpdate && $this->isRecentlyUpdated($asin)) {
                continue;
            }
            
            $validAsins[] = $asin;
        }
        
        return $validAsins;
    }
    
    /**
     * ASIN形式検証
     * 
     * @param string $asin ASIN
     * @return bool 有効かどうか
     */
    private function isValidAsin($asin) {
        return is_string($asin) && strlen($asin) === 10 && ctype_alnum($asin);
    }
    
    /**
     * 最近更新済みチェック
     * 
     * @param string $asin ASIN
     * @return bool 最近更新されているかどうか
     */
    private function isRecentlyUpdated($asin) {
        $sql = "SELECT last_api_update_at FROM amazon_research_data 
                WHERE asin = ? AND last_api_update_at > NOW() - INTERVAL '1 hour'";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        
        return $stmt->fetchColumn() !== false;
    }
    
    /**
     * 監視設定更新
     * 
     * @param string $asin ASIN
     * @param string $priorityLevel 優先度レベル
     */
    private function updateMonitoringSettings($asin, $priorityLevel) {
        // 既存監視ルールチェック
        $sql = "SELECT id FROM amazon_monitoring_rules WHERE asin = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        
        if (!$stmt->fetchColumn()) {
            // 新規監視ルール作成
            $checkFrequency = $this->getCheckFrequencyByPriority($priorityLevel);
            
            $sql = "INSERT INTO amazon_monitoring_rules 
                    (asin, rule_name, check_frequency_minutes, priority_level, is_active, next_check_at) 
                    VALUES (?, ?, ?, ?, true, NOW() + INTERVAL ? MINUTE)";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $asin, 
                "Auto-generated rule for $asin", 
                $checkFrequency, 
                $priorityLevel,
                $checkFrequency
            ]);
        }
    }
    
    /**
     * 優先度による監視頻度取得
     * 
     * @param string $priorityLevel 優先度レベル
     * @return int 監視頻度（分）
     */
    private function getCheckFrequencyByPriority($priorityLevel) {
        $frequencies = [
            'high' => 30,    // 30分
            'normal' => 120, // 2時間
            'low' => 1440    // 24時間
        ];
        
        return $frequencies[$priorityLevel] ?? $frequencies['normal'];
    }
    
    /**
     * データ完全性スコア計算
     * 
     * @param array $itemData アイテムデータ
     * @return float スコア（0.0-1.0）
     */
    private function calculateCompletenessScore($itemData) {
        $requiredFields = [
            'asin', 'title', 'price_info', 'availability', 'images'
        ];
        
        $optionalFields = [
            'brand', 'features', 'reviews', 'categories', 'specifications'
        ];
        
        $score = 0.0;
        $totalWeight = 0.0;
        
        // 必須フィールド（重み0.7）
        foreach ($requiredFields as $field) {
            $weight = 0.7 / count($requiredFields);
            $totalWeight += $weight;
            
            if (!empty($itemData[$field])) {
                $score += $weight;
            }
        }
        
        // オプションフィールド（重み0.3）
        foreach ($optionalFields as $field) {
            $weight = 0.3 / count($optionalFields);
            $totalWeight += $weight;
            
            if (!empty($itemData[$field])) {
                $score += $weight;
            }
        }
        
        return min(1.0, $score / $totalWeight);
    }
    
    /**
     * 価格抽出
     * 
     * @param array $priceInfo 価格情報
     * @return float|null 価格
     */
    private function extractPrice($priceInfo) {
        if (isset($priceInfo['amount']) && is_numeric($priceInfo['amount'])) {
            return floatval($priceInfo['amount']);
        }
        
        return null;
    }
    
    /**
     * テキストクリーニング
     * 
     * @param string $text テキスト
     * @return string クリーニング済みテキスト
     */
    private function cleanText($text) {
        if (!is_string($text)) {
            return '';
        }
        
        // HTMLタグ除去
        $text = strip_tags($text);
        
        // 特殊文字正規化
        $text = html_entity_decode($text, ENT_QUOTES, 'UTF-8');
        
        // 余分な空白除去
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);
        
        return $text;
    }
    
    /**
     * 在庫状況正規化
     * 
     * @param string $message 在庫メッセージ
     * @return string 正規化済み状況
     */
    private function normalizeAvailabilityStatus($message) {
        if (empty($message)) {
            return 'Unknown';
        }
        
        $message = strtolower($message);
        
        if (strpos($message, 'in stock') !== false) {
            return 'In Stock';
        }
        
        if (strpos($message, 'out of stock') !== false || 
            strpos($message, 'unavailable') !== false) {
            return 'Out of Stock';
        }
        
        if (strpos($message, 'limited') !== false || 
            strpos($message, 'only') !== false) {
            return 'Limited Stock';
        }
        
        if (strpos($message, 'preorder') !== false || 
            strpos($message, 'pre-order') !== false) {
            return 'Pre-order';
        }
        
        return 'Unknown';
    }
    
    /**
     * 商品寸法抽出
     * 
     * @param array $itemData アイテムデータ
     * @return array 寸法情報
     */
    private function extractDimensions($itemData) {
        $dimensions = [];
        
        if (isset($itemData['specifications'])) {
            $specs = $itemData['specifications'];
            
            // サイズ情報抽出の試行
            foreach (['size', 'dimensions', 'weight'] as $key) {
                if (isset($specs[$key])) {
                    $dimensions[$key] = $specs[$key];
                }
            }
        }
        
        return $dimensions;
    }
    
    /**
     * 処理統計取得
     * 
     * @return array 処理統計
     */
    private function getProcessingStats() {
        return [
            'processed_count' => $this->processedCount,
            'error_count' => $this->errorCount,
            'processing_time' => round(microtime(true) - $this->startTime, 2)
        ];
    }
    
    /**
     * アラートメッセージ構築
     * 
     * @param string $asin ASIN
     * @param string $alertType アラートタイプ
     * @return array メッセージ
     */
    private function buildAlertMessage($asin, $alertType) {
        $sql = "SELECT title, current_price, availability_status FROM amazon_research_data WHERE asin = ?";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$asin]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $messages = [
            'out_of_stock' => "商品が在庫切れになりました",
            'back_in_stock' => "商品の在庫が復活しました"
        ];
        
        return [
            'title' => $messages[$alertType] ?? 'アラート',
            'asin' => $asin,
            'product_title' => $product['title'] ?? 'Unknown Product',
            'current_price' => $product['current_price'] ?? 0,
            'availability_status' => $product['availability_status'] ?? 'Unknown',
            'alert_type' => $alertType,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * メールアラート送信
     * 
     * @param array $message メッセージ
     */
    private function sendEmailAlert($message) {
        // メール送信実装（共通関数を使用）
        if (function_exists('sendEmail')) {
            $subject = "[Amazon Alert] {$message['title']} - {$message['asin']}";
            $body = "商品: {$message['product_title']}\nASIN: {$message['asin']}\nステータス: {$message['availability_status']}\n時刻: {$message['timestamp']}";
            
            $emails = $this->config['notifications']['email_alerts']['to_emails'];
            foreach ($emails as $email) {
                sendEmail($email, $subject, $body);
            }
        }
    }
    
    /**
     * Webhookアラート送信
     * 
     * @param string $url WebhookURL
     * @param array $message メッセージ
     */
    private function sendWebhookAlert($url, $message) {
        $payload = json_encode($message);
        
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        curl_exec($ch);
        curl_close($ch);
    }
    
    /**
     * Slackアラート送信
     * 
     * @param string $channel チャンネル
     * @param array $message メッセージ
     */
    private function sendSlackAlert($channel, $message) {
        $webhookUrl = $this->config['notifications']['slack']['webhook_url'];
        
        if (empty($webhookUrl)) {
            return;
        }
        
        $payload = [
            'channel' => $channel,
            'username' => $this->config['notifications']['slack']['username'],
            'text' => "{$message['title']}: {$message['product_title']} (ASIN: {$message['asin']})"
        ];
        
        $ch = curl_init($webhookUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        curl_exec($ch);
        curl_close($ch);
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
            error_log("[$level] AmazonDataProcessor: $message");
        }
    }
    
    /**
     * CSVファイルからASIN一括処理
     * 
     * @param string $csvFile CSVファイルパス
     * @param array $options 処理オプション
     * @return array 処理結果
     */
    public function processAsinFromCsv($csvFile, $options = []) {
        if (!file_exists($csvFile)) {
            throw new InvalidArgumentException("CSV file not found: $csvFile");
        }
        
        $asins = [];
        $handle = fopen($csvFile, 'r');
        
        if ($handle === false) {
            throw new Exception("Failed to open CSV file: $csvFile");
        }
        
        // ヘッダー行をスキップ
        $header = fgetcsv($handle);
        
        while (($row = fgetcsv($handle)) !== false) {
            if (!empty($row[0])) {
                $asins[] = trim($row[0]);
            }
        }
        
        fclose($handle);
        
        $this->logMessage("Loaded " . count($asins) . " ASINs from CSV: $csvFile", 'INFO');
        
        return $this->processAsinList($asins, $options);
    }
    
    /**
     * 手動リトリガー（失敗したASINの再処理）
     * 
     * @param array $failedAsins 失敗したASIN配列
     * @param array $options 処理オプション
     * @return array 処理結果
     */
    public function retryFailedAsins($failedAsins = null, $options = []) {
        if ($failedAsins === null) {
            // 最近失敗したASINを取得
            $sql = "SELECT asin FROM amazon_asin_queue 
                    WHERE status = 'failed' AND updated_at > NOW() - INTERVAL '24 hours' 
                    ORDER BY updated_at DESC LIMIT 100";
            
            $stmt = $this->db->query($sql);
            $failedAsins = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        if (empty($failedAsins)) {
            return ['success' => true, 'message' => 'No failed ASINs to retry'];
        }
        
        $options['force_update'] = true; // 強制更新
        
        return $this->processAsinList($failedAsins, $options);
    }
}

?>