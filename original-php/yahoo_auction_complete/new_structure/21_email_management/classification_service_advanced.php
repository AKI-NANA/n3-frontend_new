<?php
// src/Services/ClassificationService.php - 高精度版
namespace App\Services;

use PDO;

class ClassificationService
{
    private $db;
    private $confidenceThreshold = 0.6;

    public function __construct(PDO $database)
    {
        $this->db = $database;
    }

    /**
     * メール自動分類 - 複合的判定ロジック
     */
    public function classifyEmail(array $emailData): array
    {
        $classifications = [];
        
        // 1. ドメインベース分類（最高優先度）
        $domainClassification = $this->classifyByDomain($emailData['sender_email']);
        if ($domainClassification['confidence'] > 0.8) {
            $classifications[] = $domainClassification;
        }

        // 2. キーワードベース分類
        $keywordClassification = $this->classifyByKeywords(
            $emailData['subject'], 
            $emailData['snippet']
        );
        if ($keywordClassification['confidence'] > $this->confidenceThreshold) {
            $classifications[] = $keywordClassification;
        }

        // 3. 顧客対応判定（個人メール検出）
        $customerClassification = $this->detectCustomerInquiry($emailData);
        if ($customerClassification['confidence'] > $this->confidenceThreshold) {
            $classifications[] = $customerClassification;
        }

        // 4. データベースルールベース分類
        $ruleClassification = $this->classifyByDatabaseRules($emailData);
        if ($ruleClassification['confidence'] > $this->confidenceThreshold) {
            $classifications[] = $ruleClassification;
        }

        // 最高信頼度の分類を採用
        if (empty($classifications)) {
            return [
                'category' => 'unclassified',
                'sender_type' => 'unknown',
                'confidence' => 0.0,
                'matched_rule' => null
            ];
        }

        $bestClassification = max($classifications, function($a, $b) {
            return $a['confidence'] <=> $b['confidence'];
        });

        // 学習データとして保存
        $this->saveClassificationResult($emailData, $bestClassification);

        return $bestClassification;
    }

    /**
     * データベース駆動のルールベース分類
     */
    private function classifyByDatabaseRules(array $emailData): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM classification_rules 
            WHERE is_active = TRUE 
            ORDER BY priority DESC, confidence DESC
        ");
        $stmt->execute();
        $rules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $senderDomain = $this->extractDomain($emailData['sender_email']);
        $subject = mb_strtolower($emailData['subject']);
        $snippet = mb_strtolower($emailData['snippet']);
        $fullText = $subject . ' ' . $snippet;

        foreach ($rules as $rule) {
            $score = 0;
            $maxScore = 0;
            $matchedConditions = [];

            // ドメイン条件の検証
            if (!empty($rule['sender_domain'])) {
                $maxScore += 30;
                if ($senderDomain === $rule['sender_domain']) {
                    $score += 30;
                    $matchedConditions[] = "domain:{$senderDomain}";
                }
            }

            // キーワード条件の検証
            if (!empty($rule['subject_keywords'])) {
                $keywords = json_decode($rule['subject_keywords'], true);
                $maxScore += 20;
                
                foreach ($keywords as $keyword) {
                    if (mb_strpos($fullText, mb_strtolower($keyword)) !== false) {
                        $score += 5; // キーワード1つにつき5点
                        $matchedConditions[] = "keyword:{$keyword}";
                    }
                }
            }

            // 送信者条件の検証
            if (!empty($rule['sender_pattern'])) {
                $maxScore += 15;
                $pattern = '/' . str_replace('*', '.*', $rule['sender_pattern']) . '/i';
                if (preg_match($pattern, $emailData['sender_email'])) {
                    $score += 15;
                    $matchedConditions[] = "sender_pattern:{$rule['sender_pattern']}";
                }
            }

            // 件名パターンの検証
            if (!empty($rule['subject_pattern'])) {
                $maxScore += 10;
                $pattern = '/' . $rule['subject_pattern'] . '/iu';
                if (preg_match($pattern, $emailData['subject'])) {
                    $score += 10;
                    $matchedConditions[] = "subject_pattern:{$rule['subject_pattern']}";
                }
            }

            // 信頼度計算
            $confidence = $maxScore > 0 ? ($score / $maxScore) * ($rule['base_confidence'] / 100) : 0;

            if ($confidence >= $this->confidenceThreshold) {
                return [
                    'category' => $rule['target_category'],
                    'sender_type' => $rule['target_sender_type'],
                    'confidence' => $confidence,
                    'matched_rule' => $rule['rule_name'],
                    'matched_conditions' => $matchedConditions,
                    'rule_id' => $rule['id']
                ];
            }
        }

