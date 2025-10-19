<?php
/**
 * 個別商品の詳細情報取得（Emergency Parser用・改善版）
 */
function getProductDetails($item_id) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        error_log("getProductDetails: データベース接続失敗");
        return [
            'success' => false,
            'message' => 'データベースに接続できません'
        ];
    }
    
    try {
        error_log("getProductDetails: 商品詳細取得開始 - item_id: {$item_id}");
        
        // 正確なマッチングで検索（source_item_id または id）
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
                    updated_at
                FROM yahoo_scraped_products 
                WHERE source_item_id = ? OR id::text = ?
                ORDER BY created_at DESC
                LIMIT 1";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$item_id, $item_id]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$product) {
            error_log("getProductDetails: 商品が見つからない - {$item_id}");
            
            // 部分一致で検索を試行
            $partialSql = "SELECT 
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
                            updated_at
                        FROM yahoo_scraped_products 
                        WHERE source_item_id LIKE ? OR active_title LIKE ?
                        ORDER BY created_at DESC
                        LIMIT 1";
            
            $partialStmt = $pdo->prepare($partialSql);
            $partialStmt->execute(["%{$item_id}%", "%{$item_id}%"]);
            $product = $partialStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$product) {
                return [
                    'success' => false,
                    'message' => "指定された商品が見つかりません: {$item_id}"
                ];
            } else {
                error_log("getProductDetails: 部分一致で発見 - {$product['item_id']}");
            }
        } else {
            error_log("getProductDetails: 商品発見 - {$product['item_id']}: {$product['title']}");
        }
        
        // JSONデータをデコード
        $yahoo_data = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
        
        // Emergency Parser形式に変換
        $product_data = [
            'item_id' => $product['item_id'],
            'title' => $product['title'] ?? 'タイトル不明',
            'current_price' => (int)($product['current_price'] ?? 0),
            'description' => $product['description'] ?? '',
            'condition' => $yahoo_data['condition'] ?? 'N/A',
            'category' => $yahoo_data['category'] ?? 'N/A',
            'images' => [],
            'source_url' => $yahoo_data['url'] ?? '',
            'scraped_at' => $product['created_at'] ?? '',
            'data_quality' => 85,
            'scraping_method' => $yahoo_data['scraping_method'] ?? 'Emergency Parser',
            'sku' => $product['sku'] ?? '',
            'status' => $product['status'] ?? 'scraped',
            'stock' => $product['current_stock'] ?? 1,
            'db_id' => $product['db_id']
        ];
        
        // 画像データの抽出
        if (!empty($product['active_image_url']) && !strpos($product['active_image_url'], 'placehold')) {
            $product_data['images'] = [$product['active_image_url']];
        }
        
        error_log("getProductDetails: 変換完了 - {$product_data['title']} (価格: ¥{$product_data['current_price']})");
        
        return [
            'success' => true,
            'data' => $product_data,
            'message' => '商品詳細取得成功'
        ];
        
    } catch (Exception $e) {
        error_log('商品詳細取得エラー: ' . $e->getMessage());
        return [
            'success' => false,
            'message' => '商品詳細取得エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 商品データ更新関数（scraping.phpと同じ）
 */
function updateProductInDatabase($item_id, $title, $price, $condition, $category, $description) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return false;
    }
    
    try {
        // 既存レコードの確認
        $checkSql = "SELECT id FROM yahoo_scraped_products WHERE source_item_id = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$item_id]);
        $existing = $checkStmt->fetch();
        
        if (!$existing) {
            error_log("❌ [更新失敗] 指定された Item ID が見つかりません: {$item_id}");
            return false;
        }
        
        // USD価格計算
        $price_usd = $price > 0 ? round($price / 150, 2) : null;
        
        // scraped_yahoo_data の更新
        $scraped_data = json_encode([
            'category' => $category,
            'condition' => $condition,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => 'user_edit'
        ], JSON_UNESCAPED_UNICODE);
        
        // UPDATE実行
        $sql = "UPDATE yahoo_scraped_products SET 
            price_jpy = ?,
            scraped_yahoo_data = ?,
            active_title = ?,
            active_description = ?,
            active_price_usd = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE source_item_id = ?";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            $price,
            $scraped_data,
            $title,
            $description,
            $price_usd,
            $item_id
        ]);
        
        if ($result && $stmt->rowCount() > 0) {
            error_log("✅ [更新成功] {$stmt->rowCount()}行更新: {$item_id}");
            return true;
        } else {
            error_log("❌ [更新失敗] 更新された行数: 0");
            return false;
        }
        
    } catch (PDOException $e) {
        error_log("❌ [更新PDOエラー] " . $e->getMessage());
        return false;
    } catch (Exception $e) {
        error_log("❌ [更新例外] " . $e->getMessage());
        return false;
    }
}

