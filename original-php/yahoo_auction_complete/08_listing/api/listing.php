<?php
/**
 * 出品システム メインAPI
 * HTML+JS → 完全PHP API 変換
 * eBay API連携・CSV処理・スケジューリング対応
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// OPTIONSリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../03_approval/api/UnifiedLogger.php';
require_once __DIR__ . '/../../03_approval/api/JWTAuth.php';
require_once __DIR__ . '/../../03_approval/api/DatabaseConnection.php';
require_once __DIR__ . '/EbayAPIClient.php';

class ListingAPI {
    private $pdo;
    private $logger;
    private $jwtAuth;
    private $ebayAPI;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
        $this->logger = getLogger('listing_api');
        $this->jwtAuth = getJWTAuth();
        $this->ebayAPI = getEbayAPI(true); // Sandbox mode
    }
    
    /**
     * メインAPIハンドラー
     */
    public function handleRequest() {
        $startTime = microtime(true);
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? $_POST['action'] ?? 'get_listing_queue';
        
        try {
            $this->logger->info("Listing API request received", [
                'method' => $method,
                'action' => $action,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
            
            // 認証が必要なアクション
            $protectedActions = [
                'start_listing', 'cancel_listing', 'upload_csv', 
                'create_schedule', 'delete_schedule', 'end_item'
            ];
            
            if (in_array($action, $protectedActions)) {
                $user = $this->jwtAuth->middleware('listing_manage');
                if (!$user) {
                    return; // middleware が既にエラーレスポンス送信
                }
            }
            
            // ルーティング
            $response = null;
            switch ($action) {
                // 出品キュー管理
                case 'get_listing_queue':
                    $response = $this->getListingQueue();
                    break;
                case 'get_listing_stats':
                    $response = $this->getListingStats();
                    break;
                case 'start_listing':
                    $response = $this->startListing();
                    break;
                case 'cancel_listing':
                    $response = $this->cancelListing();
                    break;
                case 'retry_failed_listing':
                    $response = $this->retryFailedListing();
                    break;
                    
                // CSV処理
                case 'upload_csv':
                    $response = $this->uploadCSV();
                    break;
                case 'validate_csv':
                    $response = $this->validateCSV();
                    break;
                case 'process_csv':
                    $response = $this->processCSV();
                    break;
                case 'get_csv_template':
                    $response = $this->getCSVTemplate();
                    break;
                case 'download_yahoo_data':
                    $response = $this->downloadYahooData();
                    break;
                    
                // スケジューリング
                case 'get_schedules':
                    $response = $this->getSchedules();
                    break;
                case 'create_schedule':
                    $response = $this->createSchedule();
                    break;
                case 'update_schedule':
                    $response = $this->updateSchedule();
                    break;
                case 'delete_schedule':
                    $response = $this->deleteSchedule();
                    break;
                case 'execute_schedule':
                    $response = $this->executeSchedule();
                    break;
                    
                // eBay管理
                case 'get_ebay_items':
                    $response = $this->getEbayItems();
                    break;
                case 'end_item':
                    $response = $this->endEbayItem();
                    break;
                case 'get_categories':
                    $response = $this->getEbayCategories();
                    break;
                    
                // テンプレート
                case 'get_templates':
                    $response = $this->getListingTemplates();
                    break;
                case 'save_template':
                    $response = $this->saveListingTemplate();
                    break;
                    
                default:
                    throw new Exception("Unknown action: {$action}");
            }
            
            // レスポンス送信
            if ($response) {
                $this->sendResponse($response);
            }
            
            $this->logger->logPerformance("Listing API {$action}", $startTime, [
                'method' => $method,
                'status' => 'success'
            ]);
            
        } catch (Exception $e) {
            $this->logger->logError($e, [
                'action' => $action,
                'method' => $method
            ]);
            
            $this->sendErrorResponse($e->getMessage(), 500);
        }
    }
    
    /**
     * 出品キュー取得
     */
    private function getListingQueue() {
        $filters = $this->getFilters();
        $pagination = $this->getPagination();
        
        // WHERE句構築
        $whereConditions = ['1=1'];
        $params = [];
        
        if (!empty($filters['status'])) {
            $whereConditions[] = 'lq.status = ?';
            $params[] = $filters['status'];
        }
        
        if (!empty($filters['marketplace'])) {
            $whereConditions[] = 'lq.marketplace = ?';
            $params[] = $filters['marketplace'];
        }
        
        if (!empty($filters['scheduled_only'])) {
            $whereConditions[] = 'lq.scheduled_at IS NOT NULL';
        }
        
        if (!empty($filters['search'])) {
            $whereConditions[] = 'lq.title ILIKE ?';
            $params[] = '%' . $filters['search'] . '%';
        }
        
        $whereClause = implode(' AND ', $whereConditions);
        
        // メインクエリ
        $sql = "
            SELECT 
                lq.*,
                w.yahoo_auction_id,
                w.current_step,
                aq.ai_confidence_score,
                CASE 
                    WHEN lq.scheduled_at > NOW() THEN 'scheduled'
                    WHEN lq.retry_count >= lq.max_retries AND lq.status = 'failed' THEN 'max_retries'
                    ELSE lq.status 
                END as display_status
            FROM listing_queue lq
            LEFT JOIN workflows w ON lq.workflow_id = w.id
            LEFT JOIN approval_queue aq ON lq.approval_id = aq.id
            WHERE {$whereClause}
            ORDER BY 
                CASE WHEN lq.status = 'processing' THEN 1 
                     WHEN lq.status = 'pending' THEN 2 
                     ELSE 3 END,
                lq.priority DESC, 
                lq.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $pagination['limit'];
        $params[] = $pagination['offset'];
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 全体件数取得
        $countSql = "
            SELECT COUNT(*) as total
            FROM listing_queue lq
            LEFT JOIN workflows w ON lq.workflow_id = w.id
            WHERE {$whereClause}
        ";
        
        $countStmt = $this->pdo->prepare($countSql);
        $countStmt->execute(array_slice($params, 0, -2));
        $totalCount = $countStmt->fetchColumn();
        
        // データ後処理
        foreach ($items as &$item) {
            // 画像データ展開
            if (!empty($item['images'])) {
                $item['images'] = json_decode($item['images'], true);
            }
            
            // 予定時刻の表示調整
            if ($item['scheduled_at']) {
                $item['scheduled_at_formatted'] = date('Y-m-d H:i:s', strtotime($item['scheduled_at']));
                $item['time_until_scheduled'] = strtotime($item['scheduled_at']) - time();
            }
            
            // 処理時間の表示調整
            if ($item['processing_time']) {
                $item['processing_time_formatted'] = number_format($item['processing_time'] / 1000, 2) . 's';
            }
        }
        
        return [
            'success' => true,
            'data' => $items,
            'pagination' => [
                'total' => (int)$totalCount,
                'page' => $pagination['page'],
                'limit' => $pagination['limit'],
                'pages' => ceil($totalCount / $pagination['limit'])
            ],
            'filters_applied' => $filters
        ];
    }
    
    /**
     * 出品統計取得
     */
    private function getListingStats() {
        // マテリアライズドビューから統計取得
        $sql = "SELECT * FROM listing_stats";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // 追加統計
        $additionalSQL = "
            SELECT 
                COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
                COUNT(*) FILTER (WHERE scheduled_at > NOW()) as scheduled_count,
                COUNT(*) FILTER (WHERE retry_count > 0) as retried_count,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_count,
                AVG(CASE WHEN status = 'listed' THEN processing_time END) as avg_success_time
            FROM listing_queue
        ";
        
        $stmt = $this->pdo->prepare($additionalSQL);
        $stmt->execute();
        $additional = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // eBay API制限状況
        $apiLimitSQL = "
            SELECT 
                api_type, limit_type, current_usage, max_usage,
                ROUND((current_usage::DECIMAL / max_usage) * 100, 1) as usage_percentage
            FROM ebay_api_limits
        ";
        
        $stmt = $this->pdo->prepare($apiLimitSQL);
        $stmt->execute();
        $apiLimits = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => array_merge($stats ?: [], $additional ?: [], [
                'api_limits' => $apiLimits
            ])
        ];
    }
    
    /**
     * 一括出品開始
     */
    private function startListing() {
        $input = $this->getJsonInput();
        $listingIds = $input['listing_ids'] ?? [];
        $testMode = $input['test_mode'] ?? true;
        $currentUser = getCurrentUser();
        
        if (empty($listingIds)) {
            throw new Exception('Listing IDs are required');
        }
        
        $this->pdo->beginTransaction();
        
        try {
            $processedCount = 0;
            $errors = [];
            
            foreach ($listingIds as $listingId) {
                try {
                    $this->processListing($listingId, $testMode, $currentUser['user_id']);
                    $processedCount++;
                } catch (Exception $e) {
                    $errors[] = "Listing {$listingId}: " . $e->getMessage();
                    $this->logger->error("Listing failed", [
                        'listing_id' => $listingId,
                        'error' => $e->getMessage()
                    ]);
                }
            }
            
            $this->pdo->commit();
            
            // 非同期でバックグラウンド処理を開始
            $this->enqueueListing($listingIds);
            
            return [
                'success' => true,
                'message' => "Started processing {$processedCount} listings",
                'processed_count' => $processedCount,
                'errors' => $errors,
                'test_mode' => $testMode
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 個別出品処理
     */
    private function processListing($listingId, $testMode = true, $userId = 'system') {
        // 出品データ取得
        $sql = "
            SELECT lq.*, w.yahoo_auction_id 
            FROM listing_queue lq
            LEFT JOIN workflows w ON lq.workflow_id = w.id
            WHERE lq.id = ? AND lq.status IN ('pending', 'failed')
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$listingId]);
        $listing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$listing) {
            throw new Exception("Listing not found or not ready: {$listingId}");
        }
        
        // ステータス更新：処理開始
        $this->updateListingStatus($listingId, 'processing', [
            'processing_started_at' => 'NOW()'
        ]);
        
        try {
            // eBay出品データ準備
            $itemData = $this->prepareEbayItemData($listing);
            
            // eBay API呼び出し
            if ($testMode) {
                $result = $this->ebayAPI->mockAddItem($itemData);
            } else {
                $result = $this->ebayAPI->addItem($itemData);
            }
            
            if ($result['success']) {
                // 出品成功
                $this->updateListingStatus($listingId, 'listed', [
                    'ebay_item_id' => $result['item_id'],
                    'external_data' => json_encode($result),
                    'processing_completed_at' => 'NOW()'
                ]);
                
                $this->logger->info("Listing successful", [
                    'listing_id' => $listingId,
                    'ebay_item_id' => $result['item_id'],
                    'test_mode' => $testMode
                ]);
                
            } else {
                throw new Exception('eBay listing failed');
            }
            
        } catch (Exception $e) {
            // 出品失敗処理
            $this->handleListingFailure($listingId, $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 出品失敗処理
     */
    private function handleListingFailure($listingId, $errorMessage) {
        // リトライ回数確認
        $sql = "SELECT retry_count, max_retries FROM listing_queue WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$listingId]);
        $retryInfo = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($retryInfo['retry_count'] < $retryInfo['max_retries']) {
            // リトライ可能
            $this->updateListingStatus($listingId, 'failed', [
                'error_message' => $errorMessage,
                'retry_count' => 'retry_count + 1',
                'last_retry_at' => 'NOW()'
            ]);
        } else {
            // 最大リトライ回数に達した
            $this->updateListingStatus($listingId, 'failed', [
                'error_message' => $errorMessage . ' (Max retries reached)',
                'processing_completed_at' => 'NOW()'
            ]);
        }
    }
    
    /**
     * CSV アップロード処理
     */
    private function uploadCSV() {
        if (!isset($_FILES['csv_file'])) {
            throw new Exception('No CSV file uploaded');
        }
        
        $file = $_FILES['csv_file'];
        $currentUser = getCurrentUser();
        
        // ファイル検証
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error: ' . $file['error']);
        }
        
        if ($file['size'] > 10 * 1024 * 1024) { // 10MB制限
            throw new Exception('File too large. Maximum size is 10MB');
        }
        
        $fileInfo = pathinfo($file['name']);
        if (strtolower($fileInfo['extension']) !== 'csv') {
            throw new Exception('Invalid file type. Only CSV files are allowed');
        }
        
        // ファイルハッシュ計算（重複チェック）
        $fileHash = hash_file('sha256', $file['tmp_name']);
        
        // 重複チェック
        $duplicateSQL = "
            SELECT id, filename FROM csv_uploads 
            WHERE file_hash = ? AND uploaded_by = ?
        ";
        $stmt = $this->pdo->prepare($duplicateSQL);
        $stmt->execute([$fileHash, $currentUser['user_id']]);
        $duplicate = $stmt->fetch();
        
        if ($duplicate) {
            return [
                'success' => false,
                'message' => "Duplicate file detected. Previously uploaded as: {$duplicate['filename']}",
                'duplicate_upload_id' => $duplicate['id']
            ];
        }
        
        // アップロード記録作成
        $insertSQL = "
            INSERT INTO csv_uploads (filename, file_size, file_hash, uploaded_by)
            VALUES (?, ?, ?, ?)
            RETURNING id
        ";
        
        $stmt = $this->pdo->prepare($insertSQL);
        $stmt->execute([
            $file['name'],
            $file['size'],
            $fileHash,
            $currentUser['user_id']
        ]);
        
        $uploadId = $stmt->fetchColumn();
        
        // ファイル保存
        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }
        
        $savedPath = $uploadDir . $uploadId . '_' . $file['name'];
        move_uploaded_file($file['tmp_name'], $savedPath);
        
        // CSV検証を非同期で開始
        $this->validateCSVAsync($uploadId, $savedPath);
        
        $this->logger->info('CSV file uploaded', [
            'upload_id' => $uploadId,
            'filename' => $file['name'],
            'file_size' => $file['size'],
            'user_id' => $currentUser['user_id']
        ]);
        
        return [
            'success' => true,
            'upload_id' => $uploadId,
            'filename' => $file['name'],
            'file_size' => $file['size'],
            'message' => 'File uploaded successfully. Validation in progress.'
        ];
    }
    
    /**
     * CSV検証（非同期）
     */
    private function validateCSVAsync($uploadId, $filePath) {
        // 処理開始マーク
        $this->updateCSVUploadStatus($uploadId, 'processing');
        
        try {
            $handle = fopen($filePath, 'r');
            if (!$handle) {
                throw new Exception('Cannot open CSV file');
            }
            
            $headers = fgetcsv($handle);
            $rowNumber = 1;
            $validRows = 0;
            $errorRows = 0;
            
            // 必須フィールド定義
            $requiredFields = ['title', 'price', 'category_id', 'description'];
            $fieldMapping = array_flip($headers);
            
            // ヘッダー検証
            $missingFields = array_diff($requiredFields, $headers);
            if (!empty($missingFields)) {
                throw new Exception('Missing required fields: ' . implode(', ', $missingFields));
            }
            
            while (($row = fgetcsv($handle)) !== false) {
                $rowNumber++;
                
                // 行データ検証
                $validationResult = $this->validateCSVRow($row, $fieldMapping);
                
                // データベースに保存
                $this->saveCSVRowData($uploadId, $rowNumber, $row, $headers, $validationResult);
                
                if ($validationResult['is_valid']) {
                    $validRows++;
                } else {
                    $errorRows++;
                }
            }
            
            fclose($handle);
            
            // 処理完了
            $this->updateCSVUploadStatus($uploadId, 'completed', [
                'total_rows' => $rowNumber - 1,
                'valid_rows' => $validRows,
                'error_rows' => $errorRows
            ]);
            
        } catch (Exception $e) {
            $this->updateCSVUploadStatus($uploadId, 'failed', [
                'validation_errors' => [['message' => $e->getMessage()]]
            ]);
        }
    }
    
    /**
     * CSV行データ検証
     */
    private function validateCSVRow($row, $fieldMapping) {
        $errors = [];
        $warnings = [];
        
        // 必須フィールドチェック
        $title = $row[$fieldMapping['title']] ?? '';
        $price = $row[$fieldMapping['price']] ?? '';
        $categoryId = $row[$fieldMapping['category_id']] ?? '';
        
        if (empty($title)) {
            $errors[] = 'Title is required';
        } elseif (strlen($title) > 80) {
            $warnings[] = 'Title may be too long for eBay (max 80 characters)';
        }
        
        if (empty($price)) {
            $errors[] = 'Price is required';
        } elseif (!is_numeric($price) || $price <= 0) {
            $errors[] = 'Price must be a positive number';
        } elseif ($price > 99999) {
            $warnings[] = 'Price is very high, please verify';
        }
        
        if (empty($categoryId)) {
            $errors[] = 'Category ID is required';
        } elseif (!preg_match('/^\d+$/', $categoryId)) {
            $errors[] = 'Category ID must be numeric';
        }
        
        // 画像URL検証
        $images = $row[$fieldMapping['images']] ?? '';
        if (!empty($images)) {
            $imageUrls = explode(',', $images);
            foreach ($imageUrls as $url) {
                $url = trim($url);
                if (!filter_var($url, FILTER_VALIDATE_URL)) {
                    $warnings[] = "Invalid image URL: {$url}";
                }
            }
        }
        
        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        ];
    }
    
    /**
     * スケジュール作成
     */
    private function createSchedule() {
        $input = $this->getJsonInput();
        $currentUser = getCurrentUser();
        
        $requiredFields = ['name', 'frequency_type', 'frequency_details'];
        foreach ($requiredFields as $field) {
            if (empty($input[$field])) {
                throw new Exception("Required field missing: {$field}");
            }
        }
        
        // 次回実行時刻計算
        $nextExecution = $this->calculateNextExecution($input['frequency_type'], $input['frequency_details']);
        
        $sql = "
            INSERT INTO listing_schedules (
                name, description, frequency_type, frequency_details,
                random_items_min, random_items_max, random_interval_min, random_interval_max,
                random_price_variation, timing_mode, marketplace,
                next_execution_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $input['name'],
            $input['description'] ?? '',
            $input['frequency_type'],
            json_encode($input['frequency_details']),
            $input['random_items_min'] ?? 1,
            $input['random_items_max'] ?? 10,
            $input['random_interval_min'] ?? 30,
            $input['random_interval_max'] ?? 180,
            $input['random_price_variation'] ?? 0,
            $input['timing_mode'] ?? 'random',
            $input['marketplace'] ?? 'ebay',
            $nextExecution,
            $currentUser['user_id']
        ]);
        
        $scheduleId = $stmt->fetchColumn();
        
        $this->logger->info('Schedule created', [
            'schedule_id' => $scheduleId,
            'name' => $input['name'],
            'frequency_type' => $input['frequency_type'],
            'next_execution' => $nextExecution,
            'created_by' => $currentUser['user_id']
        ]);
        
        return [
            'success' => true,
            'schedule_id' => $scheduleId,
            'message' => 'Schedule created successfully',
            'next_execution_at' => $nextExecution
        ];
    }
    
    /**
     * eBay出品データ準備
     */
    private function prepareEbayItemData($listing) {
        $images = [];
        if (!empty($listing['images'])) {
            $imageData = json_decode($listing['images'], true);
            if (is_array($imageData)) {
                $images = $imageData;
            }
        }
        
        return [
            'title' => $listing['title'],
            'description' => $listing['description'] ?? '',
            'price' => $listing['price_usd'] ?? ($listing['price_jpy'] / 150), // 概算USD変換
            'category_id' => $listing['category_id'] ?? '9355', // デフォルトカテゴリ
            'condition_id' => $listing['condition_id'] ?? '1000',
            'listing_type' => $listing['listing_type'] ?? 'FixedPriceItem',
            'duration' => 'Days_' . ($listing['duration'] ?? 7),
            'quantity' => $listing['quantity'] ?? 1,
            'images' => $images,
            'returns_accepted' => true,
            'shipping_cost' => '0.00',
            'paypal_email' => $_ENV['PAYPAL_EMAIL'] ?? 'seller@example.com'
        ];
    }
    
    /**
     * 次回実行時刻計算
     */
    private function calculateNextExecution($frequencyType, $frequencyDetails) {
        $now = new DateTime();
        $next = clone $now;
        
        switch ($frequencyType) {
            case 'daily':
                $next->modify('+1 day');
                if (isset($frequencyDetails['hour'])) {
                    $next->setTime($frequencyDetails['hour'], $frequencyDetails['minute'] ?? 0);
                }
                break;
                
            case 'weekly':
                $targetDays = $frequencyDetails['days'] ?? [1]; // デフォルト月曜日
                $currentDay = (int)$now->format('N'); // 1=月曜日
                
                $nextDay = null;
                foreach ($targetDays as $day) {
                    if ($day > $currentDay) {
                        $nextDay = $day;
                        break;
                    }
                }
                
                if ($nextDay === null) {
                    $nextDay = min($targetDays);
                    $next->modify('+1 week');
                }
                
                $daysToAdd = $nextDay - $currentDay;
                if ($daysToAdd > 0) {
                    $next->modify("+{$daysToAdd} days");
                }
                
                $next->setTime($frequencyDetails['hour'] ?? 20, $frequencyDetails['minute'] ?? 0);
                break;
                
            case 'monthly':
                $next->modify('+1 month');
                $targetDay = $frequencyDetails['day'] ?? 1;
                $next->setDate($next->format('Y'), $next->format('n'), $targetDay);
                $next->setTime($frequencyDetails['hour'] ?? 20, $frequencyDetails['minute'] ?? 0);
                break;
        }
        
        return $next->format('Y-m-d H:i:s');
    }
    
    // ヘルパーメソッド
    private function getFilters() {
        return [
            'status' => $_GET['status'] ?? '',
            'marketplace' => $_GET['marketplace'] ?? '',
            'scheduled_only' => $_GET['scheduled_only'] ?? '',
            'search' => $_GET['search'] ?? ''
        ];
    }
    
    private function getPagination() {
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(100, max(10, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        
        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => $offset
        ];
    }
    
    private function getJsonInput() {
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input');
        }
        return $input;
    }
    
    private function updateListingStatus($listingId, $status, $additionalFields = []) {
        $setParts = ['status = ?', 'updated_at = NOW()'];
        $params = [$status];
        
        foreach ($additionalFields as $field => $value) {
            if ($value === 'NOW()' || strpos($value, 'retry_count + 1') !== false) {
                $setParts[] = "{$field} = {$value}";
            } else {
                $setParts[] = "{$field} = ?";
                $params[] = $value;
            }
        }
        
        $params[] = $listingId;
        
        $sql = "UPDATE listing_queue SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    private function updateCSVUploadStatus($uploadId, $status, $additionalData = []) {
        $setParts = ['status = ?', 'updated_at = NOW()'];
        $params = [$status];
        
        if ($status === 'processing') {
            $setParts[] = 'processing_started_at = NOW()';
        } elseif (in_array($status, ['completed', 'failed'])) {
            $setParts[] = 'processing_completed_at = NOW()';
        }
        
        foreach ($additionalData as $field => $value) {
            $setParts[] = "{$field} = ?";
            $params[] = is_array($value) ? json_encode($value) : $value;
        }
        
        $params[] = $uploadId;
        
        $sql = "UPDATE csv_uploads SET " . implode(', ', $setParts) . " WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    private function saveCSVRowData($uploadId, $rowNumber, $row, $headers, $validationResult) {
        $rawData = array_combine($headers, $row);
        
        $sql = "
            INSERT INTO csv_row_data (upload_id, row_number, raw_data, is_valid, validation_errors, warnings)
            VALUES (?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $uploadId,
            $rowNumber,
            json_encode($rawData),
            $validationResult['is_valid'],
            json_encode($validationResult['errors']),
            json_encode($validationResult['warnings'])
        ]);
    }
    
    private function enqueueListing($listingIds) {
        // Redis キューに追加（非同期処理用）
        try {
            if (class_exists('Redis')) {
                $redis = new Redis();
                $redis->connect('127.0.0.1', 6379);
                
                foreach ($listingIds as $listingId) {
                    $job = [
                        'listing_id' => $listingId,
                        'action' => 'process_listing',
                        'created_at' => time()
                    ];
                    $redis->lpush('listing_queue', json_encode($job));
                }
                
                $redis->close();
            }
        } catch (Exception $e) {
            $this->logger->error('Failed to enqueue listings', [
                'error' => $e->getMessage(),
                'listing_ids' => $listingIds
            ]);
        }
    }
    
    private function sendResponse($data) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    
    private function sendErrorResponse($message, $statusCode = 400) {
        http_response_code($statusCode);
        echo json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => time()
        ], JSON_UNESCAPED_UNICODE);
    }
    
    // 省略されたメソッドの簡易実装
    private function getCSVTemplate() {
        return ['success' => true, 'message' => 'CSV template generation - TODO'];
    }
    
    private function downloadYahooData() {
        return ['success' => true, 'message' => 'Yahoo data download - TODO'];
    }
    
    private function getSchedules() {
        return ['success' => true, 'message' => 'Get schedules - TODO'];
    }
    
    private function getEbayItems() {
        return ['success' => true, 'message' => 'Get eBay items - TODO'];
    }
    
    private function getListingTemplates() {
        return ['success' => true, 'message' => 'Get templates - TODO'];
    }
}

// API実行
$api = new ListingAPI();
$api->handleRequest();
