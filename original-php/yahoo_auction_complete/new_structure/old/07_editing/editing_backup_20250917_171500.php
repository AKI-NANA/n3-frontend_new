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
        
        // ハイブリッド価格管理対応SQL（全データ版・円価格優先）
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
                    cache_updated_at
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

// ... (以下は省略してバックアップとして保存)
?>
バックアップ作成日時: 2025/09/17 17:15:00
元ファイル: editing.php
バックアップ理由: 修正指示書に基づく改修前のバックアップ

この後、editing.phpをeBayカテゴリー自動判定機能付きの出品前管理UIに進化させます。