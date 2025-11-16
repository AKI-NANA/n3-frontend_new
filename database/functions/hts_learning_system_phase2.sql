-- ========================================
-- HTS学習システム - RPC関数
-- Phase 2: ストアドファンクション
-- ========================================

-- ========================================
-- 1. 学習データ記録関数
-- ========================================
CREATE OR REPLACE FUNCTION record_hts_learning(
    p_title_ja TEXT,
    p_title_en TEXT DEFAULT NULL,
    p_category_ja TEXT DEFAULT NULL,
    p_brand_ja TEXT DEFAULT NULL,
    p_material TEXT DEFAULT NULL,
    p_confirmed_hts TEXT DEFAULT NULL,
    p_origin_country TEXT DEFAULT NULL,
    p_keywords TEXT DEFAULT NULL,
    p_search_score NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_record_id UUID;
    v_usage_count INTEGER;
    v_is_new BOOLEAN := false;
BEGIN
    -- 既存の学習パターンを検索 (タイトルとHTSコードが一致)
    SELECT id, usage_count INTO v_record_id, v_usage_count
    FROM hts_learning_data
    WHERE product_title_ja = p_title_ja
      AND confirmed_hts_code = p_confirmed_hts
    LIMIT 1;

    IF v_record_id IS NOT NULL THEN
        -- 統計情報を更新
        UPDATE hts_learning_data
        SET usage_count = v_usage_count + 1,
            last_confirmed_at = NOW(),
            -- 他の情報も更新（カテゴリーやブランドが後から追加される場合）
            category_name_ja = COALESCE(p_category_ja, category_name_ja),
            brand_name_ja = COALESCE(p_brand_ja, brand_name_ja),
            material = COALESCE(p_material, material),
            product_title_en = COALESCE(p_title_en, product_title_en)
        WHERE id = v_record_id;
        
        RAISE NOTICE '✅ 学習データ更新: % (使用回数: %)', p_confirmed_hts, v_usage_count + 1;
    ELSE
        -- 新規学習データとして挿入
        INSERT INTO hts_learning_data (
            product_title_ja, product_title_en, category_name_ja, brand_name_ja, material,
            confirmed_hts_code, confirmed_origin_country, used_keywords, search_score
        )
        VALUES (
            p_title_ja, p_title_en, p_category_ja, p_brand_ja, p_material,
            p_confirmed_hts, p_origin_country, p_keywords, p_search_score
        )
        RETURNING id INTO v_record_id;
        
        v_is_new := true;
        RAISE NOTICE '✅ 学習データ新規作成: %', p_confirmed_hts;
    END IF;
    
    -- 結果を返す
    RETURN json_build_object(
        'success', true,
        'record_id', v_record_id,
        'is_new', v_is_new,
        'usage_count', COALESCE(v_usage_count + 1, 1)
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ 学習データ記録エラー: %', SQLERRM;
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ========================================
-- 2. 3段階統合検索関数
-- ========================================

-- 戻り値の型定義
DROP TYPE IF EXISTS hts_search_result_type CASCADE;
CREATE TYPE hts_search_result_type AS (
    hts_code TEXT,
    score NUMERIC,
    confidence TEXT,
    source TEXT,
    description TEXT,
    general_rate TEXT,
    origin_country_hint TEXT
);

CREATE OR REPLACE FUNCTION search_hts_with_learning(
    p_title_ja TEXT DEFAULT NULL,
    p_category_ja TEXT DEFAULT NULL,
    p_brand_ja TEXT DEFAULT NULL,
    p_material TEXT DEFAULT NULL,
    p_keywords TEXT DEFAULT NULL
)
RETURNS SETOF hts_search_result_type
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_learning BOOLEAN := false;
    v_has_master BOOLEAN := false;
BEGIN
    -- ========================================
    -- STEP 1: 学習データからの検索 (最優先)
    -- ========================================
    IF p_title_ja IS NOT NULL OR p_keywords IS NOT NULL THEN
        RETURN QUERY
        SELECT
            l.confirmed_hts_code AS hts_code,
            ((l.usage_count * 100) + 900)::NUMERIC AS score,
            'very_high'::TEXT AS confidence,
            'learning'::TEXT AS source,
            ('学習済み: ' || l.product_title_ja)::TEXT AS description,
            v.general_rate,
            l.confirmed_origin_country AS origin_country_hint
        FROM hts_learning_data l
        LEFT JOIN v_hts_master_data v ON v.hts_number = l.confirmed_hts_code
        WHERE (p_title_ja IS NOT NULL AND l.product_title_ja ILIKE '%' || p_title_ja || '%')
           OR (p_keywords IS NOT NULL AND l.used_keywords ILIKE '%' || p_keywords || '%')
           OR (p_category_ja IS NOT NULL AND l.category_name_ja = p_category_ja)
        ORDER BY l.usage_count DESC, l.last_confirmed_at DESC
        LIMIT 3;
        
        GET DIAGNOSTICS v_has_learning = ROW_COUNT > 0;
    END IF;

    -- ========================================
    -- STEP 2: マスターデータからの推定
    -- ========================================
    
    -- カテゴリーマスターから検索
    IF p_category_ja IS NOT NULL THEN
        RETURN QUERY
        SELECT
            c.recommended_hts_code AS hts_code,
            800::NUMERIC AS score,
            'high'::TEXT AS confidence,
            'category_master'::TEXT AS source,
            ('カテゴリ推定: ' || c.category_name_ja)::TEXT AS description,
            v.general_rate,
            NULL::TEXT AS origin_country_hint
        FROM hts_category_master c
        LEFT JOIN v_hts_master_data v ON v.hts_number = c.recommended_hts_code
        WHERE c.category_name_ja = p_category_ja
        LIMIT 1;
        
        GET DIAGNOSTICS v_has_master = ROW_COUNT > 0;
    END IF;

    -- ブランドマスターから検索
    IF p_brand_ja IS NOT NULL THEN
        RETURN QUERY
        SELECT
            b.related_hts_code AS hts_code,
            750::NUMERIC AS score,
            'high'::TEXT AS confidence,
            'brand_master'::TEXT AS source,
            ('ブランド推定: ' || b.brand_name_ja)::TEXT AS description,
            v.general_rate,
            array_to_string(b.origin_country_candidates, ',')::TEXT AS origin_country_hint
        FROM hts_brand_master b
        LEFT JOIN v_hts_master_data v ON v.hts_number = b.related_hts_code
        WHERE b.brand_name_ja = p_brand_ja
        LIMIT 1;
    END IF;
    
    -- 素材パターンから検索
    IF p_material IS NOT NULL AND p_keywords IS NOT NULL THEN
        RETURN QUERY
        SELECT
            m.related_hts_code AS hts_code,
            700::NUMERIC AS score,
            'medium'::TEXT AS confidence,
            'material_pattern'::TEXT AS source,
            ('素材推定: ' || m.material_name)::TEXT AS description,
            v.general_rate,
            NULL::TEXT AS origin_country_hint
        FROM hts_material_patterns m
        LEFT JOIN v_hts_master_data v ON v.hts_number = m.related_hts_code
        WHERE m.material_name = p_material
          AND p_keywords ILIKE '%' || m.keyword_pattern || '%'
        LIMIT 1;
    END IF;

    -- ========================================
    -- STEP 3: HTS公式データから検索 (フォールバック)
    -- ========================================
    IF p_keywords IS NOT NULL THEN
        RETURN QUERY
        SELECT
            r.hts_number AS hts_code,
            r.relevance_score AS score,
            r.confidence_level AS confidence,
            'official'::TEXT AS source,
            COALESCE(r.detail_description, r.heading_description)::TEXT AS description,
            r.general_rate,
            NULL::TEXT AS origin_country_hint
        FROM search_hts_candidates(p_keywords) r
        WHERE r.relevance_score > 0
        ORDER BY r.relevance_score DESC
        LIMIT 10;
    END IF;
    
    RAISE NOTICE '✅ 検索完了: 学習=%, マスター=%', v_has_learning, v_has_master;
    
    RETURN;
END;
$$;

-- ========================================
-- 3. 学習統計取得関数
-- ========================================
CREATE OR REPLACE FUNCTION get_hts_learning_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_records INTEGER;
    v_total_usage INTEGER;
    v_top_hts JSON;
BEGIN
    -- 総レコード数
    SELECT COUNT(*) INTO v_total_records FROM hts_learning_data;
    
    -- 総使用回数
    SELECT SUM(usage_count) INTO v_total_usage FROM hts_learning_data;
    
    -- トップ10のHTSコード
    SELECT json_agg(row_to_json(t)) INTO v_top_hts
    FROM (
        SELECT 
            confirmed_hts_code,
            COUNT(*) as pattern_count,
            SUM(usage_count) as total_usage
        FROM hts_learning_data
        GROUP BY confirmed_hts_code
        ORDER BY total_usage DESC
        LIMIT 10
    ) t;
    
    RETURN json_build_object(
        'total_records', v_total_records,
        'total_usage', v_total_usage,
        'top_hts_codes', v_top_hts
    );
END;
$$;

-- ========================================
-- コメント
-- ========================================
COMMENT ON FUNCTION record_hts_learning IS 'HTSコード確定時に学習データを記録・更新';
COMMENT ON FUNCTION search_hts_with_learning IS '3段階検索: 学習データ→マスター→公式HTS';
COMMENT ON FUNCTION get_hts_learning_stats IS '学習データの統計情報を取得';

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '✅ HTS学習システム - Phase 2完了: 全RPC関数作成完了';
END $$;
