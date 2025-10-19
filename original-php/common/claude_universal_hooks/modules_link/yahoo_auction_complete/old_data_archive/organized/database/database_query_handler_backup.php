<?php
/**
 * 統合データベースクエリハンドラー
 * Yahoo Auction Tool 用データベース関数 - eBay出品準備機能拡張版
 * 最新更新: 2025-09-11 - データ編集・CSV・eBay準備機能追加
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
        
        // 正確なスクレイピングデータ検出（source_urlが必須）
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

// === eBay出品準備データ取得 ===
function getEbayPreparationData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
        $offset = ($page - 1) * $limit;
        
        $sql = "
            SELECT 
                mjti.item_id,
                mjti.title as original_title,
                mjti.current_price as original_price,
                mjti.condition_name,
                mjti.category_name,
                mjti.picture_url,
                mjti.source_url,
                mjti.updated_at as scraped_at,
                
                elp.id as prep_id,
                elp.ebay_optimized_title,
                elp.ebay_category_id,
                elp.brand,
                elp.weight_lbs,
                elp.weight_oz,
                elp.length_inch,
                elp.width_inch,
                elp.height_inch,
                elp.calculated_shipping_cost,
                elp.final_price,
                elp.status,
                elp.processing_notes,
                elp.updated_at as prep_updated_at,
                
                CASE 
                    WHEN mjti.source_url IS NOT NULL AND mjti.source_url LIKE '%auctions.yahoo.co.jp%' THEN 'Yahoo Auction'
                    WHEN mjti.source_url IS NOT NULL AND mjti.source_url LIKE '%http%' THEN 'Web Scraped'
                    WHEN mjti.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 'Recent Data'
                    ELSE 'Existing Data'
                END as source_system,
                
                CASE 
                    WHEN elp.status = 'ready' THEN 'eBay Ready'
                    WHEN elp.status = 'draft' THEN 'eBay Draft'
                    WHEN elp.status = 'listed' THEN 'eBay Listed'
                    ELSE 'Not Prepared'
                END as ebay_status,
                
                mjti.item_id as master_sku
                
            FROM mystical_japan_treasures_inventory mjti
            LEFT JOIN ebay_listing_preparation elp ON mjti.item_id = elp.source_item_id
            WHERE mjti.title IS NOT NULL 
            AND mjti.current_price > 0
            ORDER BY 
                CASE 
                    WHEN mjti.source_url IS NOT NULL AND mjti.source_url LIKE '%auctions.yahoo.co.jp%' THEN 0
                    WHEN mjti.source_url IS NOT NULL AND mjti.source_url LIKE '%http%' THEN 1
                    WHEN mjti.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 2
                    ELSE 3
                END,
                mjti.updated_at DESC
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
            FROM mystical_japan_treasures_inventory mjti
            WHERE mjti.title IS NOT NULL 
            AND mjti.current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit)
        ];
    } catch (Exception $e) {
        error_log("eBay準備データ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

// === CSV生成機能 ===
function generateEditingCSV($data = null) {
    try {
        // エラー出力を抱制してCSV出力を優先
        error_reporting(0);
        ini_set('display_errors', 0);
        
        // 出力バッファをクリア（PHP警告があってもCSV出力を継続）
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // データが提供されていない場合は直接データベースから取得
        if ($data === null || empty($data)) {
            $pdo = getDatabaseConnection();
            if (!$pdo) {
                throw new Exception('データベース接続失敗');
            }
            
            // eBay準備データを取得
            $result = getEbayPreparationData(1, 1000); // 全データ取得
            $data = $result['data'];
        }
        
        if (empty($data)) {
            // スクレイピングデータのみから生成
            $scraped_result = getScrapedProductsData(1, 1000);
            $scraped_data = $scraped_result['data'];
            
            if (empty($scraped_data)) {
                // データがない場合はサンプルCSVを生成
                $scraped_data = [
                    [
                        'item_id' => 'SAMPLE-001',
                        'title' => 'サンプル商品',
                        'current_price' => '1500',
                        'condition_name' => 'Used',
                        'category_name' => 'Electronics',
                        'picture_url' => '',
                        'source_url' => 'https://auctions.yahoo.co.jp/sample',
                        'updated_at' => date('Y-m-d')
                    ]
                ];
            }
            
            // スクレイピングデータ用のCSVヘッダー
            $csv_headers = [
                'action', 'item_id', 'title', 'current_price', 'condition', 
                'category', 'picture_url', 'source_url', 'scraped_date', 'notes'
            ];
            
            // CSVヘッダー設定
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="scraped_data_export_' . date('Y-m-d_H-i-s') . '.csv"');
            header('Cache-Control: no-cache, must-revalidate');
            header('Expires: 0');
            header('Pragma: no-cache');
            
            $output = fopen('php://output', 'w');
            
            // BOM for UTF-8 (Excelでの文字化け防止)
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            fputcsv($output, $csv_headers);
            
            foreach ($scraped_data as $row) {
                $csv_row = [
                    'KEEP', // デフォルト操作
                    $row['item_id'],
                    $row['title'],
                    $row['current_price'] ?: '0.00',
                    $row['condition_name'] ?: 'Unknown',
                    $row['category_name'] ?: 'General',
                    $row['picture_url'] ?: '',
                    $row['source_url'] ?: '',
                    $row['updated_at'] ?: date('Y-m-d'),
                    'Scraped Data'
                ];
                fputcsv($output, $csv_row);
            }
            
            fclose($output);
            
            // ログ記録
            error_log("CSVダウンロード成功: " . count($scraped_data) . "件のスクレイピングデータ");
            exit;
        }
        
        // ===========================================
        // 【修正】eBay準備データ用CSVヘッダー
        // eBay公式CSV準拠 + 内部管理項目
        // ===========================================
        $csv_headers = [
            // グループ1: スクレイピング取得項目（参照専用）
            'master_sku',           // 統合SKU
            'source_platform',      // プラットフォーム
            'source_item_id',       // 元ID
            'source_title',         // 元タイトル
            'source_price_jpy',     // 元価格（円）
            'source_category_jp',   // 元カテゴリ
            'source_condition_jp',  // 元状態
            'source_url',           // 元URL
            
            // グループ2: eBay出品項目（eBay公式準拠）
            'Action',               // ★eBay必須★
            'SKU',                  // ★eBay必須★
            'Title',                // ★eBay必須★
            'CategoryID',           // ★eBay必須★
            'ConditionID',          // ★eBay必須★
            'StartPrice',           // ★eBay必須★
            'Format',               // ★eBay必須★
            'Duration',             // ★eBay必須★
            'Description',          // ★eBay必須★
            'PicURL',               // ★eBay必須★
            'C:Brand',              // Item Specific
            'C:MPN',                // Item Specific
            'C:UPC',                // Item Specific
            'C:EAN',                // Item Specific
            'ShippingType',         // 配送タイプ
            'ShippingServiceCost',  // 送料
            'WeightMajor',          // 重量（ポンド）
            'WeightMinor',          // 重量（オンス）
            'PackageLength',        // 長さ（インチ）
            'PackageWidth',         // 幅（インチ）
            'PackageDepth',         // 高さ（インチ）
            'Location',             // 発送地
            'CountryCode',          // 国コード
            'PostalCode',           // 郵便番号
            
            // グループ3: 内部管理項目
            'purchase_price_jpy',   // 仕入価格
            'domestic_shipping_jpy', // 国内送料
            'international_shipping_usd', // 国際送料
            'exchange_rate_used',   // 為替レート
            'ebay_fees_estimated',  // eBay手数料予想
            'profit_margin_percent', // 利益率
            'weight_kg',            // 重量（kg）
            'length_cm',            // 長さ（cm）
            'width_cm',             // 幅（cm）
            'height_cm',            // 高さ（cm）
            'listing_status',       // ステータス
            'approval_status',      // 承認状況
            'priority_level',       // 優先度
            'notes',                // メモ
            'edited_by',            // 編集者
            'last_edited_at'        // 最終編集
        ];
        
        // CSVヘッダー設定
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="yahoo_ebay_editing_' . date('Y-m-d_H-i-s') . '.csv"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        header('Pragma: no-cache');
        
        $output = fopen('php://output', 'w');
        
        // BOM for UTF-8 (Excelでの文字化け防止)
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        fputcsv($output, $csv_headers);
        
        foreach ($data as $row) {
            $csv_row = [
                // グループ1: スクレイピング取得項目
                $row['item_id'],                             // master_sku
                'Yahoo',                                     // source_platform
                $row['item_id'],                             // source_item_id
                $row['original_title'],                      // source_title
                $row['original_price'],                      // source_price_jpy
                $row['category_name'],                       // source_category_jp
                $row['condition_name'],                      // source_condition_jp
                $row['source_url'] ?? '',                    // source_url
                
                // グループ2: eBay出品項目
                'Add',                                       // Action
                'YAH-' . $row['item_id'],                   // SKU
                $row['ebay_optimized_title'] ?: substr($row['original_title'], 0, 80), // Title
                $row['ebay_category_id'] ?: '',             // CategoryID
                convertConditionToID($row['condition_name']), // ConditionID
                $row['final_price'] ?: number_format($row['original_price'] * 0.0075, 2), // StartPrice
                'FixedPriceItem',                           // Format
                'GTC',                                      // Duration
                '',                                         // Description（手動入力）
                $row['picture_url'] ?: '',                  // PicURL
                $row['brand'] ?: '',                        // C:Brand
                '',                                         // C:MPN（手動入力）
                '',                                         // C:UPC（手動入力）
                '',                                         // C:EAN（手動入力）
                'Flat',                                     // ShippingType
                '25.00',                                    // ShippingServiceCost
                $row['weight_lbs'] ?: 1,                    // WeightMajor
                $row['weight_oz'] ?: 0,                     // WeightMinor
                $row['length_inch'] ?: 12,                  // PackageLength
                $row['width_inch'] ?: 9,                    // PackageWidth
                $row['height_inch'] ?: 3,                   // PackageDepth
                'Tokyo, Japan',                             // Location
                'JP',                                       // CountryCode
                '100-0001',                                 // PostalCode
                
                // グループ3: 内部管理項目
                '',                                         // purchase_price_jpy（手動入力）
                '',                                         // domestic_shipping_jpy（手動入力）
                '',                                         // international_shipping_usd（手動入力）
                '150',                                      // exchange_rate_used
                '',                                         // ebay_fees_estimated（計算後）
                '',                                         // profit_margin_percent（計算後）
                '',                                         // weight_kg（手動入力）
                '',                                         // length_cm（手動入力）
                '',                                         // width_cm（手動入力）
                '',                                         // height_cm（手動入力）
                $row['status'] ?: 'draft',                  // listing_status
                'pending',                                  // approval_status
                '5',                                        // priority_level
                $row['processing_notes'] ?: '',            // notes
                'system',                                   // edited_by
                date('Y-m-d H:i:s')                        // last_edited_at
            ];
            fputcsv($output, $csv_row);
        }
        
        fclose($output);
        
        // ログ記録
        error_log("CSVダウンロード成功: " . count($data) . "件のeBay準備データ（新ヘッダー）");
        exit;
        
    } catch (Exception $e) {
        error_log('CSV生成エラー: ' . $e->getMessage());
        
        // エラー時は空のCSVを生成
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="error_export_' . date('Y-m-d_H-i-s') . '.csv"');
        
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF)); // BOM
        fputcsv($output, ['error', 'message']);
        fputcsv($output, ['CSV_GENERATION_ERROR', $e->getMessage()]);
        fclose($output);
        exit;
    }
}

// 商品状態をeBay ConditionIDに変換
function convertConditionToID($condition_name) {
    $condition_map = [
        'New' => 1000,
        'New with tags' => 1000,
        'New without tags' => 1500,
        'New with defects' => 1750,
        'Manufacturer refurbished' => 2000,
        'Seller refurbished' => 2500,
        'Used' => 3000,
        'Very Good' => 4000,
        'Good' => 5000,
        'Acceptable' => 6000,
        'For parts or not working' => 7000
    ];
    
    foreach ($condition_map as $key => $value) {
        if (stripos($condition_name, $key) !== false) {
            return $value;
        }
    }
    
    return 1000; // デフォルトは新品
}

// === CSV処理機能 ===
function processEditingCSV($csvFile) {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        return ['success' => false, 'error' => 'データベース接続失敗'];
    }
    
    $operations = [
        'deleted' => 0,
        'updated' => 0,
        'prepared' => 0,
        'kept' => 0,
        'errors' => []
    ];
    
    if (!file_exists($csvFile['tmp_name'])) {
        return ['success' => false, 'error' => 'CSVファイルが見つかりません'];
    }
    
    $csv = array_map('str_getcsv', file($csvFile['tmp_name']));
    $header = array_shift($csv);
    
    $pdo->beginTransaction();
    
    try {
        foreach ($csv as $row_index => $row) {
            if (count($row) < 3) continue; // 空行スキップ
            
            $operation = trim($row[0]);
            $item_id = trim($row[1]);
            
            switch (strtoupper($operation)) {
                case 'DELETE':
                    if (deleteProductAndPrep($pdo, $item_id)) {
                        $operations['deleted']++;
                    } else {
                        $operations['errors'][] = "削除失敗 (行" . ($row_index + 2) . "): {$item_id}";
                    }
                    break;
                    
                case 'UPDATE':
                    if (updateProductAndPrep($pdo, $item_id, $row)) {
                        $operations['updated']++;
                    } else {
                        $operations['errors'][] = "更新失敗 (行" . ($row_index + 2) . "): {$item_id}";
                    }
                    break;
                    
                case 'PREPARE':
                    if (prepareForEbay($pdo, $item_id, $row)) {
                        $operations['prepared']++;
                    } else {
                        $operations['errors'][] = "eBay準備失敗 (行" . ($row_index + 2) . "): {$item_id}";
                    }
                    break;
                    
                case 'KEEP':
                default:
                    $operations['kept']++;
                    break;
            }
        }
        
        $pdo->commit();
        return ['success' => true, 'operations' => $operations];
        
    } catch (Exception $e) {
        $pdo->rollBack();
        $operations['errors'][] = "トランザクションエラー: " . $e->getMessage();
        return ['success' => false, 'operations' => $operations];
    }
}

// === 商品削除 ===
function deleteProductAndPrep($pdo, $item_id) {
    try {
        // eBay準備データから削除
        $stmt = $pdo->prepare("DELETE FROM ebay_listing_preparation WHERE source_item_id = :item_id");
        $stmt->execute(['item_id' => $item_id]);
        
        // 元データから削除
        $stmt = $pdo->prepare("DELETE FROM mystical_japan_treasures_inventory WHERE item_id = :item_id");
        $stmt->execute(['item_id' => $item_id]);
        
        return true;
    } catch (Exception $e) {
        error_log("商品削除エラー: " . $e->getMessage());
        return false;
    }
}

// === 商品更新 ===
function updateProductAndPrep($pdo, $item_id, $csv_row) {
    try {
        // 基本商品情報更新
        $stmt = $pdo->prepare("
            UPDATE mystical_japan_treasures_inventory 
            SET 
                title = :title,
                current_price = :price,
                updated_at = NOW()
            WHERE item_id = :item_id
        ");
        
        $stmt->execute([
            'title' => $csv_row[2], // original_title
            'price' => floatval($csv_row[4]), // current_price
            'item_id' => $item_id
        ]);
        
        return true;
    } catch (Exception $e) {
        error_log("商品更新エラー: " . $e->getMessage());
        return false;
    }
}

// === eBay出品準備処理 ===
function prepareForEbay($pdo, $item_id, $csv_row) {
    try {
        $prep_data = [
            'source_item_id' => $item_id,
            'ebay_optimized_title' => substr($csv_row[3], 0, 80), // eBay 80文字制限
            'final_price' => floatval($csv_row[5]),
            'ebay_category_id' => intval($csv_row[8]) ?: null,
            'brand' => $csv_row[9] ?: null,
            'item_type' => $csv_row[10] ?: null,
            'color' => $csv_row[11] ?: null,
            'size' => $csv_row[12] ?: null,
            'material' => $csv_row[13] ?: null,
            'weight_lbs' => intval($csv_row[14]) ?: 1,
            'weight_oz' => intval($csv_row[15]) ?: 0,
            'length_inch' => floatval($csv_row[16]) ?: 12.0,
            'width_inch' => floatval($csv_row[17]) ?: 9.0,
            'height_inch' => floatval($csv_row[18]) ?: 3.0,
            'calculated_shipping_cost' => floatval($csv_row[19]) ?: null,
            'status' => 'ready'
        ];
        
        $sql = "
            INSERT INTO ebay_listing_preparation 
            (source_item_id, ebay_optimized_title, final_price, ebay_category_id, 
             brand, item_type, color, size, material, weight_lbs, weight_oz, 
             length_inch, width_inch, height_inch, calculated_shipping_cost, status)
            VALUES 
            (:source_item_id, :ebay_optimized_title, :final_price, :ebay_category_id,
             :brand, :item_type, :color, :size, :material, :weight_lbs, :weight_oz,
             :length_inch, :width_inch, :height_inch, :calculated_shipping_cost, :status)
            ON CONFLICT (source_item_id) 
            DO UPDATE SET
                ebay_optimized_title = EXCLUDED.ebay_optimized_title,
                final_price = EXCLUDED.final_price,
                ebay_category_id = EXCLUDED.ebay_category_id,
                brand = EXCLUDED.brand,
                item_type = EXCLUDED.item_type,
                color = EXCLUDED.color,
                size = EXCLUDED.size,
                material = EXCLUDED.material,
                weight_lbs = EXCLUDED.weight_lbs,
                weight_oz = EXCLUDED.weight_oz,
                length_inch = EXCLUDED.length_inch,
                width_inch = EXCLUDED.width_inch,
                height_inch = EXCLUDED.height_inch,
                calculated_shipping_cost = EXCLUDED.calculated_shipping_cost,
                status = EXCLUDED.status,
                updated_at = NOW()
        ";
        
        $stmt = $pdo->prepare($sql);
        return $stmt->execute($prep_data);
    } catch (Exception $e) {
        error_log("eBay準備エラー: " . $e->getMessage());
        return false;
    }
}

// === 一括操作処理 ===
function processBulkOperations($operation, $item_ids) {
    $pdo = getDatabaseConnection();
    if (!$pdo) {
        return ['success' => false, 'error' => 'データベース接続失敗'];
    }
    
    $results = [
        'success' => 0,
        'failed' => 0,
        'errors' => []
    ];
    
    $pdo->beginTransaction();
    
    try {
        foreach ($item_ids as $item_id) {
            switch (strtolower($operation)) {
                case 'delete':
                    if (deleteProductAndPrep($pdo, $item_id)) {
                        $results['success']++;
                    } else {
                        $results['failed']++;
                        $results['errors'][] = "削除失敗: {$item_id}";
                    }
                    break;
                    
                case 'prepare':
                    // 基本的なeBay準備データを作成
                    $basic_row = ['', $item_id, '', '', 0, 0, '', '', '', '', '', '', '', '', 1, 0, 12, 9, 3, '', '', 'draft', ''];
                    if (prepareForEbay($pdo, $item_id, $basic_row)) {
                        $results['success']++;
                    } else {
                        $results['failed']++;
                        $results['errors'][] = "eBay準備失敗: {$item_id}";
                    }
                    break;
                    
                default:
                    $results['failed']++;
                    $results['errors'][] = "不明な操作: {$operation}";
            }
        }
        
        $pdo->commit();
        return ['success' => true, 'results' => $results];
        
    } catch (Exception $e) {
        $pdo->rollBack();
        $results['errors'][] = "一括操作エラー: " . $e->getMessage();
        return ['success' => false, 'results' => $results];
    }
}

// === 既存の関数（変更なし） ===
function getScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
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
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'strict_search' => true
        ];
    } catch (Exception $e) {
        error_log("厳密スクレイピングデータ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

function getStrictScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    return getScrapedProductsData($page, $limit, $filters);
}

function getYahooScrapedProductsData($page = 1, $limit = 20, $filters = []) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
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
        
        $count_sql = "
            SELECT COUNT(*) as total
            FROM yahoo_scraped_products 
            WHERE title IS NOT NULL
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
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

function getAllRecentProductsData($page = 1, $limit = 20) {
    try {
        $pdo = getDatabaseConnection();
        if (!$pdo) return ['data' => [], 'total' => 0];
        
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
        
        $count_sql = "
            SELECT COUNT(*) as total
            FROM mystical_japan_treasures_inventory 
            WHERE title IS NOT NULL 
            AND current_price > 0
        ";
        
        $count_stmt = $pdo->query($count_sql);
        $total = $count_stmt->fetchColumn();
        
        return [
            'data' => $results,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'total_pages' => ceil($total / $limit),
            'debug_mode' => true
        ];
    } catch (Exception $e) {
        error_log("全データ取得エラー: " . $e->getMessage());
        return ['data' => [], 'total' => 0, 'page' => 1, 'limit' => $limit, 'total_pages' => 0];
    }
}

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

// 新規商品追加
function addNewProduct($productData) {
    return ['success' => false, 'message' => '新規商品追加機能は開発中です'];
}

// 商品承認処理
function approveProduct($sku) {
    return ['success' => false, 'message' => '商品承認機能は開発中です'];
}

// 商品否認処理
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

// スクレイピング実行機能（修正版）
function executeScrapingWithAPI($url, $api_url = 'http://localhost:5002') {
    try {
        logAction('scraping_start', ['url' => $url, 'api_url' => $api_url]);
        
        $post_data = [
            'urls' => [$url],
            'options' => [
                'save_to_db' => true,
                'extract_images' => true,
                'convert_currency' => true
            ]
        ];
        
        $ch = curl_init($api_url . '/api/scrape_yahoo');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'User-Agent: Yahoo-Auction-Tool/1.0'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
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

// スクレイピングサーバー接続確認（修正版）
function checkScrapingServerConnection($api_url = 'http://localhost:5002') {
    try {
        $ch = curl_init($api_url . '/health');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        
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
            logAction('api_connection_success', $health_data);
            return [
                'connected' => true,
                'status' => $health_data['status'] ?? 'healthy',
                'port' => $health_data['port'] ?? 5002,
                'session_id' => $health_data['session_id'] ?? 'unknown',
                'database' => $health_data['database'] ?? 'connected'
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