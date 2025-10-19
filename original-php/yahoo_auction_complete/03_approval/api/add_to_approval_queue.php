<?php
/**
 * 承認システム - 商品追加API
 * 編集システムから承認キューへ商品を追加
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'DatabaseConnection.php';
require_once 'UnifiedLogger.php';

class ApprovalQueueManager {
    private $pdo;
    private $logger;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
        $this->logger = getLogger('approval_queue');
    }
    
    /**
     * 承認キューに商品を追加
     */
    public function addToApprovalQueue($data) {
        try {
            $this->pdo->beginTransaction();
            
            // 必須フィールド検証
            $requiredFields = ['product_id', 'item_id', 'title', 'marketplace'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    throw new Exception("必須フィールドが不足しています: {$field}");
                }
            }
            
            // 既存チェック
            $existingCheck = $this->pdo->prepare("
                SELECT id FROM approval_queue 
                WHERE product_id = ? AND status = 'pending'
            ");
            $existingCheck->execute([$data['product_id']]);
            
            if ($existingCheck->fetch()) {
                throw new Exception('この商品は既に承認キューに存在します');
            }
            
            // AI信頼度スコア計算
            $aiScore = $this->calculateAIConfidenceScore($data);
            
            // 期限設定（デフォルト: 24時間後）
            $deadline = date('Y-m-d H:i:s', strtotime('+24 hours'));
            
            // 承認キューに挿入
            $sql = "
                INSERT INTO approval_queue (
                    product_id,
                    item_id,
                    title,
                    price_jpy,
                    marketplace,
                    source,
                    listing_data,
                    tool_results,
                    all_images,
                    ai_confidence_score,
                    ai_recommendation,
                    status,
                    deadline,
                    created_at,
                    updated_at
                ) VALUES (
                    :product_id,
                    :item_id,
                    :title,
                    :price_jpy,
                    :marketplace,
                    :source,
                    :listing_data,
                    :tool_results,
                    :all_images,
                    :ai_confidence_score,
                    :ai_recommendation,
                    'pending',
                    :deadline,
                    NOW(),
                    NOW()
                )
                RETURNING id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':product_id' => $data['product_id'],
                ':item_id' => $data['item_id'],
                ':title' => $data['title'],
                ':price_jpy' => $data['price'] ?? 0,
                ':marketplace' => $data['marketplace'],
                ':source' => $data['source'] ?? 'unknown',
                ':listing_data' => json_encode($data['listing_data'] ?? []),
                ':tool_results' => json_encode($data['tool_results'] ?? []),
                ':all_images' => json_encode($data['images'] ?? []),
                ':ai_confidence_score' => $aiScore,
                ':ai_recommendation' => $this->getAIRecommendation($aiScore),
                ':deadline' => $deadline
            ]);
            
            $approvalId = $stmt->fetchColumn();
            
            // ワークフローレコード作成
            $this->createWorkflowRecord($approvalId, $data);
            
            $this->pdo->commit();
            
            $this->logger->info("商品を承認キューに追加", [
                'approval_id' => $approvalId,
                'product_id' => $data['product_id'],
                'title' => $data['title'],
                'ai_score' => $aiScore
            ]);
            
            return [
                'success' => true,
                'message' => '商品を承認キューに追加しました',
                'data' => [
                    'approval_id' => $approvalId,
                    'ai_score' => $aiScore,
                    'ai_recommendation' => $this->getAIRecommendation($aiScore),
                    'deadline' => $deadline
                ]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            
            $this->logger->logError($e, [
                'product_id' => $data['product_id'] ?? 'unknown'
            ]);
            
            return [
                'success' => false,
                'message' => 'エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 一括追加
     */
    public function addBulkToApprovalQueue($items) {
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        foreach ($items as $item) {
            $result = $this->addToApprovalQueue($item);
            
            if ($result['success']) {
                $results['success']++;
            } else {
                $results['failed']++;
                $results['errors'][] = [
                    'item_id' => $item['item_id'] ?? 'unknown',
                    'error' => $result['message']
                ];
            }
        }
        
        return [
            'success' => true,
            'message' => "追加完了: {$results['success']}件成功, {$results['failed']}件失敗",
            'data' => $results
        ];
    }
    
    /**
     * AI信頼度スコア計算
     */
    private function calculateAIConfidenceScore($data) {
        $score = 0;
        $maxScore = 100;
        
        // ツール実行結果によるスコアリング
        $toolResults = $data['tool_results'] ?? [];
        
        // カテゴリ判定スコア (30点)
        if (!empty($toolResults['category'])) {
            $categoryConfidence = $toolResults['category']['confidence'] ?? 0;
            $score += ($categoryConfidence / 100) * 30;
        }
        
        // 利益計算スコア (25点)
        if (!empty($toolResults['profit'])) {
            $profit = $toolResults['profit']['profitJPY'] ?? 0;
            if ($profit > 1000) {
                $score += 25;
            } elseif ($profit > 500) {
                $score += 15;
            } elseif ($profit > 0) {
                $score += 10;
            }
        }
        
        // フィルター判定スコア (20点)
        if (!empty($toolResults['filter'])) {
            if ($toolResults['filter']['passed']) {
                $score += 20;
            }
        }
        
        // 競合分析スコア (15点)
        if (!empty($toolResults['sellermirror'])) {
            $competitorCount = $toolResults['sellermirror']['competitor_count'] ?? 999;
            if ($competitorCount < 10) {
                $score += 15;
            } elseif ($competitorCount < 20) {
                $score += 10;
            } elseif ($competitorCount < 30) {
                $score += 5;
            }
        }
        
        // データ完全性スコア (10点)
        $hasTitle = !empty($data['title']);
        $hasPrice = !empty($data['price']);
        $hasImages = !empty($data['images']) && count($data['images']) > 0;
        $hasDescription = !empty($data['listing_data']['description']);
        
        $completeness = ($hasTitle ? 3 : 0) + 
                       ($hasPrice ? 3 : 0) + 
                       ($hasImages ? 2 : 0) + 
                       ($hasDescription ? 2 : 0);
        
        $score += $completeness;
        
        return min($maxScore, round($score));
    }
    
    /**
     * AI推奨判定
     */
    private function getAIRecommendation($score) {
        if ($score >= 80) {
            return 'approved';
        } elseif ($score >= 50) {
            return 'review';
        } else {
            return 'rejected';
        }
    }
    
    /**
     * ワークフローレコード作成
     */
    private function createWorkflowRecord($approvalId, $data) {
        $sql = "
            INSERT INTO workflows (
                yahoo_auction_id,
                product_id,
                status,
                current_step,
                next_step,
                priority,
                data,
                created_at,
                updated_at
            ) VALUES (
                :yahoo_auction_id,
                :product_id,
                'pending_approval',
                3,
                3,
                :priority,
                :data,
                NOW(),
                NOW()
            )
        ";
        
        $priority = $this->calculatePriority($data);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            ':yahoo_auction_id' => $data['item_id'],
            ':product_id' => $data['product_id'],
            ':priority' => $priority,
            ':data' => json_encode([
                'approval_id' => $approvalId,
                'marketplace' => $data['marketplace'],
                'source' => $data['source'] ?? 'unknown'
            ])
        ]);
    }
    
    /**
     * 優先度計算
     */
    private function calculatePriority($data) {
        $priority = 0;
        
        // 高利益商品は優先度UP
        $profit = $data['tool_results']['profit']['profitJPY'] ?? 0;
        if ($profit > 5000) {
            $priority += 100;
        } elseif ($profit > 2000) {
            $priority += 50;
        }
        
        // AI推奨度が高いものは優先度UP
        $aiScore = $data['tool_results']['category']['confidence'] ?? 0;
        if ($aiScore > 90) {
            $priority += 50;
        }
        
        return $priority;
    }
}

// リクエスト処理
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $manager = new ApprovalQueueManager();
    
    try {
        switch ($action) {
            case 'add_to_approval_queue':
                $result = $manager->addToApprovalQueue($input);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
                break;
                
            case 'add_bulk_to_approval_queue':
                $items = $input['items'] ?? [];
                $result = $manager->addBulkToApprovalQueue($items);
                echo json_encode($result, JSON_UNESCAPED_UNICODE);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => '不明なアクション: ' . $action
                ], JSON_UNESCAPED_UNICODE);
        }
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'APIエラー: ' . $e->getMessage()
        ], JSON_UNESCAPED_UNICODE);
    }
    
    exit;
}
?>
