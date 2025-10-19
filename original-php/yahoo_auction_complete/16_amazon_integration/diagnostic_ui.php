<?php
/**
 * Amazon統合システム - 改良版テストUI
 * ASINデータ取得と設定診断
 */

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF トークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// テスト結果用変数
$testResult = null;
$errorMessage = null;
$systemCheck = [];

// システム診断
function performSystemCheck() {
    $checks = [];
    
    // 1. ファイル存在確認
    $requiredFiles = [
        'Amazon API Client' => __DIR__ . '/api/amazon_api_client.php',
        'Amazon Data Processor' => __DIR__ . '/api/amazon_data_processor.php',
        'Amazon Config' => __DIR__ . '/api/config/amazon_api_config.php'
    ];
    
    foreach ($requiredFiles as $name => $path) {
        $checks['files'][$name] = [
            'status' => file_exists($path),
            'path' => $path
        ];
    }
    
    // 2. 環境変数確認
    $envPath = '/Users/aritahiroaki/NAGANO-3/N3-Development/common/env/.env';
    $checks['env_file'] = file_exists($envPath);
    
    // 3. 必要なPHP拡張確認
    $requiredExtensions = ['curl', 'json', 'mbstring', 'openssl'];
    foreach ($requiredExtensions as $ext) {
        $checks['extensions'][$ext] = extension_loaded($ext);
    }
    
    return $checks;
}

// フォーム送信処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    // CSRF対策
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        $errorMessage = '不正なリクエストです。';
    } else {
        $action = $_POST['action'];
        
        if ($action === 'system_check') {
            $systemCheck = performSystemCheck();
        } elseif ($action === 'test_asin' && !empty($_POST['asin'])) {
            try {
                // Amazon API クライアント読み込み
                $apiClientPath = __DIR__ . '/api/amazon_api_client.php';
                if (!file_exists($apiClientPath)) {
                    throw new Exception('Amazon API クライアントファイルが見つかりません: ' . $apiClientPath);
                }
                
                require_once $apiClientPath;
                
                if (!class_exists('AmazonApiClient')) {
                    throw new Exception('AmazonApiClient クラスが読み込めません');
                }
                
                $client = new AmazonApiClient();
                $asin = strtoupper(trim($_POST['asin']));
                
                // ASIN検証
                if (!preg_match('/^[A-Z0-9]{10}$/', $asin)) {
                    throw new Exception('無効なASIN形式です。10桁の英数字で入力してください。');
                }
                
                // API呼び出し
                $result = $client->getItemsByAsin([$asin]);
                $testResult = $result;
                
            } catch (Exception $e) {
                $errorMessage = $e->getMessage();
            }
        }
    }
}

