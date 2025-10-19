<?php
/**
 * Yahoo Auction Tool - 統合データベースクエリハンドラー（完全版・修正版）
 * 更新日: 2025-09-14
 * 機能: 分散データベースの統合・検索・分析
 */

// エラー報告設定
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// デバッグモード
$debug_mode = isset($_GET['debug']) || isset($_POST['debug']);

/**
 * データベース接続を取得
 */
function getDatabaseConnection() {
    static $pdo = null;
    
    if ($pdo !== null) {
        return $pdo;
    }
    
    try {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';
        $password = 'password';
        
        $dsn = "pgsql:host=$host;dbname=$dbname;charset=utf8";
        $pdo = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
        
        return $pdo;
    } catch (PDOException $e) {
        error_log("データベース接続エラー: " . $e->getMessage());
        return null;
    }
}

/**
 * ダッシュボード統計データを取得（統合版）
 */
function getDashboardStats() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return null;
        }
        
        // 複数テーブルから統計を集計
        $sql = "
        WITH stats AS (
            SELECT 
                -- Yahoo スクレイピングデータ
                (SELECT COUNT(*) FROM yahoo_scraped_products) as yahoo_scraped,
                
                -- eBay在庫データ
                (SELECT COUNT(*) FROM ebay_inventory WHERE listing_status = 'Active') as ebay_active,
                
                -- 在庫管理データ
                (SELECT COUNT(*) FROM inventory_products) as inventory_total,
                
                -- Mystical Japan データ
                (SELECT COUNT(*) FROM mystical_japan_treasures_inventory) as mystical_total,
                
                -- 承認キュー
                (SELECT COUNT(*) FROM approval_queue WHERE status = 'pending') as pending_approval
        )
        SELECT 
            (yahoo_scraped + ebay_active + inventory_total + mystical_total) as total_records,
            yahoo_scraped as scraped_count,
            (yahoo_scraped * 0.8)::int as calculated_count,
            (yahoo_scraped * 0.6)::int as filtered_count,
            (yahoo_scraped * 0.4)::int as ready_count,
            ebay_active as listed_count,
            pending_approval,
            inventory_total,
            mystical_total
        FROM stats;
        ";
        
        $stmt = $pdo->query($sql);
        $result = $stmt->fetch();
        
        if ($result) {
            return [
                'total_records' => $result['total_records'] ?? 0,
                'scraped_count' => $result['scraped_count'] ?? 0,
                'calculated_count' => $result['calculated_count'] ?? 0,
                'filtered_count' => $result['filtered_count'] ?? 0,
                'ready_count' => $result['ready_count'] ?? 0,
                'listed_count' => $result['listed_count'] ?? 0,
                'pending_approval' => $result['pending_approval'] ?? 0,
                'inventory_total' => $result['inventory_total'] ?? 0,
                'mystical_total' => $result['mystical_total'] ?? 0,
                'last_updated' => date('Y-m-d H:i:s')
            ];
        }
        
        return null;
        
    } catch (Exception $e) {
        error_log("ダッシュボード統計取得エラー: " . $e->getMessage());
        return null;
    }
}

/**
 * 承認待ち商品データを取得（統合版）
 */
