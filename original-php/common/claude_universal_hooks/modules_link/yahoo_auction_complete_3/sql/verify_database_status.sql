-- nagano3_db データベース状況確認スクリプト
-- 実行: psql -d nagano3_db -f verify_database_status.sql

\echo '🔍 === Yahoo Auction Tool データベース詳細確認 ==='
\echo ''

-- 1. データベース接続確認
\echo '📊 1. データベース接続・基本情報'
SELECT 
    current_database() as "現在のDB",
    current_user as "接続ユーザー",
    inet_server_addr() as "サーバーIP",
    inet_server_port() as "ポート",
    version() as "PostgreSQLバージョン";

\echo ''

-- 2. 統合商品テーブル確認
\echo '📊 2. unified_scraped_ebay_products テーブル確認'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_scraped_ebay_products')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "テーブル状態";

-- テーブルが存在する場合の詳細情報
\echo '📋 テーブル詳細情報:'
SELECT 
    COUNT(*) as "カラム数"
FROM information_schema.columns 
WHERE table_name = 'unified_scraped_ebay_products';

-- データ確認
\echo '📊 データ状況:'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_scraped_ebay_products') THEN
        RAISE NOTICE '  レコード数: %', (SELECT COUNT(*) FROM unified_scraped_ebay_products);
        RAISE NOTICE '  最新作成日: %', (SELECT MAX(created_at) FROM unified_scraped_ebay_products);
    ELSE
        RAISE NOTICE '  テーブルが存在しないため、データ確認不可';
    END IF;
END $$;

\echo ''

-- 3. 承認システムテーブル群確認
\echo '📊 3. 承認システムテーブル群確認'

\echo '  approval_queue:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_queue')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "状態";

\echo '  approval_logs:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_logs')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "状態";

\echo '  approval_category_settings:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_category_settings')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "状態";

\echo '  approval_statistics:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'approval_statistics')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "状態";

\echo ''

-- 4. その他関連テーブル確認
\echo '📊 4. その他関連テーブル確認'

\echo '  scraping_session_logs:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scraping_session_logs')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "状態";

\echo '  product_editing_history:'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_editing_history')
        THEN '✅ 存在'
        ELSE '❌ 存在しない'
    END as "状態";

\echo ''

-- 5. 全テーブル一覧（Yahoo Auction関連のみ）
\echo '📋 5. Yahoo Auction関連テーブル一覧'
SELECT 
    table_name as "テーブル名",
    table_type as "種別"
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND (
        table_name LIKE '%unified%' OR
        table_name LIKE '%approval%' OR 
        table_name LIKE '%scraping%' OR
        table_name LIKE '%yahoo%' OR
        table_name LIKE '%ebay%'
    )
ORDER BY table_name;

\echo ''

-- 6. インデックス確認
\echo '📊 6. 重要インデックス確認'
SELECT 
    indexname as "インデックス名",
    tablename as "テーブル名"
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND (
        tablename LIKE '%unified%' OR
        tablename LIKE '%approval%'
    )
ORDER BY tablename, indexname;

\echo ''

-- 7. ビュー確認
\echo '📊 7. 分析ビュー確認'
SELECT 
    table_name as "ビュー名"
FROM information_schema.views 
WHERE table_schema = 'public' 
    AND (
        table_name LIKE '%_report' OR
        table_name LIKE '%_summary' OR 
        table_name LIKE '%ready%'
    )
ORDER BY table_name;

\echo ''
\echo '✅ === データベース状況確認完了 ==='
\echo ''
\echo '📋 次のステップ:'
\echo '  1. 不足テーブルがあれば該当SQLファイルを実行'
\echo '  2. データ移行が必要であれば移行作業実施'
\echo '  3. 問題なければシステム稼働開始'