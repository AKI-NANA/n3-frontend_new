-- ============================================
-- Wisdom Core: コードマップテーブル作成
-- ============================================

-- コードマップメインテーブル
CREATE TABLE IF NOT EXISTS code_map (
  id BIGSERIAL PRIMARY KEY,
  project_name TEXT DEFAULT 'n3-frontend',
  path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  tool_type TEXT,
  category TEXT,
  description_simple TEXT,
  description_detailed TEXT,
  main_features JSONB DEFAULT '[]'::jsonb,
  tech_stack TEXT,
  ui_location TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  content TEXT,
  file_size INTEGER,
  last_modified TIMESTAMP,
  last_analyzed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 説明更新履歴テーブル
CREATE TABLE IF NOT EXISTS code_map_history (
  id BIGSERIAL PRIMARY KEY,
  code_map_id BIGINT REFERENCES code_map(id) ON DELETE CASCADE,
  old_description TEXT,
  new_description TEXT,
  changed_by TEXT DEFAULT 'auto',
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_code_map_path ON code_map(path);
CREATE INDEX IF NOT EXISTS idx_code_map_category ON code_map(category);
CREATE INDEX IF NOT EXISTS idx_code_map_tool_type ON code_map(tool_type);
CREATE INDEX IF NOT EXISTS idx_code_map_last_modified ON code_map(last_modified);
CREATE INDEX IF NOT EXISTS idx_code_map_project ON code_map(project_name);

-- 全文検索用インデックス
CREATE INDEX IF NOT EXISTS idx_code_map_content_search ON code_map USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_code_map_description_search ON code_map USING gin(to_tsvector('english', description_simple || ' ' || description_detailed));

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_code_map_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_code_map_timestamp
BEFORE UPDATE ON code_map
FOR EACH ROW
EXECUTE FUNCTION update_code_map_timestamp();

-- RLSポリシー（セキュリティ）
ALTER TABLE code_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_map_history ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み取り可能
CREATE POLICY "Enable read access for all users" ON code_map
  FOR SELECT USING (true);

-- 全ユーザーが書き込み可能（開発用、本番では制限推奨）
CREATE POLICY "Enable insert access for all users" ON code_map
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON code_map
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON code_map
  FOR DELETE USING (true);

-- 履歴テーブルも同様
CREATE POLICY "Enable read access for all users" ON code_map_history
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON code_map_history
  FOR INSERT WITH CHECK (true);
