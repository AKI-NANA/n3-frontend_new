--
-- eBayカテゴリー完全システム - 不足テーブル緊急作成
-- 実行日: 2025-09-19
--

-- 既存テーブル状況確認
DO $$
BEGIN
    RAISE NOTICE '=== テーブル存在確認 ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ebay_simple_learning') THEN
        RAISE NOTICE '✅ ebay_simple_learning: 存在';
    ELSE
        RAISE NOTICE '❌ ebay_simple_learning: 不在（作成します）';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_keywords') THEN
        RAISE NOTICE '✅ category_keywords: 存在';
    ELSE
        RAISE NOTICE '❌ category_keywords: 不在（作成します）';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_matches') THEN
        RAISE NOTICE '✅ fee_matches: 存在';
    ELSE
        RAISE NOTICE '❌ fee_matches: 不在（作成します）';
    END IF;
END $$;

-- =============================================================================
-- 1. 学習システムテーブル（AI機能のコア）
-- =============================================================================

CREATE TABLE IF NOT EXISTS ebay_simple_learning (
    id SERIAL PRIMARY KEY,
    title_hash VARCHAR(32) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    brand VARCHAR(100),
    yahoo_category VARCHAR(200),
    price_jpy INTEGER DEFAULT 0,
    learned_category_id VARCHAR(20) NOT NULL,
    learned_category_name VARCHAR(200) NOT NULL,
    confidence INTEGER DEFAULT 70 CHECK (confidence >= 0 AND confidence <= 100),
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 学習テーブルインデックス
CREATE INDEX IF NOT EXISTS idx_ebay_simple_learning_hash ON ebay_simple_learning(title_hash);
CREATE INDEX IF NOT EXISTS idx_ebay_simple_learning_usage ON ebay_simple_learning(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_ebay_simple_learning_category ON ebay_simple_learning(learned_category_id);

-- =============================================================================
-- 2. eBayカテゴリーマスター（31,644カテゴリー対応）
-- =============================================================================

CREATE TABLE IF NOT EXISTS ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(500) NOT NULL,
    category_path TEXT,
    parent_id VARCHAR(20),
    level INTEGER DEFAULT 1,
    is_leaf BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    listing_duration VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- カテゴリーテーブルインデックス
CREATE INDEX IF NOT EXISTS idx_ebay_categories_parent ON ebay_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_active ON ebay_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_name ON ebay_categories(category_name);

-- =============================================================================
-- 3. キーワード辞書（判定精度向上）
-- =============================================================================

CREATE TABLE IF NOT EXISTS category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    keyword VARCHAR(200) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary' CHECK (keyword_type IN ('primary', 'secondary', 'negative')),
    weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    language VARCHAR(5) DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'mixed')),
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- キーワードテーブルインデックス
CREATE INDEX IF NOT EXISTS idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX IF NOT EXISTS idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_category_keywords_active ON category_keywords(is_active);

-- =============================================================================
-- 4. 手数料データ（利益計算用）
-- =============================================================================

