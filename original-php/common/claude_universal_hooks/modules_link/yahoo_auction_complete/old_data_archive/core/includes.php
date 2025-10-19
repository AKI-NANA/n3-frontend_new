<?php
/**
 * Yahoo Auction Tool Core Functions
 * 元ファイル（yahoo_auction_tool_content.php）から共通機能を抽出・統合
 * 抽出元: 行1-50（セッション・セキュリティ・エラーハンドリング）
 */

// セッション・セキュリティ（元ファイル 行6-11）
session_start();
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// エラー処理設定（元ファイル 行13-16）
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// データベース接続（元ファイルの database_query_handler.php 統合）
require_once __DIR__ . '/database_manager.php';

/**
 * 共通レスポンス関数（元ファイルから抽出・改良）
 * 使用箇所: 元ファイル 行25-40 のJSON応答処理を統合
 */
function sendJsonResponse($data, $success = true, $message = '') {
    // 出力バッファクリア（エラー防止）
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'csrf_token' => $_SESSION['csrf_token'] ?? ''
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

/**
 * ワークフローデータ管理（新規追加 - ツール間連携用）
 * 各独立ツールがデータを共有するためのシステム
 */
function saveWorkflowData($step, $toolName, $data, $status = 'completed') {
    try {
        $db = getDatabaseConnection();
        $sessionId = session_id();
        
        $query = "INSERT INTO workflow_data (session_id, workflow_step, tool_name, data_payload, status, updated_at) 
                  VALUES (?, ?, ?, ?, ?, NOW()) 
                  ON CONFLICT (session_id, workflow_step, tool_name) 
                  DO UPDATE SET data_payload = EXCLUDED.data_payload, status = EXCLUDED.status, updated_at = NOW()";
        
        $stmt = $db->prepare($query);
        return $stmt->execute([
            $sessionId, 
            (int)$step, 
            $toolName, 
            json_encode($data, JSON_UNESCAPED_UNICODE), 
            $status
        ]);
        
    } catch (Exception $e) {
        error_log("ワークフローデータ保存エラー: " . $e->getMessage());
        return false;
    }
}

/**
 * ワークフローデータ取得
 */
function getWorkflowData($step = null, $toolName = null) {
    try {
        $db = getDatabaseConnection();
        $sessionId = session_id();
        
        if ($step && $toolName) {
            // 特定ステップ・ツールのデータ取得
            $query = "SELECT * FROM workflow_data WHERE session_id = ? AND workflow_step = ? AND tool_name = ? ORDER BY updated_at DESC LIMIT 1";
            $stmt = $db->prepare($query);
            $stmt->execute([$sessionId, $step, $toolName]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else if ($step) {
            // 特定ステップの全データ取得
            $query = "SELECT * FROM workflow_data WHERE session_id = ? AND workflow_step = ? ORDER BY updated_at DESC";
            $stmt = $db->prepare($query);
            $stmt->execute([$sessionId, $step]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            // 全ワークフローデータ取得
            $query = "SELECT * FROM workflow_data WHERE session_id = ? ORDER BY workflow_step ASC, updated_at DESC";
            $stmt = $db->prepare($query);
            $stmt->execute([$sessionId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
    } catch (Exception $e) {
        error_log("ワークフローデータ取得エラー: " . $e->getMessage());
        return null;
    }
}

/**
 * 次のワークフローステップ取得
 */
function getNextWorkflowStep() {
    try {
        $workflowData = getWorkflowData();
        $completedSteps = [];
        
        foreach ($workflowData as $data) {
            if ($data['status'] === 'completed') {
                $completedSteps[] = (int)$data['workflow_step'];
            }
        }
        
        if (empty($completedSteps)) {
            return 1; // 最初のステップ（スクレイピング）
        }
        
        $maxCompletedStep = max($completedSteps);
        return min(10, $maxCompletedStep + 1); // 最大10ステップ
        
    } catch (Exception $e) {
        error_log("次ステップ取得エラー: " . $e->getMessage());
        return 1;
    }
}

/**
 * CSRF保護
 */
function validateCSRFToken($token = null) {
    if (!$token) {
        $token = $_POST['csrf_token'] ?? $_GET['csrf_token'] ?? '';
    }
    
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * リクエスト種別判定（元ファイル 行20-25 から抽出）
 */
function isAjaxRequest() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest';
}

/**
 * セキュリティヘッダー設定
 */
function setSecurityHeaders() {
    if (!headers_sent()) {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('X-XSS-Protection: 1; mode=block');
        header('Referrer-Policy: strict-origin-when-cross-origin');
    }
}

/**
 * ログ出力（統一フォーマット）
 */
function logMessage($message, $level = 'INFO', $context = []) {
    $timestamp = date('Y-m-d H:i:s');
    $sessionId = session_id();
    $contextStr = empty($context) ? '' : ' | Context: ' . json_encode($context);
    
    $logEntry = "[{$timestamp}] [{$level}] [Session: {$sessionId}] {$message}{$contextStr}";
    error_log($logEntry);
}

// システム初期化時にセキュリティヘッダー設定
setSecurityHeaders();

// ワークフローデータテーブル作成（初回実行時）
try {
    $db = getDatabaseConnection();
    if ($db) {
        $createTableSQL = "
        CREATE TABLE IF NOT EXISTS workflow_data (
            id SERIAL PRIMARY KEY,
            session_id VARCHAR(255) NOT NULL,
            workflow_step INTEGER NOT NULL,
            tool_name VARCHAR(100) NOT NULL,
            data_payload JSONB NOT NULL,
            status VARCHAR(50) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            
            UNIQUE(session_id, workflow_step, tool_name)
        );
        
        CREATE INDEX IF NOT EXISTS idx_workflow_session ON workflow_data(session_id);
        CREATE INDEX IF NOT EXISTS idx_workflow_step ON workflow_data(workflow_step);
        CREATE INDEX IF NOT EXISTS idx_workflow_tool ON workflow_data(tool_name);
        ";
        
        $db->exec($createTableSQL);
        logMessage("ワークフローデータテーブル初期化完了", 'INFO');
    }
} catch (Exception $e) {
    logMessage("ワークフローテーブル作成エラー: " . $e->getMessage(), 'ERROR');
}

logMessage("Yahoo Auction Tool Core システム初期化完了", 'INFO');
?>
