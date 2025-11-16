-- SellerMirrorの販売数カラムを追加
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sm_sales_count INTEGER DEFAULT 0;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_sm_sales_count ON products(sm_sales_count);

COMMENT ON COLUMN products.sm_sales_count IS 'SellerMirrorで取得した過去の販売数（sold count）';
