<?php
/**
 * MFApiService - MFクラウド連携サービス（統一APIレスポンス対応版）
 * 
 * ✅ 修正内容:
 * - APIレスポンス形式を完全統一: {"status": "success/error", "message": "", "data": {}, "timestamp": ""}
 * - エラーハンドリングの統一
 * - 統一例外クラス使用
 * - PostgreSQL対応
 * - ログ記録の標準化
 * 
 * @package Emverze\Services
 * @version 1.0.0
 */

// 統一システム読み込み
require_once __DIR__ . '/../../../core/unified_core.php';
require_once __DIR__ . '/../../../core/exceptions.php';

/**
 * 統一APIレスポンス作成関数
 */
function create_api_response($status, $message = '', $data = []) {
    return [
        'status' => $status,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d\TH:i:s\Z')
    ];
}

/**
 * MFクラウド連携サービスクラス（統一版）
 */
class MFApiService extends UnifiedCore
{
    /** @var string MFクラウドAPIベースURL */
    private $base_url = 'https://api.moneyforward.com/api';
    
    /** @var string APIバージョン */
    private $api_version = 'v1';
    
    /** @var string アクセストークン */
    private $access_token;
    
    /** @var string リフレッシュトークン */
    private $refresh_token;
    
    /** @var int トークン有効期限 */
    private $token_expires_at;
    
    /** @var string 事業所ID */
    private $company_id;
    
    /** @var array 勘定科目キャッシュ */
    private $account_items_cache = [];
    
    /** @var int APIリトライ回数 */
    private $max_retries = 3;
    
    /** @var int リクエスト間隔（ミリ秒） */
    private $request_delay = 1000;
    
