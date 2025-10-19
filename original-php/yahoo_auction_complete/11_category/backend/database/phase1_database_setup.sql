--
-- eBayカテゴリーシステム完全統合 - Phase 1: データベース拡張
-- Yahoo Auction連携・手数料管理対応版
--

-- 1️⃣ Yahoo Auctionテーブル拡張（eBayカテゴリー連携）
DO $$
BEGIN
    -- yahoo_scraped_products テーブル拡張
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products') THEN
        -- eBayカテゴリー関連カラム追加
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'ebay_category_id') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN ebay_category_id VARCHAR(20);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'ebay_category_name') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN ebay_category_name VARCHAR(200);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'category_confidence') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'item_specifics') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN item_specifics TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'ebay_fees_data') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN ebay_fees_data JSONB;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'category_detected_at') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN category_detected_at TIMESTAMP;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'estimated_ebay_price_usd') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN estimated_ebay_price_usd DECIMAL(12,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' AND column_name = 'estimated_profit_usd') THEN
            ALTER TABLE yahoo_scraped_products ADD COLUMN estimated_profit_usd DECIMAL(12,2);
        END IF;
        
        RAISE NOTICE '✅ yahoo_scraped_products テーブル拡張完了';
    ELSE
        RAISE NOTICE '⚠️ yahoo_scraped_products テーブルが存在しません';
    END IF;
END $$;

-- 2️⃣ eBayカテゴリーシステム基本テーブル作成
-- 既存テーブル完全削除（順序重要）
DROP TABLE IF EXISTS category_keywords CASCADE;
DROP TABLE IF EXISTS processed_products CASCADE;
DROP TABLE IF EXISTS category_required_fields CASCADE;
DROP TABLE IF EXISTS ebay_category_fees CASCADE;
DROP TABLE IF EXISTS processing_logs CASCADE;
DROP TABLE IF EXISTS ebay_categories CASCADE;

-- eBayカテゴリーマスター
CREATE TABLE ebay_categories (
    category_id VARCHAR(20) PRIMARY KEY,
    category_name VARCHAR(200) NOT NULL,
    parent_id VARCHAR(20),
    category_level INTEGER DEFAULT 1,
    is_leaf BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- eBayカテゴリー別手数料テーブル
CREATE TABLE ebay_category_fees (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    listing_type VARCHAR(20) NOT NULL DEFAULT 'fixed_price', -- 'auction', 'fixed_price', 'store'
    insertion_fee DECIMAL(10,2) DEFAULT 0.00,
    final_value_fee_percent DECIMAL(5,2) DEFAULT 13.00,
    final_value_fee_max DECIMAL(10,2) DEFAULT 750.00,
    store_fee DECIMAL(10,2) DEFAULT 0.00,
    paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90,
    paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30,
    international_fee_percent DECIMAL(5,2) DEFAULT 1.00,
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- カテゴリー別必須項目
CREATE TABLE category_required_fields (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('required', 'recommended', 'optional')),
    field_data_type VARCHAR(20) DEFAULT 'text' CHECK (field_data_type IN ('text', 'number', 'boolean', 'date', 'enum')),
    possible_values TEXT[],
    default_value VARCHAR(200) DEFAULT 'Unknown',
    validation_rules JSONB,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- 処理済み商品データ
CREATE TABLE processed_products (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50),
    original_title TEXT NOT NULL,
    original_price DECIMAL(12,2) CHECK (original_price >= 0),
    original_description TEXT,
    yahoo_category VARCHAR(200),
    image_url TEXT,
    
    detected_category_id VARCHAR(20),
    category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100),
    matched_keywords TEXT[],
    
    item_specifics TEXT,
    item_specifics_json JSONB,
    
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'review_required', 'exported')),
    processing_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_by VARCHAR(100) DEFAULT 'system',
    
    FOREIGN KEY (detected_category_id) REFERENCES ebay_categories(category_id)
);

-- カテゴリー判定キーワード辞書
CREATE TABLE category_keywords (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    keyword VARCHAR(200) NOT NULL,
    keyword_type VARCHAR(20) DEFAULT 'primary' CHECK (keyword_type IN ('primary', 'secondary', 'negative')),
    weight INTEGER DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
    language VARCHAR(5) DEFAULT 'ja' CHECK (language IN ('ja', 'en', 'mixed')),
    is_regex BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE
);