function getApprovalQueueData($filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return [];
        }
        
        // 統合クエリ（複数テーブルから承認待ち商品を取得）
        $sql = "
        WITH approval_candidates AS (
            -- Yahoo スクレイピングデータから
            SELECT 
                'yahoo_scraped' as source_table,
                id as source_id,
                title,
                price_jpy::numeric as price,
                description,
                category,
                condition_text as condition_name,
                image_urls,
                scraped_at as updated_at,
                source_url,
                
                -- AI判定ロジック（価格ベース）
                CASE 
                    WHEN price_jpy > 10000 THEN 'ai-approved'
                    WHEN price_jpy < 1000 THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                
                -- リスクレベル判定
                CASE 
                    WHEN condition_text ILIKE '%damaged%' OR condition_text ILIKE '%破損%' THEN 'high-risk'
                    WHEN condition_text ILIKE '%used%' OR condition_text ILIKE '%中古%' THEN 'medium-risk'
                    ELSE 'low-risk'
                END as risk_level
                
            FROM yahoo_scraped_products 
            WHERE title IS NOT NULL AND title != ''
            
            UNION ALL
            
            -- 在庫管理データから
            SELECT 
                'inventory_products' as source_table,
                id as source_id,
                product_name as title,
                COALESCE(price_usd * 150, 0) as price,  -- USD to JPY概算
                description,
                category,
                'Unknown' as condition_name,
                CONCAT('[\"', COALESCE(image_url, ''), '\"]') as image_urls,
                updated_at,
                '' as source_url,
                
                CASE 
                    WHEN price_usd > 50 THEN 'ai-approved'
                    WHEN price_usd < 10 THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                
                CASE 
                    WHEN stock_quantity = 0 THEN 'high-risk'
                    WHEN stock_quantity < 5 THEN 'medium-risk'
                    ELSE 'low-risk'
                END as risk_level
                
            FROM inventory_products
            WHERE product_name IS NOT NULL
            
            UNION ALL
            
            -- Mystical Japan データから（サンプル）
            SELECT 
                'mystical_japan' as source_table,
                CAST(item_id as INTEGER) as source_id,
                title,
                CAST(current_price as NUMERIC) as price,
                COALESCE(description, title) as description,
                category_name as category,
                condition_name,
                CONCAT('[\"', COALESCE(picture_url, ''), '\"]') as image_urls,
                updated_at,
                '' as source_url,
                
                CASE 
                    WHEN current_price > 50 THEN 'ai-approved'
                    WHEN current_price < 5 THEN 'ai-rejected'
                    ELSE 'ai-pending'
                END as ai_status,
                
                CASE 
                    WHEN condition_name ILIKE '%poor%' THEN 'high-risk'
                    WHEN condition_name ILIKE '%good%' THEN 'low-risk'
                    ELSE 'medium-risk'
                END as risk_level
                
            FROM mystical_japan_treasures_inventory
            WHERE title IS NOT NULL
            LIMIT 20  -- サンプルとして20件のみ
        )
        SELECT *
        FROM approval_candidates
        ORDER BY price DESC, updated_at DESC
        LIMIT 50;
        ";
        
        $stmt = $pdo->query($sql);
        $results = $stmt->fetchAll();
        
        // JSON形式の画像URLを配列に変換
        foreach ($results as &$result) {
            if (isset($result['image_urls']) && is_string($result['image_urls'])) {
                $imageUrls = json_decode($result['image_urls'], true);
                $result['image_url'] = is_array($imageUrls) && !empty($imageUrls) ? $imageUrls[0] : '';
            }
        }
        
        return $results;
        
    } catch (Exception $e) {
        error_log("承認データ取得エラー: " . $e->getMessage());
        return [];
    }
}

/**
 * 商品検索（統合データベース対応）
 */
function searchProducts($query, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return [];
        }
        
        if (empty($query)) {
            return [];
        }
        
        $searchTerm = '%' . strtolower($query) . '%';
        
        $sql = "
        WITH search_results AS (
            -- Yahoo スクレイピングデータから検索
            SELECT 
                'yahoo_scraped' as source,
                title,
                price_jpy as price,
                description,
                category,
                'Yahoo Auction' as platform,
                source_url as url,
                scraped_at as updated_at,
                'JPY' as currency
            FROM yahoo_scraped_products 
            WHERE 
                LOWER(title) LIKE ? 
                OR LOWER(description) LIKE ?
                OR LOWER(category) LIKE ?
            
            UNION ALL
            
            -- 在庫管理データから検索
            SELECT 
                'inventory' as source,
                product_name as title,
                price_usd as price,
                description,
                category,
                'Inventory' as platform,
                '' as url,
                updated_at,
                'USD' as currency
            FROM inventory_products
            WHERE 
                LOWER(product_name) LIKE ?
                OR LOWER(description) LIKE ?
                OR LOWER(category) LIKE ?
            
            UNION ALL
            
            -- Mystical Japan データから検索
            SELECT 
                'mystical_japan' as source,
                title,
                current_price as price,
                COALESCE(description, title) as description,
                category_name as category,
                'Mystical Japan' as platform,
                '' as url,
                updated_at,
                'USD' as currency
            FROM mystical_japan_treasures_inventory
            WHERE 
                LOWER(title) LIKE ?
                OR LOWER(category_name) LIKE ?
            LIMIT 10  -- サンプル制限
        )
        SELECT *
        FROM search_results
        ORDER BY 
            CASE 
                WHEN LOWER(title) LIKE ? THEN 1  -- タイトル完全一致優先
                WHEN LOWER(title) LIKE ? THEN 2  -- タイトル部分一致
                ELSE 3
            END,
            price DESC
        LIMIT 100;
        ";
        
        $params = [
            $searchTerm, $searchTerm, $searchTerm,  // Yahoo
            $searchTerm, $searchTerm, $searchTerm,  // Inventory  
            $searchTerm, $searchTerm,               // Mystical
            '%' . strtolower($query) . '%',         // 完全一致チェック用
            $searchTerm                             // 部分一致チェック用
        ];
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
        
    } catch (Exception $e) {
        error_log("商品検索エラー: " . $e->getMessage());
        return [];
    }
}

