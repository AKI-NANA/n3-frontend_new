-- ======================================
-- 棚卸しシステム Supabase スキーマ
-- ======================================

-- カスタム型定義
CREATE TYPE inventory_type AS ENUM ('stock', 'dropship', 'set', 'hybrid');
CREATE TYPE change_type AS ENUM ('sale', 'import', 'manual', 'adjustment', 'set_sale');

-- 1. 棚卸しマスターテーブル
CREATE TABLE inventory_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unique_id TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    sku TEXT,
    product_type inventory_type NOT NULL DEFAULT 'stock',
    physical_quantity INTEGER DEFAULT 0,
    listing_quantity INTEGER DEFAULT 0,
    cost_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    condition_name TEXT DEFAULT 'used',
    category TEXT DEFAULT 'Electronics',
    subcategory TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    source_data JSONB DEFAULT '{}'::jsonb,
    is_manual_entry BOOLEAN DEFAULT FALSE,
    priority_score INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. セット品構成テーブル
CREATE TABLE set_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    quantity_required INTEGER NOT NULL CHECK (quantity_required > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(set_product_id, component_product_id)
);

-- 3. 在庫変更履歴
CREATE TABLE inventory_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    change_type change_type NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    source TEXT DEFAULT 'manual',
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_inventory_unique_id ON inventory_master(unique_id);
CREATE INDEX idx_inventory_product_type ON inventory_master(product_type);
CREATE INDEX idx_inventory_category ON inventory_master(category);
CREATE INDEX idx_inventory_updated_at ON inventory_master(updated_at);
CREATE INDEX idx_inventory_sku ON inventory_master(sku);

CREATE INDEX idx_set_components_set_id ON set_components(set_product_id);
CREATE INDEX idx_set_components_component_id ON set_components(component_product_id);

CREATE INDEX idx_changes_product_id ON inventory_changes(product_id);
CREATE INDEX idx_changes_created_at ON inventory_changes(created_at);

-- Row Level Security (RLS) 設定
ALTER TABLE inventory_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーのみアクセス可能
CREATE POLICY "認証ユーザーのみアクセス" ON inventory_master
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "認証ユーザーのみアクセス" ON set_components
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "認証ユーザーのみアクセス" ON inventory_changes
    FOR ALL USING (auth.role() = 'authenticated');

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_master_updated_at
    BEFORE UPDATE ON inventory_master
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- セット品在庫計算関数
CREATE OR REPLACE FUNCTION calculate_set_available_quantity(set_id UUID)
RETURNS INTEGER AS $$
DECLARE
    min_available INTEGER := 999999;
    component_record RECORD;
BEGIN
    FOR component_record IN
        SELECT 
            im.physical_quantity,
            sc.quantity_required
        FROM set_components sc
        JOIN inventory_master im ON sc.component_product_id = im.id
        WHERE sc.set_product_id = set_id
    LOOP
        min_available := LEAST(min_available, 
            FLOOR(component_record.physical_quantity / component_record.quantity_required));
    END LOOP;
    
    IF min_available = 999999 THEN
        RETURN 0;
    END IF;
    
    RETURN min_available;
END;
$$ LANGUAGE plpgsql;

-- サンプルデータ投入
INSERT INTO inventory_master (unique_id, product_name, sku, product_type, physical_quantity, listing_quantity, cost_price, selling_price, category, is_manual_entry) VALUES
('ITEM-001', 'iPhone 14 Pro Max 256GB', 'APL-IP14PM-256', 'stock', 5, 3, 800.00, 1200.00, 'Electronics', false),
('ITEM-002', 'MacBook Air M2', 'APL-MBA-M2', 'stock', 2, 1, 1000.00, 1500.00, 'Electronics', false),
('ITEM-003', 'AirPods Pro 2nd Gen', 'APL-APP-2ND', 'stock', 10, 8, 180.00, 280.00, 'Electronics', false),
('ITEM-004', 'Apple Watch Series 9', 'APL-AWS-S9', 'stock', 3, 2, 300.00, 450.00, 'Electronics', false),
('SET-001', 'Apple Bundle Set', 'SET-APPLE-01', 'set', 0, 0, 0.00, 1800.00, 'Electronics', true);

-- セット品構成データ
INSERT INTO set_components (set_product_id, component_product_id, quantity_required) VALUES
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 1),
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-003'), 1);