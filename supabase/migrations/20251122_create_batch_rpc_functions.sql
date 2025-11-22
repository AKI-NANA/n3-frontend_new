-- ============================================================================
-- バッチ統計更新用のRPC関数
-- ============================================================================

-- 完了タスク数をインクリメント
CREATE OR REPLACE FUNCTION increment_batch_completed_tasks(p_batch_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE research_batches
  SET completed_tasks_count = completed_tasks_count + 1,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- 失敗タスク数をインクリメント
CREATE OR REPLACE FUNCTION increment_batch_failed_tasks(p_batch_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE research_batches
  SET failed_tasks_count = failed_tasks_count + 1,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- 取得アイテム数をインクリメント
CREATE OR REPLACE FUNCTION increment_batch_items_retrieved(
  p_batch_id UUID,
  p_count INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE research_batches
  SET total_items_retrieved = total_items_retrieved + p_count,
      updated_at = NOW()
  WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- バッチステータスを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_batch_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_failed_tasks INTEGER;
  v_new_status TEXT;
BEGIN
  -- 親バッチの統計を取得
  SELECT
    total_tasks_count,
    completed_tasks_count,
    failed_tasks_count
  INTO
    v_total_tasks,
    v_completed_tasks,
    v_failed_tasks
  FROM research_batches
  WHERE batch_id = NEW.batch_id;

  -- ステータスを判定
  IF v_completed_tasks + v_failed_tasks >= v_total_tasks THEN
    -- 全タスク完了
    IF v_failed_tasks > 0 THEN
      v_new_status := 'Completed'; -- 一部失敗あり
    ELSE
      v_new_status := 'Completed'; -- 全て成功
    END IF;

    -- バッチを完了状態に更新
    UPDATE research_batches
    SET
      status = v_new_status,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE batch_id = NEW.batch_id;
  ELSIF v_completed_tasks > 0 OR v_failed_tasks > 0 THEN
    -- 処理中
    UPDATE research_batches
    SET
      status = 'Processing',
      started_at = COALESCE(started_at, NOW()),
      updated_at = NOW()
    WHERE batch_id = NEW.batch_id AND status = 'Pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- batch_tasks の更新時に親バッチのステータスを自動更新
CREATE TRIGGER trigger_update_batch_status
  AFTER UPDATE OF status ON batch_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_batch_status();

-- コメント追加
COMMENT ON FUNCTION increment_batch_completed_tasks IS 'バッチの完了タスク数をインクリメント';
COMMENT ON FUNCTION increment_batch_failed_tasks IS 'バッチの失敗タスク数をインクリメント';
COMMENT ON FUNCTION increment_batch_items_retrieved IS 'バッチの取得アイテム数をインクリメント';
COMMENT ON FUNCTION update_batch_status IS 'タスク完了時に親バッチのステータスを自動更新';
