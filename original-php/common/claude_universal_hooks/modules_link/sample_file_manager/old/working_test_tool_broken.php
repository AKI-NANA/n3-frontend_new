<?php
// 🔧 CAIDS緊急エラー診断 - PHPエラー表示強制有効化
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

/**
 * NAGANO-3 実動作テストツール - 完全バックエンド連携版
 * 実際のファイル操作・データベース・API連携テスト
 */

// セッション開始
session_start();

// CSRF トークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 設定
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('DB_FILE', __DIR__ . '/database/test.db');
define('LOG_FILE', __DIR__ . '/logs/test.log');

// ディレクトリ作成
foreach ([dirname(UPLOAD_DIR), dirname(DB_FILE), dirname(LOG_FILE)] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

/**
 * ログ記録関数
 */
function writeLog($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND);
}

/**
 * JSON レスポンス返却
 */
function jsonResponse($success, $message, $data = []) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('c')
    ]);
    exit;
}

/**
 * SQLite データベース初期化
 */
function initDatabase() {
    try {
        $pdo = new PDO('sqlite:' . DB_FILE);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // テーブル作成
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS test_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT,
                data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        return $pdo;
    } catch (Exception $e) {
        writeLog("Database init error: " . $e->getMessage(), 'ERROR');
        return null;
    }
}

