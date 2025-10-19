<?php
/**
 * HTMLテンプレートプロセッサー - CSV統合システム
 * 作成日: 2025-09-13
 * 機能: HTMLテンプレートとCSVデータの統合・出品支援
 */

class HTMLTemplateProcessor {
    private $pdo;
    private $templates = [];
    private $errors = [];
    
    public function __construct() {
        $this->pdo = getDatabaseConnection();
        $this->loadTemplates();
    }
    
    /**
     * 保存済みHTMLテンプレート取得
     */
    public function getTemplates($category = null, $active_only = true) {
        try {
            $sql = "SELECT * FROM product_html_templates WHERE 1=1";
            $params = [];
            
            if ($active_only) {
                $sql .= " AND is_active = TRUE";
            }
            
            if ($category) {
                $sql .= " AND category = ?";
                $params[] = $category;
            }
            
            $sql .= " ORDER BY usage_count DESC, created_at DESC";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->errors[] = "テンプレート取得エラー: " . $e->getMessage();
            return [];
        }
    }
    
    /**
     * HTMLテンプレート保存
     */
    public function saveTemplate($templateData) {
        try {
            $sql = "INSERT INTO product_html_templates (
                template_name, category, display_name, description, 
                html_content, css_styles, javascript_code, 
                placeholder_fields, sample_data, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (template_name) 
            DO UPDATE SET
                category = EXCLUDED.category,
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                html_content = EXCLUDED.html_content,
                css_styles = EXCLUDED.css_styles,
                javascript_code = EXCLUDED.javascript_code,
                placeholder_fields = EXCLUDED.placeholder_fields,
                sample_data = EXCLUDED.sample_data,
                updated_at = NOW()
            RETURNING template_id";
            
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                $templateData['template_name'],
                $templateData['category'] ?? 'general',
                $templateData['display_name'] ?? $templateData['template_name'],
                $templateData['description'] ?? '',
                $templateData['html_content'],
                $templateData['css_styles'] ?? '',
                $templateData['javascript_code'] ?? '',
                json_encode($templateData['placeholder_fields'] ?? []),
                json_encode($templateData['sample_data'] ?? []),
                $templateData['created_by'] ?? 'user'
            ]);
            
            if ($result) {
                $templateId = $stmt->fetchColumn();
                return [
                    'success' => true,
                    'template_id' => $templateId,
                    'message' => 'テンプレートを保存しました'
                ];
            }
            
