<?php
/**
 * Yahoo Auction Tool - データベースハンドラー
 * 作成日: 2025-09-15
 * 目的: データベース接続・基本操作
 */

class DatabaseHandler {
    private static $instance = null;
    private $connection = null;
    
    /**
     * シングルトンパターンでインスタンス取得
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * データベース接続取得
     */
    public function getConnection() {
        if ($this->connection === null) {
            $this->connect();
        }
        return $this->connection;
    }
    
    /**
     * データベース接続
     */
    private function connect() {
        try {
            $dsn = sprintf(
                'pgsql:host=%s;port=%s;dbname=%s',
                DB_HOST,
                DB_PORT,
                DB_NAME
            );
            
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            // PostgreSQL固有設定
            $this->connection->exec("SET timezone = 'Asia/Tokyo'");
            $this->connection->exec("SET client_encoding = 'UTF8'");
            
            if (DEBUG_MODE) {
                error_log("データベース接続成功: " . DB_NAME);
            }
            
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            throw new Exception("データベースに接続できません");
        }
    }
    
    /**
     * クエリ実行（SELECT）
     */
    public function select($query, $params = []) {
        try {
            $stmt = $this->getConnection()->prepare($query);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("SELECT エラー: " . $e->getMessage());
            throw new Exception("データ取得に失敗しました");
        }
    }
    
    /**
     * クエリ実行（INSERT/UPDATE/DELETE）
     */
    public function execute($query, $params = []) {
        try {
            $stmt = $this->getConnection()->prepare($query);
            $result = $stmt->execute($params);
            return [
                'success' => $result,
                'affected_rows' => $stmt->rowCount(),
                'last_insert_id' => $this->getConnection()->lastInsertId()
            ];
        } catch (PDOException $e) {
            error_log("EXECUTE エラー: " . $e->getMessage());
            throw new Exception("データ操作に失敗しました");
        }
    }
    
    /**
     * トランザクション開始
     */
    public function beginTransaction() {
        return $this->getConnection()->beginTransaction();
    }
    
    /**
     * コミット
     */
    public function commit() {
        return $this->getConnection()->commit();
    }
    
    /**
     * ロールバック
     */
    public function rollback() {
        return $this->getConnection()->rollback();
    }
    
    /**
     * 接続確認
     */
    public function isConnected() {
        try {
            $this->getConnection()->query('SELECT 1');
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}

/**
 * 便利関数: データベース接続取得
 */
function getDatabaseConnection() {
    try {
        return DatabaseHandler::getInstance()->getConnection();
    } catch (Exception $e) {
        error_log("データベース接続取得エラー: " . $e->getMessage());
        return null;
    }
}

/**
 * 便利関数: SELECT実行
 */
function dbSelect($query, $params = []) {
    try {
        return DatabaseHandler::getInstance()->select($query, $params);
    } catch (Exception $e) {
        error_log("SELECT実行エラー: " . $e->getMessage());
        return [];
    }
}

/**
 * 便利関数: INSERT/UPDATE/DELETE実行
 */
function dbExecute($query, $params = []) {
    try {
        return DatabaseHandler::getInstance()->execute($query, $params);
    } catch (Exception $e) {
        error_log("EXECUTE実行エラー: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * ワークフローデータテーブル作成
 */
function createWorkflowDataTable() {
    $query = "
        CREATE TABLE IF NOT EXISTS workflow_data (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255),
            workflow_step INTEGER NOT NULL,
            data_payload JSONB,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_workflow_data_step ON workflow_data(workflow_step);
        CREATE INDEX IF NOT EXISTS idx_workflow_data_session ON workflow_data(session_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_data_status ON workflow_data(status);
    ";
    
    return dbExecute($query);
}

/**
 * システムログテーブル作成
 */
function createSystemLogsTable() {
    $query = "
        CREATE TABLE IF NOT EXISTS system_logs (
            id SERIAL PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT NOW(),
            session_id VARCHAR(255),
            level VARCHAR(20) DEFAULT 'info',
            message TEXT,
            context JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
        CREATE INDEX IF NOT EXISTS idx_system_logs_session ON system_logs(session_id);
    ";
    
    return dbExecute($query);
}

// 必要なテーブルを自動作成
try {
    createWorkflowDataTable();
    createSystemLogsTable();
    
    if (DEBUG_MODE) {
        error_log("データベーステーブル確認・作成完了");
    }
} catch (Exception $e) {
    error_log("テーブル作成エラー: " . $e->getMessage());
}
?>