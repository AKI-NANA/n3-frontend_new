<?php
/**
 * eBayシステム完全状況確認
 * ファイル: system_status.php
 */

echo "📊 eBayカテゴリーシステム完全状況確認\n";
echo "===================================\n";

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n\n";
    
    // 1. 基本統計
    echo "🔢 基本統計\n";
    echo "==========\n";
    
    $basicStats = $pdo->query("
        SELECT 
            (SELECT COUNT(*) FROM ebay_categories_full) as total_categories,
            (SELECT COUNT(*) FROM ebay_category_fees) as total_fees,
            (SELECT COUNT(*) FROM ebay_simple_learning) as learning_patterns,
            (SELECT COUNT(*) FROM category_keywords) as keywords
    ")->fetch(PDO::FETCH_ASSOC);
    
    foreach ($basicStats as $key => $value) {
        echo "  " . str_replace('_', ' ', ucfirst($key)) . ": {$value}件\n";
    }
    
    // 2. カテゴリーレベル分布
    echo "\n📈 カテゴリーレベル分布\n";
    echo "======================\n";
    
    $levelStats = $pdo->query("
        SELECT 
            category_level,
            COUNT(*) as total_count,
            COUNT(CASE WHEN is_leaf = TRUE THEN 1 END) as leaf_count,
            ROUND(COUNT(CASE WHEN is_leaf = TRUE THEN 1 END) * 100.0 / COUNT(*), 1) as leaf_percentage
        FROM ebay_categories_full
        GROUP BY category_level
        ORDER BY category_level
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    $grandTotal = 0;
    $grandLeaf = 0;
    
    foreach ($levelStats as $stat) {
        echo sprintf(
            "  レベル%d: %d件 (リーフ: %d件, %.1f%%)\n",
            $stat['category_level'],
            $stat['total_count'],
            $stat['leaf_count'],
            $stat['leaf_percentage']
        );
        $grandTotal += $stat['total_count'];
        $grandLeaf += $stat['leaf_count'];
    }
    
    echo "  ──────────────────────────────\n";
    echo sprintf("  合計: %d件 (リーフ: %d件, %.1f%%)\n", 
        $grandTotal, $grandLeaf, ($grandLeaf / $grandTotal * 100));
    
    // 3. 手数料分布
    echo "\n💰 手数料分布\n";
    echo "============\n";
    
    $feeDistribution = $pdo->query("
        SELECT 
            fee_category_type,
            final_value_fee_percent,
            COUNT(*) as category_count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM ebay_category_fees
        GROUP BY fee_category_type, final_value_fee_percent
        ORDER BY final_value_fee_percent DESC, category_count DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($feeDistribution as $dist) {
        echo sprintf(
            "  %s: %.2f%% (%d件, %.1f%%)\n",
            $dist['fee_category_type'],
            $dist['final_value_fee_percent'],
            $dist['category_count'],
            $dist['percentage']
        );
    }
    
    // 4. 手数料統計サマリー
    echo "\n📊 手数料統計サマリー\n";
    echo "==================\n";
    
    $feeStats = $pdo->query("
        SELECT 
            COUNT(*) as total_fee_categories,
            ROUND(AVG(final_value_fee_percent), 2) as avg_fee,
            MIN(final_value_fee_percent) as min_fee,
            MAX(final_value_fee_percent) as max_fee,
            COUNT(CASE WHEN fee_tier_1_percent IS NOT NULL THEN 1 END) as tiered_categories
        FROM ebay_category_fees
    ")->fetch(PDO::FETCH_ASSOC);
    
    echo "  総手数料カテゴリー: {$feeStats['total_fee_categories']}件\n";
    echo "  平均手数料: {$feeStats['avg_fee']}%\n";
    echo "  最低手数料: {$feeStats['min_fee']}%\n";
    echo "  最高手数料: {$feeStats['max_fee']}%\n";
    echo "  段階制カテゴリー: {$feeStats['tiered_categories']}件\n";
    
    // 5. 学習データ分析
    echo "\n🧠 学習データ分析\n";
    echo "================\n";
    
    $learningStats = $pdo->query("
        SELECT 
            COUNT(*) as total_patterns,
            ROUND(AVG(confidence), 1) as avg_confidence,
            SUM(usage_count) as total_usage,
            COUNT(CASE WHEN usage_count >= 5 THEN 1 END) as mature_patterns,
            COUNT(CASE WHEN confidence >= 90 THEN 1 END) as high_confidence_patterns
        FROM ebay_simple_learning
    ")->fetch(PDO::FETCH_ASSOC);
    
    echo "  学習パターン総数: {$learningStats['total_patterns']}件\n";
    echo "  平均信頼度: {$learningStats['avg_confidence']}%\n";
    echo "  総使用回数: {$learningStats['total_usage']}回\n";
    echo "  成熟パターン(5回以上): {$learningStats['mature_patterns']}件\n";
    echo "  高信頼度パターン(90%以上): {$learningStats['high_confidence_patterns']}件\n";
    
    // 6. 主要カテゴリー例
    echo "\n🌟 主要カテゴリー例\n";
    echo "=================\n";
    
    $majorCategories = $pdo->query("
        SELECT 
            c.category_id,
            c.category_name,
            c.category_level,
            f.final_value_fee_percent,
            f.fee_category_type
        FROM ebay_categories_full c
        LEFT JOIN ebay_category_fees f ON c.category_id = f.category_id
        WHERE c.category_level = 1
        ORDER BY c.category_name
        LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($majorCategories as $cat) {
        $feeInfo = $cat['final_value_fee_percent'] ? 
            "{$cat['final_value_fee_percent']}% ({$cat['fee_category_type']})" : 
            "手数料未設定";
        echo "  [{$cat['category_id']}] {$cat['category_name']} - {$feeInfo}\n";
    }
    
    // 7. 学習済みパターン例
    echo "\n🎯 学習済みパターン例\n";
    echo "===================\n";
    
    $learnedPatterns = $pdo->query("
        SELECT 
            title,
            learned_category_name,
            confidence,
            usage_count
        FROM ebay_simple_learning
        ORDER BY usage_count DESC, confidence DESC
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($learnedPatterns as $pattern) {
        echo "  「{$pattern['title']}」→ {$pattern['learned_category_name']} ";
        echo "(信頼度{$pattern['confidence']}%, 使用{$pattern['usage_count']}回)\n";
    }
    
    // 8. システム健全性チェック
    echo "\n✅ システム健全性チェック\n";
    echo "========================\n";
    
    $healthChecks = [
        'カテゴリーデータ' => $basicStats['total_categories'] >= 20,
        '手数料データ' => $basicStats['total_fees'] >= 20,
        'キーワード辞書' => $basicStats['keywords'] >= 25,
        '学習データ' => $basicStats['learning_patterns'] >= 3,
        'リーフカテゴリー' => $grandLeaf >= 10
    ];
    
    foreach ($healthChecks as $check => $status) {
        $icon = $status ? '✅' : '❌';
        echo "  {$icon} {$check}\n";
    }
    
    $allHealthy = array_reduce($healthChecks, function($carry, $item) {
        return $carry && $item;
    }, true);
    
    echo "\n" . ($allHealthy ? "🎉" : "⚠️") . " システム状態: ";
    echo $allHealthy ? "完全に機能中" : "一部改善が必要";
    echo "\n";
    
    // 9. 推奨アクション
    if (!$allHealthy) {
        echo "\n🔧 推奨アクション\n";
        echo "================\n";
        
        if ($basicStats['total_categories'] < 50) {
            echo "  📈 より多くのカテゴリーデータの追加を推奨\n";
        }
        if ($basicStats['learning_patterns'] < 10) {
            echo "  🧠 学習データの蓄積（実際の商品でテスト）を推奨\n";
        }
        if ($basicStats['keywords'] < 50) {
            echo "  🔤 キーワード辞書の拡充を推奨\n";
        }
    }
    
    echo "\n🌐 WebツールURL:\n";
    echo "  http://localhost:8080/modules/yahoo_auction_complete/new_structure/11_category/frontend/ebay_category_tool.php\n";
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}
?>