/**
 * 全データ取得（出品済み含む）
 */
function getAllProductsData($page = 1, $limit = 20, $filters = []) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => 'データベース接続エラー',
            'db_status' => 'disconnected'
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        // 全データを取得（WHERE条件なし） - 重要カラム追加
        $whereClause = "WHERE 1=1";
        
        // フィルター条件を追加
        $params = [];
        if (!empty($filters['keyword'])) {
            $whereClause .= " AND (active_title ILIKE ? OR scraped_yahoo_data::text ILIKE ?)";
            $keyword = '%' . $filters['keyword'] . '%';
            $params[] = $keyword;
            $params[] = $keyword;
        }
        
        // ハイブリッド価格管理対応SQL（全データ版・円価格優先）+ eBayカテゴリー情報追加
        $sql = "SELECT 
                    id,
                    source_item_id as item_id,
                    COALESCE(active_title, 'タイトルなし') as title,
                    price_jpy as price,  -- 円価格を主要価格として使用
                    COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,  -- キャッシュUSD価格または計算値
                    COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
                    COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
                    COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                    active_image_url,  -- JavaScript用に追加
                    scraped_yahoo_data,  -- JavaScript用に追加
                    (scraped_yahoo_data->>'url')::text as source_url,
                    updated_at,
                    CASE 
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%yahoo.co.jp%' THEN 'Yahoo'
                        ELSE 'Unknown'
                    END as platform,
                    sku as master_sku,
                    CASE 
                        WHEN ebay_item_id IS NULL OR ebay_item_id = '' THEN 'not_listed'
                        ELSE 'listed'
                    END as listing_status,
                    status,
                    current_stock,
                    ebay_item_id,
                    cache_rate,
                    cache_updated_at,
                    -- eBayカテゴリー判定結果を追加
                    ebay_category_id,
                    ebay_category_path,
                    category_confidence,
                    auto_generated_title,
                    suggested_item_specifics,
                    category_detection_at
                FROM {$actualTable} 
                {$whereClause} 
                ORDER BY updated_at DESC, id DESC 
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = ($page - 1) * $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // カウントクエリ
        $countSql = "SELECT COUNT(*) as total FROM {$actualTable} {$whereClause}";
        $countParams = array_slice($params, 0, -2); // LIMIT・OFFSETを除く
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($countParams);
        $totalResult = $countStmt->fetch();
        
        return [
            'data' => $data,
            'total' => $totalResult['total'] ?? count($data),
            'page' => $page,
            'limit' => $limit,
            'note' => "全データ ({$actualTable}) から {count($data)}件取得（出品済み含む）",
            'table_used' => $actualTable,
            'db_status' => 'connected_all_data'
        ];
        
    } catch (Exception $e) {
        error_log("全データ取得エラー: " . $e->getMessage());
        
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'limit' => $limit,
            'note' => "全データ取得エラー: {$e->getMessage()}",
            'db_status' => 'error',
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Yahoo Auction Tool - データ編集システム（色調整・ログ改善・DB修正版）
 * 機能: スクレイピングデータの検索・編集・一括更新・CSV出力
 * 修正点: 正しいテーブル名・正しいDB接続・ログ下部固定・色調整
 */

// エラー表示とログ設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// セッション開始（エラー処理付き）
if (session_status() == PHP_SESSION_NONE) {
    @session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// グローバル$pdo変数の初期化
$pdo = null;

// 共通データベース接続を事前確立
try {
    $dsn = "pgsql:host=localhost;dbname=nagano3_db";
    $user = "postgres";
    $password = "Kn240914";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log("editing.php: データベース接続確立済み");
} catch (PDOException $e) {
    error_log("editing.php: データベース接続失敗: " . $e->getMessage());
    $pdo = null;
}

/**
 * JSON レスポンス送信（改善版）
 */
function sendJsonResponse($data, $success = true, $message = '') {
    // 出力バッファをクリア
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
        'source' => 'editing_fixed_db.php'
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * データベース接続（エラーハンドリング強化版）
 */
function getDatabaseConnection() {
    // 既に$pdoグローバル変数が存在している場合はそれを使用
    global $pdo;
    if (isset($pdo) && $pdo instanceof PDO) {
        return $pdo;
    }
    
    try {
        // 正しいデータベース接続設定
        $dsn = "pgsql:host=localhost;dbname=nagano3_db";
        $user = "postgres";
        $password = "Kn240914";
        
        $new_pdo = new PDO($dsn, $user, $password);
        $new_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // 接続テスト
        $new_pdo->query("SELECT 1");
        error_log("データベース接続成功: nagano3_db (editing.php)");
        
        // グローバル変数としても保存
        $pdo = $new_pdo;
        return $new_pdo;
        
    } catch (PDOException $e) {
        error_log("データベース接続失敗: " . $e->getMessage());
        return null;
    }
}

/**
 * 利用可能なテーブルを調査
 */
function findAvailableTables($pdo) {
    try {
        // PostgreSQL用のテーブル一覧取得
        $sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        error_log('利用可能なテーブル: ' . implode(', ', $tables));
        return $tables;
        
    } catch (Exception $e) {
        error_log('テーブル検索エラー: ' . $e->getMessage());
        return [];
    }
}

/**
 * 実際のスクレイピングデータ取得（正しいテーブル名使用）
 */
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'data' => generateSampleData(),
            'total' => 5,
            'page' => $page,
            'limit' => $limit,
            'note' => 'サンプルデータ（データベース接続なし）',
            'db_status' => 'disconnected'
        ];
    }
    
    try {
        // 正しいテーブル名を使用（Yahoo Auctionスクレイピングデータ用）
        $actualTable = 'yahoo_scraped_products';
        
        // テーブル存在確認
        $checkSql = "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ?)";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$actualTable]);
        $tableExists = $checkStmt->fetchColumn();
        
        if (!$tableExists) {
            error_log("テーブル {$actualTable} が存在しません");
            return [
                'data' => generateSampleData(),
                'total' => 5,
                'page' => $page,
                'limit' => $limit,
                'note' => "テーブル {$actualTable} が存在しません",
                'db_status' => 'no_table'
            ];
        }
        
        // カラム構造を調査
        $columnSql = "SELECT column_name FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position";
        $columnStmt = $pdo->prepare($columnSql);
        $columnStmt->execute([$actualTable]);
        $columns = $columnStmt->fetchAll(PDO::FETCH_COLUMN);
        
        error_log("テーブル {$actualTable} のカラム: " . implode(', ', $columns));
        
        // 未出品データのみ取得 - 重要カラム追加
        $whereClause = "WHERE 1=1"; // 全データを表示
        
        // 元の条件（未出品のみ）: WHERE (ebay_item_id IS NULL OR ebay_item_id = '')
        
        // フィルター条件を追加
        $params = [];
        if (!empty($filters['keyword'])) {
            $whereClause .= " AND (active_title ILIKE ? OR scraped_yahoo_data::text ILIKE ?)";
            $keyword = '%' . $filters['keyword'] . '%';
            $params[] = $keyword;
            $params[] = $keyword;
        }
        
        if (!empty($filters['source'])) {
            $whereClause .= " AND (source_item_id ILIKE ? OR scraped_yahoo_data::text ILIKE ?)";
            $params[] = '%' . $filters['source'] . '%';
            $params[] = '%' . $filters['source'] . '%';
        }
        
        // ハイブリッド価格管理対応データ取得クエリ（円価格優先表示）+ eBayカテゴリー情報追加
        $sql = "SELECT 
                    id,
                    source_item_id as item_id,
                    COALESCE(active_title, 'タイトルなし') as title,
                    price_jpy as price,  -- 円価格を主要価格として使用
                    COALESCE(cached_price_usd, ROUND(price_jpy / 150.0, 2)) as current_price,  -- キャッシュUSD価格または計算値
                    COALESCE((scraped_yahoo_data->>'category')::text, category, 'N/A') as category_name,
                    COALESCE((scraped_yahoo_data->>'condition')::text, condition_name, 'N/A') as condition_name,
                    COALESCE(active_image_url, 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image') as picture_url,
                    active_image_url,  -- JavaScript用に追加
                    scraped_yahoo_data,  -- JavaScript用に追加
                    (scraped_yahoo_data->>'url')::text as source_url,
                    updated_at,
                    CASE 
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%auctions.yahoo.co.jp%' THEN 'ヤフオク'
                        WHEN (scraped_yahoo_data->>'url')::text LIKE '%yahoo.co.jp%' THEN 'Yahoo'
                        ELSE 'Unknown'
                    END as platform,
                    sku as master_sku,
                    CASE 
                        WHEN ebay_item_id IS NULL OR ebay_item_id = '' THEN 'not_listed'
                        ELSE 'listed'
                    END as listing_status,
                    status,
                    current_stock,
                    ebay_item_id,
                    cache_rate,
                    cache_updated_at,
                    -- eBayカテゴリー判定結果を追加
                    ebay_category_id,
                    ebay_category_path,
                    category_confidence,
                    auto_generated_title,
                    suggested_item_specifics,
                    category_detection_at
                FROM {$actualTable} 
                {$whereClause} 
                ORDER BY updated_at DESC, id DESC 
                LIMIT ? OFFSET ?";
        
        $params[] = $limit;
        $params[] = ($page - 1) * $limit;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // カウントクエリ
        $countSql = "SELECT COUNT(*) as total FROM {$actualTable} {$whereClause}";
        $countParams = array_slice($params, 0, -2); // LIMIT・OFFSETを除く
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($countParams);
        $totalResult = $countStmt->fetch();
        
        if (empty($data)) {
            return [
                'data' => generateSampleData(),
                'total' => 5,
                'page' => $page,
                'limit' => $limit,
                'note' => "テーブル {$actualTable} にデータがありません（未出品データなし）",
                'table_used' => $actualTable,
                'db_status' => 'connected_empty',
                'columns' => $columns
            ];
        }
        
        return [
            'data' => $data,
            'total' => $totalResult['total'] ?? count($data),
            'page' => $page,
            'limit' => $limit,
            'note' => "実際のデータベース ({$actualTable}) から {count($data)}件取得",
            'table_used' => $actualTable,
            'db_status' => 'connected_with_data',
            'columns' => $columns
        ];
        
    } catch (Exception $e) {
        error_log("データベースクエリエラー: " . $e->getMessage());
        
        return [
            'data' => generateSampleData(),
            'total' => 5,
            'page' => $page,
            'limit' => $limit,
            'note' => "サンプルデータ（クエリエラー: {$e->getMessage()}）",
            'db_status' => 'connected_error',
            'error' => $e->getMessage()
        ];
    }
}

