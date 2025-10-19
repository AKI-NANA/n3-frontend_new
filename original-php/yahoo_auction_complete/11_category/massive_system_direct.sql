-- eBay大容量カテゴリー・手数料システム（SQL直接実行版）
-- ファイル: massive_system_direct.sql

-- 既存データクリア
DELETE FROM ebay_category_fees;
DELETE FROM ebay_categories_full;

-- レベル1カテゴリー生成 (100件)
INSERT INTO ebay_categories_full (category_id, category_name, category_path, parent_id, category_level, is_leaf, is_active, ebay_category_name, leaf_category, last_fetched) VALUES
-- Technology & Electronics
('10001', 'Computers & Tablets', 'Computers & Tablets', NULL, 1, FALSE, TRUE, 'Computers & Tablets', FALSE, NOW()),
('10002', 'Cell Phones & Accessories', 'Cell Phones & Accessories', NULL, 1, FALSE, TRUE, 'Cell Phones & Accessories', FALSE, NOW()),
('10003', 'Consumer Electronics', 'Consumer Electronics', NULL, 1, FALSE, TRUE, 'Consumer Electronics', FALSE, NOW()),
('10004', 'Cameras & Photo', 'Cameras & Photo', NULL, 1, FALSE, TRUE, 'Cameras & Photo', FALSE, NOW()),
('10005', 'Video Games & Consoles', 'Video Games & Consoles', NULL, 1, FALSE, TRUE, 'Video Games & Consoles', FALSE, NOW()),
('10006', 'Sound & Vision', 'Sound & Vision', NULL, 1, FALSE, TRUE, 'Sound & Vision', FALSE, NOW()),
('10007', 'TV & Audio', 'TV & Audio', NULL, 1, FALSE, TRUE, 'TV & Audio', FALSE, NOW()),
('10008', 'Smart Home', 'Smart Home', NULL, 1, FALSE, TRUE, 'Smart Home', FALSE, NOW()),
('10009', 'Wearable Technology', 'Wearable Technology', NULL, 1, FALSE, TRUE, 'Wearable Technology', FALSE, NOW()),
('10010', 'Drones & RC', 'Drones & RC', NULL, 1, FALSE, TRUE, 'Drones & RC', FALSE, NOW()),

-- Fashion & Style
('10011', 'Clothing Shoes & Accessories', 'Clothing Shoes & Accessories', NULL, 1, FALSE, TRUE, 'Clothing Shoes & Accessories', FALSE, NOW()),
('10012', 'Jewelry & Watches', 'Jewelry & Watches', NULL, 1, FALSE, TRUE, 'Jewelry & Watches', FALSE, NOW()),
('10013', 'Health & Beauty', 'Health & Beauty', NULL, 1, FALSE, TRUE, 'Health & Beauty', FALSE, NOW()),
('10014', 'Handbags & Purses', 'Handbags & Purses', NULL, 1, FALSE, TRUE, 'Handbags & Purses', FALSE, NOW()),
('10015', 'Fashion Jewelry', 'Fashion Jewelry', NULL, 1, FALSE, TRUE, 'Fashion Jewelry', FALSE, NOW()),

-- Home & Garden
('10016', 'Home & Garden', 'Home & Garden', NULL, 1, FALSE, TRUE, 'Home & Garden', FALSE, NOW()),
('10017', 'Home Improvement', 'Home Improvement', NULL, 1, FALSE, TRUE, 'Home Improvement', FALSE, NOW()),
('10018', 'Major Appliances', 'Major Appliances', NULL, 1, FALSE, TRUE, 'Major Appliances', FALSE, NOW()),
('10019', 'Kitchen & Dining', 'Kitchen & Dining', NULL, 1, FALSE, TRUE, 'Kitchen & Dining', FALSE, NOW()),
('10020', 'Furniture', 'Furniture', NULL, 1, FALSE, TRUE, 'Furniture', FALSE, NOW()),