// AJAX リクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    
    // CSRF トークン検証
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        jsonResponse(false, 'CSRF token mismatch');
    }
    
    writeLog("Test action: {$action}");
    
    switch ($action) {
        // ファイル操作テスト
        case 'test_file_operations':
            $results = [];
            
            // 1. ファイル書き込みテスト
            $testFile = UPLOAD_DIR . 'test_' . time() . '.txt';
            $testContent = "CAIDS Test Content - " . date('Y-m-d H:i:s');
            
            if (file_put_contents($testFile, $testContent)) {
                $results['write'] = ['success' => true, 'message' => 'ファイル書き込み成功'];
            } else {
                $results['write'] = ['success' => false, 'message' => 'ファイル書き込み失敗'];
            }
            
            // 2. ファイル読み込みテスト
            if (file_exists($testFile)) {
                $readContent = file_get_contents($testFile);
                $results['read'] = [
                    'success' => ($readContent === $testContent),
                    'message' => $readContent === $testContent ? 'ファイル読み込み成功' : 'ファイル読み込み失敗'
                ];
            }
            
            // 3. ファイル削除テスト
            if (unlink($testFile)) {
                $results['delete'] = ['success' => true, 'message' => 'ファイル削除成功'];
            } else {
                $results['delete'] = ['success' => false, 'message' => 'ファイル削除失敗'];
            }
            
            // 4. ディレクトリ権限テスト
            $results['permissions'] = [
                'success' => is_writable(UPLOAD_DIR),
                'message' => is_writable(UPLOAD_DIR) ? 'ディレクトリ書き込み可能' : 'ディレクトリ書き込み不可'
            ];
            
            jsonResponse(true, 'ファイル操作テスト完了', $results);
            break;
            
        // データベーステスト
        case 'test_database':
            $pdo = initDatabase();
            if (!$pdo) {
                jsonResponse(false, 'データベース接続失敗');
            }
            
            $results = [];
            
            try {
                // 1. CREATE テスト
                $stmt = $pdo->prepare("INSERT INTO test_data (name, email, data) VALUES (?, ?, ?)");
                $testData = [
                    'name' => 'テストユーザー' . time(),
                    'email' => 'test@example.com',
                    'data' => json_encode(['test' => true, 'timestamp' => time()])
                ];
                
                if ($stmt->execute(array_values($testData))) {
                    $insertId = $pdo->lastInsertId();
                    $results['create'] = ['success' => true, 'message' => "データ作成成功 (ID: {$insertId})"];
                } else {
                    $results['create'] = ['success' => false, 'message' => 'データ作成失敗'];
                }
                
                // 2. READ テスト
                $stmt = $pdo->prepare("SELECT * FROM test_data WHERE id = ?");
                $stmt->execute([$insertId]);
                $record = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($record) {
                    $results['read'] = ['success' => true, 'message' => 'データ読み込み成功', 'record' => $record];
                } else {
                    $results['read'] = ['success' => false, 'message' => 'データ読み込み失敗'];
                }
                
                // 3. UPDATE テスト
                $stmt = $pdo->prepare("UPDATE test_data SET name = ? WHERE id = ?");
                $newName = 'テストユーザー更新' . time();
                
                if ($stmt->execute([$newName, $insertId])) {
                    $results['update'] = ['success' => true, 'message' => 'データ更新成功'];
                } else {
                    $results['update'] = ['success' => false, 'message' => 'データ更新失敗'];
                }
                
                // 4. DELETE テスト
                $stmt = $pdo->prepare("DELETE FROM test_data WHERE id = ?");
                if ($stmt->execute([$insertId])) {
                    $results['delete'] = ['success' => true, 'message' => 'データ削除成功'];
                } else {
                    $results['delete'] = ['success' => false, 'message' => 'データ削除失敗'];
                }
                
                // 5. COUNT テスト
                $stmt = $pdo->query("SELECT COUNT(*) as count FROM test_data");
                $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                $results['count'] = ['success' => true, 'message' => "総レコード数: {$count}"];
                
            } catch (Exception $e) {
                $results['error'] = ['success' => false, 'message' => 'データベースエラー: ' . $e->getMessage()];
            }
            
            jsonResponse(true, 'データベーステスト完了', $results);
            break;
            
        // API連携テスト
        case 'test_api':
            $results = [];
            
            // 1. 内部API テスト（自分自身への接続）
            $apiUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
            $testApiData = ['action' => 'api_ping', 'csrf_token' => $_SESSION['csrf_token']];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $apiUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($testApiData));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($response && $httpCode === 200) {
                $results['internal_api'] = ['success' => true, 'message' => '内部API接続成功', 'response' => $response];
            } else {
                $results['internal_api'] = ['success' => false, 'message' => '内部API接続失敗'];
            }
            
            // 2. 外部API テスト（JSONPlaceholder）
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, 'https://jsonplaceholder.typicode.com/posts/1');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($response && $httpCode === 200) {
                $data = json_decode($response, true);
                $results['external_api'] = [
                    'success' => true, 
                    'message' => '外部API接続成功',
                    'data' => $data
                ];
            } else {
                $results['external_api'] = ['success' => false, 'message' => '外部API接続失敗'];
            }
            
            // 3. HTTP ステータステスト
            $results['http_status'] = [
                'success' => true,
                'message' => "HTTP Status: {$httpCode}",
                'server_info' => [
                    'php_version' => PHP_VERSION,
                    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                    'request_method' => $_SERVER['REQUEST_METHOD'],
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
                ]
            ];
            
            jsonResponse(true, 'API連携テスト完了', $results);
            break;
            
        // システムテスト
        case 'test_system':
            $results = [];
            
            // 1. PHP 設定チェック
            $results['php_config'] = [
                'success' => true,
                'message' => 'PHP設定チェック',
                'details' => [
                    'version' => PHP_VERSION,
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'upload_max_filesize' => ini_get('upload_max_filesize'),
                    'post_max_size' => ini_get('post_max_size')
                ]
            ];
            
            // 2. ディスク容量チェック
            $freeBytes = disk_free_space(__DIR__);
            $totalBytes = disk_total_space(__DIR__);
            $usedBytes = $totalBytes - $freeBytes;
            
            $results['disk_space'] = [
                'success' => $freeBytes > (100 * 1024 * 1024), // 100MB以上
                'message' => 'ディスク容量チェック',
                'details' => [
                    'free' => number_format($freeBytes / 1024 / 1024, 2) . ' MB',
                    'total' => number_format($totalBytes / 1024 / 1024, 2) . ' MB',
                    'used_percent' => number_format(($usedBytes / $totalBytes) * 100, 2) . '%'
                ]
            ];
            
            // 3. メモリ使用量チェック
            $memoryUsage = memory_get_usage(true);
            $memoryPeak = memory_get_peak_usage(true);
            
            $results['memory_usage'] = [
                'success' => true,
                'message' => 'メモリ使用量チェック',
                'details' => [
                    'current' => number_format($memoryUsage / 1024 / 1024, 2) . ' MB',
                    'peak' => number_format($memoryPeak / 1024 / 1024, 2) . ' MB'
                ]
            ];
            
            jsonResponse(true, 'システムテスト完了', $results);
            break;
            
        // API Ping
        case 'api_ping':
            jsonResponse(true, 'Pong! API接続正常', ['timestamp' => time()]);
            break;
            
        default:
            jsonResponse(false, '不明なアクション: ' . $action);
    }
}

