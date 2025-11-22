-- 005_create_shipping_queue.sql
-- Phase 2: 出荷管理システム V1.0

-- ==============================================
-- T45: 出荷キューテーブル
-- ==============================================
CREATE TABLE IF NOT EXISTS shipping_queue (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL, -- 受注管理V2.0からのFK
    queue_status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Picking, Packed, Shipped
    picker_user_id TEXT, -- ピッキング担当者ID
    tracking_number TEXT, -- 追跡番号
    shipping_method_id TEXT, -- 配送方法ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    shipped_at TIMESTAMPTZ, -- 出荷完了日時

    CONSTRAINT valid_queue_status CHECK (queue_status IN ('Pending', 'Picking', 'Packed', 'Shipped'))
);

CREATE INDEX idx_shipping_queue_order_id ON shipping_queue(order_id);
CREATE INDEX idx_shipping_queue_status ON shipping_queue(queue_status);
CREATE INDEX idx_shipping_queue_picker ON shipping_queue(picker_user_id);

COMMENT ON TABLE shipping_queue IS '出荷キュー管理テーブル（D&D UIでステータス更新）';
COMMENT ON COLUMN shipping_queue.queue_status IS 'Pending: 仕入れ待ち, Picking: ピッキング中, Packed: 梱包済み, Shipped: 出荷済み';

-- ==============================================
-- T46: 出荷遅延フラグテーブル
-- ==============================================
CREATE TABLE IF NOT EXISTS shipping_delay_flags (
    id SERIAL PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE, -- 受注管理V2.0からのFK
    is_delayed_risk BOOLEAN DEFAULT FALSE, -- 遅延リスクフラグ
    expected_ship_date DATE, -- 予測出荷日
    delay_reason TEXT, -- Holiday, Sourcing_Pending, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_delay_reason CHECK (delay_reason IN ('Holiday', 'Sourcing_Pending', 'Capacity_Issue', 'Other'))
);

CREATE INDEX idx_delay_flags_order_id ON shipping_delay_flags(order_id);
CREATE INDEX idx_delay_flags_risk ON shipping_delay_flags(is_delayed_risk);

COMMENT ON TABLE shipping_delay_flags IS '出荷遅延リスク予測テーブル（アカウントヘルスリスクゼロ化）';
COMMENT ON COLUMN shipping_delay_flags.delay_reason IS 'Holiday: 休日, Sourcing_Pending: 仕入れ待ち, Capacity_Issue: 処理能力不足';

-- ==============================================
-- ビュー: 出荷キュー統合ビュー
-- ==============================================
CREATE OR REPLACE VIEW v_shipping_queue_with_flags AS
SELECT
    sq.id,
    sq.order_id,
    sq.queue_status,
    sq.picker_user_id,
    sq.tracking_number,
    sq.shipping_method_id,
    sq.created_at,
    sq.updated_at,
    sq.shipped_at,
    df.is_delayed_risk,
    df.expected_ship_date,
    df.delay_reason
FROM shipping_queue sq
LEFT JOIN shipping_delay_flags df ON sq.order_id = df.order_id;

COMMENT ON VIEW v_shipping_queue_with_flags IS '出荷キューと遅延フラグを統合したビュー（UI表示用）';