/**
 * 個別商品削除
 */
function deleteProduct($productId) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        $deleteSql = "DELETE FROM {$actualTable} WHERE id = ?";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->execute([$productId]);
        
        $deletedCount = $deleteStmt->rowCount();
        
        if ($deletedCount > 0) {
            error_log("商品削除完了: ID {$productId} from {$actualTable}");
            
            return [
                'success' => true,
                'message' => "商品ID {$productId} を削除しました",
                'deleted_count' => $deletedCount,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } else {
            return [
                'success' => false,
                'message' => "商品ID {$productId} が見つかりませんでした",
                'deleted_count' => 0,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
    } catch (Exception $e) {
        error_log("商品削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "商品削除エラー: {$e->getMessage()}",
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 * 選択商品一括削除
 */
function deleteMultipleProducts($productIds) {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません',
            'deleted_count' => 0,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        if (empty($productIds) || !is_array($productIds)) {
            return [
                'success' => false,
                'message' => '削除対象の商品IDが指定されていません',
                'deleted_count' => 0,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        $deleteSql = "DELETE FROM {$actualTable} WHERE id IN ({$placeholders})";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->execute($productIds);
        
        $deletedCount = $deleteStmt->rowCount();
        
        error_log("一括削除完了: {$deletedCount}件 (IDs: " . implode(',', $productIds) . ") from {$actualTable}");
        
        return [
            'success' => true,
            'message' => "{$deletedCount}件の商品を削除しました",
            'deleted_count' => $deletedCount,
            'deleted_ids' => $productIds,
            'table_used' => $actualTable,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        error_log("一括削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "一括削除エラー: {$e->getMessage()}",
            'deleted_count' => 0,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 * 全データ削除（慎重実行版）
 */
function deleteAllProducts($confirmCode = '') {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません',
            'deleted_count' => 0,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    // 安全のため確認コードをチェック
    if ($confirmCode !== 'DELETE_ALL_CONFIRM_2025') {
        return [
            'success' => false,
            'message' => '全データ削除には確認コード「DELETE_ALL_CONFIRM_2025」が必要です',
            'deleted_count' => 0,
            'required_code' => 'DELETE_ALL_CONFIRM_2025',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        // 削除前にカウント
        $countSql = "SELECT COUNT(*) as count FROM {$actualTable}";
        $countStmt = $pdo->query($countSql);
        $countResult = $countStmt->fetch();
        $totalCount = $countResult['count'] ?? 0;
        
        if ($totalCount > 0) {
            // 全データ削除実行
            $deleteSql = "DELETE FROM {$actualTable}";
            $deleteStmt = $pdo->prepare($deleteSql);
            $deleteStmt->execute();
            
            // AUTO_INCREMENT リセット（PostgreSQLの場合）
            $resetSql = "ALTER SEQUENCE {$actualTable}_id_seq RESTART WITH 1";
            $resetStmt = $pdo->prepare($resetSql);
            $resetStmt->execute();
            
            error_log("全データ削除完了: {$totalCount}件 from {$actualTable} + AUTO_INCREMENT リセット");
            
            return [
                'success' => true,
                'message' => "{$totalCount}件の全データを削除し、IDカウンターをリセットしました",
                'deleted_count' => $totalCount,
                'table_used' => $actualTable,
                'reset_sequence' => true,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } else {
            return [
                'success' => true,
                'message' => "削除対象のデータがありませんでした（テーブル: {$actualTable}）",
                'deleted_count' => 0,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
    } catch (Exception $e) {
        error_log("全データ削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "全データ削除エラー: {$e->getMessage()}",
            'deleted_count' => 0,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 * ダミーデータ削除（実際のデータベースから削除）
 */
function cleanupDummyData() {
    $pdo = getDatabaseConnection();
    
    if (!$pdo) {
        return [
            'success' => false,
            'message' => 'データベースに接続できません',
            'deleted_count' => 0,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    try {
        $actualTable = 'yahoo_scraped_products';
        
        // ダミーデータの条件を定義（Yahoo Auctionスクレイピングデータ用）
        $dummyConditions = [
            "active_title LIKE '%sample%'",
            "active_title LIKE '%test%'",
            "active_title LIKE '%ダミー%'",
            "active_title LIKE '%テスト%'",
            "source_item_id LIKE 'SAMPLE-%'",
            "source_item_id LIKE 'TEST-%'",
            "source_item_id LIKE 'DUMMY-%'",
            "source_item_id LIKE 'SCRAPED_%'",
            "scraped_yahoo_data::text LIKE '%sample%'",
            "scraped_yahoo_data::text LIKE '%test%'",
            "scraped_yahoo_data::text LIKE '%example.com%'",
            "scraped_yahoo_data::text LIKE '%placeholder%'",
            "sku LIKE 'AUTO-SAMPLE-%'",
            "sku LIKE 'AUTO-TEST-%'",
            "sku LIKE 'SKU-SCRAPED-%'"
        ];
        
        $whereClause = "WHERE (" . implode(' OR ', $dummyConditions) . ")";
        
        // 削除前にカウント
        $countSql = "SELECT COUNT(*) as count FROM {$actualTable} {$whereClause}";
        $countStmt = $pdo->query($countSql);
        $countResult = $countStmt->fetch();
        $deletedCount = $countResult['count'] ?? 0;
        
        if ($deletedCount > 0) {
            // 実際に削除
            $deleteSql = "DELETE FROM {$actualTable} {$whereClause}";
            $deleteStmt = $pdo->prepare($deleteSql);
            $deleteStmt->execute();
            
            error_log("ダミーデータ削除完了: {$deletedCount}件 from {$actualTable}");
            
            return [
                'success' => true,
                'message' => "{$deletedCount}件のダミーデータを削除しました（テーブル: {$actualTable}）",
                'deleted_count' => $deletedCount,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        } else {
            return [
                'success' => true,
                'message' => "削除対象のダミーデータが見つかりませんでした（テーブル: {$actualTable}）",
                'deleted_count' => 0,
                'table_used' => $actualTable,
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
        
    } catch (Exception $e) {
        error_log("ダミーデータ削除エラー: " . $e->getMessage());
        
        return [
            'success' => false,
            'message' => "ダミーデータ削除エラー: {$e->getMessage()}",
            'deleted_count' => 0,
            'error' => $e->getMessage(),
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}

/**
 * サンプルデータ生成（無効化版）
 */
function generateSampleData() {
    // サンプルデータを無効化し、空の配列を返す
    return [];
}

// API アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

if (!empty($action)) {
    // 出力バッファリングをクリア
    while (ob_get_level()) {
        ob_end_clean();
    }
    ob_start();
    
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    
    switch ($action) {
        case 'get_all_products':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 20);
            $filters = $_GET['filters'] ?? [];
            $mode = $_GET['mode'] ?? 'all';
            
            $result = getAllProductsData($page, $limit, $filters);
            sendJsonResponse($result, true, '全データ取得成功');
            break;
            
        case 'get_scraped_products':
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 20);
            $filters = $_GET['filters'] ?? [];
            $mode = $_GET['mode'] ?? 'extended';
            
            $result = getScrapedProductsData($page, $limit, $filters);
            sendJsonResponse($result, true, 'データ取得成功');
            break;
            
        case 'cleanup_dummy_data':
            $result = cleanupDummyData();
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
            
        case 'delete_multiple_products':
            $productIds = $_POST['product_ids'] ?? [];
            if (!is_array($productIds)) {
                $productIds = json_decode($productIds, true) ?? [];
            }
            if (empty($productIds)) {
                sendJsonResponse(null, false, '削除対象の商品IDが指定されていません');
            }
            $result = deleteMultipleProducts($productIds);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'delete_all_products':
            $confirmCode = $_POST['confirm_code'] ?? $_GET['confirm_code'] ?? '';
            $result = deleteAllProducts($confirmCode);
            sendJsonResponse($result, $result['success'], $result['message']);
            break;
            
        case 'export_csv':
            $type = $_GET['type'] ?? 'scraped';
            $filters = $_GET['filters'] ?? [];
            
            // 現在表示中のデータを取得してCSV出力
            $mode = $_GET['mode'] ?? 'extended';
            $page = intval($_GET['page'] ?? 1);
            $limit = intval($_GET['limit'] ?? 100); // CSV用に多めに取得
            
            $result = getScrapedProductsData($page, $limit, $filters);
            $currentData = $result['data'] ?? [];
            
            // CSV出力処理
            while (ob_get_level()) {
                ob_end_clean();
            }
            
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="scraped_data_' . $type . '_' . date('Ymd_His') . '.csv"');
            header('Cache-Control: no-cache, must-revalidate');
            
            echo "\xEF\xBB\xBF"; // UTF-8 BOM
            echo "item_id,title,current_price,condition_name,category_name,picture_url,source_url,platform,listing_status,updated_at\n";
            
            foreach ($currentData as $row) {
                $csvRow = [
                    $row['item_id'] ?? $row['id'] ?? '',
                    $row['title'] ?? $row['item_title'] ?? '',
                    $row['current_price'] ?? $row['price'] ?? '',
                    $row['condition_name'] ?? $row['condition'] ?? '',
                    $row['category_name'] ?? $row['category'] ?? '',
                    $row['picture_url'] ?? $row['gallery_url'] ?? '',
                    $row['source_url'] ?? '',
                    $row['platform'] ?? '',
                    $row['listing_status'] ?? 'not_listed',
                    $row['updated_at'] ?? ''
                ];
                
                $escapedRow = array_map(function($field) {
                    if (strpos($field, ',') !== false || strpos($field, '"') !== false) {
                        return '"' . str_replace('"', '""', $field) . '"';
                    }
                    return $field;
                }, $csvRow);
                
                echo implode(',', $escapedRow) . "\n";
            }
            exit();
            break;
            
        case 'get_product_details':
            // 個別商品の詳細情報取得（Emergency Parser用）
            $item_id = $_GET['item_id'] ?? $_POST['item_id'] ?? '';
            if (empty($item_id)) {
                sendJsonResponse(null, false, 'Item IDが指定されていません');
            }
            
            $result = getProductDetails($item_id);
            sendJsonResponse($result, $result['success'] ?? true, $result['message'] ?? '商品詳細取得完了');
            break;
            
        case 'update_product':
            // 商品データ更新（scraping.phpと同じAPI）
            try {
                $item_id = $_POST['item_id'] ?? '';
                $title = $_POST['title'] ?? '';
                $price = (int)($_POST['price'] ?? 0);
                $condition = $_POST['condition'] ?? '';
                $category = $_POST['category'] ?? '';
                $description = $_POST['description'] ?? '';
                
                if (empty($item_id)) {
                    sendJsonResponse(null, false, 'Item IDが指定されていません');
                }
                
                error_log('商品データ更新開始: ' . $item_id);
                
                // データベース更新処理
                $update_result = updateProductInDatabase($item_id, $title, $price, $condition, $category, $description);
                
                if ($update_result) {
                    error_log('商品データ更新成功: ' . $item_id);
                    sendJsonResponse(['item_id' => $item_id], true, '商品データを更新しました');
                } else {
                    error_log('商品データ更新失敗: ' . $item_id);
                    sendJsonResponse(null, false, 'データベース更新に失敗しました');
                }
                
            } catch (Exception $e) {
                error_log('商品更新エラー: ' . $e->getMessage());
                sendJsonResponse(null, false, '商品更新エラー: ' . $e->getMessage());
            }
            break;
            
        default:
            sendJsonResponse(null, false, '不明なアクション: ' . $action);
    }
    exit;
}
?><!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yahoo Auction - データ編集システム（色調整・ログ改善・DB修正版）</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <!-- Emergency Parser 詳細表示機能 JavaScript -->
    <script src="../02_scraping/emergency_display_functions.js"></script>
    <style>
    /* 控えめ色合いによる変数定義 */
    :root {
      /* 指定色をアクセントとして使用 */
      --accent-navy: #0B1D51;         /* 濃い青 */
      --accent-purple: #725CAD;       /* 紫 */
      --accent-lightblue: #8CCDEB;    /* 薄い青 */
      --accent-cream: #FFE3A9;        /* 薄い黄 */
      
      /* ベース色（控えめ） */
      --bg-primary: #ffffff;          /* 白背景 */
      --bg-secondary: #f8f9fa;        /* 薄いグレー */
      --bg-tertiary: #e9ecef;         /* グレー */
      --bg-hover: #f1f3f4;            /* ホバー時 */
      
      /* テキスト色（読みやすさ重視） */
      --text-primary: #2c3e50;        /* 濃いグレー */
      --text-secondary: #6c757d;      /* グレー */
      --text-muted: #868e96;          /* 薄いグレー */
      --text-white: #ffffff;          /* 白 */
      
      /* ボーダー色（控えめ） */
      --border-color: #dee2e6;        /* 薄いグレー */
      --border-light: #e9ecef;        /* より薄いグレー */
      
      /* アクセント使用箇所限定 */
      --primary-accent: var(--accent-navy);     /* メインアクセント */
      --secondary-accent: var(--accent-purple); /* セカンダリアクセント */
      --info-accent: var(--accent-lightblue);   /* 情報アクセント */
      --warning-accent: var(--accent-cream);    /* 警告アクセント */
      
      /* シャドウ */
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      
      /* スペーシング */
      --space-1: 0.25rem;
      --space-2: 0.5rem;
      --space-3: 0.75rem;
      --space-4: 1rem;
      
      /* その他 */
      --radius-sm: 0.375rem;
      --radius-md: 0.5rem;
      --radius-lg: 0.75rem;
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
      padding-bottom: 110px; /* ログエリア分のスペース確保 */
    }

    .dashboard-header {
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
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
      background: var(--bg-hover);
      border-color: var(--primary-accent);
      text-decoration: none;
    }

    .btn-primary {
      background: var(--primary-accent);
      border-color: var(--primary-accent);
      color: var(--text-white);
    }

    .btn-info {
      background: var(--info-accent);
      border-color: var(--info-accent);
      color: var(--text-primary);
    }

    .btn-warning {
      background: var(--warning-accent);
      border-color: var(--warning-accent);
      color: var(--text-primary);
    }

    .btn-success {
      background: #28a745;
      border-color: #28a745;
      color: var(--text-white);
    }

    .btn-danger {
      background: #dc3545;
      border-color: #dc3545;
      color: var(--text-white);
    }

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

    .notification {
      padding: var(--space-2);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-3);
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.8rem;
    }

    .notification.success {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }

    .notification.info {
      background: #d1ecf1;
      border: 1px solid #bee5eb;
      color: #0c5460;
    }

    .notification.warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
    }

    .notification.error {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }

    .bulk-actions-panel {
      background: linear-gradient(135deg, var(--primary-accent), var(--secondary-accent));
      color: var(--text-white);
      padding: var(--space-3);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--space-3);
      box-shadow: var(--shadow-lg);
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
    .source-badge.source-ebay { 
      background: var(--accent-purple); 
      color: var(--text-white);
      border-color: var(--accent-purple);
    }
    .source-badge.source-inventory { 
      background: var(--accent-lightblue); 
      color: var(--text-primary);
      border-color: var(--accent-lightblue);
    }
    .source-badge.source-mystical { 
      background: var(--accent-cream); 
      color: var(--text-primary);
      border-color: var(--accent-cream);
    }
    .source-badge.source-unknown {
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border-color: var(--border-color);
    }

    .product-thumbnail {
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      transition: var(--transition-fast);
    }

    .price-value {
    font-weight: 600;
    color: #28a745;
    font-size: 0.75rem;
    }
    
    /* ハイブリッド価格表示 CSS */
    .hybrid-price-display {
        text-align: right;
        line-height: 1.2;
    }
    
    .price-primary {
        font-weight: bold;
        font-size: 0.85rem;
        color: #2e8b57;  /* 緑色 - 円価格 */
        margin-bottom: 2px;
    }
    
    .price-secondary {
        font-size: 0.7rem;
        color: #4682b4;  /* 青色 - USD価格 */
        font-style: italic;
    }
    
    .price-error {
        font-size: 0.7rem;
        color: #dc3545;  /* 赤色 - エラー */
        font-style: italic;
    }

    .category-tag {
      background: var(--bg-tertiary);
      color: var(--text-secondary);
      padding: 2px 6px;
      border-radius: var(--radius-sm);
      font-size: 0.65rem;
      border: 1px solid var(--border-color);
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

    /* ログエリア（下部固定・黒背景） */
    .log-area {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 100px; /* 固定高さ */
      background: #1a1a1a; /* 黒背景 */
      border-top: 2px solid #333;
      z-index: 1000;
      overflow-y: auto;
      padding: var(--space-2);
      font-family: 'Courier New', monospace;
      font-size: 0.7rem;
      line-height: 1.3;
      color: #00ff00; /* 緑文字 */
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
      .editing-actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .log-area {
        height: 60px;
      }
      
      .container {
        padding-bottom: 110px; /* ログエリア分のスペース確保 */
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
                <p>色調整・ログ改善・DB修正版 - 実際のデータベース連携・正しいテーブル名使用</p>
                <div style="margin-top: var(--space-2);">
                    <a href="../01_dashboard/dashboard.php" class="btn" style="background: var(--text-muted); color: white;">
                        <i class="fas fa-home"></i> ダッシュボードに戻る
                    </a>
                    <a href="../02_scraping/scraping.php" class="btn btn-info">
                        <i class="fas fa-spider"></i> データ取得
                    </a>
                    <a href="../06_ebay_category_system/frontend/ebay_category_tool.php" class="btn btn-warning" target="_blank">
                        <i class="fas fa-tags"></i> eBayカテゴリー判定ツール
                    </a>
                </div>
            </div>

            <!-- 操作パネル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-tools"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0;">操作パネル</h3>
                </div>
                <div class="editing-actions">
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-info" onclick="loadEditingData()">
                            <i class="fas fa-database"></i> 未出品データ表示
                        </button>
                        <button class="btn btn-primary" onclick="loadEditingDataStrict()">
                            <i class="fas fa-filter"></i> 厳密モード（URL有）
                        </button>
                        <button class="btn btn-warning" onclick="loadAllData()">
                            <i class="fas fa-list"></i> 全データ表示
                        </button>
                    </div>
                    <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                        <button class="btn btn-success" onclick="cleanupDummyData()">
                            <i class="fas fa-broom"></i> ダミーデータ削除
                        </button>
                        <button class="btn btn-danger" onclick="deleteSelectedProducts()">
                            <i class="fas fa-trash-alt"></i> 選択削除
                        </button>
                        <button class="btn btn-danger" onclick="showDeleteAllDialog()" style="background: #8B0000;">
                            <i class="fas fa-exclamation-triangle"></i> 全データ削除
                        </button>
                        <button class="btn" onclick="downloadEditingCSV()" style="background: var(--text-muted); color: white;">
                            <i class="fas fa-download"></i> 表示データCSV出力
                        </button>
                    </div>
                </div>
            </div>

            <!-- 一括操作パネル（選択時のみ表示） -->
            <div id="bulkActionsPanel" class="bulk-actions-panel" style="display: none;">
                <div style="display: flex; align-items: center; gap: var(--space-2); font-weight: 600;">
                    <i class="fas fa-check-square"></i>
                    <span id="selectedCount">0</span> 件選択中
                </div>
                <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
                    <button class="btn btn-success" onclick="bulkApprove()">
                        <i class="fas fa-check"></i> 一括承認
                    </button>
                    <button class="btn btn-danger" onclick="bulkReject()">
                        <i class="fas fa-times"></i> 一括拒否
                    </button>
                    <button class="btn btn-danger" onclick="deleteSelectedProducts()" style="background: #dc3545;">
                        <i class="fas fa-trash-alt"></i> 選択商品削除
                    </button>
                    <button class="btn" onclick="clearSelection()" style="background: var(--text-muted); color: white;">
                        <i class="fas fa-times-circle"></i> 選択解除
                    </button>
                </div>
            </div>

            <!-- データテーブル -->
            <div class="section">
                <div class="section-header">
                    <i class="fas fa-table"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; margin: 0;">商品データ一覧（未出品のみ）</h3>
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
                                <th style="width: 140px;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="editingTableBody">
                            <tr>
                                <td colspan="11" style="text-align: center; padding: var(--space-4);">
                                    <i class="fas fa-play-circle" style="font-size: 2rem; color: var(--info-accent); margin-bottom: var(--space-2);"></i><br>
                                    <strong>「未出品データ表示」ボタンをクリックしてデータを表示してください</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    </div>

    <!-- ログエリア（下部固定） -->
    <div class="log-area">
        <h4><i class="fas fa-terminal"></i> システムログ</h4>
        <div id="logContainer">
            <div class="log-entry info">[待機中] システム準備完了</div>
        </div>
    </div>

    <script src="editing_integrated.js"></script>
    <script src="delete_functions.js"></script>
    <script src="delete_fix.js"></script>
    <script src="hybrid_price_display.js"></script>
    <script src="image_display_fix.js"></script>
    <script src="modal_debug_fix.js"></script>
    <script src="image_display_complete_fix.js"></script>
    <script src="source_display_fix.js"></script>
    <script src="ebay_category_display.js"></script>
</body>
</html>
