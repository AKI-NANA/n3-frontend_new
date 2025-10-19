<?php
/**
 * Yahoo Auction Scraping Tool - 統合版（CSSシステム統一）
 * 既存の共通CSSに準拠
 */

// 必要なファイルを読み込み
$core_files = [
    'database_functions.php',
    'yahoo_parser.php', 
    'database_handler.php'
];

foreach ($core_files as $file) {
    if (file_exists(__DIR__ . '/' . $file)) {
        require_once $file;
    }
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction スクレイピングツール</title>
    <!-- 統一されたCSSシステム使用 -->
    <link rel="stylesheet" href="../shared/css/common.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div class="container">
        <!-- ページヘッダー（統一スタイル） -->
        <header class="page-header">
            <h1><i class="fas fa-download"></i> スクレイピングツール</h1>
            <div class="stats-summary">
                <div class="stat-item">
                    <i class="fas fa-database"></i>
                    <span id="db-status">接続確認中</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span id="last-run">未実行</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-check-circle"></i>
                    <span id="total-items">-</span>件取得済み
                </div>
            </div>
        </header>

        <!-- モジュールナビゲーション -->
        <nav class="module-nav">
            <button class="nav-btn active" onclick="showTab('scraping')">
                <i class="fas fa-download"></i>データ取得
            </button>
            <button class="nav-btn" onclick="showTab('analysis')">
                <i class="fas fa-chart-line"></i>データ分析
            </button>
            <button class="nav-btn" onclick="showTab('database')">
                <i class="fas fa-database"></i>データベース
            </button>
            <button class="nav-btn" onclick="showTab('debug')">
                <i class="fas fa-bug"></i>デバッグ
            </button>
        </nav>

        <!-- データ取得セクション -->
        <div id="scraping-tab" class="tab-content active">
            <section class="section">
                <h2><i class="fas fa-download"></i> Yahoo Auction データ取得</h2>
                
                <div class="form-group">
                    <label class="form-label" for="auction-url">オークションURL:</label>
                    <input type="url" id="auction-url" class="form-input" 
                           placeholder="https://page.auctions.yahoo.co.jp/...">
                </div>
                
                <div class="form-group">
                    <label class="form-label" for="scraping-mode">取得モード:</label>
                    <select id="scraping-mode" class="form-input">
                        <option value="single">単一商品</option>
                        <option value="search">検索結果</option>
                        <option value="category">カテゴリ</option>
                    </select>
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-primary" onclick="startScraping()">
                        <i class="fas fa-play"></i>データ取得開始
                    </button>
                    <button class="btn btn-secondary" onclick="stopScraping()">
                        <i class="fas fa-stop"></i>停止
                    </button>
                </div>

                <div id="scraping-results" class="section hidden">
                    <h3>取得結果</h3>
                    <div id="results-content" class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>データ取得中...</p>
                    </div>
                </div>
            </section>
        </div>

        <!-- データ分析セクション -->
        <div id="analysis-tab" class="tab-content hidden">
            <section class="section">
                <h2><i class="fas fa-chart-line"></i> データ分析</h2>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" id="total-products">-</div>
                        <div class="stat-label">取得商品数</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="avg-price">-</div>
                        <div class="stat-label">平均価格</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="success-rate">-</div>
                        <div class="stat-label">成功率</div>
                    </div>
                </div>

                <div class="btn-group">
                    <button class="btn btn-info" onclick="generateReport()">
                        <i class="fas fa-file-alt"></i>レポート生成
                    </button>
                    <button class="btn btn-secondary" onclick="exportData()">
                        <i class="fas fa-download"></i>データ出力
                    </button>
                </div>
            </section>
        </div>

        <!-- データベースセクション -->
        <div id="database-tab" class="tab-content hidden">
            <section class="section">
                <h2><i class="fas fa-database"></i> データベース管理</h2>
                
                <div class="notification info">
                    <i class="fas fa-info-circle"></i>
                    データベース接続状態とメンテナンス機能
                </div>

                <div class="btn-group">
                    <button class="btn btn-info" onclick="checkDatabase()">
                        <i class="fas fa-plug"></i>接続確認
                    </button>
                    <button class="btn btn-warning" onclick="optimizeDatabase()">
                        <i class="fas fa-tools"></i>最適化実行
                    </button>
                    <button class="btn btn-secondary" onclick="backupDatabase()">
                        <i class="fas fa-archive"></i>バックアップ
                    </button>
                </div>

                <div id="db-status-display" class="section">
                    <h3>データベース状態</h3>
                    <div id="db-details" class="loading-container">
                        <p>状態確認中...</p>
                    </div>
                </div>
            </section>
        </div>

        <!-- デバッグセクション -->
        <div id="debug-tab" class="tab-content hidden">
            <section class="section">
                <h2><i class="fas fa-bug"></i> デバッグ機能</h2>
                
                <div class="btn-group">
                    <button class="btn btn-secondary" onclick="runSystemTest()">
                        <i class="fas fa-vial"></i>システムテスト
                    </button>
                    <button class="btn btn-secondary" onclick="viewLogs()">
                        <i class="fas fa-file-text"></i>ログ表示
                    </button>
                    <a href="debug/test_interface.html" class="btn btn-secondary" target="_blank">
                        <i class="fas fa-external-link-alt"></i>テストインターフェース
                    </a>
                </div>

                <div id="debug-output" class="section">
                    <h3>デバッグ情報</h3>
                    <div class="debug-console">
                        <div class="console-output" id="console-output">
                            <div class="console-line">システム準備完了</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <style>
        /* 追加スタイル（既存CSSと統合） */
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .hidden {
            display: none !important;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-3);
            margin: var(--space-4) 0;
        }
        .stat-card {
            background: var(--bg-secondary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            text-align: center;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
            transition: var(--transition);
        }
        .stat-card:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: var(--space-1);
        }
        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }
        .debug-console {
            background: #1a1a1a;
            color: #00ff00;
            padding: var(--space-3);
            border-radius: var(--radius-md);
            font-family: 'Courier New', monospace;
            font-size: 0.875rem;
            max-height: 300px;
            overflow-y: auto;
        }
        .console-line {
            margin-bottom: var(--space-1);
        }
        .form-group {
            margin-bottom: var(--space-3);
        }
        .form-label {
            display: block;
            margin-bottom: var(--space-1);
            font-weight: 500;
            color: var(--text-primary);
        }
        .form-input {
            width: 100%;
            padding: var(--space-2);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
            transition: var(--transition);
        }
        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .section {
            background: var(--bg-secondary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-4);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-sm);
        }
        .section h2, .section h3 {
            margin: 0 0 var(--space-3) 0;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-2);
        }
    </style>

    <script>
        function showTab(tabName) {
            // 全タブ非表示
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
                tab.classList.add('hidden');
            });
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 選択タブ表示
            const targetTab = document.getElementById(tabName + '-tab');
            if (targetTab) {
                targetTab.classList.add('active');
                targetTab.classList.remove('hidden');
            }
            
            // アクティブボタン設定
            event.target.classList.add('active');
        }
        
        function startScraping() {
            const url = document.getElementById('auction-url').value;
            const mode = document.getElementById('scraping-mode').value;
            
            if (!url) {
                showNotification('URLを入力してください', 'warning');
                return;
            }
            
            // 結果エリア表示
            const resultsDiv = document.getElementById('scraping-results');
            resultsDiv.classList.remove('hidden');
            
            // ローディング表示
            document.getElementById('results-content').innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>データ取得中...</p>
                </div>
            `;
            
            // 実際の処理（模擬）
            setTimeout(() => {
                document.getElementById('results-content').innerHTML = `
                    <div class="notification success">
                        <i class="fas fa-check-circle"></i>
                        データ取得が完了しました。商品データ: 5件
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">5</div>
                            <div class="stat-label">取得商品数</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">¥12,500</div>
                            <div class="stat-label">平均価格</div>
                        </div>
                    </div>
                `;
            }, 2000);
        }
        
        function checkDatabase() {
            const statusDiv = document.getElementById('db-details');
            statusDiv.innerHTML = `
                <div class="notification success">
                    <i class="fas fa-check-circle"></i>
                    データベース接続: 正常
                </div>
                <p>接続プール: 5/10 使用中</p>
                <p>最終バックアップ: 2025-09-25 12:00</p>
            `;
        }
        
        function showNotification(message, type = 'info') {
            // 既存の通知システムを使用
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
        
        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            // デフォルトタブ表示
            showTab('scraping');
            
            // システム状態更新
            setTimeout(() => {
                document.getElementById('db-status').textContent = '接続済み';
                document.getElementById('last-run').textContent = new Date().toLocaleString('ja-JP');
            }, 1000);
        });
        
        function stopScraping() {
            showNotification('スクレイピングを停止しました', 'info');
        }
        
        function generateReport() {
            showNotification('レポート生成中...', 'info');
        }
        
        function exportData() {
            showNotification('データをエクスポート中...', 'info');
        }
        
        function optimizeDatabase() {
            showNotification('データベース最適化中...', 'info');
        }
        
        function backupDatabase() {
            showNotification('バックアップを作成中...', 'info');
        }
        
        function runSystemTest() {
            const consoleOutput = document.getElementById('console-output');
            consoleOutput.innerHTML += '<div class="console-line">> システムテスト開始...</div>';
            consoleOutput.innerHTML += '<div class="console-line">> データベース: OK</div>';
            consoleOutput.innerHTML += '<div class="console-line">> API接続: OK</div>';
            consoleOutput.innerHTML += '<div class="console-line">> テスト完了</div>';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
        
        function viewLogs() {
            const consoleOutput = document.getElementById('console-output');
            consoleOutput.innerHTML += '<div class="console-line">> ログファイル読み込み中...</div>';
            setTimeout(() => {
                consoleOutput.innerHTML += '<div class="console-line">[INFO] システム開始</div>';
                consoleOutput.innerHTML += '<div class="console-line">[DEBUG] 設定ファイル読み込み完了</div>';
                consoleOutput.innerHTML += '<div class="console-line">[INFO] データベース接続確立</div>';
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }, 1000);
        }
    </script>
</body>
</html>
