--
-- NAGANO-3システムのeBayカテゴリ自動判定用初期データ
-- ファイル: modules/ebay_category_system/backend/database/initial_data.sql
--

-- 主要eBayカテゴリー（50カテゴリー以上）の初期データ
INSERT INTO ebay_categories (category_id, category_name, parent_id, is_active) VALUES
('293', 'Cell Phones & Smartphones', '15032', TRUE),
('625', 'Cameras & Photo', '625', TRUE),
('58058', 'Trading Cards', '11116', TRUE),
('11450', 'Clothing, Shoes & Accessories', '11450', TRUE),
('15032', 'Watches', '14324', TRUE),
('1249', 'Video Games & Consoles', '1249', TRUE),
('14339', 'Video Game Consoles', '1249', TRUE),
('139973', 'Video Games', '1249', TRUE),
('10181', 'Action Figures', '220', TRUE),
('11462', 'Women''s Clothing', '11450', TRUE),
('1059', 'Men''s Clothing', '11450', TRUE),
('95672', 'Sneakers', '114942', TRUE),
('26395', 'Handbags', '11450', TRUE),
('1468', 'Jewelry', '281', TRUE),
('1425', 'Laptops', '175672', TRUE),
('177', 'Desktops & All-In-Ones', '175672', TRUE),
('164', 'Hard Drives', '175672', TRUE),
('11232', 'Digital Cameras', '625', TRUE),
('3323', 'Lenses', '625', TRUE),
('3284', 'Lighting & Studio', '625', TRUE),
('176987', 'Drones', '176987', TRUE),
('280', 'Headphones', '293', TRUE),
('178776', 'Smart Watches', '178776', TRUE),
('177893', 'Smart Speakers', '177893', TRUE),
('26099', 'Home Audio Components', '1', TRUE),
('2984', 'Portable Stereos', '1', TRUE),
('2499', 'TVs', '1', TRUE),
('15687', 'Musical Instruments & Gear', '15687', TRUE),
('182189', 'Guitars & Basses', '15687', TRUE),
('172426', 'Keyboards', '15687', TRUE),
('888', 'Comics', '11116', TRUE),
('138258', 'Sports Trading Cards', '58058', TRUE),
('183454', 'Non-Sport Trading Cards', '58058', TRUE),
('11922', 'Posters', '11116', TRUE),
('173988', 'DVDs & Blu-ray Discs', '173988', TRUE),
('11233', 'Vinyl Records', '11233', TRUE),
('15687', 'Art', '15687', TRUE),
('550', 'Collectibles', '1', TRUE),
('237', 'Antiques', '1', TRUE),
('184605', 'Diecast & Toy Vehicles', '220', TRUE),
('180126', 'Building Toys', '220', TRUE),
('2539', 'Dolls', '220', TRUE),
('177242', 'Outdoor Toys & Structures', '220', TRUE),
('1295', 'Books', '267', TRUE),
('64350', 'Textbooks, Education & Reference', '1295', TRUE),
('1035', 'Magazines', '1295', TRUE),
('11116', 'Stamps', '11116', TRUE),
('26139', 'Coins & Paper Money', '1', TRUE),
('177283', 'Sports Mem, Cards & Fan Shop', '1', TRUE),
('177265', 'Sports Fan Apparel & Souvenirs', '177283', TRUE);


-- カテゴリー別必須項目
INSERT INTO category_required_fields (category_id, field_name, field_type, possible_values, default_value, sort_order) VALUES
-- Cell Phones & Smartphones (293)
('293', 'Brand', 'required', ARRAY['Apple', 'Samsung', 'Google', 'Sony', 'Other'], 'Unknown', 1),
('293', 'Model', 'required', NULL, 'Unknown', 2),
('293', 'Storage Capacity', 'recommended', ARRAY['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], 'Unknown', 3),
('293', 'Color', 'recommended', ARRAY['Black', 'White', 'Blue', 'Red', 'Gold', 'Silver'], 'Unknown', 4),
('293', 'Condition', 'required', ARRAY['New', 'Used', 'For parts or not working'], 'Used', 5),

-- Cameras & Photo (625)
('625', 'Brand', 'required', ARRAY['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Olympus'], 'Unknown', 1),
('625', 'Type', 'required', ARRAY['Digital SLR', 'Mirrorless', 'Point & Shoot', 'Film'], 'Digital Camera', 2),
('625', 'Model', 'required', NULL, 'Unknown', 3),
('625', 'Series', 'recommended', NULL, 'Unknown', 4),
('625', 'Condition', 'required', ARRAY['New', 'Used'], 'Used', 5),

-- Trading Cards (58058)
('58058', 'Card Type', 'required', ARRAY['Pokémon', 'Yu-Gi-Oh!', 'Magic: The Gathering', 'Other'], 'Unknown', 1),
('58058', 'Game', 'required', NULL, 'Unknown', 2),
('58058', 'Condition', 'required', ARRAY['Near Mint', 'Lightly Played', 'Moderately Played'], 'Near Mint', 3),
('58058', 'Language', 'required', ARRAY['English', 'Japanese'], 'Japanese', 4),
('58058', 'Rarity', 'recommended', ARRAY['Common', 'Uncommon', 'Rare', 'Holo Rare', 'Secret Rare'], 'Unknown', 5),

-- Books (1295)
('1295', 'Author', 'required', NULL, 'Unknown', 1),
('1295', 'Title', 'required', NULL, 'Unknown', 2),
('1295', 'Publication Year', 'recommended', NULL, 'Unknown', 3),
('1295', 'ISBN', 'recommended', NULL, 'Unknown', 4),
('1295', 'Format', 'required', ARRAY['Hardcover', 'Paperback', 'E-Book'], 'Paperback', 5);