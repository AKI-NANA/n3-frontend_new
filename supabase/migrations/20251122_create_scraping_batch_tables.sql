-- ==========================================
-- スクレイピングバッチシステム テーブル作成
-- 作成日: 2025-11-22
-- 目的: URL一括処理バッチ機能のためのキューイングシステム
-- ==========================================

-- ==========================================
-- テーブル1: scraping_batches
-- 目的: バッチ全体の設定、進捗、ステータスを管理
-- ==========================================
CREATE TABLE scraping_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name VARCHAR(255),
  total_urls INTEGER NOT NULL,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'queued',
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT batch_status_check CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'))
);

-- インデックス作成（検索最適化）
CREATE INDEX idx_scraping_batches_status ON scraping_batches(status);
CREATE INDEX idx_scraping_batches_created_at ON scraping_batches(created_at DESC);

-- ==========================================
-- テーブル2: scraping_queue
-- 目的: バッチ内の個々のURL、実行状態、リトライ回数、エラーメッセージを管理
-- ==========================================
CREATE TABLE scraping_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  target_url TEXT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  result_data JSONB,
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  CONSTRAINT status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'permanently_failed')),
  CONSTRAINT fk_batch_id FOREIGN KEY (batch_id) REFERENCES scraping_batches(id) ON DELETE CASCADE
);

-- インデックス作成（検索・集計最適化）
CREATE INDEX idx_scraping_queue_status ON scraping_queue(status);
CREATE INDEX idx_scraping_queue_batch_id ON scraping_queue(batch_id);
CREATE INDEX idx_scraping_queue_status_batch_id ON scraping_queue(status, batch_id);
CREATE INDEX idx_scraping_queue_inserted_at ON scraping_queue(inserted_at DESC);

-- ==========================================
-- コメント追加（ドキュメント化）
-- ==========================================
COMMENT ON TABLE scraping_batches IS 'スクレイピングバッチの管理テーブル - バッチ全体の進捗とステータスを追跡';
COMMENT ON COLUMN scraping_batches.status IS 'バッチステータス: queued(待機), processing(処理中), completed(完了), failed(失敗), cancelled(キャンセル)';
COMMENT ON COLUMN scraping_batches.total_urls IS 'バッチ内の総URL数';
COMMENT ON COLUMN scraping_batches.processed_count IS '処理済みURL数（成功+失敗）';

COMMENT ON TABLE scraping_queue IS 'スクレイピングキューテーブル - 個々のURLタスクを管理';
COMMENT ON COLUMN scraping_queue.status IS 'タスクステータス: pending(待機), processing(処理中), completed(完了), failed(失敗), permanently_failed(永久失敗)';
COMMENT ON COLUMN scraping_queue.retry_count IS 'リトライ回数（最大3回）';
COMMENT ON COLUMN scraping_queue.result_data IS 'スクレイピング結果データ（JSON形式）';
COMMENT ON COLUMN scraping_queue.platform IS 'プラットフォーム識別子（yahoo_auction, mercari等）';
