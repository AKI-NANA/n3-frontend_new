-- ============================================
-- filter_keywordsの残り360件を一括マージ
-- 既存27ブランドを除外して追加
-- ============================================

-- ステップ1: 既存ブランドのキーワードリストを取得
WITH existing_keywords AS (
    SELECT UNNEST(keywords) as keyword
    FROM vero_brand_rules
),

-- ステップ2: 未登録のキーワードを抽出
new_keywords AS (
    SELECT DISTINCT ON (UPPER(TRIM(fk.keyword)))
        fk.keyword,
        fk.priority,
        fk.description,
        fk.detection_count,
        fk.is_active
    FROM filter_keywords fk
    WHERE fk.type = 'VERO'
        AND fk.keyword IS NOT NULL
        AND TRIM(fk.keyword) != ''
        AND NOT EXISTS (
            SELECT 1 FROM existing_keywords ek
            WHERE UPPER(TRIM(ek.keyword)) = UPPER(TRIM(fk.keyword))
        )
    ORDER BY UPPER(TRIM(fk.keyword)), fk.detection_count DESC
)

-- ステップ3: vero_brand_rulesに挿入
INSERT INTO vero_brand_rules (
    brand_name,
    brand_name_ja,
    keywords,
    force_used_condition,
    recommended_condition,
    notes,
    violation_count,
    is_active
)
SELECT 
    -- 英語キーワードを正規化してブランド名に
    CASE 
        WHEN keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN 
            -- 日本語の場合: そのまま使用
            keyword
        ELSE 
            -- 英語の場合: 先頭大文字に正規化
            INITCAP(TRIM(keyword))
    END as brand_name,
    
    -- 日本語が含まれる場合は日本語名として設定
    CASE 
        WHEN keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN keyword
        ELSE NULL
    END as brand_name_ja,
    
    -- キーワードのバリエーションを自動生成
    CASE 
        WHEN keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN
            -- 日本語の場合: そのまま配列に
            ARRAY[keyword]::TEXT[]
        ELSE
            -- 英語の場合: 大文字・小文字のバリエーション
            ARRAY[
                keyword,
                LOWER(keyword),
                UPPER(keyword),
                INITCAP(keyword)
            ]::TEXT[]
    END as keywords,
    
    -- 優先度がHIGHなら新品出品禁止
    CASE WHEN priority = 'HIGH' THEN true ELSE false END as force_used_condition,
    
    'LIKE_NEW' as recommended_condition,
    
    COALESCE(
        description, 
        'filter_keywordsから自動インポート（優先度: ' || priority || '）'
    ) as notes,
    
    COALESCE(detection_count, 0) as violation_count,
    
    is_active
FROM new_keywords
ON CONFLICT (brand_name) DO UPDATE SET
    keywords = vero_brand_rules.keywords || EXCLUDED.keywords,
    violation_count = GREATEST(vero_brand_rules.violation_count, EXCLUDED.violation_count),
    updated_at = NOW();

-- ステップ4: 結果確認
SELECT 
    '✅ 一括マージ完了' as status,
    COUNT(*) as total_brands,
    COUNT(CASE WHEN force_used_condition THEN 1 END) as new_prohibited,
    COUNT(CASE WHEN violation_count > 0 THEN 1 END) as with_violations,
    SUM(violation_count) as total_violations
FROM vero_brand_rules;

-- ステップ5: 新規追加されたブランドを確認
SELECT 
    brand_name as "ブランド名",
    brand_name_ja as "日本語名",
    array_length(keywords, 1) as "キーワード数",
    keywords[1:2] as "サンプル",
    violation_count as "違反回数",
    CASE WHEN force_used_condition THEN '禁止' ELSE '許可' END as "新品出品"
FROM vero_brand_rules
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY violation_count DESC
LIMIT 30;

-- ステップ6: ブランド数の変化を確認
SELECT 
    'マージ前' as timing,
    27 as brand_count
UNION ALL
SELECT 
    'マージ後' as timing,
    COUNT(*) as brand_count
FROM vero_brand_rules;

-- ステップ7: 優先度別の集計
SELECT 
    CASE 
        WHEN force_used_condition THEN 'HIGH（新品禁止）'
        ELSE 'MEDIUM/LOW（新品許可）'
    END as priority_group,
    COUNT(*) as brand_count
FROM vero_brand_rules
GROUP BY force_used_condition
ORDER BY force_used_condition DESC;
