<?php
/**
 * eBay出品処理エラー分離システム
 * 成功・失敗を完全分離し、出品できない商品を事前に弾く
 */

require_once __DIR__ . '/safe_api_handler.php';

class EbayListingProcessor {
    private $successItems = [];
    private $failedItems = [];
    private $validationErrors = [];
    private $config = [];
    
    public function __construct($config = []) {
        $this->config = array_merge([
            'api_timeout' => 30,
            'rate_limit_delay' => 2000, // milliseconds
            'max_concurrent' => 5,
            'retry_attempts' => 3,
            'validation_strict' => true
        ], $config);
    }
    
    /**
     * CSVデータ処理メイン（エラー分離対応）
     */
    public function processCSVData($csvData, $options = []) {
        $startTime = microtime(true);
        
        $results = [
            'total_items' => count($csvData),
            'success_count' => 0,
            'error_count' => 0,
            'validation_error_count' => 0,
            'success_items' => [],
            'failed_items' => [],
            'validation_errors' => [],
            'processing_time' => 0,
            'dry_run' => $options['dry_run'] ?? true
        ];
        
        error_log("eBay出品処理開始: " . count($csvData) . "件");
        
        foreach ($csvData as $index => $item) {
            $itemStartTime = microtime(true);
            
            try {
                // 1️⃣ 事前バリデーション（出品前チェック）
                $validation = $this->validateItem($item, $index);
                
                if (!$validation['valid']) {
                    // バリデーション失敗 → スキップ
                    $results['validation_errors'][] = [
                        'index' => $index,
                        'item' => $this->sanitizeItemForResponse($item),
                        'error_type' => 'validation',
                        'error_message' => $validation['error'],
                        'reason' => 'pre_validation_failed',
                        'processing_time' => (microtime(true) - $itemStartTime) * 1000
                    ];
                    $results['validation_error_count']++;
                    continue;
                }
                
                // 2️⃣ HTML説明文生成（データベースから）
                if (isset($options['enable_html_templates']) && $options['enable_html_templates']) {
                    $htmlDescription = $this->generateHTMLDescription($item);
                    if ($htmlDescription) {
                        $item['Description'] = $htmlDescription;
                    }
                }
                
                // 3️⃣ 実際の出品処理（API呼び出し）
                $listingResult = $this->executeSingleListing($item, $options);
                
                if ($listingResult['success']) {
                    // ✅ 成功
                    $results['success_items'][] = [
                        'index' => $index,
                        'item' => $this->sanitizeItemForResponse($item),
                        'ebay_item_id' => $listingResult['ebay_item_id'],
                        'listing_url' => $listingResult['listing_url'],
                        'message' => $listingResult['message'] ?? '出品成功',
                        'processing_time' => (microtime(true) - $itemStartTime) * 1000,
                        'fees' => $listingResult['fees'] ?? null,
                        'category_id' => $listingResult['category_id'] ?? null
                    ];
                    $results['success_count']++;
                } else {
                    // ❌ API失敗
                    $results['failed_items'][] = [
                        'index' => $index,
                        'item' => $this->sanitizeItemForResponse($item),
                        'error_type' => 'api',
                        'error_message' => $listingResult['error'],
                        'reason' => 'api_call_failed',
                        'processing_time' => (microtime(true) - $itemStartTime) * 1000,
                        'api_response_code' => $listingResult['http_code'] ?? null
                    ];
                    $results['error_count']++;
                }
                
            } catch (Exception $e) {
                // 🚨 予期しないエラー
                error_log("予期しないエラー (Item $index): " . $e->getMessage());
                
                $results['failed_items'][] = [
                    'index' => $index,
                    'item' => $this->sanitizeItemForResponse($item),
                    'error_type' => 'exception',
                    'error_message' => $e->getMessage(),
                    'reason' => 'unexpected_error',
                    'processing_time' => (microtime(true) - $itemStartTime) * 1000,
                    'stack_trace' => $this->config['debug'] ? $e->getTraceAsString() : null
                ];
                $results['error_count']++;
            }
            
            // 4️⃣ レート制限・遅延処理
            if (isset($options['delay_between_items']) && $options['delay_between_items'] > 0) {
                usleep($options['delay_between_items'] * 1000);
            }
            
            // 5️⃣ 最大処理件数制限
            if (($results['success_count'] + $results['error_count'] + $results['validation_error_count']) >= ($options['max_items'] ?? 100)) {
                error_log("最大処理件数に達しました");
                break;
            }
        }
        
        $results['processing_time'] = (microtime(true) - $startTime) * 1000;
        
        error_log("eBay出品処理完了: 成功{$results['success_count']}件、失敗{$results['error_count']}件、バリデーションエラー{$results['validation_error_count']}件");
        
        return $results;
    }
    
