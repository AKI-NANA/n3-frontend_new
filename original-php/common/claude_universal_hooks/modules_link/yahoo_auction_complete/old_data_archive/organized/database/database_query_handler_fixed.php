<?php
/**
 * Yahoo Auction Tool - データベースクエリハンドラー（完全修正版）
 * 重複宣言エラー修正・関数統合・PostgreSQL最適化
 * 最終更新: 2025-09-14
 */

// エラー設定
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// データベース接続（最適化版）
function getDatabaseConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $host = 'localhost';
            $dbname = 'nagano3_db';
            $username = 'postgres';
            $password = 'password123';
            
            $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_PERSISTENT => false,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            error_log("Yahoo Auction Tool: データベース接続成功（PostgreSQL）");
        } catch (PDOException $e) {
            error_log("データベース接続エラー: " . $e->getMessage());
            return null;
        }
    }
    
    return $pdo;
}

// ダッシュボード統計取得（統合版）
function getDashboardStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return getDefaultStats();
        }
        
        $stmt = $pdo->query("
            WITH source_analysis AS (
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN source_url IS NOT NULL AND source_url != '' AND source_url LIKE '%http%' THEN 1 END) as scraped_count,
                    COUNT(CASE WHEN current_price > 0 THEN 1 END) as calculated_count,
                    COUNT(CASE WHEN current_price > 0 AND title IS NOT NULL THEN 1 END) as filtered_count,
                    COUNT(CASE WHEN current_price > 0 AND title IS NOT NULL AND listing_status = 'Active' THEN 1 END) as ready_count,
                    COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as listed_count,
                    COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as yahoo_scraped,
                    COUNT(CASE WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 1 END) as confirmed_scraped,
                    MAX(scraped_at) as last_scraped,
                    MAX(updated_at) as last_updated
                FROM mystical_japan_treasures_inventory
            )
            SELECT 
                total_records,
                GREATEST(scraped_count, yahoo_scraped, confirmed_scraped) as scraped_count,
                calculated_count,
                filtered_count,
                ready_count,
                listed_count,
                yahoo_scraped,
                confirmed_scraped,
                last_scraped,
                last_updated
            FROM source_analysis
        ");
        
        $result = $stmt->fetch();
        
        if (!$result) {
            return getDefaultStats();
        }
        
        // ログ記録
        error_log(sprintf(
            "統計情報更新: 総数%d件, スクレイピング%d件, Yahoo%d件, 確認済み%d件",
            $result['total_records'] ?? 0,
            $result['scraped_count'] ?? 0, 
            $result['yahoo_scraped'] ?? 0,
            $result['confirmed_scraped'] ?? 0
        ));
        
        return $result;
        
    } catch (Exception $e) {
        error_log("統計取得エラー: " . $e->getMessage());
        return getDefaultStats();
    }
}

// デフォルト統計（エラー時用）
function getDefaultStats() {
    return [
        'total_records' => 0,
        'scraped_count' => 0,
        'calculated_count' => 0,
        'filtered_count' => 0,
        'ready_count' => 0,
        'listed_count' => 0,
        'yahoo_scraped' => 0,
        'confirmed_scraped' => 0,
        'last_scraped' => null,
        'last_updated' => null
    ];
}

// 承認待ち商品データ取得（完全実装版）
function getApprovalQueueData($filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return [];
        }
        
        // 承認が必要な商品の基準:
        // 1. 高価格商品（$100以上）
        // 2. 状態が不明な商品
        // 3. 新規スクレイピングデータ
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                gallery_url,
                watch_count,
                updated_at,
                listing_status,
                source_url,
                scraped_at,
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'scraped_new'
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'scraped_yahoo'
                    WHEN current_price > 200 THEN 'high_value'
                    WHEN current_price > 100 THEN 'medium_value'
                    ELSE 'review_needed'
                END as approval_reason,
                CASE 
                    WHEN current_price > 200 OR condition_name ILIKE '%used%' OR condition_name ILIKE '%damaged%' THEN 'high'
                    WHEN current_price > 100 OR condition_name ILIKE '%good%' THEN 'medium'
                    ELSE 'low'
                END as risk_level,
                CASE 
                    WHEN current_price > 100 AND condition_name ILIKE '%new%' THEN 'ai-approved'
                    WHEN current_price < 50 OR condition_name ILIKE '%damaged%' THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                item_id as master_sku
            FROM mystical_japan_treasures_inventory 
            WHERE (
                current_price >= 50  -- 最低価格基準
                OR item_id LIKE 'COMPLETE_SCRAPING_%'  -- 新規スクレイピング
                OR scraped_at >= CURRENT_DATE - INTERVAL '7 days'  -- 最近のデータ
            )
            AND title IS NOT NULL 
            AND title != ''
            AND listing_status IS DISTINCT FROM 'approved'  -- 未承認のみ
            ORDER BY 
                CASE 
                    WHEN current_price > 200 THEN 0
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 1
                    WHEN current_price > 100 THEN 2
                    ELSE 3
                END,
                current_price DESC,
                updated_at DESC
            LIMIT 100
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        error_log("承認待ち商品取得: " . count($results) . "件");
        
        return $results;
        
    } catch (Exception $e) {
        error_log("承認待ちデータ取得エラー: " . $e->getMessage());
        return [];
    }
}

