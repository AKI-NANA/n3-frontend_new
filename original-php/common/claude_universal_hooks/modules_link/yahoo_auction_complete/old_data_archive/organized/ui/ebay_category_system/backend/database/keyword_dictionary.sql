--
-- NAGANO-3システム eBayカテゴリ自動判定用キーワード辞書（拡張版）
-- ファイル: modules/ebay_category_system/backend/database/keyword_dictionary.sql
-- 作成日: 2025年9月14日
-- 
-- 日本語・英語対応の包括的キーワード辞書
-- 総キーワード数: 500+ 
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
('183454', 'デジモン', 'secondary', 7, 'ja'),

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
('139973', 'テレビゲーム', 'secondary', 7, 'ja'),

-- Video Game Consoles (14339)
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('14339', 'console', 'primary', 9, 'en'),
('14339', 'ゲーム機', 'primary', 9, 'ja'),
('14339', 'ゲーム本体', 'primary', 9, 'ja'),
('14339', 'game console', 'primary', 9, 'en'),
('14339', 'gaming console', 'secondary', 7, 'en');

-- =============================================================================
-- Clothing, Shoes & Accessories (11450) - 衣類・アクセサリー
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('11450', 'tシャツ', 'primary', 8, 'ja'),
('11450', 't-shirt', 'primary', 8, 'en'),
('11450', 'tee shirt', 'primary', 8, 'en'),
('11450', 'スニーカー', 'primary', 9, 'ja'),
('11450', 'sneakers', 'primary', 9, 'en'),
('11450', 'shoes', 'primary', 8, 'en'),
('11450', '靴', 'primary', 8, 'ja'),
('11450', 'bag', 'primary', 8, 'en'),
('11450', 'バッグ', 'primary', 8, 'ja'),
('11450', 'ハンドバッグ', 'primary', 8, 'ja'),
('11450', 'handbag', 'primary', 8, 'en'),
('11450', 'backpack', 'secondary', 6, 'en'),
('11450', 'リュック', 'secondary', 6, 'ja'),
('11450', 'jacket', 'secondary', 6, 'en'),
('11450', 'ジャケット', 'secondary', 6, 'ja'),
('11450', 'dress', 'secondary', 6, 'en'),
('11450', 'ドレス', 'secondary', 6, 'ja'),
('11450', 'jeans', 'secondary', 6, 'en'),
('11450', 'ジーンズ', 'secondary', 6, 'ja'),
('11450', 'デニム', 'secondary', 6, 'ja');

-- =============================================================================
-- Watches (15032) - 腕時計
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('15032', 'watch', 'primary', 9, 'en'),
('15032', '腕時計', 'primary', 9, 'ja'),
('15032', '時計', 'primary', 8, 'ja'),
('15032', 'rolex', 'primary', 10, 'en'),
('15032', 'ロレックス', 'primary', 10, 'ja'),
('15032', 'omega', 'primary', 9, 'en'),
('15032', 'オメガ', 'primary', 9, 'ja'),
('15032', 'seiko', 'primary', 9, 'en'),
('15032', 'セイコー', 'primary', 9, 'ja'),
('15032', 'citizen', 'primary', 8, 'en'),
('15032', 'シチズン', 'primary', 8, 'ja'),
('15032', 'casio', 'primary', 8, 'en'),
('15032', 'カシオ', 'primary', 8, 'ja'),
('15032', 'g-shock', 'secondary', 7, 'en'),
('15032', 'Gショック', 'secondary', 7, 'ja'),
('15032', 'apple watch', 'secondary', 7, 'en'),
('15032', 'アップルウォッチ', 'secondary', 7, 'ja'),
('15032', 'smart watch', 'secondary', 6, 'en'),
('15032', 'スマートウォッチ', 'secondary', 6, 'ja');

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
('1295', '雑誌', 'secondary', 6, 'ja'),
('1295', 'textbook', 'secondary', 6, 'en'),
('1295', '教科書', 'secondary', 6, 'ja'),
('1295', 'cookbook', 'secondary', 5, 'en'),
('1295', '料理本', 'secondary', 5, 'ja'),
('1295', 'art book', 'secondary', 5, 'en'),
('1295', '画集', 'secondary', 5, 'ja');

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
('99992', 'ねんどろいど', 'primary', 9, 'ja'),
('99992', 'scale figure', 'primary', 8, 'en'),
('99992', 'スケールフィギュア', 'primary', 8, 'ja'),
('99992', 'prize figure', 'secondary', 7, 'en'),
('99992', 'プライズフィギュア', 'secondary', 7, 'ja'),
('99992', 'good smile', 'secondary', 7, 'en'),
('99992', 'グッドスマイル', 'secondary', 7, 'ja'),
('99992', 'alter', 'secondary', 6, 'en'),
('99992', 'アルター', 'secondary', 6, 'ja'),
('99992', 'kotobukiya', 'secondary', 6, 'en'),
('99992', 'コトブキヤ', 'secondary', 6, 'ja'),
('99992', 'bandai', 'secondary', 6, 'en'),
('99992', 'バンダイ', 'secondary', 6, 'ja'),
('99992', 'cosplay', 'secondary', 6, 'en'),
('99992', 'コスプレ', 'secondary', 6, 'ja'),
('99992', 'doujinshi', 'secondary', 6, 'en'),
('99992', '同人誌', 'secondary', 6, 'ja'),
('99992', 'poster', 'secondary', 5, 'en'),
('99992', 'ポスター', 'secondary', 5, 'ja'),
('99992', 'tapestry', 'secondary', 5, 'en'),
('99992', 'タペストリー', 'secondary', 5, 'ja');