    /**
     * 商品バリデーション（出品前チェック）
     */
    private function validateItem($item, $index) {
        $errors = [];
        $warnings = [];
        
        // 必須フィールドチェック
        $requiredFields = ['Title', 'BuyItNowPrice'];
        
        foreach ($requiredFields as $field) {
            if (!isset($item[$field]) || trim($item[$field]) === '') {
                $errors[] = "必須フィールド不足: {$field}";
            }
        }
        
        // 価格チェック
        if (isset($item['BuyItNowPrice'])) {
            $price = $this->parsePrice($item['BuyItNowPrice']);
            if ($price === false || $price <= 0) {
                $errors[] = "無効な価格: " . $item['BuyItNowPrice'];
            } elseif ($price > 99999) {
                $errors[] = "価格上限超過: $price (上限: 99,999)";
            } elseif ($price < 0.99) {
                $warnings[] = "低価格商品: $price";
            }
        }
        
        // タイトル検証
        if (isset($item['Title'])) {
            $title = trim($item['Title']);
            $titleLength = mb_strlen($title, 'UTF-8');
            
            if ($titleLength > 80) {
                $errors[] = "タイトルが長すぎます（{$titleLength}文字、制限: 80文字）";
            } elseif ($titleLength < 10) {
                $warnings[] = "タイトルが短すぎます（{$titleLength}文字）";
            }
            
            // 禁止キーワードチェック
            $bannedKeywords = $this->getBannedKeywords();
            $titleLower = mb_strtolower($title, 'UTF-8');
            
            foreach ($bannedKeywords as $keyword) {
                if (mb_strpos($titleLower, mb_strtolower($keyword, 'UTF-8')) !== false) {
                    $errors[] = "禁止キーワード検出: {$keyword}";
                }
            }
        }
        
        // 説明文チェック
        if (isset($item['Description'])) {
            $description = trim($item['Description']);
            if (mb_strlen($description, 'UTF-8') > 500000) {
                $errors[] = "説明文が長すぎます（制限: 500KB）";
            }
        }
        
        // カテゴリチェック
        if (isset($item['Category']) && !empty($item['Category'])) {
            if (!$this->isValidCategory($item['Category'])) {
                $warnings[] = "無効なカテゴリID: " . $item['Category'];
            }
        }
        
        // 数量チェック
        if (isset($item['Quantity'])) {
            $quantity = intval($item['Quantity']);
            if ($quantity < 1) {
                $errors[] = "数量が無効です: $quantity";
            } elseif ($quantity > 10) {
                $warnings[] = "大量出品: $quantity";
            }
        }
        
        // UPC/EANチェック
        if (isset($item['UPC']) && !empty($item['UPC'])) {
            if (!$this->isValidUPC($item['UPC'])) {
                $warnings[] = "無効なUPCコード: " . $item['UPC'];
            }
        }
        
        return [
            'valid' => empty($errors),
            'error' => empty($errors) ? null : implode('; ', $errors),
            'warnings' => $warnings,
            'error_count' => count($errors),
            'warning_count' => count($warnings)
        ];
    }
    
    /**
     * 単一アイテム出品実行
     */
    private function executeSingleListing($item, $options) {
        $isDryRun = $options['dry_run'] ?? true;
        
        if ($isDryRun) {
            // テストモード：シミュレーション
            return $this->simulateListing($item);
        } else {
            // 実際の出品処理
            return $this->performRealListing($item, $options);
        }
    }
    
    /**
     * シミュレーション出品
     */
    private function simulateListing($item) {
        // ランダムで成功/失敗をシミュレート
        $successRate = 0.85; // 85%成功率
        
        usleep(rand(500, 2000) * 1000); // 0.5-2秒の遅延をシミュレート
        
        if (rand(1, 100) <= ($successRate * 100)) {
            return [
                'success' => true,
                'ebay_item_id' => 'SIM_' . uniqid(),
                'listing_url' => 'https://www.ebay.com/itm/simulation_' . uniqid(),
                'message' => 'シミュレーション出品成功',
                'fees' => [
                    'insertion_fee' => 0.30,
                    'final_value_fee' => 0.00
                ],
                'category_id' => $item['Category'] ?? '293'
            ];
        } else {
            return [
                'success' => false,
                'error' => 'シミュレーションエラー（テスト用）',
                'http_code' => 400
            ];
        }
    }
    
