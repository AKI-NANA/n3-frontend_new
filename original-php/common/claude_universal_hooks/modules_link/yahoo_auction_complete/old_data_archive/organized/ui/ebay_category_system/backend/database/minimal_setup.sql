--
-- NAGANO-3システム eBayカテゴリ自動判定システム 超シンプル版
-- 全機能を1ファイルに統合・確実に動作する最小構成
--

-- 既存オブジェクト完全削除
DROP FUNCTION IF EXISTS calculate_category_score(text, text, varchar) CASCADE;
DROP VIEW IF EXISTS category_statistics CASCADE;
DROP VIEW IF EXISTS processing_summary CASCADE;
DROP TABLE IF EXISTS category_keywords CASCADE;
DROP TABLE IF EXISTS processed_products CASCADE;
DROP TABLE IF EXISTS category_required_fields CASCADE;
DROP TABLE IF EXISTS processing_logs CASCADE;
DROP TABLE IF EXISTS ebay_categories CASCADE;

-- =============================================================================
-- テーブル作成（最小構成）
-- =============================================================================

-- 1. eBayカテゴリーマスター
CREATE TABLE ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. キーワード辞書
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    keyword VARCHAR(200) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary',
    weight INTEGER DEFAULT 5,
    language VARCHAR(5) DEFAULT 'ja'
);

-- 外部キー制約は後で追加（エラー回避）

-- =============================================================================
-- 最小限のカテゴリーデータ投入
-- =============================================================================
INSERT INTO ebay_categories (category_id, category_name, is_active) VALUES
('293', 'Cell Phones & Smartphones', TRUE),
('625', 'Cameras & Photo', TRUE),
('139973', 'Video Games', TRUE),
('58058', 'Sports Trading Cards', TRUE),
('183454', 'Non-Sport Trading Cards', TRUE),
('99992', 'Anime & Manga', TRUE),
('99999', 'Other/Unclassified', TRUE);

-- =============================================================================
-- 最重要キーワード投入（iPhone認識用）
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- スマートフォン（最重要）
('293', 'iphone', 'primary', 10, 'en'),
('293', 'アイフォン', 'primary', 10, 'ja'),
('293', 'smartphone', 'primary', 9, 'en'),
('293', 'スマホ', 'primary', 9, 'ja'),
('293', 'スマートフォン', 'primary', 9, 'ja'),
('293', '携帯電話', 'primary', 8, 'ja'),
('293', 'samsung', 'primary', 9, 'en'),
('293', 'galaxy', 'primary', 9, 'en'),
('293', 'google', 'primary', 8, 'en'),
('293', 'pixel', 'primary', 8, 'en'),

-- カメラ
('625', 'camera', 'primary', 9, 'en'),
('625', 'カメラ', 'primary', 9, 'ja'),
('625', 'canon', 'primary', 10, 'en'),
('625', 'nikon', 'primary', 10, 'en'),
('625', 'sony', 'primary', 10, 'en'),

-- ゲーム
('139973', 'playstation', 'primary', 10, 'en'),
('139973', 'ps5', 'primary', 10, 'en'),
('139973', 'ps4', 'primary', 9, 'en'),
('139973', 'nintendo', 'primary', 9, 'en'),
('139973', 'xbox', 'primary', 9, 'en'),

-- トレーディングカード
('183454', 'pokemon', 'primary', 10, 'en'),
('183454', 'ポケモン', 'primary', 10, 'ja'),
('183454', 'yugioh', 'primary', 10, 'en'),
('183454', '遊戯王', 'primary', 10, 'ja'),

-- アニメ
('99992', 'anime', 'primary', 10, 'en'),
('99992', 'アニメ', 'primary', 10, 'ja'),
('99992', 'figure', 'primary', 10, 'en'),
('99992', 'フィギュア', 'primary', 10, 'ja'),

-- その他
('99999', 'other', 'primary', 3, 'en'),
('99999', 'その他', 'primary', 3, 'ja');

-- 外部キー制約追加（データ投入後）
ALTER TABLE category_keywords 
ADD CONSTRAINT fk_category_keywords_category 
FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id);

-- =============================================================================
-- シンプルなスコア計算関数
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_category_score(
    p_title TEXT,
    p_description TEXT,
    p_category_id VARCHAR
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_keyword RECORD;
    v_text TEXT;
BEGIN
    v_text := LOWER(p_title || ' ' || COALESCE(p_description, ''));
    
    FOR v_keyword IN 
        SELECT keyword, weight, keyword_type
        FROM category_keywords 
        WHERE category_id = p_category_id
    LOOP
        IF POSITION(LOWER(v_keyword.keyword) IN v_text) > 0 THEN
            CASE v_keyword.keyword_type
                WHEN 'primary' THEN v_score := v_score + (v_keyword.weight * 2);
                ELSE v_score := v_score + v_keyword.weight;
            END CASE;
        END IF;
    END LOOP;
    
    RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 動作確認
-- =============================================================================
DO $$
DECLARE
    categories_count integer;
    keywords_count integer;
    test_score integer;
BEGIN
    SELECT COUNT(*) INTO categories_count FROM ebay_categories;
    SELECT COUNT(*) INTO keywords_count FROM category_keywords;
    SELECT calculate_category_score('iPhone 15 Pro Max 256GB', '', '293') INTO test_score;

    RAISE NOTICE '=== システム構築完了 ===';
    RAISE NOTICE 'カテゴリー数: %', categories_count;
    RAISE NOTICE 'キーワード数: %', keywords_count;
    RAISE NOTICE 'iPhone判定テスト（category 293）: % points', test_score;
    
    IF test_score > 15 THEN
        RAISE NOTICE '✅ iPhone判定: 成功 (スコア: %)', test_score;
    ELSE
        RAISE NOTICE '❌ iPhone判定: 失敗 (スコア: %)', test_score;
    END IF;
    
    RAISE NOTICE 'API準備完了！';
END $$;