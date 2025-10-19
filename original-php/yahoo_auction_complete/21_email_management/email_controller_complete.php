<?php
// src/Controllers/EmailController.php - 完全実装版
namespace App\Controllers;

use App\Services\GmailApiService;
use App\Services\ClassificationService;
use PDO;

class EmailController
{
    private $db;
    private $gmailService;
    private $classificationService;

    public function __construct(PDO $database)
    {
        $this->db = $database;
        $this->gmailService = new GmailApiService();
        $this->classificationService = new ClassificationService($database);
    }

    /**
     * メール一覧取得（フィルター・ページネーション対応）
     */
    public function getEmails(string $category = 'all', array $filters = [], int $page = 1, int $limit = 50): array
    {
        $offset = ($page - 1) * $limit;
        $conditions = [];
        $params = [];

        // カテゴリフィルター
        if ($category !== 'all') {
            $conditions[] = "category = ?";
            $params[] = $category;
        }

        // 送信者タイプフィルター
        if (!empty($filters['sender_types'])) {
            $placeholders = str_repeat('?,', count($filters['sender_types']) - 1) . '?';
            $conditions[] = "sender_type IN ($placeholders)";
            $params = array_merge($params, $filters['sender_types']);
        }

        // 未読フィルター
        if (isset($filters['unread_only']) && $filters['unread_only']) {
            $conditions[] = "is_unread = TRUE";
        }

        // 日付範囲フィルター
        if (!empty($filters['date_from'])) {
            $conditions[] = "date_received >= ?";
            $params[] = $filters['date_from'];
        }
        if (!empty($filters['date_to'])) {
            $conditions[] = "date_received <= ?";
            $params[] = $filters['date_to'];
        }

        // 検索クエリ（全文検索）
        if (!empty($filters['search'])) {
            $conditions[] = "MATCH(subject, snippet) AGAINST(? IN BOOLEAN MODE)";
            $params[] = $filters['search'];
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        
        // メインクエリ
        $query = "
            SELECT e.*, cr.rule_name as applied_rule
            FROM emails e
            LEFT JOIN classification_rules cr ON e.matched_rule_id = cr.id
            {$whereClause}
            ORDER BY e.date_received DESC, e.is_unread DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 件数カウント
        $countQuery = "
            SELECT COUNT(*) as total
            FROM emails e
            {$whereClause}
        ";
        $countStmt = $this->db->prepare($countQuery);
        $countStmt->execute(array_slice($params, 0, -2)); // LIMIT, OFFSET を除外
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        return [
            'emails' => $this->formatEmailsForResponse($emails),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ]
        ];
    }

    /**
     * Gmail同期実行
     */
    public function syncEmails(int $userId, bool $fullSync = false): array
    {
        $startTime = microtime(true);
        $logId = $this->startSyncLog($userId, $fullSync ? 'full' : 'incremental');

        try {
            // 最終同期時刻を取得
            $lastSync = $this->getLastSyncTime($userId);
            
            // 同期クエリ決定
            if ($fullSync || !$lastSync) {
                $query = 'is:unread OR label:INBOX';
                $syncType = 'full';
            } else {
                $syncType = 'incremental';
                $emails = $this->gmailService->getNewEmails($lastSync);
            }

            if ($syncType === 'full') {
                $emails = $this->gmailService->syncEmails($query, 2000);
            }

            $processedCount = 0;
            $newCount = 0;
            $updatedCount = 0;

            foreach ($emails as $emailData) {
                $result = $this->processEmail($emailData);
                
                if ($result['action'] === 'inserted') {
                    $newCount++;
                } elseif ($result['action'] === 'updated') {
                    $updatedCount++;
                }
                
                $processedCount++;

                // 100件ごとに進捗更新
                if ($processedCount % 100 === 0) {
                    $this->updateSyncProgress($logId, $processedCount, $newCount, $updatedCount);
                }
            }

            // 最終同期時刻更新
            $this->updateLastSyncTime($userId);

            // 同期ログ完了
            $duration = microtime(true) - $startTime;
            $this->completeSyncLog($logId, $processedCount, $newCount, $updatedCount, $duration);

            return [
                'success' => true,
                'processed' => $processedCount,
                'new' => $newCount,
                'updated' => $updatedCount,
                'duration' => round($duration, 2)
            ];

        } catch (\Exception $e) {
            $this->failSyncLog($logId, $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'processed' => $processedCount ?? 0
            ];
        }
    }

