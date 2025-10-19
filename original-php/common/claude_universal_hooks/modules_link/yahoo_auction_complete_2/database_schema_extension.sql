-- eBay出品準備用拡張テーブル
CREATE TABLE IF NOT EXISTS ebay_listing_preparation (
    id SERIAL PRIMARY KEY,
    source_item_id VARCHAR REFERENCES mystical_japan_treasures_inventory(item_id),
    
    -- eBay最適化基本情報
    ebay_optimized_title VARCHAR(80), -- eBay文字制限対応
    ebay_category_id INTEGER,
    ebay_secondary_category INTEGER,
    
    -- 商品詳細 (Item Specifics)
    brand VARCHAR(100),
    manufacturer_part_number VARCHAR(100),
    upc VARCHAR(20),
    ean VARCHAR(20),
    isbn VARCHAR(20),
    item_type VARCHAR(100),
    color VARCHAR(50),
    size VARCHAR(50),
    material VARCHAR(100),
    style VARCHAR(100),
    
    -- 配送情報 (必須)
    weight_lbs INTEGER DEFAULT 0,
    weight_oz INTEGER DEFAULT 0,
    weight_unit VARCHAR(10) DEFAULT 'lbs',
    length_inch DECIMAL(10,2),
    width_inch DECIMAL(10,2),
    height_inch DECIMAL(10,2),
    dimension_unit VARCHAR(10) DEFAULT 'inch',
    package_type VARCHAR(50) DEFAULT 'PackageThickEnvelope',
    
    -- 価格・出品設定
    calculated_shipping_cost DECIMAL(10,2),
    profit_margin DECIMAL(5,2),
    ebay_fees DECIMAL(10,2),
    final_price DECIMAL(10,2),
    shipping_policy_id VARCHAR(100),
    listing_duration INTEGER DEFAULT 7,
    quantity INTEGER DEFAULT 1,
    
    -- 拡張データ (JSON形式)
    item_specifics JSONB, -- 柔軟なItem Specifics
    dimensions JSONB, -- {length:21.5, width:15.0, height:12.0, unit:"INCH"}
    listing_template JSONB, -- eBay出品テンプレート
    calculation_data JSONB, -- 送料計算結果
    
    -- ステータス管理
    status VARCHAR(20) DEFAULT 'draft', -- draft/ready/listed/error
    processing_notes TEXT,
    ebay_item_id VARCHAR(50), -- 出品後のeBay ID
    
    -- システム管理
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(source_item_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_prep_status ON ebay_listing_preparation(status);
CREATE INDEX IF NOT EXISTS idx_ebay_prep_category ON ebay_listing_preparation(ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_ebay_prep_updated ON ebay_listing_preparation(updated_at);

-- 更新トリガー
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ebay_prep_modified ON ebay_listing_preparation;
CREATE TRIGGER update_ebay_prep_modified 
    BEFORE UPDATE ON ebay_listing_preparation 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
