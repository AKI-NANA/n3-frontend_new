<?php
/**
 * Item Specifics生成器 - new_structure対応版
 * Maru9形式対応・エラーハンドリング強化
 */

class ItemSpecificsGenerator {
    private $pdo;
    
    public function __construct($dbConnection) {
        $this->pdo = $dbConnection;
    }
    
    /**
     * カテゴリーIDから必須項目を取得
     * @param string $categoryId
     * @return array [['field_name' => '', 'default_value' => '', 'field_type' => ''], ...]
     */
    public function getRequiredFields($categoryId) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT field_name, field_type, possible_values, default_value, sort_order 
                FROM category_required_fields 
                WHERE category_id = ? 
                ORDER BY sort_order ASC
            ");
            $stmt->execute([$categoryId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("ItemSpecificsGenerator Error: " . $e->getMessage());
            return $this->getDefaultFields();
        }
    }
    
    /**
     * Maru9形式文字列生成（高機能版）
     * @param string $categoryId
     * @param array $customValues （オプション）
     * @param array $productData （オプション：自動推定用）
     * @return string "Brand=Unknown■Color=Black■Condition=Used"
     */
    public function generateItemSpecificsString($categoryId, $customValues = [], $productData = []) {
        try {
            $fields = $this->getRequiredFields($categoryId);
            
            if (empty($fields)) {
                return $this->getDefaultItemSpecifics();
            }
            
            $itemSpecifics = [];

            foreach ($fields as $field) {
                $fieldName = $field['field_name'];
                
                // 1. カスタム値があれば優先使用
                if (isset($customValues[$fieldName])) {
                    $value = $customValues[$fieldName];
                } 
                // 2. 商品データから自動推定
                elseif (!empty($productData)) {
                    $value = $this->inferFieldValue($fieldName, $productData, $field);
                }
                // 3. デフォルト値使用
                else {
                    $value = $field['default_value'];
                }
                
                // 4. 値の検証・サニタイゼーション
                $value = $this->sanitizeValue($value, $field);
                
                $itemSpecifics[] = sprintf("%s=%s", $fieldName, $value);
            }

            return implode('■', $itemSpecifics);
            
        } catch (Exception $e) {
            error_log("generateItemSpecificsString Error: " . $e->getMessage());
            return $this->getDefaultItemSpecifics();
        }
    }
    
    /**
     * 商品データから項目値を自動推定
     */
    private function inferFieldValue($fieldName, $productData, $field) {
        $title = strtolower($productData['title'] ?? '');
        $description = strtolower($productData['description'] ?? '');
        $text = $title . ' ' . $description;
        
        switch (strtolower($fieldName)) {
            case 'brand':
                return $this->detectBrand($text, $field['possible_values'] ?? []);
                
            case 'color':
                return $this->detectColor($text, $field['possible_values'] ?? []);
                
            case 'condition':
                return $this->detectCondition($text, $field['possible_values'] ?? []);
                
            case 'model':
                return $this->detectModel($text, $productData);
                
            case 'storage capacity':
                return $this->detectStorageCapacity($text);
                
            default:
                return $field['default_value'];
        }
    }
    
