<?php
/**
 * データ検証クラス
 * 
 * 作成日: 2025-09-25
 * 用途: スクレイピングデータの検証・品質チェック
 * 場所: 02_scraping/common/DataValidator.php
 */

class DataValidator {
    
    private $validationRules;
    private $warnings;
    private $errors;
    
    /**
     * コンストラクタ
     */
    public function __construct() {
        $this->initializeValidationRules();
        $this->warnings = [];
        $this->errors = [];
    }
    
    /**
     * スクレイピングデータを検証
     * 
     * @param array $data スクレイピングされたデータ
     * @param string $platform プラットフォーム名
     * @return bool 検証結果
     */
    public function validate($data, $platform = null) {
        $this->clearMessages();
        
        if (!is_array($data)) {
            $this->addError('Data must be an array');
            return false;
        }
        
        // 基本フィールドの検証
        $isValid = $this->validateBasicFields($data);
        
        // プラットフォーム固有の検証
        if ($platform && isset($this->validationRules[$platform])) {
            $isValid = $this->validatePlatformSpecific($data, $platform) && $isValid;
        }
        
        // データ品質の検証
        $this->validateDataQuality($data);
        
        return $isValid && empty($this->errors);
    }
    
    /**
     * 基本フィールドの検証
     * 
     * @param array $data データ
     * @return bool 検証結果
     */
    private function validateBasicFields($data) {
        $required = ['title', 'current_price', 'url'];
        $isValid = true;
        
        // 必須フィールドチェック
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                $this->addError("Required field missing: {$field}");
                $isValid = false;
            } elseif (empty($data[$field]) && $data[$field] !== 0) {
                $this->addError("Required field empty: {$field}");
                $isValid = false;
            }
        }
        
        // データ型チェック
        if (isset($data['current_price']) && !is_numeric($data['current_price'])) {
            $this->addError('current_price must be numeric');
            $isValid = false;
        }
        
        if (isset($data['url']) && !filter_var($data['url'], FILTER_VALIDATE_URL)) {
            $this->addError('url must be valid URL');
            $isValid = false;
        }
        
        // タイトルの長さチェック
        if (isset($data['title'])) {
            $titleLength = mb_strlen($data['title']);
            if ($titleLength < 5) {
                $this->addError('Title too short (minimum 5 characters)');
                $isValid = false;
            } elseif ($titleLength > 200) {
                $this->addWarning('Title very long (over 200 characters)');
            }
        }
        
        // 価格の妥当性チェック
        if (isset($data['current_price']) && is_numeric($data['current_price'])) {
            $price = (float)$data['current_price'];
            if ($price <= 0) {
                $this->addError('Price must be greater than 0');
                $isValid = false;
            } elseif ($price > 10000000) {
                $this->addWarning('Price extremely high (over 10,000,000)');
            }
        }
        
        return $isValid;
    }
    
    /**
     * プラットフォーム固有の検証
     * 
     * @param array $data データ
     * @param string $platform プラットフォーム名
     * @return bool 検証結果
     */
    private function validatePlatformSpecific($data, $platform) {
        $rules = $this->validationRules[$platform] ?? [];
        $isValid = true;
        
        foreach ($rules as $field => $rule) {
            if (!isset($data[$field])) {
                if ($rule['required'] ?? false) {
                    $this->addError("Platform required field missing: {$field}");
                    $isValid = false;
                }
                continue;
            }
            
            $value = $data[$field];
            
            // データ型チェック
            if (isset($rule['type'])) {
                if (!$this->checkType($value, $rule['type'])) {
                    $this->addError("Field {$field} has invalid type, expected: {$rule['type']}");
                    $isValid = false;
                }
            }
            
            // 範囲チェック
            if (isset($rule['min']) && is_numeric($value) && $value < $rule['min']) {
                $this->addError("Field {$field} below minimum: {$rule['min']}");
                $isValid = false;
            }
            
            if (isset($rule['max']) && is_numeric($value) && $value > $rule['max']) {
                $this->addWarning("Field {$field} above maximum: {$rule['max']}");
            }
            
            // 正規表現チェック
            if (isset($rule['pattern']) && is_string($value)) {
                if (!preg_match($rule['pattern'], $value)) {
                    $this->addError("Field {$field} doesn't match required pattern");
                    $isValid = false;
                }
            }
        }
        
        return $isValid;
    }
    
    /**
     * データ品質の検証
     * 
     * @param array $data データ
     */
    private function validateDataQuality($data) {
        // 画像の検証
        if (isset($data['images']) && is_array($data['images'])) {
            if (empty($data['images'])) {
                $this->addWarning('No images found');
            } else {
                foreach ($data['images'] as $index => $imageUrl) {
                    if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                        $this->addWarning("Invalid image URL at index {$index}");
                    }
                }
            }
        }
        
        // 説明文の検証
        if (isset($data['description'])) {
            $descLength = mb_strlen($data['description']);
            if ($descLength === 0) {
                $this->addWarning('Description is empty');
            } elseif ($descLength < 10) {
                $this->addWarning('Description very short');
            }
        }
        
        // カテゴリーの検証
        if (isset($data['categories']) && is_array($data['categories'])) {
            if (empty($data['categories'])) {
                $this->addWarning('No categories found');
            }
        }
        
        // 販売者情報の検証
        if (isset($data['seller_info']) && is_array($data['seller_info'])) {
            if (empty($data['seller_info']['shop_name'] ?? '')) {
                $this->addWarning('Seller name not found');
            }
        }
        
        // 日付の検証
        if (isset($data['scraped_at'])) {
            $timestamp = strtotime($data['scraped_at']);
            if (!$timestamp) {
                $this->addWarning('Invalid scraped_at timestamp');
            } elseif ($timestamp > time() + 300) { // 5分の余裕
                $this->addWarning('scraped_at is in the future');
            }
        }
    }
    
    /**
     * 複数データの一括検証
     * 
     * @param array $dataList データ配列
     * @param string $platform プラットフォーム名
     * @return array 検証結果
     */
    public function validateBatch($dataList, $platform = null) {
        $results = [];
        $summary = [
            'total' => count($dataList),
            'valid' => 0,
            'invalid' => 0,
            'warnings' => 0
        ];
        
        foreach ($dataList as $index => $data) {
            $this->clearMessages();
            $isValid = $this->validate($data, $platform);
            
            $result = [
                'index' => $index,
                'valid' => $isValid,
                'errors' => $this->getErrors(),
                'warnings' => $this->getWarnings()
            ];
            
            $results[] = $result;
            
            if ($isValid) {
                $summary['valid']++;
            } else {
                $summary['invalid']++;
            }
            
            if (!empty($this->getWarnings())) {
                $summary['warnings']++;
            }
        }
        
        return [
            'results' => $results,
            'summary' => $summary
        ];
    }
    
    /**
     * データ品質スコアを計算
     * 
     * @param array $data データ
     * @param string $platform プラットフォーム名
     * @return array スコア情報
     */
    public function calculateQualityScore($data, $platform = null) {
        $this->clearMessages();
        $this->validate($data, $platform);
        
        $maxScore = 100;
        $score = $maxScore;
        
        // エラーによる減点
        $score -= count($this->errors) * 20;
        
        // 警告による減点
        $score -= count($this->warnings) * 5;
        
        // 画像数によるボーナス
        $imageCount = count($data['images'] ?? []);
        if ($imageCount > 0) {
            $score += min($imageCount * 2, 10); // 最大10点
        }
        
        // 説明文の充実度
        $descLength = mb_strlen($data['description'] ?? '');
        if ($descLength > 50) {
            $score += 5;
        }
        if ($descLength > 200) {
            $score += 5;
        }
        
        // カテゴリー情報
        if (!empty($data['categories'])) {
            $score += 5;
        }
        
        // レビュー情報
        if (!empty($data['rating_info']['review_count'] ?? 0)) {
            $score += 5;
        }
        
        $score = max(0, min(100, $score));
        
        return [
            'score' => $score,
            'grade' => $this->getQualityGrade($score),
            'errors' => $this->getErrors(),
            'warnings' => $this->getWarnings(),
            'recommendations' => $this->generateRecommendations($data)
        ];
    }
    
    /**
     * 品質グレードを取得
     * 
     * @param float $score スコア
     * @return string グレード
     */
    private function getQualityGrade($score) {
        if ($score >= 90) return 'A';
        if ($score >= 80) return 'B';
        if ($score >= 70) return 'C';
        if ($score >= 60) return 'D';
        return 'F';
    }
    
    /**
     * 改善提案を生成
     * 
     * @param array $data データ
     * @return array 改善提案
     */
    private function generateRecommendations($data) {
        $recommendations = [];
        
        if (empty($data['images'] ?? [])) {
            $recommendations[] = '商品画像を追加すると品質が向上します';
        }
        
        if (mb_strlen($data['description'] ?? '') < 50) {
            $recommendations[] = '商品説明をより詳しく記載すると良いでしょう';
        }
        
        if (empty($data['categories'] ?? [])) {
            $recommendations[] = 'カテゴリー情報があると分類精度が向上します';
        }
        
        if (empty($data['seller_info']['shop_name'] ?? '')) {
            $recommendations[] = '販売者情報があると信頼性が向上します';
        }
        
        return $recommendations;
    }
    
    /**
     * データ型をチェック
     * 
     * @param mixed $value 値
     * @param string $expectedType 期待するデータ型
     * @return bool チェック結果
     */
    private function checkType($value, $expectedType) {
        switch ($expectedType) {
            case 'string':
                return is_string($value);
            case 'numeric':
                return is_numeric($value);
            case 'integer':
                return is_int($value);
            case 'float':
                return is_float($value);
            case 'boolean':
                return is_bool($value);
            case 'array':
                return is_array($value);
            case 'url':
                return filter_var($value, FILTER_VALIDATE_URL) !== false;
            default:
                return true;
        }
    }
    
    /**
     * 検証ルールを初期化
     */
    private function initializeValidationRules() {
        $this->validationRules = [
            'yahoo_auction' => [
                'bid_count' => ['type' => 'integer', 'min' => 0],
                'end_time' => ['type' => 'string', 'required' => false],
                'auction_id' => ['type' => 'string', 'required' => false, 'pattern' => '/^[a-z0-9]+$/']
            ],
            'rakuten' => [
                'shop_id' => ['type' => 'string', 'required' => false],
                'item_code' => ['type' => 'string', 'required' => false],
                'rating_info' => ['type' => 'array', 'required' => false]
            ],
            'mercari' => [
                'item_id' => ['type' => 'string', 'required' => false, 'pattern' => '/^m[0-9]+$/'],
                'shipping_info' => ['type' => 'array', 'required' => false]
            ]
        ];
    }
    
    /**
     * エラーを追加
     * 
     * @param string $message エラーメッセージ
     */
    private function addError($message) {
        $this->errors[] = [
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => 'error'
        ];
    }
    
    /**
     * 警告を追加
     * 
     * @param string $message 警告メッセージ
     */
    private function addWarning($message) {
        $this->warnings[] = [
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s'),
            'type' => 'warning'
        ];
    }
    
    /**
     * メッセージをクリア
     */
    private function clearMessages() {
        $this->warnings = [];
        $this->errors = [];
    }
    
    /**
     * エラーを取得
     * 
     * @return array エラー配列
     */
    public function getErrors() {
        return $this->errors;
    }
    
    /**
     * 警告を取得
     * 
     * @return array 警告配列
     */
    public function getWarnings() {
        return $this->warnings;
    }
    
    /**
     * エラーがあるかチェック
     * 
     * @return bool エラーの有無
     */
    public function hasErrors() {
        return !empty($this->errors);
    }
    
    /**
     * 警告があるかチェック
     * 
     * @return bool 警告の有無
     */
    public function hasWarnings() {
        return !empty($this->warnings);
    }
}
?>