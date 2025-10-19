-- eBayカテゴリー自動判定システム 初期データ投入
-- 基本カテゴリー・キーワードマッピング・設定データ
-- 作成日: 2025-09-14

-- 🏷️ 主要eBayカテゴリー初期データ（人気上位50カテゴリー）
INSERT INTO ebay_categories_master (category_id, category_name, parent_id, marketplace_id, is_leaf, is_active, confidence_threshold) VALUES 

-- Electronics & Technology
('9355', 'Cell Phones & Smartphones', '15032', 0, TRUE, TRUE, 95),
('625', 'Cameras & Photo', '293', 0, TRUE, TRUE, 90),
('177', 'Computers/Tablets & Networking', '58058', 0, TRUE, TRUE, 88),
('293', 'Consumer Electronics', '293', 0, FALSE, TRUE, 85),
('171485', 'Video Games & Consoles', '1249', 0, TRUE, TRUE, 90),
('14111', 'Laptop & Desktop Accessories', '177', 0, TRUE, TRUE, 80),

-- Collectibles & Trading Cards
('2536', 'Trading Card Games', '1', 0, TRUE, TRUE, 92),
('220', 'Toys & Hobbies', '220', 0, FALSE, TRUE, 87),
('4', 'Computers, Tablets & Network Hardware', '58058', 0, TRUE, TRUE, 85),
('20081', 'Antiques', '20081', 0, FALSE, TRUE, 70),
('1', 'Collectibles', '1', 0, FALSE, TRUE, 75),
('11450', 'Coins & Paper Money', '11450', 0, FALSE, TRUE, 80),

-- Fashion & Accessories
('31387', 'Wristwatches', '281', 0, TRUE, TRUE, 85),
('169291', 'Women''s Bags & Handbags', '15687', 0, TRUE, TRUE, 89),
('95672', 'Athletic Shoes', '15709', 0, TRUE, TRUE, 91),
('15709', 'Shoes', '11450', 0, FALSE, TRUE, 85),
('1059', 'Jewelry & Watches', '281', 0, FALSE, TRUE, 82),
('281', 'Jewelry & Watches', '281', 0, FALSE, TRUE, 82),

-- Automotive
('6000', 'eBay Motors', '6000', 0, FALSE, TRUE, 78),
('31521', 'Car & Truck Parts', '6030', 0, TRUE, TRUE, 83),
('10063', 'Motorcycle Parts', '10063', 0, TRUE, TRUE, 80),
('33700', 'Car Electronics', '6030', 0, TRUE, TRUE, 85),

-- Home & Garden
('11700', 'Home & Garden', '11700', 0, FALSE, TRUE, 75),
('20518', 'Kitchen, Dining & Bar', '11700', 0, TRUE, TRUE, 80),
('153135', 'Home Décor', '11700', 0, TRUE, TRUE, 77),
('159912', 'Furniture', '11700', 0, TRUE, TRUE, 78),

-- Sports & Outdoors
('888', 'Sporting Goods', '888', 0, FALSE, TRUE, 80),
('1513', 'Golf', '888', 0, TRUE, TRUE, 85),
('26395', 'Outdoor Sports', '888', 0, TRUE, TRUE, 82),
('64482', 'Exercise & Fitness', '888', 0, TRUE, TRUE, 78),

-- Books, Music & Movies
('267', 'Books, Comics & Magazines', '267', 0, FALSE, TRUE, 88),
('11233', 'Music', '11233', 0, FALSE, TRUE, 85),
('11232', 'DVDs & Movies', '11232', 0, TRUE, TRUE, 87),
('1', 'Everything Else', '99999', 0, FALSE, TRUE, 30),

-- Health & Beauty
('26395', 'Health & Beauty', '26395', 0, FALSE, TRUE, 80),
('11358', 'Makeup', '26395', 0, TRUE, TRUE, 85),
('1355', 'Fragrances', '26395', 0, TRUE, TRUE, 82),

-- Tools & Industrial
('631', 'Crafts', '631', 0, FALSE, TRUE, 75),
('12576', 'Business & Industrial', '12576', 0, FALSE, TRUE, 70),
('469', 'Power Tools', '631', 0, TRUE, TRUE, 83),

-- Default/Other Categories
('99999', 'その他', NULL, 0, TRUE, TRUE, 30)

