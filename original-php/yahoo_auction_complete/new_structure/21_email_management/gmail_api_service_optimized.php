<?php
// src/Services/GmailApiService.php - 最適化版
namespace App\Services;

use Google_Client;
use Google_Service_Gmail;
use Google_Service_Gmail_Message;
use Google_Service_Gmail_ModifyMessageRequest;
use Google_Service_Gmail_BatchDeleteMessagesRequest;
use Google_Service_Exception;

class GmailApiService
{
    private $client;
    private $service;
    private $maxRetries = 3;
    private $retryDelay = 1; // seconds

    public function __construct()
    {
        $this->initializeClient();
    }

    /**
     * Google Clientの初期化とトークン管理
     */
    private function initializeClient(): void
    {
        $this->client = new Google_Client();
        $this->client->setAuthConfig(CONFIG_PATH . '/credentials.json');
        $this->client->addScope(Google_Service_Gmail::GMAIL_MODIFY);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('select_account consent');

        // 既存トークンの読み込み
        $tokenPath = CONFIG_PATH . '/token.json';
        if (file_exists($tokenPath)) {
            $accessToken = json_decode(file_get_contents($tokenPath), true);
            $this->client->setAccessToken($accessToken);
        }

        // トークンの自動更新
        if ($this->client->isAccessTokenExpired()) {
            if ($this->client->getRefreshToken()) {
                $this->client->fetchAccessTokenWithRefreshToken($this->client->getRefreshToken());
                file_put_contents($tokenPath, json_encode($this->client->getAccessToken()));
            } else {
                throw new \Exception('認証が必要です。初回認証フローを実行してください。');
            }
        }

        $this->service = new Google_Service_Gmail($this->client);
    }

    /**
     * 大量メール処理対応の同期メソッド
     * ページネーション + Rate Limit対応
     */
    public function syncEmails(string $query = 'is:unread', int $maxEmails = 5000): array
    {
        $emails = [];
        $pageToken = null;
        $processedCount = 0;

        do {
            try {
                $params = [
                    'q' => $query,
                    'maxResults' => 500, // Gmail API最大値
                    'pageToken' => $pageToken
                ];

                $results = $this->executeWithRetry(function() use ($params) {
                    return $this->service->users_messages->listUsersMessages('me', $params);
                });

                if (!$results->getMessages()) {
                    break;
                }

                // バッチ処理でメール詳細を取得
                $batchEmails = $this->getBatchEmailDetails($results->getMessages());
                $emails = array_merge($emails, $batchEmails);

                $processedCount += count($batchEmails);
                $pageToken = $results->getNextPageToken();

                // Rate Limit対策：100件ごとに1秒待機
                if ($processedCount % 100 == 0) {
                    sleep(1);
                }

                // 進捗ログ
                error_log("Gmail Sync Progress: {$processedCount}/{$maxEmails} emails processed");

            } catch (Google_Service_Exception $e) {
                error_log("Gmail API Error: " . $e->getMessage());
                
                // Rate Limitエラーの場合は長めに待機
                if ($e->getCode() == 429) {
                    sleep(60); // 1分待機
                    continue;
                }
                
                throw $e;
            }

        } while ($pageToken && $processedCount < $maxEmails);

        return $emails;
    }

    /**
     * バッチ処理でメール詳細を効率取得
     */
    private function getBatchEmailDetails(array $messages): array
    {
        $emails = [];
        $batchSize = 100; // 100件ずつ処理
        $chunks = array_chunk($messages, $batchSize);

        foreach ($chunks as $chunk) {
            foreach ($chunk as $message) {
                try {
                    $emailDetails = $this->executeWithRetry(function() use ($message) {
                        return $this->service->users_messages->get('me', $message->getId(), [
                            'format' => 'full'
                        ]);
                    });

                    $emails[] = $this->parseEmailData($emailDetails);

                } catch (Google_Service_Exception $e) {
                    error_log("Failed to get email details for ID: " . $message->getId() . " - " . $e->getMessage());
                    continue; // スキップして続行
                }
            }

            // バッチ間の待機
            usleep(500000); // 0.5秒
        }

        return $emails;
    }

    /**
     * メールデータのパース
     */
    private function parseEmailData(Google_Service_Gmail_Message $message): array
    {
        $headers = $message->getPayload()->getHeaders();
        $headerMap = [];
        
        foreach ($headers as $header) {
            $headerMap[$header->getName()] = $header->getValue();
        }

        return [
            'id' => $message->getId(),
            'thread_id' => $message->getThreadId(),
            'subject' => $headerMap['Subject'] ?? '',
            'sender_name' => $this->extractSenderName($headerMap['From'] ?? ''),
            'sender_email' => $this->extractSenderEmail($headerMap['From'] ?? ''),
            'snippet' => $message->getSnippet(),
            'date_received' => date('Y-m-d H:i:s', strtotime($headerMap['Date'] ?? 'now')),
            'is_unread' => in_array('UNREAD', $message->getLabelIds() ?? []),
            'gmail_labels' => json_encode($message->getLabelIds() ?? []),
            'internal_date' => $message->getInternalDate()
        ];
    }

