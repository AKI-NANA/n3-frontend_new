-- ============================================================================
-- 大規模データ一括取得バッチ機能 - データベーステーブル作成
-- ============================================================================

-- research_batches テーブル（バッチタスク管理）
-- 目的: ユーザーが設定した大規模リサーチタスクの全体設定と進捗を管理
CREATE TABLE IF NOT EXISTS research_batches (
  batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ターゲットセラーIDのリスト
  target_seller_ids TEXT[] NOT NULL,

  -- リサーチ期間
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- キーワード（オプション）
  keyword TEXT,

  -- バッチステータス
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),

  -- タスク統計
  total_tasks_count INTEGER DEFAULT 0,
  completed_tasks_count INTEGER DEFAULT 0,
  failed_tasks_count INTEGER DEFAULT 0,

  -- 実行統計
  total_items_retrieved INTEGER DEFAULT 0,

  -- エラー情報
  error_message TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- batch_tasks テーブル（個別実行タスクログ）
-- 目的: 1つのバッチタスクを日付やセラーごとに分割した個別の実行単位を管理
CREATE TABLE IF NOT EXISTS batch_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES research_batches(batch_id) ON DELETE CASCADE,

  -- ターゲットセラーID（このタスクで処理する単一のセラー）
  target_seller_id TEXT NOT NULL,

  -- 日付範囲（文字列表現）
  target_date_range TEXT NOT NULL,

  -- 日付範囲（検索用）
  date_start TIMESTAMP WITH TIME ZONE NOT NULL,
  date_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- タスクステータス
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),

  -- eBay API リクエストパラメータ（ページネーション情報など）
  ebay_api_request_params JSONB,

  -- 処理統計
  processed_count INTEGER DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  current_page INTEGER DEFAULT 0,

  -- エラー情報
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- インデックスの作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_research_batches_user_id ON research_batches(user_id);
CREATE INDEX IF NOT EXISTS idx_research_batches_status ON research_batches(status);
CREATE INDEX IF NOT EXISTS idx_research_batches_created_at ON research_batches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_batch_tasks_batch_id ON batch_tasks(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_status ON batch_tasks(status);
CREATE INDEX IF NOT EXISTS idx_batch_tasks_date_range ON batch_tasks(date_start, date_end);

-- トリガー: updated_at の自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_research_batches_updated_at
  BEFORE UPDATE ON research_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batch_tasks_updated_at
  BEFORE UPDATE ON batch_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) の設定
ALTER TABLE research_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_tasks ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のバッチのみ閲覧・操作可能
CREATE POLICY "Users can view their own batches"
  ON research_batches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own batches"
  ON research_batches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own batches"
  ON research_batches FOR UPDATE
  USING (auth.uid() = user_id);

-- batch_tasks は親の research_batches を通じてアクセス制御
CREATE POLICY "Users can view tasks of their batches"
  ON batch_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM research_batches
      WHERE research_batches.batch_id = batch_tasks.batch_id
      AND research_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks for their batches"
  ON batch_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM research_batches
      WHERE research_batches.batch_id = batch_tasks.batch_id
      AND research_batches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks of their batches"
  ON batch_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM research_batches
      WHERE research_batches.batch_id = batch_tasks.batch_id
      AND research_batches.user_id = auth.uid()
    )
  );

-- コメント追加（ドキュメント化）
COMMENT ON TABLE research_batches IS '大規模リサーチバッチの全体管理テーブル';
COMMENT ON TABLE batch_tasks IS 'バッチを日付・セラーごとに分割した個別タスク';

COMMENT ON COLUMN research_batches.target_seller_ids IS 'ターゲットとする日本人セラーIDのリスト';
COMMENT ON COLUMN research_batches.total_tasks_count IS '日付分割により生成された総タスク数';
COMMENT ON COLUMN batch_tasks.target_date_range IS '例: 2025-08-01 to 2025-08-07';
COMMENT ON COLUMN batch_tasks.ebay_api_request_params IS 'ページネーション情報、フィルタ条件などを格納';