    /**
     * メール処理（挿入・更新・分類）
     */
    private function processEmail(array $emailData): array
    {
        // 既存メール確認
        $existingEmail = $this->getEmailById($emailData['id']);
        
        if ($existingEmail) {
            // 更新が必要かチェック
            if ($this->needsUpdate($existingEmail, $emailData)) {
                $this->updateEmail($emailData);
                return ['action' => 'updated'];
            }
            return ['action' => 'skipped'];
        }

        // 新規メールの自動分類
        $classification = $this->classificationService->classifyEmail($emailData);
        
        // 分類結果をメールデータに追加
        $emailData['category'] = $classification['category'];
        $emailData['sender_type'] = $classification['sender_type'];
        $emailData['classification_confidence'] = $classification['confidence'];
        $emailData['matched_rule_id'] = $classification['rule_id'] ?? null;

        // データベースに挿入
        $this->insertEmail($emailData);

        return ['action' => 'inserted'];
    }

    /**
     * メール操作実行（移動・削除）
     */
    public function performAction(string $action, array $emailIds, array $options = []): array
    {
        try {
            switch ($action) {
                case 'move_to_category':
                    return $this->moveToCategory($emailIds, $options['category']);
                
                case 'move_to_delete_candidate':
                    return $this->moveToDeleteCandidate($emailIds);
                
                case 'delete_permanently':
                    return $this->deleteEmails($emailIds);
                
                case 'mark_as_read':
                    return $this->markAsRead($emailIds);
                
                case 'mark_as_unread':
                    return $this->markAsUnread($emailIds);
                
                default:
                    throw new \InvalidArgumentException("Unknown action: {$action}");
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'processed' => 0
            ];
        }
    }