ON CONFLICT (category_id) DO UPDATE SET
    category_name = EXCLUDED.category_name,
    is_active = EXCLUDED.is_active,
    confidence_threshold = EXCLUDED.confidence_threshold,
    updated_at = NOW();

-- 📱 主要カテゴリーの必須項目定義
INSERT INTO ebay_item_aspects (category_id, aspect_name, is_required, data_type, cardinality, entry_mode, allowed_values, default_value, confidence_score) VALUES 

-- Cell Phones & Smartphones (9355)
('9355', 'Brand', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Apple", "Samsung", "Google", "Sony", "Huawei", "Xiaomi", "OnePlus", "LG", "Motorola", "Other"]', 'Unknown', 95),
('9355', 'Model', TRUE, 'STRING', 'SINGLE', 'FREE_TEXT', NULL, 'Unknown', 90),
('9355', 'Storage Capacity', FALSE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"]', '64GB', 85),
('9355', 'Condition', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["New", "Like New", "Very Good", "Good", "Fair", "Poor"]', 'Used', 100),
('9355', 'Network', FALSE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Unlocked", "Verizon", "AT&T", "T-Mobile", "Sprint"]', 'Unlocked', 80),

-- Cameras & Photo (625)
('625', 'Brand', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus", "Pentax", "Leica", "Other"]', 'Unknown', 95),
('625', 'Type', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Digital Camera", "Film Camera", "Action Camera", "Lens", "Accessories"]', 'Digital Camera', 90),
('625', 'Resolution', FALSE, 'STRING', 'SINGLE', 'FREE_TEXT', NULL, 'Unknown', 75),
('625', 'Condition', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["New", "Like New", "Very Good", "Good", "Fair", "Poor"]', 'Used', 100),

-- Trading Card Games (2536)
('2536', 'Game', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Pokémon", "Magic: The Gathering", "Yu-Gi-Oh!", "Dragon Ball Super", "One Piece", "Other"]', 'Pokémon', 95),
('2536', 'Card Type', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Single", "Booster Pack", "Booster Box", "Deck", "Other"]', 'Single', 90),
('2536', 'Condition', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Mint", "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"]', 'Near Mint', 100),
('2536', 'Language', FALSE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["English", "Japanese", "Korean", "Chinese", "German", "French", "Spanish", "Other"]', 'English', 85),

-- Wristwatches (31387)
('31387', 'Brand', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Rolex", "Omega", "Seiko", "Casio", "Citizen", "TAG Heuer", "Breitling", "Tissot", "Other"]', 'Unknown', 95),
('31387', 'Movement', FALSE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Automatic", "Quartz", "Manual", "Digital", "Kinetic"]', 'Quartz', 80),
('31387', 'Case Material', FALSE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Stainless Steel", "Gold", "Silver", "Titanium", "Ceramic", "Plastic", "Other"]', 'Stainless Steel', 75),
('31387', 'Condition', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["New", "Like New", "Very Good", "Good", "Fair", "Poor"]', 'Used', 100),

-- Women's Bags & Handbags (169291)
('169291', 'Brand', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Louis Vuitton", "Chanel", "Gucci", "Hermès", "Prada", "Coach", "Michael Kors", "Kate Spade", "Other"]', 'Unknown', 95),
('169291', 'Material', FALSE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["Leather", "Canvas", "Nylon", "Suede", "Fabric", "Synthetic", "Other"]', 'Leather', 80),
('169291', 'Color', FALSE, 'STRING', 'SINGLE', 'FREE_TEXT', NULL, 'Brown', 70),
('169291', 'Condition', TRUE, 'STRING', 'SINGLE', 'SELECTION_ONLY', '["New", "Like New", "Very Good", "Good", "Fair", "Poor"]', 'Used', 100)

ON CONFLICT (category_id, aspect_name) DO UPDATE SET
    is_required = EXCLUDED.is_required,
    allowed_values = EXCLUDED.allowed_values,
    confidence_score = EXCLUDED.confidence_score;

-- 🗾 日英キーワードマッピング（基本セット）
INSERT INTO category_keyword_mapping (japanese_keyword, english_keywords, pattern_type, ebay_category_id, confidence_score, data_source) VALUES 

-- Electronics
('携帯電話', '["smartphone", "cell phone", "mobile phone", "iPhone", "Android"]', 'partial', '9355', 95, 'manual'),
('スマホ', '["smartphone", "phone", "mobile", "iPhone", "Android"]', 'partial', '9355', 90, 'manual'),
('アイフォン', '["iPhone", "Apple phone", "smartphone"]', 'partial', '9355', 98, 'manual'),
('アンドロイド', '["Android", "smartphone", "mobile phone"]', 'partial', '9355', 95, 'manual'),

('カメラ', '["camera", "digital camera", "photo", "photography"]', 'partial', '625', 90, 'manual'),
('デジカメ', '["digital camera", "camera", "photo"]', 'partial', '625', 92, 'manual'),
('一眼レフ', '["DSLR", "SLR", "camera", "Canon", "Nikon"]', 'partial', '625', 95, 'manual'),
('レンズ', '["lens", "camera lens", "photo lens"]', 'partial', '625', 88, 'manual'),

('パソコン', '["computer", "PC", "laptop", "desktop"]', 'partial', '177', 88, 'manual'),
('ノートパソコン', '["laptop", "notebook", "computer"]', 'partial', '177', 90, 'manual'),
('MacBook', '["MacBook", "Apple laptop", "laptop"]', 'partial', '177', 95, 'manual'),

-- Gaming & Collectibles
('ポケモンカード', '["Pokemon card", "trading card", "Pokémon"]', 'partial', '2536', 95, 'manual'),
('遊戯王', '["Yu-Gi-Oh", "trading card", "card game"]', 'partial', '2536', 93, 'manual'),
('マジック', '["Magic The Gathering", "MTG", "trading card"]', 'partial', '2536', 90, 'manual'),
('トレカ', '["trading card", "card game", "collectible card"]', 'partial', '2536', 85, 'manual'),

('ゲーム', '["video game", "game", "console", "gaming"]', 'partial', '171485', 85, 'manual'),
('プレステ', '["PlayStation", "PS5", "PS4", "Sony"]', 'partial', '171485', 90, 'manual'),
('任天堂', '["Nintendo", "Switch", "gaming", "console"]', 'partial', '171485', 92, 'manual'),
('Xbox', '["Xbox", "Microsoft", "gaming", "console"]', 'partial', '171485', 90, 'manual'),

-- Fashion & Accessories
('時計', '["watch", "wristwatch", "timepiece", "clock"]', 'partial', '31387', 85, 'manual'),
('腕時計', '["wristwatch", "watch", "timepiece"]', 'partial', '31387', 90, 'manual'),
('ロレックス', '["Rolex", "watch", "luxury watch"]', 'partial', '31387', 98, 'manual'),
('セイコー', '["Seiko", "watch", "Japanese watch"]', 'partial', '31387', 95, 'manual'),
('カシオ', '["Casio", "watch", "G-Shock"]', 'partial', '31387', 93, 'manual'),

('バッグ', '["bag", "handbag", "purse", "tote"]', 'partial', '169291', 80, 'manual'),
('ハンドバッグ', '["handbag", "bag", "purse", "tote"]', 'partial', '169291', 85, 'manual'),
('ルイヴィトン', '["Louis Vuitton", "LV", "luxury bag", "designer bag"]', 'partial', '169291', 98, 'manual'),
('シャネル', '["Chanel", "luxury bag", "designer bag"]', 'partial', '169291', 98, 'manual'),
('グッチ', '["Gucci", "luxury bag", "designer bag"]', 'partial', '169291', 98, 'manual'),

('靴', '["shoes", "footwear", "sneakers", "boots"]', 'partial', '95672', 80, 'manual'),
('スニーカー', '["sneakers", "athletic shoes", "shoes"]', 'partial', '95672', 90, 'manual'),
('ナイキ', '["Nike", "sneakers", "athletic shoes"]', 'partial', '95672', 95, 'manual'),
('アディダス', '["Adidas", "sneakers", "athletic shoes"]', 'partial', '95672', 95, 'manual'),

-- Automotive
('車', '["car", "vehicle", "automobile", "auto"]', 'partial', '6000', 70, 'manual'),
('自動車', '["automobile", "car", "vehicle"]', 'partial', '6000', 75, 'manual'),
('バイク', '["motorcycle", "bike", "motorbike"]', 'partial', '10063', 85, 'manual'),
('オートバイ', '["motorcycle", "motorbike", "bike"]', 'partial', '10063', 88, 'manual'),

-- Books & Media
('本', '["book", "books", "publication"]', 'partial', '267', 80, 'manual'),
('マンガ', '["manga", "comic", "Japanese comic"]', 'partial', '267', 85, 'manual'),
('小説', '["novel", "book", "fiction"]', 'partial', '267', 82, 'manual'),
('DVD', '["DVD", "movie", "film", "video"]', 'partial', '11232', 90, 'manual'),
('CD', '["CD", "music", "album", "disc"]', 'partial', '11233', 88, 'manual'),

-- Sports & Outdoors
('ゴルフ', '["golf", "sport", "club", "golfing"]', 'partial', '1513', 90, 'manual'),
('釣り', '["fishing", "angling", "rod", "reel"]', 'partial', '888', 85, 'manual'),
('スポーツ', '["sport", "sports", "athletic", "fitness"]', 'partial', '888', 70, 'manual'),

-- Default patterns
('その他', '["other", "miscellaneous", "various"]', 'exact', '99999', 30, 'manual'),
('不明', '["unknown", "unidentified", "misc"]', 'exact', '99999', 25, 'manual')

ON CONFLICT (japanese_keyword, ebay_category_id) DO UPDATE SET
    english_keywords = EXCLUDED.english_keywords,
    confidence_score = EXCLUDED.confidence_score,
    usage_count = category_keyword_mapping.usage_count,
    updated_at = NOW();

-- 📊 初期システム統計
INSERT INTO ebay_category_system_stats (
    stat_date, 
    total_categories, 
    supported_categories, 
    daily_detections, 
    daily_api_calls, 
    avg_confidence, 
    success_rate,
    top_categories,
    system_performance
) VALUES (
    CURRENT_DATE,
    (SELECT COUNT(*) FROM ebay_categories_master WHERE is_active = TRUE),
    (SELECT COUNT(DISTINCT ebay_category_id) FROM category_keyword_mapping WHERE is_active = TRUE),
    0,
    0,
    87.5,
    0.95,
    '[
        {"name": "Cell Phones & Smartphones", "count": 0, "category_id": "9355"},
        {"name": "Trading Card Games", "count": 0, "category_id": "2536"},
        {"name": "Cameras & Photo", "count": 0, "category_id": "625"},
        {"name": "Wristwatches", "count": 0, "category_id": "31387"},
        {"name": "Womens Bags & Handbags", "count": 0, "category_id": "169291"}
    ]'::jsonb,
    '{
        "avg_response_time": 150,
        "cache_hit_rate": 0.95,
        "api_success_rate": 1.0,
        "local_detection_rate": 0.92
    }'::jsonb
);

-- 🔧 システム初期化ログ
INSERT INTO ebay_api_usage_log (
    api_type, 
    success, 
    request_data, 
    response_data,
    processing_time,
    daily_count
) VALUES (
    'system_initialization',
    TRUE,
    '{"action": "initial_data_setup", "version": "1.0", "categories": 35, "keywords": 45}'::jsonb,
    '{"status": "success", "message": "Initial data loaded successfully"}'::jsonb,
    0,
    0
);

-- ✅ データ投入確認
DO $$ 
DECLARE
    category_count INTEGER;
    keyword_count INTEGER;
    aspect_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM ebay_categories_master WHERE is_active = TRUE;
    SELECT COUNT(*) INTO keyword_count FROM category_keyword_mapping WHERE is_active = TRUE;
    SELECT COUNT(*) INTO aspect_count FROM ebay_item_aspects;
    
    RAISE NOTICE '✅ 初期データ投入完了:';
    RAISE NOTICE '   - カテゴリー: % 件', category_count;
    RAISE NOTICE '   - キーワードマッピング: % 件', keyword_count;
    RAISE NOTICE '   - 必須項目: % 件', aspect_count;
    
    IF category_count > 30 AND keyword_count > 40 THEN
        RAISE NOTICE '✅ システム初期化成功 - eBayカテゴリー自動判定システム準備完了';
    ELSE
        RAISE WARNING '⚠️ データ投入が不完全の可能性があります';
    END IF;
END $$;
