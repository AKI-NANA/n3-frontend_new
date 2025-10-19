--
-- NAGANO-3システム eBayカテゴリ自動判定システム初期データ（拡張版）
-- ファイル: modules/ebay_category_system/backend/database/initial_data.sql
-- 作成日: 2025年9月14日
--

-- =============================================================================
-- 主要eBayカテゴリー（100+カテゴリー）の初期データ
-- 実際のeBay カテゴリーIDを使用
-- =============================================================================

INSERT INTO ebay_categories (category_id, category_name, parent_id, category_level, is_leaf, is_active) VALUES

-- トップレベルカテゴリー
('0', 'All Categories', NULL, 0, FALSE, TRUE),

-- エレクトロニクス関連
('293', 'Cell Phones & Smartphones', '15032', 2, TRUE, TRUE),
('15032', 'Cell Phones & Accessories', '0', 1, FALSE, TRUE),
('625', 'Cameras & Photo', '0', 1, FALSE, TRUE),
('11232', 'Digital Cameras', '625', 2, TRUE, TRUE),
('3323', 'Lenses & Filters', '625', 2, TRUE, TRUE),
('3284', 'Lighting & Studio', '625', 2, TRUE, TRUE),
('1425', 'Laptops & Netbooks', '175672', 2, TRUE, TRUE),
('175672', 'Computers/Tablets & Networking', '0', 1, FALSE, TRUE),
('177', 'Desktop & All-In-One Computers', '175672', 2, TRUE, TRUE),
('164', 'Computer Components & Parts', '175672', 2, TRUE, TRUE),

-- オーディオ・ビデオ
('293', 'Consumer Electronics', '0', 1, FALSE, TRUE),
('280', 'Portable Audio & Headphones', '293', 2, TRUE, TRUE),
('178776', 'Smart Watches', '293', 2, TRUE, TRUE),
('2499', 'TV, Video & Home Audio Electronics', '293', 2, TRUE, TRUE),

-- ビデオゲーム
('1249', 'Video Games & Consoles', '0', 1, FALSE, TRUE),
('139973', 'Video Games', '1249', 2, TRUE, TRUE),
('14339', 'Video Game Consoles', '1249', 2, TRUE, TRUE),
('139971', 'Video Game Accessories', '1249', 2, TRUE, TRUE),

-- 時計・ジュエリー
('14324', 'Jewelry & Watches', '0', 1, FALSE, TRUE),
('15032', 'Watches, Parts & Accessories', '14324', 2, TRUE, TRUE),
('1468', 'Fashion Jewelry', '14324', 2, TRUE, TRUE),

-- 衣類・アクセサリー
('11450', 'Clothing, Shoes & Accessories', '0', 1, FALSE, TRUE),
('11462', 'Women''s Clothing', '11450', 2, TRUE, TRUE),
('1059', 'Men''s Clothing', '11450', 2, TRUE, TRUE),
('95672', 'Athletic Shoes', '11450', 2, TRUE, TRUE),
('26395', 'Women''s Bags & Handbags', '11450', 2, TRUE, TRUE),

-- トレーディングカード・コレクタブル
('11116', 'Coins & Paper Money', '0', 1, FALSE, TRUE),
('58058', 'Sports Trading Cards', '64482', 2, TRUE, TRUE),
('183454', 'Non-Sport Trading Cards', '64482', 2, TRUE, TRUE),
('64482', 'Trading Cards', '0', 1, FALSE, TRUE),
('888', 'Trading Card Games', '64482', 2, TRUE, TRUE),

-- おもちゃ・ホビー
('220', 'Toys & Hobbies', '0', 1, FALSE, TRUE),
('10181', 'Action Figures', '220', 2, TRUE, TRUE),
('2550', 'Dolls & Bears', '220', 2, TRUE, TRUE),
('180126', 'Building Toys', '220', 2, TRUE, TRUE),
('1188', 'Model Railroads & Trains', '220', 2, TRUE, TRUE),
('1281', 'Models & Kits', '220', 2, TRUE, TRUE),