    /**
     * ラベル適用（カテゴリ移動対応）
     */
    public function applyLabel(array $messageIds, string $labelName): bool
    {
        try {
            $labelId = $this->getOrCreateLabel($labelName);
            
            // 100件ずつバッチ処理
            $chunks = array_chunk($messageIds, 100);
            
            foreach ($chunks as $chunk) {
                $this->executeWithRetry(function() use ($chunk, $labelId) {
                    foreach ($chunk as $messageId) {
                        $modifyRequest = new Google_Service_Gmail_ModifyMessageRequest();
                        $modifyRequest->setAddLabelIds([$labelId]);
                        
                        $this->service->users_messages->modify('me', $messageId, $modifyRequest);
                    }
                });
                
                usleep(200000); // 0.2秒待機
            }

            error_log("Applied label '{$labelName}' to " . count($messageIds) . " emails");
            return true;

        } catch (Exception $e) {
            error_log("Gmail label apply error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 大量メール削除（ゴミ箱移動）
     */
    public function trashEmails(array $messageIds): bool
    {
        try {
            // Gmail APIの制限により、1回のbatchDeleteで削除できるのは1000件まで
            $chunks = array_chunk($messageIds, 1000);
            $totalDeleted = 0;

            foreach ($chunks as $chunk) {
                $this->executeWithRetry(function() use ($chunk) {
                    $batchRequest = new Google_Service_Gmail_BatchDeleteMessagesRequest();
                    $batchRequest->setIds($chunk);
                    $this->service->users_messages->batchDelete('me', $batchRequest);
                });

                $totalDeleted += count($chunk);
                error_log("Deleted batch: {$totalDeleted}/" . count($messageIds) . " emails");
                
                sleep(1); // 1秒待機
            }

            return true;

        } catch (Exception $e) {
            error_log("Gmail delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Rate Limit対応のリトライ機能
     */
    private function executeWithRetry(callable $operation)
    {
        $attempt = 0;
        
        while ($attempt < $this->maxRetries) {
            try {
                return $operation();
                
            } catch (Google_Service_Exception $e) {
                $attempt++;
                
                // Rate Limit (429) または Quota Exceeded (403)
                if (in_array($e->getCode(), [429, 403]) && $attempt < $this->maxRetries) {
                    $waitTime = $this->retryDelay * pow(2, $attempt); // 指数バックオフ
                    error_log("Rate limit hit. Waiting {$waitTime} seconds before retry {$attempt}/{$this->maxRetries}");
                    sleep($waitTime);
                    continue;
                }
                
                throw $e;
            }
        }
        
        throw new \Exception("Operation failed after {$this->maxRetries} attempts");
    }

    /**
     * ラベルの取得または作成
     */
    private function getOrCreateLabel(string $labelName): string
    {
        // 既存ラベルを検索
        $labels = $this->service->users_labels->listUsersLabels('me');
        
        foreach ($labels->getLabels() as $label) {
            if ($label->getName() === $labelName) {
                return $label->getId();
            }
        }

        // ラベルが存在しない場合は作成
        $labelObject = new \Google_Service_Gmail_Label();
        $labelObject->setName($labelName);
        $labelObject->setLabelListVisibility('labelShow');
        $labelObject->setMessageListVisibility('show');

        $createdLabel = $this->service->users_labels->create('me', $labelObject);
        return $createdLabel->getId();
    }

    /**
     * 送信者名の抽出
     */
    private function extractSenderName(string $fromHeader): string
    {
        if (preg_match('/^(.+?)\s*<.+>$/', $fromHeader, $matches)) {
            return trim($matches[1], '"');
        }
        return $fromHeader;
    }

    /**
     * 送信者メールアドレスの抽出
     */
    private function extractSenderEmail(string $fromHeader): string
    {
        if (preg_match('/<(.+)>$/', $fromHeader, $matches)) {
            return $matches[1];
        }
        return $fromHeader;
    }

    /**
     * 増分同期用：最終同期以降のメール取得
     */
    public function getNewEmails(\DateTime $lastSyncTime): array
    {
        $dateStr = $lastSyncTime->format('Y/m/d');
        $query = "is:unread after:{$dateStr}";
        
        return $this->syncEmails($query, 1000); // 新着メールは最大1000件
    }
}