<?php
/**
 * NAGANO-3 System Core - Database Connection Manager
 * system_core/php/database_connection_manager.php
 */

class DatabaseConnectionManager {
    private static $instance = null;
    private $pdo = null;
    
    private function __construct() {
        $this->initConnection();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function initConnection() {
        try {
            $dsn = sprintf(
                "pgsql:host=%s;port=%s;dbname=%s",
                $_ENV['DB_HOST'] ?? 'localhost',
                $_ENV['DB_PORT'] ?? '5432',
                $_ENV['DB_NAME'] ?? 'nagano3_db'
            );
            
            $this->pdo = new PDO(
                $dsn,
                $_ENV['DB_USER'] ?? 'postgres',
                $_ENV['DB_PASS'] ?? '',
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
        } catch (PDOException $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}
