<?php
/**
 * CSV出力・入力ハンドラー（完全修正版）
 * 文字化け・PHPエラー混入問題を完全解決
 * 2025-09-13 更新版
 */

require_once __DIR__ . '/database_query_handler.php';

class CSVExportHandler {
    
    private $pdo;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }
    
    /**
     * スクレイピングデータをeBay出品用CSVフォーマットに変換
     * 文字化け問題完全解決版
     * 
     * @param array $filters フィルター条件
     * @param string $type 出力タイプ ('all', 'yahoo_only', 'high_value')
     * @return array CSV出力結果
     */
    public function exportScrapedDataToEbayCSV($filters = [], $type = 'all') {
        try {
            $data = $this->getScrapedDataForExport($filters, $type);
            
            if (empty($data)) {
                return [
                    'success' => false,
                    'message' => '出力対象のデータが見つかりませんでした',
                    'count' => 0
                ];
            }
            
            $csvContent = $this->generateEbayCsvContent($data);
            $filename = $this->generateCsvFilename($type);
            $filepath = $this->saveCsvFile($csvContent, $filename);
            
            return [
                'success' => true,
                'message' => 'CSV出力が完了しました',
                'filename' => $filename,
                'filepath' => $filepath,
                'count' => count($data),
                'download_url' => '/modules/yahoo_auction_complete/csv_exports/' . $filename
            ];
            
        } catch (Exception $e) {
            error_log("CSV出力エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'CSV出力中にエラーが発生しました: ' . $e->getMessage(),
                'count' => 0
            ];
        }
    }
    
    /**
     * 出力用データ取得（文字化け対策済み）
     */
    private function getScrapedDataForExport($filters, $type) {
        $sql = "
            SELECT 
                item_id,
                title,
                current_price,
                condition_name,
                category_name,
                picture_url,
                gallery_url,
                source_url,
                watch_count,
                listing_status,
                updated_at,
                scraped_at
            FROM mystical_japan_treasures_inventory 
            WHERE 1=1
        ";
        
        $params = [];
        
        // タイプ別フィルター
        switch ($type) {
            case 'yahoo_only':
                $sql .= " AND (source_url LIKE '%auctions.yahoo.co.jp%' OR source_url LIKE '%page.auctions.yahoo.co.jp%')";
                break;
            case 'high_value':
                $sql .= " AND current_price >= 50";
                break;
            case 'category_specific':
                if (!empty($filters['category'])) {
                    $sql .= " AND category_name ILIKE :category";
                    $params['category'] = '%' . $filters['category'] . '%';
                }
                break;
        }
        
        // 基本条件
        $sql .= " AND title IS NOT NULL AND current_price > 0";
        
        // フィルター適用
        if (!empty($filters['min_price'])) {
            $sql .= " AND current_price >= :min_price";
            $params['min_price'] = $filters['min_price'];
        }
        
        if (!empty($filters['max_price'])) {
            $sql .= " AND current_price <= :max_price";
            $params['max_price'] = $filters['max_price'];
        }
        
        if (!empty($filters['condition']) && $filters['condition'] !== null) {
            $sql .= " AND condition_name ILIKE :condition";
            $params['condition'] = '%' . $filters['condition'] . '%';
        }
        
        $sql .= " ORDER BY current_price DESC, updated_at DESC LIMIT 1000";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * eBay出品用CSVコンテンツ生成（文字化け完全対策版）
     */
    private function generateEbayCsvContent($data) {
        // eBay出品用CSVヘッダー
        $headers = [
            'Action',
            'Category',
            'Title',
            'Description',
            'Quantity',
            'BuyItNowPrice',
            'ConditionID',
            'Location',
            'PaymentProfile',
            'ReturnProfile',
            'ShippingProfile',
            'PictureURL',
            'UPC',
            'Brand',
            'ConditionDescription',
            'SiteID',
            'PostalCode',
            'Currency',
            'Format',
            'Duration',
            'Country',
            'SourceURL',
            'OriginalPriceJPY',
            'ConversionRate',
            'ProcessedAt'
        ];
        
        $csvContent = implode(',', $headers) . "\n";
        
        foreach ($data as $product) {
            $row = [
                'Add', // Action
                $this->mapToEbayCategory($product['category_name']), // Category
                $this->cleanTitle($product['title']), // Title (文字化け修正済み)
                $this->generateDescription($product), // Description
                '1', // Quantity
                $this->convertPriceToUSD($product['current_price']), // BuyItNowPrice
                $this->mapToEbayConditionID($product['condition_name']), // ConditionID
                'Japan', // Location
                'Standard Payment', // PaymentProfile
                '30 Days Return', // ReturnProfile
                'Standard Shipping', // ShippingProfile
                $this->sanitizeUrl($product['picture_url'] ?: $product['gallery_url']), // PictureURL
                '', // UPC (未設定)
                $this->extractBrand($product['title']), // Brand
                $this->translateCondition($product['condition_name']), // ConditionDescription
                '0', // SiteID (US)
                '100-0001', // PostalCode (Tokyo default)
                'USD', // Currency
                'FixedPriceItem', // Format
                'GTC', // Duration (Good Till Cancelled)
                'JP', // Country
                $this->sanitizeUrl($product['source_url']), // SourceURL (追加情報)
                $product['current_price'], // OriginalPriceJPY (追加情報)
                '0.0067', // ConversionRate (追加情報、1円=0.0067USD概算)
                date('Y-m-d H:i:s') // ProcessedAt (追加情報)
            ];
            
            // CSVエスケープ処理（文字化け対策強化）
            $escapedRow = array_map(function($field) {
                // nullチェック追加
                if ($field === null) {
                    return '';
                }
                
                $field = (string)$field;
                
                // 文字化け文字（�）を削除
                $field = str_replace('�', '', $field);
                
                // UTF-8エンコーディング確認
                if (!mb_check_encoding($field, 'UTF-8')) {
                    $field = mb_convert_encoding($field, 'UTF-8', 'auto');
                }
                
                // CSVエスケープ
                if (strpos($field, ',') !== false || 
                    strpos($field, '"') !== false || 
                    strpos($field, "\n") !== false || 
                    strpos($field, "\r") !== false) {
                    return '"' . str_replace('"', '""', $field) . '"';
                }
                
                return $field;
            }, $row);
            
            $csvContent .= implode(',', $escapedRow) . "\n";
        }
        
        return $csvContent;
    }
    
    /**
     * タイトルクリーニング（文字化け対策強化版）
     */
    private function cleanTitle($title) {
        if ($title === null) {
            return 'Untitled Product';
        }
        
        // 文字化け文字（�）を削除
        $cleaned = str_replace('�', '', $title);
        
        // UTF-8エンコーディング確認
        if (!mb_check_encoding($cleaned, 'UTF-8')) {
            $cleaned = mb_convert_encoding($cleaned, 'UTF-8', 'auto');
        }
        
        // 不要文字除去
        $cleaned = preg_replace('/[【】\[\]「」()（）]/', '', $cleaned);
        $cleaned = preg_replace('/\s+/', ' ', trim($cleaned));
        
        // 制御文字を除去
        $cleaned = preg_replace('/[\x00-\x1F\x7F]/', '', $cleaned);
        
        // 空文字チェック
        if (empty($cleaned)) {
            $cleaned = 'Japanese Auction Item';
        }
        
        // eBayタイトル制限 (80文字)
        if (mb_strlen($cleaned) > 80) {
            $cleaned = mb_substr($cleaned, 0, 77) . '...';
        }
        
        return $cleaned;
    }
    
    /**
     * URL安全化処理
     */
    private function sanitizeUrl($url) {
        if ($url === null || empty($url)) {
            return '';
        }
        
        // 文字化け文字を除去
        $url = str_replace('�', '', $url);
        
        // UTF-8エンコーディング確認
        if (!mb_check_encoding($url, 'UTF-8')) {
            $url = mb_convert_encoding($url, 'UTF-8', 'auto');
        }
        
        return $url;
    }
    
    /**
     * 商品説明生成（文字化け対策版）
     */
    private function generateDescription($product) {
        $description = "Original Japanese auction item imported from Yahoo Auctions.\n\n";
        
        $condition = $product['condition_name'] ?? '';
        if (!empty($condition)) {
            $cleanCondition = $this->translateCondition($condition);
            $description .= "Condition: " . $cleanCondition . "\n";
        }
        
        $category = $product['category_name'] ?? '';
        if (!empty($category)) {
            // 文字化け除去
            $cleanCategory = str_replace('�', '', $category);
            if (!empty($cleanCategory)) {
                $description .= "Category: " . $cleanCategory . "\n";
            }
        }
        
        $sourceUrl = $this->sanitizeUrl($product['source_url'] ?? '');
        if (!empty($sourceUrl)) {
            $description .= "Source: " . $sourceUrl . "\n";
        }
        
        $description .= "\nShipped from Japan with tracking and insurance.";
        
        return $description;
    }
    
    // その他のメソッドは既存のまま
    private function convertPriceToUSD($priceJPY) {
        $exchangeRate = 0.0067; // 1円 = 0.0067USD (概算)
        $usdPrice = $priceJPY * $exchangeRate;
        
        if ($usdPrice < 0.99) {
            $usdPrice = 0.99;
        }
        
        // 利益マージン追加 (30%)
        $usdPrice = $usdPrice * 1.3;
        
        return number_format($usdPrice, 2);
    }
    
    private function mapToEbayCategory($categoryName) {
        if ($categoryName === null) {
            return '293'; // デフォルト
        }
        
        $categoryMap = [
            'エレクトロニクス' => '293',
            'ファッション' => '11450',
            'ホーム' => '11700',
            'スポーツ' => '888',
            'おもちゃ' => '220',
            '車・バイク' => '6028',
            'ビジネス' => '12576',
            '音楽' => '11233',  // 音楽CD等
            'CD' => '11233',
            'DVD' => '11232'
        ];
        
        foreach ($categoryMap as $japanese => $ebayId) {
            if (strpos($categoryName, $japanese) !== false) {
                return $ebayId;
            }
        }
        
        return '293'; // デフォルト: Consumer Electronics
    }
    
    private function mapToEbayConditionID($condition) {
        if ($condition === null) {
            return '3000'; // デフォルト: Used
        }
        
        $conditionMap = [
            '新品' => '1000',
            '未使用' => '1500',
            '中古' => '3000',
            'ジャンク' => '7000',
            '未開封' => '1000'
        ];
        
        foreach ($conditionMap as $japanese => $ebayId) {
            if (strpos($condition, $japanese) !== false) {
                return $ebayId;
            }
        }
        
        return '3000'; // デフォルト: Used
    }
    
    private function translateCondition($condition) {
        if ($condition === null) {
            return 'Used';
        }
        
        $translations = [
            '新品' => 'Brand New',
            '未使用' => 'New without tags',
            '未開封' => 'New in original packaging',
            '中古' => 'Used',
            'ジャンク' => 'For parts or not working'
        ];
        
        foreach ($translations as $japanese => $english) {
            if (strpos($condition, $japanese) !== false) {
                return $english;
            }
        }
        
        return 'Used';
    }
    
    private function extractBrand($title) {
        if ($title === null) {
            return '';
        }
        
        // 簡易ブランド抽出（後で強化）
        $brands = ['Apple', 'Sony', 'Nintendo', 'Canon', 'Nikon', 'Toyota', 'Honda', 'ANISON'];
        
        foreach ($brands as $brand) {
            if (stripos($title, $brand) !== false) {
                return $brand;
            }
        }
        
        return '';
    }
    
    private function generateCsvFilename($type) {
        $timestamp = date('Ymd_His');
        return "ebay_listing_{$type}_{$timestamp}.csv";
    }
    
    private function saveCsvFile($content, $filename) {
        $directory = __DIR__ . '/csv_exports';
        
        if (!is_dir($directory)) {
            mkdir($directory, 0755, true);
        }
        
        $filepath = $directory . '/' . $filename;
        
        // UTF-8 BOM付きで保存（Excel対応）
        $bomContent = "\xEF\xBB\xBF" . $content;
        file_put_contents($filepath, $bomContent);
        
        return $filepath;
    }
}

// グローバル関数（互換性維持）
function exportScrapedDataToEbayCSV($filters = [], $type = 'all') {
    $exporter = new CSVExportHandler();
    return $exporter->exportScrapedDataToEbayCSV($filters, $type);
}
?>
