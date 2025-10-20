-- Step 1: is_default_preview カラムを追加
ALTER TABLE html_templates 
ADD COLUMN IF NOT EXISTS is_default_preview BOOLEAN DEFAULT false;

-- Step 2: インデックス作成
CREATE INDEX IF NOT EXISTS idx_html_templates_is_default_preview 
ON html_templates(is_default_preview);

-- Step 3: テーブルの内容を確認
SELECT 
    id, 
    COALESCE(template_id, 'N/A') as template_id,
    name,
    category,
    version
FROM html_templates 
LIMIT 10;

-- Step 4: 既存のテンプレートをデフォルトに設定（IDベースで最初のレコード）
UPDATE html_templates 
SET is_default_preview = true 
WHERE id = (SELECT id FROM html_templates ORDER BY created_at ASC LIMIT 1)
AND is_default_preview = false;

-- Step 5: 確認
SELECT 
    id,
    COALESCE(template_id, 'N/A') as template_id,
    name,
    is_default_preview,
    version
FROM html_templates;
