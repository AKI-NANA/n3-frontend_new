-- products テーブルにフィルターチェック関連カラムを追加

-- フィルター通過フラグ
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS filter_passed BOOLEAN DEFAULT NULL;

-- フィルターチェック実行日時
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS filter_checked_at TIMESTAMPTZ DEFAULT NULL;

-- 検出されたNGワード情報 (JSON)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS filter_detected_keywords JSONB DEFAULT NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_products_filter_passed ON products(filter_passed);
CREATE INDEX IF NOT EXISTS idx_products_filter_checked_at ON products(filter_checked_at);

COMMENT ON COLUMN products.filter_passed IS 'フィルター通過: true=通過, false=不合格, null=未チェック';
COMMENT ON COLUMN products.filter_checked_at IS 'フィルターチェック実行日時';
COMMENT ON COLUMN products.filter_detected_keywords IS '検出されたNGワード情報 (JSON配列)';
