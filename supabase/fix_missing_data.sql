-- ================================================
-- データ修正SQL - HTMLテンプレートと商品サンプル
-- ================================================

-- 1. product_html_generatedテーブルを作成
CREATE TABLE IF NOT EXISTS product_html_generated (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id BIGINT NOT NULL,
    sku VARCHAR(255) NOT NULL,
    marketplace VARCHAR(50) NOT NULL,
    template_id TEXT,
    template_name TEXT,
    generated_html TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, marketplace)
);

CREATE INDEX IF NOT EXISTS idx_product_html_generated_product_id ON product_html_generated(product_id);
CREATE INDEX IF NOT EXISTS idx_product_html_generated_sku ON product_html_generated(sku);
CREATE INDEX IF NOT EXISTS idx_product_html_generated_marketplace ON product_html_generated(marketplace);

-- 2. html_templatesテーブルがない場合は作成
CREATE TABLE IF NOT EXISTS html_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id VARCHAR(255) UNIQUE,
    name TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    html_content TEXT,
    css_styles TEXT DEFAULT '',
    javascript_code TEXT DEFAULT '',
    placeholder_fields JSONB DEFAULT '[]'::jsonb,
    is_default_preview BOOLEAN DEFAULT false,
    languages JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_html_templates_template_id ON html_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_html_templates_is_default ON html_templates(is_default_preview);

-- 3. デフォルトテンプレートを追加
INSERT INTO html_templates (
    template_id,
    name,
    category,
    is_default_preview,
    languages
) VALUES 
(
    'default-preview-template',
    'Default Preview Template',
    'general',
    true,
    '{
        "en_US": {
            "html_content": "<div style=\"font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;\"><h1 style=\"color: #2563eb; font-size: 2rem; margin-bottom: 1rem;\">{{TITLE}}</h1><div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;\"><div style=\"background: #f3f4f6; padding: 1rem; border-radius: 0.5rem;\"><strong>Condition:</strong> {{CONDITION}}</div><div style=\"background: #f3f4f6; padding: 1rem; border-radius: 0.5rem;\"><strong>Brand:</strong> {{BRAND}}</div><div style=\"background: #f3f4f6; padding: 1rem; border-radius: 0.5rem;\"><strong>SKU:</strong> {{SKU}}</div><div style=\"background: #f3f4f6; padding: 1rem; border-radius: 0.5rem;\"><strong>Price:</strong> ${{PRICE}}</div></div><div style=\"margin-bottom: 2rem;\"><h2 style=\"color: #1e40af; font-size: 1.5rem; margin-bottom: 0.5rem;\">Description</h2><p style=\"line-height: 1.6; color: #374151;\">{{DESCRIPTION}}</p></div><div style=\"background: #e0f2fe; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 2rem;\"><h3 style=\"color: #075985; font-size: 1.25rem; margin-bottom: 1rem;\">Shipping Information</h3><p style=\"color: #0c4a6e;\">{{SHIPPING_INFO}}</p></div><div style=\"background: #dcfce7; padding: 1.5rem; border-radius: 0.5rem;\"><h3 style=\"color: #065f46; font-size: 1.25rem; margin-bottom: 1rem;\">Return Policy</h3><p style=\"color: #064e3b;\">{{RETURN_POLICY}}</p></div></div>"
        }
    }'::jsonb
)
ON CONFLICT (template_id) DO UPDATE SET
    is_default_preview = EXCLUDED.is_default_preview,
    languages = EXCLUDED.languages,
    updated_at = NOW();

-- 4. サンプル商品を確認（既に存在する場合はスキップ）
DO $$
DECLARE
    product_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO product_count FROM products;
    
    IF product_count = 0 THEN
        -- サンプル商品を追加
        INSERT INTO products (
            item_id, title, english_title, sku, brand,
            acquired_price_jpy, price_jpy, price_usd,
            stock_quantity, condition, weight_g,
            length_cm, width_cm, height_cm,
            category_name, image_urls, image_count
        ) VALUES
        (
            'SAMPLE-001',
            'ポケモンカード ピカチュウ プロモ 限定版',
            'Pokemon Card Pikachu Promo Limited Edition',
            'PKM-PIKA-001-2025',
            'Pokemon',
            3500, 3500, 35.00,
            5, 'New', 15,
            10.0, 7.0, 0.5,
            'Trading Cards > Pokemon',
            ARRAY['https://placehold.co/400x300/4CAF50/ffffff?text=Pikachu'],
            1
        ),
        (
            'SAMPLE-002',
            'Nintendo Switch 中古美品',
            'Nintendo Switch Console Used Excellent',
            'NSW-CONSOLE-002-2025',
            'Nintendo',
            25000, 25000, 250.00,
            3, 'Used', 500,
            20.0, 15.0, 5.0,
            'Electronics > Gaming > Consoles',
            ARRAY['https://placehold.co/400x300/E91E63/ffffff?text=Switch'],
            1
        ),
        (
            'SAMPLE-003',
            'ドラゴンボール フィギュア 孫悟空',
            'Dragon Ball Figure Son Goku',
            'DBZ-GOKU-003-2025',
            'Bandai',
            8000, 8000, 80.00,
            10, 'New', 200,
            15.0, 10.0, 20.0,
            'Collectibles > Figures > Dragon Ball',
            ARRAY['https://placehold.co/400x300/FF5722/ffffff?text=Goku'],
            1
        );
        
        RAISE NOTICE '✅ サンプル商品を3件追加しました';
    ELSE
        RAISE NOTICE '✓ 商品は既に存在します (% 件)', product_count;
    END IF;
END $$;

-- 5. 結果を表示
SELECT 
    '✅ セットアップ完了！' as status,
    (SELECT COUNT(*) FROM products) as products_count,
    (SELECT COUNT(*) FROM html_templates WHERE is_default_preview = true) as default_templates,
    (SELECT COUNT(*) FROM product_html_generated) as generated_htmls;
