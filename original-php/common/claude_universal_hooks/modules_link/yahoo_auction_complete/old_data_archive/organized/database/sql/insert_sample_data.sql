-- 🚀 NAGANO-3 サンプルデータ投入スクリプト
-- 構築されたデータベースに実際のデータを投入してテスト

-- ===============================================
-- 📦 1. eBay完全APIデータのサンプル投入
-- ===============================================

\echo '📦 eBay完全APIデータ サンプル投入開始'
\echo '=================================='

-- eBay完全APIデータサンプル（80項目対応）
INSERT INTO ebay_complete_api_data (
    ebay_item_id, title, sku, 
    current_price_value, current_price_currency,
    quantity, quantity_available, quantity_sold,
    condition_name, category_name, brand,
    listing_status, listing_type, listing_format,
    seller_user_id, seller_feedback_score, seller_positive_feedback_percent,
    gallery_url, description, 
    start_time, end_time,
    watch_count, hit_count, bid_count,
    country, site_id, site_name,
    picture_urls, item_specifics,
    data_completeness_score, api_fetch_timestamp
) VALUES 
-- 🇺🇸 USA eBay データ
('US-001-IPHONE15', 'Apple iPhone 15 Pro Max 256GB Natural Titanium Unlocked', 'STOCK-IPHONE15-256-TI', 
 1299.99, 'USD', 5, 5, 0, 'New', 'Cell Phones & Smartphones', 'Apple',
 'Active', 'FixedPriceItem', 'StoreInventory', 
 'apple_official_store', 99845, 99.8,
 'https://i.ebayimg.com/images/g/iphone15.jpg', 'Brand new iPhone 15 Pro Max with titanium design...',
 NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days',
 156, 2341, 0, 'US', 0, 'eBay.com',
 '["https://i.ebayimg.com/images/g/1.jpg", "https://i.ebayimg.com/images/g/2.jpg"]'::jsonb,
 '{"Brand": "Apple", "Model": "iPhone 15 Pro Max", "Storage": "256GB", "Color": "Natural Titanium"}'::jsonb,
 98, NOW()),

-- 🇬🇧 UK eBay データ
('UK-002-SONY-WH', 'Sony WH-1000XM5 Wireless Noise Canceling Headphones - Black', 'STOCK-SONY-WH1000XM5-BK',
 349.99, 'GBP', 3, 3, 2, 'New', 'Headphones', 'Sony',
 'Active', 'FixedPriceItem', 'StoreInventory',
 'sony_electronics_uk', 45621, 99.2,
 'https://i.ebayimg.com/images/g/sony-headphones.jpg', 'Premium wireless headphones with industry-leading noise cancellation...',
 NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days',
 89, 1567, 0, 'GB', 3, 'eBay.co.uk',
 '["https://i.ebayimg.com/images/g/sony1.jpg", "https://i.ebayimg.com/images/g/sony2.jpg"]'::jsonb,
 '{"Brand": "Sony", "Model": "WH-1000XM5", "Color": "Black", "Connectivity": "Wireless"}'::jsonb,
 95, NOW()),

-- 🇩🇪 Germany eBay データ  
('DE-003-LEGO-SW', 'LEGO Star Wars Millennium Falcon 75192 Ultimate Collector Series', 'SET-LEGO-75192-MF',
 799.99, 'EUR', 1, 1, 0, 'New', 'Building Toys', 'LEGO',
 'Active', 'FixedPriceItem', 'StoreInventory',
 'lego_official_de', 12845, 98.9,
 'https://i.ebayimg.com/images/g/lego-falcon.jpg', 'Das ultimative LEGO Star Wars Sammlerset...',
 NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days',
 234, 3456, 1, 'DE', 77, 'eBay.de',
 '["https://i.ebayimg.com/images/g/lego1.jpg", "https://i.ebayimg.com/images/g/lego2.jpg"]'::jsonb,
 '{"Brand": "LEGO", "Theme": "Star Wars", "Set Number": "75192", "Pieces": "7541"}'::jsonb,
 97, NOW()),

