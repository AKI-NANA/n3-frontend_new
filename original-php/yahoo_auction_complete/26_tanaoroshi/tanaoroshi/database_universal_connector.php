<?php
/**
 * Database Universal Connector - 画像表示修正版
 * PostgreSQL JSON対応 + 成功済み設定を使用
 */

class DatabaseUniversalConnector {
    
    public $pdo;
    private $proven_fields;
    private $type_safety_rules;
    
    public function __construct() {
        $this->initializeConnection();
        $this->proven_fields = $this->getProvenFields();
        $this->type_safety_rules = $this->initializeTypeSafetyRules();
    }
    
    /**
     * 修正版データベース接続（成功済み設定を使用）
     */
    private function initializeConnection() {
        $host = 'localhost';
        $dbname = 'nagano3_db';
        $username = 'postgres';  // 修正: aritahiroaki → postgres（成功済み設定）
        $password = '';          // 修正: 空パスワード（成功済み設定）
        
        try {
            $this->pdo = new PDO(
                "pgsql:host={$host};dbname={$dbname}",
                $username,
                $password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_TIMEOUT => 30
                ]
            );
        } catch (PDOException $e) {
            throw new Exception("データベース接続エラー: " . $e->getMessage());
        }
    }
    
    /**
     * フィールド定義（画像対応強化）
     */
    private function getProvenFields() {
        return [
            // 基本情報
            'ebay_item_id' => ['type' => 'text', 'required' => true, 'display_name' => '商品ID'],
            'title' => ['type' => 'text', 'required' => true, 'display_name' => 'タイトル'],
            'description' => ['type' => 'text', 'required' => true, 'display_name' => '商品説明'],
            'sku' => ['type' => 'text', 'required' => true, 'display_name' => 'SKU'],
            
            // 商品詳細HTML
            'item_details_html' => ['type' => 'text', 'required' => false, 'display_name' => '商品詳細HTML'],
            
            // 商品状態・カテゴリ
            'condition_display_name' => ['type' => 'text', 'required' => true, 'display_name' => '商品状態'],
            'condition_id' => ['type' => 'int', 'required' => true, 'display_name' => '状態ID'],
            'category_id' => ['type' => 'text', 'required' => true, 'display_name' => 'カテゴリID'],
            'category_name' => ['type' => 'text', 'required' => true, 'display_name' => 'カテゴリ名'],
            
            // 価格情報
            'current_price_value' => ['type' => 'decimal', 'required' => true, 'display_name' => '現在価格'],
            'current_price_currency' => ['type' => 'text', 'required' => true, 'display_name' => '通貨'],
            'start_price_value' => ['type' => 'decimal', 'required' => true, 'display_name' => '開始価格'],
            'buy_it_now_price_value' => ['type' => 'decimal', 'required' => true, 'display_name' => '即決価格'],
            
            // 在庫情報
            'quantity' => ['type' => 'int', 'required' => true, 'display_name' => '数量'],
            'quantity_sold' => ['type' => 'int', 'required' => true, 'display_name' => '売上数'],
            'listing_type' => ['type' => 'text', 'required' => true, 'display_name' => '出品タイプ'],
            'listing_status' => ['type' => 'text', 'required' => true, 'display_name' => '出品状況'],
            
            // 販売者情報
            'seller_user_id' => ['type' => 'text', 'required' => true, 'display_name' => '販売者アカウント名'],
            'seller_feedback_score' => ['type' => 'int', 'required' => true, 'display_name' => '評価スコア'],
            'seller_positive_feedback_percent' => ['type' => 'decimal', 'required' => true, 'display_name' => '良い評価率'],
            
            // 発送地情報
            'location' => ['type' => 'text', 'required' => true, 'display_name' => '発送地'],
            'country' => ['type' => 'text', 'required' => false, 'display_name' => '国'],
            
            // 画像情報（PostgreSQL JSON対応強化）
            'picture_urls' => ['type' => 'json_array', 'required' => true, 'display_name' => '商品画像'],
            'gallery_url' => ['type' => 'text', 'required' => false, 'display_name' => 'ギャラリー画像'],
            
            // URL情報
            'view_item_url' => ['type' => 'text', 'required' => true, 'display_name' => '商品URL'],
            
            // パフォーマンス指標
            'watch_count' => ['type' => 'int', 'required' => true, 'display_name' => 'ウォッチ数'],
            'hit_count' => ['type' => 'int', 'required' => false, 'display_name' => '閲覧数'],
            'bid_count' => ['type' => 'int', 'required' => true, 'display_name' => '入札数'],
            
            // JSON詳細情報
            'item_specifics' => ['type' => 'json', 'required' => true, 'display_name' => '商品仕様'],
            'shipping_details' => ['type' => 'json', 'required' => true, 'display_name' => '配送詳細'],
            'shipping_costs' => ['type' => 'json', 'required' => true, 'display_name' => '配送料'],
            'shipping_methods' => ['type' => 'json_array', 'required' => false, 'display_name' => '配送方法'],
            
            // システム情報
            'data_completeness_score' => ['type' => 'int', 'required' => true, 'display_name' => '完全性スコア'],
            'api_fetch_timestamp' => ['type' => 'datetime', 'required' => false, 'display_name' => 'API取得日時'],
            'created_at' => ['type' => 'datetime', 'required' => true, 'display_name' => '作成日'],
            'updated_at' => ['type' => 'datetime', 'required' => true, 'display_name' => '更新日']
        ];
    }
    
    /**
     * PostgreSQL JSON対応強化版型変換ルール
     */
    private function initializeTypeSafetyRules() {
        return [
            'text' => function($value) {
                return is_null($value) ? '' : (string)$value;
            },
            'int' => function($value) {
                return is_null($value) ? 0 : (int)$value;
            },
            'decimal' => function($value) {
                return is_null($value) ? 0.0 : (float)$value;
            },
            'bool' => function($value) {
                return (bool)$value;
            },
            'datetime' => function($value) {
                if (is_null($value)) return null;
                if ($value instanceof DateTime) return $value->format('Y-m-d H:i:s');
                return $value;
            },
            'json' => function($value) {
                if (is_null($value)) return [];
                if (is_string($value)) {
                    $decoded = json_decode($value, true);
                    return is_array($decoded) ? $decoded : [];
                }
                return is_array($value) ? $value : [];
            },
            'json_array' => function($value) {
                // PostgreSQL JSON配列の安全な変換（画像URL特化版）
                if (is_null($value)) return [];
                if (is_array($value)) return $value;
                
                if (is_string($value)) {
                    $value = trim($value);
                    
                    // 空文字列・空配列チェック
                    if (empty($value) || $value === '[]' || $value === '{}' || $value === 'null') {
                        return [];
                    }
                    
                    // JSON配列の処理
                    if (strpos($value, '[') === 0 || strpos($value, '{') === 0) {
                        try {
                            $decoded = json_decode($value, true);
                            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                                // 有効なURLのみフィルタリング
                                return array_filter($decoded, function($item) {
                                    return is_string($item) && !empty(trim($item)) && filter_var($item, FILTER_VALIDATE_URL);
                                });
                            }
                        } catch (Exception $e) {
                            // JSON解析失敗時のフォールバック処理
                        }
                    }
                    
                    // PostgreSQL配列形式 {item1,item2,item3} の処理
                    if (preg_match('/^\{(.*)\}$/', $value, $matches)) {
                        $inner = trim($matches[1]);
                        if (empty($inner)) {
                            return [];
                        }
                        
                        // カンマ区切りで分割（クォート内のカンマを考慮）
                        $items = [];
                        $current = '';
                        $in_quotes = false;
                        $escape_next = false;
                        
                        for ($i = 0; $i < strlen($inner); $i++) {
                            $char = $inner[$i];
                            
                            if ($escape_next) {
                                $current .= $char;
                                $escape_next = false;
                            } elseif ($char === '\\') {
                                $current .= $char;
                                $escape_next = true;
                            } elseif ($char === '"' && !$escape_next) {
                                $in_quotes = !$in_quotes;
                                $current .= $char;
                            } elseif ($char === ',' && !$in_quotes) {
                                $url = trim($current, '"');
                                if (!empty($url) && filter_var($url, FILTER_VALIDATE_URL)) {
                                    $items[] = $url;
                                }
                                $current = '';
                            } else {
                                $current .= $char;
                            }
                        }
                        
                        if (!empty($current)) {
                            $url = trim($current, '"');
                            if (!empty($url) && filter_var($url, FILTER_VALIDATE_URL)) {
                                $items[] = $url;
                            }
                        }
                        
                        return $items;
                    }
                    
                    // カンマ区切りURL文字列の処理
                    if (strpos($value, ',') !== false) {
                        $urls = explode(',', $value);
                        $validUrls = [];
                        foreach ($urls as $url) {
                            $url = trim($url);
                            if (!empty($url) && filter_var($url, FILTER_VALIDATE_URL)) {
                                $validUrls[] = $url;
                            }
                        }
                        return $validUrls;
                    }
                    
                    // 単一URL文字列
                    if (filter_var($value, FILTER_VALIDATE_URL)) {
                        return [$value];
                    }
                    
                    // 文字列内URL検索
                    if (preg_match('/https?:\/\/[^\s]+/', $value, $matches)) {
                        return [$matches[0]];
                    }
                }
                
                return [];
            }
        ];
    }
    
    /**
     * 安全なデータ取得（PostgreSQL JSON対応版）
     */
    public function getEbayData($limit = 10, $conditions = []) {
        try {
            // PostgreSQL安全なクエリ
            $sql = "SELECT 
                        ebay_item_id,
                        title,
                        CASE 
                            WHEN picture_urls IS NOT NULL THEN CAST(picture_urls AS TEXT)
                            ELSE NULL 
                        END as picture_urls,
                        CASE 
                            WHEN gallery_url IS NOT NULL THEN CAST(gallery_url AS TEXT)
                            ELSE NULL 
                        END as gallery_url,
                        current_price_value,
                        condition_display_name,
                        quantity,
                        listing_status,
                        seller_user_id,
                        location,
                        country,
                        view_item_url,
                        updated_at,
                        created_at
                    FROM ebay_complete_api_data";
                    
            $params = [];
            
            // 条件追加
            if (!empty($conditions)) {
                $where_clauses = [];
                foreach ($conditions as $field => $value) {
                    $where_clauses[] = "{$field} = ?";
                    $params[] = $value;
                }
                $sql .= " WHERE " . implode(' AND ', $where_clauses);
            }
            
            // 画像データ優先取得
            $sql .= " ORDER BY 
                        CASE 
                            WHEN picture_urls IS NOT NULL AND CAST(picture_urls AS TEXT) != '' AND CAST(picture_urls AS TEXT) != '[]' THEN 1
                            WHEN gallery_url IS NOT NULL AND CAST(gallery_url AS TEXT) != '' THEN 2
                            ELSE 3
                        END,
                        updated_at DESC 
                      LIMIT ?";
                      
            $params[] = (int)$limit;
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            $results = $stmt->fetchAll();
            
            // 安全な型変換（画像URL特化）
            $safe_results = [];
            foreach ($results as $row) {
                $safe_row = [];
                foreach ($row as $field => $value) {
                    if (isset($this->proven_fields[$field])) {
                        $field_type = $this->proven_fields[$field]['type'];
                        if (isset($this->type_safety_rules[$field_type])) {
                            $converter = $this->type_safety_rules[$field_type];
                            $safe_row[$field] = $converter($value);
                        } else {
                            $safe_row[$field] = $value;
                        }
                    } else {
                        $safe_row[$field] = $value;
                    }
                }
                $safe_results[] = $safe_row;
            }
            
            return $safe_results;
            
        } catch (Exception $e) {
            error_log("データ取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 画像URL抽出関数（統合版）
     */
    public function extractImageUrl($item) {
        // picture_urlsを優先
        if (!empty($item['picture_urls']) && is_array($item['picture_urls'])) {
            return $item['picture_urls'][0];
        }
        
        // gallery_urlを次に
        if (!empty($item['gallery_url']) && filter_var($item['gallery_url'], FILTER_VALIDATE_URL)) {
            return $item['gallery_url'];
        }
        
        return null;
    }
    
    /**
     * 表示用データ整形（画像URL統合版）
     */
    public function formatForDisplay($data) {
        $formatted = [];
        
        foreach ($data as $item) {
            $formatted_item = [];
            
            foreach ($item as $field => $value) {
                // JavaScript出力用のエスケープ処理
                if (is_string($value)) {
                    $formatted_item[$field] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
                } elseif (is_array($value)) {
                    $formatted_item[$field] = $value; // 配列はそのまま
                } else {
                    $formatted_item[$field] = $value;
                }
            }
            
            // 画像URL追加（統合処理）
            $formatted_item['primary_image_url'] = $this->extractImageUrl($formatted_item);
            
            $formatted[] = $formatted_item;
        }
        
        return $formatted;
    }
    
    /**
     * タイプ変換ルールを外部からアクセス可能にする
     */
    public function getTypeSafetyRules() {
        return $this->type_safety_rules;
    }
    
    /**
     * フィールド情報取得
     */
    public function getFieldInfo($field_name) {
        return isset($this->proven_fields[$field_name]) ? $this->proven_fields[$field_name] : null;
    }
    
    /**
     * 全フィールド一覧取得
     */
    public function getAllFields() {
        return $this->proven_fields;
    }
    
    /**
     * データ統計情報取得（PostgreSQL安全版）
     */
    public function getDataStats() {
        try {
            $sql = "SELECT 
                        COUNT(*) as total_items,
                        AVG(CASE WHEN data_completeness_score IS NOT NULL THEN data_completeness_score ELSE 0 END) as avg_completeness,
                        MIN(created_at) as oldest_data,
                        MAX(updated_at) as newest_data,
                        COUNT(CASE WHEN picture_urls IS NOT NULL AND CAST(picture_urls AS TEXT) != '' AND CAST(picture_urls AS TEXT) != '[]' THEN 1 END) as items_with_images
                    FROM ebay_complete_api_data";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch();
            
            return [
                'total_items' => (int)$result['total_items'],
                'avg_completeness' => round((float)$result['avg_completeness'], 1),
                'oldest_data' => $result['oldest_data'],
                'newest_data' => $result['newest_data'],
                'items_with_images' => (int)$result['items_with_images'],
                'proven_fields_count' => count($this->proven_fields)
            ];
            
        } catch (Exception $e) {
            error_log("統計取得エラー: " . $e->getMessage());
            return [
                'total_items' => 0,
                'avg_completeness' => 0,
                'oldest_data' => null,
                'newest_data' => null,
                'items_with_images' => 0,
                'proven_fields_count' => count($this->proven_fields)
            ];
        }
    }
    
    /**
     * eBay商品ID指定での商品取得
     */
    public function getProductByEbayId($ebay_item_id) {
        try {
            $sql = "SELECT * FROM ebay_complete_api_data WHERE ebay_item_id = ? LIMIT 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$ebay_item_id]);
            $result = $stmt->fetch();
            
            if (!$result) {
                return null;
            }
            
            // 安全な型変換
            $safe_result = [];
            foreach ($result as $field => $value) {
                if (isset($this->proven_fields[$field])) {
                    $field_type = $this->proven_fields[$field]['type'];
                    if (isset($this->type_safety_rules[$field_type])) {
                        $converter = $this->type_safety_rules[$field_type];
                        $safe_result[$field] = $converter($value);
                    } else {
                        $safe_result[$field] = $value;
                    }
                } else {
                    $safe_result[$field] = $value;
                }
            }
            
            return $safe_result;
            
        } catch (Exception $e) {
            error_log("商品取得エラー: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * 単一商品データの表示用整形
     */
    public function formatSingleProduct($product) {
        if (!$product) return null;
        
        $formatted = [];
        foreach ($product as $field => $value) {
            if (is_string($value)) {
                $formatted[$field] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            } elseif (is_array($value)) {
                $formatted[$field] = $value;
            } else {
                $formatted[$field] = $value;
            }
        }
        
        // 画像URL追加
        $formatted['primary_image_url'] = $this->extractImageUrl($formatted);
        
        return $formatted;
    }
}

// グローバル使用関数（既存互換性維持）
function getEbayDataSafely($limit = 10, $conditions = []) {
    static $connector = null;
    if ($connector === null) {
        $connector = new DatabaseUniversalConnector();
    }
    return $connector->getEbayData($limit, $conditions);
}

function formatEbayDataForDisplay($data) {
    static $connector = null;
    if ($connector === null) {
        $connector = new DatabaseUniversalConnector();
    }
    return $connector->formatForDisplay($data);
}

function getEbayDataStats() {
    static $connector = null;
    if ($connector === null) {
        $connector = new DatabaseUniversalConnector();
    }
    return $connector->getDataStats();
}

function getEbayFieldInfo($field_name) {
    static $connector = null;
    if ($connector === null) {
        $connector = new DatabaseUniversalConnector();
    }
    return $connector->getFieldInfo($field_name);
}
?>
