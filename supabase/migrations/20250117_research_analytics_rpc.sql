-- ================================================
-- リサーチ分析ダッシュボード用 RPC関数
-- ================================================

-- 1. リサーチ全体統計（成功率、却下率、未処理率）
CREATE OR REPLACE FUNCTION get_research_statistics(
  p_data_source TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH filtered_data AS (
    SELECT
      status,
      COUNT(*) as count
    FROM scored_products
    WHERE
      (p_data_source IS NULL OR best_supplier_source = p_data_source)
      AND (p_risk_level IS NULL OR risk_level = p_risk_level)
      AND (p_status IS NULL OR status = p_status)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY status
  ),
  totals AS (
    SELECT
      SUM(count) as total_count,
      SUM(CASE WHEN status = 'promoted' THEN count ELSE 0 END) as promoted_count,
      SUM(CASE WHEN status = 'rejected' THEN count ELSE 0 END) as rejected_count,
      SUM(CASE WHEN status = 'pending' THEN count ELSE 0 END) as pending_count
    FROM filtered_data
  )
  SELECT json_build_object(
    'total', COALESCE(total_count, 0),
    'promoted', COALESCE(promoted_count, 0),
    'rejected', COALESCE(rejected_count, 0),
    'pending', COALESCE(pending_count, 0),
    'success_rate', CASE
      WHEN COALESCE(total_count, 0) > 0
      THEN ROUND((COALESCE(promoted_count, 0)::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 0
    END,
    'rejection_rate', CASE
      WHEN COALESCE(total_count, 0) > 0
      THEN ROUND((COALESCE(rejected_count, 0)::NUMERIC / total_count::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) INTO v_result
  FROM totals;

  RETURN v_result;
END;
$$;

-- 2. VEROリスク分布（円グラフ用）
CREATE OR REPLACE FUNCTION get_vero_risk_distribution(
  p_data_source TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'risk_level', COALESCE(risk_level, 'unknown'),
      'count', count,
      'percentage', ROUND((count::NUMERIC / SUM(count) OVER ()) * 100, 2)
    )
  ) INTO v_result
  FROM (
    SELECT
      risk_level,
      COUNT(*) as count
    FROM scored_products
    WHERE
      (p_data_source IS NULL OR best_supplier_source = p_data_source)
      AND (p_status IS NULL OR status = p_status)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY risk_level
    ORDER BY count DESC
  ) subq;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 3. 市場流通数と成功率の相関（散布図用）
CREATE OR REPLACE FUNCTION get_market_volume_correlation(
  p_data_source TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'market_volume', sold_count,
      'price', price,
      'is_promoted', CASE WHEN status = 'promoted' THEN true ELSE false END,
      'status', status,
      'title', LEFT(title, 50),
      'ebay_item_id', ebay_item_id
    )
  ) INTO v_result
  FROM scored_products
  WHERE
    sold_count IS NOT NULL
    AND price IS NOT NULL
    AND (p_data_source IS NULL OR best_supplier_source = p_data_source)
    AND (p_risk_level IS NULL OR risk_level = p_risk_level)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
  ORDER BY created_at DESC
  LIMIT 500;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 4. HTSコードの頻度（棒グラフ用 - TOP 10）
CREATE OR REPLACE FUNCTION get_hts_code_frequency(
  p_data_source TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'hts_code', COALESCE(hs_code, 'Unknown'),
      'count', count,
      'success_rate', ROUND((promoted_count::NUMERIC / count::NUMERIC) * 100, 2)
    )
  ) INTO v_result
  FROM (
    SELECT
      hs_code,
      COUNT(*) as count,
      SUM(CASE WHEN status = 'promoted' THEN 1 ELSE 0 END) as promoted_count
    FROM scored_products
    WHERE
      hs_code IS NOT NULL
      AND (p_data_source IS NULL OR best_supplier_source = p_data_source)
      AND (p_status IS NULL OR status = p_status)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY hs_code
    ORDER BY count DESC
    LIMIT 10
  ) subq;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 5. カテゴリ別成功率（eBayカテゴリ分析用）
CREATE OR REPLACE FUNCTION get_category_success_rate(
  p_data_source TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'category', COALESCE(category, 'Uncategorized'),
      'total', total_count,
      'promoted', promoted_count,
      'success_rate', ROUND((promoted_count::NUMERIC / total_count::NUMERIC) * 100, 2)
    )
  ) INTO v_result
  FROM (
    SELECT
      category,
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'promoted' THEN 1 ELSE 0 END) as promoted_count
    FROM scored_products
    WHERE
      (p_data_source IS NULL OR best_supplier_source = p_data_source)
      AND (p_risk_level IS NULL OR risk_level = p_risk_level)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    GROUP BY category
    HAVING COUNT(*) >= 5  -- 最低5件以上のカテゴリのみ
    ORDER BY total_count DESC
    LIMIT 15
  ) subq;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 6. リサーチデータ一覧取得（フィルタリング付き）
