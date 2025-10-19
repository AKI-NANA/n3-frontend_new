<?php
/**
 * 🧠 AI接続テストAPI
 * Ollama・DEEPSEEK接続確認
 */

require_once '../config/config.php';

// CORSヘッダー設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $ai_status = [];
    
    // Ollama接続テスト
    $ollama_result = testOllamaConnection();
    $ai_status['ollama'] = $ollama_result;
    
    // DEEPSEEK接続テスト
    $deepseek_result = testDeepseekConnection();
    $ai_status['deepseek'] = $deepseek_result;
    
    // 全体結果判定
    $overall_success = $ollama_result['success'] || $deepseek_result['success'];
    
    successResponse([
        'ai_systems' => $ai_status,
        'overall_status' => $overall_success ? 'success' : 'failed',
        'available_services' => array_keys(array_filter($ai_status, function($status) {
            return $status['success'];
        })),
        'test_time' => date('Y-m-d H:i:s')
    ], $overall_success ? 'AI接続テスト完了' : 'AI接続に問題があります');
    
} catch (Exception $e) {
    errorResponse('AI接続テストエラー: ' . $e->getMessage(), 500);
}

/**
 * Ollama接続テスト
 */
function testOllamaConnection() {
    $ollama_endpoint = 'http://localhost:11434/api/tags';
    
    try {
        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'method' => 'GET'
            ]
        ]);
        
        $response = @file_get_contents($ollama_endpoint, false, $context);
        
        if ($response !== false) {
            $data = json_decode($response, true);
            return [
                'success' => true,
                'endpoint' => $ollama_endpoint,
                'models' => isset($data['models']) ? count($data['models']) : 0,
                'status' => 'connected',
                'message' => 'Ollama接続成功'
            ];
        } else {
            throw new Exception('Ollama応答なし');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'endpoint' => $ollama_endpoint,
            'error' => $e->getMessage(),
            'status' => 'disconnected',
            'message' => 'Ollama接続失敗',
            'suggestions' => [
                'Ollamaが起動しているか確認',
                'ポート11434が利用可能か確認',
                'ollama serve コマンドで起動'
            ]
        ];
    }
}

/**
 * DEEPSEEK接続テスト
 */
function testDeepseekConnection() {
    // 実際のAPIキーは環境変数から取得すべき
    $api_key = getenv('DEEPSEEK_API_KEY') ?: 'test-key';
    $endpoint = 'https://api.deepseek.com/v1/models';
    
    try {
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'method' => 'GET',
                'header' => [
                    'Authorization: Bearer ' . $api_key,
                    'Content-Type: application/json'
                ]
            ]
        ]);
        
        $response = @file_get_contents($endpoint, false, $context);
        
        if ($response !== false) {
            $data = json_decode($response, true);
            return [
                'success' => true,
                'endpoint' => $endpoint,
                'api_key_status' => !empty($api_key) ? 'configured' : 'missing',
                'status' => 'connected',
                'message' => 'DEEPSEEK接続成功'
            ];
        } else {
            throw new Exception('DEEPSEEK応答なし');
        }
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'endpoint' => $endpoint,
            'error' => $e->getMessage(),
            'status' => 'disconnected',
            'message' => 'DEEPSEEK接続失敗',
            'suggestions' => [
                'APIキーが設定されているか確認',
                'インターネット接続を確認',
                'DEEPSEEKサービス状況を確認'
            ]
        ];
    }
}
?>