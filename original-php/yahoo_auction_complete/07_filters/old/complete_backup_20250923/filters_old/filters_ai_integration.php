<?php
/**
 * NAGANO-3 フィルターシステム AI統合サービス
 * 
 * 機能: DeepSeek AI連携・学習データ管理・判定精度向上
 * 依存: Python DeepSeek AI サービス、PostgreSQL
 * 作成: 2024年版 NAGANO-3準拠
 */

require_once __DIR__ . '/filters_data_service.php';

class FiltersAiIntegration {
    
    private $data_service;
    private $logger;
    private $config;
    private $python_executable;
    private $ai_script_path;
    private $confidence_threshold;
    
    public function __construct() {
        $this->data_service = new FiltersDataService();
        $this->logger = $this->initializeLogger();
        $this->config = $this->loadAiConfig();
        
        // Python実行環境設定
        $this->python_executable = $this->config['python_executable'] ?? 'python3';
        $this->ai_script_path = __DIR__ . '/python/deepseek_ai_service.py';
        $this->confidence_threshold = (float)($this->config['ai_confidence_threshold'] ?? 0.7);
    }
    
    /**
     * 商品AI解析実行（メイン処理）
     * 
     * @param array $product 商品データ
     * @return array AI解析結果
     */
    public function analyzeProduct($product) {
        $start_time = microtime(true);
        
        try {
            // 入力検証
            if (!$this->validateProductData($product)) {
                throw new Exception('無効な商品データです');
            }
            
            // キャッシュチェック
            $cache_result = $this->checkAnalysisCache($product);
            if ($cache_result) {
                $this->logger->debug("AI解析キャッシュヒット", [
                    'product_id' => $product['id'],
                    'cache_key' => $cache_result['cache_key']
                ]);
                return $cache_result['result'];
            }
            
            // 学習データベース分析
            $learning_analysis = $this->analyzeLearningData($product);
            
            // DeepSeek AI分析実行
            $ai_analysis = $this->executeDeepSeekAnalysis($product);
            
            // 結果統合・判定
            $final_result = $this->integrateAnalysisResults($ai_analysis, $learning_analysis, $product);
            
            // 実行時間記録
            $execution_time = round((microtime(true) - $start_time) * 1000);
            $final_result['execution_time_ms'] = $execution_time;
            
            // 結果キャッシュ保存
            $this->cacheAnalysisResult($product, $final_result);
            
            $this->logger->info("AI解析完了", [
                'product_id' => $product['id'],
                'recommendation' => $final_result['recommendation'],
                'confidence' => $final_result['confidence'],
                'execution_time_ms' => $execution_time
            ]);
            
            return $final_result;
            
        } catch (Exception $e) {
            $this->logger->error("AI解析エラー", [
                'product_id' => $product['id'] ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // エラー時のフォールバック
            return $this->getErrorFallbackResult($e->getMessage());
        }
    }
    
    /**
     * DeepSeek AI分析実行
     * 
     * @param array $product 商品データ
     * @return array AI分析結果
     */
    private function executeDeepSeekAnalysis($product) {
        try {
            // Python AI入力データ準備
            $ai_input = [
                'action' => 'analyze_product',
                'product_data' => [
                    'id' => $product['id'],
                    'title' => $product['title'],
                    'description' => $product['description'],
                    'category' => $product['category'] ?? '',
                    'sku' => $product['sku'] ?? ''
                ],
                'analysis_config' => [
                    'confidence_threshold' => $this->confidence_threshold,
                    'analysis_depth' => $this->config['analysis_depth'] ?? 'standard',
                    'language' => 'japanese',
                    'domain_focus' => ['dangerous_items', 'restricted_products', 'shipping_regulations']
                ]
            ];
            
            // Python AI実行
            $ai_result = $this->callPythonAI($ai_input);
            
            // 結果検証
            if (!$this->validateAiResult($ai_result)) {
                throw new Exception('AI分析結果の形式が無効です');
            }
            
            return $ai_result;
            
        } catch (Exception $e) {
            $this->logger->error("DeepSeek AI実行エラー", [
                'product_id' => $product['id'],
                'error' => $e->getMessage()
            ]);
            
            // AI失敗時のフォールバック分析
            return $this->getFallbackAnalysis($product);
        }
    }
    
    /**
     * Python AI呼び出し
     * 
     * @param array $input_data 入力データ
     * @return array AI実行結果
     */
    private function callPythonAI($input_data) {
        // JSON入力データを準備
        $json_input = json_encode($input_data, JSON_UNESCAPED_UNICODE);
        $json_escaped = escapeshellarg($json_input);
        
        // Pythonコマンド構築
        $command = "{$this->python_executable} \"{$this->ai_script_path}\" {$json_escaped} 2>&1";
        
        $this->logger->debug("Python AI実行", [
            'command' => $command,
            'script_exists' => file_exists($this->ai_script_path)
        ]);
        
        // タイムアウト設定
        $start_time = time();
        $timeout = $this->config['ai_timeout_seconds'] ?? 30;
        
        // Python実行
        $output = shell_exec($command);
        $execution_time = time() - $start_time;
        
        if ($execution_time > $timeout) {
            throw new Exception("AI処理がタイムアウトしました ({$execution_time}秒)");
        }
        
        if (empty($output)) {
            throw new Exception('Python AI実行結果が空です');
        }
        
        // JSON結果解析
        $result = json_decode($output, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->logger->error("Python AI JSON解析エラー", [
                'json_error' => json_last_error_msg(),
                'output' => substr($output, 0, 500)
            ]);
            throw new Exception('Python AI応答のJSON解析に失敗しました: ' . json_last_error_msg());
        }
        
        if (isset($result['error'])) {
            throw new Exception('Python AI処理エラー: ' . $result['error']);
        }
        
        return $result;
    }
    
    /**
     * 学習データベース分析
     * 
     * @param array $product 商品データ
     * @return array 学習データ分析結果
     */
    private function analyzeLearningData($product) {
        try {
            // 類似商品の学習データ検索
            $similar_learning_data = $this->findSimilarLearningData($product);
            
            // 過去の判定パターン分析
            $judgment_patterns = $this->analyzeJudgmentPatterns($similar_learning_data);
            
            // NGワード・カテゴリマッチング履歴
            $historical_matches = $this->getHistoricalMatches($product);
            
            return [
                'similar_products_count' => count($similar_learning_data),
                'safe_ratio' => $judgment_patterns['safe_ratio'] ?? 0,
                'dangerous_ratio' => $judgment_patterns['dangerous_ratio'] ?? 0,
                'confidence_score' => $judgment_patterns['confidence_score'] ?? 0.5,
                'historical_matches' => $historical_matches,
                'recommendation_from_learning' => $this->generateLearningRecommendation($judgment_patterns)
            ];
            
        } catch (Exception $e) {
            $this->logger->error("学習データ分析エラー", [
                'product_id' => $product['id'],
                'error' => $e->getMessage()
            ]);
            
            return [
                'similar_products_count' => 0,
                'safe_ratio' => 0.5,
                'dangerous_ratio' => 0.5,
                'confidence_score' => 0.0,
                'historical_matches' => [],
                'recommendation_from_learning' => 'unknown'
            ];
        }
    }
    
    /**
     * 類似学習データ検索
     * 
     * @param array $product 商品データ
     * @return array 類似学習データ
     */
    private function findSimilarLearningData($product) {
        try {
            $learning_data = $this->data_service->getLearningData(500); // 最近500件
            $similar_products = [];
            
            $product_text = strtolower($product['title'] . ' ' . $product['description']);
            $product_words = $this->extractKeywords($product_text);
            
            foreach ($learning_data as $data) {
                $learning_text = strtolower($data['product_title'] . ' ' . $data['product_description']);
                $learning_words = $this->extractKeywords($learning_text);
                
                // 類似度計算（Jaccard係数）
                $similarity = $this->calculateJaccardSimilarity($product_words, $learning_words);
                
                if ($similarity > 0.3) { // 30%以上の類似度
                    $data['similarity_score'] = $similarity;
                    $similar_products[] = $data;
                }
            }
            
            // 類似度順にソート
            usort($similar_products, function($a, $b) {
                return $b['similarity_score'] <=> $a['similarity_score'];
            });
            
            return array_slice($similar_products, 0, 10); // 上位10件
            
        } catch (Exception $e) {
            $this->logger->error("類似学習データ検索エラー", ['error' => $e->getMessage()]);
            return [];
        }
    }
    
    /**
     * キーワード抽出
     * 
     * @param string $text テキスト
     * @return array キーワード配列
     */
    private function extractKeywords($text) {
        // 日本語・英語の重要キーワード抽出
        $text = preg_replace('/[^ぁ-ゖァ-ヶー一-龯a-zA-Z0-9\s]/u', ' ', $text);
        $words = preg_split('/\s+/', $text);
        $words = array_filter($words, function($word) {
            return mb_strlen($word) >= 2; // 2文字以上
        });
        
        return array_unique($words);
    }
    
    /**
     * Jaccard類似度計算
     * 
     * @param array $set1 セット1
     * @param array $set2 セット2
     * @return float 類似度
     */
    private function calculateJaccardSimilarity($set1, $set2) {
        $intersection = count(array_intersect($set1, $set2));
        $union = count(array_unique(array_merge($set1, $set2)));
        
        return $union > 0 ? $intersection / $union : 0;
    }
    
    /**
     * 判定パターン分析
     * 
     * @param array $learning_data 学習データ
     * @return array 判定パターン
     */
    private function analyzeJudgmentPatterns($learning_data) {
        if (empty($learning_data)) {
            return [
                'safe_ratio' => 0.5,
                'dangerous_ratio' => 0.5,
                'confidence_score' => 0.0
            ];
        }
        
        $total = count($learning_data);
        $safe_count = 0;
        $dangerous_count = 0;
        $confidence_sum = 0;
        
        foreach ($learning_data as $data) {
            switch ($data['human_judgment']) {
                case 'safe':
                    $safe_count++;
                    break;
                case 'dangerous':
                    $dangerous_count++;
                    break;
            }
            
            if ($data['ai_confidence_score']) {
                $confidence_sum += $data['ai_confidence_score'];
            }
        }
        
        return [
            'safe_ratio' => $safe_count / $total,
            'dangerous_ratio' => $dangerous_count / $total,
            'confidence_score' => $total > 0 ? $confidence_sum / $total : 0.0
        ];
    }
    
    /**
     * 学習データからの推奨判定生成
     * 
     * @param array $patterns 判定パターン
     * @return string 推奨判定
     */
    private function generateLearningRecommendation($patterns) {
        $safe_ratio = $patterns['safe_ratio'];
        $dangerous_ratio = $patterns['dangerous_ratio'];
        $confidence = $patterns['confidence_score'];
        
        if ($confidence < 0.3) {
            return 'unknown'; // 信頼度不足
        }
        
        if ($dangerous_ratio > 0.7) {
            return 'block';
        } elseif ($safe_ratio > 0.7) {
            return 'pass';
        } else {
            return 'review';
        }
    }
    
    /**
     * 過去のマッチング履歴取得
     * 
     * @param array $product 商品データ
     * @return array 履歴データ
     */
    private function getHistoricalMatches($product) {
        try {
            // 過去30日のフィルターログから類似商品の結果を取得
            $ng_word_effectiveness = $this->data_service->getNGWordEffectiveness(30);
            
            $product_text = $product['title'] . ' ' . $product['description'];
            $matches = [];
            
            foreach ($ng_word_effectiveness as $word_data) {
                if (stripos($product_text, $word_data['word']) !== false) {
                    $matches[] = [
                        'word' => $word_data['word'],
                        'detection_count' => $word_data['detection_count'],
                        'last_detected' => $word_data['last_detected']
                    ];
                }
            }
            
            return $matches;
            
        } catch (Exception $e) {
            $this->logger->error("履歴マッチング取得エラー", ['error' => $e->getMessage()]);
            return [];
        }
    }
    
    /**
     * 分析結果統合・最終判定
     * 
     * @param array $ai_analysis AI分析結果
     * @param array $learning_analysis 学習データ分析結果
     * @param array $product 商品データ
     * @return array 統合結果
     */
    private function integrateAnalysisResults($ai_analysis, $learning_analysis, $product) {
        try {
            // 各分析結果の重み設定
            $ai_weight = 0.7;
            $learning_weight = 0.3;
            
            // AI分析結果
            $ai_confidence = $ai_analysis['confidence'] ?? 0.0;
            $ai_recommendation = $ai_analysis['recommendation'] ?? 'review';
            $ai_reason = $ai_analysis['reason'] ?? 'AI分析結果なし';
            
            // 学習データ分析結果
            $learning_confidence = $learning_analysis['confidence_score'] ?? 0.0;
            $learning_recommendation = $learning_analysis['recommendation_from_learning'] ?? 'unknown';
            
            // 統合信頼度計算
            $integrated_confidence = ($ai_confidence * $ai_weight) + ($learning_confidence * $learning_weight);
            
            // 最終推奨判定
            $final_recommendation = $this->determineFinalRecommendation(
                $ai_recommendation, 
                $learning_recommendation, 
                $integrated_confidence
            );
            
            // 判定理由生成
            $integrated_reason = $this->generateIntegratedReason(
                $ai_analysis, 
                $learning_analysis, 
                $final_recommendation
            );
            
            // 詳細分析データ
            $detailed_analysis = [
                'ai_analysis' => $ai_analysis,
                'learning_analysis' => $learning_analysis,
                'integration_weights' => [
                    'ai_weight' => $ai_weight,
                    'learning_weight' => $learning_weight
                ],
                'confidence_breakdown' => [
                    'ai_confidence' => $ai_confidence,
                    'learning_confidence' => $learning_confidence,
                    'integrated_confidence' => $integrated_confidence
                ]
            ];
            
            return [
                'recommendation' => $final_recommendation,
                'confidence' => $integrated_confidence,
                'reason' => $integrated_reason,
                'ai_confidence' => $ai_confidence,
                'learning_confidence' => $learning_confidence,
                'detailed_analysis' => $detailed_analysis,
                'analysis_timestamp' => date('c'),
                'analysis_version' => '1.0'
            ];
            
        } catch (Exception $e) {
            $this->logger->error("分析結果統合エラー", [
                'product_id' => $product['id'],
                'error' => $e->getMessage()
            ]);
            
            return $this->getErrorFallbackResult("分析結果統合エラー: " . $e->getMessage());
        }
    }
    
    /**
     * 最終推奨判定決定
     * 
     * @param string $ai_rec AI推奨
     * @param string $learning_rec 学習データ推奨
     * @param float $confidence 統合信頼度
     * @return string 最終推奨
     */
    private function determineFinalRecommendation($ai_rec, $learning_rec, $confidence) {
        // 信頼度不足の場合は人間確認
        if ($confidence < $this->confidence_threshold) {
            return 'review';
        }
        
        // AIと学習データが一致する場合
        if ($ai_rec === $learning_rec) {
            return $ai_rec;
        }
        
        // どちらかがblockの場合は安全を優先してblock
        if ($ai_rec === 'block' || $learning_rec === 'block') {
            return 'block';
        }
        
        // 意見が分かれる場合は人間確認
        return 'review';
    }
    
    /**
     * 統合判定理由生成
     * 
     * @param array $ai_analysis AI分析
     * @param array $learning_analysis 学習データ分析
     * @param string $final_rec 最終推奨
     * @return string 判定理由
     */
    private function generateIntegratedReason($ai_analysis, $learning_analysis, $final_rec) {
        $reasons = [];
        
        // AI分析理由
        if (isset($ai_analysis['reason'])) {
            $reasons[] = "AI分析: " . $ai_analysis['reason'];
        }
        
        // 学習データ理由
        $similar_count = $learning_analysis['similar_products_count'] ?? 0;
        if ($similar_count > 0) {
            $safe_ratio = round(($learning_analysis['safe_ratio'] ?? 0) * 100);
            $dangerous_ratio = round(($learning_analysis['dangerous_ratio'] ?? 0) * 100);
            $reasons[] = "類似商品{$similar_count}件の判定結果: 安全{$safe_ratio}%・危険{$dangerous_ratio}%";
        }
        
        // 履歴マッチング
        $historical_matches = $learning_analysis['historical_matches'] ?? [];
        if (!empty($historical_matches)) {
            $word_list = array_column($historical_matches, 'word');
            $reasons[] = "過去検出ワード: " . implode(', ', array_slice($word_list, 0, 3));
        }
        
        // 最終判定理由
        switch ($final_rec) {
            case 'block':
                $reasons[] = "総合判定: 出品リスク高 - ブロック推奨";
                break;
            case 'review':
                $reasons[] = "総合判定: 人間確認が必要";
                break;
            case 'pass':
                $reasons[] = "総合判定: 出品可能";
                break;
        }
        
        return implode(' | ', $reasons);
    }
    
    /**
     * フォールバック分析（AI失敗時）
     * 
     * @param array $product 商品データ
     * @return array フォールバック結果
     */
    private function getFallbackAnalysis($product) {
        // 簡易キーワードベース分析
        $dangerous_keywords = [
            'バッテリー', 'リチウム', '電池', '液体', 'ジェル', '化学薬品', 
            '農薬', '毒物', '爆薬', '火薬', '医薬品', 'アルコール'
        ];
        
        $product_text = $product['title'] . ' ' . $product['description'];
        $detected_keywords = [];
        
        foreach ($dangerous_keywords as $keyword) {
            if (stripos($product_text, $keyword) !== false) {
                $detected_keywords[] = $keyword;
            }
        }
        
        $risk_score = count($detected_keywords) * 0.2; // キーワード1つあたり20%
        $confidence = 0.4; // フォールバック分析の信頼度は低め
        
        if ($risk_score > 0.6) {
            $recommendation = 'block';
            $reason = "危険キーワード検出: " . implode(', ', $detected_keywords);
        } elseif ($risk_score > 0.2) {
            $recommendation = 'review';
            $reason = "要注意キーワード検出: " . implode(', ', $detected_keywords);
        } else {
            $recommendation = 'pass';
            $reason = "危険キーワード未検出";
        }
        
        return [
            'recommendation' => $recommendation,
            'confidence' => $confidence,
            'reason' => $reason . " (フォールバック分析)",
            'detected_keywords' => $detected_keywords,
            'risk_score' => $risk_score,
            'analysis_type' => 'fallback'
        ];
    }
    
    /**
     * エラー時フォールバック結果
     * 
     * @param string $error_message エラーメッセージ
     * @return array フォールバック結果
     */
    private function getErrorFallbackResult($error_message) {
        return [
            'recommendation' => 'review',
            'confidence' => 0.0,
            'reason' => 'AI解析エラーのため人間確認が必要: ' . $error_message,
            'error' => true,
            'fallback_mode' => true,
            'analysis_timestamp' => date('c')
        ];
    }
    
    // ===========================================
    // バリデーション・キャッシュ関連
    // ===========================================
    
    /**
     * 商品データ検証
     * 
     * @param array $product 商品データ
     * @return bool 検証結果
     */
    private function validateProductData($product) {
        return isset($product['id']) && 
               isset($product['title']) && 
               isset($product['description']) &&
               !empty($product['title']);
    }
    
    /**
     * AI結果検証
     * 
     * @param array $ai_result AI結果
     * @return bool 検証結果
     */
    private function validateAiResult($ai_result) {
        return isset($ai_result['recommendation']) &&
               isset($ai_result['confidence']) &&
               in_array($ai_result['recommendation'], ['pass', 'block', 'review']) &&
               is_numeric($ai_result['confidence']) &&
               $ai_result['confidence'] >= 0 &&
               $ai_result['confidence'] <= 1;
    }
    
    /**
     * 解析キャッシュチェック
     * 
     * @param array $product 商品データ
     * @return array|null キャッシュ結果
     */
    private function checkAnalysisCache($product) {
        // 商品データのハッシュを生成
        $cache_key = $this->generateCacheKey($product);
        
        // ここではメモリキャッシュのみ実装
        // 実際の運用ではRedisキャッシュを使用
        static $cache = [];
        
        if (isset($cache[$cache_key])) {
            $cached_data = $cache[$cache_key];
            $cache_age = time() - $cached_data['timestamp'];
            
            // 1時間以内のキャッシュのみ有効
            if ($cache_age < 3600) {
                return [
                    'cache_key' => $cache_key,
                    'result' => $cached_data['result']
                ];
            }
        }
        
        return null;
    }
    
    /**
     * 解析結果キャッシュ保存
     * 
     * @param array $product 商品データ
     * @param array $result 解析結果
     */
    private function cacheAnalysisResult($product, $result) {
        $cache_key = $this->generateCacheKey($product);
        
        static $cache = [];
        $cache[$cache_key] = [
            'result' => $result,
            'timestamp' => time()
        ];
    }
    
    /**
     * キャッシュキー生成
     * 
     * @param array $product 商品データ
     * @return string キャッシュキー
     */
    private function generateCacheKey($product) {
        $data = $product['title'] . '|' . $product['description'] . '|' . ($product['category'] ?? '');
        return 'ai_analysis_' . md5($data);
    }
    
    // ===========================================
    // 学習・改善関連メソッド
    // ===========================================
    
    /**
     * 人間判定結果からの学習
     * 
     * @param int $product_id 商品ID
     * @param string $human_judgment 人間判定
     * @param string $reason 理由
     * @param array $ai_result 対応するAI結果
     * @return bool 学習成功/失敗
     */
    public function learnFromHumanJudgment($product_id, $human_judgment, $reason, $ai_result = null) {
        try {
            // 商品データ取得
            $product = $this->data_service->getProductById($product_id);
            if (!$product) {
                throw new Exception("商品ID {$product_id} が見つかりません");
            }
            
            // 学習データ追加
            $learning_data = [
                'product_id' => $product_id,
                'product_title' => $product['title'],
                'product_description' => $product['description'],
                'human_judgment' => $human_judgment,
                'human_reason' => $reason,
                'ai_confidence_score' => $ai_result['confidence'] ?? null,
                'learning_source' => 'manual_mark',
                'created_by' => 'human_reviewer',
                'metadata' => [
                    'ai_result' => $ai_result,
                    'learning_context' => 'post_review',
                    'timestamp' => date('c')
                ]
            ];
            
            $result = $this->data_service->insertLearningData($learning_data);
            
            if ($result) {
                $this->logger->info("AI学習データ追加", [
                    'product_id' => $product_id,
                    'human_judgment' => $human_judgment,
                    'ai_confidence' => $ai_result['confidence'] ?? null
                ]);
                
                // 自動再訓練トリガー（設定で有効な場合）
                if ($this->config['auto_retrain_enabled'] ?? false) {
                    $this->triggerModelRetraining();
                }
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error("人間判定学習エラー", [
                'product_id' => $product_id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
    
    /**
     * モデル再訓練トリガー
     * 
     * @return bool トリガー成功/失敗
     */
    private function triggerModelRetraining() {
        try {
            // 学習データ件数チェック
            $recent_learning_count = $this->getRecentLearningDataCount();
            $retrain_threshold = $this->config['retrain_threshold'] ?? 100;
            
            if ($recent_learning_count < $retrain_threshold) {
                $this->logger->debug("再訓練閾値未達", [
                    'current_count' => $recent_learning_count,
                    'threshold' => $retrain_threshold
                ]);
                return false;
            }
            
            // Python再訓練スクリプト実行
            $retrain_input = [
                'action' => 'retrain_model',
                'config' => [
                    'learning_data_limit' => 1000,
                    'validation_split' => 0.2,
                    'epochs' => 10
                ]
            ];
            
            $retrain_result = $this->callPythonAI($retrain_input);
            
            if ($retrain_result['status'] === 'success') {
                $this->logger->info("モデル再訓練完了", [
                    'training_accuracy' => $retrain_result['training_accuracy'] ?? 'unknown',
                    'validation_accuracy' => $retrain_result['validation_accuracy'] ?? 'unknown'
                ]);
                return true;
            } else {
                throw new Exception('再訓練処理が失敗しました: ' . ($retrain_result['error'] ?? 'unknown'));
            }
            
        } catch (Exception $e) {
            $this->logger->error("モデル再訓練エラー", ['error' => $e->getMessage()]);
            return false;
        }
    }
    
    /**
     * 最近の学習データ件数取得
     * 
     * @return int 学習データ件数
     */
    private function getRecentLearningDataCount() {
        try {
            $recent_data = $this->data_service->getLearningData(1000);
            $one_week_ago = strtotime('-1 week');
            
            $recent_count = 0;
            foreach ($recent_data as $data) {
                if (strtotime($data['created_at']) >= $one_week_ago) {
                    $recent_count++;
                }
            }
            
            return $recent_count;
            
        } catch (Exception $e) {
            $this->logger->error("学習データ件数取得エラー", ['error' => $e->getMessage()]);
            return 0;
        }
    }
    
    /**
     * AI精度評価
     * 
     * @param int $evaluation_period_days 評価期間（日数）
     * @return array 精度評価結果
     */
    public function evaluateAiAccuracy($evaluation_period_days = 30) {
        try {
            // 評価期間内の学習データ取得
            $learning_data = $this->data_service->getLearningData(1000);
            $cutoff_date = strtotime("-{$evaluation_period_days} days");
            
            $evaluation_data = array_filter($learning_data, function($data) use ($cutoff_date) {
                return strtotime($data['created_at']) >= $cutoff_date && 
                       $data['ai_confidence_score'] !== null;
            });
            
            if (empty($evaluation_data)) {
                throw new Exception('評価対象データが不足しています');
            }
            
            // 精度計算
            $correct_predictions = 0;
            $total_predictions = count($evaluation_data);
            $confidence_sum = 0;
            $judgment_breakdown = ['safe' => 0, 'dangerous' => 0, 'pending' => 0];
            
            foreach ($evaluation_data as $data) {
                // AI推奨と人間判定の比較（簡易実装）
                $ai_prediction = $data['ai_confidence_score'] > 0.7 ? 'safe' : 
                                ($data['ai_confidence_score'] < 0.3 ? 'dangerous' : 'pending');
                
                if ($ai_prediction === $data['human_judgment']) {
                    $correct_predictions++;
                }
                
                $confidence_sum += $data['ai_confidence_score'];
                $judgment_breakdown[$data['human_judgment']]++;
            }
            
            $accuracy = $total_predictions > 0 ? $correct_predictions / $total_predictions : 0;
            $avg_confidence = $total_predictions > 0 ? $confidence_sum / $total_predictions : 0;
            
            $evaluation_result = [
                'evaluation_period_days' => $evaluation_period_days,
                'total_evaluations' => $total_predictions,
                'correct_predictions' => $correct_predictions,
                'accuracy_percentage' => round($accuracy * 100, 2),
                'average_confidence' => round($avg_confidence, 3),
                'judgment_breakdown' => $judgment_breakdown,
                'evaluation_timestamp' => date('c')
            ];
            
            $this->logger->info("AI精度評価完了", $evaluation_result);
            
            return $evaluation_result;
            
        } catch (Exception $e) {
            $this->logger->error("AI精度評価エラー", ['error' => $e->getMessage()]);
            return [
                'error' => true,
                'message' => $e->getMessage(),
                'evaluation_timestamp' => date('c')
            ];
        }
    }
    
    // ===========================================
    // 設定・初期化関連
    // ===========================================
    
    /**
     * AI設定読み込み
     * 
     * @return array AI設定
     */
    private function loadAiConfig() {
        try {
            $system_settings = $this->data_service->getSystemSettings();
            $ai_config = [];
            
            foreach ($system_settings as $setting) {
                if (strpos($setting['setting_key'], 'ai_') === 0 || 
                    strpos($setting['setting_key'], 'deepseek_') === 0) {
                    
                    $value = $setting['setting_value'];
                    
                    // 型変換
                    switch ($setting['setting_type']) {
                        case 'boolean':
                            $value = ($value === 'true');
                            break;
                        case 'integer':
                            $value = (int)$value;
                            break;
                        case 'json':
                            $value = json_decode($value, true);
                            break;
                    }
                    
                    $ai_config[$setting['setting_key']] = $value;
                }
            }
            
            // デフォルト設定のマージ
            $default_config = [
                'ai_enabled' => true,
                'ai_confidence_threshold' => 0.7,
                'ai_timeout_seconds' => 30,
                'analysis_depth' => 'standard',
                'python_executable' => 'python3',
                'auto_retrain_enabled' => false,
                'retrain_threshold' => 100
            ];
            
            return array_merge($default_config, $ai_config);
            
        } catch (Exception $e) {
            $this->logger->error("AI設定読み込みエラー", ['error' => $e->getMessage()]);
            return [
                'ai_enabled' => false,
                'ai_confidence_threshold' => 0.7,
                'ai_timeout_seconds' => 30
            ];
        }
    }
    
    /**
     * ログ初期化
     * 
     * @return object ログインスタンス
     */
    private function initializeLogger() {
        return new class {
            public function info($message, $context = []) {
                $this->log('INFO', $message, $context);
            }
            
            public function warning($message, $context = []) {
                $this->log('WARNING', $message, $context);
            }
            
            public function error($message, $context = []) {
                $this->log('ERROR', $message, $context);
            }
            
            public function debug($message, $context = []) {
                $this->log('DEBUG', $message, $context);
            }
            
            private function log($level, $message, $context) {
                $timestamp = date('Y-m-d H:i:s');
                $context_str = !empty($context) ? ' ' . json_encode($context, JSON_UNESCAPED_UNICODE) : '';
                error_log("[{$timestamp}] FILTERS_AI.{$level}: {$message}{$context_str}");
            }
        };
    }
    
    // ===========================================
    // 外部連携・統合メソッド
    // ===========================================
    
    /**
     * 一括商品分析
     * 
     * @param array $product_ids 商品IDリスト
     * @param array $options オプション設定
     * @return array 一括分析結果
     */
    public function bulkAnalyzeProducts($product_ids, $options = []) {
        $start_time = microtime(true);
        $results = [];
        $batch_id = 'ai_batch_' . date('Ymd_His') . '_' . substr(uniqid(), -6);
        
        try {
            $this->logger->info("AI一括分析開始", [
                'batch_id' => $batch_id,
                'product_count' => count($product_ids),
                'options' => $options
            ]);
            
            $processed_count = 0;
            $success_count = 0;
            $error_count = 0;
            
            foreach ($product_ids as $product_id) {
                try {
                    $product = $this->data_service->getProductById($product_id);
                    if (!$product) {
                        $results[$product_id] = [
                            'error' => true,
                            'message' => '商品データが見つかりません'
                        ];
                        $error_count++;
                        continue;
                    }
                    
                    $analysis_result = $this->analyzeProduct($product);
                    $results[$product_id] = $analysis_result;
                    
                    if (!isset($analysis_result['error'])) {
                        $success_count++;
                    } else {
                        $error_count++;
                    }
                    
                } catch (Exception $e) {
                    $results[$product_id] = [
                        'error' => true,
                        'message' => $e->getMessage()
                    ];
                    $error_count++;
                }
                
                $processed_count++;
                
                // 進捗ログ（100件ごと）
                if ($processed_count % 100 === 0) {
                    $this->logger->info("AI一括分析進捗", [
                        'batch_id' => $batch_id,
                        'processed' => $processed_count,
                        'total' => count($product_ids)
                    ]);
                }
            }
            
            $total_time = round((microtime(true) - $start_time) * 1000);
            
            $summary = [
                'batch_id' => $batch_id,
                'total_products' => count($product_ids),
                'processed_count' => $processed_count,
                'success_count' => $success_count,
                'error_count' => $error_count,
                'execution_time_ms' => $total_time,
                'timestamp' => date('c')
            ];
            
            $this->logger->info("AI一括分析完了", $summary);
            
            return [
                'status' => 'success',
                'summary' => $summary,
                'results' => $results
            ];
            
        } catch (Exception $e) {
            $this->logger->error("AI一括分析エラー", [
                'batch_id' => $batch_id,
                'error' => $e->getMessage()
            ]);
            
            return [
                'status' => 'error',
                'batch_id' => $batch_id,
                'message' => $e->getMessage(),
                'partial_results' => $results
            ];
        }
    }
    
    /**
     * AI設定更新
     * 
     * @param array $new_config 新しい設定
     * @param string $updated_by 更新者
     * @return bool 更新成功/失敗
     */
    public function updateAiConfig($new_config, $updated_by = 'system') {
        try {
            $updated_settings = [];
            
            foreach ($new_config as $key => $value) {
                if (strpos($key, 'ai_') === 0 || strpos($key, 'deepseek_') === 0) {
                    $result = $this->data_service->updateSystemSetting($key, $value, $updated_by);
                    if ($result) {
                        $updated_settings[] = $key;
                    }
                }
            }
            
            // 設定を再読み込み
            $this->config = $this->loadAiConfig();
            
            $this->logger->info("AI設定更新", [
                'updated_settings' => $updated_settings,
                'updated_by' => $updated_by
            ]);
            
            return !empty($updated_settings);
            
        } catch (Exception $e) {
            $this->logger->error("AI設定更新エラー", [
                'error' => $e->getMessage(),
                'updated_by' => $updated_by
            ]);
            return false;
        }
    }
    
    /**
     * AI統計情報取得
     * 
     * @param int $period_days 集計期間
     * @return array AI統計
     */
    public function getAiStatistics($period_days = 30) {
        try {
            // 学習データ統計
            $learning_data = $this->data_service->getLearningData(1000);
            $cutoff_date = strtotime("-{$period_days} days");
            
            $recent_learning = array_filter($learning_data, function($data) use ($cutoff_date) {
                return strtotime($data['created_at']) >= $cutoff_date;
            });
            
            // 判定分布
            $judgment_counts = ['safe' => 0, 'dangerous' => 0, 'pending' => 0];
            $confidence_sum = 0;
            $confidence_count = 0;
            
            foreach ($recent_learning as $data) {
                $judgment_counts[$data['human_judgment']]++;
                
                if ($data['ai_confidence_score'] !== null) {
                    $confidence_sum += $data['ai_confidence_score'];
                    $confidence_count++;
                }
            }
            
            // AI精度評価
            $accuracy_evaluation = $this->evaluateAiAccuracy($period_days);
            
            return [
                'period_days' => $period_days,
                'total_learning_data' => count($recent_learning),
                'judgment_distribution' => $judgment_counts,
                'average_confidence' => $confidence_count > 0 ? round($confidence_sum / $confidence_count, 3) : 0,
                'accuracy_evaluation' => $accuracy_evaluation,
                'ai_config' => [
                    'enabled' => $this->config['ai_enabled'] ?? false,
                    'confidence_threshold' => $this->config['ai_confidence_threshold'] ?? 0.7,
                    'model_version' => $this->config['deepseek_model_name'] ?? 'unknown'
                ],
                'statistics_timestamp' => date('c')
            ];
            
        } catch (Exception $e) {
            $this->logger->error("AI統計取得エラー", ['error' => $e->getMessage()]);
            return [
                'error' => true,
                'message' => $e->getMessage(),
                'statistics_timestamp' => date('c')
            ];
        }
    }
}
?>
    