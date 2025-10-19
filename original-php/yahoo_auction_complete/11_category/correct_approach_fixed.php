<?php
/**
 * Boolean型エラー修正版：全カテゴリー + 手数料マッピング
 * PostgreSQLのboolean型を正しく処理
 */

echo "🎯 Boolean型修正版：全カテゴリー + 手数料マッピング\n";
echo "===============================================\n";

try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";

    // 現在のカテゴリー数確認
    $currentCount = $pdo->query("SELECT COUNT(*) FROM ebay_categories_full")->fetchColumn();
    echo "📊 現在のカテゴリー数: " . number_format($currentCount) . "件\n";

    // ジェミナイサンプル手数料データ
    $sampleFees = [
        'Business & Industrial' => 3.00,
        'Musical Instruments' => 6.70,
        'Books & Magazines' => 15.30,
        'Movies & TV' => 15.30,
        'Music' => 15.30,
        'Jewelry & Watches' => 15.00,
        'Trading Cards' => 13.25,
        'Coins & Paper Money' => 13.25,
        'Electronics' => 13.60,
        'Clothing' => 13.60,
        'Home & Garden' => 13.60,
        'Toys & Hobbies' => 13.60,
        'Collectibles' => 13.60,
        'Art' => 13.60,
        'Antiques' => 13.60
    ];

    echo "\n🔗 手数料マッピング開始（Boolean型修正版）\n";
    
    // 手数料テーブル再作成
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

    // 全カテゴリー取得
    $categories = $pdo->query("
        SELECT category_id, category_name, category_path 
        FROM ebay_categories_full 
        WHERE is_active = TRUE
    ")->fetchAll(PDO::FETCH_ASSOC);

    echo "📊 処理対象カテゴリー: " . number_format(count($categories)) . "件\n";

    $mappedCount = 0;
    $batchSize = 1000;
    $batches = array_chunk($categories, $batchSize);

    foreach ($batches as $batchIndex => $batch) {
        $pdo->beginTransaction();
        
        try {
            foreach ($batch as $category) {
                $feePercent = 13.60; // デフォルト
                $feeGroup = 'standard';
                
                // パスベースでの手数料判定
                foreach ($sampleFees as $pattern => $fee) {
                    if (stripos($category['category_path'], $pattern) !== false || 
                        stripos($category['category_name'], $pattern) !== false) {
                        $feePercent = $fee;
                        $feeGroup = strtolower(str_replace([' ', '&'], ['_', 'and'], $pattern));
                        break;
                    }
                }
                
                // 段階制判定（明示的にboolean値を設定）
                $isTiered = false;
                $tier1Percent = null;
                $tier1Max = null;
                $tier2Percent = null;
                
                if (($feePercent == 15.00 && stripos($category['category_path'], 'Jewelry') !== false) ||
                    ($feePercent == 13.60 && stripos($category['category_path'], 'Clothing') !== false)) {
                    $isTiered = true;
                    $tier1Percent = $feePercent;
                    $tier1Max = 2500.00;
                    $tier2Percent = 9.00;
                }
                
                // SQL実行（boolean値を文字列として渡す）
                $sql = "
                    INSERT INTO ebay_category_fees (
                        category_id, category_name, category_path,
                        final_value_fee_percent, is_tiered, 
                        tier_1_percent, tier_1_max_amount, tier_2_percent,
                        fee_group, fee_group_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $category['category_id'],
                    $category['category_name'],
                    $category['category_path'],
                    $feePercent,
                    $isTiered ? 'true' : 'false', // PostgreSQL boolean as string
                    $tier1Percent,
                    $tier1Max,
                    $tier2Percent,
                    $feeGroup,
                    "Gemini pattern mapping ({$feePercent}%)"
                ]);
                
                $mappedCount++;
            }
            
            $pdo->commit();
            echo "  ✅ バッチ" . ($batchIndex + 1) . "完了: " . number_format($mappedCount) . "件\n";
            
        } catch (Exception $e) {
            $pdo->rollback();
            echo "  ❌ バッチエラー: " . $e->getMessage() . "\n";
            break;
        }
    }

    echo "\n✅ マッピング完了: " . number_format($mappedCount) . "件\n";

    // 結果確認
    displayResults($pdo);

} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    echo "スタック: " . $e->getTraceAsString() . "\n";
}

/**
 * 結果表示
 */
function displayResults($pdo) {
    echo "\n📊 最終結果\n";
    echo "===========\n";
    
    // 基本統計
    $categoryCount = $pdo->query("SELECT COUNT(*) FROM ebay_categories_full")->fetchColumn();
    $feeCount = $pdo->query("SELECT COUNT(*) FROM ebay_category_fees")->fetchColumn();
    $tieredCount = $pdo->query("SELECT COUNT(*) FROM ebay_category_fees WHERE is_tiered = TRUE")->fetchColumn();
    
    echo "総カテゴリー数: " . number_format($categoryCount) . "件\n";
    echo "手数料設定数: " . number_format($feeCount) . "件\n";
    echo "段階制カテゴリー: " . number_format($tieredCount) . "件\n";
    
    // 手数料分布
    echo "\n💰 手数料分布:\n";
    $distribution = $pdo->query("
        SELECT 
            final_value_fee_percent,
            fee_group,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM ebay_category_fees
        GROUP BY final_value_fee_percent, fee_group
        ORDER BY final_value_fee_percent ASC, count DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($distribution as $dist) {
        echo sprintf(
            "  %.2f%% (%s): %s件 (%.1f%%)\n",
            $dist['final_value_fee_percent'],
            $dist['fee_group'],
            number_format($dist['count']),
            $dist['percentage']
        );
    }

    // サンプル表示
    echo "\n📋 各手数料のサンプルカテゴリー:\n";
    $samples = $pdo->query("
        SELECT DISTINCT final_value_fee_percent
        FROM ebay_category_fees
        ORDER BY final_value_fee_percent
    ")->fetchAll(PDO::FETCH_COLUMN);
    
    foreach (array_slice($samples, 0, 8) as $feePercent) {
        $examples = $pdo->prepare("
            SELECT category_id, category_name
            FROM ebay_category_fees
            WHERE final_value_fee_percent = ?
            LIMIT 3
        ");
        $examples->execute([$feePercent]);
        
        echo "\n💰 {$feePercent}%:\n";
        foreach ($examples->fetchAll(PDO::FETCH_ASSOC) as $example) {
            echo "    {$example['category_id']}: {$example['category_name']}\n";
        }
    }
}
?>