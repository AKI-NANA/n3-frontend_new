<?php
/**
 * Yahoo Auction統合システム - 商品データ編集システム（軽量化・機能復旧版）
 * 07_editing モジュール - メインエントリーポイント
 * 
 * 軽量化復旧版:
 * - 元の動作していた機能をそのまま復旧
 * - 15枚画像対応モーダル機能
 * - 機能カテゴリー別配色
 * - 正しいAPIエンドポイント
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

if (session_status() == PHP_SESSION_NONE) {
    @session_start();
}

$pdo = null;

// データベース接続
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log("editor.php: データベース接続確立済み");
} catch (PDOException $e) {
    error_log("editor.php: データベース接続失敗: " . $e->getMessage());
    $pdo = null;
}

/**
 * JSON レスポンス送信
 */
function sendJsonResponse($data, $success = true, $message = '') {
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache, must-revalidate');
    
    $response = [
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'source' => 'editor.php'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続取得
 */
function getDatabaseConnection() {
    global $pdo;
    if (isset($pdo) && $pdo instanceof PDO) {
        return $pdo;
    }
    
    try {
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $new_pdo = new PDO($dsn, $user, $password);
        $new_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $pdo = $new_pdo;
        return $new_pdo;
        
    } catch (PDOException $e) {
        error_log("データベース接続失敗: " . $e->getMessage());
        return null;
    }
}

/**
 * 未出品データ取得（修正版 - シンプルなクエリ）
 */
function getUnlistedProductsData($page = 1, $limit = 50, $strict = false) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => 'データベース接続エラー'
        ];
    }
    
    try {
        // まずテーブル構造を確認
        $columnCheckSql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products'";
        $columnStmt = $pdo->prepare($columnCheckSql);
        $columnStmt->execute();
        $columns = $columnStmt->fetchAll(PDO::FETCH_COLUMN);
        
        error_log("利用可能なカラム: " . implode(', ', $columns));
        
        // 基本的なWHERE条件
        $whereClause = "WHERE (ebay_item_id IS NULL OR ebay_item_id = '' OR ebay_item_id = '0')";
        
        if ($strict && in_array('active_image_url', $columns)) {
            $whereClause .= " AND active_image_url IS NOT NULL AND active_image_url != ''";
        }
        
        // シンプルなSELECTクエリ（確実に存在するカラムのみ使用）
        $selectFields = [
            'id',
            in_array('source_item_id', $columns) ? 'source_item_id as item_id' : 'id as item_id',
            in_array('active_title', $columns) ? "COALESCE(active_title, 'タイトルなし') as title" : "'タイトルなし' as title",
            in_array('price_jpy', $columns) ? 'price_jpy as price' : '0 as price',
            in_array('active_image_url', $columns) ? "COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url" : "'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image' as picture_url",
            "'N/A' as category_name",
            "'Used' as condition_name",
            "'Yahoo' as platform",
            in_array('updated_at', $columns) ? 'updated_at' : 'created_at as updated_at',
            in_array('ebay_category_id', $columns) ? 'ebay_category_id' : "'' as ebay_category_id",
            in_array('item_specifics', $columns) ? 'item_specifics' : "'' as item_specifics"
        ];
        
        $sql = "SELECT " . implode(', ', $selectFields) . 
               " FROM yahoo_scraped_products " .
               "{$whereClause} " .
               "ORDER BY id DESC " .
               "LIMIT ? OFFSET ?";
        
        $offset = ($page - 1) * $limit;
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総数取得
        $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products {$whereClause}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute();
        $totalResult = $countStmt->fetch();
        
        error_log("データ取得成功: " . count($data) . "件取得");
        
        return [
            'data' => $data,
            'total' => $totalResult['total'] ?? count($data),
            'page' => $page,
            'limit' => $limit,
            'note' => "未出品データ " . count($data) . " 件取得（修正版）",
            'columns_available' => $columns,
            'sql_executed' => $sql
        ];
        
    } catch (Exception $e) {
        error_log("未出品データ取得エラー: " . $e->getMessage());
        
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => "データ取得エラー: {$e->getMessage()}",
            'error' => $e->getMessage()
        ];
    }
}

/**
 * 商品詳細取得（モーダル用）
 */
