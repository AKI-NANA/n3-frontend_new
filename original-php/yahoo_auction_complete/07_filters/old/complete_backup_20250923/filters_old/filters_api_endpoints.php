<?php
/**
 * NAGANO-3 フィルターシステム API エンドポイント
 * 
 * 機能: RESTful API・JSON応答・権限チェック・リクエスト処理
 * 依存: filters_main_controller.php, filters_permission_manager.php
 * 作成: 2024年版 NAGANO-3準拠
 */

// 必要なクラスを読み込み
require_once __DIR__ . '/filters_main_controller.php';
require_once __DIR__ . '/filters_permission_manager.php';
require_once __DIR__ . '/filters_ai_integration.php';

class FiltersApiEndpoints {
    
    private $main_controller;
    private $permission_manager;
    private $ai_integration;
    private $logger;
    
    // API設定
    private $api_version = '1.0';
    private $max_batch_size = 100;
    private $rate_limit_requests = 1000; // 1時間あたり
    
    public function __construct() {
        $this->main_controller = new FiltersMainController();
        $this->permission_manager = new FiltersPermissionManager();
        $this->ai_integration = new FiltersAiIntegration();
        $this->logger = $this->initializeLogger();
        
        // APIレスポンス設定
        header('Content-Type: application/json; charset=UTF-8');
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
        
        // OPTIONSリクエスト処理（CORS プリフライト）
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    
    // ===========================================
    // フィルター実行API
    // ===========================================
    
    /**
     * フィルター実行処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleFilterExecution($method, $input_data, $user) {
        if ($method !== 'POST') {
            return $this->errorResponse('POSTメソッドが必要です', 405);
        }
        
        try {
            // 入力検証
            $validation = $this->validateFilterExecutionInput($input_data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message'], 400);
            }
            
            $product_ids = $input_data['product_ids'];
            $user_id = $user['user_id'];
            $options = $input_data['options'] ?? [];
            
            // フィルター実行
            $result = $this->main_controller->execute_filters_for_listing($product_ids, $user_id, $options);
            
            return $this->successResponse($result, '商品フィルタリングが完了しました');
            
        } catch (Exception $e) {
            return $this->errorResponse('フィルター実行エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * バッチフィルター実行処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleBatchFilterExecution($method, $input_data, $user) {
        if ($method !== 'POST') {
            return $this->errorResponse('POSTメソッドが必要です', 405);
        }
        
        try {
            // バッチサイズ制限チェック
            $product_ids = $input_data['product_ids'] ?? [];
            if (count($product_ids) > $this->max_batch_size) {
                return $this->errorResponse(
                    "バッチサイズ上限超過: " . count($product_ids) . " > " . $this->max_batch_size,
                    400
                );
            }
            
            // 非同期処理フラグ
            $async = $input_data['async'] ?? false;
            
            if ($async) {
                // 非同期処理（実際の実装では Queue システムを使用）
                $job_id = $this->scheduleAsyncFilterExecution($product_ids, $user['user_id'], $input_data);
                
                return $this->successResponse([
                    'job_id' => $job_id,
                    'status' => 'queued',
                    'estimated_completion_minutes' => ceil(count($product_ids) / 100)
                ], 'バッチ処理をキューに追加しました');
            } else {
                // 同期処理
                return $this->handleFilterExecution($method, $input_data, $user);
            }
            
        } catch (Exception $e) {
            return $this->errorResponse('バッチフィルター実行エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * フィルターステータス取得
     * 
     * @param string $method HTTPメソッド
     * @param array $params パラメータ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleFilterStatus($method, $params, $user) {
        if ($method !== 'GET') {
            return $this->errorResponse('GETメソッドが必要です', 405);
        }
        
        try {
            $batch_id = $params['batch_id'] ?? null;
            $days = intval($params['days'] ?? 7);
            
            if ($batch_id) {
                // 特定バッチの状況
                $status = $this->getFilterBatchStatus($batch_id);
            } else {
                // 全体統計
                $status = $this->main_controller->getFilterStatistics($days);
            }
            
            return $this->successResponse($status, 'フィルターステータスを取得しました');
            
        } catch (Exception $e) {
            return $this->errorResponse('ステータス取得エラー: ' . $e->getMessage(), 500);
        }
    }
    
    // ===========================================
    // NGワード管理API
    // ===========================================
    
    /**
     * NGワード管理処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $params パラメータ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleNGWordsManagement($method, $input_data, $params, $user) {
        // 権限チェック
        if (!$this->permission_manager->hasPermission($user, 'ngwords_manage')) {
            return $this->errorResponse('NGワード管理権限がありません', 403);
        }
        
        switch ($method) {
            case 'GET':
                return $this->getNGWordsList($params);
                
            case 'POST':
                return $this->createNGWord($input_data, $user);
                
            case 'PUT':
                return $this->updateNGWord($params, $input_data, $user);
                
            case 'DELETE':
                return $this->deleteNGWord($params, $user);
                
            default:
                return $this->errorResponse('サポートされていないメソッドです', 405);
        }
    }
    
    /**
     * NGワード一覧取得
     * 
     * @param array $params パラメータ
     * @return array レスポンス
     */
    private function getNGWordsList($params) {
        try {
            $limit = intval($params['limit'] ?? 100);
            $offset = intval($params['offset'] ?? 0);
            $category = $params['category'] ?? null;
            $level = $params['level'] ?? null;
            
            // データサービス経由で取得
            $ng_words = $this->main_controller->data_service->getActiveNGWords();
            
            // フィルタリング
            if ($category) {
                $ng_words = array_filter($ng_words, function($word) use ($category) {
                    return $word['category'] === $category;
                });
            }
            
            if ($level) {
                $ng_words = array_filter($ng_words, function($word) use ($level) {
                    return $word['level'] === $level;
                });
            }
            
            // ページネーション
            $total = count($ng_words);
            $paginated = array_slice($ng_words, $offset, $limit);
            
            return $this->successResponse([
                'ng_words' => $paginated,
                'pagination' => [
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'pages' => ceil($total / $limit)
                ]
            ], 'NGワード一覧を取得しました');
            
        } catch (Exception $e) {
            return $this->errorResponse('NGワード取得エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * NGワード作成
     * 
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function createNGWord($input_data, $user) {
        try {
            // 入力検証
            $validation = $this->validateNGWordInput($input_data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message'], 400);
            }
            
            // NGワードデータ準備
            $ng_word_data = [
                'word' => $input_data['word'],
                'level' => $input_data['level'] ?? 'complete_ng',
                'category' => $input_data['category'] ?? null,
                'auto_generated' => false,
                'created_by' => $user['username'],
                'metadata' => $input_data['metadata'] ?? []
            ];
            
            // データベース挿入
            $result = $this->main_controller->data_service->insertNGWord($ng_word_data);
            
            if ($result) {
                return $this->successResponse([
                    'ng_word' => $ng_word_data,
                    'created_at' => date('c')
                ], 'NGワードを追加しました');
            } else {
                throw new Exception('NGワードの追加に失敗しました');
            }
            
        } catch (Exception $e) {
            return $this->errorResponse('NGワード追加エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * NGワード更新
     * 
     * @param array $params パラメータ
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function updateNGWord($params, $input_data, $user) {
        try {
            $ng_word_id = intval($params['id'] ?? 0);
            if ($ng_word_id <= 0) {
                return $this->errorResponse('有効なNGワードIDが必要です', 400);
            }
            
            // 更新データ準備
            $update_data = [];
            $allowed_fields = ['word', 'level', 'category', 'is_active'];
            
            foreach ($allowed_fields as $field) {
                if (isset($input_data[$field])) {
                    $update_data[$field] = $input_data[$field];
                }
            }
            
            if (empty($update_data)) {
                return $this->errorResponse('更新対象フィールドが指定されていません', 400);
            }
            
            // メタデータ更新
            if (isset($input_data['metadata'])) {
                $update_data['metadata'] = $input_data['metadata'];
            }
            
            // データベース更新
            $result = $this->main_controller->data_service->updateNGWord($ng_word_id, $update_data);
            
            if ($result) {
                return $this->successResponse([
                    'ng_word_id' => $ng_word_id,
                    'updated_fields' => array_keys($update_data),
                    'updated_at' => date('c')
                ], 'NGワードを更新しました');
            } else {
                throw new Exception('NGワードの更新に失敗しました');
            }
            
        } catch (Exception $e) {
            return $this->errorResponse('NGワード更新エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * NGワード削除（論理削除）
     * 
     * @param array $params パラメータ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function deleteNGWord($params, $user) {
        try {
            $ng_word_id = intval($params['id'] ?? 0);
            if ($ng_word_id <= 0) {
                return $this->errorResponse('有効なNGワードIDが必要です', 400);
            }
            
            // 論理削除実行
            $result = $this->main_controller->data_service->updateNGWord($ng_word_id, [
                'is_active' => false,
                'deleted_at' => date('Y-m-d H:i:s'),
                'deleted_by' => $user['user_id']
            ]);
            
            if ($result) {
                return $this->successResponse([
                    'ng_word_id' => $ng_word_id,
                    'deleted_at' => date('c')
                ], 'NGワードを削除しました');
            } else {
                throw new Exception('NGワードの削除に失敗しました');
            }
            
        } catch (Exception $e) {
            return $this->errorResponse('NGワード削除エラー: ' . $e->getMessage(), 500);
        }
    }
    
    // ===========================================
    // 確認待ち管理API
    // ===========================================
    
    /**
     * 確認待ち管理処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $params パラメータ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleReviewsManagement($method, $input_data, $params, $user) {
        // 権限チェック
        if (!$this->permission_manager->hasPermission($user, 'reviews_access')) {
            return $this->errorResponse('確認待ち管理権限がありません', 403);
        }
        
        switch ($method) {
            case 'GET':
                return $this->getReviewsList($params);
                
            case 'PUT':
                return $this->updateReviewStatus($params, $input_data, $user);
                
            default:
                return $this->errorResponse('サポートされていないメソッドです', 405);
        }
    }
    
    /**
     * 確認待ち一覧取得
     * 
     * @param array $params パラメータ
     * @return array レスポンス
     */
    private function getReviewsList($params) {
        try {
            $status = $params['status'] ?? 'pending';
            $limit = intval($params['limit'] ?? 50);
            $category = $params['category'] ?? null;
            
            $reviews = $this->main_controller->getPendingReviews($status, $limit);
            
            // カテゴリフィルタリング
            if ($category) {
                $reviews['data']['reviews'] = array_filter(
                    $reviews['data']['reviews'], 
                    function($review) use ($category) {
                        return $review['reason_category'] === $category;
                    }
                );
            }
            
            return $this->successResponse($reviews['data'], '確認待ち一覧を取得しました');
            
        } catch (Exception $e) {
            return $this->errorResponse('確認待ち取得エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * 確認待ち承認処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleReviewApproval($method, $input_data, $user) {
        if ($method !== 'POST') {
            return $this->errorResponse('POSTメソッドが必要です', 405);
        }
        
        // 権限チェック
        if (!$this->permission_manager->hasPermission($user, 'reviews_approve')) {
            return $this->errorResponse('承認権限がありません', 403);
        }
        
        try {
            // 入力検証
            $validation = $this->validateReviewApprovalInput($input_data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message'], 400);
            }
            
            $review_id = $input_data['review_id'];
            $decision = $input_data['decision']; // approved/rejected
            $comment = $input_data['comment'] ?? '';
            
            // 承認処理実行
            $result = $this->main_controller->processReview(
                $review_id,
                $decision,
                $comment,
                $user['username']
            );
            
            return $this->successResponse($result['data'], $result['message']);
            
        } catch (Exception $e) {
            return $this->errorResponse('承認処理エラー: ' . $e->getMessage(), 500);
        }
    }
    
    // ===========================================
    // AI関連API
    // ===========================================
    
    /**
     * AI分析処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleAiAnalysis($method, $input_data, $user) {
        if ($method !== 'POST') {
            return $this->errorResponse('POSTメソッドが必要です', 405);
        }
        
        try {
            // 入力検証
            if (!isset($input_data['product_data'])) {
                return $this->errorResponse('product_data が必要です', 400);
            }
            
            $product_data = $input_data['product_data'];
            $analysis_config = $input_data['analysis_config'] ?? [];
            
            // AI分析実行
            $analysis_result = $this->ai_integration->analyzeProduct($product_data);
            
            return $this->successResponse($analysis_result, 'AI分析が完了しました');
            
        } catch (Exception $e) {
            return $this->errorResponse('AI分析エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * AI学習処理
     * 
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleAiLearning($method, $input_data, $user) {
        if ($method !== 'POST') {
            return $this->errorResponse('POSTメソッドが必要です', 405);
        }
        
        // 権限チェック
        if (!$this->permission_manager->hasPermission($user, 'ai_training')) {
            return $this->errorResponse('AI学習権限がありません', 403);
        }
        
        try {
            // 入力検証
            $validation = $this->validateAiLearningInput($input_data);
            if (!$validation['valid']) {
                return $this->errorResponse($validation['message'], 400);
            }
            
            $product_id = $input_data['product_id'];
            $human_judgment = $input_data['human_judgment'];
            $reason = $input_data['reason'];
            $ai_result = $input_data['ai_result'] ?? null;
            
            // 学習データ追加
            $result = $this->ai_integration->learnFromHumanJudgment(
                $product_id,
                $human_judgment,
                $reason,
                $ai_result
            );
            
            if ($result) {
                return $this->successResponse([
                    'learning_completed' => true,
                    'product_id' => $product_id,
                    'timestamp' => date('c')
                ], 'AI学習データを追加しました');
            } else {
                throw new Exception('学習データの追加に失敗しました');
            }
            
        } catch (Exception $e) {
            return $this->errorResponse('AI学習エラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * AI統計取得
     * 
     * @param string $method HTTPメソッド
     * @param array $params パラメータ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function handleAiStatistics($method, $params, $user) {
        if ($method !== 'GET') {
            return $this->errorResponse('GETメソッドが必要です', 405);
        }
        
        try {
            $period_days = intval($params['period_days'] ?? 30);
            
            $statistics = $this->ai_integration->getAiStatistics($period_days);
            
            return $this->successResponse($statistics, 'AI統計を取得しました');
            
        } catch (Exception $e) {
            return $this->errorResponse('AI統計取得エラー: ' . $e->getMessage(), 500);
        }
    }
    
    // ===========================================
    // ユーティリティメソッド
    // ===========================================
    
    /**
     * ルート解析
     * 
     * @return array ルート情報
     */
    private function parseRoute() {
        $uri = $_SERVER['REQUEST_URI'];
        $path = parse_url($uri, PHP_URL_PATH);
        
        // API パスを除去
        $path = preg_replace('/^\/api\/v\d+\/filters\//', '', $path);
        
        // パラメータ分離
        $segments = explode('/', trim($path, '/'));
        $endpoint = $segments[0] ?? '';
        
        // サブパス処理
        if (isset($segments[1])) {
            $endpoint .= '/' . $segments[1];
        }
        
        // クエリパラメータ取得
        $params = $_GET;
        
        // パス パラメータ追加
        if (isset($segments[2])) {
            $params['id'] = $segments[2];
        }
        
        return [
            'endpoint' => $endpoint,
            'params' => $params,
            'segments' => $segments
        ];
    }
    
    /**
     * 入力データ取得
     * 
     * @return array 入力データ
     */
    private function getInputData() {
        $method = $_SERVER['REQUEST_METHOD'];
        
        if (in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $content_type = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($content_type, 'application/json') !== false) {
                $raw_input = file_get_contents('php://input');
                $json_data = json_decode($raw_input, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception('JSON解析エラー: ' . json_last_error_msg());
                }
                
                return $json_data ?? [];
            } else {
                return $_POST;
            }
        }
        
        return [];
    }
    
    /**
     * 認証処理
     * 
     * @param array $route ルート情報
     * @param string $method HTTPメソッド
     * @return array 認証結果
     */
    private function authenticateRequest($route, $method) {
        // パブリックエンドポイントチェック
        $public_endpoints = ['health', 'version'];
        if (in_array($route['endpoint'], $public_endpoints)) {
            return [
                'success' => true,
                'user' => ['user_id' => 'public', 'username' => 'public', 'role' => 'public']
            ];
        }
        
        // API キーまたはセッション認証
        $api_key = $_SERVER['HTTP_X_API_KEY'] ?? '';
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        
        if ($api_key) {
            return $this->permission_manager->authenticateApiKey($api_key);
        } elseif ($auth_header) {
            return $this->permission_manager->authenticateToken($auth_header);
        } else {
            // セッション認証
            return $this->permission_manager->authenticateSession();
        }
    }
    
    /**
     * レート制限チェック
     * 
     * @return bool 制限内かどうか
     */
    private function checkRateLimit() {
        $client_ip = $this->getClientIp();
        $current_hour = date('YmdH');
        $cache_key = "rate_limit_{$client_ip}_{$current_hour}";
        
        // 簡易実装（実際にはRedisを使用）
        static $request_counts = [];
        
        if (!isset($request_counts[$cache_key])) {
            $request_counts[$cache_key] = 0;
        }
        
        $request_counts[$cache_key]++;
        
        return $request_counts[$cache_key] <= $this->rate_limit_requests;
    }
    
    /**
     * クライアントIP取得
     * 
     * @return string クライアントIP
     */
    private function getClientIp() {
        $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                if ($key === 'HTTP_X_FORWARDED_FOR') {
                    $ip = explode(',', $ip)[0];
                }
                return trim($ip);
            }
        }
        
        return 'unknown';
    }
    
    /**
     * リクエストID生成
     * 
     * @return string リクエストID
     */
    private function generateRequestId() {
        return 'req_' . date('Ymd_His') . '_' . substr(uniqid(), -8);
    }
    
    // ===========================================
    // バリデーション関数
    // ===========================================
    
    /**
     * フィルター実行入力検証
     * 
     * @param array $input_data 入力データ
     * @return array 検証結果
     */
    private function validateFilterExecutionInput($input_data) {
        if (!isset($input_data['product_ids']) || !is_array($input_data['product_ids'])) {
            return ['valid' => false, 'message' => 'product_ids が必要です（配列形式）'];
        }
        
        if (empty($input_data['product_ids'])) {
            return ['valid' => false, 'message' => 'product_ids は空にできません'];
        }
        
        if (count($input_data['product_ids']) > $this->max_batch_size) {
            return ['valid' => false, 'message' => "商品数が上限を超えています（最大{$this->max_batch_size}件）"];
        }
        
        foreach ($input_data['product_ids'] as $product_id) {
            if (!is_numeric($product_id) || $product_id <= 0) {
                return ['valid' => false, 'message' => "無効な商品ID: {$product_id}"];
            }
        }
        
        return ['valid' => true];
    }
    
    /**
     * NGワード入力検証
     * 
     * @param array $input_data 入力データ
     * @return array 検証結果
     */
    private function validateNGWordInput($input_data) {
        if (!isset($input_data['word']) || empty(trim($input_data['word']))) {
            return ['valid' => false, 'message' => 'word が必要です'];
        }
        
        $word = trim($input_data['word']);
        if (mb_strlen($word) > 255) {
            return ['valid' => false, 'message' => 'word は255文字以内で入力してください'];
        }
        
        $valid_levels = ['complete_ng', 'conditional_ng', 'requires_review'];
        $level = $input_data['level'] ?? 'complete_ng';
        if (!in_array($level, $valid_levels)) {
            return ['valid' => false, 'message' => 'level は ' . implode(', ', $valid_levels) . ' のいずれかを指定してください'];
        }
        
        return ['valid' => true];
    }
    
    /**
     * 確認待ち承認入力検証
     * 
     * @param array $input_data 入力データ
     * @return array 検証結果
     */
    private function validateReviewApprovalInput($input_data) {
        if (!isset($input_data['review_id']) || !is_numeric($input_data['review_id'])) {
            return ['valid' => false, 'message' => 'review_id が必要です（数値）'];
        }
        
        $valid_decisions = ['approved', 'rejected'];
        $decision = $input_data['decision'] ?? '';
        if (!in_array($decision, $valid_decisions)) {
            return ['valid' => false, 'message' => 'decision は approved または rejected を指定してください'];
        }
        
        return ['valid' => true];
    }
    
    /**
     * AI学習入力検証
     * 
     * @param array $input_data 入力データ
     * @return array 検証結果
     */
    private function validateAiLearningInput($input_data) {
        if (!isset($input_data['product_id']) || !is_numeric($input_data['product_id'])) {
            return ['valid' => false, 'message' => 'product_id が必要です（数値）'];
        }
        
        $valid_judgments = ['safe', 'dangerous', 'pending'];
        $judgment = $input_data['human_judgment'] ?? '';
        if (!in_array($judgment, $valid_judgments)) {
            return ['valid' => false, 'message' => 'human_judgment は ' . implode(', ', $valid_judgments) . ' のいずれかを指定してください'];
        }
        
        if (!isset($input_data['reason']) || empty(trim($input_data['reason']))) {
            return ['valid' => false, 'message' => 'reason が必要です'];
        }
        
        return ['valid' => true];
    }
    
    // ===========================================
    // レスポンス生成
    // ===========================================
    
    /**
     * 成功レスポンス
     * 
     * @param mixed $data データ
     * @param string $message メッセージ
     * @param int $code HTTPステータスコード
     * @return array レスポンス
     */
    private function successResponse($data = null, $message = 'Success', $code = 200) {
        http_response_code($code);
        
        return [
            'status' => 'success',
            'message' => $message,
            'data' => $data,
            'meta' => [
                'api_version' => $this->api_version,
                'timestamp' => date('c')
            ]
        ];
    }
    
    /**
     * エラーレスポンス
     * 
     * @param string $message エラーメッセージ
     * @param int $code HTTPステータスコード
     * @param string $request_id リクエストID
     * @return array レスポンス
     */
    private function errorResponse($message, $code = 400, $request_id = null) {
        http_response_code($code);
        
        return [
            'status' => 'error',
            'message' => $message,
            'error_code' => $code,
            'meta' => [
                'api_version' => $this->api_version,
                'timestamp' => date('c'),
                'request_id' => $request_id
            ]
        ];
    }
    
    /**
     * JSONレスポンス出力
     * 
     * @param array $response レスポンス配列
     */
    private function jsonResponse($response) {
        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }
    
    /**
     * ヘルスチェック処理
     * 
     * @param string $method HTTPメソッド
     * @return array レスポンス
     */
    private function handleHealthCheck($method) {
        if ($method !== 'GET') {
            return $this->errorResponse('GETメソッドが必要です', 405);
        }
        
        try {
            // データベース接続チェック
            $db_status = $this->main_controller->data_service->isConnected();
            
            // AI サービス チェック（簡易）
            $ai_status = class_exists('FiltersAiIntegration');
            
            $status = [
                'system' => 'operational',
                'database' => $db_status ? 'connected' : 'disconnected',
                'ai_service' => $ai_status ? 'available' : 'unavailable',
                'api_version' => $this->api_version,
                'server_time' => date('c'),
                'uptime' => $this->getSystemUptime()
            ];
            
            $overall_status = ($db_status && $ai_status) ? 'healthy' : 'degraded';
            
            return $this->successResponse($status, "システム状態: {$overall_status}");
            
        } catch (Exception $e) {
            return $this->errorResponse('ヘルスチェックエラー: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * バージョン情報処理
     * 
     * @param string $method HTTPメソッド
     * @return array レスポンス
     */
    private function handleVersionInfo($method) {
        if ($method !== 'GET') {
            return $this->errorResponse('GETメソッドが必要です', 405);
        }
        
        $version_info = [
            'api_version' => $this->api_version,
            'system_name' => 'NAGANO-3 フィルターシステム',
            'build_date' => '2024-12-15',
            'php_version' => PHP_VERSION,
            'supported_endpoints' => [
                'filters/execute',
                'filters/batch',
                'filters/status',
                'ngwords',
                'categories',
                'reviews',
                'ai/analyze',
                'ai/learn',
                'ai/statistics',
                'statistics',
                'settings',
                'health',
                'version'
            ]
        ];
        
        return $this->successResponse($version_info, 'バージョン情報を取得しました');
    }
    
    /**
     * システムアップタイム取得
     * 
     * @return string アップタイム
     */
    private function getSystemUptime() {
        if (function_exists('sys_getloadavg')) {
            return 'available';
        }
        return 'unknown';
    }
    
    /**
     * ログ初期化
     * 
     * @return object ログインスタンス
     */
    private function initializeLogger() {
        return new class {
            public function info($message, $context = []) {
                $this->log('INFO', $message, $context);
            }
            
            public function warning($message, $context = []) {
                $this->log('WARNING', $message, $context);
            }
            
            public function error($message, $context = []) {
                $this->log('ERROR', $message, $context);
            }
            
            private function log($level, $message, $context) {
                $timestamp = date('Y-m-d H:i:s');
                $context_str = !empty($context) ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
                error_log("[{$timestamp}] FILTERS_API.{$level}: {$message}{$context_str}");
            }
        };
    }
}

// API実行（直接アクセス時）
if (basename($_SERVER['SCRIPT_NAME']) === basename(__FILE__)) {
    $api = new FiltersApiEndpoints();
    $api->handleRequest();
}
?>
    }
    
    /**
     * APIリクエスト処理メイン
     */
    public function handleRequest() {
        $start_time = microtime(true);
        $request_id = $this->generateRequestId();
        
        try {
            $this->logger->info("API リクエスト開始", [
                'request_id' => $request_id,
                'method' => $_SERVER['REQUEST_METHOD'],
                'uri' => $_SERVER['REQUEST_URI'],
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'ip' => $this->getClientIp()
            ]);
            
            // レート制限チェック
            if (!$this->checkRateLimit()) {
                return $this->errorResponse('レート制限に達しました', 429, $request_id);
            }
            
            // リクエスト解析
            $route = $this->parseRoute();
            $method = $_SERVER['REQUEST_METHOD'];
            $input_data = $this->getInputData();
            
            // 認証・権限チェック
            $auth_result = $this->authenticateRequest($route, $method);
            if (!$auth_result['success']) {
                return $this->errorResponse($auth_result['message'], 401, $request_id);
            }
            
            // ルーティング処理
            $response = $this->routeRequest($route, $method, $input_data, $auth_result['user']);
            
            // 実行時間記録
            $execution_time = round((microtime(true) - $start_time) * 1000);
            $response['meta']['execution_time_ms'] = $execution_time;
            $response['meta']['request_id'] = $request_id;
            
            $this->logger->info("API リクエスト完了", [
                'request_id' => $request_id,
                'status' => $response['status'],
                'execution_time_ms' => $execution_time
            ]);
            
            return $this->jsonResponse($response);
            
        } catch (Exception $e) {
            $this->logger->error("API リクエストエラー", [
                'request_id' => $request_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return $this->errorResponse(
                'Internal Server Error: ' . $e->getMessage(),
                500,
                $request_id
            );
        }
    }
    
    /**
     * ルーティング処理
     * 
     * @param array $route ルート情報
     * @param string $method HTTPメソッド
     * @param array $input_data 入力データ
     * @param array $user ユーザー情報
     * @return array レスポンス
     */
    private function routeRequest($route, $method, $input_data, $user) {
        $endpoint = $route['endpoint'];
        $params = $route['params'];
        
        switch ($endpoint) {
            // フィルター実行関連
            case 'filters/execute':
                return $this->handleFilterExecution($method, $input_data, $user);
                
            case 'filters/batch':
                return $this->handleBatchFilterExecution($method, $input_data, $user);
                
            case 'filters/status':
                return $this->handleFilterStatus($method, $params, $user);
            
            // NGワード管理
            case 'ngwords':
                return $this->handleNGWordsManagement($method, $input_data, $params, $user);
                
            case 'ngwords/bulk':
                return $this->handleBulkNGWordsOperation($method, $input_data, $user);
            
            // カテゴリ管理
            case 'categories':
                return $this->handleCategoriesManagement($method, $input_data, $params, $user);
            
            // 確認待ち管理
            case 'reviews':
                return $this->handleReviewsManagement($method, $input_data, $params, $user);
                
            case 'reviews/approve':
                return $this->handleReviewApproval($method, $input_data, $user);
            
            // AI関連
            case 'ai/analyze':
                return $this->handleAiAnalysis($method, $input_data, $user);
                
            case 'ai/learn':
                return $this->handleAiLearning($method, $input_data, $user);
                
            case 'ai/statistics':
                return $this->handleAiStatistics($method, $params, $user);
            
            // 統計・レポート
            case 'statistics':
                return $this->handleStatistics($method, $params, $user);
                
            case 'reports':
                return $this->handleReports($method, $input_data, $params, $user);
            
            // システム設定
            case 'settings':
                return $this->handleSystemSettings($method, $input_data, $params, $user);
            
            // 外部データ
            case 'external-data/sync':
                return $this->handleExternalDataSync($method, $input_data, $user);
                
            case 'external-data/status':
                return $this->handleExternalDataStatus($method, $params, $user);
            
            // ヘルスチェック
            case 'health':
                return $this->handleHealthCheck($method);
                
            case 'version':
                return $this->handleVersionInfo($method);
            
            default:
                return $this->errorResponse('エンドポイントが見つかりません', 404);
        }