-- 処理ログ
CREATE TABLE processing_logs (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50),
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    processing_time_seconds DECIMAL(10,3),
    memory_usage_mb DECIMAL(10,2),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 3️⃣ 初期データ投入
-- eBayカテゴリーデータ
INSERT INTO ebay_categories (category_id, category_name, parent_id, category_level, is_leaf, is_active) VALUES
('0', 'All Categories', NULL, 0, FALSE, TRUE),

-- エレクトロニクス
('15032', 'Cell Phones & Accessories', '0', 1, FALSE, TRUE),
('293', 'Cell Phones & Smartphones', '15032', 2, TRUE, TRUE),
('625', 'Cameras & Photo', '0', 1, FALSE, TRUE),
('11232', 'Digital Cameras', '625', 2, TRUE, TRUE),
('3323', 'Lenses & Filters', '625', 2, TRUE, TRUE),
('175672', 'Computers/Tablets & Networking', '0', 1, FALSE, TRUE),
('1425', 'Laptops & Netbooks', '175672', 2, TRUE, TRUE),

-- ゲーム
('1249', 'Video Games & Consoles', '0', 1, FALSE, TRUE),
('139973', 'Video Games', '1249', 2, TRUE, TRUE),
('14339', 'Video Game Consoles', '1249', 2, TRUE, TRUE),

-- トレーディングカード
('64482', 'Trading Cards', '0', 1, FALSE, TRUE),
('58058', 'Sports Trading Cards', '64482', 2, TRUE, TRUE),
('183454', 'Non-Sport Trading Cards', '64482', 2, TRUE, TRUE),
('888', 'Trading Card Games', '64482', 2, TRUE, TRUE),

-- 衣類・アクセサリー
('11450', 'Clothing, Shoes & Accessories', '0', 1, FALSE, TRUE),
('11462', 'Women''s Clothing', '11450', 2, TRUE, TRUE),
('1059', 'Men''s Clothing', '11450', 2, TRUE, TRUE),

-- 時計・ジュエリー
('14324', 'Jewelry & Watches', '0', 1, FALSE, TRUE),
('31387', 'Watches, Parts & Accessories', '14324', 2, TRUE, TRUE),

-- 本・映画・音楽
('267', 'Books, Movies & Music', '0', 1, FALSE, TRUE),
('1295', 'Books & Magazines', '267', 2, TRUE, TRUE),

-- おもちゃ・ホビー
('220', 'Toys & Hobbies', '0', 1, FALSE, TRUE),
('10181', 'Action Figures', '220', 2, TRUE, TRUE),

-- 日本特有
('99991', 'Japanese Traditional Items', '0', 1, FALSE, TRUE),
('99992', 'Anime & Manga', '99991', 2, TRUE, TRUE),

-- その他
('99999', 'Other/Unclassified', '0', 1, TRUE, TRUE);

-- 手数料データ投入（2025年最新版）
INSERT INTO ebay_category_fees (category_id, listing_type, final_value_fee_percent, final_value_fee_max) VALUES
-- スマートフォン
('293', 'fixed_price', 12.90, 750.00),
('293', 'auction', 12.90, 750.00),

-- カメラ
('625', 'fixed_price', 12.35, 750.00), 
('11232', 'fixed_price', 12.35, 750.00),
('3323', 'fixed_price', 12.35, 750.00),

-- コンピューター
('175672', 'fixed_price', 12.35, 750.00),
('1425', 'fixed_price', 12.35, 750.00),

-- ビデオゲーム
('139973', 'fixed_price', 13.25, 750.00),
('14339', 'fixed_price', 13.25, 750.00),
('1249', 'fixed_price', 13.25, 750.00),

-- トレーディングカード
('58058', 'fixed_price', 13.25, 750.00),
('183454', 'fixed_price', 13.25, 750.00),
('888', 'fixed_price', 13.25, 750.00),
('64482', 'fixed_price', 13.25, 750.00),

-- 衣類
('11450', 'fixed_price', 13.25, 750.00),
('11462', 'fixed_price', 13.25, 750.00),
('1059', 'fixed_price', 13.25, 750.00),

-- 時計・ジュエリー
('14324', 'fixed_price', 13.25, 750.00),
('31387', 'fixed_price', 13.25, 750.00),

