-- HTMLテンプレート管理テーブル作成（完全版）の続き

5px 0;
    }
    
    .description {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        line-height: 1.8;
    }
    
    @media (max-width: 768px) {
        .product-grid {
            grid-template-columns: 1fr;
            gap: 20px;
        }
    }',
    '[
        "TITLE", "MAIN_IMAGE", "CURRENCY", "PRICE", "CONDITION", 
        "BRAND", "MODEL", "SHIPPING_DAYS", "DESCRIPTION"
    ]'::jsonb
);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_templates_category ON product_html_templates(category);
CREATE INDEX idx_templates_active ON product_html_templates(is_active);
CREATE INDEX idx_templates_usage ON product_html_templates(usage_count DESC);
CREATE INDEX idx_template_stats_template_id ON template_usage_stats(template_id);
CREATE INDEX idx_template_stats_used_at ON template_usage_stats(used_at DESC);

-- テンプレート検索関数
CREATE OR REPLACE FUNCTION search_templates(
    search_category VARCHAR DEFAULT NULL,
    search_term VARCHAR DEFAULT NULL,
    active_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    template_id INTEGER,
    template_name VARCHAR,
    category VARCHAR,
    template_description TEXT,
    usage_count INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.template_id,
        t.template_name,
        t.category,
        t.template_description,
        t.usage_count,
        t.created_at,
        t.updated_at
    FROM product_html_templates t
    WHERE 
        (NOT active_only OR t.is_active = TRUE)
        AND (search_category IS NULL OR t.category = search_category)
        AND (search_term IS NULL OR 
             t.template_name ILIKE '%' || search_term || '%' OR 
             t.template_description ILIKE '%' || search_term || '%')
    ORDER BY t.usage_count DESC, t.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- テンプレート使用統計更新関数
CREATE OR REPLACE FUNCTION record_template_usage(
    p_template_id INTEGER,
    p_product_title VARCHAR DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- 使用統計記録
    INSERT INTO template_usage_stats (template_id, product_title, success, error_message)
    VALUES (p_template_id, p_product_title, p_success, p_error_message);
    
    -- テンプレート使用回数更新
    UPDATE product_html_templates 
    SET usage_count = usage_count + 1
    WHERE template_id = p_template_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- テンプレート変数抽出関数
CREATE OR REPLACE FUNCTION extract_template_variables(template_content TEXT)
RETURNS TEXT[] AS $$
DECLARE
    variables TEXT[];
BEGIN
    -- {{変数名}}パターンを抽出
    SELECT array_agg(DISTINCT substring(match[1] FROM 3 FOR length(match[1])-4))
    INTO variables
    FROM (
        SELECT regexp_matches(template_content, '\{\{([^}]+)\}\}', 'g') as match
    ) matches;
    
    RETURN COALESCE(variables, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- サンプルクエリとビュー
CREATE OR REPLACE VIEW template_statistics AS
SELECT 
    t.template_id,
    t.template_name,
    t.category,
    t.usage_count,
    COUNT(ts.stat_id) as total_uses,
    COUNT(ts.stat_id) FILTER (WHERE ts.success = TRUE) as successful_uses,
    COUNT(ts.stat_id) FILTER (WHERE ts.success = FALSE) as failed_uses,
    ROUND(
        COUNT(ts.stat_id) FILTER (WHERE ts.success = TRUE) * 100.0 / 
        NULLIF(COUNT(ts.stat_id), 0), 2
    ) as success_rate_percent,
    MAX(ts.used_at) as last_used_at
FROM product_html_templates t
LEFT JOIN template_usage_stats ts ON t.template_id = ts.template_id
WHERE t.is_active = TRUE
GROUP BY t.template_id, t.template_name, t.category, t.usage_count
ORDER BY t.usage_count DESC;
