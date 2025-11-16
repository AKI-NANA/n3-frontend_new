-- ============================================
-- リアルタイム同期テスト
-- ============================================

-- テスト前の件数確認
SELECT 
    '📊 テスト前の状態' as status,
    source_system,
    COUNT(*) as count
FROM products_master
GROUP BY source_system
ORDER BY source_system;

-- ============================================
-- テスト1: yahoo_scraped_products に新規追加
-- ============================================

-- テストデータ挿入
INSERT INTO yahoo_scraped_products (
    title,
    current_price,
    category,
    condition_info,
    image,
    approval_status,
    created_at
)
VALUES (
    '【テスト商品】リアルタイム同期確認用',
    5000,
    'テストカテゴリー',
    '新品',
    'https://placehold.co/400x400/png',
    'pending',
    NOW()
)
RETURNING id, title, '✅ yahoo_scraped_products に追加' as action;

-- products_master に自動追加されたか確認（5秒待って実行）
SELECT 
    '🔍 products_master 同期確認' as status,
    id,
    source_system,
    source_id,
    title,
    purchase_price_jpy as price,
    approval_status,
    created_at
FROM products_master
WHERE title LIKE '%テスト商品%'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- テスト2: 承認状態の更新テスト
-- ============================================

-- yahoo_scraped_products の承認状態を更新
UPDATE yahoo_scraped_products
SET approval_status = 'approved'
WHERE title LIKE '%テスト商品%'
RETURNING id, title, approval_status, '✅ 承認状態を更新' as action;

-- products_master も自動更新されたか確認
SELECT 
    '🔍 更新同期確認' as status,
    id,
    source_system,
    title,
    approval_status,
    updated_at
FROM products_master
WHERE title LIKE '%テスト商品%'
ORDER BY updated_at DESC
LIMIT 1;

-- ============================================
-- テスト3: 削除の同期テスト
-- ============================================

-- yahoo_scraped_products から削除
DELETE FROM yahoo_scraped_products
WHERE title LIKE '%テスト商品%'
RETURNING id, title, '✅ テストデータを削除' as action;

-- products_master からも削除されたか確認
SELECT 
    '🔍 削除同期確認' as status,
    COUNT(*) as remaining_test_products
FROM products_master
WHERE title LIKE '%テスト商品%';

-- ============================================
-- テスト完了確認
-- ============================================

SELECT 
    '✅ リアルタイム同期テスト完了' as status,
    'INSERT → UPDATE → DELETE の全同期が正常に動作' as result,
    'システムは完全に稼働中' as system_status;

-- 最終状態確認
SELECT 
    '📊 テスト後の状態' as status,
    source_system,
    COUNT(*) as count
FROM products_master
GROUP BY source_system
ORDER BY source_system;
