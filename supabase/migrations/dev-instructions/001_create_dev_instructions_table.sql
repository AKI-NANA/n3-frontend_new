-- 開発指示書管理テーブルの作成
CREATE TABLE IF NOT EXISTS dev_instructions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT '中',
    description TEXT,
    memo TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    code_snippets JSONB DEFAULT '[]'::jsonb,
    related_files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_dev_instructions_status ON dev_instructions(status);
CREATE INDEX IF NOT EXISTS idx_dev_instructions_priority ON dev_instructions(priority);
CREATE INDEX IF NOT EXISTS idx_dev_instructions_category ON dev_instructions(category);
CREATE INDEX IF NOT EXISTS idx_dev_instructions_created_at ON dev_instructions(created_at);
CREATE INDEX IF NOT EXISTS idx_dev_instructions_updated_at ON dev_instructions(updated_at);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_dev_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dev_instructions_updated_at
    BEFORE UPDATE ON dev_instructions
    FOR EACH ROW
    EXECUTE FUNCTION update_dev_instructions_updated_at();

-- RLS (Row Level Security) の有効化
ALTER TABLE dev_instructions ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み書き可能なポリシー（本番環境では適切に制限してください）
CREATE POLICY "Enable all access for dev_instructions" ON dev_instructions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- コメント
COMMENT ON TABLE dev_instructions IS '開発指示書管理テーブル';
COMMENT ON COLUMN dev_instructions.id IS '一意のID';
COMMENT ON COLUMN dev_instructions.title IS 'ツール/機能名';
COMMENT ON COLUMN dev_instructions.category IS 'カテゴリ';
COMMENT ON COLUMN dev_instructions.status IS 'ステータス（未着手/開発中/使用済み/完了/保留）';
COMMENT ON COLUMN dev_instructions.priority IS '優先順位（最高/高/中/低）';
COMMENT ON COLUMN dev_instructions.description IS '指示書の内容';
COMMENT ON COLUMN dev_instructions.memo IS '進行状況メモ';
COMMENT ON COLUMN dev_instructions.images IS '画像データ（JSON配列）';
COMMENT ON COLUMN dev_instructions.code_snippets IS 'コードスニペット（JSON配列）';
COMMENT ON COLUMN dev_instructions.related_files IS '関連ファイルパス（JSON配列）';