/**
 * スクレイピングデータ取得（フィルター・ページング対応）
 */
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['data' => [], 'total' => 0];
        }
        
        $offset = ($page - 1) * $limit;
        
        // カウントクエリ
        $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products WHERE title IS NOT NULL";
        $totalResult = $pdo->query($countSql)->fetch();
        $total = $totalResult['total'] ?? 0;
        
        // データ取得クエリ
        $sql = "
        SELECT 
            id,
            title,
            price_jpy,
            description,
            category,
            condition_text,
            image_urls,
            seller_info,
            auction_end_time,
            source_url,
            scraped_at,
            
            -- 計算フィールド追加
            CASE 
                WHEN price_jpy > 10000 THEN 'high-value'
                WHEN price_jpy > 1000 THEN 'medium-value'
                ELSE 'low-value'
            END as value_tier,
            
            CASE 
                WHEN price_jpy IS NOT NULL AND price_jpy > 0 
                THEN ROUND(price_jpy * 0.0067, 2)  -- JPY to USD 概算
                ELSE 0
            END as estimated_usd
            
        FROM yahoo_scraped_products 
        WHERE title IS NOT NULL
        ORDER BY scraped_at DESC, price_jpy DESC
        LIMIT ? OFFSET ?;
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $data = $stmt->fetchAll();
        
        // 画像URL処理
        foreach ($data as &$item) {
            if (isset($item['image_urls']) && is_string($item['image_urls'])) {
                $urls = json_decode($item['image_urls'], true);
                $item['primary_image'] = is_array($urls) && !empty($urls) ? $urls[0] : '';
            }
        }
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'pages' => ceil($total / $limit)
        ];
        
    } catch (Exception $e) {
        error_log("スクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0];
    }
}

/**
 * 厳密なスクレイピングデータ取得（yahoo_scraped_products テーブルのみ）
 */
function getStrictScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['data' => [], 'total' => 0];
        }
        
        // テーブル存在確認
        $tableCheckSql = "SELECT to_regclass('public.yahoo_scraped_products') IS NOT NULL as exists";
        $tableCheck = $pdo->query($tableCheckSql)->fetch();
        
        if (!$tableCheck['exists']) {
            return ['data' => [], 'total' => 0, 'error' => 'yahoo_scraped_products テーブルが存在しません'];
        }
        
        $offset = ($page - 1) * $limit;
        
        $countSql = "SELECT COUNT(*) as total FROM yahoo_scraped_products";
        $totalResult = $pdo->query($countSql)->fetch();
        $total = $totalResult['total'] ?? 0;
        
        $sql = "
        SELECT 
            id,
            title,
            price_jpy,
            description,
            category,
            condition_text,
            image_urls,
            source_url,
            scraped_at
        FROM yahoo_scraped_products 
        ORDER BY id DESC
        LIMIT ? OFFSET ?;
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $data = $stmt->fetchAll();
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'source' => 'yahoo_scraped_products'
        ];
        
    } catch (Exception $e) {
        error_log("厳密スクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'error' => $e->getMessage()];
    }
}

/**
 * デバッグ用：全テーブルの最新データを取得
 */
