<?php
/**
 * データベース管理クラス
 * 在庫管理システム用統合データベースハンドラー
 */

class Database {
    private $pdo;
    private $isConnected = false;
    private $transactionLevel = 0;
    private $logger;
    
    public function __construct() {
        $this->logger = new Logger('database');
        $this->connect();
    }
    
    /**
     * データベース接続
     */
    private function connect() {
        try {
            $dsn = sprintf(
                'mysql:host=%s;dbname=%s;charset=%s',
                DB_HOST,
                DB_NAME,
                DB_CHARSET
            );
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET
            ];
            
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            $this->isConnected = true;
            
            $this->logger->info('データベース接続成功');
            
        } catch (PDOException $e) {
            $this->isConnected = false;
            $this->logger->error('データベース接続失敗: ' . $e->getMessage());
            throw new DatabaseException('データベース接続に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * 接続状態確認
     */
    public function isConnected() {
        return $this->isConnected;
    }
    
    /**
     * SELECTクエリ実行（複数行）
     */
    public function select($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $this->logger->debug('SELECT実行成功', [
                'sql' => $sql,
                'params' => $params,
                'row_count' => $stmt->rowCount()
            ]);
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            $this->logger->error('SELECT実行失敗', [
                'sql' => $sql,
                'params' => $params,
                'error' => $e->getMessage()
            ]);
            throw new DatabaseException('SELECT実行に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * SELECTクエリ実行（単一行）
     */
    public function selectRow($sql, $params = []) {
        $result = $this->select($sql, $params);
        return !empty($result) ? $result[0] : null;
    }
    
    /**
     * SELECTクエリ実行（単一値）
     */
    public function selectValue($sql, $params = []) {
        $row = $this->selectRow($sql, $params);
        return $row ? array_values($row)[0] : null;
    }
    
    /**
     * INSERTクエリ実行
     */
    public function insert($table, $data) {
        try {
            $columns = array_keys($data);
            $placeholders = array_map(function($col) { return ':' . $col; }, $columns);
            
            $sql = sprintf(
                'INSERT INTO %s (%s) VALUES (%s)',
                $table,
                implode(', ', $columns),
                implode(', ', $placeholders)
            );
            
            $stmt = $this->pdo->prepare($sql);
            
            // データバインド
            foreach ($data as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            $result = $stmt->execute();
            $insertId = $this->pdo->lastInsertId();
            
            $this->logger->debug('INSERT実行成功', [
                'table' => $table,
                'data' => $data,
                'insert_id' => $insertId
            ]);
            
            return $insertId;
            
        } catch (PDOException $e) {
            $this->logger->error('INSERT実行失敗', [
                'table' => $table,
                'data' => $data,
                'error' => $e->getMessage()
            ]);
            throw new DatabaseException('INSERT実行に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * UPDATEクエリ実行
     */
    public function update($table, $data, $where) {
        try {
            $setParts = [];
            foreach (array_keys($data) as $column) {
                $setParts[] = $column . ' = :' . $column;
            }
            
            $whereParts = [];
            foreach (array_keys($where) as $column) {
                $whereParts[] = $column . ' = :where_' . $column;
            }
            
            $sql = sprintf(
                'UPDATE %s SET %s WHERE %s',
                $table,
                implode(', ', $setParts),
                implode(' AND ', $whereParts)
            );
            
            $stmt = $this->pdo->prepare($sql);
            
            // データバインド
            foreach ($data as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            foreach ($where as $key => $value) {
                $stmt->bindValue(':where_' . $key, $value);
            }
            
            $result = $stmt->execute();
            $affectedRows = $stmt->rowCount();
            
            $this->logger->debug('UPDATE実行成功', [
                'table' => $table,
                'data' => $data,
                'where' => $where,
                'affected_rows' => $affectedRows
            ]);
            
            return $affectedRows;
            
        } catch (PDOException $e) {
            $this->logger->error('UPDATE実行失敗', [
                'table' => $table,
                'data' => $data,
                'where' => $where,
                'error' => $e->getMessage()
            ]);
            throw new DatabaseException('UPDATE実行に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * DELETEクエリ実行
     */
    public function delete($table, $where) {
        try {
            $whereParts = [];
            foreach (array_keys($where) as $column) {
                $whereParts[] = $column . ' = :' . $column;
            }
            
            $sql = sprintf(
                'DELETE FROM %s WHERE %s',
                $table,
                implode(' AND ', $whereParts)
            );
            
            $stmt = $this->pdo->prepare($sql);
            
            foreach ($where as $key => $value) {
                $stmt->bindValue(':' . $key, $value);
            }
            
            $result = $stmt->execute();
            $affectedRows = $stmt->rowCount();
            
            $this->logger->debug('DELETE実行成功', [
                'table' => $table,
                'where' => $where,
                'affected_rows' => $affectedRows
            ]);
            
            return $affectedRows;
            
        } catch (PDOException $e) {
            $this->logger->error('DELETE実行失敗', [
                'table' => $table,
                'where' => $where,
                'error' => $e->getMessage()
            ]);
            throw new DatabaseException('DELETE実行に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * トランザクション開始
     */
    public function beginTransaction() {
        if ($this->transactionLevel === 0) {
            $this->pdo->beginTransaction();
            $this->logger->debug('トランザクション開始');
        }
        $this->transactionLevel++;
    }
    
    /**
     * トランザクションコミット
     */
    public function commit() {
        $this->transactionLevel--;
        if ($this->transactionLevel === 0) {
            $this->pdo->commit();
            $this->logger->debug('トランザクションコミット');
        }
    }
    
    /**
     * トランザクションロールバック
     */
    public function rollback() {
        if ($this->transactionLevel > 0) {
            $this->pdo->rollback();
            $this->transactionLevel = 0;
            $this->logger->debug('トランザクションロールバック');
        }
    }
    
    /**
     * 生SQLクエリ実行
     */
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);
            
            $this->logger->debug('SQL実行成功', [
                'sql' => $sql,
                'params' => $params,
                'affected_rows' => $stmt->rowCount()
            ]);
            
            return $stmt;
            
        } catch (PDOException $e) {
            $this->logger->error('SQL実行失敗', [
                'sql' => $sql,
                'params' => $params,
                'error' => $e->getMessage()
            ]);
            throw new DatabaseException('SQL実行に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * ヘルスチェック
     */
    public function healthCheck() {
        try {
            $startTime = microtime(true);
            $result = $this->selectValue('SELECT 1');
            $responseTime = (microtime(true) - $startTime) * 1000;
            
            return [
                'connected' => true,
                'response_time' => round($responseTime, 2),
                'status' => 'healthy'
            ];
            
        } catch (Exception $e) {
            return [
                'connected' => false,
                'response_time' => null,
                'status' => 'unhealthy',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * デストラクタ
     */
    public function __destruct() {
        if ($this->transactionLevel > 0) {
            $this->rollback();
        }
    }
}

/**
 * データベース例外クラス
 */
class DatabaseException extends Exception {
    public function __construct($message, $code = 0, Exception $previous = null) {
        parent::__construct($message, $code, $previous);
    }
}
?>