function getProductDetails($item_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        $sql = "SELECT 
                    id as db_id,
                    source_item_id as item_id,
                    active_title as title,
                    price_jpy as current_price,
                    active_description as description,
                    scraped_yahoo_data,
                    active_image_url,
                    sku,
                    status,
                    current_stock,
                    created_at,
                    updated_at,
                    ebay_category_id,
                    item_specifics,
                    selected_images,
                    shipping_data,
                    html_description,
                    manual_input_data,
                    ebay_listing_data
                FROM yahoo_scraped_products 
                WHERE source_item_id = ? OR id::text = ?
                ORDER BY created_at DESC
                LIMIT 1";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$item_id, $item_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            return [
                'success' => false,
                'message' => "指定された商品が見つかりません: {$item_id}"
            ];
        }
        
        $yahoo_data = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
        
        // 🔴 画像データの処理（15枚対応 - all_images配列から取得）
        $images = [];
        
        // all_imagesフィールドから取得（実データ構造に基づく）
        if (isset($yahoo_data['all_images']) && is_array($yahoo_data['all_images'])) {
            $images = $yahoo_data['all_images'];
        }
        
        // active_image_urlを最初に追加（存在する場合）
        if (!empty($product['active_image_url']) && 
            !strpos($product['active_image_url'], 'placehold')) {
            array_unshift($images, $product['active_image_url']);
        }
        
        // 重複削除（auc-pctrとauctions.c.yimg.jpの違いを考慮）
        $unique_images = [];
        foreach ($images as $img) {
            // URLの正規化
            $normalized = str_replace('https://auc-pctr.c.yimg.jp/i/', '', $img);
            $normalized = str_replace('https://', '', $normalized);
            
            if (!in_array($normalized, array_keys($unique_images))) {
                $unique_images[$normalized] = $img;
            }
        }
        
        $images = array_values($unique_images);
        $images = array_slice($images, 0, 15); // 最大15枚
        
        $product_data = [
            'db_id' => $product['db_id'],
            'item_id' => $product['item_id'],
            'title' => $product['title'] ?? 'タイトル不明',
            'current_price' => (int)($product['current_price'] ?? 0),
            'description' => $product['description'] ?? '',
            'condition' => $yahoo_data['condition'] ?? 'Used',
            'category' => $yahoo_data['category'] ?? 'N/A',
            'images' => $images,
            'source_url' => $yahoo_data['url'] ?? '',
            'ebay_category_id' => $product['ebay_category_id'] ?? '',
            'item_specifics' => $product['item_specifics'] ?? 'Brand=Unknown■Condition=Used',
            'scraped_at' => $product['created_at'] ?? '',
            'sku' => $product['sku'] ?? '',
            'selected_images' => !empty($product['selected_images']) ? json_decode($product['selected_images'], true) : [],
            'shipping_data' => !empty($product['shipping_data']) ? json_decode($product['shipping_data'], true) : [],
            'html_description' => $product['html_description'] ?? '',
            'manual_input_data' => !empty($product['manual_input_data']) ? json_decode($product['manual_input_data'], true) : null,
            'ebay_listing_data' => !empty($product['ebay_listing_data']) ? json_decode($product['ebay_listing_data'], true) : null
        ];
        
        // 🔴 デバッグログ追加
        error_log('[GET PRODUCT] Selected images raw: ' . ($product['selected_images'] ?? 'NULL'));
        error_log('[GET PRODUCT] Shipping data raw: ' . ($product['shipping_data'] ?? 'NULL'));
        error_log('[GET PRODUCT] Selected images decoded: ' . json_encode($product_data['selected_images']));
        error_log('[GET PRODUCT] Shipping data decoded: ' . json_encode($product_data['shipping_data']));
        
        error_log('商品詳細取得成功: ID=' . $item_id . ', 画像数=' . count($images));
        
        return [
            'success' => true,
            'data' => $product_data,
            'message' => '商品詳細取得成功',
            'image_count' => count($images),
            'debug' => [
                'item_id' => $item_id,
                'image_count' => count($images),
                'has_all_images' => isset($yahoo_data['all_images'])
            ]
        ];
        
    } catch (Exception $e) {
        error_log('商品詳細取得エラー: ' . $e->getMessage());
        error_log('SQL: ' . ($sql ?? 'N/A'));
        error_log('Item ID: ' . $item_id);
        
        return [
            'success' => false,
            'message' => '商品詳細取得エラー: ' . $e->getMessage(),
            'debug' => [
                'sql' => $sql ?? 'N/A',
                'item_id' => $item_id,
                'error' => $e->getMessage()
            ]
        ];
    }
}

/**
 * 商品データ保存（タブ別）
 */
function saveProductData($item_id, $tab, $data) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        // 🔴 トランザクション開始
        $pdo->beginTransaction();
        
        // 商品を特定
        $checkSql = "SELECT id FROM yahoo_scraped_products WHERE source_item_id = ? OR id::text = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$item_id, $item_id]);
        $product = $checkStmt->fetch();
        
        if (!$product) {
            return [
                'success' => false,
                'message' => "商品が見つかりません: {$item_id}"
            ];
        }
        
        $db_id = $product['id'];
        
        // 🔴 デバッグログ
        error_log("[SAVE DEBUG] Item ID: {$item_id}");
        error_log("[SAVE DEBUG] DB ID: {$db_id}");
        error_log("[SAVE DEBUG] Tab: {$tab}");
        error_log("[SAVE DEBUG] Data: " . json_encode($data));
        
        // タブ別に保存処理
        switch ($tab) {
            case 'data':
                // 基本情報保存
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    active_title = :title,
                    price_jpy = :price,
                    active_description = :description,
                    updated_at = NOW()
                    WHERE id = :id";
                
                error_log("[SAVE] Executing data tab update for DB ID: {$db_id}");
                error_log("[SAVE] SQL: {$updateSql}");
                error_log("[SAVE] Values: title={$data['title']}, price={$data['price']}");
                
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    ':title' => $data['title'] ?? '',
                    ':price' => $data['price'] ?? 0,
                    ':description' => $data['description'] ?? '',
                    ':id' => $db_id
                ]);
                
                error_log("[SAVE] Rows affected: " . $updateStmt->rowCount());
                break;
                
            case 'images':
                // 画像選択保存（selected_imagesをJSONで保存）
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    selected_images = :selected_images,
                    updated_at = NOW()
                    WHERE id = :id";
                
                $jsonImages = json_encode($data['selected_images'] ?? []);
                error_log("[SAVE] Executing images tab update for DB ID: {$db_id}");
                error_log("[SAVE] Selected images JSON: {$jsonImages}");
                
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    ':selected_images' => $jsonImages,
                    ':id' => $db_id
                ]);
                
                error_log("[SAVE] Rows affected: " . $updateStmt->rowCount());
                break;
                
            case 'listing':
                // 出品情報保存（既存カラム使用）
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    ebay_category_id = :category_id,
                    item_specifics = :item_specifics,
                    sku = :sku,
                    updated_at = NOW()
                    WHERE id = :id";
                
                error_log("[SAVE] Executing listing tab update for DB ID: {$db_id}");
                error_log("[SAVE] Category: {$data['category_id']}, SKU: {$data['sku']}");
                error_log("[SAVE] Item Specifics: {$data['item_specifics']}");
                
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    ':category_id' => $data['category_id'] ?? '',
                    ':item_specifics' => $data['item_specifics'] ?? '',
                    ':sku' => $data['sku'] ?? '',
                    ':id' => $db_id
                ]);
                
                error_log("[SAVE] Rows affected: " . $updateStmt->rowCount());
                break;
                
            case 'shipping':
                // 配送設定保存
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    shipping_data = :shipping_data,
                    updated_at = NOW()
                    WHERE id = :id";
                
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    ':shipping_data' => json_encode($data),
                    ':id' => $db_id
                ]);
                break;
                
            case 'html':
                // HTML保存
                $updateSql = "UPDATE yahoo_scraped_products SET 
                    html_description = :html_description,
                    updated_at = NOW()
                    WHERE id = :id";
                
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    ':html_description' => $data['html_content'] ?? '',
                    ':id' => $db_id
                ]);
                break;
                
            default:
                return [
                    'success' => false,
                    'message' => "不明なタブ: {$tab}"
                ];
        }
        
        // 🔴 トランザクションをコミット
        $pdo->commit();
        error_log("[SAVE] Transaction committed successfully for tab: {$tab}");
        
        return [
            'success' => true,
            'message' => "{$tab}タブのデータを保存しました",
            'db_id' => $db_id,
            'tab' => $tab
        ];
        
    } catch (Exception $e) {
        // 🔴 エラー時はロールバック
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
            error_log("[SAVE] Transaction rolled back due to error");
        }
        
        error_log("商品データ保存エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "保存エラー: {$e->getMessage()}"
        ];
    }
}
function deleteProduct($productId) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        $deleteSql = "DELETE FROM yahoo_scraped_products WHERE id = ?";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->execute([$productId]);
        
        $deletedCount = $deleteStmt->rowCount();
        
        if ($deletedCount > 0) {
            return [
                'success' => true,
                'message' => "商品ID {$productId} を削除しました",
                'deleted_count' => $deletedCount
            ];
        } else {
            return [
                'success' => false,
                'message' => "商品ID {$productId} が見つかりませんでした"
            ];
        }
        
    } catch (Exception $e) {
        error_log("商品削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "商品削除エラー: {$e->getMessage()}"
        ];
    }
}

