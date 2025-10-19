<?php
/**
 * 全カテゴリー対応手数料システム
 * ファイル: create_complete_fees.php
 */

class EbayCompleteFeeSystem {
    private $pdo;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
    }
    
    /**
     * 全カテゴリー手数料データ作成
     */
    public function createCompleteFees() {
        echo "💰 全eBayカテゴリー手数料データ作成\n";
        echo "=================================\n";
        
        try {
            // 1. 手数料テーブル再構築
            $this->recreateFeeTable();
            
            // 2. カテゴリー一覧取得
            $categories = $this->getAllCategories();
            echo "📋 対象カテゴリー: " . count($categories) . "件\n";
            
            // 3. 全カテゴリーの手数料設定
            $created = $this->assignFeesToAllCategories($categories);
            
            // 4. 結果表示
            echo "\n🎉 全カテゴリー手数料設定完了!\n";
            echo "設定件数: {$created}件\n";
            
            $this->displayFeeDistribution();
            
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
     * 手数料テーブル再構築
     */
    private function recreateFeeTable() {
        echo "💾 手数料テーブル再構築中...\n";
        
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
                
                -- 手数料タイプとメタデータ
                fee_category_type VARCHAR(50) DEFAULT 'standard',
                fee_note TEXT,
                currency VARCHAR(3) DEFAULT 'USD',
                effective_date TIMESTAMP DEFAULT NOW(),
                last_updated TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                
                UNIQUE(category_id)
            )
        ");
        
        echo "✅ 手数料テーブル再構築完了\n";
    }
    
    /**
     * 全カテゴリー取得
     */
    private function getAllCategories() {
        $stmt = $this->pdo->query("
            SELECT category_id, category_name, category_path, category_level
            FROM ebay_categories_full
            WHERE is_active = TRUE
            ORDER BY category_level, category_id
        ");
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 全カテゴリーに手数料設定
     */
    private function assignFeesToAllCategories($categories) {
        $created = 0;
        $batchSize = 100;
        
        echo "⚙️ 手数料設定中...\n";
        
        for ($i = 0; $i < count($categories); $i += $batchSize) {
            $batch = array_slice($categories, $i, $batchSize);
            
            foreach ($batch as $category) {
                try {
                    $feeInfo = $this->determineFeeForCategory($category);
                    $this->insertFeeData($category, $feeInfo);
                    $created++;
                    
                    if ($created % 50 === 0) {
                        echo "  📊 進捗: {$created}件完了\n";
                    }
                    
                } catch (Exception $e) {
                    echo "  ⚠️ 手数料設定エラー [{$category['category_id']}]: " . $e->getMessage() . "\n";
                }
            }
        }
        
        return $created;
    }
    
    /**
     * カテゴリー別手数料決定（eBay公式料金表準拠）
     */
    private function determineFeeForCategory($category) {
        $categoryName = strtolower($category['category_name']);
        $categoryPath = strtolower($category['category_path'] ?? '');
        $text = $categoryName . ' ' . $categoryPath;
        
        // === eBay公式手数料カテゴリー ===
        
        // 1. Books, Movies & Music (15.30%)
        if ($this->matchCategory($text, [
            'book', 'magazine', 'literature', 'fiction', 'textbook',
            'movie', 'film', 'dvd', 'blu-ray', 'vhs',
            'music', 'cd', 'vinyl', 'record', 'cassette', 'mp3'
        ])) {
            return [
                'final_value_fee_percent' => 15.30,
                'fee_category_type' => 'media',
                'fee_note' => 'Books, Movies & Music category (eBay official rate)',
                'category_rule' => 'media_content'
            ];
        }
        
        // 2. Musical Instruments & Gear (6.70%)
        if ($this->matchCategory($text, [
            'musical instrument', 'guitar', 'bass', 'piano', 'keyboard',
            'drum', 'violin', 'saxophone', 'trumpet', 'flute',
            'amplifier', 'microphone', 'mixer', 'synthesizer'
        ])) {
            return [
                'final_value_fee_percent' => 6.70,
                'fee_category_type' => 'musical_instruments',
                'fee_note' => 'Musical Instruments & Gear (eBay special rate)',
                'category_rule' => 'musical_equipment'
            ];
        }
        
        // 3. Business & Industrial (3.00%)
        if ($this->matchCategory($text, [
            'business', 'industrial', 'equipment', 'machinery',
            'manufacturing', 'construction', 'agriculture', 'commercial',
            'professional', 'tools', 'heavy equipment'
        ])) {
            return [
                'final_value_fee_percent' => 3.00,
                'fee_category_type' => 'business_industrial',
                'fee_note' => 'Business & Industrial (eBay reduced rate)',
                'category_rule' => 'commercial_equipment'
            ];
        }
        
        // 4. Coins & Paper Money (13.25%)
        if ($this->matchCategory($text, [
            'coin', 'currency', 'paper money', 'numismatic',
            'collectible coin', 'rare coin', 'gold coin', 'silver coin'
        ])) {
            return [
                'final_value_fee_percent' => 13.25,
                'fee_category_type' => 'coins_currency',
                'fee_note' => 'Coins & Paper Money category',
                'category_rule' => 'collectible_currency'
            ];
        }
        
        // 5. Jewelry & Watches (段階制: $5,000以下15%, 以上9%)
        if ($this->matchCategory($text, [
            'jewelry', 'watch', 'ring', 'necklace', 'bracelet',
            'earring', 'pendant', 'chain', 'diamond', 'gold',
            'silver', 'platinum', 'precious', 'gemstone'
        ])) {
            return [
                'final_value_fee_percent' => 15.00,
                'fee_tier_1_percent' => 15.00,
                'fee_tier_1_max' => 5000.00,
                'fee_tier_2_percent' => 9.00,
                'fee_category_type' => 'jewelry_watches_tiered',
                'fee_note' => 'Jewelry & Watches: 15% up to $5,000, then 9%',
                'category_rule' => 'luxury_tiered'
            ];
        }
        
        // 6. Clothing, Shoes & Accessories (段階制: $2,000以下13.6%, 以上9%)
        if ($this->matchCategory($text, [
            'clothing', 'shirt', 'dress', 'pants', 'jeans', 'jacket',
            'shoes', 'boots', 'sneakers', 'sandals', 'heels',
            'accessories', 'bag', 'purse', 'wallet', 'belt',
            'hat', 'scarf', 'gloves', 'socks', 'underwear'
        ])) {
            return [
                'final_value_fee_percent' => 13.60,
                'fee_tier_1_percent' => 13.60,
                'fee_tier_1_max' => 2000.00,
                'fee_tier_2_percent' => 9.00,
                'fee_category_type' => 'clothing_accessories_tiered',
                'fee_note' => 'Clothing & Accessories: 13.6% up to $2,000, then 9%',
                'category_rule' => 'fashion_tiered'
            ];
        }
        
        // 7. Sports Trading Cards & TCG (13.25%)
        if ($this->matchCategory($text, [
            'trading card', 'sports card', 'baseball card', 'basketball card',
            'football card', 'pokemon', 'magic', 'yu-gi-oh', 'ccg',
            'tcg', 'collectible card', 'trading card game'
        ])) {
            return [
                'final_value_fee_percent' => 13.25,
                'fee_category_type' => 'trading_cards',
                'fee_note' => 'Sports Trading Cards & TCG category',
                'category_rule' => 'collectible_cards'
            ];
        }
        
        // 8. Art (12.90%)
        if ($this->matchCategory($text, [
            'art', 'painting', 'sculpture', 'drawing', 'print',
            'artwork', 'canvas', 'frame', 'artist', 'gallery'
        ])) {
            return [
                'final_value_fee_percent' => 12.90,
                'fee_category_type' => 'art',
                'fee_note' => 'Art category (reduced rate)',
                'category_rule' => 'fine_art'
            ];
        }
        
        // 9. Motors/Automotive (段階制: $2,000以下10%, 以上5%)
        if ($this->matchCategory($text, [
            'car', 'truck', 'motorcycle', 'auto', 'vehicle',
            'automotive', 'motor', 'engine', 'transmission',
            'tire', 'wheel', 'parts', 'accessory'
        ])) {
            return [
                'final_value_fee_percent' => 10.00,
                'fee_tier_1_percent' => 10.00,
                'fee_tier_1_max' => 2000.00,
                'fee_tier_2_percent' => 5.00,
                'fee_category_type' => 'motors_tiered',
                'fee_note' => 'Motors: 10% up to $2,000, then 5%',
                'category_rule' => 'automotive_tiered'
            ];
        }
        
        // 10. Health & Beauty (12.35%)
        if ($this->matchCategory($text, [
            'health', 'beauty', 'cosmetic', 'skincare', 'makeup',
            'perfume', 'supplement', 'vitamin', 'medical',
            'wellness', 'fitness', 'personal care'
        ])) {
            return [
                'final_value_fee_percent' => 12.35,
                'fee_category_type' => 'health_beauty',
                'fee_note' => 'Health & Beauty category',
                'category_rule' => 'personal_care'
            ];
        }
        
        // 11. Default (Most categories: 13.60%)
        return [
            'final_value_fee_percent' => 13.60,
            'fee_category_type' => 'standard',
            'fee_note' => 'Standard eBay final value fee (most categories)',
            'category_rule' => 'default_standard'
        ];
    }
    
    /**
     * カテゴリーマッチング
     */
    private function matchCategory($text, $keywords) {
        foreach ($keywords as $keyword) {
            if (strpos($text, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 手数料データ挿入
     */
    private function insertFeeData($category, $feeInfo) {
        $sql = "
            INSERT INTO ebay_category_fees (
                category_id, category_name, category_path,
                final_value_fee_percent, 
                fee_tier_1_percent, fee_tier_1_max, fee_tier_2_percent,
                fee_category_type, fee_note,
                effective_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $category['category_id'],
            $category['category_name'],
            $category['category_path'],
            $feeInfo['final_value_fee_percent'],
            $feeInfo['fee_tier_1_percent'] ?? null,
            $feeInfo['fee_tier_1_max'] ?? null,
            $feeInfo['fee_tier_2_percent'] ?? null,
            $feeInfo['fee_category_type'],
            $feeInfo['fee_note']
        ]);
    }
    
    /**
     * 手数料分布表示
     */
    private function displayFeeDistribution() {
        echo "\n💰 手数料分布統計\n";
        echo "=================\n";
        
        $distribution = $this->pdo->query("
            SELECT 
                fee_category_type,
                final_value_fee_percent,
                COUNT(*) as category_count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
            FROM ebay_category_fees
            GROUP BY fee_category_type, final_value_fee_percent
            ORDER BY final_value_fee_percent DESC, category_count DESC
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($distribution as $dist) {
            echo sprintf(
                "  %s: %.2f%% (%d件, %.1f%%)\n",
                $dist['fee_category_type'],
                $dist['final_value_fee_percent'],
                $dist['category_count'],
                $dist['percentage']
            );
        }
        
        // 全体統計
        $overall = $this->pdo->query("
            SELECT 
                COUNT(*) as total_categories,
                ROUND(AVG(final_value_fee_percent), 2) as avg_fee,
                MIN(final_value_fee_percent) as min_fee,
                MAX(final_value_fee_percent) as max_fee
            FROM ebay_category_fees
        ")->fetch(PDO::FETCH_ASSOC);
        
        echo "\n📊 全体統計:\n";
        echo "  総カテゴリー数: {$overall['total_categories']}\n";
        echo "  平均手数料: {$overall['avg_fee']}%\n";
        echo "  最低手数料: {$overall['min_fee']}%\n";
        echo "  最高手数料: {$overall['max_fee']}%\n";
    }
}

// 実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $feeSystem = new EbayCompleteFeeSystem($pdo);
        $result = $feeSystem->createCompleteFees();
        
        if ($result['success']) {
            echo "\n🎉 全カテゴリー手数料設定完了!\n";
        } else {
            echo "\n❌ 処理失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
    }
}
?>