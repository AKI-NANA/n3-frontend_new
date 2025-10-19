<?php
/**
 * RuleModel - 自動仕訳ルール管理モデル
 * 
 * NAGANO-3記帳自動化ツール統合準拠
 * Phase 6-1: 基本機能完成（最優先）
 * 
 * @package NAGANO3\Kicho\Models
 * @version 1.0.0
 * @author NAGANO-3 Development Team
 */

// 既存NAGANO-3システム読み込み
require_once __DIR__ . '/../../../system_core/php/nagano3_unified_core.php';

/**
 * 自動仕訳ルール管理モデルクラス
 * 
 * 機能:
 * - AI生成ルール・手動ルール・学習済ルールの統一管理
 * - 優先度ベースの適用順序制御
 * - 条件マッチング・仕訳テンプレート管理
 * - 承認フロー・ステータス管理
 */
class KichoRuleModel extends NAGANO3UnifiedCore
{
    /** @var string テーブル名 */
    private $table = 'kicho_rules';
    
    /** @var array 許可されたステータス */
    private $allowed_statuses = ['pending', 'approved', 'active', 'inactive'];
    
    /** @var array 許可されたルール種別 */
    private $allowed_types = ['ai_generated', 'manual', 'learned'];
    
    /**
     * コンストラクタ
     */
    public function __construct()
    {
        parent::__construct();
        $this->initializeRuleModel();
    }
    
    /**
     * RuleModel初期化
     */
    private function initializeRuleModel()
    {
        // パフォーマンス監視開始
        $this->kicho_performance_start('rule_model_init');
        
        try {
            // データベース接続確認
            if (!$this->db) {
                throw new Exception('データベース接続が確立されていません');
            }
            
            // テーブル存在確認
            $this->validateTableStructure();
            
            kicho_log('info', 'RuleModel初期化完了', [
                'table' => $this->table,
                'allowed_statuses' => $this->allowed_statuses,
                'allowed_types' => $this->allowed_types
            ]);
            
        } catch (Exception $e) {
            kicho_log('error', 'RuleModel初期化失敗', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        } finally {
            $this->kicho_performance_end('rule_model_init');
        }
    }
    
    /**
     * テーブル構造検証
     */
    private function validateTableStructure()
    {
        $query = "SELECT column_name FROM information_schema.columns 
                  WHERE table_name = ? AND table_schema = 'public'";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([$this->table]);
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $required_columns = [
            'rule_id', 'rule_name', 'rule_type', 'keywords', 'amount_min', 'amount_max',
            'vendor_pattern', 'priority', 'debit_account', 'credit_account',
            'debit_sub_account', 'credit_sub_account', 'tag_template', 'memo_template',
            'confidence', 'usage_count', 'success_rate', 'status', 'tenant_id',
            'created_at', 'updated_at', 'created_by'
        ];
        
        $missing = array_diff($required_columns, $columns);
        if (!empty($missing)) {
            throw new Exception('必須カラムが不足しています: ' . implode(', ', $missing));
        }
    }
    
    /**
     * 新規ルール作成
     * 
     * @param array $rule_data ルールデータ
     * @return array 作成結果
     */
    public function createRule($rule_data)
    {
        $this->kicho_performance_start('create_rule');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_write')) {
                throw new Exception('ルール作成権限がありません');
            }
            
            // データバリデーション
            $validated_data = $this->validateRuleData($rule_data);
            
            // UUID生成
            $rule_id = $this->generateUUID();
            
            // テナントID取得
            $tenant_id = $this->getCurrentTenantId();
            $user_id = $this->getCurrentUserId();
            
            // SQL作成
            $query = "INSERT INTO {$this->table} (
                rule_id, rule_name, rule_type, keywords, amount_min, amount_max,
                vendor_pattern, priority, debit_account, credit_account,
                debit_sub_account, credit_sub_account, debit_department, credit_department,
                debit_vendor, credit_vendor, debit_tax_type, credit_tax_type,
                tag_template, memo_template, confidence, usage_count, success_rate,
                status, tenant_id, created_by, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
            )";
            
