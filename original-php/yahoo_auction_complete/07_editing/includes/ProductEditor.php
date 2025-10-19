<?php
/**
 * 商品編集機能クラス
 * Yahoo Auction統合システム - 07_editing モジュール
 * 
 * 設計原則:
 * - 単一責任の原則: 商品編集に関連する機能のみ
 * - UI/API分離: HTMLレンダリングは行わず、データ処理のみ
 * - shared基盤活用: Database・ApiResponseクラス使用
 */

require_once __DIR__ . '/../../shared/core/Database.php';
require_once __DIR__ . '/../../shared/core/ApiResponse.php';

class ProductEditor {
    private $db;
    private $tableName = 'yahoo_scraped_products';
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * 統計情報取得
     * 
     * @return array
     */
    public function getStats() {
        try {
            $total = $this->db->count($this->tableName);
            $unlisted = $this->db->count($this->tableName, [
                'ebay_item_id' => null
            ]);
            
            return [
                'total' => $total,
                'unlisted' => $unlisted,
                'listed' => $total - $unlisted
            ];
            
        } catch (Exception $e) {
            error_log("ProductEditor::getStats error: " . $e->getMessage());
            return [
                'total' => 0,
                'unlisted' => 0,
                'listed' => 0,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 商品一覧取得（ページネーション付き）
     * 
     * @param int $page ページ番号
     * @param int $limit 件数
     * @param array $filters フィルター条件
     * @return array
     */
    public function getProducts($page = 1, $limit = 20, $filters = []) {
        try {
            $offset = ($page - 1) * $limit;
            $conditions = [];
            
            // フィルター条件の構築
            if (!empty($filters['keyword'])) {
                $sql = "SELECT * FROM {$this->tableName} 
                       WHERE (active_title ILIKE ? OR scraped_yahoo_data::text ILIKE ?)
                       ORDER BY updated_at DESC, id DESC 
                       LIMIT ? OFFSET ?";
                
                $keyword = '%' . $filters['keyword'] . '%';
                $stmt = $this->db->query($sql, [$keyword, $keyword, $limit, $offset]);
                $products = $stmt->fetchAll();
                
                // カウント
                $countSql = "SELECT COUNT(*) as total FROM {$this->tableName} 
                            WHERE (active_title ILIKE ? OR scraped_yahoo_data::text ILIKE ?)";
                $countStmt = $this->db->query($countSql, [$keyword, $keyword]);
                $total = $countStmt->fetch()['total'];
                
            } else {
                // 全件取得（デフォルト）
                $products = $this->db->select($this->tableName, [], [
                    'limit' => $limit,
                    'offset' => $offset,
                    'order_by' => 'updated_at',
                    'order_dir' => 'DESC'
                ]);
                
                $total = $this->db->count($this->tableName);
            }
            
            // データ整形
            $formattedProducts = array_map([$this, 'formatProductData'], $products);
            
            return [
                'products' => $formattedProducts,
                'pagination' => [
                    'total' => $total,
                    'page' => $page,
                    'limit' => $limit,
                    'total_pages' => ceil($total / $limit)
                ],
                'filters' => $filters
            ];
            
        } catch (Exception $e) {
            error_log("ProductEditor::getProducts error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 商品データの整形
     * 
     * @param array $product 生データ
     * @return array 整形済みデータ
     */
    private function formatProductData($product) {
        $yahooData = json_decode($product['scraped_yahoo_data'] ?? '{}', true) ?: [];
        
        return [
            'id' => $product['id'],
            'item_id' => $product['source_item_id'],
            'title' => $product['active_title'] ?? 'タイトル不明',
            'price' => [
                'jpy' => (int)($product['price_jpy'] ?? 0),
                'usd' => $product['cached_price_usd'] ?? round(($product['price_jpy'] ?? 0) / 150, 2)
            ],
            'category' => $yahooData['category'] ?? $product['category'] ?? 'N/A',
            'condition' => $yahooData['condition'] ?? $product['condition_name'] ?? 'N/A',
            'image_url' => $product['active_image_url'] ?? 'https://placehold.co/150x150/725CAD/FFFFFF/png?text=No+Image',
            'source_url' => $yahooData['url'] ?? '',
            'platform' => $this->detectPlatform($yahooData['url'] ?? ''),
            'listing_status' => !empty($product['ebay_item_id']) ? 'listed' : 'not_listed',
            'status' => $product['status'] ?? 'scraped',
            'stock' => $product['current_stock'] ?? 1,
            'sku' => $product['sku'] ?? '',
            'updated_at' => $product['updated_at'],
            'ebay_category' => [
                'id' => $product['ebay_category_id'] ?? null,
                'path' => $product['ebay_category_path'] ?? null,
                'confidence' => $product['category_confidence'] ?? null
            ]
        ];
    }
    
    /**
     * プラットフォーム判定
     * 
     * @param string $url
     * @return string
     */
    private function detectPlatform($url) {
        if (strpos($url, 'auctions.yahoo.co.jp') !== false) {
            return 'ヤフオク';
        } elseif (strpos($url, 'yahoo.co.jp') !== false) {
            return 'Yahoo';
        }
        return 'Unknown';
    }
    
    /**
     * 商品詳細取得
     * 
     * @param string $itemId
     * @return array
     */
    public function getProductDetails($itemId) {
        try {
            $products = $this->db->select($this->tableName, [
                'source_item_id' => $itemId
            ]);
            
            if (empty($products)) {
                // ID での検索も試行
                $products = $this->db->select($this->tableName, [
                    'id' => $itemId
                ]);
            }
            
            if (empty($products)) {
                return [
                    'success' => false,
                    'message' => '指定された商品が見つかりません'
                ];
            }
            
            $product = $this->formatProductData($products[0]);
            
            return [
                'success' => true,
                'data' => $product
            ];
            
        } catch (Exception $e) {
            error_log("ProductEditor::getProductDetails error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'データ取得エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 商品更新
     * 
     * @param string $itemId
     * @param array $data 更新データ
     * @return array
     */
    public function updateProduct($itemId, $data) {
        try {
            $this->db->beginTransaction();
            
            // 更新データの準備
            $updateData = [];
            
            if (isset($data['title'])) {
                $updateData['active_title'] = $data['title'];
            }
            
            if (isset($data['price'])) {
                $updateData['price_jpy'] = (int)$data['price'];
                $updateData['active_price_usd'] = round($data['price'] / 150, 2);
            }
            
            if (isset($data['description'])) {
                $updateData['active_description'] = $data['description'];
            }
            
            // scraped_yahoo_data の更新
            if (isset($data['category']) || isset($data['condition'])) {
                $yahooData = [
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => 'user_edit'
                ];
                
                if (isset($data['category'])) {
                    $yahooData['category'] = $data['category'];
                }
                
                if (isset($data['condition'])) {
                    $yahooData['condition'] = $data['condition'];
                }
                
                $updateData['scraped_yahoo_data'] = json_encode($yahooData, JSON_UNESCAPED_UNICODE);
            }
            
            if (empty($updateData)) {
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => '更新するデータが指定されていません'
                ];
            }
            
            // 更新実行
            $updatedRows = $this->db->update($this->tableName, $updateData, [
                'source_item_id' => $itemId
            ]);
            
            if ($updatedRows === 0) {
                // ID での更新も試行
                $updatedRows = $this->db->update($this->tableName, $updateData, [
                    'id' => $itemId
                ]);
            }
            
            if ($updatedRows > 0) {
                $this->db->commit();
                return [
                    'success' => true,
                    'message' => '商品データを更新しました',
                    'updated_rows' => $updatedRows
                ];
            } else {
                $this->db->rollback();
                return [
                    'success' => false,
                    'message' => '指定された商品が見つからないか、更新できませんでした'
                ];
            }
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("ProductEditor::updateProduct error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '商品更新エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 商品削除
     * 
     * @param array $productIds 削除対象のID配列
     * @return array
     */
    public function deleteProducts($productIds) {
        try {
            if (empty($productIds)) {
                return [
                    'success' => false,
                    'message' => '削除対象が指定されていません',
                    'deleted_count' => 0
                ];
            }
            
            $this->db->beginTransaction();
            
            $deletedCount = $this->db->delete($this->tableName, [
                'id' => $productIds
            ]);
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => "{$deletedCount}件の商品を削除しました",
                'deleted_count' => $deletedCount
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("ProductEditor::deleteProducts error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '商品削除エラー: ' . $e->getMessage(),
                'deleted_count' => 0
            ];
        }
    }
    
    /**
     * CSV出力用データ取得
     * 
     * @param array $filters フィルター条件
     * @return array
     */
    public function getProductsForCSV($filters = []) {
        try {
            // CSVのため全件取得（制限なし）
            $result = $this->getProducts(1, 10000, $filters);
            
            $csvData = [];
            foreach ($result['products'] as $product) {
                $csvData[] = [
                    'item_id' => $product['item_id'],
                    'title' => $product['title'],
                    'price_jpy' => $product['price']['jpy'],
                    'price_usd' => $product['price']['usd'],
                    'category' => $product['category'],
                    'condition' => $product['condition'],
                    'platform' => $product['platform'],
                    'listing_status' => $product['listing_status'],
                    'stock' => $product['stock'],
                    'sku' => $product['sku'],
                    'updated_at' => $product['updated_at']
                ];
            }
            
            return [
                'success' => true,
                'data' => $csvData,
                'total' => count($csvData)
            ];
            
        } catch (Exception $e) {
            error_log("ProductEditor::getProductsForCSV error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'CSV出力用データ取得エラー: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * ダミーデータ削除
     * 
     * @return array
     */
    public function cleanupDummyData() {
        try {
            $this->db->beginTransaction();
            
            // ダミーデータの条件
            $sql = "DELETE FROM {$this->tableName} 
                   WHERE (active_title ILIKE '%sample%' OR active_title ILIKE '%test%' 
                          OR active_title ILIKE '%ダミー%' OR active_title ILIKE '%テスト%'
                          OR source_item_id LIKE 'SAMPLE-%' OR source_item_id LIKE 'TEST-%'
                          OR sku LIKE 'AUTO-SAMPLE-%' OR sku LIKE 'AUTO-TEST-%')";
            
            $stmt = $this->db->query($sql);
            $deletedCount = $stmt->rowCount();
            
            $this->db->commit();
            
            return [
                'success' => true,
                'message' => "{$deletedCount}件のダミーデータを削除しました",
                'deleted_count' => $deletedCount
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            error_log("ProductEditor::cleanupDummyData error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'ダミーデータ削除エラー: ' . $e->getMessage(),
                'deleted_count' => 0
            ];
        }
    }
}
?>