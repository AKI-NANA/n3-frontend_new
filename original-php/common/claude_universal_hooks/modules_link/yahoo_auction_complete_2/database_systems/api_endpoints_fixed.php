<?php
/**
 * Yahoo Auction Tool - API エンドポイント修正版
 * 実装日: 2025年9月10日
 * 目的: 既存のdatabase_query_handler.phpの関数修正・追加
 */

// エラーレポート設定
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 既存のdatabase_query_handler.phpを読み込み
require_once __DIR__ . '/../database_query_handler.php';

// ===================================
// 修正版関数群
// ===================================

/**
 * 承認待ち商品データ取得（修正版）
 * 既存のmystical_japan_treasures_inventoryテーブルとの統合対応
 */
function getApprovalQueueDataFixed($filters = []) {
    try {
        $pdo = getDatabaseConnection();
        
        $where_clauses = ["1=1"];
        $params = [];
        
        // フィルター条件の構築
        if (!empty($filters['ai_status'])) {
            $where_clauses[] = "COALESCE(aw.ai_recommendation, 'ai-pending') = :ai_status";
            $params['ai_status'] = $filters['ai_status'];
        }
        
        if (!empty($filters['approval_status'])) {
            $where_clauses[] = "COALESCE(aw.approval_status, 'pending') = :approval_status";
            $params['approval_status'] = $filters['approval_status'];
        }
        
        if (!empty($filters['category'])) {
            $where_clauses[] = "(pm.category = :category OR mjti.category_name = :category)";
            $params['category'] = $filters['category'];
        }
        
        $where_sql = implode(' AND ', $where_clauses);
        
        $sql = "
            SELECT 
                -- 基本商品情報（統合）
                COALESCE(pm.master_sku, 'MJTI-' || mjti.item_id) as master_sku,
                COALESCE(pm.product_name_jp, mjti.title) as title,
                COALESCE(pm.category, mjti.category_name) as category_name,
                COALESCE(pm.selling_price_usd, mjti.current_price * 0.0067) as current_price, -- JPY to USD 概算
                
                -- 商品詳細
                mjti.item_id,
                mjti.picture_url,
                mjti.gallery_url,
                mjti.condition_name,
                mjti.watch_count,
                mjti.updated_at,
                
                -- 承認情報（デフォルト値付き）
                COALESCE(aw.approval_status, 'pending') as approval_status,
                COALESCE(aw.ai_recommendation, 'ai-pending') as ai_status,
                COALESCE(aw.ai_confidence_score, 0.0) as ai_confidence_score,
                COALESCE(aw.priority_score, 50) as priority_score,
                
                -- リスクレベル計算（価格・状態に基づく）
                CASE 
                    WHEN mjti.current_price > 50000 THEN 'high-risk'
                    WHEN mjti.current_price > 10000 THEN 'medium-risk'
                    ELSE 'low-risk'
                END as risk_level,
                
                -- 在庫情報
                COALESCE(im.physical_stock, 1) as physical_stock,
                COALESCE(im.available_stock, 1) as available_stock,
                COALESCE(im.stock_status, 'in_stock') as stock_status
                
            FROM mystical_japan_treasures_inventory mjti
            LEFT JOIN product_master pm ON pm.master_sku = 'MJTI-' || mjti.item_id
            LEFT JOIN approval_workflow aw ON (aw.master_sku = pm.master_sku OR aw.master_sku = 'MJTI-' || mjti.item_id)
            LEFT JOIN inventory_management im ON (im.master_sku = pm.master_sku OR im.master_sku = 'MJTI-' || mjti.item_id)
            WHERE $where_sql
            ORDER BY COALESCE(aw.priority_score, 50) DESC, mjti.updated_at DESC
            LIMIT 100
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $results = $stmt->fetchAll();
        
        // データ後処理（JavaScript表示用調整）
        foreach ($results as &$result) {
            // 画像URLの修正
            if (empty($result['picture_url']) || !filter_var($result['picture_url'], FILTER_VALIDATE_URL)) {
                $result['picture_url'] = '';
            }
            
            // 価格フォーマット
            $result['current_price'] = (float)($result['current_price'] ?? 0);
            
            // AI判定状況の正規化
            if (!in_array($result['ai_status'], ['ai-approved', 'ai-rejected', 'ai-pending'])) {
                $result['ai_status'] = 'ai-pending';
            }
            
            // リスクレベルの正規化
            if (!in_array($result['risk_level'], ['low-risk', 'medium-risk', 'high-risk'])) {
                $result['risk_level'] = 'medium-risk';
            }
        }
        
        return $results;
        
    } catch (Exception $e) {
        error_log("getApprovalQueueDataFixed error: " . $e->getMessage());
        return [];
    }
}

