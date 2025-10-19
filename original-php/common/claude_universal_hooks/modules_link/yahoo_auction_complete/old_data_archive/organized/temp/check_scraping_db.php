<?php
/**
 * スクレイピングデータベース構造確認スクリプト
 */

// データベース接続
function getDatabaseConnection() {
    try {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = 'password123';
        
        $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        echo "❌ データベース接続エラー: " . $e->getMessage() . "\n";
        return null;
    }
}

function checkScrapingTables() {
    $pdo = getDatabaseConnection();
    if (!$pdo) return;
    
    echo "✅ PostgreSQL接続成功\n\n";
    
    // スクレイピング関連のテーブルを確認
    $tablesQuery = "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%scrap%' OR table_name LIKE '%yahoo%')
        ORDER BY table_name
    ";
    
    $tablesResult = $pdo->query($tablesQuery);
    echo "📋 スクレイピング関連テーブル:\n";
    $scrapingTables = [];
    while ($row = $tablesResult->fetch(PDO::FETCH_ASSOC)) {
        echo "  - " . $row['table_name'] . "\n";
        $scrapingTables[] = $row['table_name'];
    }
    
    // 各テーブルの構造とデータ件数を確認
    foreach ($scrapingTables as $tableName) {
        echo "\n" . str_repeat("=", 50) . "\n";
        echo "📊 テーブル: {$tableName}\n";
        echo str_repeat("=", 50) . "\n";
        
        // テーブル構造確認
        $columnsQuery = "
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = :table_name 
            ORDER BY ordinal_position
        ";
        
        $stmt = $pdo->prepare($columnsQuery);
        $stmt->execute(['table_name' => $tableName]);
        
        echo "カラム構造:\n";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  {$row['column_name']} ({$row['data_type']})\n";
        }
        
        // データ件数確認
        try {
            $countResult = $pdo->query("SELECT COUNT(*) as count FROM $tableName");
            $count = $countResult->fetch(PDO::FETCH_ASSOC)['count'];
            echo "\n📈 データ件数: {$count}件\n";
            
            if ($count > 0) {
                // サンプルデータ確認
                $sampleResult = $pdo->query("SELECT * FROM $tableName LIMIT 3");
                echo "\n📋 サンプルデータ:\n";
                $index = 1;
                while ($row = $sampleResult->fetch(PDO::FETCH_ASSOC)) {
                    echo "\n  レコード {$index}:\n";
                    foreach ($row as $key => $value) {
                        if ($value !== null) {
                            $displayValue = is_string($value) && strlen($value) > 50 
                                ? substr($value, 0, 50) . "..." 
                                : $value;
                            echo "    {$key}: {$displayValue}\n";
                        }
                    }
                    $index++;
                }
            }
        } catch (Exception $e) {
            echo "⚠️ データ取得エラー: " . $e->getMessage() . "\n";
        }
    }
    
    // mystical_japan_treasures_inventory でスクレイピング関連フィールドを確認
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "📊 mystical_japan_treasures_inventory のスクレイピング関連フィールド確認\n";
    echo str_repeat("=", 50) . "\n";
    
    try {
        $columnsQuery = "
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'mystical_japan_treasures_inventory'
            AND (column_name LIKE '%scrap%' OR column_name LIKE '%source%' OR column_name LIKE '%url%')
            ORDER BY column_name
        ";
        
        $stmt = $pdo->query($columnsQuery);
        echo "スクレイピング関連カラム:\n";
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            echo "  {$row['column_name']} ({$row['data_type']})\n";
        }
        
        // source_url があるデータを確認
        $sourceUrlQuery = "
            SELECT COUNT(*) as count
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL AND source_url != ''
        ";
        $result = $pdo->query($sourceUrlQuery);
        $sourceUrlCount = $result->fetch(PDO::FETCH_ASSOC)['count'];
        echo "\nsource_urlが設定されているデータ: {$sourceUrlCount}件\n";
        
        if ($sourceUrlCount > 0) {
            // サンプル確認
            $sampleQuery = "
                SELECT item_id, title, source_url, updated_at
                FROM mystical_japan_treasures_inventory 
                WHERE source_url IS NOT NULL AND source_url != ''
                ORDER BY updated_at DESC
                LIMIT 5
            ";
            $sampleResult = $pdo->query($sampleQuery);
            echo "\nsource_urlありのサンプル:\n";
            while ($row = $sampleResult->fetch(PDO::FETCH_ASSOC)) {
                echo "  ID: {$row['item_id']}, Title: " . substr($row['title'], 0, 30) . "...\n";
                echo "    URL: {$row['source_url']}\n";
                echo "    更新: {$row['updated_at']}\n\n";
            }
        }
        
    } catch (Exception $e) {
        echo "⚠️ エラー: " . $e->getMessage() . "\n";
    }
}

// 実行
checkScrapingTables();
?>
