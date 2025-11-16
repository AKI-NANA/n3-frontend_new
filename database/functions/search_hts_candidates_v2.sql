-- database/functions/search_hts_candidates.sql (修正版)
-- v_hts_master_dataビューの実際の構造に合わせた版

CREATE OR REPLACE FUNCTION search_hts_candidates(search_keywords TEXT)
RETURNS TABLE (
  hts_number TEXT,
  heading_description TEXT,
  subheading_description TEXT,
  detail_description TEXT,
  description_ja TEXT,
  relevance_score NUMERIC,
  match_type TEXT
) AS $$
DECLARE
  word_array TEXT[];
  phrase_array TEXT[];
BEGIN
  -- ============================================
  -- キーワード解析
  -- ============================================
  
  -- カンマで分割
  word_array := string_to_array(search_keywords, ',');
  
  -- トリム
  word_array := ARRAY(
    SELECT trim(unnest) FROM unnest(word_array) WHERE trim(unnest) != ''
  );
  
  -- フレーズ（スペース含む）と単語を分離
  phrase_array := ARRAY(
    SELECT unnest FROM unnest(word_array) WHERE unnest LIKE '% %'
  );
  
  word_array := ARRAY(
    SELECT unnest FROM unnest(word_array) WHERE unnest NOT LIKE '% %'
  );
  
  -- ============================================
  -- メインクエリ: 3段階検索 + スコアリング
  -- ============================================
  
  RETURN QUERY
  WITH ranked_results AS (
    SELECT 
      v.hts_number,
      v.heading_description,
      v.subheading_description,
      v.detail_description,
      v.description_ja,
      
      -- ============================================
      -- スコアリング計算
      -- ============================================
      (
        -- ========== ステップ1: フレーズ完全一致 ==========
        COALESCE((
          SELECT SUM(
            CASE 
              -- heading完全一致
              WHEN LOWER(v.heading_description) = LOWER(phrase) THEN 200
              -- subheading完全一致
              WHEN LOWER(v.subheading_description) = LOWER(phrase) THEN 150
              ELSE 0
            END
          )
          FROM unnest(phrase_array) AS phrase
        ), 0) +
        
        -- ========== ステップ2: フレーズ部分一致 ==========
        COALESCE((
          SELECT SUM(
            CASE 
              WHEN LOWER(v.heading_description) LIKE '%' || LOWER(phrase) || '%' THEN 80
              WHEN LOWER(v.subheading_description) LIKE '%' || LOWER(phrase) || '%' THEN 60
              WHEN LOWER(v.detail_description) LIKE '%' || LOWER(phrase) || '%' THEN 30
              WHEN LOWER(v.description_ja) LIKE '%' || LOWER(phrase) || '%' THEN 40
              ELSE 0
            END
          )
          FROM unnest(phrase_array) AS phrase
        ), 0) +
        
        -- ========== ステップ3: 単語一致（フォールバック） ==========
        COALESCE((
          SELECT SUM(
            CASE 
              WHEN LOWER(v.heading_description) LIKE '%' || LOWER(word) || '%' THEN 15
              WHEN LOWER(v.subheading_description) LIKE '%' || LOWER(word) || '%' THEN 10
              WHEN LOWER(v.detail_description) LIKE '%' || LOWER(word) || '%' THEN 5
              WHEN LOWER(v.description_ja) LIKE '%' || LOWER(word) || '%' THEN 8
              ELSE 0
            END
          )
          FROM unnest(word_array) AS word
        ), 0) +
        
        -- ========== PostgreSQL Full-Text Search（追加スコア） ==========
        COALESCE(
          ts_rank(
            to_tsvector('english', 
              COALESCE(v.heading_description, '') || ' ' ||
              COALESCE(v.subheading_description, '') || ' ' ||
              COALESCE(v.detail_description, '')
            ),
            plainto_tsquery('english', search_keywords)
          ) * 50,
          0
        ) +
        
        -- ========== ペナルティ: 意図しないマッチ ==========
        CASE
          -- "card" 検索時にビデオゲーム関連が出たらペナルティ
          WHEN search_keywords ILIKE '%card%' AND (
            LOWER(v.heading_description) LIKE '%video game%' OR
            LOWER(v.heading_description) LIKE '%console%' OR
            LOWER(v.subheading_description) LIKE '%electronic game%'
          ) THEN -100
          ELSE 0
        END
        
      ) AS score,
      
      -- マッチタイプ判定
      CASE
        WHEN EXISTS(
          SELECT 1 FROM unnest(phrase_array) AS phrase
          WHERE LOWER(v.heading_description) = LOWER(phrase) 
             OR LOWER(v.subheading_description) = LOWER(phrase)
        ) THEN 'exact'
        WHEN EXISTS(
          SELECT 1 FROM unnest(phrase_array) AS phrase
          WHERE LOWER(v.heading_description) LIKE '%' || LOWER(phrase) || '%'
             OR LOWER(v.subheading_description) LIKE '%' || LOWER(phrase) || '%'
        ) THEN 'phrase'
        ELSE 'word'
      END AS match_category
      
    FROM v_hts_master_data v
    WHERE 
      -- 最低限1つのキーワードにマッチする行のみ
      EXISTS(
        SELECT 1 FROM unnest(phrase_array) AS phrase
        WHERE LOWER(v.heading_description) LIKE '%' || LOWER(phrase) || '%'
           OR LOWER(v.subheading_description) LIKE '%' || LOWER(phrase) || '%'
           OR LOWER(v.detail_description) LIKE '%' || LOWER(phrase) || '%'
           OR LOWER(v.description_ja) LIKE '%' || LOWER(phrase) || '%'
      )
      OR EXISTS(
        SELECT 1 FROM unnest(word_array) AS word
        WHERE LOWER(v.heading_description) LIKE '%' || LOWER(word) || '%'
           OR LOWER(v.subheading_description) LIKE '%' || LOWER(word) || '%'
           OR LOWER(v.detail_description) LIKE '%' || LOWER(word) || '%'
           OR LOWER(v.description_ja) LIKE '%' || LOWER(word) || '%'
      )
  )
  SELECT 
    r.hts_number,
    r.heading_description,
    r.subheading_description,
    r.detail_description,
    r.description_ja,
    r.score AS relevance_score,
    r.match_category AS match_type
  FROM ranked_results r
  WHERE r.score > 0  -- スコア0は除外
  ORDER BY r.score DESC, r.hts_number ASC
  LIMIT 10;
  
END;
$$ LANGUAGE plpgsql;

-- 使用例:
-- SELECT * FROM search_hts_candidates('playing cards, printed cards, paper');

COMMENT ON FUNCTION search_hts_candidates(TEXT) IS 
'HTS候補を検索し、3段階スコアリング（フレーズ完全一致、部分一致、単語一致）で上位10件を返す。
入力: カンマ区切りのキーワード/フレーズ
出力: hts_number, 説明, スコア, マッチタイプ';
