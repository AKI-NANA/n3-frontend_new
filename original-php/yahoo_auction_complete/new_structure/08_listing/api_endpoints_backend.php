<?php
/**
 * 高度設定UI - バックエンドAPI実装
 * 
 * 機能:
 * - アカウント管理API（CRUD操作）
 * - スケジュール管理API（複雑な設定の保存・取得）
 * - リアルタイム状況取得API
 * - 設定バリデーション・プレビューAPI
 */

// 共通設定
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * メイン API コントローラークラス
 */
class AdvancedListingAPIController {
    private $pdo;
    private $randomEngine;
    
    public function __construct() {
        $this->pdo = $this->getDbConnection();
        require_once(__DIR__ . '/AdvancedRandomizationEngine.php');
        $this->randomEngine = new AdvancedRandomizationEngine($this->pdo);
    }
    
    /**
     * APIルーティング処理
     */
    public function handleRequest() {
        try {
            $method = $_SERVER['REQUEST_METHOD'];
            $path = $_SERVER['PATH_INFO'] ?? $_SERVER['REQUEST_URI'];
            $path = parse_url($path, PHP_URL_PATH);
            $pathParts = array_filter(explode('/', $path));
            
            // パスの正規化
            $resource = $pathParts[count($pathParts) - 1] ?? '';
            $id = isset($pathParts[count($pathParts)]) && is_numeric($pathParts[count($pathParts)]) 
                ? intval($pathParts[count($pathParts)]) : null;
            
            switch ($resource) {
                case 'accounts':
                    return $this->handleAccountsAPI($method, $id);
                
                case 'schedules':
                    return $this->handleSchedulesAPI($method, $id);
                    
                case 'execution-status':
                    return $this->handleExecutionStatusAPI($method);
                    
                case 'preview':
                    return $this->handlePreviewAPI($method);
                    
                case 'statistics':
                    return $this->handleStatisticsAPI($method);
                    
                default:
                    throw new Exception('無効なAPIエンドポイントです');
            }
            
        } catch (Exception $e) {
            return $this->errorResponse($e->getMessage(), 400);
        }
    }
    
    // ==========================================
    // アカウント管理API
    // ==========================================
    
    /**
     * アカウント管理API処理
     */
    private function handleAccountsAPI($method, $id = null) {
        switch ($method) {
            case 'GET':
                return $id ? $this->getAccount($id) : $this->getAccounts();
                
            case 'POST':
                return $this->createAccount();
                
            case 'PUT':
                if (!$id) throw new Exception('アカウントIDが必要です');
                return $this->updateAccount($id);
                
            case 'DELETE':
                if (!$id) throw new Exception('アカウントIDが必要です');
                return $this->deleteAccount($id);
                
            default:
                throw new Exception('サポートされていないメソッドです');
        }
    }
    
    /**
     * アカウント一覧取得
     */
    private function getAccounts() {
        $sql = "
        SELECT 
            ma.*,
            COALESCE(usage.hourly_usage_percent, 0) as hourly_usage_percent,
            COALESCE(usage.current_hourly, 0) as current_hourly_count,
            COALESCE(usage.max_hourly, 0) as max_hourly_limit,
            COALESCE(stats.total_executions, 0) as total_executions_today,
            COALESCE(stats.total_successful, 0) as successful_listings_today
        FROM marketplace_accounts ma
        LEFT JOIN account_usage_summary usage ON ma.id = usage.id
        LEFT JOIN (
            SELECT 
                account_id,
                COUNT(*) as total_executions,
                SUM(successful_listings) as total_successful
            FROM listing_execution_logs 
            WHERE DATE(created_at) = CURRENT_DATE
            GROUP BY account_id
        ) stats ON ma.id = stats.account_id
        ORDER BY ma.account_name, ma.marketplace_type
        ";
        
        $stmt = $this->pdo->query($sql);
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->successResponse([
            'accounts' => $accounts,
            'total' => count($accounts),
            'active_accounts' => count(array_filter($accounts, fn($a) => $a['account_status'] === 'active'))
        ]);
    }
    
