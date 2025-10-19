<?php
// modules/ebay_category_system/backend/CSVProcessor.php

class CSVProcessor {
    private $pdo;
    private $categoryDetector;
    private $itemSpecificsGenerator;

    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
        $this->categoryDetector = new CategoryDetector($dbConnection);
        $this->itemSpecificsGenerator = new ItemSpecificsGenerator($dbConnection);
    }
    
    /**
     * CSV一括処理
     * @param string $csvFilePath
     * @return array 処理結果
     */
    public function processBulkCSV($csvFilePath) {
        $processedData = [];
        $processedCount = 0;
        $errors = [];

        if (!file_exists($csvFilePath) || !is_readable($csvFilePath)) {
            return ['success' => false, 'message' => 'CSV file not found or unreadable.'];
        }

        $fileHandle = fopen($csvFilePath, 'r');
        if ($fileHandle === false) {
            return ['success' => false, 'message' => 'Could not open CSV file.'];
        }

        // CSVヘッダーをスキップ
        fgetcsv($fileHandle);

        while (($row = fgetcsv($fileHandle)) !== false) {
            // CSV形式: title,price,description,yahoo_category,image_url
            if (count($row) < 5) {
                $errors[] = 'Skipped row due to invalid format: ' . implode(',', $row);
                continue;
            }

            list($title, $price, $description, $yahoo_category, $image_url) = $row;
            
            $productData = [
                'title' => $title,
                'price' => (float)$price,
                'description' => $description,
                'yahoo_category' => $yahoo_category
            ];

            try {
                $detectionResult = $this->categoryDetector->detectCategory($productData);
                $itemSpecificsString = $this->itemSpecificsGenerator->generateItemSpecificsString($detectionResult['category_id']);

                // 処理済み商品データをDBに保存
                $stmt = $this->pdo->prepare("INSERT INTO processed_products (original_title, original_price, yahoo_category, detected_category_id, category_confidence, item_specifics, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $title,
                    $price,
                    $yahoo_category,
                    $detectionResult['category_id'],
                    $detectionResult['confidence'],
                    $itemSpecificsString,
                    'pending'
                ]);

                $processedData[] = [
                    'title' => $title,
                    'price' => $price,
                    'category_id' => $detectionResult['category_id'],
                    'category_name' => $detectionResult['category_name'],
                    'confidence' => $detectionResult['confidence'],
                    'item_specifics' => $itemSpecificsString,
                    'status' => 'pending'
                ];
                $processedCount++;
            } catch (Exception $e) {
                $errors[] = 'Processing failed for title "' . $title . '": ' . $e->getMessage();
            }
        }

        fclose($fileHandle);

        return [
            'success' => true,
            'processed_count' => $processedCount,
            'results' => $processedData,
            'errors' => $errors
        ];
    }
    
    /**
     * 処理結果CSV出力
     * @param array $processedData
     * @return string CSVファイルパス
     */
    public function generateOutputCSV($processedData) {
        $outputFilePath = '/tmp/processed_products_' . date('Ymd_His') . '.csv';
        $fileHandle = fopen($outputFilePath, 'w');
        if ($fileHandle === false) {
            return false;
        }

        fputcsv($fileHandle, ['title', 'price', 'category_id', 'category_name', 'confidence', 'item_specifics', 'status']);
        foreach ($processedData as $row) {
            fputcsv($fileHandle, [
                $row['title'],
                $row['price'],
                $row['category_id'],
                $row['category_name'],
                $row['confidence'],
                $row['item_specifics'],
                $row['status']
            ]);
        }

        fclose($fileHandle);
        return $outputFilePath;
    }
}