-- 🇦🇺 Australia eBay データ
('AU-004-DYSON-V15', 'Dyson V15 Detect Absolute Cordless Vacuum Cleaner - Gold', 'DROP-DYSON-V15-GOLD',
 899.00, 'AUD', 2, 2, 1, 'New', 'Vacuum Cleaners', 'Dyson',
 'Active', 'FixedPriceItem', 'StoreInventory',
 'dyson_australia', 8934, 97.8,
 'https://i.ebayimg.com/images/g/dyson-v15.jpg', 'Advanced cordless vacuum with laser dust detection...',
 NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days',
 67, 987, 0, 'AU', 15, 'eBay.com.au',
 '["https://i.ebayimg.com/images/g/dyson1.jpg", "https://i.ebayimg.com/images/g/dyson2.jpg"]'::jsonb,
 '{"Brand": "Dyson", "Model": "V15 Detect", "Type": "Cordless", "Color": "Gold"}'::jsonb,
 94, NOW()),

-- 🇨🇦 Canada eBay データ
('CA-005-SWITCH-OLED', 'Nintendo Switch OLED Model Console - White', 'STOCK-SWITCH-OLED-WH',
 449.99, 'CAD', 4, 4, 8, 'New', 'Video Game Consoles', 'Nintendo',
 'Active', 'FixedPriceItem', 'StoreInventory',
 'nintendo_canada', 15678, 99.1,
 'https://i.ebayimg.com/images/g/switch-oled.jpg', 'Nintendo Switch with vibrant OLED screen...',
 NOW() - INTERVAL '4 days', NOW() + INTERVAL '26 days',
 178, 2876, 3, 'CA', 2, 'eBay.ca',
 '["https://i.ebayimg.com/images/g/switch1.jpg", "https://i.ebayimg.com/images/g/switch2.jpg"]'::jsonb,
 '{"Brand": "Nintendo", "Model": "Switch OLED", "Color": "White", "Storage": "64GB"}'::jsonb,
 96, NOW());

-- ===============================================
-- 📦 2. 在庫・商品管理データのサンプル投入
-- ===============================================

\echo ''
\echo '📦 在庫・商品管理データ サンプル投入'
\echo '==============================='

-- カテゴリデータ投入
INSERT INTO inventory_categories (category_code, category_name, category_name_en, description) VALUES
('ELECTRONICS', 'エレクトロニクス', 'Electronics', '電子機器・電子部品'),
('GAMING', 'ゲーム・ホビー', 'Gaming & Hobbies', 'ゲーム機・ホビー用品'),
('HOME_APPLIANCES', '家電', 'Home Appliances', '家庭用電化製品'),
('TOYS_COLLECTIBLES', 'おもちゃ・コレクション', 'Toys & Collectibles', 'おもちゃ・コレクション商品')
ON CONFLICT (category_code) DO NOTHING;

-- 仕入先データ投入
INSERT INTO inventory_suppliers (supplier_code, supplier_name, supplier_name_en, email, country, is_active) VALUES
('APPLE_OFFICIAL', 'Apple Inc.', 'Apple Inc.', 'supplier@apple.com', 'USA', true),
('SONY_CORP', 'ソニー株式会社', 'Sony Corporation', 'business@sony.com', 'Japan', true),
('NINTENDO_JP', '任天堂株式会社', 'Nintendo Co., Ltd.', 'business@nintendo.co.jp', 'Japan', true),
('LEGO_GROUP', 'LEGO Group', 'LEGO Group', 'b2b@lego.com', 'Denmark', true),
('DYSON_LTD', 'Dyson Ltd.', 'Dyson Ltd.', 'trade@dyson.com', 'UK', true)
ON CONFLICT (supplier_code) DO NOTHING;