-- Collectibles & Entertainment
('10021', 'Collectibles', 'Collectibles', NULL, 1, FALSE, TRUE, 'Collectibles', FALSE, NOW()),
('10022', 'Antiques', 'Antiques', NULL, 1, FALSE, TRUE, 'Antiques', FALSE, NOW()),
('10023', 'Art', 'Art', NULL, 1, FALSE, TRUE, 'Art', FALSE, NOW()),
('10024', 'Books & Magazines', 'Books & Magazines', NULL, 1, FALSE, TRUE, 'Books & Magazines', FALSE, NOW()),
('10025', 'Movies & TV', 'Movies & TV', NULL, 1, FALSE, TRUE, 'Movies & TV', FALSE, NOW()),
('10026', 'Music', 'Music', NULL, 1, FALSE, TRUE, 'Music', FALSE, NOW()),
('10027', 'Musical Instruments', 'Musical Instruments', NULL, 1, FALSE, TRUE, 'Musical Instruments', FALSE, NOW()),
('10028', 'Toys & Hobbies', 'Toys & Hobbies', NULL, 1, FALSE, TRUE, 'Toys & Hobbies', FALSE, NOW()),
('10029', 'Sports Memorabilia', 'Sports Memorabilia', NULL, 1, FALSE, TRUE, 'Sports Memorabilia', FALSE, NOW()),
('10030', 'Trading Cards', 'Trading Cards', NULL, 1, FALSE, TRUE, 'Trading Cards', FALSE, NOW()),

-- Motors & Business
('10031', 'eBay Motors', 'eBay Motors', NULL, 1, FALSE, TRUE, 'eBay Motors', FALSE, NOW()),
('10032', 'Business & Industrial', 'Business & Industrial', NULL, 1, FALSE, TRUE, 'Business & Industrial', FALSE, NOW());

-- レベル2カテゴリー自動生成用関数
CREATE OR REPLACE FUNCTION generate_level2_categories() RETURNS VOID AS $$
DECLARE
    parent_record RECORD;
    i INTEGER;
    new_id INTEGER := 20000;
BEGIN
    FOR parent_record IN 
        SELECT category_id, category_name, category_path 
        FROM ebay_categories_full 
        WHERE category_level = 1 
    LOOP
        FOR i IN 1..12 LOOP  -- 各レベル1に12のサブカテゴリー
            INSERT INTO ebay_categories_full (
                category_id, category_name, category_path, parent_id,
                category_level, is_leaf, is_active, ebay_category_name, leaf_category, last_fetched
            ) VALUES (
                new_id::text,
                parent_record.category_name || ' - Sub ' || i,
                parent_record.category_path || ' > ' || parent_record.category_name || ' - Sub ' || i,
                parent_record.category_id,
                2,
                CASE WHEN i > 8 THEN TRUE ELSE FALSE END,  -- 最後の4つはリーフ
                TRUE,
                parent_record.category_name || ' - Sub ' || i,
                CASE WHEN i > 8 THEN TRUE ELSE FALSE END,
                NOW()
            );
            new_id := new_id + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- レベル3カテゴリー自動生成用関数
CREATE OR REPLACE FUNCTION generate_level3_categories() RETURNS VOID AS $$
DECLARE
    parent_record RECORD;
    i INTEGER;
    new_id INTEGER := 50000;
BEGIN
    FOR parent_record IN 
        SELECT category_id, category_name, category_path 
        FROM ebay_categories_full 
        WHERE category_level = 2 AND is_leaf = FALSE
    LOOP
        FOR i IN 1..8 LOOP  -- 各レベル2に8の詳細カテゴリー
            INSERT INTO ebay_categories_full (
                category_id, category_name, category_path, parent_id,
                category_level, is_leaf, is_active, ebay_category_name, leaf_category, last_fetched
            ) VALUES (
                new_id::text,
                'Detail ' || i,
                parent_record.category_path || ' > Detail ' || i,
                parent_record.category_id,
                3,
                CASE WHEN i > 5 THEN TRUE ELSE FALSE END,  -- 最後の3つはリーフ
                TRUE,
                'Detail ' || i,
                CASE WHEN i > 5 THEN TRUE ELSE FALSE END,
                NOW()
            );
            new_id := new_id + 1;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- レベル4-5カテゴリー自動生成用関数
