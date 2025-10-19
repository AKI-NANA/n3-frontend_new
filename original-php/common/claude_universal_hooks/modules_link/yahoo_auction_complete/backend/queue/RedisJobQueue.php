<?php
/**
 * Redis ジョブキューシステム
 * フィードバック反映：PostgreSQL PUB/SUB に代わる専用キューシステム
 */

require_once __DIR__ . '/../new_structure/03_approval/api/UnifiedLogger.php';

class RedisJobQueue {
    private $redis;
    private $logger;
    private $queueName;
    private $processingQueueName;
    private $failedQueueName;
    private $maxRetries;
    private $retryDelay;
    
    public function __construct($config = []) {
        $this->queueName = $config['queue_name'] ?? 'workflow_queue';
        $this->processingQueueName = $this->queueName . ':processing';
        $this->failedQueueName = $this->queueName . ':failed';
        $this->maxRetries = $config['max_retries'] ?? 3;
        $this->retryDelay = $config['retry_delay'] ?? 60;
        
        $this->logger = getLogger('redis_queue');
        $this->initializeRedis($config);
    }
    
    /**
     * Redis接続初期化
     */
    private function initializeRedis($config) {
        try {
            if (!class_exists('Redis')) {
                throw new Exception('Redis extension not installed');
            }
            
            $this->redis = new Redis();
            $host = $config['host'] ?? $_ENV['REDIS_HOST'] ?? '127.0.0.1';
            $port = $config['port'] ?? $_ENV['REDIS_PORT'] ?? 6379;
            $timeout = $config['timeout'] ?? 5;
            
            $connected = $this->redis->connect($host, $port, $timeout);
            if (!$connected) {
                throw new Exception("Failed to connect to Redis at {$host}:{$port}");
            }
            
            // 認証（設定されている場合）
            $password = $config['password'] ?? $_ENV['REDIS_PASS'] ?? null;
            if ($password) {
                $this->redis->auth($password);
            }
            
            // データベース選択
            $database = $config['database'] ?? $_ENV['REDIS_DB'] ?? 0;
            $this->redis->select($database);
            
            $this->logger->info('Redis connection established', [
                'host' => $host,
                'port' => $port,
                'database' => $database,
                'queue_name' => $this->queueName
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('Redis connection failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * ジョブをキューに追加（優先度付き）
     */
    public function addJob($jobData, $priority = 0, $delay = 0) {
        $startTime = microtime(true);
        
        try {
            $job = [
                'id' => $this->generateJobId(),
                'data' => $jobData,
                'priority' => $priority,
                'created_at' => time(),
                'retry_count' => 0,
                'max_retries' => $this->maxRetries,
                'delay_until' => $delay > 0 ? time() + $delay : 0
            ];
            
            $serializedJob = json_encode($job);
            
            if ($delay > 0) {
                // 遅延ジョブは専用のsorted setに保存
                $this->redis->zadd($this->queueName . ':delayed', time() + $delay, $serializedJob);
            } else {
                // 即座実行の場合は優先度付きキューに追加
                $this->redis->zadd($this->queueName, $priority, $serializedJob);
            }
            
            $this->logger->info('Job added to queue', [
                'job_id' => $job['id'],
                'priority' => $priority,
                'delay' => $delay,
                'queue_size' => $this->getQueueSize()
            ]);
            
            $this->logger->logPerformance('Add job to queue', $startTime, [
                'job_id' => $job['id']
            ]);
            
            return $job['id'];
            
        } catch (Exception $e) {
            $this->logger->error('Failed to add job to queue', [
                'error' => $e->getMessage(),
                'job_data' => $jobData
            ]);
            throw $e;
        }
    }
    
    /**
     * 次のジョブを取得（ブロッキング）
     */
    public function getNextJob($timeout = 30) {
        $startTime = microtime(true);
        
        try {
            // 遅延ジョブのチェック・移動
            $this->processDelayedJobs();
            
            // 最高優先度のジョブを取得（ブロッキング）
            $result = $this->redis->bzpopmax($this->queueName, $timeout);
            
            if (!$result) {
                return null; // タイムアウト
            }
            
            $serializedJob = $result[1]; // [queue_name, job_data, priority]
            $job = json_decode($serializedJob, true);
            
            if (!$job) {
                throw new Exception('Invalid job data in queue');
            }
            
            // 処理中キューに移動
            $job['started_at'] = time();
            $job['processing_id'] = uniqid('proc_');
            $this->redis->hset($this->processingQueueName, $job['processing_id'], json_encode($job));
            
            $this->logger->info('Job retrieved from queue', [
                'job_id' => $job['id'],
                'processing_id' => $job['processing_id'],
                'priority' => $job['priority'],
                'wait_time' => time() - $job['created_at']
            ]);
            
            $this->logger->logPerformance('Get job from queue', $startTime, [
                'job_id' => $job['id']
            ]);
            
            return $job;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to get job from queue', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    /**
     * ジョブ完了マーク
     */
    public function completeJob($job, $result = null) {
        try {
            // 処理中キューから削除
            $this->redis->hdel($this->processingQueueName, $job['processing_id']);
            
            // 完了ログ
            $job['completed_at'] = time();
            $job['result'] = $result;
            $job['status'] = 'completed';
            
            // 完了履歴として保存（TTL付き）
            $this->redis->setex(
                $this->queueName . ':completed:' . $job['id'],
                3600, // 1時間保持
                json_encode($job)
            );
            
            $totalTime = $job['completed_at'] - $job['created_at'];
            $processingTime = $job['completed_at'] - $job['started_at'];
            
            $this->logger->info('Job completed successfully', [
                'job_id' => $job['id'],
                'total_time' => $totalTime,
                'processing_time' => $processingTime,
                'result_size' => $result ? strlen(json_encode($result)) : 0
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('Failed to mark job as completed', [
                'job_id' => $job['id'] ?? 'unknown',
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * ジョブ失敗処理
     */
    public function failJob($job, $error, $retryable = true) {
        try {
            $job['retry_count'] = ($job['retry_count'] ?? 0) + 1;
            $job['last_error'] = $error;
            $job['failed_at'] = time();
            
            // 処理中キューから削除
            $this->redis->hdel($this->processingQueueName, $job['processing_id']);
            
            if ($retryable && $job['retry_count'] < $job['max_retries']) {
                // リトライ待ちキューに追加（指数バックオフ）
                $retryDelay = $this->retryDelay * pow(2, $job['retry_count'] - 1);
                $this->addJob($job['data'], $job['priority'], $retryDelay);
                
                $this->logger->warning('Job failed, will retry', [
                    'job_id' => $job['id'],
                    'retry_count' => $job['retry_count'],
                    'max_retries' => $job['max_retries'],
                    'retry_delay' => $retryDelay,
                    'error' => $error
                ]);
            } else {
                // 最終失敗
                $job['status'] = 'failed';
                $this->redis->hset($this->failedQueueName, $job['id'], json_encode($job));
                
                $this->logger->error('Job failed permanently', [
                    'job_id' => $job['id'],
                    'retry_count' => $job['retry_count'],
                    'max_retries' => $job['max_retries'],
                    'error' => $error
                ]);
            }
            
        } catch (Exception $e) {
            $this->logger->error('Failed to process job failure', [
                'job_id' => $job['id'] ?? 'unknown',
                'error' => $e->getMessage(),
                'original_error' => $error
            ]);
        }
    }
    
    /**
     * 遅延ジョブの処理
     */
    private function processDelayedJobs() {
        try {
            $now = time();
            
            // 実行時刻が来た遅延ジョブを取得
            $delayedJobs = $this->redis->zrangebyscore(
                $this->queueName . ':delayed',
                0,
                $now,
                ['limit' => [0, 10]] // 一度に最大10件
            );
            
            foreach ($delayedJobs as $serializedJob) {
                $job = json_decode($serializedJob, true);
                if ($job) {
                    // 通常キューに移動
                    $this->redis->zadd($this->queueName, $job['priority'], $serializedJob);
                    $this->redis->zrem($this->queueName . ':delayed', $serializedJob);
                    
                    $this->logger->debug('Delayed job moved to main queue', [
                        'job_id' => $job['id'],
                        'scheduled_for' => date('Y-m-d H:i:s', $job['delay_until'])
                    ]);
                }
            }
            
        } catch (Exception $e) {
            $this->logger->error('Failed to process delayed jobs', [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * キューサイズ取得
     */
    public function getQueueSize() {
        try {
            return [
                'waiting' => $this->redis->zcard($this->queueName),
                'processing' => $this->redis->hlen($this->processingQueueName),
                'delayed' => $this->redis->zcard($this->queueName . ':delayed'),
                'failed' => $this->redis->hlen($this->failedQueueName)
            ];
        } catch (Exception $e) {
            $this->logger->error('Failed to get queue size', [
                'error' => $e->getMessage()
            ]);
            return ['waiting' => 0, 'processing' => 0, 'delayed' => 0, 'failed' => 0];
        }
    }
    
    /**
     * 失敗ジョブの再キュー
     */
    public function requeueFailedJobs($maxJobs = 10) {
        try {
            $failedJobs = $this->redis->hgetall($this->failedQueueName);
            $requeuedCount = 0;
            
            foreach ($failedJobs as $jobId => $serializedJob) {
                if ($requeuedCount >= $maxJobs) break;
                
                $job = json_decode($serializedJob, true);
                if ($job) {
                    // リトライカウントリセット
                    $job['retry_count'] = 0;
                    unset($job['failed_at'], $job['last_error']);
                    
                    $this->addJob($job['data'], $job['priority']);
                    $this->redis->hdel($this->failedQueueName, $jobId);
                    
                    $requeuedCount++;
                    
                    $this->logger->info('Failed job requeued', [
                        'job_id' => $jobId
                    ]);
                }
            }
            
            return $requeuedCount;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to requeue failed jobs', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }
    
    /**
     * 停止中ジョブのクリーンアップ
     */
    public function cleanupStaleJobs($timeoutSeconds = 3600) {
        try {
            $staleTime = time() - $timeoutSeconds;
            $processingJobs = $this->redis->hgetall($this->processingQueueName);
            $cleanedCount = 0;
            
            foreach ($processingJobs as $processingId => $serializedJob) {
                $job = json_decode($serializedJob, true);
                if ($job && ($job['started_at'] ?? 0) < $staleTime) {
                    // 停止ジョブとして失敗扱い
                    $this->failJob($job, 'Job timeout - no response for ' . $timeoutSeconds . ' seconds', false);
                    $cleanedCount++;
                }
            }
            
            if ($cleanedCount > 0) {
                $this->logger->warning('Cleaned up stale jobs', [
                    'cleaned_count' => $cleanedCount,
                    'timeout_seconds' => $timeoutSeconds
                ]);
            }
            
            return $cleanedCount;
            
        } catch (Exception $e) {
            $this->logger->error('Failed to cleanup stale jobs', [
                'error' => $e->getMessage()
            ]);
            return 0;
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getStatistics() {
        try {
            $sizes = $this->getQueueSize();
            
            // 過去24時間の完了ジョブ数
            $completedPattern = $this->queueName . ':completed:*';
            $completedKeys = $this->redis->keys($completedPattern);
            
            // 失敗ジョブの詳細
            $failedJobs = $this->redis->hgetall($this->failedQueueName);
            $failedByError = [];
            
            foreach ($failedJobs as $serializedJob) {
                $job = json_decode($serializedJob, true);
                if ($job && isset($job['last_error'])) {
                    $errorType = $this->categorizeError($job['last_error']);
                    $failedByError[$errorType] = ($failedByError[$errorType] ?? 0) + 1;
                }
            }
            
            return [
                'queue_sizes' => $sizes,
                'completed_24h' => count($completedKeys),
                'failed_by_error' => $failedByError,
                'redis_memory' => $this->redis->info('memory')['used_memory_human'] ?? 'unknown'
            ];
            
        } catch (Exception $e) {
            $this->logger->error('Failed to get queue statistics', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * パフォーマンス情報取得
     */
    public function getPerformanceMetrics() {
        try {
            // Redis接続情報
            $info = $this->redis->info();
            
            return [
                'connected_clients' => $info['connected_clients'] ?? 0,
                'total_commands_processed' => $info['total_commands_processed'] ?? 0,
                'instantaneous_ops_per_sec' => $info['instantaneous_ops_per_sec'] ?? 0,
                'keyspace_hits' => $info['keyspace_hits'] ?? 0,
                'keyspace_misses' => $info['keyspace_misses'] ?? 0,
                'used_memory' => $info['used_memory'] ?? 0,
                'used_memory_peak' => $info['used_memory_peak'] ?? 0
            ];
            
        } catch (Exception $e) {
            $this->logger->error('Failed to get performance metrics', [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    // プライベートメソッド
    private function generateJobId() {
        return uniqid('job_', true);
    }
    
    private function categorizeError($error) {
        if (strpos($error, 'timeout') !== false) return 'timeout';
        if (strpos($error, 'connection') !== false) return 'connection';
        if (strpos($error, 'API') !== false) return 'api_error';
        if (strpos($error, 'validation') !== false) return 'validation';
        return 'other';
    }
    
    /**
     * デストラクタ
     */
    public function __destruct() {
        if ($this->redis) {
            try {
                $this->redis->close();
            } catch (Exception $e) {
                // エラーは無視（ログに記録済み）
            }
        }
    }
}

/**
 * グローバルRedisキューインスタンス
 */
function getRedisQueue($queueName = 'workflow_queue') {
    static $queues = [];
    
    if (!isset($queues[$queueName])) {
        $queues[$queueName] = new RedisJobQueue([
            'queue_name' => $queueName,
            'max_retries' => 3,
            'retry_delay' => 60
        ]);
    }
    
    return $queues[$queueName];
}

/**
 * ワークフロー専用キュー取得
 */
function getWorkflowQueue() {
    return getRedisQueue('workflow_queue');
}

/**
 * 出品専用キュー取得  
 */
function getListingQueue() {
    return getRedisQueue('listing_queue');
}
