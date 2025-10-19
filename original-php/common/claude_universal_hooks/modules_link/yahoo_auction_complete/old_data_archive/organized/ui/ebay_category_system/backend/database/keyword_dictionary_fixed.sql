--
-- NAGANO-3システム eBayカテゴリ自動判定用キーワード辞書（修正版）
-- ファイル: modules/ebay_category_system/backend/database/keyword_dictionary_fixed.sql
-- 作成日: 2025年9月14日 - PostgreSQLエラー修正版
-- 

-- =============================================================================
-- Cell Phones & Smartphones (293) - スマートフォン・携帯電話
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- ブランド（高重要度）
('293', 'iphone', 'primary', 10, 'en'),
('293', 'アイフォン', 'primary', 10, 'ja'),
('293', 'samsung', 'primary', 9, 'en'),
('293', 'galaxy', 'primary', 9, 'en'),
('293', 'ギャラクシー', 'primary', 9, 'ja'),
('293', 'google', 'primary', 8, 'en'),
('293', 'pixel', 'primary', 8, 'en'),
('293', 'sony', 'primary', 8, 'en'),
('293', 'xperia', 'primary', 8, 'en'),
('293', 'エクスペリア', 'primary', 8, 'ja'),
('293', 'huawei', 'primary', 8, 'en'),
('293', 'xiaomi', 'primary', 7, 'en'),
('293', 'oppo', 'primary', 7, 'en'),
('293', 'oneplus', 'primary', 7, 'en'),

-- 一般用語（中重要度）
('293', 'smartphone', 'primary', 9, 'en'),
('293', 'スマホ', 'primary', 9, 'ja'),
('293', 'スマートフォン', 'primary', 9, 'ja'),
('293', '携帯電話', 'primary', 8, 'ja'),
('293', '携帯', 'secondary', 7, 'ja'),
('293', 'android', 'secondary', 7, 'en'),
('293', 'アンドロイド', 'secondary', 7, 'ja'),
('293', 'mobile phone', 'secondary', 6, 'en'),
('293', 'cell phone', 'secondary', 6, 'en'),

-- キャリア・技術仕様（低重要度）
('293', 'docomo', 'secondary', 4, 'ja'),
('293', 'ドコモ', 'secondary', 4, 'ja'),
('293', 'au', 'secondary', 4, 'ja'),
('293', 'softbank', 'secondary', 4, 'ja'),
('293', 'ソフトバンク', 'secondary', 4, 'ja'),
('293', '5g', 'secondary', 5, 'mixed'),
('293', 'unlocked', 'secondary', 5, 'en'),
('293', 'simフリー', 'secondary', 6, 'ja');

-- =============================================================================
-- Cameras & Photo (625) - カメラ・写真機器
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- ブランド
('625', 'canon', 'primary', 10, 'en'),
('625', 'キヤノン', 'primary', 10, 'ja'),
('625', 'nikon', 'primary', 10, 'en'),
('625', 'ニコン', 'primary', 10, 'ja'),
('625', 'sony', 'primary', 10, 'en'),
('625', 'fujifilm', 'primary', 9, 'en'),
('625', '富士フイルム', 'primary', 9, 'ja'),
('625', 'olympus', 'primary', 9, 'en'),
('625', 'オリンパス', 'primary', 9, 'ja'),
('625', 'panasonic', 'primary', 8, 'en'),
('625', 'パナソニック', 'primary', 8, 'ja'),
('625', 'leica', 'primary', 8, 'en'),
('625', 'ライカ', 'primary', 8, 'ja'),

-- カメラタイプ
('625', 'camera', 'primary', 9, 'en'),
('625', 'カメラ', 'primary', 9, 'ja'),
('625', 'ミラーレス', 'primary', 9, 'ja'),
('625', 'mirrorless', 'primary', 9, 'en'),
('625', '一眼レフ', 'primary', 9, 'ja'),
('625', 'dslr', 'primary', 9, 'en'),
('625', 'digital slr', 'primary', 9, 'en'),
('625', 'デジタルカメラ', 'primary', 8, 'ja'),
('625', 'digital camera', 'primary', 8, 'en'),
('625', 'フィルムカメラ', 'secondary', 7, 'ja'),
('625', 'film camera', 'secondary', 7, 'en'),

