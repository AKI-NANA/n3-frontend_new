<?php
/**
 * Yahoo Auction スクレイピング デバッグ・修正版
 * データベース保存の詳細ログとエラー対応
 */

// 直接アクセス可能
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// ログファイル設定
$debug_log_file = __DIR__ . '/scraping_debug.txt';

// デバッグログ関数
function writeDebugLog($message, $type = 'DEBUG') {
    global $debug_log_file;
    $timestamp = date('Y-m-d H:i:s');
    $log_entry = "[{$timestamp}] [{$type}] {$message}" . PHP_EOL;
    file_put_contents($debug_log_file, $log_entry, FILE_APPEND | LOCK_EX);
}

// データベース接続テスト
function testDatabaseConnection() {
    try {
        writeDebugLog('データベース接続テスト開始', 'INFO');
        
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 接続テスト
        $pdo->query("SELECT 1");
        writeDebugLog('✅ データベース接続成功', 'SUCCESS');
        
        // テーブル存在確認
        $checkSql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products')";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute();
        $tableExists = $checkStmt->fetchColumn();
        
        if ($tableExists) {
            writeDebugLog('✅ yahoo_scraped_products テーブル存在確認', 'SUCCESS');
            
            // データ件数確認
            $countSql = "SELECT COUNT(*) as count FROM yahoo_scraped_products";
            $countStmt = $pdo->prepare($countSql);
            $countStmt->execute();
            $count = $countStmt->fetch()['count'];
            
            writeDebugLog("📊 現在のデータ数: {$count}件", 'INFO');
            
            return [
                'success' => true,
                'connection' => true,
                'table_exists' => true,
                'count' => $count,
                'message' => "データベース接続成功。テーブル存在、データ{$count}件"
            ];
        } else {
            writeDebugLog('❌ yahoo_scraped_products テーブルが存在しない', 'ERROR');
            return [
                'success' => false,
                'connection' => true,
                'table_exists' => false,
                'count' => 0,
                'message' => 'テーブルが存在しません'
            ];
        }
        
    } catch (PDOException $e) {
        writeDebugLog('❌ データベース接続失敗: ' . $e->getMessage(), 'ERROR');
        return [
            'success' => false,
            'connection' => false,
            'table_exists' => false,
            'count' => 0,
            'message' => 'データベース接続失敗: ' . $e->getMessage()
        ];
    }
}

