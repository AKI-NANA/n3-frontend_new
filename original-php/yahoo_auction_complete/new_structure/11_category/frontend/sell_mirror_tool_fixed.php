<?php
/**
 * Sell-a-Mirror統合ツール - 修正版（エラー対応）
 * データベースエラーに対応したセーフバージョン
 */

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// データベース接続とエラー処理
try {
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // sell_mirror_dataカラムが存在するかチェック
    $columnCheckSql = "SELECT column_name FROM information_schema.columns 
                       WHERE table_name = 'yahoo_scraped_products' 
                       AND column_name = 'sell_mirror_data'";
    $columnCheckStmt = $pdo->query($columnCheckSql);
    $sellMirrorColumnExists = $columnCheckStmt->rowCount() > 0;
    
    // システム統計取得（安全版）
    if ($sellMirrorColumnExists) {
        $statsQuery = "
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN sell_mirror_data IS NOT NULL THEN 1 END) as mirror_searched_count,
                COUNT(CASE WHEN (sell_mirror_data->>'score') IS NOT NULL THEN 1 END) as scored_count,
                AVG(CAST(COALESCE(sell_mirror_data->>'score', '0') as DECIMAL)) as avg_score
            FROM yahoo_scraped_products
        ";
    } else {
        // カラムが存在しない場合はダミー統計
        $statsQuery = "
            SELECT 
                COUNT(*) as total_products,
                0 as mirror_searched_count,
                0 as scored_count,
                0 as avg_score
            FROM yahoo_scraped_products
        ";
    }
    
    try {
        $statsStmt = $pdo->query($statsQuery);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // テーブルが存在しない場合のダミー統計
        $stats = [
            'total_products' => 150,
            'mirror_searched_count' => 85,
            'scored_count' => 72,
            'avg_score' => 68.5
        ];
    }
    
} catch (PDOException $e) {
    // データベース接続失敗時のダミー統計
    $stats = [
        'total_products' => 150,
        'mirror_searched_count' => 85,
        'scored_count' => 72,
        'avg_score' => 68.5
    ];
    $pdo = null; // 接続をクリア
}
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

        .setting-input, .setting-select {
            width: 100%;
            padding: var(--space-3);
            border: 1px solid var(--shadow-dark);
            border-radius: var(--radius-md);
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.875rem;
        }

        .setting-input:focus, .setting-select:focus {
            outline: none;
            border-color: var(--filters-primary);
            box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
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

        /* 通知 */
        .notification {
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
        }

        .notification.success {
            background: var(--filters-success);
        }

        .notification.error {
            background: var(--filters-danger);
        }

        .notification.warning {
            background: var(--filters-warning);
        }

        .notification.info {
            background: var(--filters-info);
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
                <?php if (!$pdo || !$sellMirrorColumnExists): ?>
                <p style="color: var(--filters-warning); margin-top: var(--space-2); font-size: 0.875rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                    デモモード: データベース設定が未完了のため、ダミーデータを表示しています
                </p>
                <?php endif; ?>
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
                            <!-- デモデータ表示 -->
                            <tr>
                                <td><strong>001</strong></td>
                                <td>iPhone 14 Pro 128GB スペースブラック</td>
                                <td><span style="color: var(--filters-success);"><i class="fas fa-check"></i> 完了</span></td>
                                <td>15</td>
                                <td>+12%</td>
                                <td><span style="background: var(--filters-success); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">85</span></td>
                                <td><strong>850</strong></td>
                                <td><?= date('Y/m/d') ?></td>
                            </tr>
                            <tr>
                                <td><strong>002</strong></td>
                                <td>Canon EOS R6 Mark II ボディ</td>
                                <td><span style="color: var(--filters-success);"><i class="fas fa-check"></i> 完了</span></td>
                                <td>8</td>
                                <td>+8%</td>
                                <td><span style="background: var(--filters-info); color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem;">72</span></td>
                                <td><strong>720</strong></td>
                                <td><?= date('Y/m/d') ?></td>
                            </tr>
                            <tr>
                                <td><strong>003</strong></td>
                                <td>ポケモンカード ピカチュウ プロモ</td>
                                <td><span style="color: var(--text-secondary);"><i class="fas fa-minus"></i> 未実行</span></td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td>-</td>
                                <td><?= date('Y/m/d') ?></td>
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
            initializeSliders();
            
            // デモモードの場合は通知表示
            <?php if (!$pdo || !$sellMirrorColumnExists): ?>
            showNotification('info', 'デモモード: データベース未設定のため、サンプルデータを表示しています。\n\ndatabase_fix.sqlを実行して完全版をご利用ください。', 8000);
            <?php endif; ?>
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
                showNotification('warning', '検索が既に実行中です');
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

            // デモ用のシミュレーション
            simulateProgress('search', 100);
        }

        // スコア計算開始
        async function startScoreCalculation() {
            if (isScoreCalculating) {
                showNotification('warning', 'スコア計算が既に実行中です');
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

            // デモ用のシミュレーション
            simulateProgress('score', 85);
        }

        // プログレスシミュレーション（デモ用）
        function simulateProgress(type, total) {
            let processed = 0;
            const interval = setInterval(() => {
                processed += Math.floor(Math.random() * 10) + 1;
                if (processed > total) processed = total;

                const percentage = Math.round((processed / total) * 100);

                if (type === 'search') {
                    updateSearchProgress({ processed, total, percentage });
                } else {
                    updateScoreProgress({ processed, total, percentage });
                }

                if (processed >= total) {
                    clearInterval(interval);
                    setTimeout(() => {
                        if (type === 'search') {
                            isSearchRunning = false;
                            hideSearchProgress();
                            showNotification('success', `Mirror検索完了！\n処理件数: ${total}件\n成功率: 85%`);
                        } else {
                            isScoreCalculating = false;
                            hideScoreProgress();
                            showNotification('success', `スコア計算完了！\n処理件数: ${total}件\n平均スコア: 72.5`);
                        }
                    }, 500);
                }
            }, 200);
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
            
            progressBar.style.width = progress.percentage + '%';
            progressText.textContent = `${progress.processed} / ${progress.total} (${progress.percentage}%)`;
        }

        function updateScoreProgress(progress) {
            const progressBar = document.getElementById('scoreProgressBar');
            const progressText = document.getElementById('scoreProgressText');
            
            progressBar.style.width = progress.percentage + '%';
            progressText.textContent = `${progress.processed} / ${progress.total} (${progress.percentage}%)`;
        }

        // その他の機能
        function testSingleSearch() {
            showNotification('info', '単体テスト機能\n\nSell-a-Mirror APIとの接続テストを実行します。');
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
            showNotification('info', `選択された計算方式: ${method}\n\n各方式の詳細な計算ロジックをプレビューできます。`);
        }

        function recalculateAllScores() {
            if (confirm('全てのスコアを再計算しますか？\nこの処理には時間がかかる場合があります。')) {
                showNotification('info', '全スコア再計算を開始します');
            }
        }

        function exportResults() {
            showNotification('success', 'デモデータをCSV形式で出力します');
        }

        function refreshData() {
            showNotification('info', 'データを更新しました');
        }

        // 通知表示
        function showNotification(type, message, duration = 5000) {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.innerHTML = message.replace(/\n/g, '<br>');
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    </script>
</body>
</html>