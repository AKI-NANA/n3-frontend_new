<?php
/**
 * 高機能ページネーション拡張版フィルターシステム
 * Ajax対応・リアルタイム検索・一括操作・エクスポート機能付き
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

// Ajax リクエスト処理
if (isset($_GET['ajax']) && $_GET['ajax'] === '1') {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        require_once '../shared/core/database.php';
        $db = Database::getInstance();
        $pdo = $db->getPDO();
        
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'get_data':
                $result = handleAjaxDataRequest($pdo);
                echo json_encode($result);
                break;
                
            case 'bulk_action':
                $result = handleBulkAction($pdo);
                echo json_encode($result);
                break;
                
            case 'export':
                $result = handleExportRequest($pdo);
                echo json_encode($result);
                break;
                
            default:
                echo json_encode(['success' => false, 'message' => '不正なアクション']);
        }
        exit;
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        exit;
    }
}

// 通常のページ表示用パラメータ
$page = max(1, intval($_GET['page'] ?? 1));
$perPage = intval($_GET['per_page'] ?? 25);
$perPage = min(100, max(10, $perPage));

$searchKeyword = trim($_GET['search'] ?? '');
$filterType = $_GET['filter_type'] ?? 'export';
$priorityFilter = $_GET['priority'] ?? '';
$languageFilter = $_GET['language'] ?? '';
$statusFilter = $_GET['status'] ?? '';
$sortBy = $_GET['sort'] ?? 'detection_count';
$sortDir = $_GET['dir'] ?? 'desc';

// データベース接続とデータ取得
$dbConnected = false;
$realStats = [];
$paginatedData = ['data' => [], 'total' => 0, 'pages' => 0];

try {
    require_once '../shared/core/database.php';
    $db = Database::getInstance();
    $pdo = $db->getPDO();
    $dbConnected = true;
    
    $realStats = getRealFilterStatistics($pdo);
    $paginatedData = getPaginatedFilterData($pdo, $filterType, $page, $perPage, $searchKeyword, $priorityFilter, $languageFilter, $statusFilter, $sortBy, $sortDir);
    
} catch (Exception $e) {
    $dbConnected = false;
    error_log('Database connection failed: ' . $e->getMessage());
    
    // フォールバック用データ
    $realStats = getDefaultStats();
    $paginatedData = getDemoData($page, $perPage);
}

/**
 * Ajax データリクエスト処理
 */
