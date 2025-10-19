<?php
/**
 * eBay手数料データ作成 - 修正版
 * ファイル: ebay_fee_creator.php
 */

class EbayFeeCreator {
    private $pdo;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
    }
    
    /**
     * 手数料データ作成・格納
     */
    public function createFeeData() {
        echo "💰 eBay手数料データ作成開始\n";
        echo "===========================\n";
        
        try {
            // 1. 手数料テーブル準備
            $this->prepareFeeTable();
            
            // 2. カテゴリー一覧取得
            $categories = $this->getCategories();
            echo "📋 対象カテゴリー: " . count($categories) . "件\n";
            
            // 3. 手数料データ作成
            $created = $this->createAllFees($categories);
            
            // 4. 結果表示
            echo "\n🎉 手数料データ作成完了!\n";
            echo "作成件数: {$created}件\n";
            
            $this->displayFeeStats();
            
            return [
                'success' => true,
                'fees_created' => $created
            ];
            
        } catch (Exception $e) {
            echo "❌ エラー: " . $e->getMessage() . "\n";
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 手数料テーブル準備
     */
    private function prepareFeeTable() {
        echo "💾 手数料テーブル準備中...\n";
        
        // 既存テーブル削除・再作成
        $this->pdo->exec("DROP TABLE IF EXISTS ebay_category_fees CASCADE");
        
        $this->pdo->exec("
            CREATE TABLE ebay_category_fees (
                id SERIAL PRIMARY KEY,
                category_id VARCHAR(20) NOT NULL,
                category_name VARCHAR(255),
                category_path TEXT,
                
                -- 基本手数料
                insertion_fee DECIMAL(10,2) DEFAULT 0.00,
                final_value_fee_percent DECIMAL(5,2) DEFAULT 13.60,
                final_value_fee_max DECIMAL(10,2),
                
                -- 段階的手数料（特定カテゴリー用）
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
    }
    
    /**
     * カテゴリー一覧取得
     */
    private function getCategories() {
        try {
            // ebay_categories_fullから取得を試行
            $stmt = $this->pdo->query("
                SELECT category_id, category_name, category_path
                FROM ebay_categories_full
                WHERE is_active = TRUE
                ORDER BY category_id
            ");
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (!empty($categories)) {
                return $categories;
            }
        } catch (Exception $e) {
            echo "⚠️ ebay_categories_fullテーブルが見つかりません\n";
        }
        
        // フォールバック: ebay_categoriesから取得
        try {
            $stmt = $this->pdo->query("
                SELECT category_id, category_name, 
                       category_name as category_path
                FROM ebay_categories
                WHERE is_active = TRUE
                ORDER BY category_id
            ");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            echo "⚠️ ebay_categoriesテーブルも見つかりません\n";
        }
        
        // 最終フォールバック: サンプルカテゴリー
        return $this->getSampleCategories();
    }
    
    /**
     * サンプルカテゴリー
     */
    private function getSampleCategories() {
        return [
            ['category_id' => '293', 'category_name' => 'Cell Phones & Smartphones', 'category_path' => 'Electronics > Cell Phones'],
            ['category_id' => '625', 'category_name' => 'Cameras & Photo', 'category_path' => 'Electronics > Cameras'],
            ['category_id' => '267', 'category_name' => 'Books', 'category_path' => 'Media > Books'],
            ['category_id' => '11450', 'category_name' => 'Clothing, Shoes & Accessories', 'category_path' => 'Fashion'],
            ['category_id' => '14324', 'category_name' => 'Jewelry & Watches', 'category_path' => 'Fashion > Jewelry'],
            ['category_id' => '139973', 'category_name' => 'Video Games', 'category_path' => 'Entertainment > Games'],
            ['category_id' => '58058', 'category_name' => 'Sports Trading Cards', 'category_path' => 'Collectibles > Cards'],
            ['category_id' => '183454', 'category_name' => 'Non-Sport Trading Cards', 'category_path' => 'Collectibles > Cards'],
            ['category_id' => '220', 'category_name' => 'Toys & Hobbies', 'category_path' => 'Entertainment > Toys'],
            ['category_id' => '99999', 'category_name' => 'Other', 'category_path' => 'Miscellaneous']
        ];
    }
    
    /**
     * 全手数料データ作成
     */
    private function createAllFees($categories) {
        $created = 0;
        
        foreach ($categories as $category) {
            try {
                $feeData = $this->calculateFeeForCategory($category);
                $this->storeFeeData($category, $feeData);
                $created++;
                
                echo "  ✅ {$category['category_name']}: {$feeData['final_value_fee_percent']}%\n";
                
            } catch (Exception $e) {
                echo "  ❌ {$category['category_name']}: " . $e->getMessage() . "\n";
            }
        }
        
        return $created;
    }
    
    /**
     * カテゴリー別手数料計算
     */
    private function calculateFeeForCategory($category) {
        $categoryName = strtolower($category['category_name']);
        $categoryPath = strtolower($category['category_path'] ?? '');
        $text = $categoryName . ' ' . $categoryPath;
        
        // eBay公式手数料表に基づく分類
        
        // 1. Books, Movies, Music (15.30%)
        if ($this->matchesKeywords($text, ['book', 'magazine', 'movie', 'music', 'cd', 'dvd', 'vinyl'])) {
            return [
                'final_value_fee_percent' => 15.30,
                'fee_category_type' => 'media',
                'description' => 'Books, Movies & Music category'
            ];
        }
        
        // 2. Musical Instruments (6.70%)
        if ($this->matchesKeywords($text, ['musical instrument', 'guitar', 'piano', 'drum', 'violin'])) {
            return [
                'final_value_fee_percent' => 6.70,
                'fee_category_type' => 'musical_instruments',
                'description' => 'Musical Instruments & Gear'
            ];
        }
        
        // 3. Business & Industrial (3.00%)
        if ($this->matchesKeywords($text, ['business', 'industrial', 'equipment', 'machinery'])) {
            return [
                'final_value_fee_percent' => 3.00,
                'fee_category_type' => 'business_industrial',
                'description' => 'Business & Industrial'
            ];
        }
        
        // 4. Coins & Paper Money (13.25%)
        if ($this->matchesKeywords($text, ['coin', 'currency', 'paper money', 'numismatic'])) {
            return [
                'final_value_fee_percent' => 13.25,
                'fee_category_type' => 'coins_currency',
                'description' => 'Coins & Paper Money'
            ];
        }
        
        // 5. Jewelry & Watches (段階制: $5,000以下15%, 以上9%)
        if ($this->matchesKeywords($text, ['jewelry', 'watch', 'ring', 'necklace', 'bracelet'])) {
            return [
                'final_value_fee_percent' => 15.00,
                'fee_tier_1_percent' => 15.00,
                'fee_tier_1_max' => 5000.00,
                'fee_tier_2_percent' => 9.00,
                'fee_category_type' => 'jewelry_watches',
                'description' => 'Jewelry & Watches (tiered)'
            ];
        }
        
        // 6. Clothing (段階制: $2,000以下13.6%, 以上9%)
        if ($this->matchesKeywords($text, ['clothing', 'shirt', 'dress', 'shoes', 'pants', 'jacket'])) {
            return [
                'final_value_fee_percent' => 13.60,
                'fee_tier_1_percent' => 13.60,
                'fee_tier_1_max' => 2000.00,
                'fee_tier_2_percent' => 9.00,
                'fee_category_type' => 'clothing_accessories',
                'description' => 'Clothing, Shoes & Accessories (tiered)'
            ];
        }
        
        // 7. Default (Most categories: 13.60%)
        return [
            'final_value_fee_percent' => 13.60,
            'fee_category_type' => 'standard',
            'description' => 'Most categories standard rate'
        ];
    }
    
    /**
     * キーワードマッチング
     */
    private function matchesKeywords($text, $keywords) {
        foreach ($keywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 手数料データ格納
     */
    private function storeFeeData($category, $feeData) {
        $sql = "
            INSERT INTO ebay_category_fees (
                category_id, category_name, category_path,
                final_value_fee_percent, fee_tier_1_percent, fee_tier_1_max, fee_tier_2_percent,
                fee_category_type, effective_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (category_id) DO UPDATE SET
                final_value_fee_percent = EXCLUDED.final_value_fee_percent,
                fee_category_type = EXCLUDED.fee_category_type,
                last_updated = NOW()
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $category['category_id'],
            $category['category_name'],
            $category['category_path'],
            $feeData['final_value_fee_percent'],
            $feeData['fee_tier_1_percent'] ?? null,
            $feeData['fee_tier_1_max'] ?? null,
            $feeData['fee_tier_2_percent'] ?? null,
            $feeData['fee_category_type']
        ]);
    }
    
    /**
     * 手数料統計表示
     */
    private function displayFeeStats() {
        echo "\n💰 手数料統計\n";
        echo "============\n";
        
        $stats = $this->pdo->query("
            SELECT 
                COUNT(*) as total_fees,
                AVG(final_value_fee_percent) as avg_fee,
                MIN(final_value_fee_percent) as min_fee,
                MAX(final_value_fee_percent) as max_fee
            FROM ebay_category_fees
        ")->fetch(PDO::FETCH_ASSOC);
        
        echo "総手数料データ: {$stats['total_fees']}件\n";
        echo "平均手数料: " . round($stats['avg_fee'], 2) . "%\n";
        echo "最低手数料: {$stats['min_fee']}%\n";
        echo "最高手数料: {$stats['max_fee']}%\n";
        
        // 手数料タイプ別統計
        echo "\n手数料タイプ別統計:\n";
        $typeStats = $this->pdo->query("
            SELECT 
                fee_category_type,
                final_value_fee_percent,
                COUNT(*) as category_count
            FROM ebay_category_fees
            GROUP BY fee_category_type, final_value_fee_percent
            ORDER BY final_value_fee_percent
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($typeStats as $type) {
            echo "  {$type['fee_category_type']}: {$type['final_value_fee_percent']}% ({$type['category_count']}カテゴリー)\n";
        }
    }
}

// 実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $feeCreator = new EbayFeeCreator($pdo);
        $result = $feeCreator->createFeeData();
        
        if ($result['success']) {
            echo "\n🎉 手数料データ作成完了!\n";
        } else {
            echo "\n❌ 処理失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
    }
}
?>