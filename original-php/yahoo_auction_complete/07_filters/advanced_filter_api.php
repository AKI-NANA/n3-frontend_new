<?php
/**
 * 高機能フィルターシステム API エンドポイント
 * ページネーション・検索・フィルタリング・一括操作・エクスポート対応
 * 
 * エンドポイント: api/advanced_filter.php
 * バージョン: 2.0
 * 作成日: 2025年9月22日
 */

// エラーレポートを有効化（開発時）
error_reporting(E_ALL);
ini_set('display_errors', 1);

// レスポンスヘッダー設定
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, Authorization');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 共通設定読み込み
require_once '../../shared/core/includes.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
function validateCSRFToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// エラーハンドリング
function sendError($message, $code = 400, $details = null) {
    http_response_code($code);
    $response = [
        'success' => false,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'request_id' => uniqid()
    ];
    
    if ($details !== null) {
        $response['details'] = $details;
    }
    
    echo json_encode($response);
    exit;
}

// 成功レスポンス
function sendSuccess($data = null, $message = 'Success', $meta = []) {
    $response = [
        'success' => true,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'request_id' => uniqid()
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    if (!empty($meta)) {
        $response['meta'] = $meta;
    }
    
    echo json_encode($response);
    exit;
}

// リクエスト検証
function validateRequest() {
    $method = $_SERVER['REQUEST_METHOD'];
    
    if (!in_array($method, ['GET', 'POST', 'PUT', 'DELETE'])) {
        sendError('許可されていないHTTPメソッドです', 405);
    }
    
    if (in_array($method, ['POST', 'PUT', 'DELETE']) && !validateCSRFToken()) {
        sendError('CSRFトークンが無効です', 403);
    }
}

// ログ記録
function logRequest($action, $params = [], $result = 'success') {
    $logData = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'method' => $_SERVER['REQUEST_METHOD'],
        'action' => $action,
        'params' => $params,
        'result' => $result,
        'session_id' => session_id()
    ];
    
    error_log('[API] ' . json_encode($logData));
}

try {
    // データベース接続
    require_once '../../shared/core/database.php';
    $db = Database::getInstance();
    $pdo = $db->getPDO();
    
    // リクエスト検証
    validateRequest();
    
    // アクション取得
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    
    // メインAPIハンドラー
    $api = new AdvancedFilterAPI($pdo);
    
    switch ($action) {
        case 'get_data':
            $result = $api->getData();
            break;
            
        case 'get_statistics':
            $result = $api->getStatistics();
            break;
            
        case 'bulk_action':
            $result = $api->handleBulkAction();
            break;
            
        case 'export':
            $result = $api->handleExport();
            break;
            
        case 'create_keyword':
            $result = $api->createKeyword();
            break;
            
        case 'update_keyword':
            $result = $api->updateKeyword();
            break;
            
        case 'delete_keyword':
            $result = $api->deleteKeyword();
            break;
            
        case 'search':
            $result = $api->performSearch();
            break;
            
        case 'check_duplicates':
            $result = $api->checkDuplicates();
            break;
            
        case 'get_categories':
            $result = $api->getCategories();
            break;
            
        case 'validate_data':
            $result = $api->validateData();
            break;
            
        case 'optimize_database':
            $result = $api->optimizeDatabase();
            break;
            
        default:
            sendError('不正なアクションです', 400, ['available_actions' => [
                'get_data', 'get_statistics', 'bulk_action', 'export', 
                'create_keyword', 'update_keyword', 'delete_keyword', 
                'search', 'check_duplicates', 'get_categories', 'validate_data'
            ]]);
    }
    
    logRequest($action, $_GET, 'success');
    sendSuccess($result['data'] ?? null, $result['message'] ?? 'Success', $result['meta'] ?? []);
    
} catch (Exception $e) {
    logRequest($action ?? 'unknown', $_GET, 'error: ' . $e->getMessage());
    sendError('システムエラーが発生しました: ' . $e->getMessage(), 500);
}

/**
 * 高機能フィルターAPI クラス
 */
class AdvancedFilterAPI {
    private $pdo;
    private $cache = [];
    private $cacheExpiry = 300; // 5分
    
    public function __construct($database) {
        $this->pdo = $database;
    }
    
    /**
     * ページネーション付きデータ取得
     */
    public function getData() {
        $filters = $this->getFilters();
        $data = $this->getPaginatedData($filters);
        
        return [
            'data' => $data,
            'message' => 'データ取得完了',
            'meta' => [
                'filters_applied' => $filters,
                'performance' => $this->getPerformanceMetrics()
            ]
        ];
    }
    
    /**
     * フィルターパラメータ取得・検証
     */
    private function getFilters() {
        return [
            'filter_type' => $this->validateFilterType($_GET['filter_type'] ?? 'all'),
            'page' => max(1, intval($_GET['page'] ?? 1)),
            'per_page' => $this->validatePerPage(intval($_GET['per_page'] ?? 25)),
            'search' => $this->sanitizeSearch($_GET['search'] ?? ''),
            'priority' => $this->validatePriority($_GET['priority'] ?? ''),
            'language' => $this->validateLanguage($_GET['language'] ?? ''),
            'status' => $this->validateStatus($_GET['status'] ?? ''),
            'sort' => $this->validateSortField($_GET['sort'] ?? 'detection_count'),
            'dir' => $this->validateSortDirection($_GET['dir'] ?? 'desc'),
            'category' => $this->sanitizeString($_GET['category'] ?? ''),
            'mall_name' => $this->sanitizeString($_GET['mall_name'] ?? ''),
            'country_code' => $this->validateCountryCode($_GET['country_code'] ?? ''),
            'date_filter' => $this->validateDateFilter($_GET['date_filter'] ?? ''),
            'detection_filter' => $this->validateDetectionFilter($_GET['detection_filter'] ?? ''),
            'effectiveness_min' => max(0, floatval($_GET['effectiveness_min'] ?? 0)),
            'effectiveness_max' => min(100, floatval($_GET['effectiveness_max'] ?? 100))
        ];
    }
    
