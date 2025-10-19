<?php
/**
 * Sell-a-Mirror統合API - バックエンド処理
 * Mirror検索・スコア計算・点数算出のAPI
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// プリフライトリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラーハンドリング
set_error_handler(function($severity, $message, $file, $line) {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    // データベース接続
    $pdo = new PDO('pgsql:host=localhost;dbname=nagano3_db', 'aritahiroaki', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // 🔴 テーブル拡張を最初に実行
    extendYahooProductsTableForSellMirror($pdo);
    
    // リクエスト処理
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $action = $input['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';
    
    if (empty($action)) {
        throw new Exception('アクションが指定されていません');
    }
    
    switch ($action) {
        
        // =================================================================
        // Mirror検索開始
        // =================================================================
        case 'start_mirror_search':
            $searchMode = $input['search_mode'] ?? 'title_only';
            $searchRange = $input['search_range'] ?? 'all';
            $batchSize = min(200, max(10, intval($input['batch_size'] ?? 50)));
            $waitTime = min(10, max(1, intval($input['wait_time'] ?? 2)));
            
            // 対象商品取得
            $sql = "SELECT COUNT(*) as target_count FROM yahoo_scraped_products WHERE ";
            
            switch ($searchRange) {
                case 'unprocessed':
                    $sql .= "sell_mirror_data IS NULL";
                    break;
                case 'category_detected':
                    $sql .= "(ebay_api_data->>'category_id') IS NOT NULL";
                    break;
                default:
                    $sql .= "1=1";
            }
            
            $stmt = $pdo->query($sql);
            $targetCount = $stmt->fetch(PDO::FETCH_ASSOC)['target_count'];
            
            // 検索プロセス開始記録
            createSellMirrorProcessTable($pdo);
            
            $processSql = "INSERT INTO sell_mirror_processes (
                search_mode, search_range, batch_size, wait_time, 
                target_count, status, started_at
            ) VALUES (?, ?, ?, ?, ?, 'started', NOW()) RETURNING id";
            
            $processStmt = $pdo->prepare($processSql);
            $processStmt->execute([$searchMode, $searchRange, $batchSize, $waitTime, $targetCount]);
            $processId = $processStmt->fetch(PDO::FETCH_ASSOC)['id'];
            
            // セッションに保存
            session_start();
            $_SESSION['mirror_search_process_id'] = $processId;
            
            $response = [
                'success' => true,
                'action' => 'start_mirror_search',
                'process_id' => $processId,
                'target_count' => $targetCount,
                'estimated_time' => round(($targetCount / $batchSize) * $waitTime),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            // バックグラウンド処理開始（実際の実装では非同期処理）
            startMirrorSearchProcess($pdo, $processId, $searchMode, $searchRange, $batchSize, $waitTime);
            break;
            
        // =================================================================
        // Mirror検索進行状況取得
        // =================================================================
        case 'get_search_progress':
            session_start();
            $processId = $_SESSION['mirror_search_process_id'] ?? null;
            
            if (!$processId) {
                // デモ用の模擬進行状況
                $response = [
                    'success' => true,
                    'action' => 'get_search_progress',
                    'progress' => [
                        'status' => 'completed',
                        'processed' => 100,
                        'total' => 100,
                        'success_count' => 85,
                        'success_rate' => 85.0,
                        'estimated_remaining' => 0,
                        'current_batch' => 'completed'
                    ],
                    'timestamp' => date('Y-m-d H:i:s')
                ];
                break;
            }
            
            $sql = "SELECT * FROM sell_mirror_processes WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$processId]);
            $process = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$process) {
                throw new Exception('検索プロセスが見つかりません');
            }
            
            $response = [
                'success' => true,
                'action' => 'get_search_progress',
                'progress' => [
                    'status' => $process['status'],
                    'processed' => $process['processed_count'],
                    'total' => $process['target_count'],
                    'success_count' => $process['success_count'],
                    'success_rate' => $process['target_count'] > 0 ? 
                        round(($process['success_count'] / $process['processed_count']) * 100, 1) : 0,
                    'estimated_remaining' => $process['estimated_remaining_minutes'],
                    'current_batch' => $process['current_batch']
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // スコア計算開始
        // =================================================================
        case 'start_score_calculation':
            $scoreMethod = $input['score_method'] ?? 'comprehensive';
            $priceWeight = min(10, max(1, intval($input['price_weight'] ?? 7)));
            $competitionWeight = min(10, max(1, intval($input['competition_weight'] ?? 5)));
            $historyWeight = min(10, max(1, intval($input['history_weight'] ?? 8)));
            
            // 対象商品取得（Mirror検索済みのもの）
            $sql = "SELECT COUNT(*) as target_count 
                    FROM yahoo_scraped_products 
                    WHERE sell_mirror_data IS NOT NULL";
            
            $stmt = $pdo->query($sql);
            $targetCount = $stmt->fetch(PDO::FETCH_ASSOC)['target_count'];
            
            // スコア計算プロセス開始記録
            $processSql = "INSERT INTO sell_mirror_processes (
                search_mode, target_count, status, started_at, 
                score_method, price_weight, competition_weight, history_weight
            ) VALUES ('score_calculation', ?, 'started', NOW(), ?, ?, ?, ?) RETURNING id";
            
            $processStmt = $pdo->prepare($processSql);
            $processStmt->execute([$targetCount, $scoreMethod, $priceWeight, $competitionWeight, $historyWeight]);
            $processId = $processStmt->fetch(PDO::FETCH_ASSOC)['id'];
            
            // セッションに保存
            session_start();
            $_SESSION['score_calculation_process_id'] = $processId;
            
            $response = [
                'success' => true,
                'action' => 'start_score_calculation',
                'process_id' => $processId,
                'target_count' => $targetCount,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            // バックグラウンド処理開始
            startScoreCalculationProcess($pdo, $processId, $scoreMethod, $priceWeight, $competitionWeight, $historyWeight);
            break;
            
        // =================================================================
        // スコア計算進行状況取得
        // =================================================================
        case 'get_score_progress':
            session_start();
            $processId = $_SESSION['score_calculation_process_id'] ?? null;
            
            if (!$processId) {
                // デモ用の模擬進行状況
                $response = [
                    'success' => true,
                    'action' => 'get_score_progress',
                    'progress' => [
                        'status' => 'completed',
                        'processed' => 85,
                        'total' => 85,
                        'avg_score' => 72.5,
                        'high_score_count' => 25,
                        'current_batch' => 'completed'
                    ],
                    'timestamp' => date('Y-m-d H:i:s')
                ];
                break;
            }
            
            $sql = "SELECT * FROM sell_mirror_processes WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$processId]);
            $process = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$process) {
                throw new Exception('スコア計算プロセスが見つかりません');
            }
            
            $response = [
                'success' => true,
                'action' => 'get_score_progress',
                'progress' => [
                    'status' => $process['status'],
                    'processed' => $process['processed_count'],
                    'total' => $process['target_count'],
                    'avg_score' => $process['avg_score'],
                    'high_score_count' => $process['success_count'],
                    'current_batch' => $process['current_batch']
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // 結果データ取得
        // =================================================================
        case 'get_results':
            $limit = min(500, max(10, intval($_GET['limit'] ?? 200)));
            $search = $_GET['search'] ?? '';
            
            // sell_mirror_dataカラムが存在しない場合は拡張
            extendYahooProductsTableForSellMirror($pdo);
            
            $sql = "SELECT 
                        ysp.id,
                        (ysp.scraped_yahoo_data->>'title') as title,
                        ysp.price_jpy,
                        CASE 
                            WHEN ysp.sell_mirror_data IS NOT NULL THEN true 
                            ELSE false 
                        END as mirror_searched,
                        CAST(COALESCE(ysp.sell_mirror_data->>'competitor_count', '0') as INTEGER) as competitor_count,
                        CAST(COALESCE(ysp.sell_mirror_data->>'price_difference_percent', '0') as DECIMAL) as price_difference,
                        CAST(COALESCE(ysp.sell_mirror_data->>'score', '0') as DECIMAL) as score,
                        CAST(COALESCE(ysp.sell_mirror_data->>'total_points', '0') as INTEGER) as total_points,
                        ysp.updated_at
                    FROM yahoo_scraped_products ysp
                    WHERE 1=1";
            
            $params = [];
            
            // 検索条件追加
            if (!empty($search)) {
                $sql .= " AND (ysp.scraped_yahoo_data->>'title') ILIKE ?";
                $params[] = "%{$search}%";
            }
            
            $sql .= " ORDER BY 
                        CASE WHEN ysp.sell_mirror_data IS NOT NULL THEN 0 ELSE 1 END,
                        CAST(COALESCE(ysp.sell_mirror_data->>'score', '0') as DECIMAL) DESC,
                        ysp.updated_at DESC
                      LIMIT ?";
            $params[] = $limit;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'success' => true,
                'action' => 'get_results',
                'results' => $results,
                'count' => count($results),
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // 単体テスト
        // =================================================================
        case 'test_single_search':
            $productId = intval($input['product_id'] ?? 0);
            
            if (!$productId) {
                throw new Exception('商品IDが必要です');
            }
            
            // 商品データ取得
            $sql = "SELECT id, (scraped_yahoo_data->>'title') as title 
                    FROM yahoo_scraped_products 
                    WHERE id = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                throw new Exception('商品が見つかりません');
            }
            
            // デモ用のMirror検索結果
            $mirrorResult = simulateMirrorSearch($product['title']);
            
            // 結果を保存
            $mirrorDataJson = json_encode([
                'searched_at' => date('Y-m-d H:i:s'),
                'search_query' => $product['title'],
                'competitor_count' => $mirrorResult['competitor_count'],
                'price_difference_percent' => $mirrorResult['price_difference'],
                'similar_items' => $mirrorResult['similar_items'],
                'market_analysis' => $mirrorResult['market_analysis']
            ]);
            
            $updateSql = "UPDATE yahoo_scraped_products 
                          SET sell_mirror_data = ?::jsonb,
                          updated_at = NOW()
                          WHERE id = ?";
            
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([$mirrorDataJson, $productId]);
            
            $response = [
                'success' => true,
                'action' => 'test_single_search',
                'product_id' => $productId,
                'title' => $product['title'],
                'mirror_result' => $mirrorResult,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            break;
            
        // =================================================================
        // 実装版: 商品分析（eBayタイトル・カテゴリー使用）
        // =================================================================
        case 'analyze_product':
            $productId = intval($input['product_id'] ?? 0);
            $ebayTitle = $input['ebay_title'] ?? '';
            $ebayCategoryId = $input['ebay_category_id'] ?? null;
            $yahooPrice = floatval($input['yahoo_price'] ?? 0);
            
            if (!$productId || !$ebayTitle) {
                throw new Exception('商品IDとeBayタイトルが必要です');
            }
            
            // キーワード抽出
            $keywords = extractKeywords($ebayTitle);
            $searchQuery = !empty($keywords) ? implode(' ', array_slice($keywords, 0, 3)) : $ebayTitle;
            
            // 🔴 実際のeBay APIを使用
            $useRealApi = true; // TODO: config.phpから読み込む
            
            if ($useRealApi && file_exists(__DIR__ . '/../classes/EbayFindingApi.php')) {
                require_once __DIR__ . '/../classes/EbayFindingApi.php';
                
                try {
                    $ebayApi = new EbayFindingApi();
                    
                    // App IDチェック
                    $reflection = new ReflectionClass($ebayApi);
                    $appIdProperty = $reflection->getProperty('appId');
                    $appIdProperty->setAccessible(true);
                    $appId = $appIdProperty->getValue($ebayApi);
                    
                    if ($appId === 'YOUR_EBAY_APP_ID_HERE' || empty($appId)) {
                        throw new Exception('eBay App IDが設定されていません。EbayFindingApi.phpでApp IDを設定してください。');
                    }
                    
                    // 完売商品検索
                    $soldResponse = $ebayApi->findCompletedItems($searchQuery, $ebayCategoryId, 20);
                    $soldItems = $ebayApi->parseItems($soldResponse, true);
                    
                    // 現在の出品検索
                    $activeResponse = $ebayApi->findItemsAdvanced($searchQuery, $ebayCategoryId, 20);
                    $activeItems = $ebayApi->parseItems($activeResponse, false);
                    
                    $mirrorResult = calculateRealMirrorAnalysis($soldItems, $activeItems, $yahooPrice, $ebayTitle);
                    
                } catch (Exception $e) {
                    error_log('eBay API Error: ' . $e->getMessage());
                    // フォールバック: デモデータ
                    $mirrorResult = simulateMirrorAnalysis($ebayTitle, $ebayCategoryId, $yahooPrice);
                    $mirrorResult['api_mode'] = 'demo';
                    $mirrorResult['api_error'] = $e->getMessage();
                }
            } else {
                // デモモード
                $mirrorResult = simulateMirrorAnalysis($ebayTitle, $ebayCategoryId, $yahooPrice);
                $mirrorResult['api_mode'] = 'demo';
            }
            
            // 結果を保存
            $mirrorDataJson = json_encode([
                'searched_at' => date('Y-m-d H:i:s'),
                'ebay_title' => $ebayTitle,
                'ebay_category_id' => $ebayCategoryId,
                'keywords' => $keywords,
                'search_query' => $searchQuery,
                'competitor_count' => $mirrorResult['competitor_count'],
                'sold_count_90days' => $mirrorResult['sold_count_90days'],
                'average_price' => $mirrorResult['average_price'],
                'price_difference_percent' => $mirrorResult['price_difference_percent'],
                'similar_items' => $mirrorResult['similar_items'],
                'market_analysis' => $mirrorResult['market_analysis'],
                'mirror_confidence' => $mirrorResult['mirror_confidence'],
                'risk_level' => $mirrorResult['risk_level'],
                'api_mode' => $mirrorResult['api_mode'] ?? 'unknown'
            ]);
            
            $updateSql = "UPDATE yahoo_scraped_products 
                          SET sell_mirror_data = ?::jsonb,
                          updated_at = NOW()
                          WHERE id = ?";
            
            $stmt = $pdo->prepare($updateSql);
            $stmt->execute([$mirrorDataJson, $productId]);
            
            $response = [
                'success' => true,
                'action' => 'analyze_product',
                'product_id' => $productId,
                'ebay_title' => $ebayTitle,
                'ebay_category_id' => $ebayCategoryId,
                'analysis_result' => $mirrorResult,
                'timestamp' => date('Y-m-d H:i:s')
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
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    error_log('Sell-a-Mirror API エラー: ' . $e->getMessage());
    http_response_code(400);
}

// レスポンス送信
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// =============================================================================
// ヘルパー関数
// =============================================================================

/**
 * Mirror検索プロセステーブル作成
 */
