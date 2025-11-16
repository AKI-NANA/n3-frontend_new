-- 承認システムとスケジューラーの連携SQL

-- 1. 承認取り消し時のトリガー（自動的にスケジュールから削除）
CREATE OR REPLACE FUNCTION handle_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- 承認ステータスが 'approved' から他の状態に変更された場合
  IF OLD.approval_status = 'approved' AND NEW.approval_status != 'approved' THEN
    -- スケジュール情報をクリア
    NEW.listing_session_id := NULL;
    NEW.scheduled_listing_date := NULL;
    NEW.status := 'pending';
    
    -- ログに記録
    RAISE NOTICE 'Product % approval revoked. Schedule cleared.', NEW.id;
  END IF;
  
  -- 承認された場合、status を 'ready_to_list' に設定
  IF OLD.approval_status != 'approved' AND NEW.approval_status = 'approved' THEN
    NEW.status := 'ready_to_list';
    RAISE NOTICE 'Product % approved. Status set to ready_to_list.', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（products_masterテーブル用）
DROP TRIGGER IF EXISTS trigger_approval_status_change ON products_master;
CREATE TRIGGER trigger_approval_status_change
  BEFORE UPDATE ON products_master
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION handle_approval_status_change();

-- トリガーの作成（yahoo_scraped_productsテーブル用）
DROP TRIGGER IF EXISTS trigger_approval_status_change_yahoo ON yahoo_scraped_products;
CREATE TRIGGER trigger_approval_status_change_yahoo
  BEFORE UPDATE ON yahoo_scraped_products
  FOR EACH ROW
  WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
  EXECUTE FUNCTION handle_approval_status_change();

-- 2. approval_status カラムが存在しない場合は追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending';

-- 3. approved_at, rejected_at カラムの追加
ALTER TABLE products_master 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_master_approval_status 
ON products_master(approval_status);

CREATE INDEX IF NOT EXISTS idx_products_master_status_approval 
ON products_master(status, approval_status);

CREATE INDEX IF NOT EXISTS idx_yahoo_products_approval_status 
ON yahoo_scraped_products(approval_status);

CREATE INDEX IF NOT EXISTS idx_yahoo_products_status_approval 
ON yahoo_scraped_products(status, approval_status);

-- 5. 既存データの移行（既に status='ready_to_list' のものは承認済みとする）
UPDATE products_master 
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE status = 'ready_to_list' 
  AND (approval_status IS NULL OR approval_status = 'pending');

UPDATE yahoo_scraped_products 
SET approval_status = 'approved',
    approved_at = COALESCE(approved_at, created_at)
WHERE status = 'ready_to_list' 
  AND (approval_status IS NULL OR approval_status = 'pending');

-- 6. 検証クエリ
-- 承認済みかつ出品待ちの商品数を確認
SELECT 
  'products_master' as table_name,
  COUNT(*) as count
FROM products_master 
WHERE approval_status = 'approved' 
  AND status = 'ready_to_list'
UNION ALL
SELECT 
  'yahoo_scraped_products' as table_name,
  COUNT(*) as count
FROM yahoo_scraped_products 
WHERE approval_status = 'approved' 
  AND status = 'ready_to_list';

-- 7. ビューの作成（承認済み出品待ち商品）
CREATE OR REPLACE VIEW approved_ready_to_list_products AS
SELECT 
  p.*,
  CASE 
    WHEN p.listing_session_id IS NOT NULL THEN 'scheduled'
    ELSE 'not_scheduled'
  END as schedule_status
FROM products_master p
WHERE p.approval_status = 'approved'
  AND p.status = 'ready_to_list'
ORDER BY p.ai_confidence_score DESC NULLS LAST;

-- yahoo_scraped_products版
CREATE OR REPLACE VIEW approved_ready_yahoo_products AS
SELECT 
  p.*,
  CASE 
    WHEN p.listing_session_id IS NOT NULL THEN 'scheduled'
    ELSE 'not_scheduled'
  END as schedule_status
FROM yahoo_scraped_products p
WHERE p.approval_status = 'approved'
  AND p.status = 'ready_to_list'
ORDER BY p.ai_confidence_score DESC NULLS LAST;

-- コメント追加
COMMENT ON COLUMN products_master.approval_status IS '承認ステータス: pending=承認待ち, approved=承認済み, rejected=否認';
COMMENT ON COLUMN products_master.approved_at IS '承認日時';
COMMENT ON COLUMN products_master.rejected_at IS '否認日時';
COMMENT ON COLUMN products_master.rejection_reason IS '否認理由';

COMMENT ON TRIGGER trigger_approval_status_change ON products_master IS '承認ステータス変更時に自動的にスケジュールをクリアするトリガー';
