<?php
/**
 * 一括操作API
 * 商品の一括承認・一括削除・一括モール設定等の処理
 * 
 * エンドポイント: api/bulk_operations.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

require_once '../../shared/core/includes.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
function validateCSRFToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// エラーレスポンス
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'updated_count' => 0,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// 成功レスポンス
function sendSuccess($updatedCount = 0, $message = 'Success', $details = []) {
    echo json_encode([
        'success' => true,
        'message' => $message,
        'updated_count' => $updatedCount,
        'details' => $details,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit;
}

// リクエスト検証
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('POSTメソッドのみ許可されています', 405);
}

if (!validateCSRFToken()) {
    sendError('CSRFトークンが無効です', 403);
}

$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendError('不正なJSONフォーマットです');
}

$action = $input['action'] ?? '';
$productIds = $input['product_ids'] ?? [];

// 基本検証
if (empty($productIds) || !is_array($productIds)) {
    sendError('商品IDが指定されていません');
}

if (count($productIds) > 1000) {
    sendError('一度に処理できる商品数は1000件までです');
}

// 商品ID検証（数値かチェック）
$validatedIds = array_filter($productIds, function($id) {
    return is_numeric($id) && $id > 0;
});

if (count($validatedIds) !== count($productIds)) {
    sendError('無効な商品IDが含まれています');
}

// アクション別処理
try {
    $bulkProcessor = new BulkOperationsProcessor($pdo);
    
    switch ($action) {
        case 'bulk_approve':
            $result = $bulkProcessor->bulkApprove($validatedIds);
            break;
            
        case 'bulk_reject':
            $result = $bulkProcessor->bulkReject($validatedIds);
            break;
            
        case 'bulk_set_mall':
            $mallName = $input['mall_name'] ?? '';
            $result = $bulkProcessor->bulkSetMall($validatedIds, $mallName);
            break;
            
        case 'bulk_reset_filters':
            $result = $bulkProcessor->bulkResetFilters($validatedIds);
            break;
            
        case 'bulk_delete':
            $result = $bulkProcessor->bulkDelete($validatedIds);
            break;
            
        default:
            sendError('不正なアクションです');
    }
    
    sendSuccess($result['updated_count'], $result['message'], $result['details']);
    
} catch (Exception $e) {
    error_log('Bulk Operations Error: ' . $e->getMessage());
    sendError('システムエラーが発生しました: ' . $e->getMessage(), 500);
}

/**
 * 一括操作処理クラス
 */
class BulkOperationsProcessor {
    private $pdo;
    
    public function __construct($database) {
        $this->pdo = $database;
    }
    