-- 本・映画・音楽
('267', 'Books, Movies & Music', '0', 1, FALSE, TRUE),
('1295', 'Books & Magazines', '267', 2, TRUE, TRUE),
('11233', 'Music', '267', 2, TRUE, TRUE),
('11232', 'Movies & TV', '267', 2, TRUE, TRUE),

-- スポーツ用品
('888', 'Sporting Goods', '0', 1, FALSE, TRUE),
('26409', 'Golf', '888', 2, TRUE, TRUE),
('159043', 'Baseball & Softball', '888', 2, TRUE, TRUE),
('1075', 'Soccer', '888', 2, TRUE, TRUE),

-- 自動車・バイク
('6028', 'eBay Motors', '0', 1, FALSE, TRUE),
('6001', 'Auto Parts & Accessories', '6028', 2, TRUE, TRUE),
('6024', 'Motorcycle Parts', '6028', 2, TRUE, TRUE),

-- アート・工芸品
('550', 'Art', '0', 1, FALSE, TRUE),
('14914', 'Paintings', '550', 2, TRUE, TRUE),
('1186', 'Pottery & Glass', '550', 2, TRUE, TRUE),

-- ホーム・ガーデン
('11700', 'Home & Garden', '0', 1, FALSE, TRUE),
('175756', 'Home Décor', '11700', 2, TRUE, TRUE),
('159912', 'Major Appliances', '11700', 2, TRUE, TRUE),
('181013', 'Garden & Patio', '11700', 2, TRUE, TRUE),

-- ヘルス・ビューティー
('26395', 'Health & Beauty', '0', 1, FALSE, TRUE),
('1305', 'Makeup', '26395', 2, TRUE, TRUE),
('11700', 'Fragrances', '26395', 2, TRUE, TRUE),

-- 工業・科学
('12576', 'Business & Industrial', '0', 1, FALSE, TRUE),
('92074', 'Test, Measurement & Inspection', '12576', 2, TRUE, TRUE),

-- 日本特有のカテゴリー
('99991', 'Japanese Traditional Items', '0', 1, FALSE, TRUE),
('99992', 'Anime & Manga', '99991', 2, TRUE, TRUE),
('99993', 'Japanese Ceramics & Porcelain', '99991', 2, TRUE, TRUE),
('99994', 'Japanese Swords & Martial Arts', '99991', 2, TRUE, TRUE),
('99995', 'Japanese Electronics (Vintage)', '99991', 2, TRUE, TRUE),

-- その他・未分類
('99999', 'Other/Unclassified', '0', 1, TRUE, TRUE);

-- =============================================================================
-- カテゴリー別必須項目データ
-- 主要カテゴリーの必須・推奨項目定義
-- =============================================================================

