<?php
// modules/ebay_category_system/backend/ItemSpecificsGenerator.php

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
        $stmt = $this->pdo->prepare("SELECT * FROM category_required_fields WHERE category_id = ? ORDER BY sort_order ASC");
        $stmt->execute([$categoryId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * Maru9形式文字列生成
     * @param string $categoryId
     * @param array $customValues （オプション）
     * @return string "Brand=Unknown■Color=Black■Condition=Used"
     */
    public function generateItemSpecificsString($categoryId, $customValues = []) {
        $fields = $this->getRequiredFields($categoryId);
        $itemSpecifics = [];

        foreach ($fields as $field) {
            $fieldName = $field['field_name'];
            $value = $customValues[$fieldName] ?? $field['default_value'];
            $itemSpecifics[] = sprintf("%s=%s", $fieldName, $value);
        }

        return implode('■', $itemSpecifics);
    }
    
    /**
     * Maru9形式文字列をパース
     * @param string $itemSpecificsString
     * @return array ['Brand' => 'Apple', 'Color' => 'Black', ...]
     */
    public function parseItemSpecificsString($itemSpecificsString) {
        $parsedData = [];
        $pairs = explode('■', $itemSpecificsString);
        foreach ($pairs as $pair) {
            $parts = explode('=', $pair, 2);
            if (count($parts) === 2) {
                $parsedData[$parts[0]] = $parts[1];
            }
        }
        return $parsedData;
    }
}