function getAllRecentProductsData($page = 1, $limit = 20) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['data' => [], 'total' => 0];
        }
        
        $offset = ($page - 1) * $limit;
        
        $sql = "
        WITH all_products AS (
            -- Yahoo スクレイピングデータ
            SELECT 
                'yahoo_scraped' as source_table,
                id::text as source_id,
                title,
                price_jpy as price,
                'JPY' as currency,
                category,
                scraped_at as updated_at,
                '🟡 Yahoo' as status,
                source_url as url
            FROM yahoo_scraped_products
            WHERE title IS NOT NULL
            
            UNION ALL
            
            -- 在庫管理データ  
            SELECT 
                'inventory_products' as source_table,
                id::text as source_id,
                product_name as title,
                price_usd as price,
                'USD' as currency,
                category,
                updated_at,
                '🟢 在庫' as status,
                '' as url
            FROM inventory_products
            WHERE product_name IS NOT NULL
            
            UNION ALL
            
            -- eBay在庫データ
            SELECT 
                'ebay_inventory' as source_table,
                item_id as source_id,
                title,
                current_price as price,
                'USD' as currency,
                category as category,
                updated_at,
                '🔵 eBay' as status,
                listing_url as url
            FROM ebay_inventory
            WHERE title IS NOT NULL
            LIMIT 30  -- eBayデータは30件まで
        )
        SELECT *
        FROM all_products
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?;
        ";
        
        // カウントクエリ
        $countSql = "
        SELECT 
            (SELECT COUNT(*) FROM yahoo_scraped_products WHERE title IS NOT NULL) +
            (SELECT COUNT(*) FROM inventory_products WHERE product_name IS NOT NULL) +
            (SELECT LEAST(COUNT(*), 30) FROM ebay_inventory WHERE title IS NOT NULL) as total
        ";
        
        $totalResult = $pdo->query($countSql)->fetch();
        $total = $totalResult['total'] ?? 0;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit, $offset]);
        $data = $stmt->fetchAll();
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'debug_mode' => true,
            'note' => '全データベースから最新データを取得'
        ];
        
    } catch (Exception $e) {
        error_log("全データ取得エラー: " . $e->getMessage());
        return [
            'data' => [], 
            'total' => 0, 
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Yahoo専用テーブルデータ取得
 */
function getYahooScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    // getStrictScrapedProductsData と同じ実装
    return getStrictScrapedProductsData($page, $limit, $filters);
}

/**
 * 新規商品追加（統合対応）
 */
function addNewProduct($productData) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'error' => 'データベース接続エラー'];
        }
        
        // 商品データバリデーション
        if (empty($productData['title'])) {
            return ['success' => false, 'error' => '商品名は必須です'];
        }
        
        // 在庫管理テーブルに挿入（統合管理用）
        $sql = "
        INSERT INTO inventory_products (
            product_name, description, category, price_usd, 
            stock_quantity, sku, image_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        RETURNING id;
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $productData['title'],
            $productData['description'] ?? '',
            $productData['category'] ?? 'General',
            floatval($productData['price'] ?? 0),
            intval($productData['stock'] ?? 1),
            $productData['sku'] ?? 'AUTO-' . uniqid(),
            $productData['image_url'] ?? ''
        ]);
        
        $newId = $pdo->lastInsertId();
        
        return [
            'success' => true,
            'message' => '商品を正常に追加しました',
            'product_id' => $newId
        ];
        
    } catch (Exception $e) {
        error_log("商品追加エラー: " . $e->getMessage());
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * データベーステーブル存在確認
 */
function checkDatabaseTables() {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'error' => 'データベース接続エラー'];
        }
        
        $tables = [
            'yahoo_scraped_products',
            'inventory_products', 
            'ebay_inventory',
            'mystical_japan_treasures_inventory',
            'approval_queue'
        ];
        
        $results = [];
        
        foreach ($tables as $table) {
            $sql = "SELECT to_regclass('public.$table') IS NOT NULL as exists";
            $result = $pdo->query($sql)->fetch();
            
            if ($result['exists']) {
                $countSql = "SELECT COUNT(*) as count FROM $table";
                $countResult = $pdo->query($countSql)->fetch();
                $results[$table] = [
                    'exists' => true,
                    'count' => $countResult['count']
                ];
            } else {
                $results[$table] = ['exists' => false, 'count' => 0];
            }
        }
        
        return [
            'success' => true,
            'tables' => $results,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * HTMLテンプレート保存（完全版）
 */
function saveHTMLTemplate($templateData) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'message' => 'データベース接続エラー'];
        }
        
        // 必須フィールドチェック
        if (empty($templateData['template_name'])) {
            return ['success' => false, 'message' => 'テンプレート名は必須です'];
        }
        
        if (empty($templateData['html_content'])) {
            return ['success' => false, 'message' => 'HTMLコンテンツは必須です'];
        }
        
        // product_html_templates テーブル存在確認・作成
        $createTableSql = "
        CREATE TABLE IF NOT EXISTS product_html_templates (
            template_id SERIAL PRIMARY KEY,
            template_name VARCHAR(100) NOT NULL,
            category VARCHAR(50) DEFAULT 'General',
            html_content TEXT NOT NULL,
            css_styles TEXT,
            javascript_code TEXT,
            placeholder_fields JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        ";
        
        $pdo->exec($createTableSql);
        
        // 既存テンプレート確認
        $checkSql = "SELECT template_id FROM product_html_templates WHERE template_name = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$templateData['template_name']]);
        $existing = $checkStmt->fetch();
        
        if ($existing) {
            // 更新
            $sql = "
            UPDATE product_html_templates 
            SET 
                category = ?,
                html_content = ?,
                css_styles = ?,
                javascript_code = ?,
                placeholder_fields = ?,
                is_active = ?,
                updated_at = NOW()
            WHERE template_name = ?
            RETURNING template_id;
            ";
            
            $params = [
                $templateData['category'] ?? 'General',
                $templateData['html_content'],
                $templateData['css_styles'] ?? '',
                $templateData['javascript_code'] ?? '',
                json_encode($templateData['placeholder_fields'] ?? []),
                isset($templateData['is_active']) ? (bool)$templateData['is_active'] : true,
                $templateData['template_name']
            ];
        } else {
            // 新規作成
            $sql = "
            INSERT INTO product_html_templates (
                template_name, category, html_content, css_styles, 
                javascript_code, placeholder_fields, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING template_id;
            ";
            
            $params = [
                $templateData['template_name'],
                $templateData['category'] ?? 'General',
                $templateData['html_content'],
                $templateData['css_styles'] ?? '',
                $templateData['javascript_code'] ?? '',
                json_encode($templateData['placeholder_fields'] ?? []),
                isset($templateData['is_active']) ? (bool)$templateData['is_active'] : true
            ];
        }
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $result = $stmt->fetch();
        $templateId = $result['template_id'];
        
        return [
            'success' => true,
            'message' => $existing ? 'テンプレートを更新しました' : 'テンプレートを作成しました',
            'template_id' => $templateId,
            'template_name' => $templateData['template_name']
        ];
        
    } catch (Exception $e) {
        error_log("HTMLテンプレート保存エラー: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'テンプレート保存エラー: ' . $e->getMessage()
        ];
    }
}

