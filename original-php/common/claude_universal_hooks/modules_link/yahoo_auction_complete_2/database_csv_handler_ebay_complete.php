<?php
/**
 * eBay出品完全対応・CSV処理ハンドラー（2025年最新版）
 * HTML格納・画像管理・既存システム統合対応
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

class EbayCompleteCSVHandler {
    private $pdo;
    private $csv_headers_complete;
    
    public function __construct() {
        $this->initializeDatabase();
        $this->setupCompleteCSVHeaders();
    }
    
    /**
     * データベース接続初期化
     */
    private function initializeDatabase() {
        try {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $dbname = $_ENV['DB_NAME'] ?? 'nagano3_db';
            $username = $_ENV['DB_USER'] ?? 'admin';
            $password = $_ENV['DB_PASS'] ?? 'Naganoken1!';
            $port = $_ENV['DB_PORT'] ?? '5432';
            
            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname};";
            
            $this->pdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
            
            $this->logMessage('INFO', 'データベース接続成功');
        } catch (PDOException $e) {
            $this->logMessage('ERROR', 'データベース接続失敗: ' . $e->getMessage());
            throw new Exception('データベース接続に失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * eBay出品完全対応CSV ヘッダー定義
     */
    private function setupCompleteCSVHeaders() {
        $this->csv_headers_complete = [
            // === 操作・管理列 ===
            'operation' => '操作指示',
            'internal_notes' => '内部メモ',
            'processing_status' => '処理ステータス',
            
            // === スクレイピング元データ（参照のみ） ===
            'source_item_id' => '元商品ID',
            'source_platform' => 'プラットフォーム',
            'source_title_jp' => '元タイトル（日本語）',
            'source_price_jpy' => '元価格（円）',
            'source_category_jp' => '元カテゴリ',
            'source_condition_jp' => '元商品状態',
            'source_url' => '元商品URL',
            'source_image_urls_list' => '元画像URL一覧',
            
            // === eBay基本出品データ（編集必須） ===
            'ebay_action' => 'eBayアクション',
            'ebay_sku' => 'eBay SKU',
            'ebay_title' => 'eBayタイトル（80文字制限）',
            'ebay_category_id' => 'eBayカテゴリID',
            'ebay_condition_id' => 'eBay商品状態ID',
            'ebay_start_price' => 'eBay開始価格（USD）',
            'ebay_quantity' => '数量',
            'ebay_format' => 'eBay出品形式',
            'ebay_duration' => 'eBay出品期間',
            
            // === eBay説明文・HTML格納（重要！） ===
            'ebay_description_text' => 'eBay説明文（プレーンテキスト）',
            'ebay_description_html' => 'eBay説明文（HTML形式・投稿用）',
            'ebay_description_template' => '使用テンプレート',
            'ebay_embedded_images_html' => '説明文内画像HTML',
            
            // === eBay画像URL（最大24枚対応） ===
            'ebay_main_image_url' => 'eBayメイン画像URL',
            'ebay_image_url_1' => 'eBay画像URL 1',
            'ebay_image_url_2' => 'eBay画像URL 2',
            'ebay_image_url_3' => 'eBay画像URL 3',
            'ebay_image_url_4' => 'eBay画像URL 4',
            'ebay_image_url_5' => 'eBay画像URL 5',
            'ebay_image_url_6' => 'eBay画像URL 6',
            'ebay_image_url_7' => 'eBay画像URL 7',
            'ebay_image_url_8' => 'eBay画像URL 8',
            'ebay_image_url_9' => 'eBay画像URL 9',
            'ebay_image_url_10' => 'eBay画像URL 10',
            'ebay_image_url_11' => 'eBay画像URL 11',
            'ebay_image_url_12' => 'eBay画像URL 12',
            'ebay_image_url_13' => 'eBay画像URL 13',
            'ebay_image_url_14' => 'eBay画像URL 14',
            'ebay_image_url_15' => 'eBay画像URL 15',
            'ebay_image_url_16' => 'eBay画像URL 16',
            'ebay_image_url_17' => 'eBay画像URL 17',
            'ebay_image_url_18' => 'eBay画像URL 18',
            'ebay_image_url_19' => 'eBay画像URL 19',
            'ebay_image_url_20' => 'eBay画像URL 20',
            'ebay_image_url_21' => 'eBay画像URL 21',
            'ebay_image_url_22' => 'eBay画像URL 22',
            'ebay_image_url_23' => 'eBay画像URL 23',
            'ebay_image_url_24' => 'eBay画像URL 24',
            'ebay_image_hosting_service' => '画像ホスティングサービス',
            
            // === eBay商品詳細項目 ===
            'ebay_brand' => 'ブランド名',
            'ebay_model' => 'モデル名',
            'ebay_mpn' => '製造者部品番号',
            'ebay_upc' => 'UPCコード',
            'ebay_ean' => 'EANコード',
            'ebay_isbn' => 'ISBNコード',
            'ebay_color' => '色',
            'ebay_size' => 'サイズ',
            'ebay_material' => '素材',
            'ebay_country_manufacture' => '製造国',
            'ebay_custom_specifics_json' => 'カスタム商品詳細（JSON）',
            
            // === eBay配送設定 ===
            'ebay_shipping_type' => '配送タイプ',
            'ebay_shipping_cost' => '送料（USD）',
            'ebay_shipping_policy_id' => '配送ポリシーID',
            'ebay_weight_major' => '重量（ポンド）',
            'ebay_weight_minor' => '重量（オンス）',
            'ebay_package_length' => '長さ（インチ）',
            'ebay_package_width' => '幅（インチ）',
            'ebay_package_depth' => '高さ（インチ）',
            'ebay_handling_time' => '処理日数',
            'ebay_ship_from_location' => '発送地',
            'ebay_ship_from_country' => '発送国コード',
            
            // === eBayポリシー設定 ===
            'ebay_return_policy_id' => '返品ポリシーID',
            'ebay_payment_policy_id' => '支払いポリシーID',
            'ebay_fulfillment_policy_id' => 'フルフィルメントポリシーID',
            'ebay_best_offer_enabled' => 'ベストオファー有効',
            'ebay_private_listing' => 'プライベートリスト',
            'ebay_listing_enhancement' => 'リスト強化オプション',
            
            // === 利益計算・内部管理データ ===
            'calc_purchase_price_jpy' => '仕入価格（円）',
            'calc_domestic_shipping_jpy' => '国内送料（円）',
            'calc_international_shipping_usd' => '国際送料（USD）',
            'calc_ebay_fees_usd' => 'eBay手数料（USD・自動計算）',
            'calc_paypal_fees_usd' => 'PayPal手数料（USD・自動計算）',
            'calc_exchange_rate' => '為替レート',
            'calc_total_cost_usd' => '総コスト（USD・自動計算）',
            'calc_net_profit_usd' => '実質利益（USD・自動計算）',
            'calc_profit_margin_percent' => '利益率（%・自動計算）',
            'calc_roi_percent' => 'ROI（%・自動計算）',
            'calc_break_even_price_usd' => '損益分岐点価格（USD・自動計算）',
            
            // === 品質・分析データ（参照のみ） ===
            'quality_score' => '品質スコア（自動計算）',
            'risk_level' => 'リスクレベル（自動判定）',
            'prohibited_keywords_detected' => '禁止キーワード検出',
            'title_optimization_score' => 'タイトル最適化スコア',
            'price_competitiveness_score' => '価格競争力スコア',
            'demand_forecast_score' => '需要予測スコア',
            'competitor_count' => '競合商品数',
            'market_saturation_level' => '市場飽和レベル',
            
            // === システム管理データ ===
            'master_sku' => 'マスターSKU',
            'ebay_item_id' => 'eBay商品ID（出品後）',
            'ebay_listing_status' => 'eBay出品ステータス',
            'ebay_views_count' => 'eBay閲覧数',
            'ebay_watchers_count' => 'eBayウォッチ数',
            'ebay_sold_quantity' => 'eBay販売数',
            'ebay_sold_price' => 'eBay売却価格',
            'updated_at' => '最終更新日時',
            'last_error_message' => '最終エラーメッセージ'
        ];
    }
    
    /**
     * eBay出品準備完了CSV エクスポート
     */
    public function exportEbayReadyCSV($filters = []) {
        try {
            $this->logMessage('INFO', 'eBay出品用CSVエクスポート開始');
            
            // フィルター条件構築
            $where_conditions = ['1=1'];
            $params = [];
            
            if (!empty($filters['status'])) {
                $where_conditions[] = 'processing_status = :status';
                $params['status'] = $filters['status'];
            }
            
            if (!empty($filters['risk_level'])) {
                $where_conditions[] = 'risk_level = :risk_level';
                $params['risk_level'] = $filters['risk_level'];
            }
            
            if (!empty($filters['min_profit'])) {
                $where_conditions[] = 'calc_net_profit_usd >= :min_profit';
                $params['min_profit'] = $filters['min_profit'];
            }
            
            if (!empty($filters['ready_only'])) {
                $where_conditions[] = 'processing_status IN (\'ready\', \'pending\')';
                $where_conditions[] = 'ebay_title IS NOT NULL';
                $where_conditions[] = 'ebay_category_id IS NOT NULL';
                $where_conditions[] = 'ebay_start_price > 0';
            }
            
            $where_clause = implode(' AND ', $where_conditions);
            
            // メインクエリ
            $sql = "SELECT * FROM ebay_csv_export_complete WHERE {$where_clause}";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll();
            
            $this->logMessage('INFO', "eBay CSV エクスポート: " . count($data) . "件のデータを取得");
            
            return $this->generateEbayCSV($data);
            
        } catch (Exception $e) {
            $this->logMessage('ERROR', 'eBay CSV エクスポートエラー: ' . $e->getMessage());
            throw new Exception('eBay CSV エクスポートに失敗しました: ' . $e->getMessage());
        }
    }
    
    /**
     * eBay出品用CSV ファイル生成
     */
    private function generateEbayCSV($data) {
        $csv_content = '';
        
        // ヘッダー行生成（eBay出品対応版）
        $headers = array_keys($this->csv_headers_complete);
        $csv_content .= implode(',', array_map([$this, 'csvEscape'], $headers)) . "\n";
        
        // データ行生成
        foreach ($data as $row) {
            $csv_row = [];
            foreach ($headers as $header) {
                $value = $row[$header] ?? '';
                
                // 特別なフォーマット処理
                if (in_array($header, ['ebay_start_price', 'calc_net_profit_usd', 'calc_total_cost_usd'])) {
                    $value = number_format((float)$value, 2);
                } elseif (in_array($header, ['calc_profit_margin_percent', 'calc_roi_percent'])) {
                    $value = number_format((float)$value, 1) . '%';
                } elseif ($header === 'updated_at' && $value) {
                    $value = date('Y-m-d H:i:s', strtotime($value));
                } elseif ($header === 'ebay_best_offer_enabled' || $header === 'ebay_private_listing') {
                    $value = $value ? 'true' : 'false';
                }
                
                $csv_row[] = $this->csvEscape($value);
            }
            $csv_content .= implode(',', $csv_row) . "\n";
        }
        
        return [
            'content' => $csv_content,
            'filename' => 'ebay_listing_ready_' . date('Y-m-d_H-i-s') . '.csv',
            'row_count' => count($data),
            'format' => 'ebay_complete'
        ];
    }
    
    /**
     * HTML説明文生成
     */
    public function generateEbayHTML($product_data, $template = 'standard') {
        try {
            $title = $product_data['ebay_title'] ?? $product_data['source_title_jp'] ?? '';
            $description = $product_data['ebay_description_text'] ?? $product_data['source_description_jp'] ?? '';
            $brand = $product_data['ebay_brand'] ?? '';
            $condition = $product_data['source_condition_jp'] ?? 'Used';
            
            // 画像URL配列生成
            $image_urls = [];
            if (!empty($product_data['ebay_main_image_url'])) {
                $image_urls[] = $product_data['ebay_main_image_url'];
            }
            
            // ギャラリー画像追加
            for ($i = 1; $i <= 24; $i++) {
                $image_key = "ebay_image_url_{$i}";
                if (!empty($product_data[$image_key])) {
                    $image_urls[] = $product_data[$image_key];
                }
            }
            
            // SQL関数呼び出し
            $sql = "SELECT generate_ebay_html_description(:title, :description, :images, :brand, :condition, :template) as html";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                'title' => $title,
                'description' => $description,
                'images' => '{' . implode(',', array_map(function($url) { return '"' . $url . '"'; }, $image_urls)) . '}',
                'brand' => $brand ?: null,
                'condition' => $condition,
                'template' => $template
            ]);
            
            $result = $stmt->fetch();
            
            return [
                'success' => true,
                'html' => $result['html'],
                'template_used' => $template,
                'image_count' => count($image_urls)
            ];
            
        } catch (Exception $e) {
            $this->logMessage('ERROR', 'HTML生成エラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'html' => ''
            ];
        }
    }
    
    /**
     * 既存データ統合移行
     */
    public function migrateExistingData($batch_size = 50) {
        try {
            $this->logMessage('INFO', '既存データ統合移行開始');
            
            // 移行関数実行
            $sql = "SELECT * FROM migrate_existing_to_ebay_complete()";
            $stmt = $this->pdo->query($sql);
            $results = $stmt->fetchAll();
            
            $total_migrated = 0;
            $migration_summary = [];
            
            foreach ($results as $result) {
                $total_migrated += $result['migrated_count'];
                $migration_summary[] = [
                    'source_table' => $result['source_table'],
                    'migrated_count' => $result['migrated_count'],
                    'success' => $result['success']
                ];
            }
            
            $this->logMessage('INFO', "既存データ統合移行完了: 総計{$total_migrated}件");
            
            return [
                'success' => true,
                'total_migrated' => $total_migrated,
                'details' => $migration_summary
            ];
            
        } catch (Exception $e) {
            $this->logMessage('ERROR', '既存データ移行エラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'total_migrated' => 0
            ];
        }
    }
    
    /**
     * eBay出品レディ商品取得
     */
    public function getEbayReadyProducts($limit = 50) {
        try {
            $sql = "
                SELECT 
                    master_sku,
                    ebay_title,
                    ebay_start_price,
                    calc_net_profit_usd,
                    quality_score,
                    risk_level,
                    processing_status,
                    ebay_main_image_url,
                    updated_at
                FROM ebay_listing_complete 
                WHERE processing_status IN ('ready', 'pending')
                  AND ebay_title IS NOT NULL
                  AND ebay_category_id IS NOT NULL
                  AND ebay_start_price > 0
                ORDER BY quality_score DESC, calc_net_profit_usd DESC
                LIMIT :limit
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            $products = $stmt->fetchAll();
            
            return [
                'success' => true,
                'data' => $products,
                'count' => count($products)
            ];
            
        } catch (Exception $e) {
            $this->logMessage('ERROR', 'eBay レディ商品取得エラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * CSV インポート処理（eBay完全版対応）
     */
    public function importEbayCompleteCSV($file_content) {
        try {
            $this->logMessage('INFO', 'eBay完全版CSVインポート開始');
            
            // CSV パース
            $lines = str_getcsv($file_content, "\n");
            
            if (empty($lines)) {
                throw new Exception('CSVファイルが空です');
            }
            
            // ヘッダー行取得・検証
            $header_line = array_shift($lines);
            $csv_headers = str_getcsv($header_line);
            
            $this->validateEbayCSVHeaders($csv_headers);
            
            $imported_count = 0;
            $updated_count = 0;
            $deleted_count = 0;
            $html_generated_count = 0;
            $errors = [];
            
            $this->pdo->beginTransaction();
            
            foreach ($lines as $line_number => $line) {
                if (empty(trim($line))) continue;
                
                try {
                    $row_data = str_getcsv($line);
                    
                    // データ行とヘッダーのマッピング
                    $mapped_data = array_combine($csv_headers, $row_data);
                    
                    $result = $this->processEbayCSVRow($mapped_data, $line_number + 2);
                    
                    switch ($result['action']) {
                        case 'INSERT':
                            $imported_count++;
                            break;
                        case 'UPDATE':
                            $updated_count++;
                            break;
                        case 'DELETE':
                            $deleted_count++;
                            break;
                    }
                    
                    // HTML自動生成
                    if (in_array($result['action'], ['INSERT', 'UPDATE']) && 
                        !empty($mapped_data['ebay_title']) && 
                        empty($mapped_data['ebay_description_html'])) {
                        
                        $html_result = $this->generateEbayHTML($mapped_data);
                        if ($html_result['success']) {
                            $this->updateProductHTML($mapped_data['master_sku'], $html_result['html']);
                            $html_generated_count++;
                        }
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "行 " . ($line_number + 2) . ": " . $e->getMessage();
                    
                    // エラーが多すぎる場合は中止
                    if (count($errors) > 50) {
                        throw new Exception('エラーが多すぎます（50件超過）。処理を中止します。');
                    }
                }
            }
            
            $this->pdo->commit();
            
            $this->logMessage('INFO', "eBay完全版CSVインポート完了: 新規{$imported_count}件, 更新{$updated_count}件, 削除{$deleted_count}件, HTML生成{$html_generated_count}件");
            
            return [
                'success' => true,
                'imported' => $imported_count,
                'updated' => $updated_count,
                'deleted' => $deleted_count,
                'html_generated' => $html_generated_count,
                'errors' => $errors,
                'total_processed' => count($lines)
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $this->logMessage('ERROR', 'eBay完全版CSVインポートエラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'imported' => 0,
                'updated' => 0,
                'deleted' => 0
            ];
        }
    }
    
    /**
     * eBay CSV ヘッダー検証
     */
    private function validateEbayCSVHeaders($csv_headers) {
        $required_headers = ['operation', 'master_sku', 'ebay_title', 'ebay_category_id'];
        $missing_headers = [];
        
        foreach ($required_headers as $required) {
            if (!in_array($required, $csv_headers)) {
                $missing_headers[] = $required;
            }
        }
        
        if (!empty($missing_headers)) {
            throw new Exception('必須ヘッダーが不足しています: ' . implode(', ', $missing_headers));
        }
    }
    
    /**
     * eBay CSV 行処理
     */
    private function processEbayCSVRow($data, $line_number) {
        $operation = strtoupper($data['operation'] ?? 'KEEP');
        $master_sku = $data['master_sku'] ?? '';
        
        if (empty($master_sku)) {
            throw new Exception('マスターSKUが空です');
        }
        
        switch ($operation) {
            case 'DELETE':
                return $this->deleteEbayRecord($master_sku);
                
            case 'UPDATE':
            case 'PREPARE':
            case 'PUBLISH':
                return $this->updateEbayRecord($data);
                
            case 'KEEP':
            default:
                // 何もしない（既存データ保持）
                return ['action' => 'KEEP'];
        }
    }
    
    /**
     * eBay レコード削除
     */
    private function deleteEbayRecord($master_sku) {
        $sql = "DELETE FROM ebay_listing_complete WHERE master_sku = :master_sku";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['master_sku' => $master_sku]);
        
        return ['action' => 'DELETE', 'affected_rows' => $stmt->rowCount()];
    }
    
    /**
     * eBay レコード更新・挿入
     */
    private function updateEbayRecord($data) {
        $master_sku = $data['master_sku'];
        
        // 既存レコード確認
        $sql = "SELECT id FROM ebay_listing_complete WHERE master_sku = :master_sku";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(['master_sku' => $master_sku]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            return $this->updateExistingEbayRecord($data);
        } else {
            return $this->insertNewEbayRecord($data);
        }
    }
    
    /**
     * eBay 既存レコード更新
     */
    private function updateExistingEbayRecord($data) {
        $updates = [];
        $params = ['master_sku' => $data['master_sku']];
        
        // 更新可能フィールドのマッピング（eBay完全版）
        $updatable_fields = [
            'operation', 'internal_notes', 'processing_status',
            'ebay_action', 'ebay_sku', 'ebay_title', 'ebay_category_id', 'ebay_condition_id',
            'ebay_start_price', 'ebay_quantity', 'ebay_format', 'ebay_duration',
            'ebay_description_text', 'ebay_description_html', 'ebay_description_template',
            'ebay_main_image_url', 'ebay_brand', 'ebay_model', 'ebay_mpn', 'ebay_upc', 'ebay_ean',
            'ebay_color', 'ebay_size', 'ebay_material', 'ebay_country_manufacture',
            'ebay_shipping_type', 'ebay_shipping_cost', 'ebay_shipping_policy_id',
            'ebay_weight_major', 'ebay_weight_minor', 'ebay_package_length', 'ebay_package_width', 'ebay_package_depth',
            'ebay_handling_time', 'ebay_ship_from_location', 'ebay_ship_from_country',
            'ebay_return_policy_id', 'ebay_payment_policy_id', 'ebay_fulfillment_policy_id',
            'ebay_best_offer_enabled', 'ebay_private_listing', 'ebay_listing_enhancement',
            'calc_purchase_price_jpy', 'calc_domestic_shipping_jpy', 'calc_international_shipping_usd', 'calc_exchange_rate'
        ];
        
        // 画像URL更新（24枚対応）
        for ($i = 1; $i <= 24; $i++) {
            $updatable_fields[] = "ebay_image_url_{$i}";
        }
        
        foreach ($updatable_fields as $field) {
            if (isset($data[$field]) && $data[$field] !== '') {
                $updates[] = "{$field} = :{$field}";
                
                // 真偽値の変換
                if (in_array($field, ['ebay_best_offer_enabled', 'ebay_private_listing'])) {
                    $params[$field] = filter_var($data[$field], FILTER_VALIDATE_BOOLEAN);
                } else {
                    $params[$field] = $data[$field];
                }
            }
        }
        
        // ギャラリー画像配列更新
        $gallery_urls = [];
        for ($i = 1; $i <= 24; $i++) {
            $image_key = "ebay_image_url_{$i}";
            if (!empty($data[$image_key])) {
                $gallery_urls[] = $data[$image_key];
            }
        }
        
        if (!empty($gallery_urls)) {
            $updates[] = "ebay_gallery_urls = :gallery_urls";
            $params['gallery_urls'] = '{' . implode(',', array_map(function($url) { return '"' . str_replace('"', '""', $url) . '"'; }, $gallery_urls)) . '}';
        }
        
        if (empty($updates)) {
            return ['action' => 'NO_CHANGE'];
        }
        
        $sql = "
            UPDATE ebay_listing_complete 
            SET " . implode(', ', $updates) . "
            WHERE master_sku = :master_sku
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return ['action' => 'UPDATE', 'affected_rows' => $stmt->rowCount()];
    }
    
    /**
     * eBay 新規レコード挿入
     */
    private function insertNewEbayRecord($data) {
        // 最小限必須データでレコード作成
        $sql = "
            INSERT INTO ebay_listing_complete (
                master_sku, operation, ebay_title, ebay_category_id, 
                ebay_condition_id, ebay_start_price, processing_status
            ) VALUES (
                :master_sku, :operation, :ebay_title, :ebay_category_id,
                :ebay_condition_id, :ebay_start_price, :processing_status
            )
        ";
        
        $params = [
            'master_sku' => $data['master_sku'],
            'operation' => $data['operation'] ?? 'PREPARE',
            'ebay_title' => $data['ebay_title'] ?? '',
            'ebay_category_id' => $data['ebay_category_id'] ?? null,
            'ebay_condition_id' => $data['ebay_condition_id'] ?? 3000,
            'ebay_start_price' => $data['ebay_start_price'] ?? 0,
            'processing_status' => $data['processing_status'] ?? 'pending'
        ];
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        // 追加データがあれば更新
        if (count($data) > 7) {
            $this->updateExistingEbayRecord($data);
        }
        
        return ['action' => 'INSERT', 'affected_rows' => $stmt->rowCount()];
    }
    
    /**
     * 商品HTML更新
     */
    private function updateProductHTML($master_sku, $html_content) {
        $sql = "
            UPDATE ebay_listing_complete 
            SET ebay_description_html = :html, ebay_html_generated_at = NOW()
            WHERE master_sku = :master_sku
        ";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([
            'html' => $html_content,
            'master_sku' => $master_sku
        ]);
    }
    
    /**
     * 統計情報取得（eBay完全版対応）
     */
    public function getEbayCompleteStatistics() {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_records,
                    COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN processing_status = 'ready' THEN 1 END) as ready_count,
                    COUNT(CASE WHEN processing_status = 'published' THEN 1 END) as published_count,
                    COUNT(CASE WHEN ebay_listing_status = 'active' THEN 1 END) as active_listings,
                    COUNT(CASE WHEN ebay_sold_quantity > 0 THEN 1 END) as sold_items,
                    COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_risk_count,
                    COUNT(CASE WHEN risk_level = 'medium' THEN 1 END) as medium_risk_count,
                    COUNT(CASE WHEN risk_level = 'low' THEN 1 END) as low_risk_count,
                    COUNT(CASE WHEN ebay_description_html IS NOT NULL THEN 1 END) as html_ready_count,
                    COUNT(CASE WHEN ebay_main_image_url IS NOT NULL THEN 1 END) as images_ready_count,
                    AVG(quality_score) as avg_quality_score,
                    AVG(calc_net_profit_usd) as avg_net_profit,
                    AVG(calc_profit_margin_percent) as avg_profit_margin,
                    SUM(ebay_sold_quantity * ebay_sold_price) as total_revenue,
                    COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as delete_pending_count
                FROM ebay_listing_complete
            ";
            
            $stmt = $this->pdo->query($sql);
            $stats = $stmt->fetch();
            
            return [
                'success' => true,
                'data' => $stats
            ];
            
        } catch (Exception $e) {
            $this->logMessage('ERROR', 'eBay完全版統計情報取得エラー: ' . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * CSV エスケープ処理
     */
    private function csvEscape($value) {
        if (is_null($value)) return '';
        
        $value = (string)$value;
        
        // ダブルクォートをエスケープ
        $value = str_replace('"', '""', $value);
        
        // カンマ、改行、ダブルクォートが含まれる場合はダブルクォートで囲む
        if (strpos($value, ',') !== false || strpos($value, "\n") !== false || strpos($value, '"') !== false) {
            $value = '"' . $value . '"';
        }
        
        return $value;
    }
    
    /**
     * ログ記録
     */
    private function logMessage($level, $message) {
        $timestamp = date('Y-m-d H:i:s');
        $log_entry = "[{$timestamp}] {$level}: {$message}" . PHP_EOL;
        error_log($log_entry, 3, __DIR__ . '/ebay_csv_processing.log');
    }
}

// ===== API エンドポイント処理 =====

// セッション開始
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// CSRF対策
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// CSVハンドラー初期化
try {
    $ebay_csv_handler = new EbayCompleteCSVHandler();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'システム初期化エラー: ' . $e->getMessage()]);
    exit;
}