function createSellMirrorProcessTable($pdo) {
    $sql = "CREATE TABLE IF NOT EXISTS sell_mirror_processes (
        id SERIAL PRIMARY KEY,
        search_mode VARCHAR(50),
        search_range VARCHAR(50),
        batch_size INTEGER,
        wait_time INTEGER,
        target_count INTEGER DEFAULT 0,
        processed_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        current_batch VARCHAR(100),
        estimated_remaining_minutes INTEGER,
        score_method VARCHAR(50),
        price_weight INTEGER,
        competition_weight INTEGER,
        history_weight INTEGER,
        avg_score DECIMAL(5,2),
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
    )";
    
    $pdo->exec($sql);
}

/**
 * Yahoo商品テーブルをSell-a-Mirror用に拡張
 */
function extendYahooProductsTableForSellMirror($pdo) {
    try {
        $sql = "ALTER TABLE yahoo_scraped_products 
                ADD COLUMN IF NOT EXISTS sell_mirror_data JSONB";
        $pdo->exec($sql);
    } catch (Exception $e) {
        // カラムが既に存在する場合は無視
    }
}

/**
 * Mirror検索プロセス開始（デモ版）
 */
function startMirrorSearchProcess($pdo, $processId, $searchMode, $searchRange, $batchSize, $waitTime) {
    // 実際の実装では、バックグラウンドジョブや非同期処理を使用
    // ここではデモ用にプロセス状態を更新
    
    try {
        // プロセス状態を「実行中」に更新
        $sql = "UPDATE sell_mirror_processes 
                SET status = 'running', 
                    current_batch = 'バッチ1/5実行中',
                    processed_count = 20,
                    success_count = 17,
                    estimated_remaining_minutes = 15
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$processId]);
        
        // 数秒後に完了状態にする（デモ用）
        // 実際の実装では、段階的に進行状況を更新
        
    } catch (Exception $e) {
        error_log('Mirror search process error: ' . $e->getMessage());
    }
}

