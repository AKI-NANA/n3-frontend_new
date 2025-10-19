<?php
/**
 * 統合カテゴリー判定API - 完全版（セルミラー + Item Specifics統合）
 * 既存のunified_category_api.phpを拡張・最適化
 * 
 * 新規エンドポイント:
 * - analyze_single_product: 単一商品の完全分析
 * - analyze_batch: バッチ分析
 * - generate_item_specifics: Item Specifics生成
 * - sell_mirror_analysis: セルミラー分析
 * - batch_analysis: 一括処理（カテゴリー + セルミラー + スコアリング）
 * - get_product_details: 商品詳細取得
 * - direct_listing: そのまま出品準備
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // 必須クラス読み込み
    require_once '../classes/UnifiedCategoryDetector.php';
    require_once '../classes/SellMirrorAnalyzer.php';
    require_once '../classes/ItemSpecificsManager.php';
    require_once '../classes/EbayFindingApiConnector.php';
    require_once '../classes/EbayTradingApiConnector.php';
    
    // データベース接続（統一設定使用）
    function getDatabaseConnection() {
        try {
            $config = require '../config/database.php';
            $dsn = "pgsql:host={$config['host']};dbname={$config['dbname']}";
            
            try {
                $pdo = new PDO($dsn, $config['user'], $config['password'], $config['options']);
            } catch (PDOException $e) {
                // フォールバック接続
                $pdo = new PDO($dsn, $config['fallback']['user'], $config['fallback']['password'], $config['options']);
            }
            
            return $pdo;
            
        } catch (PDOException $e) {
            throw new Exception('データベース接続失敗: ' . $e->getMessage());
        }
    }
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    $pdo = getDatabaseConnection();
    $categoryDetector = new UnifiedCategoryDetector($pdo, true);
    
    // eBay API初期化（必要に応じて）
    $ebayFindingApi = null;
    $ebayTradingApi = null;
    $sellMirrorAnalyzer = null;
    $itemSpecificsManager = null;
    
    if (in_array($action, ['analyze_single_product', 'analyze_batch', 'sell_mirror_analysis', 'generate_item_specifics', 'batch_analysis'])) {
        $ebayFindingApi = new EbayFindingApiConnector($pdo, true);
        $ebayTradingApi = new EbayTradingApiConnector($pdo, true);
        $sellMirrorAnalyzer = new SellMirrorAnalyzer($pdo, $ebayFindingApi, true);
        $itemSpecificsManager = new ItemSpecificsManager($pdo, $ebayTradingApi, true);
    }
    
    switch ($action) {
        case 'analyze_single_product':
            // 単一商品の完全分析（カテゴリー + セルミラー + Item Specifics + スコアリング）
            $productId = intval($input['product_id'] ?? 0);
            
            if ($productId <= 0) {
                throw new Exception('有効な商品IDが必要です');
            }
            
            // 商品データ取得
            $productData = getProductData($pdo, $productId);
            if (!$productData) {
                throw new Exception('商品が見つかりません');
            }
            
            $startTime = microtime(true);
            $analysisResults = [];
            
            // 1. カテゴリー判定（必要に応じて）
            if (empty($productData['ebay_category_id'])) {
                $categoryResult = $categoryDetector->detectCategoryUnified($productData);
                $analysisResults['category_analysis'] = $categoryResult;
                
                // 結果をデータベースに反映
                updateProductCategory($pdo, $productId, $categoryResult);
                $productData['ebay_category_id'] = $categoryResult['category_id'];
                $productData['ebay_category_name'] = $categoryResult['category_name'];
            }
            
            // 2. セルミラー分析
            $mirrorResult = $sellMirrorAnalyzer->analyzeSellMirror($productData);
            $analysisResults['sell_mirror_analysis'] = $mirrorResult;
            
            // 3. Item Specifics生成
            if (!empty($productData['ebay_category_id'])) {
                $itemSpecifics = $itemSpecificsManager->generateCompleteItemSpecifics(
                    $productData['ebay_category_id'], 
                    $productData
                );
                $analysisResults['item_specifics'] = $itemSpecifics;
                
                // Item Specificsをデータベースに保存
                updateProductItemSpecifics($pdo, $productId, $itemSpecifics);
            }
            
            // 4. スコア・ランク更新
            updateProductScore($pdo, $productId);
            
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            $response = [
                'success' => true,
                'product_id' => $productId,
                'analysis_results' => $analysisResults,
                'processing_time_ms' => $processingTime,
                'message' => '完全分析が完了しました'
            ];
            break;
            
        case 'analyze_batch':
            // バッチ分析
            $productIds = $input['product_ids'] ?? [];
            $analysisType = $input['analysis_type'] ?? 'complete';
            $maxApiCalls = intval($input['max_api_calls'] ?? 100);
            
            if (empty($productIds)) {
                throw new Exception('分析対象の商品IDが必要です');
            }
            
            $batchResults = processBatchAnalysis($pdo, $productIds, $analysisType, $maxApiCalls, [
                'categoryDetector' => $categoryDetector,
                'sellMirrorAnalyzer' => $sellMirrorAnalyzer,
                'itemSpecificsManager' => $itemSpecificsManager
            ]);
            
            $response = [
                'success' => true,
                'batch_results' => $batchResults
            ];
            break;
            
        case 'batch_analysis':
            // 一括分析（未処理商品に対して）
            $analysisType = $input['analysis_type'] ?? 'complete';
            $limit = min(100, intval($input['limit'] ?? 50));
            
            $startTime = microtime(true);
            $processedCount = 0;
            $successCount = 0;
            $apiCallsUsed = 0;
            
            // 未処理商品取得
            $unprocessedProducts = getUnprocessedProducts($pdo, $analysisType, $limit);
            
            foreach ($unprocessedProducts as $product) {
                try {
                    $productAnalysisResults = [];
                    
                    // 分析タイプに応じた処理
                    switch ($analysisType) {
                        case 'category':
                            if (empty($product['ebay_category_id'])) {
                                $result = $categoryDetector->detectCategoryUnified($product);
                                updateProductCategory($pdo, $product['id'], $result);
                                $apiCallsUsed += ($result['api_calls_used'] ?? 1);
                            }
                            break;
                            
                        case 'mirror':
                            $result = $sellMirrorAnalyzer->analyzeSellMirror($product);
                            $apiCallsUsed += ($result['api_calls_used'] ?? 2);
                            break;
                            
                        case 'scoring':
                            updateProductScore($pdo, $product['id']);
                            break;
                            
                        case 'complete':
                        default:
                            // 完全分析
                            if (empty($product['ebay_category_id'])) {
                                $categoryResult = $categoryDetector->detectCategoryUnified($product);
                                updateProductCategory($pdo, $product['id'], $categoryResult);
                                $product['ebay_category_id'] = $categoryResult['category_id'];
                            }
                            
                            $mirrorResult = $sellMirrorAnalyzer->analyzeSellMirror($product);
                            
                            if (!empty($product['ebay_category_id'])) {
                                $itemSpecifics = $itemSpecificsManager->generateCompleteItemSpecifics(
                                    $product['ebay_category_id'], 
                                    $product
                                );
                                updateProductItemSpecifics($pdo, $product['id'], $itemSpecifics);
                            }
                            
                            updateProductScore($pdo, $product['id']);
                            $apiCallsUsed += 3; // 平均的なAPI使用数
                            break;
                    }
                    
                    $successCount++;
                    
                } catch (Exception $e) {
                    error_log("Batch analysis error for product {$product['id']}: " . $e->getMessage());
                }
                
                $processedCount++;
                
                // API制限・時間制限考慮
                if ($apiCallsUsed >= 80) { // API制限の80%で停止
                    break;
                }
                
                usleep(500000); // 0.5秒待機
            }
            
            $processingTime = round((microtime(true) - $startTime) * 1000);
            
            $response = [
                'success' => true,
                'processed_count' => $processedCount,
                'success_count' => $successCount,
                'processing_time_ms' => $processingTime,
                'api_calls_used' => $apiCallsUsed,
                'analysis_type' => $analysisType,
                'message' => "{$analysisType}一括分析が完了しました"
            ];
            break;
            
        case 'generate_item_specifics':
            // Item Specifics生成のみ
            $categoryId = $input['category_id'] ?? '';
            $productData = $input['product_data'] ?? [];
            $customValues = $input['custom_values'] ?? [];
            
            if (empty($categoryId)) {
                throw new Exception('カテゴリーIDが必要です');
            }
            
            $itemSpecifics = $itemSpecificsManager->generateCompleteItemSpecifics(
                $categoryId, 
                $productData, 
                $customValues
            );
            
            $response = [
                'success' => true,
                'category_id' => $categoryId,
                'item_specifics' => $itemSpecifics,
                'format' => 'single_cell_optimized'
            ];
            break;
            
        case 'sell_mirror_analysis':
            // セルミラー分析のみ
            $productData = $input['product_data'] ?? [];
            
            if (empty($productData['title'])) {
                throw new Exception('商品データが必要です');
            }
            
            $mirrorResult = $sellMirrorAnalyzer->analyzeSellMirror($productData);
            
            $response = [
                'success' => true,
                'sell_mirror_result' => $mirrorResult
            ];
            break;
            
        case 'get_product_details':
            // 商品詳細取得（統合表示用）
            $productId = intval($input['product_id'] ?? 0);
            
            if ($productId <= 0) {
                throw new Exception('有効な商品IDが必要です');
            }
            
            $productDetails = getCompleteProductDetails($pdo, $productId);
            
            if (!$productDetails) {
                throw new Exception('商品が見つかりません');
            }
            
            $response = [
                'success' => true,
                'product' => $productDetails
            ];
            break;
            
        case 'direct_listing':
            // そのまま出品準備（セルミラー高信頼度商品用）
            $productId = intval($input['product_id'] ?? 0);
            $listingType = $input['listing_type'] ?? 'mirror';
            
            if ($productId <= 0) {
                throw new Exception('有効な商品IDが必要です');
            }
            
            $listingPrep = prepareDirectListing($pdo, $productId, $listingType);
            
            $response = [
                'success' => true,
                'product_id' => $productId,
                'listing_preparation' => $listingPrep,
                'ready_for_listing' => $listingPrep['can_list_directly'],
                'next_step' => $listingPrep['can_list_directly'] ? 
                    '08_listingシステムで出品実行' : '07_editingシステムで編集後出品'
            ];
            break;
            
        case 'get_quick_stats':
            // クイック統計（バックグラウンド更新用）
            $quickStats = getQuickSystemStats($pdo);
            
            $response = [
                'success' => true,
                'stats' => $quickStats
            ];
            break;
            
        case 'update_store_quota':
            // 出品枠更新
            $storeLevel = $input['store_level'] ?? 'basic';
            $quotaType = $input['quota_type'] ?? 'all_categories';
            $newCount = intval($input['new_count'] ?? 0);
            
            updateStoreQuota($pdo, $storeLevel, $quotaType, $newCount);
            
            $response = [
                'success' => true,
                'message' => '出品枠が更新されました'
            ];
            break;
            
        // 既存エンドポイントも継承
        case 'detect_single':
            // 既存の単一判定（互換性維持）
            $title = $input['title'] ?? '';
            $priceJpy = floatval($input['price_jpy'] ?? $input['price'] ?? 0);
            $description = $input['description'] ?? '';
            
            if (empty($title)) {
                throw new Exception('商品タイトルが必要です');
            }
            
            $productData = [
                'title' => $title,
                'price_jpy' => $priceJpy,
                'description' => $description
            ];
            
            $result = $categoryDetector->detectCategoryUnified($productData);
            
            $response = [
                'success' => true,
                'result' => $result
            ];
            break;
            
        case 'process_yahoo':
            // Yahoo商品一括処理（既存）
            $limit = min(100, intval($input['limit'] ?? 50));
            $result = $categoryDetector->processYahooProductsBatch($limit);
            
            $response = [
                'success' => $result['success'],
                'yahoo_batch_result' => $result
            ];
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'error_code' => $e->getCode(),
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action ?? 'unknown'
    ];
    
    error_log('統合カテゴリーAPI エラー: ' . $e->getMessage() . ' (Action: ' . ($action ?? 'unknown') . ')');
    
    if (strpos($e->getMessage(), '見つかりません') !== false) {
        http_response_code(404);
    } elseif (strpos($e->getMessage(), '必要です') !== false) {
        http_response_code(400);
    } else {
        http_response_code(500);
    }
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// ===============================
// ヘルパー関数
// ===============================

/**
 * 商品データ取得
 */
