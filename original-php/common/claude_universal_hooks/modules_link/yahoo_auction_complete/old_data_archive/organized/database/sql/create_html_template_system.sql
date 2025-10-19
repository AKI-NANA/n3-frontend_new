-- 📊 HTMLテンプレート管理システム - データベース構築
-- 作成日: 2025-09-13
-- 目的: CSV出品時にHTMLテンプレートとデータを統合するシステム

-- HTMLテンプレート管理テーブル
CREATE TABLE IF NOT EXISTS product_html_templates (
    template_id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) DEFAULT 'general',
    display_name VARCHAR(200),
    description TEXT,
    html_content TEXT NOT NULL,
    css_styles TEXT,
    javascript_code TEXT,
    placeholder_fields JSONB DEFAULT '[]'::jsonb,
    sample_data JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50) DEFAULT 'system'
);

-- テンプレート利用統計テーブル
CREATE TABLE IF NOT EXISTS html_template_usage_stats (
    id SERIAL PRIMARY KEY,
    template_id INTEGER REFERENCES product_html_templates(template_id) ON DELETE CASCADE,
    used_for_csv_file VARCHAR(255),
    used_at TIMESTAMP DEFAULT NOW(),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    item_count INTEGER DEFAULT 0
);

-- CSV項目ドキュメンテーション
CREATE TABLE IF NOT EXISTS csv_field_documentation (
    field_id SERIAL PRIMARY KEY,
    field_name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(200),
    description TEXT,
    data_type VARCHAR(50) DEFAULT 'text',
    is_required BOOLEAN DEFAULT FALSE,
    default_value TEXT,
    validation_rules TEXT,
    example_value TEXT,
    category VARCHAR(50) DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_html_templates_category ON product_html_templates(category);
CREATE INDEX IF NOT EXISTS idx_html_templates_active ON product_html_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_html_templates_name ON product_html_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_html_usage_template ON html_template_usage_stats(template_id);
CREATE INDEX IF NOT EXISTS idx_csv_fields_name ON csv_field_documentation(field_name);
CREATE INDEX IF NOT EXISTS idx_csv_fields_category ON csv_field_documentation(category);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_template_timestamp()
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
    EXECUTE FUNCTION update_template_timestamp();

DROP TRIGGER IF EXISTS trigger_update_csv_field_timestamp ON csv_field_documentation;
CREATE TRIGGER trigger_update_csv_field_timestamp
    BEFORE UPDATE ON csv_field_documentation
    FOR EACH ROW
    EXECUTE FUNCTION update_template_timestamp();

-- 🎨 デフォルトテンプレート挿入
INSERT INTO product_html_templates (template_name, category, display_name, description, html_content, css_styles, placeholder_fields, sample_data) VALUES 
(
    'premium_japanese_template',
    'electronics',
    'プレミアム日本商品テンプレート',
    '日本商品専用・高級感・画像重視・詳細仕様表',
    '
    <div class="ebay-premium-japanese">
        <div class="product-header">
            <h1 class="product-title">{{TITLE}}</h1>
            <div class="origin-badge">🇯🇵 Authentic from Japan</div>
            <div class="brand-badge">{{BRAND}}</div>
        </div>
        
        <div class="product-gallery">
            <div class="main-image">
                {{MAIN_IMAGE}}
            </div>
            <div class="additional-images">
                {{ADDITIONAL_IMAGES}}
            </div>
        </div>
        
        <div class="product-details">
            <div class="price-condition-section">
                <div class="price-display">{{PRICE}}</div>
                <div class="condition-badge">{{CONDITION}}</div>
            </div>
            
            <div class="product-description">
                <h3>📋 商品説明</h3>
                <div class="description-content">{{DESCRIPTION}}</div>
            </div>
            
            <div class="specifications-table">
                <h3>⚙️ 商品仕様</h3>
                <table class="spec-table">
                    {{SPECIFICATIONS_TABLE}}
                </table>
            </div>
        </div>
        
        <div class="shipping-warranty">
            <div class="shipping-section">
                <h3>🚚 配送情報</h3>
                <div class="shipping-details">{{SHIPPING_INFO}}</div>
            </div>
            
            <div class="warranty-section">
                <h3>🛡️ 保証・返品</h3>
                <div class="warranty-details">{{WARRANTY_INFO}}</div>
            </div>
        </div>
        
        <div class="seller-section">
            <h3>⭐ 販売者情報</h3>
            <div class="seller-info">{{SELLER_INFO}}</div>
        </div>
    </div>',
    '.ebay-premium-japanese { max-width: 800px; margin: 0 auto; padding: 30px; font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); } .product-header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3498db; } .product-title { font-size: 28px; color: #2c3e50; margin-bottom: 15px; font-weight: 700; } .origin-badge { background: linear-gradient(45deg, #e74c3c, #c0392b); color: white; padding: 8px 20px; border-radius: 25px; font-weight: 600; display: inline-block; margin: 0 10px; } .brand-badge { background: #3498db; color: white; padding: 8px 20px; border-radius: 25px; font-weight: 600; display: inline-block; } .product-gallery { text-align: center; margin-bottom: 30px; } .price-display { font-size: 36px; font-weight: 700; color: #27ae60; text-align: center; margin-bottom: 15px; } .condition-badge { background: #f39c12; color: white; padding: 8px 15px; border-radius: 20px; display: inline-block; font-weight: 600; } .product-description, .specifications-table, .shipping-section, .warranty-section, .seller-section { background: rgba(255,255,255,0.9); padding: 20px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); } .spec-table { width: 100%; border-collapse: collapse; } .spec-table td { padding: 10px; border-bottom: 1px solid #ecf0f1; } .spec-table td:first-child { font-weight: 600; color: #34495e; width: 30%; } h3 { color: #2980b9; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }',
    '["TITLE", "BRAND", "PRICE", "CONDITION", "DESCRIPTION", "MAIN_IMAGE", "ADDITIONAL_IMAGES", "SPECIFICATIONS_TABLE", "SHIPPING_INFO", "WARRANTY_INFO", "SELLER_INFO"]'::jsonb,
    '{"TITLE": "Canon EOS R5 Mirrorless Camera", "BRAND": "Canon", "PRICE": "$3,899.00", "CONDITION": "New - Never Used", "DESCRIPTION": "Professional-grade mirrorless camera with 45MP full-frame sensor", "MAIN_IMAGE": "<img src=\"https://via.placeholder.com/500x400\" alt=\"Canon EOS R5\">", "ADDITIONAL_IMAGES": "<img src=\"https://via.placeholder.com/200x150\" alt=\"View 2\">", "SPECIFICATIONS_TABLE": "<tr><td>Sensor</td><td>45MP Full-Frame CMOS</td></tr><tr><td>Video</td><td>8K RAW Recording</td></tr>", "SHIPPING_INFO": "Free worldwide shipping from Japan with tracking", "WARRANTY_INFO": "1-year international warranty included", "SELLER_INFO": "Professional camera dealer with 99.8% positive feedback"}'::jsonb
),
(
    'standard_clean_template',
    'general',
    'スタンダードクリーンテンプレート',
    '一般商品・シンプル・読みやすい',
    '
    <div class="ebay-standard-clean">
        <h1 class="title">{{TITLE}}</h1>
        
        <div class="main-content">
            <div class="image-section">
                {{MAIN_IMAGE}}
                <div class="gallery">{{ADDITIONAL_IMAGES}}</div>
            </div>
            
            <div class="info-section">
                <div class="price-condition">
                    <span class="price">{{PRICE}}</span>
                    <span class="condition">{{CONDITION}}</span>
                </div>
                
                <div class="description">
                    <h3>商品説明</h3>
                    <p>{{DESCRIPTION}}</p>
                </div>
                
                <div class="specifications">
                    <h3>仕様</h3>
                    {{SPECIFICATIONS_TABLE}}
                </div>
            </div>
        </div>
        
        <div class="shipping-info">
            <h3>配送・返品</h3>
            <p>{{SHIPPING_INFO}}</p>
            <p>{{WARRANTY_INFO}}</p>
        </div>
    </div>',
    '.ebay-standard-clean { max-width: 700px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; } .title { font-size: 24px; color: #333; margin-bottom: 20px; text-align: center; } .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px; } .price { font-size: 28px; font-weight: bold; color: #0066cc; } .condition { background: #f0f0f0; padding: 5px 10px; border-radius: 5px; margin-left: 15px; } .description, .specifications, .shipping-info { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; } h3 { color: #333; margin-bottom: 10px; font-size: 16px; }',
    '["TITLE", "PRICE", "CONDITION", "DESCRIPTION", "MAIN_IMAGE", "ADDITIONAL_IMAGES", "SPECIFICATIONS_TABLE", "SHIPPING_INFO", "WARRANTY_INFO"]'::jsonb,
    '{"TITLE": "Sample Product Title", "PRICE": "$199.99", "CONDITION": "Used - Good", "DESCRIPTION": "Product description text here", "MAIN_IMAGE": "<img src=\"https://via.placeholder.com/300x250\" alt=\"Product\">", "ADDITIONAL_IMAGES": "", "SPECIFICATIONS_TABLE": "<ul><li>Feature 1</li><li>Feature 2</li></ul>", "SHIPPING_INFO": "Standard shipping available", "WARRANTY_INFO": "30-day return policy"}'::jsonb
),
(
    'minimal_mobile_template',
    'mobile',
    'ミニマル・モバイル対応テンプレート',
    'シンプル・高速・モバイル最適化',
    '
    <div class="ebay-minimal-mobile">
        <h1>{{TITLE}}</h1>
        <div class="price">{{PRICE}}</div>
        <div class="condition">{{CONDITION}}</div>
        
        <div class="images">{{MAIN_IMAGE}}</div>
        
        <div class="description">
            <h3>Description</h3>
            <p>{{DESCRIPTION}}</p>
        </div>
        
        <div class="specs">{{SPECIFICATIONS_TABLE}}</div>
        
        <div class="shipping">
            <h3>Shipping</h3>
            <p>{{SHIPPING_INFO}}</p>
        </div>
    </div>',
    '.ebay-minimal-mobile { max-width: 100%; padding: 15px; font-family: Arial, sans-serif; } h1 { font-size: 20px; margin-bottom: 10px; } .price { font-size: 24px; font-weight: bold; color: #0066cc; margin: 10px 0; } .condition { color: #666; margin-bottom: 15px; } .images img { width: 100%; height: auto; } h3 { font-size: 16px; margin: 15px 0 5px 0; } p { line-height: 1.5; margin-bottom: 10px; }',
    '["TITLE", "PRICE", "CONDITION", "MAIN_IMAGE", "DESCRIPTION", "SPECIFICATIONS_TABLE", "SHIPPING_INFO"]'::jsonb,
    '{"TITLE": "Mobile Product", "PRICE": "$99.99", "CONDITION": "New", "MAIN_IMAGE": "<img src=\"https://via.placeholder.com/300x200\" alt=\"Product\">", "DESCRIPTION": "Mobile-optimized description", "SPECIFICATIONS_TABLE": "<ul><li>Compact size</li><li>Lightweight</li></ul>", "SHIPPING_INFO": "Fast shipping available"}'::jsonb
);

-- 📄 CSV項目ドキュメンテーション挿入
INSERT INTO csv_field_documentation (field_name, display_name, description, data_type, is_required, validation_rules, example_value, category, sort_order) VALUES
('Action', 'アクション', 'eBayでの操作タイプ（Add=新規追加、Revise=修正、End=終了）', 'text', true, 'Add, Revise, End のいずれか', 'Add', 'basic', 1),
('Category', 'カテゴリID', 'eBayカテゴリID（数字）', 'integer', true, '数字のみ', '293', 'basic', 2),
('Title', '商品タイトル', '商品のタイトル（80文字以内推奨）', 'text', true, '80文字以内', 'Canon EOS R5 Camera - Excellent Condition', 'basic', 3),
('Description', '商品説明', 'HTML可能な詳細説明', 'html', true, 'HTML使用可能', '<div>詳細な商品説明...</div>', 'basic', 4),
('Quantity', '数量', '販売数量', 'integer', true, '1以上の整数', '1', 'basic', 5),
('BuyItNowPrice', '即決価格', '即決価格（USD）', 'decimal', true, '0.01以上', '299.99', 'pricing', 6),
('ConditionID', '商品状態ID', 'eBay商品状態コード', 'integer', true, '1000-7000の範囲', '3000', 'basic', 7),
('Location', '商品所在地', '発送元の場所', 'text', false, '', 'Tokyo, Japan', 'shipping', 8),
('PaymentProfile', '決済プロファイル', 'eBay決済設定名', 'text', false, '', 'Standard Payment', 'profiles', 9),
('ReturnProfile', '返品プロファイル', 'eBay返品設定名', 'text', false, '', '30 Days Return', 'profiles', 10),
('ShippingProfile', '配送プロファイル', 'eBay配送設定名', 'text', false, '', 'International Shipping', 'profiles', 11),
('PictureURL', '画像URL', '商品画像のURL（複数可）', 'url', false, 'HTTP/HTTPS URL', 'https://example.com/image1.jpg|https://example.com/image2.jpg', 'media', 12),
('UPC', 'UPCコード', '商品のUPCバーコード', 'text', false, '12桁の数字', '123456789012', 'identifiers', 13),
('Brand', 'ブランド名', '商品のブランド', 'text', false, '', 'Canon', 'basic', 14),
('ConditionDescription', '状態詳細', '商品状態の詳細説明', 'text', false, '', 'Like new, no scratches', 'basic', 15),
('SiteID', 'サイトID', 'eBayサイトID（0=US, 3=UK等）', 'integer', false, '0-255の範囲', '0', 'advanced', 16),
('PostalCode', '郵便番号', '発送元郵便番号', 'text', false, '', '100-0001', 'shipping', 17),
('Currency', '通貨', '価格の通貨コード', 'text', false, 'ISO 4217通貨コード', 'USD', 'pricing', 18),
('Format', '出品形式', '出品形式の指定', 'text', false, 'FixedPriceItem, Auction', 'FixedPriceItem', 'advanced', 19),
('Duration', '出品期間', '出品期間の指定', 'text', false, 'Days_1, Days_3, Days_5, Days_7, Days_10, GTC', 'GTC', 'advanced', 20),
('Country', '発送国', '発送国コード', 'text', false, 'ISO 3166国名コード', 'JP', 'shipping', 21);

-- HTMLテンプレートの利用統計を記録する関数
CREATE OR REPLACE FUNCTION record_template_usage(
    p_template_id INTEGER,
    p_csv_file VARCHAR(255),
    p_item_count INTEGER,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO html_template_usage_stats (template_id, used_for_csv_file, item_count, success, error_message)
    VALUES (p_template_id, p_csv_file, p_item_count, p_success, p_error_message);
    
    -- テンプレートの利用回数を更新
    UPDATE product_html_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE template_id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- HTMLテンプレートとデータを統合する関数
CREATE OR REPLACE FUNCTION merge_template_with_data(
    p_template_id INTEGER,
    p_product_data JSONB
)
RETURNS TEXT AS $$
DECLARE
    template_html TEXT;
    merged_html TEXT;
    placeholder TEXT;
    replacement TEXT;
BEGIN
    -- テンプレート取得
    SELECT html_content INTO template_html
    FROM product_html_templates
    WHERE template_id = p_template_id AND is_active = TRUE;
    
    IF template_html IS NULL THEN
        RAISE EXCEPTION 'テンプレートID % が見つかりません', p_template_id;
    END IF;
    
    merged_html := template_html;
    
    -- 各プレースホルダーをデータで置換
    FOR placeholder IN SELECT jsonb_array_elements_text(placeholder_fields)
                      FROM product_html_templates 
                      WHERE template_id = p_template_id
    LOOP
        -- プレースホルダー名からJSONキーを作成（{{TITLE}} -> title）
        replacement := COALESCE(
            p_product_data->>REPLACE(REPLACE(placeholder, '{{', ''), '}}', ''),
            ''
        );
        
        merged_html := REPLACE(merged_html, placeholder, replacement);
    END LOOP;
    
    RETURN merged_html;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- 完了メッセージ
SELECT 'HTMLテンプレートシステムの構築が完了しました。' as status,
       COUNT(*) as template_count
FROM product_html_templates;

SELECT 'CSV項目ドキュメンテーションの構築が完了しました。' as status,
       COUNT(*) as field_count  
FROM csv_field_documentation;