        return ['confidence' => 0.0];
    }

    /**
     * ドメインベース分類（ECモール特化）
     */
    private function classifyByDomain(string $senderEmail): array
    {
        $domain = $this->extractDomain($senderEmail);
        
        $ecDomains = [
            // Amazon関連
            'amazon.co.jp' => ['amazon', 'important', 0.95],
            'amazon.com' => ['amazon', 'important', 0.95],
            'sellercentral-communications.amazon.com' => ['amazon', 'important', 0.98],
            'sellercentral.amazon.co.jp' => ['amazon', 'important', 0.98],
            
            // 楽天関連
            'rakuten.co.jp' => ['rakuten', 'important', 0.90],
            'shop.rakuten.co.jp' => ['rakuten', 'important', 0.85],
            'rms.rakuten.co.jp' => ['rakuten', 'important', 0.95],
            
            // Yahoo関連
            'yahoo.co.jp' => ['yahoo', 'important', 0.85],
            'shopping.yahoo.co.jp' => ['yahoo', 'important', 0.90],
            'store.yahoo.co.jp' => ['yahoo', 'important', 0.92],
            
            // メルカリ関連
            'mercari.com' => ['mercari', 'important', 0.90],
            'mercari.jp' => ['mercari', 'important', 0.90],
            
            // eBay関連
            'ebay.com' => ['ebay', 'important', 0.88],
            'ebay.co.jp' => ['ebay', 'important', 0.88],
            
            // その他ECサービス
            'shopify.com' => ['shopify', 'important', 0.85],
            'woocommerce.com' => ['woocommerce', 'unclassified', 0.70],
        ];

        if (isset($ecDomains[$domain])) {
            [$senderType, $category, $confidence] = $ecDomains[$domain];
            
            return [
                'category' => $category,
                'sender_type' => $senderType,
                'confidence' => $confidence,
                'matched_rule' => 'domain_classification',
                'domain' => $domain
            ];
        }

        return ['confidence' => 0.0];
    }

    /**
     * キーワードベース分類（多言語対応）
     */
    private function classifyByKeywords(string $subject, string $snippet): array
    {
        $text = mb_strtolower($subject . ' ' . $snippet);
        
        // 重要度別キーワード定義
        $keywordPatterns = [
            'critical_customer' => [
                'keywords' => ['返品', '返金', 'クレーム', '苦情', '不良品', '壊れ', '問題', 'トラブル', '至急', '緊急'],
                'category' => 'important',
                'sender_type' => 'customer',
                'confidence' => 0.95
            ],
            'customer_inquiry' => [
                'keywords' => ['問い合わせ', 'お問い合わせ', '質問', '相談', 'サイズ', '色', '在庫', '配送', 'inquiry', 'question'],
                'category' => 'important',
                'sender_type' => 'customer',
                'confidence' => 0.85
            ],
            'order_related' => [
                'keywords' => ['注文', '購入', '決済', '支払い', 'order', 'purchase', 'payment', '発送', '配送', 'shipping'],
                'category' => 'important',
                'sender_type' => 'customer',
                'confidence' => 0.80
            ],
            'system_notification' => [
                'keywords' => ['お知らせ', '通知', 'notification', 'アップデート', 'update', '重要なお知らせ', 'システム'],
                'category' => 'unclassified',
                'sender_type' => 'notification',
                'confidence' => 0.70
            ],
            'promotional' => [
                'keywords' => ['キャンペーン', 'セール', 'プロモーション', '広告', 'newsletter', 'campaign', '特価', '割引'],
                'category' => 'ignore',
                'sender_type' => 'ads',
                'confidence' => 0.75
            ]
        ];

        foreach ($keywordPatterns as $patternName => $pattern) {
            $matchCount = 0;
            $matchedKeywords = [];
            
            foreach ($pattern['keywords'] as $keyword) {
                if (mb_strpos($text, $keyword) !== false) {
                    $matchCount++;
                    $matchedKeywords[] = $keyword;
                }
            }

            // マッチ率に基づく信頼度調整
            if ($matchCount > 0) {
                $matchRatio = $matchCount / count($pattern['keywords']);
                $adjustedConfidence = $pattern['confidence'] * (0.5 + $matchRatio * 0.5);
                
                return [
                    'category' => $pattern['category'],
                    'sender_type' => $pattern['sender_type'],
                    'confidence' => $adjustedConfidence,
                    'matched_rule' => "keyword_pattern:{$patternName}",
                    'matched_keywords' => $matchedKeywords,
                    'match_count' => $matchCount
                ];
            }
        }

        return ['confidence' => 0.0];
    }

    /**
     * 顧客対応メール検出（個人ドメイン判定）
     */
    private function detectCustomerInquiry(array $emailData): array
    {
        $senderEmail = $emailData['sender_email'];
        $domain = $this->extractDomain($senderEmail);
        
        // 企業ドメインのブラックリスト
        $corporateDomains = [
            'amazon.com', 'amazon.co.jp', 'rakuten.co.jp', 'yahoo.co.jp',
            'mercari.com', 'ebay.com', 'shopify.com', 'google.com', 'microsoft.com'
        ];

        // 一般プロバイダードメイン（個人メール可能性高）
        $personalProviders = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
            'icloud.com', 'me.com', 'mac.com', 'aol.com', 'nifty.com', 'biglobe.ne.jp'
        ];

        // 企業ドメインの場合は顧客対応ではない
        if (in_array($domain, $corporateDomains)) {
            return ['confidence' => 0.0];
        }

        // 個人プロバイダーの場合は顧客対応可能性高
        if (in_array($domain, $personalProviders)) {
            return [
                'category' => 'important',
                'sender_type' => 'customer',
                'confidence' => 0.75,
                'matched_rule' => 'personal_email_detection',
                'provider' => $domain
            ];
        }

        // その他のドメインは中程度の可能性
        return [
            'category' => 'unclassified',
            'sender_type' => 'business',
            'confidence' => 0.50,
            'matched_rule' => 'unknown_domain',
            'domain' => $domain
        ];
    }

    /**
     * ドメイン抽出
     */
    private function extractDomain(string $email): string
    {
        if (preg_match('/@(.+)$/', $email, $matches)) {
            return strtolower($matches[1]);
        }
        return '';
    }

    /**
     * 分類結果の学習データ保存
     */
    private function saveClassificationResult(array $emailData, array $classification): void
    {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO classification_results 
                (email_id, sender_email, sender_domain, subject, predicted_category, predicted_sender_type, 
                 confidence, matched_rule, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $emailData['id'],
                $emailData['sender_email'],
                $this->extractDomain($emailData['sender_email']),
                $emailData['subject'],
                $classification['category'],
                $classification['sender_type'],
                $classification['confidence'],
                $classification['matched_rule'] ?? null
            ]);
            
        } catch (\Exception $e) {
            error_log("Failed to save classification result: " . $e->getMessage());
        }
    }

    /**
     * ユーザーフィードバックによるルール改善
     */
    public function improveFromUserFeedback(string $emailId, string $correctCategory, string $correctSenderType): bool
    {
        try {
            // 既存の分類結果を取得
            $stmt = $this->db->prepare("
                SELECT * FROM classification_results 
                WHERE email_id = ? 
                ORDER BY created_at DESC 
                LIMIT 1
            ");
            $stmt->execute([$emailId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                return false;
            }

            // 予測が間違っていた場合、ルールを調整
            if ($result['predicted_category'] !== $correctCategory || 
                $result['predicted_sender_type'] !== $correctSenderType) {
                
                $this->createOrUpdateRule($result, $correctCategory, $correctSenderType);
                
                // フィードバックログを保存
                $stmt = $this->db->prepare("
                    INSERT INTO user_feedback 
                    (email_id, original_prediction, correct_classification, created_at) 
                    VALUES (?, ?, ?, NOW())
                ");
                
                $stmt->execute([
                    $emailId,
                    json_encode([
                        'category' => $result['predicted_category'],
                        'sender_type' => $result['predicted_sender_type']
                    ]),
                    json_encode([
                        'category' => $correctCategory,
                        'sender_type' => $correctSenderType
                    ])
                ]);
            }

            return true;
            
        } catch (\Exception $e) {
            error_log("Failed to process user feedback: " . $e->getMessage());
            return false;
        }
    }

    /**
     * フィードバックに基づく新規ルール作成
     */
    private function createOrUpdateRule(array $classificationResult, string $correctCategory, string $correctSenderType): void
    {
        // ドメインベースのルールを作成/更新
        $domain = $classificationResult['sender_domain'];
        
        $stmt = $this->db->prepare("
            INSERT INTO classification_rules 
            (rule_name, sender_domain, target_category, target_sender_type, base_confidence, priority, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
            ON DUPLICATE KEY UPDATE
            target_category = VALUES(target_category),
            target_sender_type = VALUES(target_sender_type),
            base_confidence = LEAST(base_confidence + 5, 95),
            updated_at = NOW()
        ");
        
        $stmt->execute([
            "auto_learned_{$domain}",
            $domain,
            $correctCategory,
            $correctSenderType,
            70, // 学習ルールの初期信頼度
            50  // 中程度の優先度
        ]);
    }
}