// アクション処理
$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'export_ebay_csv':
        $filters = [
            'status' => $_GET['status'] ?? '',
            'risk_level' => $_GET['risk_level'] ?? '',
            'min_profit' => $_GET['min_profit'] ?? '',
            'ready_only' => $_GET['ready_only'] ?? false
        ];
        
        $result = $ebay_csv_handler->exportEbayReadyCSV($filters);
        
        if (isset($result['content'])) {
            header('Content-Type: text/csv; charset=UTF-8');
            header('Content-Disposition: attachment; filename="' . $result['filename'] . '"');
            header('Content-Length: ' . strlen($result['content']));
            echo $result['content'];
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'eBay CSV生成に失敗しました']);
        }
        exit;
        
    case 'import_ebay_csv':
        if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'error' => 'ファイルアップロードエラー']);
            exit;
        }
        
        $file_content = file_get_contents($_FILES['csv_file']['tmp_name']);
        $result = $ebay_csv_handler->importEbayCompleteCSV($file_content);
        
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
        
    case 'migrate_existing_data':
        $result = $ebay_csv_handler->migrateExistingData();
        
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
        
    case 'get_ebay_ready_products':
        $limit = $_GET['limit'] ?? 50;
        $result = $ebay_csv_handler->getEbayReadyProducts($limit);
        
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
        
    case 'generate_ebay_html':
        $product_data = $_POST['product_data'] ?? [];
        $template = $_POST['template'] ?? 'standard';
        
        if (empty($product_data)) {
            echo json_encode(['success' => false, 'error' => '商品データが必要です']);
            exit;
        }
        
        $result = $ebay_csv_handler->generateEbayHTML($product_data, $template);
        
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
        
    case 'get_ebay_statistics':
        $result = $ebay_csv_handler->getEbayCompleteStatistics();
        
        header('Content-Type: application/json');
        echo json_encode($result);
        exit;
        
    default:
        echo json_encode(['success' => false, 'error' => '不明なアクション']);
        exit;
}
?>