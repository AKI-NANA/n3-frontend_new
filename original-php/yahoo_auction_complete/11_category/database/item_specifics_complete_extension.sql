-- eBayカテゴリー自動判定システム - データベース拡張
-- Item Specifics完全対応 + セルリサーチ機能追加

-- Yahoo商品テーブル拡張（Item Specifics完全対応）
ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS complete_item_specifics TEXT,
ADD COLUMN IF NOT EXISTS item_specifics_json JSONB,
ADD COLUMN IF NOT EXISTS mirror_analysis_data JSONB,
ADD COLUMN IF NOT EXISTS risk_assessment VARCHAR(20),
ADD COLUMN IF NOT EXISTS suggested_price_min DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS suggested_price_max DECIMAL(10,2);

-- カテゴリー完全Item Specificsテーブル（Trading APIデータ）
CREATE TABLE IF NOT EXISTS ebay_category_complete_specifics (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('required', 'recommended', 'optional')),
    confidence_score INTEGER DEFAULT 0,
    possible_values JSONB,
    relationships JSONB,
    last_updated TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(category_id, field_name)
);

-- セルリサーチ履歴テーブル
CREATE TABLE IF NOT EXISTS cell_research_history (
    id SERIAL PRIMARY KEY,
    search_keyword VARCHAR(200) NOT NULL,
    category_id VARCHAR(20),
    total_sold INTEGER DEFAULT 0,
    average_price DECIMAL(10,2) DEFAULT 0,
    median_price DECIMAL(10,2) DEFAULT 0,
    price_min DECIMAL(10,2) DEFAULT 0,
    price_max DECIMAL(10,2) DEFAULT 0,
    top_performers JSONB,
    risk_level VARCHAR(10) DEFAULT 'UNKNOWN',
    analysis_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_search_keyword (search_keyword),
    INDEX idx_category_id (category_id),
    INDEX idx_created_at (created_at)
);

-- ミラー商品テンプレートテーブル
CREATE TABLE IF NOT EXISTS mirror_listing_templates (
    id SERIAL PRIMARY KEY,
    source_item_id VARCHAR(50) NOT NULL,
    category_id VARCHAR(20) NOT NULL,
    title VARCHAR(300),
    item_specifics TEXT,
    item_specifics_json JSONB,
    price DECIMAL(10,2),
    shipping_cost DECIMAL(10,2),
    listing_format VARCHAR(20),
    performance_score INTEGER DEFAULT 0,
    watchers_count INTEGER DEFAULT 0,
    sold_date TIMESTAMP,
    analysis_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(source_item_id)
);

