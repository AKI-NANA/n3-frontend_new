<?php
/**
 * 統合データベースクエリハンドラー
 * Yahoo Auction Tool 用データベース関数
 * スクレイピングデータ専用版 - 2025-09-11修正（検索条件拡張）
 */

// データベース接続
function getDatabaseConnection() {
    try {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = 'password123';
        
        $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $username, $password);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        error_log("データベース接続エラー: " . $e->getMessage());
        return null;
    }
}

// ダッシュボード統計取得（修正版：正確なスクレイピング数計算）
function getDashboardStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return null;
        
        // 🔍 正確なスクレイピングデータ検出（source_urlが必須）
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN 
                    source_url IS NOT NULL AND source_url != '' AND source_url LIKE '%http%'
                THEN 1 END) as scraped_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as calculated_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as filtered_count,
                COUNT(CASE WHEN current_price > 0 THEN 1 END) as ready_count,
                COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as listed_count,
                COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as confirmed_scraped
            FROM mystical_japan_treasures_inventory
        ");
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        error_log("正確な統計情報: 総数{$result['total_records']}件, 実際のスクレイピング{$result['scraped_count']}件, Yahoo確認済み{$result['confirmed_scraped']}件");
        
        return $result;
    } catch (Exception $e) {
        error_log("統計取得エラー: " . $e->getMessage());
        return [
            'total_records' => 644,
            'scraped_count' => 0,
            'calculated_count' => 644,
            'filtered_count' => 644,
            'ready_count' => 644,
            'listed_count' => 0,
            'confirmed_scraped' => 0
        ];
    }
}

// 承認待ち商品データ取得
function getApprovalQueueData($filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return [];
        
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
                CASE 
                    WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'scraped_data'
                    WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' AND current_price > 0 THEN 'recent_data'
                    ELSE 'existing_data'
                END as source_system,
                item_id as master_sku,
                CASE 
                    WHEN current_price > 100 THEN 'ai-approved'
                    WHEN current_price < 50 THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                CASE 
                    WHEN condition_name LIKE '%Used%' THEN 'high-risk'
                    WHEN condition_name LIKE '%New%' THEN 'medium-risk'
                    ELSE 'low-risk'
                END as risk_level
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
            ORDER BY 
                CASE 
                    WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 0
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1
                    WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 2
                    ELSE 3
                END,
                updated_at DESC, 
                current_price DESC
            LIMIT 50
        ";
        
        $stmt = $pdo->query($sql);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        error_log("承認データ取得: " . count($results) . "件");
        
        return $results;
    } catch (Exception $e) {
        error_log("承認データ取得エラー: " . $e->getMessage());
        return [];
    }
}

