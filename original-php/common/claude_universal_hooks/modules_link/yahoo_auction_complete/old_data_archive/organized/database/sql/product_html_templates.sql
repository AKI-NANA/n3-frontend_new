-- 📋 商品HTMLテンプレート管理システム
-- 作成日: 2025-09-13
-- 目的: eBay出品用HTML説明文のテンプレート管理

-- HTMLテンプレート管理テーブル
CREATE TABLE IF NOT EXISTS product_html_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'General',
    html_content TEXT NOT NULL,
    css_styles TEXT,
    javascript_code TEXT,
    placeholder_fields JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system',
    usage_count INTEGER DEFAULT 0
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_html_templates_category ON product_html_templates(category);
CREATE INDEX IF NOT EXISTS idx_html_templates_active ON product_html_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_html_templates_name ON product_html_templates(template_name);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_html_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_html_template_timestamp ON product_html_templates;
CREATE TRIGGER trigger_update_html_template_timestamp
    BEFORE UPDATE ON product_html_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_html_template_timestamp();

-- 🎨 デフォルトテンプレート挿入
INSERT INTO product_html_templates (template_name, category, html_content, placeholder_fields, css_styles) VALUES 
(
    'Japanese Premium Electronics Template',
    'Electronics',
    '
    <div class="product-description-premium">
        <div class="header-section">
            <h2 class="product-title">{{PRODUCT_NAME}}</h2>
            <div class="origin-badge">🇯🇵 Authentic from Japan</div>
        </div>
        
        <div class="feature-grid">
            <div class="feature-item">
                <h4>🔥 Product Highlights</h4>
                <ul>
                    <li>{{FEATURE_1}}</li>
                    <li>{{FEATURE_2}}</li>
                    <li>{{FEATURE_3}}</li>
                </ul>
            </div>
            
            <div class="feature-item">
                <h4>📦 What You Get</h4>
                <ul>
                    <li>{{INCLUDED_ITEM_1}}</li>
                    <li>{{INCLUDED_ITEM_2}}</li>
                    <li>Original packaging (if available)</li>
                </ul>
            </div>
            
            <div class="feature-item">
                <h4>🛠️ Product Details</h4>
                <table class="product-specs">
                    <tr><td>Condition:</td><td>{{CONDITION}}</td></tr>
                    <tr><td>Brand:</td><td>{{BRAND}}</td></tr>
                    <tr><td>Model:</td><td>{{MODEL}}</td></tr>
                    <tr><td>Year:</td><td>{{YEAR}}</td></tr>
                </table>
            </div>
        </div>
        
        <div class="shipping-section">
            <h4>🚚 International Shipping from Japan</h4>
            <p>Fast and secure shipping worldwide. Tracking included.</p>
            <div class="shipping-countries">
                <span>🇺🇸 USA</span>
                <span>🇨🇦 Canada</span>
                <span>🇬🇧 UK</span>
                <span>🇦