-- ============================================
-- eBay VeRO違反履歴を手動で追加するSQL
-- ============================================

-- 使用方法:
-- 1. eBayのVeRO履歴ページ (https://www.ebay.com/rh?filter=TIME_PERIOD%3ALAST_365_DAYS&limit=20&offset=21) を開く
-- 2. 各違反データを確認
-- 3. 以下のINSERT文を編集して実行

-- 例: 1件追加
INSERT INTO vero_scraped_violations (
    item_id,
    title,
    violation_date,
    violation_type,
    rights_owner,
    removal_reason,
    brand_detected,
    raw_data
) VALUES (
    '123456789012',  -- eBayアイテムID
    'Tamron 24-70mm F2.8 Lens',  -- 商品タイトル
    '2024-12-15 10:30:00',  -- 違反日時
    'VeRO: Parallel Import',  -- 違反タイプ
    'Tamron Co., Ltd.',  -- 権利所有者
    'Unauthorized sale in restricted region',  -- 削除理由
    'Tamron',  -- 検出されたブランド
    '{"source": "manual_entry"}'::jsonb  -- メタデータ
);

-- 複数件を一度に追加する場合:
INSERT INTO vero_scraped_violations (
    item_id, title, violation_date, violation_type, 
    rights_owner, brand_detected, raw_data
) VALUES
    ('123456789012', 'Nike Air Max Shoes', '2024-12-10', 'VeRO: Replica', 'Nike, Inc.', 'Nike', '{"source": "manual"}'::jsonb),
    ('123456789013', 'Adidas Sneakers', '2024-12-08', 'VeRO: Unauthorized', 'Adidas AG', 'Adidas', '{"source": "manual"}'::jsonb),
    ('123456789014', 'SEIKO Watch', '2024-12-05', 'VeRO: Parallel Import', 'SEIKO Corporation', 'SEIKO', '{"source": "manual"}'::jsonb);

-- 追加後、ブランドの違反カウントを更新
SELECT increment_brand_violation('Tamron');
SELECT increment_brand_violation('Nike');
SELECT increment_brand_violation('Adidas');
SELECT increment_brand_violation('SEIKO');

-- 登録されたデータを確認
SELECT 
    item_id,
    title,
    violation_date,
    violation_type,
    rights_owner,
    brand_detected
FROM vero_scraped_violations
ORDER BY violation_date DESC
LIMIT 20;

-- ブランド別の違反集計を確認
SELECT 
    brand_detected,
    COUNT(*) as violation_count,
    MAX(violation_date) as last_violation
FROM vero_scraped_violations
WHERE brand_detected IS NOT NULL
GROUP BY brand_detected
ORDER BY violation_count DESC;
