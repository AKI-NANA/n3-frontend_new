<?php
/**
 * Yahoo Auction Tool - 修正版UIインターフェース（元のタブ構造を完全保持）
 * ポート5002対応・商品承認システム統合・全タブ復旧版
 */

// デバッグ用：更新確認
if (isset($_GET['cache_check'])) {
    echo json_encode(['status' => 'updated', 'time' => date('Y-m-d H:i:s')]);
    exit;
}

// APIのエンドポイントURLを設定（修正版APIサーバー・ポート5002）
$api_url = "http://localhost:5002";

// PHPセッションを開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// ダッシュボードデータの取得（拡張版）
function fetchDashboardData($api_url) {
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $api_url . '/api/system_status');
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($curl, CURLOPT_TIMEOUT, 10);
    curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($http_code == 200 && $response) {
        return json_decode($response, true);
    }
    return ['success' => false, 'error' => "拡張APIサーバーからデータを取得できませんでした。HTTPコード: {$http_code}"];
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ユーザーアクションの処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$log_message = '';

switch ($action) {
    case 'scrape':
        $url = $_POST['url'] ?? '';
        if ($url) {
            $post_data = ['urls' => [$url]];
            $ch = curl_init($api_url . '/api/scrape_yahoo');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $api_responses['scrape'] = json_decode(curl_exec($ch), true);
            curl_close($ch);
        }
        $log_message = "スクレイピングアクションを実行しました。";
        break;
    
    case 'get_approval_queue':
        try {
            $ch = curl_init($api_url . '/api/get_approval_queue');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($http_code == 200 && $response) {
                echo $response;
            } else {
                echo json_encode(['success' => false, 'error' => '拡張APIサーバーに接続できませんでした']);
            }
            exit;
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => '承認待ちデータ取得エラー: ' . $e->getMessage()]);
            exit;
        }
        break;
        
    case 'update_approval_status':
        $item_skus = isset($_POST['item_skus']) ? $_POST['item_skus'] : [];
        $approval_action = isset($_POST['approval_action']) ? $_POST['approval_action'] : '';
        
        if (empty($item_skus) || empty($approval_action)) {
            echo json_encode(['success' => false, 'error' => 'SKUまたはアクションが指定されていません']);
            exit;
        }
        
        try {
            $post_data = [
                'item_skus' => $item_skus,
                'approval_action' => $approval_action
            ];
            
            $ch = curl_init($api_url . '/api/update_approval_status');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($http_code == 200 && $response) {
                echo $response;
            } else {
                echo json_encode(['success' => false, 'error' => '拡張APIサーバーに接続できませんでした']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => '承認ステータス更新エラー: ' . $e->getMessage()]);
        }
        exit;
        break;

    default:
        break;
}

// 最新のダッシュボードデータを取得
$dashboard_data = fetchDashboardData($api_url);

