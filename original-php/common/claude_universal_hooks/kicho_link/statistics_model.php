<?php
/**
 * 統計データモデル
 * modules/kicho/models/statistics_model.php
 * 
 * NAGANO-3統合システム準拠
 * @version 3.0.0
 */

class KichoStatisticsModel {
    private $db;
    private $table_name = 'kicho_transactions';
    
    public function __construct() {
        $this->initializeDatabase();
    }
    
    /**
     * データベース初期化
     */
    private function initializeDatabase() {
        try {
            // NAGANO-3共通DB接続（PostgreSQL）
            $dsn = "pgsql:host=" . (DB_HOST ?? 'localhost') . ";dbname=" . (DB_NAME ?? 'nagano3') . ";charset=utf8";
            $username = DB_USER ?? 'nagano3_user';
            $password = DB_PASS ?? '';
            
            $this->db = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
        } catch (PDOException $e) {
            error_log("統計システムDB接続エラー: " . $e->getMessage());
            throw new Exception('統計データベース接続に失敗しました');
        }
    }
    
    /**
     * 全体統計取得
     */
    public function getOverallStatistics($user_id) {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_count,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
                    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                    COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_generated_count,
                    SUM(amount) as total_amount,
                    AVG(amount) as avg_amount,
                    AVG(confidence) as avg_confidence,
                    MAX(confidence) as max_confidence,
                    MIN(confidence) as min_confidence,
                    COUNT(CASE WHEN confidence >= 90 THEN 1 END) as high_confidence_count,
                    COUNT(CASE WHEN confidence >= 70 AND confidence < 90 THEN 1 END) as medium_confidence_count,
                    COUNT(CASE WHEN confidence < 70 THEN 1 END) as low_confidence_count
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND status != 'deleted'
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->execute();
            
            $raw_stats = $stmt->fetch();
            
            // 統計値計算
            $stats = [
                'total_count' => (int)$raw_stats['total_count'],
                'pending_count' => (int)$raw_stats['pending_count'],
                'approved_count' => (int)$raw_stats['approved_count'],
                'processing_count' => (int)$raw_stats['processing_count'],
                'error_count' => (int)$raw_stats['error_count'],
                'rejected_count' => (int)$raw_stats['rejected_count'],
                'ai_generated_count' => (int)$raw_stats['ai_generated_count'],
                'total_amount' => (float)$raw_stats['total_amount'],
                'avg_amount' => round((float)$raw_stats['avg_amount'], 2),
                'avg_confidence' => round((float)$raw_stats['avg_confidence'], 1),
                'max_confidence' => (int)$raw_stats['max_confidence'],
                'min_confidence' => (int)$raw_stats['min_confidence'],
                'high_confidence_count' => (int)$raw_stats['high_confidence_count'],
                'medium_confidence_count' => (int)$raw_stats['medium_confidence_count'],
                'low_confidence_count' => (int)$raw_stats['low_confidence_count']
            ];
            
            // 比率計算
            if ($stats['total_count'] > 0) {
                $stats['approval_rate'] = round(($stats['approved_count'] / $stats['total_count']) * 100, 1);
                $stats['automation_rate'] = round(($stats['ai_generated_count'] / $stats['total_count']) * 100, 1);
                $stats['pending_rate'] = round(($stats['pending_count'] / $stats['total_count']) * 100, 1);
                $stats['error_rate'] = round(($stats['error_count'] / $stats['total_count']) * 100, 1);
                $stats['high_confidence_rate'] = round(($stats['high_confidence_count'] / $stats['total_count']) * 100, 1);
            } else {
                $stats['approval_rate'] = 0;
                $stats['automation_rate'] = 0;
                $stats['pending_rate'] = 0;
                $stats['error_rate'] = 0;
                $stats['high_confidence_rate'] = 0;
            }
            
            // 今日の処理状況
            $today_stats = $this->getTodayStatistics($user_id);
            $stats['today'] = $today_stats;
            
            // 月次推移データ
            $monthly_trend = $this->getMonthlyTrend($user_id, 6); // 過去6ヶ月
            $stats['monthly_trend'] = $monthly_trend;
            
            return [
                'success' => true,
                'data' => $stats
            ];
            
        } catch (PDOException $e) {
            error_log("全体統計取得エラー: " . $e->getMessage());
            throw new Exception('統計データの取得に失敗しました');
        }
    }
    
    /**
     * 今日の統計取得
     */
    public function getTodayStatistics($user_id) {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as today_total,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as today_approved,
                    COUNT(CASE WHEN ai_generated = true THEN 1 END) as today_ai_generated,
                    SUM(amount) as today_amount,
                    AVG(confidence) as today_avg_confidence
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND DATE(created_at) = CURRENT_DATE
                AND status != 'deleted'
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->execute();
            
            $raw_stats = $stmt->fetch();
            
            return [
                'total' => (int)$raw_stats['today_total'],
                'approved' => (int)$raw_stats['today_approved'],
                'ai_generated' => (int)$raw_stats['today_ai_generated'],
                'amount' => (float)$raw_stats['today_amount'],
                'avg_confidence' => round((float)$raw_stats['today_avg_confidence'], 1)
            ];
            
        } catch (PDOException $e) {
            error_log("今日の統計取得エラー: " . $e->getMessage());
            return [
                'total' => 0,
                'approved' => 0,
                'ai_generated' => 0,
                'amount' => 0,
                'avg_confidence' => 0
            ];
        }
    }
    
    /**
     * 月次推移取得
     */
    public function getMonthlyTrend($user_id, $months = 6) {
        try {
            $sql = "
                SELECT 
                    DATE_TRUNC('month', transaction_date) as month,
                    COUNT(*) as monthly_count,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_count,
                    SUM(amount) as monthly_amount,
                    AVG(confidence) as avg_confidence
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL ':months months')
                AND status != 'deleted'
                GROUP BY DATE_TRUNC('month', transaction_date)
                ORDER BY month DESC
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':months', $months, PDO::PARAM_INT);
            $stmt->execute();
            
            $monthly_data = $stmt->fetchAll();
            
            $trend = [];
            foreach ($monthly_data as $data) {
                $month_key = date('Y-m', strtotime($data['month']));
                $trend[] = [
                    'month' => $month_key,
                    'month_display' => date('Y年n月', strtotime($data['month'])),
                    'total_count' => (int)$data['monthly_count'],
                    'approved_count' => (int)$data['approved_count'],
                    'ai_count' => (int)$data['ai_count'],
                    'total_amount' => (float)$data['monthly_amount'],
                    'avg_confidence' => round((float)$data['avg_confidence'], 1),
                    'approval_rate' => $data['monthly_count'] > 0 ? round(($data['approved_count'] / $data['monthly_count']) * 100, 1) : 0,
                    'automation_rate' => $data['monthly_count'] > 0 ? round(($data['ai_count'] / $data['monthly_count']) * 100, 1) : 0
                ];
            }
            
            return $trend;
            
        } catch (PDOException $e) {
            error_log("月次推移取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 勘定科目別統計
     */
    public function getAccountStatistics($user_id, $period_days = 30) {
        try {
            $sql = "
                SELECT 
                    debit_account,
                    credit_account,
                    COUNT(*) as usage_count,
                    SUM(amount) as total_amount,
                    AVG(confidence) as avg_confidence,
                    COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_generated_count
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND transaction_date >= CURRENT_DATE - INTERVAL ':period_days days'
                AND status != 'deleted'
                GROUP BY debit_account, credit_account
                ORDER BY usage_count DESC, total_amount DESC
                LIMIT 20
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':period_days', $period_days, PDO::PARAM_INT);
            $stmt->execute();
            
            $account_stats = $stmt->fetchAll();
            
            $result = [];
            foreach ($account_stats as $stat) {
                $result[] = [
                    'debit_account' => $stat['debit_account'],
                    'credit_account' => $stat['credit_account'],
                    'usage_count' => (int)$stat['usage_count'],
                    'total_amount' => (float)$stat['total_amount'],
                    'avg_confidence' => round((float)$stat['avg_confidence'], 1),
                    'ai_generated_count' => (int)$stat['ai_generated_count'],
                    'automation_rate' => $stat['usage_count'] > 0 ? round(($stat['ai_generated_count'] / $stat['usage_count']) * 100, 1) : 0
                ];
            }
            
            return $result;
            
        } catch (PDOException $e) {
            error_log("勘定科目別統計取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 時間別処理パフォーマンス
     */
    public function getHourlyPerformance($user_id, $days = 7) {
        try {
            $sql = "
                SELECT 
                    EXTRACT(HOUR FROM created_at) as hour,
                    COUNT(*) as hourly_count,
                    AVG(confidence) as avg_confidence,
                    COUNT(CASE WHEN ai_generated = true THEN 1 END) as ai_count
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND created_at >= CURRENT_DATE - INTERVAL ':days days'
                AND status != 'deleted'
                GROUP BY EXTRACT(HOUR FROM created_at)
                ORDER BY hour
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':days', $days, PDO::PARAM_INT);
            $stmt->execute();
            
            $hourly_data = $stmt->fetchAll();
            
            // 24時間分のデータを準備（データがない時間は0で埋める）
            $performance = [];
            for ($hour = 0; $hour < 24; $hour++) {
                $performance[$hour] = [
                    'hour' => $hour,
                    'hour_display' => sprintf('%02d:00', $hour),
                    'count' => 0,
                    'avg_confidence' => 0,
                    'ai_count' => 0,
                    'automation_rate' => 0
                ];
            }
            
            // 実際のデータで上書き
            foreach ($hourly_data as $data) {
                $hour = (int)$data['hour'];
                $performance[$hour] = [
                    'hour' => $hour,
                    'hour_display' => sprintf('%02d:00', $hour),
                    'count' => (int)$data['hourly_count'],
                    'avg_confidence' => round((float)$data['avg_confidence'], 1),
                    'ai_count' => (int)$data['ai_count'],
                    'automation_rate' => $data['hourly_count'] > 0 ? round(($data['ai_count'] / $data['hourly_count']) * 100, 1) : 0
                ];
            }
            
            return array_values($performance);
            
        } catch (PDOException $e) {
            error_log("時間別パフォーマンス取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * エラー分析
     */
    public function getErrorAnalysis($user_id, $days = 30) {
        try {
            $sql = "
                SELECT 
                    memo,
                    COUNT(*) as error_count,
                    AVG(amount) as avg_amount,
                    MAX(created_at) as latest_error
                FROM {$this->table_name}
                WHERE tenant_id = :user_id
                AND status = 'error'
                AND created_at >= CURRENT_DATE - INTERVAL ':days days'
                AND memo IS NOT NULL
                GROUP BY memo
                ORDER BY error_count DESC, latest_error DESC
                LIMIT 10
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_STR);
            $stmt->bindValue(':days', $days, PDO::PARAM_INT);
            $stmt->execute();
            
            $error_data = $stmt->fetchAll();
            
            $errors = [];
            foreach ($error_data as $error) {
                $errors[] = [
                    'error_message' => $error['memo'],
                    'count' => (int)$error['error_count'],
                    'avg_amount' => round((float)$error['avg_amount'], 2),
                    'latest_error' => $error['latest_error']
                ];
            }
            
            return $errors;
            
        } catch (PDOException $e) {
            error_log("エラー分析取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ダッシュボード用サマリー統計
     */
    public function getDashboardSummary($user_id) {
        try {
            $overall_stats = $this->getOverallStatistics($user_id);
            $today_stats = $this->getTodayStatistics($user_id);
            $account_stats = $this->getAccountStatistics($user_id, 7); // 直近1週間
            
            return [
                'success' => true,
                'data' => [
                    'overall' => $overall_stats['data'],
                    'today' => $today_stats,
                    'top_accounts' => array_slice($account_stats, 0, 5), // トップ5
                    'generated_at' => date('Y-m-d H:i:s')
                ]
            ];
            
        } catch (Exception $e) {
            error_log("ダッシュボードサマリー取得エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * データベース接続終了
     */
    public function __destruct() {
        $this->db = null;
    }
}

?>