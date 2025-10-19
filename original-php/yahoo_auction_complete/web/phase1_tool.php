<?php
// Phase 1 実際のツール - 最小限UI
// PostgreSQL + eBay API + Google Sheets + CSVアップロード

header('Content-Type: application/json; charset=UTF-8');

// エラー表示を有効化（開発時のみ）
error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'test';
    
    try {
        switch ($action) {
            case 'test_database':
                $result = testDatabaseConnection();
                break;
                
            case 'test_ebay':
                $result = testEbayAPI();
                break;
                
            case 'test_sheets':
                $result = testGoogleSheets();
                break;
                
            case 'upload_csv':
                $result = handleCSVUpload();
                break;
                
            case 'fetch_ebay_data':
                $result = fetchEbayData();
                break;
                
            case 'sync_to_sheets':
                $result = syncToGoogleSheets();
                break;
                
            default:
                $result = ['error' => 'Unknown action: ' . $action];
        }
        
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
        exit;
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

function testDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $pdo = new PDO($dsn, 'aritahiroaki', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        // テーブル存在確認
        $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // レコード数確認
        $counts = [];
        foreach (['ebay_items', 'csv_uploads', 'sheets_sync'] as $table) {
            if (in_array($table, $tables)) {
                $stmt = $pdo->query("SELECT COUNT(*) FROM $table");
                $counts[$table] = $stmt->fetchColumn();
            }
        }
        
        return [
            'success' => true,
            'message' => 'PostgreSQL接続成功',
            'tables' => $tables,
            'record_counts' => $counts,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Database connection failed: ' . $e->getMessage()
        ];
    }
}

function testEbayAPI() {
    try {
        // eBay API設定
        $app_id = 'HIROAKIA-HIROAKIA-PRD-f7fae13b2-1afab1ce';
        $access_token = 'v^1.1#i^1#p^3#I^3#f^0#r^1#t^Ul4xMF80OkYyRTU3N0VGRTQyQzRCRjJDQ0I5MTM0QzkzQTlGNjFFXzFfMSNFXjI2MA==';
        
        // eBay Browse API - 商品検索テスト
        $url = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
        $headers = [
            'Authorization: Bearer ' . $access_token,
            'X-EBAY-C-MARKETPLACE-ID: EBAY_US',
            'Content-Type: application/json'
        ];
        
        $params = http_build_query([
            'q' => 'iphone',
            'limit' => 3
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . $params);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $data = json_decode($response, true);
            
            return [
                'success' => true,
                'message' => 'eBay API接続成功',
                'sample_items' => array_slice($data['itemSummaries'] ?? [], 0, 3),
                'total_results' => $data['total'] ?? 0,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'eBay API Error: HTTP ' . $http_code,
                'response' => $response
            ];
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'eBay API failed: ' . $e->getMessage()
        ];
    }
}

function testGoogleSheets() {
    try {
        // Google Client Library使用（簡易版）
        $service_account_path = '/Users/aritahiroaki/NAGANO-3/N3-Development/config/google-service-account.json';
        
        if (!file_exists($service_account_path)) {
            throw new Exception('Google service account file not found');
        }
        
        $service_account = json_decode(file_get_contents($service_account_path), true);
        $sheet_id = '1pJ7lYavXSbV6FZALo5AT2sZXt2839XDlvwD4q-Kebvw';
        
        // JWT作成（簡易版 - 実際の実装ではライブラリ使用）
        $now = time();
        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $payload = json_encode([
            'iss' => $service_account['client_email'],
            'scope' => 'https://www.googleapis.com/auth/spreadsheets',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now
        ]);
        
        // 簡易テスト（実際のAPI呼び出しはライブラリが必要）
        return [
            'success' => true,
            'message' => 'Google Sheets設定確認成功',
            'sheet_id' => $sheet_id,
            'client_email' => $service_account['client_email'],
            'project_id' => $service_account['project_id'],
            'note' => '実際のAPI呼び出しには google/apiclient ライブラリが必要です',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Google Sheets test failed: ' . $e->getMessage()
        ];
    }
}