?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Yahoo→eBay統合ワークフロー完全版（修正版・ポート5002対応）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        /* N3デザインシステム統合 - 完全版 */
        :root {
            --primary-color: #2563eb;
            --primary-hover: #1d4ed8;
            --secondary-color: #64748b;
            --success-color: #10b981;
            --success-hover: #059669;
            --warning-color: #f59e0b;
            --warning-hover: #d97706;
            --danger-color: #ef4444;
            --danger-hover: #dc2626;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #64748b;
            --text-white: #ffffff;
            --border-color: #e2e8f0;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            --radius-sm: 0.25rem;
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
            --radius-xl: 0.75rem;
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg-primary);
            min-height: 100vh;
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: var(--space-sm);
        }

        /* メインダッシュボード */
        .main-dashboard {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-xl);
            overflow: hidden;
            margin-bottom: var(--space-lg);
        }

        /* ヘッダー - N3スタイル */
        .dashboard-header {
            background: var(--text-primary);
            color: var(--text-white);
            padding: var(--space-lg);
            text-align: center;
        }

        .dashboard-header h1 {
            font-size: 1.8rem;
            margin-bottom: var(--space-sm);
            font-weight: 700;
        }

        .dashboard-header p {
            opacity: 0.9;
            font-size: 0.9rem;
        }

        /* 接続状態バー */
        .connection-status {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: var(--space-sm);
            text-align: center;
            font-size: 0.875rem;
            font-weight: 600;
        }

        .connection-status.error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        .connection-status.warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        /* 統計バー - N3スタイル */
        .caids-constraints-bar {
            background: var(--bg-tertiary);
            color: var(--text-primary);
            padding: var(--space-md);
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: var(--space-sm);
            text-align: center;
            border-bottom: 1px solid var(--border-color);
        }

        .constraint-item {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .constraint-value {
            font-size: 1.4rem;
            font-weight: 700;
            line-height: 1;
            color: var(--primary-color);
        }

        .constraint-label {
            font-size: 0.7rem;
            color: var(--text-secondary);
            margin-top: var(--space-xs);
        }

        /* タブナビゲーション */
        .tab-navigation {
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--border-color);
            padding: 0;
            display: flex;
            overflow-x: auto;
        }

        .tab-btn {
            padding: var(--space-sm) var(--space-md);
            background: none;
            border: none;
            color: var(--text-secondary);
            font-weight: 600;
            cursor: pointer;
            border-bottom: 3px solid transparent;
            transition: all 0.3s ease;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            font-size: 0.8rem;
        }

        .tab-btn:hover {
            color: var(--text-primary);
            background: var(--bg-secondary);
        }

        .tab-btn.active {
            color: var(--primary-color);
            border-bottom-color: var(--primary-color);
            background: var(--bg-secondary);
        }

        /* タブコンテンツ */
        .tab-content {
            display: none;
            padding: var(--space-md);
        }

        .tab-content.active {
            display: block;
        }

        /* セクション */
        .section {
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-md);
            margin-bottom: var(--space-md);
            border: 1px solid var(--border-color);
        }

        .section-header {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            margin-bottom: var(--space-md);
        }

        .section-title {
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        /* ボタンシステム */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-xs);
            padding: 0.4rem 0.8rem;
            border: none;
            border-radius: var(--radius-md);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            white-space: nowrap;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        .btn-primary { background: var(--primary-color); color: var(--text-white); }
        .btn-success { background: var(--success-color); color: var(--text-white); }
        .btn-warning { background: var(--warning-color); color: var(--text-white); }
        .btn-danger { background: var(--danger-color); color: var(--text-white); }
        .btn-info { background: var(--info-color); color: var(--text-white); }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); }

        /* データテーブル */
        .data-table-container {
            box-shadow: var(--shadow-md);
            border-radius: var(--radius-lg);
            margin: var(--space-sm) 0;
            overflow: visible;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-secondary);
            font-size: 0.7rem;
            table-layout: fixed;
        }

        .data-table th,
        .data-table td {
            padding: 0.2rem 0.3rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .data-table th {
            background: var(--bg-tertiary);
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 0.65rem;
            height: 28px;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .data-table tbody tr {
            height: 24px;
            min-height: 24px;
        }

        .data-table tbody tr:hover {
            background: var(--bg-tertiary);
        }

        /* 通知システム */
        .notification {
            padding: var(--space-sm);
            border-radius: var(--radius-lg);
            margin: var(--space-sm) 0;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
            font-size: 0.8rem;
        }

        .notification.success { background: rgba(16, 185, 129, 0.1); color: var(--success-color); border: 1px solid rgba(16, 185, 129, 0.2); }
        .notification.warning { background: rgba(245, 158, 11, 0.1); color: var(--warning-color); border: 1px solid rgba(245, 158, 11, 0.2); }
        .notification.error { background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.2); }
        .notification.info { background: rgba(37, 99, 235, 0.1); color: var(--primary-color); border: 1px solid rgba(37, 99, 235, 0.2); }

        /* アニメーション */
        .fade-in {
            animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* ログエリア */
        .log-area {
            background: var(--text-primary);
            color: #e2e8f0;
            border-radius: var(--radius-lg);
            padding: var(--space-sm);
            max-height: 200px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.7rem;
            line-height: 1.4;
            margin-top: var(--space-md);
        }

        .log-entry {
            margin-bottom: var(--space-xs);
            display: flex;
            align-items: start;
            gap: var(--space-xs);
        }

        .log-timestamp {
            color: #9ca3af;
            white-space: nowrap;
            font-size: 0.65rem;
        }

        .log-level {
            font-weight: 600;
            min-width: 40px;
            font-size: 0.65rem;
        }

        .log-level.info { color: #06b6d4; }
        .log-level.success { color: #10b981; }
        .log-level.warning { color: #f59e0b; }
        .log-level.error { color: #ef4444; }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .data-table {
                font-size: 0.65rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-sync-alt"></i> Yahoo→eBay統合ワークフロー完全版</h1>
                <p>修正版（ポート5002対応・商品承認システム統合・全機能復旧）</p>
            </div>

            <!-- 接続状態表示 -->
            <div id="connectionStatus" class="connection-status">
                <i class="fas fa-link"></i> APIサーバー接続確認中... (ポート5002)
            </div>

            <div class="caids-constraints-bar">
                <div class="constraint-item">
                    <div class="constraint-value" id="totalRecords"><?= htmlspecialchars($dashboard_data['stats']['total'] ?? '0'); ?></div>
                    <div class="constraint-label">総データ数</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="scrapedCount"><?= htmlspecialchars($dashboard_data['stats']['scraped'] ?? '0'); ?></div>
                    <div class="constraint-label">取得済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="calculatedCount"><?= htmlspecialchars($dashboard_data['stats']['calculated'] ?? '0'); ?></div>
                    <div class="constraint-label">計算済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="filteredCount"><?= htmlspecialchars($dashboard_data['stats']['filtered'] ?? '0'); ?></div>
                    <div class="constraint-label">フィルター済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="readyCount"><?= htmlspecialchars($dashboard_data['stats']['ready'] ?? '0'); ?></div>
                    <div class="constraint-label">出品準備完了</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="listedCount"><?= htmlspecialchars($dashboard_data['stats']['listed'] ?? '0'); ?></div>
                    <div class="constraint-label">出品済</div>
                </div>
            </div>

            <div class="tab-navigation">
                <button class="tab-btn active" data-tab="dashboard" onclick="switchTab('dashboard')">
                    <i class="fas fa-tachometer-alt"></i>
                    ダッシュボード
                </button>
                <button class="tab-btn" data-tab="approval" onclick="switchTab('approval')">
                    <i class="fas fa-check-circle"></i>
                    商品承認
                </button>
                <button class="tab-btn" data-tab="scraping" onclick="switchTab('scraping')">
                    <i class="fas fa-spider"></i>
                    データ取得
                </button>
                <button class="tab-btn" data-tab="editing" onclick="switchTab('editing')">
                    <i class="fas fa-edit"></i>
                    データ編集
                </button>
                <button class="tab-btn" data-tab="calculation" onclick="switchTab('calculation')">
                    <i class="fas fa-calculator"></i>
                    送料計算
                </button>
                <button class="tab-btn" data-tab="filters" onclick="switchTab('filters')">
                    <i class="fas fa-filter"></i>
                    フィルター
                </button>
                <button class="tab-btn" data-tab="listing" onclick="switchTab('listing')">
                    <i class="fas fa-store"></i>
                    出品管理
                </button>
                <button class="tab-btn" data-tab="inventory" onclick="switchTab('inventory')">
                    <i class="fas fa-warehouse"></i>
                    在庫管理
                </button>
            </div>

            <!-- ダッシュボードタブ -->
            <div id="dashboard" class="tab-content active fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-search"></i>
                        <h3 class="section-title">システム接続テスト</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="testConnection()">
                                <i class="fas fa-link"></i> 接続テスト
                            </button>
                            <button class="btn btn-primary" onclick="refreshSystemData()">
                                <i class="fas fa-sync"></i> データ更新
                            </button>
                        </div>
                    </div>
                    
                    <div id="connectionTestResult">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>「接続テスト」ボタンを押してAPIサーバーとの接続を確認してください</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 商品承認タブ -->
            <div id="approval" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-check-circle"></i>
                        <h3 class="section-title">商品承認システム</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-primary" onclick="loadApprovalQueue()">
                                <i class="fas fa-sync"></i> データ読込
                            </button>
                        </div>
                    </div>
                    
                    <div id="approvalContent">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>「データ読込」ボタンを押して承認待ち商品を表示してください</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- データ取得タブ -->
            <div id="scraping" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-download"></i>
                        <h3 class="section-title">Yahoo オークションデータ取得</h3>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md);">
                        <div>
                            <form action="" method="POST">
                                <input type="hidden" name="action" value="scrape">
                                <div style="margin-bottom: var(--space-sm);">
                                    <label style="display: block; margin-bottom: 0.3rem; font-size: 0.8rem; font-weight: 600;">Yahoo オークション URL</label>
                                    <textarea name="url" id="yahooUrls" placeholder="https://auctions.yahoo.co.jp/jp/auction/xxxxx" style="width: 100%; height: 80px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;"></textarea>
                                </div>
                                <button type="button" class="btn btn-primary" onclick="startScraping()">
                                    <i class="fas fa-play"></i> スクレイピング開始
                                </button>
                            </form>
                        </div>
                        <div>
                            <div style="margin-bottom: var(--space-sm);">
                                <label style="display: block; margin-bottom: 0.3rem; font-size: 0.8rem; font-weight: 600;">CSVファイル選択</label>
                                <input type="file" id="csvFile" accept=".csv" style="width: 100%; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
                            </div>
                            <button type="button" class="btn btn-success" onclick="uploadCSV()">
                                <i class="fas fa-upload"></i> CSV取込
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- データ編集タブ -->
            <div id="editing" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-edit"></i>
                        <h3 class="section-title">データ編集 & 検証</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <button class="btn btn-info" onclick="loadEditingData()">
                                <i class="fas fa-sync"></i> データ読込
                            </button>
                            <button class="btn btn-secondary" onclick="downloadEditingCSV()">
                                <i class="fas fa-download"></i> CSV出力
                            </button>
                        </div>
                    </div>
                    
                    <div id="editingContent">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>「データ読込」ボタンを押してデータを表示してください</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 送料計算タブ -->
            <div id="calculation" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-calculator"></i>
                        <h3 class="section-title">送料計算 & 最適候補提示</h3>
                    </div>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>送料計算機能を実装予定です</span>
                    </div>
                </div>
            </div>

            <!-- フィルタータブ -->
            <div id="filters" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-filter"></i>
                        <h3 class="section-title">禁止品・制限品フィルター</h3>
                    </div>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>フィルター機能を実装予定です</span>
                    </div>
                </div>
            </div>

            <!-- 出品管理タブ -->
            <div id="listing" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-store"></i>
                        <h3 class="section-title">出品・管理</h3>
                    </div>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>出品管理機能を実装予定です</span>
                    </div>
                </div>
            </div>

            <!-- 在庫管理タブ -->
            <div id="inventory" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-warehouse"></i>
                        <h3 class="section-title">在庫・売上分析ダッシュボード</h3>
                    </div>
                    
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>在庫管理機能を実装予定です</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="log-area">
            <h4 style="color: var(--info-color); margin-bottom: var(--space-xs); font-size: 0.8rem;"><i class="fas fa-history"></i> システムログ</h4>
            <div id="logSection">
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                    <span class="log-level info">INFO</span>
                    <span>Yahoo Auction Tool（修正版・ポート5002対応）を開始しました。</span>
                </div>
                <?php if ($log_message): ?>
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                        <span class="log-level info">INFO</span>
                        <span><?= htmlspecialchars($log_message); ?></span>
                    </div>
                <?php endif; ?>
                <?php if (!$dashboard_data['success']): ?>
                    <div class="log-entry">
                        <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                        <span class="log-level warning">WARN</span>
                        <span>APIサーバー（ポート5002）への接続を確認中...</span>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        const apiUrl = 'http://localhost:5002';  // 修正版APIサーバー（ポート5002）
        let connectionStatus = 'checking';
        
        console.log('Yahoo Auction Tool（修正版）初期化中...');
        console.log('API URL:', apiUrl);

        // ページ読み込み時に接続確認
        document.addEventListener('DOMContentLoaded', function() {
            checkConnectionStatus();
            addLog('システム初期化完了', 'info');
        });

        // 接続状態確認
        async function checkConnectionStatus() {
            try {
                const response = await fetch(apiUrl + '/health');
                if (response.ok) {
                    const data = await response.json();
                    connectionStatus = 'connected';
                    updateConnectionDisplay(true, 'APIサーバー正常接続 (ポート5002)');
                    addLog('✅ APIサーバー接続成功', 'success');
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                connectionStatus = 'error';
                updateConnectionDisplay(false, 'APIサーバー接続エラー (ポート5002) - サーバーが起動していない可能性があります');
                addLog('❌ APIサーバー接続失敗: ' + error.message, 'error');
            }
        }

        // 接続状態表示更新
        function updateConnectionDisplay(isConnected, message) {
            const statusEl = document.getElementById('connectionStatus');
            if (isConnected) {
                statusEl.className = 'connection-status';
                statusEl.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
            } else {
                statusEl.className = 'connection-status error';
                statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + message;
            }
        }

        // 接続テスト
        async function testConnection() {
            addLog('接続テスト開始...', 'info');
            const resultDiv = document.getElementById('connectionTestResult');
            
            try {
                const response = await fetch(apiUrl + '/health');
                if (response.ok) {
                    const data = await response.json();
                    resultDiv.innerHTML = `
                        <div class="notification success">
                            <i class="fas fa-check-circle"></i>
                            <span>✅ 接続成功！ サーバー状態: ${data.status} | ポート: ${data.port} | バージョン: ${data.version || 'unknown'}</span>
                        </div>
                    `;
                    addLog('✅ 接続テスト成功', 'success');
                    updateConnectionDisplay(true, 'APIサーバー正常接続 (ポート5002)');
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <div class="notification error">
                        <i class="fas fa-times-circle"></i>
                        <span>❌ 接続失敗: ${error.message}<br>
                        APIサーバーが起動していない可能性があります。<br>
                        <strong>解決方法:</strong> ターミナルで ./start_yahoo_auction_system_stable.sh を実行してください</span>
                    </div>
                `;
                addLog('❌ 接続テスト失敗: ' + error.message, 'error');
                updateConnectionDisplay(false, 'APIサーバー接続エラー');
            }
        }

        // タブ切り替え
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active', 'fade-in');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active', 'fade-in');
            document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
            addLog(`タブ切り替え: ${tabId}`);
        }

        // ログ追加
        function addLog(message, level = 'info') {
            const logSection = document.getElementById('logSection');
            const timestamp = new Date().toLocaleTimeString('ja-JP');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.innerHTML = `
                <span class="log-timestamp">[${timestamp}]</span>
                <span class="log-level ${level.toLowerCase()}">${level.toUpperCase()}</span>
                <span>${message}</span>
            `;
            logSection.prepend(logEntry);
            
            const entries = logSection.querySelectorAll('.log-entry');
            if (entries.length > 30) {
                entries[entries.length - 1].remove();
            }
        }

        // システムデータ更新
        async function refreshSystemData() {
            addLog('システムデータ更新中...', 'info');
            
            try {
                const response = await fetch(apiUrl + '/api/system_status');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.stats) {
                        // 統計データ更新
                        document.getElementById('totalRecords').textContent = data.stats.total || '0';
                        document.getElementById('scrapedCount').textContent = data.stats.scraped || '0';
                        document.getElementById('calculatedCount').textContent = data.stats.calculated || '0';
                        document.getElementById('filteredCount').textContent = data.stats.filtered || '0';
                        document.getElementById('readyCount').textContent = data.stats.ready || '0';
                        document.getElementById('listedCount').textContent = data.stats.listed || '0';
                        
                        addLog('✅ システムデータ更新完了', 'success');
                    } else {
                        addLog('⚠️ システムデータの形式が不正です', 'warning');
                    }
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                addLog('❌ システムデータ更新失敗: ' + error.message, 'error');
            }
        }

        // スクレイピング開始
        async function startScraping() {
            const url = document.getElementById('yahooUrls').value.trim();
            if (!url) {
                addLog('❌ URLを入力してください', 'error');
                return;
            }

            addLog('スクレイピング開始...', 'info');
            
            try {
                const response = await fetch(apiUrl + '/api/scrape_yahoo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: [url] })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        addLog(`✅ スクレイピング完了: ${data.message}`, 'success');
                    } else {
                        addLog(`❌ スクレイピングエラー: ${data.error}`, 'error');
                    }
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                addLog('❌ スクレイピング失敗: ' + error.message, 'error');
            }
        }

        // CSV取込
        function uploadCSV() {
            const fileInput = document.getElementById('csvFile');
            if (!fileInput.files.length) {
                addLog('❌ CSVファイルを選択してください', 'error');
                return;
            }
            
            addLog('CSV取込機能は開発中です', 'info');
        }

        // 商品承認データ読込
        async function loadApprovalQueue() {
            addLog('承認待ち商品データ読込中...', 'info');
            
            try {
                const response = await fetch(apiUrl + '/api/get_approval_queue');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        displayApprovalQueue(data.data, data.stats);
                        addLog(`✅ 承認待ち商品 ${data.data.length}件を読込完了`, 'success');
                    } else {
                        addLog(`❌ 承認データ読込エラー: ${data.error}`, 'error');
                    }
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                addLog('❌ 承認データ読込失敗: ' + error.message, 'error');
            }
        }

        // 承認待ち商品表示
        function displayApprovalQueue(products, stats) {
            const contentDiv = document.getElementById('approvalContent');
            
            const html = `
                <div style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-lg);">
                    <h4>📊 承認待ち統計</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">${stats.total_pending || 0}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">承認待ち</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger-color);">${stats.high_risk || 0}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">高リスク</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning-color);">${stats.medium_risk || 0}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">中リスク</div>
                        </div>
                    </div>
                </div>
                
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">選択</th>
                                <th style="width: 80px;">SKU</th>
                                <th style="width: 200px;">商品名</th>
                                <th style="width: 80px;">価格</th>
                                <th style="width: 80px;">カテゴリ</th>
                                <th style="width: 80px;">リスク</th>
                                <th style="width: 80px;">AI判定</th>
                                <th style="width: 100px;">アクション</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.map(product => `
                                <tr>
                                    <td><input type="checkbox" value="${product.sku}"></td>
                                    <td style="font-size: 0.7rem;">${product.sku}</td>
                                    <td style="font-size: 0.7rem;">${product.title}</td>
                                    <td style="font-size: 0.7rem;">$${product.calculated_price_usd}</td>
                                    <td style="font-size: 0.7rem;">${product.category}</td>
                                    <td>
                                        <span style="padding: 2px 6px; border-radius: 3px; font-size: 0.6rem; 
                                                     background: ${product.risk_level === 'high' ? '#fee2e2' : '#fef3c7'}; 
                                                     color: ${product.risk_level === 'high' ? '#dc2626' : '#d97706'};">
                                            ${product.risk_level}
                                        </span>
                                    </td>
                                    <td style="font-size: 0.7rem;">${product.ai_score}</td>
                                    <td>
                                        <button class="btn btn-success" onclick="approveProduct('${product.sku}')" style="padding: 0.2rem 0.4rem; font-size: 0.6rem; margin-right: 0.2rem;">承認</button>
                                        <button class="btn btn-danger" onclick="rejectProduct('${product.sku}')" style="padding: 0.2rem 0.4rem; font-size: 0.6rem;">否認</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-success" onclick="bulkApprove()">
                        <i class="fas fa-check"></i> 選択商品を一括承認
                    </button>
                    <button class="btn btn-danger" onclick="bulkReject()">
                        <i class="fas fa-times"></i> 選択商品を一括否認
                    </button>
                </div>
            `;
            
            contentDiv.innerHTML = html;
        }

        // 個別商品承認
        async function approveProduct(sku) {
            await updateApprovalStatus([sku], 'approve');
        }

        // 個別商品否認
        async function rejectProduct(sku) {
            await updateApprovalStatus([sku], 'reject');
        }

        // 一括承認
        async function bulkApprove() {
            const checkedBoxes = document.querySelectorAll('#approvalContent input[type="checkbox"]:checked');
            const skus = Array.from(checkedBoxes).map(cb => cb.value);
            
            if (skus.length === 0) {
                addLog('❌ 承認する商品を選択してください', 'error');
                return;
            }
            
            await updateApprovalStatus(skus, 'approve');
        }

        // 一括否認
        async function bulkReject() {
            const checkedBoxes = document.querySelectorAll('#approvalContent input[type="checkbox"]:checked');
            const skus = Array.from(checkedBoxes).map(cb => cb.value);
            
            if (skus.length === 0) {
                addLog('❌ 否認する商品を選択してください', 'error');
                return;
            }
            
            await updateApprovalStatus(skus, 'reject');
        }

        // 承認ステータス更新
        async function updateApprovalStatus(skus, action) {
            addLog(`${action === 'approve' ? '承認' : '否認'}処理中...`, 'info');
            
            try {
                const response = await fetch(apiUrl + '/api/update_approval_status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_skus: skus,
                        approval_action: action
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        addLog(`✅ ${data.message}`, 'success');
                        // データを再読込
                        loadApprovalQueue();
                    } else {
                        addLog(`❌ ${action}処理エラー: ${data.error}`, 'error');
                    }
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                addLog(`❌ ${action}処理失敗: ` + error.message, 'error');
            }
        }

        // データ編集用データ読込
        async function loadEditingData() {
            addLog('データ編集用データ読込中...', 'info');
            
            try {
                const response = await fetch(apiUrl + '/api/get_all_data');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        displayEditingData(data.data);
                        addLog(`✅ ${data.data.length}件のデータを読込完了`, 'success');
                    } else {
                        addLog(`❌ データ読込エラー: ${data.error}`, 'error');
                    }
                } else {
                    throw new Error('HTTP ' + response.status);
                }
            } catch (error) {
                addLog('❌ データ読込失敗: ' + error.message, 'error');
            }
        }

        // 編集用データ表示
        function displayEditingData(products) {
            const contentDiv = document.getElementById('editingContent');
            
            const html = `
                <div class="data-table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width: 100px;">商品ID</th>
                                <th style="width: 200px;">商品名</th>
                                <th style="width: 100px;">価格(JPY)</th>
                                <th style="width: 100px;">価格(USD)</th>
                                <th style="width: 100px;">カテゴリ</th>
                                <th style="width: 80px;">ステータス</th>
                                <th style="width: 100px;">URL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.slice(0, 50).map(product => `
                                <tr>
                                    <td style="font-size: 0.7rem;">${product.product_id || product.id}</td>
                                    <td style="font-size: 0.7rem;">${product.title}</td>
                                    <td style="font-size: 0.7rem;">¥${product.price_jpy || 0}</td>
                                    <td style="font-size: 0.7rem;">$${product.calculated_price_usd || 0}</td>
                                    <td style="font-size: 0.7rem;">${product.category || '-'}</td>
                                    <td style="font-size: 0.7rem;">${product.status || 'scraped'}</td>
                                    <td>
                                        <button class="btn btn-secondary" onclick="window.open('${product.source_url || '#'}', '_blank')" 
                                                style="padding: 0.2rem 0.4rem; font-size: 0.6rem;">
                                            <i class="fas fa-external-link-alt"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="margin-top: 1rem; text-align: center; color: var(--text-muted);">
                    ${products.length > 50 ? `最初の50件を表示中（全${products.length}件）` : `全${products.length}件を表示中`}
                </div>
            `;
            
            contentDiv.innerHTML = html;
        }

        // CSV出力
        function downloadEditingCSV() {
            addLog('CSV出力機能は開発中です', 'info');
        }

        // 初期接続確認（5秒後）
        setTimeout(() => {
            if (connectionStatus === 'checking') {
                checkConnectionStatus();
            }
        }, 5000);
    </script>
</body>
</html>