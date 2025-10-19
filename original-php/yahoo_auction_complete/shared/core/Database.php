<?php
/**
 * 統合データベースクラス
 * Yahoo Auction統合システム - shared 基盤
 */

class Database {
    private static $instance = null;
    private $pdo;
    
    /**
     * シングルトンインスタンス取得
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * データベース接続初期化
     */
    private function __construct() {
        try {
            $dsn = "pgsql:host=localhost;dbname=nagano3_db";
            $user = "postgres";
            $password = "Kn240914";
            
            $this->pdo = new PDO($dsn, $user, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // 接続テスト
            $this->pdo->query("SELECT 1");
            
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("データベース接続に失敗しました: " . $e->getMessage());
        }
    }
    
    /**
     * PDOインスタンス取得（直接操作が必要な場合）
     */
    public function getPDO() {
        return $this->pdo;
    }
    
    /**
     * PDOインスタンス取得（別名）
     */
    public function getConnection() {
        return $this->pdo;
    }
    
    /**
     * 安全なSELECTクエリ実行
     * 
     * @param string $table テーブル名
     * @param array $conditions WHERE条件 ['column' => 'value']
     * @param array $options オプション ['limit', 'offset', 'order_by']
     * @return array
     */
    public function select($table, $conditions = [], $options = []) {
        try {
            $sql = "SELECT * FROM " . $this->escapeIdentifier($table);
            $params = [];
            
            // WHERE句の構築
            if (!empty($conditions)) {
                $whereClause = [];
                foreach ($conditions as $column => $value) {
                    if (is_array($value)) {
                        $placeholders = str_repeat('?,', count($value) - 1) . '?';
                        $whereClause[] = $this->escapeIdentifier($column) . " IN ({$placeholders})";
                        $params = array_merge($params, $value);
                    } else {
                        $whereClause[] = $this->escapeIdentifier($column) . " = ?";
                        $params[] = $value;
                    }
                }
                $sql .= " WHERE " . implode(' AND ', $whereClause);
            }
            
            // ORDER BY句
            if (!empty($options['order_by'])) {
                $sql .= " ORDER BY " . $this->escapeIdentifier($options['order_by']);
                if (!empty($options['order_dir']) && strtoupper($options['order_dir']) === 'DESC') {
                    $sql .= " DESC";
                }
            }
            
            // LIMIT句
            if (!empty($options['limit'])) {
                $sql .= " LIMIT " . intval($options['limit']);
                if (!empty($options['offset'])) {
                    $sql .= " OFFSET " . intval($options['offset']);
                }
            }
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll();
            
        } catch (PDOException $e) {
            error_log("Database select error: " . $e->getMessage());
            throw new Exception("データ取得エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 安全なUPDATEクエリ実行
     * 
     * @param string $table テーブル名
     * @param array $data 更新データ ['column' => 'value']
     * @param array $conditions WHERE条件
     * @return int 更新された行数
     */
    public function update($table, $data, $conditions) {
        try {
            if (empty($data) || empty($conditions)) {
                throw new Exception("更新データまたは条件が指定されていません");
            }
            
            $sql = "UPDATE " . $this->escapeIdentifier($table) . " SET ";
            $params = [];
            
            // SET句の構築
            $setClauses = [];
            foreach ($data as $column => $value) {
                $setClauses[] = $this->escapeIdentifier($column) . " = ?";
                $params[] = $value;
            }
            $sql .= implode(', ', $setClauses);
            
            // WHERE句の構築
            $whereClause = [];
            foreach ($conditions as $column => $value) {
                $whereClause[] = $this->escapeIdentifier($column) . " = ?";
                $params[] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->rowCount();
            
        } catch (PDOException $e) {
            error_log("Database update error: " . $e->getMessage());
            throw new Exception("データ更新エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 安全なDELETEクエリ実行
     * 
     * @param string $table テーブル名
     * @param array $conditions WHERE条件
     * @return int 削除された行数
     */
    public function delete($table, $conditions) {
        try {
            if (empty($conditions)) {
                throw new Exception("削除条件が指定されていません");
            }
            
            $sql = "DELETE FROM " . $this->escapeIdentifier($table);
            $params = [];
            
            // WHERE句の構築
            $whereClause = [];
            foreach ($conditions as $column => $value) {
                if (is_array($value)) {
                    $placeholders = str_repeat('?,', count($value) - 1) . '?';
                    $whereClause[] = $this->escapeIdentifier($column) . " IN ({$placeholders})";
                    $params = array_merge($params, $value);
                } else {
                    $whereClause[] = $this->escapeIdentifier($column) . " = ?";
                    $params[] = $value;
                }
            }
            $sql .= " WHERE " . implode(' AND ', $whereClause);
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->rowCount();
            
        } catch (PDOException $e) {
            error_log("Database delete error: " . $e->getMessage());
            throw new Exception("データ削除エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 安全なINSERTクエリ実行
     * 
     * @param string $table テーブル名
     * @param array $data 挿入データ
     * @return int 挿入されたレコードのID
     */
    public function insert($table, $data) {
        try {
            if (empty($data)) {
                throw new Exception("挿入データが指定されていません");
            }
            
            $columns = array_keys($data);
            $placeholders = str_repeat('?,', count($columns) - 1) . '?';
            
            $sql = "INSERT INTO " . $this->escapeIdentifier($table) . 
                   " (" . implode(', ', array_map([$this, 'escapeIdentifier'], $columns)) . ")" .
                   " VALUES ({$placeholders})";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute(array_values($data));
            
            return $this->pdo->lastInsertId();
            
        } catch (PDOException $e) {
            error_log("Database insert error: " . $e->getMessage());
            throw new Exception("データ挿入エラー: " . $e->getMessage());
        }
    }
    
    /**
     * カウントクエリ実行
     * 
     * @param string $table テーブル名
     * @param array $conditions WHERE条件
     * @return int レコード数
     */
    public function count($table, $conditions = []) {
        try {
            $sql = "SELECT COUNT(*) as count FROM " . $this->escapeIdentifier($table);
            $params = [];
            
            if (!empty($conditions)) {
                $whereClause = [];
                foreach ($conditions as $column => $value) {
                    $whereClause[] = $this->escapeIdentifier($column) . " = ?";
                    $params[] = $value;
                }
                $sql .= " WHERE " . implode(' AND ', $whereClause);
            }
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            $result = $stmt->fetch();
            return intval($result['count']);
            
        } catch (PDOException $e) {
            error_log("Database count error: " . $e->getMessage());
            throw new Exception("カウントエラー: " . $e->getMessage());
        }
    }
    
    /**
     * トランザクション開始
     */
    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }
    
    /**
     * トランザクションコミット
     */
    public function commit() {
        return $this->pdo->commit();
    }
    
    /**
     * トランザクションロールバック
     */
    public function rollback() {
        return $this->pdo->rollback();
    }
    
    /**
     * カスタムクエリ実行（複雑なクエリ用）
     * 
     * @param string $sql SQLクエリ
     * @param array $params パラメータ
     * @return PDOStatement
     */
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
            
        } catch (PDOException $e) {
            error_log("Database query error: " . $e->getMessage());
            throw new Exception("クエリエラー: " . $e->getMessage());
        }
    }
    
    /**
     * 識別子のエスケープ（テーブル名・カラム名）
     * 
     * @param string $identifier
     * @return string
     */
    private function escapeIdentifier($identifier) {
        // PostgreSQL用の識別子エスケープ
        return '"' . str_replace('"', '""', $identifier) . '"';
    }
    
    /**
     * 接続状態確認
     * 
     * @return bool
     */
    public function isConnected() {
        try {
            $this->pdo->query("SELECT 1");
            return true;
        } catch (PDOException $e) {
            return false;
        }
    }
}
?>