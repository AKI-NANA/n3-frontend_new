<?php
/**
 * eBayカテゴリー統合判定API - 完全稼働版
 * Stage 1&2完全対応・ブートストラップ利益分析統合システム
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

// 実行開始時間記録
$startTime = microtime(true);

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 必須クラス読み込み
    require_once '../classes/CategoryDetector.php';
    require_once '../classes/ItemSpecificsGenerator.php';
    
    // リクエストパースィング
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    // システムインスタンス初期化
    $categoryDetector = new CategoryDetector($pdo, true);
    $itemSpecificsGenerator = new ItemSpecificsGenerator($pdo);
    
    // ログ記録関数
    function logApiCall($action, $productId = null, $result = null, $error = null) {
        global $pdo, $startTime;
        
        $processingTime = (microtime(true) - $startTime) * 1000; // ms
        
        try {
            $sql = "INSERT INTO api_call_logs (action, product_id, processing_time_ms, result_data, error_message, called_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $action,
                $productId,
                round($processingTime, 2),
                $result ? json_encode($result) : null,
                $error
            ]);
        } catch (Exception $e) {
            // ログ失敗時は無視
        }
    }
    
    switch ($action) {
        
        // =================================================================
        // Stage 1: 基本カテゴリー判定 (70%精度目標)
        // =================================================================
        case 'single_stage1_analysis':
            $productId = intval($input['product_id'] ?? 0);
            
            if (!$productId) {
                throw new Exception('商品IDが必要です');
            }
            
            // 商品データ取得
            $sql = "SELECT id, source_item_id, price_jpy, 
                           (scraped_yahoo_data->>'title') as title,
                           (scraped_yahoo_data->>'description') as description,
                           (scraped_yahoo_data->>'category') as yahoo_category
                    FROM yahoo_scraped_products 
                    WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                throw new Exception('商品が見つかりません: ID ' . $productId);
            }
            
            // Stage 1判定実行
            $productData = [
                'title' => $product['title'] ?? '',
                'price' => ($product['price_jpy'] ?? 0) * 0.0067, // USD概算
                'description' => $product['description'] ?? ''
            ];
            
            $categoryResult = $categoryDetector->detectCategory($productData);
            
            // Item Specifics生成
            $itemSpecifics = $itemSpecificsGenerator->generateItemSpecificsString(
                $categoryResult['category_id'],
                [],
                $productData
            );
            
            // データベース更新
            $updateSql = "UPDATE yahoo_scraped_products 
                          SET ebay_api_data = jsonb_build_object(
                              'category_id', ?,
                              'category_name', ?,
                              'confidence', ?,
                              'matched_keywords', ?,
                              'item_specifics', ?,
                              'stage', 'basic',
                              'processed_at', NOW(),
                              'fee_percent', 13.6
                          ),
                          updated_at = NOW()
                          WHERE id = ?";
            
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([
                $categoryResult['category_id'],
                $categoryResult['category_name'],
                $categoryResult['confidence'],
                json_encode($categoryResult['matched_keywords']),
                $itemSpecifics,
                $productId
            ]);
            
            $response = [
                'success' => true,
                'action' => 'single_stage1_analysis',
                'product_id' => $productId,
                'category_id' => $categoryResult['category_id'],
                'category_name' => $categoryResult['category_name'],
                'confidence' => $categoryResult['confidence'],
                'item_specifics' => $itemSpecifics,
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
                'stage' => 'basic'
            ];
            
            logApiCall($action, $productId, $response);
            break;
            
        // =================================================================
        // Stage 2: 利益込み判定 (95%精度目標)
        // =================================================================
        case 'single_stage2_analysis':
            $productId = intval($input['product_id'] ?? 0);
            
            if (!$productId) {
                throw new Exception('商品IDが必要です');
            }
            
            // 商品データ取得（Stage 1完了済み前提）
            $sql = "SELECT ysp.id, ysp.source_item_id, ysp.price_jpy,
                           (ysp.scraped_yahoo_data->>'title') as title,
                           (ysp.scraped_yahoo_data->>'description') as description,
                           (ysp.ebay_api_data->>'category_id') as category_id,
                           (ysp.ebay_api_data->>'category_name') as category_name,
                           CAST(COALESCE(ysp.ebay_api_data->>'confidence', '0') as INTEGER) as base_confidence,
                           
                           -- ブートストラップデータ結合
                           cpb.avg_profit_margin,
                           cpb.volume_level,
                           cpb.risk_level,
                           cpb.market_demand,
                           cpb.confidence_level,
                           
                           -- eBay手数料データ結合
                           ecf.final_value_fee_percent,
                           ecf.fee_group
                           
                    FROM yahoo_scraped_products ysp
                    LEFT JOIN category_profit_bootstrap cpb ON (ysp.ebay_api_data->>'category_id') = cpb.category_id
                    LEFT JOIN ebay_category_fees ecf ON (ysp.ebay_api_data->>'category_id') = ecf.category_id AND ecf.is_active = TRUE
                    WHERE ysp.id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                throw new Exception('商品が見つかりません: ID ' . $productId);
            }
            
            if (!$product['category_id']) {
                throw new Exception('Stage 1処理が必要です。基本カテゴリー判定を先に実行してください。');
            }
            
            // Stage 2信頼度計算（ブートストラップデータ反映）
            $baseConfidence = intval($product['base_confidence']);
            $stage2Confidence = $baseConfidence;
            
            // ブートストラップデータがある場合の精度向上
            if ($product['avg_profit_margin']) {
                $profitBonus = 0;
                
                // 利益率による信頼度ボーナス
                if ($product['avg_profit_margin'] >= 30) {
                    $profitBonus += 8; // 高利益率
                } elseif ($product['avg_profit_margin'] >= 20) {
                    $profitBonus += 5; // 中利益率
                } else {
                    $profitBonus += 2; // 低利益率
                }
                
                // ボリュームレベルによる調整
                if ($product['volume_level'] === 'high') {
                    $profitBonus += 5;
                } elseif ($product['volume_level'] === 'medium') {
                    $profitBonus += 3;
                }
                
                // リスクレベルによる調整
                if ($product['risk_level'] === 'low') {
                    $profitBonus += 3;
                } elseif ($product['risk_level'] === 'high') {
                    $profitBonus -= 2;
                }
                
                // 市場需要による調整
                if ($product['market_demand'] === 'high') {
                    $profitBonus += 4;
                } elseif ($product['market_demand'] === 'low') {
                    $profitBonus -= 1;
                }
                
                $stage2Confidence = min(99, $baseConfidence + $profitBonus);
            } else {
                // ブートストラップデータがない場合は基本向上
                $stage2Confidence = min(95, $baseConfidence + 5);
            }
            
            // 利益ポテンシャル計算
            $profitPotential = 20.0; // デフォルト
            if ($product['avg_profit_margin']) {
                $profitPotential = $product['avg_profit_margin'];
                
                // ボリューム・リスクによる調整
                $multiplier = 1.0;
                if ($product['volume_level'] === 'high') $multiplier *= 1.2;
                if ($product['volume_level'] === 'low') $multiplier *= 0.8;
                if ($product['risk_level'] === 'low') $multiplier *= 1.1;
                if ($product['risk_level'] === 'high') $multiplier *= 0.8;
                
                $profitPotential = round($profitPotential * $multiplier, 1);
            }
            
            // データベース更新
            $updateSql = "UPDATE yahoo_scraped_products 
                          SET ebay_api_data = ebay_api_data || jsonb_build_object(
                              'stage', 'profit_enhanced',
                              'confidence', ?,
                              'profit_margin', ?,
                              'profit_potential', ?,
                              'volume_level', ?,
                              'risk_level', ?,
                              'market_demand', ?,
                              'fee_percent', ?,
                              'stage2_processed_at', NOW()
                          ),
                          updated_at = NOW()
                          WHERE id = ?";
            
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([
                $stage2Confidence,
                $product['avg_profit_margin'] ?? 0,
                $profitPotential,
                $product['volume_level'] ?? 'unknown',
                $product['risk_level'] ?? 'medium',
                $product['market_demand'] ?? 'medium',
                $product['final_value_fee_percent'] ?? 13.6,
                $productId
            ]);
            
            $response = [
                'success' => true,
                'action' => 'single_stage2_analysis',
                'product_id' => $productId,
                'category_id' => $product['category_id'],
                'category_name' => $product['category_name'],
                'base_confidence' => $baseConfidence,
                'confidence' => $stage2Confidence,
                'confidence_improvement' => $stage2Confidence - $baseConfidence,
                'profit_margin' => $product['avg_profit_margin'] ?? 0,
                'profit_potential' => $profitPotential,
                'volume_level' => $product['volume_level'] ?? 'unknown',
                'risk_level' => $product['risk_level'] ?? 'medium',
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
                'stage' => 'profit_enhanced'
            ];
            
            logApiCall($action, $productId, $response);
            break;
            
        // =================================================================
        // バッチ処理: Stage 1一括実行
        // =================================================================
        case 'batch_stage1_analysis':
            $limit = min(1000, max(10, intval($input['limit'] ?? 100)));
            
            // 未処理商品取得
            $sql = "SELECT id, source_item_id, price_jpy,
                           (scraped_yahoo_data->>'title') as title,
                           (scraped_yahoo_data->>'description') as description,
                           (scraped_yahoo_data->>'category') as yahoo_category
                    FROM yahoo_scraped_products 
                    WHERE ebay_api_data IS NULL OR (ebay_api_data->>'category_id') IS NULL
                    ORDER BY created_at DESC 
                    LIMIT ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$limit]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($products)) {
                $response = [
                    'success' => true,
                    'action' => 'batch_stage1_analysis',
                    'processed_count' => 0,
                    'message' => '処理対象の商品がありません',
                    'processing_time' => round((microtime(true) - $startTime) * 1000, 2)
                ];
                break;
            }
            
            $processed = [];
            $totalConfidence = 0;
            $successCount = 0;
            
            foreach ($products as $product) {
                try {
                    // カテゴリー判定実行
                    $productData = [
                        'title' => $product['title'] ?? '',
                        'price' => ($product['price_jpy'] ?? 0) * 0.0067,
                        'description' => $product['description'] ?? ''
                    ];
                    
                    $categoryResult = $categoryDetector->detectCategory($productData);
                    
                    // Item Specifics生成
                    $itemSpecifics = $itemSpecificsGenerator->generateItemSpecificsString(
                        $categoryResult['category_id'],
                        [],
                        $productData
                    );
                    
                    // データベース更新
                    $updateSql = "UPDATE yahoo_scraped_products 
                                  SET ebay_api_data = jsonb_build_object(
                                      'category_id', ?,
                                      'category_name', ?,
                                      'confidence', ?,
                                      'matched_keywords', ?,
                                      'item_specifics', ?,
                                      'stage', 'basic',
                                      'processed_at', NOW(),
                                      'fee_percent', 13.6
                                  ),
                                  updated_at = NOW()
                                  WHERE id = ?";
                    
                    $stmt = $pdo->prepare($updateSql);
                    $stmt->execute([
                        $categoryResult['category_id'],
                        $categoryResult['category_name'],
                        $categoryResult['confidence'],
                        json_encode($categoryResult['matched_keywords']),
                        $itemSpecifics,
                        $product['id']
                    ]);
                    
                    $processed[] = [
                        'product_id' => $product['id'],
                        'title' => mb_substr($product['title'] ?? '', 0, 30),
                        'category_id' => $categoryResult['category_id'],
                        'category_name' => $categoryResult['category_name'],
                        'confidence' => $categoryResult['confidence'],
                        'success' => true
                    ];
                    
                    $totalConfidence += $categoryResult['confidence'];
                    $successCount++;
                    
                } catch (Exception $e) {
                    $processed[] = [
                        'product_id' => $product['id'],
                        'title' => mb_substr($product['title'] ?? '', 0, 30),
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
                
                // メモリ使用量監視
                if (memory_get_usage() > 100 * 1024 * 1024) { // 100MB
                    gc_collect_cycles();
                }
            }
            
            $avgConfidence = $successCount > 0 ? round($totalConfidence / $successCount, 1) : 0;
            
            $response = [
                'success' => true,
                'action' => 'batch_stage1_analysis',
                'processed_count' => count($processed),
                'success_count' => $successCount,
                'avg_confidence' => $avgConfidence,
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
                'results' => $processed
            ];
            
            logApiCall($action, null, $response);
            break;
            
        // =================================================================
        // バッチ処理: Stage 2一括実行
        // =================================================================
        case 'batch_stage2_analysis':
            $limit = min(1000, max(10, intval($input['limit'] ?? 100)));
            
            // Stage 1完了商品取得
            $sql = "SELECT ysp.id, ysp.source_item_id, ysp.price_jpy,
                           (ysp.scraped_yahoo_data->>'title') as title,
                           (ysp.ebay_api_data->>'category_id') as category_id,
                           (ysp.ebay_api_data->>'category_name') as category_name,
                           CAST(COALESCE(ysp.ebay_api_data->>'confidence', '0') as INTEGER) as base_confidence,
                           
                           cpb.avg_profit_margin,
                           cpb.volume_level,
                           cpb.risk_level,
                           cpb.market_demand,
                           cpb.confidence_level,
                           
                           ecf.final_value_fee_percent
                           
                    FROM yahoo_scraped_products ysp
                    LEFT JOIN category_profit_bootstrap cpb ON (ysp.ebay_api_data->>'category_id') = cpb.category_id
                    LEFT JOIN ebay_category_fees ecf ON (ysp.ebay_api_data->>'category_id') = ecf.category_id AND ecf.is_active = TRUE
                    WHERE (ysp.ebay_api_data->>'stage') = 'basic'
                       OR ((ysp.ebay_api_data->>'category_id') IS NOT NULL AND (ysp.ebay_api_data->>'stage') IS NULL)
                    ORDER BY ysp.updated_at DESC 
                    LIMIT ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$limit]);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($products)) {
                $response = [
                    'success' => true,
                    'action' => 'batch_stage2_analysis',
                    'processed_count' => 0,
                    'message' => 'Stage 2処理対象の商品がありません（Stage 1を先に実行してください）',
                    'processing_time' => round((microtime(true) - $startTime) * 1000, 2)
                ];
                break;
            }
            
            $processed = [];
            $totalConfidence = 0;
            $successCount = 0;
            
            foreach ($products as $product) {
                try {
                    $baseConfidence = intval($product['base_confidence']);
                    $stage2Confidence = $baseConfidence;
                    
                    // Stage 2信頼度計算
                    if ($product['avg_profit_margin']) {
                        $profitBonus = 0;
                        
                        if ($product['avg_profit_margin'] >= 30) {
                            $profitBonus += 8;
                        } elseif ($product['avg_profit_margin'] >= 20) {
                            $profitBonus += 5;
                        } else {
                            $profitBonus += 2;
                        }
                        
                        if ($product['volume_level'] === 'high') $profitBonus += 5;
                        elseif ($product['volume_level'] === 'medium') $profitBonus += 3;
                        
                        if ($product['risk_level'] === 'low') $profitBonus += 3;
                        elseif ($product['risk_level'] === 'high') $profitBonus -= 2;
                        
                        if ($product['market_demand'] === 'high') $profitBonus += 4;
                        elseif ($product['market_demand'] === 'low') $profitBonus -= 1;
                        
                        $stage2Confidence = min(99, $baseConfidence + $profitBonus);
                    } else {
                        $stage2Confidence = min(95, $baseConfidence + 5);
                    }
                    
                    // 利益ポテンシャル計算
                    $profitPotential = $product['avg_profit_margin'] ?? 20.0;
                    if ($product['avg_profit_margin']) {
                        $multiplier = 1.0;
                        if ($product['volume_level'] === 'high') $multiplier *= 1.2;
                        if ($product['volume_level'] === 'low') $multiplier *= 0.8;
                        if ($product['risk_level'] === 'low') $multiplier *= 1.1;
                        if ($product['risk_level'] === 'high') $multiplier *= 0.8;
                        
                        $profitPotential = round($profitPotential * $multiplier, 1);
                    }
                    
                    // データベース更新
                    $updateSql = "UPDATE yahoo_scraped_products 
                                  SET ebay_api_data = ebay_api_data || jsonb_build_object(
                                      'stage', 'profit_enhanced',
                                      'confidence', ?,
                                      'profit_margin', ?,
                                      'profit_potential', ?,
                                      'volume_level', ?,
                                      'risk_level', ?,
                                      'market_demand', ?,
                                      'fee_percent', ?,
                                      'stage2_processed_at', NOW()
                                  ),
                                  updated_at = NOW()
                                  WHERE id = ?";
                    
                    $stmt = $pdo->prepare($updateSql);
                    $stmt->execute([
                        $stage2Confidence,
                        $product['avg_profit_margin'] ?? 0,
                        $profitPotential,
                        $product['volume_level'] ?? 'unknown',
                        $product['risk_level'] ?? 'medium',
                        $product['market_demand'] ?? 'medium',
                        $product['final_value_fee_percent'] ?? 13.6,
                        $product['id']
                    ]);
                    
                    $processed[] = [
                        'product_id' => $product['id'],
                        'title' => mb_substr($product['title'] ?? '', 0, 30),
                        'category_name' => $product['category_name'],
                        'base_confidence' => $baseConfidence,
                        'stage2_confidence' => $stage2Confidence,
                        'improvement' => $stage2Confidence - $baseConfidence,
                        'profit_potential' => $profitPotential,
                        'success' => true
                    ];
                    
                    $totalConfidence += $stage2Confidence;
                    $successCount++;
                    
                } catch (Exception $e) {
                    $processed[] = [
                        'product_id' => $product['id'],
                        'title' => mb_substr($product['title'] ?? '', 0, 30),
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            $avgConfidence = $successCount > 0 ? round($totalConfidence / $successCount, 1) : 0;
            
            $response = [
                'success' => true,
                'action' => 'batch_stage2_analysis',
                'processed_count' => count($processed),
                'success_count' => $successCount,
                'avg_confidence' => $avgConfidence,
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2),
                'results' => $processed
            ];
            
            logApiCall($action, null, $response);
            break;
            
        // =================================================================
        // システム統計取得
        // =================================================================
        case 'get_system_stats':
            $statsQuery = "
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN (ebay_api_data->>'category_id') IS NOT NULL THEN 1 END) as categorized_count,
                    COUNT(CASE WHEN (ebay_api_data->>'stage') = 'basic' THEN 1 END) as stage1_count,
                    COUNT(CASE WHEN (ebay_api_data->>'stage') = 'profit_enhanced' THEN 1 END) as stage2_count,
                    AVG(CAST(COALESCE(ebay_api_data->>'confidence', '0') as INTEGER)) as avg_confidence,
                    AVG(CASE WHEN (ebay_api_data->>'stage') = 'basic' 
                        THEN CAST(COALESCE(ebay_api_data->>'confidence', '0') as INTEGER) END) as avg_stage1_confidence,
                    AVG(CASE WHEN (ebay_api_data->>'stage') = 'profit_enhanced' 
                        THEN CAST(COALESCE(ebay_api_data->>'confidence', '0') as INTEGER) END) as avg_stage2_confidence
                FROM yahoo_scraped_products
            ";
            
            $stmt = $pdo->query($statsQuery);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // ブートストラップ統計
            $bootstrapQuery = "SELECT COUNT(*) as bootstrap_categories, AVG(avg_profit_margin) as avg_profit FROM category_profit_bootstrap";
            $bootstrapStmt = $pdo->query($bootstrapQuery);
            $bootstrapStats = $bootstrapStmt->fetch(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'action' => 'get_system_stats',
                'stats' => $stats,
                'bootstrap' => $bootstrapStats,
                'system_info' => [
                    'version' => '2.0.0',
                    'last_updated' => date('Y-m-d H:i:s'),
                    'features' => ['Stage1', 'Stage2', 'Bootstrap', 'Batch']
                ],
                'processing_time' => round((microtime(true) - $startTime) * 1000, 2)
            ];
            break;
            
        default:
            throw new Exception('不明なアクション: ' . $action);
    }
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'error' => $e->getMessage(),
        'action' => $action ?? 'unknown',
        'timestamp' => date('Y-m-d H:i:s'),
        'processing_time' => round((microtime(true) - $startTime) * 1000, 2)
    ];
    
    error_log('eBayカテゴリー統合API エラー: ' . $e->getMessage());
    logApiCall($action ?? 'unknown', null, null, $e->getMessage());
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// API呼び出しログテーブル作成（存在しない場合）
function createApiLogTableIfNotExists($pdo) {
    try {
        $sql = "CREATE TABLE IF NOT EXISTS api_call_logs (
            id SERIAL PRIMARY KEY,
            action VARCHAR(100) NOT NULL,
            product_id INTEGER,
            processing_time_ms DECIMAL(10,2),
            result_data JSONB,
            error_message TEXT,
            called_at TIMESTAMP DEFAULT NOW()
        )";
        $pdo->exec($sql);
    } catch (Exception $e) {
        // テーブル作成失敗時は無視
    }
}

// 初回実行時にログテーブル作成
if (isset($pdo)) {
    createApiLogTableIfNotExists($pdo);
}
?>