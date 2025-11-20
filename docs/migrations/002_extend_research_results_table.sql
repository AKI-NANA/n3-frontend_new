-- research_resultsテーブルの拡張
-- データ管理フラグと暫定スコアの追加

-- 研究ステータスのENUM型を作成
DO $$ BEGIN
  CREATE TYPE research_status_enum AS ENUM ('NEW', 'SCORED', 'AI_QUEUED', 'AI_COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- research_resultsテーブルにカラムを追加
ALTER TABLE research_results
  ADD COLUMN IF NOT EXISTS research_status research_status_enum DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS last_research_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ai_cost_status BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provisional_score NUMERIC(10, 2), -- 暫定Uiスコア
  ADD COLUMN IF NOT EXISTS final_score NUMERIC(10, 2), -- 最終Uiスコア（AI仕入れ先価格込み）

  -- AI解析関連
  ADD COLUMN IF NOT EXISTS ai_supplier_candidate_id UUID REFERENCES supplier_candidates(id),
  ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,

  -- スコア詳細（JSONB形式で保存）
  ADD COLUMN IF NOT EXISTS score_details JSONB;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_research_results_status ON research_results(research_status);
CREATE INDEX IF NOT EXISTS idx_research_results_ai_cost_status ON research_results(ai_cost_status);
CREATE INDEX IF NOT EXISTS idx_research_results_provisional_score ON research_results(provisional_score DESC);
CREATE INDEX IF NOT EXISTS idx_research_results_final_score ON research_results(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_research_results_last_research_date ON research_results(last_research_date DESC);

-- created_atカラムがない場合は追加（既存データとの互換性）
ALTER TABLE research_results
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_research_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_research_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーが存在しない場合のみ作成
DROP TRIGGER IF EXISTS trigger_research_results_updated_at ON research_results;
CREATE TRIGGER trigger_research_results_updated_at
  BEFORE UPDATE ON research_results
  FOR EACH ROW
  EXECUTE FUNCTION update_research_results_updated_at();

-- コメント追加
COMMENT ON COLUMN research_results.research_status IS 'リサーチ処理ステータス: NEW（新規）, SCORED（スコア計算済み）, AI_QUEUED（AI解析待ち）, AI_COMPLETED（AI解析完了）';
COMMENT ON COLUMN research_results.ai_cost_status IS 'AIによる仕入れ先特定が完了しているか';
COMMENT ON COLUMN research_results.provisional_score IS '暫定Uiスコア（仕入れ先が未定の状態でのスコア）';
COMMENT ON COLUMN research_results.final_score IS '最終Uiスコア（AI特定の仕入れ先価格を含む）';
COMMENT ON COLUMN research_results.score_details IS 'スコア計算の詳細（P, S, C, R, T等の内訳）';
