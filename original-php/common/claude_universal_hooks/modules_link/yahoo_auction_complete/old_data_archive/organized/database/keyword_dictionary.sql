--
-- NAGANO-3システムのeBayカテゴリ自動判定用キーワード辞書
-- ファイル: modules/ebay_category_system/backend/database/keyword_dictionary.sql
--

-- キーワード投入例
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
-- Cell Phones & Smartphones (293)
('293', 'iphone', 'primary', 10, 'en'),
('293', 'スマホ', 'primary', 10, 'ja'),
('293', 'smartphone', 'primary', 10, 'en'),
('293', '携帯', 'primary', 10, 'ja'),
('293', 'android', 'primary', 10, 'en'),
('293', 'galaxy', 'secondary', 5, 'en'),
('293', 'pixel', 'secondary', 5, 'en'),
('293', 'docomo', 'secondary', 3, 'ja'),
('293', 'au', 'secondary', 3, 'ja'),
('293', 'softbank', 'secondary', 3, 'ja'),

-- Cameras & Photo (625)
('625', 'canon', 'primary', 10, 'en'),
('625', 'nikon', 'primary', 10, 'en'),
('625', 'sony', 'primary', 10, 'en'),
('625', 'fujifilm', 'primary', 10, 'en'),
('625', 'ミラーレス', 'primary', 10, 'ja'),
('625', '一眼レフ', 'primary', 10, 'ja'),
('625', 'カメラ', 'primary', 10, 'ja'),
('625', 'レンズ', 'primary', 10, 'ja'),
('625', 'デジタルカメラ', 'primary', 10, 'ja'),
('625', 'film camera', 'primary', 10, 'en'),

-- Trading Cards (58058)
('58058', 'ポケモンカード', 'primary', 10, 'ja'),
('58058', 'ポケカ', 'primary', 10, 'ja'),
('58058', '遊戯王', 'primary', 10, 'ja'),
('58058', 'デュエルマスターズ', 'primary', 10, 'ja'),
('58058', 'トレカ', 'primary', 10, 'ja'),
('58058', 'mtg', 'primary', 10, 'en'),
('58058', 'magic the gathering', 'primary', 10, 'en'),

-- Clothing, Shoes & Accessories (11450)
('11450', 'tシャツ', 'primary', 10, 'ja'),
('11450', 'スニーカー', 'primary', 10, 'ja'),
('11450', 'sneakers', 'primary', 10, 'en'),
('11450', 'bag', 'primary', 10, 'en'),
('11450', 'ハンドバッグ', 'primary', 10, 'ja'),
('11450', 'watch', 'primary', 10, 'en'),
('11450', '腕時計', 'primary', 10, 'ja'),

-- Video Games & Consoles (1249)
('1249', 'playstation', 'primary', 10, 'en'),
('1249', 'xbox', 'primary', 10, 'en'),
('1249', 'nintendo switch', 'primary', 10, 'en'),
('1249', 'ニンテンドースイッチ', 'primary', 10, 'ja'),
('1249', 'ゲームソフト', 'primary', 10, 'ja'),
('1249', 'ps4', 'secondary', 5, 'en'),
('1249', 'ps5', 'secondary', 5, 'en'),
('1249', 'xbox series x', 'secondary', 5, 'en');