/**
 * スコア計算プロセス開始（デモ版）
 */
function startScoreCalculationProcess($pdo, $processId, $scoreMethod, $priceWeight, $competitionWeight, $historyWeight) {
    try {
        // プロセス状態を「実行中」に更新
        $sql = "UPDATE sell_mirror_processes 
                SET status = 'running', 
                    current_batch = 'スコア計算中',
                    processed_count = 42,
                    success_count = 38,
                    avg_score = 68.5
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$processId]);
        
    } catch (Exception $e) {
        error_log('Score calculation process error: ' . $e->getMessage());
    }
}

/**
 * Mirror検索シミュレーション（デモ用）
 */
function simulateMirrorSearch($title) {
    // 実際の実装では、Sell-a-Mirror APIを呼び出し
    
    $competitorCount = rand(5, 25);
    $priceDifference = rand(-30, 50);
    
    $similarItems = [];
    for ($i = 0; $i < min(5, $competitorCount); $i++) {
        $similarItems[] = [
            'title' => $title . ' (類似商品' . ($i + 1) . ')',
            'price' => rand(1000, 50000),
            'seller_rating' => rand(95, 100) / 100,
            'sold_count' => rand(1, 100)
        ];
    }
    
    $marketAnalysis = [
        'demand_level' => rand(1, 5),
        'price_trend' => ['stable', 'rising', 'falling'][rand(0, 2)],
        'seasonality' => ['low', 'medium', 'high'][rand(0, 2)],
        'competition_level' => $competitorCount > 15 ? 'high' : ($competitorCount > 8 ? 'medium' : 'low')
    ];
    
    return [
        'competitor_count' => $competitorCount,
        'price_difference' => $priceDifference,
        'similar_items' => $similarItems,
        'market_analysis' => $marketAnalysis
    ];
}

