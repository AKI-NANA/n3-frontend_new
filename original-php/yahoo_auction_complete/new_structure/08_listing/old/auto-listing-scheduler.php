<?php
/**
 * 自動出品スケジューラー - 完全新規実装
 * 既存システムに統合可能
 */

class AutoListingScheduler {
    private $pdo;
    private $ebayApi;
    
    public function __construct($dbConnection = null) {
        // 既存のDB接続を使用
        $this->pdo = $dbConnection ?? $this->getDbConnection();
        $this->createScheduleTables();
    }
    
    /**
     * スケジュールテーブル作成（初回のみ実行）
     */
    private function createScheduleTables() {
        $sql = "
        CREATE TABLE IF NOT EXISTS auto_listing_schedules (
            id SERIAL PRIMARY KEY,
            schedule_name VARCHAR(255) NOT NULL,
            frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            min_items_per_day INTEGER DEFAULT 1,
            max_items_per_day INTEGER DEFAULT 10,
            days_of_week JSONB DEFAULT '[]', -- 曜日指定 [1,2,3,4,5]
            target_marketplaces JSONB DEFAULT '[\"ebay\"]',
            randomize_timing BOOLEAN DEFAULT true,
            randomize_quantity BOOLEAN DEFAULT true,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS scheduled_listings (
            id SERIAL PRIMARY KEY,
            schedule_id INTEGER REFERENCES auto_listing_schedules(id),
            scheduled_datetime TIMESTAMP NOT NULL,
            item_count INTEGER DEFAULT 1,
            target_marketplace VARCHAR(50) DEFAULT 'ebay',
            status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
            item_ids JSONB DEFAULT '[]',
            execution_result JSONB DEFAULT '{}',
            executed_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_scheduled_listings_datetime 
        ON scheduled_listings(scheduled_datetime, status);
        
        CREATE INDEX IF NOT EXISTS idx_scheduled_listings_status 
        ON scheduled_listings(status);
        ";
        
        try {
            $this->pdo->exec($sql);
        } catch (PDOException $e) {
            error_log("スケジュールテーブル作成エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 新しいスケジュール作成
     */
    public function createSchedule($config) {
        $sql = "
        INSERT INTO auto_listing_schedules 
        (schedule_name, frequency, start_time, end_time, min_items_per_day, 
         max_items_per_day, days_of_week, target_marketplaces, 
         randomize_timing, randomize_quantity, is_active)
        VALUES (:name, :frequency, :start_time, :end_time, :min_items, 
                :max_items, :days_of_week, :marketplaces, :randomize_timing, 
                :randomize_quantity, :is_active)
        RETURNING id
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'name' => $config['name'],
                'frequency' => $config['frequency'],
                'start_time' => $config['start_time'],
                'end_time' => $config['end_time'],
                'min_items' => $config['min_items_per_day'],
                'max_items' => $config['max_items_per_day'],
                'days_of_week' => json_encode($config['days_of_week'] ?? [1,2,3,4,5]),
                'marketplaces' => json_encode($config['target_marketplaces'] ?? ['ebay']),
                'randomize_timing' => $config['randomize_timing'] ?? true,
                'randomize_quantity' => $config['randomize_quantity'] ?? true,
                'is_active' => $config['is_active'] ?? true
            ]);
            
            $scheduleId = $stmt->fetch(PDO::FETCH_ASSOC)['id'];
            
            // 初期スケジュール生成（今後30日分）
            $this->generateUpcomingSchedule($scheduleId, 30);
            
            return [
                'success' => true,
                'schedule_id' => $scheduleId,
                'message' => 'スケジュールが正常に作成されました'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'スケジュール作成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 今後のスケジュール生成
     */
    public function generateUpcomingSchedule($scheduleId, $days = 30) {
        $schedule = $this->getSchedule($scheduleId);
        if (!$schedule) {
            throw new Exception("スケジュール ID {$scheduleId} が見つかりません");
        }
        
        $startDate = new DateTime();
        $endDate = new DateTime("+{$days} days");
        
        $currentDate = clone $startDate;
        $generatedCount = 0;
        
        while ($currentDate <= $endDate) {
            if ($this->shouldScheduleOnDate($currentDate, $schedule)) {
                $daySchedules = $this->generateDaySchedule($currentDate, $schedule);
                
                foreach ($daySchedules as $daySchedule) {
                    $this->insertScheduledListing($scheduleId, $daySchedule);
                    $generatedCount++;
                }
            }
            
            $currentDate->modify('+1 day');
        }
        
        return $generatedCount;
    }
    
    /**
     * 日付がスケジュール対象かチェック
     */
    private function shouldScheduleOnDate(DateTime $date, $schedule) {
        $dayOfWeek = (int)$date->format('N'); // 1=月曜日, 7=日曜日
        $allowedDays = json_decode($schedule['days_of_week'], true) ?: [1,2,3,4,5];
        
        switch ($schedule['frequency']) {
            case 'daily':
                return in_array($dayOfWeek, $allowedDays);
                
            case 'weekly':
                return in_array($dayOfWeek, $allowedDays) && 
                       $date->format('N') == min($allowedDays);
                       
            case 'monthly':
                return $date->format('j') <= 7 && 
                       in_array($dayOfWeek, $allowedDays);
                       
            default:
                return false;
        }
    }
    
    /**
     * 1日のスケジュール生成
     */
    private function generateDaySchedule(DateTime $date, $schedule) {
        $schedules = [];
        
        // アイテム数決定
        $itemCount = $schedule['randomize_quantity'] ? 
            rand($schedule['min_items_per_day'], $schedule['max_items_per_day']) :
            $schedule['min_items_per_day'];
        
        // 時間分散
        $timeSlots = $this->generateTimeSlots(
            $date, 
            $schedule['start_time'], 
            $schedule['end_time'],
            $itemCount,
            $schedule['randomize_timing']
        );
        
        foreach ($timeSlots as $timeSlot) {
            $schedules[] = [
                'scheduled_datetime' => $timeSlot,
                'item_count' => 1, // 1つずつ分散出品
                'target_marketplace' => $this->selectRandomMarketplace($schedule['target_marketplaces'])
            ];
        }
        
        return $schedules;
    }
    
    /**
     * 時間スロット生成
     */
    private function generateTimeSlots(DateTime $date, $startTime, $endTime, $count, $randomize) {
        $timeSlots = [];
        
        $start = DateTime::createFromFormat('Y-m-d H:i:s', 
            $date->format('Y-m-d') . ' ' . $startTime . ':00');
        $end = DateTime::createFromFormat('Y-m-d H:i:s', 
            $date->format('Y-m-d') . ' ' . $endTime . ':00');
        
        $totalMinutes = ($end->getTimestamp() - $start->getTimestamp()) / 60;
        
        if ($randomize) {
            // ランダム時間生成
            for ($i = 0; $i < $count; $i++) {
                $randomMinutes = rand(0, $totalMinutes);
                $timeSlot = clone $start;
                $timeSlot->modify("+{$randomMinutes} minutes");
                $timeSlots[] = $timeSlot->format('Y-m-d H:i:s');
            }
        } else {
            // 均等分散
            $interval = $totalMinutes / $count;
            for ($i = 0; $i < $count; $i++) {
                $minutes = $i * $interval;
                $timeSlot = clone $start;
                $timeSlot->modify("+{$minutes} minutes");
                $timeSlots[] = $timeSlot->format('Y-m-d H:i:s');
            }
        }
        
        sort($timeSlots);
        return $timeSlots;
    }
    
    /**
     * 予定出品実行（Cronで定期実行）
     */
    public function executePendingListings() {
        $sql = "
        SELECT * FROM scheduled_listings 
        WHERE status = 'pending' 
        AND scheduled_datetime <= NOW() + INTERVAL '5 minutes'
        ORDER BY scheduled_datetime ASC
        LIMIT 10
        ";
        
        try {
            $stmt = $this->pdo->query($sql);
            $pendingListings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $executedCount = 0;
            
            foreach ($pendingListings as $listing) {
                $result = $this->executeScheduledListing($listing);
                if ($result['success']) {
                    $executedCount++;
                }
            }
            
            return [
                'success' => true,
                'executed_count' => $executedCount,
                'message' => "{$executedCount}件の予定出品を実行しました"
            ];
            
        } catch (Exception $e) {
            error_log("予定出品実行エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 個別スケジュール出品実行
     */
    private function executeScheduledListing($listing) {
        try {
            // ステータス更新: processing
            $this->updateListingStatus($listing['id'], 'processing');
            
            // 出品対象アイテム選択
            $items = $this->selectItemsForListing(
                $listing['item_count'], 
                $listing['target_marketplace']
            );
            
            if (empty($items)) {
                throw new Exception('出品可能なアイテムがありません');
            }
            
            // eBay API実行
            $ebayApi = new EbayApiIntegration(['sandbox' => false]);
            $result = $ebayApi->executeBulkListing($items, ['dry_run' => false]);
            
            // 結果保存
            $this->updateListingResult($listing['id'], $result, $items);
            
            return [
                'success' => true,
                'listing_id' => $listing['id'],
                'result' => $result
            ];
            
        } catch (Exception $e) {
            $this->updateListingStatus($listing['id'], 'failed', [
                'error' => $e->getMessage(),
                'timestamp' => date('c')
            ]);
            
            return [
                'success' => false,
                'listing_id' => $listing['id'],
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 出品対象アイテム選択
     */
    private function selectItemsForListing($count, $marketplace) {
        $sql = "
        SELECT * FROM mystical_japan_treasures_inventory 
        WHERE listing_status = 'Approved'
        AND (ebay_item_id IS NULL OR ebay_item_id = '')
        AND active_title IS NOT NULL
        AND price_jpy > 0
        ORDER BY RANDOM()
        LIMIT :count
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':count', $count, PDO::PARAM_INT);
            $stmt->execute();
            
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // eBay用フォーマットに変換
            $ebayItems = [];
            foreach ($items as $item) {
                $ebayItems[] = $this->convertToEbayFormat($item);
            }
            
            return $ebayItems;
            
        } catch (Exception $e) {
            error_log("アイテム選択エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * eBay形式に変換
     */
    private function convertToEbayFormat($item) {
        return [
            'item_id' => $item['id'],
            'Title' => $item['active_title'],
            'Description' => $item['active_title'] . "\n\nCondition: " . ($item['condition_name'] ?? 'Used'),
            'Category' => $this->mapToEbayCategory($item['category'] ?? ''),
            'BuyItNowPrice' => round($item['cached_price_usd'] ?? ($item['price_jpy'] / 150), 2),
            'Quantity' => 1,
            'Currency' => 'USD',
            'Country' => 'JP',
            'PostalCode' => '100-0001',
            'ConditionID' => 3000, // Used
            'PictureURL' => $item['active_image_url'] ?? '',
            'Duration' => 'GTC'
        ];
    }
    
    /**
     * カテゴリーマッピング（簡易版）
     */
    private function mapToEbayCategory($category) {
        $categoryMap = [
            'ファッション' => 11450,
            '家電' => 293,
            'おもちゃ' => 220,
            '本・雑誌' => 267,
            'スポーツ' => 888,
            '音楽' => 11233,
            '映画' => 11232,
            'ゲーム' => 1249,
            '車・バイク' => 6000,
            'その他' => 99
        ];
        
        return $categoryMap[$category] ?? 99; // その他
    }
    
    /**
     * リスト管理メソッド
     */
    public function getActiveSchedules() {
        $sql = "SELECT * FROM auto_listing_schedules WHERE is_active = true ORDER BY created_at DESC";
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getUpcomingListings($days = 7) {
        $sql = "
        SELECT sl.*, als.schedule_name 
        FROM scheduled_listings sl
        JOIN auto_listing_schedules als ON sl.schedule_id = als.id
        WHERE sl.scheduled_datetime BETWEEN NOW() AND NOW() + INTERVAL '{$days} days'
        AND sl.status = 'pending'
        ORDER BY sl.scheduled_datetime ASC
        ";
        
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getListingHistory($days = 30) {
        $sql = "
        SELECT sl.*, als.schedule_name 
        FROM scheduled_listings sl
        JOIN auto_listing_schedules als ON sl.schedule_id = als.id
        WHERE sl.executed_at >= NOW() - INTERVAL '{$days} days'
        ORDER BY sl.executed_at DESC
        ";
        
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
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
        VALUES (:schedule_id, :datetime, :count, :marketplace)
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'schedule_id' => $scheduleId,
            'datetime' => $data['scheduled_datetime'],
            'count' => $data['item_count'],
            'marketplace' => $data['target_marketplace']
        ]);
    }
    
    private function updateListingStatus($listingId, $status, $result = []) {
        $sql = "
        UPDATE scheduled_listings 
        SET status = :status, execution_result = :result, executed_at = NOW()
        WHERE id = :id
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'id' => $listingId,
            'status' => $status,
            'result' => json_encode($result)
        ]);
    }
    
    private function updateListingResult($listingId, $result, $items) {
        $itemIds = array_column($items, 'item_id');
        
        $sql = "
        UPDATE scheduled_listings 
        SET status = :status, execution_result = :result, item_ids = :item_ids, executed_at = NOW()
        WHERE id = :id
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'id' => $listingId,
            'status' => $result['success'] ? 'completed' : 'failed',
            'result' => json_encode($result),
            'item_ids' => json_encode($itemIds)
        ]);
    }
    
    private function selectRandomMarketplace($marketplaces) {
        $marketplaceArray = json_decode($marketplaces, true) ?: ['ebay'];
        return $marketplaceArray[array_rand($marketplaceArray)];
    }
    
    private function getDbConnection() {
        // 既存のDB接続設定を使用
        try {
            include_once(__DIR__ . '/../../../database_query_handler.php');
            return getPDOConnection();
        } catch (Exception $e) {
            throw new Exception("データベース接続エラー: " . $e->getMessage());
        }
    }
}

/**
 * Cron実行用エンドポイント
 * /cron_auto_listing.php として保存し、Cronで定期実行
 */
if (php_sapi_name() === 'cli' || (isset($_GET['cron_key']) && $_GET['cron_key'] === 'your-secret-key')) {
    try {
        $scheduler = new AutoListingScheduler();
        $result = $scheduler->executePendingListings();
        
        echo json_encode($result);
        error_log("自動出品実行結果: " . json_encode($result));
        
    } catch (Exception $e) {
        $error = "自動出品実行エラー: " . $e->getMessage();
        echo json_encode(['success' => false, 'message' => $error]);
        error_log($error);
    }
}

?>