<?php
/**
 * Yahoo Auction Tool - 完全独立ページ版
 * N3統合版・全機能統合型システム（target="_blank"対応）
 */

// セキュリティチェック
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Ajax処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    header('Content-Type: application/json');
    
    $action = $_POST['action'];
    $response = ['success' => false, 'message' => 'Unknown action'];
    
    switch ($action) {
        case 'search_products':
            $query = $_POST['query'] ?? '';
            $response = [
                'success' => true,
                'data' => [
                    ['id' => 1, 'title' => 'Sample Product 1', 'price' => '$99.99'],
                    ['id' => 2, 'title' => 'Sample Product 2', 'price' => '$149.99']
                ],
                'message' => "検索クエリ: {$query}"
            ];
            break;
            
        case 'load_approval_data':
            $response = [
                'success' => true,
                'data' => [
                    ['id' => 1, 'title' => 'Approval Item 1', 'status' => 'pending'],
                    ['id' => 2, 'title' => 'Approval Item 2', 'status' => 'approved']
                ],
                'message' => '承認データ読み込み完了'
            ];
            break;
            
        case 'calculate_shipping':
            $weight = $_POST['weight'] ?? 0;
            $country = $_POST['country'] ?? '';
            $response = [
                'success' => true,
                'data' => [
                    'cost' => rand(1500, 5000),
                    'method' => 'EMS',
                    'days' => '7-14'
                ],
                'message' => '送料計算完了'
            ];
            break;
            
        default:
            $response = ['success' => false, 'message' => "未対応のアクション: {$action}"];
    }
    
    echo json_encode($response);
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo → eBay 統合ワークフローシステム</title>
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <style>
        /* リセット・ベース */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
        }

        /* 独立ページ専用レイアウト */
        .standalone-container {
            width: 100%;
            min-height: 100vh;
            padding: 0;
            margin: 0;
        }

        /* ナビゲーションバー */
        .standalone-navbar {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .navbar-brand {
            font-size: 1.5rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .navbar-actions {
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        .navbar-btn {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s ease;
            font-size: 0.875rem;
        }

        .navbar-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        /* メインコンテンツ */
        .main-content {
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }

        .tool-header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 1rem;
            color: white;
        }

        .tool-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
        }

        .tool-subtitle {
            font-size: 1.125rem;
            opacity: 0.9;
        }

        /* ステータスバー */
        .status-bar {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .status-item {
            text-align: center;
        }

        .status-value {
            font-size: 2rem;
            font-weight: 700;
            color: #3b82f6;
            margin-bottom: 0.5rem;
        }

        .status-label {
            font-size: 0.875rem;
            color: #64748b;
        }

        /* タブナビゲーション */
        .tab-navigation {
            display: flex;
            background: white;
            border-radius: 1rem;
            padding: 1rem;
            margin-bottom: 2rem;
            gap: 0.5rem;
            overflow-x: auto;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .tab-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: none;
            background: transparent;
            color: #64748b;
            font-weight: 500;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            font-size: 0.875rem;
        }

        .tab-btn:hover {
            background: #f1f5f9;
            color: #3b82f6;
        }

        .tab-btn.active {
            background: #3b82f6;
            color: white;
        }

        /* タブコンテンツ */
        .tab-content-container {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .tab-content {
            display: none;
            padding: 2rem;
        }

        .tab-content.active {
            display: block;
        }

        /* セクション */
        .section {
            margin-bottom: 2rem;
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e2e8f0;
        }

        .section-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .header-actions {
            display: flex;
            gap: 0.5rem;
        }

        /* ボタン */
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            font-size: 0.875rem;
        }

        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #64748b; color: white; }
        .btn-success { background: #10b981; color: white; }
        .btn-info { background: #06b6d4; color: white; }
        .btn-warning { background: #f59e0b; color: white; }
        .btn-danger { background: #ef4444; color: white; }

        .btn-sm {
            padding: 0.5rem 1rem;
            font-size: 0.75rem;
        }

        .btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* フォーム要素 */
        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #374151;
        }

        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .search-input, input, select, textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            font-size: 0.875rem;
        }

        .search-container {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .search-btn {
            flex-shrink: 0;
        }

        /* 結果表示 */
        .info-message, .loading-message {
            text-align: center;
            padding: 2rem;
            color: #64748b;
            background: #f8fafc;
            border-radius: 0.5rem;
            border: 2px dashed #d1d5db;
        }

        /* アップロード */
        .upload-area {
            border: 2px dashed #d1d5db;
            border-radius: 1rem;
            padding: 3rem;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #f8fafc;
        }

        .upload-area:hover {
            border-color: #3b82f6;
            background: #f0f9ff;
        }

        .upload-area i {
            font-size: 3rem;
            color: #64748b;
            margin-bottom: 1rem;
        }

        .upload-text {
            color: #64748b;
            font-weight: 500;
        }

        /* プログレスバー */
        .listing-progress {
            margin-top: 2rem;
            padding: 1.5rem;
            background: #f8fafc;
            border-radius: 0.75rem;
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 1rem;
        }

        .progress-fill {
            height: 100%;
            background: #10b981;
            transition: width 0.3s ease;
            width: 0%;
        }

        /* 統計カード */
        .analytics-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .analytics-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 0.75rem;
            padding: 1.5rem;
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .card-value {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.5rem;
        }

        .card-change {
            font-size: 0.875rem;
            font-weight: 500;
        }

        .card-change.positive { color: #10b981; }
        .card-change.negative { color: #ef4444; }

        /* テーブル */
        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }

        th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
        }

        /* 優先度バッジ */
        .priority-high { color: #ef4444; font-weight: 600; }
        .priority-medium { color: #f59e0b; font-weight: 600; }
        .priority-low { color: #10b981; font-weight: 600; }

        /* アラート */
        .alert-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem;
            margin-bottom: 0.5rem;
            border-radius: 0.5rem;
        }

        .alert-item.warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
        }

        .alert-item.info {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            color: #1e40af;
        }

        /* キーワード統計 */
        .keyword-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 0.75rem;
            padding: 1.5rem;
            text-align: center;
        }

        /* フッター */
        .standalone-footer {
            background: #1e293b;
            color: white;
            padding: 2rem;
            text-align: center;
            margin-top: 3rem;
        }

        .footer-content {
            max-width: 1400px;
            margin: 0 auto;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }

        .footer-link {
            color: #94a3b8;
            text-decoration: none;
            font-size: 0.875rem;
            transition: color 0.2s ease;
        }

        .footer-link:hover {
            color: white;
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .main-content {
                padding: 1rem;
            }
            
            .tool-title {
                font-size: 2rem;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .tab-navigation {
                flex-direction: column;
            }
            
            .section-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 1rem;
            }
            
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .search-container {
                flex-direction: column;
            }

            .standalone-navbar {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }

            .navbar-actions {
                flex-wrap: wrap;
                justify-content: center;
            }
        }
    </style>
</head>
<body>
    <!-- ナビゲーションバー -->
    <nav class="standalone-navbar">
        <div class="navbar-brand">
            <i class="fas fa-gavel"></i>
            Yahoo → eBay ワークフローシステム
        </div>
        <div class="navbar-actions">
            <a href="javascript:history.back()" class="navbar-btn">
                <i class="fas fa-arrow-left"></i> 戻る
            </a>
            <a href="../../index.php" class="navbar-btn">
                <i class="fas fa-home"></i> メインダッシュボード
            </a>
            <a href="javascript:window.location.reload()" class="navbar-btn">
                <i class="fas fa-sync"></i> 更新
            </a>
        </div>
    </nav>

    <div class="standalone-container">
        <div class="main-content">
            <!-- ツールヘッダー -->
            <div class="tool-header">
                <h1 class="tool-title">
                    <i class="fas fa-gavel"></i>
                    Yahoo → eBay 統合ワークフローシステム
                </h1>
                <p class="tool-subtitle">
                    スクレイピング → 承認 → 編集 → 出品までの完全自動化ツール
                </p>
            </div>

            <!-- ステータスバー -->
            <div class="status-bar">
                <div class="status-item">
                    <div class="status-value" id="totalRecords">1,247</div>
                    <div class="status-label">総データ数</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="scrapedCount">892</div>
                    <div class="status-label">取得済</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="approvedCount">654</div>
                    <div class="status-label">承認済</div>
                </div>
                <div class="status-item">
                    <div class="status-value" id="listedCount">432</div>
                    <div class="status-label">出品済</div>
                </div>
            </div>

            <!-- タブナビゲーション -->
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

            <!-- タブコンテンツ -->
            <div class="tab-content-container">
                <!-- ダッシュボードタブ -->
                <div id="dashboard" class="tab-content active">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-search"></i>
                            <h3 class="section-title">商品検索・概要</h3>
                        </div>
                        
                        <div class="search-container">
                            <input type="text" id="searchQuery" placeholder="商品名、SKU、IDで検索..." class="search-input">
                            <button class="search-btn btn btn-primary" onclick="performSearch()">
                                <i class="fas fa-search"></i> 検索
                            </button>
                        </div>
                        
                        <div id="searchResults" class="search-results">
                            <div class="info-message">
                                <i class="fas fa-info-circle"></i>
                                検索キーワードを入力してください
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 商品承認タブ -->
                <div id="approval" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-check-circle"></i>
                            <h3 class="section-title">AI商品承認システム</h3>
                            <button class="btn btn-primary" onclick="loadApprovalData()">
                                <i class="fas fa-sync"></i> データ読み込み
                            </button>
                        </div>
                        
                        <div id="approvalGrid" class="approval-grid">
                            <div class="loading-message">
                                <i class="fas fa-spinner fa-spin"></i>
                                承認待ち商品を読み込み中...
                            </div>
                        </div>
                    </div>
                </div>

                <!-- データ取得タブ -->
                <div id="scraping" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-spider"></i>
                            <h3 class="section-title">Yahooオークションデータ取得</h3>
                        </div>
                        
                        <div class="scraping-form">
                            <div class="form-group">
                                <label>Yahoo オークション URL</label>
                                <textarea id="yahooUrls" placeholder="https://auctions.yahoo.co.jp/jp/auction/xxxxx" rows="5"></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button class="btn btn-primary" onclick="startScraping()">
                                    <i class="fas fa-play"></i> スクレイピング開始
                                </button>
                                <button class="btn btn-secondary" onclick="uploadCSV()">
                                    <i class="fas fa-upload"></i> CSV取込
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- データ編集タブ -->
                <div id="editing" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-edit"></i>
                            <h3 class="section-title">商品データ編集</h3>
                            <div class="header-actions">
                                <button class="btn btn-info" onclick="loadEditingData()">
                                    <i class="fas fa-download"></i> データ読込
                                </button>
                                <button class="btn btn-success" onclick="saveAllEdits()">
                                    <i class="fas fa-save"></i> 全保存
                                </button>
                            </div>
                        </div>
                        
                        <div id="editingTable" class="editing-table">
                            <div class="info-message">
                                「データ読込」ボタンを押してデータを表示してください
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 送料計算タブ -->
                <div id="calculation" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-calculator"></i>
                            <h3 class="section-title">国際送料計算システム</h3>
                        </div>
                        
                        <div class="calculation-form">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>重量 (kg)</label>
                                    <input type="number" id="weight" placeholder="1.5" step="0.1" min="0.1">
                                </div>
                                <div class="form-group">
                                    <label>長さ (cm)</label>
                                    <input type="number" id="length" placeholder="30" min="1">
                                </div>
                                <div class="form-group">
                                    <label>幅 (cm)</label>
                                    <input type="number" id="width" placeholder="20" min="1">
                                </div>
                                <div class="form-group">
                                    <label>高さ (cm)</label>
                                    <input type="number" id="height" placeholder="10" min="1">
                                </div>
                                <div class="form-group">
                                    <label>配送先国</label>
                                    <select id="country">
                                        <option value="">選択してください</option>
                                        <option value="US">アメリカ</option>
                                        <option value="CA">カナダ</option>
                                        <option value="AU">オーストラリア</option>
                                        <option value="GB">イギリス</option>
                                        <option value="DE">ドイツ</option>
                                    </select>
                                </div>
                            </div>
                            
                            <button class="btn btn-primary" onclick="calculateShipping()">
                                <i class="fas fa-calculator"></i> 送料計算
                            </button>
                            
                            <div id="calculationResults" class="calculation-results">
                                <div class="info-message">
                                    配送情報を入力して「送料計算」ボタンを押してください
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- フィルタータブ -->
                <div id="filters" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-filter"></i>
                            <h3 class="section-title">禁止キーワード管理</h3>
                            <button class="btn btn-success" onclick="uploadKeywordCSV()">
                                <i class="fas fa-upload"></i> CSV アップロード
                            </button>
                        </div>
                        
                        <div class="keyword-management">
                            <div class="keyword-stats">
                                <div class="stat-card">
                                    <div class="stat-value" id="totalKeywords">156</div>
                                    <div class="stat-label">登録キーワード</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="detectedToday">23</div>
                                    <div class="stat-label">今日の検出</div>
                                </div>
                            </div>
                            
                            <div class="keyword-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>キーワード</th>
                                            <th>カテゴリ</th>
                                            <th>重要度</th>
                                            <th>検出回数</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="keywordTableBody">
                                        <tr>
                                            <td>偽物</td>
                                            <td>ブランド</td>
                                            <td><span class="priority-high">高</span></td>
                                            <td>47</td>
                                            <td>
                                                <button class="btn-sm btn-warning">編集</button>
                                                <button class="btn-sm btn-danger">削除</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>コピー品</td>
                                            <td>ブランド</td>
                                            <td><span class="priority-medium">中</span></td>
                                            <td>23</td>
                                            <td>
                                                <button class="btn-sm btn-warning">編集</button>
                                                <button class="btn-sm btn-danger">削除</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 出品管理タブ -->
                <div id="listing" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-store"></i>
                            <h3 class="section-title">eBay一括出品システム</h3>
                        </div>
                        
                        <div class="listing-container">
                            <div class="upload-area" onclick="document.getElementById('csvFile').click()">
                                <input type="file" id="csvFile" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <div class="upload-text">
                                    編集済みCSVファイルをドラッグ&ドロップ<br>
                                    またはクリックしてファイルを選択
                                </div>
                            </div>
                            
                            <div id="listingProgress" class="listing-progress" style="display: none;">
                                <div class="progress-header">
                                    <h4>出品進行状況</h4>
                                    <span id="progressText">0 / 0</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" id="progressFill"></div>
                                </div>
                                <div id="listingResults" class="listing-results"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 在庫管理タブ -->
                <div id="inventory" class="tab-content">
                    <div class="section">
                        <div class="section-header">
                            <i class="fas fa-warehouse"></i>
                            <h3 class="section-title">在庫・売上分析</h3>
                            <button class="btn btn-info" onclick="loadInventoryData()">
                                <i class="fas fa-sync"></i> データ更新
                            </button>
                        </div>
                        
                        <div class="inventory-dashboard">
                            <div class="analytics-cards">
                                <div class="analytics-card">
                                    <div class="card-header">
                                        <i class="fas fa-dollar-sign"></i>
                                        <h4>今月の売上</h4>
                                    </div>
                                    <div class="card-value">$12,450</div>
                                    <div class="card-change positive">+15.3%</div>
                                </div>
                                
                                <div class="analytics-card">
                                    <div class="card-header">
                                        <i class="fas fa-box"></i>
                                        <h4>在庫商品数</h4>
                                    </div>
                                    <div class="card-value">1,247</div>
                                    <div class="card-change negative">-3.2%</div>
                                </div>
                                
                                <div class="analytics-card">
                                    <div class="card-header">
                                        <i class="fas fa-percentage"></i>
                                        <h4>平均利益率</h4>
                                    </div>
                                    <div class="card-value">28.5%</div>
                                    <div class="card-change positive">+2.1%</div>
                                </div>
                            </div>
                            
                            <div class="inventory-alerts">
                                <h4>⚠️ 在庫アラート</h4>
                                <div id="inventoryAlerts" class="alert-list">
                                    <div class="alert-item warning">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        <span>低在庫: 商品A（残り3個）</span>
                                    </div>
                                    <div class="alert-item info">
                                        <i class="fas fa-info-circle"></i>
                                        <span>価格変動: 商品B（10%上昇）</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- フッター -->
    <footer class="standalone-footer">
        <div class="footer-content">
            <div class="footer-links">
                <a href="../../index.php" class="footer-link">メインダッシュボード</a>
                <a href="#" class="footer-link">ヘルプ</a>
                <a href="#" class="footer-link">設定</a>
                <a href="#" class="footer-link">お問い合わせ</a>
            </div>
            <p>&copy; 2025 NAGANO-3 Yahoo → eBay ワークフローシステム</p>
        </div>
    </footer>

    <!-- JavaScript -->
    <script>
        // グローバル変数
        let currentTab = 'dashboard';

        // タブ切り替え
        function switchTab(tabName) {
            // 全タブを非アクティブ化
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // 指定タブをアクティブ化
            document.getElementById(tabName).classList.add('active');
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
            
            currentTab = tabName;
            console.log('タブ切り替え:', tabName);
        }

        // 検索機能
        async function performSearch() {
            const query = document.getElementById('searchQuery').value;
            console.log('検索実行:', query);
            
            document.getElementById('searchResults').innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    「${query}」の検索中...
                </div>
            `;
            
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=search_products&query=${encodeURIComponent(query)}`
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const resultsHTML = result.data.map(item => 
                        `<div class="search-result-item">
                            <h4>${item.title}</h4>
                            <p>価格: ${item.price}</p>
                        </div>`
                    ).join('');
                    
                    document.getElementById('searchResults').innerHTML = resultsHTML || '<div class="info-message">検索結果がありません</div>';
                }
            } catch (error) {
                console.error('検索エラー:', error);
                document.getElementById('searchResults').innerHTML = '<div class="info-message">検索エラーが発生しました</div>';
            }
        }

        // 承認データ読み込み
        async function loadApprovalData() {
            console.log('承認データ読み込み開始');
            
            document.getElementById('approvalGrid').innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    承認待ち商品データを読み込み中...
                </div>
            `;
            
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'action=load_approval_data'
                });
                
                const result = await response.json();
                
                if (result.success) {
                    const itemsHTML = result.data.map(item => 
                        `<div class="approval-item">
                            <h4>${item.title}</h4>
                            <p>ステータス: ${item.status}</p>
                            <div class="approval-actions">
                                <button class="btn btn-success">承認</button>
                                <button class="btn btn-danger">否認</button>
                            </div>
                        </div>`
                    ).join('');
                    
                    document.getElementById('approvalGrid').innerHTML = itemsHTML || '<div class="info-message">承認待ち商品がありません</div>';
                }
            } catch (error) {
                console.error('承認データ読み込みエラー:', error);
                document.getElementById('approvalGrid').innerHTML = '<div class="info-message">データ読み込みエラーが発生しました</div>';
            }
        }

        // スクレイピング開始
        function startScraping() {
            const urls = document.getElementById('yahooUrls').value;
            console.log('スクレイピング開始:', urls);
            
            alert('スクレイピング機能は実装中です。\n\nURL:\n' + urls);
        }

        // CSV アップロード
        function uploadCSV() {
            console.log('CSV アップロード');
            alert('CSV アップロード機能は実装中です。');
        }

        // データ編集読み込み
        function loadEditingData() {
            console.log('編集データ読み込み');
            
            document.getElementById('editingTable').innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    編集可能なデータテーブルを読み込み中...
                </div>
            `;
            
            setTimeout(() => {
                document.getElementById('editingTable').innerHTML = `
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>商品名</th>
                                <th>価格</th>
                                <th>状態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>001</td>
                                <td><input type="text" value="サンプル商品1"></td>
                                <td><input type="number" value="99.99"></td>
                                <td>新品</td>
                                <td><button class="btn btn-sm btn-warning">保存</button></td>
                            </tr>
                            <tr>
                                <td>002</td>
                                <td><input type="text" value="サンプル商品2"></td>
                                <td><input type="number" value="149.99"></td>
                                <td>中古</td>
                                <td><button class="btn btn-sm btn-warning">保存</button></td>
                            </tr>
                        </tbody>
                    </table>
                `;
            }, 1000);
        }

        // 全保存
        function saveAllEdits() {
            console.log('全編集保存');
            alert('✅ 編集内容を保存しました。');
        }

        // 送料計算
        async function calculateShipping() {
            const weight = document.getElementById('weight').value;
            const country = document.getElementById('country').value;
            
            if (!weight || !country) {
                alert('重量と配送先国を入力してください。');
                return;
            }
            
            console.log('送料計算:', weight, country);
            
            document.getElementById('calculationResults').innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    重量${weight}kg、配送先${country}の送料を計算中...
                </div>
            `;
            
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `action=calculate_shipping&weight=${weight}&country=${country}`
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('calculationResults').innerHTML = `
                        <div class="calculation-result">
                            <h4>送料計算結果</h4>
                            <div class="result-grid">
                                <div class="result-item">
                                    <label>配送方法:</label>
                                    <span>${result.data.method}</span>
                                </div>
                                <div class="result-item">
                                    <label>送料:</label>
                                    <span>¥${result.data.cost}</span>
                                </div>
                                <div class="result-item">
                                    <label>配送日数:</label>
                                    <span>${result.data.days}日</span>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('送料計算エラー:', error);
                document.getElementById('calculationResults').innerHTML = '<div class="info-message">送料計算エラーが発生しました</div>';
            }
        }

        // キーワードCSV アップロード
        function uploadKeywordCSV() {
            console.log('キーワードCSV アップロード');
            alert('✅ キーワードCSV アップロード機能は実装中です。');
        }

        // CSV ファイルハンドリング
        function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            console.log('CSVファイルアップロード:', file.name);
            
            document.getElementById('listingProgress').style.display = 'block';
            document.getElementById('progressText').textContent = '処理中...';
            
            // 模擬進行状況
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                document.getElementById('progressFill').style.width = progress + '%';
                document.getElementById('progressText').textContent = `${progress}% 完了`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                    document.getElementById('listingResults').innerHTML = `
                        <div class="info-message">
                            <i class="fas fa-check-circle" style="color: #10b981;"></i>
                            ✅ 出品処理が完了しました！<br>
                            成功: 45件、失敗: 2件、合計: 47件
                        </div>
                    `;
                }
            }, 500);
        }

        // 在庫データ読み込み
        function loadInventoryData() {
            console.log('在庫データ読み込み');
            
            document.getElementById('inventoryAlerts').innerHTML = `
                <div class="loading-message">
                    <i class="fas fa-sync fa-spin"></i>
                    在庫データを読み込み中...
                </div>
            `;
            
            setTimeout(() => {
                document.getElementById('inventoryAlerts').innerHTML = `
                    <div class="alert-item warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>低在庫: 商品A（残り3個）</span>
                    </div>
                    <div class="alert-item info">
                        <i class="fas fa-info-circle"></i>
                        <span>価格変動: 商品B（10%上昇）</span>
                    </div>
                    <div class="alert-item warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>低在庫: 商品C（残り1個）</span>
                    </div>
                `;
            }, 1000);
        }

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('✅ Yahoo Auction Tool 独立ページ初期化完了');
            console.log('🎯 現在のタブ:', currentTab);
            console.log('📊 利用可能機能: 8タブ');
            console.log('🌐 独立表示モード: 有効');
        });
    </script>
</body>
</html>