-- レンズ・アクセサリー
('625', 'レンズ', 'primary', 8, 'ja'),
('625', 'lens', 'primary', 8, 'en'),
('625', '単焦点', 'secondary', 6, 'ja'),
('625', 'prime lens', 'secondary', 6, 'en'),
('625', 'ズームレンズ', 'secondary', 6, 'ja'),
('625', 'zoom lens', 'secondary', 6, 'en'),
('625', '望遠', 'secondary', 5, 'ja'),
('625', 'telephoto', 'secondary', 5, 'en'),
('625', '広角', 'secondary', 5, 'ja'),
('625', 'wide angle', 'secondary', 5, 'en'),
('625', 'マクロ', 'secondary', 5, 'ja'),
('625', 'macro', 'secondary', 5, 'en');

-- =============================================================================
-- Trading Cards (58058, 183454, 888) - トレーディングカード
-- =============================================================================

-- スポーツカード (58058)
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('58058', 'baseball card', 'primary', 10, 'en'),
('58058', '野球カード', 'primary', 10, 'ja'),
('58058', 'topps', 'primary', 9, 'en'),
('58058', 'panini', 'primary', 8, 'en'),
('58058', 'upper deck', 'primary', 8, 'en'),
('58058', 'rookie card', 'secondary', 7, 'en'),
('58058', 'ルーキーカード', 'secondary', 7, 'ja'),
('58058', 'autograph', 'secondary', 6, 'en'),
('58058', 'サイン', 'secondary', 6, 'ja'),
('58058', 'jersey card', 'secondary', 6, 'en'),
('58058', 'basketball card', 'secondary', 8, 'en'),
('58058', 'football card', 'secondary', 8, 'en'),
('58058', 'soccer card', 'secondary', 7, 'en'),
('58058', 'サッカーカード', 'secondary', 7, 'ja');

-- Non-Sport Trading Cards (183454)
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('183454', 'ポケモンカード', 'primary', 10, 'ja'),
('183454', 'ポケカ', 'primary', 10, 'ja'),
('183454', 'pokemon card', 'primary', 10, 'en'),
('183454', 'pokemon tcg', 'primary', 9, 'en'),
('183454', '遊戯王', 'primary', 10, 'ja'),
('183454', 'yu-gi-oh', 'primary', 10, 'en'),
('183454', 'yugioh', 'primary', 9, 'en'),
('183454', 'デュエルマスターズ', 'primary', 9, 'ja'),
('183454', 'duel masters', 'primary', 8, 'en'),
('183454', 'magic the gathering', 'primary', 9, 'en'),
('183454', 'mtg', 'primary', 9, 'en'),
('183454', 'マジック', 'secondary', 7, 'ja'),
('183454', 'dragon ball', 'secondary', 8, 'en'),
('183454', 'ドラゴンボール', 'secondary', 8, 'ja'),
('183454', 'one piece', 'secondary', 8, 'en'),
('183454', 'ワンピース', 'secondary', 8, 'ja'),
('183454', 'digimon', 'secondary', 7, 'en'),
('183454', 'デジモン', 'secondary', 7, 'ja');

-- Trading Card Games (888)
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('888', 'トレカ', 'primary', 9, 'ja'),
('888', 'トレーディングカード', 'primary', 9, 'ja'),
('888', 'trading card', 'primary', 9, 'en'),
('888', 'tcg', 'primary', 8, 'en'),
('888', 'ccg', 'secondary', 6, 'en'),
('888', 'collectible card', 'secondary', 6, 'en'),
('888', 'booster pack', 'secondary', 6, 'en'),
('888', 'ブースターパック', 'secondary', 6, 'ja'),
('888', 'starter deck', 'secondary', 5, 'en'),
('888', 'スターターデッキ', 'secondary', 5, 'ja');

-- =============================================================================
-- Video Games & Consoles (1249, 139973, 14339) - ビデオゲーム
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES

-- Video Games (139973)
('139973', 'playstation', 'primary', 10, 'en'),
('139973', 'プレイステーション', 'primary', 10, 'ja'),
('139973', 'ps5', 'primary', 10, 'en'),
('139973', 'ps4', 'primary', 9, 'en'),
('139973', 'ps3', 'primary', 8, 'en'),
('139973', 'nintendo switch', 'primary', 10, 'en'),
('139973', 'ニンテンドースイッチ', 'primary', 10, 'ja'),
('139973', 'nintendo', 'primary', 9, 'en'),
('139973', 'xbox', 'primary', 9, 'en'),
('139973', 'xbox series x', 'primary', 9, 'en'),
('139973', 'xbox one', 'primary', 8, 'en'),
('139973', 'ゲームソフト', 'primary', 9, 'ja'),
('139973', 'game software', 'primary', 8, 'en'),
('139973', 'video game', 'primary', 8, 'en'),
('139973', 'テレビゲーム', 'secondary', 7, 'ja');

