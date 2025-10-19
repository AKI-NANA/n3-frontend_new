<?php
/**
 * 統合在庫管理システム - メインダッシュボード
 * N3独立版・タブベースUI・Claude編集性重視
 */

// セキュリティチェック
if (session_status() == PHP_SESSION_NONE) {
    session_start();
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
        error_log("統合在庫管理DB接続失敗: " . $e->getMessage());
        return null;
    }
}

// システム統計取得
function getSystemStats() {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        return [
            'total_products' => 0,
            'unlisted_products' => 0,
            'listed_products' => 0,
            'pending_approval' => 0
        ];
    }
    
    try {
        // 総商品数
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
        $total = $stmt->fetchColumn();
        
        // 未出品商品数
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE (ebay_item_id IS NULL OR ebay_item_id = '')");
        $unlisted = $stmt->fetchColumn();
        
        // 出品済み商品数
        $listed = $total - $unlisted;
        
        // 承認待ち商品数（status = 'pending'）
        $stmt = $pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products WHERE status = 'pending'");
        $pending = $stmt->fetchColumn();
        
        return [
            'total_products' => $total,
            'unlisted_products' => $unlisted,
            'listed_products' => $listed,
            'pending_approval' => $pending
        ];
    } catch (Exception $e) {
        error_log("統計取得エラー: " . $e->getMessage());
        return [
            'total_products' => 0,
            'unlisted_products' => 0,
            'listed_products' => 0,
            'pending_approval' => 0
        ];
    }
}

