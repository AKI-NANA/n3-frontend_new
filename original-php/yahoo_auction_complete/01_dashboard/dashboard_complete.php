<?php
/**
 * Yahoo Auction Complete - 統合ダッシュボード 完全版
 * 全11システムの統合管理・リアルタイム監視・データ分析
 */

// セキュリティとエラーハンドリング
error_reporting(E_ALL);
ini_set('display_errors', 1);
session_start();

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        return null;
    }
}

// API処理
if (isset($_GET['action']) || isset($_POST['action'])) {
    $action = $_GET['action'] ?? $_POST['action'];
    header('Content-Type: application/json');
    
    switch ($action) {
        case 'get_dashboard_stats':
            echo json_encode(getDashboardStats());
            break;
            
        case 'get_system_status':
            echo json_encode(getSystemStatus());
            break;
            
        case 'get_recent_activities':
            echo json_encode(getRecentActivities());
            break;
            
        case 'search_products':
            $query = $_GET['query'] ?? '';
            echo json_encode(searchProducts($query));
            break;
            
        case 'get_performance_data':
            echo json_encode(getPerformanceData());
            break;
            
        default:
            echo json_encode(['error' => 'Invalid action']);
    }
    exit;
}

// ダッシュボード統計取得
function getDashboardStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return getDefaultStats();
        }
        
        // 基本統計
        $stats = [];
        
        // Yahoo scraped products
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
        $stats['total_products'] = $stmt->fetchColumn() ?: 0;
        
        // 処理済み件数
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE price_usd IS NOT NULL");
        $stats['processed_products'] = $stmt->fetchColumn() ?: 0;
        
        // 承認済み件数
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE approval_status = 'approved'");
        $stats['approved_products'] = $stmt->fetchColumn() ?: 0;
        
        // 出品済み件数
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE listing_status = 'listed'");
        $stats['listed_products'] = $stmt->fetchColumn() ?: 0;
        
        // 今日の新規取得
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE DATE(created_at) = CURRENT_DATE");
        $stats['today_scraped'] = $stmt->fetchColumn() ?: 0;
        
        // 平均利益率
        $stmt = $pdo->query("SELECT AVG(CASE WHEN price_jpy > 0 THEN ((price_usd * 150) - price_jpy) / price_jpy * 100 ELSE 0 END) FROM yahoo_scraped_products WHERE price_usd IS NOT NULL AND price_jpy > 0");
        $stats['avg_profit_rate'] = round($stmt->fetchColumn() ?: 0, 2);
        
        return [
            'success' => true,
            'data' => $stats,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'data' => getDefaultStats()
        ];
    }
}

// システム状態取得
function getSystemStatus() {
    $systems = [
        'scraping' => checkSystemStatus('02_scraping'),
        'approval' => checkSystemStatus('03_approval'),
        'editing' => checkSystemStatus('07_editing'),
        'calculation' => checkSystemStatus('05_rieki'),
        'listing' => checkSystemStatus('08_listing'),
        'inventory' => checkSystemStatus('10_zaiko'),
        'category' => checkSystemStatus('11_category'),
        'shipping' => checkSystemStatus('09_shipping'),
        'filters' => checkSystemStatus('06_filters'),
        'html_editor' => checkSystemStatus('12_html_editor'),
        'analysis' => checkSystemStatus('13_bunseki')
    ];
    
    return [
        'success' => true,
        'systems' => $systems,
        'overall_status' => calculateOverallStatus($systems)
    ];
}

// 個別システム状態チェック
function checkSystemStatus($system_path) {
    $base_path = "../{$system_path}";
    
    $status = [
        'name' => $system_path,
        'status' => 'unknown',
        'files_count' => 0,
        'main_file_exists' => false,
        'api_available' => false,
        'last_update' => null
    ];
    
    if (is_dir($base_path)) {
        $files = glob($base_path . '/*');
        $status['files_count'] = count($files);
        
        // メインファイルの存在確認
        $main_files = ['index.php', 'main.php', basename($system_path) . '.php'];
        foreach ($main_files as $file) {
            if (file_exists($base_path . '/' . $file)) {
                $status['main_file_exists'] = true;
                $status['last_update'] = date('Y-m-d H:i:s', filemtime($base_path . '/' . $file));
                break;
            }
        }
        
        // API存在確認
        if (is_dir($base_path . '/api')) {
            $status['api_available'] = true;
        }
        
        // ステータス判定
        if ($status['files_count'] > 10 && $status['main_file_exists']) {
            $status['status'] = 'active';
        } elseif ($status['files_count'] > 3) {
            $status['status'] = 'partial';
        } else {
            $status['status'] = 'minimal';
        }
    } else {
        $status['status'] = 'missing';
    }
    
    return $status;
}

