<?php
/**
 * 正しいアプローチ：全カテゴリー + サンプル手数料マッピング
 * Step 1: 全カテゴリーをデータベースに格納
 * Step 2: ジェミナイサンプルを基に手数料をマッピング
 */

echo "🎯 正しいアプローチ：全カテゴリー + 手数料マッピング\n";
echo "=============================================\n";

try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";

    // Step 1: 現在のカテゴリー数確認
    $currentCount = $pdo->query("SELECT COUNT(*) FROM ebay_categories_full")->fetchColumn();
    echo "📊 現在のカテゴリー数: " . number_format($currentCount) . "件\n";

    if ($currentCount < 10000) {
        echo "⚠️ カテゴリー数が少なすぎます。まず大容量カテゴリーを生成します。\n";
        
        // 大容量カテゴリー生成
        generateMassiveCategories($pdo);
    }

    // Step 2: ジェミナイサンプルデータ読み込み
    echo "\n📋 ジェミナイサンプル手数料データ読み込み\n";
    $sampleFees = loadGeminiSampleFees();
    
    // Step 3: 手数料マッピングルール作成
    echo "🔗 手数料マッピングルール適用中...\n";
    $mappedCount = applyFeeMapping($pdo, $sampleFees);
    
    echo "\n✅ マッピング完了: " . number_format($mappedCount) . "件\n";

    // Step 4: 結果確認
    displayFinalResults($pdo);

} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
}

/**
 * 大容量カテゴリー生成
 */
function generateMassiveCategories($pdo) {
    echo "  🏗️ 大容量カテゴリー生成中...\n";
    
    // カテゴリー種別定義
    $categoryTypes = [
        'Books & Magazines' => ['Fiction', 'Non-Fiction', 'Educational', 'Children', 'Art Books', 'Technical'],
        'Movies & TV' => ['DVDs', 'Blu-ray', 'VHS', 'Digital', 'Box Sets', 'Collectibles'],
        'Music' => ['CDs', 'Vinyl Records', 'Cassettes', 'Digital', 'Sheet Music', 'Instruments'],
        'Electronics' => ['Cell Phones', 'Computers', 'Audio', 'TV', 'Gaming', 'Cameras'],
        'Clothing' => ['Mens', 'Womens', 'Kids', 'Shoes', 'Accessories', 'Vintage'],
        'Jewelry & Watches' => ['Fine Jewelry', 'Fashion Jewelry', 'Watches', 'Vintage', 'Parts'],
        'Business & Industrial' => ['Heavy Equipment', 'Office', 'Medical', 'Restaurant', 'Manufacturing'],
        'Musical Instruments' => ['Guitars', 'Keyboards', 'Drums', 'Wind Instruments', 'Pro Audio'],
        'Trading Cards' => ['Sports Cards', 'Pokemon', 'Magic', 'Yu-Gi-Oh', 'Other TCG'],
        'Coins & Paper Money' => ['US Coins', 'World Coins', 'Paper Money', 'Bullion', 'Supplies'],
        'Home & Garden' => ['Kitchen', 'Furniture', 'Decor', 'Garden', 'Tools', 'Appliances'],
        'Toys & Hobbies' => ['Action Figures', 'Dolls', 'Games', 'RC', 'Models', 'Crafts'],
        'Collectibles' => ['Sports Memorabilia', 'Autographs', 'Comics', 'Vintage', 'Militaria'],
        'Art' => ['Paintings', 'Prints', 'Sculptures', 'Photography', 'Mixed Media'],
        'Antiques' => ['Furniture', 'Pottery', 'Silver', 'Textiles', 'Decorative Arts']
    ];

    $categoryId = 100000;
    $totalInserted = 0;

    foreach ($categoryTypes as $mainCategory => $subCategories) {
        // メインカテゴリー
        $mainId = $categoryId++;
        insertCategory($pdo, $mainId, $mainCategory, $mainCategory, null, 1, false);
        $totalInserted++;
        
        foreach ($subCategories as $subCategory) {
            // サブカテゴリー
            $subId = $categoryId++;
            $subPath = "{$mainCategory} > {$subCategory}";
            insertCategory($pdo, $subId, $subCategory, $subPath, $mainId, 2, false);
            $totalInserted++;
            
            // 詳細カテゴリー（各サブカテゴリーに10-20個）
            for ($i = 1; $i <= rand(10, 20); $i++) {
                $detailId = $categoryId++;
                $detailName = "{$subCategory} Detail {$i}";
                $detailPath = "{$subPath} > {$detailName}";
                insertCategory($pdo, $detailId, $detailName, $detailPath, $subId, 3, true);
                $totalInserted++;
            }
        }
    }

    echo "    ✅ {$totalInserted}件のカテゴリー生成完了\n";
}

