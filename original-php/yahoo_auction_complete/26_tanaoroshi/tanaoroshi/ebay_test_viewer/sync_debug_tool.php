<?php
/**
 * 差分同期API デバッグ・テストツール
 * エラーの詳細原因を特定するための専用ツール
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../../hooks/1_essential/database_universal_connector.php';
    
    $action = $_REQUEST['action'] ?? 'test_all';
    $connector = new DatabaseUniversalConnector();
    
    $results = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'tests' => []
    ];
    
    // テスト1: データベース接続確認
    $results['tests']['database_connection'] = testDatabaseConnection($connector);
    
    // テスト2: テーブル存在確認
    $results['tests']['table_existence'] = testTableExistence($connector);
    
    // テスト3: データ存在確認
    $results['tests']['data_existence'] = testDataExistence($connector);
    
    // テスト4: 差分検知テスト
    if ($results['tests']['data_existence']['status'] === 'success') {
        $results['tests']['detect_missing_data'] = testDetectMissingData($connector);
    } else {
        $results['tests']['detect_missing_data'] = [
            'status' => 'skipped',
            'message' => 'データが存在しないためスキップ'
        ];
    }
    
    // テスト5: 差分同期テスト
    if ($action === 'test_sync' && $results['tests']['data_existence']['status'] === 'success') {
        $results['tests']['differential_sync'] = testDifferentialSync($connector);
    }
    
    echo json_encode($results, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ], JSON_UNESCAPED_UNICODE);
}

function testDatabaseConnection($connector) {
    try {
        if (!$connector || !$connector->pdo) {
            return [
                'status' => 'error',
                'message' => 'データベース接続オブジェクトが利用できません'
            ];
        }
        
        $stmt = $connector->pdo->query("SELECT NOW() as current_time");
        $result = $stmt->fetch();
        
        return [
            'status' => 'success',
            'message' => 'データベース接続正常',
            'server_time' => $result['current_time'] ?? 'unknown'
        ];
        
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => 'データベース接続エラー: ' . $e->getMessage()
        ];
    }
}

function testTableExistence($connector) {
    try {
        $sql = "SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'ebay_complete_api_data'
        ) as table_exists";
        
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch();
        
        if ($result['table_exists']) {
            // カラム情報も取得
            $columnSql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'ebay_complete_api_data' ORDER BY ordinal_position";
            $columnStmt = $connector->pdo->prepare($columnSql);
            $columnStmt->execute();
            $columns = $columnStmt->fetchAll(PDO::FETCH_COLUMN);
            
            return [
                'status' => 'success',
                'message' => 'ebay_complete_api_data テーブル存在確認',
                'columns' => $columns
            ];
        } else {
            return [
                'status' => 'error',
                'message' => 'ebay_complete_api_data テーブルが存在しません'
            ];
        }
        
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => 'テーブル存在確認エラー: ' . $e->getMessage()
        ];
    }
}

function testDataExistence($connector) {
    try {
        $sql = "SELECT COUNT(*) as total, COUNT(CASE WHEN ebay_item_id IS NOT NULL THEN 1 END) as with_id FROM ebay_complete_api_data";
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch();
        
        if ($result['total'] > 0) {
            return [
                'status' => 'success',
                'message' => 'データ存在確認',
                'total_records' => (int)$result['total'],
                'records_with_id' => (int)$result['with_id']
            ];
        } else {
            return [
                'status' => 'warning',
                'message' => 'データベースにデータが存在しません',
                'suggestion' => 'まず eBay データ同期を実行してください'
            ];
        }
        
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => 'データ存在確認エラー: ' . $e->getMessage()
        ];
    }
}

function testDetectMissingData($connector) {
    try {
        // differential_sync_api.php の detectMissingData 関数を模擬
        $sql = "
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN description IS NULL OR description = '' OR length(description) < 50 THEN 1 END) as missing_description,
                COUNT(CASE WHEN sku IS NULL OR sku = '' THEN 1 END) as missing_sku,
                COUNT(CASE WHEN picture_urls IS NULL OR picture_urls::text = '{}' OR picture_urls::text = '' THEN 1 END) as missing_images
            FROM ebay_complete_api_data 
            WHERE ebay_item_id IS NOT NULL
            LIMIT 1000
        ";
        
        $stmt = $connector->pdo->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetch();
        
        return [
            'status' => 'success',
            'message' => '差分検知テスト完了',
            'analysis' => [
                'total_checked' => (int)$result['total'],
                'missing_description' => (int)$result['missing_description'],
                'missing_sku' => (int)$result['missing_sku'],
                'missing_images' => (int)$result['missing_images']
            ]
        ];
        
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => '差分検知テストエラー: ' . $e->getMessage()
        ];
    }
}

function testDifferentialSync($connector) {
    try {
        // 同期進行状況テーブル作成テスト
        $createTableSql = "
            CREATE TABLE IF NOT EXISTS ebay_sync_progress_test (
                id SERIAL PRIMARY KEY,
                sync_id VARCHAR(100) UNIQUE NOT NULL,
                total_items INTEGER NOT NULL DEFAULT 0,
                processed_items INTEGER DEFAULT 0,
                failed_items INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'running',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                error_message TEXT NULL,
                progress_details JSONB NULL
            )
        ";
        
        $result = $connector->pdo->exec($createTableSql);
        
        if ($result === false) {
            return [
                'status' => 'error',
                'message' => 'テスト用同期テーブルの作成に失敗'
            ];
        }
        
        // テスト用同期ジョブ作成
        $testSyncId = 'test_sync_' . date('Ymd_His');
        $insertSql = "INSERT INTO ebay_sync_progress_test (sync_id, total_items, status) VALUES (?, 5, 'running')";
        $stmt = $connector->pdo->prepare($insertSql);
        $insertResult = $stmt->execute([$testSyncId]);
        
        if (!$insertResult) {
            return [
                'status' => 'error',
                'message' => 'テスト用同期ジョブの作成に失敗',
                'sql_error' => $stmt->errorInfo()
            ];
        }
        
        // テスト用テーブル削除
        $connector->pdo->exec("DROP TABLE IF EXISTS ebay_sync_progress_test");
        
        return [
            'status' => 'success',
            'message' => '差分同期テスト完了',
            'test_sync_id' => $testSyncId
        ];
        
    } catch (Exception $e) {
        return [
            'status' => 'error',
            'message' => '差分同期テストエラー: ' . $e->getMessage()
        ];
    }
}
?>
