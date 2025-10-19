<?php
/**
 * Supabase接続設定 - 修正版
 */

function getSupabaseConnection() {
    $host = 'db.zdzfpucdyxdlavkgrvil.supabase.co';
    $port = '5432'; // ← 通常のポート（6543から5432に変更）
    $dbname = 'postgres';
    $user = 'postgres'; // ← ユーザー名を短く（.zdzfpucdyxdlavkgrvil を削除）
    $password = 'Kn240914'; // ← 入力したパスワード
    
    try {
        $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
        
        error_log("Attempting connection with: host=$host, port=$port, user=$user");
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        error_log("Connection successful!");
        return $pdo;
        
    } catch (PDOException $e) {
        error_log('Connection failed: ' . $e->getMessage());
        
        // 詳細エラーを返す
        throw new Exception('DB接続失敗: ' . $e->getMessage());
    }
}
?>