function handleAjaxDataRequest($pdo) {
    $filters = [
        'filter_type' => $_GET['filter_type'] ?? 'export',
        'page' => max(1, intval($_GET['page'] ?? 1)),
        'per_page' => min(100, max(10, intval($_GET['per_page'] ?? 25))),
        'search' => trim($_GET['search'] ?? ''),
        'priority' => $_GET['priority'] ?? '',
        'language' => $_GET['language'] ?? '',
        'status' => $_GET['status'] ?? '',
        'sort' => $_GET['sort'] ?? 'detection_count',
        'dir' => $_GET['dir'] ?? 'desc'
    ];
    
    $data = getPaginatedFilterData($pdo, $filters['filter_type'], $filters['page'], 
        $filters['per_page'], $filters['search'], $filters['priority'], 
        $filters['language'], $filters['status'], $filters['sort'], $filters['dir']);
    
    return [
        'success' => true,
        'data' => $data,
        'filters_applied' => $filters,
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

/**
 * 一括操作処理
 */
function handleBulkAction($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('POSTメソッドが必要です');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $ids = $input['ids'] ?? [];
    
    if (empty($ids) || !is_array($ids)) {
        throw new Exception('対象IDが指定されていません');
    }
    
    $pdo->beginTransaction();
    
    try {
        switch ($action) {
            case 'activate':
                $sql = "UPDATE filter_keywords SET is_active = TRUE, updated_at = NOW() WHERE id = ANY(?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['{' . implode(',', $ids) . '}']);
                $affected = $stmt->rowCount();
                $message = "{$affected}件のキーワードを有効化しました";
                break;
                
            case 'deactivate':
                $sql = "UPDATE filter_keywords SET is_active = FALSE, updated_at = NOW() WHERE id = ANY(?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['{' . implode(',', $ids) . '}']);
                $affected = $stmt->rowCount();
                $message = "{$affected}件のキーワードを無効化しました";
                break;
                
            case 'delete':
                $sql = "DELETE FROM filter_keywords WHERE id = ANY(?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['{' . implode(',', $ids) . '}']);
                $affected = $stmt->rowCount();
                $message = "{$affected}件のキーワードを削除しました";
                break;
                
            case 'update_priority':
                $priority = $input['priority'] ?? 'MEDIUM';
                if (!in_array($priority, ['HIGH', 'MEDIUM', 'LOW'])) {
                    throw new Exception('無効な優先度です');
                }
                $sql = "UPDATE filter_keywords SET priority = ?, updated_at = NOW() WHERE id = ANY(?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$priority, '{' . implode(',', $ids) . '}']);
                $affected = $stmt->rowCount();
                $message = "{$affected}件のキーワードの優先度を{$priority}に変更しました";
                break;
                
            default:
                throw new Exception('不正な一括操作です');
        }
        
        $pdo->commit();
        
        return [
            'success' => true,
            'message' => $message,
            'affected_count' => $affected ?? 0
        ];
        
    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

/**
 * エクスポート処理
 */
function handleExportRequest($pdo) {
    $format = $_GET['format'] ?? 'csv';
    $filters = [
        'filter_type' => $_GET['filter_type'] ?? 'all',
        'search' => trim($_GET['search'] ?? ''),
        'priority' => $_GET['priority'] ?? '',
        'language' => $_GET['language'] ?? '',
        'status' => $_GET['status'] ?? ''
    ];
    
    // 全データ取得（ページネーション無し）
    $data = getExportData($pdo, $filters);
    
    if ($format === 'csv') {
        $filename = 'filter_keywords_' . date('Y-m-d_H-i-s') . '.csv';
        $csv = generateCSV($data);
        
        return [
            'success' => true,
            'filename' => $filename,
            'data' => base64_encode($csv),
            'mime_type' => 'text/csv',
            'size' => strlen($csv)
        ];
    }
    
    throw new Exception('サポートされていないフォーマットです');
}

/**
 * 拡張版ページネーション付きデータ取得
 */
function getPaginatedFilterData($pdo, $filterType, $page, $perPage, $search = '', $priority = '', $language = '', $status = '', $sortBy = 'detection_count', $sortDir = 'desc') {
    $offset = ($page - 1) * $perPage;
    
    // WHERE条件構築
    $whereConditions = [];
    $params = [];
    
    // フィルタータイプ
    switch ($filterType) {
        case 'export':
            $whereConditions[] = "type = 'EXPORT'";
            break;
        case 'patent-troll':
            $whereConditions[] = "type = 'PATENT_TROLL'";
            break;
        case 'vero':
            $whereConditions[] = "type = 'VERO'";
            break;
        case 'mall':
            $whereConditions[] = "type = 'MALL_SPECIFIC'";
            break;
        case 'country':
            $whereConditions[] = "type = 'COUNTRY_SPECIFIC'";
            break;
        default:
            // 全て表示
            break;
    }
    
    // 検索条件
    if (!empty($search)) {
        $whereConditions[] = "(keyword ILIKE ? OR translation ILIKE ? OR description ILIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
    }
    
    // フィルター条件
    if (!empty($priority)) {
        $whereConditions[] = "priority = ?";
        $params[] = $priority;
    }
    
    if (!empty($language)) {
        $whereConditions[] = "language = ?";
        $params[] = $language;
    }
    
    if (!empty($status)) {
        $whereConditions[] = "is_active = ?";
        $params[] = ($status === 'active');
    }
    
    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
    
    // ソート条件
    $allowedSorts = ['keyword', 'type', 'priority', 'detection_count', 'created_at', 'updated_at'];
    $sortBy = in_array($sortBy, $allowedSorts) ? $sortBy : 'detection_count';
    $sortDir = strtoupper($sortDir) === 'ASC' ? 'ASC' : 'DESC';
    
    if ($sortBy === 'priority') {
        $orderClause = "ORDER BY CASE priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END {$sortDir}";
    } else {
        $orderClause = "ORDER BY {$sortBy} {$sortDir}";
    }
    
    // 総件数取得
    $countSql = "SELECT COUNT(*) FROM filter_keywords {$whereClause}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalCount = $countStmt->fetchColumn();
    
    // データ取得
    $dataSql = "
        SELECT 
            id, keyword, type, priority, detection_count, created_at, updated_at, 
            is_active, language, translation, description, mall_name,
            CASE 
                WHEN updated_at > NOW() - INTERVAL '24 hours' THEN true 
                ELSE false 
            END as is_recent
        FROM filter_keywords 
        {$whereClause}
        {$orderClause}
        LIMIT ? OFFSET ?
    ";
    
    $dataParams = array_merge($params, [$perPage, $offset]);
    $dataStmt = $pdo->prepare($dataSql);
    $dataStmt->execute($dataParams);
    $data = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
    
    return [
        'data' => $data,
        'total' => $totalCount,
        'pages' => ceil($totalCount / $perPage),
        'current_page' => $page,
        'per_page' => $perPage,
        'has_next' => $page < ceil($totalCount / $perPage),
        'has_prev' => $page > 1
    ];
}

/**
 * エクスポート用データ取得
 */
function getExportData($pdo, $filters) {
    $whereConditions = [];
    $params = [];
    
    if ($filters['filter_type'] !== 'all') {
        $whereConditions[] = "type = ?";
        $params[] = strtoupper(str_replace('-', '_', $filters['filter_type']));
    }
    
    if (!empty($filters['search'])) {
        $whereConditions[] = "(keyword ILIKE ? OR translation ILIKE ?)";
        $params[] = "%{$filters['search']}%";
        $params[] = "%{$filters['search']}%";
    }
    
    if (!empty($filters['priority'])) {
        $whereConditions[] = "priority = ?";
        $params[] = $filters['priority'];
    }
    
    if (!empty($filters['language'])) {
        $whereConditions[] = "language = ?";
        $params[] = $filters['language'];
    }
    
    if (!empty($filters['status'])) {
        $whereConditions[] = "is_active = ?";
        $params[] = ($filters['status'] === 'active');
    }
    
    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
    
    $sql = "
        SELECT 
            id, keyword, type, priority, detection_count, 
            created_at, updated_at, is_active, language, 
            translation, description, mall_name
        FROM filter_keywords 
        {$whereClause}
        ORDER BY priority DESC, detection_count DESC
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * CSV生成
 */
function generateCSV($data) {
    $output = fopen('php://temp', 'r+');
    
    // ヘッダー
    fputcsv($output, [
        'ID', 'キーワード', 'タイプ', '優先度', '検出回数', 
        '作成日', '更新日', 'ステータス', '言語', '翻訳', '説明', 'モール名'
    ]);
    
    // データ
    foreach ($data as $row) {
        fputcsv($output, [
            $row['id'],
            $row['keyword'],
            $row['type'],
            $row['priority'],
            $row['detection_count'],
            $row['created_at'],
            $row['updated_at'],
            $row['is_active'] ? '有効' : '無効',
            $row['language'],
            $row['translation'] ?? '',
            $row['description'] ?? '',
            $row['mall_name'] ?? ''
        ]);
    }
    
    rewind($output);
    $csv = stream_get_contents($output);
    fclose($output);
    
    return $csv;
}

/**
 * 統計データ取得
 */
function getRealFilterStatistics($pdo) {
    $stats = [];
    
    try {
        // 基本統計
        $stmt = $pdo->query("
            SELECT 
                type,
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
                COALESCE(SUM(detection_count), 0) as detections,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
            FROM filter_keywords 
            GROUP BY type
        ");
        
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $stats[$row['type']] = [
                'total' => $row['total'],
                'active' => $row['active'],
                'detections' => $row['detections'],
                'new_this_week' => $row['new_this_week']
            ];
        }
        
        // 全体統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_keywords,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_keywords,
                COALESCE(SUM(detection_count), 0) as total_detections,
                COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_today
            FROM filter_keywords
        ");
        $overall = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['overall'] = $overall;
        
    } catch (Exception $e) {
        $stats = getDefaultStats();
    }
    
    return $stats;
}

/**
 * デフォルト統計データ
 */
function getDefaultStats() {
    return [
        'overall' => [
            'total_keywords' => 0,
            'active_keywords' => 0,
            'total_detections' => 0,
            'updated_today' => 0
        ],
        'EXPORT' => ['total' => 0, 'active' => 0, 'detections' => 0, 'new_this_week' => 0],
        'PATENT_TROLL' => ['total' => 0, 'active' => 0, 'detections' => 0, 'new_this_week' => 0],
        'VERO' => ['total' => 0, 'active' => 0, 'detections' => 0, 'new_this_week' => 0],
        'MALL_SPECIFIC' => ['total' => 0, 'active' => 0, 'detections' => 0, 'new_this_week' => 0],
        'COUNTRY_SPECIFIC' => ['total' => 0, 'active' => 0, 'detections' => 0, 'new_this_week' => 0]
    ];
}

/**
 * デモデータ生成
 */
function getDemoData($page, $perPage) {
    $demoKeywords = [
        ['id' => 1, 'keyword' => 'fake', 'type' => 'EXPORT', 'priority' => 'HIGH', 'detection_count' => 1247, 'is_active' => true, 'language' => 'en', 'translation' => '偽物', 'description' => '偽造品を示すキーワード'],
        ['id' => 2, 'keyword' => 'replica', 'type' => 'EXPORT', 'priority' => 'HIGH', 'detection_count' => 892, 'is_active' => true, 'language' => 'en', 'translation' => 'レプリカ', 'description' => 'レプリカ商品'],
        ['id' => 3, 'keyword' => 'counterfeit', 'type' => 'EXPORT', 'priority' => 'HIGH', 'detection_count' => 756, 'is_active' => true, 'language' => 'en', 'translation' => '偽造品', 'description' => '偽造商品全般'],
        ['id' => 4, 'keyword' => 'ルイヴィトン', 'type' => 'VERO', 'priority' => 'HIGH', 'detection_count' => 423, 'is_active' => true, 'language' => 'ja', 'translation' => 'Louis Vuitton', 'description' => '高級ブランド'],
        ['id' => 5, 'keyword' => 'patent infringement', 'type' => 'PATENT_TROLL', 'priority' => 'MEDIUM', 'detection_count' => 234, 'is_active' => true, 'language' => 'en', 'translation' => '特許侵害', 'description' => '特許権侵害']
    ];
    
    $total = count($demoKeywords);
    $offset = ($page - 1) * $perPage;
    $data = array_slice($demoKeywords, $offset, $perPage);
    
    // 日付を追加
    foreach ($data as &$item) {
        $item['created_at'] = date('Y-m-d H:i:s', strtotime('-' . rand(1, 30) . ' days'));
        $item['updated_at'] = date('Y-m-d H:i:s', strtotime('-' . rand(1, 7) . ' days'));
        $item['is_recent'] = rand(0, 1);
        $item['mall_name'] = null;
    }
    
    return [
        'data' => $data,
        'total' => $total,
        'pages' => ceil($total / $perPage),
        'current_page' => $page,
        'per_page' => $perPage,
        'has_next' => $page < ceil($total / $perPage),
        'has_prev' => $page > 1
    ];
}

/**
 * 検索ハイライト関数
 */
function highlightSearch($text, $search) {
    if (empty($search) || empty($text)) return htmlspecialchars($text);
    
    $pattern = '/' . preg_quote($search, '/') . '/i';
    return preg_replace($pattern, '<mark class="highlight">$0</mark>', htmlspecialchars($text));
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>高機能ページネーション拡張版フィルターシステム - Yahoo Auction Tool</title>
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
            --shadow: 0 2px 4px rgba(0,0,0,0.05);
            --shadow-lg: 0 4px 15px rgba(0,0,0,0.1);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: var(--space-lg);
        }
        
        /* ヘッダー */
        .header { 
            text-align: center; 
            margin-bottom: var(--space-xl);
            padding: var(--space-xl);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: var(--radius-lg);
            color: white;
            box-shadow: var(--shadow-lg);
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

        /* 統計ダッシュボード */
        .stats-dashboard {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
        }

        .stat-card {
            text-align: center;
            padding: var(--space-lg);
            border-radius: var(--radius-md);
            transition: transform 0.2s ease;
            border: 1px solid var(--border-color);
        }

        .stat-card:hover { 
            transform: translateY(-2px); 
            box-shadow: var(--shadow-lg); 
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: var(--space-xs);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .stat-change {
            font-size: 0.75rem;
            margin-top: var(--space-xs);
        }
        
        .stat-up { color: var(--success-color); }
        .stat-down { color: var(--danger-color); }

        /* 高機能検索・フィルターパネル */
        .advanced-controls {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            padding: var(--space-lg);
            margin-bottom: var(--space-xl);
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
        }

        .controls-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--space-lg);
            padding-bottom: var(--space-md);
            border-bottom: 1px solid var(--border-color);
        }

        .controls-title {
            font-size: 1.25rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .toggle-advanced {
            background: var(--primary-color);
            color: white;
            border: none;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }

        .toggle-advanced:hover {
            background: #1e40af;
        }

        .controls-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .form-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .form-input {
            padding: var(--space-sm) var(--space-md);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            transition: all 0.2s ease;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .search-input {
            position: relative;
        }

        .search-input input {
            padding-left: 2.5rem;
        }

        .search-input::before {
            content: '\f002';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-secondary);
            z-index: 1;
        }

        /* 操作ツールバー */
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-md);
            margin-bottom: var(--space-lg);
        }

        .toolbar-left {
            display: flex;
            align-items: center;
            gap: var(--space-md);
        }

        .toolbar-right {
            display: flex;
            gap: var(--space-sm);
        }

        .btn {
            padding: var(--space-sm) var(--space-md);
            border: none;
            border-radius: var(--radius-sm);
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: var(--space-xs);
            font-size: 0.875rem;
            text-decoration: none;
        }

        .btn:hover { 
            transform: translateY(-1px); 
            box-shadow: 0 2px 8px rgba(0,0,0,0.15); 
        }

        .btn-primary { background: var(--primary-color); color: white; }
        .btn-secondary { background: var(--secondary-color); color: white; }
        .btn-success { background: var(--success-color); color: white; }
        .btn-warning { background: var(--warning-color); color: white; }
        .btn-danger { background: var(--danger-color); color: white; }
        .btn-info { background: var(--info-color); color: white; }

        .btn-sm {
            padding: 4px 8px;
            font-size: 0.75rem;
        }

        /* 選択カウンター */
        .selection-info {
            background: var(--info-color);
            color: white;
            padding: var(--space-sm) var(--space-md);
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            display: none;
        }

        .selection-info.show {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        /* フィルタータブ（改良版） */
        .filter-tabs {
            display: flex;
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            padding: var(--space-xs);
            margin-bottom: var(--space-lg);
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
            overflow-x: auto;
        }

        .tab-button {
            flex: 1;
            min-width: 140px;
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
            font-size: 0.875rem;
            text-decoration: none;
            color: var(--text-primary);
            position: relative;
        }

        .tab-button.active {
            background: var(--primary-color);
            color: white;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }

        .tab-button:not(.active):hover {
            background: rgba(37, 99, 235, 0.1);
        }

        .tab-count {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 600;
        }

        .tab-button:not(.active) .tab-count {
            background: var(--bg-tertiary);
            color: var(--text-secondary);
        }

        /* データテーブル（高機能版） */
        .data-table-container {
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            overflow: hidden;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
            margin-bottom: var(--space-lg);
        }

        .table-header {
            background: var(--bg-tertiary);
            padding: var(--space-md) var(--space-lg);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .table-title {
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .table-actions {
            display: flex;
            gap: var(--space-sm);
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
            border-bottom: 1px solid var(--border-color);
            font-size: 0.8rem;
            position: sticky;
            top: 0;
            z-index: 10;
            cursor: pointer;
            user-select: none;
        }

        .data-table th:hover {
            background: #e2e8f0;
        }

        .data-table th.sortable::after {
            content: '\f0dc';
            font-family: 'Font Awesome 6 Free';
            font-weight: 900;
            margin-left: var(--space-xs);
            opacity: 0.3;
        }

        .data-table th.sort-asc::after {
            content: '\f0de';
            opacity: 1;
            color: var(--primary-color);
        }

        .data-table th.sort-desc::after {
            content: '\f0dd';
            opacity: 1;
            color: var(--primary-color);
        }

        .data-table td {
            padding: var(--space-md);
            border-bottom: 1px solid var(--border-color);
            vertical-align: middle;
        }

        .data-table tbody tr {
            transition: all 0.2s ease;
        }

        .data-table tbody tr:hover {
            background: rgba(37, 99, 235, 0.05);
            transform: translateX(2px);
        }

        .data-table tbody tr.selected {
            background: rgba(37, 99, 235, 0.1);
        }

        /* ステータスバッジ（改良版） */
        .status-badge {
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .status-active { 
            background: var(--success-color); 
            color: white; 
        }
        .status-inactive { 
            background: var(--text-muted); 
            color: white; 
        }
        
        .priority-high { 
            background: var(--danger-color); 
            color: white; 
            animation: pulse-danger 2s infinite;
        }
        .priority-medium { 
            background: var(--warning-color); 
            color: white; 
        }
        .priority-low { 
            background: var(--info-color); 
            color: white; 
        }

        @keyframes pulse-danger {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .language-badge {
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            font-size: 0.65rem;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .lang-en { background: #dbeafe; color: #1e40af; }
        .lang-ja { background: #dcfce7; color: #166534; }
        .lang-zh { background: #fef3c7; color: #92400e; }

        /* 新しいバッジ */
        .new-badge {
            background: linear-gradient(45deg, #ff6b6b, #ee5a6f);
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.6rem;
            font-weight: 600;
            text-transform: uppercase;
            animation: glow 2s infinite;
        }

        @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(255, 107, 107, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 107, 107, 0.8); }
        }

        /* ページネーション（高機能版） */
        .pagination-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-lg);
            background: var(--bg-primary);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow);
        }

        .pagination-info {
            display: flex;
            flex-direction: column;
            gap: var(--space-xs);
        }

        .pagination-summary {
            font-size: 0.875rem;
            color: var(--text-secondary);
        }

        .pagination-details {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
        }

        .page-btn {
            padding: var(--space-sm);
            border: 1px solid var(--border-color);
            background: var(--bg-primary);
            color: var(--text-primary);
            text-decoration: none;
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .page-btn:hover:not(.disabled) {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
            transform: translateY(-1px);
        }

        .page-btn.active {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
        }

        .page-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }

        .page-jump {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            margin-left: var(--space-md);
        }

        .page-jump input {
            width: 60px;
            padding: 4px 8px;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            text-align: center;
            font-size: 0.875rem;
        }

        /* ハイライト */
        .highlight {
            background: linear-gradient(45deg, #fbbf24, #f59e0b);
            color: white;
            padding: 1px 3px;
            border-radius: 2px;
            font-weight: 600;
        }

        /* ローディング */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        }

        .loading-spinner {
            background: white;
            padding: var(--space-xl);
            border-radius: var(--radius-lg);
            text-align: center;
            box-shadow: var(--shadow-lg);
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--bg-tertiary);
            border-top: 4px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto var(--space-md);
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        /* 通知システム */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: var(--space-md);
            border-radius: var(--radius-md);
            color: white;
            font-weight: 500;
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            min-width: 300px;
            max-width: 500px;
        }

        .notification-success { background: var(--success-color); }
        .notification-error { background: var(--danger-color); }
        .notification-info { background: var(--info-color); }
        .notification-warning { background: var(--warning-color); }

        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        /* レスポンシブ対応 */
        @media (max-width: 1024px) {
            .controls-grid {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            }
            
            .toolbar {
                flex-direction: column;
                align-items: stretch;
                gap: var(--space-sm);
            }
            
            .pagination-container {
                flex-direction: column;
                gap: var(--space-md);
            }
        }

        @media (max-width: 768px) {
            .container { 
                padding: var(--space-md); 
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .controls-grid { 
                grid-template-columns: 1fr;
            }
            
            .data-table {
                font-size: 0.8rem;
            }
            
            .data-table th,
            .data-table td {
                padding: var(--space-sm);
            }
        }

        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .filter-tabs {
                flex-direction: column;
                gap: var(--space-xs);
            }
            
            .tab-button {
                min-width: auto;
            }
        }

        /* アクセシビリティ */
        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }

        /* ダークモード対応 */
        @media (prefers-color-scheme: dark) {
            :root {
                --bg-primary: #1e293b;
                --bg-secondary: #0f172a;
                --bg-tertiary: #334155;
                --text-primary: #f8fafc;
                --text-secondary: #cbd5e1;
                --text-muted: #64748b;
                --border-color: #475569;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- ヘッダー -->
        <div class="header">
            <h1><i class="fas fa-layer-group"></i> 高機能ページネーション拡張版フィルターシステム</h1>
            <p>Ajax対応・リアルタイム検索・一括操作・エクスポート機能付き</p>
        </div>

        <!-- データベース接続状況 -->
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: <?php echo $dbConnected ? 'linear-gradient(45deg, #10b981, #059669)' : 'linear-gradient(45deg, #ef4444, #dc2626)'; ?>; border-radius: 8px; text-align: center; color: white; box-shadow: var(--shadow);">
            <i class="fas fa-database"></i> 
            データベース: <strong><?php echo $dbConnected ? '接続中' : '切断中（デモモード）'; ?></strong>
            <?php if ($dbConnected): ?>
                | 表示中: <strong><?php echo count($paginatedData['data']); ?></strong>件 / 総<strong><?php echo number_format($paginatedData['total']); ?></strong>件
                (<?php echo $paginatedData['current_page']; ?>/<?php echo $paginatedData['pages']; ?>ページ)
            <?php endif; ?>
        </div>

        <!-- 統計ダッシュボード -->
        <div class="stats-dashboard">
            <div class="controls-title" style="margin-bottom: var(--space-md);">
                <i class="fas fa-chart-line"></i>
                システム統計
            </div>
            <div class="stats-grid">
                <div class="stat-card" style="background: linear-gradient(45deg, #ef4444, #dc2626);">
                    <div class="stat-value" style="color: white;"><?php echo number_format($realStats['overall']['total_keywords'] ?? 0); ?></div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">総キーワード数</div>
                    <div class="stat-change stat-up"><i class="fas fa-arrow-up"></i> +<?php echo $realStats['overall']['updated_today'] ?? 0; ?> 今日</div>
                </div>
                <div class="stat-card" style="background: linear-gradient(45deg, #10b981, #059669);">
                    <div class="stat-value" style="color: white;"><?php echo number_format($realStats['overall']['active_keywords'] ?? 0); ?></div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">有効キーワード</div>
                    <div class="stat-change">
                        <?php 
                        $total = $realStats['overall']['total_keywords'] ?? 1;
                        $active = $realStats['overall']['active_keywords'] ?? 0;
                        $rate = round(($active / $total) * 100, 1);
                        echo "{$rate}% 有効率";
                        ?>
                    </div>
                </div>
                <div class="stat-card" style="background: linear-gradient(45deg, #3b82f6, #2563eb);">
                    <div class="stat-value" style="color: white;"><?php echo number_format($realStats['overall']['total_detections'] ?? 0); ?></div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">総検出回数</div>
                    <div class="stat-change">
                        <?php 
                        $avg = $total > 0 ? round(($realStats['overall']['total_detections'] ?? 0) / $total, 1) : 0;
                        echo "平均 {$avg} 回/キーワード";
                        ?>
                    </div>
                </div>
                <div class="stat-card" style="background: linear-gradient(45deg, #8b5cf6, #7c3aed);">
                    <div class="stat-value" style="color: white;"><?php echo number_format($paginatedData['total']); ?></div>
                    <div class="stat-label" style="color: rgba(255,255,255,0.8);">現在のフィルター結果</div>
                    <div class="stat-change">
                        <?php 
                        $filterRate = $realStats['overall']['total_keywords'] > 0 ? 
                            round(($paginatedData['total'] / $realStats['overall']['total_keywords']) * 100, 1) : 0;
                        echo "{$filterRate}% 表示中";
                        ?>
                    </div>
                </div>
            </div>
        </div>

        <!-- 高機能検索・フィルターパネル -->
        <div class="advanced-controls">
            <div class="controls-header">
                <div class="controls-title">
                    <i class="fas fa-sliders-h"></i>
                    高度な検索・フィルター
                </div>
                <button class="toggle-advanced" onclick="toggleAdvanced()">
                    <i class="fas fa-cog"></i> 詳細設定
                </button>
            </div>

            <form method="GET" id="advancedFilterForm">
                <input type="hidden" name="filter_type" value="<?php echo htmlspecialchars($filterType); ?>">
                
                <div class="controls-grid">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-search"></i> キーワード検索
                        </label>
                        <div class="search-input">
                            <input type="text" name="search" class="form-input" 
                                   placeholder="キーワード、翻訳、説明を検索..." 
                                   value="<?php echo htmlspecialchars($searchKeyword); ?>"
                                   id="searchInput">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-exclamation-triangle"></i> 優先度
                        </label>
                        <select name="priority" class="form-input">
                            <option value="">すべての優先度</option>
                            <option value="HIGH" <?php echo $priorityFilter === 'HIGH' ? 'selected' : ''; ?>>
                                🔴 高優先度 (<?php echo $realStats['priority_high'] ?? 0; ?>)
                            </option>
                            <option value="MEDIUM" <?php echo $priorityFilter === 'MEDIUM' ? 'selected' : ''; ?>>
                                🟡 中優先度 (<?php echo $realStats['priority_medium'] ?? 0; ?>)
                            </option>
                            <option value="LOW" <?php echo $priorityFilter === 'LOW' ? 'selected' : ''; ?>>
                                🔵 低優先度 (<?php echo $realStats['priority_low'] ?? 0; ?>)
                            </option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-language"></i> 言語
                        </label>
                        <select name="language" class="form-input">
                            <option value="">すべての言語</option>
                            <option value="en" <?php echo $languageFilter === 'en' ? 'selected' : ''; ?>>🇺🇸 English</option>
                            <option value="ja" <?php echo $languageFilter === 'ja' ? 'selected' : ''; ?>>🇯🇵 日本語</option>
                            <option value="zh" <?php echo $languageFilter === 'zh' ? 'selected' : ''; ?>>🇨🇳 中文</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-toggle-on"></i> ステータス
                        </label>
                        <select name="status" class="form-input">
                            <option value="">すべてのステータス</option>
                            <option value="active" <?php echo $statusFilter === 'active' ? 'selected' : ''; ?>>
                                ✅ 有効 (<?php echo $realStats['overall']['active_keywords'] ?? 0; ?>)
                            </option>
                            <option value="inactive" <?php echo $statusFilter === 'inactive' ? 'selected' : ''; ?>>
                                ❌ 無効 (<?php echo ($realStats['overall']['total_keywords'] ?? 0) - ($realStats['overall']['active_keywords'] ?? 0); ?>)
                            </option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sort-amount-down"></i> ソート
                        </label>
                        <select name="sort" class="form-input">
                            <option value="detection_count" <?php echo $sortBy === 'detection_count' ? 'selected' : ''; ?>>検出回数順</option>
                            <option value="created_at" <?php echo $sortBy === 'created_at' ? 'selected' : ''; ?>>作成日順</option>
                            <option value="updated_at" <?php echo $sortBy === 'updated_at' ? 'selected' : ''; ?>>更新日順</option>
                            <option value="keyword" <?php echo $sortBy === 'keyword' ? 'selected' : ''; ?>>キーワード名順</option>
                            <option value="priority" <?php echo $sortBy === 'priority' ? 'selected' : ''; ?>>優先度順</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-list-ol"></i> 表示件数
                        </label>
                        <select name="per_page" class="form-input">
                            <option value="10" <?php echo $perPage == 10 ? 'selected' : ''; ?>>10件/ページ</option>
                            <option value="25" <?php echo $perPage == 25 ? 'selected' : ''; ?>>25件/ページ</option>
                            <option value="50" <?php echo $perPage == 50 ? 'selected' : ''; ?>>50件/ページ</option>
                            <option value="100" <?php echo $perPage == 100 ? 'selected' : ''; ?>>100件/ページ</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sort"></i> 順序
                        </label>
                        <select name="dir" class="form-input">
                            <option value="desc" <?php echo $sortDir === 'desc' ? 'selected' : ''; ?>>降順 (高→低)</option>
                            <option value="asc" <?php echo $sortDir === 'asc' ? 'selected' : ''; ?>>昇順 (低→高)</option>
                        </select>
                    </div>

                    <div class="form-group" style="display: flex; align-items: end;">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-search"></i> 検索実行
                        </button>
                    </div>
                </div>

                <!-- 高度な設定（隠し項目） -->
                <div id="advancedSettings" style="display: none;">
                    <hr style="margin: var(--space-lg) 0;">
                    <div class="controls-grid">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-calendar-alt"></i> 作成日フィルター
                            </label>
                            <select name="date_filter" class="form-input">
                                <option value="">すべての期間</option>
                                <option value="today">今日</option>
                                <option value="week">今週</option>
                                <option value="month">今月</option>
                                <option value="year">今年</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-chart-bar"></i> 検出回数フィルター
                            </label>
                            <select name="detection_filter" class="form-input">
                                <option value="">すべて</option>
                                <option value="high">高頻度 (100回以上)</option>
                                <option value="medium">中頻度 (10-99回)</option>
                                <option value="low">低頻度 (1-9回)</option>
                                <option value="zero">未検出 (0回)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </form>
        </div>

        <!-- 操作ツールバー -->
        <div class="toolbar">
            <div class="toolbar-left">
                <div class="selection-info" id="selectionInfo">
                    <i class="fas fa-check-square"></i>
                    <span id="selectionCount">0</span>件選択中
                </div>
            </div>
            
            <div class="toolbar-right">
                <button class="btn btn-success btn-sm" id="bulkActivateBtn" disabled>
                    <i class="fas fa-check"></i> 一括有効化
                </button>
                <button class="btn btn-warning btn-sm" id="bulkDeactivateBtn" disabled>
                    <i class="fas fa-times"></i> 一括無効化
                </button>
                <button class="btn btn-danger btn-sm" id="bulkDeleteBtn" disabled>
                    <i class="fas fa-trash"></i> 一括削除
                </button>
                <button class="btn btn-info btn-sm" onclick="exportData()">
                    <i class="fas fa-download"></i> エクスポート
                </button>
                <button class="btn btn-secondary btn-sm" onclick="refreshData()">
                    <i class="fas fa-sync-alt"></i> 更新
                </button>
            </div>
        </div>

        <!-- フィルタータブ -->
        <div class="filter-tabs">
            <a href="?filter_type=export&<?php echo http_build_query(array_filter(['search' => $searchKeyword, 'priority' => $priorityFilter, 'language' => $languageFilter, 'status' => $statusFilter, 'per_page' => $perPage, 'sort' => $sortBy, 'dir' => $sortDir])); ?>" 
               class="tab-button <?php echo $filterType === 'export' ? 'active' : ''; ?>" data-filter="export">
                <i class="fas fa-ban"></i>
                輸出禁止
                <span class="tab-count"><?php echo $realStats['EXPORT']['total'] ?? 0; ?></span>
            </a>
            <a href="?filter_type=patent-troll&<?php echo http_build_query(array_filter(['search' => $searchKeyword, 'priority' => $priorityFilter, 'language' => $languageFilter, 'status' => $statusFilter, 'per_page' => $perPage, 'sort' => $sortBy, 'dir' => $sortDir])); ?>" 
               class="tab-button <?php echo $filterType === 'patent-troll' ? 'active' : ''; ?>" data-filter="patent-troll">
                <i class="fas fa-gavel"></i>
                パテントトロール
                <span class="tab-count"><?php echo $realStats['PATENT_TROLL']['total'] ?? 0; ?></span>
            </a>
            <a href="?filter_type=vero&<?php echo http_build_query(array_filter(['search' => $searchKeyword, 'priority' => $priorityFilter, 'language' => $languageFilter, 'status' => $statusFilter, 'per_page' => $perPage, 'sort' => $sortBy, 'dir' => $sortDir])); ?>" 
               class="tab-button <?php echo $filterType === 'vero' ? 'active' : ''; ?>" data-filter="vero">
                <i class="fas fa-copyright"></i>
                VERO禁止
                <span class="tab-count"><?php echo $realStats['VERO']['total'] ?? 0; ?></span>
            </a>
            <a href="?filter_type=mall&<?php echo http_build_query(array_filter(['search' => $searchKeyword, 'priority' => $priorityFilter, 'language' => $languageFilter, 'status' => $statusFilter, 'per_page' => $perPage, 'sort' => $sortBy, 'dir' => $sortDir])); ?>" 
               class="tab-button <?php echo $filterType === 'mall' ? 'active' : ''; ?>" data-filter="mall">
                <i class="fas fa-store"></i>
                モール別禁止
                <span class="tab-count"><?php echo $realStats['MALL_SPECIFIC']['total'] ?? 0; ?></span>
            </a>
            <a href="?filter_type=country&<?php echo http_build_query(array_filter(['search' => $searchKeyword, 'priority' => $priorityFilter, 'language' => $languageFilter, 'status' => $statusFilter, 'per_page' => $perPage, 'sort' => $sortBy, 'dir' => $sortDir])); ?>" 
               class="tab-button <?php echo $filterType === 'country' ? 'active' : ''; ?>" data-filter="country">
                <i class="fas fa-globe"></i>
                国別制限
                <span class="tab-count"><?php echo $realStats['COUNTRY_SPECIFIC']['total'] ?? 0; ?></span>
            </a>
            <a href="?filter_type=all&<?php echo http_build_query(array_filter(['search' => $searchKeyword, 'priority' => $priorityFilter, 'language' => $languageFilter, 'status' => $statusFilter, 'per_page' => $perPage, 'sort' => $sortBy, 'dir' => $sortDir])); ?>" 
               class="tab-button <?php echo $filterType === 'all' ? 'active' : ''; ?>" data-filter="all">
                <i class="fas fa-list"></i>
                すべて
                <span class="tab-count"><?php echo $realStats['overall']['total_keywords'] ?? 0; ?></span>
            </a>
        </div>

        <!-- データテーブル -->
        <div class="data-table-container" id="dataTableContainer">
            <div class="table-header">
                <div class="table-title">
                    <i class="fas fa-table"></i>
                    キーワードデータ
                    <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: normal;">
                        (<?php echo number_format($paginatedData['total']); ?>件中 <?php echo number_format(count($paginatedData['data'])); ?>件表示)
                    </span>
                </div>
                
                <div class="table-actions">
                    <button class="btn btn-sm btn-info" onclick="toggleColumns()">
                        <i class="fas fa-columns"></i> 列表示切替
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="quickSearch()">
                        <i class="fas fa-search-plus"></i> クイック検索
                    </button>
                </div>
            </div>

            <div style="overflow-x: auto; max-height: 600px; overflow-y: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">
                                <input type="checkbox" id="selectAllCheckbox" onchange="toggleAllSelection()">
                            </th>
                            <th class="sortable" data-sort="keyword" style="width: 200px;">
                                キーワード
                                <?php if ($sortBy === 'keyword'): ?>
                                    <i class="fas fa-sort-<?php echo $sortDir === 'asc' ? 'up' : 'down'; ?>" style="color: var(--primary-color);"></i>
                                <?php endif; ?>
                            </th>
                            <th class="sortable" data-sort="type" style="width: 120px;">
                                タイプ
                                <?php if ($sortBy === 'type'): ?>
                                    <i class="fas fa-sort-<?php echo $sortDir === 'asc' ? 'up' : 'down'; ?>" style="color: var(--primary-color);"></i>
                                <?php endif; ?>
                            </th>
                            <th class="sortable" data-sort="priority" style="width: 80px;">
                                優先度
                                <?php if ($sortBy === 'priority'): ?>
                                    <i class="fas fa-sort-<?php echo $sortDir === 'asc' ? 'up' : 'down'; ?>" style="color: var(--primary-color);"></i>
                                <?php endif; ?>
                            </th>
                            <th style="width: 60px;">言語</th>
                            <th style="width: 150px;">翻訳</th>
                            <th class="sortable" data-sort="detection_count" style="width: 100px;">
                                検出回数
                                <?php if ($sortBy === 'detection_count'): ?>
                                    <i class="fas fa-sort-<?php echo $sortDir === 'asc' ? 'up' : 'down'; ?>" style="color: var(--primary-color);"></i>
                                <?php endif; ?>
                            </th>
                            <th class="sortable" data-sort="created_at" style="width: 120px;">
                                作成日
                                <?php if ($sortBy === 'created_at'): ?>
                                    <i class="fas fa-sort-<?php echo $sortDir === 'asc' ? 'up' : 'down'; ?>" style="color: var(--primary-color);"></i>
                                <?php endif; ?>
                            </th>
                            <th style="width: 80px;">ステータス</th>
                            <th style="width: 120px;">操作</th>
                        </tr>
                    </thead>
                    <tbody id="dataTableBody">
                        <?php if (!empty($paginatedData['data'])): ?>
                            <?php foreach ($paginatedData['data'] as $row): ?>
                            <tr data-id="<?php echo $row['id']; ?>" class="data-row">
                                <td>
                                    <input type="checkbox" name="selected[]" value="<?php echo $row['id']; ?>" 
                                           class="row-checkbox" onchange="updateSelection()">
                                </td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: var(--space-xs);">
                                        <strong><?php echo highlightSearch($row['keyword'] ?? '', $searchKeyword); ?></strong>
                                        <?php if (isset($row['is_recent']) && $row['is_recent']): ?>
                                            <span class="new-badge">NEW</span>
                                        <?php endif; ?>
                                    </div>
                                    <?php if (!empty($row['description'])): ?>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                                            <?php echo highlightSearch(htmlspecialchars(mb_substr($row['description'], 0, 50)), $searchKeyword); ?>...
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="status-badge" style="background: <?php 
                                        echo match($row['type'] ?? '') {
                                            'EXPORT' => 'var(--danger-color)',
                                            'PATENT_TROLL' => 'var(--warning-color)',
                                            'VERO' => 'var(--info-color)',
                                            'MALL_SPECIFIC' => 'var(--success-color)',
                                            'COUNTRY_SPECIFIC' => 'var(--secondary-color)',
                                            default => 'var(--text-muted)'
                                        };
                                    ?>; color: white;">
                                        <?php echo htmlspecialchars($row['type'] ?? ''); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge priority-<?php echo strtolower($row['priority'] ?? 'low'); ?>">
                                        <i class="fas fa-<?php 
                                            echo match($row['priority'] ?? 'LOW') {
                                                'HIGH' => 'exclamation-triangle',
                                                'MEDIUM' => 'exclamation-circle',
                                                'LOW' => 'info-circle',
                                                default => 'question-circle'
                                            };
                                        ?>"></i>
                                        <?php echo $row['priority'] ?? 'LOW'; ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if (!empty($row['language'])): ?>
                                        <span class="language-badge lang-<?php echo $row['language']; ?>">
                                            <?php echo strtoupper($row['language']); ?>
                                        </span>
                                    <?php else: ?>
                                        <span class="language-badge" style="background: #f3f4f6; color: #6b7280;">N/A</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <div style="font-size: 0.8rem; line-height: 1.3;">
                                        <?php echo highlightSearch(htmlspecialchars($row['translation'] ?? ''), $searchKeyword); ?>
                                    </div>
                                </td>
                                <td style="text-align: center;">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                                        <strong style="font-size: 1.1rem; <?php echo ($row['detection_count'] ?? 0) > 100 ? 'color: var(--danger-color);' : ''; ?>">
                                            <?php echo number_format($row['detection_count'] ?? 0); ?>
                                        </strong>
                                        <?php if (($row['detection_count'] ?? 0) > 0): ?>
                                            <div style="width: 40px; height: 4px; background: var(--bg-tertiary); border-radius: 2px; overflow: hidden;">
                                                <div style="width: <?php echo min(100, ($row['detection_count'] / 1000) * 100); ?>%; height: 100%; background: <?php 
                                                    echo ($row['detection_count'] ?? 0) > 500 ? 'var(--danger-color)' : 
                                                         (($row['detection_count'] ?? 0) > 100 ? 'var(--warning-color)' : 'var(--success-color)');
                                                ?>; transition: width 0.3s ease;"></div>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td style="font-size: 0.8rem; color: var(--text-secondary);">
                                    <div><?php echo date('Y-m-d', strtotime($row['created_at'] ?? 'now')); ?></div>
                                    <?php if (!empty($row['updated_at']) && $row['updated_at'] !== $row['created_at']): ?>
                                        <div style="font-size: 0.7rem; color: var(--text-muted);">
                                            更新: <?php echo date('m-d H:i', strtotime($row['updated_at'])); ?>
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="status-badge <?php echo ($row['is_active'] ?? false) ? 'status-active' : 'status-inactive'; ?>">
                                        <i class="fas fa-<?php echo ($row['is_active'] ?? false) ? 'check' : 'times'; ?>"></i>
                                        <?php echo ($row['is_active'] ?? false) ? '有効' : '無効'; ?>
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 4px;">
                                        <button class="btn btn-sm btn-secondary" 
                                                onclick="editKeyword(<?php echo $row['id']; ?>)" 
                                                title="編集">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm <?php echo ($row['is_active'] ?? false) ? 'btn-warning' : 'btn-success'; ?>" 
                                                onclick="toggleKeywordStatus(<?php echo $row['id']; ?>, <?php echo ($row['is_active'] ?? false) ? 'false' : 'true'; ?>)" 
                                                title="<?php echo ($row['is_active'] ?? false) ? '無効化' : '有効化'; ?>">
                                            <i class="fas fa-<?php echo ($row['is_active'] ?? false) ? 'eye-slash' : 'eye'; ?>"></i>
                                        </button>
                                        <button class="btn btn-sm btn-info" 
                                                onclick="viewKeywordDetails(<?php echo $row['id']; ?>)" 
                                                title="詳細">
                                            <i class="fas fa-info-circle"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md);">
                                        <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3;"></i>
                                        <h3 style="margin: 0;">検索条件に一致するデータがありません</h3>
                                        <p style="margin: 0; color: var(--text-secondary);">
                                            検索キーワードやフィルター条件を変更して再度お試しください
                                        </p>
                                        <button class="btn btn-primary" onclick="clearFilters()">
                                            <i class="fas fa-undo"></i> フィルターをクリア
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ページネーション -->
        <?php if ($paginatedData['pages'] > 1): ?>
        <div class="pagination-container">
            <div class="pagination-info">
                <div class="pagination-summary">
                    <strong><?php echo number_format(($page - 1) * $perPage + 1); ?></strong> - 
                    <strong><?php echo number_format(min($page * $perPage, $paginatedData['total'])); ?></strong> 件 
                    (全 <strong><?php echo number_format($paginatedData['total']); ?></strong> 件中)
                </div>
                <div class="pagination-details">
                    ページサイズ: <?php echo $perPage; ?>件 | 
                    ソート: <?php echo $sortBy; ?> (<?php echo $sortDir === 'desc' ? '降順' : '昇順'; ?>) |
                    フィルター: <?php echo $filterType; ?>
                    <?php if (!empty($searchKeyword)): ?>
                        | 検索: "<?php echo htmlspecialchars($searchKeyword); ?>"
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="pagination-controls">
                <?php
                $baseUrl = '?' . http_build_query(array_filter([
                    'filter_type' => $filterType,
                    'search' => $searchKeyword,
                    'priority' => $priorityFilter,
                    'language' => $languageFilter,
                    'status' => $statusFilter,
                    'per_page' => $perPage,
                    'sort' => $sortBy,
                    'dir' => $sortDir
                ]));
                
                // 最初のページ
                if ($page > 1): ?>
                    <a href="<?php echo $baseUrl; ?>&page=1" class="page-btn" title="最初のページ">
                        <i class="fas fa-angle-double-left"></i>
                    </a>
                    <a href="<?php echo $baseUrl; ?>&page=<?php echo $page - 1; ?>" class="page-btn" title="前のページ">
                        <i class="fas fa-angle-left"></i>
                    </a>
                <?php else: ?>
                    <span class="page-btn disabled" title="最初のページ">
                        <i class="fas fa-angle-double-left"></i>
                    </span>
                    <span class="page-btn disabled" title="前のページ">
                        <i class="fas fa-angle-left"></i>
                    </span>
                <?php endif; ?>
                
                <?php
                // ページ番号表示（最大9ページ）
                $startPage = max(1, $page - 4);
                $endPage = min($paginatedData['pages'], $startPage + 8);
                $startPage = max(1, $endPage - 8);
                
                // 最初のページが表示範囲外の場合
                if ($startPage > 1): ?>
                    <a href="<?php echo $baseUrl; ?>&page=1" class="page-btn">1</a>
                    <?php if ($startPage > 2): ?>
                        <span class="page-btn disabled">...</span>
                    <?php endif; ?>
                <?php endif; ?>
                
                <?php for ($i = $startPage; $i <= $endPage; $i++): ?>
                    <a href="<?php echo $baseUrl; ?>&page=<?php echo $i; ?>" 
                       class="page-btn <?php echo $i == $page ? 'active' : ''; ?>"
                       title="ページ<?php echo $i; ?>">
                        <?php echo $i; ?>
                    </a>
                <?php endfor; ?>
                
                <!-- 最後のページが表示範囲外の場合 -->
                <?php if ($endPage < $paginatedData['pages']): ?>
                    <?php if ($endPage < $paginatedData['pages'] - 1): ?>
                        <span class="page-btn disabled">...</span>
                    <?php endif; ?>
                    <a href="<?php echo $baseUrl; ?>&page=<?php echo $paginatedData['pages']; ?>" class="page-btn">
                        <?php echo $paginatedData['pages']; ?>
                    </a>
                <?php endif; ?>
                
                <!-- 次のページ -->
                <?php if ($page < $paginatedData['pages']): ?>
                    <a href="<?php echo $baseUrl; ?>&page=<?php echo $page + 1; ?>" class="page-btn" title="次のページ">
                        <i class="fas fa-angle-right"></i>
                    </a>
                    <a href="<?php echo $baseUrl; ?>&page=<?php echo $paginatedData['pages']; ?>" class="page-btn" title="最後のページ">
                        <i class="fas fa-angle-double-right"></i>
                    </a>
                <?php else: ?>
                    <span class="page-btn disabled" title="次のページ">
                        <i class="fas fa-angle-right"></i>
                    </span>
                    <span class="page-btn disabled" title="最後のページ">
                        <i class="fas fa-angle-double-right"></i>
                    </span>
                <?php endif; ?>
                
                <!-- ページジャンプ -->
                <div class="page-jump">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">ページ:</span>
                    <input type="number" id="pageJumpInput" min="1" max="<?php echo $paginatedData['pages']; ?>" 
                           value="<?php echo $page; ?>" onchange="jumpToPage(this.value)">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">/ <?php echo $paginatedData['pages']; ?></span>
                </div>
            </div>
        </div>
        <?php endif; ?>

        <!-- クイックアクセスフローティングボタン -->
        <div style="position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 100;">
            <button class="btn btn-primary" onclick="scrollToTop()" title="トップへ戻る" 
                    style="border-radius: 50%; width: 50px; height: 50px; padding: 0;">
                <i class="fas fa-arrow-up"></i>
            </button>
            <button class="btn btn-success" onclick="addNewKeyword()" title="新規キーワード追加" 
                    style="border-radius: 50%; width: 50px; height: 50px; padding: 0;">
                <i class="fas fa-plus"></i>
            </button>
            <button class="btn btn-info" onclick="showHelp()" title="ヘルプ" 
                    style="border-radius: 50%; width: 50px; height: 50px; padding: 0;">
                <i class="fas fa-question"></i>
            </button>
        </div>
    </div>

    <!-- ローディングオーバーレイ -->
    <div class="loading-overlay" id="loadingOverlay" style="display: none;">
        <div class="loading-spinner">
            <div class="spinner"></div>
            <div>データを処理中...</div>
        </div>
    </div>

    <script>
        // グローバル変数
        let selectedRows = new Set();
        let currentPage = <?php echo $page; ?>;
        let totalPages = <?php echo $paginatedData['pages']; ?>;
        let isLoading = false;

        // 初期化
        document.addEventListener('DOMContentLoaded', function() {
            console.log('高機能ページネーション拡張版フィルターシステム初期化開始');
            
            initializeEventListeners();
            initializeSortHandlers();
            initializeKeyboardShortcuts();
            updateSelectionUI();
            
            console.log('初期化完了:', {
                currentPage: currentPage,
                totalPages: totalPages,
                totalRows: <?php echo count($paginatedData['data']); ?>,
                dbConnected: <?php echo $dbConnected ? 'true' : 'false'; ?>
            });
        });

        // イベントリスナー初期化
        function initializeEventListeners() {
            // 検索入力のリアルタイム処理
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', function() {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        if (this.value.length >= 2 || this.value.length === 0) {
                            performSearch();
                        }
                    }, 500);
                });
            }

            // フォーム変更の自動送信
            const autoSubmitElements = document.querySelectorAll('select[name="per_page"], select[name="priority"], select[name="language"], select[name="status"], select[name="sort"], select[name="dir"]');
            autoSubmitElements.forEach(element => {
                element.addEventListener('change', function() {
                    document.getElementById('advancedFilterForm').submit();
                });
            });

            // 一括操作ボタン
            document.getElementById('bulkActivateBtn')?.addEventListener('click', () => performBulkAction('activate'));
            document.getElementById('bulkDeactivateBtn')?.addEventListener('click', () => performBulkAction('deactivate'));
            document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => performBulkAction('delete'));
        }

        // ソートハンドラー初期化
        function initializeSortHandlers() {
            const sortableHeaders = document.querySelectorAll('.data-table th.sortable');
            sortableHeaders.forEach(header => {
                header.addEventListener('click', function() {
                    const sortField = this.getAttribute('data-sort');
                    const currentSort = '<?php echo $sortBy; ?>';
                    const currentDir = '<?php echo $sortDir; ?>';
                    
                    let newDir = 'desc';
                    if (sortField === currentSort) {
                        newDir = currentDir === 'desc' ? 'asc' : 'desc';
                    }
                    
                    const url = new URL(window.location);
                    url.searchParams.set('sort', sortField);
                    url.searchParams.set('dir', newDir);
                    window.location.href = url.toString();
                });
            });
        }

        // キーボードショートカット初期化
        function initializeKeyboardShortcuts() {
            document.addEventListener('keydown', function(e) {
                // Ctrl+A: 全選択
                if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea')) {
                    e.preventDefault();
                    toggleAllSelection();
                }
                
                // Ctrl+F: 検索フォーカス
                if (e.ctrlKey && e.key === 'f' && !e.target.matches('input, textarea')) {
                    e.preventDefault();
                    document.getElementById('searchInput')?.focus();
                }
                
                // Escape: 選択解除
                if (e.key === 'Escape') {
                    clearSelection();
                }
                
                // 矢印キー: ページネーション
                if (e.ctrlKey && e.key === 'ArrowLeft' && currentPage > 1) {
                    window.location.href = updateURLPage(currentPage - 1);
                }
                if (e.ctrlKey && e.key === 'ArrowRight' && currentPage < totalPages) {
                    window.location.href = updateURLPage(currentPage + 1);
                }
            });
        }

        // 全選択切替
        function toggleAllSelection() {
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            const isChecked = selectAllCheckbox.checked;
            
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
                const rowId = parseInt(checkbox.value);
                if (isChecked) {
                    selectedRows.add(rowId);
                    checkbox.closest('tr').classList.add('selected');
                } else {
                    selectedRows.delete(rowId);
                    checkbox.closest('tr').classList.remove('selected');
                }
            });
            
            updateSelectionUI();
        }

        // 個別選択更新
        function updateSelection() {
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            
            selectedRows.clear();
            let allChecked = true;
            let someChecked = false;
            
            rowCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedRows.add(parseInt(checkbox.value));
                    checkbox.closest('tr').classList.add('selected');
                    someChecked = true;
                } else {
                    checkbox.closest('tr').classList.remove('selected');
                    allChecked = false;
                }
            });
            
            selectAllCheckbox.checked = allChecked && someChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
            
            updateSelectionUI();
        }

        // 選択UI更新
        function updateSelectionUI() {
            const selectionInfo = document.getElementById('selectionInfo');
            const selectionCount = document.getElementById('selectionCount');
            const bulkButtons = document.querySelectorAll('#bulkActivateBtn, #bulkDeactivateBtn, #bulkDeleteBtn');
            
            const count = selectedRows.size;
            
            if (count > 0) {
                selectionInfo.classList.add('show');
                selectionCount.textContent = count;
                bulkButtons.forEach(btn => btn.disabled = false);
            } else {
                selectionInfo.classList.remove('show');
                bulkButtons.forEach(btn => btn.disabled = true);
            }
        }

        // 選択解除
        function clearSelection() {
            selectedRows.clear();
            document.querySelectorAll('.row-checkbox').forEach(cb => {
                cb.checked = false;
                cb.closest('tr').classList.remove('selected');
            });
            document.getElementById('selectAllCheckbox').checked = false;
            updateSelectionUI();
        }

        // 一括操作実行
        async function performBulkAction(action) {
            if (selectedRows.size === 0) {
                showNotification('操作対象を選択してください', 'warning');
                return;
            }

            const actionNames = {
                'activate': '有効化',
                'deactivate': '無効化',
                'delete': '削除'
            };

            if (!confirm(`選択された${selectedRows.size}件のキーワードを${actionNames[action]}しますか？`)) {
                return;
            }

            showLoading(true);

            try {
                const response = await fetch('?ajax=1&action=bulk_action', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        action: action,
                        ids: Array.from(selectedRows)
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(result.message, 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showNotification(`エラー: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('一括操作エラー:', error);
                showNotification('システムエラーが発生しました', 'error');
            } finally {
                showLoading(false);
            }
        }

        // 個別操作
        async function toggleKeywordStatus(id, newStatus) {
            showLoading(true);
            
            try {
                const response = await fetch('?ajax=1&action=bulk_action', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        action: newStatus ? 'activate' : 'deactivate',
                        ids: [id]
                    })
                });

                const result = await response.json();

                if (result.success) {
                    showNotification(`キーワードを${newStatus ? '有効化' : '無効化'}しました`, 'success');
                    setTimeout(() => window.location.reload(), 500);
                } else {
                    showNotification(`エラー: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('ステータス変更エラー:', error);
                showNotification('システムエラーが発生しました', 'error');
            } finally {
                showLoading(false);
            }
        }

        // キーワード編集
        function editKeyword(id) {
            // 編集モーダルまたはページへの遷移
            showNotification('キーワード編集機能を実装中...', 'info');
        }

        // キーワード詳細表示
        function viewKeywordDetails(id) {
            // 詳細モーダル表示
            showNotification('詳細表示機能を実装中...', 'info');
        }

        // 検索実行
        function performSearch() {
            document.getElementById('advancedFilterForm').submit();
        }

        // フィルタークリア
        function clearFilters() {
            const url = new URL(window.location);
            url.search = '?filter_type=' + '<?php echo $filterType; ?>';
            window.location.href = url.toString();
        }

        // 高度な設定切替
        function toggleAdvanced() {
            const settings = document.getElementById('advancedSettings');
            const isVisible = settings.style.display !== 'none';
            settings.style.display = isVisible ? 'none' : 'block';
            
            const button = document.querySelector('.toggle-advanced');
            button.innerHTML = isVisible ? 
                '<i class="fas fa-cog"></i> 詳細設定' : 
                '<i class="fas fa-times"></i> 詳細設定を閉じる';
        }

        // 列表示切替
        function toggleColumns() {
            showNotification('列表示切替機能を実装中...', 'info');
        }

        // クイック検索
        function quickSearch() {
            const keyword = prompt('検索キーワードを入力してください:');
            if (keyword) {
                const url = new URL(window.location);
                url.searchParams.set('search', keyword);
                window.location.href = url.toString();
            }
        }

        // データエクスポート
        async function exportData() {
            showLoading(true);
            
            try {
                const url = new URL(window.location);
                url.searchParams.set('ajax', '1');
                url.searchParams.set('action', 'export');
                url.searchParams.set('format', 'csv');
                
                const response = await fetch(url.toString());
                const result = await response.json();
                
                if (result.success) {
                    // ファイルダウンロード
                    const blob = new Blob([atob(result.data)], { type: result.mime_type });
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = result.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(downloadUrl);
                    
                    showNotification(`${result.filename} をダウンロードしました`, 'success');
                } else {
                    showNotification(`エクスポートエラー: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('エクスポートエラー:', error);
                showNotification('エクスポートに失敗しました', 'error');
            } finally {
                showLoading(false);
            }
        }

        // データ更新
        function refreshData() {
            showLoading(true);
            window.location.reload();
        }

        // ページジャンプ
        function jumpToPage(pageNum) {
            const page = parseInt(pageNum);
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                window.location.href = updateURLPage(page);
            }
        }

        // URL更新（ページ番号）
        function updateURLPage(page) {
            const url = new URL(window.location);
            url.searchParams.set('page', page);
            return url.toString();
        }

        // トップへスクロール
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // 新規キーワード追加
        function addNewKeyword() {
            showNotification('新規キーワード追加機能を実装中...', 'info');
        }

        // ヘルプ表示
        function showHelp() {
            showNotification('ヘルプ機能を実装中...', 'info');
        }

        // ローディング表示制御
        function showLoading(show) {
            const overlay = document.getElementById('loadingOverlay');
            overlay.style.display = show ? 'flex' : 'none';
            isLoading = show;
        }

        // 通知表示
        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }

        // パフォーマンス監視
        window.addEventListener('load', function() {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            console.log(`ページ読み込み時間: ${loadTime}ms`);
            
            if (loadTime > 3000) {
                console.warn('ページ読み込みが遅い可能性があります');
            }
        });

        console.log('高機能ページネーション拡張版フィルターシステム JavaScript 初期化完了');
    </script>
</body>
</html>

<?php
// パフォーマンス測定
$endTime = microtime(true);
$executionTime = ($endTime - ($_SERVER['REQUEST_TIME_FLOAT'] ?? $endTime)) * 1000;

if ($executionTime > 1000) {
    error_log("Slow page load: {$executionTime}ms");
}
?>