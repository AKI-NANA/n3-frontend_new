<?php
/**
 * 商品データ保存API（簡易版）
 * IntegratedListingModal用データベース保存エンドポイント
 */

// CORS設定
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'POSTメソッドが必要です'], JSON_UNESCAPED_UNICODE);
    exit;
}

// エラーロギング
error_log("🔴 [SAVE API] === Request Start ===");

try {
    // データベース接続（直接接続）
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    error_log("🔴 [SAVE API] Database connected");
    
    // JSON入力取得
    $input = file_get_contents('php://input');
    error_log("🔴 [SAVE API] Raw input: " . substr($input, 0, 500));
    
    $data = json_decode($input, true);
    
    if ($data === null) {
        throw new Exception('JSONパースエラー: ' . json_last_error_msg());
    }
    
    // 必須パラメータチェック
    if (empty($data['item_id'])) {
        throw new Exception('item_idが必要です');
    }
    
    if (empty($data['tab'])) {
        throw new Exception('tabが必要です');
    }
    
    $itemId = $data['item_id'];
    $tab = $data['tab'];
    $saveData = $data['data'] ?? [];
    
    error_log("🔴 [SAVE API] item_id: {$itemId}, tab: {$tab}");
    
    // item_idまたはidでレコード検索
    $findSql = "SELECT id FROM yahoo_scraped_products 
                WHERE source_item_id = :item_id OR id::text = :item_id 
                LIMIT 1";
    $findStmt = $pdo->prepare($findSql);
    $findStmt->execute([':item_id' => $itemId]);
    $record = $findStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$record) {
        throw new Exception("商品が見つかりません (item_id: {$itemId})");
    }
    
    $db_id = $record['id'];
    error_log("🔴 [SAVE API] Found record with db_id: {$db_id}");
    
    // タブ別保存処理
    $updateSql = '';
    $params = [':id' => $db_id];
    
    switch ($tab) {
        case 'data':
            // データ確認タブ: 基本情報 + 手動入力データ
            $manualData = [
                'weight' => $saveData['manual_weight'] ?? null,
                'cost' => $saveData['manual_cost'] ?? null,
                'dimensions' => [
                    'length' => $saveData['manual_length'] ?? null,
                    'width' => $saveData['manual_width'] ?? null,
                    'height' => $saveData['manual_height'] ?? null
                ]
            ];
            
            $updateSql = "UPDATE yahoo_scraped_products SET 
                active_title = :title,
                price_jpy = :price,
                active_description = :description,
                sku = :sku,
                manual_input_data = :manual_data::jsonb,
                updated_at = NOW()
                WHERE id = :id";
            
            $params[':title'] = $saveData['title'] ?? '';
            $params[':price'] = intval($saveData['price'] ?? 0);
            $params[':description'] = $saveData['description'] ?? '';
            $params[':sku'] = $saveData['sku'] ?? '';
            $params[':manual_data'] = json_encode($manualData, JSON_UNESCAPED_UNICODE);
            
            error_log("🔴 [SAVE API] Data tab - title: " . $params[':title']);
            break;
            
        case 'images':
            // 画像選択タブ: 選択画像URLの配列を保存
            $selectedImages = $saveData['selected_images'] ?? [];
            
            $updateSql = "UPDATE yahoo_scraped_products SET 
                selected_images = :selected_images::jsonb,
                updated_at = NOW()
                WHERE id = :id";
            
            $params[':selected_images'] = json_encode($selectedImages, JSON_UNESCAPED_UNICODE);
            
            error_log("🔴 [SAVE API] Images tab - count: " . count($selectedImages));
            break;
            
        case 'listing':
            // 出品情報タブ: ebay_listing_dataに保存
            $listingData = $saveData;
            
            // カテゴリIDは個別カラムにも保存
            if (!empty($saveData['ebay_category_id'])) {
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    ebay_category_id = :category_id,
                    ebay_listing_data = :listing_data::jsonb,
                    updated_at = NOW()
                    WHERE id = :id";
                
                $params[':category_id'] = $saveData['ebay_category_id'];
            } else {
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    ebay_listing_data = :listing_data::jsonb,
                    updated_at = NOW()
                    WHERE id = :id";
            }
            
            $params[':listing_data'] = json_encode($listingData, JSON_UNESCAPED_UNICODE);
            
            error_log("🔴 [SAVE API] Listing tab update");
            break;
            
        case 'shipping':
            // 配送設定タブ: shipping_dataに保存
            $shippingData = $saveData;
            
            $updateSql = "UPDATE yahoo_scraped_products SET 
                shipping_data = :shipping_data::jsonb,
                updated_at = NOW()
                WHERE id = :id";
            
            $params[':shipping_data'] = json_encode($shippingData, JSON_UNESCAPED_UNICODE);
            
            error_log("🔴 [SAVE API] Shipping tab update");
            break;
            
        case 'html':
            // HTMLタブ: html_descriptionに保存
            $htmlDescription = $saveData['html_description'] ?? '';
            
            $updateSql = "UPDATE yahoo_scraped_products SET 
                html_description = :html_description,
                updated_at = NOW()
                WHERE id = :id";
            
            $params[':html_description'] = $htmlDescription;
            
            error_log("🔴 [SAVE API] HTML tab - length: " . strlen($htmlDescription));
            break;
            
        default:
            throw new Exception("不明なタブ: {$tab}");
    }
    
    // SQL実行
    error_log("🔴 [SAVE API] Executing SQL: " . $updateSql);
    $updateStmt = $pdo->prepare($updateSql);
    $result = $updateStmt->execute($params);
    
    if ($result) {
        $affectedRows = $updateStmt->rowCount();
        error_log("🔴 [SAVE API] Update successful - affected rows: {$affectedRows}");
        
        echo json_encode([
            'success' => true,
            'message' => "{$tab}タブのデータを保存しました",
            'data' => [
                'item_id' => $itemId,
                'db_id' => $db_id,
                'tab' => $tab,
                'affected_rows' => $affectedRows
            ]
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('データベース更新失敗');
    }
    
} catch (PDOException $e) {
    error_log("🔴 [SAVE API] PDO Error: " . $e->getMessage());
    error_log("🔴 [SAVE API] Stack trace: " . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'message' => 'データベースエラー: ' . $e->getMessage(),
        'error_type' => 'PDOException'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("🔴 [SAVE API] Error: " . $e->getMessage());
    error_log("🔴 [SAVE API] Stack trace: " . $e->getTraceAsString());
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_type' => 'Exception'
    ], JSON_UNESCAPED_UNICODE);
}

error_log("🔴 [SAVE API] === Request End ===");
?>
