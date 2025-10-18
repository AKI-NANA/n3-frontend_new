-- ============================================
-- 既存のVeROキーワード387件を確認するSQL
-- ============================================

-- 1. VEROタイプのキーワード一覧を取得
SELECT 
    id,
    keyword,
    priority,
    category,
    is_active,
    detection_count,
    description
FROM filter_keywords
WHERE type = 'VERO'
ORDER BY detection_count DESC, keyword ASC
LIMIT 50;

-- 2. カテゴリ別の集計
SELECT 
    category,
    COUNT(*) as count
FROM filter_keywords
WHERE type = 'VERO'
GROUP BY category
ORDER BY count DESC;

-- 3. 大文字小文字のバリエーション確認
SELECT 
    keyword,
    LOWER(keyword) as lowercase,
    UPPER(keyword) as uppercase
FROM filter_keywords
WHERE type = 'VERO'
AND keyword ILIKE '%nike%'
LIMIT 10;

-- 4. 日本語キーワードの確認
SELECT 
    keyword,
    description
FROM filter_keywords
WHERE type = 'VERO'
AND keyword ~ '[ぁ-んァ-ヶー一-龠]'  -- 日本語を含む
LIMIT 20;

-- 5. 英語キーワードの確認
SELECT 
    keyword,
    description
FROM filter_keywords
WHERE type = 'VERO'
AND keyword !~ '[ぁ-んァ-ヶー一-龠]'  -- 日本語を含まない
LIMIT 20;