CREATE OR REPLACE FUNCTION generate_level45_categories() RETURNS VOID AS $$
DECLARE
    parent_record RECORD;
    i INTEGER;
    j INTEGER;
    new_id INTEGER := 100000;
    level4_id INTEGER;
BEGIN
    FOR parent_record IN 
        SELECT category_id, category_name, category_path 
        FROM ebay_categories_full 
        WHERE category_level = 3 AND is_leaf = FALSE
    LOOP
        FOR i IN 1..6 LOOP  -- 各レベル3に6のレベル4カテゴリー
            level4_id := new_id;
            INSERT INTO ebay_categories_full (
                category_id, category_name, category_path, parent_id,
                category_level, is_leaf, is_active, ebay_category_name, leaf_category, last_fetched
            ) VALUES (
                new_id::text,
                'Spec ' || i,
                parent_record.category_path || ' > Spec ' || i,
                parent_record.category_id,
                4,
                CASE WHEN i > 4 THEN TRUE ELSE FALSE END,
                TRUE,
                'Spec ' || i,
                CASE WHEN i > 4 THEN TRUE ELSE FALSE END,
                NOW()
            );
            new_id := new_id + 1;
            
            -- レベル5カテゴリー（30%のレベル4に追加）
            IF i <= 2 THEN  -- 最初の2つのレベル4のみ
                FOR j IN 1..4 LOOP
                    INSERT INTO ebay_categories_full (
                        category_id, category_name, category_path, parent_id,
                        category_level, is_leaf, is_active, ebay_category_name, leaf_category, last_fetched
                    ) VALUES (
                        new_id::text,
                        'Ultra ' || i || '-' || j,
                        parent_record.category_path || ' > Spec ' || i || ' > Ultra ' || i || '-' || j,
                        level4_id::text,
                        5,
                        TRUE,  -- レベル5は全てリーフ
                        TRUE,
                        'Ultra ' || i || '-' || j,
                        TRUE,
                        NOW()
                    );
                    new_id := new_id + 1;
                END LOOP;
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 関数実行
SELECT generate_level2_categories();
SELECT generate_level3_categories();
SELECT generate_level45_categories();

-- 手数料テーブル再作成
DROP TABLE IF EXISTS ebay_category_fees CASCADE;

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
);

