-- ==========================================
-- HTMLテンプレート管理テーブル - 多言語対応版
-- 作成日: 2025-10-15
-- バージョン: 2.0 - Multilingual Support
-- ==========================================

-- 既存テーブルのカラム変更（多言語対応）
-- html_contentをlanguages（JSONB）に変更

-- Step 1: 新しいカラムを追加
ALTER TABLE html_templates 
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS version VARCHAR(50) DEFAULT '1.0';

-- Step 2: 既存データを新形式に変換（html_contentがある場合）
UPDATE html_templates 
SET languages = jsonb_build_object(
    'en_US', jsonb_build_object(
        'html_content', html_content,
        'updated_at', updated_at::text
    )
),
version = '2.0-multilang'
WHERE html_content IS NOT NULL 
AND html_content != '' 
AND (languages IS NULL OR languages = '{}'::jsonb);

-- Step 3: 古いカラムは残す（互換性のため）
-- html_content, css_styles, javascript_code は削除しない

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_html_templates_languages ON html_templates USING GIN (languages);
CREATE INDEX IF NOT EXISTS idx_html_templates_version ON html_templates(version);

-- コメント更新
COMMENT ON COLUMN html_templates.languages IS '多言語HTMLコンテンツ（JSONB形式）: {lang_code: {html_content, updated_at}}';
COMMENT ON COLUMN html_templates.version IS 'テンプレートバージョン（1.0=単一言語, 2.0-multilang=多言語対応）';

-- ビュー作成：言語数を含むテンプレート一覧
CREATE OR REPLACE VIEW html_templates_with_lang_count AS
SELECT 
    id,
    template_id,
    name,
    category,
    languages,
    (SELECT COUNT(*) FROM jsonb_object_keys(languages)) as language_count,
    created_at,
    updated_at,
    created_by,
    version
FROM html_templates;

COMMENT ON VIEW html_templates_with_lang_count IS 'HTMLテンプレート一覧（言語数を含む）';

-- サンプルデータ：多言語テンプレート
INSERT INTO html_templates (
    template_id,
    name,
    category,
    languages,
    version,
    placeholder_fields
) VALUES 
(
    'multilang-basic-template',
    'Multilingual Basic Template',
    'general',
    '{
        "en_US": {
            "html_content": "<div><h2>{{TITLE}}</h2><p>Price: ${{PRICE}}</p><p>{{DESCRIPTION}}</p></div>",
            "updated_at": "2025-10-15T00:00:00Z"
        },
        "ja": {
            "html_content": "<div><h2>{{TITLE}}</h2><p>価格: ¥{{PRICE}}</p><p>{{DESCRIPTION}}</p></div>",
            "updated_at": "2025-10-15T00:00:00Z"
        },
        "de": {
            "html_content": "<div><h2>{{TITLE}}</h2><p>Preis: €{{PRICE}}</p><p>{{DESCRIPTION}}</p></div>",
            "updated_at": "2025-10-15T00:00:00Z"
        }
    }'::jsonb,
    '2.0-multilang',
    '["{{TITLE}}", "{{PRICE}}", "{{DESCRIPTION}}"]'::jsonb
)
ON CONFLICT (template_id) DO UPDATE SET
    languages = EXCLUDED.languages,
    version = EXCLUDED.version,
    updated_at = NOW();

-- 確認クエリ
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_templates,
    COUNT(*) FILTER (WHERE version = '2.0-multilang') as multilang_templates,
    COUNT(*) FILTER (WHERE version = '1.0' OR version IS NULL) as legacy_templates
FROM html_templates;

-- 多言語テンプレート例の確認
SELECT 
    template_id,
    name,
    category,
    (SELECT COUNT(*) FROM jsonb_object_keys(languages)) as language_count,
    (SELECT array_agg(key) FROM jsonb_object_keys(languages) as key) as supported_languages,
    version
FROM html_templates
WHERE version = '2.0-multilang'
ORDER BY created_at DESC;