-- 商品マスターデータ投入
INSERT INTO inventory_products (
    sku, product_name, product_name_en, 
    category_id, supplier_id,
    purchase_price, selling_price, msrp,
    description, product_type, condition_type,
    primary_image_url, track_inventory,
    low_stock_threshold, reorder_point, reorder_quantity,
    is_active, is_featured
) VALUES 
((SELECT 'STOCK-IPHONE15-256-TI'), 'iPhone 15 Pro Max 256GB ナチュラルチタニウム', 'iPhone 15 Pro Max 256GB Natural Titanium',
 (SELECT id FROM inventory_categories WHERE category_code = 'ELECTRONICS'), 
 (SELECT id FROM inventory_suppliers WHERE supplier_code = 'APPLE_OFFICIAL'),
 1100.00, 1299.99, 1199.00,
 '最新のiPhone 15 Pro Maxシリーズ。チタンデザインで軽量化を実現。', 'stock', 'new',
 'https://store.storeimages.cdn-apple.com/iphone15.jpg', true,
 2, 5, 10, true, true),

((SELECT 'STOCK-SONY-WH1000XM5-BK'), 'Sony WH-1000XM5 ワイヤレスノイズキャンセリングヘッドホン', 'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
 (SELECT id FROM inventory_categories WHERE category_code = 'ELECTRONICS'),
 (SELECT id FROM inventory_suppliers WHERE supplier_code = 'SONY_CORP'),
 280.00, 349.99, 399.99,
 '業界最高クラスのノイズキャンセリング性能を持つワイヤレスヘッドホン。', 'stock', 'new',
 'https://sony.com/images/wh1000xm5.jpg', true,
 3, 8, 15, true, true),

((SELECT 'STOCK-SWITCH-OLED-WH'), 'Nintendo Switch（有機ELモデル） ホワイト', 'Nintendo Switch OLED Model White',
 (SELECT id FROM inventory_categories WHERE category_code = 'GAMING'),
 (SELECT id FROM inventory_suppliers WHERE supplier_code = 'NINTENDO_JP'),
 320.00, 449.99, 349.99,
 '7インチ有機ELディスプレイを搭載したNintendo Switch。', 'stock', 'new',
 'https://nintendo.com/images/switch-oled.jpg', true,
 2, 6, 12, true, true)
ON CONFLICT (sku) DO NOTHING;

-- 在庫データ投入
INSERT INTO inventory_stock (
    product_id, quantity_available, quantity_reserved,
    warehouse_location, shelf_location,
    total_cost, average_cost
) VALUES 
((SELECT id FROM inventory_products WHERE sku = 'STOCK-IPHONE15-256-TI'), 5, 0, 'WH-001', 'A-01-05', 5500.00, 1100.00),
((SELECT id FROM inventory_products WHERE sku = 'STOCK-SONY-WH1000XM5-BK'), 8, 2, 'WH-001', 'B-02-03', 2240.00, 280.00),
((SELECT id FROM inventory_products WHERE sku = 'STOCK-SWITCH-OLED-WH'), 12, 4, 'WH-001', 'C-01-08', 3840.00, 320.00);

-- ===============================================
-- 📦 3. 配送・料金計算データのサンプル投入
-- ===============================================

\echo ''
\echo '🚚 配送・料金計算データ サンプル投入'
\echo '==============================='

-- 配送サービスデータ投入
INSERT INTO shipping_services (service_name, service_code, carrier_name, service_type, delivery_time_min, delivery_time_max, tracking_available) VALUES
('eBay Standard Envelope', 'STANDARD_ENVELOPE', 'USPS', 'economy', 6, 10, false),
('eBay Fast N Free', 'FAST_N_FREE', 'FedEx', 'express', 1, 3, true),
('eBay International Standard', 'INTL_STANDARD', 'USPS', 'international', 7, 21, true),
('UK Royal Mail 1st Class', 'UK_RM_1ST', 'Royal Mail', 'standard', 1, 2, true),
('Germany DHL Standard', 'DE_DHL_STD', 'DHL', 'standard', 1, 3, true),
('Australia Post Express', 'AU_POST_EXP', 'Australia Post', 'express', 1, 2, true)
ON CONFLICT (service_code) DO NOTHING;

