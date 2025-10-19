<?php
/**
 * PostgreSQL接続確認 & 修復ツール
 * 実際のDB状況を確認して正しい設定を特定
 */

if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セキュリティヘッダー設定
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// PostgreSQL接続確認パターン（システムDB優先）
$postgresConfigs = [
    // システムデータベース（必ず存在）
    [
        'label' => 'PostgreSQL システムDB (postgres/空パスワード)',
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'postgres',
        'user' => 'postgres',
        'password' => ''
    ],
    [
        'label' => 'PostgreSQL システムDB (postgres/postgres)',
        'host' => 'localhost',
        'port' => '5432', 
        'dbname' => 'postgres',
        'user' => 'postgres',
        'password' => 'postgres'
    ],
    [
        'label' => 'PostgreSQL Template1 (postgres/空パスワード)',
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'template1',
        'user' => 'postgres',
        'password' => ''
    ],
    [
        'label' => 'macOS PostgreSQL.app (postgres/空パスワード)',
        'host' => 'localhost',
        'port' => '5433',
        'dbname' => 'postgres',
        'user' => 'postgres',
        'password' => ''
    ],
    [
        'label' => 'HomeBrew PostgreSQL (ユーザー名/空パスワード)',
        'host' => 'localhost',
        'port' => '5432',
        'dbname' => 'postgres',
        'user' => get_current_user(),
        'password' => ''
    ]
];