// 全体ステータス計算
function calculateOverallStatus($systems) {
    $active = 0;
    $total = count($systems);
    
    foreach ($systems as $system) {
        if ($system['status'] === 'active') {
            $active++;
        }
    }
    
    $percentage = ($active / $total) * 100;
    
    if ($percentage >= 80) return 'excellent';
    if ($percentage >= 60) return 'good';
    if ($percentage >= 40) return 'warning';
    return 'critical';
}

// 最近のアクティビティ取得
function getRecentActivities() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'activities' => []];
        }
        
        $stmt = $pdo->query("
            SELECT 
                'scraped' as type,
                title,
                created_at,
                'スクレイピング' as action
            FROM yahoo_scraped_products 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC 
            LIMIT 10
        ");
        
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'activities' => $activities
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'activities' => []
        ];
    }
}

// 商品検索
function searchProducts($query) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'results' => []];
        }
        
        $stmt = $pdo->prepare("
            SELECT 
                id, title, price_jpy, price_usd, 
                approval_status, listing_status,
                created_at
            FROM yahoo_scraped_products 
            WHERE title ILIKE ? OR description ILIKE ?
            ORDER BY created_at DESC 
            LIMIT 20
        ");
        
        $searchTerm = '%' . $query . '%';
        $stmt->execute([$searchTerm, $searchTerm]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'results' => $results,
            'count' => count($results)
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'results' => []
        ];
    }
}

// パフォーマンスデータ取得
function getPerformanceData() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'data' => []];
        }
        
        // 過去7日間の統計
        $stmt = $pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as scraped_count,
                COUNT(CASE WHEN price_usd IS NOT NULL THEN 1 END) as processed_count,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_count
            FROM yahoo_scraped_products 
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        
        $performance = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $performance
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'data' => []
        ];
    }
}

// デフォルト統計
function getDefaultStats() {
    return [
        'total_products' => 0,
        'processed_products' => 0,
        'approved_products' => 0,
        'listed_products' => 0,
        'today_scraped' => 0,
        'avg_profit_rate' => 0
    ];
}
?>