            return [
                'success' => false,
                'error' => 'テンプレート保存に失敗しました'
            ];
            
        } catch (Exception $e) {
            $this->errors[] = "テンプレート保存エラー: " . $e->getMessage();
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 🎯 メイン機能: CSVデータとHTMLテンプレートを統合
     */
    public function processCSVWithTemplate($csvData, $templateId, $options = []) {
        try {
            // テンプレート取得
            $template = $this->getTemplateById($templateId);
            if (!$template) {
                throw new Exception("テンプレートID {$templateId} が見つかりません");
            }
            
            $processedItems = [];
            $successCount = 0;
            $errorCount = 0;
            
            foreach ($csvData as $index => $item) {
                try {
                    // HTML説明文を生成
                    $htmlDescription = $this->mergeTemplateWithData($template, $item);
                    
                    // CSVアイテムにHTML説明文を統合
                    $processedItem = $item;
                    $processedItem['Description'] = $htmlDescription;
                    
                    // 追加データ処理
                    if (isset($options['enhance_data']) && $options['enhance_data']) {
                        $processedItem = $this->enhanceItemData($processedItem);
                    }
                    
                    $processedItems[] = [
                        'index' => $index,
                        'original' => $item,
                        'processed' => $processedItem,
                        'success' => true
                    ];
                    
                    $successCount++;
                    
                } catch (Exception $e) {
                    $processedItems[] = [
                        'index' => $index,
                        'original' => $item,
                        'error' => $e->getMessage(),
                        'success' => false
                    ];
                    $errorCount++;
                }
            }
            
            // 統計記録
            $this->recordTemplateUsage($templateId, $options['csv_filename'] ?? 'unknown', count($csvData), $successCount > 0);
            
            return [
                'success' => $errorCount < count($csvData),
                'total_items' => count($csvData),
                'success_count' => $successCount,
                'error_count' => $errorCount,
                'processed_items' => $processedItems,
                'template_used' => $template,
                'message' => "処理完了: 成功 {$successCount}件、失敗 {$errorCount}件"
            ];
            
        } catch (Exception $e) {
            $this->errors[] = "CSV処理エラー: " . $e->getMessage();
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'processed_items' => []
            ];
        }
    }
    
    /**
     * テンプレートとデータのマージ
     */
    private function mergeTemplateWithData($template, $itemData) {
        $html = $template['html_content'];
        $css = $template['css_styles'] ?? '';
        
        // プレースホルダー置換
        $placeholders = json_decode($template['placeholder_fields'], true) ?? [];
        
        foreach ($placeholders as $placeholder) {
            $key = $this->placeholderToKey($placeholder);
            $value = $this->getDataValue($itemData, $key);
            
            // 特殊処理
            $value = $this->processSpecialPlaceholder($placeholder, $value, $itemData);
            
            $html = str_replace($placeholder, $value, $html);
        }
        
        // CSS統合
        if (!empty($css)) {
            $html .= "\n<style>\n" . $css . "\n</style>";
        }
        
        return $html;
    }
    
    /**
     * プレースホルダーをデータキーに変換
     */
    private function placeholderToKey($placeholder) {
        // {{TITLE}} -> Title, {{MAIN_IMAGE}} -> PictureURL etc.
        $key = str_replace(['{{', '}}'], '', $placeholder);
        
        $keyMappings = [
            'TITLE' => 'Title',
            'PRICE' => 'BuyItNowPrice',
            'CONDITION' => 'ConditionDescription',
            'BRAND' => 'Brand',
            'DESCRIPTION' => 'Description',
            'MAIN_IMAGE' => 'PictureURL',
            'ADDITIONAL_IMAGES' => 'PictureURL',
            'UPC' => 'UPC',
            'CATEGORY' => 'Category',
            'CURRENCY' => 'Currency',
            'LOCATION' => 'Location'
        ];
        
        return $keyMappings[$key] ?? $key;
    }
    
    /**
     * データから値取得
     */
    private function getDataValue($itemData, $key) {
        if (isset($itemData[$key])) {
            return $itemData[$key];
        }
        
        // 代替キーでの検索
        $alternativeKeys = [
            'Title' => ['title', 'name', 'product_name'],
            'BuyItNowPrice' => ['price', 'selling_price', 'current_price'],
            'Brand' => ['brand', 'manufacturer'],
            'Description' => ['description', 'details']
        ];
        
        if (isset($alternativeKeys[$key])) {
            foreach ($alternativeKeys[$key] as $altKey) {
                if (isset($itemData[$altKey])) {
                    return $itemData[$altKey];
                }
            }
        }
        
        return '';
    }
    
    /**
     * 特殊プレースホルダー処理
     */
    private function processSpecialPlaceholder($placeholder, $value, $itemData) {
        switch ($placeholder) {
            case '{{MAIN_IMAGE}}':
                return $this->generateMainImageHTML($value);
                
            case '{{ADDITIONAL_IMAGES}}':
                return $this->generateAdditionalImagesHTML($value);
                
            case '{{SPECIFICATIONS_TABLE}}':
                return $this->generateSpecificationsTable($itemData);
                
            case '{{PRICE}}':
                return $this->formatPrice($value, $itemData['Currency'] ?? 'USD');
                
            case '{{CONDITION}}':
                return $this->formatCondition($itemData['ConditionID'] ?? '', $value);
                
            case '{{SHIPPING_INFO}}':
                return $this->generateShippingInfo($itemData);
                
            case '{{WARRANTY_INFO}}':
                return $this->generateWarrantyInfo($itemData);
                
            case '{{SELLER_INFO}}':
                return $this->generateSellerInfo();
                
            default:
                return htmlspecialchars($value);
        }
    }
    
    /**
     * メイン画像HTML生成
     */
    private function generateMainImageHTML($imageUrl) {
        if (empty($imageUrl)) {
            return '<div class="no-image">画像なし</div>';
        }
        
        // 複数URL対応（|区切り）
        $urls = explode('|', $imageUrl);
        $mainUrl = trim($urls[0]);
        
        if (filter_var($mainUrl, FILTER_VALIDATE_URL)) {
            return sprintf(
                '<img src="%s" alt="商品画像" style="width: 100%%; max-width: 500px; height: auto; border-radius: 8px;">',
                htmlspecialchars($mainUrl)
            );
        }
        
        return '<div class="no-image">画像URLが無効です</div>';
    }
    
    /**
     * 追加画像HTML生成
     */
    private function generateAdditionalImagesHTML($imageUrl) {
        if (empty($imageUrl)) {
            return '';
        }
        
        $urls = explode('|', $imageUrl);
        array_shift($urls); // メイン画像を除外
        
        if (empty($urls)) {
            return '';
        }
        
        $html = '<div class="additional-images" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">';
        
        foreach ($urls as $url) {
            $url = trim($url);
            if (filter_var($url, FILTER_VALIDATE_URL)) {
                $html .= sprintf(
                    '<img src="%s" alt="追加画像" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">',
                    htmlspecialchars($url)
                );
            }
        }
        
        $html .= '</div>';
        return $html;
    }
    
    /**
     * 仕様表HTML生成
     */
    private function generateSpecificationsTable($itemData) {
        $specs = [];
        
        // 基本仕様項目
        $specFields = [
            'Brand' => 'ブランド',
            'UPC' => 'UPCコード',
            'ConditionID' => '状態コード',
            'Category' => 'カテゴリ',
            'Location' => '発送元'
        ];
        
        foreach ($specFields as $field => $label) {
            if (!empty($itemData[$field])) {
                $specs[] = sprintf(
                    '<tr><td style="font-weight: bold; padding: 8px; border-bottom: 1px solid #eee;">%s</td><td style="padding: 8px; border-bottom: 1px solid #eee;">%s</td></tr>',
                    $label,
                    htmlspecialchars($itemData[$field])
                );
            }
        }
        
        if (empty($specs)) {
            return '<p>仕様情報なし</p>';
        }
        
        return '<table style="width: 100%; border-collapse: collapse;">' . implode('', $specs) . '</table>';
    }
    
    /**
     * 価格フォーマット
     */
    private function formatPrice($price, $currency = 'USD') {
        if (empty($price)) {
            return '$0.00';
        }
        
        $numericPrice = floatval($price);
        
        $symbols = [
            'USD' => '$',
            'JPY' => '¥',
            'EUR' => '€',
            'GBP' => '£'
        ];
        
        $symbol = $symbols[$currency] ?? '$';
        
        if ($currency === 'JPY') {
            return $symbol . number_format($numericPrice, 0);
        } else {
            return $symbol . number_format($numericPrice, 2);
        }
    }
    
    /**
     * 状態フォーマット
     */
    private function formatCondition($conditionId, $description = '') {
        $conditions = [
            '1000' => 'New',
            '2000' => 'New with defects',
            '2500' => 'New without tags', 
            '3000' => 'Used',
            '4000' => 'Very Good',
            '5000' => 'Good',
            '6000' => 'Acceptable',
            '7000' => 'For parts or not working'
        ];
        
        $conditionText = $conditions[$conditionId] ?? 'Used';
        
        if (!empty($description)) {
            $conditionText .= ' - ' . htmlspecialchars($description);
        }
        
        return $conditionText;
    }
    
    /**
     * 配送情報生成
     */
    private function generateShippingInfo($itemData) {
        $location = $itemData['Location'] ?? 'Japan';
        $shippingProfile = $itemData['ShippingProfile'] ?? 'Standard Shipping';
        
        return sprintf(
            '<div class="shipping-info">
                <p><strong>発送元:</strong> %s</p>
                <p><strong>配送方法:</strong> %s</p>
                <p><strong>配送期間:</strong> 通常7-14営業日</p>
                <p>追跡番号付きで安全配送いたします。</p>
            </div>',
            htmlspecialchars($location),
            htmlspecialchars($shippingProfile)
        );
    }
    
    /**
     * 保証情報生成
     */
    private function generateWarrantyInfo($itemData) {
        $returnProfile = $itemData['ReturnProfile'] ?? '30 Days Return';
        
        return sprintf(
            '<div class="warranty-info">
                <p><strong>返品ポリシー:</strong> %s</p>
                <p><strong>保証:</strong> 商品に問題がある場合は迅速に対応いたします</p>
                <p>お客様満足度99.8%%の実績で安心してお買い求めください。</p>
            </div>',
            htmlspecialchars($returnProfile)
        );
    }
    
    /**
     * 販売者情報生成
     */
    private function generateSellerInfo() {
        return '
        <div class="seller-info">
            <p><strong>Mystical Japan Treasures</strong></p>
            <p>🇯🇵 日本からの正規品販売</p>
            <p>⭐ フィードバック評価: 99.8% ポジティブ</p>
            <p>📦 迅速発送・丁寧梱包をお約束</p>
            <p>💬 日本語・英語でのサポート対応</p>
        </div>';
    }
    
    /**
     * アイテムデータ拡張
     */
    private function enhanceItemData($item) {
        // 通貨が設定されていない場合のデフォルト
        if (empty($item['Currency'])) {
            $item['Currency'] = 'USD';
        }
        
        // サイトIDが設定されていない場合のデフォルト
        if (empty($item['SiteID'])) {
            $item['SiteID'] = '0'; // US
        }
        
        // 出品形式のデフォルト
        if (empty($item['Format'])) {
            $item['Format'] = 'FixedPriceItem';
        }
        
        // 出品期間のデフォルト
        if (empty($item['Duration'])) {
            $item['Duration'] = 'GTC';
        }
        
        // 発送国のデフォルト
        if (empty($item['Country'])) {
            $item['Country'] = 'JP';
        }
        
        return $item;
    }
    
    /**
     * テンプレート使用統計記録
     */
    private function recordTemplateUsage($templateId, $csvFilename, $itemCount, $success = true, $errorMessage = null) {
        try {
            $sql = "SELECT record_template_usage(?, ?, ?, ?, ?)";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$templateId, $csvFilename, $itemCount, $success, $errorMessage]);
        } catch (Exception $e) {
            error_log("テンプレート使用統計記録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * テンプレート読み込み
     */
    private function loadTemplates() {
        $templates = $this->getTemplates();
        foreach ($templates as $template) {
            $this->templates[$template['template_id']] = $template;
        }
    }
    
    /**
     * ID別テンプレート取得
     */
    private function getTemplateById($templateId) {
        if (isset($this->templates[$templateId])) {
            return $this->templates[$templateId];
        }
        
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM product_html_templates WHERE template_id = ? AND is_active = TRUE");
            $stmt->execute([$templateId]);
            $template = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($template) {
                $this->templates[$templateId] = $template;
                return $template;
            }
        } catch (Exception $e) {
            $this->errors[] = "テンプレート取得エラー: " . $e->getMessage();
        }
        
        return null;
    }
    
    /**
     * エラー取得
     */
    public function getErrors() {
        return $this->errors;
    }
    
    /**
     * テンプレート削除
     */
    public function deleteTemplate($templateId) {
        try {
            $stmt = $this->pdo->prepare("UPDATE product_html_templates SET is_active = FALSE WHERE template_id = ?");
            $result = $stmt->execute([$templateId]);
            
            return [
                'success' => $result,
                'message' => $result ? 'テンプレートを削除しました' : 'テンプレート削除に失敗しました'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getUsageStats($templateId = null) {
        try {
            if ($templateId) {
                $sql = "SELECT t.template_name, t.usage_count, COUNT(u.id) as total_uses,
                              AVG(u.item_count) as avg_items_per_use,
                              COUNT(CASE WHEN u.success THEN 1 END) as success_count
                       FROM product_html_templates t
                       LEFT JOIN html_template_usage_stats u ON t.template_id = u.template_id
                       WHERE t.template_id = ?
                       GROUP BY t.template_id, t.template_name, t.usage_count";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([$templateId]);
            } else {
                $sql = "SELECT t.template_name, t.usage_count, COUNT(u.id) as total_uses,
                              AVG(u.item_count) as avg_items_per_use,
                              COUNT(CASE WHEN u.success THEN 1 END) as success_count
                       FROM product_html_templates t
                       LEFT JOIN html_template_usage_stats u ON t.template_id = u.template_id
                       WHERE t.is_active = TRUE
                       GROUP BY t.template_id, t.template_name, t.usage_count
                       ORDER BY t.usage_count DESC";
                $stmt = $this->pdo->query($sql);
            }
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->errors[] = "統計取得エラー: " . $e->getMessage();
            return [];
        }
    }
}
?>