// API アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    switch ($action) {
        case 'get_unlisted_products':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 50);
            $result = getUnlistedProductsData($page, $limit);
            sendJsonResponse($result, true, $result['note']);
            break;
            
        case 'get_unlisted_products_strict':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 50);
            $result = getUnlistedProductsData($page, $limit, true);
            sendJsonResponse($result, true, $result['note']);
            break;
            
        case 'get_product_details':
            $item_id = $_GET['item_id'] ?? $_POST['item_id'] ?? '';
            if (empty($item_id)) {
                sendJsonResponse(null, false, 'Item IDが指定されていません');
            }
            $result = getProductDetails($item_id);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'save_product_data':
            $item_id = $_POST['item_id'] ?? '';
            $tab = $_POST['tab'] ?? '';
            $data = json_decode($_POST['data'] ?? '{}', true);
            
            if (empty($item_id) || empty($tab)) {
                sendJsonResponse(null, false, 'Item IDまたはTabが指定されていません');
            }
            
            $result = saveProductData($item_id, $tab, $data);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'delete_product':
            $productId = $_POST['product_id'] ?? $_GET['product_id'] ?? '';
            if (empty($productId)) {
                sendJsonResponse(null, false, '商品IDが指定されていません');
            }
            $result = deleteProduct($productId);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'test_connection':
            $pdo = getDatabaseConnection();
            if ($pdo) {
                try {
                    // テーブル存在確認
                    $tableCheckSql = "SELECT table_name FROM information_schema.tables WHERE table_name = 'yahoo_scraped_products'";
                    $tableStmt = $pdo->prepare($tableCheckSql);
                    $tableStmt->execute();
                    $tableExists = $tableStmt->fetch();
                    
                    if ($tableExists) {
                        // レコード数確認
                        $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products";
                        $countStmt = $pdo->prepare($countSql);
                        $countStmt->execute();
                        $count = $countStmt->fetch()['total'];
                        
                        // カラム一覧取得
                        $columnSql = "SELECT column_name FROM information_schema.columns WHERE table_name = 'yahoo_scraped_products' ORDER BY ordinal_position";
                        $columnStmt = $pdo->prepare($columnSql);
                        $columnStmt->execute();
                        $columns = $columnStmt->fetchAll(PDO::FETCH_COLUMN);
                        
                        sendJsonResponse([
                            'database_connection' => 'OK',
                            'table_exists' => true,
                            'total_records' => $count,
                            'columns' => $columns
                        ], true, "データベース接続成功: {$count}件のレコード");
                    } else {
                        sendJsonResponse(null, false, 'テーブル yahoo_scraped_products が存在しません');
                    }
                } catch (Exception $e) {
                    sendJsonResponse(null, false, "テーブル確認エラー: " . $e->getMessage());
                }
            } else {
                sendJsonResponse(null, false, 'データベース接続失敗');
            }
            break;
            
        default:
            sendJsonResponse(null, false, '不明なアクション: ' . $action);
    }
    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - データ編集システム（軽量化復旧版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <!-- 統合出品モーダルCSS（完全版・CSS競合回避） -->
    <link rel="stylesheet" href="modal_system/integrated_modal.css">
    <style>
    :root {
      --accent-navy: #0B1D51;
      --accent-purple: #725CAD;
      --accent-lightblue: #8CCDEB;
      --accent-cream: #FFE3A9;
      
      /* 機能別配色 */
      --color-data-main: #4DA8DA;
      --color-data-strict: #5EABD6;
      --color-data-all: #3674B5;
      --color-function-category: #80D8C3;
      --color-function-profit: #D1F8EF;
      --color-function-shipping: #578FCA;
      --color-manage-filter: #FFD66B;
      --color-manage-approve: #FEFBC7;
      --color-manage-list: #FFB4B4;
      --color-danger-cleanup: #E14434;
      --color-danger-delete: #F39F9F;
      --color-danger-critical: #B95E82;
      --color-utility: #F5F5F5;
      
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --bg-tertiary: #e9ecef;
      --bg-hover: #f1f3f4;
      
      --text-primary: #2c3e50;
      --text-secondary: #6c757d;
      --text-muted: #868e96;
      --text-white: #ffffff;
      
      --border-color: #dee2e6;
      --border-light: #e9ecef;
      
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      
      --radius-sm: 0.375rem;
      --radius-md: 0.5rem;
      --radius-lg: 0.75rem;
      
      --space-1: 0.25rem;
      --space-2: 0.5rem;
      --space-3: 0.75rem;
      --space-4: 1rem;
      
      --transition-fast: all 0.15s ease;
    }

    * { box-sizing: border-box; }

    body {
      font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.4;
      margin: 0;
      padding: 0;
      font-size: 14px;
    }

    .container {
      width: 100%;
      max-width: none;
      margin: 0;
      padding: var(--space-2);
      padding-bottom: 110px;
    }

    .dashboard-header {
      background: linear-gradient(135deg, var(--accent-navy), var(--accent-purple));
      border-radius: var(--radius-lg);
      padding: var(--space-3);
      margin-bottom: var(--space-3);
      color: var(--text-white);
      box-shadow: var(--shadow-md);
    }

    .dashboard-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 var(--space-1) 0;
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .navigation-links {
      display: flex;
      gap: var(--space-2);
      flex-wrap: wrap;
      margin-top: var(--space-2);
    }

    .nav-btn {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 500;
      transition: var(--transition-fast);
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .nav-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-decoration: none;
    }

    .nav-dashboard { background: var(--color-data-main); color: white; }
    .nav-scraping { background: var(--color-function-category); color: var(--text-primary); }
    .nav-approval { background: var(--color-function-profit); color: var(--text-primary); }
    .nav-filters { background: var(--color-manage-filter); color: var(--text-primary); }
    .nav-category { background: var(--color-function-shipping); color: white; }
    .nav-rieki { background: var(--color-manage-approve); color: var(--text-primary); }
    .nav-listing { background: var(--color-manage-list); color: var(--text-primary); }

    .section {
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-3);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .section-header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: var(--space-2) var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 40px;
    }

    .editing-actions {
      padding: var(--space-3);
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
      align-items: center;
    }

    .btn {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
      color: var(--text-primary);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition-fast);
      height: 28px;
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      text-decoration: none;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    /* 機能別ボタン配色 */
    .btn-data-main { background: var(--color-data-main); border-color: var(--color-data-main); color: white; }
    .btn-data-strict { background: var(--color-data-strict); border-color: var(--color-data-strict); color: white; }
    .btn-data-all { background: var(--color-data-all); border-color: var(--color-data-all); color: white; }
    .btn-function-category { background: var(--color-function-category); border-color: var(--color-function-category); color: var(--text-primary); }
    .btn-function-profit { background: var(--color-function-profit); border-color: var(--color-function-profit); color: var(--text-primary); }
    .btn-function-shipping { background: var(--color-function-shipping); border-color: var(--color-function-shipping); color: white; }
    .btn-manage-filter { background: var(--color-manage-filter); border-color: var(--color-manage-filter); color: var(--text-primary); }
    .btn-manage-approve { background: var(--color-manage-approve); border-color: var(--color-manage-approve); color: var(--text-primary); }
    .btn-manage-list { background: var(--color-manage-list); border-color: var(--color-manage-list); color: var(--text-primary); }
    .btn-danger-cleanup { background: var(--color-danger-cleanup); border-color: var(--color-danger-cleanup); color: white; }
    .btn-danger-delete { background: var(--color-danger-delete); border-color: var(--color-danger-delete); color: var(--text-primary); }
    .btn-danger-critical { background: var(--color-danger-critical); border-color: var(--color-danger-critical); color: white; }
    .btn-utility { background: var(--color-utility); border-color: var(--color-utility); color: var(--text-primary); }

    .data-table-container {
      overflow-x: auto;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      margin-bottom: var(--space-3);
    }

    .data-table {
      width: 100%;
      min-width: 1400px;
      border-collapse: collapse;
      font-size: 0.75rem;
      line-height: 1.2;
    }

    .data-table th {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      padding: var(--space-1) var(--space-2);
      text-align: left;
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.7rem;
      height: 28px;
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .data-table td {
      border: 1px solid var(--border-light);
      padding: 1px 2px;
      height: 22px;
      vertical-align: middle;
    }

    .data-table tr:hover {
      background: var(--bg-hover);
    }

    .product-thumbnail {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      transition: var(--transition-fast);
      cursor: pointer;
    }

    .source-badge {
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      font-weight: 600;
      text-align: center;
      border: 1px solid var(--border-color);
    }

    .source-badge.source-yahoo { 
      background: var(--accent-navy); 
      color: var(--text-white);
      border-color: var(--accent-navy);
    }

    .price-value {
      font-weight: 600;
      color: #28a745;
      font-size: 0.75rem;
    }

    .action-buttons {
      display: flex;
      gap: 2px;
    }

    .btn-sm {
      padding: 2px var(--space-1);
      font-size: 0.7rem;
      height: 24px;
    }

    /* モーダル関連 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    }

    .modal-content {
      background: var(--bg-primary);
      border-radius: 12px;
      padding: 2rem;
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      position: relative;
    }
    
    /* 🔴 画像ギャラリー用CSS */
    .thumbnail-container::-webkit-scrollbar {
      height: 6px;
    }
    
    .thumbnail-container::-webkit-scrollbar-thumb {
      background: #725CAD;
      border-radius: 3px;
    }
    
    .thumbnail-image:hover {
      border-color: #725CAD !important;
      transform: scale(1.05);
      transition: all 0.2s ease;
    }
    
    .thumbnail-image.active {
      box-shadow: 0 0 8px rgba(114, 92, 173, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
      padding: 0.25rem;
    }

    .modal-close:hover {
      color: var(--color-danger-cleanup);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--accent-purple);
      box-shadow: 0 0 0 2px rgba(114, 92, 173, 0.2);
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .log-area {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px;
      background: #1a1a1a;
      border-top: 2px solid #333;
      z-index: 1000;
      overflow-y: auto;
      padding: var(--space-2);
      font-family: 'Courier New', monospace;
      font-size: 0.7rem;
      line-height: 1.3;
      color: #00ff00;
    }

    .log-area h4 {
      margin: 0 0 var(--space-1) 0;
      font-size: 0.8rem;
      color: #ffffff;
      font-weight: 600;
      border-bottom: 1px solid #333;
      padding-bottom: 2px;
    }

    .log-entry {
      padding: 1px 0;
      color: #00ff00;
      font-family: 'Courier New', monospace;
    }

    .log-entry.success { color: #00ff41; }
    .log-entry.error { color: #ff4444; }
    .log-entry.info { color: #44aaff; }
    .log-entry.warning { color: #ffaa44; }

    @media (max-width: 768px) {
      .editing-actions, .navigation-links {
        flex-direction: column;
        align-items: stretch;
      }
      
      .info-row {
        grid-template-columns: 1fr;
      }
      
      .log-area {
        height: 60px;
      }
      
      .container {
        padding-bottom: 70px;
      }
    }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-dashboard">
            <!-- ナビゲーションヘッダー -->
            <div class="dashboard-header">
                <h1><i class="fas fa-edit"></i> Yahoo オークションデータ編集システム</h1>
                <p>軽量化復旧版 - 元の機能を軽量化して復旧・機能別配色対応</p>
                
                <!-- ナビゲーション -->
                <div class="navigation-links">
                    <a href="../01_dashboard/dashboard.php" class="nav-btn nav-dashboard">
                        <i class="fas fa-home"></i> ダッシュボード
                    </a>
                    <a href="../02_scraping/scraping.php" class="nav-btn nav-scraping">
                        <i class="fas fa-spider"></i> データ取得
                    </a>
                    <a href="../03_approval/approval.php" class="nav-btn nav-approval">
                        <i class="fas fa-check-circle"></i> 商品承認
                    </a>
                    <a href="../05_rieki/riekikeisan.php" class="nav-btn nav-rieki">
                        <i class="fas fa-calculator"></i> 利益計算
                    </a>
                    <a href="../06_filters/filters.php" class="nav-btn nav-filters">
                        <i class="fas fa-filter"></i> フィルター管理
                    </a>
                    <a href="../08_listing/listing.php" class="nav-btn nav-listing">
                        <i class="fas fa-store"></i> 出品管理
                    </a>
                    <a href="../11_category/frontend/ebay_category_tool.php" class="nav-btn nav-category">
                        <i class="fas fa-tags"></i> カテゴリー判定
                    </a>
                </div>
            </div>

            <!-- 操作パネル（機能別配色） -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-tools"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0;">操作パネル</h3>
                </div>
                <div class="editing-actions">
                    <!-- データ表示グループ -->
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-utility" onclick="testConnection()">
                            <i class="fas fa-plug"></i> 接続テスト
                        </button>
                        <button class="btn btn-data-main" onclick="loadEditingData()">
                            <i class="fas fa-database"></i> 未出品データ表示
                        </button>
                        <button class="btn btn-data-strict" onclick="loadEditingDataStrict()">
                            <i class="fas fa-filter"></i> 厳密モード（URL有）
                        </button>
                        <button class="btn btn-data-all" onclick="loadAllData()">
                            <i class="fas fa-list"></i> 全データ表示
                        </button>
                    </div>
                    
                    <!-- 機能実行グループ -->
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-function-category" onclick="getCategoryData()">
                            <i class="fas fa-tags"></i> カテゴリー取得
                        </button>
                        <button class="btn btn-function-profit" onclick="calculateProfit()">
                            <i class="fas fa-calculator"></i> 利益計算
                        </button>
                        <button class="btn btn-function-shipping" onclick="calculateShipping()">
                            <i class="fas fa-shipping-fast"></i> 送料計算
                        </button>
                    </div>
                    
                    <!-- 管理操作グループ -->
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-manage-filter" onclick="applyFilters()">
                            <i class="fas fa-filter"></i> フィルター適用
                        </button>
                        <button class="btn btn-manage-approve" onclick="bulkApprove()">
                            <i class="fas fa-check-double"></i> 一括承認
                        </button>
                        <button class="btn btn-manage-list" onclick="listProducts()">
                            <i class="fas fa-store"></i> 出品
                        </button>
                    </div>
                    
                    <!-- 削除・ユーティリティ -->
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-danger-cleanup" onclick="cleanupDummyData()">
                            <i class="fas fa-broom"></i> ダミーデータ削除
                        </button>
                        <button class="btn btn-danger-delete" onclick="deleteSelectedProducts()">
                            <i class="fas fa-trash-alt"></i> 選択削除
                        </button>
                        <button class="btn btn-utility" onclick="downloadEditingCSV()">
                            <i class="fas fa-download"></i> CSV出力
                        </button>
                    </div>
                </div>
            </div>

            <!-- データテーブル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-table"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0;">商品データ一覧（軽量化版）</h3>
                </div>
                <div class="data-table-container">
                    <table class="data-table" id="editingDataTable">
                        <thead>
                            <tr>
                                <th style="width: 40px;">
                                    <input type="checkbox" id="selectAll" onchange="toggleSelectAll()">
                                </th>
                                <th style="width: 80px;">画像</th>
                                <th style="width: 120px;">Item ID</th>
                                <th style="width: 250px;">商品名</th>
                                <th style="width: 80px;">価格</th>
                                <th style="width: 100px;">カテゴリ</th>
                                <th style="width: 140px;">eBayカテゴリー</th>
                                <th style="width: 80px;">状態</th>
                                <th style="width: 80px;">ソース</th>
                                <th style="width: 100px;">更新日時</th>
                                <th style="width: 200px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="editingTableBody">
                            <tr>
                                <td colspan="11" style="text-align: center; padding: var(--space-4);">
                                    <i class="fas fa-play-circle" style="font-size: 2rem; color: var(--accent-lightblue); margin-bottom: var(--space-2);"></i><br>
                                    <strong>「未出品データ表示」ボタンをクリックしてデータを表示してください</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <!-- 商品詳細モーダル（15枚画像対応） -->
    <div id="productModal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-edit"></i>
                    商品詳細編集
                </h2>
                <button class="modal-close" onclick="closeProductModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="modalBody">
                <div style="text-align: center; padding: 2rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><br>
                    データを読み込み中...
                </div>
            </div>
        </div>
    </div>

    <!-- ログエリア（下部固定） -->
    <div class="log-area">
        <h4><i class="fas fa-terminal"></i> システムログ</h4>
        <div id="logContainer">
            <div class="log-entry info">[待機中] システム準備完了 - 軽量化復旧版</div>
        </div>
    </div>

    <script>
    console.log('✅ Yahoo Auction編集システム - 軽量化復旧版初期化開始');
    
    let currentData = [];

    // ログエントリー追加
    function addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            const entry = document.createElement('div');
            entry.className = `log-entry ${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logContainer.appendChild(entry);
            logContainer.scrollTop = logContainer.scrollHeight;
            
            const entries = logContainer.querySelectorAll('.log-entry');
            if (entries.length > 100) {
                entries[0].remove();
            }
        }
    }

    // 接続テスト関数
    function testConnection() {
        addLogEntry('データベース接続テスト開始...', 'info');
        
        fetch('?action=test_connection')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    addLogEntry(`✅ 接続成功: ${data.data.total_records}件のレコード`, 'success');
                    addLogEntry(`ℹ️ カラム数: ${data.data.columns.length}個`, 'info');
                    console.log('利用可能なカラム:', data.data.columns);
                } else {
                    addLogEntry(`❌ 接続失敗: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                addLogEntry(`❌ 接続エラー: ${error.message}`, 'error');
                console.error('接続テストエラー:', error);
            });
    }

    // 未出品データ読み込み（元の動作版）
    function loadEditingData() {
        addLogEntry('未出品データ読み込み開始...', 'info');
        
        fetch('?action=get_unlisted_products&page=1&limit=100')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('API Response:', data);
                if (data.success) {
                    const products = data.data.data || [];
                    currentData = products;
                    displayEditingData(products);
                    addLogEntry(`未出品データ ${data.data.total || 0} 件読み込み完了`, 'success');
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                console.error('データ読み込みエラー:', error);
                addLogEntry(`データ読み込みエラー: ${error.message}`, 'error');
            });
    }

    // 厳密モードデータ読み込み
    function loadEditingDataStrict() {
        addLogEntry('厳密モード（URL有）データ読み込み開始...', 'info');
        
        fetch('?action=get_unlisted_products_strict&page=1&limit=100')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentData = data.data.data || [];
                    displayEditingData(currentData);
                    addLogEntry(`厳密モードデータ ${data.data.total || 0} 件読み込み完了`, 'success');
                } else {
                    throw new Error(data.message);
                }
            })
            .catch(error => {
                console.error('データ読み込みエラー:', error);
                addLogEntry(`データ読み込みエラー: ${error.message}`, 'error');
            });
    }

    // 全データ読み込み（プレースホルダー）
    function loadAllData() {
        addLogEntry('全データ表示機能は実装予定です', 'info');
    }

    // データテーブル表示（修正版）
    function displayEditingData(products) {
        const tableBody = document.getElementById('editingTableBody');
        
        console.log('Displaying products:', products);
        
        if (!products || products.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align: center; padding: var(--space-4);">
                        <i class="fas fa-info-circle" style="color: var(--accent-lightblue);"></i>
                        データが見つかりませんでした
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = products.map(product => {
            const imageUrl = getValidImageUrl(product.picture_url);
            const itemId = product.item_id || product.id;
            const title = product.title || 'タイトルなし';
            const price = product.price || 0;
            const categoryName = product.category_name || 'N/A';
            const conditionName = product.condition_name || 'N/A';
            const platform = product.platform || 'Yahoo';
            const updatedAt = product.updated_at;
            const ebayCategory = product.ebay_category_id || '未設定';
            
            return `
                <tr data-product-id="${product.id}">
                    <td>
                        <input type="checkbox" class="product-checkbox" value="${product.id}" onchange="updateSelectedCount()">
                    </td>
                    <td>
                        <img src="${imageUrl}" 
                             alt="商品画像" 
                             class="product-thumbnail"
                             onclick="openProductModal('${itemId}')"
                             onerror="this.src='https://placehold.co/60x60/725CAD/FFFFFF/png?text=No+Image'"
                             onload="this.style.opacity=1"
                             style="cursor: pointer; opacity: 0; transition: opacity 0.3s ease;">
                    </td>
                    <td style="font-size: 0.7rem;">${itemId}</td>
                    <td style="font-size: 0.7rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis;">
                        ${title}
                    </td>
                    <td class="price-value">¥${price.toLocaleString()}</td>
                    <td style="font-size: 0.7rem;">${categoryName}</td>
                    <td style="font-size: 0.7rem;">${ebayCategory}</td>
                    <td style="font-size: 0.7rem;">${conditionName}</td>
                    <td>
                        <span class="source-badge source-yahoo">${platform}</span>
                    </td>
                    <td style="font-size: 0.65rem;">${formatDate(updatedAt)}</td>
                    <td class="action-buttons">
                        <button class="btn-sm btn-function-category" onclick="editProduct('${product.id}')" title="編集">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-sm btn-function-profit" onclick="approveProduct('${product.id}')" title="承認">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-sm btn-danger-delete" onclick="deleteProduct('${product.id}')" title="削除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        addLogEntry(`テーブル表示完了: ${products.length}件`, 'success');
    }

    // 🔴 統合モーダルを開く（IntegratedListingModal.open()を使用）
    function openProductModal(itemId) {
        addLogEntry(`商品 ${itemId} の統合モーダルを表示開始`, 'info');
        
        // IntegratedListingModalが存在することを確認
        if (typeof IntegratedListingModal !== 'undefined') {
            IntegratedListingModal.open(itemId);
            addLogEntry(`✅ 統合モーダル表示完了: ${itemId}`, 'success');
        } else {
            addLogEntry('❌ IntegratedListingModalが読み込まれていません', 'error');
            console.error('IntegratedListingModal is not defined');
        }
    }
    
    // モーダルを動的に作成（存在しない場合）
    function createProductModalDynamically() {
        const modalHtml = `
            <div id="productModal" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">
                            <i class="fas fa-edit"></i>
                            商品詳細編集
                        </h2>
                        <button class="modal-close" onclick="closeProductModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="modalBody">
                        <div style="text-align: center; padding: 2rem;">
                            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i><br>
                            データを読み込み中...
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        addLogEntry('✅ モーダルを動的作成しました', 'success');
    }

    // モーダルコンテンツ表示（15枚画像ギャラリー対応）
    function displayProductModalContent(productData) {
        const modalBody = document.getElementById('modalBody');
        
        if (!modalBody) {
            addLogEntry('❌ modalBodyが見つかりません', 'error');
            return;
        }
        
        addLogEntry(`モーダル内容表示: ${productData.title} - 画像${productData.images?.length || 0}枚`, 'success');
        console.log('Product Data for Modal:', productData);
        
        // 🔴 15枚画像ギャラリーHTML生成
        let imageGalleryHtml = '';
        
        if (productData.images && productData.images.length > 0) {
            const mainImage = productData.images[0];
            const thumbnails = productData.images.map((img, index) => `
                <img src="${img}" 
                     class="thumbnail-image ${index === 0 ? 'active' : ''}"
                     data-index="${index}"
                     onclick="changeMainImage('${img.replace(/'/g, "\\'")}', ${index})"
                     style="width: 60px; height: 60px; object-fit: cover; 
                            cursor: pointer; border: 2px solid ${index === 0 ? '#725CAD' : '#ddd'}; 
                            border-radius: 4px; transition: all 0.2s ease;"
                     onmouseover="this.style.transform='scale(1.05)'"
                     onmouseout="this.style.transform='scale(1)'">
            `).join('');
            
            imageGalleryHtml = `
                <div class="image-gallery" style="margin-bottom: 1rem;">
                    <div class="main-image-container" style="width: 100%; height: 300px; 
                         display: flex; align-items: center; justify-content: center; 
                         background: #f8f9fa; border-radius: 6px; margin-bottom: 0.5rem;">
                        <img id="mainImage" src="${mainImage}" 
                             style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    <div class="thumbnail-container" style="display: flex; gap: 5px; 
                         overflow-x: auto; padding: 5px 0;">
                        ${thumbnails}
                    </div>
                    <div class="image-counter" style="margin-top: 5px; 
                         font-size: 0.9rem; color: #6c757d; text-align: center;">
                        画像: 1 / ${productData.images.length}
                    </div>
                </div>
            `;
        } else {
            imageGalleryHtml = `
                <div style="width: 100%; height: 200px; background: #f8f9fa; 
                     display: flex; align-items: center; justify-content: center; 
                     border-radius: 6px; margin-bottom: 1rem;">
                    <i class="fas fa-image" style="font-size: 2rem; color: #6c757d;"></i>
                </div>
            `;
        }
        
        modalBody.innerHTML = `
            <div style="margin-bottom: 1rem;">
                ${imageGalleryHtml}
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">Item ID</label>
                    <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; background: #f8f9fa;" value="${productData.item_id || ''}" readonly>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">データベースID</label>
                    <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; background: #f8f9fa;" value="${productData.db_id || productData.id || ''}" readonly>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">SKU</label>
                    <input type="text" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; background: #f8f9fa;" value="${productData.sku || 'N/A'}" readonly>
                </div>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品名</label>
                <input type="text" id="productTitle" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" value="${escapeHtml(productData.title || '')}">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">価格（円）</label>
                    <input type="number" id="productPrice" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" value="${productData.current_price || 0}" min="0">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">状態</label>
                    <select id="productCondition" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="新品" ${productData.condition === '新品' ? 'selected' : ''}>新品</option>
                        <option value="未使用に近い" ${productData.condition === '未使用に近い' ? 'selected' : ''}>未使用に近い</option>
                        <option value="目立った傷や汚れなし" ${productData.condition === '目立った傷や汚れなし' ? 'selected' : ''}>目立った傷や汚れなし</option>
                        <option value="やや傷や汚れあり" ${productData.condition === 'やや傷や汚れあり' ? 'selected' : ''}>やや傷や汚れあり</option>
                        <option value="傷や汚れあり" ${productData.condition === '傷や汚れあり' ? 'selected' : ''}>傷や汚れあり</option>
                        <option value="全体的に状態が悪い" ${productData.condition === '全体的に状態が悪い' ? 'selected' : ''}>全体的に状態が悪い</option>
                    </select>
                </div>
            </div>

            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">商品説明</label>
                <textarea id="productDescription" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" rows="4">${escapeHtml(productData.description || '')}</textarea>
            </div>

            <div style="display: flex; gap: 0.5rem; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid #dee2e6;">
                <button class="btn" onclick="closeProductModal()" style="background: #6c757d; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-times"></i> 閉じる
                </button>
                <button class="btn" onclick="saveProductChanges('${productData.item_id}')" style="background: #28a745; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-save"></i> 保存
                </button>
                <button class="btn" onclick="openCategoryTool('${productData.item_id}')" style="background: #007bff; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-tags"></i> カテゴリー判定
                </button>
                <button class="btn" onclick="deleteProductFromModal('${productData.db_id || productData.id}')" style="background: #dc3545; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i> 削除
                </button>
            </div>
        `;
        
        addLogEntry('✅ モーダル内容表示完了', 'success');
    }

    // モーダルを閉じる
    function closeProductModal() {
        document.getElementById('productModal').style.display = 'none';
    }

    // モーダルエラー表示
    function showModalError(message) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; border: 1px solid #f5c6cb;">
                <i class="fas fa-exclamation-triangle"></i>
                ${escapeHtml(message)}
            </div>
            <div class="modal-actions">
                <button class="btn btn-utility" onclick="closeProductModal()">
                    <i class="fas fa-times"></i> 閉じる
                </button>
            </div>
        `;
    }

    // HTMLエスケープ
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
    
    // 🔴 メイン画像切り替え関数（15枚画像ギャラリー用）
    function changeMainImage(imageSrc, index) {
        const mainImage = document.getElementById('mainImage');
        if (mainImage) {
            mainImage.src = imageSrc;
        }
        
        // サムネイルのアクティブ状態更新
        document.querySelectorAll('.thumbnail-image').forEach((thumb, i) => {
            thumb.style.border = i === index ? '2px solid #725CAD' : '2px solid #ddd';
            if (i === index) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
        
        // 画像カウンター更新
        const counter = document.querySelector('.image-counter');
        if (counter) {
            const total = document.querySelectorAll('.thumbnail-image').length;
            counter.textContent = `画像: ${index + 1} / ${total}`;
        }
        
        addLogEntry(`画像 ${index + 1} に切り替え`, 'info');
    }

    // カテゴリーツールを開く
    function openCategoryTool(itemId) {
        const categoryToolUrl = `../11_category/frontend/ebay_category_tool.php?item_id=${encodeURIComponent(itemId)}&source=editing_modal`;
        window.open(categoryToolUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        addLogEntry(`カテゴリー判定ツールを開きました: ${itemId}`, 'info');
    }

    // 画像URL検証
    function getValidImageUrl(url) {
        if (!url || url.includes('placehold')) {
            return 'https://placehold.co/60x60/725CAD/FFFFFF/png?text=No+Image';
        }
        return url;
    }

    // 日付フォーマット
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'N/A';
        }
    }

    // 商品操作（プレースホルダー）
    function getCategoryData() { addLogEntry('カテゴリー取得機能は実装予定です', 'info'); }
    function calculateProfit() { addLogEntry('利益計算機能は実装予定です', 'success'); }
    function calculateShipping() { addLogEntry('送料計算機能は実装予定です', 'info'); }
    function applyFilters() { addLogEntry('フィルター適用機能は実装予定です', 'info'); }
    function bulkApprove() { addLogEntry('一括承認機能は実装予定です', 'success'); }
    function listProducts() { addLogEntry('出品機能は実装予定です', 'warning'); }
    function cleanupDummyData() { addLogEntry('ダミーデータ削除機能は実装予定です', 'info'); }
    function deleteSelectedProducts() { addLogEntry('選択削除機能は実装予定です', 'warning'); }
    function downloadEditingCSV() { addLogEntry('CSV出力機能は実装予定です', 'info'); }
    function editProduct(productId) { addLogEntry(`商品 ${productId} の編集を開始`, 'info'); }
    function approveProduct(productId) { addLogEntry(`商品 ${productId} を承認しました`, 'success'); }
    function deleteProduct(productId) { addLogEntry(`商品 ${productId} の削除機能は実装予定です`, 'warning'); }
    function saveProductChanges(itemId) { addLogEntry(`商品 ${itemId} の保存機能は実装予定です`, 'info'); }
    function deleteProductFromModal(productId) { addLogEntry(`商品 ${productId} のモーダル削除機能は実装予定です`, 'warning'); }
    function toggleSelectAll() { addLogEntry('全選択機能は実装予定です', 'info'); }
    function updateSelectedCount() { /* プレースホルダー */ }

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });

    // モーダル外クリックで閉じる
    document.getElementById('productModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeProductModal();
        }
    });

    // 初期化完了
    document.addEventListener('DOMContentLoaded', function() {
        addLogEntry('軽量化復旧版初期化完了 - 元の機能を軽量化して復旧', 'success');
        console.log('✅ Yahoo Auction編集システム - 軽量化復旧版初期化完了');
    });
    </script>

    <!-- 統合出品モーダルHTML（完全版） -->
    <?php include 'modal_system/integrated_modal.html'; ?>

    <!-- 統合出品モーダルJavaScript（完全版・データベース連携対応） -->
    <script src="modal_system/integrated_modal_full.js"></script>
    
    <!-- 🔴 APIレスポンスの二重ネスト修正パッチ -->
    <script src="modal_system/fix_api_nesting.js"></script>
    
    <!-- 💾 タブ別保存機能 -->
    <script src="modal_system/save_functions.js"></script>
    
    <!-- 💾 保存済みデータロード -->
    <script src="modal_system/load_saved_data.js"></script>
    
    <!-- マーケットプレイス関数（Shopee/Amazon Global/Coupang） -->
    <script src="modal_system/marketplace_functions.js"></script>
    
    <!-- タブ切り替え修正 -->
    <script src="modal_system/fix_tab_switch.js"></script>
    
    <!-- デバッグスクリプト（開発時のみ） -->
    <script src="modal_system/debug_marketplace_switch.js"></script>
    <script src="modal_system/debug_tab_switch.js"></script>
    
    <!-- 🔴 ツール実行機能 -->
    <script src="modal_system/tool_execution.js"></script>
    
    <!-- 🆕 新しい機能追加 -->
    <!-- タブ表示緊急修正CSS -->
    <link rel="stylesheet" href="modal_system/tab_display_fix.css">
    
    <!-- 緊急タブ修正JS -->
    <script src="modal_system/emergency_tab_fix.js"></script>
    
    <!-- データ自動入力修正 -->
    <script src="modal_system/data_autofill_fix.js"></script>
    
    <!-- eBay自動翻訳・価格変換 -->
    <script src="modal_system/ebay_autofill.js"></script>
    
    <!-- SellerMirrorデータ継承 -->
    <script src="modal_system/sellermirror_inheritance.js"></script>
    
    <!-- 🆕 SellerMirror実装API連携 -->
    <script src="modal_system/sellermirror_real_api.js"></script>
    
    <!-- 🆕 SellerMirror拡張表示システム -->
    <script src="modal_system/sellermirror_enhanced_display.js"></script>
    
    <!-- 🖼️ 画像選択保存修正 -->
    <script src="modal_system/image_selection_fix.js"></script>
    
    <!-- 🆕 包括的自動入力システム -->
    <script src="modal_system/comprehensive_autofill.js"></script>
    
    <!-- 🔗 ナビゲーション機能修正 -->
    <script src="modal_system/navigation_fix.js"></script>
    
    <!-- 🔴 SellerMirror表示強制パッチ（最後に読み込み） -->
    <script src="modal_system/sellermirror_display_force_patch.js"></script>
    
    <!-- 💰 SellerMirrorデバッグ＆利益計算パッチ -->
    <script src="modal_system/sellermirror_debug_profit_patch.js"></script>
    
    <!-- 🅰️ SellerMirrorタイトル表示改善 -->
    <script src="modal_system/sellermirror_title_enhancement.js"></script>
    
    <!-- 🖼️ SellerMirror画像表示修正 -->
    <script src="modal_system/sellermirror_image_fix.js"></script>
    
    <!-- 🔍 SellerMirror画像デバッグツール -->
    <script src="modal_system/sellermirror_image_debug.js"></script>
    
    <!-- 🎨 SellerMirror Canvas画像生成 -->
    <script src="modal_system/sellermirror_canvas_image.js"></script>
</body>
</html>