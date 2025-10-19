-- 承認システム用データベーステーブル作成
-- 既存テーブルを一切変更せず、新規テーブルのみ作成

-- 1. 承認キューテーブル（出品待ち商品管理）
CREATE TABLE IF NOT EXISTS approval_queue (
    queue_id SERIAL PRIMARY KEY,
    item_sku VARCHAR(50) NOT NULL UNIQUE,
    marketplace VARCHAR(50) NOT NULL DEFAULT 'eBay_US',
    status VARCHAR(20) DEFAULT 'pending',
    priority_score INTEGER DEFAULT 0,
    category VARCHAR(100),
    title_jp TEXT,
    title_en TEXT,
    price_jpy NUMERIC(10,2),
    calculated_price_usd NUMERIC(10,2),
    image_url TEXT,
    source_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP NULL,
    approved_by VARCHAR(100) NULL,
    notes TEXT
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_approval_queue_status ON approval_queue(status);
CREATE INDEX IF NOT EXISTS idx_approval_queue_marketplace ON approval_queue(marketplace);
CREATE INDEX IF NOT EXISTS idx_approval_queue_category ON approval_queue(category);
CREATE INDEX IF NOT EXISTS idx_approval_queue_created ON approval_queue(created_at);

-- 2. 承認ログテーブル（承認・拒否の履歴管理）
CREATE TABLE IF NOT EXISTS approval_logs (
    log_id SERIAL PRIMARY KEY,
    item_sku VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'approve', 'reject', 'hold'
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    performed_by VARCHAR(100),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (item_sku) REFERENCES approval_queue(item_sku) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_approval_logs_sku ON approval_logs(item_sku);
CREATE INDEX IF NOT EXISTS idx_approval_logs_action ON approval_logs(action);
CREATE INDEX IF NOT EXISTS idx_approval_logs_performed ON approval_logs(performed_at);

-- 3. カテゴリ別承認設定テーブル
CREATE TABLE IF NOT EXISTS approval_category_settings (
    setting_id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL UNIQUE,
    auto_approve_threshold NUMERIC(5,2) DEFAULT 0.8, -- 自動承認スコア閾値
    require_manual_review BOOLEAN DEFAULT TRUE,
    priority_multiplier NUMERIC(3,2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- デフォルトカテゴリ設定を挿入
INSERT INTO approval_category_settings (category, auto_approve_threshold, require_manual_review, priority_multiplier) VALUES
('Electronics', 0.7, TRUE, 1.2),
('Toys', 0.8, FALSE, 1.0),
('Books', 0.9, FALSE, 0.8),
('Clothing', 0.6, TRUE, 1.1),
('Sports', 0.7, TRUE, 1.0),
('Home & Garden', 0.8, FALSE, 0.9)
ON CONFLICT (category) DO NOTHING;

-- 4. 承認統計テーブル（ダッシュボード用）
CREATE TABLE IF NOT EXISTS approval_statistics (
    stat_id SERIAL PRIMARY KEY,
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    total_pending INTEGER DEFAULT 0,
    total_approved INTEGER DEFAULT 0,
    total_rejected INTEGER DEFAULT 0,
    total_held INTEGER DEFAULT 0,
    avg_approval_time_minutes NUMERIC(8,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date_recorded)
);

-- 承認統計を更新する関数
CREATE OR REPLACE FUNCTION update_approval_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO approval_statistics (
        date_recorded,
        total_pending,
        total_approved,
        total_rejected,
        total_held
    )
    SELECT 
        CURRENT_DATE,
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'approved'),
        COUNT(*) FILTER (WHERE status = 'rejected'),
        COUNT(*) FILTER (WHERE status = 'held')
    FROM approval_queue
    ON CONFLICT (date_recorded) DO UPDATE SET
        total_pending = EXCLUDED.total_pending,
        total_approved = EXCLUDED.total_approved,
        total_rejected = EXCLUDED.total_rejected,
        total_held = EXCLUDED.total_held;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
DROP TRIGGER IF EXISTS trigger_update_approval_stats ON approval_queue;
CREATE TRIGGER trigger_update_approval_stats
    AFTER INSERT OR UPDATE OR DELETE ON approval_queue
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_approval_statistics();

-- サンプルデータ挿入（テスト用）
INSERT INTO approval_queue (
    item_sku, marketplace, title_jp, title_en, price_jpy, calculated_price_usd, 
    category, image_url, source_url, priority_score
) VALUES
('SKU-TEST-001', 'eBay_US', 'ソニー ワイヤレスヘッドホン', 'Sony Wireless Headphones WH-1000XM5', 35000, 245.50, 'Electronics', 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400', 'https://auctions.yahoo.co.jp/test1', 85),
('SKU-TEST-002', 'eBay_US', 'ポケモンカード 未開封BOX', 'Pokemon Cards Sealed Box Japanese', 8500, 59.80, 'Toys', 'https://images.unsplash.com/photo-1613963931023-5dc59437c8a6?w=400', 'https://auctions.yahoo.co.jp/test2', 92),
('SKU-TEST-003', 'eBay_US', '日本製 包丁セット', 'Japanese Kitchen Knife Set', 15000, 105.20, 'Home & Garden', 'https://images.unsplash.com/photo-1544726747-4cc3e89e8c9b?w=400', 'https://auctions.yahoo.co.jp/test3', 76),
('SKU-TEST-004', 'eBay_US', 'アニメフィギュア 限定版', 'Anime Figure Limited Edition', 12000, 84.30, 'Toys', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'https://auctions.yahoo.co.jp/test4', 88),
('SKU-TEST-005', 'eBay_US', '腕時計 セイコー', 'Seiko Watch Automatic', 28000, 196.50, 'Electronics', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', 'https://auctions.yahoo.co.jp/test5', 79)
ON CONFLICT (item_sku) DO NOTHING;

-- ビュー作成：承認待ち商品の詳細情報
CREATE OR REPLACE VIEW v_approval_queue_details AS
SELECT 
    aq.*,
    acs.auto_approve_threshold,
    acs.require_manual_review,
    CASE 
        WHEN aq.priority_score >= (acs.auto_approve_threshold * 100) AND NOT acs.require_manual_review 
        THEN 'auto_approvable'
        ELSE 'manual_review_required'
    END as recommendation,
    EXTRACT(EPOCH FROM (NOW() - aq.created_at))/3600 as hours_pending
FROM approval_queue aq
LEFT JOIN approval_category_settings acs ON aq.category = acs.category
WHERE aq.status = 'pending'
ORDER BY aq.priority_score DESC, aq.created_at ASC;

-- 承認関連の便利な関数
-- 1. 一括承認関数
CREATE OR REPLACE FUNCTION bulk_approve_items(
    p_skus TEXT[],
    p_approved_by VARCHAR(100) DEFAULT 'system'
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE approval_queue 
        SET 
            status = 'approved',
            approved_at = NOW(),
            approved_by = p_approved_by
        WHERE item_sku = ANY(p_skus) 
        AND status = 'pending'
        RETURNING item_sku
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    -- ログに記録
    INSERT INTO approval_logs (item_sku, action, old_status, new_status, performed_by)
    SELECT unnest(p_skus), 'approve', 'pending', 'approved', p_approved_by;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 2. 一括拒否関数
CREATE OR REPLACE FUNCTION bulk_reject_items(
    p_skus TEXT[],
    p_performed_by VARCHAR(100) DEFAULT 'system',
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE approval_queue 
        SET 
            status = 'rejected',
            notes = COALESCE(p_notes, notes)
        WHERE item_sku = ANY(p_skus) 
        AND status = 'pending'
        RETURNING item_sku
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    -- ログに記録
    INSERT INTO approval_logs (item_sku, action, old_status, new_status, performed_by, notes)
    SELECT unnest(p_skus), 'reject', 'pending', 'rejected', p_performed_by, p_notes;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 3. 保留関数
CREATE OR REPLACE FUNCTION bulk_hold_items(
    p_skus TEXT[],
    p_performed_by VARCHAR(100) DEFAULT 'system',
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    WITH updated AS (
        UPDATE approval_queue 
        SET 
            status = 'held',
            notes = COALESCE(p_notes, notes)
        WHERE item_sku = ANY(p_skus) 
        AND status = 'pending'
        RETURNING item_sku
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    -- ログに記録
    INSERT INTO approval_logs (item_sku, action, old_status, new_status, performed_by, notes)
    SELECT unnest(p_skus), 'hold', 'pending', 'held', p_performed_by, p_notes;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- 初期統計データ更新
SELECT update_approval_statistics();

-- 作成完了メッセージ
SELECT 'Approval system database tables created successfully!' as message;