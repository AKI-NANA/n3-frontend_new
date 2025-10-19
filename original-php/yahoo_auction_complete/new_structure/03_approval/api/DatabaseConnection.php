<?php
/**
 * データベース接続管理クラス
 * フィードバック反映：パフォーマンス最適化とコネクション管理
 */

class DatabaseConnection {
    private static $instances = [];
    private $pdo;
    private $logger;
    private $connectionPool = [];
    private $maxConnections = 10;
    
    private function __construct($config = []) {
        $this->logger = getLogger('database');
        $this->connect($config);
    }
    
    /**
     * シングルトンインスタンス取得
     */
    public static function getInstance($config = []) {
        $key = md5(serialize($config));
        
        if (!isset(self::$instances[$key])) {
            self::$instances[$key] = new self($config);
        }
        
        return self::$instances[$key];
    }
    
    /**
     * PDOインスタンス取得
     */
    public function getPDO() {
        // 接続が切れている場合は再接続
        if (!$this->isConnected()) {
            $this->reconnect();
        }
        
        return $this->pdo;
    }
    
    /**
     * データベース接続
     */
    private function connect($config = []) {
        $startTime = microtime(true);
        
        try {
            $host = $config['host'] ?? $_ENV['DB_HOST'] ?? 'localhost';
            $port = $config['port'] ?? $_ENV['DB_PORT'] ?? '5432';
            $dbname = $config['dbname'] ?? $_ENV['DB_NAME'] ?? 'nagano3';
            $username = $config['username'] ?? $_ENV['DB_USER'] ?? 'postgres';
            $password = $config['password'] ?? $_ENV['DB_PASS'] ?? '';
            $charset = $config['charset'] ?? 'utf8';
            
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};charset={$charset}";
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => $config['persistent'] ?? true,
                PDO::ATTR_TIMEOUT => $config['timeout'] ?? 30,
                PDO::ATTR_CASE => PDO::CASE_NATURAL
            ];
            
            $this->pdo = new PDO($dsn, $username, $password, $options);
            
            // PostgreSQL 固有の設定
            $this->pdo->exec("SET timezone = 'Asia/Tokyo'");
            $this->pdo->exec("SET client_encoding = 'UTF8'");
            $this->pdo->exec("SET application_name = 'nagano3_approval'");
            
