        return $confidence;
    }
    
    /**
     * 最終結果生成
     */
    private function finalizeResult($result, $startTime, $source) {
        $processingTime = round((microtime(true) - $startTime) * 1000);
        
        return array_merge($result, [
            'source' => $source,
            'processing_time' => $processingTime,
            'timestamp' => date('Y-m-d H:i:s'),
            'success' => true
        ]);
    }
    
    /**
     * エラーレスポンス生成
     */
    private function generateErrorResponse($message) {
        return [
            'success' => false,
            'error' => $message,
            'category_id' => '99999',
            'category_name' => 'その他',
            'confidence' => 20,
            'source' => 'error',
            'processing_time' => 0,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
    
    /**
     * API使用ログ記録
     */
    private function logAPIUsage($apiType, $categoryId = null, $success = true, $processingTime = 0, $errorMessage = null) {
        try {
            $sql = "
                INSERT INTO ebay_api_usage_log 
                (api_type, category_id, success, processing_time, error_message, daily_count)
                VALUES (?, ?, ?, ?, ?, 
                    (SELECT COUNT(*) + 1 FROM ebay_api_usage_log WHERE created_date = CURRENT_DATE)
                )
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$apiType, $categoryId, $success, $processingTime, $errorMessage]);
            
        } catch (Exception $e) {
            error_log("APIログ記録エラー: " . $e->getMessage());
        }
    }
    
    /**
     * システムセットアップ検証
     */
    private function validateSystemSetup() {
        try {
            // 必須テーブル存在確認
            $requiredTables = [
                'ebay_categories_master',
                'category_keyword_mapping',
                'ebay_item_aspects',
                'ebay_api_usage_log'
            ];
            
            foreach ($requiredTables as $table) {
                $sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([$table]);
                
                if ($stmt->fetchColumn() == 0) {
                    throw new Exception("必須テーブルが見つかりません: {$table}");
                }
            }
            
            error_log("✅ eBayカテゴリーシステム初期化完了");
            
        } catch (Exception $e) {
            error_log("❌ システムセットアップエラー: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 手動カテゴリー検索
     */
    public function searchCategories($query, $limit = 20) {
        try {
            $sql = "
                SELECT 
                    category_id,
                    category_name,
                    parent_id,
                    is_leaf,
                    confidence_threshold,
                    (SELECT COUNT(*) FROM product_category_history WHERE detected_category_id = ecm.category_id) as usage_count
                FROM ebay_categories_master ecm
                WHERE is_active = TRUE 
                AND (
                    category_name ILIKE ? OR
                    category_id = ?
                )
                ORDER BY 
                    CASE WHEN category_id = ? THEN 0 ELSE 1 END,
                    usage_count DESC,
                    category_name
                LIMIT ?
            ";
            
            $searchPattern = '%' . $query . '%';
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$searchPattern, $query, $query, $limit]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("カテゴリー検索エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 統計情報取得
     */
    public function getSystemStats() {
        try {
            $stats = [];
            
            // 基本統計
            $sql = "
                SELECT 
                    (SELECT COUNT(*) FROM ebay_categories_master WHERE is_active = TRUE) as total_categories,
                    (SELECT COUNT(DISTINCT ebay_category_id) FROM category_keyword_mapping WHERE is_active = TRUE) as supported_categories,
                    (SELECT COUNT(*) FROM product_category_history WHERE created_at::date = CURRENT_DATE) as today_detections,
                    (SELECT COUNT(*) FROM ebay_api_usage_log WHERE created_date = CURRENT_DATE AND success = TRUE) as today_api_calls,
                    (SELECT AVG(confidence_score) FROM product_category_history WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as avg_confidence,
                    (SELECT 
                        CASE 
                            WHEN COUNT(*) = 0 THEN 0.0
                            ELSE COUNT(CASE WHEN user_feedback = 'correct' THEN 1 END)::float / COUNT(*)::float
                        END
                     FROM product_category_history 
                     WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' AND user_feedback IS NOT NULL) as success_rate
            ";
            
            $stmt = $this->pdo->query($sql);
            $basicStats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // 人気カテゴリー
            $sql = "
                SELECT 
                    ecm.category_name,
                    ecm.category_id,
                    COUNT(pch.history_id) as detection_count,
                    AVG(pch.confidence_score) as avg_confidence
                FROM ebay_categories_master ecm
                LEFT JOIN product_category_history pch ON ecm.category_id = pch.detected_category_id
                WHERE ecm.is_active = TRUE 
                AND pch.created_at >= CURRENT_DATE - INTERVAL '30 days'
                GROUP BY ecm.category_id, ecm.category_name
                HAVING COUNT(pch.history_id) > 0
                ORDER BY detection_count DESC
                LIMIT 5
            ";
            
            $stmt = $this->pdo->query($sql);
            $topCategories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return array_merge($basicStats, [
                'top_categories' => $topCategories,
                'system_status' => 'operational',
                'last_updated' => date('Y-m-d H:i:s')
            ]);
            
        } catch (Exception $e) {
            error_log("統計取得エラー: " . $e->getMessage());
            return [
                'total_categories' => 0,
                'supported_categories' => 0,
                'today_detections' => 0,
                'today_api_calls' => 0,
                'avg_confidence' => 0.0,
                'success_rate' => 0.0,
                'top_categories' => [],
                'system_status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 学習データ管理
     */
    public function getLearningData($filters = []) {
        try {
            $sql = "
                SELECT 
                    ckm.mapping_id,
                    ckm.japanese_keyword,
                    ckm.english_keywords,
                    ckm.ebay_category_id,
                    ecm.category_name,
                    ckm.confidence_score,
                    ckm.usage_count,
                    ckm.success_count,
                    ckm.success_rate,
                    ckm.data_source,
                    ckm.is_active,
                    ckm.created_at,
                    ckm.updated_at
                FROM category_keyword_mapping ckm
                JOIN ebay_categories_master ecm ON ckm.ebay_category_id = ecm.category_id
                WHERE 1=1
            ";
            
            $params = [];
            
            if (!empty($filters['data_source'])) {
                $sql .= " AND ckm.data_source = ?";
                $params[] = $filters['data_source'];
            }
            
            if (!empty($filters['category_id'])) {
                $sql .= " AND ckm.ebay_category_id = ?";
                $params[] = $filters['category_id'];
            }
            
            if (isset($filters['min_confidence'])) {
                $sql .= " AND ckm.confidence_score >= ?";
                $params[] = intval($filters['min_confidence']);
            }
            
            $sql .= " ORDER BY ckm.usage_count DESC, ckm.updated_at DESC LIMIT 100";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("学習データ取得エラー: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * キーワードマッピング追加
     */
    public function addKeywordMapping($japaneseKeyword, $englishKeywords, $categoryId, $confidence = 80) {
        try {
            $sql = "
                INSERT INTO category_keyword_mapping 
                (japanese_keyword, english_keywords, ebay_category_id, confidence_score, data_source)
                VALUES (?, ?, ?, ?, 'manual')
                ON CONFLICT (japanese_keyword, ebay_category_id) 
                DO UPDATE SET 
                    english_keywords = EXCLUDED.english_keywords,
                    confidence_score = EXCLUDED.confidence_score,
                    updated_at = NOW()
                RETURNING mapping_id
            ";
            
            $englishKeywordsJson = is_array($englishKeywords) ? 
                json_encode($englishKeywords) : 
                json_encode([$englishKeywords]);
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$japaneseKeyword, $englishKeywordsJson, $categoryId, $confidence]);
            
            $mappingId = $stmt->fetchColumn();
            
            error_log("キーワードマッピング追加成功: {$japaneseKeyword} → {$categoryId}");
            
            return [
                'success' => true,
                'mapping_id' => $mappingId,
                'message' => 'キーワードマッピングを追加しました'
            ];
            
        } catch (Exception $e) {
            error_log("キーワードマッピング追加エラー: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * 判定履歴保存
     */
    public function saveDetectionHistory($title, $result, $mysticalItemId = null) {
        try {
            $sql = "
                INSERT INTO product_category_history 
                (mystical_item_id, product_title, detected_category_id, detected_category_name, 
                 confidence_score, item_specifics, detection_method, processing_time, is_successful)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING history_id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                $mysticalItemId,
                $title,
                $result['category_id'],
                $result['category_name'],
                $result['confidence'],
                $result['item_specifics'] ?? '',
                $result['source'] ?? 'unknown',
                $result['processing_time'] ?? 0,
                $result['success'] ?? true
            ]);
            
            $historyId = $stmt->fetchColumn();
            
            return [
                'success' => true,
                'history_id' => $historyId
            ];
            
        } catch (Exception $e) {
            error_log("判定履歴保存エラー: " . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}

/**
 * CSVバッチ処理クラス
 */
class EbayCategoryCSVProcessor {
    private $detector;
    
    public function __construct() {
        $this->detector = new HybridCategoryDetector();
    }
    
    /**
     * CSV データの一括処理
     */
    public function processCsvData($csvData, $options = []) {
        $startTime = microtime(true);
        $results = [
            'total_items' => count($csvData),
            'processed_items' => 0,
            'success_items' => 0,
            'error_items' => 0,
            'results' => [],
            'summary' => []
        ];
        
        $categoryCount = [];
        $confidenceSum = 0;
        $processingTimeSum = 0;
        
        foreach ($csvData as $index => $row) {
            try {
                $title = $row['title'] ?? $row['Title'] ?? '';
                $description = $row['description'] ?? $row['Description'] ?? '';
                $price = floatval($row['price'] ?? $row['Price'] ?? 0);
                
                if (empty($title)) {
                    $results['results'][] = [
                        'index' => $index,
                        'original' => $row,
                        'error' => 'タイトルが空です',
                        'success' => false
                    ];
                    $results['error_items']++;
                    continue;
                }
                
                // カテゴリー判定実行
                $categoryResult = $this->detector->detectCategory($title, $description, $price);
                
                if ($categoryResult['success']) {
                    $results['results'][] = [
                        'index' => $index,
                        'original' => $row,
                        'category_result' => $categoryResult,
                        'success' => true
                    ];
                    
                    $results['success_items']++;
                    $confidenceSum += $categoryResult['confidence'];
                    $processingTimeSum += $categoryResult['processing_time'];
                    
                    // カテゴリー統計
                    $categoryKey = $categoryResult['category_id'] . '|' . $categoryResult['category_name'];
                    $categoryCount[$categoryKey] = ($categoryCount[$categoryKey] ?? 0) + 1;
                    
                } else {
                    $results['results'][] = [
                        'index' => $index,
                        'original' => $row,
                        'error' => $categoryResult['error'] ?? '判定に失敗しました',
                        'success' => false
                    ];
                    $results['error_items']++;
                }
                
                $results['processed_items']++;
                
                // 進捗表示（大量処理時）
                if ($results['processed_items'] % 100 == 0) {
                    error_log("CSV処理進捗: {$results['processed_items']}/{$results['total_items']}");
                }
                
                // API制限対応（遅延）
                if (!empty($options['delay_between_items'])) {
                    usleep($options['delay_between_items'] * 1000);
                }
                
            } catch (Exception $e) {
                $results['results'][] = [
                    'index' => $index,
                    'original' => $row,
                    'error' => $e->getMessage(),
                    'success' => false
                ];
                $results['error_items']++;
                $results['processed_items']++;
            }
        }
        
        // サマリー生成
        $totalTime = round((microtime(true) - $startTime) * 1000);
        $avgConfidence = $results['success_items'] > 0 ? round($confidenceSum / $results['success_items'], 1) : 0;
        $avgProcessingTime = $results['success_items'] > 0 ? round($processingTimeSum / $results['success_items'], 1) : 0;
        
        $results['summary'] = [
            'total_processing_time' => $totalTime,
            'success_rate' => round(($results['success_items'] / max(1, $results['processed_items'])) * 100, 1),
            'average_confidence' => $avgConfidence,
            'average_processing_time' => $avgProcessingTime,
            'category_distribution' => $this->formatCategoryDistribution($categoryCount),
            'performance_metrics' => [
                'items_per_second' => round($results['processed_items'] / max(1, $totalTime / 1000), 2),
                'categories_detected' => count($categoryCount)
            ]
        ];
        
        return $results;
    }
    
    /**
     * カテゴリー分布フォーマット
     */
    private function formatCategoryDistribution($categoryCount) {
        $distribution = [];
        arsort($categoryCount);
        
        foreach (array_slice($categoryCount, 0, 10, true) as $categoryKey => $count) {
            list($categoryId, $categoryName) = explode('|', $categoryKey, 2);
            $distribution[] = [
                'category_id' => $categoryId,
                'category_name' => $categoryName,
                'count' => $count
            ];
        }
        
        return $distribution;
    }
}

?>