    /**
     * 単一アカウント取得
     */
    private function getAccount($id) {
        $sql = "
        SELECT 
            ma.*,
            usage.hourly_usage_percent,
            usage.current_hourly,
            usage.max_hourly
        FROM marketplace_accounts ma
        LEFT JOIN account_usage_summary usage ON ma.id = usage.id
        WHERE ma.id = ?
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$id]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$account) {
            return $this->errorResponse('アカウントが見つかりません', 404);
        }
        
        // 最近の実行履歴も取得
        $historySQL = "
        SELECT * FROM listing_execution_logs 
        WHERE account_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
        ";
        $historyStmt = $this->pdo->prepare($historySQL);
        $historyStmt->execute([$id]);
        $account['recent_executions'] = $historyStmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->successResponse(['account' => $account]);
    }
    
    /**
     * 新規アカウント作成
     */
    private function createAccount() {
        $input = $this->getJsonInput();
        
        // バリデーション
        $this->validateAccountInput($input);
        
        $sql = "
        INSERT INTO marketplace_accounts (
            account_name, marketplace_type, api_credentials, rate_limits, account_status
        ) VALUES (?, ?, ?, ?, ?)
        RETURNING *
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $input['account_name'],
            $input['marketplace_type'],
            json_encode($input['api_credentials']),
            json_encode($input['rate_limits']),
            $input['account_status'] ?? 'active'
        ]);
        
        $newAccount = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $this->successResponse([
            'message' => 'アカウントが正常に作成されました',
            'account' => $newAccount
        ], 201);
    }
    
    /**
     * アカウント更新
     */
    private function updateAccount($id) {
        $input = $this->getJsonInput();
        
        // 現在のアカウント取得
        $currentAccount = $this->getAccountById($id);
        if (!$currentAccount) {
            return $this->errorResponse('アカウントが見つかりません', 404);
        }
        
        // 部分更新対応
        $updates = [];
        $params = [];
        
        if (isset($input['account_name'])) {
            $updates[] = "account_name = ?";
            $params[] = $input['account_name'];
        }
        
        if (isset($input['api_credentials'])) {
            $updates[] = "api_credentials = ?";
            $params[] = json_encode($input['api_credentials']);
        }
        
        if (isset($input['rate_limits'])) {
            $updates[] = "rate_limits = ?";
            $params[] = json_encode($input['rate_limits']);
        }
        
        if (isset($input['account_status'])) {
            $updates[] = "account_status = ?";
            $params[] = $input['account_status'];
        }
        
        if (empty($updates)) {
            return $this->errorResponse('更新するデータがありません', 400);
        }
        
        $updates[] = "updated_at = NOW()";
        $params[] = $id;
        
        $sql = "UPDATE marketplace_accounts SET " . implode(', ', $updates) . " WHERE id = ? RETURNING *";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $updatedAccount = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $this->successResponse([
            'message' => 'アカウントが更新されました',
            'account' => $updatedAccount
        ]);
    }
    
    // ==========================================
    // スケジュール管理API
    // ==========================================
    
    /**
     * スケジュール管理API処理
     */
    private function handleSchedulesAPI($method, $id = null) {
        switch ($method) {
            case 'GET':
                return $id ? $this->getSchedule($id) : $this->getSchedules();
                
            case 'POST':
                return $this->createSchedule();
                
            case 'PUT':
                if (!$id) throw new Exception('スケジュールIDが必要です');
                return $this->updateSchedule($id);
                
            case 'DELETE':
                if (!$id) throw new Exception('スケジュールIDが必要です');
                return $this->deleteSchedule($id);
                
            default:
                throw new Exception('サポートされていないメソッドです');
        }
    }
    
    /**
     * スケジュール一覧取得
     */
    private function getSchedules() {
        $sql = "
        SELECT 
            als.*,
            ma.account_name,
            ma.marketplace_type,
            ma.account_status,
            recent_log.last_execution_status,
            recent_log.last_execution_items,
            recent_log.last_execution_success_rate
        FROM advanced_listing_schedules als
        JOIN marketplace_accounts ma ON als.account_id = ma.id
        LEFT JOIN (
            SELECT DISTINCT ON (schedule_id)
                schedule_id,
                status as last_execution_status,
                total_attempted_items as last_execution_items,
                CASE 
                    WHEN total_attempted_items > 0 
                    THEN ROUND(successful_listings::decimal / total_attempted_items * 100, 2)
                    ELSE 0 
                END as last_execution_success_rate
            FROM listing_execution_logs
            WHERE completed_at IS NOT NULL
            ORDER BY schedule_id, completed_at DESC
        ) recent_log ON als.id = recent_log.schedule_id
        ORDER BY als.is_active DESC, als.schedule_name
        ";
        
        $stmt = $this->pdo->query($sql);
        $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $this->successResponse([
            'schedules' => $schedules,
            'total' => count($schedules),
            'active_schedules' => count(array_filter($schedules, fn($s) => $s['is_active']))
        ]);
    }
    
    /**
     * 新規スケジュール作成
     */
    private function createSchedule() {
        $input = $this->getJsonInput();
        
        // バリデーション
        $this->validateScheduleInput($input);
        
        try {
            $this->pdo->beginTransaction();
            
            $sql = "
            INSERT INTO advanced_listing_schedules (
                schedule_name, account_id, randomization_config, 
                time_constraints, product_selection_rules, api_control_settings,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $input['schedule_name'],
                $input['account_id'],
                json_encode($input['randomization_config']),
                json_encode($input['time_constraints']),
                json_encode($input['product_selection_rules']),
                json_encode($input['api_control_settings']),
                $input['is_active'] ?? true
            ]);
            
            $newSchedule = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 次回実行時刻を計算して更新
            $nextExecution = $this->calculateNextExecution($newSchedule);
            if ($nextExecution) {
                $updateSQL = "UPDATE advanced_listing_schedules SET next_scheduled_at = ? WHERE id = ?";
                $updateStmt = $this->pdo->prepare($updateSQL);
                $updateStmt->execute([$nextExecution->format('Y-m-d H:i:s'), $newSchedule['id']]);
                $newSchedule['next_scheduled_at'] = $nextExecution->format('Y-m-d H:i:s');
            }
            
            $this->pdo->commit();
            
            return $this->successResponse([
                'message' => 'スケジュールが作成されました',
                'schedule' => $newSchedule
            ], 201);
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    // ==========================================
    // プレビュー・統計API
    // ==========================================
    
    /**
     * スケジュールプレビューAPI
     */
    private function handlePreviewAPI($method) {
        if ($method !== 'POST') {
            throw new Exception('POST メソッドのみサポートされています');
        }
        
        $input = $this->getJsonInput();
        
        // プレビュー期間（デフォルト7日間）
        $previewDays = $input['preview_days'] ?? 7;
        $scheduleConfig = $input['schedule_config'];
        
        $preview = $this->generateSchedulePreview($scheduleConfig, $previewDays);
        
        return $this->successResponse([
            'preview' => $preview,
            'preview_days' => $previewDays,
            'total_executions' => count($preview)
        ]);
    }
    
    /**
     * 統計情報API
     */
    private function handleStatisticsAPI($method) {
        if ($method !== 'GET') {
            throw new Exception('GET メソッドのみサポートされています');
        }
        
        $period = $_GET['period'] ?? '7d'; // 7d, 30d, 3m
        
        $stats = [
            'execution_summary' => $this->getExecutionSummary($period),
            'account_performance' => $this->getAccountPerformance($period),
            'hourly_distribution' => $this->getHourlyDistribution($period),
            'success_trends' => $this->getSuccessTrends($period)
        ];
        
        return $this->successResponse($stats);
    }
    
    // ==========================================
    // ヘルパーメソッド
    // ==========================================
    
    /**
     * 次回実行時刻計算
     */
    private function calculateNextExecution($schedule) {
        try {
            $timeConstraints = json_decode($schedule['time_constraints'], true);
            $randomConfig = json_decode($schedule['randomization_config'], true);
            
            $now = new DateTime();
            $tomorrow = clone $now;
            $tomorrow->add(new DateInterval('P1D'));
            
            return $this->randomEngine->generateWeightedScheduleTime($timeConstraints, $tomorrow);
            
        } catch (Exception $e) {
            error_log("次回実行時刻計算エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * スケジュールプレビュー生成
     */
    private function generateSchedulePreview($config, $days) {
        $preview = [];
        $startDate = new DateTime();
        
        for ($i = 0; $i < $days; $i++) {
            $targetDate = clone $startDate;
            $targetDate->add(new DateInterval("P{$i}D"));
            
            try {
                $scheduledTime = $this->randomEngine->generateWeightedScheduleTime(
                    $config['time_constraints'], 
                    $targetDate
                );
                
                $listingCount = $this->randomEngine->generateListingCount(
                    $config['randomization_config']['listing_count']
                );
                
                $preview[] = [
                    'date' => $targetDate->format('Y-m-d'),
                    'scheduled_time' => $scheduledTime->format('H:i:s'),
                    'estimated_items' => $listingCount,
                    'day_of_week' => $targetDate->format('l'),
                    'day_weight' => $config['randomization_config']['day_of_week_weights'][$targetDate->format('N')] ?? 1.0
                ];
                
            } catch (Exception $e) {
                // スキップ
            }
        }
        
        return $preview;
    }
    
    /**
     * バリデーション関数群
     */
    private function validateAccountInput($input) {
        if (empty($input['account_name'])) {
            throw new Exception('アカウント名は必須です');
        }
        
        if (empty($input['marketplace_type'])) {
            throw new Exception('マーケットプレイス種別は必須です');
        }
        
        $allowedTypes = ['ebay', 'yahoo', 'mercari'];
        if (!in_array($input['marketplace_type'], $allowedTypes)) {
            throw new Exception('無効なマーケットプレイス種別です');
        }
        
        if (empty($input['api_credentials'])) {
            throw new Exception('API認証情報は必須です');
        }
    }
    
    private function validateScheduleInput($input) {
        $required = [
            'schedule_name', 'account_id', 'randomization_config', 
            'time_constraints', 'product_selection_rules', 'api_control_settings'
        ];
        
        foreach ($required as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                throw new Exception("必須フィールドが不足しています: {$field}");
            }
        }
        
        // アカウント存在確認
        if (!$this->getAccountById($input['account_id'])) {
            throw new Exception('指定されたアカウントが存在しません');
        }
    }
    
    /**
     * ユーティリティ関数群
     */
    private function getJsonInput() {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('無効なJSON形式です');
        }
        
        return $data ?: [];
    }
    
    private function successResponse($data, $statusCode = 200) {
        http_response_code($statusCode);
        return json_encode([
            'success' => true,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    }
    
    private function errorResponse($message, $statusCode = 400) {
        http_response_code($statusCode);
        return json_encode([
            'success' => false,
            'error' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_UNESCAPED_UNICODE);
    }
    
    private function getAccountById($id) {
        $stmt = $this->pdo->prepare("SELECT * FROM marketplace_accounts WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    private function getDbConnection() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_