-- Yahoo Auction Tool PostgreSQL テーブル拡張
-- スクレイピングデータ対応のための安全なカラム追加

-- 既存テーブルの確認
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'mystical_japan_treasures_inventory' 
ORDER BY ordinal_position;

-- スクレイピング対応カラムを安全に追加
ALTER TABLE mystical_japan_treasures_inventory 
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;

ALTER TABLE mystical_japan_treasures_inventory 
ADD COLUMN IF NOT EXISTS scraping_source VARCHAR(255);

ALTER TABLE mystical_japan_treasures_inventory 
ADD COLUMN IF NOT EXISTS original_source_url TEXT;

-- スクレイピングデータ判定用インデックス
CREATE INDEX IF NOT EXISTS idx_source_url_scraping 
ON mystical_japan_treasures_inventory (source_url) 
WHERE source_url IS NOT NULL AND source_url LIKE '%http%';

CREATE INDEX IF NOT EXISTS idx_scraped_at 
ON mystical_japan_treasures_inventory (scraped_at DESC) 
WHERE scraped_at IS NOT NULL;

-- スクレイピングデータ統計ビュー
CREATE OR REPLACE VIEW scraped_data_stats AS
SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as has_source_url,
    COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as yahoo_scraped,
    COUNT(CASE WHEN scraped_at IS NOT NULL THEN 1 END) as with_scraped_timestamp,
    MIN(scraped_at) as first_scraped,
    MAX(scraped_at) as last_scraped,
    MAX(updated_at) as last_updated
FROM mystical_japan_treasures_inventory;

-- スクレイピング品質チェック
CREATE OR REPLACE VIEW scraping_quality_check AS
SELECT 
    'URL有効性チェック' as check_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as pass_count,
    ROUND(
        COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as pass_percentage
FROM mystical_japan_treasures_inventory
WHERE title IS NOT NULL

UNION ALL

SELECT 
    'Yahoo判定チェック' as check_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as pass_count,
    ROUND(
        COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) * 100.0 / COUNT(*), 2
    ) as pass_percentage
FROM mystical_japan_treasures_inventory
WHERE source_url IS NOT NULL

UNION ALL

SELECT 
    'データ完整性チェック' as check_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN title IS NOT NULL AND current_price > 0 THEN 1 END) as pass_count,
    ROUND(
        COUNT(CASE WHEN title IS NOT NULL AND current_price > 0 THEN 1 END) * 100.0 / COUNT(*), 2
    ) as pass_percentage
FROM mystical_japan_treasures_inventory;

-- スクレイピングデータ抽出用ビュー
CREATE OR REPLACE VIEW scraped_products_view AS
SELECT 
    item_id,
    title,
    current_price,
    condition_name,
    category_name,
    picture_url,
    source_url,
    scraped_at,
    updated_at,
    CASE 
        WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'Yahoo Auction'
        WHEN source_url LIKE '%mercari.com%' THEN 'Mercari'
        WHEN source_url LIKE '%rakuten%' THEN 'Rakuten'
        ELSE 'Web Scraped'
    END as scraped_source,
    CASE 
        WHEN scraped_at IS NOT NULL THEN TRUE
        ELSE FALSE
    END as is_scraped_data
FROM mystical_japan_treasures_inventory
WHERE source_url IS NOT NULL 
AND source_url LIKE '%http%'
AND title IS NOT NULL;

-- テーブル更新ログ
COMMENT ON COLUMN mystical_japan_treasures_inventory.scraped_at IS 'スクレイピング実行日時';
COMMENT ON COLUMN mystical_japan_treasures_inventory.scraping_source IS 'スクレイピングソース識別子';
COMMENT ON COLUMN mystical_japan_treasures_inventory.original_source_url IS 'オリジナルソースURL（リダイレクト対応）';

-- 実行結果確認
SELECT '=== テーブル拡張完了 ===' as status;
SELECT * FROM scraped_data_stats;
SELECT * FROM scraping_quality_check ORDER BY check_type;

-- 既存データにスクレイピングフラグを設定（source_urlがある場合）
UPDATE mystical_japan_treasures_inventory 
SET scraped_at = updated_at,
    scraping_source = 'legacy_data'
WHERE source_url IS NOT NULL 
AND source_url LIKE '%http%'
AND scraped_at IS NULL;

SELECT '=== 既存スクレイピングデータのフラグ設定完了 ===' as status;
SELECT * FROM scraped_data_stats;
