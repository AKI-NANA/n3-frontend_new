<?php
/**
 * Redis統合ジョブキューマネージャー
 * 優先度付きキュー・自動再試行・デッドレターキュー対応
 */

class RedisQueueManager {
    private $redis;
    private $fallbackMode;
    private $config;
    
    public function __construct() {
        $this->config = [
            'redis_host' => '127.0.0.1',
            'redis_port' => 6379,
            'max_retries' => 3,
            'retry_delay' => 60,
            'job_timeout' => 300
        ];
        
        $this->redis = $this->initRedis();
        $this->fallbackMode = ($this->redis === null);
    }
    
    /**
     * Redis初期化
     */
    private function initRedis() {
        try {
            if (!class_exists('Redis')) {
                return null;
            }
            
            $redis = new Redis();
            $redis->connect($this->config['redis_host'], $this->config['redis_port']);
            $redis->ping();
            
            return $redis;
        } catch (Exception $e) {
            error_log('Redis接続失敗 (フォールバックモード): ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * ジョブをキューに追加
     */
    public function enqueueJob($jobData, $priority = 50) {
        $job = [
            'id' => $this->generateJobId(),
            'data' => $jobData,
            'priority' => $priority,
            'created_at' => time(),
            'attempts' => 0,
            'max_attempts' => $this->config['max_retries'],
            'status' => 'queued'
        ];
        
        if ($this->fallbackMode) {
            return $this->enqueueJobFallback($job);
        } else {
            return $this->enqueueJobRedis($job);
        }
    }
    
    /**
     * Redis ジョブキューに追加
     */
    private function enqueueJobRedis($job) {
        try {
            // 優先度付きキュー (Sorted Set) に追加
            $result = $this->redis->zAdd('jobs:queue', $job['priority'], json_encode($job));
            
            // 統計更新
            $this->redis->hIncrBy('jobs:stats', 'total_jobs', 1);
            $this->redis->hIncrBy('jobs:stats', 'queued_jobs', 1);
            
            return [
                'success' => true,
                'job_id' => $job['id'],
                'message' => 'ジョブをキューに追加しました'
            ];
            
        } catch (Exception $e) {
            return $this->enqueueJobFallback($job);
        }
    }
    
    /**
     * フォールバックモード（ファイルベース）
     */
    private function enqueueJobFallback($job) {
        try {
            $queueDir = __DIR__ . '/queue';
            if (!file_exists($queueDir)) {
                mkdir($queueDir, 0777, true);
            }
            
            $filename = $queueDir . '/job_' . $job['id'] . '.json';
            file_put_contents($filename, json_encode($job, JSON_PRETTY_PRINT));
            
            return [
                'success' => true,
                'job_id' => $job['id'],
                'message' => 'ジョブをファイルキューに追加しました（フォールバック）'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'ジョブ追加エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * ジョブを取得・実行
     */
    public function dequeueJob() {
        if ($this->fallbackMode) {
            return $this->dequeueJobFallback();
        } else {
            return $this->dequeueJobRedis();
        }
    }
    
    /**
     * Redis からジョブを取得
     */
    private function dequeueJobRedis() {
        try {
            // 高優先度から取得 (ZPOP)
            $jobData = $this->redis->zPopMax('jobs:queue');
            
            if (empty($jobData)) {
                return null;
            }
            
            $job = json_decode(array_keys($jobData)[0], true);
            
            // 処理中に移動
            $job['status'] = 'processing';
            $job['started_at'] = time();
            
            $this->redis->hSet('jobs:processing', $job['id'], json_encode($job));
            $this->redis->hIncrBy('jobs:stats', 'queued_jobs', -1);
            $this->redis->hIncrBy('jobs:stats', 'processing_jobs', 1);
            
            return $job;
            
        } catch (Exception $e) {
            error_log('Redis ジョブ取得エラー: ' . $e->getMessage());
            return null;
        }
    }
    
    /**
     * フォールバック ジョブ取得
     */
    private function dequeueJobFallback() {
        $queueDir = __DIR__ . '/queue';
        if (!file_exists($queueDir)) {
            return null;
        }
        
        $files = glob($queueDir . '/job_*.json');
        if (empty($files)) {
            return null;
        }
        
        // 優先度順にソート
        $jobs = [];
        foreach ($files as $file) {
            $jobData = json_decode(file_get_contents($file), true);
            if ($jobData) {
                $jobs[] = ['file' => $file, 'job' => $jobData];
            }
        }
        
        // 優先度でソート
        usort($jobs, function($a, $b) {
            return $b['job']['priority'] - $a['job']['priority'];
        });
        
        if (empty($jobs)) {
            return null;
        }
        
        $selectedJob = $jobs[0];
        $job = $selectedJob['job'];
        
        // ファイル削除
        unlink($selectedJob['file']);
        
        $job['status'] = 'processing';
        $job['started_at'] = time();
        
        return $job;
    }
    
    /**
     * ジョブ完了処理
     */
    public function completeJob($jobId, $result = []) {
        if ($this->fallbackMode) {
            return $this->completeJobFallback($jobId, $result);
        } else {
            return $this->completeJobRedis($jobId, $result);
        }
    }
    
    /**
     * Redis ジョブ完了
     */
    private function completeJobRedis($jobId, $result) {
        try {
            $jobData = $this->redis->hGet('jobs:processing', $jobId);
            if (!$jobData) {
                return false;
            }
            
            $job = json_decode($jobData, true);
            $job['status'] = 'completed';
            $job['completed_at'] = time();
            $job['result'] = $result;
            
            // 処理中から完了に移動
            $this->redis->hDel('jobs:processing', $jobId);
            $this->redis->hSet('jobs:completed', $jobId, json_encode($job));
            
            // 統計更新
            $this->redis->hIncrBy('jobs:stats', 'processing_jobs', -1);
            $this->redis->hIncrBy('jobs:stats', 'completed_jobs', 1);
            
            return true;
            
        } catch (Exception $e) {
            error_log('ジョブ完了処理エラー: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * フォールバック ジョブ完了
     */
    private function completeJobFallback($jobId, $result) {
        // フォールバックモードでは簡易処理
        return true;
    }
    
    /**
     * ジョブ失敗処理
     */
    public function failJob($jobId, $error = '') {
        if ($this->fallbackMode) {
            return $this->failJobFallback($jobId, $error);
        } else {
            return $this->failJobRedis($jobId, $error);
        }
    }
    
    /**
     * Redis ジョブ失敗
     */
    private function failJobRedis($jobId, $error) {
        try {
            $jobData = $this->redis->hGet('jobs:processing', $jobId);
            if (!$jobData) {
                return false;
            }
            
            $job = json_decode($jobData, true);
            $job['attempts']++;
            $job['last_error'] = $error;
            $job['last_attempt'] = time();
            
            // 再試行可能かチェック
            if ($job['attempts'] < $job['max_attempts']) {
                // 再キュー
                $job['status'] = 'queued';
                $this->redis->zAdd('jobs:queue', $job['priority'], json_encode($job));
                $this->redis->hIncrBy('jobs:stats', 'queued_jobs', 1);
            } else {
                // デッドレターキューに移動
                $job['status'] = 'failed';
                $this->redis->hSet('jobs:failed', $jobId, json_encode($job));
                $this->redis->hIncrBy('jobs:stats', 'failed_jobs', 1);
            }
            
            // 処理中から削除
            $this->redis->hDel('jobs:processing', $jobId);
            $this->redis->hIncrBy('jobs:stats', 'processing_jobs', -1);
            
            return true;
            
        } catch (Exception $e) {
            error_log('ジョブ失敗処理エラー: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * フォールバック ジョブ失敗
     */
    private function failJobFallback($jobId, $error) {
        // フォールバックモードでは簡易処理
        return true;
    }
    
    /**
     * キュー統計取得
     */
    public function getStats() {
        if ($this->fallbackMode) {
            return $this->getStatsFallback();
        } else {
            return $this->getStatsRedis();
        }
    }
    
    /**
     * Redis 統計取得
     */
    private function getStatsRedis() {
        try {
            $stats = $this->redis->hGetAll('jobs:stats');
            
            // 現在のキュー情報を追加
            $queueSize = $this->redis->zCard('jobs:queue');
            $processingSize = $this->redis->hLen('jobs:processing');
            $failedSize = $this->redis->hLen('jobs:failed');
            
            return [
                'success' => true,
                'fallback_mode' => false,
                'queue_size' => $queueSize,
                'processing' => $processingSize,
                'failed_jobs' => $failedSize,
                'completed_jobs' => (int)($stats['completed_jobs'] ?? 0),
                'total_jobs' => (int)($stats['total_jobs'] ?? 0),
                'high_priority' => $this->getJobsByPriority(80, 100),
                'normal_priority' => $this->getJobsByPriority(40, 79),
                'low_priority' => $this->getJobsByPriority(0, 39),
                'success_rate' => $this->calculateSuccessRate($stats)
            ];
            
        } catch (Exception $e) {
            return $this->getStatsFallback();
        }
    }
    
    /**
     * フォールバック統計
     */
    private function getStatsFallback() {
        $queueDir = __DIR__ . '/queue';
        $queueSize = 0;
        
        if (file_exists($queueDir)) {
            $files = glob($queueDir . '/job_*.json');
            $queueSize = count($files);
        }
        
        return [
            'success' => true,
            'fallback_mode' => true,
            'queue_size' => $queueSize,
            'processing' => 0,
            'failed_jobs' => 0,
            'completed_jobs' => 0,
            'total_jobs' => $queueSize,
            'high_priority' => 0,
            'normal_priority' => $queueSize,
            'low_priority' => 0,
            'success_rate' => 0
        ];
    }
    
    /**
     * 優先度別ジョブ数取得
     */
    private function getJobsByPriority($minPriority, $maxPriority) {
        try {
            if ($this->fallbackMode) {
                return 0;
            }
            
            return $this->redis->zCount('jobs:queue', $minPriority, $maxPriority);
        } catch (Exception $e) {
            return 0;
        }
    }
    
    /**
     * 成功率計算
     */
    private function calculateSuccessRate($stats) {
        $completed = (int)($stats['completed_jobs'] ?? 0);
        $failed = (int)($stats['failed_jobs'] ?? 0);
        $total = $completed + $failed;
        
        if ($total === 0) {
            return 0;
        }
        
        return round(($completed / $total) * 100);
    }
    
    /**
     * 失敗ジョブの再試行
     */
    public function retryFailedJobs() {
        if ($this->fallbackMode) {
            return [
                'success' => true,
                'message' => 'フォールバックモードでは失敗ジョブ再試行は利用できません',
                'retried_count' => 0
            ];
        }
        
        try {
            $failedJobs = $this->redis->hGetAll('jobs:failed');
            $retriedCount = 0;
            
            foreach ($failedJobs as $jobId => $jobData) {
                $job = json_decode($jobData, true);
                
                // 再試行用にジョブをリセット
                $job['attempts'] = 0;
                $job['status'] = 'queued';
                unset($job['last_error']);
                
                // キューに再追加
                $this->redis->zAdd('jobs:queue', $job['priority'], json_encode($job));
                $this->redis->hDel('jobs:failed', $jobId);
                
                $retriedCount++;
            }
            
            // 統計更新
            $this->redis->hIncrBy('jobs:stats', 'queued_jobs', $retriedCount);
            $this->redis->hIncrBy('jobs:stats', 'failed_jobs', -$retriedCount);
            
            return [
                'success' => true,
                'message' => "失敗ジョブ {$retriedCount}件を再試行キューに追加しました",
                'retried_count' => $retriedCount
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => '失敗ジョブ再試行エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * ジョブID生成
     */
    private function generateJobId() {
        return 'job_' . time() . '_' . mt_rand(10000, 99999);
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
    
    $queueManager = new RedisQueueManager();
    
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
                
            case 'enqueue_test_job':
                $result = $queueManager->enqueueJob([
                    'type' => 'test_job',
                    'message' => 'テストジョブです',
                    'created_by' => 'api_test'
                ], 75);
                echo json_encode($result);
                break;
                
            case 'health_check':
                echo json_encode([
                    'success' => true,
                    'message' => 'Redis Queue Managerが正常に動作しています',
                    'fallback_mode' => $queueManager->fallbackMode,
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
