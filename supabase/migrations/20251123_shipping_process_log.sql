-- ================================================================
-- 📊 Shipping Process Log Table Migration
-- ================================================================
-- 作成日: 2025-11-23
-- 目的: 出荷作業の全プロセスを監査ログとして記録（バーコードスキャン、作業時間、作業者KPI管理）
-- 連携: sales_orders (FK), ShipmentAuditor サービス
-- ================================================================

-- 1. テーブルの作成
CREATE TABLE IF NOT EXISTS shipping_process_log (
    -- 主キー
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 受注情報
    order_id VARCHAR(255) NOT NULL,
    sales_order_uuid UUID,

    -- 作業者情報
    operator_id VARCHAR(255) NOT NULL,
    operator_name VARCHAR(255),

    -- アクション種別
    action_type VARCHAR(100) NOT NULL,
    -- action_type の値:
    -- 'SCAN_ORDER_ID'       - 受注IDのバーコードスキャン
    -- 'SCAN_ITEM'           - 商品バーコードスキャン
    -- 'SCAN_PACKING_MAT'    - 梱包資材バーコードスキャン
    -- 'ENTER_TRACKING'      - 追跡番号入力
    -- 'PRINT_LABEL'         - 伝票印刷
    -- 'COMPLETE_SHIPMENT'   - 出荷完了
    -- 'UPDATE_STATUS'       - ステータス更新
    -- 'UPLOAD_PROOF'        - 送料証明書アップロード

    -- スキャン・入力値
    scanned_value VARCHAR(500),
    input_value TEXT,

    -- 検証結果
    validation_status VARCHAR(50) DEFAULT 'pending',
    -- validation_status の値: 'success', 'failed', 'pending', 'skipped'
    validation_message TEXT,

    -- エラー情報
    error_code VARCHAR(100),
    error_details TEXT,

    -- 追加データ (JSONB形式)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- 例: {
    --   "device_id": "SCANNER-001",
    --   "location": "倉庫A",
    --   "session_id": "SESSION-12345",
    --   "ip_address": "192.168.1.100"
    -- }

    -- パフォーマンス計測
    processing_time_ms INTEGER,
    previous_action_log_id UUID,

    -- タイムスタンプ
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 外部キー制約の追加
-- sales_orders への外部キー
ALTER TABLE shipping_process_log
ADD CONSTRAINT fk_shipping_process_log_sales_order
FOREIGN KEY (sales_order_uuid) REFERENCES sales_orders(id)
ON DELETE SET NULL;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_shipping_log_order_id ON shipping_process_log(order_id);
CREATE INDEX IF NOT EXISTS idx_shipping_log_sales_order_uuid ON shipping_process_log(sales_order_uuid);
CREATE INDEX IF NOT EXISTS idx_shipping_log_operator ON shipping_process_log(operator_id);
CREATE INDEX IF NOT EXISTS idx_shipping_log_action_type ON shipping_process_log(action_type);
CREATE INDEX IF NOT EXISTS idx_shipping_log_timestamp ON shipping_process_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_log_validation_status ON shipping_process_log(validation_status);
CREATE INDEX IF NOT EXISTS idx_shipping_log_created_at ON shipping_process_log(created_at DESC);

-- 4. RLS (Row Level Security) の設定
ALTER TABLE shipping_process_log ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーに全権限を付与（開発環境用）
CREATE POLICY "Enable all access for authenticated users" ON shipping_process_log
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. パーティショニング設定（オプション：大量ログ対策）
-- 月次パーティショニングを設定する場合のサンプル
-- CREATE TABLE shipping_process_log_y2025m11 PARTITION OF shipping_process_log
-- FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- 6. ビュー: 作業者別KPI集計
CREATE OR REPLACE VIEW v_operator_kpi AS
SELECT
    operator_id,
    operator_name,
    DATE(timestamp) as work_date,
    COUNT(*) as total_actions,
    COUNT(DISTINCT order_id) as orders_processed,
    COUNT(CASE WHEN action_type = 'COMPLETE_SHIPMENT' THEN 1 END) as shipments_completed,
    COUNT(CASE WHEN validation_status = 'failed' THEN 1 END) as validation_errors,
    AVG(processing_time_ms) as avg_processing_time_ms,
    MIN(timestamp) as first_action_time,
    MAX(timestamp) as last_action_time,
    EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as work_hours
FROM shipping_process_log
GROUP BY operator_id, operator_name, DATE(timestamp)
ORDER BY work_date DESC, orders_processed DESC;

-- 7. ビュー: 受注別作業履歴
CREATE OR REPLACE VIEW v_order_process_history AS
SELECT
    spl.order_id,
    spl.operator_id,
    spl.operator_name,
    spl.action_type,
    spl.scanned_value,
    spl.validation_status,
    spl.validation_message,
    spl.processing_time_ms,
    spl.timestamp,
    so.shipping_status,
    so.marketplace_id,
    so.customer_name
FROM shipping_process_log spl
LEFT JOIN sales_orders so ON spl.sales_order_uuid = so.id
ORDER BY spl.timestamp DESC;

-- 8. ビュー: リアルタイム作業状況
CREATE OR REPLACE VIEW v_realtime_work_status AS
SELECT
    operator_id,
    operator_name,
    COUNT(*) as actions_last_hour,
    MAX(timestamp) as last_action_time,
    EXTRACT(EPOCH FROM (NOW() - MAX(timestamp))) / 60 as minutes_since_last_action,
    COUNT(DISTINCT CASE
        WHEN timestamp > NOW() - INTERVAL '1 hour' THEN order_id
    END) as orders_in_progress
FROM shipping_process_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY operator_id, operator_name
ORDER BY last_action_time DESC;

-- 9. コメントの追加
COMMENT ON TABLE shipping_process_log IS '出荷作業監査ログ：バーコードスキャン、作業時間、エラーを全記録し、作業者KPI管理を実現';
COMMENT ON COLUMN shipping_process_log.log_id IS 'プライマリキー（UUID）';
COMMENT ON COLUMN shipping_process_log.order_id IS '受注ID（モール側のID）';
COMMENT ON COLUMN shipping_process_log.sales_order_uuid IS 'sales_ordersテーブルへのFK';
COMMENT ON COLUMN shipping_process_log.operator_id IS '作業者ID';
COMMENT ON COLUMN shipping_process_log.action_type IS 'アクション種別（SCAN_ITEM, ENTER_TRACKING, COMPLETE_SHIPMENT等）';
COMMENT ON COLUMN shipping_process_log.scanned_value IS 'スキャンされたバーコード値';
COMMENT ON COLUMN shipping_process_log.validation_status IS '検証結果（success, failed, pending, skipped）';
COMMENT ON COLUMN shipping_process_log.processing_time_ms IS '処理時間（ミリ秒）';
COMMENT ON COLUMN shipping_process_log.metadata IS '追加データ（デバイスID、ロケーション等をJSONBで保存）';

COMMENT ON VIEW v_operator_kpi IS '作業者別KPI集計ビュー：日次の作業量、完了数、エラー数、作業時間を表示';
COMMENT ON VIEW v_order_process_history IS '受注別作業履歴ビュー：全アクションの時系列を表示';
COMMENT ON VIEW v_realtime_work_status IS 'リアルタイム作業状況ビュー：現在作業中の作業者を表示';

-- 10. サンプルデータの挿入（開発・テスト用）
INSERT INTO shipping_process_log (
    order_id,
    operator_id,
    operator_name,
    action_type,
    scanned_value,
    validation_status,
    processing_time_ms
) VALUES
(
    'ORD-1001',
    'OP-001',
    '山田太郎',
    'SCAN_ORDER_ID',
    'ORD-1001',
    'success',
    120
),
(
    'ORD-1001',
    'OP-001',
    '山田太郎',
    'SCAN_ITEM',
    'WATCH-001',
    'success',
    95
),
(
    'ORD-1001',
    'OP-001',
    '山田太郎',
    'PRINT_LABEL',
    NULL,
    'success',
    340
),
(
    'ORD-1001',
    'OP-001',
    '山田太郎',
    'COMPLETE_SHIPMENT',
    NULL,
    'success',
    210
);

-- ================================================================
-- マイグレーション完了
-- ================================================================
