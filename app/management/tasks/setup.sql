-- Create tasks table for MultiChannelManager V4
-- タスク管理機能の高度化 V4 (リッチコンテンツ・カレンダー連携)

-- ⚠️ このファイルをSupabaseダッシュボードのSQLエディタで実行してください
-- または、Supabase CLIを使用してマイグレーションを実行してください

-- tasksテーブルを作成
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本フィールド
  title TEXT NOT NULL,
  description TEXT,
  rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',

  -- 拡張フィールド (V4で追加)
  due_date DATE,
  urls TEXT[] DEFAULT '{}',
  images JSONB DEFAULT '[]',
  code_snippets JSONB DEFAULT '[]',
  todos JSONB DEFAULT '[]',

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成: ユーザーは自分のタスクのみアクセス可能
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE tasks IS 'タスク管理テーブル (V4: リッチコンテンツ対応)';
COMMENT ON COLUMN tasks.due_date IS '締切日 (YYYY-MM-DD)';
COMMENT ON COLUMN tasks.urls IS '関連URLのリスト';
COMMENT ON COLUMN tasks.images IS '画像プレースホルダー (モック): [{ id, name, url }]';
COMMENT ON COLUMN tasks.code_snippets IS 'コードスニペット: [{ language, code }]';
COMMENT ON COLUMN tasks.todos IS 'サブToDoリスト: [{ text, completed }]';

-- ✅ セットアップ完了
-- タスク管理機能を使用する準備が整いました
-- アプリケーションで /management/tasks にアクセスしてください