/**
 * 商品検索（修正版）
 * 既存テーブルとの統合検索
 */
function searchProductsFixed($query, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        
        $where_clauses = ["1=1"];
        $params = [];
        
        // 検索クエリ処理
        if (!empty($query)) {
            $where_clauses[] = "(
                mjti.title ILIKE :query 
                OR mjti.category_name ILIKE :query
                OR mjti.item_id ILIKE :query
                OR pm.product_name_jp ILIKE :query
                OR pm.product_name_en ILIKE :query
                OR pm.master_sku ILIKE :query
            )";
            $params['query'] = "%$query%";
        }
        
        $where_sql = implode(' AND ', $where_clauses);
        
        $sql = "
            SELECT 
                -- 基本商品情報
                COALESCE(pm.master_sku, 'MJTI-' || mjti.item_id) as master_sku,
                COALESCE(pm.product_name_jp, mjti.title) as title,
                COALESCE(pm.category, mjti.category_name) as category_name,
                mjti.current_price,
                mjti.condition_name,
                mjti.picture_url,
                mjti.item_id,
                
                -- ステータス情報
                COALESCE(pm.product_status, 'active') as product_status,
                COALESCE(im.stock_status, 'unknown') as stock_status,
                COALESCE(eld.listing_status, 'not_listed') as listing_status,
                
                -- 在庫情報
                COALESCE(im.physical_stock, 0) as physical_stock,
                COALESCE(im.available_stock, 0) as available_stock,
                
                -- eBay情報
                eld.ebay_item_id,
                eld.listing_price_usd,
                
                -- 更新情報
                mjti.updated_at,
                mjti.watch_count
                
            FROM mystical_japan_treasures_inventory mjti
            LEFT JOIN product_master pm ON pm.master_sku = 'MJTI-' || mjti.item_id
            LEFT JOIN inventory_management im ON (im.master_sku = pm.master_sku OR im.master_sku = 'MJTI-' || mjti.item_id)
            LEFT JOIN ebay_listing_data eld ON (eld.master_sku = pm.master_sku OR eld.master_sku = 'MJTI-' || mjti.item_id)
            WHERE $where_sql
            ORDER BY mjti.updated_at DESC
            LIMIT 50
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll();
        
    } catch (Exception $e) {
        error_log("searchProductsFixed error: " . $e->getMessage());
        return [];
    }
}

/**
 * ダッシュボード統計データ取得（修正版）
 * 既存データベースとの統合統計
 */
