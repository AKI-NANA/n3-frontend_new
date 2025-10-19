<?php
/**
 * eBay出品CSV完全版ハンドラー（整理済み）
 * SKU自動生成 + 必要最小限のHTML差し込み項目
 */

require_once __DIR__ . '/database_query_handler.php';

class OptimizedEbayCsvHandler {
    
    private $pdo;
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
    }
    
    /**
     * eBay出品CSV完全ヘッダー（SKU含む・整理済み）
     */
    public function getOptimizedEbayCsvHeaders() {
        return [
            // eBay必須項目
            'Action',
            'SKU',              // ✅ SKU必須（自動生成）
            'Category',
            'Title', 
            'Description',      // HTMLテンプレート適用対象
            'Quantity',
            'BuyItNowPrice',
            'ConditionID',
            'ConditionDescription',
            'Location',
            'Country',
            'Currency',
            'Format',
            'Duration',
            'PaymentProfile',
            'ReturnProfile', 
            'ShippingProfile',
            'PictureURL',
            
            // 商品識別情報
            'UPC',
            'EAN', 
            'Brand',
            'MPN',
            
            // HTMLテンプレート差し込み用項目（最小限）
            'ReleaseDate',      // {{RELEASE_DATE}} 用
            'FreeFormat1',      // {{FREE_FORMAT_1}} 用  
            'FreeFormat2',      // {{FREE_FORMAT_2}} 用
            'FreeFormat3',      // {{FREE_FORMAT_3}} 用
            
            // システム管理項目
            'SourceURL',
            'OriginalPriceJPY',
            'ProcessedAt'
        ];
    }
    
    /**
     * 最適化されたCSV生成
     */
    public function generateOptimizedEbayCSV($productData = [], $type = 'template') {
        try {
            $headers = $this->getOptimizedEbayCsvHeaders();
            $csvContent = implode(',', $headers) . "\n";
            
            if ($type === 'template') {
                // テンプレート用（ユーザー入力用）
                $sampleRow = $this->generateTemplateRow();
                $csvContent .= $this->arrayToCsvRow($sampleRow) . "\n";
                
                return [
                    'success' => true,
                    'csv_content' => $csvContent,
                    'filename' => 'ebay_template_optimized_' . date('Ymd_His') . '.csv',
                    'type' => 'template'
                ];
            } else {
                // 実データ処理
                foreach ($productData as $product) {
                    $row = $this->convertProductToOptimizedRow($product);
                    $csvContent .= $this->arrayToCsvRow($row) . "\n";
                }
                
                return [
                    'success' => true,
                    'csv_content' => $csvContent,
                    'filename' => 'ebay_listing_optimized_' . date('Ymd_His') . '.csv',
                    'type' => 'data',
                    'count' => count($productData)
                ];
            }
            
        } catch (Exception $e) {
            error_log("最適化CSV生成エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'CSV生成エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * テンプレート行生成（ユーザー入力用）
     */
    private function generateTemplateRow() {
        return [
            'Add',                                    // Action
            'AUTO_GENERATED',                         // SKU（自動生成される旨表示）
            '293',                                    // Category（編集可能）
            'Edit Product Title Here',                // Title（編集必須）
            'HTML_TEMPLATE_WILL_BE_APPLIED',          // Description（HTMLで置換）
            '1',                                      // Quantity
            '19.99',                                  // BuyItNowPrice（編集必須）
            '3000',                                   // ConditionID
            'Used',                                   // ConditionDescription  
            'Japan',                                  // Location
            'JP',                                     // Country
            'USD',                                    // Currency
            'FixedPriceItem',                         // Format
            'GTC',                                    // Duration
            'PayPal Immediate Payment',               // PaymentProfile
            'Returns Accepted',                       // ReturnProfile
            'Fast and Free',                          // ShippingProfile
            'https://example.com/image.jpg',          // PictureURL（編集推奨）
            
            '',                                       // UPC（任意）
            '',                                       // EAN（任意）
            'Edit Brand',                             // Brand（編集推奨）
            '',                                       // MPN（任意）
            
            // HTMLテンプレート差し込み項目（編集推奨）
            '2024/01/15',                             // ReleaseDate
            'Edit Free Format 1',                     // FreeFormat1
            'Edit Free Format 2',                     // FreeFormat2  
            'Edit Free Format 3',                     // FreeFormat3
            
            'https://example.com/source',             // SourceURL
            '3000',                                   // OriginalPriceJPY
            date('Y-m-d H:i:s')                      // ProcessedAt
        ];
    }
    
    /**
     * 商品データを最適化CSV行に変換
     */
    private function convertProductToOptimizedRow($product) {
        return [
            'Add',                                             // Action
            $this->generateUniqueSKU($product),                // ✅ SKU自動生成
            $this->mapToEbayCategory($product['category_name'] ?? ''), // Category
            $this->cleanTitle($product['title'] ?? ''),       // Title
            'HTML_TEMPLATE_APPLIED',                           // Description（後でHTML置換）
            '1',                                               // Quantity
            $this->convertPriceToUSD($product['current_price'] ?? 0), // BuyItNowPrice
            $this->mapToEbayConditionID($product['condition_name'] ?? ''), // ConditionID
            $this->translateCondition($product['condition_name'] ?? ''), // ConditionDescription
            'Japan',                                           // Location
            'JP',                                              // Country
            'USD',                                             // Currency
            'FixedPriceItem',                                  // Format
            'GTC',                                             // Duration
            'PayPal Immediate Payment',                        // PaymentProfile
            'Returns Accepted',                                // ReturnProfile
            'Fast and Free',                                   // ShippingProfile
            $product['picture_url'] ?? $product['gallery_url'] ?? '', // PictureURL
            
            '',                                                // UPC
            '',                                                // EAN
            $this->extractBrand($product['title'] ?? ''),     // Brand
            '',                                                // MPN
            
            // HTML差し込み用項目（商品データから生成）
            $this->extractReleaseDate($product),              // ReleaseDate
            $this->generateFreeFormat1($product),             // FreeFormat1
            $this->generateFreeFormat2($product),             // FreeFormat2
            $this->generateFreeFormat3($product),             // FreeFormat3
            
            $product['source_url'] ?? '',                      // SourceURL
            $product['current_price'] ?? '',                   // OriginalPriceJPY
            date('Y-m-d H:i:s')                               // ProcessedAt
        ];
    }
    
    /**
     * ✅ 一意のSKU自動生成
     */
    private function generateUniqueSKU($product) {
        $prefix = 'JP';  // Japan prefix
        $itemId = $product['item_id'] ?? uniqid();
        $timestamp = substr(time(), -6); // 最後の6桁
        
        // 重複回避のためランダム要素追加
        $random = strtoupper(substr(md5($itemId), 0, 4));
        
        return $prefix . '-' . $timestamp . '-' . $random;
    }
    
    /**
     * HTML差し込み項目生成（最小限）
     */
    private function extractReleaseDate($product) {
        $title = $product['title'] ?? '';
        
        // 日付パターン抽出
        if (preg_match('/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/', $title, $matches)) {
            return sprintf('%04d/%02d/%02d', $matches[1], $matches[2], $matches[3]);
        }
        
        return ''; // 空の場合はユーザーが手動入力
    }
    
    private function generateFreeFormat1($product) {
        $category = $product['category_name'] ?? '';
        return !empty($category) ? $category : 'Authentic Japanese Item';
    }
    
    private function generateFreeFormat2($product) {
        $watchCount = $product['watch_count'] ?? 0;
        return $watchCount > 0 ? "Popular item - {$watchCount} watchers" : 'Fast shipping from Japan';
    }
    
    private function generateFreeFormat3($product) {
        return 'Carefully packaged with tracking number';
    }
    
    /**
     * HTMLテンプレートとCSVデータの統合処理
     */
    public function integrateHTMLTemplateWithCSV($csvData, $templateId = null) {
        try {
            // HTMLテンプレート取得
            if ($templateId && function_exists('getHTMLTemplate')) {
                $templateResult = getHTMLTemplate($templateId);
                $htmlTemplate = $templateResult['template']['html_content'] ?? '';
            } else {
                $htmlTemplate = $this->getDefaultTemplate();
            }
            
            $processedData = [];
            
            foreach ($csvData as $row) {
                // HTML差し込み処理
                $finalHTML = $this->applyHTMLTemplate($htmlTemplate, $row);
                
                // DescriptionをHTMLで置換
                $row['Description'] = $finalHTML;
                
                $processedData[] = $row;
            }
            
            return [
                'success' => true,
                'processed_data' => $processedData,
                'template_applied' => !empty($htmlTemplate)
            ];
            
        } catch (Exception $e) {
            error_log("HTML統合処理エラー: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'HTML統合エラー: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * HTMLテンプレート適用
     */
    private function applyHTMLTemplate($template, $rowData) {
        // 基本的な差し込み処理
        $replacements = [
            '{{TITLE}}'        => $rowData['Title'] ?? '',
            '{{CONDITION}}'    => $rowData['ConditionDescription'] ?? '',
            '{{BRAND}}'        => $rowData['Brand'] ?? '',
            '{{RELEASE_DATE}}' => $rowData['ReleaseDate'] ?? '',
            '{{FREE_FORMAT_1}}'=> $rowData['FreeFormat1'] ?? '',
            '{{FREE_FORMAT_2}}'=> $rowData['FreeFormat2'] ?? '',
            '{{FREE_FORMAT_3}}'=> $rowData['FreeFormat3'] ?? '',
            '{{PRICE}}'        => '$' . ($rowData['BuyItNowPrice'] ?? '0.00'),
            '{{MAIN_IMAGE}}'   => $rowData['PictureURL'] ?? '',
            '{{CURRENT_DATE}}' => date('Y-m-d'),
            '{{SELLER_INFO}}'  => 'Professional Japanese seller since 2015'
        ];
        
        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }
    
    /**
     * デフォルトHTMLテンプレート
     */
    private function getDefaultTemplate() {
        return '
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #2c5aa0;">{{TITLE}}</h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3>📋 Product Details</h3>
                <div><strong>Condition:</strong> {{CONDITION}}</div>
                <div><strong>Brand:</strong> {{BRAND}}</div>
                <div><strong>Release Date:</strong> {{RELEASE_DATE}}</div>
            </div>
            
            <div style="margin: 15px 0;">
                <div><strong>Note - Pre-Order (P/O):</strong></div>
                <div style="font-size: 14px; color: #666;">
                    If title has "Pre-Order", we will ship out as soon as released. We want all buyers to understand there is possibility that the manufacturer will change contents, date and quantity for sale.
                </div>
            </div>
            
            <div style="margin: 10px 0;">{{FREE_FORMAT_1}}</div>
            <div style="margin: 10px 0;">{{FREE_FORMAT_2}}</div>
            <div style="margin: 10px 0;">{{FREE_FORMAT_3}}</div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4 style="color: #1976d2;">🚚 Shipping Method & Tracking</h4>
                <p style="color: #d32f2f; font-weight: bold;">Fast shipping from Japan with tracking number</p>
                <p>We carefully package all items and provide tracking information for your peace of mind.</p>
            </div>
        </div>';
    }
    
    // ユーティリティメソッド群
    private function arrayToCsvRow($array) {
        return implode(',', array_map(function($field) {
            $field = (string)($field ?? '');
            if (strpos($field, ',') !== false || strpos($field, '"') !== false) {
                return '"' . str_replace('"', '""', $field) . '"';
            }
            return $field;
        }, $array));
    }
    
    private function cleanTitle($title) {
        if (empty($title)) return 'Japanese Item';
        $cleaned = preg_replace('/[【】\[\]「」()（）]/', '', $title);
        return mb_substr(trim($cleaned), 0, 80);
    }
    
    private function convertPriceToUSD($priceJPY) {
        $usdPrice = $priceJPY * 0.0067 * 1.3; // 為替 + 利益マージン
        return number_format(max(0.99, $usdPrice), 2);
    }
    
    private function mapToEbayCategory($category) {
        $map = ['エレクトロニクス' => '293', 'CD' => '11233'];
        foreach ($map as $jp => $id) {
            if (strpos($category, $jp) !== false) return $id;
        }
        return '293';
    }
    
    private function mapToEbayConditionID($condition) {
        $map = ['新品' => '1000', '中古' => '3000'];
        foreach ($map as $jp => $id) {
            if (strpos($condition, $jp) !== false) return $id;
        }
        return '3000';
    }
    
    private function translateCondition($condition) {
        $map = ['新品' => 'Brand New', '中古' => 'Used'];
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
function generateOptimizedEbayCSV($data = [], $type = 'template') {
    $handler = new OptimizedEbayCsvHandler();
    return $handler->generateOptimizedEbayCSV($data, $type);
}

function integrateHTMLWithCSV($csvData, $templateId = null) {
    $handler = new OptimizedEbayCsvHandler();
    return $handler->integrateHTMLTemplateWithCSV($csvData, $templateId);
}
?>