-- 配送料金データ投入
INSERT INTO shipping_rates (service_id, origin_country, destination_country, weight_min, weight_max, base_rate, per_kg_rate, currency) VALUES
((SELECT id FROM shipping_services WHERE service_code = 'STANDARD_ENVELOPE'), 'US', 'US', 0, 0.5, 1.10, 0, 'USD'),
((SELECT id FROM shipping_services WHERE service_code = 'FAST_N_FREE'), 'US', 'US', 0, 10, 0.00, 0, 'USD'),
((SELECT id FROM shipping_services WHERE service_code = 'INTL_STANDARD'), 'US', 'JP', 0, 2, 15.50, 8.50, 'USD'),
((SELECT id FROM shipping_services WHERE service_code = 'UK_RM_1ST'), 'GB', 'GB', 0, 1, 2.85, 0, 'GBP'),
((SELECT id FROM shipping_services WHERE service_code = 'DE_DHL_STD'), 'DE', 'DE', 0, 5, 4.99, 1.50, 'EUR'),
((SELECT id FROM shipping_services WHERE service_code = 'AU_POST_EXP'), 'AU', 'AU', 0, 3, 8.95, 2.50, 'AUD');

-- eBay手数料データ投入
INSERT INTO ebay_fees (site_id, listing_type, insertion_fee, final_value_fee_percent, final_value_fee_max) VALUES
(0, 'FixedPriceItem', 0.00, 13.25, 750.00),  -- eBay.com
(3, 'FixedPriceItem', 0.00, 12.80, 600.00),  -- eBay.co.uk  
(77, 'FixedPriceItem', 0.00, 12.90, 700.00), -- eBay.de
(15, 'FixedPriceItem', 0.00, 13.00, 800.00), -- eBay.com.au
(2, 'FixedPriceItem', 0.00, 13.25, 750.00)   -- eBay.ca
ON CONFLICT DO NOTHING;

-- 利益計算サンプルデータ投入
INSERT INTO profit_calculations (
    product_sku, purchase_price, selling_price, 
    shipping_cost, ebay_fees, paypal_fees, packaging_cost,
    gross_profit, net_profit, profit_margin_percent, roi_percent
) VALUES 
('STOCK-IPHONE15-256-TI', 1100.00, 1299.99, 0.00, 172.25, 39.52, 5.00, 199.99, 83.22, 6.40, 7.57),
('STOCK-SONY-WH1000XM5-BK', 280.00, 349.99, 0.00, 44.80, 10.64, 3.00, 69.99, 11.55, 3.30, 4.13),
('STOCK-SWITCH-OLED-WH', 320.00, 449.99, 0.00, 59.25, 13.68, 4.00, 129.99, 53.06, 11.79, 16.58);

-- ===============================================
-- 📦 4. Yahoo統合システムデータのサンプル投入
-- ===============================================

\echo ''
\echo '🏛️ Yahoo統合システムデータ サンプル投入'
\echo '=================================='

-- Yahoo統合商品データ投入（eBayからの移行準備）
INSERT INTO unified_scraped_ebay_products (
    ebay_item_id, title, current_price, currency,
    condition_display_name, category_name, seller_username,
    image_url, description, quantity,
    listing_format, listing_type, item_location,
    watch_count, data_quality_score,
    approval_status, yahoo_ready,
    yahoo_title_jp, yahoo_description_jp
) VALUES 
('US-001-IPHONE15', 'Apple iPhone 15 Pro Max 256GB Natural Titanium Unlocked', 1299.99, 'USD',
 'New', 'Cell Phones & Smartphones', 'apple_official_store',
 'https://i.ebayimg.com/images/g/iphone15.jpg', 'Brand new iPhone 15 Pro Max with titanium design...', 5,
 'FixedPrice', 'StoreInventory', 'Cupertino, CA',
 156, 98, 'approved', true,
 'Apple iPhone 15 Pro Max 256GB ナチュラルチタニウム SIMフリー', 
 '最新のiPhone 15 Pro Maxです。チタン素材により軽量化を実現。48MPメインカメラ、Action Button搭載。'),

('UK-002-SONY-WH', 'Sony WH-1000XM5 Wireless Noise Canceling Headphones - Black', 349.99, 'GBP',
 'New', 'Headphones', 'sony_electronics_uk', 
 'https://i.ebayimg.com/images/g/sony-headphones.jpg', 'Premium wireless headphones with industry-leading noise cancellation...', 3,
 'FixedPrice', 'StoreInventory', 'London, UK',
 89, 95, 'pending', false,
 'Sony WH-1000XM5 ワイヤレスノイズキャンセリングヘッドホン ブラック',
 '業界最高クラスのノイズキャンセリング機能を搭載したソニーのプレミアムヘッドホン。30時間連続再生可能。');