function getDashboardStatsFixed() {
    try {
        $pdo = getDatabaseConnection();
        
        // 既存テーブルからの基本統計
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total_products,
                COUNT(CASE WHEN listing_status = 'Active' THEN 1 END) as active_products,
                COUNT(CASE WHEN listing_status = 'Ended' THEN 1 END) as ended_products,
                SUM(current_price) as total_value_jpy,
                AVG(current_price) as avg_price_jpy,
                MAX(updated_at) as last_updated
            FROM mystical_japan_treasures_inventory
        ");
        $basic_stats = $stmt->fetch();
        
        // 新システムからの統計（存在する場合）
        $new_stats = ['total' => 0, 'pending' => 0, 'approved' => 0];
        
        $stmt = $pdo->query("
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN approval_status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved
            FROM approval_workflow
        ");
        $approval_stats = $stmt->fetch();
        if ($approval_stats) {
            $new_stats = $approval_stats;
        }
        
        // 在庫統計
        $inventory_stats = ['total_stock' => 0, 'in_stock' => 0, 'low_stock' => 0];
        
        $stmt = $pdo->query("
            SELECT 
                SUM(physical_stock) as total_stock,
                COUNT(CASE WHEN stock_status = 'in_stock' THEN 1 END) as in_stock,
                COUNT(CASE WHEN stock_status = 'low_stock' THEN 1 END) as low_stock
            FROM inventory_management
        ");
        $inv_result = $stmt->fetch();
        if ($inv_result) {
            $inventory_stats = $inv_result;
        }
        
        return [
            'total_records' => (int)$basic_stats['total_products'],
            'scraped_count' => (int)$basic_stats['total_products'], // 既存データ = スクレイピング済み
            'calculated_count' => (int)$basic_stats['active_products'],
            'filtered_count' => (int)($basic_stats['total_products'] - $basic_stats['ended_products']),
            'ready_count' => (int)$new_stats['approved'],
            'listed_count' => (int)$basic_stats['active_products'],
            'pending_approval' => (int)$new_stats['pending'],
            'total_value_jpy' => (float)($basic_stats['total_value_jpy'] ?? 0),
            'average_price_jpy' => (float)($basic_stats['avg_price_jpy'] ?? 0),
            'inventory_total' => (int)($inventory_stats['total_stock'] ?? 0),
            'last_updated' => $basic_stats['last_updated'] ?? date('Y-m-d H:i:s')
        ];
        
    } catch (Exception $e) {
        error_log("getDashboardStatsFixed error: " . $e->getMessage());
        return [
            'total_records' => 0,
            'scraped_count' => 0,
            'calculated_count' => 0,
            'filtered_count' => 0,
            'ready_count' => 0,
            'listed_count' => 0
        ];
    }
}

/**
 * 新規商品登録（修正版）
 * 既存システムとの統合対応
 */
function addNewProductFixed($productData) {
    try {
        $pdo = getDatabaseConnection();
        $pdo->beginTransaction();
        
        $master_sku = $productData['sku'] ?? 'NEW-' . uniqid();
        
        // 商品マスター登録
        $sql = "
            INSERT INTO product_master (
                master_sku, product_name_jp, product_name_en, category, 
                brand, condition_type, purchase_price_jpy, selling_price_usd
            ) VALUES (
                :master_sku, :product_name_jp, :product_name_en, :category,
                :brand, :condition_type, :purchase_price_jpy, :selling_price_usd
            )
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'master_sku' => $master_sku,
            'product_name_jp' => $productData['name'] ?? '',
            'product_name_en' => $productData['name_en'] ?? $productData['name'] ?? '',
            'category' => $productData['category'] ?? '',
            'brand' => $productData['brand'] ?? '',
            'condition_type' => $productData['condition'] ?? 'new',
            'purchase_price_jpy' => $productData['purchase_price'] ?? 0,
            'selling_price_usd' => $productData['selling_price'] ?? 0
        ]);
        
        // 在庫管理レコード作成
        $sql = "
            INSERT INTO inventory_management (
                master_sku, inventory_type, management_system, physical_stock, available_stock
            ) VALUES (
                :master_sku, :inventory_type, :management_system, :physical_stock, :available_stock
            )
        ";
        
        $stock_amount = (int)($productData['stock'] ?? 1);
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'master_sku' => $master_sku,
            'inventory_type' => $productData['inventory_type'] ?? 'physical',
            'management_system' => 'manual_input',
            'physical_stock' => $stock_amount,
            'available_stock' => $stock_amount
        ]);
        
        // 承認ワークフローに追加
        $sql = "
            INSERT INTO approval_workflow (
                master_sku, approval_status, ai_recommendation, priority_score
            ) VALUES (
                :master_sku, :approval_status, :ai_recommendation, :priority_score
            )
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'master_sku' => $master_sku,
            'approval_status' => 'pending',
            'ai_recommendation' => 'review_required',
            'priority_score' => 50
        ]);
        
        $pdo->commit();
        return ['success' => true, 'master_sku' => $master_sku];
        
    } catch (Exception $e) {
        if (isset($pdo)) {
            $pdo->rollBack();
        }
        error_log("addNewProductFixed error: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * 禁止キーワードデータ取得
 */
function getProhibitedKeywords() {
    try {
        $pdo = getDatabaseConnection();
        
        $sql = "
            SELECT 
                id,
                keyword,
                category,
                priority_level,
                detection_count,
                status,
                created_at,
                last_detected_at
            FROM prohibited_keywords 
            WHERE status = 'active'
            ORDER BY priority_level DESC, detection_count DESC
            LIMIT 1000
        ";
        
        $stmt = $pdo->query($sql);
        return $stmt->fetchAll();
        
    } catch (Exception $e) {
        error_log("getProhibitedKeywords error: " . $e->getMessage());
        return [];
    }
}

/**
 * タイトルの禁止キーワードチェック
 */
function checkTitleForProhibitedKeywords($title) {
    try {
        $pdo = getDatabaseConnection();
        
        $sql = "
            SELECT keyword, category, priority_level
            FROM prohibited_keywords 
            WHERE status = 'active' 
            AND LOWER(:title) LIKE CONCAT('%', LOWER(keyword), '%')
            ORDER BY priority_level DESC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['title' => $title]);
        
        $detected = $stmt->fetchAll();
        
        // 検出カウントの更新
        if (!empty($detected)) {
            foreach ($detected as $keyword) {
                $update_sql = "
                    UPDATE prohibited_keywords 
                    SET detection_count = detection_count + 1,
                        last_detected_at = CURRENT_TIMESTAMP
                    WHERE keyword = :keyword
                ";
                $update_stmt = $pdo->prepare($update_sql);
                $update_stmt->execute(['keyword' => $keyword['keyword']]);
            }
        }
        
        return [
            'has_prohibited' => !empty($detected),
            'detected_keywords' => $detected,
            'risk_level' => empty($detected) ? 'safe' : (
                in_array('high', array_column($detected, 'priority_level')) ? 'high' : 'medium'
            )
        ];
        
    } catch (Exception $e) {
        error_log("checkTitleForProhibitedKeywords error: " . $e->getMessage());
        return ['has_prohibited' => false, 'detected_keywords' => [], 'risk_level' => 'unknown'];
    }
}

/**
 * 一括承認処理
 */
function bulkApproveProducts($productIds, $action = 'approve') {
    try {
        $pdo = getDatabaseConnection();
        $pdo->beginTransaction();
        
        $status = ($action === 'approve') ? 'approved' : 'rejected';
        $placeholders = str_repeat('?,', count($productIds) - 1) . '?';
        
        // 承認ワークフローの更新
        $sql = "
            UPDATE approval_workflow 
            SET approval_status = ?, 
                human_decision = ?,
                reviewed_at = CURRENT_TIMESTAMP,
                approved_at = CASE WHEN ? = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE master_sku IN ($placeholders)
        ";
        
        $params = array_merge([$status, $status, $status], $productIds);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $affected_rows = $stmt->rowCount();
        
        // 商品マスターのステータス更新
        if ($action === 'approve') {
            $update_sql = "
                UPDATE product_master 
                SET product_status = 'approved'
                WHERE master_sku IN ($placeholders)
            ";
            $stmt = $pdo->prepare($update_sql);
            $stmt->execute($productIds);
        }
        
        $pdo->commit();
        return ['success' => true, 'affected_rows' => $affected_rows];
        
    } catch (Exception $e) {
        if (isset($pdo)) {
            $pdo->rollBack();
        }
        error_log("bulkApproveProducts error: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * データベース接続確認
 */
function checkDatabaseConnectionFixed() {
    try {
        $pdo = getDatabaseConnection();
        
        // 基本テーブル存在確認
        $tables_to_check = [
            'mystical_japan_treasures_inventory',
            'product_master',
            'approval_workflow',
            'inventory_management',
            'prohibited_keywords'
        ];
        
        $existing_tables = [];
        $missing_tables = [];
        
        foreach ($tables_to_check as $table) {
            $stmt = $pdo->prepare("
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = ?
                )
            ");
            $stmt->execute([$table]);
            
            if ($stmt->fetchColumn()) {
                $existing_tables[] = $table;
            } else {
                $missing_tables[] = $table;
            }
        }
        
        return [
            'connected' => true,
            'existing_tables' => $existing_tables,
            'missing_tables' => $missing_tables,
            'setup_required' => !empty($missing_tables)
        ];
        
    } catch (Exception $e) {
        error_log("checkDatabaseConnectionFixed error: " . $e->getMessage());
        return [
            'connected' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * レスポンス生成（修正版）
 */
function generateApiResponseFixed($action, $data, $success = true, $message = '') {
    return [
        'success' => $success,
        'action' => $action,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s'),
        'count' => is_array($data) ? count($data) : (empty($data) ? 0 : 1),
        'server_version' => 'YAT-v1.0-fixed'
    ];
}

?>
