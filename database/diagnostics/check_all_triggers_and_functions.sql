-- ============================================
-- 全トリガーと関数の確認
-- ============================================

-- 1. 全トリガーを確認
SELECT 
    'トリガー一覧' as type,
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. 全関数を確認
SELECT 
    '関数一覧' as type,
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%sync%' OR routine_name LIKE '%products%master%'
ORDER BY routine_name;

-- 3. mystical への参照を持つ関数を検索
SELECT 
    'mystical参照を持つ関数' as type,
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%mystical%';