-- スクレイピングセッションログ投入
INSERT INTO scraping_session_logs (
    scraping_type, target_url, total_items_found, 
    successful_items, session_status, performance_metrics
) VALUES 
('ebay_api_sync', 'https://api.ebay.com/ws/api.dll', 5, 5, 'completed',
 '{"duration_seconds": 45, "api_calls": 5, "success_rate": 100}'::jsonb),
('ebay_web_scraping', 'https://www.ebay.com/sch/', 12, 10, 'completed',
 '{"duration_seconds": 127, "pages_scraped": 3, "success_rate": 83.3}'::jsonb);

-- ===============================================
-- 📦 5. プラットフォーム統合データのサンプル投入
-- ===============================================

\echo ''
\echo '🔗 プラットフォーム統合データ サンプル投入'
\echo '==================================='

-- プラットフォーム出品管理データ投入
INSERT INTO platform_listings (
    platform_name, platform_item_id, listing_status,
    title, description, price, currency, quantity,
    condition_type, sync_status
) VALUES 
('ebay_us', 'US-001-IPHONE15', 'active',
 'Apple iPhone 15 Pro Max 256GB Natural Titanium Unlocked', 
 'Brand new iPhone 15 Pro Max with titanium design...', 1299.99, 'USD', 5,
 'new', 'synced'),
('ebay_uk', 'UK-002-SONY-WH', 'active',
 'Sony WH-1000XM5 Wireless Noise Canceling Headphones - Black',
 'Premium wireless headphones with industry-leading noise cancellation...', 349.99, 'GBP', 3,
 'new', 'synced'),
('yahoo_auction', 'YA-001-IPHONE15-JP', 'draft',
 'Apple iPhone 15 Pro Max 256GB ナチュラルチタニウム SIMフリー',
 '最新のiPhone 15 Pro Maxです。チタン素材により軽量化を実現...', 180000, 'JPY', 1,
 'new', 'pending');

-- ===============================================
-- 📊 データ投入完了確認
-- ===============================================

\echo ''
\echo '📊 サンプルデータ投入完了確認'
\echo '=========================='

SELECT 
    'ebay_complete_api_data' as "テーブル名",
    COUNT(*) as "投入レコード数",
    '✅ 多国籍eBayデータ' as "内容"
FROM ebay_complete_api_data
UNION ALL
SELECT 
    'inventory_products',
    COUNT(*),
    '✅ 商品マスターデータ'
FROM inventory_products
UNION ALL
SELECT 
    'inventory_stock', 
    COUNT(*),
    '✅ 在庫データ'
FROM inventory_stock
UNION ALL
SELECT 
    'shipping_services',
    COUNT(*),
    '✅ 配送サービスデータ'
FROM shipping_services
UNION ALL
SELECT 
    'profit_calculations',
    COUNT(*),
    '✅ 利益計算データ'  
FROM profit_calculations
UNION ALL
SELECT 
    'unified_scraped_ebay_products',
    COUNT(*),
    '✅ Yahoo統合準備データ'
FROM unified_scraped_ebay_products
UNION ALL
SELECT 
    'platform_listings',
    COUNT(*),
    '✅ プラットフォーム統合データ'
FROM platform_listings;

-- ===============================================
-- 🎯 完了メッセージ
-- ===============================================

\echo ''
\echo '🔥 ================================================='
\echo '🎯 NAGANO-3 サンプルデータ投入完了！'
\echo '🔥 ================================================='
\echo ''
\echo '✅ 多国籍eBayデータ（5カ国）投入完了'
\echo '✅ 在庫・商品管理データ投入完了'  
\echo '✅ 配送・料金計算データ投入完了'
\echo '✅ Yahoo統合準備データ投入完了'
\echo '✅ プラットフォーム統合データ投入完了'
\echo ''
\echo '🚀 システム稼働準備完了 - APIとの連携開始可能！'
\echo ''
