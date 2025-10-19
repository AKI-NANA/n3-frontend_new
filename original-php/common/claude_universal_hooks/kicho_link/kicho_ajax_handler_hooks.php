<?php
/**
 * 🎯 KICHO Hook統合版 Ajax Handler
 * 
 * ✅ Python Hook統合対応
 * ✅ 40個data-action完全実装
 * ✅ 既存システムとの並行運用
 * 
 * 使用方法:
 * kicho_content.php で以下に変更:
 * <script src="common/js/hooks/kicho_hooks_engine.js"></script>
 * Ajax送信先: modules/kicho/kicho_ajax_handler_hooks.php
 */

// 統合版Ajax Handler（新Hook統合システム）
require_once 'kicho_ajax_handler.php'; // 既存機能継承

class KichoHooksAjaxHandler extends KichoPHPHookIntegration {
    
    private $pythonHooksUrl = 'http://localhost:8001';
    
    public function __construct() {
        parent::__construct();
        error_log("🎯 Kicho Hooks統合Ajax Handler初期化");
    }
    
    /**
     * Hook統合版メインハンドラー
     */
    public function handleHooksRequest() {
        try {
            $action = $_POST['action'] ?? $_GET['action'] ?? '';
            $data = $_POST['data'] ?? $_GET['data'] ?? [];
            
            error_log("🔗 Hook統合処理: $action");
            
            // Python Hook連携が必要なアクション
            $pythonActions = [
                'execute-mf-import',
                'process-csv-upload', 
                'add-text-to-learning',
                'execute-integrated-ai-learning',
                'bulk-approve-transactions',
                'refresh-all',
                'generate-advanced-report'
            ];
            
            if (in_array($action, $pythonActions)) {
                // Python Hook経由で実行
                return $this->executePythonHook($action, $data);
            } else {
                // 既存PHP処理で実行
                return parent::handleAjaxRequest();
            }
            
        } catch (Exception $e) {
            error_log("❌ Hook統合処理エラー: " . $e->getMessage());
            return $this->errorResponse($e->getMessage());
        }
    }
    
    /**
     * Python Hook API連携
     */
    private function executePythonHook($action, $data) {
        try {
            $url = $this->pythonHooksUrl . '/kicho/execute';
            
            $postData = json_encode([
                'action' => $action,
                'data' => $data,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
            $context = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => [
                        'Content-Type: application/json',
                        'Content-Length: ' . strlen($postData)
                    ],
                    'content' => $postData,
                    'timeout' => 30
                ]
            ]);
            
            $response = file_get_contents($url, false, $context);
            
            if ($response === false) {
                // Python Hook連携失敗時は既存処理にフォールバック
                error_log("⚠️ Python Hook連携失敗、既存処理にフォールバック: $action");
                return parent::handleAjaxRequest();
            }
            
            $result = json_decode($response, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Python Hook応答解析失敗');
            }
            
            error_log("✅ Python Hook統合成功: $action");
            return $result;
            
        } catch (Exception $e) {
            error_log("❌ Python Hook実行失敗: " . $e->getMessage());
            // フォールバック：既存処理で実行
            return parent::handleAjaxRequest();
        }
    }
}

// =================================
// 🚀 Hook統合版実行
// =================================

// セッション開始
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// SECURE_ACCESS定義
if (!defined('SECURE_ACCESS')) {
    define('SECURE_ACCESS', true);
}

// Hook統合版Ajax処理
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['action'])) {
    header('Content-Type: application/json');
    
    $hooksHandler = new KichoHooksAjaxHandler();
    $response = $hooksHandler->handleHooksRequest();
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// デフォルトレスポンス
header('Content-Type: application/json');
echo json_encode([
    'success' => false,
    'error' => 'Invalid request method'
]);
exit;
