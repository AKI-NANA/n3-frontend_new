<?php
/**
 * 手数料設定修正版（boolean型エラー対応）
 * ファイル: fix_fees_only.php
 */

echo "💰 手数料設定修正版開始\n";
echo "=======================\n";

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";

    // カテゴリー数確認
    $categoryCount = $pdo->query("SELECT COUNT(*) FROM ebay_categories_full")->fetchColumn();
    echo "📊 対象カテゴリー数: " . number_format($categoryCount) . "件\n";

    // 手数料テーブル再作成
    echo "\n💾 手数料テーブル再作成中...\n";
    $pdo->exec("DROP TABLE IF EXISTS ebay_category_fees CASCADE");
    
    $pdo->exec("
        CREATE TABLE ebay_category_fees (
            id SERIAL PRIMARY KEY,
            category_id VARCHAR(20) NOT NULL,
            category_name VARCHAR(255),
            category_path TEXT,
            
            final_value_fee_percent DECIMAL(5,2) DEFAULT 13.60,
            insertion_fee DECIMAL(10,2) DEFAULT 0.00,
            
            is_tiered BOOLEAN DEFAULT FALSE,
            tier_1_percent DECIMAL(5,2),
            tier_1_max_amount DECIMAL(12,2),
            tier_2_percent DECIMAL(5,2),
            
            paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90,
            paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30,
            
            fee_group VARCHAR(50) NOT NULL DEFAULT 'standard',
            fee_group_note TEXT,
            
            currency VARCHAR(3) DEFAULT 'USD',
            effective_date TIMESTAMP DEFAULT NOW(),
            last_updated TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            
            UNIQUE(category_id)
        )
    ");
    echo "✅ 手数料テーブル作成完了\n";

    // 手数料グループ定義
    $feeGroups = [
        'business_industrial' => [
            'rate' => 3.00, 
            'keywords' => ['business', 'industrial', 'equipment', 'commercial', 'manufacturing'],
            'tiered' => false
        ],
        'musical_instruments' => [
            'rate' => 6.70, 
            'keywords' => ['musical', 'instrument', 'guitar', 'piano', 'drum', 'violin'],
            'tiered' => false
        ],
        'motors' => [
            'rate' => 10.00, 
            'keywords' => ['motor', 'car', 'truck', 'auto', 'vehicle', 'automotive'],
            'tiered' => true,
            'tier1_rate' => 10.00,
            'tier1_max' => 2000.00,
            'tier2_rate' => 5.00
        ],
        'art' => [
            'rate' => 12.90, 
            'keywords' => ['art', 'painting', 'sculpture', 'collectible', 'antique'],
            'tiered' => false
        ],
        'health_beauty' => [
            'rate' => 12.35, 
            'keywords' => ['health', 'beauty', 'cosmetic', 'skincare', 'wellness'],
            'tiered' => false
        ],
        'trading_cards' => [
            'rate' => 13.25, 
            'keywords' => ['card', 'trading', 'pokemon', 'sports', 'tcg', 'ccg'],
            'tiered' => false
        ],
        'clothing' => [
            'rate' => 13.60, 
            'keywords' => ['clothing', 'fashion', 'shoes', 'accessories', 'apparel'],
            'tiered' => true,
            'tier1_rate' => 13.60,
            'tier1_max' => 2000.00,
            'tier2_rate' => 9.00
        ],
        'jewelry' => [
            'rate' => 15.00, 
            'keywords' => ['jewelry', 'watch', 'diamond', 'gold', 'silver', 'luxury'],
            'tiered' => true,
            'tier1_rate' => 15.00,
            'tier1_max' => 5000.00,
            'tier2_rate' => 9.00
        ],
        'media' => [
            'rate' => 15.30, 
            'keywords' => ['book', 'movie', 'music', 'cd', 'dvd', 'media'],
            'tiered' => false
        ],
        'standard' => [
            'rate' => 13.60, 
            'keywords' => [],
            'tiered' => false
        ]
    ];

    // 大容量手数料設定
    echo "\n⚙️ 大容量手数料設定中...\n";
    
    $batchSize = 5000;
    $offset = 0;
    $totalAssigned = 0;
    
    do {
        // バッチ単位でカテゴリー取得
        $stmt = $pdo->prepare("
            SELECT category_id, category_name, category_path
            FROM ebay_categories_full
            ORDER BY category_id
            OFFSET ? LIMIT ?
        ");
        $stmt->execute([$offset, $batchSize]);
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($categories)) break;
        
        $pdo->beginTransaction();
        
        try {
            foreach ($categories as $category) {
                $feeGroup = determineFeeGroup($category, $feeGroups);
                $groupData = $feeGroups[$feeGroup];
                
                // boolean値を明示的にセット
                $isTiered = $groupData['tiered'] ? true : false;
                
                $sql = "
                    INSERT INTO ebay_category_fees (
                        category_id, category_name, category_path,
                        final_value_fee_percent,
                        is_tiered, tier_1_percent, tier_1_max_amount, tier_2_percent,
                        fee_group, fee_group_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $category['category_id'],
                    $category['category_name'],
                    $category['category_path'],
                    $groupData['rate'],
                    $isTiered, // boolean値を直接渡す
                    $groupData['tier1_rate'] ?? null,
                    $groupData['tier1_max'] ?? null,
                    $groupData['tier2_rate'] ?? null,
                    $feeGroup,
                    "{$feeGroup} fee group ({$groupData['rate']}%)"
                ]);
                $totalAssigned++;
            }
            
            $pdo->commit();
            echo "  ✅ バッチ完了: " . number_format($totalAssigned) . "件\n";
            
        } catch (Exception $e) {
            $pdo->rollback();
            echo "  ❌ バッチエラー: " . $e->getMessage() . "\n";
            break;
        }
        
        $offset += $batchSize;
        
    } while (count($categories) === $batchSize);
    
    echo "\n📊 手数料設定完了: " . number_format($totalAssigned) . "件\n";
    
    // 手数料統計表示
    echo "\n💰 手数料分布統計\n";
    echo "=================\n";
    
    $distribution = $pdo->query("
        SELECT 
            fee_group,
            final_value_fee_percent,
            COUNT(*) as category_count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM ebay_category_fees
        GROUP BY fee_group, final_value_fee_percent
        ORDER BY final_value_fee_percent ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($distribution as $dist) {
        echo sprintf(
            "  %s: %.2f%% (%s件, %.1f%%)\n",
            $dist['fee_group'],
            $dist['final_value_fee_percent'],
            number_format($dist['category_count']),
            $dist['percentage']
        );
    }
    
    // 全体統計
    $overallStats = $pdo->query("
        SELECT 
            COUNT(*) as total_fees,
            ROUND(AVG(final_value_fee_percent), 2) as avg_fee,
            MIN(final_value_fee_percent) as min_fee,
            MAX(final_value_fee_percent) as max_fee,
            COUNT(CASE WHEN is_tiered = TRUE THEN 1 END) as tiered_categories
        FROM ebay_category_fees
    ")->fetch(PDO::FETCH_ASSOC);
    
    echo "\n📊 全体統計:\n";
    echo "  総手数料カテゴリー: " . number_format($overallStats['total_fees']) . "件\n";
    echo "  平均手数料: {$overallStats['avg_fee']}%\n";
    echo "  手数料範囲: {$overallStats['min_fee']}% - {$overallStats['max_fee']}%\n";
    echo "  段階制カテゴリー: " . number_format($overallStats['tiered_categories']) . "件\n";
    
    echo "\n🎉 手数料設定完了!\n";
    
} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    echo "スタック: " . $e->getTraceAsString() . "\n";
}

/**
 * 手数料グループ決定
 */
function determineFeeGroup($category, $feeGroups) {
    $text = strtolower($category['category_name'] . ' ' . ($category['category_path'] ?? ''));

    foreach ($feeGroups as $groupName => $groupData) {
        if ($groupName === 'standard') continue; // 最後にチェック

        foreach ($groupData['keywords'] as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return $groupName;
            }
        }
    }

    return 'standard';
}
?>