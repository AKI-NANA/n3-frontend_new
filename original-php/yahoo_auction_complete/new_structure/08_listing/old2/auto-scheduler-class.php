<?php
/**
 * 自動出品スケジューラー - auto_listing_scheduler.php
 * modules/yahoo_auction_complete/new_structure/08_listing/auto_listing_scheduler.php
 * 
 * 🎯 機能:
 * - 自動出品スケジュール管理
 * - ランダムタイミング制御
 * - 多販路対応
 * - Cron統合
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
            schedule_id INTEGER REFERENCES auto_listing_schedules(id) ON DELETE CASCADE,
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
        
        CREATE INDEX IF NOT EXISTS idx_auto_listing_schedules_active 
        ON auto_listing_schedules(is_active);
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $config['name'],
                $config['frequency'],
                $config['start_time'],
                $config['end_time'],
                $config['min_items_per_day'],
                $config['max_items_per_day'],
                json_encode($config['days_of_week'] ?? [1,2,3,4,5]),
                json_encode($config['target_marketplaces'] ?? ['ebay']),
                $config['randomize_timing'] ?? true,
                $config['randomize_quantity'] ?? true,
                $config['is_active'] ?? true
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $scheduleId = $result['id'];
            
            // 初期スケジュール生成（今後30日分）
            $generated = $this->generateUpcomingSchedule($scheduleId, 30);
            
            return [
                'success' => true,
                'schedule_id' => $scheduleId,
                'generated_count' => $generated,
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
        
        // 既存の未実行スケジュールを削除
        $this->cleanupFutureSchedules($scheduleId);
        
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
                // 指定曜日の最初の日のみ
                return in_array($dayOfWeek, $allowedDays) && 
                       $dayOfWeek == min($allowedDays);
                       
            case 'monthly':
                // 月の最初の週の指定曜日
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
        
        $marketplaces = json_decode($schedule['target_marketplaces'], true) ?: ['ebay'];
        
        foreach ($timeSlots as $timeSlot) {
            $schedules[] = [
                'scheduled_datetime' => $timeSlot,
                'item_count' => 1, // 1つずつ分散出品
                'target_marketplace' => $marketplaces[array_rand($marketplaces)]
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
            // ランダム時間生成（重複回避）
            $usedMinutes = [];
            for ($i = 0; $i < $count; $i++) {
                $attempts = 0;
                do {
                    $randomMinutes = rand(0, $totalMinutes);
                    $attempts++;
                } while (in_array($randomMinutes, $usedMinutes) && $attempts < 100);
                
                $usedMinutes[] = $randomMinutes;
                $timeSlot = clone $start;
                $timeSlot->modify("+{$randomMinutes} minutes");
                $timeSlots[] = $timeSlot->format('Y-m-d H:i:s');
            }
        } else {
            // 均等分散
            $interval = $totalMinutes / ($count + 1); // 前後に余裕を作る
            for ($i = 1; $i <= $count; $i++) {
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
        SELECT sl.*, als.schedule_name 
        FROM scheduled_listings sl
        JOIN auto_listing_schedules als ON sl.schedule_id = als.id
        WHERE sl.status = 'pending' 
        AND sl.scheduled_datetime <= NOW() + INTERVAL '5 minutes'
        AND als.is_active = true
        ORDER BY sl.scheduled_datetime ASC
        LIMIT 10
        ";
        
        try {
            $stmt = $this->pdo->query($sql);
            $pendingListings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $executedCount = 0;
            $results = [];
            
            foreach ($pendingListings as $listing) {
                $result = $this->executeScheduledListing($listing);
                $results[] = $result;
                
                if ($result['success']) {
                    $executedCount++;
                }
            }
            
            return [
                'success' => true,
                'executed_count' => $executedCount,
                'total_pending' => count($pendingListings),
                'results' => $results,
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
            require_once(__DIR__ . '/ebay_api_integration.php');
            $ebayApi = new EbayApiIntegration(['sandbox' => false]);
            $result = $ebayApi->executeBulkListing($items, ['dry_run' => false]);
            
            // 結果保存
            $this->updateListingResult($listing['id'], $result, $items);
            
            return [
                'success' => true,
                'listing_id' => $listing['id'],
                'schedule_name' => $listing['schedule_name'],
                'item_count' => count($items),
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
                'schedule_name' => $listing['schedule_name'] ?? 'Unknown',
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
        AND active_title != ''
        AND price_jpy > 0
        AND active_image_url IS NOT NULL
        ORDER BY RANDOM()
        LIMIT ?
        ";
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$count]);
            
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
        // 価格計算（USD変換）
        $priceUsd = $item['cached_price_usd'] ?? ($item['price_jpy'] / 150);
        $priceUsd = round($priceUsd, 2);
        
        // カテゴリーマッピング
        $category = $this->mapToEbayCategory($item['category'] ?? '');
        
        // タイトル最適化
        $title = $this->optimizeTitle($item['active_title']);
        
        // 商品説明生成
        $description = $this->generateDescription($item);
        
        return [
            'item_id' => $item['source_item_id'],
            'Title' => $title,
            'Description' => $description,
            'Category' => $category,
            'BuyItNowPrice' => $priceUsd,
            'Quantity' => 1,
            'Currency' => 'USD',
            'Country' => 'JP',
            'PostalCode' => '100-0001',
            'ConditionID' => $this->mapConditionId($item['condition_name'] ?? 'Used'),
            'ConditionDescription' => $item['condition_name'] ?? 'Used',
            'PictureURL' => $item['active_image_url'],
            'Duration' => 'GTC',
            'ShippingService' => 'JP_StandardShipping',
            'ShippingCost' => 0
        ];
    }
    
    /**
     * タイトル最適化
     */
    private function optimizeTitle($title) {
        // 文字数制限（80文字）
        $title = mb_substr($title, 0, 80);
        
        // 不適切な文字を除去
        $title = preg_replace('/[^\w\s\-\(\)\.\/]/', '', $title);
        
        // 連続空白を単一空白に
        $title = preg_replace('/\s+/', ' ', $title);
        
        return trim($title);
    }
    
    /**
     * 商品説明生成
     */
    private function generateDescription($item) {
        $description = "Original Japanese Item\n\n";
        $description .= "Title: " . ($item['active_title'] ?? 'Japanese Item') . "\n";
        $description .= "Condition: " . ($item['condition_name'] ?? 'Used') . "\n";
        $description .= "Category: " . ($item['category'] ?? 'General') . "\n\n";
        $description .= "This item is shipped from Japan.\n";
        $description .= "International shipping available.\n\n";
        $description .= "Please feel free to contact us for any questions.";
        
        return $description;
    }
    
    /**
     * カテゴリーマッピング
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
            'コレクション' => 1,
            'アンティーク' => 20081,
            '美術品' => 550,
            'その他' => 99
        ];
        
        return $categoryMap[$category] ?? 99; // その他
    }
    
    /**
     * コンディションID マッピング
     */
    private function mapConditionId($condition) {
        $conditionMap = [
            '新品' => 1000,
            'ほぼ新品' => 1500,
            '中古' => 3000,
            '使用感あり' => 4000,
            'ジャンク' => 7000
        ];
        
        return $conditionMap[$condition] ?? 3000; // デフォルト: Used
    }
    
    /**
     * 未来のスケジュール削除
     */
    private function cleanupFutureSchedules($scheduleId) {
        $sql = "DELETE FROM scheduled_listings WHERE schedule_id = ? AND status = 'pending' AND scheduled_datetime > NOW()";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$scheduleId]);
    }
    
    /**
     * リスト管理メソッド
     */
    public function getActiveSchedules() {
        $sql = "
        SELECT *, 
        (SELECT COUNT(*) FROM scheduled_listings WHERE schedule_id = auto_listing_schedules.id AND status = 'pending') as pending_count,
        (SELECT COUNT(*) FROM scheduled_listings WHERE schedule_id = auto_listing_schedules.id AND status = 'completed') as completed_count
        FROM auto_listing_schedules 
        WHERE is_active = true 
        ORDER BY created_at DESC
        ";
        
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function getUpcomingListings($days = 7) {
        $sql = "
        SELECT sl.*, als.schedule_name 
        FROM scheduled_listings sl
        JOIN auto_listing_schedules als ON sl.schedule_id = als.id
        WHERE sl.scheduled_datetime BETWEEN NOW() AND NOW() + INTERVAL '{$days} days'
        AND sl.status = 'pending'
        AND als.is_active = true
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
        LIMIT 100
        ";
        
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * スケジュール切り替え
     */
    public function toggleSchedule($scheduleId, $isActive) {
        $sql = "UPDATE auto_listing_schedules SET is_active = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$isActive, $scheduleId]);
        
        if ($isActive) {
            // アクティブにした場合は新しいスケジュール生成
            $this->generateUpcomingSchedule($scheduleId, 30);
        } else {
            // 非アクティブにした場合は未実行スケジュールを削除
            $this->cleanupFutureSchedules($scheduleId);
        }
        
        return true;
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
        SET status = ?, execution_result = ?, executed_at = NOW(), updated_at = NOW()
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
    
    private function getDbConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $pdo = new PDO($dsn, $user, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch (Exception $e) {
            throw new Exception("データベース接続エラー: " . $e->getMessage());
        }
    }
}

/**
 * Cron実行用エンドポイント
 * cron_auto_listing.php として保存し、Cronで定期実行
 */
if (php_sapi_name() === 'cli' || (isset($_GET['cron_key']) && $_GET['cron_key'] === 'auto-listing-secret-2025')) {
    try {
        $scheduler = new AutoListingScheduler();
        $result = $scheduler->executePendingListings();
        
        // ログ出力
        $logMessage = date('Y-m-d H:i:s') . " - 自動出品実行: " . json_encode($result);
        error_log($logMessage);
        
        if (php_sapi_name() !== 'cli') {
            header('Content-Type: application/json');
            echo json_encode($result);
        } else {
            echo $logMessage . "\n";
        }
        
    } catch (Exception $e) {
        $error = "自動出品実行エラー: " . $e->getMessage();
        error_log($error);
        
        if (php_sapi_name() !== 'cli') {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $error]);
        } else {
            echo $error . "\n";
        }
    }
}

?>