// 商品検索（高機能版）
function searchProducts($query, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo || empty($query)) {
            return [];
        }
        
        $searchTerms = '%' . trim($query) . '%';
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                source_url,
                scraped_at,
                updated_at,
                listing_status,
                item_id as master_sku,
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'scraped_confirmed'
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped'
                    WHEN source_url IS NOT NULL THEN 'web_sourced'
                    ELSE 'database_existing'
                END as source_system,
                -- 検索関連性スコア
                (
                    CASE WHEN title ILIKE :query THEN 10 ELSE 0 END +
                    CASE WHEN category_name ILIKE :query THEN 5 ELSE 0 END +
                    CASE WHEN condition_name ILIKE :query THEN 3 ELSE 0 END
                ) as relevance_score
            FROM mystical_japan_treasures_inventory 
            WHERE (
                title ILIKE :query 
                OR category_name ILIKE :query 
                OR condition_name ILIKE :query
                OR item_id ILIKE :query
            )
            AND title IS NOT NULL 
            AND current_price > 0
        ";
        
        // フィルター追加
        $params = ['query' => $searchTerms];
        
        if (!empty($filters['min_price'])) {
            $sql .= " AND current_price >= :min_price";
            $params['min_price'] = floatval($filters['min_price']);
        }
        
        if (!empty($filters['max_price'])) {
            $sql .= " AND current_price <= :max_price";
            $params['max_price'] = floatval($filters['max_price']);
        }
        
        if (!empty($filters['category'])) {
            $sql .= " AND category_name ILIKE :category";
            $params['category'] = '%' . $filters['category'] . '%';
        }
        
        $sql .= "
            ORDER BY 
                relevance_score DESC,
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 0
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1
                    ELSE 2
                END,
                current_price DESC,
                updated_at DESC
            LIMIT 50
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll();
        
        error_log(sprintf("商品検索完了: クエリ'%s', %d件", $query, count($results)));
        
        return $results;
        
    } catch (Exception $e) {
        error_log("検索エラー: " . $e->getMessage());
        return [];
    }
}

