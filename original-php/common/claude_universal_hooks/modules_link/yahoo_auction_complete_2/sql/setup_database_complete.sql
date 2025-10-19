-- Yahoo Auction Tool データベースセットアップ (Complete)
-- 実行前に必ず既存データのバックアップを取ってください

-- =============================================================================
-- 1. prohibited_keywords テーブル作成（禁止キーワード管理）
-- =============================================================================

CREATE TABLE IF NOT EXISTS prohibited_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    detection_count INTEGER DEFAULT 0,
    created_date TIMESTAMP DEFAULT NOW(),
    last_detected TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    created_by VARCHAR(100) DEFAULT 'system',
    notes TEXT,
    
    -- 制約
    CONSTRAINT unique_keyword UNIQUE(keyword, category),
    CONSTRAINT valid_priority CHECK (priority IN ('high', 'medium', 'low')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_keyword ON prohibited_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_category ON prohibited_keywords(category);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_priority ON prohibited_keywords(priority);
CREATE INDEX IF NOT EXISTS idx_prohibited_keywords_status ON prohibited_keywords(status);

-- =============================================================================
-- 2. mystical_japan_treasures_inventory テーブル存在確認・作成
-- =============================================================================

CREATE TABLE IF NOT EXISTS mystical_japan_treasures_inventory (
    id SERIAL PRIMARY KEY,
    item_id VARCHAR(50) UNIQUE,
    title TEXT,
    current_price DECIMAL(10,2),
    condition_name VARCHAR(100),
    category_name VARCHAR(100),
    listing_status VARCHAR(50),
    picture_url TEXT,
    gallery_url TEXT,
    watch_count INTEGER DEFAULT 0,
    data_source VARCHAR(50),
    item_location VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_mystical_item_id ON mystical_japan_treasures_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_mystical_category ON mystical_japan_treasures_inventory(category_name);
CREATE INDEX IF NOT EXISTS idx_mystical_condition ON mystical_japan_treasures_inventory(condition_name);
CREATE INDEX IF NOT EXISTS idx_mystical_price ON mystical_japan_treasures_inventory(current_price);

-- =============================================================================
-- 3. サンプルデータ挿入
-- =============================================================================

-- 禁止キーワードサンプルデータ
INSERT INTO prohibited_keywords (keyword, category, priority, detection_count, last_detected, notes) VALUES
('偽物', 'brand', 'high', 127, '2025-09-10 10:30:00', 'ブランド品の偽造'),
('コピー品', 'brand', 'medium', 89, '2025-09-09 15:22:00', 'コピー商品全般'),
('レプリカ', 'fashion', 'high', 203, '2025-09-10 09:15:00', 'ファッション系レプリカ'),
('薬事法違反', 'medical', 'high', 45, '2025-09-08 14:33:00', '薬事法に抵触する表現'),
('転売禁止', 'general', 'low', 12, '2025-09-06 11:45:00', '転売禁止商品'),
('非正規品', 'brand', 'high', 156, '2025-09-10 08:20:00', '非正規ルート商品'),
('模造品', 'brand', 'high', 78, '2025-09-09 16:10:00', '模造品・イミテーション'),
('健康食品', 'medical', 'medium', 34, '2025-09-07 13:25:00', '薬事法対象の健康食品'),
('ダイエット効果', 'medical', 'high', 67, '2025-09-09 12:15:00', '薬事法違反の効果表記'),
('バイアグラ', 'medical', 'high', 23, '2025-09-05 16:30:00', '処方薬名の使用')
ON CONFLICT (keyword, category) DO NOTHING;

-- mystical_japan_treasures_inventory サンプルデータ（データが空の場合のみ）
INSERT INTO mystical_japan_treasures_inventory 
(item_id, title, current_price, condition_name, category_name, listing_status, picture_url, watch_count, data_source, item_location)
SELECT * FROM (VALUES
    ('SAMPLE_001', 'ワイヤレスイヤホン Bluetooth 5.0 高音質', 15.99, 'New', 'Electronics', 'Active', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300', 23, 'Yahoo Auction', 'Tokyo, Japan'),
    ('SAMPLE_002', 'スマートウォッチ フィットネストラッカー', 45.50, 'Used', 'Electronics', 'Active', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300', 67, 'Yahoo Auction', 'Osaka, Japan'),
    ('SAMPLE_003', 'ゲーミングキーボード RGB メカニカル', 89.99, 'Like New', 'Computer', 'Active', 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=300', 12, 'Yahoo Auction', 'Kyoto, Japan'),
    ('SAMPLE_004', 'Bluetooth スピーカー 防水 ポータブル', 25.00, 'New', 'Audio', 'Active', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300', 34, 'Yahoo Auction', 'Nagoya, Japan'),
    ('SAMPLE_005', 'USB-C ハブ 7-in-1 多機能', 35.75, 'New', 'Computer', 'Active', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300', 8, 'Yahoo Auction', 'Fukuoka, Japan'),
    ('SAMPLE_006', 'ワイヤレス充電器 15W 急速充電', 18.99, 'New', 'Electronics', 'Active', 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300', 45, 'Yahoo Auction', 'Sapporo, Japan'),
    ('SAMPLE_007', 'フィットネストラッカー 心拍数モニター', 42.00, 'Used', 'Health', 'Active', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300', 19, 'Yahoo Auction', 'Sendai, Japan'),
    ('SAMPLE_008', 'タブレットスタンド 角度調整可能', 12.50, 'New', 'Accessories', 'Active', 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=300', 56, 'Yahoo Auction', 'Hiroshima, Japan'),
    ('SAMPLE_009', 'モバイルバッテリー 20000mAh 大容量', 28.99, 'New', 'Electronics', 'Active', 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300', 78, 'Yahoo Auction', 'Yokohama, Japan'),
    ('SAMPLE_010', 'ノイズキャンセリングヘッドフォン', 120.00, 'Like New', 'Audio', 'Active', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300', 91, 'Yahoo Auction', 'Kobe, Japan')
) AS sample_data(item_id, title, current_price, condition_name, category_name, listing_status, picture_url, watch_count, data_source, item_location)
WHERE NOT EXISTS (SELECT 1 FROM mystical_japan_treasures_inventory LIMIT 1);

-- =============================================================================
-- 4. 統計関数・ビュー作成
-- =============================================================================

-- 承認待ち商品統計ビュー
CREATE OR REPLACE VIEW approval_queue_stats AS
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN current_price > 100 THEN 1 END) as ai_approved,
    COUNT(CASE WHEN current_price < 50 THEN 1 END) as ai_rejected,
    COUNT(CASE WHEN current_price BETWEEN 50 AND 100 THEN 1 END) as ai_pending,
    COUNT(CASE WHEN condition_name LIKE '%Used%' THEN 1 END) as high_risk,
    COUNT(CASE WHEN condition_name LIKE '%New%' THEN 1 END) as medium_risk,
    AVG(current_price) as avg_price,
    MAX(updated_at) as last_update
FROM mystical_japan_treasures_inventory
WHERE item_id IS NOT NULL;

-- 禁止キーワード統計ビュー
CREATE OR REPLACE VIEW prohibited_keywords_stats AS
SELECT 
    COUNT(*) as total_keywords,
    COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
    COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
    COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority,
    COUNT(CASE WHEN last_detected >= CURRENT_DATE THEN 1 END) as detected_today,
    SUM(detection_count) as total_detections,
    MAX(created_date) as last_added
FROM prohibited_keywords
WHERE status = 'active';

-- =============================================================================
-- 5. セットアップ完了確認
-- =============================================================================

-- テーブル作成確認
DO $$
BEGIN
    -- テーブル存在確認
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prohibited_keywords') THEN
        RAISE NOTICE '✅ prohibited_keywords テーブル作成完了';
    ELSE
        RAISE NOTICE '❌ prohibited_keywords テーブル作成失敗';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystical_japan_treasures_inventory') THEN
        RAISE NOTICE '✅ mystical_japan_treasures_inventory テーブル確認完了';
    ELSE
        RAISE NOTICE '❌ mystical_japan_treasures_inventory テーブルが存在しません';
    END IF;
END $$;

-- データ件数確認
SELECT 
    'prohibited_keywords' as table_name,
    COUNT(*) as record_count
FROM prohibited_keywords
UNION ALL
SELECT 
    'mystical_japan_treasures_inventory' as table_name,
    COUNT(*) as record_count
FROM mystical_japan_treasures_inventory;

-- 設定完了メッセージ
SELECT '🎉 Yahoo Auction Tool データベースセットアップ完了!' as message;