CREATE TABLE IF NOT EXISTS fee_matches (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    listing_type VARCHAR(30) DEFAULT 'FixedPriceItem',
    final_value_fee_percent DECIMAL(5,2) DEFAULT 13.25,
    insertion_fee DECIMAL(8,2) DEFAULT 0.00,
    subtitle_fee DECIMAL(8,2) DEFAULT 0.00,
    gallery_fee DECIMAL(8,2) DEFAULT 0.00,
    bold_fee DECIMAL(8,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- 手数料テーブルインデックス
CREATE INDEX IF NOT EXISTS idx_fee_matches_category ON fee_matches(category_id);
CREATE INDEX IF NOT EXISTS idx_fee_matches_active ON fee_matches(is_active);

-- =============================================================================
-- 5. 初期データ投入（最重要カテゴリー）
-- =============================================================================

-- 主要カテゴリーデータ
INSERT INTO ebay_categories (category_id, category_name, category_path, is_active) VALUES
('293', 'Cell Phones & Smartphones', 'Electronics > Cell Phones & Accessories > Cell Phones & Smartphones', TRUE),
('625', 'Cameras & Photo', 'Electronics > Cameras & Photo', TRUE),
('267', 'Books & Magazines', 'Media > Books & Magazines', TRUE),
('14324', 'Jewelry & Watches', 'Fashion > Jewelry & Watches', TRUE),
('139973', 'Video Games', 'Entertainment > Video Games & Consoles > Video Games', TRUE),
('220', 'Toys & Hobbies', 'Toys & Hobbies', TRUE),
('11450', 'Clothing, Shoes & Accessories', 'Fashion > Clothing, Shoes & Accessories', TRUE),
('58058', 'Sports Trading Cards', 'Collectibles > Trading Cards > Sports Trading Cards', TRUE),
('183454', 'Non-Sport Trading Cards', 'Collectibles > Trading Cards > Non-Sport Trading Cards', TRUE),
('99999', 'Other', 'Other > Unclassified', TRUE)
ON CONFLICT (category_id) DO UPDATE SET
    category_name = EXCLUDED.category_name,
    category_path = EXCLUDED.category_path,
    updated_at = NOW();

-- 主要キーワード投入（高精度判定用）
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- スマートフォン
('293', 'iphone', 'primary', 10, 'en'),
('293', 'アイフォン', 'primary', 10, 'ja'),
('293', 'samsung', 'primary', 9, 'en'),
('293', 'galaxy', 'primary', 9, 'en'),
('293', 'smartphone', 'primary', 9, 'en'),
('293', 'スマホ', 'primary', 9, 'ja'),
('293', 'スマートフォン', 'primary', 9, 'ja'),

-- カメラ
('625', 'canon', 'primary', 10, 'en'),
('625', 'nikon', 'primary', 10, 'en'),
('625', 'sony', 'primary', 10, 'en'),
('625', 'camera', 'primary', 9, 'en'),
('625', 'カメラ', 'primary', 9, 'ja'),
('625', 'ミラーレス', 'primary', 9, 'ja'),

-- 本・雑誌
('267', 'book', 'primary', 9, 'en'),
('267', '本', 'primary', 9, 'ja'),
('267', 'manga', 'primary', 9, 'en'),
('267', '漫画', 'primary', 9, 'ja'),
('267', 'magazine', 'primary', 8, 'en'),
('267', '雑誌', 'primary', 8, 'ja'),

-- 時計・ジュエリー
('14324', 'watch', 'primary', 9, 'en'),
('14324', '時計', 'primary', 9, 'ja'),
('14324', 'rolex', 'primary', 10, 'en'),
('14324', 'jewelry', 'primary', 8, 'en'),
('14324', 'ジュエリー', 'primary', 8, 'ja'),

-- ゲーム
('139973', 'playstation', 'primary', 10, 'en'),
('139973', 'nintendo', 'primary', 10, 'en'),
('139973', 'xbox', 'primary', 9, 'en'),
('139973', 'game', 'primary', 8, 'en'),
('139973', 'ゲーム', 'primary', 8, 'ja')

ON CONFLICT DO NOTHING;

-- 手数料データ投入
INSERT INTO fee_matches (category_id, final_value_fee_percent, listing_type) VALUES
('293', 12.90, 'FixedPriceItem'),  -- スマートフォン
('625', 12.35, 'FixedPriceItem'),  -- カメラ
('267', 15.00, 'FixedPriceItem'),  -- 本・雑誌
('14324', 13.25, 'FixedPriceItem'), -- 時計・ジュエリー
('139973', 13.25, 'FixedPriceItem'), -- ゲーム
('220', 13.25, 'FixedPriceItem'),  -- おもちゃ
('11450', 13.25, 'FixedPriceItem'), -- 衣類
('58058', 13.25, 'FixedPriceItem'), -- スポーツカード
('183454', 13.25, 'FixedPriceItem'), -- 非スポーツカード
('99999', 13.25, 'FixedPriceItem') -- その他
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 6. 学習データ初期サンプル
-- =============================================================================

INSERT INTO ebay_simple_learning (
    title_hash, title, brand, yahoo_category, price_jpy,
    learned_category_id, learned_category_name, confidence, usage_count
) VALUES
('sample1', 'iPhone 14 Pro 128GB Space Black', 'Apple', '携帯電話、スマートフォン', 120000, '293', 'Cell Phones & Smartphones', 95, 5),
('sample2', 'Canon EOS R6 Mark II', 'Canon', 'カメラ、光学機器', 280000, '625', 'Cameras & Photo', 90, 3),
('sample3', 'ドラゴンボール 全42巻セット', '', '本、雑誌', 8000, '267', 'Books & Magazines', 85, 2),
('sample4', 'PlayStation 5 本体', 'Sony', 'ゲーム、おもちゃ', 60000, '139973', 'Video Games', 90, 4),
('sample5', 'ROLEX デイトナ', 'Rolex', '時計、アクセサリー', 1500000, '14324', 'Jewelry & Watches', 95, 1)
ON CONFLICT (title_hash) DO UPDATE SET
    usage_count = ebay_simple_learning.usage_count + EXCLUDED.usage_count;

-- =============================================================================
-- 完了報告
-- =============================================================================

DO $$
DECLARE
    categories_count INTEGER;
    keywords_count INTEGER;
    learning_count INTEGER;
    fees_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO categories_count FROM ebay_categories;
    SELECT COUNT(*) INTO keywords_count FROM category_keywords;
    SELECT COUNT(*) INTO learning_count FROM ebay_simple_learning;
    SELECT COUNT(*) INTO fees_count FROM fee_matches;
    
    RAISE NOTICE '=== eBayカテゴリー完全システム構築完了 ===';
    RAISE NOTICE '✅ カテゴリー数: %', categories_count;
    RAISE NOTICE '✅ キーワード数: %', keywords_count;
    RAISE NOTICE '✅ 学習データ数: %', learning_count;
    RAISE NOTICE '✅ 手数料データ数: %', fees_count;
    RAISE NOTICE '🚀 システム稼働準備完了！';
END $$;