            
            $this->debugLog("カテゴリー仕様保存完了: {$categoryId}");
            
        } catch (Exception $e) {
            $this->debugLog("カテゴリー仕様保存エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 優先度計算
     */
    private function calculatePriorityScore($spec) {
        $score = 0;
        
        // フィールドタイプ重み
        $score += self::PRIORITY_WEIGHTS[$spec['field_type']] ?? 10;
        
        // 信頼度ボーナス
        $score += $spec['confidence_score'] * 0.5;
        
        // SEO重要度ボーナス
        if ($spec['is_critical_for_seo']) {
            $score += 25;
        }
        
        // 自動検出可能フィールドボーナス
        if (in_array($spec['field_name'], self::AUTO_DETECT_FIELDS)) {
            $score += 15;
        }
        
        return intval($score);
    }
    
    /**
     * 仕様の優先度付け・選択
     */
    private function prioritizeSpecifications($specifications) {
        // 優先度順でソート
        usort($specifications, function($a, $b) {
            $priorityA = $a['priority_score'] ?? $this->calculatePriorityScore($a);
            $priorityB = $b['priority_score'] ?? $this->calculatePriorityScore($b);
            
            if ($priorityA === $priorityB) {
                // 同じ優先度なら信頼度で比較
                return ($b['confidence_score'] ?? 0) <=> ($a['confidence_score'] ?? 0);
            }
            
            return $priorityB <=> $priorityA;
        });
        
        // 文字数制限を考慮して選択
        $selectedSpecs = [];
        $estimatedLength = 0;
        $maxSpecs = 50; // 過度に多くならないように制限
        
        foreach ($specifications as $spec) {
            if (count($selectedSpecs) >= $maxSpecs) break;
            
            $estimatedFieldLength = strlen($spec['field_name']) + 20; // フィールド名+値の概算
            
            if ($estimatedLength + $estimatedFieldLength < self::MAX_CELL_LENGTH * 0.9) { // 90%まで
                $selectedSpecs[] = $spec;
                $estimatedLength += $estimatedFieldLength;
            } elseif ($spec['field_type'] === 'required') {
                // 必須項目は強制的に含める
                $selectedSpecs[] = $spec;
            }
        }
        
        $this->debugLog("優先度選択: " . count($selectedSpecs) . "/" . count($specifications) . " 項目選択");
        
        return $selectedSpecs;
    }
    
    /**
     * 各項目の値を決定（自動推定 + カスタム + デフォルト）
     */
    private function resolveSpecificationValues($specifications, $productData, $customValues) {
        $resolved = [];
        
        foreach ($specifications as $spec) {
            $fieldName = $spec['field_name'];
            $value = '';
            
            // 1. カスタム指定値があれば優先
            if (isset($customValues[$fieldName]) && !empty($customValues[$fieldName])) {
                $value = $customValues[$fieldName];
                $this->debugLog("カスタム値使用: {$fieldName} = {$value}");
            }
            
            // 2. 自動推定を試行
            elseif (in_array($fieldName, self::AUTO_DETECT_FIELDS)) {
                $detectedValue = $this->autoDetectFieldValue($fieldName, $productData, $spec);
                if ($detectedValue) {
                    $value = $detectedValue;
                    $this->debugLog("自動検出: {$fieldName} = {$value}");
                }
            }
            
            // 3. デフォルト値使用
            if (empty($value) && !empty($spec['default_value'])) {
                $value = $spec['default_value'];
            }
            
            // 4. 最終フォールバック
            if (empty($value)) {
                $value = $this->getFallbackValue($fieldName, $spec['field_type']);
            }
            
            // 5. 値の検証・サニタイゼーション
            $validatedValue = $this->validateAndSanitizeValue($value, $spec);
            
            if (!empty($validatedValue)) {
                $resolved[] = [
                    'field_name' => $fieldName,
                    'field_value' => $validatedValue,
                    'field_type' => $spec['field_type'],
                    'source' => isset($customValues[$fieldName]) ? 'custom' : 'auto'
                ];
            }
        }
        
        return $resolved;
    }
    
    /**
     * フィールド値の自動検出
     */
    private function autoDetectFieldValue($fieldName, $productData, $spec) {
        $title = strtolower($productData['title'] ?? '');
        $description = strtolower($productData['description'] ?? '');
        $text = $title . ' ' . $description;
        
        switch (strtolower($fieldName)) {
            case 'brand':
                return $this->detectBrand($text, $spec['possible_values'] ?? []);
                
            case 'color':
                return $this->detectColor($text, $spec['possible_values'] ?? []);
                
            case 'condition':
                return $this->detectCondition($text, $spec['possible_values'] ?? []);
                
            case 'model':
                return $this->detectModel($text, $productData);
                
            case 'type':
                return $this->detectType($text, $spec['possible_values'] ?? []);
                
            case 'material':
                return $this->detectMaterial($text, $spec['possible_values'] ?? []);
                
            case 'size':
                return $this->detectSize($text, $spec['possible_values'] ?? []);
                
            default:
                return null;
        }
    }
    
    /**
     * ブランド検出（高精度版）
     */
    private function detectBrand($text, $possibleValues = []) {
        $brandPatterns = [
            'apple' => ['apple', 'iphone', 'ipad', 'macbook', 'imac', 'アップル'],
            'samsung' => ['samsung', 'galaxy', 'サムスン', 'ギャラクシー'],
            'sony' => ['sony', 'playstation', 'ソニー'],
            'canon' => ['canon', 'キヤノン', 'キャノン'],
            'nikon' => ['nikon', 'ニコン'],
            'nintendo' => ['nintendo', 'ニンテンドー', 'switch', 'マリオ'],
            'microsoft' => ['microsoft', 'xbox', 'マイクロソフト'],
            'google' => ['google', 'pixel', 'グーグル']
        ];
        
        foreach ($brandPatterns as $brand => $patterns) {
            foreach ($patterns as $pattern) {
                if (strpos($text, $pattern) !== false) {
                    // 可能値リストがあれば照合
                    if (!empty($possibleValues)) {
                        foreach ($possibleValues as $possible) {
                            if (stripos($possible, $brand) !== false) {
                                return $possible;
                            }
                        }
                    }
                    return ucfirst($brand);
                }
            }
        }
        
        return null;
    }
    
    /**
     * 色検出
     */
    private function detectColor($text, $possibleValues = []) {
        $colorPatterns = [
            'black' => ['black', '黒', 'ブラック', 'space gray'],
            'white' => ['white', '白', 'ホワイト', 'silver'],
            'red' => ['red', '赤', 'レッド'],
            'blue' => ['blue', '青', 'ブルー', 'navy'],
            'gold' => ['gold', 'ゴールド', '金'],
            'pink' => ['pink', 'ピンク', 'rose'],
            'green' => ['green', 'グリーン', '緑'],
            'gray' => ['gray', 'grey', 'グレー', '灰色']
        ];
        
        foreach ($colorPatterns as $color => $patterns) {
            foreach ($patterns as $pattern) {
                if (strpos($text, $pattern) !== false) {
                    if (!empty($possibleValues)) {
                        foreach ($possibleValues as $possible) {
                            if (stripos($possible, $color) !== false) {
                                return $possible;
                            }
                        }
                    }
                    return ucfirst($color);
                }
            }
        }
        
        return null;
    }
    
    /**
     * 状態検出
     */
    private function detectCondition($text, $possibleValues = []) {
        if (strpos($text, '新品') !== false || strpos($text, 'new') !== false || strpos($text, '未開封') !== false) {
            return 'New';
        } elseif (strpos($text, '美品') !== false || strpos($text, 'mint') !== false || strpos($text, 'like new') !== false) {
            return 'Like New';
        } elseif (strpos($text, 'ジャンク') !== false || strpos($text, 'junk') !== false || strpos($text, 'parts') !== false) {
            return 'For parts or not working';
        } elseif (strpos($text, '中古') !== false || strpos($text, 'used') !== false) {
            return 'Used';
        }
        
        return 'Used'; // デフォルト
    }
    
    /**
     * モデル検出
     */
    private function detectModel($text, $productData) {
        $title = $productData['title'] ?? '';
        
        // iPhone系
        if (preg_match('/iphone\s*(\d+|se|x|xs|xr|pro|max|mini)/i', $title, $matches)) {
            return 'iPhone ' . trim($matches[1]);
        }
        
        // Samsung Galaxy系
        if (preg_match('/galaxy\s*([a-z0-9]+)/i', $title, $matches)) {
            return 'Galaxy ' . trim($matches[1]);
        }
        
        // カメラ系（Canon, Nikon等）
        if (preg_match('/eos\s*([a-z0-9]+)|d(\d+)|α(\d+)/i', $title, $matches)) {
            return trim($matches[0]);
        }
        
        // 一般的なモデル番号パターン
        if (preg_match('/([A-Z]+[\d\-]+[A-Z]*)/i', $title, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    /**
     * タイプ検出
     */
    private function detectType($text, $possibleValues = []) {
        $typePatterns = [
            'smartphone' => ['smartphone', 'スマートフォン', 'スマホ', 'phone'],
            'tablet' => ['tablet', 'タブレット', 'ipad'],
            'laptop' => ['laptop', 'notebook', 'ノートパソコン'],
            'camera' => ['camera', 'カメラ', '一眼', 'ミラーレス'],
            'game' => ['game', 'ゲーム', 'console', 'コンソール']
        ];
        
        foreach ($typePatterns as $type => $patterns) {
            foreach ($patterns as $pattern) {
                if (strpos($text, $pattern) !== false) {
                    if (!empty($possibleValues)) {
                        foreach ($possibleValues as $possible) {
                            if (stripos($possible, $type) !== false) {
                                return $possible;
                            }
                        }
                    }
                    return ucfirst($type);
                }
            }
        }
        
        return null;
    }
    
    /**
     * 素材検出
     */
    private function detectMaterial($text, $possibleValues = []) {
        $materialPatterns = [
            'plastic' => ['plastic', 'プラスチック'],
            'metal' => ['metal', 'aluminum', 'steel', 'アルミ', 'メタル'],
            'leather' => ['leather', 'レザー', '革'],
            'fabric' => ['fabric', 'cloth', '布', 'ファブリック'],
            'glass' => ['glass', 'ガラス'],
            'ceramic' => ['ceramic', 'セラミック']
        ];
        
        foreach ($materialPatterns as $material => $patterns) {
            foreach ($patterns as $pattern) {
                if (strpos($text, $pattern) !== false) {
                    if (!empty($possibleValues)) {
                        foreach ($possibleValues as $possible) {
                            if (stripos($possible, $material) !== false) {
                                return $possible;
                            }
                        }
                    }
                    return ucfirst($material);
                }
            }
        }
        
        return null;
    }
    
    /**
     * サイズ検出
     */
    private function detectSize($text, $possibleValues = []) {
        // 数値+単位パターン
        if (preg_match('/(\d+(?:\.\d+)?)\s*(inch|インチ|cm|mm|gb|tb)/i', $text, $matches)) {
            $sizeValue = $matches[1] . ' ' . strtolower($matches[2]);
            
            if (!empty($possibleValues)) {
                foreach ($possibleValues as $possible) {
                    if (stripos($possible, $matches[1]) !== false) {
                        return $possible;
                    }
                }
            }
            
            return $sizeValue;
        }
        
        // 標準サイズ名
        $sizePatterns = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large'];
        foreach ($sizePatterns as $size) {
            if (strpos($text, $size) !== false) {
                return strtoupper($size);
            }
        }
        
        return null;
    }
    
    /**
     * 値の検証・サニタイゼーション
     */
    private function validateAndSanitizeValue($value, $spec) {
        if (empty($value)) return '';
        
        // 基本サニタイゼーション
        $value = trim($value);
        $value = preg_replace('/[' . preg_quote(self::ITEM_SEPARATOR . self::KEY_VALUE_SEPARATOR, '/') . ']/', '', $value);
        
        // 長すぎる値は短縮
        if (strlen($value) > 100) {
            $value = substr($value, 0, 97) . '...';
        }
        
        // 可能値リストとの照合
        if (!empty($spec['possible_values'])) {
            $possibleValues = is_array($spec['possible_values']) ? $spec['possible_values'] : json_decode($spec['possible_values'], true);
            
            if (is_array($possibleValues) && !empty($possibleValues)) {
                // 完全一致チェック
                if (in_array($value, $possibleValues)) {
                    return $value;
                }
                
                // 部分一致チェック
                foreach ($possibleValues as $possible) {
                    if (stripos($possible, $value) !== false || stripos($value, $possible) !== false) {
                        return $possible;
                    }
                }
                
                // 必須項目で一致しない場合は最初の可能値を返す
                if ($spec['field_type'] === 'required' && !empty($possibleValues[0])) {
                    return $possibleValues[0];
                }
            }
        }
        
        return $value;
    }
    
    /**
     * フォールバック値取得
     */
    private function getFallbackValue($fieldName, $fieldType) {
        $fallbacks = [
            'brand' => 'Unknown',
            'condition' => 'Used',
            'color' => 'Unknown',
            'model' => 'Unknown',
            'type' => 'Unknown',
            'material' => 'Unknown',
            'size' => 'Unknown'
        ];
        
        return $fallbacks[strtolower($fieldName)] ?? ($fieldType === 'required' ? 'Unknown' : '');
    }
    
    /**
     * 1セル形式への最適化
     */
    private function optimizeForSingleCell($resolvedSpecs) {
        if (empty($resolvedSpecs)) {
            return '';
        }
        
        $items = [];
        $totalLength = 0;
        
        // 必須項目を最初に追加
        foreach ($resolvedSpecs as $spec) {
            if ($spec['field_type'] === 'required') {
                $item = $spec['field_name'] . self::KEY_VALUE_SEPARATOR . $spec['field_value'];
                $itemLength = strlen($item) + strlen(self::ITEM_SEPARATOR);
                
                if ($totalLength + $itemLength < self::MAX_CELL_LENGTH) {
                    $items[] = $item;
                    $totalLength += $itemLength;
                }
            }
        }
        
        // 推奨・オプション項目を追加（残り容量まで）
        foreach ($resolvedSpecs as $spec) {
            if ($spec['field_type'] !== 'required') {
                $item = $spec['field_name'] . self::KEY_VALUE_SEPARATOR . $spec['field_value'];
                $itemLength = strlen($item) + strlen(self::ITEM_SEPARATOR);
                
                if ($totalLength + $itemLength < self::MAX_CELL_LENGTH) {
                    $items[] = $item;
                    $totalLength += $itemLength;
                } else {
                    // 容量制限に達したので終了
                    break;
                }
            }
        }
        
        $result = implode(self::ITEM_SEPARATOR, $items);
        
        $this->debugLog("1セル最適化完了: " . count($items) . "項目, " . strlen($result) . "文字");
        
        return $result;
    }
    
    /**
     * Item Specifics検証
     */
    private function validateItemSpecifics($itemSpecifics, $categoryId) {
        // 長さチェック
        if (strlen($itemSpecifics) > self::MAX_CELL_LENGTH) {
            $this->debugLog("警告: 長さ制限超過 " . strlen($itemSpecifics) . " > " . self::MAX_CELL_LENGTH);
            return substr($itemSpecifics, 0, self::MAX_CELL_LENGTH - 10) . '...';
        }
        
        // フォーマットチェック
        $items = explode(self::ITEM_SEPARATOR, $itemSpecifics);
        $validItems = [];
        
        foreach ($items as $item) {
            if (strpos($item, self::KEY_VALUE_SEPARATOR) !== false) {
                list($key, $value) = explode(self::KEY_VALUE_SEPARATOR, $item, 2);
                if (!empty($key) && !empty($value)) {
                    $validItems[] = $item;
                }
            }
        }
        
        return implode(self::ITEM_SEPARATOR, $validItems);
    }
    
    /**
     * フォールバック Item Specifics生成
     */
    private function generateFallbackItemSpecifics($productData) {
        $fallbackItems = [
            'Brand=Unknown',
            'Condition=Used'
        ];
        
        // 商品データから基本情報を推定
        if (!empty($productData['title'])) {
            $title = strtolower($productData['title']);
            
            // ブランド検出
            $brand = $this->detectBrand($title);
            if ($brand) {
                $fallbackItems[0] = "Brand={$brand}";
            }
            
            // 色検出
            $color = $this->detectColor($title);
            if ($color) {
                $fallbackItems[] = "Color={$color}";
            }
            
            // 状態検出
            $condition = $this->detectCondition($title);
            if ($condition) {
                $fallbackItems[1] = "Condition={$condition}";
            }
        }
        
        return implode(self::ITEM_SEPARATOR, $fallbackItems);
    }
    
    /**
     * 生成結果キャッシュ
     */
    private function cacheGeneratedSpecs($categoryId, $itemSpecifics, $resolvedSpecs) {
        try {
            // 統計情報更新
            $sql = "UPDATE ebay_complete_item_specifics 
                    SET usage_frequency = usage_frequency + 1
                    WHERE category_id = ? AND field_name = ANY(?)";
            
            $fieldNames = array_column($resolvedSpecs, 'field_name');
            
            if (!empty($fieldNames)) {
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([$categoryId, '{' . implode(',', $fieldNames) . '}']);
            }
            
        } catch (Exception $e) {
            $this->debugLog("キャッシュ更新エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 基本カテゴリー仕様取得（フォールバック）
     */
    private function getBasicCategorySpecifics($categoryId) {
        return [
            [
                'field_name' => 'Brand',
                'field_type' => 'required',
                'possible_values' => [],
                'default_value' => 'Unknown',
                'confidence_score' => 80
            ],
            [
                'field_name' => 'Condition',
                'field_type' => 'required',
                'possible_values' => ['New', 'Used', 'Refurbished', 'For parts or not working'],
                'default_value' => 'Used',
                'confidence_score' => 90
            ],
            [
                'field_name' => 'Model',
                'field_type' => 'recommended',
                'possible_values' => [],
                'default_value' => 'Unknown',
                'confidence_score' => 70
            ]
        ];
    }
    
    /**
     * ユーティリティ関数群
     */
    private function normalizeUsageType($usage) {
        switch (strtolower($usage)) {
            case 'required':
                return 'required';
            case 'recommended':
            case 'helpful':
                return 'recommended';
            default:
                return 'optional';
        }
    }
    
    private function calculateConfidenceScore($nameRec) {
        $score = 50; // ベーススコア
        
        // 使用頻度による調整（あれば）
        if (isset($nameRec['UsageCount'])) {
            $score += min(30, intval($nameRec['UsageCount']) / 100);
        }
        
        // 推奨値の充実度
        if (isset($nameRec['ValueRecommendation'])) {
            $valueCount = is_array($nameRec['ValueRecommendation']) ? 
                          count($nameRec['ValueRecommendation']) : 1;
            $score += min(20, $valueCount * 2);
        }
        
        return min(100, max(0, $score));
    }
    
    private function isCriticalForSEO($fieldName) {
        $seoFields = ['Brand', 'Model', 'Type', 'Condition', 'Color', 'Size'];
        return in_array($fieldName, $seoFields);
    }
    
    /**
     * バッチ処理: 複数カテゴリーの仕様更新
     */
    public function updateCategorySpecificationsBatch($categoryIds = [], $forceUpdate = false) {
        if (empty($categoryIds)) {
            // アクティブカテゴリー全てを対象
            $sql = "SELECT DISTINCT category_id FROM ebay_category_fees WHERE is_active = TRUE";
            $stmt = $this->pdo->query($sql);
            $categoryIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
        }
        
        $results = [];
        $apiCallsUsed = 0;
        $startTime = microtime(true);
        
        foreach ($categoryIds as $categoryId) {
            try {
                // 強制更新でない場合、キャッシュ有効性チェック
                if (!$forceUpdate && $this->isCacheValid($categoryId)) {
                    $results[] = [
                        'category_id' => $categoryId,
                        'status' => 'cached',
                        'message' => 'キャッシュ有効のためスキップ'
                    ];
                    continue;
                }
                
                // API取得・更新
                $specs = $this->getCategorySpecifics($categoryId);
                $apiCallsUsed++;
                
                $results[] = [
                    'category_id' => $categoryId,
                    'status' => 'updated',
                    'specs_count' => count($specs),
                    'message' => 'Trading APIから更新完了'
                ];
                
                // API制限考慮で2秒待機
                sleep(2);
                
            } catch (Exception $e) {
                $results[] = [
                    'category_id' => $categoryId,
                    'status' => 'error',
                    'message' => $e->getMessage()
                ];
            }
        }
        
        $processingTime = round((microtime(true) - $startTime) * 1000);
        
        return [
            'success' => true,
            'processed_categories' => count($results),
            'api_calls_used' => $apiCallsUsed,
            'processing_time_ms' => $processingTime,
            'results' => $results
        ];
    }
    
    /**
     * デバッグログ
     */
    private function debugLog($message) {
        if ($this->debugMode) {
            error_log("[ItemSpecificsManager] " . date('Y-m-d H:i:s') . " - " . $message);
        }
    }
}
?>