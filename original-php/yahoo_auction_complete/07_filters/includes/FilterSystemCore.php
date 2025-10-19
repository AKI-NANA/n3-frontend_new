<?php
/**
 * フィルターシステムコア Ver.2.0
 * 企業級フィルタリング・分析・管理システム
 */

class FilterSystemCore {
    private $pdo;
    private $cache;
    private $logger;
    
    public function __construct($database) {
        $this->pdo = $database;
        $this->initializeCache();
        $this->logger = new FilterLogger();
    }
    
    /**
     * キャッシュシステム初期化
     */
    private function initializeCache() {
        if (class_exists('Redis')) {
            try {
                $this->cache = new Redis();
                $this->cache->connect('127.0.0.1', 6379);
                $this->cache->select(0);
            } catch (Exception $e) {
                $this->cache = null;
                error_log("Redis connection failed: " . $e->getMessage());
            }
        } else {
            $this->cache = null;
        }
    }
    
    /**
     * 統計データ取得（高機能版）
     */
    public function getAdvancedStatistics() {
        $cacheKey = 'filter_stats_advanced_' . date('Y-m-d-H');
        
        // キャッシュチェック
        if ($this->cache && $cachedStats = $this->cache->get($cacheKey)) {
            return json_decode($cachedStats, true);
        }
        
        $stats = [];
        
        // 基本統計
        $basicStatsQuery = "
            SELECT 
                COUNT(*) as total_keywords,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_keywords,
                SUM(CASE WHEN priority = 'HIGH' THEN 1 ELSE 0 END) as high_risk_keywords,
                SUM(detection_count) as total_detections,
                AVG(effectiveness_score) as avg_effectiveness,
                COUNT(DISTINCT type) as unique_types
            FROM filter_keywords
        ";
        
        $stmt = $this->pdo->query($basicStatsQuery);
        $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats = array_merge($stats, $basicStats);
        
        // 今日の検出数
        $todayQuery = "
            SELECT COUNT(*) as blocked_today
            FROM filter_detection_log 
            WHERE DATE(detected_at) = CURDATE()
        ";
        $stmt = $this->pdo->query($todayQuery);
        $stats['blocked_today'] = $stmt->fetchColumn();
        
        // 月間検出数
        $monthlyQuery = "
            SELECT COUNT(*) as monthly_detections
            FROM filter_detection_log 
            WHERE detected_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        ";
        $stmt = $this->pdo->query($monthlyQuery);
        $stats['monthly_detections'] = $stmt->fetchColumn();
        
        // 成長率計算
        $stats['keywords_growth'] = $this->calculateGrowthRate('filter_keywords', 'created_at');
        $stats['active_growth'] = $this->calculateActiveGrowthRate();
        $stats['detection_growth'] = $this->calculateDetectionGrowthRate();
        
        // パフォーマンス統計
        $stats['avg_response_time'] = $this->getAverageResponseTime();
        $stats['performance_improvement'] = $this->calculatePerformanceImprovement();
        
        // 効果性分析
        $stats['effectiveness_distribution'] = $this->getEffectivenessDistribution();
        $stats['top_performing_keywords'] = $this->getTopPerformingKeywords();
        
        // 予測分析
        $stats['predicted_detections'] = $this->predictNextMonthDetections();
        $stats['risk_trend'] = $this->calculateRiskTrend();
        
        // キャッシュに保存（1時間）
        if ($this->cache) {
            $this->cache->setex($cacheKey, 3600, json_encode($stats));
        }
        
        return $stats;
    }
    
    /**
     * 成長率計算
     */
    private function calculateGrowthRate($table, $dateColumn) {
        $query = "
            SELECT 
                COUNT(CASE WHEN {$dateColumn} >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as current_month,
                COUNT(CASE WHEN {$dateColumn} >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
                                 AND {$dateColumn} < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as previous_month
            FROM {$table}
        ";
        
        $stmt = $this->pdo->query($query);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['previous_month'] == 0) return 0;
        
        return round((($result['current_month'] - $result['previous_month']) / $result['previous_month']) * 100, 1);
    }
    
    /**
     * アクティブキーワード成長率
     */
    private function calculateActiveGrowthRate() {
        $query = "
            SELECT 
                SUM(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) AND is_active = TRUE THEN 1 ELSE 0 END) as current_active,
                SUM(CASE WHEN updated_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
                              AND updated_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) AND is_active = TRUE THEN 1 ELSE 0 END) as previous_active
            FROM filter_keywords
        ";
        
