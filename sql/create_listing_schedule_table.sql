-- ===================================================
-- 出品スケジュールテーブル作成SQL
-- 承認とスケジューリングを分離した柔軟な出品管理システム
-- ===================================================

-- 既存テーブルの削除(必要に応じて)
DROP TABLE IF EXISTS listing_schedule CASCADE;

-- listing_scheduleテーブルの作成
CREATE TABLE listing_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 商品マスターへの参照
    product_id BIGINT NOT NULL REFERENCES products_master(id) ON DELETE CASCADE,
    
    -- 出品先情報
    marketplace TEXT NOT NULL, -- 'ebay', 'shopee', 'qoo10', 'amazon_jp', 'shopify'など
    account_id TEXT NOT NULL, -- 該当モールの特定アカウント (例: 'mjt', 'green', 'main')
    
    -- スケジュール情報
    scheduled_at TIMESTAMPTZ NOT NULL, -- 実際の出品予約日時
    
    -- ステータス管理
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'ERROR', 'CANCELLED'
    
    -- 出品結果
    listing_id_external TEXT, -- 出品成功時にモール側から返されるID
    listed_at TIMESTAMPTZ, -- 実際に出品が完了した日時
    error_message TEXT, -- エラー発生時のメッセージ
    retry_count INTEGER DEFAULT 0, -- リトライ回数
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT, -- 作成者（システム or ユーザーID）
    
    -- 追加情報(オプション)
    notes TEXT, -- メモ・備考
    priority INTEGER DEFAULT 0, -- 優先度（高いほど優先）
    
    -- 制約
    UNIQUE(product_id, marketplace, account_id, scheduled_at) -- 同じ商品を同じ時刻に複数回スケジュールできないように
);

-- インデックスの作成
CREATE INDEX idx_listing_schedule_product_id ON listing_schedule(product_id);
CREATE INDEX idx_listing_schedule_marketplace ON listing_schedule(marketplace);
CREATE INDEX idx_listing_schedule_status ON listing_schedule(status);
CREATE INDEX idx_listing_schedule_scheduled_at ON listing_schedule(scheduled_at);
CREATE INDEX idx_listing_schedule_marketplace_account ON listing_schedule(marketplace, account_id);

-- 複合インデックス（スケジューラ実行時の効率化）
CREATE INDEX idx_listing_schedule_pending ON listing_schedule(scheduled_at, status) 
WHERE status IN ('PENDING', 'SCHEDULED');

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_listing_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_schedule_updated_at
    BEFORE UPDATE ON listing_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_schedule_updated_at();

-- テーブルへのコメント
COMMENT ON TABLE listing_schedule IS '出品スケジュール管理テーブル - 承認後の出品予約を管理';
COMMENT ON COLUMN listing_schedule.product_id IS 'products_masterテーブルへの参照';
COMMENT ON COLUMN listing_schedule.marketplace IS '出品先モール名';
COMMENT ON COLUMN listing_schedule.account_id IS 'モール内の特定アカウント';
COMMENT ON COLUMN listing_schedule.scheduled_at IS '出品予約日時';
COMMENT ON COLUMN listing_schedule.status IS 'スケジュールステータス';
COMMENT ON COLUMN listing_schedule.listing_id_external IS 'モール側の出品ID';
COMMENT ON COLUMN listing_schedule.retry_count IS 'エラー時のリトライ回数';

-- RLSポリシーの設定（セキュリティ）
ALTER TABLE listing_schedule ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが閲覧可能
CREATE POLICY "Allow read access to all users" ON listing_schedule
    FOR SELECT
    USING (true);

-- 認証済みユーザーのみ挿入・更新・削除可能
CREATE POLICY "Allow insert for authenticated users" ON listing_schedule
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON listing_schedule
    FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON listing_schedule
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- サンプルデータ挿入用の関数（テスト用）
CREATE OR REPLACE FUNCTION insert_sample_listing_schedules()
RETURNS void AS $$
DECLARE
    sample_product_id BIGINT;
BEGIN
    -- サンプル商品を1つ取得
    SELECT id INTO sample_product_id FROM products_master LIMIT 1;
    
    IF sample_product_id IS NULL THEN
        RAISE NOTICE 'No product found in products_master table. Please create products first.';
        RETURN;
    END IF;
    
    -- サンプルスケジュールを挿入
    INSERT INTO listing_schedule (product_id, marketplace, account_id, scheduled_at, status, created_by)
    VALUES
        (sample_product_id, 'ebay', 'mjt', NOW() + INTERVAL '1 day', 'PENDING', 'system'),
        (sample_product_id, 'ebay', 'green', NOW() + INTERVAL '2 days', 'PENDING', 'system'),
        (sample_product_id, 'shopee', 'main', NOW() + INTERVAL '3 days', 'SCHEDULED', 'system');
    
    RAISE NOTICE 'Sample listing schedules inserted successfully';
END;
$$ LANGUAGE plpgsql;

-- 実行例:
-- SELECT insert_sample_listing_schedules();
