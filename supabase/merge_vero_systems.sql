-- ============================================
-- VeRO統合マッチングシステム
-- 既存387件 + 新規22ブランドを統合
-- ============================================

-- 1. vero_brand_rulesに既存のキーワードをマージ
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
SELECT DISTINCT
    -- 英語キーワードをブランド名として使用
    INITCAP(keyword) as brand_name,
    
    -- 説明文から日本語名を抽出（もしあれば）
    CASE 
        WHEN description ~ '[ぁ-んァ-ヶー一-龠]' THEN description
        ELSE NULL
    END as brand_name_ja,
    
    -- キーワード配列を作成（大文字小文字のバリエーション）
    ARRAY[
        keyword,
        LOWER(keyword),
        UPPER(keyword),
        INITCAP(keyword)
    ] as keywords,
    
    -- 優先度がHIGHの場合は新品出品を禁止
    CASE WHEN priority = 'HIGH' THEN true ELSE false END as force_used_condition,
    
    'LIKE_NEW' as recommended_condition,
    
    COALESCE(description, 'filter_keywordsからインポート') as notes,
    
    detection_count as violation_count,
    
    is_active
FROM filter_keywords
WHERE type = 'VERO'
    AND keyword IS NOT NULL
    AND keyword != ''
ON CONFLICT (brand_name) DO UPDATE SET
    keywords = EXCLUDED.keywords || vero_brand_rules.keywords,  -- 既存キーワードに追加
    violation_count = GREATEST(vero_brand_rules.violation_count, EXCLUDED.violation_count),
    updated_at = NOW();

-- 2. スマートマッチング関数（大文字小文字・日本語対応）
CREATE OR REPLACE FUNCTION smart_vero_check(
    product_title TEXT,
    product_description TEXT DEFAULT ''
)
RETURNS TABLE(
    is_vero BOOLEAN,
    brand_name VARCHAR(255),
    brand_name_ja VARCHAR(255),
    matched_keyword TEXT,
    recommended_condition VARCHAR(50),
    force_used_condition BOOLEAN,
    notes TEXT,
    violation_count INTEGER
) AS $$
DECLARE
    search_text TEXT;
    search_text_lower TEXT;
BEGIN
    -- 検索対象テキストを結合して正規化
    search_text := product_title || ' ' || COALESCE(product_description, '');
    search_text_lower := LOWER(search_text);
    
    RETURN QUERY
    WITH matched_brands AS (
        SELECT 
            r.brand_name,
            r.brand_name_ja,
            r.recommended_condition,
            r.force_used_condition,
            r.notes,
            r.violation_count,
            kw as matched_keyword,
            -- マッチの優先順位（完全一致 > 部分一致）
            CASE 
                WHEN search_text_lower = LOWER(kw) THEN 1
                WHEN search_text_lower LIKE LOWER(kw) || '%' THEN 2
                WHEN search_text_lower LIKE '%' || LOWER(kw) || '%' THEN 3
                ELSE 4
            END as match_priority
        FROM vero_brand_rules r,
             LATERAL unnest(r.keywords) kw
        WHERE r.is_active = true
        AND (
            -- 大文字小文字を区別しない部分一致
            search_text_lower LIKE '%' || LOWER(kw) || '%'
            OR
            -- 日本語の完全一致（全角・半角対応）
            TRANSLATE(search_text, '０-９Ａ-Ｚａ-ｚ', '0-9A-Za-z') 
            LIKE '%' || TRANSLATE(kw, '０-９Ａ-Ｚａ-ｚ', '0-9A-Za-z') || '%'
        )
        ORDER BY match_priority ASC, r.violation_count DESC
        LIMIT 1
    )
    SELECT 
        TRUE as is_vero,
        matched_brands.*
    FROM matched_brands;
    
    -- マッチしない場合は空の結果を返す
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            FALSE as is_vero,
            NULL::VARCHAR(255),
            NULL::VARCHAR(255),
            NULL::TEXT,
            NULL::VARCHAR(50),
            FALSE,
            NULL::TEXT,
            0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. テスト: スマートマッチング動作確認
SELECT '=== テスト1: Nike（英語） ===' as test;
SELECT * FROM smart_vero_check('Nike Air Max Shoes', 'Brand new condition');

SELECT '=== テスト2: ナイキ（日本語） ===' as test;
SELECT * FROM smart_vero_check('ナイキ エアマックス 新品', '');

SELECT '=== テスト3: NIKE（大文字） ===' as test;
SELECT * FROM smart_vero_check('NIKE SHOES NEW', '');

SELECT '=== テスト4: nike（小文字） ===' as test;
SELECT * FROM smart_vero_check('nike running shoes', '');

SELECT '=== テスト5: Tamron（カメラレンズ） ===' as test;
SELECT * FROM smart_vero_check('Tamron 24-70mm F2.8 Lens for Canon', 'Excellent condition');

-- 4. 統計: マージ後のブランド数を確認
SELECT 
    'マージ後のVeROブランド数' as description,
    COUNT(*) as total_brands,
    COUNT(CASE WHEN violation_count >= 100 THEN 1 END) as critical_brands,
    COUNT(CASE WHEN violation_count >= 50 THEN 1 END) as high_risk_brands
FROM vero_brand_rules;

-- 5. キーワード配列のユニーク数を確認
SELECT 
    brand_name,
    brand_name_ja,
    array_length(keywords, 1) as keyword_variations,
    keywords[1:3] as sample_keywords,
    violation_count
FROM vero_brand_rules
ORDER BY violation_count DESC
LIMIT 20;