    /**
     * 実際のeBay出品処理
     */
    private function performRealListing($item, $options) {
        // TODO: 実際のeBay Trading API呼び出しを実装
        // 現在はプレースホルダー
        
        try {
            // eBay Trading API呼び出し
            $apiResponse = $this->callEbayTradingAPI($item, $options);
            
            if ($apiResponse['success']) {
                return [
                    'success' => true,
                    'ebay_item_id' => $apiResponse['ItemID'],
                    'listing_url' => "https://www.ebay.com/itm/{$apiResponse['ItemID']}",
                    'message' => 'eBay出品成功',
                    'fees' => $apiResponse['Fees'] ?? null,
                    'category_id' => $apiResponse['CategoryID'] ?? null
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $apiResponse['error'],
                    'http_code' => $apiResponse['http_code']
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'API呼び出しエラー: ' . $e->getMessage(),
                'http_code' => 500
            ];
        }
    }
    
    /**
     * eBay Trading API呼び出し（プレースホルダー）
     */
    private function callEbayTradingAPI($item, $options) {
        // TODO: 実際のAPI実装
        // 現在は成功をシミュレート
        return [
            'success' => true,
            'ItemID' => 'REAL_' . uniqid(),
            'Fees' => [
                'insertion_fee' => 0.30,
                'final_value_fee' => 0.00
            ],
            'CategoryID' => $item['Category'] ?? '293'
        ];
    }
    
    /**
     * HTML説明文生成
     */
    private function generateHTMLDescription($item) {
        try {
            if (class_exists('ProductHTMLGenerator')) {
                $generator = new ProductHTMLGenerator();
                return $generator->generateHTMLDescription($item);
            }
        } catch (Exception $e) {
            error_log("HTML生成エラー: " . $e->getMessage());
        }
        
        return null;
    }
    
    /**
     * 禁止キーワード取得
     */
    private function getBannedKeywords() {
        return [
            // 偽造品関連
            '偽物', 'コピー品', 'レプリカ', '海賊版', 'パチモン',
            'fake', 'replica', 'counterfeit', 'bootleg', 'knockoff',
            
            // 違法品関連
            'stolen', '盗品', 'illegal', '違法',
            
            // 医薬品関連
            'prescription', '処方薬', 'medicine', '薬',
            
            // その他
            'gambling', 'casino', 'lottery', 'ギャンブル'
        ];
    }
    
    /**
     * 価格パース
     */
    private function parsePrice($priceString) {
        if (is_numeric($priceString)) {
            return floatval($priceString);
        }
        
        // $記号や通貨記号を除去
        $cleaned = preg_replace('/[^\d.,]/', '', $priceString);
        $cleaned = str_replace(',', '', $cleaned);
        
        if (is_numeric($cleaned)) {
            return floatval($cleaned);
        }
        
        return false;
    }
    
    /**
     * カテゴリ検証
     */
    private function isValidCategory($categoryId) {
        // eBayの主要カテゴリIDをチェック
        $validCategories = [
            '293', // 消費者向けエレクトロニクス
            '1249', // ビデオゲーム・コンソール
            '11450', // 衣料品・靴・アクセサリー
            '58058', // 携帯電話・スマートフォン
            '31388', // カメラ・フォト
            '293', // デフォルトカテゴリ
        ];
        
        return in_array($categoryId, $validCategories) || is_numeric($categoryId);
    }
    
    /**
     * UPCコード検証
     */
    private function isValidUPC($upc) {
        // 基本的な長さとフォーマットチェック
        $upc = preg_replace('/\D/', '', $upc);
        return in_array(strlen($upc), [12, 13]) && ctype_digit($upc);
    }
    
    /**
     * レスポンス用データサニタイゼーション
     */
    private function sanitizeItemForResponse($item) {
        // 機密データや大きすぎるデータを除去
        $sanitized = [];
        
        $allowedFields = [
            'Title', 'BuyItNowPrice', 'Category', 'Quantity', 
            'ConditionID', 'Brand', 'UPC', 'Currency'
        ];
        
        foreach ($allowedFields as $field) {
            if (isset($item[$field])) {
                $value = $item[$field];
                
                // 文字列の場合、長さ制限
                if (is_string($value) && mb_strlen($value, 'UTF-8') > 100) {
                    $value = mb_substr($value, 0, 100, 'UTF-8') . '...';
                }
                
                $sanitized[$field] = $value;
            }
        }
        
        return $sanitized;
    }
}
