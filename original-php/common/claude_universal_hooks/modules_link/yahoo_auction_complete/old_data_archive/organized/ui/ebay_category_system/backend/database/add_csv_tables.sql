--
-- CSV処理用テーブル追加
-- processed_productsテーブルとrelated機能を追加
--

-- 処理済み商品データテーブル
CREATE TABLE IF NOT EXISTS processed_products (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50),
    original_title TEXT NOT NULL,
    original_price DECIMAL(12,2) CHECK (original_price >= 0),
    original_description TEXT,
    yahoo_category VARCHAR(200),
    image_url TEXT,
    
    -- カテゴリー判定結果
    detected_category_id VARCHAR(20),
    category_confidence INTEGER CHECK (category_confidence >= 0 AND category_confidence <= 100),
    matched_keywords TEXT[],
    
    -- Item Specifics
    item_specifics TEXT,
    item_specifics_json JSONB,
    
    -- ステータス管理
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'review_required', 'exported')),
    processing_notes TEXT,
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    processed_by VARCHAR(100) DEFAULT 'system'
);

-- 必須項目テーブル（CSV処理で参照される）
CREATE TABLE IF NOT EXISTS category_required_fields (
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
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 外部キー制約追加（エラー回避のため後から）
DO $$
BEGIN
    -- processed_products の外部キー制約
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_processed_products_category'
    ) THEN
        ALTER TABLE processed_products 
        ADD CONSTRAINT fk_processed_products_category 
        FOREIGN KEY (detected_category_id) REFERENCES ebay_categories(category_id);
    END IF;
    
    -- category_required_fields の外部キー制約
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_category_required_fields_category'
    ) THEN
        ALTER TABLE category_required_fields 
        ADD CONSTRAINT fk_category_required_fields_category 
        FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id);
    END IF;
END $$;

-- スマートフォンカテゴリーの必須項目データ追加
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order) VALUES
('293', 'Brand', 'required', 'enum', ARRAY['Apple', 'Samsung', 'Google', 'Sony', 'Other'], 'Unknown', 1),
('293', 'Model', 'required', 'text', NULL, 'Unknown', 2),
('293', 'Storage Capacity', 'recommended', 'enum', ARRAY['64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], 'Unknown', 3),
('293', 'Color', 'recommended', 'enum', ARRAY['Black', 'White', 'Blue', 'Red', 'Gold', 'Silver', 'Gray'], 'Unknown', 4),
('293', 'Condition', 'required', 'enum', ARRAY['New', 'Open box', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),
('293', 'Network', 'recommended', 'enum', ARRAY['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Other'], 'Unlocked', 6),
('293', 'Operating System', 'recommended', 'enum', ARRAY['iOS', 'Android', 'Other'], 'Unknown', 7)

ON CONFLICT (category_id, field_name) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_processed_products_category ON processed_products(detected_category_id);
CREATE INDEX IF NOT EXISTS idx_processed_products_status ON processed_products(status);
CREATE INDEX IF NOT EXISTS idx_processed_products_created ON processed_products(created_at);
CREATE INDEX IF NOT EXISTS idx_category_required_fields_category ON category_required_fields(category_id);

-- バッチID生成関数
CREATE OR REPLACE FUNCTION generate_batch_id() RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN 'BATCH_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || '_' || 
           LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 完了メッセージ
DO $$
DECLARE
    processed_count integer;
    required_fields_count integer;
BEGIN
    SELECT COUNT(*) INTO processed_count FROM processed_products;
    SELECT COUNT(*) INTO required_fields_count FROM category_required_fields;

    RAISE NOTICE '=== CSV処理用テーブル追加完了 ===';
    RAISE NOTICE 'processed_products テーブル: 作成済み (現在%件)', processed_count;
    RAISE NOTICE 'category_required_fields テーブル: 作成済み (現在%件)', required_fields_count;
    RAISE NOTICE 'CSV一括処理機能が使用可能になりました！';
END $$;