-- ============================================
-- VeROスマートマッチング関数（修正版）
-- 型キャストエラーを修正
-- ============================================

-- 既存の関数を削除（もしあれば）
DROP FUNCTION IF EXISTS smart_vero_check(TEXT, TEXT);

-- スマートマッチング関数を作成（型を明示的に指定）
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
BEGIN
    -- 検索対象テキストを結合して正規化
    search_text := COALESCE(product_title, '') || ' ' || COALESCE(product_description, '');
    search_text_lower := LOWER(search_text);
    
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
            -- マッチの優先順位（完全一致 > 前方一致 > 部分一致）
            CASE 
                WHEN search_text_lower = LOWER(kw) THEN 1
                WHEN search_text_lower LIKE LOWER(kw) || '%' THEN 2
                WHEN search_text_lower LIKE '%' || LOWER(kw) || '%' THEN 3
                ELSE 4
            END as match_priority,
            -- キーワードの長さ（長いほど優先）
            LENGTH(kw) as keyword_length
        FROM vero_brand_rules r,
             LATERAL unnest(r.keywords) kw
        WHERE r.is_active = true
        AND LOWER(search_text) LIKE '%' || LOWER(kw) || '%'
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
    
    -- マッチしない場合
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

-- テストケース
SELECT '=== テスト1: Nike（英語） ===' as test_case;
SELECT * FROM smart_vero_check('Nike Air Max Shoes', 'Brand new condition');

SELECT '=== テスト2: Louis Vuitton（英語） ===' as test_case;
SELECT * FROM smart_vero_check('Louis Vuitton Bag', '');

SELECT '=== テスト3: ルイヴィトン（日本語） ===' as test_case;
SELECT * FROM smart_vero_check('ルイヴィトン バッグ 新品', '');

SELECT '=== テスト4: LV（略称） ===' as test_case;
SELECT * FROM smart_vero_check('LV Wallet', 'Authentic');

SELECT '=== テスト5: ROLEX（大文字） ===' as test_case;
SELECT * FROM smart_vero_check('ROLEX SUBMARINER WATCH', '');

SELECT '=== テスト6: ロレックス（日本語） ===' as test_case;
SELECT * FROM smart_vero_check('ロレックス サブマリーナ', '腕時計');

SELECT '=== テスト7: マッチしないケース ===' as test_case;
SELECT * FROM smart_vero_check('Generic Product Name', 'No brand');

-- 結果確認用：登録されているVeROブランド一覧
SELECT 
    brand_name,
    brand_name_ja,
    array_length(keywords, 1) as keyword_count,
    keywords[1:5] as sample_keywords,
    violation_count
FROM vero_brand_rules
WHERE is_active = true
ORDER BY violation_count DESC
LIMIT 10;
