<?php
/**
 * テーブル構造確認スクリプト
 */

$dsn = "pgsql:host=localhost;dbname=nagano3_db";
$user = "postgres";
$password = "Kn240914";

try {
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== inventory_management テーブル構造 ===\n\n";
    
    $sql = "SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'inventory_management'
            ORDER BY ordinal_position";
    
    $result = $pdo->query($sql);
    $columns = $result->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($columns)) {
        echo "❌ inventory_management テーブルが存在しません\n\n";
        
        echo "=== 既存テーブル一覧 ===\n";
        $tables = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($tables as $table) {
            echo "  - {$table}\n";
        }
    } else {
        foreach ($columns as $col) {
            echo sprintf(
                "%-30s %-20s %-10s %s\n",
                $col['column_name'],
                $col['data_type'],
                $col['is_nullable'],
                $col['column_default'] ?? ''
            );
        }
    }
    
    echo "\n=== stock_history テーブル構造 ===\n\n";
    
    $sql = "SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = 'stock_history'
            ORDER BY ordinal_position";
    
    $result = $pdo->query($sql);
    $columns = $result->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($columns)) {
        echo "❌ stock_history テーブルが存在しません\n";
    } else {
        foreach ($columns as $col) {
            echo sprintf(
                "%-30s %-20s %-10s %s\n",
                $col['column_name'],
                $col['data_type'],
                $col['is_nullable'],
                $col['column_default'] ?? ''
            );
        }
    }
    
} catch (PDOException $e) {
    echo "エラー: " . $e->getMessage() . "\n";
}
?>
