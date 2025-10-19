<?php
/**
 * eBay大容量手数料システム（30,000+カテゴリー対応）
 * ファイル: massive_fee_system.php
 */

class EbayMassiveFeeSystem {
    private $pdo;
    private $feeGroups;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->initializeFeeGroups();
    }
    
    /**
     * eBay公式手数料グループ初期化
     */
    private function initializeFeeGroups() {
        $this->feeGroups = [
            // 1. Musical Instruments & Gear (最低料金)
            'musical_instruments' => [
                'rate' => 6.70,
                'keywords' => [
                    'musical instrument', 'guitar', 'bass', 'piano', 'keyboard', 'drum',
                    'violin', 'saxophone', 'trumpet', 'flute', 'clarinet', 'trombone',
                    'amplifier', 'microphone', 'mixer', 'synthesizer', 'ukulele',
                    'mandolin', 'banjo', 'harmonica', 'accordion', 'bagpipe'
                ],
                'note' => 'Musical Instruments & Gear (eBay special reduced rate)'
            ],
            
            // 2. Business & Industrial (超低料金)
            'business_industrial' => [
                'rate' => 3.00,
                'keywords' => [
                    'business', 'industrial', 'equipment', 'machinery', 'manufacturing',
                    'construction', 'agriculture', 'commercial', 'professional', 'tools',
                    'heavy equipment', 'forklift', 'crane', 'generator', 'compressor',
                    'welding', 'cnc', 'lathe', 'mill', 'drill press', 'saw'
                ],
                'note' => 'Business & Industrial (eBay lowest rate)'
            ],
            
            // 3. Motors (段階制: 10% up to $2,000, then 5%)
            'motors_automotive' => [
                'rate' => 10.00,
                'tier_1_rate' => 10.00,
                'tier_1_max' => 2000.00,
                'tier_2_rate' => 5.00,
                'keywords' => [
                    'car', 'truck', 'motorcycle', 'auto', 'vehicle', 'automotive',
                    'motor', 'engine', 'transmission', 'tire', 'wheel', 'brake',
                    'suspension', 'exhaust', 'radiator', 'alternator', 'starter',
                    'battery', 'oil', 'filter', 'spark plug', 'belt', 'hose'
                ],
                'note' => 'Motors: 10% up to $2,000, then 5%'
            ],
            
            // 4. Art (reduced rate)
            'art_collectibles' => [
                'rate' => 12.90,
                'keywords' => [
                    'art', 'painting', 'sculpture', 'drawing', 'print', 'artwork',
                    'canvas', 'frame', 'artist', 'gallery', 'vintage', 'antique',
                    'collectible', 'rare', 'limited edition', 'original', 'signed'
                ],
                'note' => 'Art category (reduced rate)'
            ],
            
            // 5. Health & Beauty
            'health_beauty' => [
                'rate' => 12.35,
                'keywords' => [
                    'health', 'beauty', 'cosmetic', 'skincare', 'makeup', 'perfume',
                    'supplement', 'vitamin', 'medical', 'wellness', 'fitness',
                    'personal care', 'shampoo', 'conditioner', 'lotion', 'cream',
                    'serum', 'foundation', 'lipstick', 'mascara', 'nail polish'
                ],
                'note' => 'Health & Beauty category'
            ],
            
            // 6. Trading Cards & CCG
            'trading_cards' => [
                'rate' => 13.25,
                'keywords' => [
                    'trading card', 'sports card', 'baseball card', 'basketball card',
                    'football card', 'hockey card', 'soccer card', 'pokemon', 'magic',
                    'yu-gi-oh', 'ccg', 'tcg', 'collectible card', 'trading card game',
                    'booster pack', 'starter deck', 'single card', 'foil', 'holographic'
                ],
                'note' => 'Sports Trading Cards & CCG category'
            ],
            
            // 7. Coins & Paper Money
            'coins_currency' => [
                'rate' => 13.25,
                'keywords' => [
                    'coin', 'currency', 'paper money', 'numismatic', 'collectible coin',
                    'rare coin', 'gold coin', 'silver coin', 'penny', 'quarter',
                    'dollar', 'euro', 'yen', 'pound', 'franc', 'mint', 'proof',
                    'uncirculated', 'graded', 'pcgs', 'ngc'
                ],
                'note' => 'Coins & Paper Money category'
            ],
            
            // 8. Standard Most Categories
            'standard' => [
                'rate' => 13.60,
                'keywords' => [], // デフォルト
                'note' => 'Standard eBay final value fee (most categories)'
            ],
            
            // 9. Clothing & Accessories (段階制: 13.6% up to $2,000, then 9%)
            'clothing_accessories' => [
                'rate' => 13.60,
                'tier_1_rate' => 13.60,
                'tier_1_max' => 2000.00,
                'tier_2_rate' => 9.00,
                'keywords' => [
                    'clothing', 'shirt', 'dress', 'pants', 'jeans', 'jacket', 'coat',
                    'sweater', 'hoodie', 'shorts', 'skirt', 'blouse', 'suit',
                    'shoes', 'boots', 'sneakers', 'sandals', 'heels', 'flats',
                    'accessories', 'bag', 'purse', 'wallet', 'belt', 'hat',
                    'scarf', 'gloves', 'socks', 'underwear', 'bra', 'tie'
                ],
                'note' => 'Clothing & Accessories: 13.6% up to $2,000, then 9%'
            ],
            
            // 10. Jewelry & Watches (段階制: 15% up to $5,000, then 9%)
            'jewelry_watches' => [
                'rate' => 15.00,
                'tier_1_rate' => 15.00,
                'tier_1_max' => 5000.00,
                'tier_2_rate' => 9.00,
                'keywords' => [
                    'jewelry', 'watch', 'ring', 'necklace', 'bracelet', 'earring',
                    'pendant', 'chain', 'diamond', 'gold', 'silver', 'platinum',
                    'precious', 'gemstone', 'emerald', 'ruby', 'sapphire',
                    'rolex', 'omega', 'cartier', 'tiffany', 'engagement ring',
                    'wedding ring', 'luxury watch', 'vintage jewelry'
                ],
                'note' => 'Jewelry & Watches: 15% up to $5,000, then 9%'
            ],
            
            // 11. Books, Movies & Music (highest rate)
            'media_content' => [
                'rate' => 15.30,
                'keywords' => [
                    'book', 'magazine', 'literature', 'fiction', 'non-fiction',
                    'textbook', 'novel', 'biography', 'history', 'science',
                    'movie', 'film', 'dvd', 'blu-ray', 'vhs', 'cinema',
                    'music', 'cd', 'vinyl', 'record', 'cassette', 'mp3',
                    'album', 'single', 'soundtrack', 'classical', 'jazz', 'rock'
                ],
                'note' => 'Books, Movies & Music category (highest standard rate)'
            ],
            
            // 12. Real Estate (special handling)
            'real_estate' => [
                'rate' => 35.00, // 固定料金
                'fixed_fee' => true,
                'keywords' => [
                    'real estate', 'property', 'land', 'house', 'apartment',
                    'commercial property', 'residential', 'lot', 'acreage'
                ],
                'note' => 'Real Estate (fixed $35 fee, not percentage)'
            ]
        ];
    }
    
    /**
     * 大容量手数料データ作成
     */
    public function createMassiveFees() {
        echo "💰 大容量手数料システム構築開始\n";
        echo "===============================\n";
        
        try {
            // 1. 手数料テーブル再構築
            $this->recreateMassiveFeeTable();
            
            // 2. カテゴリー数確認
            $categoryCount = $this->getCategoryCount();
            echo "📋 対象カテゴリー: " . number_format($categoryCount) . "件\n";
            
            // 3. 大容量手数料設定
            $assigned = $this->assignMassiveFees();
            
            // 4. 統計表示
            $this->displayMassiveFeeStats();
            
            echo "\n🎉 大容量手数料設定完了!\n";
            echo "設定件数: " . number_format($assigned) . "件\n";
            
            return [
                'success' => true,
                'fees_assigned' => $assigned,
                'category_count' => $categoryCount
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
     * 大容量手数料テーブル作成
     */
    private function recreateMassiveFeeTable() {
        echo "💾 大容量手数料テーブル構築中...\n";
        
        $this->pdo->exec("DROP TABLE IF EXISTS ebay_category_fees CASCADE");
        
        $this->pdo->exec("
            CREATE TABLE ebay_category_fees (
                id SERIAL PRIMARY KEY,
                category_id VARCHAR(20) NOT NULL,
                category_name VARCHAR(255),
                category_path TEXT,
                
                -- 基本手数料情報
                final_value_fee_percent DECIMAL(5,2) DEFAULT 13.60,
                insertion_fee DECIMAL(10,2) DEFAULT 0.00,
                
                -- 段階制手数料（高額商品用）
                is_tiered BOOLEAN DEFAULT FALSE,
                tier_1_percent DECIMAL(5,2),
                tier_1_max_amount DECIMAL(12,2),
                tier_2_percent DECIMAL(5,2),
                
                -- 固定料金（不動産等）
                is_fixed_fee BOOLEAN DEFAULT FALSE,
                fixed_fee_amount DECIMAL(10,2),
                
                -- PayPal・決済手数料
                paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90,
                paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30,
                
                -- 手数料グループ情報
                fee_group VARCHAR(50) NOT NULL DEFAULT 'standard',
                fee_group_note TEXT,
                
                -- 追加サービス料金
                promoted_listing_fee_percent DECIMAL(5,2) DEFAULT 2.00,
                international_fee_percent DECIMAL(5,2) DEFAULT 1.00,
                
                -- メタデータ
                currency VARCHAR(3) DEFAULT 'USD',
                effective_date TIMESTAMP DEFAULT NOW(),
                last_updated TIMESTAMP DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                
                -- パフォーマンス最適化
                category_id_numeric INTEGER,
                fee_calculation_cache JSONB,
                
                UNIQUE(category_id)
            )
        ");
        
        // パフォーマンス用インデックス
        $this->pdo->exec("CREATE INDEX idx_fees_group ON ebay_category_fees(fee_group)");
        $this->pdo->exec("CREATE INDEX idx_fees_percent ON ebay_category_fees(final_value_fee_percent)");
        $this->pdo->exec("CREATE INDEX idx_fees_tiered ON ebay_category_fees(is_tiered)");
        $this->pdo->exec("CREATE INDEX idx_fees_numeric_id ON ebay_category_fees(category_id_numeric)");
        
        echo "✅ 大容量手数料テーブル構築完了\n";
    }
    
    /**
     * カテゴリー数取得
     */
    private function getCategoryCount() {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM ebay_categories_full WHERE is_active = TRUE");
        return $stmt->fetchColumn();
    }
    
    /**
     * 大容量手数料設定
     */
    private function assignMassiveFees() {
        echo "⚙️ 大容量手数料設定中...\n";
        
        $batchSize = 5000;
        $offset = 0;
        $totalAssigned = 0;
        
        do {
            // バッチ単位でカテゴリー取得
            $categories = $this->getCategoriesBatch($offset, $batchSize);
            
            if (empty($categories)) break;
            
            $this->pdo->beginTransaction();
            
            try {
                foreach ($categories as $category) {
                    $feeGroup = $this->determineFeeGroup($category);
                    $this->insertFeeRecord($category, $feeGroup);
                    $totalAssigned++;
                }
                
                $this->pdo->commit();
                echo "  ✅ バッチ完了: " . number_format($totalAssigned) . "件\n";
                
            } catch (Exception $e) {
                $this->pdo->rollback();
                echo "  ❌ バッチエラー: " . $e->getMessage() . "\n";
            }
            
            $offset += $batchSize;
            
        } while (count($categories) === $batchSize);
        
        return $totalAssigned;
    }
    
    /**
     * バッチ単位カテゴリー取得
     */
    private function getCategoriesBatch($offset, $limit) {
        $stmt = $this->pdo->prepare("
            SELECT category_id, category_name, category_path, category_level
            FROM ebay_categories_full
            WHERE is_active = TRUE
            ORDER BY category_id_numeric
            OFFSET ? LIMIT ?
        ");
        $stmt->execute([$offset, $limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 手数料グループ決定（高速アルゴリズム）
     */
    private function determineFeeGroup($category) {
        $text = strtolower($category['category_name'] . ' ' . ($category['category_path'] ?? ''));
        
        // 優先順位順でマッチング（特殊料金から先に）
        $priorityOrder = [
            'business_industrial',
            'musical_instruments', 
            'motors_automotive',
            'real_estate',
            'art_collectibles',
            'health_beauty',
            'trading_cards',
            'coins_currency',
            'jewelry_watches',
            'clothing_accessories',
            'media_content',
            'standard'
        ];
        
        foreach ($priorityOrder as $groupName) {
            $group = $this->feeGroups[$groupName];
            
            if (empty($group['keywords'])) {
                // スタンダードグループ（デフォルト）
                return $groupName;
            }
            
            foreach ($group['keywords'] as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    return $groupName;
                }
            }
        }
        
        return 'standard'; // フォールバック
    }
    
    /**
     * 手数料レコード挿入
     */
    private function insertFeeRecord($category, $feeGroupName) {
        $feeGroup = $this->feeGroups[$feeGroupName];
        
        // 段階制判定
        $isTiered = isset($feeGroup['tier_1_rate']);
        $isFixedFee = isset($feeGroup['fixed_fee']) && $feeGroup['fixed_fee'];
        
        $sql = "
            INSERT INTO ebay_category_fees (
                category_id, category_name, category_path,
                final_value_fee_percent,
                is_tiered, tier_1_percent, tier_1_max_amount, tier_2_percent,
                is_fixed_fee, fixed_fee_amount,
                fee_group, fee_group_note,
                category_id_numeric
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $category['category_id'],
            $category['category_name'],
            $category['category_path'],
            $feeGroup['rate'],
            $isTiered,
            $feeGroup['tier_1_rate'] ?? null,
            $feeGroup['tier_1_max'] ?? null,
            $feeGroup['tier_2_rate'] ?? null,
            $isFixedFee,
            $isFixedFee ? $feeGroup['rate'] : null,
            $feeGroupName,
            $feeGroup['note'],
            intval($category['category_id'])
        ]);
    }
    
    /**
     * 大容量手数料統計表示
     */
    private function displayMassiveFeeStats() {
        echo "\n💰 大容量手数料統計\n";
        echo "==================\n";
        
        // グループ別統計
        $groupStats = $this->pdo->query("
            SELECT 
                fee_group,
                final_value_fee_percent,
                COUNT(*) as category_count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
                COUNT(CASE WHEN is_tiered = TRUE THEN 1 END) as tiered_count
            FROM ebay_category_fees
            GROUP BY fee_group, final_value_fee_percent
            ORDER BY final_value_fee_percent ASC, category_count DESC
        ")->fetchAll(PDO::FETCH_ASSOC);
        
        echo "手数料グループ分布:\n";
        foreach ($groupStats as $stat) {
            $tieredNote = $stat['tiered_count'] > 0 ? " (段階制: {$stat['tiered_count']}件)" : "";
            echo sprintf(
                "  %s: %.2f%% (%s件, %.2f%%)%s\n",
                $stat['fee_group'],
                $stat['final_value_fee_percent'],
                number_format($stat['category_count']),
                $stat['percentage'],
                $tieredNote
            );
        }
        
        // 全体統計
        $overallStats = $this->pdo->query("
            SELECT 
                COUNT(*) as total_categories,
                ROUND(AVG(final_value_fee_percent), 2) as avg_fee,
                MIN(final_value_fee_percent) as min_fee,
                MAX(final_value_fee_percent) as max_fee,
                COUNT(CASE WHEN is_tiered = TRUE THEN 1 END) as tiered_categories,
                COUNT(CASE WHEN is_fixed_fee = TRUE THEN 1 END) as fixed_fee_categories
            FROM ebay_category_fees
        ")->fetch(PDO::FETCH_ASSOC);
        
        echo "\n📊 全体統計:\n";
        echo "  総カテゴリー数: " . number_format($overallStats['total_categories']) . "件\n";
        echo "  平均手数料: {$overallStats['avg_fee']}%\n";
        echo "  手数料範囲: {$overallStats['min_fee']}% - {$overallStats['max_fee']}%\n";
        echo "  段階制カテゴリー: " . number_format($overallStats['tiered_categories']) . "件\n";
        echo "  固定料金カテゴリー: " . number_format($overallStats['fixed_fee_categories']) . "件\n";
        
        // データベースサイズ
        $tableSize = $this->pdo->query("
            SELECT pg_size_pretty(pg_total_relation_size('ebay_category_fees')) as size
        ")->fetch(PDO::FETCH_COLUMN);
        
        echo "  手数料テーブルサイズ: {$tableSize}\n";
    }
}

// 実行
if (__FILE__ === $_SERVER['SCRIPT_FILENAME']) {
    try {
        $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $feeSystem = new EbayMassiveFeeSystem($pdo);
        $result = $feeSystem->createMassiveFees();
        
        if ($result['success']) {
            echo "\n🎉 大容量手数料システム完成!\n";
            echo "対象カテゴリー: " . number_format($result['category_count']) . "件\n";
            echo "設定完了: " . number_format($result['fees_assigned']) . "件\n";
        } else {
            echo "\n❌ 処理失敗: " . $result['error'] . "\n";
        }
        
    } catch (Exception $e) {
        echo "❌ 致命的エラー: " . $e->getMessage() . "\n";
    }
}
?>