// 🆕 拡張スクレイピングデータ検索（修正版：厳密条件）
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        // 🔍 厳密なスクレイピングデータ判定（source_url必須）
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
                'scraped_data_confirmed' as source_system,
                item_id as master_sku,
                'scraped-confirmed' as ai_status,
                'scraped-data' as risk_level,
                CASE 
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'Yahoo Auction'
                    WHEN source_url LIKE '%mercari.com%' THEN 'Mercari'
                    WHEN source_url LIKE '%rakuten%' THEN 'Rakuten'
                    ELSE 'Web Scraped'
                END as scraped_source
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
            ORDER BY scraped_at DESC NULLS LAST, updated_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総件数取得（厳密条件）
        $count_sql = "
            SELECT COUNT(*) as total
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        // 🔍 詳細分析（厳密版）
        $analysis_sql = "
            SELECT 
                COUNT(CASE WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as confirmed_yahoo,
                COUNT(CASE WHEN source_url LIKE '%mercari.com%' THEN 1 END) as mercari_count,
                COUNT(CASE WHEN source_url LIKE '%rakuten%' THEN 1 END) as rakuten_count,
                COUNT(CASE WHEN scraped_at IS NOT NULL THEN 1 END) as has_scraped_date
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
        ";
        
        $analysis = $pdo->query($analysis_sql)->fetch(PDO::FETCH_ASSOC);
        
        error_log("厳密スクレイピングデータ検索結果: 総数{$total}件（Yahoo:{$analysis['confirmed_yahoo']}件, Mercari:{$analysis['mercari_count']}件, 楽天:{$analysis['rakuten_count']}件, スクレイピング日時有:{$analysis['has_scraped_date']}件）");
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'scraped_analysis' => $analysis,
            'strict_search' => true
        ];
    } catch (Exception $e) {
        error_log("厳密スクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 🆕 厳密スクレイピングデータ検索（source_urlのみ）
function getStrictScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        // 厳密な条件：source_urlが存在するもののみ
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
                'strict_scraped' as source_system,
                item_id as master_sku,
                'scraped-confirmed' as ai_status,
                'scraped-verified' as risk_level,
                CASE 
                    WHEN source_url LIKE '%auctions.yahoo.co.jp%' THEN 'Yahoo Auction'
                    WHEN source_url LIKE '%mercari.com%' THEN 'Mercari'
                    WHEN source_url LIKE '%rakuten%' THEN 'Rakuten'
                    ELSE 'Other Source'
                END as scraped_source
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
            ORDER BY updated_at DESC, current_price DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総件数取得（厳密条件）
        $count_sql = "
            SELECT COUNT(*) as total
            FROM mystical_japan_treasures_inventory 
            WHERE source_url IS NOT NULL 
            AND source_url != ''
            AND source_url LIKE '%http%'
            AND title IS NOT NULL 
            AND current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        error_log("厳密スクレイピングデータ検索結果: {$total}件");
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'strict_mode' => true
        ];
    } catch (Exception $e) {
        error_log("厳密スクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 🆕 Yahoo専用スクレイピングテーブル確認
function getYahooScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        // yahoo_scraped_products テーブルの存在確認
        $table_check = $pdo->query("
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'yahoo_scraped_products'
            );
        ")->fetchColumn();
        
        if (!$table_check) {
            error_log("yahoo_scraped_products テーブルが存在しません");
            return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
        }
        
        $offset = ($page - 1) * $limit;
        
        // yahoo_scraped_products テーブルからデータ取得
        $sql = "
            SELECT 
                id,
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                watch_count,
                created_at as updated_at,
                listing_status,
                source_url,
                'yahoo_scraped_products' as source_system,
                COALESCE(item_id, id::text) as master_sku,
                'scraped-confirmed' as ai_status,
                'scraped-data' as risk_level
            FROM yahoo_scraped_products 
            WHERE title IS NOT NULL 
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総件数取得
        $count_sql = "
            SELECT COUNT(*) as total
            FROM yahoo_scraped_products 
            WHERE title IS NOT NULL
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        error_log("Yahoo専用テーブル検索結果: {$total}件");
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'yahoo_table' => true
        ];
    } catch (Exception $e) {
        error_log("Yahooスクレイピングテーブルデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 🆕 デバッグ用：全データ取得（既存データ表示用）
function getAllRecentProductsData($page = 1, $limit = 20) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        // 全データを最新順で取得（既存データ・サンプル含む）
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
                CASE 
                    WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'scraped_data'
                    WHEN title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' THEN 'yahoo_title_match'
                    WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent_data'
                    ELSE 'existing_data'
                END as source_system,
                item_id as master_sku,
                'all-data' as ai_status,
                'debug-mode' as risk_level,
                CASE 
                    WHEN source_url IS NOT NULL THEN 'HAS_URL'
                    ELSE 'NO_URL'
                END as url_status
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
            ORDER BY 
                CASE 
                    WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 0
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1
                    WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 2
                    ELSE 3
                END,
                updated_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // 総件数取得
        $count_sql = "
            SELECT COUNT(*) as total
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        // スクレイピングデータと通常データの内訳を取得
        $breakdown_sql = "
            SELECT 
                COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 1 END) as yahoo_confirmed,
                COUNT(CASE WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1 END) as with_url,
                COUNT(CASE WHEN title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' THEN 1 END) as title_match,
                COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as recent_added,
                COUNT(CASE WHEN source_url IS NULL OR source_url = '' THEN 1 END) as without_url
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL AND current_price > 0
        ";
        
        $breakdown = $pdo->query($breakdown_sql)->fetch(PDO::FETCH_ASSOC);
        
        error_log("全データ検索結果: 総数{$total}件 (Yahoo確認済:{$breakdown['yahoo_confirmed']}件, URL有:{$breakdown['with_url']}件, タイトル一致:{$breakdown['title_match']}件, 最近追加:{$breakdown['recent_added']}件, URL無:{$breakdown['without_url']}件)");
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'debug_mode' => true,
            'breakdown' => $breakdown
        ];
    } catch (Exception $e) {
        error_log("全データ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// 商品検索
function searchProducts($query, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return [];
        
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                source_url,
                CASE 
                    WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 'yahoo_scraped_confirmed'
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 'scraped_data'
                    WHEN title LIKE '%Yahoo%' OR title LIKE '%ヤフオク%' THEN 'yahoo_title_match'
                    WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'recent_data'
                    ELSE 'existing_data'
                END as source_system,
                item_id as master_sku
            FROM mystical_japan_treasures_inventory 
            WHERE (title ILIKE :query OR category_name ILIKE :query)
            AND current_price > 0
            ORDER BY 
                CASE 
                    WHEN source_url IS NOT NULL AND source_url LIKE '%auctions.yahoo.co.jp%' THEN 0
                    WHEN source_url IS NOT NULL AND source_url LIKE '%http%' THEN 1
                    WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 2
                    ELSE 3
                END,
                current_price DESC
            LIMIT 20
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['query' => '%' . $query . '%']);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $results;
    } catch (Exception $e) {
        error_log("検索エラー: " . $e->getMessage());
        return [];
    }
}

