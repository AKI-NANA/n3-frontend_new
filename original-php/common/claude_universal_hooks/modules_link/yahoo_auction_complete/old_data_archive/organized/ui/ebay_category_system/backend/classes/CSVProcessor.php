<?php
/**
 * CSV処理エンジン - エラーハンドリング強化版
 * 大量データ対応・メモリ効率化・詳細ログ
 */

class CSVProcessor {
    private $pdo;
    private $categoryDetector;
    private $itemSpecificsGenerator;
    private $maxMemoryUsage;
    private $processedCount;
    private $errorCount;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->categoryDetector = new CategoryDetector($dbConnection, true); // デバッグモード
        $this->itemSpecificsGenerator = new ItemSpecificsGenerator($dbConnection);
        $this->maxMemoryUsage = 256 * 1024 * 1024; // 256MB制限
        $this->processedCount = 0;
        $this->errorCount = 0;
    }
    
    /**
     * CSV一括処理（高機能版）
     * @param string $csvFilePath
     * @param array $options 処理オプション
     * @return array 詳細な処理結果
     */
    public function processBulkCSV($csvFilePath, $options = []) {
        // デフォルトオプション
        $options = array_merge([
            'batch_size' => 100,
            'max_rows' => 10000,
            'skip_errors' => true,
            'validate_required_fields' => true,
            'generate_item_specifics' => true,
            'save_to_database' => true
        ], $options);
        
        $results = [
            'success' => false,
            'processed_count' => 0,
            'error_count' => 0,
            'results' => [],
            'errors' => [],
            'processing_time' => 0,
            'memory_peak' => 0
        ];
        
        $startTime = microtime(true);
        
        try {
            // 1. ファイル検証
            if (!$this->validateCSVFile($csvFilePath)) {
                throw new Exception('Invalid CSV file: ' . $csvFilePath);
            }
            
            // 2. CSV読み込み・処理
            $processedData = $this->processCSVFile($csvFilePath, $options);
            
            // 3. データベース保存（オプション）
            if ($options['save_to_database']) {
                $this->saveProcessedData($processedData['results']);
            }
            
            $results = array_merge($results, $processedData);
            $results['success'] = true;
            
        } catch (Exception $e) {
            error_log('CSVProcessor Error: ' . $e->getMessage());
            $results['errors'][] = 'System error: ' . $e->getMessage();
        }
        
        // 処理統計
        $results['processing_time'] = round(microtime(true) - $startTime, 2);
        $results['memory_peak'] = memory_get_peak_usage(true);
        
        return $results;
    }
    
    /**
     * CSVファイル検証
     */
    private function validateCSVFile($csvFilePath) {
        if (!file_exists($csvFilePath) || !is_readable($csvFilePath)) {
            return false;
        }
        
        $fileSize = filesize($csvFilePath);
        if ($fileSize > 10 * 1024 * 1024) { // 10MB制限
            throw new Exception('CSV file too large: ' . ($fileSize / 1024 / 1024) . 'MB');
        }
        
        return true;
    }
    
    /**
     * CSVファイル処理メイン
     */
    private function processCSVFile($csvFilePath, $options) {
        $processedData = [];
        $errors = [];
        $rowCount = 0;
        
        $fileHandle = fopen($csvFilePath, 'r');
        if ($fileHandle === false) {
            throw new Exception('Cannot open CSV file');
        }
        
        // CSVヘッダー読み込み・検証
        $headers = fgetcsv($fileHandle);
        $this->validateCSVHeaders($headers);
        
        // データ行処理
        while (($row = fgetcsv($fileHandle)) !== false && $rowCount < $options['max_rows']) {
            $rowCount++;
            
            try {
                // メモリ使用量監視
                if (memory_get_usage() > $this->maxMemoryUsage) {
                    gc_collect_cycles();
                    if (memory_get_usage() > $this->maxMemoryUsage) {
                        throw new Exception('Memory limit exceeded at row ' . $rowCount);
                    }
                }
                
                // 行データ処理
                $processedRow = $this->processCSVRow($row, $headers, $options);
                if ($processedRow !== null) {
                    $processedData[] = $processedRow;
                    $this->processedCount++;
                }
                
            } catch (Exception $e) {
                $this->errorCount++;
                $error = [
                    'row' => $rowCount,
                    'data' => $row,
                    'error' => $e->getMessage()
                ];
                $errors[] = $error;
                
                if (!$options['skip_errors']) {
                    break; // エラー時停止
                }
            }
            
            // バッチ処理の進捗表示
            if ($rowCount % $options['batch_size'] === 0) {
                error_log("Processed {$rowCount} rows...");
            }
        }
        
        fclose($fileHandle);
        
        return [
            'processed_count' => $this->processedCount,
            'error_count' => $this->errorCount,
            'results' => $processedData,
            'errors' => $errors,
            'total_rows' => $rowCount
        ];
    }
    
    /**
     * CSVヘッダー検証
     */
    private function validateCSVHeaders($headers) {
        $requiredHeaders = ['title', 'price', 'description', 'yahoo_category', 'image_url'];
        
        foreach ($requiredHeaders as $required) {
            if (!in_array($required, $headers)) {
                throw new Exception("Required CSV header missing: {$required}");
            }
        }
        
        return true;
    }
    
    /**
     * CSV行データ処理
     */
    private function processCSVRow($row, $headers, $options) {
        // 列数チェック
        if (count($row) !== count($headers)) {
            throw new Exception('Column count mismatch');
        }
        
        // データ連想配列化
        $data = array_combine($headers, $row);
        
        // 必須フィールド検証
        if ($options['validate_required_fields']) {
            $this->validateRequiredFields($data);
        }
        
        // 商品データ構築
        $productData = [
            'title' => trim($data['title']),
            'price' => $this->sanitizePrice($data['price']),
            'description' => trim($data['description'] ?? ''),
            'yahoo_category' => trim($data['yahoo_category'] ?? ''),
            'image_url' => trim($data['image_url'] ?? '')
        ];
        
        // カテゴリー自動判定
        $detectionResult = $this->categoryDetector->detectCategory($productData);
        
        // Item Specifics生成
        $itemSpecificsString = '';
        if ($options['generate_item_specifics']) {
            $itemSpecificsString = $this->itemSpecificsGenerator->generateItemSpecificsString(
                $detectionResult['category_id'],
                [],
                $productData
            );
        }
        
        // 結果構築
        return [
            'original_title' => $productData['title'],
            'original_price' => $productData['price'],
            'yahoo_category' => $productData['yahoo_category'],
            'image_url' => $productData['image_url'],
            'category_id' => $detectionResult['category_id'],
            'category_name' => $detectionResult['category_name'],
            'confidence' => $detectionResult['confidence'],
            'matched_keywords' => $detectionResult['matched_keywords'],
            'item_specifics' => $itemSpecificsString,
            'status' => $this->determineInitialStatus($detectionResult['confidence']),
            'processing_timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * 必須フィールド検証
     */
    private function validateRequiredFields($data) {
        if (empty(trim($data['title']))) {
            throw new Exception('Empty title field');
        }
        
        if (!is_numeric($data['price']) || floatval($data['price']) < 0) {
            throw new Exception('Invalid price: ' . $data['price']);
        }
        
        return true;
    }
    
    /**
     * 価格値のサニタイゼーション
     */
    private function sanitizePrice($priceString) {
        // 数字以外を除去してfloat変換
        $cleaned = preg_replace('/[^\d.]/', '', $priceString);
        $price = floatval($cleaned);
        
        if ($price < 0 || $price > 999999) {
            throw new Exception('Price out of range: ' . $price);
        }
        
        return $price;
    }
    
    /**
     * 初期ステータス決定
     */
    private function determineInitialStatus($confidence) {
        if ($confidence >= 80) {
            return 'approved';
        } elseif ($confidence >= 50) {
            return 'pending';
        } else {
            return 'review_required';
        }
    }
    
    /**
     * 処理済みデータをデータベースに保存
     */
    private function saveProcessedData($processedDataArray) {
        if (empty($processedDataArray)) {
            return false;
        }
        
        try {
            $this->pdo->beginTransaction();
            
            $sql = "
                INSERT INTO processed_products (
                    original_title, original_price, yahoo_category, 
                    detected_category_id, category_confidence, item_specifics, 
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ";
            
            $stmt = $this->pdo->prepare($sql);
            
            foreach ($processedDataArray as $data) {
                $stmt->execute([
                    $data['original_title'],
                    $data['original_price'],
                    $data['yahoo_category'],
                    $data['category_id'],
                    $data['confidence'],
                    $data['item_specifics'],
                    $data['status']
                ]);
            }
            
            $this->pdo->commit();
            return true;
            
        } catch (PDOException $e) {
            $this->pdo->rollback();
            throw new Exception('Database save failed: ' . $e->getMessage());
        }
    }
    
    /**
     * 処理結果CSV出力（高機能版）
     * @param array $processedData
     * @param array $options
     * @return array ファイル情報
     */
    public function generateOutputCSV($processedData, $options = []) {
        $options = array_merge([
            'include_debug_info' => false,
            'filename_prefix' => 'ebay_category_processed',
            'output_directory' => '/tmp'
        ], $options);
        
        $timestamp = date('Ymd_His');
        $filename = "{$options['filename_prefix']}_{$timestamp}.csv";
        $outputFilePath = $options['output_directory'] . '/' . $filename;
        
        $fileHandle = fopen($outputFilePath, 'w');
        if ($fileHandle === false) {
            throw new Exception('Cannot create output CSV file');
        }
        
        // UTF-8 BOM追加（Excel対応）
        fwrite($fileHandle, "\xEF\xBB\xBF");
        
        // ヘッダー行
        $headers = [
            'original_title', 'original_price', 'category_id', 'category_name',
            'confidence', 'item_specifics', 'status', 'processing_timestamp'
        ];
        
        if ($options['include_debug_info']) {
            $headers[] = 'matched_keywords';
        }
        
        fputcsv($fileHandle, $headers);
        
        // データ行
        foreach ($processedData as $row) {
            $csvRow = [
                $row['original_title'],
                $row['original_price'],
                $row['category_id'],
                $row['category_name'],
                $row['confidence'],
                $row['item_specifics'],
                $row['status'],
                $row['processing_timestamp']
            ];
            
            if ($options['include_debug_info']) {
                $csvRow[] = implode(', ', $row['matched_keywords'] ?? []);
            }
            
            fputcsv($fileHandle, $csvRow);
        }
        
        fclose($fileHandle);
        
        return [
            'filepath' => $outputFilePath,
            'filename' => $filename,
            'filesize' => filesize($outputFilePath),
            'download_url' => '/downloads/' . $filename
        ];
    }
    
    /**
     * 処理統計情報取得
     */
    public function getProcessingStatistics() {
        try {
            $sql = "
                SELECT 
                    COUNT(*) as total_processed,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN status = 'review_required' THEN 1 END) as review_required_count,
                    AVG(category_confidence) as avg_confidence,
                    DATE(created_at) as processing_date
                FROM processed_products 
                WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
                GROUP BY DATE(created_at)
                ORDER BY processing_date DESC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("getProcessingStatistics Error: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * バッチ処理の進捗コールバック設定
     */
    public function setProgressCallback($callback) {
        $this->progressCallback = $callback;
    }
    
    /**
     * 一時ファイルクリーンアップ
     */
    public function cleanupTempFiles($directory = '/tmp', $olderThanHours = 24) {
        $files = glob($directory . '/ebay_category_processed_*.csv');
        $cutoffTime = time() - ($olderThanHours * 3600);
        
        foreach ($files as $file) {
            if (filemtime($file) < $cutoffTime) {
                unlink($file);
            }
        }
    }
}
?>