<?php
/**
 * Wisdom Core - 開発ナレッジ事典
 * AI協調型コードベース理解システム
 */

require_once __DIR__ . '/../shared/core/Database.php';
require_once __DIR__ . '/includes/WisdomCore.php';

$wisdom = new WisdomCore();
$config = require __DIR__ . '/config.php';
$categories = $config['categories'];
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $config['module_title']; ?></title>
    
    <!-- 既存の共通CSS -->
    <link rel="stylesheet" href="../shared/assets/common.css">
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Wisdom Core専用CSS -->
    <link rel="stylesheet" href="assets/wisdom.css">
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="dashboard-header">
            <h1>
                <i class="fas fa-book"></i> 
                <?php echo $config['module_title']; ?>
            </h1>
            <p><?php echo $config['description']; ?></p>
            
            <!-- ナビゲーション -->
            <div class="navigation-links">
                <a href="../01_dashboard/dashboard.php" class="nav-btn nav-dashboard">
                    <i class="fas fa-home"></i> ダッシュボード
                </a>
                <a href="../07_editing/editor_fixed_complete.php" class="nav-btn nav-scraping">
                    <i class="fas fa-edit"></i> 商品編集
                </a>
                <a href="../03_approval/approval.php" class="nav-btn nav-approval">
                    <i class="fas fa-check-circle"></i> 商品承認
                </a>
                <a href="../05_rieki/riekikeisan.php" class="nav-btn nav-rieki">
                    <i class="fas fa-calculator"></i> 利益計算
                </a>
            </div>
        </div>

        <!-- アクションバー -->
        <div class="wisdom-header">
            <h2>
                <i class="fas fa-folder-tree"></i> 
                コードベースマップ
            </h2>
            <div class="wisdom-actions">
                <button id="scanBtn" class="btn" style="background: var(--wisdom-primary); color: white;">
                    <i class="fas fa-sync"></i> プロジェクトスキャン
                </button>
                <button id="exportBtn" class="btn" style="background: var(--wisdom-secondary); color: white;">
                    <i class="fas fa-download"></i> JSONエクスポート
                </button>
                <button id="listViewBtn" class="btn">
                    <i class="fas fa-list"></i> リスト表示
                </button>
                <button id="treeViewBtn" class="btn">
                    <i class="fas fa-sitemap"></i> ツリー表示
                </button>
            </div>
        </div>

        <!-- 統計カード -->
        <div id="statsContainer" class="wisdom-stats">
            <!-- JavaScript で動的生成 -->
        </div>

        <!-- 検索バー -->
        <div class="wisdom-search">
            <input 
                type="text" 
                id="searchInput" 
                placeholder="🔍 ファイル名、パス、説明で検索..."
            >
            <select id="categoryFilter">
                <option value="">全カテゴリ</option>
                <?php foreach ($categories as $key => $name): ?>
                    <option value="<?php echo $key; ?>"><?php echo $name; ?></option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- メインコンテンツ -->
        <div class="wisdom-container">
            <!-- サイドバー（フォルダツリー） -->
            <div class="wisdom-sidebar">
                <h3>
                    <i class="fas fa-folder-tree"></i>
                    プロジェクト構造
                </h3>
                <div class="sidebar-info" style="padding: 1rem; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                    <p style="margin: 0;">
                        <i class="fas fa-info-circle"></i>
                        「ツリー表示」ボタンをクリックしてフォルダ構造を表示
                    </p>
                </div>
            </div>

            <!-- メインエリア -->
            <div class="wisdom-main">
                <div id="fileListContainer" class="file-list">
                    <!-- JavaScript で動的生成 -->
                    <div class="empty-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>読み込み中...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ステータスエリア -->
        <div class="status-area">
            <div class="status-info">
                <span id="statusText">準備完了</span>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="assets/wisdom.js"></script>
</body>
</html>
