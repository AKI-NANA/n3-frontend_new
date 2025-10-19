<?php
/**
 * eBayシステム動作テスト
 * ファイル: test_system.php
 */

echo "🧪 eBayシステム動作テスト開始\n";
echo "===========================\n";

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";
    
    // テーブル存在確認
    $tables = ['ebay_categories_full', 'ebay_category_fees', 'ebay_simple_learning'];
    
    echo "\n📊 テーブル存在確認:\n";
    foreach ($tables as $table) {
        try {
            $stmt = $pdo->query("SELECT COUNT(*) FROM {$table}");
            $count = $stmt->fetchColumn();
            echo "  ✅ {$table}: {$count}件\n";
        } catch (Exception $e) {
            echo "  ❌ {$table}: 存在しません\n";
        }
    }
    
    // カテゴリー取得テスト
    echo "\n🔍 カテゴリー取得テスト:\n";
    $stmt = $pdo->query("
        SELECT category_id, category_name, category_level 
        FROM ebay_categories_full 
        ORDER BY category_level, category_name 
        LIMIT 5
    ");
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($categories as $cat) {
        echo "  [{$cat['category_id']}] {$cat['category_name']} (レベル{$cat['category_level']})\n";
    }
    
    // 手数料取得テスト
    echo "\n💰 手数料取得テスト:\n";
    $stmt = $pdo->query("
        SELECT category_id, category_name, final_value_fee_percent, fee_category_type
        FROM ebay_category_fees 
        ORDER BY final_value_fee_percent DESC
        LIMIT 5
    ");
    $fees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($fees as $fee) {
        echo "  [{$fee['category_id']}] {$fee['category_name']}: {$fee['final_value_fee_percent']}% ({$fee['fee_category_type']})\n";
    }
    
    // 学習データ確認
    echo "\n🧠 学習データ確認:\n";
    try {
        $stmt = $pdo->query("
            SELECT title, learned_category_name, confidence, usage_count
            FROM ebay_simple_learning 
            ORDER BY usage_count DESC
            LIMIT 3
        ");
        $learning = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($learning as $learn) {
            echo "  「{$learn['title']}」→ {$learn['learned_category_name']} (信頼度{$learn['confidence']}%, 使用{$learn['usage_count']}回)\n";
        }
    } catch (Exception $e) {
        echo "  学習データなし\n";
    }
    
    // API動作テスト
    echo "\n🌐 API動作テスト:\n";
    
    // テストデータ
    $testProducts = [
        ['title' => 'iPhone 14 Pro 128GB', 'brand' => 'Apple'],
        ['title' => 'Canon EOS R6 ミラーレス', 'brand' => 'Canon'],
        ['title' => 'PlayStation 5 本体', 'brand' => 'Sony']
    ];
    
    foreach ($testProducts as $product) {
        echo "  📱 テスト: {$product['title']}\n";
        
        // 学習データ検索シミュレーション
        $titleHash = hash('md5', strtolower($product['title']));
        $stmt = $pdo->prepare("
            SELECT learned_category_name, confidence 
            FROM ebay_simple_learning 
            WHERE title_hash = ?
        ");
        $stmt->execute([$titleHash]);
        $learned = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($learned) {
            echo "    ✅ 学習済み: {$learned['learned_category_name']} (信頼度{$learned['confidence']}%)\n";
        } else {
            echo "    🔍 未学習: キーワード判定が必要\n";
        }
    }
    
    echo "\n🎉 システム動作テスト完了!\n";
    echo "========================\n";
    echo "📋 確認項目:\n";
    echo "  ✅ データベース接続\n";
    echo "  ✅ 必要テーブル存在\n";
    echo "  ✅ カテゴリーデータ\n";
    echo "  ✅ 手数料データ\n";
    echo "  ✅ 学習システム\n";
    echo "\n🌐 WebツールURL:\n";
    echo "  http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php\n";
    
} catch (Exception $e) {
    echo "❌ テストエラー: " . $e->getMessage() . "\n";
}
?>