function getProductData($pdo, $productId) {
    $sql = "SELECT ysp.*, 
                   ecf.final_value_fee_percent, ecf.is_select_category,
                   sma.mirror_confidence, sma.risk_level, sma.sold_count_90days, sma.average_price
            FROM yahoo_scraped_products ysp
            LEFT JOIN ebay_category_fees ecf ON ysp.ebay_category_id = ecf.category_id
            LEFT JOIN sell_mirror_analysis sma ON ysp.id = sma.yahoo_product_id AND sma.is_valid = TRUE
            WHERE ysp.id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$productId]);
    
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * 商品カテゴリー更新
 */
function updateProductCategory($pdo, $productId, $categoryResult) {
    $sql = "UPDATE yahoo_scraped_products 
            SET ebay_category_id = ?,
                ebay_category_name = ?,
                category_confidence = ?,
                ai_confidence = ?,
                detection_method = ?,
                category_detected_at = NOW()
            WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $categoryResult['category_id'],
        $categoryResult['category_name'] ?? 'Unknown',
        $categoryResult['confidence'],
        $categoryResult['ai_confidence'] ?? $categoryResult['confidence'],
        $categoryResult['final_method'] ?? $categoryResult['detection_method'],
        $productId
    ]);
}

/**
 * Item Specifics更新
 */