$stats = getSystemStats();
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>統合在庫管理システム - N3独立版</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/integrated_styles.css">
</head>
<body>
    <!-- メインヘッダー -->
    <header class="main-header">
        <div class="header-content">
            <div class="header-left">
                <h1>
                    <i class="fas fa-warehouse"></i>
                    統合在庫管理システム
                </h1>
                <span class="version-badge">v2.0 - N3独立版</span>
            </div>
            
            <div class="header-right">
                <div class="stats-summary">
                    <div class="stat-item">
                        <span class="stat-value"><?= number_format($stats['total_products']) ?></span>
                        <span class="stat-label">総商品数</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value unlisted"><?= number_format($stats['unlisted_products']) ?></span>
                        <span class="stat-label">未出品</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value listed"><?= number_format($stats['listed_products']) ?></span>
                        <span class="stat-label">出品済み</span>
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="refreshAllTabs()">
                    <i class="fas fa-sync-alt"></i> 全更新
                </button>
            </div>
        </div>
    </header>

    <!-- タブナビゲーション -->
    <nav class="tab-navigation">
        <div class="tab-container">
            <button class="tab-btn active" data-tab="inventory">
                <i class="fas fa-boxes"></i>
                在庫管理
                <span class="tab-badge"><?= number_format($stats['total_products']) ?></span>
            </button>
            
            <button class="tab-btn" data-tab="editing">
                <i class="fas fa-edit"></i>
                データ編集
                <span class="tab-badge"><?= number_format($stats['unlisted_products']) ?></span>
            </button>
            
            <button class="tab-btn" data-tab="category">
                <i class="fas fa-tags"></i>
                カテゴリー判定
                <span class="tab-badge">AI</span>
            </button>
            
            <button class="tab-btn" data-tab="listing">
                <i class="fas fa-store"></i>
                出品管理
                <span class="tab-badge"><?= number_format($stats['unlisted_products']) ?></span>
            </button>
            
            <button class="tab-btn" data-tab="scraping">
                <i class="fas fa-spider"></i>
                データ取得
                <span class="tab-badge">Auto</span>
            </button>
        </div>
        
        <!-- クイック検索 -->
        <div class="quick-search">
            <input type="text" id="globalSearch" placeholder="商品検索..." class="search-input">
            <button class="search-btn" onclick="executeGlobalSearch()">
                <i class="fas fa-search"></i>
            </button>
        </div>
    </nav>

    <!-- メインコンテンツエリア -->
    <main class="main-content">
        <!-- 在庫管理タブ -->
        <div id="inventory-tab" class="tab-content active">
            <div class="tab-header">
                <h2><i class="fas fa-boxes"></i> 在庫管理</h2>
                <div class="tab-actions">
                    <button class="btn btn-success" onclick="exportInventory()">
                        <i class="fas fa-download"></i> CSV出力
                    </button>
                    <button class="btn btn-info" onclick="refreshInventoryData()">
                        <i class="fas fa-sync"></i> 更新
                    </button>
                </div>
            </div>
            
            <div class="content-loading" id="inventory-loading">
                <iframe src="tabs/inventory_tab.php" frameborder="0" class="tab-iframe" id="inventory-iframe"></iframe>
            </div>
        </div>

        <!-- データ編集タブ -->
        <div id="editing-tab" class="tab-content">
            <div class="tab-header">
                <h2><i class="fas fa-edit"></i> データ編集</h2>
                <div class="tab-actions">
                    <button class="btn btn-primary" onclick="openBulkEditModal()">
                        <i class="fas fa-edit"></i> 一括編集
                    </button>
                    <button class="btn btn-warning" onclick="openCategoryAutoAssign()">
                        <i class="fas fa-magic"></i> カテゴリー自動割当
                    </button>
                </div>
            </div>
            
            <div class="content-loading" id="editing-loading">
                <iframe src="tabs/editing_tab.php" frameborder="0" class="tab-iframe" id="editing-iframe"></iframe>
            </div>
        </div>

        <!-- カテゴリー判定タブ -->
        <div id="category-tab" class="tab-content">
            <div class="tab-header">
                <h2><i class="fas fa-tags"></i> eBayカテゴリー自動判定</h2>
                <div class="tab-actions">
                    <button class="btn btn-success" onclick="runBatchCategoryDetection()">
                        <i class="fas fa-play"></i> 一括判定
                    </button>
                    <button class="btn btn-info" onclick="openCategorySettings()">
                        <i class="fas fa-cog"></i> 設定
                    </button>
                </div>
            </div>
            
            <div class="content-loading" id="category-loading">
                <iframe src="tabs/category_tab.php" frameborder="0" class="tab-iframe" id="category-iframe"></iframe>
            </div>
        </div>

        <!-- 出品管理タブ -->
        <div id="listing-tab" class="tab-content">
            <div class="tab-header">
                <h2><i class="fas fa-store"></i> eBay出品管理</h2>
                <div class="tab-actions">
                    <button class="btn btn-primary" onclick="openBulkListingModal()">
                        <i class="fas fa-upload"></i> 一括出品
                    </button>
                    <button class="btn btn-success" onclick="checkListingStatus()">
                        <i class="fas fa-check"></i> 状況確認
                    </button>
                </div>
            </div>
            
            <div class="content-loading" id="listing-loading">
                <iframe src="tabs/listing_tab.php" frameborder="0" class="tab-iframe" id="listing-iframe"></iframe>
            </div>
        </div>

        <!-- データ取得タブ -->
        <div id="scraping-tab" class="tab-content">
            <div class="tab-header">
                <h2><i class="fas fa-spider"></i> Yahoo Auctionデータ取得</h2>
                <div class="tab-actions">
                    <button class="btn btn-success" onclick="openScrapingModal()">
                        <i class="fas fa-plus"></i> URL追加
                    </button>
                    <button class="btn btn-info" onclick="showScrapingHistory()">
                        <i class="fas fa-history"></i> 取得履歴
                    </button>
                </div>
            </div>
            
            <div class="content-loading" id="scraping-loading">
                <iframe src="tabs/scraping_tab.php" frameborder="0" class="tab-iframe" id="scraping-iframe"></iframe>
            </div>
        </div>
    </main>

    <!-- モーダル領域 -->
    <div id="modal-overlay" class="modal-overlay" style="display: none;">
        <div id="modal-container" class="modal-container">
            <!-- モーダルコンテンツは動的に挿入 -->
        </div>
    </div>

    <!-- 通知システム -->
    <div id="notification-container" class="notification-container"></div>

    <!-- フローティング操作パネル -->
    <div class="floating-panel">
        <button class="floating-btn" onclick="showQuickActions()" title="クイックアクション">
            <i class="fas fa-bolt"></i>
        </button>
        
        <div class="quick-actions" id="quick-actions" style="display: none;">
            <button onclick="quickScraping()" title="クイックスクレイピング">
                <i class="fas fa-download"></i>
            </button>
            <button onclick="quickCategoryAssign()" title="カテゴリー判定">
                <i class="fas fa-tags"></i>
            </button>
            <button onclick="quickListing()" title="選択商品出品">
                <i class="fas fa-store"></i>
            </button>
        </div>
    </div>

    <!-- JavaScriptファイル -->
    <script src="assets/tab_manager.js"></script>
    <script src="assets/modal_manager.js"></script>
    <script src="assets/notification_system.js"></script>
    <script src="assets/integrated_functions.js"></script>
    
    <script>
    // システム初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ 統合在庫管理システム初期化開始');
        
        // タブシステム初期化
        initializeTabSystem();
        
        // モーダルシステム初期化  
        initializeModalSystem();
        
        // 通知システム初期化
        initializeNotificationSystem();
        
        // 自動更新タイマー設定（30秒）
        setInterval(updateStats, 30000);
        
        console.log('✅ 統合在庫管理システム初期化完了');
        
        // 初期データ読み込み
        loadInitialData();
    });

    // 統計情報更新
    function updateStats() {
        fetch('api/stats_api.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 統計表示を更新
                    document.querySelectorAll('.stat-value').forEach((el, index) => {
                        const values = [
                            data.data.total_products,
                            data.data.unlisted_products, 
                            data.data.listed_products
                        ];
                        el.textContent = new Intl.NumberFormat().format(values[index] || 0);
                    });
                    
                    // タブバッジ更新
                    updateTabBadges(data.data);
                }
            })
            .catch(error => console.warn('統計更新エラー:', error));
    }

    // 初期データ読み込み
    function loadInitialData() {
        showNotification('システムデータを読み込み中...', 'info', 2000);
        
        // アクティブタブのデータを読み込み
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        loadTabData(activeTab);
    }

    // 全タブ更新
    function refreshAllTabs() {
        showNotification('全データを更新中...', 'info');
        
        // 全iframeを再読み込み
        document.querySelectorAll('.tab-iframe').forEach(iframe => {
            iframe.src = iframe.src;
        });
        
        // 統計更新
        updateStats();
        
        setTimeout(() => {
            showNotification('全データ更新完了', 'success', 3000);
        }, 2000);
    }

    // グローバル検索実行
    function executeGlobalSearch() {
        const query = document.getElementById('globalSearch').value;
        if (!query) return;
        
        showNotification(`"${query}" を検索中...`, 'info');
        
        // 各タブに検索クエリを送信
        document.querySelectorAll('.tab-iframe').forEach(iframe => {
            iframe.contentWindow.postMessage({
                action: 'search',
                query: query
            }, '*');
        });
    }
    </script>
</body>
</html>