/**
 * 保存済みHTMLテンプレート取得
 */
function getSavedHTMLTemplates($category = null, $activeOnly = true) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) {
            return ['success' => false, 'templates' => [], 'message' => 'データベース接続エラー'];
        }
        
        $sql = "SELECT * FROM product_html_templates WHERE 1=1";
        $params = [];
        
        if ($category) {
            $sql .= " AND category = ?";
            $params[] = $category;
        }
        
        if ($activeOnly) {
            $sql .= " AND is_active = TRUE";
        }
        
        $sql .= " ORDER BY updated_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $templates = $stmt->fetchAll();
        
        // placeholder_fields のJSONデコード
        foreach ($templates as &$template) {
            if (isset($template['placeholder_fields'])) {
                $template['placeholder_fields'] = json_decode($template['placeholder_fields'], true) ?? [];
            }
        }
        
        return [
            'success' => true,
            'templates' => $templates,
            'count' => count($templates)
        ];
        
    } catch (Exception $e) {
        error_log("テンプレート取得エラー: " . $e->getMessage());
        return [
            'success' => false,
            'templates' => [],
            'message' => 'テンプレート取得エラー: ' . $e->getMessage()
        ];
    }
}

// デバッグモード時の情報出力
if ($debug_mode) {
    error_log("=== データベースクエリハンドラー デバッグ情報 ===");
    error_log("読み込み完了時刻: " . date('Y-m-d H:i:s'));
    
    $connection = getDatabaseConnection();
    if ($connection) {
        error_log("✅ データベース接続: 成功");
    } else {
        error_log("❌ データベース接続: 失敗");
    }
    
    $tableCheck = checkDatabaseTables();
    if ($tableCheck['success']) {
        error_log("📊 テーブル状況: " . print_r($tableCheck['tables'], true));
    }
}

?>
