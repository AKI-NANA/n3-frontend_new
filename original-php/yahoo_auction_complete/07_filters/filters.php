<?php
/**
 * 5段階フィルターシステム with ページネーション - Yahoo Auction Tool
 * パテントトロール・輸出禁止・国別禁止・モール別禁止・VERO禁止の統合管理
 * データベース連携版 + 高機能ページネーション
 */

require_once '../shared/core/includes.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// パラメータ取得
$currentPage = max(1, (int)($_GET['page'] ?? 1));
$pageSize = max(10, min(100, (int)($_GET['page_size'] ?? 25)));
$searchQuery = trim($_GET['search'] ?? '');
$activeTab = $_GET['tab'] ?? 'export';
$sortBy = $_GET['sort_by'] ?? 'id';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC');

// データベース接続確認とデータ取得
$dbConnected = false;
$realStats = [];
$paginatedData = ['data' => [], 'total' => 0, 'pages' => 0];

try {
    require_once '../shared/core/database.php';
    $db = Database::getInstance();
    $pdo = $db->getPDO();
    $dbConnected = true;
    
    // 実際の統計データ取得
    $realStats = getRealFilterStatistics($pdo);
    
    // ページネーション付きデータ取得
    $paginatedData = getPaginatedData($pdo, $activeTab, $currentPage, $pageSize, $searchQuery, $sortBy, $sortOrder);
    
} catch (Exception $e) {
    $dbConnected = false;
    error_log('Database connection failed: ' . $e->getMessage());
    
    // フォールバック用のサンプル統計
    $realStats = [
        'export' => ['total_keywords' => 0, 'total_detections' => 0, 'accuracy' => 0, 'last_updated' => 'N/A'],
        'patent_troll' => ['total_cases' => 0, 'high_risk' => 0, 'new_this_week' => 0, 'last_scraped' => 'N/A'],
        'country' => ['total_countries' => 0, 'total_restrictions' => 0, 'new_this_month' => 0, 'last_updated' => 'N/A'],
        'mall' => ['total_malls' => 0, 'total_restrictions' => 0, 'updates_this_week' => 0, 'last_sync' => 'N/A'],
        'vero' => ['total_brands' => 0, 'protected_keywords' => 0, 'new_this_week' => 0, 'last_scraped' => 'N/A']
    ];
}

/**
 * 実際の統計データ取得
 */
function getRealFilterStatistics($pdo) {
    $stats = [];
    
    // 輸出禁止統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_keywords,
                COALESCE(SUM(detection_count), 0) as total_detections,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_keywords
            FROM filter_keywords 
            WHERE type = 'EXPORT'
        ");
        $export = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['export'] = [
            'total_keywords' => $export['total_keywords'],
            'total_detections' => $export['total_detections'],
            'accuracy' => $export['total_keywords'] > 0 ? round(($export['active_keywords'] / $export['total_keywords']) * 100, 1) : 0,
            'last_updated' => '1分前'
        ];
    } catch (Exception $e) {
        $stats['export'] = ['total_keywords' => 0, 'total_detections' => 0, 'accuracy' => 0, 'last_updated' => 'エラー'];
    }
    
    // パテントトロール統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_cases,
                COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_risk,
                COUNT(CASE WHEN case_date >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week
            FROM patent_troll_cases 
            WHERE is_active = TRUE
        ");
        $patent = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['patent_troll'] = [
            'total_cases' => $patent['total_cases'],
            'high_risk' => $patent['high_risk'],
            'new_this_week' => $patent['new_this_week'],
            'last_scraped' => '6時間前'
        ];
    } catch (Exception $e) {
        $stats['patent_troll'] = ['total_cases' => 0, 'high_risk' => 0, 'new_this_week' => 0, 'last_scraped' => 'エラー'];
    }
    
    // 国別規制統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(DISTINCT country_code) as total_countries,
                COUNT(*) as total_restrictions
            FROM country_restrictions 
            WHERE is_active = TRUE
        ");
        $country = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['country'] = [
            'total_countries' => $country['total_countries'],
            'total_restrictions' => $country['total_restrictions'],
            'new_this_month' => 0,
            'last_updated' => '1日前'
        ];
    } catch (Exception $e) {
        $stats['country'] = ['total_countries' => 0, 'total_restrictions' => 0, 'new_this_month' => 0, 'last_updated' => 'エラー'];
    }
    
    // モール別規制統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(DISTINCT mall_name) as total_malls,
                COUNT(*) as total_restrictions
            FROM filter_keywords 
            WHERE type = 'MALL_SPECIFIC' AND is_active = TRUE
        ");
        $mall = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['mall'] = [
            'total_malls' => $mall['total_malls'],
            'total_restrictions' => $mall['total_restrictions'],
            'updates_this_week' => 0,
            'last_sync' => '3時間前'
        ];
    } catch (Exception $e) {
        $stats['mall'] = ['total_malls' => 0, 'total_restrictions' => 0, 'updates_this_week' => 0, 'last_sync' => 'エラー'];
    }
    
    // VERO統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_brands
            FROM vero_participants 
            WHERE status = 'ACTIVE'
        ");
        $vero = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['vero'] = [
            'total_brands' => $vero['total_brands'],
            'protected_keywords' => $vero['total_brands'] * 50, // 概算
            'new_this_week' => 0,
            'last_scraped' => '12時間前'
        ];
    } catch (Exception $e) {
        $stats['vero'] = ['total_brands' => 0, 'protected_keywords' => 0, 'new_this_week' => 0, 'last_scraped' => 'エラー'];
    }
    
    return $stats;
}