// スクレイピングデータ取得（統合版）
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['data' => [], 'total' => 0];
        }
        
        $offset = ($page - 1) * $limit;
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                gallery_url,
                watch_count,
                updated_at,
                listing_status,
                source_url,
                scraped_at,
                item_id as master_sku,
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 'real_scraped'
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped'
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'web_scraped'
                    ELSE 'database_item'
                END as source_system,
                CASE 
                    WHEN current_price > 100 AND condition_name ILIKE '%new%' THEN 'ai-approved'
                    WHEN current_price < 50 THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                CASE 
                    WHEN current_price > 200 THEN 'high-risk'
                    WHEN current_price > 100 THEN 'medium-risk'
                    ELSE 'low-risk'
                END as risk_level
            FROM mystical_japan_treasures_inventory 
            WHERE 1=1
        ";
        
        $params = [];
        $countParams = [];
        
        // データソースフィルター
        if (!empty($filters['source'])) {
            switch ($filters['source']) {
                case 'scraped_only':
                    $sql .= " AND (item_id LIKE 'COMPLETE_SCRAPING_%' OR source_url LIKE '%auctions.yahoo.co.jp%')";
                    break;
                case 'yahoo_only':
                    $sql .= " AND source_url LIKE '%auctions.yahoo.co.jp%'";
                    break;
                case 'confirmed_only':
                    $sql .= " AND item_id LIKE 'COMPLETE_SCRAPING_%'";
                    break;
            }
        } else {
            // デフォルト: スクレイピングデータ優先
            $sql .= " AND (source_url IS NOT NULL OR item_id LIKE 'COMPLETE_SCRAPING_%')";
        }
        
        $sql .= " AND title IS NOT NULL AND current_price > 0";
        
        // ソートとページネーション
        $sql .= "
            ORDER BY 
                CASE 
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN 0
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1
                    WHEN source_url IS NOT NULL THEN 2
                    ELSE 3
                END,
                scraped_at DESC NULLS LAST,
                current_price DESC,
                updated_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        // 総数カウント
        $countSql = str_replace(['LIMIT :limit OFFSET :offset', 'ORDER BY.*$'], '', $sql);
        $countSql = "SELECT COUNT(*) FROM (" . $countSql . ") as count_query";
        
        $countStmt = $pdo->prepare($countSql);
        foreach ($countParams as $key => $value) {
            $countStmt->bindValue(':' . $key, $value);
        }
        $countStmt->execute();
        $total = $countStmt->fetchColumn();
        
        error_log(sprintf("スクレイピングデータ取得: %d件 / 総数%d件 (ページ%d)", count($results), $total, $page));
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'has_filters' => !empty($filters)
        ];
        
    } catch (Exception $e) {
        error_log("スクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => $page, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 編集用データ取得
function getEditingData($page = 1, $limit = 50, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['data' => [], 'total' => 0];
        }
        
        $offset = ($page - 1) * $limit;
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                source_url,
                listing_status,
                updated_at,
                scraped_at,
                CASE 
                    WHEN listing_status = 'edited_ready' THEN '編集済み'
                    WHEN item_id LIKE 'COMPLETE_SCRAPING_%' THEN '取得済み'
                    WHEN current_price > 100 THEN '高価格'
                    WHEN source_url IS NOT NULL THEN 'Web取得'
                    ELSE '未処理'
                END as processing_status,
                CASE 
                    WHEN current_price > 0 AND title IS NOT NULL THEN 'ready_for_edit'
                    ELSE 'needs_processing'
                END as edit_status
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
        ";
        
        $params = [];
        
        // フィルター適用
        if (!empty($filters['status'])) {
            $sql .= " AND listing_status = :status";
            $params['status'] = $filters['status'];
        }
        
        if (!empty($filters['min_price'])) {
            $sql .= " AND current_price >= :min_price";
            $params['min_price'] = floatval($filters['min_price']);
        }
        
        if (!empty($filters['source'])) {
            switch ($filters['source']) {
                case 'scraped':
                    $sql .= " AND (item_id LIKE 'COMPLETE_SCRAPING_%' OR source_url IS NOT NULL)";
                    break;
                case 'database':
                    $sql .= " AND source_url IS NULL AND item_id NOT LIKE 'COMPLETE_SCRAPING_%'";
                    break;
            }
        }
        
        $sql .= " ORDER BY updated_at DESC LIMIT :limit OFFSET :offset";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        // 総数取得
        $countSql = str_replace(['ORDER BY updated_at DESC LIMIT :limit OFFSET :offset'], '', $sql);
        $countSql = "SELECT COUNT(*) FROM (" . $countSql . ") as count_query";
        
        $countStmt = $pdo->prepare($countSql);
        foreach ($params as $key => $value) {
            $countStmt->bindValue(':' . $key, $value);
        }
        $countStmt->execute();
        $total = $countStmt->fetchColumn();
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'has_filters' => !empty($filters)
        ];
        
    } catch (Exception $e) {
        error_log("編集用データ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => $page, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 商品承認処理（統合版）
function approveProducts($skus, $decision = 'approve', $reviewer = 'system') {
    if (!is_array($skus)) {
        $skus = [$skus];
    }
    
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return 0;
        }
        
        $successCount = 0;
        $status = ($decision === 'approve') ? 'approved' : 'rejected';
        
        foreach ($skus as $sku) {
            $sql = "UPDATE mystical_japan_treasures_inventory 
                    SET listing_status = :status, 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE item_id = :item_id";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'status' => $status,
                'item_id' => $sku
            ]);
            
            if ($stmt->rowCount() > 0) {
                $successCount++;
                error_log("商品承認処理: {$sku} -> {$status} by {$reviewer}");
            }
        }
        
        return $successCount;
        
    } catch (Exception $e) {
        error_log("商品承認エラー: " . $e->getMessage());
        return 0;
    }
}

