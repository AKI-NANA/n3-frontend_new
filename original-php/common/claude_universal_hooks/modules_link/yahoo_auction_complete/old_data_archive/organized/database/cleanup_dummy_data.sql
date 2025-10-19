-- ダミーデータ削除スクリプト
-- 2025-09-12: テスト用ダミーデータを完全削除

BEGIN;

-- 削除対象確認
SELECT 
    'deletion_candidates' as type,
    COUNT(*) as count,
    'y-prefixed test data' as description
FROM mystical_japan_treasures_inventory 
WHERE item_id LIKE 'y%' 
AND (
    title LIKE '%スクレイピング取得商品%'
    OR title LIKE '%スクレイピング%'
    OR current_price IN (27.33, 132.37, 69.12, 15.98, 76.59, 73.72)
);

-- 削除対象の詳細確認
SELECT 
    item_id,
    title,
    current_price,
    category_name,
    created_at
FROM mystical_japan_treasures_inventory 
WHERE item_id LIKE 'y%' 
AND (
    title LIKE '%スクレイピング取得商品%'
    OR title LIKE '%スクレイピング%'
    OR current_price IN (27.33, 132.37, 69.12, 15.98, 76.59, 73.72)
    OR item_id IN (
        'y397815560593',
        'y737457117105', 
        'y543203520057',
        'y797923682706',
        'y178466430083',
        'y615720304139'
    )
)
ORDER BY created_at DESC;

-- 🚨 ダミーデータ完全削除実行
DELETE FROM mystical_japan_treasures_inventory 
WHERE item_id LIKE 'y%' 
AND (
    title LIKE '%スクレイピング取得商品%'
    OR title LIKE '%スクレイピング%'
    OR current_price IN (27.33, 132.37, 69.12, 15.98, 76.59, 73.72)
    OR item_id IN (
        'y397815560593',
        'y737457117105', 
        'y543203520057',
        'y797923682706',
        'y178466430083',
        'y615720304139'
    )
);

-- 削除結果確認
SELECT 
    'after_deletion' as type,
    COUNT(*) as remaining_y_items,
    'remaining y-prefixed items' as description
FROM mystical_japan_treasures_inventory 
WHERE item_id LIKE 'y%';

-- 真のスクレイピングデータ確認
SELECT 
    'real_scraped_data' as type,
    COUNT(*) as count,
    'COMPLETE_SCRAPING items' as description
FROM mystical_japan_treasures_inventory 
WHERE item_id LIKE 'COMPLETE_SCRAPING_%';

-- 詳細確認
SELECT 
    item_id,
    title,
    current_price,
    category_name,
    updated_at
FROM mystical_japan_treasures_inventory 
WHERE item_id LIKE 'COMPLETE_SCRAPING_%'
ORDER BY updated_at DESC;

COMMIT;

-- 最終確認クエリ
SELECT 
    CASE 
        WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'real_scraped'
        WHEN item_id LIKE 'y%' THEN 'test_dummy'
        WHEN source_url LIKE '%ebay%' THEN 'ebay_data'
        ELSE 'other_data'
    END as data_type,
    COUNT(*) as count
FROM mystical_japan_treasures_inventory
GROUP BY 
    CASE 
        WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'real_scraped'
        WHEN item_id LIKE 'y%' THEN 'test_dummy'
        WHEN source_url LIKE '%ebay%' THEN 'ebay_data'
        ELSE 'other_data'
    END
ORDER BY count DESC;
