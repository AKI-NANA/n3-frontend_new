#!/bin/bash
# 完全統合データベースセットアップ
# ファイル: complete_database_setup.sh

echo "🚀 eBayカテゴリーシステム 完全データベースセットアップ"
echo "=================================================="

# データベース接続確認
echo "🔌 データベース接続確認..."
if ! psql -h localhost -U aritahiroaki -d nagano3_db -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ データベース接続失敗"
    echo "PostgreSQLを起動してください: brew services start postgresql"
    exit 1
fi
echo "✅ データベース接続OK"

# 既存テーブル削除・再作成
echo ""
echo "🔄 既存テーブルクリーンアップ..."
psql -h localhost -U aritahiroaki -d nagano3_db << 'EOF'
-- 既存テーブル削除
DROP TABLE IF EXISTS ebay_simple_learning CASCADE;
DROP TABLE IF EXISTS fee_matches CASCADE;
DROP TABLE IF EXISTS category_keywords CASCADE;
DROP TABLE IF EXISTS category_required_fields CASCADE;
DROP TABLE IF EXISTS processed_products CASCADE;
DROP TABLE IF EXISTS processing_logs CASCADE;
DROP TABLE IF EXISTS ebay_categories CASCADE;

-- eBayカテゴリーマスター
CREATE TABLE ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    parent_id VARCHAR(20),
    category_path TEXT,
    category_level INTEGER DEFAULT 1,
    is_leaf BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- カテゴリー別キーワード辞書
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    keyword VARCHAR(200) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary' CHECK (keyword_type IN ('primary', 'secondary', 'negative')),
    weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    language VARCHAR(5) DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'mixed')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- 手数料データ
CREATE TABLE fee_matches (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20),
    category_path TEXT,
    fee_percent DECIMAL(5,2) NOT NULL,
    confidence INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id)
);

-- 学習システム
CREATE TABLE ebay_simple_learning (
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
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (learned_category_id) REFERENCES ebay_categories(category_id)
);

-- インデックス作成
CREATE INDEX idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX idx_fee_matches_category ON fee_matches(category_id);
CREATE INDEX idx_learning_hash ON ebay_simple_learning(title_hash);
CREATE INDEX idx_learning_category ON ebay_simple_learning(learned_category_id);

-- 基本カテゴリーデータ投入
INSERT INTO ebay_categories (category_id, category_name, category_path, is_active) VALUES
('293', 'Cell Phones & Smartphones', 'Electronics > Cell Phones & Accessories > Cell Phones & Smartphones', TRUE),
('625', 'Cameras & Photo', 'Electronics > Cameras & Photo', TRUE),
('267', 'Books & Magazines', 'Media > Books & Magazines', TRUE),
('11450', 'Clothing, Shoes & Accessories', 'Fashion > Clothing, Shoes & Accessories', TRUE),
('14324', 'Jewelry & Watches', 'Fashion > Jewelry & Watches', TRUE),
('139973', 'Video Games', 'Entertainment > Video Games & Consoles > Video Games', TRUE),
('58058', 'Sports Trading Cards', 'Collectibles > Trading Cards > Sports Trading Cards', TRUE),
('183454', 'Non-Sport Trading Cards', 'Collectibles > Trading Cards > Non-Sport Trading Cards', TRUE),
('220', 'Toys & Hobbies', 'Toys & Hobbies', TRUE),
('99999', 'Other', 'Other > Unclassified', TRUE);

-- キーワード辞書データ
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- スマートフォン
('293', 'iphone', 'primary', 10, 'en'),
('293', 'アイフォン', 'primary', 10, 'ja'),
('293', 'samsung', 'primary', 9, 'en'),
('293', 'galaxy', 'primary', 9, 'en'),
('293', 'smartphone', 'primary', 9, 'en'),
('293', 'スマホ', 'primary', 9, 'ja'),
('293', 'android', 'secondary', 7, 'en'),
('293', 'pixel', 'primary', 8, 'en'),

-- カメラ
('625', 'camera', 'primary', 10, 'en'),
('625', 'カメラ', 'primary', 10, 'ja'),
('625', 'canon', 'primary', 10, 'en'),
('625', 'nikon', 'primary', 10, 'en'),
('625', 'sony', 'primary', 9, 'en'),
('625', 'lens', 'secondary', 8, 'en'),
('625', 'レンズ', 'secondary', 8, 'ja'),

-- 本・漫画
('267', 'book', 'primary', 10, 'en'),
('267', '本', 'primary', 10, 'ja'),
('267', 'manga', 'primary', 10, 'en'),
('267', 'マンガ', 'primary', 10, 'ja'),
('267', '漫画', 'primary', 10, 'ja'),
('267', '巻', 'secondary', 7, 'ja'),

-- 衣類
('11450', 'clothing', 'primary', 8, 'en'),
('11450', '服', 'primary', 8, 'ja'),
('11450', 'shirt', 'primary', 9, 'en'),
('11450', 'dress', 'primary', 9, 'en'),

-- 時計・ジュエリー
('14324', 'watch', 'primary', 10, 'en'),
('14324', '時計', 'primary', 10, 'ja'),
('14324', 'jewelry', 'primary', 9, 'en'),
('14324', 'rolex', 'primary', 10, 'en');

-- 手数料データ
INSERT INTO fee_matches (category_id, category_path, fee_percent, confidence) VALUES
('293', 'Cell Phones & Smartphones', 12.90, 95),
('625', 'Cameras & Photo', 12.35, 90),
('267', 'Books & Magazines', 15.30, 95),
('11450', 'Clothing, Shoes & Accessories', 13.60, 85),
('14324', 'Jewelry & Watches', 15.00, 90),
('139973', 'Video Games', 13.25, 85),
('58058', 'Sports Trading Cards', 13.25, 80),
('220', 'Toys & Hobbies', 13.60, 80),
('99999', 'Other', 13.25, 50);

EOF

echo "✅ データベースセットアップ完了"

# データ確認
echo ""
echo "📊 データベース確認..."
psql -h localhost -U aritahiroaki -d nagano3_db -c "
SELECT 
    'カテゴリー数' as 項目, COUNT(*)::text as 値 
FROM ebay_categories
UNION ALL
SELECT 
    'キーワード数' as 項目, COUNT(*)::text as 値
FROM category_keywords  
UNION ALL
SELECT
    '手数料データ数' as 項目, COUNT(*)::text as 値
FROM fee_matches;

SELECT '主要カテゴリー' as 情報, category_id, category_name 
FROM ebay_categories 
WHERE is_active = TRUE 
ORDER BY category_id 
LIMIT 5;
"

echo ""
echo "🎉 完全統合データベースセットアップ完了!"
echo "次のステップ: Webツールでテストしてください"