<?php
/**
 * CSV拡張版ハンドラー - 新規差し込み項目対応
 * 追加項目: SKU, ReleaseDate, FreeFormat1-3, ShippingMethod
 */

require_once __DIR__ . '/database_query_handler.php';

class ExtendedCSVExportHandler {
    
    private $pdo;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }
    
    /**
     * 拡張版eBay出品CSVヘッダー（新規項目追加）
     */
    public function getExtendedEbayCsvHeaders() {
        return [
            // 既存のeBay項目
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
            'ProcessedAt',
            
            // 🆕 新規追加項目（HTMLテンプレート差し込み用）
            'ProductSKU',        // {{SKU}} 用
            'ReleaseDate',       // {{RELEASE_DATE}} 用  
            'FreeFormat1',       // {{FREE_FORMAT_1}} 用
            'FreeFormat2',       // {{FREE_FORMAT_2}} 用
            'FreeFormat3',       // {{FREE_FORMAT_3}} 用
            'ShippingMethod',    // {{SHIPPING_METHOD}} 用
            'SellerNotes',       // {{SELLER_NOTES}} 用
            'ItemCondition',     // {{ITEM_CONDITION}} 用（詳細状態）
            'OriginalURL'        // {{ORIGINAL_URL}} 用（元URL）
        ];
    }
    
    /**
     * 拡張版CSV生成（新規項目含む）
     */
    public function exportExtendedEbayCSV($data = [], $type = 'template') {
        try {
            $headers = $this->getExtendedEbayCsvHeaders();
            $csvContent = implode(',', $headers) . "\n";
            
            if ($type === 'template') {
                // テンプレート用（サンプル行付き）
                $sampleRow = $this->generateSampleRow();
                $csvContent .= $this->arrayToCsvRow($sampleRow) . "\n";
            } else {
                // 実データ処理
                $productData = $this->getProductDataForCSV($data);
                foreach ($productData as $product) {
                    $row = $this->convertProductToExtendedCsvRow($product);
                    $csvContent .= $this->arrayToCsvRow($row) . "\n";
                }
            }
            
            return [
                'success' => true,
                'csv_content' => $csvContent,
                'headers' => $headers,
                'message' => '拡張CSV生成完了'
            ];
            
        } catch (Exception $e) {
            error_log("拡張CSV生成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => '拡張CSV生成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * サンプル行生成（テンプレート用）
     */
    private function generateSampleRow() {
        return [
            'Add',                           // Action
            '293',                          // Category
            'Sample Product - Edit This Title', // Title
            'Edit this description - will be replaced by HTML template', // Description
            '1',                            // Quantity
            '19.99',                        // BuyItNowPrice
            '3000',                         // ConditionID
            'Japan',                        // Location
            'Standard Payment',             // PaymentProfile
            '30 Days Return',               // ReturnProfile
            'Standard Shipping',            // ShippingProfile
            'https://example.com/image.jpg', // PictureURL
            '',                             // UPC
            'Edit Brand',                   // Brand
            'Used',                         // ConditionDescription
            '0',                            // SiteID
            '100-0001',                     // PostalCode
            'USD',                          // Currency
            'FixedPriceItem',              // Format
            'GTC',                          // Duration
            'JP',                           // Country
            'https://example.com/source',   // SourceURL
            '3000',                         // OriginalPriceJPY
            '0.0067',                       // ConversionRate
            date('Y-m-d H:i:s'),           // ProcessedAt
            
            // 🆕 新規項目のサンプル
            'SKU-SAMPLE-001',               // ProductSKU
            '2024/01/15',                   // ReleaseDate
            'Special Edition Item',         // FreeFormat1
            'Limited Time Offer',          // FreeFormat2  
            'Authentic Japanese Import',    // FreeFormat3
            'EMS Express from Japan',       // ShippingMethod
            'Carefully inspected before shipping', // SellerNotes
            'Like new condition with original box', // ItemCondition
            'https://auctions.yahoo.co.jp/sample' // OriginalURL
        ];
    }
    
    /**
     * 商品データをCSV行に変換（拡張版）
     */
    private function convertProductToExtendedCsvRow($product) {
        return [
            'Add',
            $this->mapToEbayCategory($product['category_name'] ?? ''),
            $this->cleanTitle($product['title'] ?? ''),
            'HTML Template will replace this', // Description は後でHTMLテンプレートで置換
            '1',
            $this->convertPriceToUSD($product['current_price'] ?? 0),
            $this->mapToEbayConditionID($product['condition_name'] ?? ''),
            'Japan',
            'Standard Payment',
            '30 Days Return',
            'Standard Shipping',
            $product['picture_url'] ?? $product['gallery_url'] ?? '',
            '',
            $this->extractBrand($product['title'] ?? ''),
            $this->translateCondition($product['condition_name'] ?? ''),
            '0',
            '100-0001',
            'USD',
            'FixedPriceItem',
            'GTC',
            'JP',
            $product['source_url'] ?? '',
            $product['current_price'] ?? '',
            '0.0067',
            date('Y-m-d H:i:s'),
            
            // 🆕 新規項目（商品データから生成または空）
            $this->generateSKU($product),
            $this->extractReleaseDate($product),
            $this->generateFreeFormat1($product),
            $this->generateFreeFormat2($product),
            $this->generateFreeFormat3($product),
            $this->generateShippingMethod($product),
            $this->generateSellerNotes($product),
            $this->generateDetailedCondition($product),
            $product['source_url'] ?? ''
        ];
    }
    
    /**
     * 新規項目生成メソッド群
     */
    private function generateSKU($product) {
        $itemId = $product['item_id'] ?? uniqid();
        return 'JP-' . strtoupper(substr($itemId, 0, 8));
    }
    
    private function extractReleaseDate($product) {
        // タイトルから日付を抽出を試行、失敗時は空
        $title = $product['title'] ?? '';
        if (preg_match('/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/', $title, $matches)) {
            return sprintf('%04d/%02d/%02d', $matches[1], $matches[2], $matches[3]);
        }
        return ''; // 空の場合はユーザーが手動入力
    }
    
    private function generateFreeFormat1($product) {
        $category = $product['category_name'] ?? '';
        if (!empty($category)) {
            return 'Category: ' . $category;
        }
        return 'Authentic Japanese Item';
    }
    
    private function generateFreeFormat2($product) {
        $watchCount = $product['watch_count'] ?? 0;
        if ($watchCount > 0) {
            return 'Popular item - ' . $watchCount . ' watchers';
        }
        return 'Fast shipping from Japan';
    }
    
    private function generateFreeFormat3($product) {
        return 'Carefully packaged with tracking';
    }
    
    private function generateShippingMethod($product) {
        $price = floatval($product['current_price'] ?? 0);
        if ($price > 10000) { // 1万円以上
            return 'EMS Express (3-5 days)';
        } elseif ($price > 5000) { // 5千円以上
            return 'EMS Standard (5-7 days)';
        } else {
            return 'Japan Post (7-14 days)';
        }
    }
    
    private function generateSellerNotes($product) {
        return 'Professional Japanese seller since 2015. All items carefully inspected.';
    }
    
    private function generateDetailedCondition($product) {
        $condition = $product['condition_name'] ?? '';
        $conditionMap = [
            '新品' => 'Brand new in original packaging',
            '未使用' => 'New without tags, never used',
            '中古' => 'Pre-owned in good condition',
            'ジャンク' => 'For parts or repair only'
        ];
        
        foreach ($conditionMap as $jp => $en) {
            if (strpos($condition, $jp) !== false) {
                return $en;
            }
        }
        
        return 'Good condition, minor signs of use';
    }
    
    /**
     * 配列をCSV行に変換（エスケープ処理付き）
     */
    private function arrayToCsvRow($array) {
        $escapedRow = array_map(function($field) {
            if ($field === null) return '';
            
            $field = (string)$field;
            $field = str_replace('�', '', $field); // 文字化け除去
            
            if (strpos($field, ',') !== false || 
                strpos($field, '"') !== false || 
                strpos($field, "\n") !== false) {
                return '"' . str_replace('"', '""', $field) . '"';
            }
            
            return $field;
        }, $array);
        
        return implode(',', $escapedRow);
    }
    
    // 既存メソッド群（簡略版）
    private function getProductDataForCSV($data) {
        if (!empty($data)) return $data;
        
        $sql = "SELECT * FROM mystical_japan_treasures_inventory WHERE title IS NOT NULL LIMIT 10";
        $stmt = $this->pdo->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function cleanTitle($title) {
        if (empty($title)) return 'Japanese Item';
        
        $cleaned = str_replace('�', '', $title);
        $cleaned = preg_replace('/[【】\[\]「」()（）]/', '', $cleaned);
        $cleaned = trim(preg_replace('/\s+/', ' ', $cleaned));
        
        if (mb_strlen($cleaned) > 80) {
            $cleaned = mb_substr($cleaned, 0, 77) . '...';
        }
        
        return $cleaned;
    }
    
    private function convertPriceToUSD($priceJPY) {
        $usdPrice = $priceJPY * 0.0067;
        if ($usdPrice < 0.99) $usdPrice = 0.99;
        return number_format($usdPrice * 1.3, 2);
    }
    
    private function mapToEbayCategory($category) {
        $map = ['エレクトロニクス' => '293', 'CD' => '11233', 'DVD' => '11232'];
        
        foreach ($map as $jp => $id) {
            if (strpos($category, $jp) !== false) return $id;
        }
        
        return '293';
    }
    
    private function mapToEbayConditionID($condition) {
        $map = ['新品' => '1000', '中古' => '3000', 'ジャンク' => '7000'];
        
        foreach ($map as $jp => $id) {
            if (strpos($condition, $jp) !== false) return $id;
        }
        
        return '3000';
    }
    
    private function translateCondition($condition) {
        $map = ['新品' => 'Brand New', '中古' => 'Used', 'ジャンク' => 'For parts'];
        
        foreach ($map as $jp => $en) {
            if (strpos($condition, $jp) !== false) return $en;
        }
        
        return 'Used';
    }
    
    private function extractBrand($title) {
        $brands = ['Apple', 'Sony', 'Nintendo', 'Canon', 'ANISON'];
        
        foreach ($brands as $brand) {
            if (stripos($title, $brand) !== false) return $brand;
        }
        
        return '';
    }
}

// グローバル関数
function exportExtendedEbayCSV($data = [], $type = 'template') {
    $handler = new ExtendedCSVExportHandler();
    return $handler->exportExtendedEbayCSV($data, $type);
}

function getExtendedEbayCsvHeaders() {
    $handler = new ExtendedCSVExportHandler();
    return $handler->getExtendedEbayCsvHeaders();
}
?>