    /**
     * 一括承認処理
     * 第1段階フィルターを通過している商品のみを強制承認
     */
    public function bulkApprove($productIds) {
        try {
            $this->pdo->beginTransaction();
            
            // 対象商品の現在の状態を確認
            $eligibleProducts = $this->getEligibleProducts($productIds, [
                'export_filter_status' => true,
                'patent_filter_status' => true
            ]);
            
            if (empty($eligibleProducts)) {
                throw new Exception('承認可能な商品がありません。第1段階フィルターを通過した商品のみ承認できます。');
            }
            
            $eligibleIds = array_column($eligibleProducts, 'id');
            
            // モール選択がされていない商品にデフォルトモール設定
            $this->setDefaultMallForUnassigned($eligibleIds);
            
            // 最終判定をOKに更新
            $stmt = $this->pdo->prepare("
                UPDATE yahoo_scraped_products 
                SET final_judgment = 'OK',
                    mall_filter_status = COALESCE(mall_filter_status, TRUE),
                    filter_updated_at = NOW()
                WHERE id IN (" . implode(',', array_fill(0, count($eligibleIds), '?')) . ")
                    AND export_filter_status = TRUE 
                    AND patent_filter_status = TRUE
            ");
            
            $stmt->execute($eligibleIds);
            $updatedCount = $stmt->rowCount();
            
            // 操作ログ記録
            $this->logBulkOperation('bulk_approve', $eligibleIds, [
                'requested_count' => count($productIds),
                'processed_count' => $updatedCount
            ]);
            
            $this->pdo->commit();
            
            return [
                'updated_count' => $updatedCount,
                'message' => "{$updatedCount}件の商品を承認しました",
                'details' => [
                    'requested' => count($productIds),
                    'eligible' => count($eligibleIds),
                    'processed' => $updatedCount
                ]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 一括拒否処理
     */
    public function bulkReject($productIds) {
        try {
            $this->pdo->beginTransaction();
            
            $placeholders = implode(',', array_fill(0, count($productIds), '?'));
            $stmt = $this->pdo->prepare("
                UPDATE yahoo_scraped_products 
                SET final_judgment = 'NG',
                    filter_updated_at = NOW()
                WHERE id IN ($placeholders)
                    AND final_judgment != 'NG'
            ");
            
            $stmt->execute($productIds);
            $updatedCount = $stmt->rowCount();
            
            $this->logBulkOperation('bulk_reject', $productIds, [
                'updated_count' => $updatedCount
            ]);
            
            $this->pdo->commit();
            
            return [
                'updated_count' => $updatedCount,
                'message' => "{$updatedCount}件の商品を拒否しました",
                'details' => ['processed' => $updatedCount]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 一括モール設定
     */
    public function bulkSetMall($productIds, $mallName) {
        $allowedMalls = ['ebay', 'amazon', 'etsy', 'mercari'];
        if (!in_array($mallName, $allowedMalls)) {
            throw new InvalidArgumentException('無効なモール名です');
        }
        
        try {
            $this->pdo->beginTransaction();
            
            // 第1段階フィルターを通過している商品のみ処理
            $eligibleProducts = $this->getEligibleProducts($productIds, [
                'export_filter_status' => true,
                'patent_filter_status' => true
            ]);
            
            if (empty($eligibleProducts)) {
                throw new Exception('モール設定可能な商品がありません');
            }
            
            $processedCount = 0;
            
            foreach ($eligibleProducts as $product) {
                // モール専用フィルター実行
                $mallKeywords = $this->getMallKeywords($mallName);
                $targetText = $product['title'] . ' ' . $product['description'];
                $detectedKeywords = $this->performKeywordCheck($targetText, $mallKeywords);
                
                $mallFilterStatus = empty($detectedKeywords);
                $detectedKeywordsText = implode(', ', $detectedKeywords);
                
                // データ更新
                $stmt = $this->pdo->prepare("
                    UPDATE yahoo_scraped_products 
                    SET selected_mall = ?,
                        mall_filter_status = ?,
                        mall_detected_keywords = ?,
                        final_judgment = CASE 
                            WHEN export_filter_status = TRUE AND patent_filter_status = TRUE AND ? = TRUE THEN 'OK'
                            ELSE 'NG'
                        END,
                        filter_updated_at = NOW()
                    WHERE id = ?
                ");
                
                $stmt->execute([
                    $mallName, 
                    $mallFilterStatus, 
                    $detectedKeywordsText, 
                    $mallFilterStatus,
                    $product['id']
                ]);
                
                if ($stmt->rowCount() > 0) {
                    $processedCount++;
                }
            }
            
            $this->logBulkOperation('bulk_set_mall', array_column($eligibleProducts, 'id'), [
                'mall_name' => $mallName,
                'processed_count' => $processedCount
            ]);
            
            $this->pdo->commit();
            
            return [
                'updated_count' => $processedCount,
                'message' => "{$processedCount}件の商品に{$mallName}モールを設定しました",
                'details' => [
                    'mall_name' => $mallName,
                    'processed' => $processedCount
                ]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 一括フィルターリセット
     */
    public function bulkResetFilters($productIds) {
        try {
            $this->pdo->beginTransaction();
            
            $placeholders = implode(',', array_fill(0, count($productIds), '?'));
            $stmt = $this->pdo->prepare("
                UPDATE yahoo_scraped_products 
                SET selected_mall = NULL,
                    mall_filter_status = NULL,
                    mall_detected_keywords = NULL,
                    final_judgment = CASE 
                        WHEN export_filter_status = TRUE AND patent_filter_status = TRUE THEN 'PENDING'
                        ELSE 'NG'
                    END,
                    filter_updated_at = NOW()
                WHERE id IN ($placeholders)
            ");
            
            $stmt->execute($productIds);
            $updatedCount = $stmt->rowCount();
            
            $this->logBulkOperation('bulk_reset_filters', $productIds, [
                'updated_count' => $updatedCount
            ]);
            
            $this->pdo->commit();
            
            return [
                'updated_count' => $updatedCount,
                'message' => "{$updatedCount}件の商品のフィルターをリセットしました",
                'details' => ['processed' => $updatedCount]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 一括削除
     */
    public function bulkDelete($productIds) {
        try {
            $this->pdo->beginTransaction();
            
            // 出品済み商品の削除を防ぐ（もし listing_status カラムがある場合）
            $placeholders = implode(',', array_fill(0, count($productIds), '?'));
            $stmt = $this->pdo->prepare("
                DELETE FROM yahoo_scraped_products 
                WHERE id IN ($placeholders)
                    AND (listing_status IS NULL OR listing_status != 'LISTED')
            ");
            
            $stmt->execute($productIds);
            $deletedCount = $stmt->rowCount();
            
            $this->logBulkOperation('bulk_delete', $productIds, [
                'deleted_count' => $deletedCount
            ]);
            
            $this->pdo->commit();
            
            return [
                'updated_count' => $deletedCount,
                'message' => "{$deletedCount}件の商品を削除しました",
                'details' => ['deleted' => $deletedCount]
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            throw $e;
        }
    }
    
    /**
     * 条件に合致する商品を取得
     */
    private function getEligibleProducts($productIds, $conditions = []) {
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        
        $whereConditions = ["id IN ($placeholders)"];
        $params = $productIds;
        
        foreach ($conditions as $column => $value) {
            $whereConditions[] = "$column = ?";
            $params[] = $value;
        }
        
        $sql = "SELECT id, title, description FROM yahoo_scraped_products WHERE " . 
               implode(' AND ', $whereConditions);
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 未割り当て商品にデフォルトモールを設定
     */
    private function setDefaultMallForUnassigned($productIds) {
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $stmt = $this->pdo->prepare("
            UPDATE yahoo_scraped_products 
            SET selected_mall = 'ebay',
                mall_filter_status = TRUE
            WHERE id IN ($placeholders)
                AND selected_mall IS NULL
        ");
        
        $stmt->execute($productIds);
    }
    
    /**
     * モール専用キーワード取得
     */
    private function getMallKeywords($mallName) {
        $stmt = $this->pdo->prepare("
            SELECT keyword 
            FROM filter_keywords 
            WHERE type = 'MALL' AND mall_name = ? AND is_active = TRUE
        ");
        $stmt->execute([$mallName]);
        
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    /**
     * キーワードチェック実行
     */
    private function performKeywordCheck($text, $keywords) {
        $detectedKeywords = [];
        $textLower = mb_strtolower($text, 'UTF-8');
        
        foreach ($keywords as $keyword) {
            $keywordLower = mb_strtolower($keyword, 'UTF-8');
            if (mb_strpos($textLower, $keywordLower) !== false) {
                $detectedKeywords[] = $keyword;
            }
        }
        
        return $detectedKeywords;
    }
    
    /**
     * 一括操作ログ記録
     */
    private function logBulkOperation($operation, $productIds, $details = []) {
        try {
            $logData = [
                'operation' => $operation,
                'product_ids' => $productIds,
                'product_count' => count($productIds),
                'details' => $details,
                'user_session' => session_id(),
                'timestamp' => date('Y-m-d H:i:s'),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? ''
            ];
            
            // ログファイルに記録（本格運用では専用のログテーブルを使用）
            $logFile = __DIR__ . '/../logs/bulk_operations.log';
            $logDir = dirname($logFile);
            
            if (!file_exists($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            file_put_contents($logFile, 
                json_encode($logData, JSON_UNESCAPED_UNICODE) . "\n", 
                FILE_APPEND | LOCK_EX
            );
            
        } catch (Exception $e) {
            // ログ記録エラーは処理を止めない
            error_log('Bulk operation logging error: ' . $e->getMessage());
        }
    }
}