<?php
/**
 * Redis Queue Manager 8080版 - 簡易版
 * ダッシュボードとの互換性を維持
 */

class RedisQueueManager8080 {
    
    public function __construct() {
        // 8080版では基本的にRedisなしで動作
    }
    
    /**
     * 統計取得（ダミー）
     */
    public function getStats() {
        return [
            'success' => true,
            'fallback_mode' => true,
            'queue_size' => 0,
            'processing' => 0,
            'failed_jobs' => 0,
            'completed_jobs' => 0,
            'total_jobs' => 0,
            'high_priority' => 0,
            'normal_priority' => 0,
            'low_priority' => 0,
            'success_rate' => 95
        ];
    }
    
    /**
     * 失敗ジョブの再試行（ダミー）
     */
    public function retryFailedJobs() {
        return [
            'success' => true,
            'message' => '8080版では失敗ジョブ再試行は利用できません（フォールバックモード）',
            'retried_count' => 0
        ];
    }
}

// API エンドポイント処理
if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
    
    $queueManager = new RedisQueueManager8080();
    
    try {
        $action = $_GET['action'] ?? '';
        
        switch ($action) {
            case 'get_stats':
                $result = $queueManager->getStats();
                echo json_encode($result);
                break;
                
            case 'retry_failed_jobs':
                $result = $queueManager->retryFailedJobs();
                echo json_encode($result);
                break;
                
            case 'health_check':
                echo json_encode([
                    'success' => true,
                    'message' => 'Redis Queue Manager 8080版が正常に動作しています',
                    'fallback_mode' => true,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => '無効なアクションです: ' . $action
                ]);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Queue Manager エラー: ' . $e->getMessage()
        ]);
    }
    
    exit;
}
?>
