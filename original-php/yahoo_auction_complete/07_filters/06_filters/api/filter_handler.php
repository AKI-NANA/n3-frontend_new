<?php
/**
 * フィルターハンドラーAPI
 * モール選択時の第2段階フィルタリング処理
 * 
 * エンドポイント: api/filter_handler.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

// 共通設定読み込み
require_once '../../shared/core/includes.php';

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
function validateCSRFToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// エラーハンドリング
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

if (!validateCSRFToken()) {
    sendError('CSRFトークンが無効です', 403);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('不正なJSONフォーマットです');
}

$action = $input['action'] ?? '';
$productId = $input['product_id'] ?? 0;

// アクション別処理
try {
    switch ($action) {
        case 'execute_mall_filter':
            executeMallFilter($productId, $input['mall_name'] ?? '');
            break;
            
        case 'clear_mall_filter':
            clearMallFilter($productId);
            break;
            
        default:
            sendError('不正なアクションです');
    }
} catch (Exception $e) {
    error_log('Filter Handler Error: ' . $e->getMessage());
    sendError('システムエラーが発生しました: ' . $e->getMessage(), 500);
}

/**
 * モール専用フィルター実行
 */
function executeMallFilter($productId, $mallName) {
    global $pdo;
    
    // 入力検証
    if (!is_numeric($productId) || $productId <= 0) {
        sendError('無効な商品IDです');
    }
    
    $allowedMalls = ['ebay', 'amazon', 'etsy', 'mercari'];
    if (!in_array($mallName, $allowedMalls)) {
        sendError('無効なモール名です');
    }
    
    // 商品情報取得
    $stmt = $pdo->prepare("
        SELECT id, title, description, export_filter_status, patent_filter_status
        FROM yahoo_scraped_products 
        WHERE id = ?
    ");
    $stmt->execute([$productId]);
    $product = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$product) {
        sendError('商品が見つかりません');
    }
    
    // 第1段階フィルター通過チェック
    if (!$product['export_filter_status'] || !$product['patent_filter_status']) {
        sendError('第1段階フィルター（輸出・特許）を通過していない商品です');
    }
    
    // モール専用キーワード取得
    $mallKeywords = getMallKeywords($mallName);
    if (empty($mallKeywords)) {
        // キーワードが存在しない場合は自動的にOK
        updateMallFilterResult($productId, $mallName, true, '');
        return;
    }
    
    // フィルタリング実行
    $detectedKeywords = performKeywordCheck(
        $product['title'] . ' ' . $product['description'], 
        $mallKeywords
    );
    
    $mallFilterStatus = empty($detectedKeywords);
    $detectedKeywordsText = implode(', ', $detectedKeywords);
    
    // 結果をデータベースに保存
    updateMallFilterResult($productId, $mallName, $mallFilterStatus, $detectedKeywordsText);
    
    // 最終判定を更新
    updateFinalJudgment($productId);
    
    // レスポンス用データ取得
    $updatedProduct = getUpdatedProductData($productId);
    
    sendSuccess($updatedProduct, 'モールフィルタリング完了');
}

/**
 * モールフィルタークリア
 */
function clearMallFilter($productId) {
    global $pdo;
    
    if (!is_numeric($productId) || $productId <= 0) {
        sendError('無効な商品IDです');
    }
    
    // モール関連フィールドをクリア
    $stmt = $pdo->prepare("
        UPDATE yahoo_scraped_products 
        SET selected_mall = NULL, 
            mall_filter_status = NULL, 
            mall_detected_keywords = NULL,
            final_judgment = CASE 
                WHEN export_filter_status = TRUE AND patent_filter_status = TRUE THEN 'PENDING'
                ELSE 'NG'
            END,
            filter_updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([$productId]);
    
    if ($stmt->rowCount() === 0) {
        sendError('商品の更新に失敗しました');
    }
    
    $updatedProduct = getUpdatedProductData($productId);
    sendSuccess($updatedProduct, 'モール選択をクリアしました');
}

/**
 * モール専用キーワード取得
 */
function getMallKeywords($mallName) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT keyword 
        FROM filter_keywords 
        WHERE type = 'MALL' 
            AND mall_name = ? 
            AND is_active = TRUE
        ORDER BY keyword
    ");
    $stmt->execute([$mallName]);
    
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * キーワードチェック実行
 */
function performKeywordCheck($text, $keywords) {
    $detectedKeywords = [];
    $textLower = mb_strtolower($text, 'UTF-8');
    
    foreach ($keywords as $keyword) {
        $keywordLower = mb_strtolower($keyword, 'UTF-8');
        if (mb_strpos($textLower, $keywordLower) !== false) {
            $detectedKeywords[] = $keyword;
        }
    }
    
    return $detectedKeywords;
}

/**
 * モールフィルター結果更新
 */
function updateMallFilterResult($productId, $mallName, $status, $detectedKeywords) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        UPDATE yahoo_scraped_products 
        SET selected_mall = ?,
            mall_filter_status = ?,
            mall_detected_keywords = ?,
            filter_updated_at = NOW()
        WHERE id = ?
    ");
    
    $result = $stmt->execute([$mallName, $status, $detectedKeywords, $productId]);
    
    if (!$result) {
        throw new Exception('データベース更新エラー');
    }
}

/**
 * 最終判定更新
 */
function updateFinalJudgment($productId) {
    global $pdo;
    
    // 3段階すべてのフィルター状態をチェック
    $stmt = $pdo->prepare("
        UPDATE yahoo_scraped_products 
        SET final_judgment = CASE 
            WHEN export_filter_status = TRUE 
                AND patent_filter_status = TRUE 
                AND mall_filter_status = TRUE THEN 'OK'
            WHEN export_filter_status = FALSE 
                OR patent_filter_status = FALSE 
                OR mall_filter_status = FALSE THEN 'NG'
            ELSE 'PENDING'
        END
        WHERE id = ?
    ");
    
    $stmt->execute([$productId]);
}

/**
 * 更新後の商品データ取得
 */
function getUpdatedProductData($productId) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT export_filter_status, export_detected_keywords,
               patent_filter_status, patent_detected_keywords,
               mall_filter_status, mall_detected_keywords,
               final_judgment, selected_mall
        FROM yahoo_scraped_products 
        WHERE id = ?
    ");
    $stmt->execute([$productId]);
    
    $data = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$data) {
        throw new Exception('更新された商品データが見つかりません');
    }
    
    return $data;
}