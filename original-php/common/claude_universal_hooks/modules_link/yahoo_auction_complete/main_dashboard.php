<?php
/**
 * Yahoo Auction Tool - 修正版メインダッシュボード
 * 500エラー修正・暫定動作版
 */

// エラー表示設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// データベース設定（直接記述）
try {
    $dsn = "pgsql:host=localhost;port=5432;dbname=nagano3_db";
    $pdo = new PDO($dsn, 'aritahiroaki', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo "データベース接続エラー: " . $e->getMessage();
    exit;
}

// 共通関数
function h($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function sendJsonResponse($data, $success = true, $message = '') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}

// アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'get_dashboard_stats':
            try {
                // 統計データ取得
                $stats = [];
                $stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
                $mystical_count = $stmt->fetchColumn();
                
                $stmt = $pdo->query("SELECT COUNT(*) FROM ebay_inventory");
                $ebay_count = $stmt->fetchColumn();
                
                $stmt = $pdo->query("SELECT COUNT(*) FROM inventory_products");
                $inventory_count = $stmt->fetchColumn();
                
                sendJsonResponse([
                    'total_records' => $mystical_count + $ebay_count + $inventory_count,
                    'scraped_count' => 0,
                    'calculated_count' => $ebay_count,
                    'filtered_count' => $mystical_count,
                    'ready_count' => $inventory_count,
                    'listed_count' => $ebay_count
                ], true, 'ダッシュボード統計取得完了');
            } catch (Exception $e) {
                sendJsonResponse(null, false, 'エラー: ' . $e->getMessage());
            }
            break;
            
        case 'get_approval_queue':
            try {
                $sql = "
                    SELECT 
                        item_id as source_id,
                        'mystical_japan' as source_table,
                        title,
                        current_price as price,
                        category_name as category,
                        condition_name,
                        picture_url as image_url,
                        'ai-pending' as ai_status,
                        'medium-risk' as risk_level
                    FROM mystical_japan_treasures_inventory 
                    ORDER BY updated_at DESC 
                    LIMIT 20
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute();
                $results = $stmt->fetchAll();
                
                sendJsonResponse($results, true, '承認データ取得完了');
            } catch (Exception $e) {
                sendJsonResponse([], false, 'エラー: ' . $e->getMessage());
            }
            break;
            
        case 'search_products':
            try {
                $query = $_GET['query'] ?? '';
                $sql = "
                    SELECT 
                        'mystical_japan' as source,
                        item_id,
                        title,
                        current_price as price,
                        'USD' as currency,
                        category_name as category,
                        'eBay' as platform,
                        updated_at
                    FROM mystical_japan_treasures_inventory 
                    WHERE title ILIKE :query 
                    ORDER BY updated_at DESC
                    LIMIT 50
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['query' => '%' . $query . '%']);
                $results = $stmt->fetchAll();
                
                sendJsonResponse($results, true, '検索完了');
            } catch (Exception $e) {
                sendJsonResponse([], false, 'エラー: ' . $e->getMessage());
            }
            break;
            
        default:
            sendJsonResponse(null, false, '不明なアクション');
            break;
    }
    exit;
}