// 詳細ログ付きデータベース保存
function saveProductToDatabaseWithDebug($product_data) {
    try {
        writeDebugLog('🔄 データベース保存開始', 'INFO');
        
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        writeDebugLog('✅ PDO接続成功', 'SUCCESS');
        
        // データ準備（詳細ログ付き）
        $source_item_id = $product_data['item_id'] ?? 'SCRAPED_' . time() . '_' . rand(100, 999);
        $sku = 'SKU-' . strtoupper(substr($source_item_id, 0, 15));
        $price_jpy = (int)($product_data['current_price'] ?? 0);
        $active_title = $product_data['title'] ?? 'タイトル不明';
        $active_description = $product_data['description'] ?? '';
        $active_price_usd = $price_jpy > 0 ? round($price_jpy / 150, 2) : null;
        $active_image_url = (!empty($product_data['images']) && isset($product_data['images'][0])) 
            ? $product_data['images'][0] 
            : 'https://placehold.co/300x200/725CAD/FFFFFF/png?text=No+Image';
        $current_stock = 1;
        $status = 'scraped';
        
        // JSONデータ構築
        $scraped_yahoo_data = json_encode([
            'category' => $product_data['category'] ?? 'Unknown',
            'condition' => $product_data['condition'] ?? 'Used',
            'url' => $product_data['source_url'] ?? '',
            'seller_name' => $product_data['seller_info']['name'] ?? 'Unknown',
            'bid_count' => $product_data['auction_info']['bid_count'] ?? 0,
            'end_time' => $product_data['auction_info']['end_time'] ?? '',
            'images' => $product_data['images'] ?? [],
            'scraped_at' => date('Y-m-d H:i:s'),
            'scraping_method' => $product_data['scraping_method'] ?? 'unknown'
        ], JSON_UNESCAPED_UNICODE);
        
        writeDebugLog("📝 データ準備完了: {$source_item_id} - {$active_title} (¥{$price_jpy})", 'INFO');
        writeDebugLog("🖼️ 画像URL: {$active_image_url}", 'INFO');
        writeDebugLog("📊 JSONデータサイズ: " . strlen($scraped_yahoo_data) . "文字", 'INFO');
        
        // 重複チェック（詳細ログ付き）
        $checkSql = "SELECT id, source_item_id, active_title FROM yahoo_scraped_products WHERE source_item_id = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$source_item_id]);
        $existing = $checkStmt->fetch();
        
        if ($existing) {
            writeDebugLog("🔄 既存データ発見: ID {$existing['id']} - {$existing['active_title']}", 'INFO');
            writeDebugLog('🔄 UPDATEクエリ実行中...', 'INFO');
            
            // UPDATE実行
            $sql = "UPDATE yahoo_scraped_products SET 
                sku = ?,
                price_jpy = ?,
                scraped_yahoo_data = ?,
                active_title = ?,
                active_description = ?,
                active_price_usd = ?,
                active_image_url = ?,
                current_stock = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE source_item_id = ?";
            
            $stmt = $pdo->prepare($sql);
            $params = [
                $sku,
                $price_jpy,
                $scraped_yahoo_data,
                $active_title,
                $active_description,
                $active_price_usd,
                $active_image_url,
                $current_stock,
                $status,
                $source_item_id
            ];
            
            writeDebugLog('📋 UPDATEパラメータ: ' . json_encode($params), 'DEBUG');
            
            $result = $stmt->execute($params);
            
            if ($result) {
                writeDebugLog("✅ データ更新成功: {$source_item_id}", 'SUCCESS');
                return [
                    'success' => true,
                    'action' => 'updated',
                    'item_id' => $source_item_id,
                    'title' => $active_title,
                    'price' => $price_jpy
                ];
            } else {
                writeDebugLog("❌ データ更新失敗: {$source_item_id}", 'ERROR');
                return [
                    'success' => false,
                    'action' => 'update_failed',
                    'error' => 'UPDATE実行失敗'
                ];
            }
            
        } else {
            writeDebugLog('🆕 新規データとして保存します', 'INFO');
            writeDebugLog('🔄 INSERTクエリ実行中...', 'INFO');
            
            // INSERT実行
            $sql = "INSERT INTO yahoo_scraped_products (
                source_item_id,
                sku,
                price_jpy,
                scraped_yahoo_data,
                active_title,
                active_description,
                active_price_usd,
                active_image_url,
                current_stock,
                status,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
            
            $stmt = $pdo->prepare($sql);
            $params = [
                $source_item_id,
                $sku,
                $price_jpy,
                $scraped_yahoo_data,
                $active_title,
                $active_description,
                $active_price_usd,
                $active_image_url,
                $current_stock,
                $status
            ];
            
            writeDebugLog('📋 INSERTパラメータ: ' . json_encode($params), 'DEBUG');
            
            $result = $stmt->execute($params);
            
            if ($result) {
                $insertId = $pdo->lastInsertId();
                writeDebugLog("✅ データ新規保存成功: ID {$insertId} - {$source_item_id}", 'SUCCESS');
                
                // 保存確認
                $verifySql = "SELECT id, source_item_id, active_title, price_jpy FROM yahoo_scraped_products WHERE id = ?";
                $verifyStmt = $pdo->prepare($verifySql);
                $verifyStmt->execute([$insertId]);
                $saved = $verifyStmt->fetch();
                
                if ($saved) {
                    writeDebugLog("✅ 保存確認成功: {$saved['source_item_id']} - {$saved['active_title']} (¥{$saved['price_jpy']})", 'SUCCESS');
                } else {
                    writeDebugLog("❌ 保存確認失敗: データが見つからない", 'ERROR');
                }
                
                return [
                    'success' => true,
                    'action' => 'inserted',
                    'item_id' => $source_item_id,
                    'title' => $active_title,
                    'price' => $price_jpy,
                    'database_id' => $insertId
                ];
            } else {
                writeDebugLog("❌ データ新規保存失敗: {$source_item_id}", 'ERROR');
                return [
                    'success' => false,
                    'action' => 'insert_failed',
                    'error' => 'INSERT実行失敗'
                ];
            }
        }
        
    } catch (PDOException $e) {
        writeDebugLog("❌ PDOエラー: " . $e->getMessage(), 'ERROR');
        writeDebugLog("❌ SQLState: " . $e->getCode(), 'ERROR');
        return [
            'success' => false,
            'action' => 'database_error',
            'error' => $e->getMessage(),
            'sql_state' => $e->getCode()
        ];
    } catch (Exception $e) {
        writeDebugLog("❌ 一般例外: " . $e->getMessage(), 'ERROR');
        return [
            'success' => false,
            'action' => 'general_error',
            'error' => $e->getMessage()
        ];
    }
}

