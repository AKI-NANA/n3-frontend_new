-- eBay公式手数料データベース（2025年2月版）
-- ソース: https://www.ebay.com/help/selling/selling-fees/store-fees?id=4809#section3

-- 既存データクリア
DROP TABLE IF EXISTS ebay_official_fees CASCADE;
DROP TABLE IF EXISTS ebay_category_mappings CASCADE;

-- eBay公式手数料テーブル作成
CREATE TABLE ebay_official_fees (
    id SERIAL PRIMARY KEY,
    category_path TEXT NOT NULL,
    store_type VARCHAR(20) NOT NULL CHECK (store_type IN ('starter', 'basic_plus')),
    fee_tier_1_percent DECIMAL(5,2) NOT NULL,
    fee_tier_1_max DECIMAL(12,2),
    fee_tier_2_percent DECIMAL(5,2),
    fee_tier_2_max DECIMAL(12,2),
    fee_tier_3_percent DECIMAL(5,2),
    is_flat_rate BOOLEAN DEFAULT FALSE,
    per_order_fee DECIMAL(5,2) DEFAULT 0.40,
    special_conditions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Starter Store手数料データ挿入
INSERT INTO ebay_official_fees (category_path, store_type, fee_tier_1_percent, fee_tier_1_max, fee_tier_2_percent, special_conditions) VALUES

-- Most categories (13.6%)
('Most categories', 'starter', 13.60, 7500.00, 2.35, 'Including eBay Motors > Parts & Accessories, Automotive Tools & Supplies, Safety & Security Accessories'),

-- Books, Movies & Music (15.3%)
('Books & Magazines', 'starter', 15.30, 7500.00, 2.35, 'Except Movie NFTs'),
('Movies & TV', 'starter', 15.30, 7500.00, 2.35, 'Except Movie NFTs'),
('Music', 'starter', 15.30, 7500.00, 2.35, 'Except Music NFTs and Vinyl Records'),

-- Coins & Paper Money (13.25%)
('Coins & Paper Money', 'starter', 13.25, 7500.00, 2.35, 'Except Bullion'),

-- Coins & Paper Money > Bullion (Special tiered)
('Coins & Paper Money > Bullion', 'starter', 13.60, 7500.00, 7.00, 'Special rate above $7,500'),

-- Trading Cards & Collectibles (13.25%)
('Collectibles > Comic Books & Memorabilia', 'starter', 13.25, 7500.00, 2.35, NULL),
('Collectibles > Non-Sport Trading Cards', 'starter', 13.25, 7500.00, 2.35, NULL),
('Sports Mem, Cards & Fan Shop > Sports Trading Cards', 'starter', 13.25, 7500.00, 2.35, NULL),
('Toys & Hobbies > Collectible Card Games', 'starter', 13.25, 7500.00, 2.35, NULL),

-- Musical Instruments (6.7%)
('Musical Instruments & Gear > Guitars & Basses', 'starter', 6.70, 7500.00, 2.35, 'Lowest rate category'),

-- Jewelry & Watches (15% tiered)
('Jewelry & Watches', 'starter', 15.00, 5000.00, 9.00, 'Except Watches, Parts & Accessories'),
('Jewelry & Watches > Watches, Parts & Accessories', 'starter', 15.00, 1000.00, 6.50, 'Up to $1,000, then 6.5% up to $7,500, then 3%'),

-- NFT Categories (5%)
('Art NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),
('CCG NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),
('Emerging NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),
('Movie NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),
('Music NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),
('Non-Sport Trading Card NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),
('Sport Trading Card NFTs', 'starter', 5.00, NULL, NULL, 'Flat rate'),

-- Business & Industrial (3%)
('Business & Industrial > Heavy Equipment, Parts & Attachments > Heavy Equipment', 'starter', 3.00, 15000.00, 0.50, 'Lowest business rate'),
('Business & Industrial > Printing & Graphic Arts > Commercial Printing Presses', 'starter', 3.00, 15000.00, 0.50, NULL),
('Business & Industrial > Restaurant & Food Service > Food Trucks, Trailers & Carts', 'starter', 3.00, 15000.00, 0.50, NULL),

-- Athletic Shoes (8% special)
('Clothing, Shoes & Accessories > Men > Men''s Shoes > Athletic Shoes', 'starter', 8.00, NULL, NULL, '$150+ no per order fee; <$150 = 13.6%'),
('Clothing, Shoes & Accessories > Women > Women''s Shoes > Athletic Shoes', 'starter', 8.00, NULL, NULL, '$150+ no per order fee; <$150 = 13.6%'),

-- Women's Bags (15% tiered)
('Clothing, Shoes & Accessories > Women > Women''s Bags & Handbags', 'starter', 15.00, 2000.00, 9.00, 'Up to $2,000, then 9%');

-- Basic+ Store手数料データ挿入（料金が異なる）
INSERT INTO ebay_official_fees (category_path, store_type, fee_tier_1_percent, fee_tier_1_max, fee_tier_2_percent, special_conditions) VALUES

-- Antiques (12.7%)
('Antiques', 'basic_plus', 12.70, 2500.00, 2.35, NULL),

-- Art (12.7%)
('Art', 'basic_plus', 12.70, 2500.00, 2.35, 'Except Art NFTs'),

-- Baby (12.7%)
('Baby', 'basic_plus', 12.70, 2500.00, 2.35, NULL),

-- Books & Magazines (15.3%)
('Books & Magazines', 'basic_plus', 15.30, 2500.00, 2.35, NULL),

-- Business & Industrial (12.7% most, 2.5% heavy)
('Business & Industrial', 'basic_plus', 12.70, 2500.00, 2.35, 'Most categories'),
('Business & Industrial > Heavy Equipment, Parts & Attachments > Heavy Equipment', 'basic_plus', 2.50, 15000.00, 0.50, NULL),
('Business & Industrial > Printing & Graphic Arts > Commercial Printing Presses', 'basic_plus', 2.50, 15000.00, 0.50, NULL),
('Business & Industrial > Restaurant & Food Service > Food Trucks, Trailers & Carts', 'basic_plus', 2.50, 15000.00, 0.50, NULL),

-- Cameras & Photo (9.35% most)
('Cameras & Photo', 'basic_plus', 9.35, 2500.00, 2.35, 'Most categories'),

-- Cell Phones (9.35% most)
('Cell Phones & Accessories', 'basic_plus', 9.35, 2500.00, 2.35, 'Most categories'),

-- Clothing (12.7% most)
('Clothing, Shoes & Accessories', 'basic_plus', 12.70, 2500.00, 2.35, 'Most categories'),
('Clothing, Shoes & Accessories > Women > Women''s Bags & Handbags', 'basic_plus', 13.00, 2000.00, 7.00, 'Special rate'),
('Clothing, Shoes & Accessories > Men > Men''s Shoes > Athletic Shoes', 'basic_plus', 7.00, NULL, NULL, '$150+ no per order fee'),
('Clothing, Shoes & Accessories > Women > Women''s Shoes > Athletic Shoes', 'basic_plus', 7.00, NULL, NULL, '$150+ no per order fee'),

-- Coins & Paper Money (9% most, special for Bullion)
('Coins & Paper Money', 'basic_plus', 9.00, 4000.00, 2.35, 'Most categories'),
('Coins & Paper Money > Bullion', 'basic_plus', 7.50, 1500.00, 5.00, 'Up to $1,500, then 5% up to $10,000, then 4.5%'),

-- Computers (9.35% most, 7.35% some)
('Computers/Tablets & Networking', 'basic_plus', 9.35, 2500.00, 2.35, 'Most categories'),

-- Musical Instruments (10.35% most, 6.7% guitars)
('Musical Instruments & Gear', 'basic_plus', 10.35, 2500.00, 2.35, 'Most categories'),
('Musical Instruments & Gear > Guitars & Basses', 'basic_plus', 6.70, 2500.00, 2.35, 'Special reduced rate'),

-- Jewelry & Watches (13% most)
('Jewelry & Watches', 'basic_plus', 13.00, 5000.00, 7.00, 'Most categories'),
('Jewelry & Watches > Watches, Parts & Accessories', 'basic_plus', 12.50, 1000.00, 4.00, 'Up to $1,000, then 4% up to $5,000, then 3%'),

-- eBay Motors (11.5% most)
('eBay Motors > Automotive Tools & Supplies', 'basic_plus', 11.50, 1000.00, 2.35, NULL),
('eBay Motors > Parts & Accessories', 'basic_plus', 11.50, 1000.00, 2.35, 'See tire exceptions'),
('eBay Motors > Safety & Security Accessories', 'basic_plus', 11.50, 1000.00, 2.35, NULL),

-- Movies & TV (15.3%)
('Movies & TV', 'basic_plus', 15.30, 2500.00, 2.35, 'Except Movie NFTs'),

-- Music (15.3% most, 12.7% vinyl)
('Music', 'basic_plus', 15.30, 2500.00, 2.35, 'Most categories'),
('Music > Vinyl Records', 'basic_plus', 12.70, 2500.00, 2.35, 'Reduced rate for vinyl'),

-- Sports Cards (12.35%)
('Sports Mem, Cards & Fan Shop > Sports Trading Cards', 'basic_plus', 12.35, 2500.00, 2.35, NULL),

-- Trading Cards (12.35%)
('Collectibles > Non-Sport Trading Cards', 'basic_plus', 12.35, 2500.00, 2.35, NULL),
('Toys & Hobbies > Collectible Card Games', 'basic_plus', 12.35, 2500.00, 2.35, NULL),

-- Video Games (9.35% most, 7.35% consoles)
('Video Games & Consoles', 'basic_plus', 9.35, 2500.00, 2.35, 'Most categories'),
('Video Games & Consoles > Video Game Consoles', 'basic_plus', 7.35, 2500.00, 2.35, 'Consoles only'),

-- All other categories (12.7%)
('All other categories', 'basic_plus', 12.70, 2500.00, 2.35, 'Default rate');

-- カテゴリーマッピングテーブル作成
CREATE TABLE ebay_category_mappings (
    id SERIAL PRIMARY KEY,
    ebay_category_id VARCHAR(20) NOT NULL,
    official_fee_id INTEGER NOT NULL,
    mapping_confidence DECIMAL(5,2) DEFAULT 100.00,
    mapping_method VARCHAR(50) DEFAULT 'path_match',
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (ebay_category_id) REFERENCES ebay_categories_full(category_id),
    FOREIGN KEY (official_fee_id) REFERENCES ebay_official_fees(id)
);

-- インデックス作成
CREATE INDEX idx_official_fees_category_path ON ebay_official_fees(category_path);
CREATE INDEX idx_official_fees_store_type ON ebay_official_fees(store_type);
CREATE INDEX idx_category_mappings_category_id ON ebay_category_mappings(ebay_category_id);
CREATE INDEX idx_category_mappings_fee_id ON ebay_category_mappings(official_fee_id);

-- カテゴリーマッピング自動実行関数
CREATE OR REPLACE FUNCTION map_categories_to_official_fees() RETURNS INTEGER AS $$
DECLARE
    category_record RECORD;
    fee_record RECORD;
    mapped_count INTEGER := 0;
    best_match_id INTEGER;
    max_score INTEGER;
    current_score INTEGER;
BEGIN
    -- 全カテゴリーを処理
    FOR category_record IN 
        SELECT category_id, category_name, category_path 
        FROM ebay_categories_full 
        WHERE is_active = TRUE
    LOOP
        best_match_id := NULL;
        max_score := 0;
        
        -- 各公式手数料データとマッチング
        FOR fee_record IN 
            SELECT id, category_path, store_type
            FROM ebay_official_fees 
            WHERE store_type = 'starter'  -- Starter Storeを基準
        LOOP
            current_score := 0;
            
            -- 完全パス一致（最高スコア）
            IF category_record.category_path ILIKE '%' || fee_record.category_path || '%' THEN
                current_score := 100;
            -- 部分パス一致
            ELSIF POSITION(LOWER(fee_record.category_path) IN LOWER(category_record.category_path)) > 0 THEN
                current_score := 80;
            -- カテゴリー名一致
            ELSIF POSITION(LOWER(fee_record.category_path) IN LOWER(category_record.category_name)) > 0 THEN
                current_score := 60;
            -- キーワード一致
            ELSE
                -- 主要キーワードでのマッチング
                IF (fee_record.category_path ILIKE '%Musical Instruments%' AND 
                   (category_record.category_name ILIKE '%musical%' OR category_record.category_name ILIKE '%instrument%' OR category_record.category_name ILIKE '%guitar%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Business & Industrial%' AND 
                      (category_record.category_name ILIKE '%business%' OR category_record.category_name ILIKE '%industrial%' OR category_record.category_name ILIKE '%equipment%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Trading Cards%' AND 
                      (category_record.category_name ILIKE '%card%' OR category_record.category_name ILIKE '%trading%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Jewelry%' AND 
                      (category_record.category_name ILIKE '%jewelry%' OR category_record.category_name ILIKE '%watch%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Clothing%' AND 
                      (category_record.category_name ILIKE '%clothing%' OR category_record.category_name ILIKE '%fashion%' OR category_record.category_name ILIKE '%shoes%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Books%' AND 
                      (category_record.category_name ILIKE '%book%' OR category_record.category_name ILIKE '%magazine%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Movies%' AND 
                      (category_record.category_name ILIKE '%movie%' OR category_record.category_name ILIKE '%film%' OR category_record.category_name ILIKE '%dvd%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Music%' AND 
                      (category_record.category_name ILIKE '%music%' OR category_record.category_name ILIKE '%cd%' OR category_record.category_name ILIKE '%vinyl%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path ILIKE '%Coins%' AND 
                      (category_record.category_name ILIKE '%coin%' OR category_record.category_name ILIKE '%money%')) THEN
                    current_score := 90;
                ELSIF (fee_record.category_path = 'Most categories') THEN
                    current_score := 10; -- デフォルトマッチング
                END IF;
            END IF;
            
            -- 最高スコアを更新
            IF current_score > max_score THEN
                max_score := current_score;
                best_match_id := fee_record.id;
            END IF;
        END LOOP;
        
        -- マッピング挿入
        IF best_match_id IS NOT NULL THEN
            INSERT INTO ebay_category_mappings (ebay_category_id, official_fee_id, mapping_confidence, mapping_method)
            VALUES (category_record.category_id, best_match_id, max_score, 'auto_keyword_match');
            mapped_count := mapped_count + 1;
        END IF;
    END LOOP;
    
    RETURN mapped_count;
END;
$$ LANGUAGE plpgsql;

-- カテゴリーマッピング実行
SELECT map_categories_to_official_fees() as mapped_categories;

-- 手数料設定を既存テーブルに同期
UPDATE ebay_category_fees SET 
    final_value_fee_percent = eof.fee_tier_1_percent,
    is_tiered = CASE WHEN eof.fee_tier_2_percent IS NOT NULL THEN TRUE ELSE FALSE END,
    tier_1_percent = eof.fee_tier_1_percent,
    tier_1_max_amount = eof.fee_tier_1_max,
    tier_2_percent = eof.fee_tier_2_percent,
    fee_group_note = CONCAT('Official eBay: ', eof.category_path, 
                           CASE WHEN eof.special_conditions IS NOT NULL 
                                THEN ' - ' || eof.special_conditions 
                                ELSE '' END)
FROM ebay_official_fees eof
JOIN ebay_category_mappings ecm ON eof.id = ecm.official_fee_id
WHERE ebay_category_fees.category_id = ecm.ebay_category_id;

-- 統計表示
SELECT 
    '=== eBay公式手数料データベース完成 ===' as status,
    (SELECT COUNT(*) FROM ebay_official_fees) as official_fee_rules,
    (SELECT COUNT(*) FROM ebay_category_mappings) as mapped_categories,
    (SELECT COUNT(DISTINCT fee_tier_1_percent) FROM ebay_official_fees WHERE store_type = 'starter') as unique_fee_rates;

-- 手数料分布確認
SELECT 
    eof.category_path,
    eof.fee_tier_1_percent,
    COUNT(ecm.ebay_category_id) as category_count,
    ROUND(COUNT(ecm.ebay_category_id) * 100.0 / (SELECT COUNT(*) FROM ebay_category_mappings), 1) as percentage
FROM ebay_official_fees eof
JOIN ebay_category_mappings ecm ON eof.id = ecm.official_fee_id
WHERE eof.store_type = 'starter'
GROUP BY eof.category_path, eof.fee_tier_1_percent
ORDER BY eof.fee_tier_1_percent ASC, category_count DESC;
