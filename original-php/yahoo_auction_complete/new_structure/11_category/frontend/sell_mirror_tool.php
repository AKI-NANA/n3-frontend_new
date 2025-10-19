<?php
/**
 * Sell-a-Mirror統合ツール - Part 2
 * Sell-a-Mirror検索・取得・スコア計算・点数算出システム
 */

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// データベース接続
try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die('データベース接続失敗: ' . $e->getMessage());
}

// システム統計取得
$statsQuery = "
    SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN sell_mirror_data IS NOT NULL THEN 1 END) as mirror_searched_count,
        COUNT(CASE WHEN (sell_mirror_data->>'score') IS NOT NULL THEN 1 END) as scored_count,
        AVG(CAST(COALESCE(sell_mirror_data->>'score', '0') as DECIMAL)) as avg_score
    FROM yahoo_scraped_products
";
$statsStmt = $pdo->query($statsQuery);
$stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sell-a-Mirror統合ツール</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* 基本設定（filters.cssから継承） */
        :root {
            --filters-primary: #8b5cf6;
            --filters-secondary: #3b82f6;
            --filters-success: #10b981;
            --filters-warning: #f59e0b;
            --filters-danger: #ef4444;
            --filters-info: #06b6d4;
            
            --filters-gradient: linear-gradient(135deg, #8b5cf6, #3b82f6);
            --filters-gradient-hover: linear-gradient(135deg, #3b82f6, #8b5cf6);
            
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-tertiary: #64748b;
            --shadow-dark: #e2e8f0;
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --radius-md: 0.375rem;
            --radius-lg: 0.5rem;
            --radius-xl: 0.75rem;
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            --space-6: 1.5rem;
            --space-8: 2rem;
            --transition: all 0.2s ease;
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
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--space-6);
        }

        /* ヘッダー */
        .filters__header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--space-6);
            padding: var(--space-6);
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
        }

        .filters__title {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
            display: flex;
            align-items: center;
            gap: var(--space-3);
            background: var(--filters-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .filters__title-icon {
            font-size: 2rem;
            background: var(--filters-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .filters__header-actions {
            display: flex;
            gap: var(--space-3);
            align-items: center;
        }

        .btn {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            padding: var(--space-3) var(--space-4);
            border: none;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: 600;
            transition: var(--transition);
            text-decoration: none;
            font-size: 0.875rem;
        }

        .btn-primary {
            background: var(--filters-gradient);
            color: white;
            box-shadow: var(--shadow-md);
        }

        .btn-primary:hover {
            background: var(--filters-gradient-hover);
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
        }

        .btn-success {
            background: var(--filters-success);
            color: white;
        }

        .btn-warning {
            background: var(--filters-warning);
            color: white;
        }

        .btn-secondary {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--shadow-dark);
        }

        .btn-secondary:hover {
            background: var(--bg-secondary);
            color: var(--text-primary);
        }

        /* 統計カード */
        .filters__stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: var(--space-4);
            margin-bottom: var(--space-8);
        }

        .filters__stat-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            padding: var(--space-6);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
            transition: var(--transition);
            position: relative;
            overflow: hidden;
        }

        .filters__stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--filters-primary);
            transition: var(--transition);
        }

        .filters__stat-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
        }

        .filters__stat-card--primary::before {
            background: var(--filters-primary);
        }

        .filters__stat-card--success::before {
            background: var(--filters-success);
        }

        .filters__stat-card--warning::before {
            background: var(--filters-warning);
        }

        .filters__stat-card--info::before {
            background: var(--filters-info);
        }

        .filters__stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-4);
        }

        .filters__stat-title {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .filters__stat-icon {
            width: 48px;
            height: 48px;
            border-radius: var(--radius-lg);
            background: var(--filters-gradient);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.125rem;
            box-shadow: var(--shadow-md);
        }

        .filters__stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: var(--space-2);
            background: var(--filters-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .filters__stat-trend {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* 処理セクション */
        .process-section {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--shadow-dark);
            margin-bottom: var(--space-6);
            overflow: hidden;
        }

        .process-header {
            padding: var(--space-6);
            background: var(--bg-tertiary);
            border-bottom: 1px solid var(--shadow-dark);
        }

        .process-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            gap: var(--space-2);
            margin-bottom: var(--space-2);
        }

        .process-description {
            color: var(--text-secondary);
            margin: 0;
        }

        .process-content {
            padding: var(--space-6);
        }

        .process-actions {
            display: flex;
            gap: var(--space-3);
            margin-bottom: var(--space-6);
            flex-wrap: wrap;
        }

        /* 設定フォーム */
        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-4);
            margin-bottom: var(--space-6);
        }

        .setting-group {
            background: var(--bg-primary);
            padding: var(--space-4);
            border-radius: var(--radius-lg);
            border: 1px solid var(--shadow-dark);
        }

        .setting-label {
            display: block;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: var(--space-2);
        }

        .setting-input {
            width: 100%;
            padding: var(--space-3);
            border: 1px solid var(--shadow-dark);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .setting-input:focus {
            outline: none;
            border-color: var(--filters-primary);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .setting-select {
            width: 100%;
            padding: var(--space-3);
            border: 1px solid var(--shadow-dark);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        /* 結果テーブル */
        .results-table-container {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid var(--shadow-dark);
        }

        .results-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .results-table th {
            background: var(--bg-tertiary);
            padding: var(--space-3) var(--space-4);
            text-align: left;
            font-weight: 600;
            color: var(--text-primary);
            border-bottom: 1px solid var(--shadow-dark);
        }

        .results-table td {
            padding: var(--space-3) var(--space-4);
            border-bottom: 1px solid var(--shadow-dark);
            vertical-align: middle;
        }

        .results-table tbody tr:hover {
            background: var(--bg-tertiary);
        }

        /* スコアバッジ */
        .score-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: var(--radius-md);
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
        }

        .score-badge--excellent {
            background: var(--filters-success);
        }

        .score-badge--good {
            background: var(--filters-info);
        }

        .score-badge--average {
            background: var(--filters-warning);
        }

        .score-badge--poor {
            background: var(--filters-danger);
        }

        /* プログレスバー */
        .progress-container {
            margin: var(--space-4) 0;
        }

        .progress-label {
            display: flex;
            justify-content: space-between;
            margin-bottom: var(--space-2);
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-md);
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--filters-gradient);
            border-radius: var(--radius-md);
            transition: width 0.5s ease;
        }

        /* ローディング */
        .loading {
            text-align: center;
            padding: var(--space-8);
            color: var(--text-secondary);
        }

        .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--bg-tertiary);
            border-top: 3px solid var(--filters-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto var(--space-4);
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            .filters__header {
                flex-direction: column;
                gap: var(--space-4);
            }

            .filters__stats-grid {
                grid-template-columns: 1fr;
            }

            .settings-grid {
                grid-template-columns: 1fr;
            }

            .process-actions {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="filters__header">
            <div>
                <h1 class="filters__title">
                    <i class="fas fa-search filters__title-icon"></i>
                    Sell-a-Mirror統合ツール
                </h1>
                <p style="color: var(--text-secondary); margin-top: var(--space-2);">
                    Sell-a-Mirror検索・スコア計算・点数算出の完全自動化システム
                </p>
            </div>
            <div class="filters__header-actions">
                <button class="btn btn-secondary" onclick="exportResults()">
                    <i class="fas fa-download"></i>
                    結果出力
                </button>
                <button class="btn btn-primary" onclick="refreshData()">
                    <i class="fas fa-sync"></i>
                    データ更新
                </button>
            </div>
        </div>

        <!-- 統計カード -->
        <div class="filters__stats-grid">
            <div class="filters__stat-card filters__stat-card--primary">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">総商品数</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-database"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($stats['total_products']) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-info-circle"></i>
                    <span>処理対象商品</span>
                </div>
            </div>

            <div class="filters__stat-card filters__stat-card--success">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">Mirror検索済み</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-search"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($stats['mirror_searched_count']) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-arrow-up"></i>
                    <span><?= $stats['total_products'] > 0 ? round(($stats['mirror_searched_count'] / $stats['total_products']) * 100, 1) : 0 ?>% 完了</span>
                </div>
            </div>

            <div class="filters__stat-card filters__stat-card--info">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">スコア算出済み</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($stats['scored_count']) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-check"></i>
                    <span>算出完了</span>
                </div>
            </div>

            <div class="filters__stat-card filters__stat-card--warning">
                <div class="filters__stat-header">
                    <span class="filters__stat-title">平均スコア</span>
                    <div class="filters__stat-icon">
                        <i class="fas fa-star"></i>
                    </div>
                </div>
                <div class="filters__stat-value"><?= number_format($stats['avg_score'] ?? 0, 1) ?></div>
                <div class="filters__stat-trend">
                    <i class="fas fa-trending-up"></i>
                    <span>点数</span>
                </div>
            </div>
        </div>

        <!-- Sell-a-Mirror検索セクション -->
        <div class="process-section">
            <div class="process-header">
                <h2 class="process-title">
                    <i class="fas fa-search"></i>
                    Sell-a-Mirror検索エンジン
                </h2>
                <p class="process-description">
                    Yahoo Auction商品をSell-a-Mirrorで検索し、類似商品データを自動取得します
                </p>
            </div>
            <div class="process-content">
                <div class="settings-grid">
                    <div class="setting-group">
                        <label class="setting-label">検索モード</label>
                        <select class="setting-select" id="searchMode">
                            <option value="title_only">タイトルのみ</option>
                            <option value="title_category">タイトル + カテゴリー</option>
                            <option value="advanced">高度検索（ブランド含む）</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">検索範囲</label>
                        <select class="setting-select" id="searchRange">
                            <option value="all">全商品</option>
                            <option value="unprocessed">未処理のみ</option>
                            <option value="category_detected">カテゴリー判定済み</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">バッチサイズ</label>
                        <input type="number" class="setting-input" id="batchSize" value="50" min="10" max="200">
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">待機時間（秒）</label>
                        <input type="number" class="setting-input" id="waitTime" value="2" min="1" max="10">
                    </div>
                </div>
                
                <div class="process-actions">
                    <button class="btn btn-primary" onclick="startMirrorSearch()">
                        <i class="fas fa-play"></i>
                        Mirror検索開始
                    </button>
                    <button class="btn btn-secondary" onclick="testSingleSearch()">
                        <i class="fas fa-vial"></i>
                        単体テスト
                    </button>
                    <button class="btn btn-warning" onclick="pauseSearch()">
                        <i class="fas fa-pause"></i>
                        一時停止
                    </button>
                </div>
                
                <div id="searchProgress" style="display: none;">
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>検索進行状況</span>
                            <span id="searchProgressText">0 / 0 (0%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="searchProgressBar" style="width: 0%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- スコア計算セクション -->
        <div class="process-section">
            <div class="process-header">
                <h2 class="process-title">
                    <i class="fas fa-calculator"></i>
                    スコア計算エンジン
                </h2>
                <p class="process-description">
                    Mirror検索結果を基に、総合スコアと点数を自動算出します
                </p>
            </div>
            <div class="process-content">
                <div class="settings-grid">
                    <div class="setting-group">
                        <label class="setting-label">スコア算出方式</label>
                        <select class="setting-select" id="scoreMethod">
                            <option value="comprehensive">総合評価</option>
                            <option value="profit_focused">利益重視</option>
                            <option value="volume_focused">売上重視</option>
                            <option value="risk_averse">リスク回避</option>
                        </select>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">価格差重要度</label>
                        <input type="range" class="setting-input" id="priceWeight" min="1" max="10" value="7">
                        <div style="text-align: center; margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                            重要度: <span id="priceWeightValue">7</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">競合数重要度</label>
                        <input type="range" class="setting-input" id="competitionWeight" min="1" max="10" value="5">
                        <div style="text-align: center; margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                            重要度: <span id="competitionWeightValue">5</span>
                        </div>
                    </div>
                    
                    <div class="setting-group">
                        <label class="setting-label">売上履歴重要度</label>
                        <input type="range" class="setting-input" id="historyWeight" min="1" max="10" value="8">
                        <div style="text-align: center; margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                            重要度: <span id="historyWeightValue">8</span>
                        </div>
                    </div>
                </div>
                
                <div class="process-actions">
                    <button class="btn btn-success" onclick="startScoreCalculation()">
                        <i class="fas fa-play"></i>
                        スコア計算開始
                    </button>
                    <button class="btn btn-secondary" onclick="previewScoreMethod()">
                        <i class="fas fa-eye"></i>
                        計算方式プレビュー
                    </button>
                    <button class="btn btn-warning" onclick="recalculateAllScores()">
                        <i class="fas fa-redo"></i>
                        全スコア再計算
                    </button>
                </div>
                
                <div id="scoreProgress" style="display: none;">
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>計算進行状況</span>
                            <span id="scoreProgressText">0 / 0 (0%)</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="scoreProgressBar" style="width: 0%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 結果表示セクション -->
        <div class="process-section">
            <div class="process-header">
                <h2 class="process-title">
                    <i class="fas fa-chart-bar"></i>
                    処理結果一覧
                </h2>
                <p class="process-description">
                    Mirror検索・スコア計算の結果を一覧で確認できます
                </p>
            </div>
            <div class="process-content">
                <div class="results-table-container">
                    <table class="results-table" id="resultsTable">
                        <thead>
                            <tr>
                                <th>商品ID</th>
                                <th>商品名</th>
                                <th>Mirror検索</th>
                                <th>競合数</th>
                                <th>価格差</th>
                                <th>スコア</th>
                                <th>点数</th>
                                <th>更新日</th>
                            </tr>
                        </thead>
                        <tbody id="resultsTableBody">
                            <tr>
                                <td colspan="8">
                                    <div class="loading">
                                        <div class="spinner"></div>
                                        データを読み込み中...
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // グローバル変数
        let isSearchRunning = false;
        let isScoreCalculating = false;
        let currentResults = [];

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            loadResultsData();
            initializeSliders();
        });

        // スライダー初期化
        function initializeSliders() {
            const priceSlider = document.getElementById('priceWeight');
            const competitionSlider = document.getElementById('competitionWeight');
            const historySlider = document.getElementById('historyWeight');

            priceSlider.addEventListener('input', function() {
                document.getElementById('priceWeightValue').textContent = this.value;
            });

            competitionSlider.addEventListener('input', function() {
                document.getElementById('competitionWeightValue').textContent = this.value;
            });

            historySlider.addEventListener('input', function() {
                document.getElementById('historyWeightValue').textContent = this.value;
            });
        }

        // Mirror検索開始
        async function startMirrorSearch() {
            if (isSearchRunning) {
                alert('検索が既に実行中です');
                return;
            }

            const searchMode = document.getElementById('searchMode').value;
            const searchRange = document.getElementById('searchRange').value;
            const batchSize = parseInt(document.getElementById('batchSize').value);
            const waitTime = parseInt(document.getElementById('waitTime').value);

            if (!confirm(`Mirror検索を開始しますか？\n\n設定:\n- モード: ${searchMode}\n- 範囲: ${searchRange}\n- バッチサイズ: ${batchSize}件\n- 待機時間: ${waitTime}秒`)) {
                return;
            }

            isSearchRunning = true;
            showSearchProgress();

            try {
                const response = await fetch('../backend/api/sell_mirror_api.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: 'start_mirror_search',
                        search_mode: searchMode,
                        search_range: searchRange,
                        batch_size: batchSize,
                        wait_time: waitTime
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('success', `Mirror検索が開始されました\n処理対象: ${result.target_count}件`);
                    monitorSearchProgress();
                } else {
                    showNotification('error', `検索開始失敗: ${result.error}`);
                    isSearchRunning = false;
                    hideSearchProgress();
                }
            } catch (error) {
                showNotification('error', `通信エラー: ${error.message}`);
                isSearchRunning = false;
                hideSearchProgress();
            }
        }

        // 検索進行状況監視
        async function monitorSearchProgress() {
            if (!isSearchRunning) return;

            try {
                const response = await fetch('../backend/api/sell_mirror_api.php?action=get_search_progress');
                const result = await response.json();

                if (result.success) {
                    updateSearchProgress(result.progress);

                    if (result.progress.status === 'completed') {
                        isSearchRunning = false;
                        hideSearchProgress();
                        showNotification('success', 
                            `Mirror検索完了！\n` +
                            `処理件数: ${result.progress.processed}/${result.progress.total}\n` +
                            `成功率: ${result.progress.success_rate}%`
                        );
                        loadResultsData();
                    } else if (result.progress.status === 'running') {
                        setTimeout(monitorSearchProgress, 2000);
                    } else {
                        isSearchRunning = false;
                        hideSearchProgress();
                        showNotification('error', 'Mirror検索でエラーが発生しました');
                    }
                }
            } catch (error) {
                console.error('Progress monitoring error:', error);
                setTimeout(monitorSearchProgress, 5000);
            }
        }

        // スコア計算開始
        async function startScoreCalculation() {
            if (isScoreCalculating) {
                alert('スコア計算が既に実行中です');
                return;
            }

            const scoreMethod = document.getElementById('scoreMethod').value;
            const priceWeight = parseInt(document.getElementById('priceWeight').value);
            const competitionWeight = parseInt(document.getElementById('competitionWeight').value);
            const historyWeight = parseInt(document.getElementById('historyWeight').value);

            if (!confirm(`スコア計算を開始しますか？\n\n設定:\n- 方式: ${scoreMethod}\n- 価格差重要度: ${priceWeight}\n- 競合数重要度: ${competitionWeight}\n- 売上履歴重要度: ${historyWeight}`)) {
                return;
            }

            isScoreCalculating = true;
            showScoreProgress();

            try {
                const response = await fetch('../backend/api/sell_mirror_api.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        action: 'start_score_calculation',
                        score_method: scoreMethod,
                        price_weight: priceWeight,
                        competition_weight: competitionWeight,
                        history_weight: historyWeight
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification('success', `スコア計算が開始されました\n処理対象: ${result.target_count}件`);
                    monitorScoreProgress();
                } else {
                    showNotification('error', `計算開始失敗: ${result.error}`);
                    isScoreCalculating = false;
                    hideScoreProgress();
                }
            } catch (error) {
                showNotification('error', `通信エラー: ${error.message}`);
                isScoreCalculating = false;
                hideScoreProgress();
            }
        }

        // スコア計算進行状況監視
        async function monitorScoreProgress() {
            if (!isScoreCalculating) return;

            try {
                const response = await fetch('../backend/api/sell_mirror_api.php?action=get_score_progress');
                const result = await response.json();

                if (result.success) {
                    updateScoreProgress(result.progress);

                    if (result.progress.status === 'completed') {
                        isScoreCalculating = false;
                        hideScoreProgress();
                        showNotification('success', 
                            `スコア計算完了！\n` +
                            `処理件数: ${result.progress.processed}/${result.progress.total}\n` +
                            `平均スコア: ${result.progress.avg_score}`
                        );
                        loadResultsData();
                    } else if (result.progress.status === 'running') {
                        setTimeout(monitorScoreProgress, 2000);
                    } else {
                        isScoreCalculating = false;
                        hideScoreProgress();
                        showNotification('error', 'スコア計算でエラーが発生しました');
                    }
                }
            } catch (error) {
                console.error('Score progress monitoring error:', error);
                setTimeout(monitorScoreProgress, 5000);
            }
        }

        // 結果データ読み込み
        async function loadResultsData() {
            const tbody = document.getElementById('resultsTableBody');
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="loading">
                            <div class="spinner"></div>
                            データを読み込み中...
                        </div>
                    </td>
                </tr>
            `;

            try {
                const response = await fetch('../backend/api/sell_mirror_api.php?action=get_results');
                const data = await response.json();

                if (data.success) {
                    currentResults = data.results;
                    renderResultsTable(data.results);
                } else {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align: center; color: var(--filters-danger);">
                                データの読み込みに失敗しました: ${data.error}
                            </td>
                        </tr>
                    `;
                }
            } catch (error) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--filters-danger);">
                            通信エラーが発生しました
                        </td>
                    </tr>
                `;
            }
        }

        // 結果テーブル描画
        function renderResultsTable(results) {
            const tbody = document.getElementById('resultsTableBody');
            
            if (!results || results.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--text-secondary);">
                            データがありません
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = results.map(result => `
                <tr>
                    <td><strong>${result.id}</strong></td>
                    <td style="max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${result.title}">
                        ${result.title}
                    </td>
                    <td>
                        ${result.mirror_searched ? 
                            '<span style="color: var(--filters-success);"><i class="fas fa-check"></i> 完了</span>' : 
                            '<span style="color: var(--text-secondary);"><i class="fas fa-minus"></i> 未実行</span>'
                        }
                    </td>
                    <td>${result.competitor_count || '-'}</td>
                    <td>${result.price_difference ? (result.price_difference > 0 ? '+' : '') + result.price_difference + '%' : '-'}</td>
                    <td>
                        ${result.score ? 
                            `<span class="score-badge score-badge--${getScoreBadgeClass(result.score)}">${result.score}</span>` : 
                            '-'
                        }
                    </td>
                    <td><strong>${result.total_points || '-'}</strong></td>
                    <td>${new Date(result.updated_at).toLocaleDateString('ja-JP')}</td>
                </tr>
            `).join('');
        }

        // スコアバッジクラス取得
        function getScoreBadgeClass(score) {
            if (score >= 80) return 'excellent';
            if (score >= 60) return 'good';
            if (score >= 40) return 'average';
            return 'poor';
        }

        // プログレス表示/非表示
        function showSearchProgress() {
            document.getElementById('searchProgress').style.display = 'block';
        }

        function hideSearchProgress() {
            document.getElementById('searchProgress').style.display = 'none';
        }

        function showScoreProgress() {
            document.getElementById('scoreProgress').style.display = 'block';
        }

        function hideScoreProgress() {
            document.getElementById('scoreProgress').style.display = 'none';
        }

        // プログレス更新
        function updateSearchProgress(progress) {
            const progressBar = document.getElementById('searchProgressBar');
            const progressText = document.getElementById('searchProgressText');
            
            const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
            
            progressBar.style.width = percentage + '%';
            progressText.textContent = `${progress.processed} / ${progress.total} (${percentage}%)`;
        }

        function updateScoreProgress(progress) {
            const progressBar = document.getElementById('scoreProgressBar');
            const progressText = document.getElementById('scoreProgressText');
            
            const percentage = progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
            
            progressBar.style.width = percentage + '%';
            progressText.textContent = `${progress.processed} / ${progress.total} (${percentage}%)`;
        }

        // その他の機能
        function testSingleSearch() {
            showNotification('info', '単体テスト機能は開発中です。\nAPIエンドポイントの接続テストを実行します。');
        }

        function pauseSearch() {
            if (isSearchRunning) {
                isSearchRunning = false;
                showNotification('warning', 'Mirror検索を一時停止しました');
            } else {
                showNotification('info', '現在検索は実行されていません');
            }
        }

        function previewScoreMethod() {
            const method = document.getElementById('scoreMethod').value;
            showNotification('info', `選択された計算方式: ${method}\n\n計算方式の詳細プレビュー機能は開発中です。`);
        }

        function recalculateAllScores() {
            if (confirm('全てのスコアを再計算しますか？\nこの処理には時間がかかる場合があります。')) {
                showNotification('info', '全スコア再計算機能は開発中です。');
            }
        }

        function exportResults() {
            if (currentResults.length === 0) {
                alert('エクスポートするデータがありません');
                return;
            }

            const csv = arrayToCsv(currentResults);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `sell_mirror_results_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function refreshData() {
            loadResultsData();
        }

        // 配列をCSVに変換
        function arrayToCsv(data) {
            if (!data || data.length === 0) return '';
            
            const headers = Object.keys(data[0]);
            const csvHeaders = headers.join(',');
            
            const csvRows = data.map(row => 
                headers.map(header => {
                    let value = row[header];
                    if (typeof value === 'string' && value.includes(',')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    return value || '';
                }).join(',')
            );
            
            return [csvHeaders, ...csvRows].join('\n');
        }

        // 通知表示
        function showNotification(type, message, duration = 5000) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                color: white;
                font-weight: 600;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                animation: slideInRight 0.3s ease-out;
            `;
            
            const colors = {
                'success': 'var(--filters-success)',
                'error': 'var(--filters-danger)',
                'warning': 'var(--filters-warning)',
                'info': 'var(--filters-info)'
            };
            
            notification.style.background = colors[type] || colors['info'];
            notification.innerHTML = message.replace(/\n/g, '<br>');
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease-in';
                    setTimeout(() => notification.remove(), 300);
                }
            }, duration);
        }
    </script>
</body>
</html>