-- 🗄️ HTMLテンプレート保存用テーブル作成SQL
-- yahoo_auction_complete システム用

-- HTMLテンプレート管理テーブル
CREATE TABLE IF NOT EXISTS html_templates (
    template_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    html_content LONGTEXT NOT NULL,
    category ENUM('default', 'premium', 'standard', 'custom') DEFAULT 'custom',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_category (category),
    INDEX idx_updated (updated_at)
);

-- unified_product_master テーブルにHTML関連フィールド追加（存在しない場合のみ）
ALTER TABLE unified_product_master 
ADD COLUMN IF NOT EXISTS ebay_description_html LONGTEXT COMMENT 'eBay出品用HTML（差し込み済み）',
ADD COLUMN IF NOT EXISTS html_template_id VARCHAR(100) COMMENT '使用したHTMLテンプレートID',
ADD COLUMN IF NOT EXISTS html_last_generated TIMESTAMP NULL COMMENT 'HTML最終生成日時';

-- インデックス追加
ALTER TABLE unified_product_master 
ADD INDEX IF NOT EXISTS idx_html_template (html_template_id),
ADD INDEX IF NOT EXISTS idx_html_generated (html_last_generated);

-- デフォルトHTMLテンプレート挿入
INSERT IGNORE INTO html_templates (template_id, name, description, html_content, category) VALUES
('premium', 'プレミアムテンプレート', '高級商品向けの詳細テンプレート', 
'<div class="premium-listing">
    <div class="header">
        <h1 class="title">{{TITLE}}</h1>
        <div class="brand-badge">{{BRAND}}</div>
        <div class="price-display">${{PRICE}}</div>
    </div>
    
    <div class="image-section">
        <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" class="main-image">
        <div class="gallery">{{IMAGE_GALLERY_HTML}}</div>
    </div>
    
    <div class="content">
        <div class="condition">Condition: {{CONDITION}}</div>
        <div class="description">{{DESCRIPTION}}</div>
        <div class="specifications">{{SPECIFICATIONS_TABLE}}</div>
    </div>
    
    <div class="shipping-section">
        {{SHIPPING_INFO_HTML}}
    </div>
    
    <div class="seller-section">
        {{SELLER_INFO_HTML}}
        {{RETURN_POLICY_HTML}}
    </div>
</div>

<style>
.premium-listing { max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; }
.header { text-align: center; margin-bottom: 2rem; }
.title { font-size: 2rem; color: #333; }
.brand-badge { background: #0066cc; color: white; padding: 0.5rem 1rem; border-radius: 20px; }
.price-display { font-size: 2.5rem; font-weight: bold; color: #0066cc; }
.main-image { width: 100%; max-width: 500px; }
.content { margin: 2rem 0; }
.shipping-section, .seller-section { background: #f8f9fa; padding: 1rem; margin: 1rem 0; }
</style>', 'default'),

('standard', 'スタンダードテンプレート', '一般商品向けの標準テンプレート',
'<div class="standard-listing">
    <h1>{{TITLE}}</h1>
    <div class="price">${{PRICE}}</div>
    <div class="condition">{{CONDITION}}</div>
    
    <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}" class="product-image">
    
    <div class="description">
        {{DESCRIPTION}}
    </div>
    
    <div class="specifications">
        {{SPECIFICATIONS_TABLE}}
    </div>
    
    <div class="shipping">
        {{SHIPPING_INFO_HTML}}
    </div>
</div>

<style>
.standard-listing { font-family: Arial, sans-serif; line-height: 1.6; }
.price { font-size: 1.5rem; font-weight: bold; color: #0066cc; }
.product-image { width: 100%; max-width: 400px; }
.specifications table { width: 100%; border-collapse: collapse; }
.specifications td { padding: 0.5rem; border: 1px solid #ddd; }
</style>', 'default'),

('minimal', 'ミニマルテンプレート', 'シンプルな構成のテンプレート',
'<div class="minimal-listing">
    <h1>{{TITLE}}</h1>
    <div class="price">${{PRICE}}</div>
    <img src="{{MAIN_IMAGE}}" alt="{{TITLE}}">
    <p>{{DESCRIPTION}}</p>
    <div class="shipping">{{SHIPPING_INFO_HTML}}</div>
</div>

<style>
.minimal-listing { font-family: Arial, sans-serif; }
.price { font-size: 1.2rem; font-weight: bold; color: #0066cc; }
img { width: 100%; max-width: 300px; }
</style>', 'default');

-- 処理ログ確認用ビュー
CREATE OR REPLACE VIEW html_processing_stats AS
SELECT 
    COUNT(*) as total_products,
    SUM(CASE WHEN ebay_description_html IS NOT NULL AND LENGTH(ebay_description_html) > 0 THEN 1 ELSE 0 END) as html_generated,
    SUM(CASE WHEN ebay_description_html IS NULL OR LENGTH(ebay_description_html) = 0 THEN 1 ELSE 0 END) as html_pending,
    COUNT(DISTINCT html_template_id) as templates_used,
    MAX(html_last_generated) as last_generation
FROM unified_product_master 
WHERE delete_flag = 0;

-- HTMLテンプレート使用統計ビュー
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
    t.template_id,
    t.name,
    t.category,
    COUNT(p.master_sku) as usage_count,
    MAX(p.html_last_generated) as last_used
FROM html_templates t
LEFT JOIN unified_product_master p ON t.template_id = p.html_template_id
GROUP BY t.template_id, t.name, t.category
ORDER BY usage_count DESC;

-- 初期データ検証
SELECT 'HTML Templates Created:' as info, COUNT(*) as count FROM html_templates;
SELECT 'Products Ready for HTML:' as info, COUNT(*) as count FROM unified_product_master WHERE delete_flag = 0;