-- 手数料データ自動生成・挿入
INSERT INTO ebay_category_fees (
    category_id, category_name, category_path,
    final_value_fee_percent, is_tiered, tier_1_percent, tier_1_max_amount, tier_2_percent,
    fee_group, fee_group_note
)
SELECT 
    category_id,
    category_name,
    category_path,
    CASE 
        -- Business & Industrial (3.00%)
        WHEN LOWER(category_name) LIKE '%business%' OR LOWER(category_name) LIKE '%industrial%' THEN 3.00
        -- Musical Instruments (6.70%)
        WHEN LOWER(category_name) LIKE '%musical%' OR LOWER(category_name) LIKE '%instrument%' THEN 6.70
        -- Motors (10.00% tiered)
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN 10.00
        -- Art (12.90%)
        WHEN LOWER(category_name) LIKE '%art%' OR LOWER(category_name) LIKE '%antique%' THEN 12.90
        -- Health & Beauty (12.35%)
        WHEN LOWER(category_name) LIKE '%health%' OR LOWER(category_name) LIKE '%beauty%' THEN 12.35
        -- Trading Cards (13.25%)
        WHEN LOWER(category_name) LIKE '%card%' OR LOWER(category_name) LIKE '%trading%' THEN 13.25
        -- Clothing (13.60% tiered)
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN 13.60
        -- Jewelry & Watches (15.00% tiered)
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN 15.00
        -- Books, Movies & Music (15.30%)
        WHEN LOWER(category_name) LIKE '%book%' OR LOWER(category_name) LIKE '%movie%' OR LOWER(category_name) LIKE '%music%' THEN 15.30
        -- Standard (13.60%)
        ELSE 13.60
    END as fee_percent,
    CASE 
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN TRUE
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN TRUE
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN TRUE
        ELSE FALSE
    END as is_tiered,
    CASE 
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN 10.00
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN 13.60
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN 15.00
        ELSE NULL
    END as tier1_percent,
    CASE 
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN 2000.00
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN 2000.00
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN 5000.00
        ELSE NULL
    END as tier1_max,
    CASE 
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN 5.00
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN 9.00
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN 9.00
        ELSE NULL
    END as tier2_percent,
    CASE 
        WHEN LOWER(category_name) LIKE '%business%' OR LOWER(category_name) LIKE '%industrial%' THEN 'business_industrial'
        WHEN LOWER(category_name) LIKE '%musical%' OR LOWER(category_name) LIKE '%instrument%' THEN 'musical_instruments'
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN 'motors'
        WHEN LOWER(category_name) LIKE '%art%' OR LOWER(category_name) LIKE '%antique%' THEN 'art'
        WHEN LOWER(category_name) LIKE '%health%' OR LOWER(category_name) LIKE '%beauty%' THEN 'health_beauty'
        WHEN LOWER(category_name) LIKE '%card%' OR LOWER(category_name) LIKE '%trading%' THEN 'trading_cards'
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN 'clothing'
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN 'jewelry_watches'
        WHEN LOWER(category_name) LIKE '%book%' OR LOWER(category_name) LIKE '%movie%' OR LOWER(category_name) LIKE '%music%' THEN 'media'
        ELSE 'standard'
    END as fee_group,
    CASE 
        WHEN LOWER(category_name) LIKE '%business%' OR LOWER(category_name) LIKE '%industrial%' THEN 'Business & Industrial (3.00%)'
        WHEN LOWER(category_name) LIKE '%musical%' OR LOWER(category_name) LIKE '%instrument%' THEN 'Musical Instruments (6.70%)'
        WHEN LOWER(category_name) LIKE '%motor%' OR LOWER(category_name) LIKE '%car%' OR LOWER(category_name) LIKE '%vehicle%' THEN 'Motors (10% up to $2,000, then 5%)'
        WHEN LOWER(category_name) LIKE '%art%' OR LOWER(category_name) LIKE '%antique%' THEN 'Art (12.90%)'
        WHEN LOWER(category_name) LIKE '%health%' OR LOWER(category_name) LIKE '%beauty%' THEN 'Health & Beauty (12.35%)'
        WHEN LOWER(category_name) LIKE '%card%' OR LOWER(category_name) LIKE '%trading%' THEN 'Trading Cards (13.25%)'
        WHEN LOWER(category_name) LIKE '%clothing%' OR LOWER(category_name) LIKE '%fashion%' OR LOWER(category_name) LIKE '%shoes%' THEN 'Clothing (13.6% up to $2,000, then 9%)'
        WHEN LOWER(category_name) LIKE '%jewelry%' OR LOWER(category_name) LIKE '%watch%' THEN 'Jewelry & Watches (15% up to $5,000, then 9%)'
        WHEN LOWER(category_name) LIKE '%book%' OR LOWER(category_name) LIKE '%movie%' OR LOWER(category_name) LIKE '%music%' THEN 'Books, Movies & Music (15.30%)'
        ELSE 'Standard eBay fee (13.60%)'
    END as fee_note
FROM ebay_categories_full;

-- 関数削除
DROP FUNCTION generate_level2_categories();
DROP FUNCTION generate_level3_categories();
DROP FUNCTION generate_level45_categories();

-- 統計表示
SELECT 
    'レベル別カテゴリー統計' as info,
    category_level,
    COUNT(*) as category_count,
    COUNT(CASE WHEN is_leaf = TRUE THEN 1 END) as leaf_count
FROM ebay_categories_full
GROUP BY category_level
ORDER BY category_level;

SELECT 
    'システム完成統計' as info,
    (SELECT COUNT(*) FROM ebay_categories_full) as total_categories,
    (SELECT COUNT(*) FROM ebay_category_fees) as total_fees,
    (SELECT COUNT(*) FROM ebay_categories_full WHERE is_leaf = TRUE) as leaf_categories;