// 接続テスト関数
function testPostgreSQLConnection($config) {
    try {
        $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5
        ]);
        
        // 基本情報取得
        $version = $pdo->query("SELECT version()")->fetchColumn();
        $databases = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false")->fetchAll(PDO::FETCH_COLUMN);
        $users = $pdo->query("SELECT usename FROM pg_user")->fetchAll(PDO::FETCH_COLUMN);
        
        return [
            'success' => true,
            'pdo' => $pdo,
            'version' => $version,
            'databases' => $databases,
            'users' => $users
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

// eBayテーブル検索関数
function findEbayTables($pdo, $databases) {
    $results = [];
    
    foreach ($databases as $dbname) {
        try {
            // 各データベースに接続してテーブル確認
            $config = [
                'host' => 'localhost',
                'port' => '5432', 
                'dbname' => $dbname,
                'user' => 'postgres',
                'password' => ''
            ];
            
            $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['dbname']}";
            $dbPdo = new PDO($dsn, $config['user'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 3
            ]);
            
            // eBay関連テーブル検索
            $tables = $dbPdo->query("
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name LIKE '%ebay%'
            ")->fetchAll(PDO::FETCH_COLUMN);
            
            if (!empty($tables)) {
                $results[$dbname] = [
                    'tables' => $tables,
                    'config' => $config
                ];
            }
            
        } catch (Exception $e) {
            // 接続失敗は無視（そのDBはスキップ）
        }
    }
    
    return $results;
}

// 接続試行
$connectionResult = null;
$allResults = [];

foreach ($postgresConfigs as $index => $config) {
    $result = testPostgreSQLConnection($config);
    $result['config'] = $config;
    $result['index'] = $index + 1;
    $allResults[] = $result;
    
    if ($result['success'] && $connectionResult === null) {
        $connectionResult = $result;
    }
}

// eBayテーブル検索
$ebayData = [];
if ($connectionResult) {
    $ebayData = findEbayTables($connectionResult['pdo'], $connectionResult['databases']);
}

session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostgreSQL接続確認 & 修復ツール</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .header {
            text-align: center;
            margin-bottom: 2rem;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #1e293b;
            font-size: 2rem;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        
        .section {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        
        .section h2 {
            color: #1e293b;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .test-result {
            padding: 1rem;
            margin: 0.5rem 0;
            border-radius: 8px;
            border-left: 4px solid;
        }
        
        .result-success {
            background: #f0fdf4;
            border-color: #22c55e;
            color: #166534;
        }
        
        .result-error {
            background: #fef2f2;
            border-color: #ef4444;
            color: #991b1b;
        }
        
        .config-details {
            font-size: 0.875rem;
            color: #64748b;
            margin-top: 0.5rem;
            background: #f8fafc;
            padding: 0.5rem;
            border-radius: 4px;
        }
        
        .database-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        
        .info-card {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-card h4 {
            color: #1e293b;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
        }
        
        .info-list {
            list-style: none;
            font-size: 0.75rem;
            color: #64748b;
        }
        
        .info-list li {
            padding: 0.125rem 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .info-list li:last-child {
            border-bottom: none;
        }
        
        .ebay-table {
            background: #f0fdf4;
            border: 1px solid #22c55e;
            padding: 1rem;
            border-radius: 8px;
            margin: 0.5rem 0;
        }
        
        .ebay-table h4 {
            color: #166534;
            margin-bottom: 0.5rem;
        }
        
        .table-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        
        .table-tag {
            background: #22c55e;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        
        .recommended-config {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            padding: 1.5rem;
            border-radius: 12px;
            margin-top: 2rem;
        }
        
        .recommended-config h3 {
            color: #92400e;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .config-code {
            background: #1e293b;
            color: #e2e8f0;
            padding: 1rem;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            margin-top: 1rem;
            overflow-x: auto;
        }
        
        .copy-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }
        
        .copy-btn:hover {
            background: #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <i class="fas fa-database"></i>
                PostgreSQL接続確認 & 修復ツール
            </h1>
            <p>実際のPostgreSQL設定を確認して最適な接続設定を特定します</p>
        </div>
        
        <!-- 接続テスト結果 -->
        <div class="section">
            <h2><i class="fas fa-plug"></i> 接続テスト結果</h2>
            
            <?php foreach ($allResults as $result): ?>
                <div class="test-result <?= $result['success'] ? 'result-success' : 'result-error' ?>">
                    <div>
                        <strong><?= $result['index'] ?>. <?= htmlspecialchars($result['config']['label'], ENT_QUOTES, 'UTF-8') ?></strong>
                        <?= $result['success'] ? ' ✅ 成功' : ' ❌ 失敗' ?>
                    </div>
                    
                    <div class="config-details">
                        ホスト: <?= htmlspecialchars($result['config']['host'] . ':' . $result['config']['port'], ENT_QUOTES, 'UTF-8') ?> |
                        DB: <?= htmlspecialchars($result['config']['dbname'], ENT_QUOTES, 'UTF-8') ?> |
                        ユーザー: <?= htmlspecialchars($result['config']['user'], ENT_QUOTES, 'UTF-8') ?>
                    </div>
                    
                    <?php if (!$result['success']): ?>
                        <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #dc2626;">
                            エラー: <?= htmlspecialchars($result['error'], ENT_QUOTES, 'UTF-8') ?>
                        </div>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>
        </div>
        
        <?php if ($connectionResult): ?>
            <!-- PostgreSQL情報 -->
            <div class="section">
                <h2><i class="fas fa-info-circle"></i> PostgreSQL情報</h2>
                
                <div class="database-info">
                    <div class="info-card">
                        <h4>バージョン情報</h4>
                        <p style="font-size: 0.75rem; color: #64748b;">
                            <?= htmlspecialchars($connectionResult['version'], ENT_QUOTES, 'UTF-8') ?>
                        </p>
                    </div>
                    
                    <div class="info-card">
                        <h4>利用可能データベース (<?= count($connectionResult['databases']) ?>個)</h4>
                        <ul class="info-list">
                            <?php foreach ($connectionResult['databases'] as $db): ?>
                                <li><?= htmlspecialchars($db, ENT_QUOTES, 'UTF-8') ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                    
                    <div class="info-card">
                        <h4>PostgreSQLユーザー (<?= count($connectionResult['users']) ?>個)</h4>
                        <ul class="info-list">
                            <?php foreach ($connectionResult['users'] as $user): ?>
                                <li><?= htmlspecialchars($user, ENT_QUOTES, 'UTF-8') ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- eBayテーブル検索結果 -->
            <div class="section">
                <h2><i class="fas fa-search"></i> eBayテーブル検索結果</h2>
                
                <?php if (!empty($ebayData)): ?>
                    <?php foreach ($ebayData as $dbname => $data): ?>
                        <div class="ebay-table">
                            <h4>📊 データベース: <?= htmlspecialchars($dbname, ENT_QUOTES, 'UTF-8') ?></h4>
                            <div class="table-list">
                                <?php foreach ($data['tables'] as $table): ?>
                                    <span class="table-tag"><?= htmlspecialchars($table, ENT_QUOTES, 'UTF-8') ?></span>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="test-result result-error">
                        eBay関連のテーブルが見つかりませんでした。
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- 推奨設定 -->
            <div class="recommended-config">
                <h3><i class="fas fa-lightbulb"></i> 推奨設定</h3>
                
                <?php if (!empty($ebayData)): ?>
                    <?php 
                    $recommendedDb = array_keys($ebayData)[0];
                    $recommendedConfig = $ebayData[$recommendedDb]['config'];
                    ?>
                    <p><strong>eBayデータが見つかりました！</strong> 以下の設定を使用してください：</p>
                    
                    <div class="config-code">
$config = [
    'host' => '<?= $recommendedConfig['host'] ?>',
    'dbname' => '<?= $recommendedDb ?>',
    'user' => '<?= $recommendedConfig['user'] ?>',
    'password' => '<?= $recommendedConfig['password'] ?>',
    'port' => '<?= $recommendedConfig['port'] ?>'
];
                    </div>
                    
                    <button class="copy-btn" onclick="copyRecommendedConfig()">設定をコピー</button>
                    
                    <script>
                        function copyRecommendedConfig() {
                            const config = `$config = [
    'host' => '<?= $recommendedConfig['host'] ?>',
    'dbname' => '<?= $recommendedDb ?>',
    'user' => '<?= $recommendedConfig['user'] ?>',
    'password' => '<?= $recommendedConfig['password'] ?>',
    'port' => '<?= $recommendedConfig['port'] ?>'
];`;
                            navigator.clipboard.writeText(config).then(() => {
                                alert('設定をクリップボードにコピーしました！');
                            });
                        }
                    </script>
                    
                <?php else: ?>
                    <p><strong>基本接続は成功しましたが、eBayデータが見つかりません。</strong></p>
                    <p>以下の設定でPostgreSQLに接続できます：</p>
                    
                    <div class="config-code">
$config = [
    'host' => '<?= $connectionResult['config']['host'] ?>',
    'dbname' => '<?= $connectionResult['config']['dbname'] ?>',
    'user' => '<?= $connectionResult['config']['user'] ?>',
    'password' => '<?= $connectionResult['config']['password'] ?>',
    'port' => '<?= $connectionResult['config']['port'] ?>'
];
                    </div>
                <?php endif; ?>
            </div>
        <?php else: ?>
            <div class="section">
                <div class="test-result result-error">
                    <strong>PostgreSQL接続に失敗しました</strong><br>
                    PostgreSQLがインストールされていない可能性があります。<br>
                    <a href="https://postgresapp.com/" target="_blank">Postgres.app</a> または Homebrewでのインストールをお勧めします。
                </div>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