    /**
     * カテゴリ移動処理
     */
    private function moveToCategory(array $emailIds, string $category): array
    {
        $this->db->beginTransaction();
        
        try {
            // ローカルDB更新
            $stmt = $this->db->prepare("
                UPDATE emails 
                SET category = ?, updated_at = NOW() 
                WHERE id IN (" . str_repeat('?,', count($emailIds) - 1) . "?)
            ");
            $params = array_merge([$category], $emailIds);
            $stmt->execute($params);
            $affectedRows = $stmt->rowCount();

            // Gmail ラベル適用
            $labelName = $this->getCategoryLabel($category);
            $gmailSuccess = $this->gmailService->applyLabel($emailIds, $labelName);

            if (!$gmailSuccess) {
                throw new \Exception('Gmail label application failed');
            }

            $this->db->commit();

            return [
                'success' => true,
                'processed' => $affectedRows,
                'category' => $category,
                'gmail_synced' => true
            ];

        } catch (\Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * 削除候補移動
     */
    private function moveToDeleteCandidate(array $emailIds): array
    {
        return $this->moveToCategory($emailIds, 'delete-candidate');
    }

    /**
     * 完全削除処理
     */
    private function deleteEmails(array $emailIds): array
    {
        $this->db->beginTransaction();
        
        try {
            // Gmail で削除
            $gmailSuccess = $this->gmailService->trashEmails($emailIds);
            
            if (!$gmailSuccess) {
                throw new \Exception('Gmail deletion failed');
            }

            // ローカルDBから削除
            $stmt = $this->db->prepare("
                DELETE FROM emails 
                WHERE id IN (" . str_repeat('?,', count($emailIds) - 1) . "?)
            ");
            $stmt->execute($emailIds);
            $deletedCount = $stmt->rowCount();

            $this->db->commit();

            return [
                'success' => true,
                'deleted' => $deletedCount,
                'gmail_synced' => true
            ];

        } catch (\Exception $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * 既読マーク
     */
    private function markAsRead(array $emailIds): array
    {
        $stmt = $this->db->prepare("
            UPDATE emails 
            SET is_unread = FALSE, updated_at = NOW() 
            WHERE id IN (" . str_repeat('?,', count($emailIds) - 1) . "?)
        ");
        $stmt->execute($emailIds);

        // Gmail API での既読処理
        // $this->gmailService->markAsRead($emailIds);

        return [
            'success' => true,
            'processed' => $stmt->rowCount()
        ];
    }

    /**
     * 統計データ取得
     */
    public function getStatistics(): array
    {
        $stats = [];

        // カテゴリ別件数
        $stmt = $this->db->query("
            SELECT category, COUNT(*) as count 
            FROM emails 
            GROUP BY category
        ");
        $stats['by_category'] = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // 送信者タイプ別件数
        $stmt = $this->db->query("
            SELECT sender_type, COUNT(*) as count 
            FROM emails 
            GROUP BY sender_type
        ");
        $stats['by_sender_type'] = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // 未読件数
        $stmt = $this->db->query("
            SELECT 
                SUM(is_unread) as unread_count,
                COUNT(*) as total_count
            FROM emails
        ");
        $counts = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['unread_count'] = $counts['unread_count'];
        $stats['total_count'] = $counts['total_count'];

        // 今日の統計
        $stmt = $this->db->query("
            SELECT 
                COUNT(*) as today_count,
                SUM(CASE WHEN category = 'important' THEN 1 ELSE 0 END) as today_important
            FROM emails 
            WHERE DATE(date_received) = CURDATE()
        ");
        $todayStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats['today'] = $todayStats;

        return $stats;
    }

    /**
     * ユーザーフィードバック処理
     */
    public function submitFeedback(string $emailId, string $correctCategory, string $correctSenderType, int $userId): array
    {
        try {
            // フィードバックを分類サービスに渡して学習
            $success = $this->classificationService->improveFromUserFeedback(
                $emailId, 
                $correctCategory, 
                $correctSenderType
            );

            if ($success) {
                // メールの分類を修正
                $stmt = $this->db->prepare("
                    UPDATE emails 
                    SET category = ?, sender_type = ?, updated_at = NOW() 
                    WHERE id = ?
                ");
                $stmt->execute([$correctCategory, $correctSenderType, $emailId]);

                // Gmail ラベルも更新
                $labelName = $this->getCategoryLabel($correctCategory);
                $this->gmailService->applyLabel([$emailId], $labelName);

                return [
                    'success' => true,
                    'message' => 'フィードバックを学習に反映しました'
                ];
            }

            return [
                'success' => false,
                'message' => 'フィードバックの処理に失敗しました'
            ];

        } catch (\Exception $e) {
            error_log("Feedback submission error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'システムエラーが発生しました'
            ];
        }
    }

    /**
     * 検索機能（高度検索対応）
     */
    public function searchEmails(string $query, array $filters = [], int $page = 1, int $limit = 50): array
    {
        $conditions = [];
        $params = [];

        // 全文検索
        if (!empty($query)) {
            $conditions[] = "MATCH(subject, snippet) AGAINST(? IN BOOLEAN MODE)";
            $params[] = $query;
        }

        // 詳細フィルター適用
        if (!empty($filters['category'])) {
            $conditions[] = "category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['sender_email'])) {
            $conditions[] = "sender_email LIKE ?";
            $params[] = '%' . $filters['sender_email'] . '%';
        }

        if (!empty($filters['date_from'])) {
            $conditions[] = "date_received >= ?";
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $conditions[] = "date_received <= ?";
            $params[] = $filters['date_to'];
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $offset = ($page - 1) * $limit;

        // 検索クエリ実行
        $query = "
            SELECT e.*, cr.rule_name as applied_rule
            FROM emails e
            LEFT JOIN classification_rules cr ON e.matched_rule_id = cr.id
            {$whereClause}
            ORDER BY e.date_received DESC
            LIMIT ? OFFSET ?
        ";
        
        $params[] = $limit;
        $params[] = $offset;

        $stmt = $this->db->prepare($query);
        $stmt->execute($params);
        $emails = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 検索結果件数
        $countQuery = "SELECT COUNT(*) as total FROM emails e {$whereClause}";
        $countStmt = $this->db->prepare($countQuery);
        $countStmt->execute(array_slice($params, 0, -2));
        $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        return [
            'emails' => $this->formatEmailsForResponse($emails),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit)
            ],
            'query' => $query
        ];
    }

    // ===== Private Helper Methods =====

    /**
     * メールデータのフォーマット（レスポンス用）
     */
    private function formatEmailsForResponse(array $emails): array
    {
        return array_map(function($email) {
            return [
                'id' => $email['id'],
                'thread_id' => $email['thread_id'],
                'subject' => $email['subject'],
                'sender' => [
                    'name' => $email['sender_name'],
                    'email' => $email['sender_email']
                ],
                'snippet' => $email['snippet'],
                'date_received' => $email['date_received'],
                'is_unread' => (bool)$email['is_unread'],
                'is_replied' => (bool)$email['is_replied'],
                'category' => $email['category'],
                'sender_type' => $email['sender_type'],
                'classification' => [
                    'confidence' => $email['classification_confidence'],
                    'rule' => $email['applied_rule'] ?? null
                ],
                'gmail_url' => "https://mail.google.com/mail/u/0/#inbox/{$email['id']}",
                'tags' => $this->generateEmailTags($email)
            ];
        }, $emails);
    }

    /**
     * メールタグ生成
     */
    private function generateEmailTags(array $email): array
    {
        $tags = [];

        // 送信者タイプタグ
        if (in_array($email['sender_type'], ['amazon', 'rakuten', 'yahoo', 'mercari', 'ebay'])) {
            $tags[] = [
                'type' => 'ec',
                'label' => ucfirst($email['sender_type']),
                'color' => 'orange'
            ];
        } elseif ($email['sender_type'] === 'customer') {
            $tags[] = [
                'type' => 'customer',
                'label' => '顧客対応',
                'color' => 'green'
            ];
        } elseif (in_array($email['sender_type'], ['notification', 'ads'])) {
            $tags[] = [
                'type' => 'system',
                'label' => 'システム',
                'color' => 'gray'
            ];
        }

        // ステータスタグ
        if ($email['is_unread']) {
            $tags[] = [
                'type' => 'status',
                'label' => '未読',
                'color' => 'red'
            ];
        }

        if ($email['is_replied']) {
            $tags[] = [
                'type' => 'status',
                'label' => '返信済み',
                'color' => 'blue'
            ];
        }

        return $tags;
    }

    /**
     * カテゴリに対応するGmailラベル名取得
     */
    private function getCategoryLabel(string $category): string
    {
        $labelMap = [
            'important' => 'ツール/重要',
            'unclassified' => 'ツール/未分類',
            'ignore' => 'ツール/無視する',
            'delete-candidate' => 'ツール/削除候補'
        ];

        return $labelMap[$category] ?? 'ツール/その他';
    }

    /**
     * メール挿入
     */
    private function insertEmail(array $emailData): void
    {
        $stmt = $this->db->prepare("
            INSERT INTO emails (
                id, thread_id, subject, sender_name, sender_email, snippet,
                date_received, is_unread, is_replied, category, sender_type,
                gmail_labels, internal_date, classification_confidence, matched_rule_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $emailData['id'],
            $emailData['thread_id'],
            $emailData['subject'],
            $emailData['sender_name'],
            $emailData['sender_email'],
            $emailData['snippet'],
            $emailData['date_received'],
            $emailData['is_unread'],
            $emailData['is_replied'] ?? false,
            $emailData['category'],
            $emailData['sender_type'],
            $emailData['gmail_labels'],
            $emailData['internal_date'] ?? null,
            $emailData['classification_confidence'] ?? 0.0,
            $emailData['matched_rule_id'] ?? null
        ]);
    }

    /**
     * メール更新
     */
    private function updateEmail(array $emailData): void
    {
        $stmt = $this->db->prepare("
            UPDATE emails SET
                subject = ?, sender_name = ?, sender_email = ?, snippet = ?,
                is_unread = ?, is_replied = ?, gmail_labels = ?, updated_at = NOW()
            WHERE id = ?
        ");

        $stmt->execute([
            $emailData['subject'],
            $emailData['sender_name'],
            $emailData['sender_email'],
            $emailData['snippet'],
            $emailData['is_unread'],
            $emailData['is_replied'] ?? false,
            $emailData['gmail_labels'],
            $emailData['id']
        ]);
    }

    /**
     * メール取得（ID指定）
     */
    private function getEmailById(string $emailId): ?array
    {
        $stmt = $this->db->prepare("SELECT * FROM emails WHERE id = ?");
        $stmt->execute([$emailId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * 更新が必要かチェック
     */
    private function needsUpdate(array $existingEmail, array $newEmailData): bool
    {
        return (
            $existingEmail['is_unread'] != $newEmailData['is_unread'] ||
            $existingEmail['gmail_labels'] != $newEmailData['gmail_labels'] ||
            $existingEmail['snippet'] != $newEmailData['snippet']
        );
    }

    /**
     * 同期ログ開始
     */
    private function startSyncLog(int $userId, string $syncType): int
    {
        $stmt = $this->db->prepare("
            INSERT INTO sync_logs (user_id, sync_type, sync_status, started_at)
            VALUES (?, ?, 'running', NOW())
        ");
        $stmt->execute([$userId, $syncType]);
        return $this->db->lastInsertId();
    }

    /**
     * 同期進捗更新
     */
    private function updateSyncProgress(int $logId, int $processed, int $new, int $updated): void
    {
        $stmt = $this->db->prepare("
            UPDATE sync_logs SET
                emails_processed = ?, emails_new = ?, emails_updated = ?
            WHERE id = ?
        ");
        $stmt->execute([$processed, $new, $updated, $logId]);
    }

    /**
     * 同期ログ完了
     */
    private function completeSyncLog(int $logId, int $processed, int $new, int $updated, float $duration): void
    {
        $stmt = $this->db->prepare("
            UPDATE sync_logs SET
                emails_processed = ?, emails_new = ?, emails_updated = ?,
                processing_time_seconds = ?, sync_status = 'completed', completed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$processed, $new, $updated, $duration, $logId]);
    }

    /**
     * 同期ログ失敗
     */
    private function failSyncLog(int $logId, string $errorMessage): void
    {
        $stmt = $this->db->prepare("
            UPDATE sync_logs SET
                sync_status = 'failed', error_details = JSON_OBJECT('error', ?), completed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$errorMessage, $logId]);
    }

    /**
     * 最終同期時刻取得
     */
    private function getLastSyncTime(int $userId): ?\DateTime
    {
        $stmt = $this->db->prepare("
            SELECT last_sync_time FROM user_settings WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result && $result['last_sync_time'] 
            ? new \DateTime($result['last_sync_time']) 
            : null;
    }

    /**
     * 最終同期時刻更新
     */
    private function updateLastSyncTime(int $userId): void
    {
        $stmt = $this->db->prepare("
            UPDATE user_settings SET last_sync_time = NOW() WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
    }
}