// テストデータ作成
function createTestData() {
    writeDebugLog('🧪 テストデータ作成開始', 'INFO');
    
    $test_data = [
        'item_id' => 'TEST_' . time(),
        'title' => 'テストスクレイピングデータ - ポケモンカード サンプル',
        'description' => 'このデータはスクレイピングシステムのテスト用です。',
        'current_price' => 1500,
        'condition' => 'Excellent',
        'category' => 'ポケモンカードゲーム',
        'images' => [
            'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test1.jpg',
            'https://auctions.c.yimg.jp/images.auctions.yahoo.co.jp/image/test2.jpg'
        ],
        'seller_info' => [
            'name' => 'test_seller',
            'rating' => '98%'
        ],
        'auction_info' => [
            'end_time' => date('Y-m-d H:i:s', strtotime('+7 days')),
            'bid_count' => 3
        ],
        'scraped_at' => date('Y-m-d H:i:s'),
        'source_url' => 'https://auctions.yahoo.co.jp/jp/auction/test123',
        'scraping_method' => 'test_debug'
    ];
    
    $result = saveProductToDatabaseWithDebug($test_data);
    
    writeDebugLog('🧪 テストデータ作成結果: ' . json_encode($result), $result['success'] ? 'SUCCESS' : 'ERROR');
    
    return $result;
}

// API処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'test_db_connection':
            $result = testDatabaseConnection();
            header('Content-Type: application/json');
            echo json_encode($result);
            exit;
            
        case 'create_test_data':
            $result = createTestData();
            header('Content-Type: application/json');
            echo json_encode($result);
            exit;
            
        case 'get_debug_logs':
            $logs = [];
            if (file_exists($debug_log_file)) {
                $logLines = file($debug_log_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                $logs = array_slice(array_reverse($logLines), 0, 50); // 最新50行
            }
            header('Content-Type: application/json');
            echo json_encode(['logs' => $logs]);
            exit;
            
        case 'clear_logs':
            file_put_contents($debug_log_file, '');
            writeDebugLog('🗑️ ログクリア実行', 'INFO');
            header('Content-Type: application/json');
            echo json_encode(['success' => true, 'message' => 'ログをクリアしました']);
            exit;
    }
}

