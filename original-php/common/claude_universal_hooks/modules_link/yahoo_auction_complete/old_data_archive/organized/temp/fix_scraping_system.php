<?php
/**
 * スクレイピングシステム緊急修復ツール
 * 過去のチャット分析に基づく統合修正
 * URL: http://localhost:8080/modules/yahoo_auction_complete/fix_scraping_system.php
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>🚨 スクレイピングシステム緊急修復</h1>";
echo "<style>body{font-family:monospace; line-height:1.6;} .success{color:green;} .error{color:red;} .info{color:blue;} .warning{color:orange;} pre{background:#f5f5f5; padding:10px; border-radius:5px; overflow-x:auto;} .fix-section{background:#e8f5e8; padding:15px; border-radius:8px; margin:15px 0;} .problem{background:#ffe6e6; padding:15px; border-radius:8px; margin:15px 0;}</style>";

echo "<div class='problem'>";
echo "<h2>🔍 分析された問題</h2>";
echo "<ul>";
echo "<li>❌ <strong>スクレイピングAPIサーバー未起動</strong> (localhost:5002)</li>";
echo "<li>❌ <strong>データベース接続エラー</strong></li>";
echo "<li>⚠️ <strong>設定ファイル分散</strong> (複数フォルダに散在)</li>";
echo "<li>📊 <strong>表示データ</strong>: サンプルデータのみ</li>";
echo "</ul>";
echo "</div>";

echo "<h2>🛠️ 修復手順</h2>";

// 利用可能なリソースを確認
$base_path = '/Users/aritahiroaki/NAGANO-3/N3-Development/modules';
$source_folders = [
    'yahoo_auction_complete_2' => 'Phase2完成版（推奨）',
    'yahoo_auction_complete_3' => 'Phase3実装版', 
    'yahoo_auction_complete' => '現在のフォルダ'
];

echo "<h3>📂 利用可能なリソース確認</h3>";

foreach ($source_folders as $folder => $description) {
    $folder_path = $base_path . '/' . $folder;
    if (is_dir($folder_path)) {
        echo "<div class='success'>✅ {$folder} - {$description}</div>";
        
        // 重要ファイルの存在確認
        $important_files = [
            'yahoo_auction_tool_content.php' => 'メインシステム',
            'database_query_handler.php' => 'データベース統合',
            'api_servers/yahoo_auction_api_server_fixed.py' => 'APIサーバー',
            'html_csv_integration_tab_complete.html' => '高機能UI'
        ];
        
        echo "<ul>";
        foreach ($important_files as $file => $desc) {
            if (file_exists($folder_path . '/' . $file)) {
                echo "<li class='success'>✅ {$file} - {$desc}</li>";
            } else {
                echo "<li class='warning'>⚠️ {$file} - 未確認</li>";
            }
        }
        echo "</ul>";
    } else {
        echo "<div class='error'>❌ {$folder} - フォルダが見つかりません</div>";
    }
}

echo "<div class='fix-section'>";
echo "<h3>🔧 推奨修復方法</h3>";
echo "<p><strong>yahoo_auction_complete_2</strong> のリソースを使用して現在のシステムを修復します</p>";

// 自動修復処理を提案
echo "<h4>自動修復スクリプト生成</h4>";

$fix_commands = [
    "# 1. 最新APIサーバーをコピー",
    "cp {$base_path}/yahoo_auction_complete_2/api_servers/yahoo_auction_api_server_fixed.py {$base_path}/yahoo_auction_complete/",
    "",
    "# 2. データベースハンドラー更新", 
    "cp {$base_path}/yahoo_auction_complete_2/database_query_handler.php {$base_path}/yahoo_auction_complete/",
    "",
    "# 3. メインシステム更新",
    "cp {$base_path}/yahoo_auction_complete_2/yahoo_auction_tool_content.php {$base_path}/yahoo_auction_complete/",
    "",
    "# 4. Pythonサーバー実行権限付与",
    "chmod +x {$base_path}/yahoo_auction_complete/yahoo_auction_api_server_fixed.py",
    "",
    "# 5. 必要な依存関係確認",
    "pip install flask flask-cors requests beautifulsoup4 pandas",
    "",
    "# 6. APIサーバー起動",
    "cd {$base_path}/yahoo_auction_complete",
    "python yahoo_auction_api_server_fixed.py",
];

echo "<pre>";
foreach ($fix_commands as $command) {
    echo htmlspecialchars($command) . "\n";
}
echo "</pre>";
echo "</div>";

// データベース状況確認
echo "<h3>📊 データベース状況確認</h3>";

try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', 'password123');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<div class='success'>✅ PostgreSQL接続成功</div>";
    
    // テーブル存在確認
    $tables = ['mystical_japan_treasures_inventory', 'yahoo_scraped_products', 'approval_queue'];
    foreach ($tables as $table) {
        $stmt = $pdo->prepare("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ?)");
        $stmt->execute([$table]);
        $exists = $stmt->fetchColumn();
        
        if ($exists) {
            $count_stmt = $pdo->prepare("SELECT COUNT(*) FROM {$table}");
            $count_stmt->execute();
            $count = $count_stmt->fetchColumn();
            echo "<div class='success'>✅ テーブル '{$table}': {$count}件</div>";
        } else {
            echo "<div class='warning'>⚠️ テーブル '{$table}': 存在しません</div>";
        }
    }
    
} catch (Exception $e) {
    echo "<div class='error'>❌ データベース接続エラー: " . htmlspecialchars($e->getMessage()) . "</div>";
}

echo "<div class='fix-section'>";
echo "<h3>🚀 即座に実行可能な修復コマンド</h3>";
echo "<p>以下をターミナルで実行してください：</p>";
echo "<pre>";
echo "cd " . $base_path . "/yahoo_auction_complete\n";
echo "cp ../yahoo_auction_complete_2/api_servers/yahoo_auction_api_server_fixed.py ./\n";
echo "cp ../yahoo_auction_complete_2/database_query_handler.php ./\n";
echo "pip install flask flask-cors requests beautifulsoup4 pandas\n";
echo "python yahoo_auction_api_server_fixed.py\n";
echo "</pre>";
echo "</div>";

echo "<div class='info'>";
echo "<h3>📋 修復完了後の確認項目</h3>";
echo "<ul>";
echo "<li>✅ APIサーバー起動: <a href='http://localhost:5002/health' target='_blank'>http://localhost:5002/health</a></li>";
echo "<li>✅ システム状態: <a href='http://localhost:5002/api/system_status' target='_blank'>http://localhost:5002/api/system_status</a></li>";
echo "<li>✅ メインシステム: <a href='http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php' target='_blank'>http://localhost:8080/modules/yahoo_auction_complete/yahoo_auction_tool_content.php</a></li>";
echo "</ul>";
echo "</div>";

?>