-- Video Game Consoles (14339)
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('14339', 'console', 'primary', 9, 'en'),
('14339', 'ゲーム機', 'primary', 9, 'ja'),
('14339', 'ゲーム本体', 'primary', 9, 'ja'),
('14339', 'game console', 'primary', 9, 'en'),
('14339', 'gaming console', 'secondary', 7, 'en');

-- =============================================================================
-- Books & Magazines (1295) - 本・雑誌
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('1295', 'book', 'primary', 9, 'en'),
('1295', '本', 'primary', 9, 'ja'),
('1295', '書籍', 'primary', 8, 'ja'),
('1295', 'manga', 'primary', 9, 'en'),
('1295', 'マンガ', 'primary', 9, 'ja'),
('1295', '漫画', 'primary', 9, 'ja'),
('1295', 'novel', 'secondary', 7, 'en'),
('1295', '小説', 'secondary', 7, 'ja'),
('1295', 'magazine', 'secondary', 6, 'en'),
('1295', '雑誌', 'secondary', 6, 'ja');

-- =============================================================================
-- Japanese Traditional Items (99992) - アニメ・マンガグッズ
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('99992', 'anime', 'primary', 10, 'en'),
('99992', 'アニメ', 'primary', 10, 'ja'),
('99992', 'figure', 'primary', 10, 'en'),
('99992', 'フィギュア', 'primary', 10, 'ja'),
('99992', 'figma', 'primary', 9, 'en'),
('99992', 'フィグマ', 'primary', 9, 'ja'),
('99992', 'nendoroid', 'primary', 9, 'en'),
('99992', 'ねんどろいど', 'primary', 9, 'ja');

-- =============================================================================
-- Other/Unclassified (99999) - その他
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('99999', 'other', 'primary', 5, 'en'),
('99999', 'その他', 'primary', 5, 'ja'),
('99999', 'unknown', 'secondary', 3, 'en'),
('99999', '不明', 'secondary', 3, 'ja');

-- =============================================================================
-- 禁止キーワード（negative）- これらが含まれる場合はスコアを下げる
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- スマートフォンカテゴリーの禁止キーワード
('293', 'case', 'negative', 3, 'en'),
('293', 'ケース', 'negative', 3, 'ja'),
('293', 'charger', 'negative', 3, 'en'),
('293', '充電器', 'negative', 3, 'ja'),
('293', 'screen protector', 'negative', 3, 'en'),
('293', '保護フィルム', 'negative', 3, 'ja');

-- キーワード使用回数初期化
UPDATE category_keywords SET usage_count = 0;

-- =============================================================================
-- 統計情報表示（修正版 - FORループエラー修正）
-- =============================================================================
DO $$
DECLARE
    total_keywords integer;
    ja_keywords integer; 
    en_keywords integer;
    mixed_keywords integer;
    primary_keywords integer;
    secondary_keywords integer;
    negative_keywords integer;
BEGIN
    SELECT COUNT(*) INTO total_keywords FROM category_keywords;
    SELECT COUNT(*) INTO ja_keywords FROM category_keywords WHERE language = 'ja';
    SELECT COUNT(*) INTO en_keywords FROM category_keywords WHERE language = 'en';
    SELECT COUNT(*) INTO mixed_keywords FROM category_keywords WHERE language = 'mixed';
    SELECT COUNT(*) INTO primary_keywords FROM category_keywords WHERE keyword_type = 'primary';
    SELECT COUNT(*) INTO secondary_keywords FROM category_keywords WHERE keyword_type = 'secondary';
    SELECT COUNT(*) INTO negative_keywords FROM category_keywords WHERE keyword_type = 'negative';

    RAISE NOTICE 'eBayカテゴリー判定用キーワード辞書 - データ挿入完了';
    RAISE NOTICE '総キーワード数: %', total_keywords;
    RAISE NOTICE '日本語キーワード数: %', ja_keywords;
    RAISE NOTICE '英語キーワード数: %', en_keywords;
    RAISE NOTICE '混合キーワード数: %', mixed_keywords;
    RAISE NOTICE 'プライマリキーワード数: %', primary_keywords;
    RAISE NOTICE 'セカンダリキーワード数: %', secondary_keywords;
    RAISE NOTICE '禁止キーワード数: %', negative_keywords;
    RAISE NOTICE 'キーワード辞書準備完了 - カテゴリー自動判定システムが使用可能です';
END $$;