/**
 * ページネーション付きデータ取得
 */
function getPaginatedData($pdo, $activeTab, $page, $pageSize, $search, $sortBy, $sortOrder) {
    try {
        $offset = ($page - 1) * $pageSize;
        
        // テーブルとクエリの選択
        switch ($activeTab) {
            case 'export':
                $baseQuery = "FROM filter_keywords WHERE type = 'EXPORT'";
                $selectFields = "id, keyword, priority, detection_count, created_at, is_active";
                break;
                
            case 'patent-troll':
                $baseQuery = "FROM patent_troll_cases WHERE is_active = TRUE";
                $selectFields = "id, case_title, patent_number, plaintiff, risk_level, case_date";
                break;
                
            case 'country':
                $baseQuery = "FROM country_restrictions WHERE is_active = TRUE";
                $selectFields = "id, country_code, country_name, restriction_type, description, effective_date";
                break;
                
            case 'mall':
                $baseQuery = "FROM filter_keywords WHERE type = 'MALL_SPECIFIC' AND is_active = TRUE";
                $selectFields = "id, keyword, mall_name, priority, detection_count, created_at";
                break;
                
            case 'vero':
                $baseQuery = "FROM vero_participants WHERE status = 'ACTIVE'";
                $selectFields = "id, brand_name, company_name, vero_id, protected_keywords, status";
                break;
                
            default:
                $baseQuery = "FROM filter_keywords WHERE type = 'EXPORT'";
                $selectFields = "id, keyword, priority, detection_count, created_at, is_active";
        }
        
        // 検索条件
        $whereClause = "";
        $params = [];
        if (!empty($search)) {
            if ($activeTab === 'export' || $activeTab === 'mall') {
                $whereClause = " AND keyword ILIKE ?";
                $params[] = "%$search%";
            } elseif ($activeTab === 'patent-troll') {
                $whereClause = " AND case_title ILIKE ?";
                $params[] = "%$search%";
            } elseif ($activeTab === 'country') {
                $whereClause = " AND (country_name ILIKE ? OR restriction_type ILIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            } elseif ($activeTab === 'vero') {
                $whereClause = " AND brand_name ILIKE ?";
                $params[] = "%$search%";
            }
        }
        
        // 総件数取得
        $countQuery = "SELECT COUNT(*) " . $baseQuery . $whereClause;
        $stmt = $pdo->prepare($countQuery);
        $stmt->execute($params);
        $totalCount = $stmt->fetchColumn();
        
        // データ取得
        $dataQuery = "SELECT $selectFields " . $baseQuery . $whereClause . " ORDER BY $sortBy $sortOrder LIMIT $pageSize OFFSET $offset";
        $stmt = $pdo->prepare($dataQuery);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'data' => $data,
            'total' => $totalCount,
            'pages' => ceil($totalCount / $pageSize),
            'current_page' => $page,
            'page_size' => $pageSize
        ];
        
    } catch (Exception $e) {
        error_log('Pagination query failed: ' . $e->getMessage());
        return ['data' => [], 'total' => 0, 'pages' => 0, 'current_page' => 1, 'page_size' => $pageSize];
    }
}