-- =============================================================================
-- Action Figures (10181) - アクションフィギュア
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('10181', 'action figure', 'primary', 10, 'en'),
('10181', 'アクションフィギュア', 'primary', 10, 'ja'),
('10181', 'transformer', 'primary', 9, 'en'),
('10181', 'トランスフォーマー', 'primary', 9, 'ja'),
('10181', 'gundam', 'primary', 9, 'en'),
('10181', 'ガンダム', 'primary', 9, 'ja'),
('10181', 'robot', 'secondary', 7, 'en'),
('10181', 'ロボット', 'secondary', 7, 'ja'),
('10181', 'superhero', 'secondary', 7, 'en'),
('10181', 'スーパーヒーロー', 'secondary', 7, 'ja'),
('10181', 'marvel', 'secondary', 8, 'en'),
('10181', 'マーベル', 'secondary', 8, 'ja'),
('10181', 'dc comics', 'secondary', 7, 'en'),
('10181', 'star wars', 'secondary', 8, 'en'),
('10181', 'スターウォーズ', 'secondary', 8, 'ja');

-- =============================================================================
-- Laptops & Netbooks (1425) - ノートパソコン
-- =============================================================================
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('1425', 'laptop', 'primary', 10, 'en'),
('1425', 'ノートパソコン', 'primary', 10, 'ja'),
('1425', 'ノートpc', 'primary', 10, 'ja'),
('1425', 'macbook', 'primary', 9, 'en'),
('1425', 'マックブック', 'primary', 9, 'ja'),
('1425', 'thinkpad', 'primary', 8, 'en'),
('1425', 'シンクパッド', 'primary', 8, 'ja'),
('1425', 'surface', 'primary', 8, 'en'),
('1425', 'サーフェス', 'primary', 8, 'ja'),
('1425', 'chromebook', 'secondary', 7, 'en'),
('1425', 'クロームブック', 'secondary', 7, 'ja'),
('1425', 'ultrabook', 'secondary', 6, 'en'),
('1425', 'ウルトラブック', 'secondary', 6, 'ja'),
('1425', 'gaming laptop', 'secondary', 7, 'en'),
('1425', 'ゲーミングノート', 'secondary', 7, 'ja');

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
('293', '保護フィルム', 'negative', 3, 'ja'),
('293', 'battery', 'negative', 2, 'en'),
('293', 'バッテリー', 'negative', 2, 'ja'),

-- カメラカテゴリーの禁止キーワード
('625', 'tripod', 'negative', 2, 'en'),
('625', '三脚', 'negative', 2, 'ja'),
('625', 'memory card', 'negative', 2, 'en'),
('625', 'メモリーカード', 'negative', 2, 'ja'),
('625', 'bag', 'negative', 2, 'en'),
('625', 'カメラバッグ', 'negative', 2, 'ja'),

-- ビデオゲームカテゴリーの禁止キーワード
('139973', 'controller', 'negative', 2, 'en'),
('139973', 'コントローラー', 'negative', 2, 'ja'),
('139973', 'headset', 'negative', 2, 'en'),
('139973', 'ヘッドセット', 'negative', 2, 'ja'),
('139973', 'cable', 'negative', 2, 'en'),
('139973', 'ケーブル', 'negative', 2, 'ja');

-- =============================================================================
-- 統計情報更新・完了メッセージ
-- =============================================================================

-- キーワード使用回数初期化
UPDATE category_keywords SET usage_count = 0;

-- 統計情報表示
DO $$
BEGIN
    RAISE NOTICE 'eBayカテゴリー判定用キーワード辞書 - データ挿入完了';
    RAISE NOTICE '総キーワード数: %', (SELECT COUNT(*) FROM category_keywords);
    RAISE NOTICE '日本語キーワード数: %', (SELECT COUNT(*) FROM category_keywords WHERE language = 'ja');
    RAISE NOTICE '英語キーワード数: %', (SELECT COUNT(*) FROM category_keywords WHERE language = 'en');
    RAISE NOTICE '混合キーワード数: %', (SELECT COUNT(*) FROM category_keywords WHERE language = 'mixed');
    RAISE NOTICE 'プライマリキーワード数: %', (SELECT COUNT(*) FROM category_keywords WHERE keyword_type = 'primary');
    RAISE NOTICE 'セカンダリキーワード数: %', (SELECT COUNT(*) FROM category_keywords WHERE keyword_type = 'secondary');
    RAISE NOTICE '禁止キーワード数: %', (SELECT COUNT(*) FROM category_keywords WHERE keyword_type = 'negative');
    RAISE NOTICE 'カテゴリー別キーワード分布:';
    
    -- カテゴリー別統計を表示
    FOR rec IN (
        SELECT 
            ck.category_id,
            ec.category_name,
            COUNT(*) as keyword_count,
            AVG(ck.weight) as avg_weight
        FROM category_keywords ck
        JOIN ebay_categories ec ON ck.category_id = ec.category_id
        GROUP BY ck.category_id, ec.category_name
        ORDER BY keyword_count DESC
        LIMIT 10
    ) LOOP
        RAISE NOTICE '  - % (%): %キーワード (平均重み: %)', rec.category_name, rec.category_id, rec.keyword_count, ROUND(rec.avg_weight, 1);
    END LOOP;
    
    RAISE NOTICE 'キーワード辞書準備完了 - カテゴリー自動判定システムが使用可能です';
END $$;