            $this->logger->logPerformance('Database connection', $startTime, [
                'host' => $host,
                'database' => $dbname,
                'status' => 'success'
            ]);
            
        } catch (PDOException $e) {
            $this->logger->error('Database connection failed', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'host' => $host ?? 'unknown',
                'database' => $dbname ?? 'unknown'
            ]);
            
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    /**
     * 接続状態確認
     */
    private function isConnected() {
        try {
            if (!$this->pdo) return false;
            
            $this->pdo->query('SELECT 1');
            return true;
        } catch (PDOException $e) {
            $this->logger->warning('Database connection lost', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * 再接続
     */
    private function reconnect() {
        $this->logger->info('Attempting database reconnection');
        $this->pdo = null;
        $this->connect();
    }
    
    /**
     * トランザクション実行
     */
    public function transaction(callable $callback) {
        $startTime = microtime(true);
        
        try {
            $this->pdo->beginTransaction();
            
            $result = $callback($this->pdo);
            
            $this->pdo->commit();
            
            $this->logger->logPerformance('Transaction completed', $startTime, [
                'status' => 'committed'
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            
            $this->logger->error('Transaction failed', [
                'error' => $e->getMessage(),
                'execution_time' => (microtime(true) - $startTime) * 1000
            ]);
            
            throw $e;
        }
    }
    
    /**
     * クエリ実行（ログ付き）
     */
    public function query($sql, $params = []) {
        $startTime = microtime(true);
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $executionTime = (microtime(true) - $startTime) * 1000;
            $rowCount = $stmt->rowCount();
            
            $this->logger->logDatabase($sql, $executionTime, $rowCount);
            
            return $stmt;
            
        } catch (PDOException $e) {
            $executionTime = (microtime(true) - $startTime) * 1000;
            
            $this->logger->error('Query execution failed', [
                'sql' => $this->sanitizeQuery($sql),
                'params' => $params,
                'error' => $e->getMessage(),
                'execution_time' => $executionTime
            ]);
            
            throw $e;
        }
    }
    
    /**
     * バルクインサート（高性能）
     */
    public function bulkInsert($table, $data, $columns = null) {
        if (empty($data)) {
            return 0;
        }
        
        $startTime = microtime(true);
        
        // カラム名を取得
        if ($columns === null) {
            $columns = array_keys($data[0]);
        }
        
        $columnList = implode(', ', array_map(function($col) {
            return '"' . str_replace('"', '""', $col) . '"';
        }, $columns));
        
        $placeholders = '(' . implode(', ', array_fill(0, count($columns), '?')) . ')';
        $allPlaceholders = implode(', ', array_fill(0, count($data), $placeholders));
        
        $sql = "INSERT INTO \"{$table}\" ({$columnList}) VALUES {$allPlaceholders}";
        
        // パラメータを平坦化
        $params = [];
        foreach ($data as $row) {
            foreach ($columns as $column) {
                $params[] = $row[$column] ?? null;
            }
        }
        
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $insertedCount = $stmt->rowCount();
            $executionTime = (microtime(true) - $startTime) * 1000;
            
            $this->logger->info('Bulk insert completed', [
                'table' => $table,
                'inserted_count' => $insertedCount,
                'execution_time' => $executionTime
            ]);
            
            return $insertedCount;
            
        } catch (PDOException $e) {
            $this->logger->error('Bulk insert failed', [
                'table' => $table,
                'row_count' => count($data),
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }
    
    /**
     * ページング対応クエリ
     */
    public function paginate($sql, $params = [], $page = 1, $limit = 20) {
        $offset = ($page - 1) * $limit;
        
        // 全体件数を取得
        $countSql = "SELECT COUNT(*) FROM ({$sql}) as count_query";
        $countStmt = $this->query($countSql, $params);
        $total = $countStmt->fetchColumn();
        
        // データを取得
        $dataSql = "{$sql} LIMIT {$limit} OFFSET {$offset}";
        $dataStmt = $this->query($dataSql, $params);
        $data = $dataStmt->fetchAll();
        
        return [
            'data' => $data,
            'pagination' => [
                'page' => (int)$page,
                'limit' => (int)$limit,
                'total' => (int)$total,
                'pages' => (int)ceil($total / $limit),
                'has_next' => $page < ceil($total / $limit),
                'has_prev' => $page > 1
            ]
        ];
    }
    
    /**
     * アップサート（UPSERT）実行
     */
    public function upsert($table, $data, $conflictColumns, $updateColumns = null) {
        if (empty($data)) {
            return 0;
        }
        
        if ($updateColumns === null) {
            $updateColumns = array_keys($data);
            $updateColumns = array_diff($updateColumns, $conflictColumns);
        }
        
        $columns = array_keys($data);
        $columnList = implode(', ', array_map(function($col) {
            return '"' . str_replace('"', '""', $col) . '"';
        }, $columns));
        
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        
        $conflictColumnList = implode(', ', array_map(function($col) {
            return '"' . str_replace('"', '""', $col) . '"';
        }, $conflictColumns));
        
        $updateSet = implode(', ', array_map(function($col) {
            $escapedCol = '"' . str_replace('"', '""', $col) . '"';
            return "{$escapedCol} = EXCLUDED.{$escapedCol}";
        }, $updateColumns));
        
        $sql = "
            INSERT INTO \"{$table}\" ({$columnList}) 
            VALUES ({$placeholders})
            ON CONFLICT ({$conflictColumnList}) 
            DO UPDATE SET {$updateSet}
        ";
        
        $params = array_values($data);
        
        return $this->query($sql, $params)->rowCount();
    }
    
    /**
     * 統計情報取得
     */
    public function getStats() {
        try {
            $stats = [];
            
            // 接続情報
            $stats['connection'] = [
                'server_version' => $this->pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
                'client_version' => $this->pdo->getAttribute(PDO::ATTR_CLIENT_VERSION),
                'connection_status' => $this->isConnected() ? 'connected' : 'disconnected'
            ];
            
            // データベース統計
            $dbStats = $this->query("
                SELECT 
                    pg_database_size(current_database()) as database_size,
                    (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
                    current_setting('max_connections') as max_connections
            ")->fetch();
            
            $stats['database'] = $dbStats;
            
            // テーブル統計
            $tableStats = $this->query("
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    seq_scan as seq_scans,
                    idx_scan as index_scans
                FROM pg_stat_user_tables 
                WHERE schemaname = 'public'
                ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
                LIMIT 10
            ")->fetchAll();
            
            $stats['tables'] = $tableStats;
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to get database stats', [
                'error' => $e->getMessage()
            ]);
            
            return ['error' => 'Failed to retrieve statistics'];
        }
    }
    
    /**
     * クエリサニタイズ（ログ用）
     */
    private function sanitizeQuery($query) {
        // パスワードやトークンをマスク
        $query = preg_replace('/password\s*=\s*[\'"][^\'"]*/i', 'password=***', $query);
        $query = preg_replace('/token\s*=\s*[\'"][^\'"]*/i', 'token=***', $query);
        
        // 長すぎるクエリは省略
        if (strlen($query) > 1000) {
            $query = substr($query, 0, 1000) . '... [truncated]';
        }
        
        return $query;
    }
    
    /**
     * デストラクタ
     */
    public function __destruct() {
        if ($this->pdo) {
            $this->logger->debug('Database connection closed');
        }
    }
}

/**
 * グローバル関数：データベース接続取得
 */
function getDatabaseConnection($config = []) {
    return DatabaseConnection::getInstance($config)->getPDO();
}

/**
 * グローバル関数：データベースインスタンス取得
 */
function getDatabase($config = []) {
    return DatabaseConnection::getInstance($config);
}

/**
 * グローバル関数：トランザクション実行
 */
function dbTransaction(callable $callback, $config = []) {
    return DatabaseConnection::getInstance($config)->transaction($callback);
}
