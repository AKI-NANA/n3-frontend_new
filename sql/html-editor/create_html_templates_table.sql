-- ==========================================
-- HTMLテンプレート管理テーブル
-- 作成日: 2025-10-15
-- ==========================================

-- テーブル作成
CREATE TABLE IF NOT EXISTS html_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id VARCHAR(255) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    html_content TEXT NOT NULL,
    css_styles TEXT DEFAULT '',
    javascript_code TEXT DEFAULT '',
    placeholder_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'html_editor',
    
    -- インデックス
    CONSTRAINT html_templates_template_id_key UNIQUE (template_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_html_templates_template_id ON html_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_html_templates_category ON html_templates(category);
CREATE INDEX IF NOT EXISTS idx_html_templates_created_at ON html_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_html_templates_name ON html_templates(name);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_html_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_html_templates_updated_at
    BEFORE UPDATE ON html_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_html_templates_updated_at();

-- RLSポリシー（必要に応じて設定）
-- ALTER TABLE html_templates ENABLE ROW LEVEL SECURITY;

-- コメント追加
COMMENT ON TABLE html_templates IS '商品説明用HTMLテンプレート管理テーブル';
COMMENT ON COLUMN html_templates.id IS 'プライマリキー（UUID）';
COMMENT ON COLUMN html_templates.template_id IS 'テンプレート識別ID（ユニーク）';
COMMENT ON COLUMN html_templates.name IS 'テンプレート名';
COMMENT ON COLUMN html_templates.category IS 'カテゴリ（general, electronics, fashion, collectibles）';
COMMENT ON COLUMN html_templates.html_content IS 'HTMLコンテンツ本体';
COMMENT ON COLUMN html_templates.css_styles IS 'CSSスタイル（オプション）';
COMMENT ON COLUMN html_templates.javascript_code IS 'JavaScriptコード（オプション）';
COMMENT ON COLUMN html_templates.placeholder_fields IS 'プレースホルダーフィールド一覧（JSON配列）';
COMMENT ON COLUMN html_templates.created_at IS '作成日時';
COMMENT ON COLUMN html_templates.updated_at IS '更新日時';
COMMENT ON COLUMN html_templates.created_by IS '作成者';

-- サンプルデータ挿入（開発用）
INSERT INTO html_templates (
    template_id,
    name,
    category,
    html_content,
    placeholder_fields
) VALUES 
(
    'sample-basic-template',
    'Basic Product Template',
    'general',
    '<div class="product-description">
    <h2>{{TITLE}}</h2>
    <div class="price">${{PRICE}}</div>
    <div class="brand">Brand: {{BRAND}}</div>
    <div class="condition">Condition: {{CONDITION}}</div>
    <div class="description">{{DESCRIPTION}}</div>
    <div class="shipping">{{SHIPPING_INFO}}</div>
</div>',
    '["{{TITLE}}", "{{PRICE}}", "{{BRAND}}", "{{CONDITION}}", "{{DESCRIPTION}}", "{{SHIPPING_INFO}}"]'::jsonb
),
(
    'sample-electronics-template',
    'Electronics Product Template',
    'electronics',
    '<div class="electronics-product">
    <h1 style="color: #2563eb; font-size: 2rem; margin-bottom: 1rem;">{{TITLE}}</h1>
    <div style="font-size: 1.5rem; font-weight: bold; color: #059669; margin-bottom: 1rem;">${{PRICE}}</div>
    <div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
        <h3>Specifications</h3>
        <p>{{SPECIFICATIONS}}</p>
    </div>
    <div style="margin-bottom: 1rem;">
        <h3>Features</h3>
        <p>{{FEATURES}}</p>
    </div>
    <div style="margin-bottom: 1rem;">
        <h3>Description</h3>
        <p>{{DESCRIPTION}}</p>
    </div>
    <div style="background: #e0f2fe; padding: 1rem; border-radius: 0.5rem;">
        <h3>Shipping & Returns</h3>
        <p><strong>Shipping:</strong> {{SHIPPING_INFO}}</p>
        <p><strong>Returns:</strong> {{RETURN_POLICY}}</p>
    </div>
</div>',
    '["{{TITLE}}", "{{PRICE}}", "{{SPECIFICATIONS}}", "{{FEATURES}}", "{{DESCRIPTION}}", "{{SHIPPING_INFO}}", "{{RETURN_POLICY}}"]'::jsonb
)
ON CONFLICT (template_id) DO NOTHING;

-- 完了メッセージ
SELECT 
    'html_templates table created successfully' as status,
    COUNT(*) as sample_records 
FROM html_templates;
