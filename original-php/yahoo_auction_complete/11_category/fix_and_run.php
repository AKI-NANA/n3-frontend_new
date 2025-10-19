<?php
/**
 * eBayシステム強制修正・実行版
 * ファイル: fix_and_run.php
 */

echo "🚀 eBayシステム強制修正・実行開始\n";
echo "===============================\n";

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ データベース接続成功\n";
    
    // Step 1: ebay_categories_fullテーブル強制作成
    echo "\n📊 Step 1: ebay_categories_fullテーブル作成\n";
    echo "=========================================\n";
    
    // 既存テーブル削除
    $pdo->exec("DROP TABLE IF EXISTS ebay_categories_full CASCADE");
    echo "🗑️ 既存テーブル削除\n";
    
    // テーブル作成
    $pdo->exec("
        CREATE TABLE ebay_categories_full (
            category_id VARCHAR(20) PRIMARY KEY,
            category_name VARCHAR(255) NOT NULL,
            category_path TEXT,
            parent_id VARCHAR(20),
            category_level INTEGER DEFAULT 1,
            is_leaf BOOLEAN DEFAULT TRUE,
            is_active BOOLEAN DEFAULT TRUE,
            
            -- eBay固有情報
            ebay_category_name VARCHAR(255),
            category_parent_name VARCHAR(255),
            leaf_category BOOLEAN DEFAULT TRUE,
            
            -- メタデータ
            auto_pay_enabled BOOLEAN DEFAULT FALSE,
            b2b_vat_enabled BOOLEAN DEFAULT FALSE,
            catalog_enabled BOOLEAN DEFAULT FALSE,
            
            -- 日時
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            last_fetched TIMESTAMP DEFAULT NOW()
        )
    ");
    echo "✅ ebay_categories_fullテーブル作成完了\n";
    
    // Step 2: サンプルカテゴリーデータ投入
    echo "\n📥 Step 2: サンプルカテゴリーデータ投入\n";
    echo "===================================\n";
    
    $sampleCategories = [
        // レベル1 (主要カテゴリー)
        ['293', 'Cell Phones & Smartphones', 'Electronics > Cell Phones & Smartphones', null, 1, true],
        ['625', 'Cameras & Photo', 'Electronics > Cameras & Photo', null, 1, false],
        ['11450', 'Clothing, Shoes & Accessories', 'Fashion > Clothing, Shoes & Accessories', null, 1, false],
        ['14324', 'Jewelry & Watches', 'Fashion > Jewelry & Watches', null, 1, false],
        ['267', 'Books', 'Media > Books', null, 1, false],
        ['139973', 'Video Games', 'Entertainment > Video Games', null, 1, true],
        ['58058', 'Sports Trading Cards', 'Collectibles > Sports Trading Cards', null, 1, true],
        ['183454', 'Non-Sport Trading Cards', 'Collectibles > Non-Sport Trading Cards', null, 1, true],
        ['220', 'Toys & Hobbies', 'Entertainment > Toys & Hobbies', null, 1, false],
        ['1249', 'Video Games & Consoles', 'Entertainment > Video Games & Consoles', null, 1, false],
        ['888', 'Trading Card Games', 'Collectibles > Trading Card Games', null, 1, true],
        ['99999', 'Other', 'Miscellaneous > Other', null, 1, true],
        
        // レベル2 (サブカテゴリー)
        ['11232', 'Digital Cameras', 'Electronics > Cameras & Photo > Digital Cameras', '625', 2, true],
        ['3323', 'Lenses & Filters', 'Electronics > Cameras & Photo > Lenses & Filters', '625', 2, true],
        ['11462', 'Women', 'Fashion > Clothing, Shoes & Accessories > Women', '11450', 2, false],
        ['1059', 'Men', 'Fashion > Clothing, Shoes & Accessories > Men', '11450', 2, false],
        ['31387', 'Watches', 'Fashion > Jewelry & Watches > Watches', '14324', 2, true],
        ['4324', 'Fashion Jewelry', 'Fashion > Jewelry & Watches > Fashion Jewelry', '14324', 2, true],
        ['14339', 'Video Game Consoles', 'Entertainment > Video Games & Consoles > Consoles', '1249', 2, true],
        ['171485', 'Video Game Accessories', 'Entertainment > Video Games & Consoles > Accessories', '1249', 2, true],
        
        // レベル3 (詳細カテゴリー)
        ['15687', 'Women Tops', 'Fashion > Clothing, Shoes & Accessories > Women > Tops', '11462', 3, true],
        ['11554', 'Women Dresses', 'Fashion > Clothing, Shoes & Accessories > Women > Dresses', '11462', 3, true],
        ['93427', 'Men Shirts', 'Fashion > Clothing, Shoes & Accessories > Men > Shirts', '1059', 3, true],
        ['57988', 'Men Pants', 'Fashion > Clothing, Shoes & Accessories > Men > Pants', '1059', 3, true]
    ];
    
    $insertedCount = 0;
    foreach ($sampleCategories as $cat) {
        $sql = "
            INSERT INTO ebay_categories_full (
                category_id, category_name, category_path, parent_id,
                category_level, is_leaf, is_active,
                ebay_category_name, leaf_category,
                last_fetched
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $cat[0], $cat[1], $cat[2], $cat[3],
            $cat[4], $cat[5], true,
            $cat[1], $cat[5]
        ]);
        $insertedCount++;
    }
    
    echo "✅ カテゴリーデータ投入完了: {$insertedCount}件\n";
    
    // Step 3: 手数料テーブル作成・データ投入
    echo "\n💰 Step 3: 手数料テーブル作成・データ投入\n";
    echo "=====================================\n";
    
    // 手数料テーブル作成
    $pdo->exec("DROP TABLE IF EXISTS ebay_category_fees CASCADE");
    $pdo->exec("
        CREATE TABLE ebay_category_fees (
            id SERIAL PRIMARY KEY,
            category_id VARCHAR(20) NOT NULL,
            category_name VARCHAR(255),
            category_path TEXT,
            
            -- 基本手数料
            insertion_fee DECIMAL(10,2) DEFAULT 0.00,
            final_value_fee_percent DECIMAL(5,2) DEFAULT 13.60,
            final_value_fee_max DECIMAL(10,2),
            
            -- 段階的手数料
            fee_tier_1_percent DECIMAL(5,2),
            fee_tier_1_max DECIMAL(10,2),
            fee_tier_2_percent DECIMAL(5,2),
            
            -- 追加手数料
            store_fee DECIMAL(10,2) DEFAULT 0.00,
            paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90,
            paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30,
            
            -- メタデータ
            fee_category_type VARCHAR(50) DEFAULT 'standard',
            currency VARCHAR(3) DEFAULT 'USD',
            effective_date TIMESTAMP DEFAULT NOW(),
            last_updated TIMESTAMP DEFAULT NOW(),
            is_active BOOLEAN DEFAULT TRUE,
            
            UNIQUE(category_id)
        )
    ");
    echo "✅ 手数料テーブル作成完了\n";
    
    // 手数料データ投入
    $feeData = [
        // eBay公式手数料表に基づく
        ['293', 'Cell Phones & Smartphones', 13.60, 'standard'],
        ['625', 'Cameras & Photo', 13.60, 'standard'],
        ['11450', 'Clothing, Shoes & Accessories', 13.60, 'clothing_tiered'], // 段階制
        ['14324', 'Jewelry & Watches', 15.00, 'jewelry_tiered'], // 段階制
        ['267', 'Books', 15.30, 'media'],
        ['139973', 'Video Games', 13.25, 'standard'],
        ['58058', 'Sports Trading Cards', 13.25, 'standard'],
        ['183454', 'Non-Sport Trading Cards', 13.25, 'standard'],
        ['220', 'Toys & Hobbies', 13.60, 'standard'],
        ['1249', 'Video Games & Consoles', 13.25, 'standard'],
        ['888', 'Trading Card Games', 13.25, 'standard'],
        ['99999', 'Other', 13.60, 'standard'],
        
        // サブカテゴリー
        ['11232', 'Digital Cameras', 13.60, 'standard'],
        ['3323', 'Lenses & Filters', 13.60, 'standard'],
        ['11462', 'Women', 13.60, 'clothing_tiered'],
        ['1059', 'Men', 13.60, 'clothing_tiered'],
        ['31387', 'Watches', 15.00, 'jewelry_tiered'],
        ['4324', 'Fashion Jewelry', 15.00, 'jewelry_tiered'],
        ['14339', 'Video Game Consoles', 13.25, 'standard'],
        ['171485', 'Video Game Accessories', 13.25, 'standard'],
        ['15687', 'Women Tops', 13.60, 'clothing_tiered'],
        ['11554', 'Women Dresses', 13.60, 'clothing_tiered'],
        ['93427', 'Men Shirts', 13.60, 'clothing_tiered'],
        ['57988', 'Men Pants', 13.60, 'clothing_tiered']
    ];
    
    $feeInsertedCount = 0;
    foreach ($feeData as $fee) {
        // 段階制手数料設定
        $tier1Percent = null;
        $tier1Max = null;
        $tier2Percent = null;
        
        if ($fee[3] === 'clothing_tiered') {
            $tier1Percent = 13.60;
            $tier1Max = 2000.00;
            $tier2Percent = 9.00;
        } elseif ($fee[3] === 'jewelry_tiered') {
            $tier1Percent = 15.00;
            $tier1Max = 5000.00;
            $tier2Percent = 9.00;
        }
        
        $sql = "
            INSERT INTO ebay_category_fees (
                category_id, category_name, final_value_fee_percent,
                fee_tier_1_percent, fee_tier_1_max, fee_tier_2_percent,
                fee_category_type, effective_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $fee[0], $fee[1], $fee[2],
            $tier1Percent, $tier1Max, $tier2Percent,
            $fee[3]
        ]);
        $feeInsertedCount++;
    }
    
    echo "✅ 手数料データ投入完了: {$feeInsertedCount}件\n";
    
    // Step 4: インデックス作成
    echo "\n🔍 Step 4: インデックス作成\n";
    echo "=========================\n";
    
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_categories_full_parent ON ebay_categories_full(parent_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_categories_full_level ON ebay_categories_full(category_level)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_categories_full_leaf ON ebay_categories_full(is_leaf)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_category_fees_type ON ebay_category_fees(fee_category_type)");
    
    echo "✅ インデックス作成完了\n";
    
    // Step 5: 結果確認
    echo "\n📊 Step 5: システム確認\n";
    echo "=====================\n";
    
    // テーブル確認
    $stats = $pdo->query("
        SELECT 
            'ebay_categories_full' as table_name, COUNT(*) as count
        FROM ebay_categories_full
        UNION ALL
        SELECT 
            'ebay_category_fees' as table_name, COUNT(*) as count
        FROM ebay_category_fees
        UNION ALL
        SELECT
            'category_keywords' as table_name, COUNT(*) as count
        FROM category_keywords
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    echo "データベース状況:\n";
    foreach ($stats as $stat) {
        echo "  {$stat['table_name']}: {$stat['count']}件\n";
    }
    
    // カテゴリー統計
    echo "\nカテゴリー統計:\n";
    $categoryStats = $pdo->query("
        SELECT 
            category_level,
            COUNT(*) as count,
            COUNT(CASE WHEN is_leaf = true THEN 1 END) as leaf_count
        FROM ebay_categories_full
        GROUP BY category_level
        ORDER BY category_level
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($categoryStats as $stat) {
        echo "  レベル{$stat['category_level']}: {$stat['count']}件 (リーフ: {$stat['leaf_count']}件)\n";
    }
    
    // 手数料統計
    echo "\n手数料統計:\n";
    $feeStats = $pdo->query("
        SELECT 
            fee_category_type,
            AVG(final_value_fee_percent) as avg_fee,
            COUNT(*) as count
        FROM ebay_category_fees
        GROUP BY fee_category_type
        ORDER BY avg_fee DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($feeStats as $stat) {
        echo "  {$stat['fee_category_type']}: " . round($stat['avg_fee'], 2) . "% ({$stat['count']}件)\n";
    }
    
    // Step 6: 学習テーブル確認・作成
    echo "\n🧠 Step 6: 学習システム確認\n";
    echo "=========================\n";
    
    try {
        $pdo->query("SELECT 1 FROM ebay_simple_learning LIMIT 1");
        echo "✅ 学習テーブル存在確認OK\n";
    } catch (Exception $e) {
        echo "📊 学習テーブル作成中...\n";
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS ebay_simple_learning (
                id SERIAL PRIMARY KEY,
                title_hash VARCHAR(64) UNIQUE,
                title TEXT NOT NULL,
                brand VARCHAR(100),
                yahoo_category VARCHAR(200),
                price_jpy INTEGER DEFAULT 0,
                
                learned_category_id VARCHAR(20),
                learned_category_name VARCHAR(200),
                confidence INTEGER DEFAULT 0,
                
                usage_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        ");
        echo "✅ 学習テーブル作成完了\n";
    }
    
    echo "\n🎉 eBayシステム強制修正完了!\n";
    echo "===========================\n";
    echo "✅ ebay_categories_full: {$insertedCount}件\n";
    echo "✅ ebay_category_fees: {$feeInsertedCount}件\n";
    echo "✅ 学習システム: 準備完了\n";
    echo "\n🌐 次のステップ:\n";
    echo "1. Webツールでテスト実行\n";
    echo "2. カテゴリー判定機能確認\n";
    echo "3. 手数料計算機能確認\n";
    
} catch (Exception $e) {
    echo "❌ エラー発生: " . $e->getMessage() . "\n";
    echo "スタックトレース:\n" . $e->getTraceAsString() . "\n";
}
?>