-- Cell Phones & Smartphones (293)
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('293', 'Brand', 'required', 'enum', ARRAY['Apple', 'Samsung', 'Google', 'Sony', 'Huawei', 'OnePlus', 'Xiaomi', 'Oppo', 'Vivo', 'Other'], 'Unknown', 1),
('293', 'Model', 'required', 'text', NULL, 'Unknown', 2),
('293', 'Storage Capacity', 'recommended', 'enum', ARRAY['16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB', '2 TB'], 'Unknown', 3),
('293', 'Color', 'recommended', 'enum', ARRAY['Black', 'White', 'Blue', 'Red', 'Gold', 'Silver', 'Gray', 'Pink', 'Purple', 'Green'], 'Unknown', 4),
('293', 'Condition', 'required', 'enum', ARRAY['New', 'Open box', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),
('293', 'Network', 'recommended', 'enum', ARRAY['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Other'], 'Unlocked', 6),
('293', 'Operating System', 'recommended', 'enum', ARRAY['iOS', 'Android', 'Windows Phone', 'Other'], 'Unknown', 7);

-- Cameras & Photo (625)
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('625', 'Brand', 'required', 'enum', ARRAY['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Olympus', 'Panasonic', 'Leica', 'Pentax', 'Sigma', 'Tamron'], 'Unknown', 1),
('625', 'Type', 'required', 'enum', ARRAY['Digital SLR', 'Mirrorless', 'Point & Shoot', 'Film SLR', 'Instant', 'Action Camera'], 'Digital Camera', 2),
('625', 'Model', 'required', 'text', NULL, 'Unknown', 3),
('625', 'Megapixels', 'recommended', 'enum', ARRAY['Under 12 MP', '12.0-15.9 MP', '16.0-19.9 MP', '20.0-29.9 MP', '30.0 MP & Up'], 'Unknown', 4),
('625', 'Condition', 'required', 'enum', ARRAY['New', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),
('625', 'Mount Type', 'recommended', 'enum', ARRAY['Canon EF', 'Canon EF-M', 'Nikon F', 'Sony E', 'Micro Four Thirds', 'Other'], 'Unknown', 6);

-- Trading Cards (58058, 183454, 888)
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('58058', 'Sport', 'required', 'enum', ARRAY['Baseball', 'Basketball', 'Football', 'Soccer', 'Hockey', 'Golf', 'Tennis', 'Other'], 'Baseball', 1),
('58058', 'Year', 'recommended', 'number', NULL, 'Unknown', 2),
('58058', 'Manufacturer', 'recommended', 'enum', ARRAY['Topps', 'Panini', 'Upper Deck', 'Fleer', 'Donruss', 'Other'], 'Unknown', 3),
('58058', 'Player/Subject', 'recommended', 'text', NULL, 'Unknown', 4),
('58058', 'Condition', 'required', 'enum', ARRAY['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'], 'Near Mint', 5),

('183454', 'Card Type', 'required', 'enum', ARRAY['Pokémon', 'Yu-Gi-Oh!', 'Magic: The Gathering', 'Dragon Ball', 'Digimon', 'Other'], 'Pokémon', 1),
('183454', 'Set', 'recommended', 'text', NULL, 'Unknown', 2),
('183454', 'Rarity', 'recommended', 'enum', ARRAY['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Ultra Rare', 'Secret Rare'], 'Common', 3),
('183454', 'Language', 'required', 'enum', ARRAY['English', 'Japanese', 'Chinese', 'Korean', 'Other'], 'Japanese', 4),
('183454', 'Condition', 'required', 'enum', ARRAY['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'], 'Near Mint', 5);

-- Books (1295)
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('1295', 'Author', 'required', 'text', NULL, 'Unknown', 1),
('1295', 'Title', 'required', 'text', NULL, 'Unknown', 2),
('1295', 'Publication Year', 'recommended', 'number', NULL, 'Unknown', 3),
('1295', 'ISBN', 'recommended', 'text', NULL, 'Unknown', 4),
('1295', 'Format', 'required', 'enum', ARRAY['Hardcover', 'Paperback', 'Mass Market Paperback', 'E-Book', 'Audiobook'], 'Paperback', 5),
('1295', 'Language', 'recommended', 'enum', ARRAY['English', 'Japanese', 'Spanish', 'French', 'German', 'Other'], 'English', 6),
('1295', 'Condition', 'required', 'enum', ARRAY['Brand New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'], 'Very Good', 7);

-- Video Games (139973)
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('139973', 'Platform', 'required', 'enum', ARRAY['Sony PlayStation 5', 'Sony PlayStation 4', 'Nintendo Switch', 'Xbox Series X|S', 'Xbox One', 'PC', 'Nintendo 3DS', 'Other'], 'Unknown', 1),
('139973', 'Genre', 'recommended', 'enum', ARRAY['Action', 'Adventure', 'RPG', 'Strategy', 'Sports', 'Racing', 'Fighting', 'Puzzle', 'Simulation'], 'Unknown', 2),
('139973', 'Rating', 'recommended', 'enum', ARRAY['E - Everyone', 'E10+ - Everyone 10+', 'T - Teen', 'M - Mature', 'A - Adults Only'], 'Unknown', 3),
('139973', 'Condition', 'required', 'enum', ARRAY['Brand New', 'Like New', 'Very Good', 'Good', 'Fair', 'Poor'], 'Very Good', 4),
('139973', 'Region Code', 'recommended', 'enum', ARRAY['NTSC-U/C (US/Canada)', 'NTSC-J (Japan)', 'PAL (Europe)', 'Region Free'], 'NTSC-J (Japan)', 5);

-- Watches (15032)
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('15032', 'Brand', 'required', 'enum', ARRAY['Rolex', 'Omega', 'Seiko', 'Citizen', 'Casio', 'Apple', 'Samsung', 'Garmin', 'Other'], 'Unknown', 1),
('15032', 'Model', 'recommended', 'text', NULL, 'Unknown', 2),
('15032', 'Type', 'required', 'enum', ARRAY['Wristwatch', 'Pocket Watch', 'Smart Watch', 'Sport Watch'], 'Wristwatch', 3),
('15032', 'Movement', 'recommended', 'enum', ARRAY['Automatic', 'Manual', 'Quartz', 'Digital', 'Solar'], 'Quartz', 4),
('15032', 'Case Material', 'recommended', 'enum', ARRAY['Stainless Steel', 'Gold', 'Silver', 'Titanium', 'Plastic', 'Ceramic', 'Other'], 'Stainless Steel', 5),
('15032', 'Condition', 'required', 'enum', ARRAY['New with tags', 'New without tags', 'Pre-owned', 'Refurbished', 'For parts or not working'], 'Pre-owned', 6);

-- Japanese Traditional Items (99992) - アニメ・マンガ
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('99992', 'Item Type', 'required', 'enum', ARRAY['Figure/Model', 'Manga/Doujinshi', 'Anime DVD/Blu-ray', 'Poster/Artwork', 'Cosplay', 'Other'], 'Figure/Model', 1),
('99992', 'Series/Character', 'required', 'text', NULL, 'Unknown', 2),
('99992', 'Manufacturer', 'recommended', 'enum', ARRAY['Good Smile Company', 'Bandai', 'Kotobukiya', 'Alter', 'Max Factory', 'Other'], 'Unknown', 3),
('99992', 'Scale', 'recommended', 'enum', ARRAY['1/8', '1/7', '1/6', '1/4', 'Non-scale', 'Other'], 'Non-scale', 4),
('99992', 'Condition', 'required', 'enum', ARRAY['New', 'Like New', 'Very Good', 'Good', 'Fair', 'For parts or repair'], 'Very Good', 5),
('99992', 'Language', 'recommended', 'enum', ARRAY['Japanese', 'English', 'Chinese', 'Korean', 'Other'], 'Japanese', 6);

-- Other/Unclassified (99999) - デフォルトカテゴリー
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('99999', 'Brand', 'recommended', 'text', NULL, 'Unknown', 1),
('99999', 'Model', 'recommended', 'text', NULL, 'Unknown', 2),
('99999', 'Condition', 'required', 'enum', ARRAY['New', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 3),
('99999', 'Color', 'recommended', 'text', NULL, 'Unknown', 4),
('99999', 'Material', 'recommended', 'text', NULL, 'Unknown', 5);

-- =============================================================================
-- 初期データ挿入完了メッセージ
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'eBayカテゴリー自動判定システム - 初期データ挿入完了';
    RAISE NOTICE '挿入されたカテゴリー数: %', (SELECT COUNT(*) FROM ebay_categories);
    RAISE NOTICE '挿入された必須項目数: %', (SELECT COUNT(*) FROM category_required_fields);
    RAISE NOTICE '準備完了: キーワード辞書データを keyword_dictionary.sql で挿入してください';
END $$;