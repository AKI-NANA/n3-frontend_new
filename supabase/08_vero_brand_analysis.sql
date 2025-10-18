-- ============================================
-- VeRO履歴データとブランドルールの連携システム
-- スクレイピングしたデータから正確にブランドを検出
-- ============================================

-- ステップ1: スクレイピングデータから全ブランドを再検出
CREATE OR REPLACE FUNCTION analyze_vero_violations_for_brands()
RETURNS TABLE(
    violation_id UUID,
    item_id VARCHAR,
    title TEXT,
    detected_brand TEXT,
    matched_keyword TEXT,
    confidence VARCHAR,
    should_update BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as violation_id,
        v.item_id,
        v.title,
        vr.brand_name as detected_brand,
        vr.matched_keyword,
        CASE 
            WHEN vr.matched_keyword IS NOT NULL THEN 'HIGH'
            ELSE 'NONE'
        END as confidence,
        (v.brand_detected IS NULL OR v.brand_detected != vr.brand_name) as should_update
    FROM vero_scraped_violations v
    LEFT JOIN LATERAL (
        SELECT * FROM smart_vero_check(v.title, COALESCE(v.policy_violation, ''))
        WHERE is_vero = TRUE
        LIMIT 1
    ) vr ON TRUE
    ORDER BY v.violation_date DESC;
END;
$$;

-- ステップ2: 検出されたブランドを一括更新
CREATE OR REPLACE FUNCTION update_vero_violations_brands()
RETURNS TABLE(
    updated_count INTEGER,
    detected_brands JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    updated INT := 0;
    brand_stats JSONB;
BEGIN
    -- 各違反データのブランドを更新
    WITH brand_detection AS (
        SELECT 
            v.id,
            vr.brand_name,
            vr.matched_keyword
        FROM vero_scraped_violations v
        CROSS JOIN LATERAL (
            SELECT * FROM smart_vero_check(v.title, COALESCE(v.policy_violation, ''))
            WHERE is_vero = TRUE
            LIMIT 1
        ) vr
        WHERE v.brand_detected IS NULL OR v.brand_detected != vr.brand_name
    )
    UPDATE vero_scraped_violations v
    SET 
        brand_detected = bd.brand_name,
        raw_data = jsonb_set(
            COALESCE(v.raw_data, '{}'::jsonb),
            '{matched_keyword}',
            to_jsonb(bd.matched_keyword),
            true
        ),
        updated_at = NOW()
    FROM brand_detection bd
    WHERE v.id = bd.id;
    
    GET DIAGNOSTICS updated = ROW_COUNT;
    
    -- ブランド別統計を作成
    SELECT jsonb_agg(
        jsonb_build_object(
            'brand', brand_detected,
            'count', cnt
        ) ORDER BY cnt DESC
    ) INTO brand_stats
    FROM (
        SELECT brand_detected, COUNT(*) as cnt
        FROM vero_scraped_violations
        WHERE brand_detected IS NOT NULL
        GROUP BY brand_detected
        ORDER BY cnt DESC
        LIMIT 50
    ) t;
    
    RETURN QUERY
    SELECT updated, brand_stats;
END;
$$;

-- ステップ3: 未検出ブランドの分析
CREATE OR REPLACE FUNCTION find_undetected_brands()
RETURNS TABLE(
    title TEXT,
    policy_violation TEXT,
    violation_count BIGINT,
    suggested_brand TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH undetected AS (
        SELECT 
            v.title,
            v.policy_violation,
            COUNT(*) as cnt
        FROM vero_scraped_violations v
        WHERE v.brand_detected IS NULL
        GROUP BY v.title, v.policy_violation
        ORDER BY cnt DESC
        LIMIT 100
    )
    SELECT 
        u.title,
        u.policy_violation,
        u.cnt,
        -- よくある単語から推測
        CASE 
            WHEN u.title ~* 'dunlop|srixon|xxio' THEN 'DUNLOP (要確認)'
            WHEN u.title ~* 'makita' THEN 'Makita (要確認)'
            WHEN u.title ~* 'hikoki' THEN 'HiKOKI (要確認)'
            WHEN u.title ~* 'pop mart|popmart' THEN 'POP MART (要確認)'
            WHEN u.title ~* 'smiling critters' THEN 'Smiling Critters (要確認)'
            ELSE '不明'
        END as suggested_brand
    FROM undetected u;
END;
$$;

-- ステップ4: ブランド違反統計（vero_brand_rulesに反映）
CREATE OR REPLACE FUNCTION sync_brand_violation_counts()
RETURNS TABLE(
    brand_name TEXT,
    old_count INTEGER,
    new_count BIGINT,
    updated BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH violation_counts AS (
        SELECT 
            brand_detected as brand,
            COUNT(*) as cnt
        FROM vero_scraped_violations
        WHERE brand_detected IS NOT NULL
        GROUP BY brand_detected
    )
    UPDATE vero_brand_rules r
    SET 
        violation_count = vc.cnt::INTEGER,
        updated_at = NOW()
    FROM violation_counts vc
    WHERE r.brand_name = vc.brand
    RETURNING 
        r.brand_name,
        r.violation_count - vc.cnt::INTEGER as old_count,
        vc.cnt,
        TRUE;
END;
$$;

-- ステップ5: VeRO違反タイプ別分析
CREATE OR REPLACE FUNCTION analyze_vero_violation_types()
RETURNS TABLE(
    violation_type TEXT,
    total_count BIGINT,
    top_brands JSONB,
    recent_examples JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.violation_type,
        COUNT(*) as total_count,
        (
            SELECT jsonb_agg(
                jsonb_build_object('brand', brand_detected, 'count', cnt)
            )
            FROM (
                SELECT brand_detected, COUNT(*) as cnt
                FROM vero_scraped_violations
                WHERE violation_type = v.violation_type
                    AND brand_detected IS NOT NULL
                GROUP BY brand_detected
                ORDER BY cnt DESC
                LIMIT 5
            ) t
        ) as top_brands,
        (
            SELECT jsonb_agg(
                jsonb_build_object('title', title, 'date', violation_date)
            )
            FROM (
                SELECT title, violation_date
                FROM vero_scraped_violations
                WHERE violation_type = v.violation_type
                ORDER BY violation_date DESC
                LIMIT 3
            ) t
        ) as recent_examples
    FROM vero_scraped_violations v
    GROUP BY v.violation_type
    ORDER BY total_count DESC;
END;
$$;

-- 使用例を表示
SELECT 
    '✅ VeRO分析システム構築完了' as status,
    '以下の順序で実行してください:
    1. analyze_vero_violations_for_brands() - ブランド検出を確認
    2. update_vero_violations_brands() - ブランドを一括更新
    3. find_undetected_brands() - 未検出ブランドを確認
    4. sync_brand_violation_counts() - violation_countを更新' as instructions;

-- 実行例コメント
/*
-- ステップ1: どのブランドが検出されるか確認
SELECT * FROM analyze_vero_violations_for_brands() LIMIT 20;

-- ステップ2: ブランドを一括更新
SELECT * FROM update_vero_violations_brands();

-- ステップ3: 未検出ブランドを確認（新しいブランドを追加するヒント）
SELECT * FROM find_undetected_brands();

-- ステップ4: 違反回数を同期
SELECT * FROM sync_brand_violation_counts();

-- ステップ5: 違反タイプ別分析
SELECT * FROM analyze_vero_violation_types();

-- 最終確認：トップ違反ブランド
SELECT 
    brand_detected as "ブランド",
    COUNT(*) as "違反回数",
    COUNT(CASE WHEN violation_type LIKE '%Parallel%' THEN 1 END) as "並行輸入",
    COUNT(CASE WHEN violation_type LIKE '%Counterfeit%' THEN 1 END) as "偽造品",
    COUNT(CASE WHEN violation_type LIKE '%Unauthorized%' THEN 1 END) as "無許可"
FROM vero_scraped_violations
WHERE brand_detected IS NOT NULL
GROUP BY brand_detected
ORDER BY COUNT(*) DESC
LIMIT 30;
*/
