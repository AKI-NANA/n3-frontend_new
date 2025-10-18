-- ============================================
-- 既存387件のVeROキーワードを全てマージ
-- 27ブランド → 200+ブランドに拡張
-- ============================================

-- 確認: 現在のfilter_keywordsの内容
SELECT 
    'VEROキーワード総数' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_priority,
    COUNT(CASE WHEN priority = 'MEDIUM' THEN 1 END) as medium_priority
FROM filter_keywords
WHERE type = 'VERO';

-- ステップ1: 既に登録済みのキーワードを確認
WITH existing_keywords AS (
    SELECT UPPER(TRIM(unnest(keywords))) as keyword
    FROM vero_brand_rules
)
SELECT 
    'まだ未登録のキーワード数' as info,
    COUNT(*) as unregistered_count
FROM filter_keywords fk
WHERE fk.type = 'VERO'
    AND NOT EXISTS (
        SELECT 1 FROM existing_keywords ek
        WHERE ek.keyword = UPPER(TRIM(fk.keyword))
    );

-- ステップ2: 未登録キーワードを一括追加
WITH existing_keywords AS (
    SELECT UPPER(TRIM(unnest(keywords))) as keyword
    FROM vero_brand_rules
),
new_brands AS (
    SELECT DISTINCT ON (UPPER(TRIM(fk.keyword)))
        fk.keyword,
        fk.priority,
        fk.category,
        fk.description,
        fk.detection_count,
        fk.is_active
    FROM filter_keywords fk
    WHERE fk.type = 'VERO'
        AND fk.keyword IS NOT NULL
        AND TRIM(fk.keyword) != ''
        AND NOT EXISTS (
            SELECT 1 FROM existing_keywords ek
            WHERE ek.keyword = UPPER(TRIM(fk.keyword))
        )
    ORDER BY UPPER(TRIM(fk.keyword)), fk.detection_count DESC NULLS LAST
)
INSERT INTO vero_brand_rules (
    brand_name,
    brand_name_ja,
    keywords,
    force_used_condition,
    recommended_condition,
    category,
    notes,
    violation_count,
    is_active
)
SELECT 
    -- ブランド名を正規化
    CASE 
        WHEN nb.keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN nb.keyword
        ELSE INITCAP(TRIM(nb.keyword))
    END as brand_name,
    
    -- 日本語名
    CASE 
        WHEN nb.keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN nb.keyword
        ELSE NULL
    END as brand_name_ja,
    
    -- キーワードバリエーション
    CASE 
        WHEN nb.keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN
            ARRAY[nb.keyword]::TEXT[]
        ELSE
            ARRAY[
                nb.keyword,
                LOWER(nb.keyword),
                UPPER(nb.keyword),
                INITCAP(nb.keyword)
            ]::TEXT[]
    END as keywords,
    
    -- 優先度がHIGHなら新品禁止
    CASE WHEN nb.priority = 'HIGH' THEN TRUE ELSE FALSE END,
    
    'LIKE_NEW' as recommended_condition,
    
    -- カテゴリ（filter_keywordsにcategoryがない場合はgeneralに）
    COALESCE(nb.category, 'general')::VARCHAR(50) as category,
    
    -- 備考
    CONCAT(
        'filter_keywordsから自動インポート',
        ' (優先度: ', COALESCE(nb.priority, 'UNKNOWN'), ')',
        CASE WHEN nb.description IS NOT NULL THEN ' - ' || nb.description ELSE '' END
    ) as notes,
    
    COALESCE(nb.detection_count, 0) as violation_count,
    
    nb.is_active
FROM new_brands nb
ON CONFLICT (brand_name) DO UPDATE SET
    keywords = vero_brand_rules.keywords || EXCLUDED.keywords,
    violation_count = GREATEST(vero_brand_rules.violation_count, EXCLUDED.violation_count),
    category = COALESCE(vero_brand_rules.category, EXCLUDED.category),
    updated_at = NOW();

-- ステップ3: 結果確認
SELECT 
    '✅ マージ完了' as status,
    COUNT(*) as total_brands,
    COUNT(CASE WHEN force_used_condition THEN 1 END) as restricted_brands,
    COUNT(CASE WHEN category = 'luxury_brand' THEN 1 END) as luxury,
    COUNT(CASE WHEN category = 'sports_brand' THEN 1 END) as sports,
    COUNT(CASE WHEN category = 'tech_brand' THEN 1 END) as tech,
    COUNT(CASE WHEN category = 'general' THEN 1 END) as general
FROM vero_brand_rules;

-- ステップ4: カテゴリ別集計
SELECT 
    COALESCE(category, 'uncategorized') as category,
    COUNT(*) as brand_count,
    COUNT(CASE WHEN force_used_condition THEN 1 END) as restricted,
    SUM(violation_count) as total_violations
FROM vero_brand_rules
GROUP BY category
ORDER BY brand_count DESC;

-- ステップ5: 新規追加されたブランド確認（上位50件）
SELECT 
    ROW_NUMBER() OVER (ORDER BY violation_count DESC, brand_name) as rank,
    brand_name as "ブランド名",
    brand_name_ja as "日本語名",
    category as "カテゴリ",
    array_length(keywords, 1) as "キーワード数",
    keywords[1:2] as "サンプル",
    violation_count as "違反回数",
    CASE WHEN force_used_condition THEN '禁止' ELSE '許可' END as "新品出品"
FROM vero_brand_rules
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY violation_count DESC, brand_name
LIMIT 50;
