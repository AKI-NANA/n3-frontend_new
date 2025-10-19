<?php
/**
 * 実用版フィルターシステム - データベース連携
 * nagano3_dbのデータを実際に表示
 */

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CSRFトークン生成
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// データベース接続
try {
    $pdo = new PDO("pgsql:host=localhost;dbname=nagano3_db", 'postgres', '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    $dbConnected = true;
} catch (Exception $e) {
    $pdo = null;
    $dbConnected = false;
    $dbError = $e->getMessage();
}

// パラメータ取得
$currentPage = max(1, (int)($_GET['page'] ?? 1));
$pageSize = max(10, min(100, (int)($_GET['page_size'] ?? 25)));
$searchQuery = trim($_GET['search'] ?? '');
$filterType = $_GET['filter_type'] ?? '';
$sortBy = $_GET['sort_by'] ?? 'id';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC');

// データ取得
$keywords = [];
$totalCount = 0;
$stats = [
    'total_keywords' => 0,
    'active_keywords' => 0,
    'high_risk_keywords' => 0,
    'export_count' => 0,
    'patent_count' => 0,
    'vero_count' => 0
];

if ($dbConnected) {
    try {
        // 統計データ取得
        $statsQuery = "SELECT 
            COUNT(*) as total_keywords,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_keywords,
            COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high_risk_keywords,
            COUNT(CASE WHEN type = 'EXPORT' THEN 1 END) as export_count,
            COUNT(CASE WHEN type = 'PATENT_TROLL' THEN 1 END) as patent_count,
            COUNT(CASE WHEN type = 'VERO' THEN 1 END) as vero_count
        FROM filter_keywords";
        
        $stmt = $pdo->query($statsQuery);
        $stats = array_merge($stats, $stmt->fetch());
        
        // WHERE条件構築
        $whereConditions = [];
        $params = [];
        
        if (!empty($searchQuery)) {
            $whereConditions[] = "(keyword ILIKE ? OR description ILIKE ?)";
            $params[] = "%$searchQuery%";
            $params[] = "%$searchQuery%";
        }
        
        if (!empty($filterType)) {
            $whereConditions[] = "type = ?";
            $params[] = $filterType;
        }
        
        $whereClause = empty($whereConditions) ? "" : "WHERE " . implode(" AND ", $whereConditions);
        
        // 総件数取得
        $countQuery = "SELECT COUNT(*) FROM filter_keywords $whereClause";
        $stmt = $pdo->prepare($countQuery);
        $stmt->execute($params);
        $totalCount = $stmt->fetchColumn();
        
        // データ取得（ページネーション）
        $offset = ($currentPage - 1) * $pageSize;
        $dataQuery = "SELECT * FROM filter_keywords $whereClause 
                     ORDER BY $sortBy $sortOrder 
                     LIMIT $pageSize OFFSET $offset";
        
        $stmt = $pdo->prepare($dataQuery);
        $stmt->execute($params);
        $keywords = $stmt->fetchAll();
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// ページネーション計算
$totalPages = ceil($totalCount / $pageSize);
$startRecord = ($currentPage - 1) * $pageSize + 1;
$endRecord = min($currentPage * $pageSize, $totalCount);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>実用版フィルターシステム - データベース連携</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-color: #2563eb;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-300: #d1d5db;
            --gray-600: #4b5563;
            --gray-800: #1f2937;
            --gray-900: #111827;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--gray-50);
            color: var(--gray-900);
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }

        .header h1 {
            color: var(--primary-color);
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
        }

        .header p {
            color: var(--gray-600);
            font-size: 1.1rem;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border-left: 4px solid var(--primary-color);
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 5px;
        }

        .stat-label {
            color: var(--gray-600);
            font-weight: 500;
        }

        .controls {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            align-items: center;
        }

        .search-box {
            flex: 1;
            min-width: 300px;
        }

        .search-box input {
            width: 100%;
            padding: 12px 20px;
            border: 1px solid var(--gray-300);
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }

        .search-box input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .filter-select {
            padding: 12px 16px;
            border: 1px solid var(--gray-300);
            border-radius: 8px;
            background: white;
            font-size: 14px;
            cursor: pointer;
        }

        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: var(--primary-color);
            color: white;
        }

        .btn-primary:hover {
            background: #1d4ed8;
        }

        .data-table {
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .table-header {
            padding: 25px;
            border-bottom: 1px solid var(--gray-200);
        }

        .table-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--gray-900);
        }

        .result-count {
            color: var(--gray-600);
            font-size: 0.9rem;
            margin-top: 5px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 15px 20px;
            text-align: left;
            border-bottom: 1px solid var(--gray-200);
        }

        th {
            background: var(--gray-50);
            font-weight: 600;
            color: var(--gray-800);
        }

        tr:hover {
            background: var(--gray-50);
        }

        .type-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .type-export {
            background: #fef2f2;
            color: var(--danger-color);
        }

        .type-patent_troll {
            background: #fff7ed;
            color: var(--warning-color);
        }

        .type-vero {
            background: #f0f9ff;
            color: var(--primary-color);
        }

        .priority-badge {
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .priority-high {
            background: var(--danger-color);
            color: white;
        }

        .priority-medium {
            background: var(--warning-color);
            color: white;
        }

        .priority-low {
            background: var(--gray-400);
            color: white;
        }

        .status-active {
            color: var(--success-color);
            font-weight: 600;
        }

        .status-inactive {
            color: var(--gray-400);
            font-weight: 600;
        }

        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-top: 30px;
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .pagination a, .pagination span {
            padding: 10px 16px;
            border: 1px solid var(--gray-300);
            border-radius: 6px;
            text-decoration: none;
            color: var(--gray-600);
            transition: all 0.3s;
        }

        .pagination a:hover {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }

        .pagination .current {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }

        .error-message {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: var(--danger-color);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
        }

        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: var(--gray-600);
        }

        .no-data i {
            font-size: 4rem;
            color: var(--gray-300);
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            .controls {
                flex-direction: column;
                align-items: stretch;
            }
            
            .search-box {
                min-width: auto;
            }
            
            table {
                font-size: 0.9rem;
            }
            
            th, td {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-shield-alt"></i> 実用版フィルターシステム</h1>
            <p>nagano3_dbデータベースのフィルターキーワードを表示・管理</p>
            <?php if (!$dbConnected): ?>
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    データベース接続エラー: <?= htmlspecialchars($dbError ?? 'Unknown error') ?>
                </div>
            <?php endif; ?>
        </div>

        <?php if ($dbConnected): ?>
        <!-- 統計ダッシュボード -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value"><?= number_format($stats['total_keywords']) ?></div>
                <div class="stat-label">総キーワード数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= number_format($stats['active_keywords']) ?></div>
                <div class="stat-label">有効キーワード</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= number_format($stats['export_count']) ?></div>
                <div class="stat-label">輸出禁止</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= number_format($stats['patent_count']) ?></div>
                <div class="stat-label">パテントトロール</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= number_format($stats['vero_count']) ?></div>
                <div class="stat-label">VERO</div>
            </div>
            <div class="stat-card">
                <div class="stat-value"><?= number_format($stats['high_risk_keywords']) ?></div>
                <div class="stat-label">高リスク</div>
            </div>
        </div>

        <!-- 検索・フィルター -->
        <div class="controls">
            <form method="GET" style="display: flex; gap: 15px; flex-wrap: wrap; align-items: center; width: 100%;">
                <div class="search-box">
                    <input type="text" 
                           name="search" 
                           value="<?= htmlspecialchars($searchQuery) ?>" 
                           placeholder="キーワードで検索...">
                </div>
                
                <select name="filter_type" class="filter-select">
                    <option value="">全てのタイプ</option>
                    <option value="EXPORT" <?= $filterType === 'EXPORT' ? 'selected' : '' ?>>輸出禁止</option>
                    <option value="PATENT_TROLL" <?= $filterType === 'PATENT_TROLL' ? 'selected' : '' ?>>パテントトロール</option>
                    <option value="VERO" <?= $filterType === 'VERO' ? 'selected' : '' ?>>VERO</option>
                    <option value="COUNTRY_SPECIFIC" <?= $filterType === 'COUNTRY_SPECIFIC' ? 'selected' : '' ?>>国別禁止</option>
                    <option value="MALL_SPECIFIC" <?= $filterType === 'MALL_SPECIFIC' ? 'selected' : '' ?>>モール別禁止</option>
                </select>

                <select name="page_size" class="filter-select">
                    <option value="10" <?= $pageSize === 10 ? 'selected' : '' ?>>10件</option>
                    <option value="25" <?= $pageSize === 25 ? 'selected' : '' ?>>25件</option>
                    <option value="50" <?= $pageSize === 50 ? 'selected' : '' ?>>50件</option>
                    <option value="100" <?= $pageSize === 100 ? 'selected' : '' ?>>100件</option>
                </select>

                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-search"></i> 検索
                </button>
            </form>
        </div>

        <!-- データテーブル -->
        <div class="data-table">
            <div class="table-header">
                <div class="table-title">フィルターキーワード一覧</div>
                <div class="result-count">
                    <?= number_format($totalCount) ?>件中 <?= number_format($startRecord) ?>-<?= number_format($endRecord) ?>件を表示
                </div>
            </div>

            <?php if (!empty($keywords)): ?>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>キーワード</th>
                        <th>タイプ</th>
                        <th>優先度</th>
                        <th>検出数</th>
                        <th>状態</th>
                        <th>作成日</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($keywords as $keyword): ?>
                    <tr>
                        <td><?= htmlspecialchars($keyword['id']) ?></td>
                        <td>
                            <strong><?= htmlspecialchars($keyword['keyword']) ?></strong>
                            <?php if (!empty($keyword['description'])): ?>
                                <div style="color: var(--gray-600); font-size: 0.9rem; margin-top: 2px;">
                                    <?= htmlspecialchars(mb_substr($keyword['description'], 0, 100)) ?>...
                                </div>
                            <?php endif; ?>
                        </td>
                        <td>
                            <span class="type-badge type-<?= strtolower($keyword['type']) ?>">
                                <?= htmlspecialchars($keyword['type']) ?>
                            </span>
                        </td>
                        <td>
                            <span class="priority-badge priority-<?= strtolower($keyword['priority']) ?>">
                                <?= htmlspecialchars($keyword['priority']) ?>
                            </span>
                        </td>
                        <td><?= number_format($keyword['detection_count']) ?></td>
                        <td>
                            <span class="<?= $keyword['is_active'] ? 'status-active' : 'status-inactive' ?>">
                                <?= $keyword['is_active'] ? '有効' : '無効' ?>
                            </span>
                        </td>
                        <td><?= date('Y-m-d H:i', strtotime($keyword['created_at'])) ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php else: ?>
            <div class="no-data">
                <i class="fas fa-search"></i>
                <h3>データが見つかりません</h3>
                <p>検索条件を変更してください</p>
            </div>
            <?php endif; ?>
        </div>

        <!-- ページネーション -->
        <?php if ($totalPages > 1): ?>
        <div class="pagination">
            <?php if ($currentPage > 1): ?>
                <a href="?page=1<?= !empty($searchQuery) ? '&search=' . urlencode($searchQuery) : '' ?><?= !empty($filterType) ? '&filter_type=' . urlencode($filterType) : '' ?>&page_size=<?= $pageSize ?>">
                    <i class="fas fa-angle-double-left"></i>
                </a>
                <a href="?page=<?= $currentPage - 1 ?><?= !empty($searchQuery) ? '&search=' . urlencode($searchQuery) : '' ?><?= !empty($filterType) ? '&filter_type=' . urlencode($filterType) : '' ?>&page_size=<?= $pageSize ?>">
                    <i class="fas fa-angle-left"></i>
                </a>
            <?php endif; ?>

            <?php
            $startPage = max(1, $currentPage - 2);
            $endPage = min($totalPages, $currentPage + 2);
            for ($i = $startPage; $i <= $endPage; $i++):
            ?>
                <?php if ($i === $currentPage): ?>
                    <span class="current"><?= $i ?></span>
                <?php else: ?>
                    <a href="?page=<?= $i ?><?= !empty($searchQuery) ? '&search=' . urlencode($searchQuery) : '' ?><?= !empty($filterType) ? '&filter_type=' . urlencode($filterType) : '' ?>&page_size=<?= $pageSize ?>">
                        <?= $i ?>
                    </a>
                <?php endif; ?>
            <?php endfor; ?>

            <?php if ($currentPage < $totalPages): ?>
                <a href="?page=<?= $currentPage + 1 ?><?= !empty($searchQuery) ? '&search=' . urlencode($searchQuery) : '' ?><?= !empty($filterType) ? '&filter_type=' . urlencode($filterType) : '' ?>&page_size=<?= $pageSize ?>">
                    <i class="fas fa-angle-right"></i>
                </a>
                <a href="?page=<?= $totalPages ?><?= !empty($searchQuery) ? '&search=' . urlencode($searchQuery) : '' ?><?= !empty($filterType) ? '&filter_type=' . urlencode($filterType) : '' ?>&page_size=<?= $pageSize ?>">
                    <i class="fas fa-angle-double-right"></i>
                </a>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php else: ?>
        <div class="no-data">
            <i class="fas fa-database"></i>
            <h3>データベースに接続できません</h3>
            <p>PostgreSQL接続を確認してください</p>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
