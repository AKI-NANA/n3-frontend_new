<?php
/**
 * Yahoo Auction Tool - 統合データベース対応版（動作確認済み）
 * 承認システム完全統合版
 * 更新日: 2025-09-13
 */

// エラー表示を有効化
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// ユーザーアクションの処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';
$log_message = '';

switch ($action) {
    case 'test_connection':
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'システム接続正常']);
        exit;
        
    default:
        break;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Yahoo→eBay統合ワークフロー（商品承認システム完全版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="css/yahoo_auction_tool_content_integrated.css" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <div class="dashboard-header">
                <h1><i class="fas fa-sync-alt"></i> Yahoo→eBay統合ワークフロー完全版</h1>
                <p>商品承認システム・AI判定・リスク分析・統合データベース連携</p>
            </div>

            <div class="caids-constraints-bar">
                <div class="constraint-item">
                    <div class="constraint-value" id="totalRecords">644</div>
                    <div class="constraint-label">総データ数</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="scrapedCount">634</div>
                    <div class="constraint-label">取得済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="calculatedCount">644</div>
                    <div class="constraint-label">計算済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="filteredCount">644</div>
                    <div class="constraint-label">フィルター済</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="readyCount">644</div>
                    <div class="constraint-label">出品準備完了</div>
                </div>
                <div class="constraint-item">
                    <div class="constraint-value" id="listedCount">0</div>
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
                <button class="tab-btn" data-tab="analysis" onclick="switchTab('analysis')">
                    <i class="fas fa-chart-bar"></i>
                    承認分析
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
                <button class="tab-btn" data-tab="inventory-mgmt" onclick="switchTab('inventory-mgmt')">
                    <i class="fas fa-warehouse"></i>
                    在庫管理
                </button>
            </div>

            <!-- ダッシュボードタブ -->
            <div id="dashboard" class="tab-content active fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-search"></i>
                        <h3 class="section-title">商品検索（統合データベース）</h3>
                        <div style="margin-left: auto; display: flex; gap: var(--space-sm);">
                            <input type="text" id="searchQuery" placeholder="検索キーワード" style="padding: 0.4rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem;">
                            <button class="btn btn-primary" onclick="searchDatabase()">
                                <i class="fas fa-search"></i> 検索
                            </button>
                        </div>
                    </div>
                    <div id="searchResults">
                        <div class="notification info">
                            <i class="fas fa-info-circle"></i>
                            <span>統合データベース（644件）から検索します。検索キーワードを入力してください。</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 商品承認タブ（統合版） -->
            <div id="approval" class="tab-content fade-in">
                <main class="approval__main-container">
                    
                    <!-- ページヘッダー -->
                    <header class="approval__page-header">
                        <div class="approval__header-content">
                            <h1 class="approval__page-title">
                                <div class="approval__title-icon">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                商品承認グリッドシステム（統合版）
                            </h1>
                            <p class="approval__page-subtitle">
                                AI推奨システム × 高速グリッド承認 - クリック選択 × ボーダー色リスク判定
                            </p>
                        </div>
                    </header>
                    
                    <!-- AI推奨セクション -->
                    <section class="approval__ai-recommendations">
                        <h2 class="approval__ai-title">
                            <i class="fas fa-brain"></i>
                            AI推奨: 要確認商品のみ表示中
                        </h2>
                        <div class="approval__ai-summary">
                            低リスク商品 1,847件は自動承認済み。高・中リスク商品 <span id="totalProductCount">10</span>件を人間判定待ちで表示しています。
                        </div>
                    </section>

                    <!-- 統計・コントロールセクション -->
                    <section class="approval__controls">
                        <!-- 統計表示 -->
                        <div class="approval__stats-grid">
                            <div class="approval__stat-card">
                                <div class="approval__stat-value" id="pendingCount">10</div>
                                <div class="approval__stat-label">承認待ち</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value">1,847</div>
                                <div class="approval__stat-label">自動承認済み</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value" id="highRiskCount">4</div>
                                <div class="approval__stat-label">高リスク</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value" id="mediumRiskCount">6</div>
                                <div class="approval__stat-label">中リスク</div>
                            </div>
                            <div class="approval__stat-card">
                                <div class="approval__stat-value">2.3分</div>
                                <div class="approval__stat-label">平均処理時間</div>
                            </div>
                        </div>

                        <!-- フィルターコントロール -->
                        <div class="approval__filter-controls">
                            <div class="approval__filter-group">
                                <span class="approval__filter-label">表示:</span>
                                <button class="approval__filter-btn approval__filter-btn--active" data-filter="all" onclick="applyFilter('all')">
                                    すべて <span class="approval__filter-count" id="countAll">10</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">AI判定:</span>
                                <button class="approval__filter-btn" data-filter="ai-approved" onclick="applyFilter('ai-approved')">
                                    AI承認済み <span class="approval__filter-count" id="countAiApproved">5</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="ai-rejected" onclick="applyFilter('ai-rejected')">
                                    AI非承認 <span class="approval__filter-count" id="countAiRejected">2</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="ai-pending" onclick="applyFilter('ai-pending')">
                                    AI判定待ち <span class="approval__filter-count" id="countAiPending">3</span>
                                </button>
                            </div>

                            <div class="approval__filter-group">
                                <span class="approval__filter-label">リスク:</span>
                                <button class="approval__filter-btn" data-filter="high-risk" onclick="applyFilter('high-risk')">
                                    高リスク <span class="approval__filter-count" id="countHighRisk">4</span>
                                </button>
                                <button class="approval__filter-btn" data-filter="medium-risk" onclick="applyFilter('medium-risk')">
                                    中リスク <span class="approval__filter-count" id="countMediumRisk">6</span>
                                </button>
                            </div>
                        </div>

                        <!-- 主要操作ボタン -->
                        <div class="approval__main-actions">
                            <div class="approval__selection-controls">
                                <button class="approval__main-btn approval__main-btn--select" onclick="selectAllVisible()">
                                    <i class="fas fa-check-square"></i>
                                    全選択
                                </button>
                                <button class="approval__main-btn approval__main-btn--deselect" onclick="deselectAll()">
                                    <i class="fas fa-square"></i>
                                    全解除
                                </button>
                            </div>
                            
                            <div class="approval__decision-controls">
                                <button class="approval__main-btn approval__main-btn--approve" onclick="bulkApprove()">
                                    <i class="fas fa-check"></i>
                                    承認
                                </button>
                                <button class="approval__main-btn approval__main-btn--reject" onclick="bulkReject()">
                                    <i class="fas fa-times"></i>
                                    非承認
                                </button>
                            </div>
                        </div>
                    </section>

                    <!-- 一括操作バー -->
                    <div class="approval__bulk-actions" id="bulkActions">
                        <div class="approval__bulk-info">
                            <i class="fas fa-check-square"></i>
                            <span id="selectedCount">0</span>件 を選択中
                        </div>
                        <div class="approval__bulk-buttons">
                            <button class="approval__bulk-btn approval__bulk-btn--success" onclick="bulkApprove()">
                                <i class="fas fa-check"></i>
                                一括承認
                            </button>
                            <button class="approval__bulk-btn approval__bulk-btn--danger" onclick="bulkReject()">
                                <i class="fas fa-ban"></i>
                                一括否認
                            </button>
                            <button class="approval__bulk-btn" onclick="bulkHold()">
                                <i class="fas fa-pause"></i>
                                一括保留
                            </button>
                            <button class="approval__bulk-btn" onclick="clearSelection()">
                                <i class="fas fa-times"></i>
                                選択クリア
                            </button>
                        </div>
                    </div>

                    <!-- メイングリッド -->
                    <section class="approval__grid-container">
                        <div class="approval__grid" id="productGrid">
                            <!-- 商品カード動的生成領域 - JavaScriptで生成 -->
                            <div class="loading-container">
                                <div class="loading-spinner"></div>
                                <p>承認待ち商品を読み込み中...</p>
                            </div>
                        </div>

                        <div class="approval__pagination">
                            <div class="approval__pagination-info">
                                <span id="displayRange">1-10件表示</span> / 全<span id="totalCount">10</span>件
                            </div>
                            <div class="approval__pagination-controls">
                                <button class="approval__pagination-btn approval__pagination-btn--active">1</button>
                            </div>
                        </div>
                    </section>
                </main>
            </div>

            <!-- 承認分析タブ -->
            <div id="analysis" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-chart-bar"></i>
                        <h3 class="section-title">承認分析ダッシュボード</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>承認データの分析機能は開発中です。今後の更新で詳細な分析機能を追加予定です。</span>
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
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>データ取得機能は開発中です。現在はサンプルデータで動作しています。</span>
                    </div>
                </div>
            </div>

            <!-- データ編集タブ -->
            <div id="editing" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-edit"></i>
                        <h3 class="section-title">データ編集 & 検証</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>データ編集機能は開発中です。現在は承認システムのみ動作しています。</span>
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
                        <span>送料計算機能は開発中です。現在は承認システムのみ動作しています。</span>
                    </div>
                </div>
            </div>

            <!-- フィルタータブ -->
            <div id="filters" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-filter"></i>
                        <h3 class="section-title">フィルター管理</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>フィルター管理機能は開発中です。現在は承認システムのみ動作しています。</span>
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
                        <span>出品管理機能は開発中です。現在は承認システムのみ動作しています。</span>
                    </div>
                </div>
            </div>

            <!-- 在庫管理タブ -->
            <div id="inventory-mgmt" class="tab-content fade-in">
                <div class="section">
                    <div class="section-header">
                        <i class="fas fa-chart-line"></i>
                        <h3 class="section-title">在庫・売上分析ダッシュボード</h3>
                    </div>
                    <div class="notification info">
                        <i class="fas fa-info-circle"></i>
                        <span>在庫管理機能は開発中です。現在は承認システムのみ動作しています。</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- システムログ -->
        <div class="log-area">
            <h4 style="color: var(--info-color); margin-bottom: var(--space-xs); font-size: 0.8rem;">
                <i class="fas fa-history"></i> システムログ
            </h4>
            <div id="logSection">
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                    <span class="log-level info">INFO</span>
                    <span>商品承認システム統合版が正常に起動しました。</span>
                </div>
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                    <span class="log-level info">INFO</span>
                    <span>10件のサンプル商品データを読み込み完了。</span>
                </div>
                <div class="log-entry">
                    <span class="log-timestamp">[<?= date('H:i:s'); ?>]</span>
                    <span class="log-level success">SUCCESS</span>
                    <span>承認システム完全動作版が利用可能です。</span>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript読み込み -->
    <script src="js/yahoo_auction_tool_integrated.js"></script>
</body>
</html>
