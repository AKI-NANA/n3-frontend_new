<?php
/**
 * データ表示問題デバッグスクリプト
 * editing.phpのデータ取得機能を単独でテスト
 */

// エラー表示を有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Yahoo Auction データ編集システム - デバッグ診断</h2>";
echo "<pre>";

// 1. PHPの基本確認
echo "=== PHP基本確認 ===\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Current Time: " . date('Y-m-d H:i:s') . "\n";
echo "Memory Limit: " . ini_get('memory_limit') . "\n";

// 2. データベース接続テスト
echo "\n=== データベース接続テスト ===\n";
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ データベース接続: 成功\n";
    
    // 接続テストクエリ
    $testQuery = $pdo->query("SELECT current_database(), version()");
    $result = $testQuery->fetch();
    echo "データベース名: " . $result['current_database'] . "\n";
    echo "PostgreSQL Version: " . substr($result['version'], 0, 50) . "...\n";
    
} catch (PDOException $e) {
    echo "❌ データベース接続: 失敗\n";
    echo "エラー: " . $e->getMessage() . "\n";
    $pdo = null;
}

// 3. テーブル存在確認
if ($pdo) {
    echo "\n=== テーブル存在確認 ===\n";
    
    try {
        $tableQuery = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        $tables = $tableQuery->fetchAll(PDO::FETCH_COLUMN);
        
        echo "利用可能なテーブル (" . count($tables) . "個):\n";
        foreach ($tables as $table) {
            echo "  - " . $table . "\n";
        }
        
        // yahoo_scraped_products テーブルの確認
        if (in_array('yahoo_scraped_products', $tables)) {
            echo "\n✅ yahoo_scraped_products テーブル: 存在\n";
            
            // カラム構造確認
            $columnQuery = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' ORDER BY ordinal_position");
            $columns = $columnQuery->fetchAll(PDO::FETCH_ASSOC);
            
            echo "カラム構造 (" . count($columns) . "個):\n";
            foreach ($columns as $column) {
                echo "  - " . $column['column_name'] . " (" . $column['data_type'] . ")\n";
            }
            
        } else {
            echo "❌ yahoo_scraped_products テーブル: 存在しません\n";
        }
        
    } catch (Exception $e) {
        echo "❌ テーブル確認エラー: " . $e->getMessage() . "\n";
    }
}

// 4. データ件数確認
if ($pdo && in_array('yahoo_scraped_products', $tables ?? [])) {
    echo "\n=== データ件数確認 ===\n";
    
    try {
        // 全体件数
        $countQuery = $pdo->query("SELECT COUNT(*) as total FROM yahoo_scraped_products");
        $totalCount = $countQuery->fetchColumn();
        echo "全データ件数: " . number_format($totalCount) . "件\n";
        
        // 未出品データ件数
        $unlistedQuery = $pdo->query("SELECT COUNT(*) as count FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = '')");
        $unlistedCount = $unlistedQuery->fetchColumn();
        echo "未出品データ件数: " . number_format($unlistedCount) . "件\n";
        
        // 最新5件のサンプルデータ
        if ($totalCount > 0) {
            echo "\n=== サンプルデータ (最新5件) ===\n";
            $sampleQuery = $pdo->query("SELECT id, source_item_id, active_title, price_jpy, updated_at FROM yahoo_scraped_products ORDER BY updated_at DESC LIMIT 5");
            $samples = $sampleQuery->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($samples as $sample) {
                echo sprintf("ID:%s | Item:%s | Title:%s | Price:¥%s | Updated:%s\n",
                    $sample['id'],
                    substr($sample['source_item_id'] ?? 'N/A', 0, 15),
                    substr($sample['active_title'] ?? 'N/A', 0, 30),
                    number_format($sample['price_jpy'] ?? 0),
                    $sample['updated_at']
                );
            }
        }
        
    } catch (Exception $e) {
        echo "❌ データ確認エラー: " . $e->getMessage() . "\n";
    }
}

// 5. APIエンドポイントテスト
echo "\n=== APIエンドポイントテスト ===\n";

if ($pdo) {
    try {
        // get_scraped_products API のシミュレーション
        $page = 1;
        $limit = 5;
        
        $sql = "SELECT 
                    id,
                    source_item_id as item_id,
                    COALESCE(active_title, 'タイトルなし') as title,
                    price_jpy as price,
                    COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,
                    COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
                    COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
                    COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                    (scraped_yahoo_data->>'url')::text as source_url,
                    updated_at,
                    CASE 
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%yahoo.co.jp%' THEN 'Yahoo'
                        ELSE 'Unknown'
                    END as platform,
                    sku as master_sku,
                    CASE 
                        WHEN ebay_item_id IS NULL OR ebay_item_id = '' THEN 'not_listed'
                        ELSE 'listed'
                    END as listing_status,
                    -- eBayカテゴリー判定結果
                    ebay_category_id,
                    ebay_category_path,
                    category_confidence
                FROM yahoo_scraped_products 
                WHERE 1=1 
                ORDER BY updated_at DESC, id DESC 
                LIMIT ? OFFSET ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, ($page - 1) * $limit]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "✅ APIクエリ実行: 成功\n";
        echo "取得データ件数: " . count($data) . "件\n";
        
        if (count($data) > 0) {
            echo "\nサンプルレスポンス (1件目):\n";
            $sample = $data[0];
            echo "ID: " . ($sample['id'] ?? 'N/A') . "\n";
            echo "Item ID: " . ($sample['item_id'] ?? 'N/A') . "\n";
            echo "Title: " . substr($sample['title'] ?? 'N/A', 0, 50) . "\n";
            echo "Price: ¥" . number_format($sample['price'] ?? 0) . "\n";
            echo "Platform: " . ($sample['platform'] ?? 'N/A') . "\n";
            echo "eBay Category: " . ($sample['ebay_category_path'] ?? 'N/A') . "\n";
            echo "Confidence: " . ($sample['category_confidence'] ?? 'N/A') . "%\n";
        }
        
    } catch (Exception $e) {
        echo "❌ APIクエリエラー: " . $e->getMessage() . "\n";
    }
} else {
    echo "❌ データベース接続なし\n";
}

// 6. ファイル存在確認
echo "\n=== 関連ファイル存在確認 ===\n";
$files = [
    'editing.php' => file_exists('editing.php'),
    'editing.js' => file_exists('editing.js'),
    'delete_functions.js' => file_exists('delete_functions.js'),
    'ebay_category_display.js' => file_exists('ebay_category_display.js'),
    'hybrid_price_display.js' => file_exists('hybrid_price_display.js')
];

foreach ($files as $file => $exists) {
    echo ($exists ? "✅" : "❌") . " {$file}: " . ($exists ? "存在" : "存在しません") . "\n";
}

echo "\n=== 診断完了 ===\n";
echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";

echo "</pre>";
?>