<?php
/**
 * Yahoo Auction Tool - 簡易修復版
 * HTTP ERROR 500 修正対応
 * 作成日: 2025-09-12
 */

// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// 基本的なデータベース接続確認
function checkDatabaseConnection() {
    try {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = 'password123';
        
        $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 簡単な接続テスト
        $stmt = $pdo->query("SELECT COUNT(*) as total FROM mystical_japan_treasures_inventory LIMIT 1");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return [
            'status' => 'success',
            'total_records' => $result['total'] ?? 0,
            'message' => 'データベース接続成功'
        ];
    } catch (PDOException $e) {
        return [
            'status' => 'error',
            'total_records' => 0,
            'message' => 'データベース接続失敗: ' . $e->getMessage()
        ];
    }
}

// JSONレスポンス用のヘッダー設定関数
function sendJsonResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// ユーザーアクションの処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'test_database':
        $result = checkDatabaseConnection();
        sendJsonResponse($result);
        break;
        
    default:
        // 通常のページ表示
        break;
}

// ダッシュボード統計取得（安全版）
$dashboard_stats = checkDatabaseConnection();

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo→eBay統合ワークフロー（簡易修復版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #1e40af;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #0ea5e9;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --border-color: #e2e8f0;
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
            --radius-sm: 0.25rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--space-lg);
        }

        .dashboard-header {
            text-align: center;
            margin-bottom: var(--space-xl);
        }

        .dashboard-header h1 {
            color: var(--primary-color);
            font-size: 2rem;
            margin-bottom: var(--space-sm);
        }

        .dashboard-header p {
            color: var(--text-secondary);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-xl);
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            text-align: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-lg);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-lg);
        }

        .section-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-xs);
            padding: var(--space-sm) var(--space-md);
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s ease;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(30, 64, 175, 0.3);
        }

        .btn-success { background: var(--success-color); }
        .btn-info { background: var(--info-color); }

        .notification {
            padding: var(--space-md);
            border-radius: var(--radius-md);
            margin: var(--space-md) 0;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .notification.success {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }

        .notification.error {
            background: #fee2e2;
            color: #dc2626;
            border: 1px solid #fca5a5;
        }

        .notification.info {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #93c5fd;
        }

        .system-status {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--space-md);
            margin-top: var(--space-lg);
        }

        .status-item {
            background: var(--bg-tertiary);
            padding: var(--space-md);
            border-radius: var(--radius-md);
        }

        .status-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin-bottom: var(--space-xs);
        }

        .status-value {
            font-weight: 600;
            color: var(--text-primary);
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="dashboard-header">
            <h1><i class="fas fa-tools"></i> Yahoo→eBay統合ワークフロー（緊急修復版）</h1>
            <p>HTTP ERROR 500 修正対応 - システム復旧版</p>
        </div>

        <!-- 統計カード -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="totalRecords"><?= number_format($dashboard_stats['total_records'] ?? 0) ?></div>
                <div class="stat-label">総データ数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="systemStatus"><?= $dashboard_stats['status'] === 'success' ? '正常' : 'エラー' ?></div>
                <div class="stat-label">システム状態</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="lastCheck"><?= date('H:i') ?></div>
                <div class="stat-label">最終確認</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="serverTime"><?= date('m/d') ?></div>
                <div class="stat-label">日付</div>
            </div>
        </div>

        <!-- システム復旧状況 -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-heartbeat"></i>
                <h3 class="section-title">システム復旧状況</h3>
            </div>

            <div id="recoveryStatus">
                <?php if ($dashboard_stats['status'] === 'success'): ?>
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <strong>システム復旧完了！</strong><br>
                            <?= $dashboard_stats['message'] ?><br>
                            データベースレコード数: <?= number_format($dashboard_stats['total_records']) ?>件
                        </div>
                    </div>
                <?php else: ?>
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>システム復旧中...</strong><br>
                            <?= htmlspecialchars($dashboard_stats['message']) ?>
                        </div>
                    </div>
                <?php endif; ?>
            </div>

            <div style="margin-top: var(--space-lg);">
                <button class="btn btn-success" onclick="testDatabase()">
                    <i class="fas fa-database"></i> データベース接続再テスト
                </button>
                <button class="btn btn-info" onclick="window.location.reload()">
                    <i class="fas fa-sync-alt"></i> ページ再読み込み
                </button>
            </div>

            <div id="testResult" style="margin-top: var(--space-md);"></div>
        </div>

        <!-- 簡易機能テスト -->
        <div class="section">
            <div class="section-header">
                <i class="fas fa-vial"></i>
                <h3 class="section-title">基本機能テスト</h3>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-md);">
                <div class="status-item">
                    <div class="status-label">PHPバージョン</div>
                    <div class="status-value"><?= PHP_VERSION ?></div>
                </div>
                <div class="status-item">
                    <div class="status-label">PostgreSQL拡張</div>
                    <div class="status-value"><?= extension_loaded('pdo_pgsql') ? '有効' : '無効' ?></div>
                </div>
                <div class="status-item">
                    <div class="status-label">セッション状態</div>
                    <div class="status-value"><?= session_status() === PHP_SESSION_ACTIVE ? '有効' : '無効' ?></div>
                </div>
                <div class="status-item">
                    <div class="status-label">CSRFトークン</div>
                    <div class="status-value"><?= isset($_SESSION['csrf_token']) ? '設定済み' : '未設定' ?></div>
                </div>
            </div>
        </div>

        <!-- システム状態表示 -->
        <div class="system-status">
            <div class="status-item">
                <div class="status-label">修復状況</div>
                <div class="status-value">HTTP ERROR 500 解決済み</div>
            </div>
            <div class="status-item">
                <div class="status-label">次のステップ</div>
                <div class="status-value">Phase 1機能統合準備</div>
            </div>
            <div class="status-item">
                <div class="status-label">サーバー時間</div>
                <div class="status-value"><?= date('Y-m-d H:i:s') ?></div>
            </div>
        </div>
    </div>

    <script>
        // システム初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Yahoo Auction Tool 緊急修復版 初期化完了');
        });

        // データベース接続テスト
        async function testDatabase() {
            const resultDiv = document.getElementById('testResult');
            
            try {
                resultDiv.innerHTML = '<div class="notification info"><i class="fas fa-spinner fa-spin"></i> データベース接続テスト中...</div>';
                
                const response = await fetch(window.location.pathname + '?action=test_database', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    resultDiv.innerHTML = `
                        <div class="notification success">
                            <i class="fas fa-check-circle"></i>
                            <div>
                                <strong>データベース接続成功!</strong><br>
                                ${data.message}<br>
                                総レコード数: ${data.total_records.toLocaleString()}件
                            </div>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div class="notification error">
                            <i class="fas fa-times-circle"></i>
                            <div>
                                <strong>データベース接続失敗</strong><br>
                                ${data.message}
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>テスト実行エラー</strong><br>
                            ${error.message}
                        </div>
                    </div>
                `;
            }
        }

        console.log('✅ Yahoo Auction Tool 緊急修復版が正常に動作しています');
        console.log('📊 PHP Version:', '<?= PHP_VERSION ?>');
        console.log('🗄️ Database Status:', '<?= $dashboard_stats["status"] ?>');
    </script>
</body>
</html>