function updateProductItemSpecifics($pdo, $productId, $itemSpecifics) {
    $sql = "UPDATE yahoo_scraped_products 
            SET complete_item_specifics = ?
            WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$itemSpecifics, $productId]);
}

/**
 * 商品スコア更新
 */
function updateProductScore($pdo, $productId) {
    $sql = "UPDATE yahoo_scraped_products 
            SET listing_score = calculate_listing_score(id),
                listing_rank = calculate_listing_rank(calculate_listing_score(id)),
                updated_at = NOW()
            WHERE id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$productId]);
}

/**
 * 未処理商品取得
 */
function getUnprocessedProducts($pdo, $analysisType, $limit) {
    $whereCondition = '1=1';
    
    switch ($analysisType) {
        case 'category':
            $whereCondition = 'ebay_category_id IS NULL';
            break;
        case 'mirror':
            $whereCondition = 'id NOT IN (SELECT yahoo_product_id FROM sell_mirror_analysis WHERE is_valid = TRUE)';
            break;
        case 'scoring':
            $whereCondition = 'listing_score IS NULL OR listing_score = 0';
            break;
        case 'complete':
        default:
            $whereCondition = 'ebay_category_id IS NULL OR complete_item_specifics IS NULL OR listing_score IS NULL';
            break;
    }
    
    $sql = "SELECT * FROM yahoo_scraped_products 
            WHERE {$whereCondition}
            ORDER BY created_at DESC 
            LIMIT ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$limit]);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * 完全商品詳細取得
 */