-- 本・メディア
('267', 'fixed_price', 15.00, 750.00),
('1295', 'fixed_price', 15.00, 750.00),

-- おもちゃ
('220', 'fixed_price', 13.25, 750.00),
('10181', 'fixed_price', 13.25, 750.00),

-- 日本特有
('99991', 'fixed_price', 13.25, 750.00),
('99992', 'fixed_price', 13.25, 750.00),

-- その他
('99999', 'fixed_price', 13.25, 750.00);

-- 必須項目データ（主要カテゴリーのみ）
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
-- スマートフォン（iPhone, Samsung等）
('293', 'Brand', 'required', 'enum', ARRAY['Apple', 'Samsung', 'Google', 'Sony', 'Xiaomi', 'OnePlus', 'Other'], 'Unknown', 1),
('293', 'Model', 'required', 'text', NULL, 'Unknown', 2),
('293', 'Storage Capacity', 'recommended', 'enum', ARRAY['16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], 'Unknown', 3),
('293', 'Color', 'recommended', 'enum', ARRAY['Black', 'White', 'Blue', 'Red', 'Gold', 'Silver', 'Gray', 'Pink', 'Green'], 'Unknown', 4),
('293', 'Condition', 'required', 'enum', ARRAY['New', 'Open box', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),
('293', 'Network', 'recommended', 'enum', ARRAY['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Sprint', 'Other'], 'Unlocked', 6),
('293', 'Operating System', 'recommended', 'enum', ARRAY['iOS', 'Android', 'Windows Phone', 'Other'], 'Unknown', 7),

-- カメラ
('625', 'Brand', 'required', 'enum', ARRAY['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Olympus', 'Panasonic', 'Leica', 'Other'], 'Unknown', 1),
('625', 'Type', 'required', 'enum', ARRAY['Digital SLR', 'Mirrorless', 'Point & Shoot', 'Film SLR', 'Action Camera'], 'Digital Camera', 2),
('625', 'Model', 'required', 'text', NULL, 'Unknown', 3),
('625', 'Condition', 'required', 'enum', ARRAY['New', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),

-- ゲーム
('139973', 'Platform', 'required', 'enum', ARRAY['PlayStation 5', 'PlayStation 4', 'Nintendo Switch', 'Xbox Series X', 'Xbox One', 'PC', 'Nintendo DS', 'PSP'], 'Unknown', 1),
('139973', 'Genre', 'recommended', 'enum', ARRAY['Action', 'Adventure', 'RPG', 'Sports', 'Racing', 'Strategy', 'Simulation', 'Other'], 'Unknown', 2),
('139973', 'Condition', 'required', 'enum', ARRAY['New', 'Like New', 'Very Good', 'Good', 'Acceptable'], 'Used', 3),
('139973', 'Region Code', 'recommended', 'enum', ARRAY['NTSC-U/C (US/Canada)', 'NTSC-J (Japan)', 'PAL (Europe)', 'Region Free'], 'NTSC-J (Japan)', 4),

-- その他カテゴリー（デフォルト）
('99999', 'Brand', 'recommended', 'text', NULL, 'Unknown', 1),
('99999', 'Condition', 'required', 'enum', ARRAY['New', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 3),
('99999', 'Country/Region of Manufacture', 'recommended', 'text', NULL, 'Japan', 4);

-- キーワード辞書データ
-- スマートフォンキーワード
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('293', 'iphone', 'primary', 10, 'en'),
('293', 'アイフォン', 'primary', 10, 'ja'),
('293', 'samsung', 'primary', 9, 'en'),
('293', 'galaxy', 'primary', 9, 'en'),
('293', 'ギャラクシー', 'primary', 9, 'ja'),
('293', 'google', 'primary', 8, 'en'),
('293', 'pixel', 'primary', 8, 'en'),
('293', 'smartphone', 'primary', 9, 'en'),
('293', 'スマホ', 'primary', 9, 'ja'),
('293', 'スマートフォン', 'primary', 9, 'ja'),
('293', '携帯電話', 'primary', 8, 'ja'),
('293', 'android', 'secondary', 7, 'en'),
('293', 'アンドロイド', 'secondary', 7, 'ja'),
('293', 'mobile phone', 'secondary', 6, 'en'),
('293', 'cell phone', 'secondary', 6, 'en');

-- カメラキーワード
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('625', 'canon', 'primary', 10, 'en'),
('625', 'キヤノン', 'primary', 10, 'ja'),
('625', 'nikon', 'primary', 10, 'en'),
('625', 'ニコン', 'primary', 10, 'ja'),
('625', 'sony', 'primary', 10, 'en'),
('625', 'camera', 'primary', 9, 'en'),
('625', 'カメラ', 'primary', 9, 'ja'),
('625', 'ミラーレス', 'primary', 9, 'ja'),
('625', 'mirrorless', 'primary', 9, 'en'),
('625', '一眼レフ', 'primary', 9, 'ja'),
('625', 'dslr', 'primary', 9, 'en'),
('625', 'デジタルカメラ', 'primary', 8, 'ja'),
('625', 'digital camera', 'primary', 8, 'en'),
('625', 'lens', 'secondary', 8, 'en'),
('625', 'レンズ', 'secondary', 8, 'ja');

-- ゲームキーワード
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('139973', 'playstation', 'primary', 10, 'en'),
('139973', 'プレイステーション', 'primary', 10, 'ja'),
('139973', 'ps5', 'primary', 10, 'en'),
('139973', 'ps4', 'primary', 9, 'en'),
('139973', 'nintendo switch', 'primary', 10, 'en'),
('139973', 'ニンテンドースイッチ', 'primary', 10, 'ja'),
('139973', 'xbox', 'primary', 9, 'en'),
('139973', 'ゲームソフト', 'primary', 9, 'ja'),
('139973', 'video game', 'primary', 8, 'en'),
('139973', 'game software', 'secondary', 8, 'en');

-- トレーディングカードキーワード
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('58058', 'baseball card', 'primary', 10, 'en'),
('58058', '野球カード', 'primary', 10, 'ja'),
('58058', 'topps', 'primary', 9, 'en'),
('58058', 'panini', 'primary', 8, 'en'),
('183454', 'pokemon card', 'primary', 10, 'en'),
('183454', 'ポケモンカード', 'primary', 10, 'ja'),
('183454', 'ポケカ', 'primary', 10, 'ja'),
('183454', '遊戯王', 'primary', 10, 'ja'),
('183454', 'yu-gi-oh', 'primary', 10, 'en'),
('888', 'trading card', 'primary', 9, 'en'),
('888', 'トレーディングカード', 'primary', 9, 'ja'),
('888', 'トレカ', 'primary', 9, 'ja');

-- アニメ・フィギュアキーワード
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('99992', 'anime', 'primary', 10, 'en'),
('99992', 'アニメ', 'primary', 10, 'ja'),
('99992', 'figure', 'primary', 10, 'en'),
('99992', 'フィギュア', 'primary', 10, 'ja'),
('99992', 'figma', 'primary', 9, 'en'),
('99992', 'フィグマ', 'primary', 9, 'ja'),
('99992', 'nendoroid', 'primary', 9, 'en'),
('99992', 'ねんどろいど', 'primary', 9, 'ja');

-- その他キーワード
INSERT INTO category_keywords (category_id, keyword, keyword_type, weight, language) VALUES
('99999', 'other', 'primary', 5, 'en'),
('99999', 'その他', 'primary', 5, 'ja'),
('99999', 'unknown', 'secondary', 3, 'en');

-- 4️⃣ インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_ebay_categories_parent ON ebay_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_ebay_categories_active ON ebay_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_category_required_fields_category ON category_required_fields(category_id);
CREATE INDEX IF NOT EXISTS idx_category_required_fields_active ON category_required_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_processed_products_category ON processed_products(detected_category_id);
CREATE INDEX IF NOT EXISTS idx_processed_products_status ON processed_products(status);
CREATE INDEX IF NOT EXISTS idx_category_keywords_category ON category_keywords(category_id);
CREATE INDEX IF NOT EXISTS idx_category_keywords_keyword ON category_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_category_keywords_active ON category_keywords(is_active);
CREATE INDEX IF NOT EXISTS idx_ebay_category_fees_category ON ebay_category_fees(category_id);

-- Yahoo Auctionテーブル用インデックス
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products') THEN
        CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_ebay_category ON yahoo_scraped_products(ebay_category_id);
        CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_category_detected ON yahoo_scraped_products(category_detected_at);
        CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_confidence ON yahoo_scraped_products(category_confidence);
    END IF;
END $$;

-- 5️⃣ 便利関数作成
CREATE OR REPLACE FUNCTION calculate_category_score(
    p_title TEXT,
    p_description TEXT DEFAULT '',
    p_category_id VARCHAR(20)
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_keyword RECORD;
    v_text TEXT;
BEGIN
    v_text := LOWER(p_title || ' ' || COALESCE(p_description, ''));
    
    FOR v_keyword IN 
        SELECT keyword, keyword_type, weight
        FROM category_keywords 
        WHERE category_id = p_category_id AND is_active = TRUE
    LOOP
        IF POSITION(LOWER(v_keyword.keyword) IN v_text) > 0 THEN
            CASE v_keyword.keyword_type
                WHEN 'primary' THEN v_score := v_score + (v_keyword.weight * 2);
                WHEN 'secondary' THEN v_score := v_score + v_keyword.weight;
                WHEN 'negative' THEN v_score := v_score - v_keyword.weight;
            END CASE;
        END IF;
    END LOOP;
    
    RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql;

-- 手数料計算関数
CREATE OR REPLACE FUNCTION calculate_ebay_fees(
    p_category_id VARCHAR(20),
    p_price DECIMAL,
    p_listing_type VARCHAR(20) DEFAULT 'fixed_price'
) RETURNS JSONB AS $$
DECLARE
    v_fees RECORD;
    v_result JSONB;
    v_final_value_fee DECIMAL;
    v_paypal_fee DECIMAL;
    v_total_fees DECIMAL;
BEGIN
    -- 手数料データ取得
    SELECT * INTO v_fees 
    FROM ebay_category_fees 
    WHERE category_id = p_category_id AND listing_type = p_listing_type
    LIMIT 1;
    
    -- デフォルト手数料（データがない場合）
    IF v_fees IS NULL THEN
        v_fees.final_value_fee_percent := 13.25;
        v_fees.final_value_fee_max := 750.00;
        v_fees.paypal_fee_percent := 2.90;
        v_fees.paypal_fee_fixed := 0.30;
        v_fees.insertion_fee := 0.00;
    END IF;
    
    -- 計算
    v_final_value_fee := LEAST(p_price * v_fees.final_value_fee_percent / 100, v_fees.final_value_fee_max);
    v_paypal_fee := (p_price * v_fees.paypal_fee_percent / 100) + v_fees.paypal_fee_fixed;
    v_total_fees := v_fees.insertion_fee + v_final_value_fee + v_paypal_fee;
    
    -- JSON結果作成
    v_result := jsonb_build_object(
        'insertion_fee', v_fees.insertion_fee,
        'final_value_fee', v_final_value_fee,
        'paypal_fee', v_paypal_fee,
        'total_fees', v_total_fees,
        'net_amount', p_price - v_total_fees,
        'fee_percentage', ROUND((v_total_fees / p_price * 100)::numeric, 2)
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 6️⃣ 完了メッセージ
DO $$
DECLARE
    category_count integer;
    keyword_count integer;
    field_count integer;
    fee_count integer;
    yahoo_exists boolean;
BEGIN
    SELECT COUNT(*) INTO category_count FROM ebay_categories;
    SELECT COUNT(*) INTO keyword_count FROM category_keywords;
    SELECT COUNT(*) INTO field_count FROM category_required_fields;
    SELECT COUNT(*) INTO fee_count FROM ebay_category_fees;
    
    -- Yahoo Auctionテーブル存在確認
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products'
    ) INTO yahoo_exists;

    RAISE NOTICE '🎉 =========================================';
    RAISE NOTICE '✅ eBayカテゴリー自動判定システム構築完了';
    RAISE NOTICE '🎉 =========================================';
    RAISE NOTICE 'カテゴリー数: %', category_count;
    RAISE NOTICE 'キーワード数: %', keyword_count;
    RAISE NOTICE '必須項目数: %', field_count;
    RAISE NOTICE '手数料データ: %', fee_count;
    RAISE NOTICE 'Yahoo連携: %', CASE WHEN yahoo_exists THEN 'OK' ELSE 'テーブル未作成' END;
    RAISE NOTICE '🚀 システム準備完了 - 高精度判定が可能です！';
    RAISE NOTICE '🎉 =========================================';
END $$;