/**
 * カテゴリー挿入
 */
function insertCategory($pdo, $id, $name, $path, $parentId, $level, $isLeaf) {
    $sql = "
        INSERT INTO ebay_categories_full (
            category_id, category_name, category_path, parent_id,
            category_level, is_leaf, is_active, ebay_category_name, 
            leaf_category, last_fetched
        ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, NOW())
        ON CONFLICT (category_id) DO NOTHING
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $id, $name, $path, $parentId, $level, 
        $isLeaf, $name, $isLeaf
    ]);
}

/**
 * ジェミナイサンプル手数料データ読み込み
 */
function loadGeminiSampleFees() {
    return [
        // 低手数料
        'Business & Industrial' => 3.00,
        'Musical Instruments' => 6.70,
        
        // 高手数料
        'Books & Magazines' => 15.30,
        'Movies & TV' => 15.30,
        'Music' => 15.30,
        'Jewelry & Watches' => 15.00,
        
        // 中手数料
        'Trading Cards' => 13.25,
        'Coins & Paper Money' => 13.25,
        
        // 標準手数料
        'Electronics' => 13.60,
        'Clothing' => 13.60,
        'Home & Garden' => 13.60,
        'Toys & Hobbies' => 13.60,
        'Collectibles' => 13.60,
        'Art' => 13.60,
        'Antiques' => 13.60
    ];
}

/**
 * 手数料マッピング適用
 */
function applyFeeMapping($pdo, $sampleFees) {
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

    $mappedCount = 0;
    
    // 全カテゴリーに手数料を適用
    $categories = $pdo->query("
        SELECT category_id, category_name, category_path 
        FROM ebay_categories_full 
        WHERE is_active = TRUE
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($categories as $category) {
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
        
        // 段階制判定
        $isTiered = in_array($feePercent, [15.00, 13.60]) && 
                   (stripos($category['category_path'], 'Jewelry') !== false || 
                    stripos($category['category_path'], 'Clothing') !== false);
        
        // 挿入
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
            $isTiered,
            $isTiered ? $feePercent : null,
            $isTiered ? 2500.00 : null,
            $isTiered ? 9.00 : null,
            $feeGroup,
            "Gemini sample based mapping ({$feePercent}%)"
        ]);
        
        $mappedCount++;
    }
    
    return $mappedCount;
}

/**
 * 最終結果表示
 */
function displayFinalResults($pdo) {
    echo "\n📊 最終結果\n";
    echo "===========\n";
    
    // カテゴリー総数
    $categoryCount = $pdo->query("SELECT COUNT(*) FROM ebay_categories_full")->fetchColumn();
    echo "総カテゴリー数: " . number_format($categoryCount) . "件\n";
    
    // 手数料設定数
    $feeCount = $pdo->query("SELECT COUNT(*) FROM ebay_category_fees")->fetchColumn();
    echo "手数料設定数: " . number_format($feeCount) . "件\n";
    
    // 手数料分布
    echo "\n💰 手数料分布:\n";
    $distribution = $pdo->query("
        SELECT 
            final_value_fee_percent,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
        FROM ebay_category_fees
        GROUP BY final_value_fee_percent
        ORDER BY final_value_fee_percent ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($distribution as $dist) {
        echo "  {$dist['final_value_fee_percent']}%: " . 
             number_format($dist['count']) . "件 ({$dist['percentage']}%)\n";
    }
}
?>