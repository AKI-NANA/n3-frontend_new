<?php
/**
 * 取引データモデル
 * modules/kicho/models/transaction_model.php
 * 
 * NAGANO-3統合システム準拠
 * @version 3.0.0
 */

class KichoTransactionModel {
    private $db;
    private $table_name = 'kicho_transactions';
    
    public function __construct() {
        $this->initializeDatabase();
    }
    
    /**
     * データベース初期化
     */
    private function initializeDatabase() {
        try {
            // NAGANO-3共通DB接続（PostgreSQL）
            $dsn = "pgsql:host=" . (DB_HOST ?? 'localhost') . ";dbname=" . (DB_NAME ?? 'nagano3') . ";charset=utf8";
            $username = DB_USER ?? 'nagano3_user';
            $password = DB_PASS ?? '';
            
            $this->db = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            // テーブル存在確認・作成
            $this->createTableIfNotExists();
            
        } catch (PDOException $e) {
            error_log("取引削除エラー: " . $e->getMessage());
            throw new Exception('取引の削除に失敗しました');
        }
    }
    
    /**
     * 取引ステータス更新
     */
    public function updateTransactionStatus($user_id, $transaction_id, $status, $memo = '') {
        try {
            $sql = "
                UPDATE {$this->table_name} 
                SET 
                    status = :status,
                    memo = CASE 
                        WHEN :memo != '' THEN CONCAT(COALESCE(memo, ''), ' | ', :memo)
                        ELSE memo 
                    END,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :user_id
                WHERE id = :transaction_id 
                AND tenant_id = :user_id
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':status', $status, PDO::PARAM_STR);
            $stmt->bindValue(':memo', $memo, PDO::PARAM_STR);
            
            $result = $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('取引が見つからないか、更新権限がありません');
            }
            
            return $result;
            
        } catch (PDOException $e) {
            error_log("ステータス更新エラー: " . $e->getMessage());
            throw new Exception('ステータスの更新に失敗しました');
        }
    }
    
    /**
     * MFクラウド同期ステータス更新
     */
    public function updateMFSyncStatus($user_id, $transaction_id, $status) {
        try {
            $sql = "
                UPDATE {$this->table_name} 
                SET 
                    mf_sync_status = :status,
                    mf_sync_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :transaction_id 
                AND tenant_id = :user_id
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':status', $status, PDO::PARAM_STR);
            
            return $stmt->execute();
            
        } catch (PDOException $e) {
            error_log("MF同期ステータス更新エラー: " . $e->getMessage());
            throw new Exception('MF同期ステータスの更新に失敗しました');
        }
    }
    
    /**
     * 一括ステータス更新
     */
    public function bulkUpdateStatus($user_id, $transaction_ids, $status) {
        try {
            if (empty($transaction_ids) || !is_array($transaction_ids)) {
                throw new Exception('更新対象の取引が指定されていません');
            }
            
            $placeholders = str_repeat('?,', count($transaction_ids) - 1) . '?';
            
            $sql = "
                UPDATE {$this->table_name} 
                SET 
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = ?
                WHERE id IN ({$placeholders})
                AND tenant_id = ?
            ";
            
            $stmt = $this->db->prepare($sql);
            
            $params = [$status, $user_id];
            $params = array_merge($params, $transaction_ids);
            $params[] = $user_id;
            
            $result = $stmt->execute($params);
            
            return $stmt->rowCount();
            
        } catch (PDOException $e) {
            error_log("一括ステータス更新エラー: " . $e->getMessage());
            throw new Exception('一括ステータス更新に失敗しました');
        }
    }
    
    /**
     * 取引検索（高度検索）
     */
    public function searchTransactions($user_id, $search_params) {
        try {
            $where_conditions = ['tenant_id = :user_id'];
            $params = ['user_id' => $user_id];
            
            // 金額範囲検索
            if (!empty($search_params['amount_min'])) {
                $where_conditions[] = 'amount >= :amount_min';
                $params['amount_min'] = $search_params['amount_min'];
            }
            
            if (!empty($search_params['amount_max'])) {
                $where_conditions[] = 'amount <= :amount_max';
                $params['amount_max'] = $search_params['amount_max'];
            }
            
            // 信頼度範囲検索
            if (!empty($search_params['confidence_min'])) {
                $where_conditions[] = 'confidence >= :confidence_min';
                $params['confidence_min'] = $search_params['confidence_min'];
            }
            
            // AI生成フラグ
            if (isset($search_params['ai_generated'])) {
                $where_conditions[] = 'ai_generated = :ai_generated';
                $params['ai_generated'] = $search_params['ai_generated'];
            }
            
            // 部門検索
            if (!empty($search_params['department'])) {
                $where_conditions[] = 'department = :department';
                $params['department'] = $search_params['department'];
            }
            
            // 勘定科目検索
            if (!empty($search_params['account'])) {
                $where_conditions[] = '(debit_account ILIKE :account OR credit_account ILIKE :account)';
                $params['account'] = '%' . $search_params['account'] . '%';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            $sql = "
                SELECT 
                    id,
                    transaction_no,
                    transaction_date,
                    description,
                    amount,
                    debit_account,
                    credit_account,
                    status,
                    confidence,
                    applied_rule_name,
                    ai_generated,
                    created_at
                FROM {$this->table_name} 
                WHERE {$where_clause}
                ORDER BY transaction_date DESC, confidence DESC
                LIMIT 1000
            ";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(":{$key}", $value);
            }
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("高度検索エラー: " . $e->getMessage());
            throw new Exception('検索処理に失敗しました');
        }
    }
    
    /**
     * 月次サマリー取得
     */
    public function getMonthlySummary($user_id, $year, $month) {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_count,
                    SUM(amount) as total_amount,
                    AVG(confidence) as avg_confidence,
                    DATE_TRUNC('day', transaction_date) as transaction_day,
                    COUNT(*) as daily_count
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND EXTRACT(YEAR FROM transaction_date) = :year
                AND EXTRACT(MONTH FROM transaction_date) = :month
                GROUP BY DATE_TRUNC('day', transaction_date)
                ORDER BY transaction_day
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':year', $year, PDO::PARAM_INT);
            $stmt->bindValue(':month', $month, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("月次サマリー取得エラー: " . $e->getMessage());
            throw new Exception('月次サマリーの取得に失敗しました');
        }
    }
    
    /**
     * データベース接続終了
     */
    public function __destruct() {
        $this->db = null;
    }
}

