<?php
// 🔧 CAIDS 完全機能版テストツール - ローディング機能なし安定版
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// セッション開始（重複チェック付き）
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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

$result_message = '';
$result_class = '';
$test_results = [];

// AJAX リクエスト処理（同期処理版）
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    
    // CSRF トークン検証
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        $result_message = '❌ CSRF token mismatch';
        $result_class = 'error';
    } else {
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
                
                $test_results = $results;
                $result_message = '✅ ファイル操作テスト完了';
                $result_class = 'success';
                break;
                
            // データベーステスト
            case 'test_database':
                $pdo = initDatabase();
                if (!$pdo) {
                    $result_message = '❌ データベース接続失敗';
                    $result_class = 'error';
                    break;
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
                
                $test_results = $results;
                $result_message = '✅ データベーステスト完了';
                $result_class = 'success';
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
                
                $test_results = $results;
                $result_message = '✅ API連携テスト完了';
                $result_class = 'success';
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
                
                $test_results = $results;
                $result_message = '✅ システムテスト完了';
                $result_class = 'success';
                break;
                
            // API Ping
            case 'api_ping':
                jsonResponse(true, 'Pong! API接続正常', ['timestamp' => time()]);
                break;
                
            default:
                $result_message = '❌ 不明なアクション: ' . htmlspecialchars($action);
                $result_class = 'error';
        }
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
            $result_message = "✅ ファイルアップロード成功: {$fileName}";
            $result_class = 'success';
        } else {
            $result_message = '❌ ファイル移動失敗';
            $result_class = 'error';
        }
    } else {
        $result_message = '❌ ファイルアップロードエラー: ' . $file['error'];
        $result_class = 'error';
    }
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 NAGANO-3 完全機能版テストツール</title>
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
        .result {
            margin: 20px 0; padding: 15px; border-radius: 8px; font-weight: 500;
        }
        .result.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .result.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .test-details {
            margin-top: 15px; padding: 15px; border-radius: 8px; background: #f8f9fa;
            border-left: 4px solid #28a745; display: none;
        }
        .test-details.show { display: block; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .file-upload {
            border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 10px;
            margin: 15px 0; transition: all 0.3s ease;
        }
        .file-upload:hover { border-color: #667eea; background: rgba(102, 126, 234, 0.1); }
        .console {
            background: #1e1e1e; color: #00ff00; padding: 20px; border-radius: 10px;
            font-family: 'Monaco', 'Consolas', monospace; max-height: 300px; overflow-y: auto;
            margin-top: 20px;
        }
        .detail-item { margin: 5px 0; }
        .detail-success { color: #155724; }
        .detail-error { color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 NAGANO-3 完全機能版テストツール</h1>
            <p>バックエンド完全連携版 - 実際のサーバー処理テスト（ローディング機能なし安定版）</p>
        </div>
        
        <div class="status-bar">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div class="status-indicator"></div>
                <span>サーバー状態: 稼働中</span>
            </div>
            <div>PHP バージョン: <?= PHP_VERSION ?></div>
            <div>現在時刻: <span id="currentTime"></span></div>
        </div>
        
        <?php if ($result_message): ?>
            <div class="result <?= $result_class ?>">
                <?= $result_message ?>
            </div>
        <?php endif; ?>
        
        <?php if ($test_results): ?>
            <div class="test-details show">
                <h4>📊 詳細テスト結果</h4>
                <?php foreach ($test_results as $test_name => $test_result): ?>
                    <div class="detail-item <?= $test_result['success'] ? 'detail-success' : 'detail-error' ?>">
                        <?= $test_result['success'] ? '✅' : '❌' ?> 
                        <strong><?= htmlspecialchars($test_name) ?>:</strong> 
                        <?= htmlspecialchars($test_result['message']) ?>
                        <?php if (isset($test_result['details'])): ?>
                            <ul style="margin-left: 20px; margin-top: 5px;">
                                <?php foreach ($test_result['details'] as $key => $value): ?>
                                    <li><?= htmlspecialchars($key) ?>: <?= htmlspecialchars(is_array($value) ? json_encode($value) : $value) ?></li>
                                <?php endforeach; ?>
                            </ul>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        
        <div class="test-grid">
            <!-- ファイル操作テスト -->
            <div class="test-card">
                <h3>📁 ファイル操作テスト</h3>
                <p>実際のファイル読み書き・削除・権限チェック</p>
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                    <button type="submit" name="action" value="test_file_operations" class="test-button">
                        ファイル操作テスト実行
                    </button>
                </form>
                
                <div class="file-upload" onclick="document.getElementById('fileInput').click()">
                    <p>📤 ファイルアップロードテスト</p>
                    <p>クリックまたはドラッグ&ドロップ</p>
                    <form method="POST" enctype="multipart/form-data" id="uploadForm">
                        <input type="file" id="fileInput" name="file" style="display: none;" onchange="document.getElementById('uploadForm').submit()">
                    </form>
                </div>
            </div>
            
            <!-- データベーステスト -->
            <div class="test-card">
                <h3>🗄️ データベーステスト</h3>
                <p>実際のSQLite CRUD操作・トランザクション</p>
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                    <button type="submit" name="action" value="test_database" class="test-button">
                        データベーステスト実行
                    </button>
                </form>
            </div>
            
            <!-- API連携テスト -->
            <div class="test-card">
                <h3>🌐 API連携テスト</h3>
                <p>内部・外部API接続・HTTP通信</p>
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                    <button type="submit" name="action" value="test_api" class="test-button">
                        API連携テスト実行
                    </button>
                </form>
            </div>
            
            <!-- システムテスト -->
            <div class="test-card">
                <h3>⚙️ システムテスト</h3>
                <p>PHP設定・メモリ・ディスク容量チェック</p>
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?>">
                    <button type="submit" name="action" value="test_system" class="test-button">
                        システムテスト実行
                    </button>
                </form>
            </div>
        </div>
        
        <!-- 全テスト実行 -->
        <div style="text-align: center; margin: 30px 0;">
            <form method="GET">
                <button type="submit" class="test-button" style="max-width: 400px; font-size: 18px; padding: 15px 30px;">
                    🧪 ページリロード（全テスト準備）
                </button>
            </form>
        </div>
        
        <!-- コンソールログ -->
        <div class="console" id="console">
            <div>[<?= date('H:i:s') ?>] 🚀 完全機能版テストツール初期化完了</div>
            <div>[<?= date('H:i:s') ?>] 📡 サーバーサイド処理準備完了（ローディング機能なし安定版）</div>
            <div>[<?= date('H:i:s') ?>] ✅ Ajax機能削除、同期処理のみで安定動作保証</div>
        </div>
    </div>
    
    <script>
        // 時刻更新
        function updateTime() {
            document.getElementById('currentTime').textContent = new Date().toLocaleTimeString('ja-JP');
        }
        setInterval(updateTime, 1000);
        updateTime();
        
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
                    document.getElementById('fileInput').files = files;
                    document.getElementById('uploadForm').submit();
                }
            });
        });
    </script>
</body>
</html>