    /**
     * コンストラクタ
     */
    public function __construct()
    {
        try {
            parent::__construct();
            $this->initializeMFApiService();
            
        } catch (Exception $e) {
            $this->logError('MFApiService初期化失敗', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new EmverzeException("MFApiServiceの初期化に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * MFApiService初期化
     */
    private function initializeMFApiService()
    {
        $this->logInfo('MFApiService初期化開始');
        
        try {
            // PostgreSQL設定確認
            $this->validateDatabaseConnection();
            
            // 設定読み込み
            $this->loadConfiguration();
            
            // トークン状態確認
            $this->validateTokenStatus();
            
            $this->logInfo('MFApiService初期化完了', [
                'base_url' => $this->base_url,
                'api_version' => $this->api_version,
                'has_token' => !empty($this->access_token),
                'company_id' => $this->company_id
            ]);
            
        } catch (Exception $e) {
            $this->logError('MFApiService初期化エラー', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * PostgreSQL接続確認
     */
    private function validateDatabaseConnection()
    {
        try {
            $pdo = $this->getPostgreSQLConnection();
            if (!$pdo) {
                throw new EmverzeException('PostgreSQL接続が確立できません');
            }
            
            // MF連携用テーブル存在確認
            $stmt = $pdo->prepare("
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'mf_configurations'
                )
            ");
            $stmt->execute();
            
            if (!$stmt->fetchColumn()) {
                $this->createMFTables($pdo);
            }
            
        } catch (Exception $e) {
            throw new EmverzeException("データベース検証失敗: " . $e->getMessage());
        }
    }
    
    /**
     * MF連携用テーブル作成
     */
    private function createMFTables($pdo)
    {
        $sql = "
            CREATE TABLE IF NOT EXISTS mf_configurations (
                id SERIAL PRIMARY KEY,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at BIGINT,
                company_id VARCHAR(255),
                client_id VARCHAR(255),
                client_secret TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS mf_sync_logs (
                id SERIAL PRIMARY KEY,
                sync_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL,
                message TEXT,
                data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ";
        
        $pdo->exec($sql);
        $this->logInfo('MF連携用テーブルを作成しました');
    }
    
    /**
     * MFクラウド取引データ取得（統一APIレスポンス対応）
     * 
     * @param string $date_from 開始日（YYYY-MM-DD）
     * @param string $date_to 終了日（YYYY-MM-DD）
     * @param array $options オプション
     * @return array 統一APIレスポンス形式
     */
    public function getTransactions($date_from, $date_to, $options = [])
    {
        try {
            // パラメータバリデーション
            $this->validateDateRange($date_from, $date_to);
            
            // API接続確認
            if (!$this->ensureConnection()) {
                return create_api_response(
                    'error',
                    'MFクラウドへの接続が確立できません',
                    ['connection_status' => 'failed']
                );
            }
            
            // クエリパラメータ構築
            $params = [
                'start_date' => $date_from,
                'end_date' => $date_to,
                'per_page' => $options['per_page'] ?? 100,
                'page' => $options['page'] ?? 1
            ];
            
            // API呼び出し
            $response = $this->makeApiRequest('GET', '/deals', null, $params);
            
            if (!$response) {
                return create_api_response(
                    'error',
                    'MFクラウドAPIからのレスポンスが取得できませんでした',
                    ['endpoint' => '/deals', 'params' => $params]
                );
            }
            
            // データ正規化
            $normalized_transactions = $this->normalizeTransactions($response['deals'] ?? []);
            
            // 同期ログ記録
            $this->recordSyncLog('get_transactions', 'success', '取引データ取得完了', [
                'date_range' => ['from' => $date_from, 'to' => $date_to],
                'transaction_count' => count($normalized_transactions),
                'options' => $options
            ]);
            
            $this->logInfo('MF取引データ取得完了', [
                'count' => count($normalized_transactions),
                'date_range' => [$date_from, $date_to]
            ]);
            
            return create_api_response(
                'success',
                '取引データを正常に取得しました',
                [
                    'transactions' => $normalized_transactions,
                    'total_count' => count($normalized_transactions),
                    'date_range' => ['from' => $date_from, 'to' => $date_to],
                    'pagination' => [
                        'page' => $params['page'],
                        'per_page' => $params['per_page']
                    ]
                ]
            );
            
        } catch (ValidationException $e) {
            return create_api_response(
                'error',
                '入力データが無効です: ' . $e->getMessage(),
                ['validation_errors' => $e->getDetails()]
            );
            
        } catch (EmverzeException $e) {
            $this->logError('MF取引データ取得エラー', [
                'error' => $e->getMessage(),
                'date_range' => [$date_from, $date_to]
            ]);
            
            return create_api_response(
                'error',
                '取引データの取得に失敗しました: ' . $e->getMessage(),
                ['error_category' => $e->getCategory()]
            );
            
        } catch (Exception $e) {
            $this->logError('MF取引データ取得予期しないエラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return create_api_response(
                'error',
                '予期しないエラーが発生しました',
                ['error_type' => 'unexpected_error']
            );
        }
    }
    
    /**
     * 仕訳データ送信（統一APIレスポンス対応）
     * 
     * @param array $journal_entries 仕訳データ配列
     * @return array 統一APIレスポンス形式
     */
    public function sendJournalEntries($journal_entries)
    {
        try {
            if (empty($journal_entries)) {
                return create_api_response(
                    'error',
                    '送信する仕訳データがありません',
                    ['entry_count' => 0]
                );
            }
            
            // API接続確認
            if (!$this->ensureConnection()) {
                return create_api_response(
                    'error',
                    'MFクラウドへの接続が確立できません',
                    ['connection_status' => 'failed']
                );
            }
            
            $results = [];
            $success_count = 0;
            $error_count = 0;
            
            foreach ($journal_entries as $index => $entry) {
                try {
                    // データバリデーション
                    $this->validateJournalEntry($entry);
                    
                    // MF形式に変換
                    $mf_data = $this->convertToMFJournalFormat($entry);
                    
                    // API送信
                    $response = $this->makeApiRequest('POST', '/journals', $mf_data);
                    
                    if ($response && isset($response['id'])) {
                        $results[] = [
                            'index' => $index,
                            'status' => 'success',
                            'mf_journal_id' => $response['id'],
                            'local_id' => $entry['id'] ?? null
                        ];
                        $success_count++;
                        
                        // ローカルDBに送信状況記録
                        $this->recordJournalSyncStatus($entry['id'] ?? null, 'sent', $response['id']);
                        
                    } else {
                        throw new EmverzeException('MFクラウドからの無効なレスポンス');
                    }
                    
                } catch (Exception $e) {
                    $results[] = [
                        'index' => $index,
                        'status' => 'error',
                        'error' => $e->getMessage(),
                        'local_id' => $entry['id'] ?? null
                    ];
                    $error_count++;
                    
                    // エラーログ記録
                    $this->recordJournalSyncStatus($entry['id'] ?? null, 'error', null, $e->getMessage());
                }
                
                // API制限対応
                usleep($this->request_delay * 1000);
            }
            
            // 同期ログ記録
            $this->recordSyncLog('send_journals', $error_count > 0 ? 'partial' : 'success', 
                "仕訳送信完了: 成功{$success_count}件、エラー{$error_count}件", [
                'total_entries' => count($journal_entries),
                'success_count' => $success_count,
                'error_count' => $error_count,
                'results' => $results
            ]);
            
            $status = $error_count > 0 ? 'error' : 'success';
            $message = $error_count > 0 
                ? "仕訳送信が部分的に完了しました。成功: {$success_count}件、エラー: {$error_count}件"
                : "全ての仕訳を正常に送信しました。送信件数: {$success_count}件";
            
            return create_api_response(
                $status,
                $message,
                [
                    'results' => $results,
                    'summary' => [
                        'total_entries' => count($journal_entries),
                        'success_count' => $success_count,
                        'error_count' => $error_count,
                        'success_rate' => round(($success_count / count($journal_entries)) * 100, 2)
                    ]
                ]
            );
            
        } catch (EmverzeException $e) {
            $this->logError('仕訳送信エラー', [
                'error' => $e->getMessage(),
                'entry_count' => count($journal_entries ?? [])
            ]);
            
            return create_api_response(
                'error',
                '仕訳送信処理に失敗しました: ' . $e->getMessage(),
                ['error_category' => $e->getCategory()]
            );
            
        } catch (Exception $e) {
            $this->logError('仕訳送信予期しないエラー', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return create_api_response(
                'error',
                '予期しないエラーが発生しました',
                ['error_type' => 'unexpected_error']
            );
        }
    }
    
    /**
     * OAuth認証URL生成（統一APIレスポンス対応）
     * 
     * @param string $redirect_uri リダイレクトURI
     * @param string $state ステート値
     * @return array 統一APIレスポンス形式
     */
    public function generateAuthUrl($redirect_uri, $state = null)
    {
        try {
            if (empty($redirect_uri)) {
                return create_api_response(
                    'error',
                    'リダイレクトURIが指定されていません',
                    ['required_parameter' => 'redirect_uri']
                );
            }
            
            $client_id = $this->getClientId();
            if (empty($client_id)) {
                return create_api_response(
                    'error',
                    'MFクラウドのクライアントIDが設定されていません',
                    ['configuration_error' => 'missing_client_id']
                );
            }
            
            $state = $state ?: bin2hex(random_bytes(16));
            
            $auth_url = 'https://oauth.moneyforward.com/oauth/authorize?' . http_build_query([
                'client_id' => $client_id,
                'redirect_uri' => $redirect_uri,
                'response_type' => 'code',
                'scope' => 'read write',
                'state' => $state
            ]);
            
            // ステート値をセッションに保存
            $_SESSION['mf_oauth_state'] = $state;
            
            $this->logInfo('OAuth認証URL生成完了', [
                'redirect_uri' => $redirect_uri,
                'state' => substr($state, 0, 8) . '...'
            ]);
            
            return create_api_response(
                'success',
                'OAuth認証URLを生成しました',
                [
                    'auth_url' => $auth_url,
                    'state' => $state,
                    'redirect_uri' => $redirect_uri
                ]
            );
            
        } catch (Exception $e) {
            $this->logError('OAuth認証URL生成エラー', [
                'error' => $e->getMessage(),
                'redirect_uri' => $redirect_uri
            ]);
            
            return create_api_response(
                'error',
                'OAuth認証URLの生成に失敗しました: ' . $e->getMessage(),
                ['error_type' => 'auth_url_generation_error']
            );
        }
    }
    
    /**
     * OAuth認証コールバック処理（統一APIレスポンス対応）
     * 
     * @param string $code 認証コード
     * @param string $state ステート値
     * @param string $redirect_uri リダイレクトURI
     * @return array 統一APIレスポンス形式
     */
    public function handleOAuthCallback($code, $state, $redirect_uri)
    {
        try {
            // ステート値検証
            if (empty($state) || empty($_SESSION['mf_oauth_state']) || $state !== $_SESSION['mf_oauth_state']) {
                return create_api_response(
                    'error',
                    'OAuth認証のステート値が無効です',
                    ['security_error' => 'invalid_state']
                );
            }
            
            // 認証コード検証
            if (empty($code)) {
                return create_api_response(
                    'error',
                    '認証コードが取得できませんでした',
                    ['oauth_error' => 'missing_code']
                );
            }
            
            // トークン取得
            $token_data = [
                'client_id' => $this->getClientId(),
                'client_secret' => $this->getClientSecret(),
                'code' => $code,
                'grant_type' => 'authorization_code',
                'redirect_uri' => $redirect_uri
            ];
            
            $response = $this->makeTokenRequest($token_data);
            
            if (!$response || empty($response['access_token'])) {
                return create_api_response(
                    'error',
                    'アクセストークンの取得に失敗しました',
                    ['oauth_error' => 'token_request_failed']
                );
            }
            
            // トークン保存
            $this->access_token = $response['access_token'];
            $this->refresh_token = $response['refresh_token'] ?? '';
            $this->token_expires_at = time() + ($response['expires_in'] ?? 3600);
            
            // 事業所情報取得
            $companies = $this->makeApiRequest('GET', '/companies');
            if ($companies && !empty($companies['companies'])) {
                $this->company_id = $companies['companies'][0]['id'];
            }
            
            // 設定保存
            $this->saveConfiguration();
            
            // セッションクリア
            unset($_SESSION['mf_oauth_state']);
            
            // 同期ログ記録
            $this->recordSyncLog('oauth_callback', 'success', 'OAuth認証完了', [
                'company_id' => $this->company_id,
                'expires_at' => $this->token_expires_at
            ]);
            
            $this->logInfo('OAuth認証完了', [
                'company_id' => $this->company_id,
                'token_expires_at' => date('Y-m-d H:i:s', $this->token_expires_at)
            ]);
            
            return create_api_response(
                'success',
                'MFクラウドとの連携を正常に確立しました',
                [
                    'company_id' => $this->company_id,
                    'token_expires_at' => $this->token_expires_at,
                    'expires_at_formatted' => date('Y-m-d H:i:s', $this->token_expires_at)
                ]
            );
            
        } catch (Exception $e) {
            $this->logError('OAuth認証コールバックエラー', [
                'error' => $e->getMessage(),
                'code' => substr($code ?? '', 0, 10) . '...',
                'state' => $state
            ]);
            
            return create_api_response(
                'error',
                'MFクラウド認証に失敗しました: ' . $e->getMessage(),
                ['oauth_error' => 'callback_failed']
            );
        }
    }
    
    /**
     * 接続状態確認（統一APIレスポンス対応）
     * 
     * @return array 統一APIレスポンス形式
     */
    public function getConnectionStatus()
    {
        try {
            $has_token = !empty($this->access_token);
            $is_expired = $this->token_expires_at <= time();
            $has_company = !empty($this->company_id);
            
            $status = 'disconnected';
            if ($has_token && !$is_expired && $has_company) {
                $status = 'connected';
            } elseif ($has_token && $is_expired) {
                $status = 'expired';
            } elseif ($has_token && !$has_company) {
                $status = 'no_company';
            }
            
            return create_api_response(
                'success',
                'MFクラウド接続状態を取得しました',
                [
                    'connection_status' => $status,
                    'has_token' => $has_token,
                    'is_expired' => $is_expired,
                    'expires_at' => $this->token_expires_at,
                    'expires_at_formatted' => $this->token_expires_at > 0 ? date('Y-m-d H:i:s', $this->token_expires_at) : null,
                    'company_id' => $this->company_id,
                    'time_until_expiry' => $this->token_expires_at > time() ? $this->token_expires_at - time() : 0
                ]
            );
            
        } catch (Exception $e) {
            $this->logError('接続状態取得エラー', [
                'error' => $e->getMessage()
            ]);
            
            return create_api_response(
                'error',
                '接続状態取得に失敗しました: ' . $e->getMessage(),
                ['error_type' => 'status_check_error']
            );
        }
    }
    
    /**
     * APIリクエスト実行（リトライ機能付き・統一例外処理）
     * 
     * @param string $method HTTPメソッド
     * @param string $endpoint エンドポイント
     * @param array|null $data リクエストデータ
     * @param array|null $params クエリパラメータ
     * @return array|null レスポンスデータ
     * @throws EmverzeException
     */
    private function makeApiRequest($method, $endpoint, $data = null, $params = null)
    {
        $retry_count = 0;
        
        while ($retry_count <= $this->max_retries) {
            try {
                $url = $this->base_url . '/' . $this->api_version . $endpoint;
                
                if ($params) {
                    $url .= '?' . http_build_query($params);
                }
                
                $headers = [
                    'Authorization: Bearer ' . $this->access_token,
                    'Content-Type: application/json',
                    'Accept: application/json',
                    'User-Agent: Emverze-SaaS/1.0'
                ];
                
                $ch = curl_init();
                curl_setopt_array($ch, [
                    CURLOPT_URL => $url,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_HTTPHEADER => $headers,
                    CURLOPT_TIMEOUT => 30,
                    CURLOPT_CONNECTTIMEOUT => 10,
                    CURLOPT_SSL_VERIFYPEER => true,
                    CURLOPT_SSL_VERIFYHOST => 2
                ]);
                
                if ($method === 'POST') {
                    curl_setopt($ch, CURLOPT_POST, true);
                    if ($data) {
                        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                    }
                } elseif ($method === 'PUT') {
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                    if ($data) {
                        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
                    }
                }
                
                $response = curl_exec($ch);
                $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $error = curl_error($ch);
                curl_close($ch);
                
                if ($error) {
                    throw new EmverzeException("cURL Error: {$error}");
                }
                
                if ($http_code === 401) {
                    // トークン期限切れの場合はリフレッシュを試行
                    if ($this->refreshToken()) {
                        $retry_count++;
                        continue;
                    } else {
                        throw new EmverzeException('認証エラー: トークンの更新に失敗しました');
                    }
                }
                
                if ($http_code >= 400) {
                    $error_data = json_decode($response, true);
                    $error_message = $error_data['errors'][0]['message'] ?? "HTTP Error {$http_code}";
                    throw new EmverzeException("MFクラウドAPIエラー: {$error_message}");
                }
                
                $decoded_response = json_decode($response, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new EmverzeException('APIレスポンスのJSONパースに失敗しました');
                }
                
                return $decoded_response;
                
            } catch (EmverzeException $e) {
                if ($retry_count >= $this->max_retries) {
                    throw $e;
                }
                
                $retry_count++;
                $delay = pow(2, $retry_count) * 1000; // 指数バックオフ
                usleep($delay * 1000);
            }
        }
        
        throw new EmverzeException('最大リトライ回数に達しました');
    }
    
    /**
     * 同期ログ記録
     */
    private function recordSyncLog($sync_type, $status, $message, $data = [])
    {
        try {
            $pdo = $this->getPostgreSQLConnection();
            $stmt = $pdo->prepare("
                INSERT INTO mf_sync_logs (sync_type, status, message, data) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$sync_type, $status, $message, json_encode($data)]);
        } catch (Exception $e) {
            $this->logError('同期ログ記録エラー', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * 仕訳同期状況記録
     */
    private function recordJournalSyncStatus($local_id, $status, $mf_journal_id = null, $error_message = null)
    {
        try {
            $pdo = $this->getPostgreSQLConnection();
            $stmt = $pdo->prepare("
                UPDATE journal_entries 
                SET mf_sync_status = ?, mf_journal_id = ?, mf_sync_error = ?, mf_synced_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([$status, $mf_journal_id, $error_message, $local_id]);
        } catch (Exception $e) {
            $this->logError('仕訳同期状況記録エラー', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * 設定読み込み（PostgreSQL対応）
     */
    private function loadConfiguration()
    {
        try {
            $pdo = $this->getPostgreSQLConnection();
            $stmt = $pdo->prepare("SELECT * FROM mf_configurations ORDER BY id DESC LIMIT 1");
            $stmt->execute();
            $config = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($config) {
                $this->access_token = $config['access_token'] ?? '';
                $this->refresh_token = $config['refresh_token'] ?? '';
                $this->token_expires_at = $config['token_expires_at'] ?? 0;
                $this->company_id = $config['company_id'] ?? '';
            }
        } catch (Exception $e) {
            $this->logError('設定読み込みエラー', ['error' => $e->getMessage()]);
        }
    }
    
    /**
     * 設定保存（PostgreSQL対応）
     */
    private function saveConfiguration()
    {
        try {
            $pdo = $this->getPostgreSQLConnection();
            $stmt = $pdo->prepare("
                INSERT INTO mf_configurations (access_token, refresh_token, token_expires_at, company_id) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    token_expires_at = EXCLUDED.token_expires_at,
                    company_id = EXCLUDED.company_id,
                    updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->execute([$this->access_token, $this->refresh_token, $this->token_expires_at, $this->company_id]);
        } catch (Exception $e) {
            $this->logError('設定保存エラー', ['error' => $e->getMessage()]);
            throw new EmverzeException('設定の保存に失敗しました');
        }
    }
    
    /**
     * その他のプライベートメソッド（バリデーション、正規化等）
     */
    private function validateDateRange($date_from, $date_to)
    {
        if (!$date_from || !$date_to) {
            throw new ValidationException('開始日と終了日を指定してください');
        }
        
        if (strtotime($date_from) > strtotime($date_to)) {
            throw new ValidationException('開始日は終了日より前の日付を指定してください');
        }
    }
    
    private function validateJournalEntry($entry)
    {
        if (empty($entry['transaction_date']) || empty($entry['amount'])) {
            throw new ValidationException('取引日と金額は必須です');
        }
    }
    
    private function validateTokenStatus()
    {
        if (!empty($this->access_token) && $this->token_expires_at <= time()) {
            $this->logInfo('トークン期限切れ検出、リフレッシュを試行します');
            $this->refreshToken();
        }
    }
    
    private function ensureConnection()
    {
        if (empty($this->access_token)) {
            return false;
        }
        
        if ($this->token_expires_at <= time()) {
            return $this->refreshToken();
        }
        
        return true;
    }
    
    private function refreshToken()
    {
        if (empty($this->refresh_token)) {
            return false;
        }
        
        try {
            $token_data = [
                'client_id' => $this->getClientId(),
                'client_secret' => $this->getClientSecret(),
                'grant_type' => 'refresh_token',
                'refresh_token' => $this->refresh_token
            ];
            
            $response = $this->makeTokenRequest($token_data);
            
            if ($response && !empty($response['access_token'])) {
                $this->access_token = $response['access_token'];
                $this->refresh_token = $response['refresh_token'] ?? $this->refresh_token;
                $this->token_expires_at = time() + ($response['expires_in'] ?? 3600);
                
                $this->saveConfiguration();
                $this->logInfo('トークン更新完了');
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->logError('トークン更新エラー', ['error' => $e->getMessage()]);
            return false;
        }
    }
    
    private function makeTokenRequest($data)
    {
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => 'https://oauth.moneyforward.com/oauth/token',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json'
            ],
            CURLOPT_TIMEOUT => 30
        ]);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code !== 200) {
            throw new EmverzeException("Token request failed: HTTP {$http_code}");
        }
        
        return json_decode($response, true);
    }
    
    private function getClientId()
    {
        return $this->getConfig('MF_CLIENT_ID') ?? '';
    }
    
    private function getClientSecret()
    {
        return $this->getConfig('MF_CLIENT_SECRET') ?? '';
    }
    
    private function normalizeTransactions($deals)
    {
        $normalized = [];
        
        foreach ($deals as $deal) {
            $transaction = [
                'mf_deal_id' => $deal['id'],
                'transaction_date' => $deal['issue_date'],
                'amount' => $deal['amount'] ?? 0,
                'description' => $deal['description'] ?? '',
                'partner_name' => $deal['partner_name'] ?? '',
                'debit_account' => '',
                'credit_account' => '',
                'raw_data' => $deal
            ];
            
            // 勘定科目の判定
            if (isset($deal['details']) && is_array($deal['details'])) {
                foreach ($deal['details'] as $detail) {
                    if ($detail['entry_side'] === 'debit') {
                        $transaction['debit_account'] = $detail['account_item_name'] ?? '';
                    } elseif ($detail['entry_side'] === 'credit') {
                        $transaction['credit_account'] = $detail['account_item_name'] ?? '';
                    }
                }
            }
            
            // デフォルト設定
            if (empty($transaction['debit_account']) && empty($transaction['credit_account'])) {
                if ($transaction['amount'] > 0) {
                    $transaction['debit_account'] = $deal['details'][0]['account_item_name'] ?? '';
                    $transaction['credit_account'] = '現金';
                } else {
                    $transaction['debit_account'] = '現金';
                    $transaction['credit_account'] = $deal['details'][0]['account_item_name'] ?? '';
                }
            }
            
            $normalized[] = $transaction;
        }
        
        return $normalized;
    }
    
    private function convertToMFJournalFormat($entry)
    {
        return [
            'company_id' => $this->company_id,
            'issue_date' => $entry['transaction_date'],
            'details' => [
                [
                    'entry_side' => 'debit',
                    'account_item_id' => $this->getAccountItemIdByName($entry['debit_account']),
                    'amount' => $entry['amount'],
                    'description' => $entry['description']
                ],
                [
                    'entry_side' => 'credit',
                    'account_item_id' => $this->getAccountItemIdByName($entry['credit_account']),
                    'amount' => $entry['amount'],
                    'description' => $entry['description']
                ]
            ]
        ];
    }
    
    private function getAccountItemIdByName($account_name)
    {
        // 勘定科目名からIDを取得（キャッシュ利用）
        if (isset($this->account_items_cache[$account_name])) {
            return $this->account_items_cache[$account_name];
        }
        
        try {
            $response = $this->makeApiRequest('GET', '/account_items', null, ['name' => $account_name]);
            if ($response && !empty($response['account_items'])) {
                $id = $response['account_items'][0]['id'];
                $this->account_items_cache[$account_name] = $id;
                return $id;
            }
        } catch (Exception $e) {
            $this->logError('勘定科目ID取得エラー', ['account_name' => $account_name, 'error' => $e->getMessage()]);
        }
        
        return null;
    }
}

// 統一インターフェース関数（後方互換性）
function mf_api_get_transactions($date_from, $date_to, $options = []) {
    $service = new MFApiService();
    return $service->getTransactions($date_from, $date_to, $options);
}

function mf_api_send_journals($journal_entries) {
    $service = new MFApiService();
    return $service->sendJournalEntries($journal_entries);
}

function mf_api_get_connection_status() {
    $service = new MFApiService();
    return $service->getConnectionStatus();
}

function mf_api_generate_auth_url($redirect_uri, $state = null) {
    $service = new MFApiService();
    return $service->generateAuthUrl($redirect_uri, $state);
}

function mf_api_handle_oauth_callback($code, $state, $redirect_uri) {
    $service = new MFApiService();
    return $service->handleOAuthCallback($code, $state, $redirect_uri);
}

?>