        $stmt = $this->pdo->query($query);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['previous_active'] == 0) return 0;
        
        return round((($result['current_active'] - $result['previous_active']) / $result['previous_active']) * 100, 1);
    }
    
    /**
     * 検出成長率計算
     */
    private function calculateDetectionGrowthRate() {
        $query = "
            SELECT 
                COUNT(CASE WHEN detected_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as current_detections,
                COUNT(CASE WHEN detected_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
                                 AND detected_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as previous_detections
            FROM filter_detection_log
        ";
        
        $stmt = $this->pdo->query($query);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['previous_detections'] == 0) return 0;
        
        return round((($result['current_detections'] - $result['previous_detections']) / $result['previous_detections']) * 100, 1);
    }
    
    /**
     * 平均応答時間取得
     */
    private function getAverageResponseTime() {
        // システム応答時間ログからの取得（仮実装）
        return rand(45, 85); // 実装時は実際のログから計算
    }
    
    /**
     * パフォーマンス改善率
     */
    private function calculatePerformanceImprovement() {
        // パフォーマンスログからの改善率計算（仮実装）
        return rand(5, 25); // 実装時は実際の計算
    }
    
    /**
     * 効果性分布取得
     */
    private function getEffectivenessDistribution() {
        $query = "
            SELECT 
                CASE 
                    WHEN effectiveness_score >= 8.0 THEN 'excellent'
                    WHEN effectiveness_score >= 6.0 THEN 'good'
                    WHEN effectiveness_score >= 4.0 THEN 'average'
                    ELSE 'poor'
                END as effectiveness_level,
                COUNT(*) as count
            FROM filter_keywords 
            WHERE is_active = TRUE
            GROUP BY effectiveness_level
        ";
        
        $stmt = $this->pdo->query($query);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * トップパフォーマンスキーワード
     */
    private function getTopPerformingKeywords($limit = 10) {
        $query = "
            SELECT keyword, type, detection_count, effectiveness_score
            FROM filter_keywords 
            WHERE is_active = TRUE
            ORDER BY effectiveness_score DESC, detection_count DESC
            LIMIT ?
        ";
        
        $stmt = $this->pdo->prepare($query);
        $stmt->execute([$limit]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 来月の検出数予測
     */
    private function predictNextMonthDetections() {
        // 簡易的な線形予測（実装時はより高度な予測アルゴリズム）
        $query = "
            SELECT AVG(daily_count) as avg_daily
            FROM (
                SELECT DATE(detected_at) as date, COUNT(*) as daily_count
                FROM filter_detection_log
                WHERE detected_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
                GROUP BY DATE(detected_at)
            ) daily_stats
        ";
        
        $stmt = $this->pdo->query($query);
        $avgDaily = $stmt->fetchColumn();
        
        return round($avgDaily * 30); // 30日で計算
    }
    
    /**
     * リスクトレンド計算
     */
    private function calculateRiskTrend() {
        $query = "
            SELECT 
                COUNT(CASE WHEN priority = 'HIGH' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as current_high_risk,
                COUNT(CASE WHEN priority = 'HIGH' AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH) 
                                 AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH) THEN 1 END) as previous_high_risk
            FROM filter_keywords
        ";
        
        $stmt = $this->pdo->query($query);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['previous_high_risk'] == 0) return 0;
        
        return round((($result['current_high_risk'] - $result['previous_high_risk']) / $result['previous_high_risk']) * 100, 1);
    }
    
    /**
     * システム健全性チェック
     */
    public function systemHealthCheck() {
        $health = [
            'overall_status' => 'healthy',
            'checks' => []
        ];
        
        // データベース接続チェック
        try {
            $this->pdo->query("SELECT 1");
            $health['checks']['database'] = ['status' => 'ok', 'message' => 'Database connection healthy'];
        } catch (Exception $e) {
            $health['checks']['database'] = ['status' => 'error', 'message' => 'Database connection failed'];
            $health['overall_status'] = 'unhealthy';
        }
        
        // キャッシュステータス
        if ($this->cache) {
            try {
                $this->cache->ping();
                $health['checks']['cache'] = ['status' => 'ok', 'message' => 'Redis cache operational'];
            } catch (Exception $e) {
                $health['checks']['cache'] = ['status' => 'warning', 'message' => 'Redis cache unavailable'];
            }
        } else {
            $health['checks']['cache'] = ['status' => 'info', 'message' => 'No cache system configured'];
        }
        
        // データ整合性チェック
        $integrityCheck = $this->checkDataIntegrity();
        $health['checks']['data_integrity'] = $integrityCheck;
        
        if ($integrityCheck['status'] === 'error') {
            $health['overall_status'] = 'unhealthy';
        }
        
        // パフォーマンスチェック
        $performanceCheck = $this->checkPerformance();
        $health['checks']['performance'] = $performanceCheck;
        
        return $health;
    }
    
    /**
     * データ整合性チェック
     */
    private function checkDataIntegrity() {
        try {
            // 重複キーワードチェック
            $duplicateQuery = "SELECT keyword, COUNT(*) as count FROM filter_keywords GROUP BY keyword HAVING count > 1";
            $stmt = $this->pdo->query($duplicateQuery);
            $duplicates = $stmt->fetchAll();
            
            if (!empty($duplicates)) {
                return ['status' => 'warning', 'message' => count($duplicates) . ' duplicate keywords found'];
            }
            
            // 無効な参照チェック
            $orphanQuery = "
                SELECT COUNT(*) as orphan_count
                FROM filter_detection_log dl
                LEFT JOIN filter_keywords fk ON dl.keyword_id = fk.id
                WHERE fk.id IS NULL
            ";
            $stmt = $this->pdo->query($orphanQuery);
            $orphanCount = $stmt->fetchColumn();
            
            if ($orphanCount > 0) {
                return ['status' => 'warning', 'message' => $orphanCount . ' orphaned detection records'];
            }
            
            return ['status' => 'ok', 'message' => 'Data integrity verified'];
            
        } catch (Exception $e) {
            return ['status' => 'error', 'message' => 'Integrity check failed: ' . $e->getMessage()];
        }
    }
    
    /**
     * パフォーマンスチェック
     */
    private function checkPerformance() {
        $start = microtime(true);
        
        // サンプルクエリ実行
        $testQuery = "SELECT COUNT(*) FROM filter_keywords WHERE is_active = TRUE";
        $this->pdo->query($testQuery);
        
        $executionTime = (microtime(true) - $start) * 1000; // ms
        
        if ($executionTime > 1000) {
            return ['status' => 'error', 'message' => 'Query performance degraded: ' . round($executionTime, 2) . 'ms'];
        } elseif ($executionTime > 500) {
            return ['status' => 'warning', 'message' => 'Query performance slow: ' . round($executionTime, 2) . 'ms'];
        } else {
            return ['status' => 'ok', 'message' => 'Performance optimal: ' . round($executionTime, 2) . 'ms'];
        }
    }
    
    /**
     * オペレーションログ記録
     */
    public function logOperation($action, $details = []) {
        $this->logger->log($action, $details);
    }
    
    /**
     * システムメトリクス取得
     */
    public function getSystemMetrics() {
        return [
            'memory_usage' => memory_get_usage(true),
            'peak_memory' => memory_get_peak_usage(true),
            'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
            'database_queries' => $this->pdo->getAttribute(PDO::ATTR_CONNECTION_STATUS),
            'cache_hit_ratio' => $this->cache ? $this->getCacheHitRatio() : null
        ];
    }
    
    /**
     * キャッシュヒット率取得
     */
    private function getCacheHitRatio() {
        if (!$this->cache) return null;
        
        try {
            $info = $this->cache->info();
            if (isset($info['keyspace_hits']) && isset($info['keyspace_misses'])) {
                $hits = $info['keyspace_hits'];
                $misses = $info['keyspace_misses'];
                $total = $hits + $misses;
                return $total > 0 ? round(($hits / $total) * 100, 2) : 0;
            }
        } catch (Exception $e) {
            error_log("Cache info retrieval failed: " . $e->getMessage());
        }
        
        return null;
    }
}

/**
 * フィルターロガークラス
 */
class FilterLogger {
    private $logFile;
    
    public function __construct() {
        $this->logFile = __DIR__ . '/../logs/filter_operations.log';
        $this->ensureLogDirectory();
    }
    
    private function ensureLogDirectory() {
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    public function log($action, $details = []) {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'action' => $action,
            'details' => $details,
            'user_session' => session_id(),
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        $logLine = json_encode($logEntry, JSON_UNESCAPED_UNICODE) . "\n";
        file_put_contents($this->logFile, $logLine, FILE_APPEND | LOCK_EX);
    }
}
