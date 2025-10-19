-- 📋 商品HTMLテンプレート管理システム
-- 作成日: 2025-09-13
-- 目的: eBay出品用HTML説明文のテンプレート管理・データベース統合

-- HTMLテンプレート管理テーブル
CREATE TABLE IF NOT EXISTS product_html_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    template_description TEXT,
    html_content TEXT NOT NULL,
    css_styles TEXT,
    javascript_code TEXT,
    placeholder_fields JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system'
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_html_templates_category ON product_html_templates(category);
CREATE INDEX IF NOT EXISTS idx_html_templates_active ON product_html_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_html_templates_name ON product_html_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_html_templates_usage ON product_html_templates(usage_count DESC);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_html_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_html_template_timestamp ON product_html_templates;
CREATE TRIGGER trigger_update_html_template_timestamp
    BEFORE UPDATE ON product_html_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_html_template_timestamp();

-- 🎨 サンプルテンプレート挿入
INSERT INTO product_html_templates (template_name, category, template_description, html_content, placeholder_fields, css_styles) VALUES 
(
    'Japanese Premium Electronics Template',
    'electronics',
    '日本製エレクトロニクス向けの高品質HTMLテンプレート。信頼性と品質を強調。',
    '<div class="product-description-premium">
        <div class="header-section">
            <h2 class="product-title">{{TITLE}}</h2>
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
                <span>🇦🇺 Australia</span>
                <span>🇩🇪 Germany</span>
            </div>
        </div>
        
        <div class="guarantee-section">
            <h4>✅ Our Promise</h4>
            <ul>
                <li>🔍 Item exactly as described</li>
                <li>📦 Secure packaging</li>
                <li>🛡️ {{RETURN_POLICY}} return policy</li>
                <li>⭐ 5-star customer service</li>
            </ul>
        </div>
    </div>',
    '["TITLE", "FEATURE_1", "FEATURE_2", "FEATURE_3", "INCLUDED_ITEM_1", "INCLUDED_ITEM_2", "CONDITION", "BRAND", "MODEL", "YEAR", "RETURN_POLICY"]'::jsonb,
    '.product-description-premium {
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        border-radius: 15px;
        padding: 30px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .header-section {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #3498db;
    }
    .product-title {
        font-size: 28px;
        color: #2c3e50;
        margin-bottom: 15px;
        font-weight: 700;
    }
    .origin-badge {
        background: linear-gradient(45deg, #e74c3c, #c0392b);
        color: white;
        padding: 10px 25px;
        border-radius: 25px;
        font-weight: 600;
        display: inline-block;
    }
    .feature-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 25px;
        margin-bottom: 30px;
    }
    .feature-item {
        background: rgba(255,255,255,0.9);
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }
    .feature-item h4 {
        color: #2980b9;
        font-size: 18px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .feature-item ul {
        list-style: none;
        padding: 0;
    }
    .feature-item li {
        padding: 8px 0;
        border-bottom: 1px solid #ecf0f1;
        position: relative;
        padding-left: 25px;
    }
    .feature-item li:before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #27ae60;
        font-weight: bold;
    }
    .feature-item table {
        width: 100%;
        border-collapse: collapse;
    }
    .feature-item td {
        padding: 8px 0;
        border-bottom: 1px solid #ecf0f1;
    }
    .feature-item td:first-child {
        font-weight: 600;
        color: #34495e;
    }
    .shipping-section, .guarantee-section {
        background: rgba(255,255,255,0.95);
        padding: 25px;
        border-radius: 12px;
        margin-top: 20px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    }
    .shipping-countries {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 15px;
    }
    .shipping-countries span {
        background: #3498db;
        color: white;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
    }
    .guarantee-section ul {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px;
        list-style: none;
        padding: 0;
    }
    .guarantee-section li {
        background: #ecf8ff;
        padding: 12px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        font-weight: 500;
    }'
),
(
    'Simple Clean Template',
    'general',
    '汎用的なシンプルテンプレート。あらゆる商品カテゴリに使用可能。',
    '<div class="simple-product-desc">
        <h3>{{TITLE}}</h3>
        <p><strong>Condition:</strong> {{CONDITION}}</p>
        <p><strong>Description:</strong> {{DESCRIPTION}}</p>
        <p><strong>Brand:</strong> {{BRAND}}</p>
        
        <div class="shipping-info">
            <h4>Shipping Information</h4>
            <p>Ships from Japan with tracking. Delivery time: {{SHIPPING_DAYS}} days.</p>
        </div>
        
        <div class="return-policy">
            <h4>Return Policy</h4>
            <p>{{RETURN_POLICY}}</p>
        </div>
    </div>',
    '["TITLE", "CONDITION", "DESCRIPTION", "BRAND", "SHIPPING_DAYS", "RETURN_POLICY"]'::jsonb,
    '.simple-product-desc {
        max-width: 700px;
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        padding: 20px;
        background: #f9f9f9;
        border: 1px solid #ddd;
        border-radius: 8px;
    }
    .simple-product-desc h3 {
        color: #2c5aa0;
        border-bottom: 2px solid #2c5aa0;
        padding-bottom: 10px;
    }
    .simple-product-desc h4 {
        color: #2c5aa0;
        margin-top: 25px;
        margin-bottom: 10px;
    }
    .shipping-info, .return-policy {
        background: white;
        padding: 15px;
        margin-top: 15px;
        border-radius: 5px;
        border-left: 4px solid #2c5aa0;
    }'
),
(
    'Fashion & Apparel Template',
    'fashion',
    'ファッション・アパレル商品専用テンプレート。スタイルとブランドを重視。',
    '<div class="fashion-listing">
        <div class="brand-header">
            <h1 class="brand-title">{{BRAND}} - {{TITLE}}</h1>
            <div class="authenticity-badge">✨ Authentic Japanese Fashion</div>
        </div>
        
        <div class="product-showcase">
            <div class="size-chart">
                <h4>📏 Size Information</h4>
                <p>Size: {{SIZE}} | Condition: {{CONDITION}}</p>
            </div>
            
            <div class="style-details">
                <h4>👗 Style Details</h4>
                <ul>
                    <li>Color: {{COLOR}}</li>
                    <li>Material: {{MATERIAL}}</li>
                    <li>Season: {{SEASON}}</li>
                </ul>
            </div>
        </div>
        
        <div class="fashion-description">
            <p>{{DESCRIPTION}}</p>
        </div>
        
        <div class="care-instructions">
            <h4>🧺 Care Instructions</h4>
            <p>{{CARE_INSTRUCTIONS}}</p>
        </div>
    </div>',
    '["BRAND", "TITLE", "SIZE", "CONDITION", "COLOR", "MATERIAL", "SEASON", "DESCRIPTION", "CARE_INSTRUCTIONS"]'::jsonb,
    '.fashion-listing {
        max-width: 750px;
        margin: 0 auto;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 20px;
    }
    .brand-header {
        text-align: center;
        margin-bottom: 25px;
    }
    .brand-title {
        font-size: 32px;
        font-weight: 300;
        margin-bottom: 10px;
    }
    .authenticity-badge {
        background: rgba(255,255,255,0.2);
        padding: 8px 20px;
        border-radius: 25px;
        display: inline-block;
    }
    .product-showcase {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin: 25px 0;
    }
    .size-chart, .style-details {
        background: rgba(255,255,255,0.1);
        padding: 20px;
        border-radius: 15px;
    }
    .style-details ul {
        list-style: none;
        padding: 0;
    }
    .style-details li {
        padding: 5px 0;
    }'
);

-- テーブル作成確認
SELECT 'HTMLテンプレートテーブル作成完了' AS status;