function handleCSVUpload() {
    try {
        if (!isset($_FILES['csv_file'])) {
            throw new Exception('CSVファイルがアップロードされていません');
        }
        
        $file = $_FILES['csv_file'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('ファイルアップロードエラー: ' . $file['error']);
        }
        
        // CSVファイル読み込み
        $csv_data = array_map('str_getcsv', file($file['tmp_name']));
        $header = array_shift($csv_data);
        
        // データベースに保存
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $pdo = new PDO($dsn, 'aritahiroaki', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        
        $upload_id = generateUUID();
        $stmt = $pdo->prepare("
            INSERT INTO csv_uploads (id, filename, file_size, row_count, upload_data, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'uploaded', NOW())
        ");
        
        $stmt->execute([
            $upload_id,
            $file['name'],
            $file['size'],
            count($csv_data),
            json_encode(['header' => $header, 'data' => array_slice($csv_data, 0, 10)]) // 最初の10行のみ保存
        ]);
        
        return [
            'success' => true,
            'message' => 'CSVアップロード成功',
            'upload_id' => $upload_id,
            'filename' => $file['name'],
            'file_size' => $file['size'],
            'row_count' => count($csv_data),
            'header' => $header,
            'sample_data' => array_slice($csv_data, 0, 3),
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'CSV upload failed: ' . $e->getMessage()
        ];
    }
}

function fetchEbayData() {
    try {
        $search_term = $_POST['search_term'] ?? 'iphone';
        
        // eBay API呼び出し（testEbayAPI()と同様）
        $access_token = 'v^1.1#i^1#p^3#I^3#f^0#r^1#t^Ul4xMF80OkYyRTU3N0VGRTQyQzRCRjJDQ0I5MTM0QzkzQTlGNjFFXzFfMSNFXjI2MA==';
        
        $url = 'https://api.ebay.com/buy/browse/v1/item_summary/search';
        $headers = [
            'Authorization: Bearer ' . $access_token,
            'X-EBAY-C-MARKETPLACE-ID: EBAY_US',
            'Content-Type: application/json'
        ];
        
        $params = http_build_query([
            'q' => $search_term,
            'limit' => 10
        ]);
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . $params);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($http_code === 200) {
            $data = json_decode($response, true);
            $items = $data['itemSummaries'] ?? [];
            
            // データベースに保存
            $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
            $pdo = new PDO($dsn, 'aritahiroaki', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            
            $saved_count = 0;
            foreach ($items as $item) {
                try {
                    $stmt = $pdo->prepare("
                        INSERT INTO ebay_items (id, ebay_item_id, title, price, condition, seller_username, raw_data, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                        ON CONFLICT (ebay_item_id) DO NOTHING
                    ");
                    
                    $stmt->execute([
                        generateUUID(),
                        $item['itemId'] ?? '',
                        $item['title'] ?? '',
                        floatval($item['price']['value'] ?? 0),
                        $item['condition'] ?? '',
                        $item['seller']['username'] ?? '',
                        json_encode($item)
                    ]);
                    
                    $saved_count++;
                } catch (Exception $e) {
                    // 重複エラーは無視
                }
            }
            
            return [
                'success' => true,
                'message' => 'eBayデータ取得・保存成功',
                'search_term' => $search_term,
                'fetched_count' => count($items),
                'saved_count' => $saved_count,
                'items' => array_slice($items, 0, 5), // 最初の5件のみ表示
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } else {
            throw new Exception('eBay API Error: HTTP ' . $http_code);
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'eBay data fetch failed: ' . $e->getMessage()
        ];
    }
}

function syncToGoogleSheets() {
    try {
        // データベースからeBayデータ取得
        $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
        $pdo = new PDO($dsn, 'aritahiroaki', '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        
        $stmt = $pdo->query("SELECT title, price, condition, seller_username, created_at FROM ebay_items ORDER BY created_at DESC LIMIT 10");
        $items = $stmt->fetchAll();
        
        // Google Sheets同期ログ保存
        $sync_id = generateUUID();
        $stmt = $pdo->prepare("
            INSERT INTO sheets_sync (id, sheet_id, sheet_name, sync_type, row_count, sync_data, status, last_sync_at)
            VALUES (?, ?, ?, 'export', ?, ?, 'synced', NOW())
        ");
        
        $stmt->execute([
            $sync_id,
            '1pJ7lYavXSbV6FZALo5AT2sZXt2839XDlvwD4q-Kebvw',
            'eBay Items Sheet',
            count($items),
            json_encode(['items' => $items])
        ]);
        
        return [
            'success' => true,
            'message' => 'Google Sheets同期成功（シミュレーション）',
            'sync_id' => $sync_id,
            'synced_items' => count($items),
            'sample_data' => array_slice($items, 0, 3),
            'note' => '実際のGoogle Sheets書き込みにはライブラリが必要です',
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Google Sheets sync failed: ' . $e->getMessage()
        ];
    }
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>Phase 1 実際の基盤ツール</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .card { border: 1px solid #ddd; padding: 20px; margin: 15px 0; border-radius: 6px; background: #fafafa; }
        .card h3 { margin-top: 0; color: #333; }
        .btn { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-info { background: #17a2b8; color: white; }
        .btn-warning { background: #ffc107; color: black; }
        .result { margin-top: 15px; padding: 15px; border-radius: 4px; font-family: monospace; }
        .result.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .result.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .result.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .row { display: flex; gap: 20px; flex-wrap: wrap; }
        .col { flex: 1; min-width: 300px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
        .status { padding: 5px 10px; border-radius: 3px; font-size: 12px; }
        .status.online { background: #d4edda; color: #155724; }
        .status.offline { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Phase 1: 実際の基盤ツール</h1>
        <p>PostgreSQL + eBay API + Google Sheets + CSVアップロード連携</p>
        
        <div class="row">
            <!-- データベース接続テスト -->
            <div class="col">
                <div class="card">
                    <h3>📊 PostgreSQL接続</h3>
                    <button class="btn btn-primary" onclick="testDatabase()">データベース接続テスト</button>
                    <div id="database-result" class="result"></div>
                </div>
            </div>
            
            <!-- eBay API接続テスト -->
            <div class="col">
                <div class="card">
                    <h3>🛒 eBay API</h3>
                    <button class="btn btn-info" onclick="testEbay()">eBay API接続テスト</button>
                    <div id="ebay-result" class="result"></div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- Google Sheets接続テスト -->
            <div class="col">
                <div class="card">
                    <h3>📋 Google Sheets</h3>
                    <button class="btn btn-success" onclick="testSheets()">Google Sheets接続テスト</button>
                    <div id="sheets-result" class="result"></div>
                </div>
            </div>
            
            <!-- CSVアップロード -->
            <div class="col">
                <div class="card">
                    <h3>📁 CSVアップロード</h3>
                    <form id="csv-form" enctype="multipart/form-data">
                        <div class="form-group">
                            <label>CSVファイル選択:</label>
                            <input type="file" name="csv_file" accept=".csv" required>
                        </div>
                        <button type="button" class="btn btn-warning" onclick="uploadCSV()">CSVアップロード</button>
                    </form>
                    <div id="csv-result" class="result"></div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <!-- eBayデータ取得 -->
            <div class="col">
                <div class="card">
                    <h3>🔍 eBayデータ取得</h3>
                    <div class="form-group">
                        <label>検索キーワード:</label>
                        <input type="text" id="search-term" placeholder="iphone" value="iphone">
                    </div>
                    <button class="btn btn-primary" onclick="fetchEbayData()">eBayデータ取得・保存</button>
                    <div id="fetch-result" class="result"></div>
                </div>
            </div>
            
            <!-- Google Sheets同期 -->
            <div class="col">
                <div class="card">
                    <h3>🔄 Google Sheets同期</h3>
                    <p>データベースのeBayデータをGoogle Sheetsに同期</p>
                    <button class="btn btn-success" onclick="syncToSheets()">Sheets同期実行</button>
                    <div id="sync-result" class="result"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        async function makeRequest(action, formData = null) {
            try {
                const data = formData || new FormData();
                data.append('action', action);
                
                const response = await fetch('phase1_tool.php', {
                    method: 'POST',
                    body: data
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
        
        function displayResult(elementId, result) {
            const element = document.getElementById(elementId);
            const className = result.success ? 'success' : 'error';
            
            element.className = `result ${className}`;
            element.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
        }
        
        async function testDatabase() {
            const result = await makeRequest('test_database');
            displayResult('database-result', result);
        }
        
        async function testEbay() {
            const result = await makeRequest('test_ebay');
            displayResult('ebay-result', result);
        }
        
        async function testSheets() {
            const result = await makeRequest('test_sheets');
            displayResult('sheets-result', result);
        }
        
        async function uploadCSV() {
            const form = document.getElementById('csv-form');
            const formData = new FormData(form);
            
            const result = await makeRequest('upload_csv', formData);
            displayResult('csv-result', result);
        }
        
        async function fetchEbayData() {
            const searchTerm = document.getElementById('search-term').value;
            const formData = new FormData();
            formData.append('search_term', searchTerm);
            
            const result = await makeRequest('fetch_ebay_data', formData);
            displayResult('fetch-result', result);
        }
        
        async function syncToSheets() {
            const result = await makeRequest('sync_to_sheets');
            displayResult('sync-result', result);
        }
        
        // ページロード時に全機能テスト
        window.onload = function() {
            console.log('🚀 Phase 1 実際の基盤ツール起動完了');
        };
    </script>
</body>
</html>