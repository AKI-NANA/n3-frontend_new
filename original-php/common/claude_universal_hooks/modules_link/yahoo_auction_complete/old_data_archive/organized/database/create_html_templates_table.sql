-- HTMLテンプレート管理テーブル作成SQL
-- Yahoo Auction Tool 用
-- 実行日: 2025-09-13

-- 既存テーブル削除（安全な再作成）
DROP TABLE IF EXISTS product_html_templates CASCADE;

-- HTMLテンプレート管理テーブル作成
CREATE TABLE product_html_templates (
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
CREATE INDEX idx_html_templates_name ON product_html_templates(template_name);
CREATE INDEX idx_html_templates_category ON product_html_templates(category);
CREATE INDEX idx_html_templates_active ON product_html_templates(is_active);
CREATE INDEX idx_html_templates_usage ON product_html_templates(usage_count DESC);

-- サンプルテンプレート挿入
INSERT INTO product_html_templates (
    template_name, 
    category, 
    template_description,
    html_content, 
    placeholder_fields
) VALUES 
(
    'Basic eBay Template',
    'general',
    '基本的なeBay商品説明テンプレート',
    '<div class="product-listing">
        <h2 style="color: #0066cc;">{{TITLE}}</h2>
        <div style="font-size: 24px; color: #cc0000; font-weight: bold; margin: 15px 0;">
            Price: ${{PRICE}}
        </div>
        <div style="margin: 15px 0;">
            <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" style="max-width: 400px; height: auto;">
        </div>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <h3>Product Details</h3>
            <p><strong>Brand:</strong> {{BRAND}}</p>
            <p><strong>Condition:</strong> {{CONDITION}}</p>
            <p><strong>Description:</strong> {{DESCRIPTION}}</p>
        </div>
        <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <h3>🚚 Shipping Information</h3>
            <p>Ships from Japan with tracking. {{SHIPPING_INFO}}</p>
        </div>
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <h3>✅ Return Policy</h3>
            <p>{{RETURN_POLICY}} return policy for your peace of mind.</p>
        </div>
    </div>',
    '["TITLE", "PRICE", "MAIN_IMAGE", "BRAND", "CONDITION", "DESCRIPTION", "SHIPPING_INFO", "RETURN_POLICY"]'::jsonb
),
(
    'Premium Product Template',
    'electronics',
    'プレミアム商品用テンプレート（エレクトロニクス向け）',
    '<div style="max-width: 800px; margin: 0 auto; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 15px; padding: 30px; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; font-size: 28px; margin-bottom: 10px;">{{TITLE}}</h1>
            <div style="background: linear-gradient(45deg, #e74c3c, #c0392b); color: white; padding: 10px 25px; border-radius: 25px; display: inline-block; font-weight: 600;">
                🇯🇵 Authentic from Japan
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 30px;">
            <div style="background: rgba(255,255,255,0.9); padding: 20px; border-radius: 12px;">
                <h3 style="color: #2980b9; margin-bottom: 15px;">🔥 Highlights</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">✓ {{FEATURE_1}}</li>
                    <li style="padding: 8px 0; border-bottom: 1px solid #ecf0f1;">✓ {{FEATURE_2}}</li>
                    <li style="padding: 8px 0;">✓ {{FEATURE_3}}</li>
                </ul>
            </div>
            
            <div style="background: rgba(255,255,255,0.9); padding: 20px; border-radius: 12px;">
                <h3 style="color: #2980b9; margin-bottom: 15px;">💰 Price & Details</h3>
                <div style="font-size: 24px; color: #27ae60; font-weight: bold; margin-bottom: 15px;">
                    ${{PRICE}}
                </div>
                <table style="width: 100%;">
                    <tr><td><strong>Brand:</strong></td><td>{{BRAND}}</td></tr>
                    <tr><td><strong>Condition:</strong></td><td>{{CONDITION}}</td></tr>
                    <tr><td><strong>Model:</strong></td><td>{{MODEL_NUMBER}}</td></tr>
                </table>
            </div>
        </div>
        
        <div style="background: rgba(255,255,255,0.95); padding: 25px; border-radius: 12px; margin-bottom: 20px;">
            <h3 style="color: #2980b9; margin-bottom: 15px;">📦 What You Get</h3>
            <p>{{DESCRIPTION}}</p>
        </div>
        
        <div style="background: rgba(255,255,255,0.95); padding: 25px; border-radius: 12px;">
            <h3 style="color: #2980b9; margin-bottom: 15px;">🚚 Shipping & Returns</h3>
            <p><strong>Shipping:</strong> {{SHIPPING_INFO}}</p>
            <p><strong>Return Policy:</strong> {{RETURN_POLICY}}</p>
        </div>
    </div>',
    '["TITLE", "PRICE", "BRAND", "CONDITION", "MODEL_NUMBER", "DESCRIPTION", "FEATURE_1", "FEATURE_2", "FEATURE_3", "SHIPPING_INFO", "RETURN_POLICY"]'::jsonb
);

-- 動作確認用クエリ
-- SELECT template_name, category, array_length(placeholder_fields::json::text[]::text[], 1) as placeholder_count FROM product_html_templates;

-- 完了メッセージ
SELECT 'HTMLテンプレート管理テーブル作成完了' as status, COUNT(*) as sample_templates FROM product_html_templates;
