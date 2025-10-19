<?php
/**
 * eBayカテゴリー自動判定API
 * Yahoo Auctionスクレイピングデータを使用してeBayカテゴリーを判定
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエスト対応
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// エラー報告設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

/**
 * JSON応答送信
 */
function sendResponse($data, $success = true, $message = '') {
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続
 */
function getDatabaseConnection() {
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $pdo = new PDO($dsn, $user, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("カテゴリー判定API: DB接続エラー " . $e->getMessage());
        return null;
    }
}

/**
 * eBayカテゴリー判定ロジック
 */
function detecteBayCategory($title, $description = '', $condition = '', $price = 0) {
    // キーワードベースの判定ロジック
    $categoryMappings = [
        // カメラ・光学機器
        'camera|カメラ|レンズ|一眼|デジカメ|フィルム|Canon|Nikon|Sony' => [
            'category_id' => '625',
            'category_path' => 'Cameras & Photo > Digital Cameras',
            'confidence' => 85,
            'item_specifics' => 'Brand=■Model=■Type=Digital Camera■Condition=■Features='
        ],
        
        // オーディオ機器
        'ヘッドホン|スピーカー|アンプ|audio|headphone|speaker' => [
            'category_id' => '293',
            'category_path' => 'Consumer Electronics > Portable Audio & Headphones',
            'confidence' => 80,
            'item_specifics' => 'Brand=■Model=■Type=Headphones■Color=■Condition='
        ],
        
        // 茶道具・和食器
        '茶道具|急須|茶碗|和食器|陶器|tea set|ceramic' => [
            'category_id' => '177',
            'category_path' => 'Collectibles > Cultures & Ethnicities > Asian > Japanese > Other',
            'confidence' => 75,
            'item_specifics' => 'Country/Region of Manufacture=Japan■Material=Ceramic■Style=Traditional■Condition='
        ],
        
        // 木工芸品
        '木工|彫刻|wooden|sculpture|handmade|craft' => [
            'category_id' => '550',
            'category_path' => 'Art > Folk Art & Indigenous Art',
            'confidence' => 70,
            'item_specifics' => 'Material=Wood■Handmade=Yes■Style=Folk Art■Country/Region of Manufacture=■Condition='
        ],
        
        // クリスタル・パワーストーン
         'クリスタル|水晶|パワーストーン|crystal|healing|spiritual' => [
            'category_id' => '131',
            'category_path' => 'Everything Else > Metaphysical > Crystal Healing',
            'confidence' => 75,
            'item_specifics' => 'Type=Crystal■Color=■Size=■Stone Type=■Country/Region of Manufacture=■Condition='
        ]
    ];
    
    $searchText = strtolower($title . ' ' . $description);
    
    foreach ($categoryMappings as $pattern => $categoryData) {
        if (preg_match('/(' . $pattern . ')/i', $searchText)) {
            // 価格に基づく信頼度調整
            if ($price > 0) {
                if ($price >= 10000) {
                    $categoryData['confidence'] += 5;
                } elseif ($price >= 5000) {
                    $categoryData['confidence'] += 3;
                }
            }
            
            return array_merge($categoryData, [
                'reasoning' => "キーワード「{$pattern}」に基づく判定",
                'matched_pattern' => $pattern,
                'optimized_title' => optimizeTitle($title, $categoryData['category_path'])
            ]);
        }
    }
    
    // デフォルトカテゴリー
    return [
        'category_id' => '88433',
        'category_path' => 'Everything Else > Other',
        'confidence' => 30,
        'item_specifics' => 'Brand=■Condition=■Material=',
        'reasoning' => 'キーワードが一致しないため、汎用カテゴリーに分類',
        'matched_pattern' => 'default',
        'optimized_title' => $title
    ];
}

/**
 * タイトル最適化
 */
function optimizeTitle($originalTitle, $categoryPath) {
    $title = $originalTitle;
    
    // カテゴリーに応じたキーワード追加
    if (strpos($categoryPath, 'Camera') !== false) {
        if (!preg_match('/(Digital|Film|Camera)/i', $title)) {
            $title .= ' - Camera';
        }
    } elseif (strpos($categoryPath, 'Audio') !== false) {
        if (!preg_match('/(Audio|Sound|Music)/i', $title)) {
            $title .= ' - Audio Equipment';
        }
    } elseif (strpos($categoryPath, 'Japanese') !== false) {
        if (!preg_match('/(Japan|Japanese|Traditional)/i', $title)) {
            $title = 'Japanese ' . $title;
        }
    }
    
    return $title;
}

/**
 * カテゴリー判定結果をデータベースに保存
 */
function saveCategoryDetection($itemId, $categoryData) {
    $pdo = getDatabaseConnection();
    if (!$pdo) return false;
    
    try {
        $updateSql = "UPDATE yahoo_scraped_products SET 
                        ebay_category_id = ?,
                        ebay_category_path = ?,
                        category_confidence = ?,
                        auto_generated_title = ?,
                        suggested_item_specifics = ?,
                        category_detection_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                      WHERE source_item_id = ? OR id::text = ?";
        
        $stmt = $pdo->prepare($updateSql);
        $result = $stmt->execute([
            $categoryData['category_id'],
            $categoryData['category_path'],
            $categoryData['confidence'],
            $categoryData['optimized_title'],
            $categoryData['item_specifics'],
            $itemId,
            $itemId
        ]);
        
        if ($result && $stmt->rowCount() > 0) {
            error_log("カテゴリー判定結果保存成功: {$itemId}");
            return true;
        } else {
            error_log("カテゴリー判定結果保存失敗: {$itemId} - 行が更新されませんでした");
            return false;
        }
        
    } catch (Exception $e) {
        error_log("カテゴリー判定結果保存エラー: " . $e->getMessage());
        return false;
    }
}

// メイン処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if ($action === 'detect_category') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $title = $input['title'] ?? '';
    $description = $input['description'] ?? '';
    $condition = $input['condition'] ?? '';
    $price = (float)($input['price'] ?? 0);
    $itemId = $input['item_id'] ?? '';
    
    if (empty($title)) {
        sendResponse(null, false, 'タイトルが必要です');
    }
    
    try {
        // カテゴリー判定実行
        $categoryData = detecteBayCategory($title, $description, $condition, $price);
        
        // データベースに保存（item_idがある場合）
        if (!empty($itemId)) {
            saveCategoryDetection($itemId, $categoryData);
        }
        
        error_log("カテゴリー判定成功: {$title} -> {$categoryData['category_path']} (信頼度: {$categoryData['confidence']}%)");
        
        sendResponse($categoryData, true, 'カテゴリー判定完了');
        
    } catch (Exception $e) {
        error_log("カテゴリー判定エラー: " . $e->getMessage());
        sendResponse(null, false, 'カテゴリー判定エラー: ' . $e->getMessage());
    }
    
} elseif ($action === 'batch_detect') {
    // 一括カテゴリー判定
    $input = json_decode(file_get_contents('php://input'), true);
    $productIds = $input['product_ids'] ?? [];
    
    if (empty($productIds)) {
        sendResponse(null, false, '商品IDが必要です');
    }
    
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        sendResponse(null, false, 'データベース接続エラー');
    }
    
    $results = [];
    $successCount = 0;
    
    foreach ($productIds as $productId) {
        try {
            // 商品データを取得
            $sql = "SELECT source_item_id, active_title, active_description, 
                           price_jpy, (scraped_yahoo_data->>'condition')::text as condition
                    FROM yahoo_scraped_products 
                    WHERE source_item_id = ? OR id::text = ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$productId, $productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($product) {
                $categoryData = detecteBayCategory(
                    $product['active_title'] ?? '',
                    $product['active_description'] ?? '',
                    $product['condition'] ?? '',
                    (float)($product['price_jpy'] ?? 0)
                );
                
                // データベースに保存
                if (saveCategoryDetection($product['source_item_id'], $categoryData)) {
                    $successCount++;
                }
                
                $results[] = [
                    'item_id' => $productId,
                    'category_data' => $categoryData,
                    'success' => true
                ];
            } else {
                $results[] = [
                    'item_id' => $productId,
                    'success' => false,
                    'error' => '商品が見つかりません'
                ];
            }
            
        } catch (Exception $e) {
            $results[] = [
                'item_id' => $productId,
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    sendResponse([
        'processed_count' => count($productIds),
        'success_count' => $successCount,
        'results' => $results
    ], true, "一括カテゴリー判定完了: {$successCount}/" . count($productIds) . "件成功");
    
} else {
    sendResponse(null, false, '不明なアクション: ' . $action);
}
?>