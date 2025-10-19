-- PostgreSQL関数の型エラー修正版
-- 問題: delivery_days カラムの型不一致を解決

-- 既存の問題のある関数を削除
DROP FUNCTION IF EXISTS get_country_all_zones(VARCHAR);
DROP FUNCTION IF EXISTS get_carrier_zone_summary(VARCHAR);

-- 修正版関数: 型を明確に指定
CREATE OR REPLACE FUNCTION get_country_all_zones(p_country_code VARCHAR(5))
RETURNS TABLE (
    carrier_name VARCHAR(100),
    zone_display_name VARCHAR(50),
    zone_description TEXT,
    zone_color VARCHAR(10),
    is_supported BOOLEAN,
    delivery_days VARCHAR(20),  -- 型を明確に指定
    price_tier INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        czd.carrier_name::VARCHAR(100),
        ccz.zone_display_name::VARCHAR(50),
        czd.zone_description::TEXT,
        czd.zone_color::VARCHAR(10),
        ccz.is_supported::BOOLEAN,
        (ccz.estimated_delivery_days_min || '-' || ccz.estimated_delivery_days_max || '日')::VARCHAR(20) as delivery_days,
        ccz.base_price_tier::INTEGER
    FROM carrier_country_zones ccz
    JOIN carrier_zone_definitions czd ON ccz.carrier_code = czd.carrier_code 
                                     AND ccz.zone_code = czd.zone_code
    WHERE ccz.country_code = p_country_code
    ORDER BY czd.sort_order;
END;
$$ LANGUAGE plpgsql;

-- 修正版: zone_visualization_data の ARRAY_AGG 問題修正
DELETE FROM zone_visualization_data;

INSERT INTO zone_visualization_data (carrier_code, zone_code, country_count, sample_countries, avg_delivery_days, price_tier_range, coverage_description) 
SELECT 
    ccz.carrier_code,
    ccz.zone_code,
    COUNT(*) as country_count,
    ARRAY(
        SELECT ccz2.country_name_ja 
        FROM carrier_country_zones ccz2 
        WHERE ccz2.carrier_code = ccz.carrier_code 
          AND ccz2.zone_code = ccz.zone_code 
        ORDER BY ccz2.country_name_ja 
        LIMIT 5
    ) as sample_countries,
    AVG((ccz.estimated_delivery_days_min + ccz.estimated_delivery_days_max) / 2.0) as avg_delivery_days,
    MIN(ccz.base_price_tier) || '-' || MAX(ccz.base_price_tier) as price_tier_range,
    CASE 
        WHEN ccz.carrier_code = 'ELOGI' THEN 'サービスレベル別ゾーン'
        WHEN ccz.carrier_code = 'JPPOST' THEN '地理的距離別ゾーン'
        WHEN ccz.carrier_code = 'CPASS' THEN '対応国限定ゾーン'
    END as coverage_description
FROM carrier_country_zones ccz
GROUP BY ccz.carrier_code, ccz.zone_code;

-- 修正版: get_carrier_zone_summary関数
CREATE OR REPLACE FUNCTION get_carrier_zone_summary(p_carrier_code VARCHAR(20))
RETURNS TABLE (
    zone_display_name VARCHAR(50),
    country_count INTEGER,
    sample_countries TEXT[],
    avg_delivery_days NUMERIC,
    coverage_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vzd.zone_code::VARCHAR(50) as zone_display_name,
        vzd.country_count::INTEGER,
        vzd.sample_countries::TEXT[],
        vzd.avg_delivery_days::NUMERIC,
        vzd.coverage_description::TEXT
    FROM zone_visualization_data vzd
    WHERE vzd.carrier_code = p_carrier_code
    ORDER BY vzd.zone_code;
END;
$$ LANGUAGE plpgsql;

-- 動作確認
SELECT '=== 修正後の動作確認 ===' as status;
SELECT * FROM get_country_all_zones('US');
SELECT * FROM get_carrier_zone_summary('ELOGI');

SELECT '✅ PostgreSQL関数の型エラーを修正しました' as result;