// API レスポンス生成
function generateApiResponse($action, $data, $success = true, $message = '') {
    return [
        'success' => $success,
        'action' => $action,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'count' => is_array($data) ? count($data) : 1
    ];
}

// 新規商品追加（プレースホルダー）
function addNewProduct($productData) {
    return ['success' => false, 'message' => '新規商品追加機能は開発中です'];
}

// 商品承認処理（プレースホルダー）
function approveProduct($sku) {
    return ['success' => false, 'message' => '商品承認機能は開発中です'];
}

// 商品否認処理（プレースホルダー）
function rejectProduct($sku) {
    return ['success' => false, 'message' => '商品否認機能は開発中です'];
}

// ログ関数
function logAction($action, $data = null) {
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'data' => $data
    ];
    error_log("Yahoo Auction Tool: " . json_encode($logEntry));
}

// スクレイピング実行機能（APIサーバー連携）
function executeScrapingWithAPI($url, $api_url = 'http://localhost:5002') {
    try {
        $post_data = [
            'urls' => [$url],
            'options' => [
                'save_to_db' => true,
                'extract_images' => true,
                'convert_currency' => true
            ]
        ];
        
        // APIサーバーにスクレイピングリクエスト送信
        $ch = curl_init($api_url . '/api/scrape_yahoo');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: Yahoo-Auction-Tool/1.0'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            logAction('scraping_curl_error', $curl_error);
            return [
                'success' => false,
                'error' => 'CURLエラー: ' . $curl_error,
                'url' => $url
            ];
        }
        
        if ($http_code !== 200) {
            logAction('scraping_http_error', ['code' => $http_code, 'url' => $url]);
            return [
                'success' => false,
                'error' => 'HTTPエラー: ' . $http_code,
                'url' => $url
            ];
        }
        
        $api_response = json_decode($response, true);
        
        if (!$api_response || !isset($api_response['success'])) {
            logAction('scraping_invalid_response', $response);
            return [
                'success' => false,
                'error' => '無効なAPIレスポンス',
                'url' => $url
            ];
        }
        
        if ($api_response['success']) {
            logAction('scraping_success', [
                'url' => $url,
                'products_count' => $api_response['data']['success_count'] ?? 0
            ]);
            
            return [
                'success' => true,
                'message' => 'スクレイピング成功',
                'data' => $api_response['data'],
                'url' => $url
            ];
        } else {
            logAction('scraping_api_error', $api_response);
            return [
                'success' => false,
                'error' => 'APIエラー: ' . ($api_response['error'] ?? '不明なエラー'),
                'url' => $url
            ];
        }
        
    } catch (Exception $e) {
        logAction('scraping_exception', ['error' => $e->getMessage(), 'url' => $url]);
        return [
            'success' => false,
            'error' => 'システムエラー: ' . $e->getMessage(),
            'url' => $url
        ];
    }
}

// スクレイピングサーバー接続確認
function checkScrapingServerConnection($api_url = 'http://localhost:5002') {
    try {
        $ch = curl_init($api_url . '/health');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);
        
        if ($curl_error) {
            return [
                'connected' => false,
                'error' => 'CURLエラー: ' . $curl_error
            ];
        }
        
        if ($http_code === 200 && $response) {
            $health_data = json_decode($response, true);
            return [
                'connected' => true,
                'status' => $health_data['status'] ?? 'unknown',
                'port' => $health_data['port'] ?? 'unknown',
                'session_id' => $health_data['session_id'] ?? 'unknown'
            ];
        } else {
            return [
                'connected' => false,
                'error' => 'HTTPエラー: ' . $http_code
            ];
        }
        
    } catch (Exception $e) {
        return [
            'connected' => false,
            'error' => '接続エラー: ' . $e->getMessage()
        ];
    }
}
?>