// ページネーション情報計算
$startRecord = ($currentPage - 1) * $pageSize + 1;
$endRecord = min($currentPage * $pageSize, $paginatedData['total']);
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>5段階フィルターシステム with ページネーション - Yahoo Auction Tool</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token']; ?>">
    <style>
        :root {
            --primary-color: #2563eb;
            --secondary-color: #64748b;
            --success-color: #16a34a;
            --warning-color: #d97706;
            --danger-color: #dc2626;
            --info-color: #0891b2;
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-tertiary: #f1f5f9;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --border-color: #e2e8f0;
            --radius-sm: 4px;
            --radius-md: 8px;
            --radius-lg: 12px;
            --space-xs: 0.25rem;
            --space-sm: 0.5rem;
            --space-md: 1rem;
            --space-lg: 1.5rem;
            --space-xl: 2rem;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: var(--bg-primary); 
            color: var(--text-primary); 
        }

        .container { max-width: 1400px; margin: 0 auto; padding: var(--space-lg); }
        
        /* ヘッダー */
        .header { 
            text-align: center; 
            margin-bottom: var(--space-xl);
            padding: var(--space-xl) 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: var(--radius-lg);
            color: white;
        }
        .header h1 { 
            font-size: 2.5rem;
            margin-bottom: var(--space-sm); 
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header p { 
            font-size: 1.1rem;
            opacity: 0.9;
        }

        /* 検索・制御パネル */
        .controls-panel {
            background: var(--bg-secondary);
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-lg);
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-md);
            align-items: center;
        }

        .search-box {
            flex: 1;
            min-width: 250px;
        }

        .search-box input {
            width: 100%;
            padding: 12px 20px;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            font-size: 16px;
        }

        .search-box input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .control-group {
            display: flex;
            gap: var(--space-sm);
            align-items: center;
        }

        .control-select {
            padding: 10px 16px;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            background: white;
            font-size: 14px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: var(--radius-md);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: var(--space-xs);
        }

        .btn-primary { background: var(--primary-color); color: white; }
        .btn-primary:hover { background: #1d4ed8; }

        /* フィルタータブシステム */
        .filter-tabs {
            display: flex;
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            padding: var(--space-xs);
            margin-bottom: var(--space-lg);
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-x: auto;
        }

        .tab-button {
            flex: 1;
            min-width: 160px;
            padding: var(--space-md);
            border: none;
            background: transparent;
            cursor: pointer;
            border-radius: var(--radius-md);
            font-weight: 500;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            font-size: 0.9rem;
            text-decoration: none;
            color: inherit;
        }

        .tab-button.active {
            background: var(--primary-color);
            color: white;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }

        .tab-button:not(.active):hover {
            background: rgba(37, 99, 235, 0.1);
        }

        /* 統計ダッシュボード */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }

        .stat-card {
            background: var(--bg-primary);
            padding: var(--space-lg);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            text-align: center;
            transition: transform 0.2s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .stat-card:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: var(--space-xs);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        /* データテーブル */
        .data-table-container {
            background: var(--bg-primary);
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 1px solid var(--border-color);
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            margin-bottom: var(--space-lg);
        }

        .table-header {
            padding: var(--space-lg);
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-tertiary);
        }

        .table-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: var(--space-xs);
        }

        .table-subtitle {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
        }

        .data-table th {
            background: var(--bg-tertiary);
            padding: var(--space-md);
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid var(--border-color);
            font-size: 0.8rem;
        }

        .data-table td {
            padding: var(--space-md);
            border-bottom: 1px solid var(--border-color);
        }

        .data-table tbody tr:hover {
            background: rgba(37, 99, 235, 0.05);
        }

        /* ページネーション */
        .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-lg);
            background: var(--bg-secondary);
            border-radius: var(--radius-lg);
            margin-bottom: var(--space-lg);
        }

        .pagination-info {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .pagination {
            display: flex;
            gap: var(--space-xs);
            align-items: center;
        }

        .pagination a, .pagination span {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            text-decoration: none;
            color: var(--text-secondary);
            transition: all 0.3s;
            font-size: 0.9rem;
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

        .pagination .disabled {
            opacity: 0.5;
            pointer-events: none;
        }

        .page-size-controls {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        /* ステータスバッジ */
        .status-badge {
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-active { background: var(--success-color); color: white; }
        .status-inactive { background: var(--text-muted); color: white; }
        .risk-high { background: var(--danger-color); color: white; }
        .risk-medium { background: var(--warning-color); color: white; }
        .risk-low { background: var(--info-color); color: white; }
        .priority-high { background: var(--danger-color); color: white; }
        .priority-medium { background: var(--warning-color); color: white; }
        .priority-low { background: var(--info-color); color: white; }

        /* レスポンシブ対応 */
        @media (max-width: 768px) {
            .controls-panel {
                flex-direction: column;
                align-items: stretch;
            }
            
            .search-box {
                min-width: auto;
            }
            
            .pagination-container {
                flex-direction: column;
                gap: var(--space-md);
            }
            
            .filter-tabs {
                flex-direction: column;
            }
            
            .tab-button {
                min-width: auto;
                justify-content: flex-start;
            }
        }

        .no-data {
            text-align: center;
            padding: 3rem;
            color: var(--text-muted);
        }

        .no-data i {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-shield-alt"></i> 5段階フィルターシステム</h1>
            <p>パテントトロール・輸出禁止・国別禁止・モール別禁止・VERO禁止の統合管理 with ページネーション</p>
        </div>

        <!-- データベース接続状況 -->
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: <?php echo $dbConnected ? '#dcfce7' : '#fee2e2'; ?>; border-radius: 8px; text-align: center;">
            <i class="fas fa-database"></i> 
            データベース: <?php echo $dbConnected ? '<span style="color: #166534;">接続中</span>' : '<span style="color: #991b1b;">切断中（サンプルデータ表示）</span>'; ?>
            <?php if ($dbConnected): ?>
                | 現在のタブ: <strong><?php echo ucfirst($activeTab); ?></strong> | 
                総件数: <strong><?php echo number_format($paginatedData['total']); ?></strong>件
            <?php endif; ?>
        </div>

        <!-- 検索・制御パネル -->
        <div class="controls-panel">
            <form method="GET" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; width: 100%;">
                <input type="hidden" name="tab" value="<?php echo htmlspecialchars($activeTab); ?>">
                
                <div class="search-box">
                    <input type="text" 
                           name="search" 
                           value="<?php echo htmlspecialchars($searchQuery); ?>" 
                           placeholder="キーワードで検索...">
                </div>
                
                <div class="control-group">
                    <select name="page_size" class="control-select">
                        <option value="10" <?php echo $pageSize === 10 ? 'selected' : ''; ?>>10件</option>
                        <option value="25" <?php echo $pageSize === 25 ? 'selected' : ''; ?>>25件</option>
                        <option value="50" <?php echo $pageSize === 50 ? 'selected' : ''; ?>>50件</option>
                        <option value="100" <?php echo $pageSize === 100 ? 'selected' : ''; ?>>100件</option>
                    </select>
                </div>
                
                <div class="control-group">
                    <select name="sort_by" class="control-select">
                        <option value="id" <?php echo $sortBy === 'id' ? 'selected' : ''; ?>>ID順</option>
                        <option value="created_at" <?php echo $sortBy === 'created_at' ? 'selected' : ''; ?>>作成日順</option>
                        <?php if ($activeTab === 'export' || $activeTab === 'mall'): ?>
                            <option value="detection_count" <?php echo $sortBy === 'detection_count' ? 'selected' : ''; ?>>検出数順</option>
                        <?php endif; ?>
                    </select>
                    
                    <select name="sort_order" class="control-select">
                        <option value="DESC" <?php echo $sortOrder === 'DESC' ? 'selected' : ''; ?>>降順</option>
                        <option value="ASC" <?php echo $sortOrder === 'ASC' ? 'selected' : ''; ?>>昇順</option>
                    </select>
                </div>
                
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-search"></i> 検索
                </button>
            </form>
        </div>

        <!-- フィルタータブ -->
        <div class="filter-tabs">
            <a href="?tab=export&page_size=<?php echo $pageSize; ?>" class="tab-button <?php echo $activeTab === 'export' ? 'active' : ''; ?>">
                <i class="fas fa-ban"></i>
                輸出禁止 (<?php echo $realStats['export']['total_keywords'] ?? 0; ?>)
            </a>
            <a href="?tab=patent-troll&page_size=<?php echo $pageSize; ?>" class="tab-button <?php echo $activeTab === 'patent-troll' ? 'active' : ''; ?>">
                <i class="fas fa-gavel"></i>
                パテントトロール (<?php echo $realStats['patent_troll']['total_cases'] ?? 0; ?>)
            </a>
            <a href="?tab=country&page_size=<?php echo $pageSize; ?>" class="tab-button <?php echo $activeTab === 'country' ? 'active' : ''; ?>">
                <i class="fas fa-globe"></i>
                国別禁止 (<?php echo $realStats['country']['total_restrictions'] ?? 0; ?>)
            </a>
            <a href="?tab=mall&page_size=<?php echo $pageSize; ?>" class="tab-button <?php echo $activeTab === 'mall' ? 'active' : ''; ?>">
                <i class="fas fa-store"></i>
                モール別禁止 (<?php echo $realStats['mall']['total_restrictions'] ?? 0; ?>)
            </a>
            <a href="?tab=vero&page_size=<?php echo $pageSize; ?>" class="tab-button <?php echo $activeTab === 'vero' ? 'active' : ''; ?>">
                <i class="fas fa-copyright"></i>
                VERO禁止 (<?php echo $realStats['vero']['total_brands'] ?? 0; ?>)
            </a>
        </div>

        <!-- 統計ダッシュボード -->
        <div class="stats-grid">
            <?php
            $currentStats = $realStats[$activeTab === 'patent-troll' ? 'patent_troll' : $activeTab] ?? [];
            ?>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--primary-color);"><?php echo number_format($paginatedData['total'] ?? 0); ?></div>
                <div class="stat-label">現在の表示データ</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--success-color);"><?php echo $paginatedData['pages'] ?? 0; ?></div>
                <div class="stat-label">総ページ数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--warning-color);"><?php echo $currentPage; ?></div>
                <div class="stat-label">現在のページ</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: var(--info-color);"><?php echo $pageSize; ?></div>
                <div class="stat-label">ページサイズ</div>
            </div>
        </div>

        <!-- データテーブル -->
        <div class="data-table-container">
            <div class="table-header">
                <div class="table-title"><?php echo ucfirst($activeTab); ?> データ一覧</div>
                <div class="table-subtitle">
                    <?php echo number_format($paginatedData['total']); ?>件中 
                    <?php echo number_format($startRecord); ?>-<?php echo number_format($endRecord); ?>件を表示
                </div>
            </div>

            <?php if (!empty($paginatedData['data'])): ?>
            <table class="data-table">
                <thead>
                    <tr>
                        <?php if ($activeTab === 'export'): ?>
                            <th>ID</th>
                            <th>キーワード</th>
                            <th>優先度</th>
                            <th>検出回数</th>
                            <th>登録日</th>
                            <th>ステータス</th>
                        <?php elseif ($activeTab === 'patent-troll'): ?>
                            <th>ID</th>
                            <th>事例タイトル</th>
                            <th>特許番号</th>
                            <th>原告</th>
                            <th>リスクレベル</th>
                            <th>発生日</th>
                        <?php elseif ($activeTab === 'country'): ?>
                            <th>ID</th>
                            <th>国名</th>
                            <th>規制タイプ</th>
                            <th>規制内容</th>
                            <th>施行日</th>
                        <?php elseif ($activeTab === 'mall'): ?>
                            <th>ID</th>
                            <th>キーワード</th>
                            <th>モール名</th>
                            <th>優先度</th>
                            <th>検出回数</th>
                            <th>登録日</th>
                        <?php elseif ($activeTab === 'vero'): ?>
                            <th>ID</th>
                            <th>ブランド名</th>
                            <th>会社名</th>
                            <th>VERO ID</th>
                            <th>保護キーワード</th>
                            <th>ステータス</th>
                        <?php endif; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($paginatedData['data'] as $row): ?>
                    <tr>
                        <?php if ($activeTab === 'export'): ?>
                            <td><?php echo htmlspecialchars($row['id']); ?></td>
                            <td><strong><?php echo htmlspecialchars($row['keyword']); ?></strong></td>
                            <td>
                                <span class="status-badge priority-<?php echo strtolower($row['priority']); ?>">
                                    <?php echo $row['priority']; ?>
                                </span>
                            </td>
                            <td><?php echo number_format($row['detection_count']); ?></td>
                            <td><?php echo date('Y-m-d', strtotime($row['created_at'])); ?></td>
                            <td>
                                <span class="status-badge <?php echo $row['is_active'] ? 'status-active' : 'status-inactive'; ?>">
                                    <?php echo $row['is_active'] ? '有効' : '無効'; ?>
                                </span>
                            </td>
                        <?php elseif ($activeTab === 'patent-troll'): ?>
                            <td><?php echo htmlspecialchars($row['id']); ?></td>
                            <td><strong><?php echo htmlspecialchars($row['case_title']); ?></strong></td>
                            <td><?php echo htmlspecialchars($row['patent_number'] ?? 'N/A'); ?></td>
                            <td><?php echo htmlspecialchars($row['plaintiff'] ?? 'N/A'); ?></td>
                            <td>
                                <span class="status-badge risk-<?php echo strtolower($row['risk_level']); ?>">
                                    <?php echo $row['risk_level']; ?>
                                </span>
                            </td>
                            <td><?php echo $row['case_date'] ? date('Y-m-d', strtotime($row['case_date'])) : 'N/A'; ?></td>
                        <?php elseif ($activeTab === 'country'): ?>
                            <td><?php echo htmlspecialchars($row['id']); ?></td>
                            <td>
                                <strong><?php echo htmlspecialchars($row['country_name']); ?></strong>
                                <small style="color: var(--text-muted); display: block;"><?php echo htmlspecialchars($row['country_code']); ?></small>
                            </td>
                            <td><?php echo htmlspecialchars($row['restriction_type']); ?></td>
                            <td><?php echo htmlspecialchars($row['description'] ?? ''); ?></td>
                            <td><?php echo $row['effective_date'] ? date('Y-m-d', strtotime($row['effective_date'])) : 'N/A'; ?></td>
                        <?php elseif ($activeTab === 'mall'): ?>
                            <td><?php echo htmlspecialchars($row['id']); ?></td>
                            <td><strong><?php echo htmlspecialchars($row['keyword']); ?></strong></td>
                            <td><?php echo htmlspecialchars($row['mall_name']); ?></td>
                            <td>
                                <span class="status-badge priority-<?php echo strtolower($row['priority']); ?>">
                                    <?php echo $row['priority']; ?>
                                </span>
                            </td>
                            <td><?php echo number_format($row['detection_count']); ?></td>
                            <td><?php echo date('Y-m-d', strtotime($row['created_at'])); ?></td>
                        <?php elseif ($activeTab === 'vero'): ?>
                            <td><?php echo htmlspecialchars($row['id']); ?></td>
                            <td><strong><?php echo htmlspecialchars($row['brand_name']); ?></strong></td>
                            <td><?php echo htmlspecialchars($row['company_name']); ?></td>
                            <td><?php echo htmlspecialchars($row['vero_id'] ?? 'N/A'); ?></td>
                            <td>
                                <small style="color: var(--text-muted);">
                                    <?php 
                                    $keywords = $row['protected_keywords'] ?? '';
                                    echo htmlspecialchars(mb_substr($keywords, 0, 50) . (mb_strlen($keywords) > 50 ? '...' : ''));
                                    ?>
                                </small>
                            </td>
                            <td>
                                <span class="status-badge status-active">
                                    <?php echo $row['status']; ?>
                                </span>
                            </td>
                        <?php endif; ?>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php else: ?>
            <div class="no-data">
                <i class="fas fa-search"></i>
                <h3>データが見つかりません</h3>
                <p>検索条件を変更するか、データベースをご確認ください</p>
            </div>
            <?php endif; ?>
        </div>

        <!-- ページネーション -->
        <?php if ($paginatedData['pages'] > 1): ?>
        <div class="pagination-container">
            <div class="pagination-info">
                <?php echo number_format($paginatedData['total']); ?>件中 
                <?php echo number_format($startRecord); ?>-<?php echo number_format($endRecord); ?>件を表示
            </div>

            <div class="pagination">
                <?php if ($currentPage > 1): ?>
                    <a href="?tab=<?php echo urlencode($activeTab); ?>&page=1&page_size=<?php echo $pageSize; ?>&search=<?php echo urlencode($searchQuery); ?>&sort_by=<?php echo urlencode($sortBy); ?>&sort_order=<?php echo urlencode($sortOrder); ?>">
                        <i class="fas fa-angle-double-left"></i>
                    </a>
                    <a href="?tab=<?php echo urlencode($activeTab); ?>&page=<?php echo $currentPage - 1; ?>&page_size=<?php echo $pageSize; ?>&search=<?php echo urlencode($searchQuery); ?>&sort_by=<?php echo urlencode($sortBy); ?>&sort_order=<?php echo urlencode($sortOrder); ?>">
                        <i class="fas fa-angle-left"></i>
                    </a>
                <?php else: ?>
                    <span class="disabled"><i class="fas fa-angle-double-left"></i></span>
                    <span class="disabled"><i class="fas fa-angle-left"></i></span>
                <?php endif; ?>

                <?php
                $startPage = max(1, $currentPage - 2);
                $endPage = min($paginatedData['pages'], $currentPage + 2);
                for ($i = $startPage; $i <= $endPage; $i++):
                ?>
                    <?php if ($i === $currentPage): ?>
                        <span class="current"><?php echo $i; ?></span>
                    <?php else: ?>
                        <a href="?tab=<?php echo urlencode($activeTab); ?>&page=<?php echo $i; ?>&page_size=<?php echo $pageSize; ?>&search=<?php echo urlencode($searchQuery); ?>&sort_by=<?php echo urlencode($sortBy); ?>&sort_order=<?php echo urlencode($sortOrder); ?>">
                            <?php echo $i; ?>
                        </a>
                    <?php endif; ?>
                <?php endfor; ?>

                <?php if ($currentPage < $paginatedData['pages']): ?>
                    <a href="?tab=<?php echo urlencode($activeTab); ?>&page=<?php echo $currentPage + 1; ?>&page_size=<?php echo $pageSize; ?>&search=<?php echo urlencode($searchQuery); ?>&sort_by=<?php echo urlencode($sortBy); ?>&sort_order=<?php echo urlencode($sortOrder); ?>">
                        <i class="fas fa-angle-right"></i>
                    </a>
                    <a href="?tab=<?php echo urlencode($activeTab); ?>&page=<?php echo $paginatedData['pages']; ?>&page_size=<?php echo $pageSize; ?>&search=<?php echo urlencode($searchQuery); ?>&sort_by=<?php echo urlencode($sortBy); ?>&sort_order=<?php echo urlencode($sortOrder); ?>">
                        <i class="fas fa-angle-double-right"></i>
                    </a>
                <?php else: ?>
                    <span class="disabled"><i class="fas fa-angle-right"></i></span>
                    <span class="disabled"><i class="fas fa-angle-double-right"></i></span>
                <?php endif; ?>
            </div>

            <div class="page-size-controls">
                ページサイズ:
                <?php foreach ([10, 25, 50, 100] as $size): ?>
                    <?php if ($size === $pageSize): ?>
                        <span class="current"><?php echo $size; ?></span>
                    <?php else: ?>
                        <a href="?tab=<?php echo urlencode($activeTab); ?>&page=1&page_size=<?php echo $size; ?>&search=<?php echo urlencode($searchQuery); ?>&sort_by=<?php echo urlencode($sortBy); ?>&sort_order=<?php echo urlencode($sortOrder); ?>">
                            <?php echo $size; ?>
                        </a>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <script>
        // ページ読み込み時の初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('5段階フィルターシステム with ページネーション 初期化完了');
            console.log('データベース接続: <?php echo $dbConnected ? "true" : "false"; ?>');
            console.log('現在のタブ:', '<?php echo $activeTab; ?>');
            console.log('現在のページ:', <?php echo $currentPage; ?>);
            console.log('ページサイズ:', <?php echo $pageSize; ?>);
            console.log('総データ件数:', <?php echo $paginatedData['total']; ?>);
        });
    </script>
</body>
</html>
