-- ============================================
-- smart_vero_check関数（シンプル版 - 略称対応）
-- ============================================

DROP FUNCTION IF EXISTS smart_vero_check(TEXT, TEXT);

CREATE OR REPLACE FUNCTION smart_vero_check(
    product_title TEXT,
    product_description TEXT DEFAULT ''
)
RETURNS TABLE(
    is_vero BOOLEAN,
    brand_name TEXT,
    brand_name_ja TEXT,
    matched_keyword TEXT,
    recommended_condition TEXT,
    force_used_condition BOOLEAN,
    notes TEXT,
    violation_count INTEGER
) AS $$
DECLARE
    search_text TEXT;
    search_text_lower TEXT;
    search_text_words TEXT[];
BEGIN
    -- 検索テキストを準備
    search_text := COALESCE(product_title, '') || ' ' || COALESCE(product_description, '');
    search_text_lower := LOWER(TRIM(search_text));
    
    -- スペースで分割して単語配列を作成
    search_text_words := string_to_array(search_text_lower, ' ');
    
    RETURN QUERY
    WITH matched_brands AS (
        SELECT 
            r.brand_name::TEXT,
            r.brand_name_ja::TEXT,
            r.recommended_condition::TEXT,
            r.force_used_condition,
            r.notes::TEXT,
            r.violation_count,
            kw::TEXT as matched_keyword,
            CASE 
                -- 完全一致（テキスト全体）
                WHEN search_text_lower = LOWER(kw) THEN 1
                
                -- 単語として完全一致（配列に含まれる）
                WHEN LOWER(kw) = ANY(search_text_words) THEN 2
                
                -- 前方一致（スペース後）
                WHEN search_text_lower LIKE LOWER(kw) || ' %' THEN 3
                
                -- 後方一致（スペース前）
                WHEN search_text_lower LIKE '% ' || LOWER(kw) THEN 4
                
                -- 中間一致（両側にスペース）
                WHEN search_text_lower LIKE '% ' || LOWER(kw) || ' %' THEN 4
                
                -- 部分一致
                WHEN search_text_lower LIKE '%' || LOWER(kw) || '%' THEN 5
                
                ELSE 6
            END as match_priority,
            LENGTH(kw) as keyword_length
        FROM vero_brand_rules r,
             LATERAL unnest(r.keywords) kw
        WHERE r.is_active = true
        AND (
            -- 単語として含まれる
            LOWER(kw) = ANY(search_text_words)
            OR
            -- 部分一致
            search_text_lower LIKE '%' || LOWER(kw) || '%'
        )
        ORDER BY match_priority ASC, keyword_length DESC, r.violation_count DESC
        LIMIT 1
    )
    SELECT 
        TRUE as is_vero,
        mb.brand_name,
        mb.brand_name_ja,
        mb.matched_keyword,
        mb.recommended_condition,
        mb.force_used_condition,
        mb.notes,
        mb.violation_count
    FROM matched_brands mb;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            FALSE,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            FALSE,
            NULL::TEXT,
            0;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 詳細デバッグ用：マッチング過程を表示
-- ============================================

CREATE OR REPLACE FUNCTION debug_vero_check(
    product_title TEXT,
    product_description TEXT DEFAULT ''
)
RETURNS TABLE(
    brand_name TEXT,
    keyword TEXT,
    match_priority INTEGER,
    is_in_words BOOLEAN,
    is_like_match BOOLEAN
) AS $$
DECLARE
    search_text TEXT;
    search_text_lower TEXT;
    search_text_words TEXT[];
BEGIN
    search_text := COALESCE(product_title, '') || ' ' || COALESCE(product_description, '');
    search_text_lower := LOWER(TRIM(search_text));
    search_text_words := string_to_array(search_text_lower, ' ');
    
    RETURN QUERY
    SELECT 
        r.brand_name::TEXT,
        kw::TEXT as keyword,
        CASE 
            WHEN search_text_lower = LOWER(kw) THEN 1
            WHEN LOWER(kw) = ANY(search_text_words) THEN 2
            WHEN search_text_lower LIKE LOWER(kw) || ' %' THEN 3
            WHEN search_text_lower LIKE '% ' || LOWER(kw) THEN 4
            WHEN search_text_lower LIKE '% ' || LOWER(kw) || ' %' THEN 4
            WHEN search_text_lower LIKE '%' || LOWER(kw) || '%' THEN 5
            ELSE 6
        END as match_priority,
        (LOWER(kw) = ANY(search_text_words)) as is_in_words,
        (search_text_lower LIKE '%' || LOWER(kw) || '%') as is_like_match
    FROM vero_brand_rules r,
         LATERAL unnest(r.keywords) kw
    WHERE r.is_active = true
    AND (
        LOWER(kw) = ANY(search_text_words)
        OR search_text_lower LIKE '%' || LOWER(kw) || '%'
    )
    ORDER BY match_priority ASC, LENGTH(kw) DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- テストケース
-- ============================================

-- まずデバッグ関数で何がマッチするか確認
SELECT '=== デバッグ: LV Wallet ===' as test;
SELECT * FROM debug_vero_check('LV Wallet', '');

SELECT '=== デバッグ: lv wallet (小文字) ===' as test;
SELECT * FROM debug_vero_check('lv wallet', '');

-- 実際のマッチング
SELECT '=== テスト1: LV Wallet ===' as test;
SELECT * FROM smart_vero_check('LV Wallet', '');

SELECT '=== テスト2: LV ===' as test;
SELECT * FROM smart_vero_check('LV', '');

SELECT '=== テスト3: I bought an LV bag ===' as test;
SELECT * FROM smart_vero_check('I bought an LV bag', '');

SELECT '=== テスト4: Louis Vuitton Bag ===' as test;
SELECT * FROM smart_vero_check('Louis Vuitton Bag', '');

SELECT '=== テスト5: ルイヴィトン バッグ ===' as test;
SELECT * FROM smart_vero_check('ルイヴィトン バッグ', '');

SELECT '=== テスト6: Nike shoes ===' as test;
SELECT * FROM smart_vero_check('Nike shoes', '');

SELECT '=== テスト7: ROLEX WATCH ===' as test;
SELECT * FROM smart_vero_check('ROLEX WATCH', '');