    /**
     * ページネーション付きデータ取得（高機能版）
     */
    private function getPaginatedData($filters) {
        $offset = ($filters['page'] - 1) * $filters['per_page'];
        
        // キャッシュキー生成
        $cacheKey = 'data_' . md5(serialize($filters));
        if ($cached = $this->getCache($cacheKey)) {
            return $cached;
        }
        
        // WHERE条件構築
        [$whereClause, $params] = $this->buildWhereClause($filters);
        
        // ORDER BY条件構築
        $orderClause = $this->buildOrderClause($filters);
        
        // 総件数取得（最適化クエリ）
        $totalCount = $this->getTotalCount($whereClause, $params);
        
        // メインデータ取得
        $sql = "
            SELECT 
                fk.id,
                fk.keyword,
                fk.type,
                fk.priority,
                fk.language,
                fk.translation,
                fk.description,
                fk.category,
                fk.subcategory,
                fk.mall_name,
                fk.country_code,
                fk.detection_count,
                fk.effectiveness_score,
                fk.false_positive_rate,
                fk.is_active,
                fk.created_at,
                fk.updated_at,
                fk.last_detected_at,
                CASE 
                    WHEN fk.updated_at > NOW() - INTERVAL '24 hours' THEN true 
                    ELSE false 
                END as is_recent,
                CASE 
                    WHEN fk.detection_count > 1000 THEN 'very_high'
                    WHEN fk.detection_count > 500 THEN 'high'
                    WHEN fk.detection_count > 100 THEN 'medium'
                    WHEN fk.detection_count > 10 THEN 'low'
                    ELSE 'very_low'
                END as impact_level,
                kc.name as category_name,
                kc.color_code as category_color,
                kc.icon as category_icon
            FROM filter_keywords fk
            LEFT JOIN keyword_categories kc ON fk.category = kc.path
            {$whereClause}
            {$orderClause}
            LIMIT ? OFFSET ?
        ";
        
        $dataParams = array_merge($params, [$filters['per_page'], $offset]);
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($dataParams);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 結果データ加工
        $data = $this->enhanceData($data, $filters);
        
        $result = [
            'items' => $data,
            'pagination' => [
                'current_page' => $filters['page'],
                'per_page' => $filters['per_page'],
                'total' => $totalCount,
                'pages' => ceil($totalCount / $filters['per_page']),
                'has_next' => $filters['page'] < ceil($totalCount / $filters['per_page']),
                'has_prev' => $filters['page'] > 1,
                'from' => $offset + 1,
                'to' => min($offset + $filters['per_page'], $totalCount)
            ],
            'filters_summary' => $this->getFiltersSummary($filters, $totalCount),
            'performance' => $this->getPerformanceMetrics()
        ];
        
        $this->setCache($cacheKey, $result);
        return $result;
    }
    
    /**
     * WHERE条件構築
     */
    private function buildWhereClause($filters) {
        $conditions = [];
        $params = [];
        
        // フィルタータイプ
        if ($filters['filter_type'] !== 'all') {
            $typeMap = [
                'export' => 'EXPORT',
                'patent-troll' => 'PATENT_TROLL',
                'vero' => 'VERO',
                'mall' => 'MALL_SPECIFIC',
                'country' => 'COUNTRY_SPECIFIC'
            ];
            
            if (isset($typeMap[$filters['filter_type']])) {
                $conditions[] = "fk.type = ?";
                $params[] = $typeMap[$filters['filter_type']];
            }
        }
        
        // 検索条件（全文検索対応）
        if (!empty($filters['search'])) {
            $conditions[] = "(
                fk.keyword ILIKE ? OR 
                fk.translation ILIKE ? OR 
                fk.description ILIKE ? OR
                to_tsvector('english', fk.keyword || ' ' || COALESCE(fk.translation, '') || ' ' || COALESCE(fk.description, '')) @@ plainto_tsquery('english', ?)
            )";
            $searchTerm = "%{$filters['search']}%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $filters['search'];
        }
        
        // その他のフィルター条件
        $simpleFilters = [
            'priority' => 'fk.priority',
            'language' => 'fk.language',
            'category' => 'fk.category',
            'mall_name' => 'fk.mall_name',
            'country_code' => 'fk.country_code'
        ];
        
        foreach ($simpleFilters as $filterKey => $column) {
            if (!empty($filters[$filterKey])) {
                $conditions[] = "{$column} = ?";
                $params[] = $filters[$filterKey];
            }
        }
        
        // ステータスフィルター
        if (!empty($filters['status'])) {
            $conditions[] = "fk.is_active = ?";
            $params[] = ($filters['status'] === 'active');
        }
        
        // 日付フィルター
        if (!empty($filters['date_filter'])) {
            $dateConditions = [
                'today' => "fk.created_at >= CURRENT_DATE",
                'week' => "fk.created_at >= CURRENT_DATE - INTERVAL '7 days'",
                'month' => "fk.created_at >= CURRENT_DATE - INTERVAL '30 days'",
                'year' => "fk.created_at >= CURRENT_DATE - INTERVAL '1 year'"
            ];
            
            if (isset($dateConditions[$filters['date_filter']])) {
                $conditions[] = $dateConditions[$filters['date_filter']];
            }
        }
        
        // 検出回数フィルター
        if (!empty($filters['detection_filter'])) {
            $detectionConditions = [
                'high' => "fk.detection_count >= 100",
                'medium' => "fk.detection_count BETWEEN 10 AND 99",
                'low' => "fk.detection_count BETWEEN 1 AND 9",
                'zero' => "fk.detection_count = 0"
            ];
            
            if (isset($detectionConditions[$filters['detection_filter']])) {
                $conditions[] = $detectionConditions[$filters['detection_filter']];
            }
        }
        
