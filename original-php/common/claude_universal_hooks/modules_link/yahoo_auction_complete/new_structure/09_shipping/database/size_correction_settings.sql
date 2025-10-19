-- サイズ補正設定テーブル作成
CREATE TABLE IF NOT EXISTS size_correction_settings (
    id SERIAL PRIMARY KEY,
    setting_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    
    -- 重量補正設定
    weight_correction_type VARCHAR(20) DEFAULT 'percentage' CHECK (weight_correction_type IN ('percentage', 'fixed', 'formula')),
    weight_correction_value DECIMAL(10,3) DEFAULT 5.0,
    weight_min_correction DECIMAL(10,3) DEFAULT 0.05,
    weight_max_correction DECIMAL(10,3) DEFAULT 5.0,
    
    -- サイズ補正設定（各辺別）
    length_correction_type VARCHAR(20) DEFAULT 'percentage' CHECK (length_correction_type IN ('percentage', 'fixed', 'formula')),
    length_correction_value DECIMAL(10,3) DEFAULT 10.0,
    length_min_correction DECIMAL(10,3) DEFAULT 1.0,
    length_max_correction DECIMAL(10,3) DEFAULT 10.0,
    
    width_correction_type VARCHAR(20) DEFAULT 'percentage' CHECK (width_correction_type IN ('percentage', 'fixed', 'formula')),
    width_correction_value DECIMAL(10,3) DEFAULT 10.0,
    width_min_correction DECIMAL(10,3) DEFAULT 1.0,
    width_max_correction DECIMAL(10,3) DEFAULT 10.0,
    
    height_correction_type VARCHAR(20) DEFAULT 'percentage' CHECK (height_correction_type IN ('percentage', 'fixed', 'formula')),
    height_correction_value DECIMAL(10,3) DEFAULT 10.0,
    height_min_correction DECIMAL(10,3) DEFAULT 1.0,
    height_max_correction DECIMAL(10,3) DEFAULT 10.0,
    
    -- 一括サイズ補正設定
    uniform_size_correction BOOLEAN DEFAULT false,
    uniform_size_correction_type VARCHAR(20) DEFAULT 'percentage',
    uniform_size_correction_value DECIMAL(10,3) DEFAULT 10.0,
    
    -- カテゴリー・条件設定
    product_category VARCHAR(100),
    weight_range_min DECIMAL(10,3),
    weight_range_max DECIMAL(10,3),
    size_range_min DECIMAL(10,2),
    size_range_max DECIMAL(10,2),
    
    -- システム設定
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    priority_order INTEGER DEFAULT 0,
    
    -- メタデータ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100) DEFAULT 'system',
    notes TEXT
);

-- デフォルト設定を投入
INSERT INTO size_correction_settings (
    setting_name, description, is_default, is_active, priority_order,
    weight_correction_value, length_correction_value, width_correction_value, height_correction_value,
    notes
) VALUES 
('default_packaging', '標準梱包設定', true, true, 1,
 5.0, 10.0, 10.0, 10.0, 
 '重量5%増加、各辺10%増加の標準設定'),
 
('fragile_items', '壊れ物梱包設定', false, true, 2,
 8.0, 15.0, 15.0, 15.0, 
 '壊れ物用の厚めの梱包設定'),
 
('compact_items', 'コンパクト梱包設定', false, true, 3,
 3.0, 5.0, 5.0, 5.0, 
 '小物用のコンパクト梱包設定'),
 
('oversized_items', '大型商品梱包設定', false, true, 4,
 3.0, 8.0, 8.0, 12.0, 
 '大型商品用の梱包設定（高さ重視）');

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_size_correction_default ON size_correction_settings(is_default, is_active);
CREATE INDEX IF NOT EXISTS idx_size_correction_category ON size_correction_settings(product_category);
CREATE INDEX IF NOT EXISTS idx_size_correction_priority ON size_correction_settings(priority_order, is_active);

-- トリガー関数：更新日時自動設定
CREATE OR REPLACE FUNCTION update_size_correction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_size_correction_updated_at ON size_correction_settings;
CREATE TRIGGER trigger_size_correction_updated_at
    BEFORE UPDATE ON size_correction_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_size_correction_updated_at();

-- デフォルト設定確認用ビュー
CREATE OR REPLACE VIEW v_active_size_corrections AS
SELECT 
    id,
    setting_name,
    description,
    weight_correction_type,
    weight_correction_value,
    length_correction_type,
    length_correction_value,
    width_correction_type,
    width_correction_value,
    height_correction_type,
    height_correction_value,
    uniform_size_correction,
    uniform_size_correction_type,
    uniform_size_correction_value,
    product_category,
    is_default,
    priority_order,
    created_at,
    updated_at
FROM size_correction_settings 
WHERE is_active = true 
ORDER BY priority_order ASC, created_at ASC;
