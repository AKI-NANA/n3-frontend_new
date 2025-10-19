-- HTMLテンプレート管理テーブル作成SQL
-- エラー修正用：テーブルが存在しない場合の解決

CREATE TABLE IF NOT EXISTS product_html_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    template_description TEXT,
    html_content TEXT NOT NULL,
    css_styles TEXT,
    javascript_code TEXT,
    placeholder_fields JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_html_templates_category ON product_html_templates(category);
CREATE INDEX IF NOT EXISTS idx_html_templates_active ON product_html_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_html_templates_usage ON product_html_templates(usage_count DESC);

-- サンプルテンプレート挿入
INSERT INTO product_html_templates (template_name, category, template_description, html_content, placeholder_fields) VALUES 
(
    'Basic Product Template',
    'general',
    '基本的な商品説明テンプレート',
    '<div class="product-description">
        <h2>{{TITLE}}</h2>
        <div class="price">${{PRICE}}</div>
        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" style="max-width: 400px;">
        <p><strong>Brand:</strong> {{BRAND}}</p>
        <p><strong>Condition:</strong> {{CONDITION}}</p>
        <div class="description">{{DESCRIPTION}}</div>
        <div class="shipping-info">{{SHIPPING_INFO}}</div>
        <div class="return-policy">Return Policy: {{RETURN_POLICY}}</div>
    </div>',
    '["TITLE", "PRICE", "MAIN_IMAGE", "BRAND", "CONDITION", "DESCRIPTION", "SHIPPING_INFO", "RETURN_POLICY"]'::jsonb
) ON CONFLICT (template_name) DO NOTHING;

-- テーブル作成確認
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'product_html_templates';

-- データ確認
SELECT 
    template_id,
    template_name,
    category,
    placeholder_fields,
    created_at
FROM product_html_templates;
