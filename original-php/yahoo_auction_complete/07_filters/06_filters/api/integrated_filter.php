<?php
/**
 * 統合フィルターAPIシステム
 * 5段階フィルタリング（輸出禁止・パテントトロール・国別・モール別・VERO）統合管理
 * 
 * エンドポイント: api/integrated_filter.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

require_once '../../shared/core/includes.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
function validateCSRFToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// エラーレスポンス
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 成功レスポンス
function sendSuccess($data = [], $message = 'Success') {
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// リクエスト検証
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('POSTメソッドのみ許可されています', 405);
}

// CSRFチェック（開発時は無効化）
if (false && !validateCSRFToken()) {
    sendError('CSRFトークンが無効です', 403);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('不正なJSONフォーマットです');
}

$action = $input['action'] ?? '';

// データベース接続確認
try {
    require_once '../../shared/core/database.php';
    $db = Database::getInstance();
    $pdo = $db->getPDO();
} catch (Exception $e) {
    sendError('データベース接続エラー: ' . $e->getMessage(), 500);
}

// アクション別処理
try {
    switch ($action) {
        // データ取得系
        case 'get_filter_data':
            $data = getFilterData($pdo, $input['filter_type'] ?? '');
            sendSuccess($data, 'フィルターデータ取得完了');
            break;
            
        case 'get_statistics':
            $stats = getFilterStatistics($pdo);
            sendSuccess($stats, '統計データ取得完了');
            break;
            
        // データ管理系
        case 'add_keyword':
            $result = addKeyword($pdo, $input);
            sendSuccess($result, 'キーワード追加完了');
            break;
            
        case 'update_keyword':
            $result = updateKeyword($pdo, $input);
            sendSuccess($result, 'キーワード更新完了');
            break;
            
        case 'delete_keywords':
            $result = deleteKeywords($pdo, $input['keyword_ids'] ?? []);
            sendSuccess($result, 'キーワード削除完了');
            break;
            
        // 統合フィルタリング実行
        case 'execute_integrated_filter':
            $result = executeIntegratedFilter($pdo, $input);
            sendSuccess($result, '統合フィルタリング完了');
            break;
            
        default:
            sendError('不正なアクションです');
    }
    
} catch (Exception $e) {
    error_log('Integrated Filter API Error: ' . $e->getMessage());
    sendError('システムエラーが発生しました: ' . $e->getMessage(), 500);
}

/**
 * フィルターデータ取得
 */
function getFilterData($pdo, $filterType) {
    switch ($filterType) {
        case 'export':
            return getExportKeywords($pdo);
        case 'patent-troll':
            return getPatentTrollCases($pdo);
        case 'country':
            return getCountryRestrictions($pdo);
        case 'mall':
            return getMallRestrictions($pdo);
        case 'vero':
            return getVeroParticipants($pdo);
        default:
            return getAllFilterData($pdo);
    }
}

/**
 * 輸出禁止キーワード取得
 */