function getCompleteProductDetails($pdo, $productId) {
    $sql = "SELECT ysp.*,
                   ecf.final_value_fee_percent, ecf.is_select_category, ecf.category_path,
                   sma.mirror_confidence, sma.risk_level, sma.sold_count_90days, 
                   sma.average_price, sma.min_price, sma.max_price, sma.competitor_count,
                   sma.mirror_templates
            FROM yahoo_scraped_products ysp
            LEFT JOIN ebay_category_fees ecf ON ysp.ebay_category_id = ecf.category_id
            LEFT JOIN sell_mirror_analysis sma ON ysp.id = sma.yahoo_product_id AND sma.is_valid = TRUE
            WHERE ysp.id = ?";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$productId]);
    
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * 直接出品準備
 */
function prepareDirectListing($pdo, $productId, $listingType) {
    $product = getCompleteProductDetails($pdo, $productId);
    
    if (!$product) {
        throw new Exception('商品が見つかりません');
    }
    
    $canListDirectly = false;
    $requirements = [];
    $warnings = [];
    
    // 直接出品可能性チェック
    if ($listingType === 'mirror') {
        $canListDirectly = (
            !empty($product['ebay_category_id']) &&
            !empty($product['complete_item_specifics']) &&
            floatval($product['mirror_confidence'] ?? 0) >= 95 &&
            ($product['risk_level'] ?? 'HIGH') === 'LOW'
        );
        
        if (!$canListDirectly) {
            if (empty($product['ebay_category_id'])) {
                $requirements[] = 'カテゴリー判定が必要';
            }
            if (empty($product['complete_item_specifics'])) {
                $requirements[] = 'Item Specifics生成が必要';
            }
            if (floatval($product['mirror_confidence'] ?? 0) < 95) {
                $warnings[] = 'セルミラー信頼度が低い（' . ($product['mirror_confidence'] ?? 0) . '%）';
            }
            if (($product['risk_level'] ?? 'HIGH') !== 'LOW') {
                $warnings[] = 'リスクレベルが高い（' . ($product['risk_level'] ?? 'UNKNOWN') . '）';
            }
        }
    }
    
    // 出品枠チェック
    $quotaCheck = json_decode($pdo->query("SELECT check_listing_quota('basic', '{$product['ebay_category_id']}')::text")->fetchColumn(), true);
    
    if (!$quotaCheck['available']) {
        $canListDirectly = false;
        $warnings[] = '出品枠が不足（' . $quotaCheck['quota_type'] . '）';
    }
    
    return [
        'can_list_directly' => $canListDirectly,
        'listing_type' => $listingType,
        'requirements_met' => empty($requirements),
        'requirements' => $requirements,
        'warnings' => $warnings,
        'quota_status' => $quotaCheck,
        'estimated_fees' => calculateEstimatedFees($product),
        'listing_data' => [
            'title' => $product['title'],
            'category_id' => $product['ebay_category_id'],
            'item_specifics' => $product['complete_item_specifics'],
            'suggested_price' => $product['average_price'] ?? 0,
            'mirror_templates' => $product['mirror_templates'] ? json_decode($product['mirror_templates'], true) : []
        ]
    ];
}

/**
 * 概算手数料計算
 */
function calculateEstimatedFees($product) {
    $price = floatval($product['average_price'] ?? ($product['price_usd'] ?? 100));
    $feeRate = floatval($product['final_value_fee_percent'] ?? 13.25) / 100;
    
    return [
        'final_value_fee' => round($price * $feeRate, 2),
        'paypal_fee' => round(($price * 0.029) + 0.30, 2),
        'total_fees' => round(($price * $feeRate) + ($price * 0.029) + 0.30, 2)
    ];
}

/**
 * 出品枠更新
 */
function updateStoreQuota($pdo, $storeLevel, $quotaType, $newCount) {
    $sql = "UPDATE store_listing_limits 
            SET current_{$quotaType} = ?,
                last_updated = NOW()
            WHERE plan_type = ? AND month_year = TO_CHAR(NOW(), 'YYYY-MM')";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$newCount, $storeLevel]);
}

/**
 * クイック統計取得
 */
function getQuickSystemStats($pdo) {
    $sql = "SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN ebay_category_id IS NOT NULL THEN 1 END) as categorized_products,
                COUNT(CASE WHEN listing_rank = 'S' THEN 1 END) as s_rank_products,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_products,
                AVG(listing_score) as avg_listing_score,
                AVG(CASE WHEN mirror_confidence IS NOT NULL THEN mirror_confidence END) as avg_mirror_confidence
            FROM yahoo_scraped_products ysp
            LEFT JOIN sell_mirror_analysis sma ON ysp.id = sma.yahoo_product_id AND sma.is_valid = TRUE
            WHERE ysp.created_at >= NOW() - INTERVAL '7 days'";
    
    $stmt = $pdo->query($sql);
    
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * バッチ分析処理
 */
function processBatchAnalysis($pdo, $productIds, $analysisType, $maxApiCalls, $analyzers) {
    $results = [];
    $apiCallsUsed = 0;
    $startTime = microtime(true);
    
    foreach ($productIds as $productId) {
        if ($apiCallsUsed >= $maxApiCalls) break;
        
        try {
            $product = getProductData($pdo, $productId);
            if (!$product) {
                $results[] = [
                    'product_id' => $productId,
                    'success' => false,
                    'error' => '商品が見つかりません'
                ];
                continue;
            }
            
            $analysisResult = [];
            
            switch ($analysisType) {
                case 'category':
                    if (empty($product['ebay_category_id'])) {
                        $result = $analyzers['categoryDetector']->detectCategoryUnified($product);
                        updateProductCategory($pdo, $productId, $result);
                        $analysisResult = $result;
                        $apiCallsUsed += 2;
                    }
                    break;
                    
                case 'mirror':
                    $result = $analyzers['sellMirrorAnalyzer']->analyzeSellMirror($product);
                    $analysisResult = $result;
                    $apiCallsUsed += ($result['api_calls_used'] ?? 2);
                    break;
                    
                case 'complete':
                default:
                    // 完全分析
                    if (empty($product['ebay_category_id'])) {
                        $categoryResult = $analyzers['categoryDetector']->detectCategoryUnified($product);
                        updateProductCategory($pdo, $productId, $categoryResult);
                        $product['ebay_category_id'] = $categoryResult['category_id'];
                    }
                    
                    $mirrorResult = $analyzers['sellMirrorAnalyzer']->analyzeSellMirror($product);
                    
                    if (!empty($product['ebay_category_id'])) {
                        $itemSpecifics = $analyzers['itemSpecificsManager']->generateCompleteItemSpecifics(
                            $product['ebay_category_id'], 
                            $product
                        );
                        updateProductItemSpecifics($pdo, $productId, $itemSpecifics);
                    }
                    
                    updateProductScore($pdo, $productId);
                    
                    $analysisResult = [
                        'category' => $categoryResult ?? null,
                        'mirror' => $mirrorResult,
                        'item_specifics' => $itemSpecifics ?? null
                    ];
                    
                    $apiCallsUsed += 3;
                    break;
            }
            
            $results[] = [
                'product_id' => $productId,
                'success' => true,
                'analysis_result' => $analysisResult
            ];
            
        } catch (Exception $e) {
            $results[] = [
                'product_id' => $productId,
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        usleep(500000); // 0.5秒待機
    }
    
    return [
        'processed_count' => count($results),
        'success_count' => count(array_filter($results, function($r) { return $r['success']; })),
        'processing_time_ms' => round((microtime(true) - $startTime) * 1000),
        'api_calls_used' => $apiCallsUsed,
        'results' => $results
    ];
}
?>