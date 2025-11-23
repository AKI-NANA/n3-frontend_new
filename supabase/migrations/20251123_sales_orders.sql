-- ================================================================
-- 📦 Sales Orders Table Migration
-- ================================================================
-- 作成日: 2025-11-23
-- 目的: 受注データの中核を担うテーブル
-- 連携: products_master (FK), 出荷管理システム, 受注管理システム
-- ================================================================

-- 1. テーブルの作成
CREATE TABLE IF NOT EXISTS sales_orders (
    -- 主キー
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- 受注識別情報
    order_id VARCHAR(255) NOT NULL UNIQUE,
    marketplace_id VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    customer_id VARCHAR(255),

    -- 受注ステータス
    order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- order_status の値: 'pending', 'paid', 'processing', 'shipped', 'cancelled', 'refunded'

    -- 出荷関連情報
    shipping_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    -- shipping_status の値: 'PENDING', 'READY', 'COMPLETED'
    final_shipping_deadline TIMESTAMPTZ,
    final_shipping_cost NUMERIC(10, 2),
    tracking_number VARCHAR(255),

    -- 商品情報
    item_id VARCHAR(255),
    item_name VARCHAR(500),
    quantity INTEGER DEFAULT 1,

    -- 金額情報
    total_amount NUMERIC(10, 2),
    estimated_shipping_cost NUMERIC(10, 2),

    -- 配送先情報
    shipping_address TEXT,
    shipping_country VARCHAR(100),
    shipping_postal_code VARCHAR(50),

    -- 仕入れ関連
    purchase_status VARCHAR(50) DEFAULT '未仕入れ',
    -- purchase_status の値: '未仕入れ', '仕入れ済み'
    actual_purchase_url TEXT,
    actual_purchase_cost_jpy NUMERIC(10, 2),

    -- 利益計算
    estimated_profit_usd NUMERIC(10, 2),
    final_profit_usd NUMERIC(10, 2),

    -- 請求書連携
    invoice_group_id VARCHAR(255),

    -- メモ・備考
    notes TEXT,

    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 外部キー制約の追加
-- products_master への外部キー（item_id が存在する場合のみ）
-- 注意: products_master テーブルが存在し、適切なカラムがある場合のみ有効
-- ALTER TABLE sales_orders
-- ADD CONSTRAINT fk_sales_orders_item
-- FOREIGN KEY (item_id) REFERENCES products_master(item_id)
-- ON DELETE SET NULL;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_id ON sales_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_marketplace ON sales_orders(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_shipping_status ON sales_orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_deadline ON sales_orders(final_shipping_deadline);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_item_id ON sales_orders(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON sales_orders(created_at);

-- 4. トリガー: updated_at の自動更新
CREATE OR REPLACE FUNCTION update_sales_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_orders_updated_at();

-- 5. RLS (Row Level Security) の設定
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーに全権限を付与（開発環境用）
CREATE POLICY "Enable all access for authenticated users" ON sales_orders
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. コメントの追加
COMMENT ON TABLE sales_orders IS '受注管理の中核テーブル：モール別受注、出荷ステータス、利益確定を一元管理';
COMMENT ON COLUMN sales_orders.id IS 'プライマリキー（UUID）';
COMMENT ON COLUMN sales_orders.order_id IS 'モール側の注文ID（一意制約）';
COMMENT ON COLUMN sales_orders.marketplace_id IS 'モールID（eBay, Amazon, Shopee等）';
COMMENT ON COLUMN sales_orders.shipping_status IS '出荷ステータス（PENDING/READY/COMPLETED）';
COMMENT ON COLUMN sales_orders.final_shipping_deadline IS '出荷期限（優先順位ソートに使用）';
COMMENT ON COLUMN sales_orders.final_shipping_cost IS '確定送料（JPY）- 請求書連携に使用';
COMMENT ON COLUMN sales_orders.tracking_number IS '追跡番号';
COMMENT ON COLUMN sales_orders.item_id IS '商品ID（products_masterへのFK）';
COMMENT ON COLUMN sales_orders.invoice_group_id IS '請求書グループID（経費証明書連携用）';

-- ================================================================
-- マイグレーション完了
-- ================================================================