-- Item Specifics使用統計テーブル
CREATE TABLE IF NOT EXISTS item_specifics_usage_stats (
    id SERIAL PRIMARY KEY,
    category_id VARCHAR(20) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_value VARCHAR(200) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    success_rate DECIMAL(5,2) DEFAULT 0,
    last_used TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(category_id, field_name, field_value)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_yahoo_complete_specifics ON yahoo_scraped_products(complete_item_specifics);
CREATE INDEX IF NOT EXISTS idx_yahoo_risk_assessment ON yahoo_scraped_products(risk_assessment);
CREATE INDEX IF NOT EXISTS idx_category_complete_specifics_category ON ebay_category_complete_specifics(category_id);
CREATE INDEX IF NOT EXISTS idx_category_complete_specifics_type ON ebay_category_complete_specifics(field_type);
CREATE INDEX IF NOT EXISTS idx_mirror_templates_category ON mirror_listing_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_mirror_templates_performance ON mirror_listing_templates(performance_score DESC);

-- サンプル完全Item Specificsデータ投入
INSERT INTO ebay_category_complete_specifics (category_id, field_name, field_type, confidence_score, possible_values) VALUES
-- Cell Phones (293) - 完全項目
('293', 'Brand', 'required', 95, '["Apple", "Samsung", "Google", "Sony", "LG", "Motorola", "OnePlus", "Xiaomi"]'),
('293', 'Model', 'required', 90, '[]'),
('293', 'Storage Capacity', 'required', 85, '["16 GB", "32 GB", "64 GB", "128 GB", "256 GB", "512 GB", "1 TB"]'),
('293', 'Color', 'required', 80, '["Black", "White", "Blue", "Red", "Gold", "Silver", "Gray", "Pink", "Green", "Purple"]'),
('293', 'Condition', 'required', 100, '["New", "Open box", "Used", "Refurbished", "For parts or not working"]'),
('293', 'Network', 'required', 75, '["Unlocked", "Verizon", "AT&T", "T-Mobile", "Sprint"]'),
('293', 'Operating System', 'recommended', 70, '["iOS", "Android", "Windows Phone", "Other"]'),
('293', 'Screen Size', 'recommended', 65, '["4.7 in", "5.5 in", "6.1 in", "6.7 in", "Other"]'),
('293', 'Features', 'optional', 50, '["Bluetooth", "Wi-Fi", "GPS", "NFC", "Wireless Charging"]'),
('293', 'Camera Resolution', 'optional', 45, '["12.0 MP", "48.0 MP", "64.0 MP", "108.0 MP"]'),

-- Cameras (625) - 完全項目
('625', 'Brand', 'required', 95, '["Canon", "Nikon", "Sony", "Fujifilm", "Olympus", "Panasonic", "Leica"]'),
('625', 'Type', 'required', 90, '["Digital SLR", "Mirrorless", "Point & Shoot", "Film SLR", "Instant"]'),
('625', 'Model', 'required', 85, '[]'),
('625', 'Condition', 'required', 100, '["New", "Used", "Refurbished", "For parts or not working"]'),
('625', 'Megapixels', 'recommended', 75, '["16.0 MP", "20.0 MP", "24.0 MP", "32.0 MP", "50.0 MP"]'),
('625', 'Optical Zoom', 'recommended', 70, '["No Zoom", "3x", "5x", "10x", "20x", "30x+"]'),
('625', 'Digital Zoom', 'optional', 50, '["2x", "4x", "8x", "12x"]'),
('625', 'Features', 'optional', 45, '["Wi-Fi", "Bluetooth", "GPS", "Image Stabilization"]'),

-- Trading Cards (58058, 183454, 888) - 完全項目
('58058', 'Sport', 'required', 95, '["Baseball", "Football", "Basketball", "Soccer", "Hockey", "Golf"]'),
('58058', 'League', 'required', 90, '["MLB", "NFL", "NBA", "MLS", "NHL", "PGA"]'),
('58058', 'Player', 'recommended', 85, '[]'),
('58058', 'Team', 'recommended', 80, '[]'),
('58058', 'Year', 'required', 88, '[]'),
('58058', 'Manufacturer', 'required', 82, '["Topps", "Panini", "Upper Deck", "Bowman", "Donruss"]'),
('58058', 'Condition', 'required', 100, '["Mint", "Near Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"]'),
('58058', 'Graded', 'recommended', 75, '["Yes", "No"]'),
('58058', 'Grade', 'optional', 60, '["PSA 10", "PSA 9", "BGS 9.5", "BGS 9", "SGC 10"]'),

('183454', 'Character', 'required', 90, '["Pikachu", "Charizard", "Mewtwo", "Lugia"]'),
('183454', 'Game', 'required', 85, '["Pokémon", "Yu-Gi-Oh!", "Magic: The Gathering", "Dragon Ball"]'),
('183454', 'Set', 'required', 80, '[]'),
('183454', 'Condition', 'required', 100, '["Mint", "Near Mint", "Lightly Played", "Moderately Played", "Heavily Played", "Damaged"]'),
('183454', 'Language', 'recommended', 75, '["English", "Japanese", "German", "French", "Spanish"]'),
('183454', 'Rarity', 'recommended', 70, '["Common", "Uncommon", "Rare", "Ultra Rare", "Secret Rare"]')

ON CONFLICT (category_id, field_name) DO UPDATE SET
    confidence_score = EXCLUDED.confidence_score,
    possible_values = EXCLUDED.possible_values,
    last_updated = NOW();

-- 使用統計サンプルデータ
INSERT INTO item_specifics_usage_stats (category_id, field_name, field_value, usage_count, success_rate) VALUES
('293', 'Brand', 'Apple', 1250, 87.5),
('293', 'Brand', 'Samsung', 890, 82.3),
('293', 'Storage Capacity', '128 GB', 950, 89.1),
('293', 'Color', 'Black', 780, 85.2),
('293', 'Condition', 'Used', 1100, 78.9),
('625', 'Brand', 'Canon', 450, 91.2),
('625', 'Type', 'Digital SLR', 380, 88.7),
('58058', 'Sport', 'Baseball', 320, 86.5),
('183454', 'Game', 'Pokémon', 280, 92.1)
ON CONFLICT (category_id, field_name, field_value) DO NOTHING;

-- 統計ビュー作成
CREATE OR REPLACE VIEW category_specifics_summary AS
SELECT 
    category_id,
    COUNT(*) as total_fields,
    COUNT(CASE WHEN field_type = 'required' THEN 1 END) as required_fields,
    COUNT(CASE WHEN field_type = 'recommended' THEN 1 END) as recommended_fields,
    COUNT(CASE WHEN field_type = 'optional' THEN 1 END) as optional_fields,
    AVG(confidence_score) as avg_confidence
FROM ebay_category_complete_specifics 
GROUP BY category_id;

-- セルリサーチ成功率ビュー
CREATE OR REPLACE VIEW cell_research_success_rate AS
SELECT 
    search_keyword,
    category_id,
    AVG(total_sold) as avg_sold,
    AVG(average_price) as avg_price,
    COUNT(*) as research_count,
    MAX(created_at) as last_research
FROM cell_research_history
GROUP BY search_keyword, category_id
HAVING COUNT(*) > 1;

-- 関数: Complete Item Specifics生成
CREATE OR REPLACE FUNCTION generate_complete_item_specifics(
    p_category_id VARCHAR(20),
    p_product_data JSONB
) RETURNS TEXT AS $$
DECLARE
    v_result TEXT := '';
    v_field RECORD;
    v_value TEXT;
BEGIN
    -- 必須項目から順番に処理
    FOR v_field IN 
        SELECT field_name, field_type, possible_values
        FROM ebay_category_complete_specifics 
        WHERE category_id = p_category_id
        ORDER BY 
            CASE field_type 
                WHEN 'required' THEN 1 
                WHEN 'recommended' THEN 2 
                ELSE 3 
            END,
            field_name
    LOOP
        -- 商品データから値を推定または取得
        v_value := COALESCE(
            p_product_data ->> v_field.field_name,
            'Unknown'
        );
        
        -- 結果文字列に追加
        IF v_result = '' THEN
            v_result := v_field.field_name || '=' || v_value;
        ELSE
            v_result := v_result || '■' || v_field.field_name || '=' || v_value;
        END IF;
    END LOOP;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 完了通知
DO $$
BEGIN
    RAISE NOTICE '=== Item Specifics完全対応 + セルリサーチ機能 拡張完了 ===';
    RAISE NOTICE 'Complete Item Specifics項目: % 件', (SELECT COUNT(*) FROM ebay_category_complete_specifics);
    RAISE NOTICE '対応カテゴリー数: % カテゴリー', (SELECT COUNT(DISTINCT category_id) FROM ebay_category_complete_specifics);
    RAISE NOTICE '機能追加完了日時: %', NOW();
    RAISE NOTICE '次のステップ: Trading API実装 + セルリサーチUI追加';
END $$;