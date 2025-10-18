-- ============================================
-- VeRO履歴CSV一括インポート機能
-- 手動でCSVをダウンロードしてアップロード
-- ============================================

-- ステップ1: vero_scraped_violationsテーブルを作成（まだない場合）
CREATE TABLE IF NOT EXISTS vero_scraped_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id VARCHAR(50) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    violation_date DATE,
    violation_type VARCHAR(100),
    policy_violation TEXT,
    case_id VARCHAR(50),
    item_url TEXT,
    case_url TEXT,
    brand_detected VARCHAR(100),
    category VARCHAR(50),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_vero_violations_item_id ON vero_scraped_violations(item_id);
CREATE INDEX IF NOT EXISTS idx_vero_violations_date ON vero_scraped_violations(violation_date);
CREATE INDEX IF NOT EXISTS idx_vero_violations_type ON vero_scraped_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_vero_violations_brand ON vero_scraped_violations(brand_detected);

-- ステップ2: CSV一括インポート用の関数を作成
CREATE OR REPLACE FUNCTION import_vero_csv(
    csv_data TEXT
)
RETURNS TABLE(
    imported_count INTEGER,
    skipped_count INTEGER,
    error_count INTEGER,
    details JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
    imported INT := 0;
    skipped INT := 0;
    errors INT := 0;
    line_data TEXT[];
    item_record RECORD;
BEGIN
    -- CSVの各行を処理
    FOR line_data IN 
        SELECT regexp_split_to_array(line, ',') 
        FROM regexp_split_to_table(csv_data, E'\n') AS line
        WHERE line != '' AND line NOT LIKE 'Created on,%'  -- ヘッダーをスキップ
    LOOP
        BEGIN
            -- データ抽出
            DECLARE
                created_on TEXT := line_data[1];
                content TEXT := line_data[2];
                policy TEXT := line_data[3];
                item_id_val TEXT;
                brand_val TEXT;
            BEGIN
                -- item IDを抽出（URL from content）
                item_id_val := substring(content from 'itm/([0-9]+)');
                
                -- ブランドを検出
                brand_val := detect_brand_from_text(content);
                
                -- データベースに挿入（重複はスキップ）
                INSERT INTO vero_scraped_violations (
                    item_id,
                    title,
                    violation_date,
                    violation_type,
                    policy_violation,
                    brand_detected,
                    raw_data
                ) VALUES (
                    COALESCE(item_id_val, 'UNKNOWN_' || gen_random_uuid()::TEXT),
                    content,
                    to_date(created_on, 'Mon DD, YYYY'),
                    CASE 
                        WHEN policy LIKE '%VeRO%' THEN 'VeRO'
                        WHEN policy LIKE '%Counterfeit%' THEN 'Counterfeit'
                        WHEN policy LIKE '%Knives%' THEN 'Knives Policy'
                        ELSE 'Other'
                    END,
                    policy,
                    brand_val,
                    jsonb_build_object(
                        'raw_line', array_to_string(line_data, ','),
                        'imported_at', NOW()
                    )
                )
                ON CONFLICT (item_id) DO NOTHING;
                
                IF FOUND THEN
                    imported := imported + 1;
                ELSE
                    skipped := skipped + 1;
                END IF;
            END;
        EXCEPTION
            WHEN OTHERS THEN
                errors := errors + 1;
                RAISE NOTICE 'Error processing line: %', line_data;
        END;
    END LOOP;
    
    -- 結果を返す
    RETURN QUERY
    SELECT 
        imported,
        skipped,
        errors,
        jsonb_build_object(
            'imported', imported,
            'skipped', skipped,
            'errors', errors,
            'total_processed', imported + skipped + errors
        );
END;
$$;

-- ステップ3: ブランド検出関数
CREATE OR REPLACE FUNCTION detect_brand_from_text(text_content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    detected_brand TEXT := NULL;
BEGIN
    -- vero_brand_rulesのキーワードで検索
    SELECT brand_name INTO detected_brand
    FROM vero_brand_rules r,
         LATERAL unnest(r.keywords) kw
    WHERE LOWER(text_content) LIKE '%' || LOWER(kw) || '%'
    ORDER BY LENGTH(kw) DESC
    LIMIT 1;
    
    RETURN detected_brand;
END;
$$;

-- ステップ4: 統計表示
CREATE OR REPLACE FUNCTION get_vero_violation_stats()
RETURNS TABLE(
    total_violations BIGINT,
    vero_count BIGINT,
    counterfeit_count BIGINT,
    parallel_import_count BIGINT,
    top_brands JSONB,
    recent_violations JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_violations,
        COUNT(*) FILTER (WHERE violation_type LIKE '%VeRO%')::BIGINT as vero_count,
        COUNT(*) FILTER (WHERE violation_type LIKE '%Counterfeit%')::BIGINT as counterfeit_count,
        COUNT(*) FILTER (WHERE violation_type LIKE '%Parallel%')::BIGINT as parallel_import_count,
        (
            SELECT jsonb_agg(jsonb_build_object('brand', brand_detected, 'count', cnt))
            FROM (
                SELECT brand_detected, COUNT(*) as cnt
                FROM vero_scraped_violations
                WHERE brand_detected IS NOT NULL
                GROUP BY brand_detected
                ORDER BY cnt DESC
                LIMIT 10
            ) t
        ) as top_brands,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'title', title,
                'date', violation_date,
                'type', violation_type
            ))
            FROM (
                SELECT title, violation_date, violation_type
                FROM vero_scraped_violations
                ORDER BY violation_date DESC
                LIMIT 5
            ) r
        ) as recent_violations
    FROM vero_scraped_violations;
END;
$$;

-- 使用例を表示
SELECT 
    '✅ VeRO履歴CSV一括インポート機能作成完了' as status,
    'CSVデータを準備して import_vero_csv() 関数を実行してください' as next_step;

-- 使用例
/*
-- CSVデータをインポート
SELECT * FROM import_vero_csv('
Created on,Content,Policy violation
Aug 20 2025,Makita MUH308DZ 18V Cordless Hedge Trimmer,Knives Policy
Aug 20 2025,HiKOKI C3606DB 36V Cordless Circular Saw,Knives Policy
');

-- 統計を確認
SELECT * FROM get_vero_violation_stats();
*/