// 初回ロード時のシステムチェック
if (empty($systemCheck) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    $systemCheck = performSystemCheck();
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amazon統合システム - 診断＆テスト</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f7fa; }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; font-size: 2.5rem; }
        .card { background: white; border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #34495e; }
        input[type="text"] { width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 6px; font-size: 16px; transition: border-color 0.3s; }
        input[type="text"]:focus { border-color: #3498db; outline: none; box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1); }
        .btn { display: inline-block; padding: 12px 25px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s; text-decoration: none; }
        .btn:hover { background: #2980b9; transform: translateY(-1px); }
        .btn-success { background: #27ae60; }
        .btn-success:hover { background: #219a52; }
        .btn-warning { background: #f39c12; }
        .btn-warning:hover { background: #d68910; }
        .result { margin-top: 20px; padding: 20px; border-radius: 6px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .info { background: #cce7ff; border: 1px solid #b3d9ff; color: #004085; }
        .check-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .check-item { padding: 15px; border-radius: 6px; border-left: 4px solid #bdc3c7; }
        .check-item.pass { border-left-color: #27ae60; background: #d4edda; }
        .check-item.fail { border-left-color: #e74c3c; background: #f8d7da; }
        .status-icon { font-size: 1.2em; margin-right: 8px; }
        .json-output { background: #f8f9fa; border: 1px solid #e9ecef; padding: 15px; border-radius: 6px; overflow-x: auto; font-family: 'Courier New', monospace; white-space: pre-wrap; max-height: 400px; overflow-y: auto; font-size: 14px; }
        .navigation { text-align: center; margin-top: 30px; }
        .navigation a { margin: 0 10px; }
        .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .tab { padding: 10px 20px; background: #ecf0f1; border: none; border-radius: 6px 6px 0 0; cursor: pointer; font-weight: 600; }
        .tab.active { background: #3498db; color: white; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .progress-bar { width: 100%; background: #ecf0f1; border-radius: 10px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 20px; background: linear-gradient(90deg, #3498db, #2ecc71); transition: width 0.3s; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; }
        .stat-label { font-size: 0.9rem; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Amazon統合システム 診断＆テスト</h1>
        
        <!-- タブナビゲーション -->
        <div class="tabs">
            <button class="tab active" onclick="showTab('system')">システム診断</button>
            <button class="tab" onclick="showTab('test')">ASIN テスト</button>
            <button class="tab" onclick="showTab('config')">設定確認</button>
        </div>
        
        <!-- システム診断タブ -->
        <div id="system-tab" class="tab-content active">
            <div class="card">
                <h2>📊 システム状態チェック</h2>
                <p>Amazon統合システムの動作に必要な要素を診断します。</p>
                
                <form method="POST" style="margin-top: 20px;">
                    <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                    <button type="submit" name="action" value="system_check" class="btn btn-warning">
                        🔍 システム診断実行
                    </button>
                </form>
                
                <?php if (!empty($systemCheck)): ?>
                    <div class="result info">
                        <h3>診断結果</h3>
                        
                        <!-- 全体統計 -->
                        <?php
                        $totalChecks = 0;
                        $passedChecks = 0;
                        
                        foreach ($systemCheck['files'] as $check) {
                            $totalChecks++;
                            if ($check['status']) $passedChecks++;
                        }
                        foreach ($systemCheck['extensions'] as $check) {
                            $totalChecks++;
                            if ($check) $passedChecks++;
                        }
                        if ($systemCheck['env_file']) $passedChecks++;
                        $totalChecks++;
                        
                        $successRate = $totalChecks > 0 ? ($passedChecks / $totalChecks) * 100 : 0;
                        ?>
                        
                        <div class="stats">
                            <div class="stat-card">
                                <div class="stat-number"><?php echo $passedChecks; ?>/<?php echo $totalChecks; ?></div>
                                <div class="stat-label">チェック項目</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number"><?php echo round($successRate, 1); ?>%</div>
                                <div class="stat-label">成功率</div>
                            </div>
                        </div>
                        
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?php echo $successRate; ?>%;"></div>
                        </div>
                        
                        <div class="check-grid">
                            <!-- ファイル存在確認 -->
                            <div>
                                <h4>📁 必要ファイル</h4>
                                <?php foreach ($systemCheck['files'] as $name => $check): ?>
                                    <div class="check-item <?php echo $check['status'] ? 'pass' : 'fail'; ?>">
                                        <span class="status-icon"><?php echo $check['status'] ? '✅' : '❌'; ?></span>
                                        <strong><?php echo $name; ?></strong>
                                        <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                                            <?php echo $check['path']; ?>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                            
                            <!-- PHP拡張確認 -->
                            <div>
                                <h4>🔧 PHP拡張</h4>
                                <?php foreach ($systemCheck['extensions'] as $ext => $loaded): ?>
                                    <div class="check-item <?php echo $loaded ? 'pass' : 'fail'; ?>">
                                        <span class="status-icon"><?php echo $loaded ? '✅' : '❌'; ?></span>
                                        <strong><?php echo $ext; ?></strong>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                            
                            <!-- 環境設定 -->
                            <div>
                                <h4>⚙️ 環境設定</h4>
                                <div class="check-item <?php echo $systemCheck['env_file'] ? 'pass' : 'fail'; ?>">
                                    <span class="status-icon"><?php echo $systemCheck['env_file'] ? '✅' : '❌'; ?></span>
                                    <strong>.env ファイル</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- ASIN テストタブ -->
        <div id="test-tab" class="tab-content">
            <div class="card">
                <h2>🛒 ASIN データ取得テスト</h2>
                <p>実際のAmazon商品ASINを使ってAPI連携をテストします。</p>
                
                <form method="POST" style="margin-top: 20px;">
                    <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
                    
                    <div class="form-group">
                        <label for="asin">Amazon ASIN (10桁の英数字):</label>
                        <input type="text" id="asin" name="asin" placeholder="例: B08N5WRWNW" 
                               value="<?php echo htmlspecialchars($_POST['asin'] ?? '', ENT_QUOTES, 'UTF-8'); ?>" 
                               pattern="[A-Z0-9]{10}" maxlength="10" required>
                        <small style="color: #7f8c8d; display: block; margin-top: 5px;">
                            ※ Amazon商品ページのASINを10桁で入力してください
                        </small>
                    </div>
                    
                    <button type="submit" name="action" value="test_asin" class="btn btn-success">
                        📡 ASIN データ取得実行
                    </button>
                </form>
                
                <?php if ($testResult): ?>
                    <div class="result success">
                        <h3>✅ API呼び出し成功！</h3>
                        <p>Amazon PA-APIから商品データを正常に取得できました。</p>
                        
                        <h4>取得データ:</h4>
                        <div class="json-output"><?php echo json_encode($testResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); ?></div>
                    </div>
                <?php endif; ?>
                
                <?php if ($errorMessage): ?>
                    <div class="result error">
                        <h3>❌ エラー発生</h3>
                        <p><strong>エラー内容:</strong> <?php echo htmlspecialchars($errorMessage, ENT_QUOTES, 'UTF-8'); ?></p>
                        
                        <h4>🔧 解決方法:</h4>
                        <ul style="margin-left: 20px; margin-top: 10px;">
                            <li>Amazon PA-API認証情報が正しく設定されているか確認</li>
                            <li>ASINが10桁の正しい形式であることを確認</li>
                            <li>ネットワーク接続を確認</li>
                            <li>API制限に達していないか確認</li>
                            <li>必要なファイルが存在するか「システム診断」で確認</li>
                        </ul>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        
        <!-- 設定確認タブ -->
        <div id="config-tab" class="tab-content">
            <div class="card">
                <h2>⚙️ 設定確認・トラブルシューティング</h2>
                
                <h3>📋 必要な設定項目</h3>
                <div class="check-grid">
                    <div class="check-item">
                        <h4>🔑 Amazon PA-API認証情報</h4>
                        <p>以下の情報を.envファイルに設定する必要があります：</p>
                        <ul>
                            <li><code>AMAZON_ACCESS_KEY</code></li>
                            <li><code>AMAZON_SECRET_KEY</code></li>
                            <li><code>AMAZON_PARTNER_TAG</code></li>
                            <li><code>AMAZON_MARKETPLACE</code></li>
                        </ul>
                    </div>
                    
                    <div class="check-item">
                        <h4>🗃️ データベース設定</h4>
                        <p>PostgreSQLデータベース接続情報：</p>
                        <ul>
                            <li>ホスト: localhost</li>
                            <li>データベース: nagano3_db</li>
                            <li>ユーザー: postgres</li>
                            <li>パスワード: 設定済み</li>
                        </ul>
                    </div>
                </div>
                
                <h3>🚨 よくある問題と解決法</h3>
                <div class="result warning">
                    <h4>クラスが見つからないエラー</h4>
                    <p><strong>原因:</strong> 必要なPHPファイルが読み込めない</p>
                    <p><strong>解決:</strong> ファイルパスを確認し、システム診断を実行</p>
                </div>
                
                <div class="result warning">
                    <p><strong>API認証エラー</strong></p>
                    <p><strong>原因:</strong> Amazon PA-API認証情報が間違っている</p>
                    <p><strong>解決:</strong> .envファイルの認証情報を確認</p>
                </div>
            </div>
        </div>
        
        <div class="navigation">
            <a href="index.php" class="btn">🏠 メインページ</a>
            <a href="ui/amazon_editor_ui.php" class="btn">📝 Amazon編集UI</a>
            <a href="../02_scraping/scraping.php" class="btn">🕷️ Yahoo!スクレイピング</a>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // すべてのタブを非表示
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // 選択されたタブを表示
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }
        
        // ASIN入力の自動大文字変換
        document.addEventListener('DOMContentLoaded', function() {
            const asinInput = document.getElementById('asin');
            if (asinInput) {
                asinInput.addEventListener('input', function() {
                    this.value = this.value.toUpperCase();
                });
            }
        });
    </script>
</body>
</html>