?>
            error_log("記帳システムDB接続エラー: " . $e->getMessage());
            throw new Exception('データベース接続に失敗しました');
        }
    }
    
    /**
     * テーブル作成
     */
    private function createTableIfNotExists() {
        $sql = "
            CREATE TABLE IF NOT EXISTS {$this->table_name} (
                id SERIAL PRIMARY KEY,
                uuid UUID DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(100) NOT NULL,
                transaction_no VARCHAR(50) NOT NULL,
                transaction_date DATE NOT NULL,
                description TEXT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                debit_account VARCHAR(100) NOT NULL,
                credit_account VARCHAR(100) NOT NULL,
                debit_tax_type VARCHAR(50) DEFAULT '課税仕入10%',
                credit_tax_type VARCHAR(50) DEFAULT '対象外',
                department VARCHAR(100),
                memo TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                confidence INTEGER DEFAULT 0,
                applied_rule_id INTEGER,
                applied_rule_name VARCHAR(200),
                ai_generated BOOLEAN DEFAULT FALSE,
                mf_sync_status VARCHAR(20) DEFAULT 'pending',
                mf_sync_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(100),
                updated_by VARCHAR(100),
                UNIQUE(tenant_id, transaction_no)
            );
            
            CREATE INDEX IF NOT EXISTS idx_kicho_transactions_tenant_status 
                ON {$this->table_name}(tenant_id, status);
            CREATE INDEX IF NOT EXISTS idx_kicho_transactions_date 
                ON {$this->table_name}(transaction_date);
            CREATE INDEX IF NOT EXISTS idx_kicho_transactions_amount 
                ON {$this->table_name}(amount);
        ";
        
        $this->db->exec($sql);
    }
    
    /**
     * 取引一覧取得（フィルター・ページング対応）
     */
    public function getTransactions($filters = [], $page = 1, $per_page = 50) {
        try {
            $where_conditions = ['tenant_id = :user_id'];
            $params = ['user_id' => $filters['user_id']];
            
            // フィルター条件構築
            if (!empty($filters['status'])) {
                $where_conditions[] = 'status = :status';
                $params['status'] = $filters['status'];
            }
            
            if (!empty($filters['date_from'])) {
                $where_conditions[] = 'transaction_date >= :date_from';
                $params['date_from'] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $where_conditions[] = 'transaction_date <= :date_to';
                $params['date_to'] = $filters['date_to'];
            }
            
            if (!empty($filters['keyword'])) {
                $where_conditions[] = '(description ILIKE :keyword OR debit_account ILIKE :keyword OR credit_account ILIKE :keyword)';
                $params['keyword'] = '%' . $filters['keyword'] . '%';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            // 総件数取得
            $count_sql = "SELECT COUNT(*) FROM {$this->table_name} WHERE {$where_clause}";
            $count_stmt = $this->db->prepare($count_sql);
            $count_stmt->execute($params);
            $total_count = $count_stmt->fetchColumn();
            
            // データ取得（ページング）
            $offset = ($page - 1) * $per_page;
            $sql = "
                SELECT 
                    id,
                    uuid,
                    transaction_no,
                    transaction_date,
                    description,
                    amount,
                    debit_account,
                    credit_account,
                    debit_tax_type,
                    credit_tax_type,
                    department,
                    memo,
                    status,
                    confidence,
                    applied_rule_name,
                    ai_generated,
                    mf_sync_status,
                    created_at,
                    updated_at
                FROM {$this->table_name} 
                WHERE {$where_clause}
                ORDER BY transaction_date DESC, created_at DESC
                LIMIT :limit OFFSET :offset
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':limit', $per_page, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue(":{$key}", $value);
            }
            
            $stmt->execute();
            $transactions = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => [
                    'transactions' => $transactions,
                    'pagination' => [
                        'current_page' => $page,
                        'per_page' => $per_page,
                        'total_count' => $total_count,
                        'total_pages' => ceil($total_count / $per_page)
                    ]
                ]
            ];
            
        } catch (PDOException $e) {
            error_log("取引一覧取得エラー: " . $e->getMessage());
            throw new Exception('取引データの取得に失敗しました');
        }
    }
    
    /**
     * 取引詳細取得
     */
    public function getTransaction($user_id, $transaction_id) {
        try {
            $sql = "
                SELECT * FROM {$this->table_name}
                WHERE id = :transaction_id 
                AND tenant_id = :user_id
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->execute();
            
            $transaction = $stmt->fetch();
            
            if (!$transaction) {
                throw new Exception('取引が見つかりません');
            }
            
            return $transaction;
            
        } catch (PDOException $e) {
            error_log("取引詳細取得エラー: " . $e->getMessage());
            throw new Exception('取引詳細の取得に失敗しました');
        }
    }
    
    /**
     * 承認待ち取引数取得
     */
    public function getPendingCount($user_id) {
        try {
            $sql = "SELECT COUNT(*) FROM {$this->table_name} WHERE tenant_id = :user_id AND status = 'pending'";
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->execute();
            
            return (int)$stmt->fetchColumn();
            
        } catch (PDOException $e) {
            error_log("承認待ち件数取得エラー: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * 取引更新
     */
    public function updateTransaction($user_id, $transaction_id, $data) {
        try {
            $sql = "
                UPDATE {$this->table_name} 
                SET 
                    description = :description,
                    amount = :amount,
                    debit_account = :debit_account,
                    credit_account = :credit_account,
                    transaction_date = :transaction_date,
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :user_id
                WHERE id = :transaction_id 
                AND tenant_id = :user_id
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':description', $data['description'], PDO::PARAM_STR);
            $stmt->bindValue(':amount', $data['amount'], PDO::PARAM_STR);
            $stmt->bindValue(':debit_account', $data['debit_account'], PDO::PARAM_STR);
            $stmt->bindValue(':credit_account', $data['credit_account'], PDO::PARAM_STR);
            $stmt->bindValue(':transaction_date', $data['transaction_date'], PDO::PARAM_STR);
            
            $result = $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('取引が見つからないか、更新権限がありません');
            }
            
            return $result;
            
        } catch (PDOException $e) {
            error_log("取引更新エラー: " . $e->getMessage());
            throw new Exception('取引の更新に失敗しました');
        }
    }
    
    /**
     * CSV出力用データ取得
     */
    public function getTransactionsForExport($filters = []) {
        try {
            $where_conditions = ['tenant_id = :user_id'];
            $params = ['user_id' => $filters['user_id']];
            
            // フィルター条件構築（getTransactionsと同じロジック）
            if (!empty($filters['status'])) {
                $where_conditions[] = 'status = :status';
                $params['status'] = $filters['status'];
            }
            
            if (!empty($filters['date_from'])) {
                $where_conditions[] = 'transaction_date >= :date_from';
                $params['date_from'] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $where_conditions[] = 'transaction_date <= :date_to';
                $params['date_to'] = $filters['date_to'];
            }
            
            if (!empty($filters['keyword'])) {
                $where_conditions[] = '(description ILIKE :keyword OR debit_account ILIKE :keyword OR credit_account ILIKE :keyword)';
                $params['keyword'] = '%' . $filters['keyword'] . '%';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            $sql = "
                SELECT 
                    transaction_date,
                    transaction_no,
                    description,
                    amount,
                    debit_account,
                    credit_account,
                    status,
                    confidence,
                    applied_rule_name,
                    created_at
                FROM {$this->table_name} 
                WHERE {$where_clause}
                ORDER BY transaction_date DESC, created_at DESC
                LIMIT 10000
            ";
            
            $stmt = $this->db->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue(":{$key}", $value);
            }
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("CSV出力用データ取得エラー: " . $e->getMessage());
            throw new Exception('エクスポートデータの取得に失敗しました');
        }
    }
    
    /**
     * 新規取引作成
     */
    public function createTransaction($user_id, $data) {
        try {
            $sql = "
                INSERT INTO {$this->table_name} (
                    tenant_id,
                    transaction_no,
                    transaction_date,
                    description,
                    amount,
                    debit_account,
                    credit_account,
                    debit_tax_type,
                    credit_tax_type,
                    department,
                    memo,
                    status,
                    confidence,
                    applied_rule_id,
                    applied_rule_name,
                    ai_generated,
                    created_by
                ) VALUES (
                    :user_id,
                    :transaction_no,
                    :transaction_date,
                    :description,
                    :amount,
                    :debit_account,
                    :credit_account,
                    :debit_tax_type,
                    :credit_tax_type,
                    :department,
                    :memo,
                    :status,
                    :confidence,
                    :applied_rule_id,
                    :applied_rule_name,
                    :ai_generated,
                    :created_by
                )
                RETURNING id
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':transaction_no', $data['transaction_no'], PDO::PARAM_STR);
            $stmt->bindValue(':transaction_date', $data['transaction_date'], PDO::PARAM_STR);
            $stmt->bindValue(':description', $data['description'], PDO::PARAM_STR);
            $stmt->bindValue(':amount', $data['amount'], PDO::PARAM_STR);
            $stmt->bindValue(':debit_account', $data['debit_account'], PDO::PARAM_STR);
            $stmt->bindValue(':credit_account', $data['credit_account'], PDO::PARAM_STR);
            $stmt->bindValue(':debit_tax_type', $data['debit_tax_type'] ?? '課税仕入10%', PDO::PARAM_STR);
            $stmt->bindValue(':credit_tax_type', $data['credit_tax_type'] ?? '対象外', PDO::PARAM_STR);
            $stmt->bindValue(':department', $data['department'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':memo', $data['memo'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':status', $data['status'] ?? 'pending', PDO::PARAM_STR);
            $stmt->bindValue(':confidence', $data['confidence'] ?? 0, PDO::PARAM_INT);
            $stmt->bindValue(':applied_rule_id', $data['applied_rule_id'] ?? null, PDO::PARAM_INT);
            $stmt->bindValue(':applied_rule_name', $data['applied_rule_name'] ?? null, PDO::PARAM_STR);
            $stmt->bindValue(':ai_generated', $data['ai_generated'] ?? false, PDO::PARAM_BOOL);
            $stmt->bindValue(':created_by', $user_id, PDO::PARAM_STR);
            
            $stmt->execute();
            $new_id = $stmt->fetchColumn();
            
            return $new_id;
            
        } catch (PDOException $e) {
            error_log("取引作成エラー: " . $e->getMessage());
            throw new Exception('取引の作成に失敗しました');
        }
    }
    
    /**
     * 取引削除（論理削除）
     */
    public function deleteTransaction($user_id, $transaction_id) {
        try {
            $sql = "
                UPDATE {$this->table_name} 
                SET 
                    status = 'deleted',
                    updated_at = CURRENT_TIMESTAMP,
                    updated_by = :user_id
                WHERE id = :transaction_id 
                AND tenant_id = :user_id
                AND status != 'approved'
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':transaction_id', $transaction_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            
            $result = $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('取引が見つからないか、削除権限がありません');
            }
            
            return $result;
            
        } catch (PDOException $e) {
            