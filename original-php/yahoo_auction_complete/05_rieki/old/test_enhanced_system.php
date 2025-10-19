<?php
/**
 * データベース・PHP動作テストページ
 * enhanced_price_calculator_ui.php のテスト用
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// データベース接続テスト
function testDatabaseConnection() {
    $host = 'localhost';
    $dbname = 'nagano3_db';
    $username = 'postgres';
    $password = 'Kn240914';
    
    try {
        $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // テーブル存在確認
        $stmt = $pdo->query("SELECT COUNT(*) FROM enhanced_profit_calculations");
        $count = $stmt->fetchColumn();
        
        return [
            'success' => true,
            'message' => 'データベース接続成功',
            'record_count' => $count
        ];
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'データベース接続エラー: ' . $e->getMessage()
        ];
    }
}

$dbTest = testDatabaseConnection();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PHP・データベース動作テスト</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 2rem;
            background: #f8fafc;
        }
        .test-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 1rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .success {
            border-left: 4px solid #10b981;
            background: #f0fdf4;
        }
        .error {
            border-left: 4px solid #ef4444;
            background: #fef2f2;
        }
        .info {
            border-left: 4px solid #3b82f6;
            background: #eff6ff;
        }
        h1 {
            color: #1e293b;
            margin-bottom: 1rem;
        }
        .test-links {
            display: grid;
            gap: 1rem;
            margin-top: 2rem;
        }
        .test-link {
            display: block;
            padding: 1rem;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            text-align: center;
            transition: all 0.2s;
        }
        .test-link:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }
        code {
            background: #1a202c;
            color: #63b3ed;
            padding: 0.5rem 0.8rem;
            border-radius: 6px;
            font-family: 'SF Mono', Monaco, monospace;
            display: block;
            margin: 0.5rem 0;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <h1>🧪 PHP・データベース動作テスト</h1>
    
    <div class="test-card success">
        <h2>✅ PHP動作確認</h2>
        <p><strong>PHP Version:</strong> <?= phpversion() ?></p>
        <p><strong>Server Time:</strong> <?= date('Y-m-d H:i:s') ?></p>
        <p><strong>Document Root:</strong> <?= $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown' ?></p>
        <p><strong>Request URI:</strong> <?= $_SERVER['REQUEST_URI'] ?? 'Unknown' ?></p>
    </div>
    
    <div class="test-card <?= $dbTest['success'] ? 'success' : 'error' ?>">
        <h2><?= $dbTest['success'] ? '✅' : '❌' ?> データベース接続テスト</h2>
        <p><strong>Status:</strong> <?= $dbTest['message'] ?></p>
        <?php if ($dbTest['success']): ?>
            <p><strong>Records:</strong> <?= $dbTest['record_count'] ?> 件</p>
        <?php endif; ?>
    </div>
    
    <div class="test-card info">
        <h2>📊 PHP拡張機能確認</h2>
        <ul>
            <?php 
            $extensions = ['pdo', 'pdo_pgsql', 'json', 'curl', 'mbstring'];
            foreach ($extensions as $ext): 
            ?>
                <li><?= $ext ?>: <?= extension_loaded($ext) ? '✅ Loaded' : '❌ Not Loaded' ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    
    <?php if (!$dbTest['success']): ?>
    <div class="test-card error">
        <h2>🔧 データベーステーブル作成</h2>
        <p>enhanced_profit_calculations テーブルが存在しない場合は、以下のSQLを実行してください：</p>
        <code>psql -h localhost -d nagano3_db -U postgres -f create_enhanced_tables.sql</code>
    </div>
    <?php endif; ?>
    
    <div class="test-card">
        <h2>🔗 利益計算システムテストリンク</h2>
        <div class="test-links">
            <a href="enhanced_price_calculator_ui.php" class="test-link">
                📊 高度利益計算システム（UI統合版）
            </a>
            <a href="enhanced_price_calculator.php" class="test-link">
                🔧 高度利益計算システム（クラス版）
            </a>
            <a href="ddp_enhanced_price_calculator.php" class="test-link">
                🚢 DDP価格計算システム
            </a>
        </div>
    </div>
    
    <div class="test-card info">
        <h2>💡 データベースセットアップ手順</h2>
        <p>テーブルが存在しない場合：</p>
        <ol>
            <li>ターミナルでPostgreSQLに接続：
                <code>psql -h localhost -d nagano3_db -U postgres</code>
            </li>
            <li>または、SQLファイルを直接実行：
                <code>psql -h localhost -d nagano3_db -U postgres -f create_enhanced_tables.sql</code>
            </li>
        </ol>
    </div>
</body>
</html>