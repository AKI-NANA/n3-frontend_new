<?php
/**
 * advanced_tariff_calculator.php データベーステスト
 * nagano3_dbに接続して必要なテーブルの存在確認
 */

header('Content-Type: text/html; charset=utf-8');

echo "<h1>advanced_tariff_calculator.php データベース分析</h1>";

// データベース接続テスト
function testDatabaseConnection() {
    $configs = [
        [
            'host' => 'localhost',
            'dbname' => 'nagano3_db',
            'username' => 'postgres',
            'password' => 'Kn240914'
        ]
    ];
    
    foreach ($configs as $config) {
        try {
            $pdo = new PDO(
                "pgsql:host={$config['host']};dbname={$config['dbname']}", 
                $config['username'], 
                $config['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                ]
            );
            return $pdo;
        } catch (PDOException $e) {
            echo "<p style='color: red;'>❌ DB接続失敗: " . $e->getMessage() . "</p>";
            return null;
        }
    }
}

$pdo = testDatabaseConnection();

if ($pdo) {
    echo "<p style='color: green;'>✅ nagano3_db 接続成功</p>";
    
    echo "<h2>1. テーブル存在確認</h2>";
    
    // 必要なテーブルのチェック
    $requiredTables = [
        'advanced_profit_calculations' => '計算履歴保存',
        'exchange_rates' => '為替レート',
        'yahoo_scraped_products' => 'Yahoo商品データ',
        'shipping_service_rates' => '送料データ'
    ];
    
    foreach ($requiredTables as $tableName => $description) {
        try {
            $stmt = $pdo->prepare("
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = ?
                )
            ");
            $stmt->execute([$tableName]);
            $exists = $stmt->fetchColumn();
            
            if ($exists) {
                echo "<p style='color: green;'>✅ {$tableName} テーブル存在 ({$description})</p>";
                
                // レコード数確認
                $countStmt = $pdo->prepare("SELECT COUNT(*) FROM {$tableName}");
                $countStmt->execute();
                $count = $countStmt->fetchColumn();
                echo "<p style='margin-left: 20px;'>レコード数: " . number_format($count) . "件</p>";
                
            } else {
                echo "<p style='color: red;'>❌ {$tableName} テーブル不存在 ({$description})</p>";
            }
        } catch (Exception $e) {
            echo "<p style='color: orange;'>⚠️ {$tableName} チェックエラー: " . $e->getMessage() . "</p>";
        }
    }
    
    echo "<h2>2. advanced_profit_calculationsテーブル構造</h2>";
    try {
        $stmt = $pdo->prepare("
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'advanced_profit_calculations'
            ORDER BY ordinal_position
        ");
        $stmt->execute();
        $columns = $stmt->fetchAll();
        
        if ($columns) {
            echo "<table border='1' style='border-collapse: collapse;'>";
            echo "<tr><th>カラム名</th><th>データ型</th><th>NULL許可</th><th>デフォルト値</th></tr>";
            foreach ($columns as $column) {
                echo "<tr>";
                echo "<td>{$column['column_name']}</td>";
                echo "<td>{$column['data_type']}</td>";
                echo "<td>{$column['is_nullable']}</td>";
                echo "<td>{$column['column_default']}</td>";
                echo "</tr>";
            }
            echo "</table>";
        } else {
            echo "<p style='color: red;'>❌ advanced_profit_calculationsテーブルが存在しません</p>";
            
            echo "<h3>必要なテーブル作成SQL:</h3>";
            echo "<pre style='background: #f0f0f0; padding: 10px;'>";
            echo "CREATE TABLE advanced_profit_calculations (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    shipping_mode VARCHAR(10),
    country VARCHAR(10),
    item_title TEXT NOT NULL,
    purchase_price_jpy DECIMAL(12,2) NOT NULL,
    sell_price_usd DECIMAL(12,2),
    sell_price_local DECIMAL(12,2),
    calculated_profit_jpy DECIMAL(12,2) NOT NULL,
    margin_percent DECIMAL(8,2),
    roi_percent DECIMAL(8,2),
    tariff_jpy DECIMAL(12,2) DEFAULT 0,
    outsource_fee DECIMAL(10,2) DEFAULT 0,
    packaging_fee DECIMAL(10,2) DEFAULT 0,
    exchange_margin DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);";
            echo "</pre>";
        }
    } catch (Exception $e) {
        echo "<p style='color: red;'>テーブル構造確認エラー: " . $e->getMessage() . "</p>";
    }
    
    echo "<h2>3. 保存機能テスト</h2>";
    
    // 保存機能テスト
    if ($pdo->query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'advanced_profit_calculations')")->fetchColumn()) {
        try {
            $testStmt = $pdo->prepare("
                INSERT INTO advanced_profit_calculations 
                (platform, shipping_mode, item_title, purchase_price_jpy, sell_price_usd, 
                 calculated_profit_jpy, margin_percent, roi_percent, tariff_jpy, 
                 outsource_fee, packaging_fee, exchange_margin, calculated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            
            $testData = [
                'TEST_PLATFORM',
                'DDP',
                'テスト商品 - データベース動作確認',
                10000,
                100.00,
                5000,
                50.00,
                50.00,
                2000,
                500,
                200,
                5.0
            ];
            
            $testStmt->execute($testData);
            echo "<p style='color: green;'>✅ データベース保存テスト成功</p>";
            
            // テストデータ削除
            $pdo->prepare("DELETE FROM advanced_profit_calculations WHERE platform = 'TEST_PLATFORM'")->execute();
            echo "<p style='color: blue;'>🧹 テストデータ削除完了</p>";
            
        } catch (Exception $e) {
            echo "<p style='color: red;'>❌ 保存テスト失敗: " . $e->getMessage() . "</p>";
        }
    }
    
} else {
    echo "<p style='color: red;'>❌ データベース接続に失敗しました</p>";
}

echo "<h2>4. 結論</h2>";
echo "<div style='background: #e7f3ff; padding: 15px; border-left: 4px solid #2196f3;'>";
echo "<h3>advanced_tariff_calculator.php のデータベース対応状況:</h3>";
echo "<ul>";
echo "<li><strong>データベース接続:</strong> nagano3_db を使用</li>";
echo "<li><strong>保存機能:</strong> advanced_profit_calculations テーブルに計算履歴を保存</li>";
echo "<li><strong>フォールバック:</strong> データベース接続失敗時は計算のみ実行</li>";
echo "<li><strong>保存内容:</strong> 商品情報、計算結果、利益率、関税額など</li>";
echo "</ul>";
echo "</div>";

echo "<h3>アクセス方法:</h3>";
echo "<p><a href='http://localhost:8080/new_structure/09_shipping/advanced_tariff_calculator.php' target='_blank'>http://localhost:8080/new_structure/09_shipping/advanced_tariff_calculator.php</a></p>";

echo "<h3>API確認:</h3>";
echo "<p><a href='http://localhost:8080/new_structure/09_shipping/advanced_tariff_api_fixed.php?action=health' target='_blank'>http://localhost:8080/new_structure/09_shipping/advanced_tariff_api_fixed.php?action=health</a></p>";

?>
