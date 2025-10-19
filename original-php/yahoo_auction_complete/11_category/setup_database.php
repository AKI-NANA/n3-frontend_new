<?php
/**
 * データベースセットアップ実行スクリプト - Phase 1 Implementation
 * ファイル: setup_database.php
 * Yahoo Auctionテーブル拡張とeBay手数料テーブル構築を実行
 */

header('Content-Type: application/json; charset=utf-8');

// 実行時間制限を延長
set_time_limit(300); // 5分

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // 環境設定読み込み
    function loadEnvironmentConfig() {
        $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
        $config = [];
        
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($key, $value) = explode('=', $line, 2);
                $config[trim($key)] = trim($value, '"');
            }
        }
        
        return $config;
    }

    // データベース接続
    function getDatabaseConnection($env) {
        $dsn = sprintf("pgsql:host=%s;dbname=%s;port=%s", 
            $env['DB_HOST'] ?? 'localhost',
            $env['DB_NAME'] ?? 'nagano3_db', 
            $env['DB_PORT'] ?? '5432'
        );
        
        $pdo = new PDO($dsn, $env['DB_USER'] ?? 'aritahiroaki', $env['DB_PASS'] ?? '');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        return $pdo;
    }

    // SQLファイルの実行
    function executeSqlFile($pdo, $filePath, $name) {
        if (!file_exists($filePath)) {
            throw new Exception("SQLファイルが見つかりません: {$filePath}");
        }

        $sql = file_get_contents($filePath);
        $statements = explode(';', $sql);
        
        $executedCount = 0;
        $errors = [];

        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (empty($statement) || strpos($statement, '--') === 0) {
                continue;
            }

            try {
                $pdo->exec($statement);
                $executedCount++;
            } catch (PDOException $e) {
                // 一部のエラーは許容（既存テーブルエラー等）
                if (strpos($e->getMessage(), 'already exists') === false && 
                    strpos($e->getMessage(), 'duplicate key') === false) {
                    $errors[] = "Statement failed: " . substr($statement, 0, 100) . "... Error: " . $e->getMessage();
                }
            }
        }

        return [
            'name' => $name,
            'executed' => $executedCount,
            'errors' => $errors
        ];
    }

    // リクエスト処理
    $action = $_GET['action'] ?? $_POST['action'] ?? 'setup';
    
    $env = loadEnvironmentConfig();
    $pdo = getDatabaseConnection($env);
    
    $startTime = microtime(true);
    $results = [];

    switch ($action) {
        case 'setup':
            // Phase 1: Yahoo Auctionテーブル拡張
            $results[] = executeSqlFile(
                $pdo, 
                __DIR__ . '/backend/database/extend_yahoo_table.sql',
                'Yahoo Auctionテーブル拡張'
            );

            // Phase 2: eBayカテゴリーシステム基本構築（既存のcomplete_setup.sqlを実行）
            $categorySetupFile = __DIR__ . '/backend/database/complete_setup_fixed.sql';
            if (file_exists($categorySetupFile)) {
                $results[] = executeSqlFile(
                    $pdo,
                    $categorySetupFile,
                    'eBayカテゴリーシステム基本構築'
                );
            }

            // Phase 3: 手数料データベース構築
            $results[] = executeSqlFile(
                $pdo,
                __DIR__ . '/backend/database/ebay_fees_database.sql',
                'eBay手数料データベース構築'
            );

            break;

        case 'test_connection':
            // データベース接続テスト
            $testQuery = "SELECT 
                            (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products') as yahoo_table_exists,
                            (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'ebay_categories') as ebay_categories_exists,
                            (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'ebay_category_fees') as ebay_fees_exists";
            
            $stmt = $pdo->query($testQuery);
            $testResult = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'データベース接続成功',
                'test_results' => $testResult,
                'database_info' => [
                    'host' => $env['DB_HOST'] ?? 'localhost',
                    'database' => $env['DB_NAME'] ?? 'nagano3_db',
                    'user' => $env['DB_USER'] ?? 'aritahiroaki'
                ]
            ]);
            return;

        case 'check_tables':
            // テーブル存在確認
            $checkQuery = "
                SELECT 
                    table_name,
                    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
                FROM information_schema.tables t
                WHERE table_schema = 'public' 
                AND table_name IN ('yahoo_scraped_products', 'ebay_categories', 'ebay_category_fees', 'category_keywords')
                ORDER BY table_name
            ";
            
            $stmt = $pdo->query($checkQuery);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'tables' => $tables
            ]);
            return;

        case 'sample_data':
            // サンプルデータ投入
            $sampleDataSql = "
                -- サンプルYahoo商品データ（既存データがない場合のみ）
                INSERT INTO yahoo_scraped_products (title, price_jpy, description, created_at)
                SELECT * FROM (VALUES 
                    ('iPhone 14 Pro 128GB ブラック 美品', 120000, 'SIMフリー iPhone 14 Pro 128GB', NOW()),
                    ('Canon EOS R6 Mark II ボディ', 280000, 'ミラーレス一眼カメラ 新品同様', NOW()),
                    ('ポケモンカード ピカチュウ プロモ PSA10', 50000, '鑑定品 完美品', NOW()),
                    ('Nintendo Switch 有機EL ホワイト', 35000, '任天堂スイッチ 中古美品', NOW()),
                    ('Apple Watch Series 9 45mm', 45000, 'アップルウォッチ GPS', NOW())
                ) AS v(title, price_jpy, description, created_at)
                WHERE NOT EXISTS (SELECT 1 FROM yahoo_scraped_products LIMIT 1);
            ";
            
            $pdo->exec($sampleDataSql);
            
            echo json_encode([
                'success' => true,
                'message' => 'サンプルデータを投入しました'
            ]);
            return;

        default:
            throw new Exception('不明なアクション: ' . $action);
    }

    // セットアップ結果の集計
    $processingTime = round((microtime(true) - $startTime) * 1000);
    $totalExecuted = array_sum(array_column($results, 'executed'));
    $totalErrors = array_sum(array_map('count', array_column($results, 'errors')));
    
    // 最終確認クエリ
    $finalCheckQuery = "
        SELECT 
            'yahoo_scraped_products' as table_name,
            COUNT(*) as record_count,
            COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as processed_count
        FROM yahoo_scraped_products
        
        UNION ALL
        
        SELECT 
            'ebay_categories' as table_name,
            COUNT(*) as record_count,
            COUNT(CASE WHEN is_active = TRUE THEN 1 END) as processed_count
        FROM ebay_categories
        
        UNION ALL
        
        SELECT 
            'ebay_category_fees' as table_name,
            COUNT(*) as record_count,
            COUNT(CASE WHEN is_active = TRUE THEN 1 END) as processed_count
        FROM ebay_category_fees
        
        UNION ALL
        
        SELECT 
            'category_keywords' as table_name,
            COUNT(*) as record_count,
            COUNT(CASE WHEN is_active = TRUE THEN 1 END) as processed_count
        FROM category_keywords
    ";

    $stmt = $pdo->query($finalCheckQuery);
    $finalStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'eBayカテゴリーシステム データベースセットアップ完了',
        'results' => $results,
        'summary' => [
            'total_sql_statements' => $totalExecuted,
            'total_errors' => $totalErrors,
            'processing_time_ms' => $processingTime,
            'setup_files' => array_column($results, 'name')
        ],
        'final_status' => $finalStatus,
        'next_steps' => [
            '1. フロントエンドからYahoo商品処理を実行',
            '2. 単一商品テストでカテゴリー判定確認',
            '3. 手数料計算の動作確認',
            '4. バッチ処理でデータを一括処理'
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
        'trace' => $e->getTraceAsString()
    ]);
}
?>