/**
 * 英語タイトルからキーワード抽出
 */
function extractKeywords($ebayTitle) {
    $title = strtolower($ebayTitle);
    $keywords = [];
    
    // ブランド名検出
    $brands = ['apple', 'samsung', 'canon', 'nikon', 'sony', 'nintendo', 'pokemon'];
    foreach ($brands as $brand) {
        if (strpos($title, $brand) !== false) {
            $keywords[] = $brand;
            break;
        }
    }
    
    // モデル番号抽出
    if (preg_match('/\b(iphone\s*\d+|galaxy\s*[s]?\d+|eos\s*\w+)\b/i', $title, $matches)) {
        $keywords[] = trim($matches[1]);
    }
    
    // 容量・サイズ
    if (preg_match('/\b(\d+gb|\d+tb|\d+inch)\b/i', $title, $matches)) {
        $keywords[] = $matches[1];
    }
    
    return $keywords;
}

/**
 * Mirror分析シミュレーション（eBayタイトル・カテゴリー使用）
 * 🔴 改善: 現在の出品データのみ表示（実際のeBay APIと同じ動作）
 */
function simulateMirrorAnalysis($ebayTitle, $ebayCategoryId, $yahooPrice) {
    $keywords = extractKeywords($ebayTitle);
    
    // 統計データ（Soldベース）
    $soldCount = rand(5, 50);
    $competitorCount = rand(5, 30);
    $averagePrice = ($yahooPrice / 150) * 1.3;
    $priceDifference = rand(-20, 40);
    
    // 🔴 Mirror候補：現在の出品データのみ（画像・URL付き）
    $similarItems = [];
    
    $titleVariations = [
        $ebayTitle,
        $ebayTitle . ' - Excellent Condition',
        $ebayTitle . ' - Used',
        $ebayTitle . ' - Like New',
        $ebayTitle . ' - Mint',
        $ebayTitle . ' [Pre-Owned]'
    ];
    
    // 現在の出品データを生成（最大6件）
    for ($i = 0; $i < min(6, $competitorCount); $i++) {
        $itemPrice = round($averagePrice * (1 + (rand(-20, 20) / 100)), 2);
        $shippingCost = round(rand(5, 15) + (rand(0, 99) / 100), 2);
        
        $similarItems[] = [
            'title' => $titleVariations[array_rand($titleVariations)],
            'price' => $itemPrice,
            'shipping_cost' => $shippingCost,
            'total_price' => $itemPrice + $shippingCost,
            'image_url' => generateRealisticEbayImageUrl($ebayTitle, $i),
            'item_id' => 'DEMO' . rand(100000000, 999999999),
            'url' => 'https://www.ebay.com/itm/' . rand(100000000, 999999999), // 実際のeBay形式URL
            'seller_rating' => rand(95, 100) / 100,
            'sold_count' => 0, // 現在の出品なのでsold_count=0
            'listing_type' => ['FixedPrice', 'Auction'][rand(0, 1)],
            'condition' => ['New', 'Used', 'Like New', 'Refurbished'][rand(0, 3)]
        ];
    }
    
    // 価格順にソート（最安値から）
    usort($similarItems, function($a, $b) {
        return $a['total_price'] <=> $b['total_price'];
    });
    
    // 信頼度計算
    $confidence = 0;
    if ($soldCount >= 20) $confidence += 40;
    elseif ($soldCount >= 10) $confidence += 30;
    else $confidence += $soldCount * 3;
    
    if ($competitorCount < 20) $confidence += 30;
    elseif ($competitorCount < 30) $confidence += 15;
    
    $confidence += 20;
    
    // リスク評価
    $riskLevel = 'MEDIUM';
    if ($competitorCount > 40 || $soldCount < 3) {
        $riskLevel = 'HIGH';
    } elseif ($soldCount >= 15 && $competitorCount < 15 && $confidence >= 80) {
        $riskLevel = 'LOW';
    }
    
    return [
        'competitor_count' => $competitorCount,
        'sold_count_90days' => $soldCount, // 統計用
        'average_price' => round($averagePrice, 2),
        'median_price' => round($averagePrice * 0.95, 2),
        'min_price' => round($averagePrice * 0.7, 2),
        'max_price' => round($averagePrice * 1.3, 2),
        'price_difference_percent' => $priceDifference,
        'mirror_confidence' => min(100, $confidence),
        'risk_level' => $riskLevel,
        'similar_items' => $similarItems, // 現在の出品のみ
        'market_analysis' => [
            'demand_level' => min(5, max(1, intval($soldCount / 10) + 1)),
            'price_trend' => $priceDifference > 10 ? 'rising' : ($priceDifference < -10 ? 'falling' : 'stable'),
            'seasonality' => ['low', 'medium', 'high'][rand(0, 2)],
            'competition_level' => $competitorCount > 25 ? 'high' : ($competitorCount > 12 ? 'medium' : 'low'),
            'keywords_used' => $keywords,
            'sold_for_stats_only' => true
        ],
        'api_mode' => 'demo'
    ];
}

