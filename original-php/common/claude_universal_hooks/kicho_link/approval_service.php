<?php
/**
 * 承認フローサービス
 * modules/kicho/services/approval_service.php
 * 
 * NAGANO-3統合システム準拠
 * @version 3.0.0
 */

class KichoApprovalService {
    private $transactionModel;
    private $auditLogger;
    
    public function __construct() {
        require_once __DIR__ . '/../models/transaction_model.php';
        $this->transactionModel = new KichoTransactionModel();
        $this->auditLogger = new AuditLogger('kicho_approval');
    }
    
    /**
     * 単一取引承認
     */
    public function approveTransaction($user_id, $transaction_id) {
        try {
            // 取引存在確認
            $transaction = $this->transactionModel->getTransaction($user_id, $transaction_id);
            
            if ($transaction['status'] !== 'pending') {
                throw new Exception('承認待ち状態の取引のみ承認可能です');
            }
            
            // 承認実行
            $result = $this->transactionModel->updateTransactionStatus(
                $user_id, 
                $transaction_id, 
                'approved', 
                "承認者: {$user_id} | 承認日時: " . date('Y-m-d H:i:s')
            );
            
            if ($result) {
                // 監査ログ記録
                $this->auditLogger->log('TRANSACTION_APPROVED', [
                    'user_id' => $user_id,
                    'transaction_id' => $transaction_id,
                    'transaction_no' => $transaction['transaction_no'],
                    'amount' => $transaction['amount'],
                    'description' => $transaction['description'],
                    'approved_at' => date('Y-m-d H:i:s')
                ]);
                
                // MFクラウド連携キューに追加
                $this->queueForMFSync($user_id, $transaction_id);
                
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            error_log("取引承認エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 単一取引却下
     */
    public function rejectTransaction($user_id, $transaction_id, $reason = '') {
        try {
            // 取引存在確認
            $transaction = $this->transactionModel->getTransaction($user_id, $transaction_id);
            
            if ($transaction['status'] !== 'pending') {
                throw new Exception('承認待ち状態の取引のみ却下可能です');
            }
            
            // 却下理由を含むメモ作成
            $rejection_memo = "却下者: {$user_id} | 却下日時: " . date('Y-m-d H:i:s');
            if (!empty($reason)) {
                $rejection_memo .= " | 却下理由: {$reason}";
            }
            
            // 却下実行
            $result = $this->transactionModel->updateTransactionStatus(
                $user_id,
                $transaction_id,
                'rejected',
                $rejection_memo
            );
            
            if ($result) {
                // 監査ログ記録
                $this->auditLogger->log('TRANSACTION_REJECTED', [
                    'user_id' => $user_id,
                    'transaction_id' => $transaction_id,
                    'transaction_no' => $transaction['transaction_no'],
                    'amount' => $transaction['amount'],
                    'description' => $transaction['description'],
                    'rejection_reason' => $reason,
                    'rejected_at' => date('Y-m-d H:i:s')
                ]);
                
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            error_log("取引却下エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 一括承認
     */
    public function bulkApprove($user_id, $transaction_ids) {
        try {
            if (empty($transaction_ids) || !is_array($transaction_ids)) {
                throw new Exception('承認対象の取引が指定されていません');
            }
            
            $approved_count = 0;
            $errors = [];
            $approved_transactions = [];
            
            foreach ($transaction_ids as $transaction_id) {
                try {
                    $result = $this->approveTransaction($user_id, $transaction_id);
                    if ($result) {
                        $approved_count++;
                        $approved_transactions[] = $transaction_id;
                    }
                } catch (Exception $e) {
                    $errors[] = [
                        'transaction_id' => $transaction_id,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            // 一括承認の監査ログ
            $this->auditLogger->log('BULK_APPROVAL_COMPLETED', [
                'user_id' => $user_id,
                'requested_count' => count($transaction_ids),
                'approved_count' => $approved_count,
                'error_count' => count($errors),
                'approved_transactions' => $approved_transactions,
                'errors' => $errors,
                'executed_at' => date('Y-m-d H:i:s')
            ]);
            
            return [
                'approved_count' => $approved_count,
                'requested_count' => count($transaction_ids),
                'errors' => $errors,
                'approved_transactions' => $approved_transactions
            ];
            
        } catch (Exception $e) {
            error_log("一括承認エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 全承認待ち取引の一括承認
     */
    public function approveAllPendingTransactions($user_id) {
        try {
            // 承認待ち取引一覧取得
            $filters = [
                'user_id' => $user_id,
                'status' => 'pending'
            ];
            
            $result = $this->transactionModel->getTransactions($filters, 1, 1000);
            $pending_transactions = $result['data']['transactions'] ?? [];
            
            if (empty($pending_transactions)) {
                return [
                    'approved_count' => 0,
                    'message' => '承認待ちの取引がありません'
                ];
            }
            
            $transaction_ids = array_column($pending_transactions, 'id');
            
            // 一括承認実行
            $approval_result = $this->bulkApprove($user_id, $transaction_ids);
            
            return $approval_result;
            
        } catch (Exception $e) {
            error_log("全件一括承認エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 承認フロー自動化（AI信頼度ベース）
     */
    public function autoApproveByConfidence($user_id, $min_confidence = 90) {
        try {
            // 高信頼度の承認待ち取引取得
            $search_params = [
                'confidence_min' => $min_confidence,
                'ai_generated' => true
            ];
            
            $high_confidence_transactions = $this->transactionModel->searchTransactions($user_id, $search_params);
            
            // 承認待ちのみフィルター
            $pending_transactions = array_filter($high_confidence_transactions, function($transaction) {
                return $transaction['status'] === 'pending';
            });
            
            if (empty($pending_transactions)) {
                return [
                    'auto_approved_count' => 0,
                    'message' => "信頼度{$min_confidence}%以上の承認待ち取引がありません"
                ];
            }
            
            $transaction_ids = array_column($pending_transactions, 'id');
            
            // 自動承認実行
            $approval_result = $this->bulkApprove($user_id, $transaction_ids);
            
            // 自動承認の特別ログ
            $this->auditLogger->log('AUTO_APPROVAL_BY_CONFIDENCE', [
                'user_id' => $user_id,
                'min_confidence' => $min_confidence,
                'auto_approved_count' => $approval_result['approved_count'],
                'executed_at' => date('Y-m-d H:i:s')
            ]);
            
            return [
                'auto_approved_count' => $approval_result['approved_count'],
                'min_confidence' => $min_confidence,
                'errors' => $approval_result['errors']
            ];
            
        } catch (Exception $e) {
            error_log("自動承認エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 承認統計取得
     */
    public function getApprovalStatistics($user_id, $period = '30_days') {
        try {
            $date_from = match($period) {
                '7_days' => date('Y-m-d', strtotime('-7 days')),
                '30_days' => date('Y-m-d', strtotime('-30 days')),
                '90_days' => date('Y-m-d', strtotime('-90 days')),
                'this_month' => date('Y-m-01'),
                'last_month' => date('Y-m-01', strtotime('first day of last month')),
                default => date('Y-m-d', strtotime('-30 days'))
            };
            
            $filters = [
                'user_id' => $user_id,
                'date_from' => $date_from,
                'date_to' => date('Y-m-d')
            ];
            
            $result = $this->transactionModel->getTransactions($filters, 1, 10000);
            $transactions = $result['data']['transactions'] ?? [];
            
            // 統計計算
            $stats = [
                'total_count' => count($transactions),
                'approved_count' => count(array_filter($transactions, fn($t) => $t['status'] === 'approved')),
                'pending_count' => count(array_filter($transactions, fn($t) => $t['status'] === 'pending')),
                'rejected_count' => count(array_filter($transactions, fn($t) => $t['status'] === 'rejected')),
                'ai_generated_count' => count(array_filter($transactions, fn($t) => $t['ai_generated'])),
                'total_amount' => array_sum(array_column($transactions, 'amount')),
                'avg_confidence' => !empty($transactions) ? round(array_sum(array_column($transactions, 'confidence')) / count($transactions), 1) : 0,
                'approval_rate' => 0,
                'automation_rate' => 0,
                'period' => $period,
                'date_from' => $date_from,
                'date_to' => date('Y-m-d')
            ];
            
            // 比率計算
            if ($stats['total_count'] > 0) {
                $stats['approval_rate'] = round(($stats['approved_count'] / $stats['total_count']) * 100, 1);
                $stats['automation_rate'] = round(($stats['ai_generated_count'] / $stats['total_count']) * 100, 1);
            }
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("承認統計取得エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * MFクラウド同期キューに追加
     */
    private function queueForMFSync($user_id, $transaction_id) {
        try {
            // MFクラウド同期待ちステータスに更新
            $this->transactionModel->updateMFSyncStatus($user_id, $transaction_id, 'queued');
            
            // 実際のMF連携処理は別途実装予定
            // キューシステム（Redis、RabbitMQ等）への登録
            
        } catch (Exception $e) {
            error_log("MF同期キュー追加エラー: " . $e->getMessage());
            // 同期エラーは承認処理を停止させない
        }
    }
    
    /**
     * 承認権限チェック
     */
    public function checkApprovalPermission($user_id, $transaction_id = null) {
        // 基本的な権限チェック
        if (!isset($_SESSION['permissions']) || !in_array('kicho_approve', $_SESSION['permissions'])) {
            return false;
        }
        
        // 取引固有の権限チェック（必要に応じて）
        if ($transaction_id) {
            try {
                $transaction = $this->transactionModel->getTransaction($user_id, $transaction_id);
                
                // 自分の取引のみ承認可能などのルール
                if ($transaction['created_by'] === $user_id && !in_array('kicho_approve_own', $_SESSION['permissions'])) {
                    return false;
                }
                
                // 高額取引の特別権限チェック
                if ($transaction['amount'] > 1000000 && !in_array('kicho_approve_high_amount', $_SESSION['permissions'])) {
                    return false;
                }
                
            } catch (Exception $e) {
                return false;
            }
        }
        
        return true;
    }
}

/**
 * 監査ログクラス
 */
class AuditLogger {
    private $log_type;
    
    public function __construct($log_type) {
        $this->log_type = $log_type;
    }
    
    public function log($action, $data) {
        $log_entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'action' => $action,
            'log_type' => $this->log_type,
            'data' => $data,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        // ログファイル出力
        $log_file = __DIR__ . '/../logs/audit_' . date('Y-m') . '.log';
        $log_line = json_encode($log_entry, JSON_UNESCAPED_UNICODE) . "\n";
        
        // ディレクトリ作成
        $log_dir = dirname($log_file);
        if (!is_dir($log_dir)) {
            mkdir($log_dir, 0755, true);
        }
        
        file_put_contents($log_file, $log_line, FILE_APPEND | LOCK_EX);
        
        // システムログにも記録
        error_log("AUDIT [{$this->log_type}] {$action}: " . json_encode($data, JSON_UNESCAPED_UNICODE));
    }
}

?>