CREATE OR REPLACE FUNCTION get_research_data_list(
  p_data_source TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'data', COALESCE(json_agg(row_data), '[]'::JSON),
    'total', (
      SELECT COUNT(*)
      FROM scored_products
      WHERE
        (p_data_source IS NULL OR best_supplier_source = p_data_source)
        AND (p_risk_level IS NULL OR risk_level = p_risk_level)
        AND (p_status IS NULL OR status = p_status)
        AND (p_start_date IS NULL OR created_at >= p_start_date)
        AND (p_end_date IS NULL OR created_at <= p_end_date)
    )
  ) INTO v_result
  FROM (
    SELECT json_build_object(
      'id', id,
      'ebay_item_id', ebay_item_id,
      'title', title,
      'title_jp', title_jp,
      'price', price,
      'sold_count', sold_count,
      'competitor_count', competitor_count,
      'total_score', total_score,
      'rank', rank,
      'risk_level', risk_level,
      'status', status,
      'best_supplier_source', best_supplier_source,
      'best_supplier_price', best_supplier_price,
      'hs_code', hs_code,
      'category', category,
      'created_at', created_at
    ) as row_data
    FROM scored_products
    WHERE
      (p_data_source IS NULL OR best_supplier_source = p_data_source)
      AND (p_risk_level IS NULL OR risk_level = p_risk_level)
      AND (p_status IS NULL OR status = p_status)
      AND (p_start_date IS NULL OR created_at >= p_start_date)
      AND (p_end_date IS NULL OR created_at <= p_end_date)
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) subq;

  RETURN v_result;
END;
$$;

-- 7. 個別データ詳細取得
CREATE OR REPLACE FUNCTION get_research_detail(
  p_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'research_id', research_id,
    'ebay_item_id', ebay_item_id,
    'title', title,
    'title_jp', title_jp,
    'price', price,
    'sold_count', sold_count,
    'competitor_count', competitor_count,
    'total_score', total_score,
    'rank', rank,
    'score_breakdown', score_breakdown,
    'profit_calculation', profit_calculation,
    'risk_factors', risk_factors,
    'risk_level', risk_level,
    'origin_country', origin_country,
    'hs_code', hs_code,
    'weight_kg', weight_kg,
    'category', category,
    'condition', condition,
    'supplier_matches', supplier_matches,
    'best_supplier_source', best_supplier_source,
    'best_supplier_price', best_supplier_price,
    'status', status,
    'calculated_at', calculated_at,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM scored_products
  WHERE id = p_id;

  RETURN v_result;
END;
$$;

-- インデックスの追加（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_scored_products_status ON scored_products(status);
CREATE INDEX IF NOT EXISTS idx_scored_products_risk_level ON scored_products(risk_level);
CREATE INDEX IF NOT EXISTS idx_scored_products_supplier_source ON scored_products(best_supplier_source);
CREATE INDEX IF NOT EXISTS idx_scored_products_created_at ON scored_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scored_products_hs_code ON scored_products(hs_code);
CREATE INDEX IF NOT EXISTS idx_scored_products_category ON scored_products(category);

-- コメント追加
COMMENT ON FUNCTION get_research_statistics IS 'リサーチ全体の統計情報（成功率、却下率、未処理率）を取得';
COMMENT ON FUNCTION get_vero_risk_distribution IS 'VEROリスク分布（円グラフ用）を取得';
COMMENT ON FUNCTION get_market_volume_correlation IS '市場流通数と成功率の相関（散布図用）を取得';
COMMENT ON FUNCTION get_hts_code_frequency IS 'HTSコードの頻度TOP 10（棒グラフ用）を取得';
COMMENT ON FUNCTION get_category_success_rate IS 'カテゴリ別成功率を取得';
COMMENT ON FUNCTION get_research_data_list IS 'リサーチデータ一覧をフィルタリング付きで取得';
COMMENT ON FUNCTION get_research_detail IS '個別リサーチデータの詳細を取得';