// 統計データ初期化
try {
    $stmt = $pdo->query("SELECT COUNT(*) FROM mystical_japan_treasures_inventory");
    $total_records = $stmt->fetchColumn();
} catch (Exception $e) {
    $total_records = 0;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction Tool - 暫定版</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="assets/css/yahoo_auction_common.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <!-- ヘッダー -->
            <div class="dashboard-header">
                <h1><i class="fas fa-tools"></i> Yahoo Auction Tool - 暫定動作版</h1>
                <p>500エラー修正版・基本機能確認用</p>
            </div>

            <!-- 現在の状況表示 -->
            <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                <h4 style="margin: 0 0 0.5rem 0; color: #92400e;">🔧 現在の状況</h4>
                <p style="margin: 0; color: #92400e; font-size: 0.9rem;">
                    500エラーを修正し、基本動作を確認しています。データベース接続成功：<?= number_format($total_records) ?>件のデータを確認。
                    <br>既存の完全なUIとバックエンドを復元中です。
                </p>
            </div>

            <!-- N3統合ダッシュボードへのリンク -->
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; text-align: center;">
                <h3 style="margin: 0 0 1rem 0; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <i class="fas fa-rocket"></i>
                    N3統合システム完成版
                </h3>
                <p style="margin: 0 0 1.5rem 0; opacity: 0.9;">11個の独立システムを統合した完全版ダッシュボードがご利用いただけます</p>
                <a href="n3_integrated_dashboard.php" style="background: white; color: #667eea; padding: 1rem 2rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                    <i class="fas fa-external-link-alt"></i>
                    N3統合ダッシュボードを開く
                </a>
            </div>

            <!-- 簡易ナビゲーション -->
            <div class="tab-navigation">
                <button class="tab-btn active" data-tab="dashboard" onclick="switchTab('dashboard')">
                    <i class="fas fa-tachometer-alt"></i> テスト
                </button>
                <button class="tab-btn" data-tab="approval" onclick="switchTab('approval')">
                    <i class="fas fa-check-circle"></i> 商品承認
                </button>
            </div>

            <!-- テストタブ -->
            <div id="dashboard" class="tab-content active">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-database"></i>
                        <h3 class="section-title">データベース接続テスト</h3>
                        <button class="btn btn-info" onclick="testDatabase()">
                            <i class="fas fa-sync"></i> テスト実行
                        </button>
                    </div>
                    <div id="testResults">
                        <div class="notification success">
                            <i class="fas fa-check-circle"></i>
                            <span>データベース接続成功：<?= number_format($total_records) ?>件のデータを確認</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-search"></i>
                        <h3 class="section-title">検索テスト</h3>
                        <div style="margin-left: auto; display: flex; gap: 0.5rem;">
                            <input type="text" id="searchQuery" placeholder="iPhone" style="padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px;">
                            <button class="btn btn-primary" onclick="testSearch()">検索</button>
                        </div>
                    </div>
                    <div id="searchResults">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>検索キーワードを入力してテストしてください</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 商品承認タブ -->
            <div id="approval" class="tab-content">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-check-circle"></i>
                        <h3 class="section-title">商品承認システム</h3>
                        <button class="btn btn-success" onclick="testApproval()">
                            <i class="fas fa-download"></i> データ読み込み
                        </button>
                    </div>
                    <div id="approvalResults">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>「データ読み込み」ボタンを押してテストしてください</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ログエリア -->
        <div class="log-area">
            <h4><i class="fas fa-history"></i> システムログ</h4>
            <div id="logSection">
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                    <span class="log-level success">SUCCESS</span>
                    <span>500エラー修正版システム起動完了</span>
                </div>
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s') ?>]</span>
                    <span class="log-level info">INFO</span>
                    <span>データベース接続確認：<?= number_format($total_records) ?>件</span>
                </div>
            </div>
        </div>
    </div>

    <script src="assets/js/yahoo_auction_common.js"></script>
    <script>
    // 簡易JavaScript
    function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
        
        addLog(`タブ切り替え: ${tabId}`, 'info');
    }

    async function testDatabase() {
        const results = document.getElementById('testResults');
        results.innerHTML = '<div class="notification info"><i class="fas fa-spinner fa-spin"></i> テスト中...</div>';
        
        try {
            const response = await fetch('?action=get_dashboard_stats');
            const data = await response.json();
            
            if (data.success) {
                results.innerHTML = `
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        <span>データベーステスト成功</span>
                    </div>
                    <div style="margin-top: 1rem; background: #f8f9fa; padding: 1rem; border-radius: 0.5rem;">
                        <h5>統計データ:</h5>
                        <ul>
                            <li>総データ数: ${data.data.total_records.toLocaleString()}件</li>
                            <li>計算済み: ${data.data.calculated_count.toLocaleString()}件</li>
                            <li>フィルター済み: ${data.data.filtered_count.toLocaleString()}件</li>
                        </ul>
                    </div>
                `;
                addLog('データベーステスト成功', 'success');
            } else {
                results.innerHTML = `<div class="notification error"><i class="fas fa-times-circle"></i> ${data.message}</div>`;
                addLog('データベーステスト失敗', 'error');
            }
        } catch (error) {
            results.innerHTML = `<div class="notification error"><i class="fas fa-exclamation-triangle"></i> エラー: ${error.message}</div>`;
            addLog('テストエラー: ' + error.message, 'error');
        }
    }

    async function testSearch() {
        const query = document.getElementById('searchQuery').value.trim();
        const results = document.getElementById('searchResults');
        
        if (!query) {
            results.innerHTML = '<div class="notification warning"><i class="fas fa-exclamation-triangle"></i> 検索キーワードを入力してください</div>';
            return;
        }
        
        results.innerHTML = '<div class="notification info"><i class="fas fa-spinner fa-spin"></i> 検索中...</div>';
        
        try {
            const response = await fetch(`?action=search_products&query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                results.innerHTML = `
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        <span>検索成功: ${data.data.length}件ヒット</span>
                    </div>
                    <div style="margin-top: 1rem;">
                        ${data.data.slice(0, 5).map(item => `
                            <div style="background: #f8f9fa; padding: 1rem; margin-bottom: 0.5rem; border-radius: 0.5rem;">
                                <h6 style="margin: 0 0 0.5rem 0;">${item.title}</h6>
                                <div style="font-size: 0.9rem; color: #666;">
                                    価格: $${item.price} | カテゴリ: ${item.category}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                addLog(`検索成功: "${query}" - ${data.data.length}件`, 'success');
            } else {
                results.innerHTML = `<div class="notification info"><i class="fas fa-search"></i> "${query}"の検索結果が見つかりませんでした</div>`;
                addLog(`検索結果なし: "${query}"`, 'info');
            }
        } catch (error) {
            results.innerHTML = `<div class="notification error"><i class="fas fa-exclamation-triangle"></i> 検索エラー: ${error.message}</div>`;
            addLog('検索エラー: ' + error.message, 'error');
        }
    }

    async function testApproval() {
        const results = document.getElementById('approvalResults');
        results.innerHTML = '<div class="notification info"><i class="fas fa-spinner fa-spin"></i> 承認データ読み込み中...</div>';
        
        try {
            const response = await fetch('?action=get_approval_queue');
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                results.innerHTML = `
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        <span>承認データ読み込み成功: ${data.data.length}件</span>
                    </div>
                    <div style="margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                        ${data.data.slice(0, 6).map(item => `
                            <div style="background: #f8f9fa; padding: 1rem; border-radius: 0.5rem; border: 1px solid #dee2e6;">
                                <h6 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">${item.title.substring(0, 50)}...</h6>
                                <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem;">
                                    価格: $${item.price} | カテゴリ: ${item.category}
                                </div>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-success" style="flex: 1; font-size: 0.8rem;">承認</button>
                                    <button class="btn btn-danger" style="flex: 1; font-size: 0.8rem;">否認</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                addLog(`承認データ読み込み成功: ${data.data.length}件`, 'success');
            } else {
                results.innerHTML = '<div class="notification info"><i class="fas fa-inbox"></i> 承認待ちのデータがありません</div>';
                addLog('承認待ちデータなし', 'info');
            }
        } catch (error) {
            results.innerHTML = `<div class="notification error"><i class="fas fa-exclamation-triangle"></i> 読み込みエラー: ${error.message}</div>`;
            addLog('承認データ読み込みエラー: ' + error.message, 'error');
        }
    }

    function addLog(message, level) {
        const logSection = document.getElementById('logSection');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-timestamp">[${timestamp}]</span>
            <span class="log-level ${level}">${level.toUpperCase()}</span>
            <span>${message}</span>
        `;
        logSection.insertBefore(logEntry, logSection.firstChild);
        
        // 最大10エントリまで
        const entries = logSection.querySelectorAll('.log-entry');
        if (entries.length > 10) {
            entries[entries.length - 1].remove();
        }
    }

    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
        addLog('暫定システム初期化完了', 'success');
        console.log('✅ Yahoo Auction Tool 暫定版起動完了');
    });
    </script>
</body>
</html>