function getExportKeywords($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, keyword, priority, detection_count, created_at, updated_at, is_active
        FROM filter_keywords 
        WHERE type = 'EXPORT'
        ORDER BY detection_count DESC, created_at DESC
        LIMIT 100
    ");
    $stmt->execute();
    
    return [
        'type' => 'export',
        'total_count' => $stmt->rowCount(),
        'keywords' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

/**
 * パテントトロール事例取得
 */
function getPatentTrollCases($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, case_title, patent_number, plaintiff, defendant, 
               case_summary, risk_level, case_date, source_url, 
               scraping_date, is_active
        FROM patent_troll_cases 
        WHERE is_active = TRUE
        ORDER BY case_date DESC, risk_level DESC
        LIMIT 100
    ");
    $stmt->execute();
    
    return [
        'type' => 'patent-troll',
        'total_count' => $stmt->rowCount(),
        'cases' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

/**
 * 国別規制情報取得
 */
function getCountryRestrictions($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, country_code, country_name, restriction_type, 
               restricted_keywords, description, effective_date, 
               source_url, last_updated, is_active
        FROM country_restrictions 
        WHERE is_active = TRUE
        ORDER BY country_name, restriction_type
        LIMIT 200
    ");
    $stmt->execute();
    
    return [
        'type' => 'country',
        'total_count' => $stmt->rowCount(),
        'restrictions' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

/**
 * モール別規制取得
 */
function getMallRestrictions($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, keyword, mall_name, priority, detection_count, 
               created_at, updated_at, is_active
        FROM filter_keywords 
        WHERE type = 'MALL_SPECIFIC' AND is_active = TRUE
        ORDER BY mall_name, detection_count DESC
        LIMIT 500
    ");
    $stmt->execute();
    
    return [
        'type' => 'mall',
        'total_count' => $stmt->rowCount(),
        'restrictions' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

/**
 * VERO参加者取得
 */
function getVeroParticipants($pdo) {
    $stmt = $pdo->prepare("
        SELECT id, brand_name, company_name, vero_id, 
               protected_keywords, status, last_updated,
               scraping_source, created_at
        FROM vero_participants 
        WHERE status = 'ACTIVE'
        ORDER BY brand_name
        LIMIT 1000
    ");
    $stmt->execute();
    
    return [
        'type' => 'vero',
        'total_count' => $stmt->rowCount(),
        'participants' => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ];
}

/**
 * 統計データ取得
 */
function getFilterStatistics($pdo) {
    $stats = [];
    
    // 各フィルタータイプ別統計
    $filterTypes = ['EXPORT', 'PATENT_TROLL', 'COUNTRY_SPECIFIC', 'MALL_SPECIFIC', 'VERO'];
    
    foreach ($filterTypes as $type) {
        try {
            $stmt = $pdo->prepare("
                SELECT 
                    COUNT(*) as total_keywords,
                    COALESCE(SUM(detection_count), 0) as total_detections,
                    COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_keywords,
                    COALESCE(AVG(detection_count), 0) as avg_detections
                FROM filter_keywords 
                WHERE type = ?
            ");
            $stmt->execute([$type]);
            $stats[strtolower($type)] = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $stats[strtolower($type)] = [
                'total_keywords' => 0,
                'total_detections' => 0,
                'active_keywords' => 0,
                'avg_detections' => 0
            ];
        }
    }
    
    // パテントトロール統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_cases,
                COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_risk,
                COUNT(CASE WHEN risk_level = 'MEDIUM' THEN 1 END) as medium_risk,
                COUNT(CASE WHEN risk_level = 'LOW' THEN 1 END) as low_risk,
                COUNT(CASE WHEN case_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_cases
            FROM patent_troll_cases 
            WHERE is_active = TRUE
        ");
        $stats['patent_cases'] = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $stats['patent_cases'] = [
            'total_cases' => 0, 'high_risk' => 0, 'medium_risk' => 0, 
            'low_risk' => 0, 'recent_cases' => 0
        ];
    }
    
    // VERO統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_brands,
                COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_brands
            FROM vero_participants
        ");
        $veroStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $veroStats['total_protected_keywords'] = 0; // JSON処理は後で実装
        $stats['vero_stats'] = $veroStats;
    } catch (Exception $e) {
        $stats['vero_stats'] = [
            'total_brands' => 0, 
            'active_brands' => 0, 
            'total_protected_keywords' => 0
        ];
    }
    
    // 国別規制統計
    try {
        $stmt = $pdo->query("
            SELECT 
                COUNT(DISTINCT country_code) as total_countries,
                COUNT(*) as total_restrictions,
                COUNT(CASE WHEN restriction_type = 'IMPORT_BAN' THEN 1 END) as import_bans,
                COUNT(CASE WHEN restriction_type = 'EXPORT_BAN' THEN 1 END) as export_bans
            FROM country_restrictions 
            WHERE is_active = TRUE
        ");
        $stats['country_stats'] = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $stats['country_stats'] = [
            'total_countries' => 0, 'total_restrictions' => 0,
            'import_bans' => 0, 'export_bans' => 0
        ];
    }
    
    return $stats;
}

/**
 * キーワード追加
 */
function addKeyword($pdo, $data) {
    $required = ['keyword', 'type'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            throw new InvalidArgumentException("必須フィールド '{$field}' が不足しています");
        }
    }
    
    // 重複チェック
    $stmt = $pdo->prepare("
        SELECT id FROM filter_keywords 
        WHERE keyword = ? AND type = ?
    ");
    $stmt->execute([$data['keyword'], $data['type']]);
    
    if ($stmt->rowCount() > 0) {
        throw new Exception('このキーワードは既に登録されています');
    }
    
    // 挿入実行
    $stmt = $pdo->prepare("
        INSERT INTO filter_keywords (
            keyword, type, priority, mall_name, country_code, 
            detection_count, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, TRUE, NOW())
    ");
    
    $result = $stmt->execute([
        $data['keyword'],
        $data['type'],
        $data['priority'] ?? 'MEDIUM',
        $data['mall_name'] ?? null,
        $data['country_code'] ?? null
    ]);
    
    if ($result) {
        return ['keyword_id' => $pdo->lastInsertId()];
    }
    
    throw new Exception('キーワード追加に失敗しました');
}

/**
 * キーワード更新
 */
function updateKeyword($pdo, $data) {
    if (empty($data['id'])) {
        throw new InvalidArgumentException('キーワードIDが必要です');
    }
    
    $updateFields = [];
    $params = [];
    
    $allowedFields = ['keyword', 'type', 'priority', 'mall_name', 'country_code', 'is_active'];
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $updateFields[] = "$field = ?";
            $params[] = $data[$field];
        }
    }
    
    if (empty($updateFields)) {
        throw new InvalidArgumentException('更新するフィールドが指定されていません');
    }
    
    $updateFields[] = "updated_at = NOW()";
    $params[] = $data['id'];
    
    $stmt = $pdo->prepare("
        UPDATE filter_keywords 
        SET " . implode(', ', $updateFields) . "
        WHERE id = ?
    ");
    
    $result = $stmt->execute($params);
    
    if ($result && $stmt->rowCount() > 0) {
        return ['updated' => true, 'affected_rows' => $stmt->rowCount()];
    }
    
    throw new Exception('キーワード更新に失敗しました');
}

/**
 * キーワード削除
 */
function deleteKeywords($pdo, $keywordIds) {
    if (empty($keywordIds) || !is_array($keywordIds)) {
        throw new InvalidArgumentException('削除するキーワードIDが指定されていません');
    }
    
    $placeholders = str_repeat('?,', count($keywordIds) - 1) . '?';
    $stmt = $pdo->prepare("DELETE FROM filter_keywords WHERE id IN ($placeholders)");
    
    $result = $stmt->execute($keywordIds);
    
    if ($result) {
        return ['deleted_count' => $stmt->rowCount()];
    }
    
    throw new Exception('キーワード削除に失敗しました');
}

/**
 * 統合フィルタリング実行
 */
function executeIntegratedFilter($pdo, $data) {
    if (empty($data['product_title'])) {
        throw new InvalidArgumentException('商品タイトルが必要です');
    }
    
    $title = $data['product_title'];
    $description = $data['product_description'] ?? '';
    $targetMall = $data['target_mall'] ?? '';
    $targetCountry = $data['target_country'] ?? '';
    
    $filterResults = [
        'export' => checkExportRestrictions($pdo, $title, $description),
        'patent_troll' => checkPatentTrollRisks($pdo, $title, $description),
        'country' => checkCountryRestrictions($pdo, $title, $description, $targetCountry),
        'mall' => checkMallRestrictions($pdo, $title, $description, $targetMall),
        'vero' => checkVeroRestrictions($pdo, $title, $description)
    ];
    
    // 総合判定
    $overallStatus = 'OK';
    $blockedFilters = [];
    
    foreach ($filterResults as $filterType => $result) {
        if (!$result['passed']) {
            $overallStatus = 'NG';
            $blockedFilters[] = $filterType;
        }
    }
    
    return [
        'overall_status' => $overallStatus,
        'blocked_filters' => $blockedFilters,
        'filter_details' => $filterResults,
        'risk_score' => calculateRiskScore($filterResults)
    ];
}

// 各フィルターチェック関数
function checkExportRestrictions($pdo, $title, $description) {
    $stmt = $pdo->prepare("
        SELECT keyword FROM filter_keywords 
        WHERE type = 'EXPORT' AND is_active = TRUE
    ");
    $stmt->execute();
    $keywords = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    return performKeywordCheck($title . ' ' . $description, $keywords, 'export');
}

function checkPatentTrollRisks($pdo, $title, $description) {
    $stmt = $pdo->prepare("
        SELECT keyword FROM filter_keywords 
        WHERE type = 'PATENT_TROLL' AND is_active = TRUE
    ");
    $stmt->execute();
    $keywords = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    return performKeywordCheck($title . ' ' . $description, $keywords, 'patent_troll');
}

function checkCountryRestrictions($pdo, $title, $description, $country) {
    if (empty($country)) {
        return ['passed' => true, 'detected_keywords' => [], 'message' => '対象国が未指定'];
    }
    
    $stmt = $pdo->prepare("
        SELECT restricted_keywords FROM country_restrictions 
        WHERE country_code = ? AND is_active = TRUE
    ");
    $stmt->execute([$country]);
    
    $keywords = [];
    while ($row = $stmt->fetch()) {
        if (!empty($row['restricted_keywords'])) {
            $keywords = array_merge($keywords, explode(',', $row['restricted_keywords']));
        }
    }
    
    return performKeywordCheck($title . ' ' . $description, $keywords, 'country');
}

function checkMallRestrictions($pdo, $title, $description, $mall) {
    if (empty($mall)) {
        return ['passed' => true, 'detected_keywords' => [], 'message' => '対象モールが未指定'];
    }
    
    $stmt = $pdo->prepare("
        SELECT keyword FROM filter_keywords 
        WHERE type = 'MALL_SPECIFIC' AND mall_name = ? AND is_active = TRUE
    ");
    $stmt->execute([$mall]);
    $keywords = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    return performKeywordCheck($title . ' ' . $description, $keywords, 'mall');
}

function checkVeroRestrictions($pdo, $title, $description) {
    $stmt = $pdo->prepare("
        SELECT protected_keywords FROM vero_participants 
        WHERE status = 'ACTIVE'
    ");
    $stmt->execute();
    
    $keywords = [];
    while ($row = $stmt->fetch()) {
        if (!empty($row['protected_keywords'])) {
            $protectedKeywords = json_decode($row['protected_keywords'], true);
            if (is_array($protectedKeywords)) {
                $keywords = array_merge($keywords, $protectedKeywords);
            }
        }
    }
    
    return performKeywordCheck($title . ' ' . $description, $keywords, 'vero');
}

/**
 * キーワードチェック実行
 */
function performKeywordCheck($text, $keywords, $filterType) {
    $detectedKeywords = [];
    $textLower = mb_strtolower($text, 'UTF-8');
    
    foreach ($keywords as $keyword) {
        $keyword = trim($keyword);
        if (empty($keyword)) continue;
        
        $keywordLower = mb_strtolower($keyword, 'UTF-8');
        if (mb_strpos($textLower, $keywordLower) !== false) {
            $detectedKeywords[] = $keyword;
        }
    }
    
    return [
        'passed' => empty($detectedKeywords),
        'detected_keywords' => $detectedKeywords,
        'filter_type' => $filterType,
        'message' => empty($detectedKeywords) ? 
                    "{$filterType}フィルター通過" : 
                    count($detectedKeywords) . "個のキーワードが検出されました"
    ];
}

/**
 * リスクスコア計算
 */
function calculateRiskScore($filterResults) {
    $score = 0;
    $weights = [
        'export' => 25,
        'patent_troll' => 20,
        'vero' => 20,
        'country' => 15,
        'mall' => 10
    ];
    
    foreach ($filterResults as $filterType => $result) {
        if (!$result['passed']) {
            $keywordCount = count($result['detected_keywords']);
            $score += $weights[$filterType] * min($keywordCount, 3); // 最大3倍まで
        }
    }
    
    return min($score, 100); // 最大100点
}