<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction Complete - 統合ダッシュボード</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #2563eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --info-color: #06b6d4;
            --bg-primary: #f8fafc;
            --bg-secondary: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --border-color: #e2e8f0;
            --radius-md: 0.5rem;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
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

        .dashboard-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 1rem;
        }

        .dashboard-header {
            background: linear-gradient(135deg, var(--primary-color), var(--info-color));
            color: white;
            padding: 2rem;
            border-radius: var(--radius-md);
            margin-bottom: 2rem;
            text-align: center;
        }

        .dashboard-header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: 1.5rem;
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            text-align: center;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--primary-color);
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .content-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .main-content {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .card {
            background: var(--bg-secondary);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-md);
            overflow: hidden;
        }

        .card-header {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .card-content {
            padding: 1rem;
        }

        .systems-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
        }

        .system-card {
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .system-card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        .system-card.active {
            border-color: var(--success-color);
            background: #f0fdf4;
        }

        .system-card.partial {
            border-color: var(--warning-color);
            background: #fffbeb;
        }

        .system-card.minimal {
            border-color: var(--danger-color);
            background: #fef2f2;
        }

        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 0.5rem;
        }

        .status-active { background: var(--success-color); }
        .status-partial { background: var(--warning-color); }
        .status-minimal { background: var(--danger-color); }

        .search-container {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .search-input {
            flex: 1;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
        }

        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-primary:hover {
            background: #1d4ed8;
        }

        .activity-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.75rem;
            border-bottom: 1px solid var(--border-color);
        }

        .activity-item:last-child {
            border-bottom: none;
        }

        .activity-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--primary-color);
            color: white;
            font-size: 0.8rem;
        }

        .loading {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
        }

        .chart-container {
            position: relative;
            height: 300px;
        }

        @media (max-width: 768px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
            
            .stats-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <!-- ヘッダー -->
        <div class="dashboard-header">
            <h1><i class="fas fa-tachometer-alt"></i> Yahoo Auction Complete</h1>
            <p>統合ダッシュボード - 11システム完全管理</p>
        </div>

        <!-- 統計カード -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value" id="totalProducts">-</div>
                <div class="stat-label">総商品数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="processedProducts">-</div>
                <div class="stat-label">処理済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="approvedProducts">-</div>
                <div class="stat-label">承認済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="listedProducts">-</div>
                <div class="stat-label">出品済み</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="todayScraped">-</div>
                <div class="stat-label">本日取得</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="avgProfitRate">-%</div>
                <div class="stat-label">平均利益率</div>
            </div>
        </div>

        <!-- メインコンテンツ -->
        <div class="content-grid">
            <div class="main-content">
                <!-- システム状態 -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-server"></i>
                        <h3>システム状態</h3>
                        <button class="btn btn-primary" onclick="refreshSystemStatus()" style="margin-left: auto;">
                            <i class="fas fa-sync-alt"></i> 更新
                        </button>
                    </div>
                    <div class="card-content">
                        <div id="systemsGrid" class="systems-grid">
                            <div class="loading">システム状態を読み込み中...</div>
                        </div>
                    </div>
                </div>

                <!-- 商品検索 -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-search"></i>
                        <h3>商品検索</h3>
                    </div>
                    <div class="card-content">
                        <div class="search-container">
                            <input type="text" id="searchInput" class="search-input" placeholder="商品名・説明文を検索...">
                            <button class="btn btn-primary" onclick="searchProducts()">
                                <i class="fas fa-search"></i> 検索
                            </button>
                        </div>
                        <div id="searchResults"></div>
                    </div>
                </div>

                <!-- パフォーマンスチャート -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-chart-line"></i>
                        <h3>パフォーマンス分析</h3>
                    </div>
                    <div class="card-content">
                        <div class="chart-container">
                            <canvas id="performanceChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar">
                <!-- 最近のアクティビティ -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-clock"></i>
                        <h3>最近のアクティビティ</h3>
                    </div>
                    <div class="card-content">
                        <div id="recentActivities">
                            <div class="loading">アクティビティを読み込み中...</div>
                        </div>
                    </div>
                </div>

                <!-- クイックアクション -->
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-bolt"></i>
                        <h3>クイックアクション</h3>
                    </div>
                    <div class="card-content">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <button class="btn btn-primary" onclick="openSystem('02_scraping')">
                                <i class="fas fa-play"></i> スクレイピング開始
                            </button>
                            <button class="btn btn-primary" onclick="openSystem('03_approval')">
                                <i class="fas fa-check"></i> 承認管理
                            </button>
                            <button class="btn btn-primary" onclick="openSystem('08_listing')">
                                <i class="fas fa-upload"></i> 出品管理
                            </button>
                            <button class="btn btn-primary" onclick="openSystem('10_zaiko')">
                                <i class="fas fa-warehouse"></i> 在庫確認
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js"></script>
    <script>
        // グローバル変数
        let performanceChart = null;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadDashboardStats();
            loadSystemStatus();
            loadRecentActivities();
            loadPerformanceChart();
            
            // 検索のEnterキー対応
            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    searchProducts();
                }
            });
        });

        // ダッシュボード統計読み込み
        async function loadDashboardStats() {
            try {
                const response = await fetch('dashboard_complete.php?action=get_dashboard_stats');
                const data = await response.json();
                
                if (data.success) {
                    const stats = data.data;
                    document.getElementById('totalProducts').textContent = stats.total_products || 0;
                    document.getElementById('processedProducts').textContent = stats.processed_products || 0;
                    document.getElementById('approvedProducts').textContent = stats.approved_products || 0;
                    document.getElementById('listedProducts').textContent = stats.listed_products || 0;
                    document.getElementById('todayScraped').textContent = stats.today_scraped || 0;
                    document.getElementById('avgProfitRate').textContent = (stats.avg_profit_rate || 0) + '%';
                }
            } catch (error) {
                console.error('統計読み込みエラー:', error);
            }
        }

        // システム状態読み込み
        async function loadSystemStatus() {
            try {
                const response = await fetch('dashboard_complete.php?action=get_system_status');
                const data = await response.json();
                
                if (data.success) {
                    displaySystemStatus(data.systems);
                }
            } catch (error) {
                console.error('システム状態読み込みエラー:', error);
            }
        }

        // システム状態表示
        function displaySystemStatus(systems) {
            const container = document.getElementById('systemsGrid');
            const systemNames = {
                'scraping': 'スクレイピング',
                'approval': '商品承認',
                'editing': 'データ編集',
                'calculation': '利益計算',
                'listing': '出品管理',
                'inventory': '在庫管理',
                'category': 'カテゴリー',
                'shipping': '送料計算',
                'filters': 'フィルター',
                'html_editor': 'HTML編集',
                'analysis': 'データ分析'
            };

            const html = Object.entries(systems).map(([key, system]) => `
                <div class="system-card ${system.status}" onclick="openSystem('${system.name}')">
                    <div style="margin-bottom: 0.5rem;">
                        <span class="status-indicator status-${system.status}"></span>
                        ${systemNames[key] || key}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">
                        ${system.files_count} ファイル
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // 最近のアクティビティ読み込み
        async function loadRecentActivities() {
            try {
                const response = await fetch('dashboard_complete.php?action=get_recent_activities');
                const data = await response.json();
                
                if (data.success) {
                    displayRecentActivities(data.activities);
                }
            } catch (error) {
                console.error('アクティビティ読み込みエラー:', error);
            }
        }

        // アクティビティ表示
        function displayRecentActivities(activities) {
            const container = document.getElementById('recentActivities');
            
            if (activities.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">アクティビティがありません</div>';
                return;
            }

            const html = activities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-spider"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${activity.action}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                            ${activity.title ? activity.title.substring(0, 30) + '...' : ''}
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-secondary);">
                            ${new Date(activity.created_at).toLocaleString('ja-JP')}
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // 商品検索
        async function searchProducts() {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) {
                alert('検索キーワードを入力してください');
                return;
            }

            try {
                const response = await fetch(`dashboard_complete.php?action=search_products&query=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                displaySearchResults(data.results || []);
            } catch (error) {
                console.error('検索エラー:', error);
            }
        }

        // 検索結果表示
        function displaySearchResults(results) {
            const container = document.getElementById('searchResults');
            
            if (results.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">検索結果が見つかりませんでした</div>';
                return;
            }

            const html = results.map(item => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.5rem;">
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">${item.title}</div>
                    <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-secondary);">
                        <span>¥${item.price_jpy || '未設定'}</span>
                        <span>$${item.price_usd || '未計算'}</span>
                        <span>承認: ${item.approval_status || '未処理'}</span>
                        <span>出品: ${item.listing_status || '未処理'}</span>
                    </div>
                </div>
            `).join('');

            container.innerHTML = html;
        }

        // パフォーマンスチャート読み込み
        async function loadPerformanceChart() {
            try {
                const response = await fetch('dashboard_complete.php?action=get_performance_data');
                const data = await response.json();
                
                if (data.success) {
                    createPerformanceChart(data.data);
                }
            } catch (error) {
                console.error('パフォーマンスデータ読み込みエラー:', error);
            }
        }

        // パフォーマンスチャート作成
        function createPerformanceChart(data) {
            const ctx = document.getElementById('performanceChart').getContext('2d');
            
            if (performanceChart) {
                performanceChart.destroy();
            }

            const labels = data.map(item => new Date(item.date).toLocaleDateString('ja-JP'));
            
            performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'スクレイピング',
                        data: data.map(item => item.scraped_count),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }, {
                        label: '処理済み',
                        data: data.map(item => item.processed_count),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }, {
                        label: '承認済み',
                        data: data.map(item => item.approved_count),
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // システムオープン
        function openSystem(systemPath) {
            const systemUrls = {
                '02_scraping': '../02_scraping/scraping.php',
                '03_approval': '../03_approval/approval_complete.php',
                '07_editing': '../07_editing/editor.php',
                '05_rieki': '../05_rieki/riekikeisan.php',
                '08_listing': '../08_listing/listing.php',
                '10_zaiko': '../10_zaiko/inventory.php',
                '11_category': '../11_category/frontend/category_manager.php',
                '09_shipping': '../09_shipping/enhanced_calculation_php_complete.php',
                '06_filters': '../06_filters/filters.php',
                '12_html_editor': '../12_html_editor/html_editor.php',
                '13_bunseki': '../13_bunseki/main_dashboard.php'
            };

            const url = systemUrls[systemPath];
            if (url) {
                window.open(url, '_blank');
            } else {
                alert('このシステムはまだ利用できません');
            }
        }

        // システム状態更新
        function refreshSystemStatus() {
            loadSystemStatus();
        }

        // 定期更新（5分間隔）
        setInterval(() => {
            loadDashboardStats();
            loadRecentActivities();
        }, 300000);

        console.log('統合ダッシュボード初期化完了');
    </script>
</body>
</html>