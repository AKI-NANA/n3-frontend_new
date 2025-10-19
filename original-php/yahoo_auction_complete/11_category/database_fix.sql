--
-- 11_category ツール用データベース修正SQL
-- 不足しているテーブルとカラムを追加
--

-- =============================================================================
-- 1. ebay_category_fees テーブルのカラム追加
-- =============================================================================

-- listing_type カラムが存在しない場合は追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'listing_type'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN listing_type VARCHAR(20) DEFAULT 'fixed_price';
    END IF;
END $$;

-- その他の不足カラムも追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'insertion_fee'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN insertion_fee DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'final_value_fee_max'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN final_value_fee_max DECIMAL(10,2);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'store_fee'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN store_fee DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'paypal_fee_percent'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN paypal_fee_percent DECIMAL(5,2) DEFAULT 2.90;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'paypal_fee_fixed'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN paypal_fee_fixed DECIMAL(5,2) DEFAULT 0.30;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ebay_category_fees' 
        AND column_name = 'fee_group'
    ) THEN
        ALTER TABLE ebay_category_fees 
        ADD COLUMN fee_group VARCHAR(100);
    END IF;
END $$;

-- =============================================================================
-- 2. category_required_fields テーブル作成（存在しない場合）
-- =============================================================================

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

-- 外部キー制約追加（ebay_categoriesテーブルが存在する場合）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ebay_categories') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_category_required_fields_category'
        ) THEN
            ALTER TABLE category_required_fields 
            ADD CONSTRAINT fk_category_required_fields_category 
            FOREIGN KEY (category_id) REFERENCES ebay_categories(category_id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- 3. 初期データ投入
-- =============================================================================

-- category_required_fields に初期データ投入（データが存在しない場合）
INSERT INTO category_required_fields (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order)
SELECT * FROM (VALUES
    -- スマートフォン (293)
    ('293', 'Brand', 'required', 'enum', ARRAY['Apple', 'Samsung', 'Google', 'Sony', 'Other'], 'Unknown', 1),
    ('293', 'Model', 'required', 'text', NULL, 'Unknown', 2),
    ('293', 'Storage Capacity', 'recommended', 'enum', ARRAY['16 GB', '32 GB', '64 GB', '128 GB', '256 GB', '512 GB', '1 TB'], 'Unknown', 3),
    ('293', 'Color', 'recommended', 'enum', ARRAY['Black', 'White', 'Blue', 'Red', 'Gold', 'Silver', 'Gray'], 'Unknown', 4),
    ('293', 'Condition', 'required', 'enum', ARRAY['New', 'Open box', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),
    ('293', 'Network', 'recommended', 'enum', ARRAY['Unlocked', 'Verizon', 'AT&T', 'T-Mobile', 'Other'], 'Unlocked', 6),
    ('293', 'Operating System', 'recommended', 'enum', ARRAY['iOS', 'Android', 'Windows Phone', 'Other'], 'Unknown', 7),

    -- カメラ (625)
    ('625', 'Brand', 'required', 'enum', ARRAY['Canon', 'Nikon', 'Sony', 'Fujifilm', 'Olympus', 'Other'], 'Unknown', 1),
    ('625', 'Type', 'required', 'enum', ARRAY['Digital SLR', 'Mirrorless', 'Point & Shoot', 'Film SLR'], 'Digital Camera', 2),
    ('625', 'Model', 'required', 'text', NULL, 'Unknown', 3),
    ('625', 'Condition', 'required', 'enum', ARRAY['New', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 5),

    -- ゲーム (139973)
    ('139973', 'Platform', 'required', 'enum', ARRAY['PlayStation 5', 'PlayStation 4', 'Nintendo Switch', 'Xbox Series X', 'Xbox One', 'PC'], 'Unknown', 1),
    ('139973', 'Genre', 'recommended', 'enum', ARRAY['Action', 'Adventure', 'RPG', 'Sports', 'Racing', 'Other'], 'Unknown', 2),
    ('139973', 'Condition', 'required', 'enum', ARRAY['New', 'Like New', 'Very Good', 'Good', 'Acceptable'], 'Used', 3),

    -- その他 (99999)
    ('99999', 'Brand', 'recommended', 'text', NULL, 'Unknown', 1),
    ('99999', 'Condition', 'required', 'enum', ARRAY['New', 'Used', 'Refurbished', 'For parts or not working'], 'Used', 3)
) AS new_data (category_id, field_name, field_type, field_data_type, possible_values, default_value, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM category_required_fields 
    WHERE category_id = new_data.category_id 
    AND field_name = new_data.field_name
);

-- ebay_category_fees に初期データ投入（データが存在しない場合）
INSERT INTO ebay_category_fees (category_id, listing_type, insertion_fee, final_value_fee_percent, fee_group, is_active)
SELECT * FROM (VALUES
    ('293', 'fixed_price', 0.30, 12.90, 'Electronics', true),
    ('625', 'fixed_price', 0.30, 12.35, 'Electronics', true),
    ('139973', 'fixed_price', 0.30, 13.25, 'Media', true),
    ('58058', 'fixed_price', 0.30, 13.25, 'Collectibles', true),
    ('99999', 'fixed_price', 0.30, 13.25, 'Other', true),
    ('293', 'auction', 0.00, 12.90, 'Electronics', true),
    ('625', 'auction', 0.00, 12.35, 'Electronics', true),
    ('139973', 'auction', 0.00, 13.25, 'Media', true)
) AS new_fee_data (category_id, listing_type, insertion_fee, final_value_fee_percent, fee_group, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM ebay_category_fees 
    WHERE category_id = new_fee_data.category_id 
    AND listing_type = new_fee_data.listing_type
);

-- =============================================================================
-- 4. インデックス作成
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_category_required_fields_category ON category_required_fields(category_id);
CREATE INDEX IF NOT EXISTS idx_category_required_fields_active ON category_required_fields(is_active);
CREATE INDEX IF NOT EXISTS idx_ebay_category_fees_category ON ebay_category_fees(category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_category_fees_active ON ebay_category_fees(is_active);

-- =============================================================================
-- 5. 完了メッセージ
-- =============================================================================

DO $$
DECLARE
    category_count integer;
    field_count integer;
    fee_count integer;
BEGIN
    SELECT COUNT(*) INTO category_count FROM ebay_categories WHERE is_active = true;
    SELECT COUNT(*) INTO field_count FROM category_required_fields WHERE is_active = true;
    SELECT COUNT(*) INTO fee_count FROM ebay_category_fees WHERE is_active = true;

    RAISE NOTICE '=== データベース修正完了 ===';
    RAISE NOTICE 'アクティブカテゴリー: %', category_count;
    RAISE NOTICE '必須項目数: %', field_count;
    RAISE NOTICE '手数料ルール: %', fee_count;
    RAISE NOTICE 'Category Manager Tool 使用準備完了！';
END $$;