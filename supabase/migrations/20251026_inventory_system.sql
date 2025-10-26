-- ======================================
-- 棚卸しシステム Supabase マイグレーション
-- 作成日: 2025-10-26
-- ======================================

-- カスタム型定義
CREATE TYPE inventory_type AS ENUM ('stock', 'dropship', 'set', 'hybrid');
CREATE TYPE change_type AS ENUM ('sale', 'import', 'manual', 'adjustment', 'set_sale');

-- 1. 棚卸しマスターテーブル
CREATE TABLE IF NOT EXISTS inventory_master (
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
    supplier_info JSONB DEFAULT '{}'::jsonb,
    is_manual_entry BOOLEAN DEFAULT FALSE,
    priority_score INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. セット品構成テーブル
CREATE TABLE IF NOT EXISTS set_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES inventory_master(id) ON DELETE CASCADE,
    quantity_required INTEGER NOT NULL CHECK (quantity_required > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(set_product_id, component_product_id)
);

-- 3. 在庫変更履歴
CREATE TABLE IF NOT EXISTS inventory_changes (
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
CREATE INDEX IF NOT EXISTS idx_inventory_unique_id ON inventory_master(unique_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_type ON inventory_master(product_type);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_master(category);
CREATE INDEX IF NOT EXISTS idx_inventory_updated_at ON inventory_master(updated_at);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_master(sku);

CREATE INDEX IF NOT EXISTS idx_set_components_set_id ON set_components(set_product_id);
CREATE INDEX IF NOT EXISTS idx_set_components_component_id ON set_components(component_product_id);

CREATE INDEX IF NOT EXISTS idx_changes_product_id ON inventory_changes(product_id);
CREATE INDEX IF NOT EXISTS idx_changes_type ON inventory_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_changes_created_at ON inventory_changes(created_at);

-- Row Level Security (RLS) 設定
ALTER TABLE inventory_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがアクセス可能（認証なしでも動作）
CREATE POLICY "全ユーザーがアクセス可能" ON inventory_master
    FOR ALL USING (true);

CREATE POLICY "全ユーザーがアクセス可能" ON set_components
    FOR ALL USING (true);

CREATE POLICY "全ユーザーがアクセス可能" ON inventory_changes
    FOR ALL USING (true);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
INSERT INTO inventory_master (unique_id, product_name, sku, product_type, physical_quantity, listing_quantity, cost_price, selling_price, category, is_manual_entry, images) VALUES
('ITEM-001', 'iPhone 14 Pro Max 256GB', 'APL-IP14PM-256', 'stock', 5, 3, 800.00, 1200.00, 'Electronics', false, '["https://placehold.co/400x400/3b82f6/ffffff?text=iPhone+14"]'::jsonb),
('ITEM-002', 'MacBook Air M2', 'APL-MBA-M2', 'stock', 2, 1, 1000.00, 1500.00, 'Electronics', false, '["https://placehold.co/400x400/10b981/ffffff?text=MacBook"]'::jsonb),
('ITEM-003', 'AirPods Pro 2nd Gen', 'APL-APP-2ND', 'stock', 10, 8, 180.00, 280.00, 'Electronics', false, '["https://placehold.co/400x400/f59e0b/ffffff?text=AirPods"]'::jsonb),
('ITEM-004', 'Apple Watch Series 9', 'APL-AWS-S9', 'stock', 3, 2, 300.00, 450.00, 'Electronics', false, '["https://placehold.co/400x400/ef4444/ffffff?text=Watch"]'::jsonb),
('ITEM-005', 'iPad Air 5th Gen', 'APL-IPAD-AIR5', 'stock', 7, 5, 500.00, 750.00, 'Electronics', false, '["https://placehold.co/400x400/8b5cf6/ffffff?text=iPad"]'::jsonb),
('ITEM-006', 'Sony WH-1000XM5', 'SONY-WH1000XM5', 'dropship', 0, 0, 250.00, 380.00, 'Electronics', false, '["https://placehold.co/400x400/06b6d4/ffffff?text=Sony"]'::jsonb),
('SET-001', 'Apple Bundle Set', 'SET-APPLE-01', 'set', 0, 0, 0.00, 1800.00, 'Electronics', true, '["https://placehold.co/400x400/ec4899/ffffff?text=Bundle"]'::jsonb);

-- セット品構成データ
INSERT INTO set_components (set_product_id, component_product_id, quantity_required) VALUES
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 1),
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-003'), 1),
((SELECT id FROM inventory_master WHERE unique_id = 'SET-001'), (SELECT id FROM inventory_master WHERE unique_id = 'ITEM-004'), 1);

-- 在庫変更履歴サンプル
INSERT INTO inventory_changes (product_id, change_type, quantity_before, quantity_after, source, notes) VALUES
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'import', 0, 10, 'manual', '初回仕入れ'),
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'sale', 10, 9, 'ebay_order_12345', 'eBay受注'),
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'sale', 9, 8, 'ebay_order_12346', 'eBay受注'),
((SELECT id FROM inventory_master WHERE unique_id = 'ITEM-001'), 'adjustment', 8, 5, 'manual', '棚卸し調整');
