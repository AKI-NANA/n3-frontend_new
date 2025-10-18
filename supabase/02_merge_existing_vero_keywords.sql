-- ============================================
-- 既存387件のVeROキーワードをvero_brand_rulesにマージ
-- filter_keywords から vero_brand_rules への移行
-- ============================================

-- ステップ1: 既存のfilter_keywordsからブランド名を抽出してマージ
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
-- Louis Vuitton関連を統合
SELECT
    'Louis Vuitton' as brand_name,
    'ルイヴィトン' as brand_name_ja,
    ARRAY['Louis Vuitton', 'louis vuitton', 'LOUIS VUITTON', 'LV', 'lv', 'ルイヴィトン', 'ルイ・ヴィトン']::TEXT[] as keywords,
    true as force_used_condition,
    'LIKE_NEW' as recommended_condition,
    'VeRO: 高級ブランド。新品出品は厳禁。略称LVも対象' as notes,
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Louis Vuitton', 'ルイヴィトン', 'LV')), 0) as violation_count,
    true as is_active
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Louis Vuitton')

UNION ALL

-- Gucci関連を統合
SELECT
    'Gucci' as brand_name,
    'グッチ' as brand_name_ja,
    ARRAY['Gucci', 'gucci', 'GUCCI', 'グッチ', 'GG']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級ブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Gucci', 'グッチ')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Gucci')

UNION ALL

-- Chanel関連を統合
SELECT
    'Chanel' as brand_name,
    'シャネル' as brand_name_ja,
    ARRAY['Chanel', 'chanel', 'CHANEL', 'シャネル', 'CC']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級ブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Chanel', 'シャネル')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Chanel')

UNION ALL

-- Hermes関連を統合
SELECT
    'Hermes' as brand_name,
    'エルメス' as brand_name_ja,
    ARRAY['Hermes', 'Hermès', 'hermes', 'hermès', 'HERMES', 'HERMÈS', 'エルメス']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 最高級ブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Hermes', 'Hermès', 'エルメス')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Hermes')

UNION ALL

-- Cartier関連を統合
SELECT
    'Cartier' as brand_name,
    'カルティエ' as brand_name_ja,
    ARRAY['Cartier', 'cartier', 'CARTIER', 'カルティエ']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級ジュエリーブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Cartier', 'カルティエ')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Cartier')

UNION ALL

-- Rolex関連を統合
SELECT
    'Rolex' as brand_name,
    'ロレックス' as brand_name_ja,
    ARRAY['Rolex', 'rolex', 'ROLEX', 'ロレックス']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級時計ブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Rolex', 'ロレックス')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Rolex')

UNION ALL

-- Fendi関連を統合
SELECT
    'Fendi' as brand_name,
    'フェンディ' as brand_name_ja,
    ARRAY['Fendi', 'fendi', 'FENDI', 'フェンディ', 'FF']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級ブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Fendi', 'フェンディ')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Fendi')

UNION ALL

-- Tiffany関連を統合
SELECT
    'Tiffany' as brand_name,
    'ティファニー' as brand_name_ja,
    ARRAY['Tiffany', 'tiffany', 'TIFFANY', 'Tiffany & Co', 'ティファニー']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級ジュエリーブランド。新品出品は厳禁',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('Tiffany', 'ティファニー')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Tiffany')

UNION ALL

-- YSL関連を統合
SELECT
    'Yves Saint Laurent' as brand_name,
    'イヴサンローラン' as brand_name_ja,
    ARRAY['YSL', 'ysl', 'Yves Saint Laurent', 'yves saint laurent', 'YVES SAINT LAURENT', 'イヴサンローラン', 'サンローラン']::TEXT[] as keywords,
    true, 'LIKE_NEW',
    'VeRO: 高級ファッションブランド。新品出品は厳禁。略称YSLも対象',
    COALESCE((SELECT SUM(detection_count) FROM filter_keywords WHERE type='VERO' AND keyword IN ('YSL', 'Yves Saint Laurent')), 0),
    true
WHERE NOT EXISTS (SELECT 1 FROM vero_brand_rules WHERE brand_name = 'Yves Saint Laurent');

-- ステップ2: 残りの未登録キーワードを一括マージ
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
SELECT DISTINCT ON (UPPER(TRIM(keyword)))
    -- 英語キーワードを正規化してブランド名に
    INITCAP(TRIM(keyword)) as brand_name,
    
    -- 日本語が含まれる場合は日本語名として使用
    CASE 
        WHEN keyword ~ '[ぁ-んァ-ヶー一-龠]' THEN keyword
        ELSE NULL
    END as brand_name_ja,
    
    -- キーワードのバリエーションを自動生成
    ARRAY[
        keyword,
        LOWER(keyword),
        UPPER(keyword),
        INITCAP(keyword)
    ]::TEXT[] as keywords,
    
    -- 優先度がHIGHなら新品出品禁止
    CASE WHEN priority = 'HIGH' THEN true ELSE false END as force_used_condition,
    
    'LIKE_NEW' as recommended_condition,
    
    COALESCE(description, 'filter_keywordsから自動インポート') as notes,
    
    detection_count as violation_count,
    
    is_active
FROM filter_keywords
WHERE type = 'VERO'
    AND keyword IS NOT NULL
    AND keyword != ''
    AND TRIM(keyword) != ''
    -- 既に手動登録したブランドは除外
    AND UPPER(TRIM(keyword)) NOT IN (
        'LOUIS VUITTON', 'LV', 'ルイヴィトン',
        'GUCCI', 'グッチ',
        'CHANEL', 'シャネル',
        'HERMES', 'HERMÈS', 'エルメス',
        'CARTIER', 'カルティエ',
        'ROLEX', 'ロレックス',
        'FENDI', 'フェンディ',
        'TIFFANY', 'ティファニー',
        'YSL', 'YVES SAINT LAURENT', 'イヴサンローラン'
    )
ON CONFLICT (brand_name) DO UPDATE SET
    keywords = vero_brand_rules.keywords || EXCLUDED.keywords,
    violation_count = GREATEST(vero_brand_rules.violation_count, EXCLUDED.violation_count),
    updated_at = NOW();

-- ステップ3: 結果確認
SELECT 
    '✅ VeROブランドマージ完了' as message,
    COUNT(*) as total_brands,
    COUNT(CASE WHEN violation_count >= 100 THEN 1 END) as critical_brands,
    SUM(violation_count) as total_violations
FROM vero_brand_rules;

-- Top 20 VeROブランド表示
SELECT 
    ROW_NUMBER() OVER (ORDER BY violation_count DESC) as rank,
    brand_name as "ブランド名",
    brand_name_ja as "日本語名",
    array_length(keywords, 1) as "キーワード数",
    keywords[1:3] as "サンプルキーワード",
    violation_count as "違反回数",
    CASE 
        WHEN force_used_condition THEN '禁止'
        ELSE '許可'
    END as "新品出品"
FROM vero_brand_rules
WHERE is_active = true
ORDER BY violation_count DESC
LIMIT 20;