    /**
     * ブランド検出
     */
    private function detectBrand($text, $possibleValues) {
        $brandKeywords = [
            'Apple' => ['apple', 'iphone', 'ipad', 'macbook', 'imac'],
            'Samsung' => ['samsung', 'galaxy', 'note'],
            'Canon' => ['canon', 'eos'],
            'Nikon' => ['nikon'],
            'Sony' => ['sony', 'playstation', 'ps4', 'ps5'],
            'Nintendo' => ['nintendo', 'switch', 'マリオ'],
            'Google' => ['google', 'pixel'],
            'Microsoft' => ['microsoft', 'xbox', 'surface']
        ];
        
        foreach ($brandKeywords as $brand => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    // possible_valuesに含まれているかチェック
                    if (empty($possibleValues) || in_array($brand, $possibleValues)) {
                        return $brand;
                    }
                }
            }
        }
        
        return 'Unknown';
    }
    
    /**
     * 色検出
     */
    private function detectColor($text, $possibleValues) {
        $colorKeywords = [
            'Black' => ['black', '黒', 'ブラック'],
            'White' => ['white', '白', 'ホワイト'],
            'Blue' => ['blue', '青', 'ブルー'],
            'Red' => ['red', '赤', 'レッド'],
            'Gold' => ['gold', 'ゴールド', '金'],
            'Silver' => ['silver', 'シルバー', '銀'],
            'Gray' => ['gray', 'grey', 'グレー', '灰色'],
            'Pink' => ['pink', 'ピンク'],
            'Green' => ['green', 'グリーン', '緑']
        ];
        
        foreach ($colorKeywords as $color => $keywords) {
            foreach ($keywords as $keyword) {
                if (strpos($text, $keyword) !== false) {
                    if (empty($possibleValues) || in_array($color, $possibleValues)) {
                        return $color;
                    }
                }
            }
        }
        
        return 'Unknown';
    }
    
    /**
     * 状態検出
     */
    private function detectCondition($text, $possibleValues) {
        if (strpos($text, '新品') !== false || strpos($text, 'new') !== false || strpos($text, '未開封') !== false) {
            return 'New';
        } elseif (strpos($text, '美品') !== false || strpos($text, 'mint') !== false) {
            return 'Like New';
        } elseif (strpos($text, 'ジャンク') !== false || strpos($text, 'parts') !== false || strpos($text, 'not working') !== false) {
            return 'For parts or not working';
        }
        
        return 'Used';
    }
    
    /**
     * モデル検出
     */
    private function detectModel($text, $productData) {
        $title = $productData['title'] ?? '';
        
        // iPhone系
        if (preg_match('/iphone\s*(\d+|se|x|xs|xr|pro|max)/i', $title, $matches)) {
            return 'iPhone ' . trim($matches[1]);
        }
        
        // その他のモデル番号パターン
        if (preg_match('/([A-Z]+[\d\-]+[A-Z]*)/i', $title, $matches)) {
            return $matches[1];
        }
        
        return 'Unknown';
    }
    
    /**
     * ストレージ容量検出
     */
    private function detectStorageCapacity($text) {
        if (preg_match('/(\d+)\s*(gb|tb)/i', $text, $matches)) {
            $capacity = $matches[1];
            $unit = strtoupper($matches[2]);
            return $capacity . ' ' . $unit;
        }
        
        return 'Unknown';
    }
    
    /**
     * 値のサニタイゼーション
     */
    private function sanitizeValue($value, $field) {
        // 無効な文字を削除
        $value = preg_replace('/[■=\n\r\t]/', '', $value);
        
        // 長すぎる値は短縮
        if (mb_strlen($value) > 50) {
            $value = mb_substr($value, 0, 50);
        }
        
        // 空の場合はデフォルト値
        if (empty(trim($value))) {
            return $field['default_value'] ?? 'Unknown';
        }
        
        return trim($value);
    }
    
    /**
     * Maru9形式文字列をパース
     * @param string $itemSpecificsString
     * @return array ['Brand' => 'Apple', 'Color' => 'Black', ...]
     */
    public function parseItemSpecificsString($itemSpecificsString) {
        $parsedData = [];
        
        if (empty($itemSpecificsString)) {
            return $parsedData;
        }
        
        $pairs = explode('■', $itemSpecificsString);
        foreach ($pairs as $pair) {
            $parts = explode('=', $pair, 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $value = trim($parts[1]);
                if (!empty($key) && !empty($value)) {
                    $parsedData[$key] = $value;
                }
            }
        }
        
        return $parsedData;
    }
    
    /**
     * フィールド値の妥当性検証
     */
    public function validateItemSpecifics($categoryId, $itemSpecificsString) {
        $requiredFields = $this->getRequiredFields($categoryId);
        $parsedData = $this->parseItemSpecificsString($itemSpecificsString);
        
        $validationErrors = [];
        
        foreach ($requiredFields as $field) {
            $fieldName = $field['field_name'];
            
            if ($field['field_type'] === 'required' && !isset($parsedData[$fieldName])) {
                $validationErrors[] = "必須フィールド '{$fieldName}' が不足しています。";
            }
            
            if (isset($parsedData[$fieldName])) {
                $value = $parsedData[$fieldName];
                
                // 選択肢制限チェック
                if (!empty($field['possible_values'])) {
                    if (!in_array($value, $field['possible_values'])) {
                        $validationErrors[] = "フィールド '{$fieldName}' の値 '{$value}' は許可された選択肢に含まれていません。";
                    }
                }
            }
        }
        
        return [
            'is_valid' => empty($validationErrors),
            'errors' => $validationErrors
        ];
    }
    
    /**
     * デフォルトフィールド設定
     */
    private function getDefaultFields() {
        return [
            ['field_name' => 'Brand', 'field_type' => 'required', 'default_value' => 'Unknown', 'sort_order' => 1],
            ['field_name' => 'Condition', 'field_type' => 'required', 'default_value' => 'Used', 'sort_order' => 2],
            ['field_name' => 'Model', 'field_type' => 'recommended', 'default_value' => 'Unknown', 'sort_order' => 3]
        ];
    }
    
    /**
     * デフォルトItem Specifics
     */
    private function getDefaultItemSpecifics() {
        return 'Brand=Unknown■Condition=Used■Model=Unknown';
    }
    
    /**
     * カテゴリー別統計情報
     */
    public function getFieldStatistics($categoryId) {
        try {
            $sql = "
                SELECT 
                    field_name,
                    field_type,
                    COUNT(*) OVER() as total_fields,
                    ROW_NUMBER() OVER(ORDER BY sort_order) as field_order
                FROM category_required_fields 
                WHERE category_id = ?
                ORDER BY sort_order
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$categoryId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            error_log("getFieldStatistics Error: " . $e->getMessage());
            return [];
        }
    }
}
?>