            $stmt = $this->db->prepare($query);
            $result = $stmt->execute([
                $rule_id,
                $validated_data['rule_name'],
                $validated_data['rule_type'],
                json_encode($validated_data['keywords']),
                $validated_data['amount_min'],
                $validated_data['amount_max'],
                $validated_data['vendor_pattern'],
                $validated_data['priority'],
                $validated_data['debit_account'],
                $validated_data['credit_account'],
                $validated_data['debit_sub_account'],
                $validated_data['credit_sub_account'],
                $validated_data['debit_department'],
                $validated_data['credit_department'],
                $validated_data['debit_vendor'],
                $validated_data['credit_vendor'],
                $validated_data['debit_tax_type'],
                $validated_data['credit_tax_type'],
                $validated_data['tag_template'],
                $validated_data['memo_template'],
                $validated_data['confidence'] ?? 0.0,
                0, // usage_count
                0.0, // success_rate
                $validated_data['status'] ?? 'pending',
                $tenant_id,
                $user_id
            ]);
            
            if (!$result) {
                throw new Exception('ルール作成に失敗しました');
            }
            
            // 監査ログ
            kicho_log('info', 'ルール作成成功', [
                'rule_id' => $rule_id,
                'rule_name' => $validated_data['rule_name'],
                'rule_type' => $validated_data['rule_type'],
                'status' => $validated_data['status'] ?? 'pending'
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => 'ルールが正常に作成されました',
                'data' => [
                    'rule_id' => $rule_id,
                    'rule_name' => $validated_data['rule_name'],
                    'status' => $validated_data['status'] ?? 'pending'
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'ルール作成失敗', [
                'error' => $e->getMessage(),
                'rule_data' => $rule_data
            ]);
            
            return [
                'status' => 'error',
                'message' => 'ルール作成に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('create_rule');
        }
    }
    
    /**
     * ルール一覧取得（ページネーション対応）
     * 
     * @param array $filters フィルター条件
     * @param int $page ページ番号
     * @param int $per_page 1ページあたりの件数
     * @return array ルール一覧
     */
    public function getRules($filters = [], $page = 1, $per_page = 50)
    {
        $this->kicho_performance_start('get_rules');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_read')) {
                throw new Exception('ルール閲覧権限がありません');
            }
            
            // フィルター構築
            $where_conditions = ['tenant_id = ?'];
            $params = [$this->getCurrentTenantId()];
            
            // ステータスフィルター
            if (!empty($filters['status'])) {
                $where_conditions[] = 'status = ?';
                $params[] = $filters['status'];
            }
            
            // ルール種別フィルター
            if (!empty($filters['rule_type'])) {
                $where_conditions[] = 'rule_type = ?';
                $params[] = $filters['rule_type'];
            }
            
            // キーワード検索
            if (!empty($filters['keyword'])) {
                $where_conditions[] = '(rule_name ILIKE ? OR keywords::text ILIKE ?)';
                $search_term = '%' . $filters['keyword'] . '%';
                $params[] = $search_term;
                $params[] = $search_term;
            }
            
            // アクティブルールのみ
            if (!empty($filters['active_only'])) {
                $where_conditions[] = 'status IN (?, ?)';
                $params[] = 'approved';
                $params[] = 'active';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            // 総件数取得
            $count_query = "SELECT COUNT(*) FROM {$this->table} WHERE {$where_clause}";
            $count_stmt = $this->db->prepare($count_query);
            $count_stmt->execute($params);
            $total_count = $count_stmt->fetchColumn();
            
            // ページネーション計算
            $offset = ($page - 1) * $per_page;
            $total_pages = ceil($total_count / $per_page);
            
            // データ取得
            $query = "SELECT 
                rule_id, rule_name, rule_type, keywords, amount_min, amount_max,
                vendor_pattern, priority, debit_account, credit_account,
                debit_sub_account, credit_sub_account, tag_template, memo_template,
                confidence, usage_count, success_rate, status,
                created_at, updated_at, created_by
            FROM {$this->table} 
            WHERE {$where_clause}
            ORDER BY priority DESC, created_at DESC
            LIMIT ? OFFSET ?";
            
            $params[] = $per_page;
            $params[] = $offset;
            
            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // JSONデコード
            foreach ($rules as &$rule) {
                $rule['keywords'] = json_decode($rule['keywords'], true) ?? [];
            }
            
            kicho_log('info', 'ルール一覧取得', [
                'total_count' => $total_count,
                'page' => $page,
                'per_page' => $per_page,
                'filters' => $filters
            ]);
            
            return [
                'status' => 'success',
                'message' => 'ルール一覧を取得しました',
                'data' => [
                    'rules' => $rules,
                    'pagination' => [
                        'current_page' => $page,
                        'per_page' => $per_page,
                        'total_count' => $total_count,
                        'total_pages' => $total_pages,
                        'has_next' => $page < $total_pages,
                        'has_prev' => $page > 1
                    ]
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'ルール一覧取得失敗', [
                'error' => $e->getMessage(),
                'filters' => $filters
            ]);
            
            return [
                'status' => 'error',
                'message' => 'ルール一覧取得に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('get_rules');
        }
    }
    
    /**
     * 取引に適用可能なルール検索
     * 
     * @param array $transaction_data 取引データ
     * @return array 適用可能ルール
     */
    public function findApplicableRules($transaction_data)
    {
        $this->kicho_performance_start('find_applicable_rules');
        
        try {
            // 基本条件: アクティブルールのみ
            $query = "SELECT 
                rule_id, rule_name, rule_type, keywords, amount_min, amount_max,
                vendor_pattern, priority, debit_account, credit_account,
                debit_sub_account, credit_sub_account, debit_department, credit_department,
                debit_vendor, credit_vendor, debit_tax_type, credit_tax_type,
                tag_template, memo_template, confidence, usage_count, success_rate
            FROM {$this->table} 
            WHERE status IN ('approved', 'active') 
            AND tenant_id = ?
            ORDER BY priority DESC, confidence DESC";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$this->getCurrentTenantId()]);
            $all_rules = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $applicable_rules = [];
            $description = $transaction_data['description'] ?? '';
            $amount = $transaction_data['amount'] ?? 0;
            $vendor = $transaction_data['vendor'] ?? '';
            
            foreach ($all_rules as $rule) {
                $keywords = json_decode($rule['keywords'], true) ?? [];
                $match_score = 0;
                
                // キーワードマッチング
                if (!empty($keywords)) {
                    foreach ($keywords as $keyword) {
                        if (stripos($description, $keyword) !== false) {
                            $match_score += 10;
                        }
                    }
                }
                
                // 金額範囲チェック
                $amount_match = true;
                if ($rule['amount_min'] !== null && $amount < $rule['amount_min']) {
                    $amount_match = false;
                }
                if ($rule['amount_max'] !== null && $amount > $rule['amount_max']) {
                    $amount_match = false;
                }
                
                if ($amount_match) {
                    $match_score += 5;
                }
                
                // 取引先パターンマッチング
                if (!empty($rule['vendor_pattern']) && !empty($vendor)) {
                    if (preg_match('/' . $rule['vendor_pattern'] . '/i', $vendor)) {
                        $match_score += 15;
                    }
                }
                
                // マッチスコアが閾値以上の場合に採用
                if ($match_score > 0) {
                    $rule['match_score'] = $match_score;
                    $rule['keywords'] = $keywords;
                    $applicable_rules[] = $rule;
                }
            }
            
            // マッチスコア降順でソート
            usort($applicable_rules, function($a, $b) {
                return $b['match_score'] <=> $a['match_score'];
            });
            
            kicho_log('info', '適用可能ルール検索完了', [
                'total_rules' => count($all_rules),
                'applicable_rules' => count($applicable_rules),
                'transaction_description' => $description
            ]);
            
            return [
                'status' => 'success',
                'message' => '適用可能ルールを検索しました',
                'data' => [
                    'rules' => $applicable_rules,
                    'count' => count($applicable_rules)
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', '適用可能ルール検索失敗', [
                'error' => $e->getMessage(),
                'transaction_data' => $transaction_data
            ]);
            
            return [
                'status' => 'error',
                'message' => '適用可能ルール検索に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('find_applicable_rules');
        }
    }
    
    /**
     * ルール承認処理
     * 
     * @param array $rule_ids ルールIDの配列
     * @return array 承認結果
     */
    public function approveRules($rule_ids)
    {
        $this->kicho_performance_start('approve_rules');
        
        try {
            // 権限チェック
            if (!kicho_check_permission('kicho_admin')) {
                throw new Exception('ルール承認権限がありません');
            }
            
            if (empty($rule_ids) || !is_array($rule_ids)) {
                throw new Exception('有効なルールIDが指定されていません');
            }
            
            $tenant_id = $this->getCurrentTenantId();
            $user_id = $this->getCurrentUserId();
            
            // トランザクション開始
            $this->db->beginTransaction();
            
            $approved_count = 0;
            $errors = [];
            
            foreach ($rule_ids as $rule_id) {
                try {
                    // ルール存在確認
                    $check_query = "SELECT rule_id, rule_name, status FROM {$this->table} 
                                   WHERE rule_id = ? AND tenant_id = ?";
                    $check_stmt = $this->db->prepare($check_query);
                    $check_stmt->execute([$rule_id, $tenant_id]);
                    $rule = $check_stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$rule) {
                        $errors[] = "ルールが見つかりません: {$rule_id}";
                        continue;
                    }
                    
                    if ($rule['status'] !== 'pending') {
                        $errors[] = "承認対象外のステータスです: {$rule['rule_name']} ({$rule['status']})";
                        continue;
                    }
                    
                    // ステータス更新
                    $update_query = "UPDATE {$this->table} 
                                    SET status = 'approved', updated_at = NOW() 
                                    WHERE rule_id = ? AND tenant_id = ?";
                    $update_stmt = $this->db->prepare($update_query);
                    $result = $update_stmt->execute([$rule_id, $tenant_id]);
                    
                    if ($result) {
                        $approved_count++;
                        
                        // 監査ログ
                        kicho_log('info', 'ルール承認', [
                            'rule_id' => $rule_id,
                            'rule_name' => $rule['rule_name'],
                            'approved_by' => $user_id
                        ], true); // audit=true
                    } else {
                        $errors[] = "ルール承認処理に失敗しました: {$rule['rule_name']}";
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "ルール処理エラー ({$rule_id}): " . $e->getMessage();
                }
            }
            
            // トランザクション確定
            $this->db->commit();
            
            $message = "ルール承認処理が完了しました。承認済み: {$approved_count}件";
            if (!empty($errors)) {
                $message .= "、エラー: " . count($errors) . "件";
            }
            
            return [
                'status' => 'success',
                'message' => $message,
                'data' => [
                    'approved_count' => $approved_count,
                    'total_count' => count($rule_ids),
                    'errors' => $errors
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            $this->db->rollBack();
            
            kicho_log('error', 'ルール承認失敗', [
                'error' => $e->getMessage(),
                'rule_ids' => $rule_ids
            ]);
            
            return [
                'status' => 'error',
                'message' => 'ルール承認に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('approve_rules');
        }
    }
    
    /**
     * ルールデータバリデーション
     * 
     * @param array $data ルールデータ
     * @return array バリデーション済みデータ
     */
    private function validateRuleData($data)
    {
        $errors = [];
        
        // 必須フィールド
        if (empty($data['rule_name'])) {
            $errors[] = 'ルール名は必須です';
        }
        
        if (empty($data['rule_type']) || !in_array($data['rule_type'], $this->allowed_types)) {
            $errors[] = 'ルール種別が不正です';
        }
        
        if (empty($data['debit_account'])) {
            $errors[] = '借方勘定科目は必須です';
        }
        
        if (empty($data['credit_account'])) {
            $errors[] = '貸方勘定科目は必須です';
        }
        
        // ステータス
        if (!empty($data['status']) && !in_array($data['status'], $this->allowed_statuses)) {
            $errors[] = 'ステータスが不正です';
        }
        
        // キーワード
        if (!empty($data['keywords']) && !is_array($data['keywords'])) {
            $errors[] = 'キーワードは配列で指定してください';
        }
        
        // 金額範囲
        if (!empty($data['amount_min']) && !is_numeric($data['amount_min'])) {
            $errors[] = '最小金額は数値で指定してください';
        }
        
        if (!empty($data['amount_max']) && !is_numeric($data['amount_max'])) {
            $errors[] = '最大金額は数値で指定してください';
        }
        
        if (!empty($data['amount_min']) && !empty($data['amount_max']) && 
            $data['amount_min'] > $data['amount_max']) {
            $errors[] = '最小金額は最大金額以下で指定してください';
        }
        
        // 優先度
        if (!empty($data['priority']) && !is_numeric($data['priority'])) {
            $errors[] = '優先度は数値で指定してください';
        }
        
        if (!empty($errors)) {
            throw new Exception('バリデーションエラー: ' . implode(', ', $errors));
        }
        
        // デフォルト値設定
        return [
            'rule_name' => $data['rule_name'],
            'rule_type' => $data['rule_type'],
            'keywords' => $data['keywords'] ?? [],
            'amount_min' => !empty($data['amount_min']) ? (float)$data['amount_min'] : null,
            'amount_max' => !empty($data['amount_max']) ? (float)$data['amount_max'] : null,
            'vendor_pattern' => $data['vendor_pattern'] ?? null,
            'priority' => !empty($data['priority']) ? (int)$data['priority'] : 0,
            'debit_account' => $data['debit_account'],
            'credit_account' => $data['credit_account'],
            'debit_sub_account' => $data['debit_sub_account'] ?? null,
            'credit_sub_account' => $data['credit_sub_account'] ?? null,
            'debit_department' => $data['debit_department'] ?? null,
            'credit_department' => $data['credit_department'] ?? null,
            'debit_vendor' => $data['debit_vendor'] ?? null,
            'credit_vendor' => $data['credit_vendor'] ?? null,
            'debit_tax_type' => $data['debit_tax_type'] ?? null,
            'credit_tax_type' => $data['credit_tax_type'] ?? null,
            'tag_template' => $data['tag_template'] ?? null,
            'memo_template' => $data['memo_template'] ?? null,
            'confidence' => !empty($data['confidence']) ? (float)$data['confidence'] : 0.0,
            'status' => $data['status'] ?? 'pending'
        ];
    }
    
    /**
     * UUID生成
     * 
     * @return string UUID
     */
    private function generateUUID()
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    /**
     * 現在のテナントID取得
     * 
     * @return string テナントID
     */
    private function getCurrentTenantId()
    {
        return $_SESSION['tenant_id'] ?? 'default';
    }
    
    /**
     * 現在のユーザーID取得
     * 
     * @return string ユーザーID
     */
    private function getCurrentUserId()
    {
        return $_SESSION['user_id'] ?? 'system';
    }
}

/**
 * グローバル関数
 */

/**
 * 記帳ログ出力
 * 
 * @param string $level ログレベル
 * @param string $message メッセージ
 * @param array $context コンテキストデータ
 * @param bool $audit 監査ログフラグ
 */
function kicho_log($level, $message, $context = [], $audit = false)
{
    $log_data = [
        'timestamp' => date('Y-m-d H:i:s'),
        'level' => $level,
        'message' => $message,
        'context' => $context,
        'user_id' => $_SESSION['user_id'] ?? 'anonymous',
        'session_id' => session_id(),
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    $log_file = $audit ? '/var/log/nagano3/kicho_audit.log' : '/var/log/nagano3/kicho.log';
    $log_line = json_encode($log_data, JSON_UNESCAPED_UNICODE) . "\n";
    
    @file_put_contents($log_file, $log_line, FILE_APPEND | LOCK_EX);
}

/**
 * 権限チェック
 * 
 * @param string $permission 権限名
 * @return bool 権限有無
 */
function kicho_check_permission($permission)
{
    $user_permissions = $_SESSION['user_permissions'] ?? [];
    return in_array($permission, $user_permissions) || in_array('kicho_admin', $user_permissions);
}

/**
 * パフォーマンス監視開始
 * 
 * @param string $operation_name 操作名
 */
function kicho_performance_start($operation_name)
{
    global $KICHO_PERFORMANCE_DATA;
    $KICHO_PERFORMANCE_DATA[$operation_name] = [
        'start_time' => microtime(true),
        'start_memory' => memory_get_usage(true)
    ];
}

/**
 * パフォーマンス監視終了
 * 
 * @param string $operation_name 操作名
 */
function kicho_performance_end($operation_name)
{
    global $KICHO_PERFORMANCE_DATA;
    
    if (!isset($KICHO_PERFORMANCE_DATA[$operation_name])) {
        return;
    }
    
    $start_data = $KICHO_PERFORMANCE_DATA[$operation_name];
    $end_time = microtime(true);
    $end_memory = memory_get_usage(true);
    
    $execution_time = $end_time - $start_data['start_time'];
    $memory_usage = $end_memory - $start_data['start_memory'];
    
    kicho_log('performance', "パフォーマンス測定: {$operation_name}", [
        'execution_time' => round($execution_time * 1000, 2) . 'ms',
        'memory_usage' => round($memory_usage / 1024, 2) . 'KB',
        'operation' => $operation_name
    ]);
    
    unset($KICHO_PERFORMANCE_DATA[$operation_name]);
}

/**
 * デバッグ設定
 */
global $KICHO_DEBUG_CONFIG, $KICHO_PERFORMANCE_DATA;
$KICHO_DEBUG_CONFIG = [
    'debug_mode' => false,
    'log_level' => 'info',
    'enable_performance_monitoring' => true
];
$KICHO_PERFORMANCE_DATA = [];

?>