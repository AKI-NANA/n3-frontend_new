-- eBayカテゴリ別必須項目キャッシュテーブル
-- API: /api/ebay/category-specifics からの取得結果をキャッシュ

CREATE TABLE IF NOT EXISTS ebay_category_specifics (
  id BIGSERIAL PRIMARY KEY,
  category_id TEXT NOT NULL UNIQUE,
  category_name TEXT,
  required_fields JSONB DEFAULT '[]'::jsonb,
  recommended_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ebay_category_specifics_category_id 
  ON ebay_category_specifics(category_id);

CREATE INDEX IF NOT EXISTS idx_ebay_category_specifics_updated_at 
  ON ebay_category_specifics(updated_at DESC);

-- コメント追加
COMMENT ON TABLE ebay_category_specifics IS 'eBayカテゴリ別の必須項目・推奨項目をキャッシュ（24時間）';
COMMENT ON COLUMN ebay_category_specifics.category_id IS 'eBayカテゴリID（例: 63852）';
COMMENT ON COLUMN ebay_category_specifics.category_name IS 'カテゴリ名（例: Building Toys）';
COMMENT ON COLUMN ebay_category_specifics.required_fields IS '必須項目の配列: [{name, label, type, required, options, ...}]';
COMMENT ON COLUMN ebay_category_specifics.recommended_fields IS '推奨項目の配列: [{name, label, type, required, options, ...}]';
COMMENT ON COLUMN ebay_category_specifics.updated_at IS 'キャッシュの有効期限判定に使用（24時間）';
