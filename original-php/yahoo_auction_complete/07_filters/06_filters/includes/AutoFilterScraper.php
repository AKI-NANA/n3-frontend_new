<?php
/**
 * スクレイピングシステム - 第1段階自動フィルター統合版
 * 商品データ保存時に輸出・特許フィルターを自動実行
 */

class AutoFilterScraper {
    private $pdo;
    private $exportKeywords = [];
    private $patentKeywords = [];
    
    public function __construct($database) {
        $this->pdo = $database;
        $this->loadFilterKeywords();
    }
    
    /**
     * フィルターキーワードをメモリに読み込み
     */
    private function loadFilterKeywords() {
        try {
            // 輸出禁止キーワード取得
            $stmt = $this->pdo->prepare("
                SELECT keyword 
                FROM filter_keywords 
                WHERE type = 'EXPORT' AND is_active = TRUE
                ORDER BY keyword
            ");
            $stmt->execute();
            $this->exportKeywords = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // 特許関連キーワード取得
            $stmt = $this->pdo->prepare("
                SELECT keyword 
                FROM filter_keywords 
                WHERE type = 'PATENT' AND is_active = TRUE
                ORDER BY keyword
            ");
            $stmt->execute();
            $this->patentKeywords = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            error_log("フィルターキーワード読み込み完了 - 輸出: " . count($this->exportKeywords) . "件, 特許: " . count($this->patentKeywords) . "件");
            
        } catch (Exception $e) {
            error_log("キーワード読み込みエラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 商品データ保存（フィルター自動実行付き）
     */
    public function saveProductWithAutoFilter($productData) {
        try {
            $this->pdo->beginTransaction();
            
            // 基本的な商品データ検証
            $this->validateProductData($productData);
            
            // 第1段階フィルター実行
            $filterResults = $this->executeFirstStageFilters($productData);
            
            // データベースに商品保存（フィルター結果込み）
            $productId = $this->insertProductWithFilters($productData, $filterResults);
            
            // 検出キーワード数を更新
            $this->updateKeywordDetectionCounts($filterResults);
            
            $this->pdo->commit();
            
            return [
                'success' => true,
                'product_id' => $productId,
                'filter_results' => $filterResults,
                'message' => '商品データ保存・第1段階フィルター完了'
            ];
            
        } catch (Exception $e) {
            $this->pdo->rollback();
            error_log("商品保存エラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 第1段階フィルター実行（輸出・特許）
     */
    private function executeFirstStageFilters($productData) {
        $targetText = $this->buildFilterTargetText($productData);
        
        // 輸出禁止フィルター
        $exportDetected = $this->performKeywordCheck($targetText, $this->exportKeywords);
        $exportStatus = empty($exportDetected);
        
        // 特許フィルター
        $patentDetected = $this->performKeywordCheck($targetText, $this->patentKeywords);
        $patentStatus = empty($patentDetected);
        
        return [
            'export_filter_status' => $exportStatus,
            'export_detected_keywords' => implode(', ', $exportDetected),
            'patent_filter_status' => $patentStatus,
            'patent_detected_keywords' => implode(', ', $patentDetected),
            'total_detected' => count($exportDetected) + count($patentDetected)
        ];
    }
    
    /**
     * フィルター対象テキスト構築
     */
    private function buildFilterTargetText($productData) {
        $targetFields = [
            $productData['title'] ?? '',
            $productData['description'] ?? '',
            $productData['category'] ?? '',
            $productData['brand'] ?? ''
        ];
        
        return implode(' ', array_filter($targetFields));
    }
    
    /**
     * キーワードチェック実行
     */
    private function performKeywordCheck($text, $keywords) {
        $detectedKeywords = [];
        $textLower = mb_strtolower($text, 'UTF-8');
        
        foreach ($keywords as $keyword) {
            $keywordLower = mb_strtolower($keyword, 'UTF-8');
            
            // 完全一致または部分一致チェック
            if (mb_strpos($textLower, $keywordLower) !== false) {
                $detectedKeywords[] = $keyword;
            }
        }
        
        return array_unique($detectedKeywords);
    }
    
    /**
     * 商品データとフィルター結果をデータベースに保存
     */
    private function insertProductWithFilters($productData, $filterResults) {
        $sql = "INSERT INTO yahoo_scraped_products (
            title, description, price, url, image_url, category, brand,
            export_filter_status, export_detected_keywords,
            patent_filter_status, patent_detected_keywords,
            mall_filter_status, mall_detected_keywords,
            final_judgment,
            created_at, filter_updated_at
        ) VALUES (
            :title, :description, :price, :url, :image_url, :category, :brand,
            :export_filter_status, :export_detected_keywords,
            :patent_filter_status, :patent_detected_keywords,
            NULL, NULL,
            :final_judgment,
            NOW(), NOW()
        )";
        
        // 最終判定を決定（第1段階のみ）
        $finalJudgment = ($filterResults['export_filter_status'] && $filterResults['patent_filter_status']) 
                         ? 'PENDING'  // モール選択待ち
                         : 'NG';      // 第1段階でブロック
        
        $stmt = $this->pdo->prepare($sql);
        $params = [
            'title' => $productData['title'] ?? '',
            'description' => $productData['description'] ?? '',
            'price' => $productData['price'] ?? 0,
            'url' => $productData['url'] ?? '',
            'image_url' => $productData['image_url'] ?? '',
            'category' => $productData['category'] ?? '',
            'brand' => $productData['brand'] ?? '',
            'export_filter_status' => $filterResults['export_filter_status'],
            'export_detected_keywords' => $filterResults['export_detected_keywords'],
            'patent_filter_status' => $filterResults['patent_filter_status'],
            'patent_detected_keywords' => $filterResults['patent_detected_keywords'],
            'final_judgment' => $finalJudgment
        ];
        
        $stmt->execute($params);
        return $this->pdo->lastInsertId();
    }
    
    /**
     * 商品データ検証
     */
    private function validateProductData($productData) {
        $required = ['title'];
        foreach ($required as $field) {
            if (empty($productData[$field])) {
                throw new InvalidArgumentException("必須フィールド '{$field}' が不足しています");
            }
        }
        
        // タイトルの長さチェック
        if (mb_strlen($productData['title'] ?? '') > 500) {
            throw new InvalidArgumentException("商品タイトルが長すぎます");
        }
    }
    
    /**
     * キーワード検出回数更新
     */
    private function updateKeywordDetectionCounts($filterResults) {
        try {
            // 検出されたキーワードの回数を増加
            $allDetected = [];
            
            if (!empty($filterResults['export_detected_keywords'])) {
                $allDetected = array_merge($allDetected, 
                    explode(', ', $filterResults['export_detected_keywords']));
            }
            
            if (!empty($filterResults['patent_detected_keywords'])) {
                $allDetected = array_merge($allDetected, 
                    explode(', ', $filterResults['patent_detected_keywords']));
            }
            
            foreach (array_unique($allDetected) as $keyword) {
                $stmt = $this->pdo->prepare("
                    UPDATE filter_keywords 
                    SET detection_count = detection_count + 1, 
                        updated_at = NOW() 
                    WHERE keyword = ? AND is_active = TRUE
                ");
                $stmt->execute([$keyword]);
            }
            
        } catch (Exception $e) {
            // エラーログは出力するが、メイン処理は継続
            error_log("検出回数更新エラー: " . $e->getMessage());
        }
    }
    
    /**
     * バッチ処理用：複数商品の一括処理
     */
    public function batchProcessProducts($productsList, $batchSize = 100) {
        $results = [
            'processed' => 0,
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        $batches = array_chunk($productsList, $batchSize);
        
        foreach ($batches as $batchIndex => $batch) {
            try {
                $this->pdo->beginTransaction();
                
                foreach ($batch as $productData) {
                    try {
                        $this->saveProductWithAutoFilter($productData);
                        $results['success']++;
                    } catch (Exception $e) {
                        $results['failed']++;
                        $results['errors'][] = [
                            'product' => $productData['title'] ?? 'Unknown',
                            'error' => $e->getMessage()
                        ];
                    }
                    $results['processed']++;
                }
                
                $this->pdo->commit();
                
                // 進捗ログ
                error_log("バッチ " . ($batchIndex + 1) . "/" . count($batches) . " 完了 - 成功: {$results['success']}, 失敗: {$results['failed']}");
                
            } catch (Exception $e) {
                $this->pdo->rollback();
                error_log("バッチ処理エラー " . ($batchIndex + 1) . ": " . $e->getMessage());
                
                // バッチ全体が失敗した場合の個別処理
                foreach ($batch as $productData) {
                    $results['failed']++;
                    $results['processed']++;
                    $results['errors'][] = [
                        'product' => $productData['title'] ?? 'Unknown',
                        'error' => 'バッチ処理エラー: ' . $e->getMessage()
                    ];
                }
            }
            
            // メモリ使用量制御
            if (memory_get_usage() > 100 * 1024 * 1024) { // 100MB
                gc_collect_cycles();
            }
        }
        
        return $results;
    }
    
    /**
     * フィルター統計取得
     */
    public function getFilterStatistics() {
        $stats = [];
        
        // 総商品数
        $stmt = $this->pdo->query("SELECT COUNT(*) FROM yahoo_scraped_products");
        $stats['total_products'] = $stmt->fetchColumn();
        
        // フィルター結果別集計
        $stmt = $this->pdo->query("
            SELECT 
                final_judgment,
                COUNT(*) as count
            FROM yahoo_scraped_products 
            GROUP BY final_judgment
        ");
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $stats['by_judgment'][$row['final_judgment']] = $row['count'];
        }
        
        // 各フィルター別ブロック数
        $stmt = $this->pdo->query("
            SELECT 
                SUM(CASE WHEN export_filter_status = FALSE THEN 1 ELSE 0 END) as export_blocked,
                SUM(CASE WHEN patent_filter_status = FALSE THEN 1 ELSE 0 END) as patent_blocked,
                SUM(CASE WHEN mall_filter_status = FALSE THEN 1 ELSE 0 END) as mall_blocked
            FROM yahoo_scraped_products
        ");
        $filterStats = $stmt->fetch(PDO::FETCH_ASSOC);
        $stats = array_merge($stats, $filterStats);
        
        // 最も検出されているキーワード Top 10
        $stmt = $this->pdo->query("
            SELECT keyword, type, detection_count 
            FROM filter_keywords 
            WHERE detection_count > 0 
            ORDER BY detection_count DESC 
            LIMIT 10
        ");
        $stats['top_detected_keywords'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return $stats;
    }
}

/**
 * 使用例 - スクレイピング処理との統合
 */

// データベース接続（既存の設定を使用）
require_once '../shared/core/database.php';

try {
    // AutoFilterScraperのインスタンス化
    $autoFilter = new AutoFilterScraper($pdo);
    
    // 単体商品処理の例
    $productData = [
        'title' => 'サンプル商品タイトル',
        'description' => '商品説明文...',
        'price' => 1000,
        'url' => 'https://example.com/product/123',
        'image_url' => 'https://example.com/image/123.jpg',
        'category' => 'electronics',
        'brand' => 'SampleBrand'
    ];
    
    // 第1段階フィルター付き保存実行
    $result = $autoFilter->saveProductWithAutoFilter($productData);
    
    if ($result['success']) {
        echo "商品保存完了 ID: " . $result['product_id'] . "\n";
        echo "検出キーワード数: " . $result['filter_results']['total_detected'] . "\n";
    }
    
    // バッチ処理の例
    $productsList = [
        // 複数の商品データ配列...
    ];
    
    $batchResults = $autoFilter->batchProcessProducts($productsList);
    echo "バッチ処理完了 - 成功: {$batchResults['success']}, 失敗: {$batchResults['failed']}\n";
    
    // 統計情報取得
    $stats = $autoFilter->getFilterStatistics();
    echo "フィルター統計: " . json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    
} catch (Exception $e) {
    error_log("自動フィルター処理エラー: " . $e->getMessage());
    echo "エラー: " . $e->getMessage() . "\n";
}

/**
 * 既存スクレイピングシステムとの統合ポイント
 * 
 * 1. 既存のscraping.phpファイルで、商品データ保存部分を以下に置き換え：
 *    
 *    // 従来の保存処理
 *    // insertProduct($productData);
 *    
 *    // 新しいフィルター付き保存処理
 *    $autoFilter = new AutoFilterScraper($pdo);
 *    $result = $autoFilter->saveProductWithAutoFilter($productData);
 * 
 * 2. 大量データ処理の場合は batchProcessProducts() を使用
 * 
 * 3. 定期的に getFilterStatistics() で統計を確認し、
 *    キーワードの効果性を監視
 */