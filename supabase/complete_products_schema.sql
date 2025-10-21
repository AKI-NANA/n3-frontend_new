-- =========================================
-- 商品テーブル完全版スキーマ追加
-- eBay API出品対応 + モーダル/Excel UI対応
-- =========================================

-- 1. 基本的な不足カラムを追加
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS source_item_id TEXT,
ADD COLUMN IF NOT EXISTS master_key TEXT,
ADD COLUMN IF NOT EXISTS current_stock INTEGER,
ADD COLUMN IF NOT EXISTS profit_amount_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_average_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS sm_competitor_count INTEGER,
ADD COLUMN IF NOT EXISTS sm_profit_amount_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS ebay_api_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS scraped_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS listing_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS listed_at TIMESTAMP WITH TIME ZONE;

-- 2. eBay API出品に必要なカラム
ALTER TABLE products
-- 基本出品情報
ADD COLUMN IF NOT EXISTS ebay_listing_id TEXT,
ADD COLUMN IF NOT EXISTS ebay_sku TEXT,
ADD COLUMN IF NOT EXISTS listing_format TEXT DEFAULT 'FixedPrice', -- FixedPrice, Auction
ADD COLUMN IF NOT EXISTS listing_duration TEXT DEFAULT 'GTC', -- GTC (Good Till Canceled), Days_7, Days_10, etc

-- 価格設定
ADD COLUMN IF NOT EXISTS start_price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS buy_it_now_price_usd NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS reserve_price_usd NUMERIC(10,2),

-- 在庫管理
ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS minimum_quantity INTEGER DEFAULT 1,

-- Item Specifics（商品詳細情報）
ADD COLUMN IF NOT EXISTS item_specifics JSONB DEFAULT '{}'::jsonb,

-- eBayカテゴリ
ADD COLUMN IF NOT EXISTS ebay_category_id TEXT,
ADD COLUMN IF NOT EXISTS ebay_category_path TEXT,
ADD COLUMN IF NOT EXISTS ebay_secondary_category_id TEXT,
ADD COLUMN IF NOT EXISTS category_confidence NUMERIC(5,2),

-- 配送・ポリシー
ADD COLUMN IF NOT EXISTS fulfillment_policy_id TEXT,
ADD COLUMN IF NOT EXISTS payment_policy_id TEXT,
ADD COLUMN IF NOT EXISTS return_policy_id TEXT,

-- 商品状態
ADD COLUMN IF NOT EXISTS condition_id TEXT, -- 1000 (New), 3000 (Used), etc
ADD COLUMN IF NOT EXISTS condition_description TEXT,

-- ストア設定
ADD COLUMN IF NOT EXISTS store_category_id TEXT,

-- パフォーマンストラッキング
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS watch_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sold_quantity INTEGER DEFAULT 0,

-- eBay手数料
ADD COLUMN IF NOT EXISTS ebay_fee_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS ebay_fee_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS final_value_fee NUMERIC(10,2),

-- EU責任者情報（既に存在する可能性あり）
ADD COLUMN IF NOT EXISTS eu_responsible_company_name TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_city TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_state_or_province TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_postal_code TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_country TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_email TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_phone TEXT,
ADD COLUMN IF NOT EXISTS eu_responsible_contact_url TEXT,

-- バリエーション（複数SKU商品用）
ADD COLUMN IF NOT EXISTS is_variation_parent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_sku TEXT,
ADD COLUMN IF NOT EXISTS variation_specifics JSONB DEFAULT '{}'::jsonb,
-- 例: {"Color": "Red", "Size": "Large"}

-- プロモーション/割引
ADD COLUMN IF NOT EXISTS promotional_sale_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS promotional_sale_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promotional_sale_end_date TIMESTAMP WITH TIME ZONE;

-- 3. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_products_source_item_id ON products(source_item_id);
CREATE INDEX IF NOT EXISTS idx_products_master_key ON products(master_key);
CREATE INDEX IF NOT EXISTS idx_products_ebay_listing_id ON products(ebay_listing_id);
CREATE INDEX IF NOT EXISTS idx_products_ebay_sku ON products(ebay_sku);
CREATE INDEX IF NOT EXISTS idx_products_ebay_category_id ON products(ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_products_data_source ON products(data_source);
CREATE INDEX IF NOT EXISTS idx_products_listing_format ON products(listing_format);
CREATE INDEX IF NOT EXISTS idx_products_listed_at ON products(listed_at);

-- 4. JSONB GINインデックス（JSONBカラムの検索高速化）
CREATE INDEX IF NOT EXISTS idx_products_ebay_api_data_gin ON products USING GIN(ebay_api_data);
CREATE INDEX IF NOT EXISTS idx_products_scraped_data_gin ON products USING GIN(scraped_data);
CREATE INDEX IF NOT EXISTS idx_products_listing_data_gin ON products USING GIN(listing_data);
CREATE INDEX IF NOT EXISTS idx_products_item_specifics_gin ON products USING GIN(item_specifics);
CREATE INDEX IF NOT EXISTS idx_products_tool_processed_gin ON products USING GIN(tool_processed);

-- 5. コメント追加
COMMENT ON COLUMN products.source_item_id IS '元のアイテムID（Yahoo, Amazonなど）';
COMMENT ON COLUMN products.master_key IS 'マスターキー（複数マーケットプレイス連携用）';
COMMENT ON COLUMN products.ebay_listing_id IS 'eBay出品ID';
COMMENT ON COLUMN products.ebay_sku IS 'eBay SKU';
COMMENT ON COLUMN products.listing_format IS '出品形式: FixedPrice, Auction';
COMMENT ON COLUMN products.item_specifics IS 'Item Specifics（Brand, MPN, UPCなど）';
COMMENT ON COLUMN products.ebay_category_id IS 'eBayカテゴリID';
COMMENT ON COLUMN products.fulfillment_policy_id IS '配送ポリシーID';
COMMENT ON COLUMN products.payment_policy_id IS '支払いポリシーID';
COMMENT ON COLUMN products.return_policy_id IS '返品ポリシーID';
COMMENT ON COLUMN products.condition_id IS 'eBay商品状態ID（1000=New, 3000=Usedなど）';
COMMENT ON COLUMN products.data_source IS 'データソース: sample, scraped, api, calculated, manual, tool';
COMMENT ON COLUMN products.tool_processed IS 'ツール処理履歴（JSONB）';

-- 6. 追加されたカラムを確認
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products'
AND column_name IN (
    'source_item_id', 'master_key', 'ebay_listing_id', 'ebay_sku',
    'listing_format', 'item_specifics', 'ebay_category_id',
    'fulfillment_policy_id', 'payment_policy_id', 'return_policy_id',
    'condition_id', 'eu_responsible_company_name', 'data_source', 'tool_processed'
)
ORDER BY column_name;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ 商品テーブルスキーマ拡張完了！';
  RAISE NOTICE '📦 eBay API出品対応カラム追加';
  RAISE NOTICE '🎨 モーダル/Excel UI対応カラム追加';
  RAISE NOTICE '🔍 パフォーマンス向上用インデックス作成';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. サンプルデータ投入';
  RAISE NOTICE '2. UIでの表示確認';
  RAISE NOTICE '3. eBay API連携テスト';
END $$;
