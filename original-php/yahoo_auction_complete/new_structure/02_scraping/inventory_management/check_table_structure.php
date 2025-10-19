<?php
/**
 * yahoo_scraped_products テーブル構造確認スクリプト
 */

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", "postgres", "Kn240914");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // テーブル構造確認
    $stmt = $pdo->query("
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'yahoo_scraped_products'
        ORDER BY ordinal_position
    ");
    
    echo "yahoo_scraped_products テーブル構造:\n";
    echo str_repeat('=', 50) . "\n";
    
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo sprintf("%-30s %s\n", $row['column_name'], $row['data_type']);
    }
    
} catch (Exception $e) {
    echo "エラー: " . $e->getMessage() . "\n";
}
?>