// ファイルアップロード処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {
    $file = $_FILES['file'];
    
    if ($file['error'] === UPLOAD_ERR_OK) {
        $fileName = basename($file['name']);
        $uploadPath = UPLOAD_DIR . time() . '_' . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
            writeLog("File uploaded: {$fileName}");
            jsonResponse(true, 'ファイルアップロード成功', [
                'filename' => $fileName,
                'size' => $file['size'],
                'type' => $file['type']
            ]);
        } else {
            jsonResponse(false, 'ファイル移動失敗');
        }
    } else {
        jsonResponse(false, 'ファイルアップロードエラー: ' . $file['error']);
    }
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 NAGANO-3 実動作テストツール</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; color: white; margin-bottom: 30px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        .status-bar {
            background: rgba(255,255,255,0.1);
            padding: 15px; border-radius: 10px; margin-bottom: 30px;
            backdrop-filter: blur(10px); color: white;
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
        }
        .status-indicator { 
            width: 12px; height: 12px; border-radius: 50%; background: #4CAF50;
            animation: pulse 2s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .test-grid { 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .test-card {
            background: white; border-radius: 15px; padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1); transition: all 0.3s ease;
        }
        .test-card:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .test-card h3 { color: #2c3e50; margin-bottom: 15px; font-size: 1.3rem; }
        .test-button {
            background: linear-gradient(135deg, #667eea, #764ba2); color: white;
            border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;
            font-size: 16px; font-weight: 600; transition: all 0.3s ease; width: 100%; margin: 5px 0;
        }
        .test-button:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .test-result {
            margin-top: 15px; padding: 15px; border-radius: 8px; background: #f8f9fa;
            border-left: 4px solid #28a745; display: none;
        }
        .test-result.show { display: block; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .result-success { border-left-color: #28a745; background: #d4edda; }
        .result-error { border-left-color: #dc3545; background: #f8d7da; }
        .console {
            background: #1e1e1e; color: #00ff00; padding: 20px; border-radius: 10px;
            font-family: 'Monaco', 'Consolas', monospace; max-height: 300px; overflow-y: auto;
            margin-top: 20px;
        }
        .file-upload {
            border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 10px;
            margin: 15px 0; transition: all 0.3s ease;
        }
        .file-upload:hover { border-color: #667eea; background: rgba(102, 126, 234, 0.1); }
        .loading { display: none; text-align: center; padding: 20px; }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 NAGANO-3 実動作テストツール</h1>
            <p>バックエンド完全連携版 - 実際のサーバー処理テスト</p>
        </div>
        
        <div class="status-bar">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="status-indicator"></div>
                <span>サーバー状態: 稼働中</span>
            </div>
            <div>PHP バージョン: <?= PHP_VERSION ?></div>
            <div>現在時刻: <span id="currentTime"></span></div>
        </div>
        
        <div class="test-grid">
            <!-- ファイル操作テスト -->
            <div class="test-card">
                <h3>📁 ファイル操作テスト</h3>
                <p>実際のファイル読み書き・削除・権限チェック</p>
                <button class="test-button" onclick="runFileTest()">ファイル操作テスト実行</button>
                
                <div class="file-upload" onclick="document.getElementById('fileInput').click()">
                    <p>📤 ファイルアップロードテスト</p>
                    <p>クリックまたはドラッグ&ドロップ</p>
                    <input type="file" id="fileInput" style="display: none;" onchange="uploadFile(this.files[0])">
                </div>
                
                <div class="test-result" id="fileTestResult"></div>
            </div>
            
            <!-- データベーステスト -->
            <div class="test-card">
                <h3>🗄️ データベーステスト</h3>
                <p>実際のSQLite CRUD操作・トランザクション</p>
                <button class="test-button" onclick="runDatabaseTest()">データベーステスト実行</button>
                <div class="test-result" id="databaseTestResult"></div>
            </div>
            
            <!-- API連携テスト -->
            <div class="test-card">
                <h3>🌐 API連携テスト</h3>
                <p>内部・外部API接続・HTTP通信</p>
                <button class="test-button" onclick="runApiTest()">API連携テスト実行</button>
                <div class="test-result" id="apiTestResult"></div>
            </div>
            
            <!-- システムテスト -->
            <div class="test-card">
                <h3>⚙️ システムテスト</h3>
                <p>PHP設定・メモリ・ディスク容量チェック</p>
                <button class="test-button" onclick="runSystemTest()">システムテスト実行</button>
                <div class="test-result" id="systemTestResult"></div>
            </div>
        </div>
        
        <!-- 全テスト実行 -->
        <div style="text-align: center; margin: 30px 0;">
            <button class="test-button" onclick="runAllTests()" style="max-width: 400px; font-size: 18px; padding: 15px 30px;">
                🧪 全テスト一括実行
            </button>
        </div>
        
        <!-- ローディング表示 -->
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>テスト実行中...</p>
        </div>
        
        <!-- コンソールログ -->
        <div class="console" id="console">
            <div>[<?= date('H:i:s') ?>] 🚀 実動作テストツール初期化完了</div>
            <div>[<?= date('H:i:s') ?>] 📡 サーバーサイド処理準備完了</div>
        </div>
    </div>
    
    <script>
        const csrfToken = '<?= $_SESSION['csrf_token'] ?>';
        
        // 時刻更新
        function updateTime() {
            document.getElementById('currentTime').textContent = new Date().toLocaleTimeString('ja-JP');
        }
        setInterval(updateTime, 1000);
        updateTime();
        
        // ログ出力
        function log(message) {
            const console = document.getElementById('console');
            const time = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.textContent = `[${time}] ${message}`;
            console.appendChild(logEntry);
            console.scrollTop = console.scrollHeight;
        }
        
        // ローディング表示
        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
        }
        
        // テスト結果表示
        function showResult(elementId, success, title, details) {
            const element = document.getElementById(elementId);
            element.className = `test-result show ${success ? 'result-success' : 'result-error'}`;
            element.innerHTML = `
                <h4>${success ? '✅' : '❌'} ${title}</h4>
                <div style="margin-top: 10px;">${details}</div>
            `;
        }
        
        // API リクエスト送信
        async function sendTestRequest(action) {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('csrf_token', csrfToken);
            
            const response = await fetch('', {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
        }
        
        // ファイルテスト
        async function runFileTest() {
            log('📁 ファイル操作テスト開始');
            showLoading(true);
            
            try {
                const result = await sendTestRequest('test_file_operations');
                
                if (result.success) {
                    const details = Object.entries(result.data).map(([key, value]) => 
                        `${value.success ? '✅' : '❌'} ${key}: ${value.message}`
                    ).join('<br>');
                    
                    showResult('fileTestResult', true, 'ファイル操作テスト完了', details);
                    log('✅ ファイル操作テスト完了');
                } else {
                    showResult('fileTestResult', false, 'ファイル操作テスト失敗', result.message);
                    log('❌ ファイル操作テスト失敗: ' + result.message);
                }
            } catch (error) {
                showResult('fileTestResult', false, 'ファイル操作テストエラー', error.message);
                log('❌ ファイル操作テストエラー: ' + error.message);
            }
            
            showLoading(false);
        }
        
        // データベーステスト
        async function runDatabaseTest() {
            log('🗄️ データベーステスト開始');
            showLoading(true);
            
            try {
                const result = await sendTestRequest('test_database');
                
                if (result.success) {
                    const details = Object.entries(result.data).map(([key, value]) => 
                        `${value.success ? '✅' : '❌'} ${key}: ${value.message}`
                    ).join('<br>');
                    
                    showResult('databaseTestResult', true, 'データベーステスト完了', details);
                    log('✅ データベーステスト完了');
                } else {
                    showResult('databaseTestResult', false, 'データベーステスト失敗', result.message);
                    log('❌ データベーステスト失敗: ' + result.message);
                }
            } catch (error) {
                showResult('databaseTestResult', false, 'データベーステストエラー', error.message);
                log('❌ データベーステストエラー: ' + error.message);
            }
            
            showLoading(false);
        }
        
        // APIテスト
        async function runApiTest() {
            log('🌐 API連携テスト開始');
            showLoading(true);
            
            try {
                const result = await sendTestRequest('test_api');
                
                if (result.success) {
                    const details = Object.entries(result.data).map(([key, value]) => 
                        `${value.success ? '✅' : '❌'} ${key}: ${value.message}`
                    ).join('<br>');
                    
                    showResult('apiTestResult', true, 'API連携テスト完了', details);
                    log('✅ API連携テスト完了');
                } else {
                    showResult('apiTestResult', false, 'API連携テスト失敗', result.message);
                    log('❌ API連携テスト失敗: ' + result.message);
                }
            } catch (error) {
                showResult('apiTestResult', false, 'API連携テストエラー', error.message);
                log('❌ API連携テストエラー: ' + error.message);
            }
            
            showLoading(false);
        }
        
        // システムテスト
        async function runSystemTest() {
            log('⚙️ システムテスト開始');
            showLoading(true);
            
            try {
                const result = await sendTestRequest('test_system');
                
                if (result.success) {
                    const details = Object.entries(result.data).map(([key, value]) => 
                        `${value.success ? '✅' : '❌'} ${key}: ${value.message}`
                    ).join('<br>');
                    
                    showResult('systemTestResult', true, 'システムテスト完了', details);
                    log('✅ システムテスト完了');
                } else {
                    showResult('systemTestResult', false, 'システムテスト失敗', result.message);
                    log('❌ システムテスト失敗: ' + result.message);
                }
            } catch (error) {
                showResult('systemTestResult', false, 'システムテストエラー', error.message);
                log('❌ システムテストエラー: ' + error.message);
            }
            
            showLoading(false);
        }
        
        // 全テスト実行
        async function runAllTests() {
            log('🧪 全テスト一括実行開始');
            
            await runFileTest();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await runDatabaseTest();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await runApiTest();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await runSystemTest();
            
            log('🎉 全テスト実行完了');
        }
        
        // ファイルアップロード
        async function uploadFile(file) {
            if (!file) return;
            
            log(`📤 ファイルアップロード開始: ${file.name}`);
            showLoading(true);
            
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch('', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    log(`✅ ファイルアップロード成功: ${file.name}`);
                } else {
                    log(`❌ ファイルアップロード失敗: ${result.message}`);
                }
            } catch (error) {
                log(`❌ ファイルアップロードエラー: ${error.message}`);
            }
            
            showLoading(false);
        }
        
        // ドラッグ&ドロップ対応
        document.addEventListener('DOMContentLoaded', function() {
            const fileUpload = document.querySelector('.file-upload');
            
            fileUpload.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUpload.style.borderColor = '#667eea';
                fileUpload.style.background = 'rgba(102, 126, 234, 0.2)';
            });
            
            fileUpload.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUpload.style.borderColor = '#ccc';
                fileUpload.style.background = 'transparent';
            });
            
            fileUpload.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUpload.style.borderColor = '#ccc';
                fileUpload.style.background = 'transparent';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    uploadFile(files[0]);
                }
            });
        });
    </script>
</body>
</html>