// 新規商品追加
function addNewProduct($productData) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'message' => 'データベース接続エラー'];
        }
        
        $sql = "INSERT INTO mystical_japan_treasures_inventory 
                (item_id, title, current_price, condition_name, category_name, 
                 listing_status, source_url, created_at, updated_at)
                VALUES (:item_id, :title, :current_price, :condition_name, :category_name, 
                        'pending_approval', :source_url, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)";
        
        $stmt = $pdo->prepare($sql);
        $result = $stmt->execute([
            'item_id' => $productData['sku'] ?? 'NEW_' . uniqid(),
            'title' => $productData['name'] ?? '',
            'current_price' => floatval($productData['price'] ?? 0),
            'condition_name' => $productData['condition'] ?? 'New',
            'category_name' => $productData['category'] ?? 'General',
            'source_url' => $productData['source_url'] ?? null
        ]);
        
        if ($result) {
            return ['success' => true, 'message' => '商品を正常に追加しました'];
        } else {
            return ['success' => false, 'message' => '商品追加に失敗しました'];
        }
        
    } catch (Exception $e) {
        error_log("商品追加エラー: " . $e->getMessage());
        return ['success' => false, 'message' => 'エラー: ' . $e->getMessage()];
    }
}

// 禁止キーワード管理
function getProhibitedKeywords($filters = []) {
    // サンプルデータ（実際の実装では専用テーブルから取得）
    return [
        [
            'id' => 1,
            'keyword' => '偽物',
            'category' => 'ブランド',
            'priority' => '高',
            'detection_count' => 127,
            'created_date' => '2025-09-01',
            'last_detected' => '2025-09-10',
            'status' => '有効'
        ],
        [
            'id' => 2,
            'keyword' => 'コピー品',
            'category' => 'ブランド',
            'priority' => '中',
            'detection_count' => 89,
            'created_date' => '2025-09-02',
            'last_detected' => '2025-09-09',
            'status' => '有効'
        ]
    ];
}

function checkTitleForProhibitedKeywords($title) {
    $prohibitedKeywords = [
        '偽物', 'コピー品', 'レプリカ', '海賊版', '違法', 'パチモン',
        'fake', 'replica', 'counterfeit', 'bootleg', 'pirated'
    ];
    
    $detectedKeywords = [];
    $titleLower = strtolower($title);
    
    foreach ($prohibitedKeywords as $keyword) {
        if (strpos($titleLower, strtolower($keyword)) !== false) {
            $detectedKeywords[] = $keyword;
        }
    }
    
    return [
        'safe' => empty($detectedKeywords),
        'detected_keywords' => $detectedKeywords,
        'risk_level' => empty($detectedKeywords) ? 'safe' : (count($detectedKeywords) > 2 ? 'high' : 'medium'),
        'recommendation' => empty($detectedKeywords) ? '出品可能です' : 'タイトルの修正が必要です'
    ];
}

function addProhibitedKeyword($keyword, $category, $priority, $status, $description = '') {
    try {
        error_log("禁止キーワード追加: {$keyword} ({$category}, {$priority})");
        // 実際の実装では専用テーブルに挿入
        return true;
    } catch (Exception $e) {
        error_log("禁止キーワード追加エラー: " . $e->getMessage());
        return false;
    }
}

function updateProhibitedKeyword($id, $data) {
    try {
        error_log("禁止キーワード更新: ID {$id}");
        // 実際の実装では専用テーブル更新
        return true;
    } catch (Exception $e) {
        error_log("禁止キーワード更新エラー: " . $e->getMessage());
        return false;
    }
}

function deleteProhibitedKeyword($id) {
    try {
        error_log("禁止キーワード削除: ID {$id}");
        // 実際の実装では専用テーブルから削除
        return true;
    } catch (Exception $e) {
        error_log("禁止キーワード削除エラー: " . $e->getMessage());
        return false;
    }
}

// APIレスポンス生成
function generateApiResponse($action, $data, $success = true, $message = '') {
    return [
        'success' => $success,
        'action' => $action,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'count' => is_array($data) ? count($data) : (is_null($data) ? 0 : 1),
        'database' => 'PostgreSQL',
        'version' => 'fixed_v1.0'
    ];
}

// ログ記録
function logAction($action, $data = null, $level = 'INFO') {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'level' => $level,
        'action' => $action,
        'data' => $data,
        'memory_usage' => memory_get_usage(),
        'version' => 'database_handler_fixed'
    ];
    
    error_log("Yahoo Auction Tool DB Handler: " . json_encode($logEntry, JSON_UNESCAPED_UNICODE));
}

// 初期化ログ
logAction('database_handler_initialized', [
    'functions_loaded' => [
        'getDatabaseConnection', 'getDashboardStats', 'getApprovalQueueData',
        'searchProducts', 'getScrapedProductsData', 'getEditingData',
        'approveProducts', 'addNewProduct', 'getProhibitedKeywords'
    ],
    'status' => 'ready'
]);

?>