/**
 * よりリアルなeBay画像URL生成
 */
function generateRealisticEbayImageUrl($title, $index) {
    // 実際の実装では、eBay APIから画像URLを取得
    // デモ: Data URIで確実に表示される画像を生成
    
    $colors = [
        ['bg' => 'rgba(102, 126, 234, 0.8)', 'text' => '#ffffff'],
        ['bg' => 'rgba(118, 75, 162, 0.8)', 'text' => '#ffffff'],
        ['bg' => 'rgba(95, 114, 189, 0.8)', 'text' => '#ffffff'],
        ['bg' => 'rgba(155, 89, 182, 0.8)', 'text' => '#ffffff'],
        ['bg' => 'rgba(52, 152, 219, 0.8)', 'text' => '#ffffff'],
        ['bg' => 'rgba(231, 76, 60, 0.8)', 'text' => '#ffffff']
    ];
    
    $colorScheme = $colors[$index % count($colors)];
    $itemNumber = $index + 1;
    
    // タイトルから商品タイプを推定
    $title = strtolower($title);
    $label = 'Item ' . $itemNumber;
    
    if (strpos($title, 'card') !== false || strpos($title, 'カード') !== false) {
        $label = 'Card ' . $itemNumber;
    } elseif (strpos($title, 'pokemon') !== false || strpos($title, 'ポケモン') !== false) {
        $label = 'Pokemon ' . $itemNumber;
    }
    
    // SVG Data URIで確実に表示される画像を生成
    $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">';
    $svg .= '<rect width="300" height="300" fill="' . $colorScheme['bg'] . '"/>';
    $svg .= '<text x="50%" y="50%" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="' . $colorScheme['text'] . '" text-anchor="middle" dominant-baseline="middle">' . htmlspecialchars($label) . '</text>';
    $svg .= '</svg>';
    
    return 'data:image/svg+xml;base64,' . base64_encode($svg);
}

