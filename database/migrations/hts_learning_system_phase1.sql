-- ========================================
-- HTS学習システム - データベース作成SQL
-- Phase 1: テーブル定義
-- ========================================

-- UUID拡張を有効化（必要な場合）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. 学習データテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS hts_learning_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 商品情報（特徴ベクトルとしての役割）
    product_title_ja TEXT NOT NULL,
    product_title_en TEXT,
    category_name_ja TEXT,
    brand_name_ja TEXT,
    material TEXT,
    
    -- 確定情報
    confirmed_hts_code TEXT NOT NULL,
    confirmed_origin_country TEXT, -- 2文字コード (e.g., 'JP', 'US')
    used_keywords TEXT, -- 選択時に使用されたキーワード
    
    -- 統計情報
    usage_count INTEGER DEFAULT 1,
    success_rate NUMERIC DEFAULT 1.0, -- 初回は1.0 (1/1)
    last_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 検索時の信頼度
    search_score NUMERIC -- 確定時のDBスコア（参考情報）
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_hts_learning_code_cat 
ON hts_learning_data (confirmed_hts_code, category_name_ja);

CREATE INDEX IF NOT EXISTS idx_hts_learning_title_fts 
ON hts_learning_data USING GIN (to_tsvector('english', product_title_ja));

CREATE INDEX IF NOT EXISTS idx_hts_learning_keywords 
ON hts_learning_data (used_keywords);

CREATE INDEX IF NOT EXISTS idx_hts_learning_usage 
ON hts_learning_data (usage_count DESC, last_confirmed_at DESC);

-- ========================================
-- 2. カテゴリーマスター
-- ========================================
CREATE TABLE IF NOT EXISTS hts_category_master (
    id SERIAL PRIMARY KEY,
    category_name_ja TEXT NOT NULL UNIQUE,
    category_name_en TEXT,
    
    recommended_hts_code TEXT NOT NULL,
    recommended_material TEXT,
    related_keywords TEXT, -- カンマ区切り
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. ブランドマスター
-- ========================================
CREATE TABLE IF NOT EXISTS hts_brand_master (
    id SERIAL PRIMARY KEY,
    brand_name_ja TEXT NOT NULL UNIQUE,
    brand_name_en TEXT,
    
    origin_country_candidates TEXT[] DEFAULT ARRAY[]::TEXT[], -- 複数候補
    related_hts_code TEXT,
    related_material TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 4. 素材パターン
-- ========================================
CREATE TABLE IF NOT EXISTS hts_material_patterns (
    id SERIAL PRIMARY KEY,
    material_name TEXT NOT NULL,
    related_hts_code TEXT NOT NULL,
    keyword_pattern TEXT, -- 関連するキーワードパターン（フレーズ）
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. products_masterテーブルの拡張
-- ========================================
-- カテゴリーとブランドのカラムを追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS category_name TEXT;

ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS brand_name TEXT;

-- ========================================
-- 初期データ投入
-- ========================================

-- カテゴリーマスター初期データ
INSERT INTO hts_category_master (category_name_ja, category_name_en, recommended_hts_code, recommended_material, related_keywords) 
VALUES
('トレーディングカード', 'Trading Cards', '9504.40.00.00', 'Card Stock, Paper', 'playing cards, collectible cards, printed cards'),
('スマートフォン', 'Smartphones', '8517.12.00.00', 'Plastic, Glass, Metal', 'mobile phone, cellular, tablet, smartphone'),
('Tシャツ', 'T-Shirts', '6109.10.00.12', 'Cotton', 'cotton shirt, apparel, clothing, t-shirt'),
('フィギュア', 'Figures', '9503.00.00.80', 'Plastic, PVC', 'toy, figure, collectible, plastic toy'),
('時計', 'Watches', '9102.11.00.00', 'Metal, Plastic', 'watch, timepiece, wristwatch'),
('バッグ', 'Bags', '4202.92.00.00', 'Leather, Textile', 'bag, handbag, backpack, purse'),
('靴', 'Shoes', '6403.99.00.00', 'Leather, Rubber', 'shoes, footwear, sneakers'),
('本', 'Books', '4901.99.00.92', 'Paper', 'book, printed book, publication'),
('ゲームソフト', 'Video Games', '9504.50.00.00', 'Plastic, Disc', 'video game, game software, console game')
ON CONFLICT (category_name_ja) DO NOTHING;

-- ブランドマスター初期データ
INSERT INTO hts_brand_master (brand_name_ja, brand_name_en, origin_country_candidates, related_hts_code, related_material) 
VALUES
('ポケモン', 'Pokémon', ARRAY['JP', 'US', 'BE'], '9504.40.00.00', 'Card Stock'),
('遊戯王', 'Yu-Gi-Oh!', ARRAY['JP', 'CN', 'KR'], '9504.40.00.00', 'Card Stock'),
('MTG', 'Magic: The Gathering', ARRAY['US', 'BE', 'JP'], '9504.40.00.00', 'Card Stock'),
('Apple', 'Apple', ARRAY['CN', 'VN', 'IN'], '8517.12.00.00', 'Aluminum, Glass'),
('Nike', 'Nike', ARRAY['VN', 'CN', 'ID'], '6403.99.00.00', 'Textile, Rubber'),
('Adidas', 'Adidas', ARRAY['VN', 'CN', 'ID'], '6403.99.00.00', 'Textile, Rubber'),
('Sony', 'Sony', ARRAY['JP', 'CN', 'TH'], '8517.62.00.00', 'Plastic, Metal'),
('Nintendo', 'Nintendo', ARRAY['JP', 'CN'], '9504.50.00.00', 'Plastic, Electronic'),
('バンダイ', 'Bandai', ARRAY['JP', 'CN'], '9503.00.00.80', 'Plastic, PVC'),
('タカラトミー', 'Takara Tomy', ARRAY['JP', 'CN', 'VN'], '9503.00.00.80', 'Plastic, PVC')
ON CONFLICT (brand_name_ja) DO NOTHING;

-- 素材パターン初期データ
INSERT INTO hts_material_patterns (material_name, related_hts_code, keyword_pattern) 
VALUES
('Card Stock', '9504.40.00.00', 'playing cards, trading cards'),
('Paper', '4901.99.00.92', 'printed matter, book, publication'),
('Plastic', '9503.00.00.80', 'toy, figure, plastic toy'),
('Cotton', '6109.10.00.12', 'cotton shirt, apparel, clothing'),
('Leather', '4202.92.00.00', 'bag, leather goods, purse'),
('Metal', '7326.90.00.00', 'metal article, hardware'),
('Glass', '7013.99.00.00', 'glassware, glass article'),
('Rubber', '4016.99.00.00', 'rubber article, rubber goods')
ON CONFLICT DO NOTHING;

-- ========================================
-- コメント
-- ========================================
COMMENT ON TABLE hts_learning_data IS '学習データ蓄積テーブル: ユーザーが確定したHTS情報を記録';
COMMENT ON TABLE hts_category_master IS 'カテゴリーマスター: カテゴリー名からHTSコードを推定';
COMMENT ON TABLE hts_brand_master IS 'ブランドマスター: ブランド名から原産国とHTSコードを推定';
COMMENT ON TABLE hts_material_patterns IS '素材パターン: 素材名とキーワードからHTSコードを推定';

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ HTS学習システム - Phase 1完了: 全テーブル作成完了';
END $$;