        // 効果スコアフィルター
        if ($filters['effectiveness_min'] > 0 || $filters['effectiveness_max'] < 100) {
            $conditions[] = "fk.effectiveness_score BETWEEN ? AND ?";
            $params[] = $filters['effectiveness_min'];
            $params[] = $filters['effectiveness_max'];
        }
        
        $whereClause = empty($conditions) ? '' : 'WHERE ' . implode(' AND ', $conditions);
        return [$whereClause, $params];
    }
    
    /**
     * ORDER BY条件構築
     */
    private function buildOrderClause($filters) {
        $allowedSorts = [
            'keyword' => 'fk.keyword',
            'type' => 'fk.type',
            'priority' => 'CASE fk.priority WHEN \'HIGH\' THEN 3 WHEN \'MEDIUM\' THEN 2 ELSE 1 END',
            'detection_count' => 'fk.detection_count',
            'effectiveness_score' => 'fk.effectiveness_score',
            'created_at' => 'fk.created_at',
            'updated_at' => 'fk.updated_at',
            'last_detected_at' => 'fk.last_detected_at'
        ];
        
        $sortField = $allowedSorts[$filters['sort']] ?? $allowedSorts['detection_count'];
        $direction = $filters['dir'] === 'asc' ? 'ASC' : 'DESC';
        
        // 二次ソート（同値の場合）
        $secondarySort = $sortField !== 'fk.keyword' ? ', fk.keyword ASC' : '';
        
        return "ORDER BY {$sortField} {$direction}{$secondarySort}";
    }
    
    /**
     * 総件数取得（最適化）
     */
    private function getTotalCount($whereClause, $params) {
        $cacheKey = 'count_' . md5($whereClause . serialize($params));
        if ($cached = $this->getCache($cacheKey)) {
            return $cached;
        }
        
        $sql = "SELECT COUNT(*) FROM filter_keywords fk {$whereClause}";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $count = $stmt->fetchColumn();
        
        $this->setCache($cacheKey, $count);
        return $count;
    }
    
    /**
     * データ拡張処理
     */
    private function enhanceData($data, $filters) {
        foreach ($data as &$row) {
            // 検索ハイライト
            if (!empty($filters['search'])) {
                $row['keyword_highlighted'] = $this->highlightText($row['keyword'], $filters['search']);
                $row['translation_highlighted'] = $this->highlightText($row['translation'] ?? '', $filters['search']);
            }
            
            // 相対日時
            $row['created_at_relative'] = $this->getRelativeTime($row['created_at']);
            $row['updated_at_relative'] = $this->getRelativeTime($row['updated_at']);
            
            // 効果レベル
            $row['effectiveness_level'] = $this->getEffectivenessLevel($row['effectiveness_score']);
            
            // 追加メタデータ
            $row['meta'] = [
                'can_edit' => true,
                'can_delete' => $row['detection_count'] == 0,
                'warning_level' => $this->getWarningLevel($row)
            ];
        }
        
        return $data;
    }
    
    /**
     * 統計情報取得
     */
    public function getStatistics() {
        $cacheKey = 'statistics';
        if ($cached = $this->getCache($cacheKey)) {
            return [
                'data' => $cached,
                'message' => '統計情報取得完了（キャッシュ）'
            ];
        }
        
        $stats = [];
        
        // 基本統計
        $stmt = $this->pdo->query("
            SELECT 
                COUNT(*) as total_keywords,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_keywords,
                COALESCE(SUM(detection_count), 0) as total_detections,
                COALESCE(AVG(detection_count), 0) as avg_detections,
                COALESCE(AVG(effectiveness_score), 0) as avg_effectiveness,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_today,
                COUNT(CASE WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as updated_today
            FROM filter_keywords
        ");
        $stats['overall'] = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // タイプ別統計
        $stmt = $this->pdo->query("
            SELECT 
                type,
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active,
                COALESCE(SUM(detection_count), 0) as detections,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
            FROM filter_keywords 
            GROUP BY type
            ORDER BY total DESC
        ");
        $stats['by_type'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 優先度別統計
        $stmt = $this->pdo->query("
            SELECT 
                priority,
                COUNT(*) as total,
                COALESCE(AVG(detection_count), 0) as avg_detections,
                COALESCE(AVG(effectiveness_score), 0) as avg_effectiveness
            FROM filter_keywords 
            GROUP BY priority
            ORDER BY CASE priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END DESC
        ");
        $stats['by_priority'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 言語別統計
        $stmt = $this->pdo->query("
            SELECT 
                language,
                COUNT(*) as total,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active
            FROM filter_keywords 
            GROUP BY language
            ORDER BY total DESC
        ");
        $stats['by_language'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // トップ検出キーワード
        $stmt = $this->pdo->query("
            SELECT keyword, type, detection_count, effectiveness_score
            FROM filter_keywords 
            WHERE detection_count > 0 AND is_active = TRUE
            ORDER BY detection_count DESC
            LIMIT 10
        ");
        $stats['top_detected'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 最近の活動
        $stmt = $this->pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_keywords
            FROM filter_keywords 
            WHERE created_at > NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        ");
        $stats['recent_activity'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // システム健全性
        $stats['health'] = [
            'duplicate_keywords' => $this->getDuplicateCount(),
            'inactive_keywords' => $this->getInactiveCount(),
            'zero_detection_keywords' => $this->getZeroDetectionCount(),
            'database_size' => $this->getDatabaseSize()
        ];
        
        $this->setCache($cacheKey, $stats);
        
        return [
            'data' => $stats,
            'message' => '統計情報取得完了'
        ];
    }
    
    /**
     * 一括操作処理
     */
    public function handleBulkAction() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('POSTメソッドが必要です');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('無効なJSON形式です');
        }
        
        $action = $input['action'] ?? '';
        $ids = $input['ids'] ?? [];
        
        if (empty($ids) || !is_array($ids)) {
            throw new Exception('対象IDが指定されていません');
        }
        
        if (count($ids) > 1000) {
            throw new Exception('一度に処理できるのは1000件までです');
        }
        
        // ID検証
        $ids = array_filter($ids, function($id) {
            return is_numeric($id) && $id > 0;
        });
        
        if (empty($ids)) {
            throw new Exception('有効なIDが指定されていません');
        }
        
        $this->pdo->beginTransaction();
        
        try {
            $result = $this->executeBulkAction($action, $ids, $input);
            $this->pdo->commit();
            
            // キャッシュクリア
            $this->clearCache();
            
            return [
                'data' => $result,
                'message' => "一括{$this->getActionName($action)}が完了しました"
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 一括操作実行
     */
    private function executeBulkAction($action, $ids, $params) {
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        
        switch ($action) {
            case 'activate':
                $sql = "UPDATE filter_keywords SET is_active = TRUE, updated_at = NOW() WHERE id IN ($placeholders)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($ids);
                return ['affected_count' => $stmt->rowCount()];
                
            case 'deactivate':
                $sql = "UPDATE filter_keywords SET is_active = FALSE, updated_at = NOW() WHERE id IN ($placeholders)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($ids);
                return ['affected_count' => $stmt->rowCount()];
                
            case 'delete':
                // 検出回数が0のもののみ削除可能
                $sql = "DELETE FROM filter_keywords WHERE id IN ($placeholders) AND detection_count = 0";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($ids);
                return ['affected_count' => $stmt->rowCount()];
                
            case 'update_priority':
                $priority = $params['priority'] ?? 'MEDIUM';
                if (!in_array($priority, ['HIGH', 'MEDIUM', 'LOW'])) {
                    throw new Exception('無効な優先度です');
                }
                $sql = "UPDATE filter_keywords SET priority = ?, updated_at = NOW() WHERE id IN ($placeholders)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute(array_merge([$priority], $ids));
                return ['affected_count' => $stmt->rowCount(), 'priority' => $priority];
                
            case 'update_category':
                $category = $params['category'] ?? '';
                if (empty($category)) {
                    throw new Exception('カテゴリが指定されていません');
                }
                $sql = "UPDATE filter_keywords SET category = ?, updated_at = NOW() WHERE id IN ($placeholders)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute(array_merge([$category], $ids));
                return ['affected_count' => $stmt->rowCount(), 'category' => $category];
                
            case 'recalculate_effectiveness':
                $sql = "UPDATE filter_keywords 
                        SET effectiveness_score = CASE
                            WHEN detection_count = 0 THEN 0
                            WHEN detection_count <= 10 THEN LEAST(detection_count * 5, 50)
                            WHEN detection_count <= 100 THEN 50 + ((detection_count - 10) * 0.5)
                            ELSE 95
                        END * (1 - LEAST(false_positive_rate, 0.5)),
                        updated_at = NOW()
                        WHERE id IN ($placeholders)";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute($ids);
                return ['affected_count' => $stmt->rowCount()];
                
            default:
                throw new Exception('サポートされていない一括操作です');
        }
    }
    
    /**
     * エクスポート処理
     */
    public function handleExport() {
        $format = $_GET['format'] ?? 'csv';
        $filters = $this->getFilters();
        
        // エクスポート制限チェック
        $maxRecords = $this->getSystemSetting('export_max_records', 10000);
        [$whereClause, $params] = $this->buildWhereClause($filters);
        $totalCount = $this->getTotalCount($whereClause, $params);
        
        if ($totalCount > $maxRecords) {
            throw new Exception("エクスポート可能な最大件数({$maxRecords}件)を超えています。フィルターを追加してください。");
        }
        
        // データ取得
        $data = $this->getExportData($filters);
        
        switch ($format) {
            case 'csv':
                return $this->generateCSVExport($data);
                
            case 'json':
                return $this->generateJSONExport($data);
                
            case 'xlsx':
                return $this->generateExcelExport($data);
                
            default:
                throw new Exception('サポートされていないエクスポート形式です');
        }
    }
    
    /**
     * CSV生成
     */
    private function generateCSVExport($data) {
        $output = fopen('php://temp', 'r+');
        
        // BOM付きUTF-8
        fwrite($output, "\xEF\xBB\xBF");
        
        // ヘッダー
        fputcsv($output, [
            'ID', 'キーワード', 'タイプ', '優先度', '言語', '翻訳', '説明',
            'カテゴリ', 'サブカテゴリ', 'モール名', '国コード', '検出回数',
            '効果スコア', '偽陽性率', 'ステータス', '作成日', '更新日'
        ]);
        
        // データ
        foreach ($data as $row) {
            fputcsv($output, [
                $row['id'],
                $row['keyword'],
                $row['type'],
                $row['priority'],
                $row['language'],
                $row['translation'] ?? '',
                $row['description'] ?? '',
                $row['category'] ?? '',
                $row['subcategory'] ?? '',
                $row['mall_name'] ?? '',
                $row['country_code'] ?? '',
                $row['detection_count'],
                $row['effectiveness_score'],
                $row['false_positive_rate'],
                $row['is_active'] ? '有効' : '無効',
                $row['created_at'],
                $row['updated_at']
            ]);
        }
        
        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);
        
        $filename = 'filter_keywords_' . date('Y-m-d_H-i-s') . '.csv';
        
        return [
            'data' => [
                'filename' => $filename,
                'content' => base64_encode($csv),
                'mime_type' => 'text/csv',
                'size' => strlen($csv),
                'record_count' => count($data)
            ],
            'message' => 'CSVエクスポート完了'
        ];
    }
    
    /**
     * バリデーション関数群
     */
    private function validateFilterType($type) {
        $allowed = ['all', 'export', 'patent-troll', 'vero', 'mall', 'country'];
        return in_array($type, $allowed) ? $type : 'all';
    }
    
    private function validatePerPage($perPage) {
        $max = $this->getSystemSetting('max_pagination_size', 100);
        return max(10, min($max, $perPage));
    }
    
    private function sanitizeSearch($search) {
        return trim(strip_tags($search));
    }
    
    private function validatePriority($priority) {
        return in_array($priority, ['HIGH', 'MEDIUM', 'LOW']) ? $priority : '';
    }
    
    private function validateLanguage($language) {
        $allowed = ['en', 'ja', 'zh', 'ko', 'es', 'fr', 'de'];
        return in_array($language, $allowed) ? $language : '';
    }
    
    private function validateStatus($status) {
        return in_array($status, ['active', 'inactive']) ? $status : '';
    }
    
    private function validateSortField($sort) {
        $allowed = ['keyword', 'type', 'priority', 'detection_count', 'effectiveness_score', 'created_at', 'updated_at'];
        return in_array($sort, $allowed) ? $sort : 'detection_count';
    }
    
    private function validateSortDirection($dir) {
        return strtolower($dir) === 'asc' ? 'asc' : 'desc';
    }
    
    private function validateCountryCode($code) {
        return preg_match('/^[A-Z]{2,3}$/', $code) ? $code : '';
    }
    
    private function validateDateFilter($filter) {
        $allowed = ['today', 'week', 'month', 'year'];
        return in_array($filter, $allowed) ? $filter : '';
    }
    
    private function validateDetectionFilter($filter) {
        $allowed = ['high', 'medium', 'low', 'zero'];
        return in_array($filter, $allowed) ? $filter : '';
    }
    
    private function sanitizeString($str) {
        return trim(strip_tags($str));
    }
    
    /**
     * ヘルパー関数群
     */
    private function highlightText($text, $search) {
        if (empty($text) || empty($search)) return $text;
        return preg_replace('/(' . preg_quote($search, '/') . ')/i', '<mark>$1</mark>', $text);
    }
    
    private function getRelativeTime($dateString) {
        $date = new DateTime($dateString);
        $now = new DateTime();
        $diff = $now->diff($date);
        
        if ($diff->days > 30) return $date->format('Y-m-d');
        if ($diff->days > 0) return $diff->days . '日前';
        if ($diff->h > 0) return $diff->h . '時間前';
        if ($diff->i > 0) return $diff->i . '分前';
        return '今';
    }
    
    private function getEffectivenessLevel($score) {
        if ($score >= 80) return 'excellent';
        if ($score >= 60) return 'good';
        if ($score >= 40) return 'average';
        if ($score >= 20) return 'poor';
        return 'very_poor';
    }
    
    private function getWarningLevel($row) {
        if (!$row['is_active']) return 'inactive';
        if ($row['false_positive_rate'] > 0.1) return 'high_false_positive';
        if ($row['detection_count'] == 0) return 'no_detections';
        return 'none';
    }
    
    private function getActionName($action) {
        $names = [
            'activate' => '有効化',
            'deactivate' => '無効化',
            'delete' => '削除',
            'update_priority' => '優先度更新',
            'update_category' => 'カテゴリ更新',
            'recalculate_effectiveness' => '効果スコア再計算'
        ];
        return $names[$action] ?? '操作';
    }
    
    /**
     * キャッシュ関連
     */
    private function getCache($key) {
        if (!isset($this->cache[$key])) return null;
        if (time() - $this->cache[$key]['timestamp'] > $this->cacheExpiry) {
            unset($this->cache[$key]);
            return null;
        }
        return $this->cache[$key]['data'];
    }
    
    private function setCache($key, $data) {
        $this->cache[$key] = [
            'data' => $data,
            'timestamp' => time()
        ];
    }
    
    private function clearCache() {
        $this->cache = [];
    }
    
    /**
     * システム設定取得
     */
    private function getSystemSetting($key, $default = null) {
        $cacheKey = "setting_{$key}";
        if ($cached = $this->getCache($cacheKey)) {
            return $cached;
        }
        
        $stmt = $this->pdo->prepare("SELECT setting_value, setting_type FROM system_settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            $this->setCache($cacheKey, $default);
            return $default;
        }
        
        $value = $result['setting_value'];
        switch ($result['setting_type']) {
            case 'INTEGER':
                $value = intval($value);
                break;
            case 'BOOLEAN':
                $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                break;
            case 'JSON':
                $value = json_decode($value, true);
                break;
        }
        
        $this->setCache($cacheKey, $value);
        return $value;
    }
    
    /**
     * パフォーマンス監視
     */
    private function getPerformanceMetrics() {
        return [
            'memory_usage' => memory_get_usage(true),
            'memory_peak' => memory_get_peak_usage(true),
            'execution_time' => round((microtime(true) - ($_SERVER['REQUEST_TIME_FLOAT'] ?? 0)) * 1000, 2),
            'cache_hits' => count($this->cache),
            'database_queries' => $this->getQueryCount()
        ];
    }
    
    private function getQueryCount() {
        // PDOのクエリ数をカウント（実装依存）
        return 0; // 簡易実装
    }
    
    /**
     * その他のヘルパーメソッド
     */
    private function getDuplicateCount() {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM (SELECT keyword, type FROM filter_keywords GROUP BY keyword, type HAVING COUNT(*) > 1) as duplicates");
        return $stmt->fetchColumn();
    }
    
    private function getInactiveCount() {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM filter_keywords WHERE is_active = FALSE");
        return $stmt->fetchColumn();
    }
    
    private function getZeroDetectionCount() {
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM filter_keywords WHERE detection_count = 0 AND is_active = TRUE");
        return $stmt->fetchColumn();
    }
    
    private function getDatabaseSize() {
        $stmt = $this->pdo->query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['size'] ?? 'Unknown';
    }
    
    /**
     * 検索機能
     */
    public function performSearch() {
        $query = $_GET['q'] ?? '';
        $type = $_GET['type'] ?? 'all';
        $limit = min(50, intval($_GET['limit'] ?? 20));
        
        if (strlen($query) < 2) {
            throw new Exception('検索クエリは2文字以上で入力してください');
        }
        
        // 全文検索実行
        $sql = "
            SELECT 
                id, keyword, type, priority, detection_count, is_active,
                ts_rank(to_tsvector('english', keyword || ' ' || COALESCE(translation, '') || ' ' || COALESCE(description, '')), 
                        plainto_tsquery('english', ?)) as rank,
                CASE 
                    WHEN keyword ILIKE ? THEN 1
                    WHEN translation ILIKE ? THEN 2
                    ELSE 3
                END as match_priority
            FROM filter_keywords
            WHERE (
                keyword ILIKE ? OR 
                translation ILIKE ? OR 
                description ILIKE ? OR
                to_tsvector('english', keyword || ' ' || COALESCE(translation, '') || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', ?)
            )
            " . ($type !== 'all' ? "AND type = ?" : "") . "
            ORDER BY match_priority ASC, rank DESC, detection_count DESC
            LIMIT ?
        ";
        
        $searchTerm = "%{$query}%";
        $params = [$query, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $query];
        
        if ($type !== 'all') {
            $params[] = strtoupper(str_replace('-', '_', $type));
        }
        $params[] = $limit;
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 結果の拡張
        foreach ($results as &$result) {
            $result['keyword_highlighted'] = $this->highlightText($result['keyword'], $query);
            $result['match_score'] = round($result['rank'], 3);
        }
        
        return [
            'data' => [
                'results' => $results,
                'query' => $query,
                'total_found' => count($results),
                'search_time' => $this->getPerformanceMetrics()['execution_time']
            ],
            'message' => '検索完了'
        ];
    }
    
    /**
     * 重複チェック
     */
    public function checkDuplicates() {
        $sql = "
            SELECT 
                keyword, 
                type, 
                language,
                COUNT(*) as duplicate_count,
                ARRAY_AGG(id) as duplicate_ids,
                MIN(created_at) as first_created,
                MAX(created_at) as last_created
            FROM filter_keywords
            GROUP BY keyword, type, language
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC, keyword
        ";
        
        $stmt = $this->pdo->query($sql);
        $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'data' => [
                'duplicates' => $duplicates,
                'total_duplicate_groups' => count($duplicates),
                'total_duplicate_records' => array_sum(array_column($duplicates, 'duplicate_count'))
            ],
            'message' => '重複チェック完了'
        ];
    }
    
    /**
     * カテゴリ取得
     */
    public function getCategories() {
        $cacheKey = 'categories';
        if ($cached = $this->getCache($cacheKey)) {
            return [
                'data' => $cached,
                'message' => 'カテゴリ取得完了（キャッシュ）'
            ];
        }
        
        // 階層カテゴリ取得
        $stmt = $this->pdo->query("
            WITH RECURSIVE category_tree AS (
                SELECT id, name, parent_id, path, level, color_code, icon, sort_order, 0 as depth
                FROM keyword_categories 
                WHERE parent_id IS NULL AND is_active = TRUE
                
                UNION ALL
                
                SELECT kc.id, kc.name, kc.parent_id, kc.path, kc.level, kc.color_code, kc.icon, kc.sort_order, ct.depth + 1
                FROM keyword_categories kc
                JOIN category_tree ct ON kc.parent_id = ct.id
                WHERE kc.is_active = TRUE
            )
            SELECT 
                ct.*,
                COUNT(fk.id) as keyword_count
            FROM category_tree ct
            LEFT JOIN filter_keywords fk ON fk.category = ct.path
            GROUP BY ct.id, ct.name, ct.parent_id, ct.path, ct.level, ct.color_code, ct.icon, ct.sort_order, ct.depth
            ORDER BY ct.depth, ct.sort_order, ct.name
        ");
        
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 使用統計も取得
        $stmt = $this->pdo->query("
            SELECT 
                category,
                COUNT(*) as usage_count,
                AVG(detection_count) as avg_detections
            FROM filter_keywords 
            WHERE category IS NOT NULL
            GROUP BY category
            ORDER BY usage_count DESC
        ");
        
        $usage_stats = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $result = [
            'categories' => $categories,
            'usage_stats' => $usage_stats,
            'tree_structure' => $this->buildCategoryTree($categories)
        ];
        
        $this->setCache($cacheKey, $result);
        
        return [
            'data' => $result,
            'message' => 'カテゴリ取得完了'
        ];
    }
    
    /**
     * データ検証
     */
    public function validateData() {
        $checks = [];
        
        // 重複キーワードチェック
        $stmt = $this->pdo->query("SELECT * FROM check_duplicate_keywords()");
        $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $checks['duplicate_keywords'] = [
            'status' => empty($duplicates) ? 'PASS' : 'WARNING',
            'count' => count($duplicates),
            'details' => $duplicates
        ];
        
        // データ整合性チェック
        $stmt = $this->pdo->query("SELECT * FROM check_data_integrity()");
        $integrity_results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $checks['data_integrity'] = $integrity_results;
        
        // 孤立レコードチェック
        $stmt = $this->pdo->query("
            SELECT COUNT(*) as orphaned_logs
            FROM keyword_detection_logs kdl
            LEFT JOIN filter_keywords fk ON kdl.keyword_id = fk.id
            WHERE fk.id IS NULL
        ");
        $orphaned = $stmt->fetch(PDO::FETCH_ASSOC);
        $checks['orphaned_logs'] = [
            'status' => $orphaned['orphaned_logs'] == 0 ? 'PASS' : 'FAIL',
            'count' => $orphaned['orphaned_logs']
        ];
        
        // 効果スコア異常チェック
        $stmt = $this->pdo->query("
            SELECT COUNT(*) as invalid_scores
            FROM filter_keywords 
            WHERE effectiveness_score < 0 OR effectiveness_score > 100
        ");
        $invalid_scores = $stmt->fetch(PDO::FETCH_ASSOC);
        $checks['invalid_effectiveness_scores'] = [
            'status' => $invalid_scores['invalid_scores'] == 0 ? 'PASS' : 'WARNING',
            'count' => $invalid_scores['invalid_scores']
        ];
        
        // 総合評価
        $overall_status = 'PASS';
        foreach ($checks as $check) {
            if (is_array($check)) {
                if ($check['status'] === 'FAIL') {
                    $overall_status = 'FAIL';
                    break;
                } elseif ($check['status'] === 'WARNING' && $overall_status !== 'FAIL') {
                    $overall_status = 'WARNING';
                }
            }
        }
        
        return [
            'data' => [
                'overall_status' => $overall_status,
                'checks' => $checks,
                'checked_at' => date('Y-m-d H:i:s')
            ],
            'message' => 'データ検証完了'
        ];
    }
    
    /**
     * データベース最適化
     */
    public function optimizeDatabase() {
        // 管理者権限チェック（実装に応じて）
        // if (!$this->isAdmin()) {
        //     throw new Exception('管理者権限が必要です');
        // }
        
        $optimization_results = [];
        
        try {
            // VACUUM ANALYZE実行
            $this->pdo->exec("VACUUM ANALYZE filter_keywords");
            $optimization_results[] = 'filter_keywords テーブルの最適化完了';
            
            $this->pdo->exec("VACUUM ANALYZE keyword_detection_logs");
            $optimization_results[] = 'keyword_detection_logs テーブルの最適化完了';
            
            // 効果スコア再計算
            $stmt = $this->pdo->query("SELECT calculate_effectiveness_scores()");
            $updated_count = $stmt->fetchColumn();
            $optimization_results[] = "効果スコア再計算完了: {$updated_count}件更新";
            
            // 古いログの削除（90日以上古い）
            $stmt = $this->pdo->prepare("DELETE FROM keyword_detection_logs WHERE created_at < NOW() - INTERVAL '90 days'");
            $stmt->execute();
            $deleted_logs = $stmt->rowCount();
            $optimization_results[] = "古いログ削除: {$deleted_logs}件";
            
            // 統計情報更新
            $this->updateSystemStats();
            $optimization_results[] = "システム統計更新完了";
            
            // キャッシュクリア
            $this->clearCache();
            $optimization_results[] = "キャッシュクリア完了";
            
        } catch (Exception $e) {
            throw new Exception("最適化中にエラーが発生しました: " . $e->getMessage());
        }
        
        return [
            'data' => [
                'operations' => $optimization_results,
                'optimized_at' => date('Y-m-d H:i:s')
            ],
            'message' => 'データベース最適化完了'
        ];
    }
    
    /**
     * キーワード作成
     */
    public function createKeyword() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            throw new Exception('POSTメソッドが必要です');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('無効なJSON形式です');
        }
        
        // バリデーション
        $this->validateKeywordData($input);
        
        // 重複チェック
        $stmt = $this->pdo->prepare("
            SELECT id FROM filter_keywords 
            WHERE keyword = ? AND type = ? AND language = ? 
            AND COALESCE(mall_name, '') = COALESCE(?, '') 
            AND COALESCE(country_code, '') = COALESCE(?, '')
        ");
        $stmt->execute([
            $input['keyword'],
            $input['type'],
            $input['language'] ?? 'en',
            $input['mall_name'] ?? '',
            $input['country_code'] ?? ''
        ]);
        
        if ($stmt->fetch()) {
            throw new Exception('同じキーワードが既に存在します');
        }
        
        // 挿入
        $sql = "
            INSERT INTO filter_keywords (
                keyword, type, priority, language, translation, description,
                category, subcategory, mall_name, country_code, is_active,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            $input['keyword'],
            $input['type'],
            $input['priority'] ?? 'MEDIUM',
            $input['language'] ?? 'en',
            $input['translation'] ?? null,
            $input['description'] ?? null,
            $input['category'] ?? null,
            $input['subcategory'] ?? null,
            $input['mall_name'] ?? null,
            $input['country_code'] ?? null,
            $input['is_active'] ?? true,
            'api_user' // 実際の実装ではセッション情報を使用
        ]);
        
        $newId = $this->pdo->lastInsertId();
        
        // キャッシュクリア
        $this->clearCache();
        
        return [
            'data' => ['id' => $newId],
            'message' => 'キーワードが作成されました'
        ];
    }
    
    /**
     * キーワード更新
     */
    public function updateKeyword() {
        if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
            throw new Exception('PUTメソッドが必要です');
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('無効なJSON形式です');
        }
        
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) {
            throw new Exception('有効なIDが必要です');
        }
        
        // 存在チェック
        $stmt = $this->pdo->prepare("SELECT * FROM filter_keywords WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$existing) {
            throw new Exception('キーワードが見つかりません');
        }
        
        // バリデーション
        $this->validateKeywordData($input, $id);
        
        // 更新可能フィールドを制限
        $allowedFields = [
            'keyword', 'priority', 'translation', 'description', 'category', 
            'subcategory', 'is_active'
        ];
        
        $updates = [];
        $params = [];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $updates[] = "{$field} = ?";
                $params[] = $input[$field];
            }
        }
        
        if (empty($updates)) {
            throw new Exception('更新するフィールドがありません');
        }
        
        $params[] = date('Y-m-d H:i:s'); // updated_at
        $params[] = $id;
        
        $sql = "UPDATE filter_keywords SET " . implode(', ', $updates) . ", updated_at = ? WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        // キャッシュクリア
        $this->clearCache();
        
        return [
            'data' => ['id' => $id, 'updated_fields' => array_keys(array_intersect_key($input, array_flip($allowedFields)))],
            'message' => 'キーワードが更新されました'
        ];
    }
    
    /**
     * キーワード削除
     */
    public function deleteKeyword() {
        if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
            throw new Exception('DELETEメソッドが必要です');
        }
        
        $id = intval($_GET['id'] ?? 0);
        if ($id <= 0) {
            throw new Exception('有効なIDが必要です');
        }
        
        // 検出回数チェック
        $stmt = $this->pdo->prepare("SELECT detection_count FROM filter_keywords WHERE id = ?");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            throw new Exception('キーワードが見つかりません');
        }
        
        if ($result['detection_count'] > 0) {
            throw new Exception('検出実績があるキーワードは削除できません');
        }
        
        // 削除実行
        $stmt = $this->pdo->prepare("DELETE FROM filter_keywords WHERE id = ?");
        $stmt->execute([$id]);
        
        // キャッシュクリア
        $this->clearCache();
        
        return [
            'data' => ['id' => $id],
            'message' => 'キーワードが削除されました'
        ];
    }
    
    /**
     * キーワードデータ検証
     */
    private function validateKeywordData($data, $excludeId = null) {
        $required = ['keyword', 'type'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("必須フィールド '{$field}' が不足しています");
            }
        }
        
        // 型検証
        if (!in_array($data['type'], ['EXPORT', 'PATENT_TROLL', 'VERO', 'MALL_SPECIFIC', 'COUNTRY_SPECIFIC'])) {
            throw new Exception('無効なタイプです');
        }
        
        if (isset($data['priority']) && !in_array($data['priority'], ['HIGH', 'MEDIUM', 'LOW'])) {
            throw new Exception('無効な優先度です');
        }
        
        if (isset($data['language']) && !in_array($data['language'], ['en', 'ja', 'zh', 'ko', 'es', 'fr', 'de'])) {
            throw new Exception('無効な言語コードです');
        }
        
        // 長さ検証
        if (mb_strlen($data['keyword']) > 500) {
            throw new Exception('キーワードが長すぎます（500文字以内）');
        }
        
        if (isset($data['description']) && mb_strlen($data['description']) > 1000) {
            throw new Exception('説明が長すぎます（1000文字以内）');
        }
    }
    
    /**
     * エクスポート用データ取得
     */
    private function getExportData($filters) {
        [$whereClause, $params] = $this->buildWhereClause($filters);
        $orderClause = $this->buildOrderClause($filters);
        
        $sql = "
            SELECT 
                fk.id, fk.keyword, fk.type, fk.priority, fk.language, fk.translation,
                fk.description, fk.category, fk.subcategory, fk.mall_name, fk.country_code,
                fk.detection_count, fk.effectiveness_score, fk.false_positive_rate,
                fk.is_active, fk.created_at, fk.updated_at
            FROM filter_keywords fk
            {$whereClause}
            {$orderClause}
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * JSON生成
     */
    private function generateJSONExport($data) {
        $json = json_encode([
            'export_info' => [
                'generated_at' => date('Y-m-d H:i:s'),
                'version' => '2.0',
                'record_count' => count($data)
            ],
            'data' => $data
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        $filename = 'filter_keywords_' . date('Y-m-d_H-i-s') . '.json';
        
        return [
            'data' => [
                'filename' => $filename,
                'content' => base64_encode($json),
                'mime_type' => 'application/json',
                'size' => strlen($json),
                'record_count' => count($data)
            ],
            'message' => 'JSONエクスポート完了'
        ];
    }
    
    /**
     * カテゴリツリー構築
     */
    private function buildCategoryTree($categories) {
        $tree = [];
        $indexed = [];
        
        // インデックス作成
        foreach ($categories as $category) {
            $indexed[$category['id']] = $category;
            $indexed[$category['id']]['children'] = [];
        }
        
        // ツリー構築
        foreach ($indexed as $category) {
            if ($category['parent_id'] === null) {
                $tree[] = &$indexed[$category['id']];
            } else {
                $indexed[$category['parent_id']]['children'][] = &$indexed[$category['id']];
            }
        }
        
        return $tree;
    }
    
    /**
     * フィルター概要取得
     */
    private function getFiltersSummary($filters, $totalCount) {
        $activeFilters = [];
        
        if ($filters['filter_type'] !== 'all') {
            $activeFilters[] = ['type' => 'filter_type', 'value' => $filters['filter_type'], 'label' => 'タイプ'];
        }
        if (!empty($filters['search'])) {
            $activeFilters[] = ['type' => 'search', 'value' => $filters['search'], 'label' => '検索'];
        }
        if (!empty($filters['priority'])) {
            $activeFilters[] = ['type' => 'priority', 'value' => $filters['priority'], 'label' => '優先度'];
        }
        if (!empty($filters['language'])) {
            $activeFilters[] = ['type' => 'language', 'value' => $filters['language'], 'label' => '言語'];
        }
        if (!empty($filters['status'])) {
            $activeFilters[] = ['type' => 'status', 'value' => $filters['status'], 'label' => 'ステータス'];
        }
        
        return [
            'active_filters' => $activeFilters,
            'active_count' => count($activeFilters),
            'result_count' => $totalCount,
            'sort' => ['field' => $filters['sort'], 'direction' => $filters['dir']]
        ];
    }
    
    /**
     * システム統計更新
     */
    private function updateSystemStats() {
        $sql = "
            INSERT INTO filter_system_stats (
                date_recorded, total_keywords, active_keywords, total_detections,
                new_keywords_today, updated_keywords_today, avg_detection_per_keyword
            )
            SELECT 
                CURRENT_DATE,
                COUNT(*),
                COUNT(CASE WHEN is_active THEN 1 END),
                COALESCE(SUM(detection_count), 0),
                COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END),
                COUNT(CASE WHEN updated_at::date = CURRENT_DATE THEN 1 END),
                COALESCE(AVG(detection_count), 0)
            FROM filter_keywords
            ON CONFLICT (date_recorded) DO UPDATE SET
                total_keywords = EXCLUDED.total_keywords,
                active_keywords = EXCLUDED.active_keywords,
                total_detections = EXCLUDED.total_detections,
                new_keywords_today = EXCLUDED.new_keywords_today,
                updated_keywords_today = EXCLUDED.updated_keywords_today,
                avg_detection_per_keyword = EXCLUDED.avg_detection_per_keyword,
                created_at = NOW()
        ";
        
        $this->pdo->exec($sql);
    }
}
?>
    