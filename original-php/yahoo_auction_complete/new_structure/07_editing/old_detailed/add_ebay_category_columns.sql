-- Yahoo Auction システム用 eBayカテゴリーカラム追加
-- 既存のyahoo_scraped_productsテーブルにeBayカテゴリー関連カラムを追加

ALTER TABLE yahoo_scraped_products 
ADD COLUMN IF NOT EXISTS ebay_category_id VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ebay_category_path TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS category_confidence INTEGER DEFAULT 0;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_ebay_category_id ON yahoo_scraped_products(ebay_category_id);
CREATE INDEX IF NOT EXISTS idx_yahoo_scraped_category_confidence ON yahoo_scraped_products(category_confidence);

-- 既存データの確認クエリ
SELECT 
    COUNT(*) as total_records,
    COUNT(ebay_category_id) as with_ebay_category,
    COUNT(ebay_category_path) as with_ebay_path,
    AVG(category_confidence) as avg_confidence
FROM yahoo_scraped_products;