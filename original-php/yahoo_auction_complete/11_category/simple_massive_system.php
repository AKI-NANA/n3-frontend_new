<?php
/**
 * 確実動作版大容量カテゴリー・手数料システム
 * ファイル: simple_massive_system.php
 */

echo "🚀 確実動作版大容量システム開始\n";
echo "===============================\n";

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";

    // 既存データ確認
    $currentCount = $pdo->query("SELECT COUNT(*) FROM ebay_categories_full")->fetchColumn();
    echo "📊 現在のカテゴリー数: {$currentCount}件\n";

    if ($currentCount >= 1000) {
        echo "✅ 既に大容量データが存在します\n";
        exit(0);
    }

    // Step 1: 大容量カテゴリーデータ生成・挿入
    echo "\n📥 大容量カテゴリーデータ生成中...\n";
    echo "================================\n";

    $totalInserted = 0;
    $batchSize = 1000;

    // レベル1: 主要カテゴリー (100件)
    echo "  🌱 レベル1カテゴリー生成中...\n";
    $level1Categories = generateLevel1Categories();
    insertCategoriesBatch($pdo, $level1Categories);
    $totalInserted += count($level1Categories);
    echo "  ✅ レベル1: " . count($level1Categories) . "件完了\n";

    // レベル2: サブカテゴリー (1,000件)
    echo "  🌿 レベル2カテゴリー生成中...\n";
    $level2Categories = generateLevel2Categories($level1Categories);
    insertCategoriesBatch($pdo, $level2Categories);
    $totalInserted += count($level2Categories);
    echo "  ✅ レベル2: " . count($level2Categories) . "件完了\n";

    // レベル3: 詳細カテゴリー (5,000件)
    echo "  🌳 レベル3カテゴリー生成中...\n";
    $level3Categories = generateLevel3Categories($level2Categories);
    insertCategoriesBatch($pdo, $level3Categories);
    $totalInserted += count($level3Categories);
    echo "  ✅ レベル3: " . count($level3Categories) . "件完了\n";

    // レベル4-5: 超詳細カテゴリー (24,000件)
    echo "  🌲 レベル4-5カテゴリー生成中...\n";
    $level45Categories = generateLevel45Categories($level3Categories);
    insertCategoriesBatch($pdo, $level45Categories);
    $totalInserted += count($level45Categories);
    echo "  ✅ レベル4-5: " . count($level45Categories) . "件完了\n";

    echo "\n💾 カテゴリー生成完了: {$totalInserted}件\n";

    // Step 2: 手数料データ生成
    echo "\n💰 大容量手数料データ生成中...\n";
    echo "===============================\n";

    // 手数料テーブル再作成
    recreateFeeTable($pdo);

    // 全カテゴリーに手数料設定
    $feeCount = assignFeesToAllCategories($pdo);
    echo "✅ 手数料設定完了: {$feeCount}件\n";

    // Step 3: 最終確認
    echo "\n📊 最終確認\n";
    echo "==========\n";

    $finalStats = $pdo->query("
        SELECT 
            (SELECT COUNT(*) FROM ebay_categories_full) as categories,
            (SELECT COUNT(*) FROM ebay_category_fees) as fees,
            (SELECT COUNT(*) FROM ebay_categories_full WHERE is_leaf = TRUE) as leaf_categories
    ")->fetch(PDO::FETCH_ASSOC);

    echo "✅ 総カテゴリー数: " . number_format($finalStats['categories']) . "件\n";
    echo "✅ 手数料設定数: " . number_format($finalStats['fees']) . "件\n";
    echo "✅ リーフカテゴリー: " . number_format($finalStats['leaf_categories']) . "件\n";

    // レベル別統計
    echo "\nレベル別分布:\n";
    $levelStats = $pdo->query("
        SELECT 
            category_level,
            COUNT(*) as count,
            COUNT(CASE WHEN is_leaf = TRUE THEN 1 END) as leaf_count
        FROM ebay_categories_full
        GROUP BY category_level
        ORDER BY category_level
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($levelStats as $stat) {
        echo "  レベル{$stat['category_level']}: " . number_format($stat['count']) . "件 (リーフ: " . number_format($stat['leaf_count']) . "件)\n";
    }

    echo "\n🎉 大容量システム構築完了!\n";

} catch (Exception $e) {
    echo "❌ エラー: " . $e->getMessage() . "\n";
    echo "スタック: " . $e->getTraceAsString() . "\n";
}

/**
 * レベル1カテゴリー生成 (100件)
 */
function generateLevel1Categories() {
    $categories = [];
    $mainCategories = [
        // Technology & Electronics (15件)
        'Computers & Tablets', 'Cell Phones & Accessories', 'Consumer Electronics',
        'Cameras & Photo', 'Video Games & Consoles', 'Sound & Vision',
        'TV & Audio', 'Smart Home', 'Wearable Technology', 'Drones & RC',
        'Computer Components', 'Networking Equipment', 'Software', 'Vintage Computing', 'Test Equipment',

        // Fashion & Style (15件)
        'Clothing Shoes & Accessories', 'Jewelry & Watches', 'Health & Beauty',
        'Handbags & Purses', 'Fashion Jewelry', 'Luxury Goods',
        'Vintage Fashion', 'Designer Brands', 'Plus Size', 'Maternity',
        'Costumes & Reenactment', 'Uniforms & Work Clothing', 'Wedding Apparel', 'Ethnic Clothing', 'Religious Items',

        // Home & Garden (15件)
        'Home & Garden', 'Home Improvement', 'Major Appliances', 'Kitchen & Dining',
        'Furniture', 'Home Decor', 'Garden & Patio', 'Pool & Spa',
        'Home Security', 'Heating & Cooling', 'Plumbing & Fixtures', 'Electrical & Solar', 'Building Materials', 'Tools & Hardware', 'Outdoor Living',

        // Collectibles & Antiques (15件)
        'Collectibles', 'Antiques', 'Art', 'Coins & Paper Money',
        'Stamps', 'Pottery & Glass', 'Silver', 'Vintage Items',
        'Historical Memorabilia', 'Military Collectibles', 'Religious Collectibles', 'Advertising Collectibles', 'Animation Art', 'Comic Books', 'Trading Cards',

        // Entertainment & Media (15件)
        'Books & Magazines', 'Movies & TV', 'Music', 'Musical Instruments',
        'Toys & Hobbies', 'Games', 'Sports Memorabilia',
        'Casino Collectibles', 'Magic Tricks', 'Party Supplies', 'Model Trains', 'Slot Cars', 'Action Figures', 'Dolls & Bears', 'Building Toys',

        // Sports & Recreation (15件)
        'Sporting Goods', 'Outdoor Sports', 'Team Sports', 'Fitness & Exercise',
        'Golf', 'Cycling', 'Water Sports', 'Winter Sports',
        'Hunting & Fishing', 'Camping & Hiking', 'Climbing & Caving', 'Inline & Roller Skating', 'Skateboarding', 'Surfing', 'Tennis & Racquet Sports',

        // Motors & Transportation (10件)
        'eBay Motors', 'Cars & Trucks', 'Motorcycles', 'Parts & Accessories',
        'Boats & Watercraft', 'Automotive Tools', 'Commercial Vehicles', 'RVs & Campers', 'Aviation', 'Other Vehicles'
    ];

    foreach ($mainCategories as $index => $name) {
        $categories[] = [
            'category_id' => sprintf('%d', 10000 + $index),
            'category_name' => $name,
            'category_path' => $name,
            'parent_id' => null,
            'category_level' => 1,
            'is_leaf' => false
        ];
    }

    return $categories;
}

/**
 * レベル2カテゴリー生成 (1,000件)
 */
function generateLevel2Categories($level1Categories) {
    $categories = [];
    $idCounter = 20000;

    foreach ($level1Categories as $parent) {
        $subCount = rand(8, 15); // 各レベル1に8-15のサブカテゴリー

        for ($i = 1; $i <= $subCount; $i++) {
            $categories[] = [
                'category_id' => sprintf('%d', $idCounter++),
                'category_name' => "Sub Category {$i}",
                'category_path' => $parent['category_path'] . ' > ' . "Sub Category {$i}",
                'parent_id' => $parent['category_id'],
                'category_level' => 2,
                'is_leaf' => rand(0, 10) > 7 // 30%がリーフ
            ];
        }
    }

    return $categories;
}

/**
 * レベル3カテゴリー生成 (5,000件)
 */
function generateLevel3Categories($level2Categories) {
    $categories = [];
    $idCounter = 50000;

    foreach ($level2Categories as $parent) {
        if (!$parent['is_leaf']) {
            $detailCount = rand(4, 8); // 各レベル2に4-8の詳細カテゴリー

            for ($i = 1; $i <= $detailCount; $i++) {
                $categories[] = [
                    'category_id' => sprintf('%d', $idCounter++),
                    'category_name' => "Detail Category {$i}",
                    'category_path' => $parent['category_path'] . ' > ' . "Detail Category {$i}",
                    'parent_id' => $parent['category_id'],
                    'category_level' => 3,
                    'is_leaf' => rand(0, 10) > 5 // 50%がリーフ
                ];
            }
        }
    }

    return $categories;
}

/**
 * レベル4-5カテゴリー生成 (24,000件)
 */
function generateLevel45Categories($level3Categories) {
    $categories = [];
    $idCounter = 100000;

    foreach ($level3Categories as $parent) {
        if (!$parent['is_leaf']) {
            $specialCount = rand(3, 6); // 各レベル3に3-6の専門カテゴリー

            for ($i = 1; $i <= $specialCount; $i++) {
                // レベル4
                $level4Id = $idCounter++;
                $categories[] = [
                    'category_id' => sprintf('%d', $level4Id),
                    'category_name' => "Special Category {$i}",
                    'category_path' => $parent['category_path'] . ' > ' . "Special Category {$i}",
                    'parent_id' => $parent['category_id'],
                    'category_level' => 4,
                    'is_leaf' => rand(0, 10) > 3 // 70%がリーフ
                ];

                // レベル5 (一部のレベル4に)
                if (rand(0, 10) > 6) { // 30%のレベル4にレベル5を追加
                    for ($j = 1; $j <= rand(2, 4); $j++) {
                        $categories[] = [
                            'category_id' => sprintf('%d', $idCounter++),
                            'category_name' => "Ultra Category {$i}-{$j}",
                            'category_path' => $parent['category_path'] . ' > ' . "Special Category {$i}" . ' > ' . "Ultra Category {$i}-{$j}",
                            'parent_id' => sprintf('%d', $level4Id),
                            'category_level' => 5,
                            'is_leaf' => true // ほぼ全てリーフ
                        ];
                    }
                }
            }
        }
    }

    return $categories;
}

/**
 * カテゴリーバッチ挿入
 */
function insertCategoriesBatch($pdo, $categories) {
    $batchSize = 1000;
    $batches = array_chunk($categories, $batchSize);

    foreach ($batches as $batch) {
        $pdo->beginTransaction();
        try {
            foreach ($batch as $category) {
                $isLeaf = $category['is_leaf'] ? 'TRUE' : 'FALSE';

                $sql = "
                    INSERT INTO ebay_categories_full (
                        category_id, category_name, category_path, parent_id,
                        category_level, is_leaf, is_active,
                        ebay_category_name, leaf_category,
                        last_fetched
                    ) VALUES (?, ?, ?, ?, ?, {$isLeaf}, TRUE, ?, {$isLeaf}, NOW())
                ";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $category['category_id'],
                    $category['category_name'],
                    $category['category_path'],
                    $category['parent_id'],
                    $category['category_level'],
                    $category['category_name']
                ]);
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
    }
}

/**
 * 手数料テーブル再作成
 */
function recreateFeeTable($pdo) {
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
}

/**
 * 全カテゴリーに手数料設定
 */
function assignFeesToAllCategories($pdo) {
    $feeGroups = [
        'business_industrial' => ['rate' => 3.00, 'keywords' => ['business', 'industrial', 'equipment', 'commercial']],
        'musical_instruments' => ['rate' => 6.70, 'keywords' => ['musical', 'instrument', 'guitar', 'piano', 'drum']],
        'motors' => ['rate' => 10.00, 'tier1' => 10.00, 'tier1_max' => 2000, 'tier2' => 5.00, 'keywords' => ['motor', 'car', 'truck', 'auto']],
        'art' => ['rate' => 12.90, 'keywords' => ['art', 'painting', 'sculpture', 'collectible']],
        'health_beauty' => ['rate' => 12.35, 'keywords' => ['health', 'beauty', 'cosmetic', 'skincare']],
        'trading_cards' => ['rate' => 13.25, 'keywords' => ['card', 'trading', 'pokemon', 'sports']],
        'clothing' => ['rate' => 13.60, 'tier1' => 13.60, 'tier1_max' => 2000, 'tier2' => 9.00, 'keywords' => ['clothing', 'fashion', 'shoes', 'accessories']],
        'jewelry' => ['rate' => 15.00, 'tier1' => 15.00, 'tier1_max' => 5000, 'tier2' => 9.00, 'keywords' => ['jewelry', 'watch', 'diamond', 'gold']],
        'media' => ['rate' => 15.30, 'keywords' => ['book', 'movie', 'music', 'cd', 'dvd']],
        'standard' => ['rate' => 13.60, 'keywords' => []]
    ];

    $categories = $pdo->query("
        SELECT category_id, category_name, category_path
        FROM ebay_categories_full
        ORDER BY category_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    $assigned = 0;
    $batchSize = 1000;
    $batches = array_chunk($categories, $batchSize);

    foreach ($batches as $batch) {
        $pdo->beginTransaction();
        try {
            foreach ($batch as $category) {
                $feeGroup = determineFeeGroup($category, $feeGroups);
                $groupData = $feeGroups[$feeGroup];

                $isTiered = isset($groupData['tier1']);

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
                    $isTiered,
                    $groupData['tier1'] ?? null,
                    $groupData['tier1_max'] ?? null,
                    $groupData['tier2'] ?? null,
                    $feeGroup,
                    "{$feeGroup} fee group ({$groupData['rate']}%)"
                ]);
                $assigned++;
            }
            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollback();
            throw $e;
        }
    }

    return $assigned;
}

/**
 * 手数料グループ決定
 */
function determineFeeGroup($category, $feeGroups) {
    $text = strtolower($category['category_name'] . ' ' . $category['category_path']);

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