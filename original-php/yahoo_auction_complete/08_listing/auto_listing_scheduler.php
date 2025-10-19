<?php
/**
 * 自動出品スケジューラー
 * 機能: スケジュール管理・ランダム出品・多販路対応・Cron統合
 */

class AutoListingScheduler {
    private $pdo;
    private $ebayApi;
    
    public function __construct() {
        $this->pdo = $this->getDbConnection();
        $this->ebayApi = new EbayApiIntegration(['sandbox' => false]);
        $this->initializeTables();
    }
    
    /**
     * データベーステーブル初期化
     */
    private function initializeTables() {
        try {
            // 自動出品スケジュールテーブル
            $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS auto_listing_schedules (
                id SERIAL PRIMARY KEY,
                schedule_name VARCHAR(100) NOT NULL,
                frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly')),
                frequency_value JSONB NOT NULL,
                random_config JSONB NOT NULL,
                target_marketplaces JSONB NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )");
            
            // スケジュール実行履歴テーブル
            $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS scheduled_listings (
                id SERIAL PRIMARY KEY,
                schedule_id INTEGER REFERENCES auto_listing_schedules(id),
                scheduled_datetime TIMESTAMP NOT NULL,
                item_count INTEGER NOT NULL,
                target_marketplace VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
                execution_result JSONB,
                item_ids JSONB,
                executed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )");
            
            // インデックス作成
            $this->pdo->exec("
            CREATE INDEX IF NOT EXISTS idx_scheduled_listings_datetime 
            ON scheduled_listings(scheduled_datetime, status)");
            
        } catch (Exception $e) {
            error_log("テーブル初期化エラー: " . $e->getMessage());
        }
    }
    
    /**
     * スケジュール作成
     */
    public function createSchedule($scheduleData) {
        try {
            $sql = "
            INSERT INTO auto_listing_schedules 
            (schedule_name, frequency_type, frequency_value, random_config, target_marketplaces, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
            RETURNING id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $scheduleData['schedule_name'],
                $scheduleData['frequency_type'],
                $scheduleData['frequency_value'],
                $scheduleData['random_config'],
                $scheduleData['target_marketplaces'],
                $scheduleData['is_active'] ?? true
            ]);
            
            $scheduleId = $stmt->fetchColumn();
            
            // 次回実行スケジュール生成
            $this->generateUpcomingSchedules($scheduleId);
            
            return [
                'success' => true,
                'message' => 'スケジュールを作成しました',
                'schedule_id' => $scheduleId
            ];
            
        } catch (Exception $e) {
            error_log("スケジュール作成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'スケジュール作成に失敗しました: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 次回実行スケジュール生成
     */
    private function generateUpcomingSchedules($scheduleId, $daysAhead = 30) {
        try {
            $schedule = $this->getSchedule($scheduleId);
            if (!$schedule) {
                throw new Exception("スケジュールが見つかりません: ID {$scheduleId}");
            }
            
            $frequencyValue = json_decode($schedule['frequency_value'], true);
            $randomConfig = json_decode($schedule['random_config'], true);
            $marketplaces = json_decode($schedule['target_marketplaces'], true);
            
            $currentDate = new DateTime();
            $endDate = (new DateTime())->add(new DateInterval("P{$daysAhead}D"));
            
            while ($currentDate <= $endDate) {
                $shouldExecute = false;
                
                switch ($schedule['frequency_type']) {
                    case 'daily':
                        $shouldExecute = true;
                        break;
                        
                    case 'weekly':
                        $dayOfWeek = $currentDate->format('N'); // 1=月曜, 7=日曜
                        $shouldExecute = in_array($dayOfWeek, $frequencyValue['days'] ?? []);
                        break;
                        
                    case 'monthly':
                        $dayOfMonth = $currentDate->format('j');
                        $shouldExecute = ($dayOfMonth == ($frequencyValue['date'] ?? 1));
                        break;
                }
                
                if ($shouldExecute) {
                    // 時刻設定
                    $time = $frequencyValue['time'] ?? '20:00';
                    $scheduledDateTime = clone $currentDate;
                    $scheduledDateTime->setTime(...explode(':', $time));
                    
                    // ランダム化適用
                    $randomizedDateTime = $this->applyRandomization($scheduledDateTime, $randomConfig);
                    $randomizedItemCount = $this->getRandomItemCount($randomConfig);
                    $selectedMarketplace = $this->selectRandomMarketplace($marketplaces);
                    
                    // スケジュール保存
                    $this->insertScheduledListing($scheduleId, [
                        'scheduled_datetime' => $randomizedDateTime->format('Y-m-d H:i:s'),
                        'item_count' => $randomizedItemCount,
                        'target_marketplace' => $selectedMarketplace
                    ]);
                }
                
                $currentDate->add(new DateInterval('P1D'));
            }
            
        } catch (Exception $e) {
            error_log("次回スケジュール生成エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 時刻ランダム化
     */
    private function applyRandomization($dateTime, $randomConfig) {
        $intervalMinutes = $randomConfig['interval_minutes'] ?? [30, 180];
        $minInterval = $intervalMinutes[0];
        $maxInterval = $intervalMinutes[1];
        
        // ランダムな分数を加算
        $randomMinutes = rand($minInterval, $maxInterval);
        $dateTime->add(new DateInterval("PT{$randomMinutes}M"));
        
        return $dateTime;
    }
    
    /**
     * ランダム出品件数取得
     */
    private function getRandomItemCount($randomConfig) {
        $minItems = $randomConfig['min_items'] ?? 5;
        $maxItems = $randomConfig['max_items'] ?? 20;
        
        return rand($minItems, $maxItems);
    }
    
    /**
     * 実行待ちスケジュール処理
     */
    public function executePendingListings() {
        try {
            $currentTime = date('Y-m-d H:i:s');
            
            $sql = "
            SELECT * FROM scheduled_listings 
            WHERE status = 'pending' 
            AND scheduled_datetime <= ?
            ORDER BY scheduled_datetime ASC
            LIMIT 10
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$currentTime]);
            $pendingListings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $results = [];
            
            foreach ($pendingListings as $listing) {
                try {
                    // ステータス更新: 実行中
                    $this->updateListingStatus($listing['id'], 'executing');
                    
                    // 出品実行
                    $executionResult = $this->executeScheduledListing($listing);
                    
                    // 結果保存
                    $this->updateListingResult($listing['id'], $executionResult, $executionResult['items'] ?? []);
                    
                    $results[] = [
                        'listing_id' => $listing['id'],
                        'success' => $executionResult['success'],
                        'message' => $executionResult['message'],
                        'item_count' => $executionResult['processed_count'] ?? 0
                    ];
                    
                } catch (Exception $e) {
                    // エラー時のステータス更新
                    $this->updateListingStatus($listing['id'], 'failed', [
                        'error' => $e->getMessage(),
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                    
                    $results[] = [
                        'listing_id' => $listing['id'],
                        'success' => false,
                        'message' => 'エラー: ' . $e->getMessage()
                    ];
                }
            }
            
            return [
                'success' => true,
                'message' => count($pendingListings) . '件のスケジュールを処理しました',
                'processed_count' => count($pendingListings),
                'results' => $results
            ];
            
        } catch (Exception $e) {
            error_log("スケジュール実行エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'スケジュール実行エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * スケジュール実行
     */
    private function executeScheduledListing($listing) {
        try {
            // 出品対象商品を取得
            $items = $this->getListingCandidates($listing['item_count'], $listing['target_marketplace']);
            
            if (empty($items)) {
                return [
                    'success' => false,
                    'message' => '出品対象の商品が見つかりません',
                    'processed_count' => 0
                ];
            }
            
            $successCount = 0;
            $errorCount = 0;
            $processedItems = [];
            
            foreach ($items as $item) {
                try {
                    // eBay出品データ変換
                    $ebayData = $this->convertToEbayFormat($item);
                    
                    // 出品実行
                    $listingResult = $this->ebayApi->addFixedPriceItem($ebayData, false);
                    
                    if ($listingResult['success']) {
                        $successCount++;
                        
                        // データベース更新
                        $this->updateItemListingStatus($item['item_id'], 'listed', [
                            'ebay_item_id' => $listingResult['item_id'],
                            'listing_url' => $listingResult['listing_url']
                        ]);
                    } else {
                        $errorCount++;
                    }
                    
                    $processedItems[] = [
                        'item_id' => $item['item_id'],
                        'success' => $listingResult['success'],
                        'ebay_item_id' => $listingResult['item_id'] ?? null,
                        'message' => $listingResult['message']
                    ];
                    
                    // レート制限対応（1秒間隔）
                    sleep(1);
                    
                } catch (Exception $e) {
                    $errorCount++;
                    $processedItems[] = [
                        'item_id' => $item['item_id'],
                        'success' => false,
                        'message' => 'エラー: ' . $e->getMessage()
                    ];
                }
            }
            
            return [
                'success' => $successCount > 0,
                'message' => "出品完了: 成功 {$successCount}件、エラー {$errorCount}件",
                'processed_count' => count($items),
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'items' => $processedItems
            ];
            
        } catch (Exception $e) {
            error_log("スケジュール実行エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'スケジュール実行エラー: ' . $e->getMessage(),
                'processed_count' => 0
            ];
        }
    }
    
    /**
     * 出品候補商品取得
     */
    private function getListingCandidates($itemCount, $marketplace) {
        try {
            $sql = "
            SELECT 
                item_id, title, description, price, quantity,
                weight, dimensions, brand, condition_name,
                main_image_url, additional_images, category
            FROM mystical_japan_treasures_inventory 
            WHERE listing_status = 'Approved'
            AND is_active = true
            AND (ebay_item_id IS NULL OR ebay_item_id = '')
            AND (marketplace_targets->? IS NULL OR marketplace_targets->>? = 'true')
            ORDER BY RANDOM()
            LIMIT ?
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$marketplace, $marketplace, $itemCount]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("出品候補取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * eBayフォーマット変換
     */
    private function convertToEbayFormat($item) {
        return [
            'Item ID' => $item['item_id'],
            'Title' => $item['title'],
            'Description' => $item['description'],
            'Category' => $this->mapToEbayCategory($item['category']),
            'Condition' => $this->mapToEbayCondition($item['condition_name']),
            'Price' => $item['price'],
            'Quantity' => $item['quantity'] ?: 1,
            'Weight' => $item['weight'] ?: '0.5',
            'Dimensions' => $item['dimensions'] ?: '10x10x5',
            'Brand' => $item['brand'] ?: 'Unknown',
            'Main Image' => $item['main_image_url'],
            'Additional Images' => $item['additional_images'],
            'Shipping Service' => 'Standard Shipping',
            'Shipping Cost' => '5.99',
            'Return Policy' => 'Returns Accepted'
        ];
    }
    
    /**
     * カテゴリマッピング
     */
    private function mapToEbayCategory($category) {
        $categoryMap = [
            'ファッション' => 11450,
            '家電' => 293,
            'スポーツ' => 888,
            'ホーム&ガーデン' => 11700,
            'ジュエリー' => 281,
            'おもちゃ' => 220,
            'コレクティブル' => 1,
            'アート' => 550,
            'ミュージック' => 11233,
            'ブック' => 267,
            'その他' => 99
        ];
        
        return $categoryMap[$category] ?? 99;
    }
    
    /**
     * コンディションマッピング
     */
    private function mapToEbayCondition($condition) {
        $conditionMap = [
            '新品' => 'New',
            '未使用' => 'New other',
            '中古・美品' => 'Used',
            '中古・良品' => 'Used',
            '中古・可' => 'Used',
            'ジャンク' => 'For parts or not working'
        ];
        
        return $conditionMap[$condition] ?? 'Used';
    }
    
    /**
     * 商品出品ステータス更新
     */
    private function updateItemListingStatus($itemId, $status, $ebayData = []) {
        try {
            $updateFields = ['listing_status' => $status, 'updated_at' => 'NOW()'];
            
            if (!empty($ebayData['ebay_item_id'])) {
                $updateFields['ebay_item_id'] = $ebayData['ebay_item_id'];
            }
            
            if (!empty($ebayData['listing_url'])) {
                $updateFields['ebay_listing_url'] = $ebayData['listing_url'];
            }
            
            $setClause = [];
            $values = [];
            
            foreach ($updateFields as $field => $value) {
                if ($value === 'NOW()') {
                    $setClause[] = "{$field} = NOW()";
                } else {
                    $setClause[] = "{$field} = ?";
                    $values[] = $value;
                }
            }
            
            $values[] = $itemId;
            
            $sql = "UPDATE mystical_japan_treasures_inventory SET " . 
                   implode(', ', $setClause) . " WHERE item_id = ?";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($values);
            
        } catch (Exception $e) {
            error_log("商品ステータス更新エラー: " . $e->getMessage());
        }
    }
    
    /**
     * スケジュール一覧取得
     */
    public function getSchedules($activeOnly = true) {
        try {
            $whereClause = $activeOnly ? 'WHERE is_active = true' : '';
            
            $sql = "
            SELECT 
                id, schedule_name, frequency_type, frequency_value, 
                random_config, target_marketplaces, is_active,
                created_at, updated_at
            FROM auto_listing_schedules 
            {$whereClause}
            ORDER BY created_at DESC
            ";
            
            $stmt = $this->pdo->query($sql);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("スケジュール一覧取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * スケジュール削除
     */
    public function deleteSchedule($scheduleId) {
        try {
            $this->pdo->beginTransaction();
            
            // 実行待ちスケジュールを削除
            $stmt = $this->pdo->prepare("DELETE FROM scheduled_listings WHERE schedule_id = ? AND status = 'pending'");
            $stmt->execute([$scheduleId]);
            
            // スケジュールを無効化（完全削除ではなく）
            $stmt = $this->pdo->prepare("UPDATE auto_listing_schedules SET is_active = false WHERE id = ?");
            $stmt->execute([$scheduleId]);
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'message' => 'スケジュールを削除しました'
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("スケジュール削除エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'スケジュール削除に失敗しました'
            ];
        }
    }
    
    /**
     * 実行履歴取得
     */
    public function getExecutionHistory($days = 30) {
        try {
            $sql = "
            SELECT 
                sl.id, sl.scheduled_datetime, sl.item_count, 
                sl.target_marketplace, sl.status, sl.execution_result,
                sl.executed_at, als.schedule_name 
            FROM scheduled_listings sl
            JOIN auto_listing_schedules als ON sl.schedule_id = als.id
            WHERE sl.executed_at >= NOW() - INTERVAL '{$days} days'
            ORDER BY sl.executed_at DESC
            ";
            
            return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("実行履歴取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ヘルパーメソッド
     */
    private function getSchedule($scheduleId) {
        $stmt = $this->pdo->prepare("SELECT * FROM auto_listing_schedules WHERE id = ?");
        $stmt->execute([$scheduleId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    private function insertScheduledListing($scheduleId, $data) {
        $sql = "
        INSERT INTO scheduled_listings (schedule_id, scheduled_datetime, item_count, target_marketplace)
        VALUES (?, ?, ?, ?)
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $scheduleId,
            $data['scheduled_datetime'],
            $data['item_count'],
            $data['target_marketplace']
        ]);
    }
    
    private function updateListingStatus($listingId, $status, $result = []) {
        $sql = "
        UPDATE scheduled_listings 
        SET status = ?, execution_result = ?, executed_at = NOW()
        WHERE id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $status,
            json_encode($result),
            $listingId
        ]);
    }
    
    private function updateListingResult($listingId, $result, $items) {
        $itemIds = array_column($items, 'item_id');
        
        $sql = "
        UPDATE scheduled_listings 
        SET status = ?, execution_result = ?, item_ids = ?, executed_at = NOW()
        WHERE id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $result['success'] ? 'completed' : 'failed',
            json_encode($result),
            json_encode($itemIds),
            $listingId
        ]);
    }
    
    private function selectRandomMarketplace($marketplaces) {
        $marketplaceArray = is_array($marketplaces) ? $marketplaces : ['ebay'];
        return $marketplaceArray[array_rand($marketplaceArray)];
    }
    
    private function getDbConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました");
        }
    }
}

// Cronから直接実行される場合
if (php_sapi_name() === 'cli' || isset($_GET['cron_key'])) {
    // セキュリティキーチェック
    $cronKey = $_GET['cron_key'] ?? ($argv[1] ?? '');
    $expectedKey = 'auto-listing-secret-2025';
    
    if ($cronKey === $expectedKey) {
        try {
            $scheduler = new AutoListingScheduler();
            $result = $scheduler->executePendingListings();
            
            // ログ出力
            $logMessage = date('Y-m-d H:i:s') . " - 自動出品実行結果: " . json_encode($result, JSON_UNESCAPED_UNICODE);
            error_log($logMessage);
            
            // CLI以外の場合はJSON出力
            if (php_sapi_name() !== 'cli') {
                header('Content-Type: application/json');
                echo json_encode($result);
            }
            
        } catch (Exception $e) {
            $errorMessage = "自動出品エラー: " . $e->getMessage();
            error_log($errorMessage);
            
            if (php_sapi_name() !== 'cli') {
                header('HTTP/1.1 500 Internal Server Error');
                echo json_encode(['success' => false, 'message' => $errorMessage]);
            }
        }
    } else {
        error_log("不正なCronキーでのアクセス試行");
        if (php_sapi_name() !== 'cli') {
            header('HTTP/1.1 403 Forbidden');
            echo json_encode(['success' => false, 'message' => 'アクセス拒否']);
        }
    }
    
    exit;
}
?>