writeDebugLog('🚀 スクレイピングデバッグシステム初期化完了', 'INFO');
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction スクレイピング デバッグツール</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50, #e74c3c);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
        }
        
        .content {
            padding: 2rem;
        }
        
        .debug-section {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 2rem;
            overflow: hidden;
        }
        
        .section-header {
            background: #e9ecef;
            padding: 1rem;
            font-weight: 600;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .section-content {
            padding: 1.5rem;
        }
        
        .btn {
            display: inline-block;
            padding: 8px 16px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 4px;
            font-size: 0.875rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,123,255,0.3);
        }
        
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #212529; }
        .btn-danger { background: #dc3545; }
        .btn-info { background: #17a2b8; }
        .btn-secondary { background: #6c757d; }
        
        .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            margin: 0.25rem;
        }
        
        .status-success {
            background: #d4edda;
            color: #155724;
        }
        
        .status-error {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-info {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .log-viewer {
            background: #1a1a1a;
            color: #00ff00;
            padding: 1rem;
            border-radius: 4px;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.8rem;
            line-height: 1.4;
        }
        
        .log-viewer::-webkit-scrollbar {
            width: 8px;
        }
        
        .log-viewer::-webkit-scrollbar-track {
            background: #2d2d2d;
        }
        
        .log-viewer::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 4px;
        }
        
        .log-entry {
            margin-bottom: 0.25rem;
            padding: 0.125rem 0;
        }
        
        .log-success { color: #00ff41; }
        .log-error { color: #ff4444; }
        .log-info { color: #44aaff; }
        .log-warning { color: #ffaa44; }
        .log-debug { color: #888888; }
        
        .test-results {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 2rem;
        }
        
        .loading i {
            font-size: 2rem;
            color: #007bff;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <i class="fas fa-bug"></i>
                Yahoo Auction スクレイピング デバッグツール
            </h1>
            <p>データベース保存の問題を診断・修正</p>
        </div>
        
        <div class="content">
            <!-- データベース接続テスト -->
            <div class="debug-section">
                <div class="section-header">
                    <i class="fas fa-database"></i>
                    データベース接続テスト
                </div>
                <div class="section-content">
                    <div id="dbConnectionStatus">
                        <div class="status-indicator status-info">
                            <i class="fas fa-question-circle"></i>
                            未テスト
                        </div>
                    </div>
                    
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-info" onclick="testDbConnection()">
                            <i class="fas fa-search"></i> 接続テスト
                        </button>
                        <button class="btn btn-success" onclick="createTestData()">
                            <i class="fas fa-plus"></i> テストデータ作成
                        </button>
                    </div>
                    
                    <div id="testResults" class="test-results" style="display: none;"></div>
                </div>
            </div>
            
            <!-- デバッグログビューア -->
            <div class="debug-section">
                <div class="section-header">
                    <i class="fas fa-terminal"></i>
                    リアルタイムデバッグログ
                    <div style="margin-left: auto;">
                        <button class="btn btn-secondary" onclick="refreshLogs()">
                            <i class="fas fa-sync"></i> 更新
                        </button>
                        <button class="btn btn-warning" onclick="clearLogs()">
                            <i class="fas fa-trash"></i> クリア
                        </button>
                    </div>
                </div>
                <div class="section-content">
                    <div id="logViewer" class="log-viewer">
                        <div class="log-entry log-info">[待機中] ログを読み込み中...</div>
                    </div>
                </div>
            </div>
            
            <!-- 診断結果・推奨アクション -->
            <div class="debug-section">
                <div class="section-header">
                    <i class="fas fa-stethoscope"></i>
                    診断・推奨アクション
                </div>
                <div class="section-content">
                    <div id="diagnosticsResults">
                        <p>上記のテストを実行すると、診断結果と推奨アクションが表示されます。</p>
                    </div>
                </div>
            </div>
            
            <!-- ローディング -->
            <div class="loading" id="loading">
                <i class="fas fa-spinner"></i>
                <p>処理中...</p>
            </div>
        </div>
    </div>

    <script>
        // データベース接続テスト
        async function testDbConnection() {
            showLoading();
            
            try {
                const response = await fetch('?action=test_db_connection');
                const data = await response.json();
                
                hideLoading();
                displayDbConnectionResult(data);
                
            } catch (error) {
                hideLoading();
                displayError('データベース接続テストエラー: ' + error.message);
            }
        }
        
        // テストデータ作成
        async function createTestData() {
            if (!confirm('テストデータを作成しますか？')) {
                return;
            }
            
            showLoading();
            
            try {
                const response = await fetch('?action=create_test_data');
                const data = await response.json();
                
                hideLoading();
                displayTestDataResult(data);
                refreshLogs(); // ログ更新
                
            } catch (error) {
                hideLoading();
                displayError('テストデータ作成エラー: ' + error.message);
            }
        }
        
        // ログ更新
        async function refreshLogs() {
            try {
                const response = await fetch('?action=get_debug_logs');
                const data = await response.json();
                
                displayLogs(data.logs || []);
                
            } catch (error) {
                console.error('ログ更新エラー:', error);
            }
        }
        
        // ログクリア
        async function clearLogs() {
            if (!confirm('デバッグログをクリアしますか？')) {
                return;
            }
            
            try {
                const response = await fetch('?action=clear_logs');
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('logViewer').innerHTML = 
                        '<div class="log-entry log-info">[クリア完了] ログをクリアしました</div>';
                }
                
            } catch (error) {
                console.error('ログクリアエラー:', error);
            }
        }
        
        // 結果表示関数
        function displayDbConnectionResult(data) {
            const statusDiv = document.getElementById('dbConnectionStatus');
            const resultsDiv = document.getElementById('testResults');
            
            if (data.success && data.connection) {
                statusDiv.innerHTML = `
                    <div class="status-indicator status-success">
                        <i class="fas fa-check-circle"></i>
                        接続成功 (データ${data.count}件)
                    </div>
                `;
                
                resultsDiv.innerHTML = `
                    <h4>✅ データベース接続成功</h4>
                    <p><strong>状態:</strong> ${data.message}</p>
                    <p><strong>テーブル:</strong> ${data.table_exists ? '存在' : '存在しない'}</p>
                    <p><strong>データ数:</strong> ${data.count}件</p>
                `;
                resultsDiv.style.display = 'block';
                
                // 診断表示
                if (data.count === 0) {
                    updateDiagnostics('テーブルは存在しますが、データが0件です。スクレイピングが実際には成功していない可能性があります。');
                } else {
                    updateDiagnostics(`データベースは正常です。${data.count}件のデータが保存されています。`);
                }
                
            } else {
                statusDiv.innerHTML = `
                    <div class="status-indicator status-error">
                        <i class="fas fa-times-circle"></i>
                        ${data.connection ? 'テーブルエラー' : '接続失敗'}
                    </div>
                `;
                
                resultsDiv.innerHTML = `
                    <h4>❌ データベース問題</h4>
                    <p><strong>エラー:</strong> ${data.message}</p>
                    <p><strong>対処法:</strong> ${data.table_exists ? 'データが保存されていません' : 'テーブルを作成してください'}</p>
                `;
                resultsDiv.style.display = 'block';
                
                updateDiagnostics(data.message + ' データベースまたはテーブルの設定を確認してください。');
            }
        }
        
        function displayTestDataResult(data) {
            const resultsDiv = document.getElementById('testResults');
            
            if (data.success) {
                resultsDiv.innerHTML = `
                    <h4>✅ テストデータ作成成功</h4>
                    <p><strong>アクション:</strong> ${data.action}</p>
                    <p><strong>商品ID:</strong> ${data.item_id}</p>
                    <p><strong>タイトル:</strong> ${data.title}</p>
                    <p><strong>価格:</strong> ¥${data.price}</p>
                    ${data.database_id ? `<p><strong>データベースID:</strong> ${data.database_id}</p>` : ''}
                `;
                
                updateDiagnostics('テストデータの作成に成功しました。データベース保存機能は正常に動作しています。');
                
            } else {
                resultsDiv.innerHTML = `
                    <h4>❌ テストデータ作成失敗</h4>
                    <p><strong>エラー:</strong> ${data.error}</p>
                    <p><strong>アクション:</strong> ${data.action}</p>
                    ${data.sql_state ? `<p><strong>SQLState:</strong> ${data.sql_state}</p>` : ''}
                `;
                
                updateDiagnostics('テストデータの作成に失敗しました。データベース保存に問題があります: ' + data.error);
            }
            
            resultsDiv.style.display = 'block';
        }
        
        function displayLogs(logs) {
            const logViewer = document.getElementById('logViewer');
            
            if (logs.length === 0) {
                logViewer.innerHTML = '<div class="log-entry log-info">[ログなし] デバッグログがありません</div>';
                return;
            }
            
            const logHtml = logs.map(log => {
                const logClass = getLogClass(log);
                return `<div class="log-entry ${logClass}">${escapeHtml(log)}</div>`;
            }).join('');
            
            logViewer.innerHTML = logHtml;
            logViewer.scrollTop = logViewer.scrollHeight; // 最下部にスクロール
        }
        
        function getLogClass(logLine) {
            if (logLine.includes('[SUCCESS]')) return 'log-success';
            if (logLine.includes('[ERROR]')) return 'log-error';
            if (logLine.includes('[WARNING]')) return 'log-warning';
            if (logLine.includes('[DEBUG]')) return 'log-debug';
            return 'log-info';
        }
        
        function updateDiagnostics(message) {
            document.getElementById('diagnosticsResults').innerHTML = `
                <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1976d2;">
                        <i class="fas fa-lightbulb"></i> 診断結果
                    </h4>
                    <p style="margin: 0;">${message}</p>
                </div>
            `;
        }
        
        function displayError(message) {
            document.getElementById('testResults').innerHTML = `
                <h4>❌ エラー</h4>
                <p>${message}</p>
            `;
            document.getElementById('testResults').style.display = 'block';
        }
        
        function showLoading() {
            document.getElementById('loading').style.display = 'block';
        }
        
        function hideLoading() {
            document.getElementById('loading').style.display = 'none';
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            refreshLogs(); // 初回ログ読み込み
            
            // 自動ログ更新（10秒間隔）
            setInterval(refreshLogs, 10000);
            
            console.log('✅ スクレイピングデバッグツール初期化完了');
        });
    </script>
</body>
</html>
