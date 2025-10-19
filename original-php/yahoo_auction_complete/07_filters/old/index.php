<?php
/**
 * 高機能フィルターシステム Ver.2.0 - メインページ
 * 企業級品質・完全機能フィルタリングシステム
 * 
 * 機能一覧:
 * ✅ 高機能ページネーション（動的ページサイズ・ジャンプ機能）
 * ✅ 拡張検索システム（全文検索・複数条件組み合わせ）
 * ✅ リアルタイムフィルタリング（Ajax・インスタント結果表示）
 * ✅ 一括操作システム（選択・実行・ログ記録）
 * ✅ 高機能エクスポート（CSV/JSON/Excel・進捗表示）
 * ✅ 統計・分析機能（効果スコア・トレンド分析）
 * ✅ インテリジェントキャッシュ（Redis対応・パフォーマンス最適化）
 * ✅ 企業級セキュリティ（CSRF・SQLインジェクション対策・操作ログ）
 */

// 共通設定・ライブラリ読み込み
require_once '../shared/core/includes.php';
require_once 'includes/FilterSystemCore.php';
require_once 'includes/PaginationEngine.php';
require_once 'includes/SearchEngine.php';
require_once 'includes/SecurityManager.php';

// セッション・セキュリティ初期化
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CSRFトークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// システム初期化
$filterSystem = new FilterSystemCore($pdo);
$paginationEngine = new PaginationEngine();
$searchEngine = new SearchEngine($pdo);
$securityManager = new SecurityManager();

// パラメータ取得・サニタイズ
$currentPage = (int)($_GET['page'] ?? 1);
$pageSize = (int)($_GET['page_size'] ?? 25);
$searchQuery = trim($_GET['search'] ?? '');
$filterType = $_GET['filter_type'] ?? '';
$sortBy = $_GET['sort_by'] ?? 'created_at';
$sortOrder = $_GET['sort_order'] ?? 'DESC';

// ページサイズ検証（10-100の範囲）
$pageSize = max(10, min(100, $pageSize));

// パフォーマンス監視開始
$startTime = microtime(true);