/**
 * 実際のeBay APIデータからMirror分析計算
 */
function calculateRealMirrorAnalysis($soldItems, $activeItems, $yahooPrice, $ebayTitle) {
    $soldCount = count($soldItems);
    $competitorCount = count($activeItems);
    
    // 価格統計（Soldデータから）
    if ($soldCount > 0) {
        $soldPrices = array_column($soldItems, 'total_price');
        sort($soldPrices);
        
        $averagePrice = array_sum($soldPrices) / $soldCount;
        $medianPrice = $soldPrices[intval($soldCount / 2)];
        $minPrice = min($soldPrices);
        $maxPrice = max($soldPrices);
    } else {
        if ($competitorCount > 0) {
            $activePrices = array_column($activeItems, 'total_price');
            sort($activePrices);
            $averagePrice = array_sum($activePrices) / $competitorCount;
            $medianPrice = $activePrices[intval($competitorCount / 2)];
            $minPrice = min($activePrices);
            $maxPrice = max($activePrices);
        } else {
            $yahooUsd = $yahooPrice / 150;
            $averagePrice = $yahooUsd * 1.3;
            $medianPrice = $averagePrice;
            $minPrice = $averagePrice * 0.8;
            $maxPrice = $averagePrice * 1.2;
        }
    }
    
    // 信頼度計算
    $confidence = 0;
    if ($soldCount >= 20) $confidence += 40;
    elseif ($soldCount >= 10) $confidence += 30;
    else $confidence += $soldCount * 3;
    
    if ($competitorCount < 20) $confidence += 30;
    elseif ($competitorCount < 30) $confidence += 15;
    
    $confidence += 20;
    
    // リスク評価
    $riskLevel = 'MEDIUM';
    if ($competitorCount > 40 || $soldCount < 3) {
        $riskLevel = 'HIGH';
    } elseif ($soldCount >= 15 && $competitorCount < 15 && $confidence >= 80) {
        $riskLevel = 'LOW';
    }
    
    // 🔴 Mirror候補：現在の出品データのみ使用（画像・URL必須）
    $similarItems = [];
    usort($activeItems, function($a, $b) {
        return $a['total_price'] <=> $b['total_price']; // 価格順にソート
    });
    
    foreach (array_slice($activeItems, 0, 6) as $item) {
        $similarItems[] = [
            'title' => $item['title'],
            'price' => $item['price'],
            'shipping_cost' => $item['shipping_cost'],
            'total_price' => $item['total_price'],
            'image_url' => $item['image_url'], // 現在の出品なので画像あり
            'item_id' => $item['item_id'],
            'url' => $item['url'], // クリック可能なURL
            'seller_rating' => $item['seller_feedback'] / 100,
            'sold_count' => 0, // Active listingなのでsold_countは0
            'listing_type' => $item['listing_type'],
            'condition' => $item['condition']
        ];
    }
    
    // 価格差分
    $yahooUsd = $yahooPrice / 150;
    $priceDifference = (($averagePrice - $yahooUsd) / $yahooUsd) * 100;
    
    return [
        'competitor_count' => $competitorCount,
        'sold_count_90days' => $soldCount, // 統計用
        'average_price' => round($averagePrice, 2),
        'median_price' => round($medianPrice, 2),
        'min_price' => round($minPrice, 2),
        'max_price' => round($maxPrice, 2),
        'price_difference_percent' => round($priceDifference),
        'mirror_confidence' => min(100, $confidence),
        'risk_level' => $riskLevel,
        'similar_items' => $similarItems, // 現在の出品のみ
        'market_analysis' => [
            'demand_level' => min(5, max(1, intval($soldCount / 10) + 1)),
            'price_trend' => $priceDifference > 10 ? 'rising' : ($priceDifference < -10 ? 'falling' : 'stable'),
            'seasonality' => 'medium',
            'competition_level' => $competitorCount > 25 ? 'high' : ($competitorCount > 12 ? 'medium' : 'low'),
            'api_source' => 'ebay_finding_api',
            'sold_for_stats_only' => true // Soldは統計のみ使用
        ],
        'api_mode' => 'live'
    ];
}

/**
 * モックeBay画像URL生成
 */
function generateMockEbayImageUrl($index) {
    // 実際の実装では、eBay APIから画像URLを取得
    // 現在は信頼できるCDNを使用
    $placeholders = [
        'https://placehold.co/300x300/667eea/ffffff?text=Item+' . ($index + 1),
        'https://dummyimage.com/300x300/667eea/ffffff&text=Product+' . ($index + 1),
        'https://placehold.co/300x300/764ba2/ffffff?text=Mirror+' . ($index + 1)
    ];
    return $placeholders[array_rand($placeholders)];
}
?>