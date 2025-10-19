<?php
/**
 * eBayカテゴリーシステム現状確認スクリプト
 * 実行前の動作チェック・統合準備
 */

echo "=== eBayカテゴリーシステム現状確認 ===\n";

// 1. データベース接続確認
echo "\n1. データベース接続確認\n";

$dbConfigs = [
    'aritahiroaki' => ['host' => 'localhost', 'dbname' => 'nagano3_db', 'user' => 'aritahiroaki', 'password' => ''],
    'postgres' => ['host' => 'localhost', 'dbname' => 'nagano3_db', 'user' => 'postgres', 'password' => 'Kn240914']
];

$workingConnection = null;

foreach ($dbConfigs as $name => $config) {
    try {
        $dsn = "pgsql:host={$config['host']};dbname={$config['dbname']}";
        $pdo = new PDO($dsn, $config['user'], $config['password']);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->query("SELECT COUNT(*) FROM ebay_category_fees");
        $count = $stmt->fetchColumn();
        
        echo "✅ {$name}接続: 成功 (カテゴリー数: " . number_format($count) . "件)\n";
        $workingConnection = $config;
        break;
        
    } catch (Exception $e) {
        echo "❌ {$name}接続: 失敗 - " . $e->getMessage() . "\n";
    }
}

if (!$workingConnection) {
    die("❌ データベース接続に失敗しました。セットアップが必要です。\n");
}

// 2. テーブル構造確認
echo "\n2. 必須テーブル存在確認\n";

$requiredTables = [
    'ebay_category_fees' => 'eBayカテゴリー・手数料データ',
    'yahoo_scraped_products' => 'Yahoo Auction商品データ',
    'listing_quota_categories' => 'Select Categories分類',
    'current_listings_count' => '出品枠管理',
    'category_keywords' => 'キーワード辞書'
];

foreach ($requiredTables as $table => $description) {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) FROM {$table}");
        $count = $stmt->fetchColumn();
        echo "✅ {$table}: " . number_format($count) . "件 ({$description})\n";
        
    } catch (Exception $e) {
        echo "❌ {$table}: 見つかりません - {$description}\n";
    }
}

// 3. Yahoo商品データ確認
echo "\n3. Yahoo商品データ統合状況\n";

try {
    $sql = "SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as processed,
                COUNT(CASE WHEN ebay_category_id IS NULL THEN 1 END) as unprocessed
            FROM yahoo_scraped_products";
    $stmt = $pdo->query($sql);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "📊 総商品数: " . number_format($stats['total']) . "件\n";
    echo "✅ 処理済み: " . number_format($stats['processed']) . "件\n";
    echo "⏳ 未処理: " . number_format($stats['unprocessed']) . "件\n";
    
    if ($stats['total'] > 0) {
        $processRate = ($stats['processed'] / $stats['total']) * 100;
        echo "📈 処理率: " . number_format($processRate, 1) . "%\n";
    }
    
} catch (Exception $e) {
    echo "❌ Yahoo商品データ確認失敗: " . $e->getMessage() . "\n";
}

// 4. API クラス確認
echo "\n4. APIクラス・ファイル存在確認\n";

$requiredFiles = [
    'backend/classes/UnifiedCategoryDetector.php' => '統合カテゴリー判定クラス',
    'backend/classes/EbayFindingApiConnector.php' => 'eBay API連携クラス',
    'backend/api/unified_category_api.php' => '統合API',
    'frontend/category_massive_viewer.php' => 'メインUI',
    'frontend/ebay_category_tool.php' => '基本UI'
];

foreach ($requiredFiles as $file => $description) {
    if (file_exists($file)) {
        $size = round(filesize($file) / 1024, 1);
        echo "✅ {$file}: 存在 ({$size}KB) - {$description}\n";
    } else {
        echo "❌ {$file}: 見つかりません - {$description}\n";
    }
}

// 5. 推奨アクション
echo "\n=== 推奨アクション ===\n";

if ($workingConnection) {
    echo "✅ データベース接続OK - 統合作業を開始できます\n";
    
    // 接続設定の統一化スクリプト生成
    $configContent = "<?php
// 統一データベース設定ファイル
return [
    'host' => '{$workingConnection['host']}',
    'dbname' => '{$workingConnection['dbname']}',
    'user' => '{$workingConnection['user']}',
    'password' => '{$workingConnection['password']}'
];
?>";
    
    file_put_contents('backend/config/database.php', $configContent);
    echo "📝 統一データベース設定ファイル生成: backend/config/database.php\n";
}

echo "\n📋 次のステップ:\n";
echo "1. category_massive_viewer.php のURL動作確認\n";
echo "2. Yahoo商品データの判定テスト実行\n";
echo "3. 2つのUIツールの統合決定\n";

echo "\n🌐 推定アクセスURL:\n";
echo "http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/category_massive_viewer.php\n";
echo "http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php\n";

echo "\n=== 確認完了 ===\n";
?>