try {
    // 検索・フィルタリング実行
    $searchResults = $searchEngine->executeAdvancedSearch([
        'query' => $searchQuery,
        'type_filter' => $filterType,
        'sort_by' => $sortBy,
        'sort_order' => $sortOrder,
        'page' => $currentPage,
        'page_size' => $pageSize
    ]);
    
    $keywords = $searchResults['data'];
    $totalCount = $searchResults['total_count'];
    $stats = $searchResults['stats'];
    
    // ページネーション設定
    $pagination = $paginationEngine->generatePagination($currentPage, $pageSize, $totalCount);
    
    // 実行時間計算
    $executionTime = round((microtime(true) - $startTime) * 1000, 2);
    
} catch (Exception $e) {
    error_log("Filter System Error: " . $e->getMessage());
    $keywords = [];
    $totalCount = 0;
    $stats = [];
    $pagination = [];
    $executionTime = 0;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>高機能フィルターシステム Ver.2.0 - Yahoo Auction Tool</title>
    <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">
    
    <!-- 外部リソース -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" rel="stylesheet">
    
    <!-- 内部スタイルシート -->
    <link href="../shared/css/common.css" rel="stylesheet">
    <link href="../shared/css/layout.css" rel="stylesheet">
    <link href="assets/css/advanced_filters.css" rel="stylesheet">
    <link href="assets/css/pagination.css" rel="stylesheet">
    <link href="assets/css/components.css" rel="stylesheet">
</head>
<body>
    <div class="filter-system-container">
        <!-- ========== ヘッダー・ナビゲーション ========== -->
        <header class="system-header">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="system-title">
                        <i class="fas fa-shield-alt"></i>
                        高機能フィルターシステム
                        <span class="version-badge">Ver.2.0</span>
                    </h1>
                    <p class="system-subtitle">企業級品質・完全機能フィルタリングシステム</p>
                </div>
                <div class="header-right">
                    <div class="performance-indicator">
                        <span class="performance-label">実行時間:</span>
                        <span class="performance-value"><?= $executionTime ?>ms</span>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" onclick="openImportModal()">
                            <i class="fas fa-upload"></i> インポート
                        </button>
                        <button class="btn btn-success" onclick="exportKeywords()">
                            <i class="fas fa-download"></i> エクスポート
                        </button>
                        <button class="btn btn-info" onclick="openAnalyticsModal()">
                            <i class="fas fa-chart-line"></i> 分析
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- ========== 統計ダッシュボード ========== -->
        <section class="statistics-dashboard">
            <div class="stats-grid">
                <div class="stat-card primary">
                    <div class="stat-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value"><?= number_format($stats['total_keywords'] ?? 0) ?></div>
                        <div class="stat-label">総キーワード数</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-arrow-up"></i> +<?= $stats['keywords_growth'] ?? '0' ?>%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card success">
                    <div class="stat-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value"><?= number_format($stats['active_keywords'] ?? 0) ?></div>
                        <div class="stat-label">有効キーワード</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-arrow-up"></i> +<?= $stats['active_growth'] ?? '0' ?>%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card warning">
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value"><?= number_format($stats['high_risk_keywords'] ?? 0) ?></div>
                        <div class="stat-label">高リスクキーワード</div>
                        <div class="stat-trend neutral">
                            <i class="fas fa-minus"></i> <?= $stats['risk_change'] ?? '0' ?>%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card info">
                    <div class="stat-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value"><?= number_format($stats['monthly_detections'] ?? 0) ?></div>
                        <div class="stat-label">月間検出数</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-arrow-up"></i> +<?= $stats['detection_growth'] ?? '0' ?>%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card danger">
                    <div class="stat-icon">
                        <i class="fas fa-ban"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value"><?= number_format($stats['blocked_today'] ?? 0) ?></div>
                        <div class="stat-label">本日ブロック数</div>
                        <div class="stat-trend negative">
                            <i class="fas fa-arrow-down"></i> -<?= $stats['blocked_change'] ?? '0' ?>%
                        </div>
                    </div>
                </div>
                
                <div class="stat-card secondary">
                    <div class="stat-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value"><?= $stats['avg_response_time'] ?? '0' ?>ms</div>
                        <div class="stat-label">平均応答時間</div>
                        <div class="stat-trend positive">
                            <i class="fas fa-arrow-down"></i> -<?= $stats['performance_improvement'] ?? '0' ?>%
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- ========== 検索・フィルタリング制御パネル ========== -->
        <section class="control-panel">
            <div class="control-panel-content">
                <!-- 検索セクション -->
                <div class="search-section">
                    <div class="search-container">
                        <div class="search-input-wrapper">
                            <input type="text" 
                                   id="searchInput" 
                                   class="search-input" 
                                   placeholder="キーワード、タイプ、カテゴリで検索..." 
                                   value="<?= htmlspecialchars($searchQuery) ?>">
                            <button class="search-btn" onclick="executeSearch()">
                                <i class="fas fa-search"></i>
                            </button>
                            <button class="search-clear-btn" onclick="clearSearch()" title="検索クリア">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="search-suggestions" id="searchSuggestions"></div>
                    </div>
                </div>

                <!-- フィルターセクション -->
                <div class="filter-section">
                    <div class="filter-controls">
                        <select id="typeFilter" class="filter-select" onchange="applyFilters()">
                            <option value="">全てのタイプ</option>
                            <option value="EXPORT" <?= $filterType === 'EXPORT' ? 'selected' : '' ?>>輸出禁止</option>
                            <option value="PATENT" <?= $filterType === 'PATENT' ? 'selected' : '' ?>>特許関連</option>
                            <option value="MALL" <?= $filterType === 'MALL' ? 'selected' : '' ?>>モール専用</option>
                            <option value="BRAND" <?= $filterType === 'BRAND' ? 'selected' : '' ?>>ブランド</option>
                        </select>

                        <select id="priorityFilter" class="filter-select" onchange="applyFilters()">
                            <option value="">全ての優先度</option>
                            <option value="HIGH">高リスク</option>
                            <option value="MEDIUM">中リスク</option>
                            <option value="LOW">低リスク</option>
                        </select>

                        <select id="statusFilter" class="filter-select" onchange="applyFilters()">
                            <option value="">全ての状態</option>
                            <option value="1">有効</option>
                            <option value="0">無効</option>
                        </select>
                    </div>

                    <div class="sort-controls">
                        <select id="sortBy" class="sort-select" onchange="applyFilters()">
                            <option value="created_at" <?= $sortBy === 'created_at' ? 'selected' : '' ?>>作成日</option>
                            <option value="updated_at" <?= $sortBy === 'updated_at' ? 'selected' : '' ?>>更新日</option>
                            <option value="keyword" <?= $sortBy === 'keyword' ? 'selected' : '' ?>>キーワード</option>
                            <option value="detection_count" <?= $sortBy === 'detection_count' ? 'selected' : '' ?>>検出数</option>
                            <option value="priority" <?= $sortBy === 'priority' ? 'selected' : '' ?>>優先度</option>
                        </select>

                        <button class="sort-direction-btn" onclick="toggleSortDirection()" title="並び順切替">
                            <i class="fas fa-sort-<?= strtolower($sortOrder) === 'asc' ? 'up' : 'down' ?>"></i>
                        </button>
                    </div>

                    <div class="view-controls">
                        <select id="pageSize" class="pagesize-select" onchange="changePageSize()">
                            <option value="10" <?= $pageSize === 10 ? 'selected' : '' ?>>10件</option>
                            <option value="25" <?= $pageSize === 25 ? 'selected' : '' ?>>25件</option>
                            <option value="50" <?= $pageSize === 50 ? 'selected' : '' ?>>50件</option>
                            <option value="100" <?= $pageSize === 100 ? 'selected' : '' ?>>100件</option>
                        </select>

                        <button class="refresh-btn" onclick="refreshData()" title="データ更新">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <!-- ========== 一括操作パネル ========== -->
        <section class="bulk-operations-panel" id="bulkPanel" style="display: none;">
            <div class="bulk-panel-content">
                <div class="bulk-selection-info">
                    <span class="selection-count">0</span> 件選択中
                </div>
                <div class="bulk-actions">
                    <button class="btn btn-sm btn-success" onclick="bulkActivate()">
                        <i class="fas fa-check"></i> 有効化
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="bulkDeactivate()">
                        <i class="fas fa-pause"></i> 無効化
                    </button>
                    <button class="btn btn-sm btn-info" onclick="bulkChangePriority()">
                        <i class="fas fa-flag"></i> 優先度変更
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="bulkDelete()">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                </div>
                <div class="bulk-close">
                    <button class="btn btn-sm btn-secondary" onclick="clearSelection()">
                        <i class="fas fa-times"></i> 選択解除
                    </button>
                </div>
            </div>
        </section>

        <!-- ========== データテーブル ========== -->
        <section class="data-section">
            <div class="data-table-container">
                <div class="table-header">
                    <div class="table-title">
                        キーワード管理テーブル
                        <span class="result-count"><?= number_format($totalCount) ?> 件中 <?= number_format(($currentPage - 1) * $pageSize + 1) ?> - <?= number_format(min($currentPage * $pageSize, $totalCount)) ?> 件表示</span>
                    </div>
                    <div class="table-loading" id="tableLoading" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i> 読み込み中...
                    </div>
                </div>

                <div class="table-wrapper">
                    <table class="advanced-data-table" id="dataTable">
                        <thead>
                            <tr>
                                <th class="select-col">
                                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                </th>
                                <th class="id-col">ID</th>
                                <th class="keyword-col">キーワード</th>
                                <th class="type-col">タイプ</th>
                                <th class="priority-col">優先度</th>
                                <th class="category-col">カテゴリ</th>
                                <th class="detection-col">検出数</th>
                                <th class="score-col">効果スコア</th>
                                <th class="status-col">状態</th>
                                <th class="updated-col">更新日</th>
                                <th class="actions-col">操作</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <?php if (!empty($keywords)): ?>
                                <?php foreach ($keywords as $keyword): ?>
                                <tr class="data-row" data-id="<?= $keyword['id'] ?>">
                                    <td class="select-col">
                                        <input type="checkbox" class="row-select" value="<?= $keyword['id'] ?>" onchange="updateBulkPanel()">
                                    </td>
                                    <td class="id-col">
                                        <span class="id-badge"><?= str_pad($keyword['id'], 4, '0', STR_PAD_LEFT) ?></span>
                                    </td>
                                    <td class="keyword-col">
                                        <div class="keyword-display">
                                            <span class="keyword-text" title="<?= htmlspecialchars($keyword['keyword']) ?>">
                                                <?= htmlspecialchars($keyword['keyword']) ?>
                                            </span>
                                            <?php if (!empty($keyword['description'])): ?>
                                                <div class="keyword-description">
                                                    <?= htmlspecialchars(mb_substr($keyword['description'], 0, 50)) ?>...
                                                </div>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td class="type-col">
                                        <span class="type-badge type-<?= strtolower($keyword['type']) ?>">
                                            <?= htmlspecialchars($keyword['type']) ?>
                                        </span>
                                    </td>
                                    <td class="priority-col">
                                        <span class="priority-badge priority-<?= strtolower($keyword['priority']) ?>">
                                            <?= htmlspecialchars($keyword['priority']) ?>
                                        </span>
                                    </td>
                                    <td class="category-col">
                                        <span class="category-tag">
                                            <?= htmlspecialchars($keyword['category'] ?? 'general') ?>
                                        </span>
                                    </td>
                                    <td class="detection-col">
                                        <div class="detection-stats">
                                            <span class="detection-count"><?= number_format($keyword['detection_count']) ?></span>
                                            <?php if (($keyword['recent_detections'] ?? 0) > 0): ?>
                                                <span class="recent-detections">+<?= $keyword['recent_detections'] ?></span>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                    <td class="score-col">
                                        <div class="effectiveness-score">
                                            <div class="score-value"><?= number_format($keyword['effectiveness_score'] ?? 0, 1) ?></div>
                                            <div class="score-bar">
                                                <div class="score-fill" style="width: <?= min(100, ($keyword['effectiveness_score'] ?? 0) * 10) ?>%"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="status-col">
                                        <div class="status-toggle">
                                            <input type="checkbox" 
                                                   class="status-switch" 
                                                   <?= $keyword['is_active'] ? 'checked' : '' ?>
                                                   onchange="toggleStatus(<?= $keyword['id'] ?>, this.checked)">
                                            <label class="switch-label"></label>
                                        </div>
                                    </td>
                                    <td class="updated-col">
                                        <div class="datetime-display">
                                            <div class="date"><?= date('Y-m-d', strtotime($keyword['updated_at'])) ?></div>
                                            <div class="time"><?= date('H:i', strtotime($keyword['updated_at'])) ?></div>
                                        </div>
                                    </td>
                                    <td class="actions-col">
                                        <div class="action-buttons">
                                            <button class="btn btn-xs btn-primary" onclick="editKeyword(<?= $keyword['id'] ?>)" title="編集">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-xs btn-info" onclick="viewDetails(<?= $keyword['id'] ?>)" title="詳細">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            <button class="btn btn-xs btn-success" onclick="testKeyword(<?= $keyword['id'] ?>)" title="テスト">
                                                <i class="fas fa-vial"></i>
                                            </button>
                                            <button class="btn btn-xs btn-danger" onclick="deleteKeyword(<?= $keyword['id'] ?>)" title="削除">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <tr class="no-data-row">
                                    <td colspan="11" class="no-data-message">
                                        <div class="no-data-content">
                                            <i class="fas fa-search-minus"></i>
                                            <h3>データが見つかりません</h3>
                                            <p>検索条件を変更するか、新しいキーワードを追加してください。</p>
                                            <button class="btn btn-primary" onclick="openAddModal()">
                                                <i class="fas fa-plus"></i> キーワード追加
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        <!-- ========== ページネーション ========== -->
        <?php if ($totalCount > $pageSize): ?>
        <section class="pagination-section">
            <div class="pagination-container">
                <?= $paginationEngine->renderAdvancedPagination($pagination, $currentPage, $totalCount, $pageSize) ?>
            </div>
        </section>
        <?php endif; ?>

        <!-- ========== フッター情報 ========== -->
        <footer class="system-footer">
            <div class="footer-content">
                <div class="footer-left">
                    <p class="system-info">
                        高機能フィルターシステム Ver.2.0 | 
                        総レコード数: <?= number_format($totalCount) ?> | 
                        実行時間: <?= $executionTime ?>ms
                    </p>
                </div>
                <div class="footer-right">
                    <p class="last-update">
                        最終更新: <?= date('Y-m-d H:i:s') ?>
                    </p>
                </div>
            </div>
        </footer>
    </div>

    <!-- ========== モーダル・ダイアログ ========== -->
    <!-- インポートモーダル -->
    <div class="modal" id="importModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>キーワードインポート</h3>
                <button class="modal-close" onclick="closeModal('importModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="import-options">
                    <div class="import-method">
                        <input type="radio" id="importCSV" name="importType" value="csv" checked>
                        <label for="importCSV">CSVファイル</label>
                    </div>
                    <div class="import-method">
                        <input type="radio" id="importJSON" name="importType" value="json">
                        <label for="importJSON">JSONファイル</label>
                    </div>
                    <div class="import-method">
                        <input type="radio" id="importText" name="importType" value="text">
                        <label for="importText">テキスト入力</label>
                    </div>
                </div>
                <div class="file-drop-zone" id="fileDropZone">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>ファイルをドロップするか、クリックして選択</p>
                    <input type="file" id="importFile" accept=".csv,.json,.txt" style="display: none;">
                </div>
                <div class="import-progress" id="importProgress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">インポート中...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('importModal')">キャンセル</button>
                <button class="btn btn-primary" onclick="executeImport()">インポート実行</button>
            </div>
        </div>
    </div>

    <!-- エクスポートモーダル -->
    <div class="modal" id="exportModal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>データエクスポート</h3>
                <button class="modal-close" onclick="closeModal('exportModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <div class="format-selection">
                        <h4>出力形式</h4>
                        <div class="format-options">
                            <label><input type="radio" name="exportFormat" value="csv" checked> CSV</label>
                            <label><input type="radio" name="exportFormat" value="json"> JSON</label>
                            <label><input type="radio" name="exportFormat" value="xlsx"> Excel</label>
                        </div>
                    </div>
                    <div class="data-selection">
                        <h4>出力データ</h4>
                        <div class="data-options">
                            <label><input type="radio" name="exportScope" value="all" checked> 全てのデータ</label>
                            <label><input type="radio" name="exportScope" value="filtered"> 現在のフィルター結果</label>
                            <label><input type="radio" name="exportScope" value="selected"> 選択されたデータ</label>
                        </div>
                    </div>
                    <div class="column-selection">
                        <h4>出力カラム</h4>
                        <div class="column-checkboxes">
                            <label><input type="checkbox" checked> キーワード</label>
                            <label><input type="checkbox" checked> タイプ</label>
                            <label><input type="checkbox" checked> 優先度</label>
                            <label><input type="checkbox"> 検出数</label>
                            <label><input type="checkbox"> 効果スコア</label>
                            <label><input type="checkbox"> 作成日</label>
                        </div>
                    </div>
                </div>
                <div class="export-progress" id="exportProgress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">エクスポート中...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal('exportModal')">キャンセル</button>
                <button class="btn btn-primary" onclick="executeExport()">エクスポート実行</button>
            </div>
        </div>
    </div>

    <!-- JavaScript読み込み -->
    <script src="../shared/js/common.js"></script>
    <script src="assets/js/advanced-filters.js"></script>
    <script src="assets/js/pagination-engine.js"></script>
    <script src="assets/js/search-engine.js"></script>
    <script src="assets/js/bulk-operations.js"></script>
    <script src="assets/js/modal-manager.js"></script>
    <script src="assets/js/export-engine.js"></script>

    <!-- システム初期化 -->
    <script>
        // システム初期化
        document.addEventListener('DOMContentLoaded', function() {
            FilterSystem.init({
                currentPage: <?= $currentPage ?>,
                pageSize: <?= $pageSize ?>,
                totalCount: <?= $totalCount ?>,
                csrfToken: '<?= $_SESSION['csrf_token'] ?>'
            });
            
            // パフォーマンス監視
            PerformanceMonitor.init();
            
            // 自動保存・更新機能
            AutoSave.init();
            
            console.log('高機能フィルターシステム Ver.2.0 初期化完了');
        });
    </script>
</body>
</html>
