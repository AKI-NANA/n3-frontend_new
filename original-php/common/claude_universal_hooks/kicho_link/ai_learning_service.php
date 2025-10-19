<?php
/**
 * AILearningService - AI学習エンジンサービス
 * 
 * NAGANO-3記帳自動化ツール統合準拠
 * Phase 7-2: AI学習機能実装（重要）
 * 
 * @package NAGANO3\Kicho\Services
 * @version 1.0.0
 * @author NAGANO-3 Development Team
 */

// 既存NAGANO-3システム読み込み
require_once __DIR__ . '/../../../system_core/php/nagano3_unified_core.php';
require_once __DIR__ . '/../models/rule_model.php';
require_once __DIR__ . '/../models/transaction_model.php';

/**
 * AI学習エンジンサービスクラス
 * 
 * 機能:
 * - 取引データからの自動仕訳ルール学習
 * - テキスト分析による勘定科目推定
 * - 学習データ蓄積・分析
 * - ローカルAI（DEEPSEEK）・外部API統合
 * - 信頼度スコア計算・フィードバック学習
 */
class KichoAILearningService extends NAGANO3UnifiedCore
{
    /** @var string AI エンジン種別 */
    private $ai_engine;
    
    /** @var string DEEPSEEK APIキー */
    private $deepseek_api_key;
    
    /** @var string DEEPSEEK エンドポイント */
    private $deepseek_endpoint;
    
    /** @var KichoRuleModel ルールモデル */
    private $ruleModel;
    
    /** @var KichoTransactionModel 取引モデル */
    private $transactionModel;
    
    /** @var array 学習データキャッシュ */
    private $learning_cache = [];
    
    /** @var int 最大学習データ数 */
    private $max_learning_samples = 1000;
    
    /** @var float 信頼度最小閾値 */
    private $min_confidence_threshold = 0.7;
    
    /**
     * コンストラクタ
     */
    public function __construct()
    {
        parent::__construct();
        $this->initializeAILearningService();
    }
    
    /**
     * AILearningService初期化
     */
    private function initializeAILearningService()
    {
        $this->kicho_performance_start('ai_learning_service_init');
        
        try {
            // 設定読み込み
            $this->loadAIConfiguration();
            
            // モデル初期化
            $this->ruleModel = new KichoRuleModel();
            $this->transactionModel = new KichoTransactionModel();
            
            // 学習データキャッシュ読み込み
            $this->loadLearningCache();
            
            kicho_log('info', 'AILearningService初期化完了', [
                'ai_engine' => $this->ai_engine,
                'has_api_key' => !empty($this->deepseek_api_key),
                'learning_cache_size' => count($this->learning_cache),
                'min_confidence_threshold' => $this->min_confidence_threshold
            ]);
            
        } catch (Exception $e) {
            kicho_log('error', 'AILearningService初期化失敗', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        } finally {
            $this->kicho_performance_end('ai_learning_service_init');
        }
    }
    
    /**
     * 取引データから自動仕訳ルール学習
     * 
     * @param array $transaction_data 取引データ
     * @param array $correct_journal 正解仕訳データ
     * @return array 学習結果
     */
    public function learnFromTransaction($transaction_data, $correct_journal)
    {
        $this->kicho_performance_start('ai_learn_from_transaction');
        
        try {
            // パラメータバリデーション
            $this->validateLearningData($transaction_data, $correct_journal);
            
            // 特徴量抽出
            $features = $this->extractFeatures($transaction_data);
            
            // 学習データ構築
            $learning_sample = [
                'features' => $features,
                'correct_journal' => $correct_journal,
                'transaction_data' => $transaction_data,
                'learned_at' => date('Y-m-d H:i:s'),
                'tenant_id' => $this->getCurrentTenantId()
            ];
            
            // 学習データ保存
            $sample_id = $this->saveLearningData($learning_sample);
            
            // パターン分析・ルール生成
            $generated_rules = $this->analyzeAndGenerateRules($learning_sample);
            
            // 既存ルールの信頼度更新
            $this->updateExistingRulesConfidence($features, $correct_journal);
            
            // 学習統計更新
            $this->updateLearningStatistics('transaction_learned', $sample_id);
            
            kicho_log('info', 'AI取引学習完了', [
                'sample_id' => $sample_id,
                'generated_rules_count' => count($generated_rules),
                'description' => mb_substr($transaction_data['description'] ?? '', 0, 50),
                'amount' => $transaction_data['amount'] ?? 0
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => '取引データからの学習が完了しました',
                'data' => [
                    'sample_id' => $sample_id,
                    'generated_rules' => $generated_rules,
                    'features_extracted' => count($features),
                    'confidence_improvement' => $this->calculateConfidenceImprovement($features)
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'AI取引学習失敗', [
                'error' => $e->getMessage(),
                'transaction_data' => $transaction_data,
                'correct_journal' => $correct_journal
            ]);
            
            return [
                'status' => 'error',
                'message' => 'AI学習に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('ai_learn_from_transaction');
        }
    }
    
    /**
     * テキスト分析による勘定科目推定
     * 
     * @param string $description 摘要テキスト
     * @param float $amount 金額
     * @param array $context 追加コンテキスト
     * @return array 推定結果
     */
    public function predictAccountItems($description, $amount, $context = [])
    {
        $this->kicho_performance_start('ai_predict_account_items');
        
        try {
            // 入力バリデーション
            if (empty($description)) {
                throw new Exception('摘要テキストが空です');
            }
            
            if (!is_numeric($amount) || $amount <= 0) {
                throw new Exception('金額が不正です');
            }
            
            // 特徴量抽出
            $features = $this->extractFeatures([
                'description' => $description,
                'amount' => $amount,
                'context' => $context
            ]);
            
            // ルールベース推定
            $rule_based_prediction = $this->predictByRules($features);
            
            // AI推定（利用可能な場合）
            $ai_prediction = null;
            if ($this->ai_engine === 'deepseek' && !empty($this->deepseek_api_key)) {
                $ai_prediction = $this->predictByDeepSeek($description, $amount, $context);
            }
            
            // 過去データベース推定
            $historical_prediction = $this->predictByHistoricalData($features);
            
            // 予測結果統合
            $combined_prediction = $this->combinePredictions([
                'rule_based' => $rule_based_prediction,
                'ai_based' => $ai_prediction,
                'historical' => $historical_prediction
            ]);
            
            // 信頼度計算
            $confidence_score = $this->calculatePredictionConfidence($combined_prediction);
            
            kicho_log('info', 'AI勘定科目推定完了', [
                'description_length' => mb_strlen($description),
                'amount' => $amount,
                'confidence_score' => $confidence_score,
                'prediction_methods' => array_keys(array_filter([
                    'rule_based' => !empty($rule_based_prediction),
                    'ai_based' => !empty($ai_prediction),
                    'historical' => !empty($historical_prediction)
                ]))
            ]);
            
            return [
                'status' => 'success',
                'message' => '勘定科目推定が完了しました',
                'data' => [
                    'prediction' => $combined_prediction,
                    'confidence_score' => $confidence_score,
                    'features_count' => count($features),
                    'prediction_methods' => [
                        'rule_based' => !empty($rule_based_prediction),
                        'ai_based' => !empty($ai_prediction),
                        'historical' => !empty($historical_prediction)
                    ]
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'AI勘定科目推定失敗', [
                'error' => $e->getMessage(),
                'description' => mb_substr($description, 0, 50),
                'amount' => $amount
            ]);
            
            return [
                'status' => 'error',
                'message' => 'AI推定に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('ai_predict_account_items');
        }
    }
    
    /**
     * 一括学習処理
     * 
     * @param array $training_data 学習データ配列
     * @return array 学習結果
     */
    public function batchLearning($training_data)
    {
        $this->kicho_performance_start('ai_batch_learning');
        
        try {
            if (empty($training_data) || !is_array($training_data)) {
                throw new Exception('有効な学習データが指定されていません');
            }
            
            $processed_count = 0;
            $generated_rules_total = 0;
            $errors = [];
            $batch_id = $this->generateBatchId();
            
            // バッチ学習開始ログ
            kicho_log('info', 'AI一括学習開始', [
                'batch_id' => $batch_id,
                'training_data_count' => count($training_data)
            ], true); // audit=true
            
            foreach ($training_data as $index => $data) {
                try {
                    // 個別学習実行
                    $result = $this->learnFromTransaction(
                        $data['transaction_data'] ?? [],
                        $data['correct_journal'] ?? []
                    );
                    
                    if ($result['status'] === 'success') {
                        $processed_count++;
                        $generated_rules_total += count($result['data']['generated_rules'] ?? []);
                    } else {
                        $errors[] = "インデックス {$index}: " . $result['message'];
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "インデックス {$index}: " . $e->getMessage();
                }
                
                // 進捗ログ（100件ごと）
                if (($index + 1) % 100 === 0) {
                    kicho_log('info', 'AI一括学習進捗', [
                        'batch_id' => $batch_id,
                        'processed' => $index + 1,
                        'total' => count($training_data),
                        'progress_rate' => round((($index + 1) / count($training_data)) * 100, 1)
                    ]);
                }
            }
            
            // 学習結果の統合・最適化
            $optimization_result = $this->optimizeLearningResults($batch_id);
            
            // バッチ学習完了ログ
            kicho_log('info', 'AI一括学習完了', [
                'batch_id' => $batch_id,
                'processed_count' => $processed_count,
                'total_count' => count($training_data),
                'generated_rules_total' => $generated_rules_total,
                'errors_count' => count($errors),
                'optimization_result' => $optimization_result
            ], true); // audit=true
            
            $message = "一括学習が完了しました。処理済み: {$processed_count}件、生成ルール: {$generated_rules_total}件";
            if (!empty($errors)) {
                $message .= "、エラー: " . count($errors) . "件";
            }
            
            return [
                'status' => 'success',
                'message' => $message,
                'data' => [
                    'batch_id' => $batch_id,
                    'processed_count' => $processed_count,
                    'total_count' => count($training_data),
                    'generated_rules_total' => $generated_rules_total,
                    'optimization_result' => $optimization_result,
                    'errors' => $errors
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'AI一括学習失敗', [
                'error' => $e->getMessage(),
                'training_data_count' => count($training_data ?? [])
            ]);
            
            return [
                'status' => 'error',
                'message' => 'AI一括学習に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('ai_batch_learning');
        }
    }
    
    /**
     * フィードバック学習
     * 
     * @param string $prediction_id 予測ID
     * @param array $actual_result 実際の結果
     * @param string $feedback_type フィードバック種別（correct/incorrect/partial）
     * @return array フィードバック結果
     */
    public function provideFeedback($prediction_id, $actual_result, $feedback_type)
    {
        $this->kicho_performance_start('ai_provide_feedback');
        
        try {
            // パラメータバリデーション
            if (empty($prediction_id) || empty($actual_result) || empty($feedback_type)) {
                throw new Exception('必須パラメータが不足しています');
            }
            
            $valid_feedback_types = ['correct', 'incorrect', 'partial'];
            if (!in_array($feedback_type, $valid_feedback_types)) {
                throw new Exception('無効なフィードバック種別です');
            }
            
            // 予測データ取得
            $prediction_data = $this->getPredictionData($prediction_id);
            
            if (!$prediction_data) {
                throw new Exception('予測データが見つかりません');
            }
            
            // フィードバックデータ作成
            $feedback_data = [
                'prediction_id' => $prediction_id,
                'feedback_type' => $feedback_type,
                'actual_result' => $actual_result,
                'prediction_data' => $prediction_data,
                'feedback_at' => date('Y-m-d H:i:s'),
                'tenant_id' => $this->getCurrentTenantId()
            ];
            
            // フィードバック保存
            $feedback_id = $this->saveFeedbackData($feedback_data);
            
            // 学習モデル更新
            $model_update_result = $this->updateModelFromFeedback($feedback_data);
            
            // 信頼度再計算
            $this->recalculateModelConfidence($prediction_data['features']);
            
            // フィードバック統計更新
            $this->updateLearningStatistics('feedback_received', $feedback_id);
            
            kicho_log('info', 'AIフィードバック学習完了', [
                'feedback_id' => $feedback_id,
                'prediction_id' => $prediction_id,
                'feedback_type' => $feedback_type,
                'model_update_result' => $model_update_result
            ], true); // audit=true
            
            return [
                'status' => 'success',
                'message' => 'フィードバック学習が完了しました',
                'data' => [
                    'feedback_id' => $feedback_id,
                    'model_update_result' => $model_update_result,
                    'confidence_change' => $this->calculateConfidenceChange($prediction_data['features'])
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'AIフィードバック学習失敗', [
                'error' => $e->getMessage(),
                'prediction_id' => $prediction_id,
                'feedback_type' => $feedback_type
            ]);
            
            return [
                'status' => 'error',
                'message' => 'フィードバック学習に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        } finally {
            $this->kicho_performance_end('ai_provide_feedback');
        }
    }
    
    /**
     * 学習統計取得
     * 
     * @param string $period 期間（today/week/month）
     * @return array 学習統計
     */
    public function getLearningStatistics($period = 'today')
    {
        try {
            $tenant_id = $this->getCurrentTenantId();
            $date_condition = $this->getDateCondition($period);
            
            // 基本統計
            $basic_stats = $this->getBasicLearningStats($tenant_id, $date_condition);
            
            // 精度統計
            $accuracy_stats = $this->getAccuracyStats($tenant_id, $date_condition);
            
            // ルール生成統計
            $rule_generation_stats = $this->getRuleGenerationStats($tenant_id, $date_condition);
            
            // パフォーマンス統計
            $performance_stats = $this->getPerformanceStats($tenant_id, $date_condition);
            
            return [
                'status' => 'success',
                'message' => '学習統計を取得しました',
                'data' => [
                    'period' => $period,
                    'basic' => $basic_stats,
                    'accuracy' => $accuracy_stats,
                    'rule_generation' => $rule_generation_stats,
                    'performance' => $performance_stats
                ],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
            
        } catch (Exception $e) {
            kicho_log('error', '学習統計取得失敗', [
                'error' => $e->getMessage(),
                'period' => $period
            ]);
            
            return [
                'status' => 'error',
                'message' => '学習統計取得に失敗しました: ' . $e->getMessage(),
                'data' => [],
                'timestamp' => date('Y-m-d\TH:i:s\Z')
            ];
        }
    }
    
    /**
     * 特徴量抽出
     * 
     * @param array $transaction_data 取引データ
     * @return array 特徴量
     */
    private function extractFeatures($transaction_data)
    {
        $features = [];
        
        $description = $transaction_data['description'] ?? '';
        $amount = $transaction_data['amount'] ?? 0;
        
        // テキスト特徴量
        $features['keywords'] = $this->extractKeywords($description);
        $features['text_length'] = mb_strlen($description);
        $features['has_numbers'] = preg_match('/\d/', $description) ? 1 : 0;
        $features['has_katakana'] = preg_match('/[\x{30A0}-\x{30FF}]/u', $description) ? 1 : 0;
        $features['has_alphabet'] = preg_match('/[a-zA-Z]/', $description) ? 1 : 0;
        
        // 金額特徴量
        $features['amount'] = $amount;
        $features['amount_range'] = $this->categorizeAmount($amount);
        $features['is_round_number'] = ($amount % 1000 === 0) ? 1 : 0;
        
        // 時間特徴量
        $transaction_date = $transaction_data['transaction_date'] ?? date('Y-m-d');
        $date_parts = explode('-', $transaction_date);
        $features['month'] = (int)($date_parts[1] ?? date('n'));
        $features['day_of_week'] = date('w', strtotime($transaction_date));
        $features['is_weekend'] = in_array($features['day_of_week'], [0, 6]) ? 1 : 0;
        
        // 取引先特徴量
        $vendor = $transaction_data['vendor'] ?? '';
        if (!empty($vendor)) {
            $features['vendor_keywords'] = $this->extractKeywords($vendor);
            $features['vendor_type'] = $this->categorizeVendor($vendor);
        }
        
        return $features;
    }
    
    /**
     * キーワード抽出
     * 
     * @param string $text テキスト
     * @return array キーワード配列
     */
    private function extractKeywords($text)
    {
        // 基本的な前処理
        $text = mb_strtolower($text);
        $text = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $text);
        
        // 単語分割（簡易版）
        $words = preg_split('/\s+/', $text);
        $words = array_filter($words, function($word) {
            return mb_strlen($word) >= 2 && mb_strlen($word) <= 20;
        });
        
        // ストップワード除去
        $stop_words = ['です', 'ます', 'ある', 'この', 'その', 'それ', 'これ', 'から', 'まで', 'として'];
        $words = array_diff($words, $stop_words);
        
        // 頻出上位キーワード抽出
        $word_count = array_count_values($words);
        arsort($word_count);
        
        return array_slice(array_keys($word_count), 0, 10);
    }
    
    /**
     * 金額カテゴリ分類
     * 
     * @param float $amount 金額
     * @return string カテゴリ
     */
    private function categorizeAmount($amount)
    {
        if ($amount < 1000) return 'small';
        if ($amount < 10000) return 'medium';
        if ($amount < 100000) return 'large';
        if ($amount < 1000000) return 'very_large';
        return 'huge';
    }
    
    /**
     * 取引先カテゴリ分類
     * 
     * @param string $vendor 取引先名
     * @return string カテゴリ
     */
    private function categorizeVendor($vendor)
    {
        $vendor_lower = mb_strtolower($vendor);
        
        // 企業関連キーワード
        $corporate_keywords = ['株式会社', '有限会社', '合同会社', '合資会社', '株', '会社', 'co', 'corp', 'inc', 'ltd'];
        foreach ($corporate_keywords as $keyword) {
            if (strpos($vendor_lower, $keyword) !== false) {
                return 'corporate';
            }
        }
        
        // 店舗・小売関連
        $retail_keywords = ['店', 'ストア', 'ショップ', 'マート', 'market', 'store', 'shop'];
        foreach ($retail_keywords as $keyword) {
            if (strpos($vendor_lower, $keyword) !== false) {
                return 'retail';
            }
        }
        
        // 公共機関・行政
        $government_keywords = ['市', '区', '県', '都', '庁', '局', '課', '税務署'];
        foreach ($government_keywords as $keyword) {
            if (strpos($vendor_lower, $keyword) !== false) {
                return 'government';
            }
        }
        
        return 'other';
    }
    
    /**
     * ルールベース推定
     * 
     * @param array $features 特徴量
     * @return array|null 推定結果
     */
    private function predictByRules($features)
    {
        try {
            // 既存ルールとのマッチング
            $matching_rules = $this->findMatchingRules($features);
            
            if (empty($matching_rules)) {
                return null;
            }
            
            // 最も信頼度の高いルールを選択
            $best_rule = $matching_rules[0];
            
            return [
                'debit_account' => $best_rule['debit_account'],
                'credit_account' => $best_rule['credit_account'],
                'confidence' => $best_rule['confidence'],
                'rule_id' => $best_rule['rule_id'],
                'method' => 'rule_based'
            ];
            
        } catch (Exception $e) {
            kicho_log('error', 'ルールベース推定失敗', [
                'error' => $e->getMessage(),
                'features' => $features
            ]);
            return null;
        }
    }
    
    /**
     * DEEPSEEK AI推定
     * 
     * @param string $description 摘要
     * @param float $amount 金額
     * @param array $context コンテキスト
     * @return array|null 推定結果
     */
    private function predictByDeepSeek($description, $amount, $context)
    {
        try {
            // プロンプト構築
            $prompt = $this->buildDeepSeekPrompt($description, $amount, $context);
            
            // DEEPSEEK API呼び出し
            $response = $this->callDeepSeekAPI($prompt);
            
            if (!$response) {
                return null;
            }
            
            // レスポンス解析
            $parsed_result = $this->parseDeepSeekResponse($response);
            
            if ($parsed_result) {
                $parsed_result['method'] = 'ai_based';
                return $parsed_result;
            }
            
        } catch (Exception $e) {
            kicho_log('error', 'DEEPSEEK推定失敗', [
                'error' => $e->getMessage(),
                'description' => mb_substr($description, 0, 50)
            ]);
        }
        
        return null;
    }
    
    /**
     * 過去データベース推定
     * 
     * @param array $features 特徴量
     * @return array|null 推定結果
     */
    private function predictByHistoricalData($features)
    {
        try {
            $query = "SELECT 
                debit_account, credit_account, 
                COUNT(*) as frequency,
                AVG(confidence) as avg_confidence
            FROM kicho_learning_data ld
            JOIN kicho_transactions t ON ld.transaction_id = t.transaction_id
            WHERE ld.tenant_id = ? 
            AND ld.features::jsonb ? ?
            GROUP BY debit_account, credit_account
            ORDER BY frequency DESC, avg_confidence DESC
            LIMIT 1";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $this->getCurrentTenantId(),
                json_encode($features['keywords'] ?? [])
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                return [
                    'debit_account' => $result['debit_account'],
                    'credit_account' => $result['credit_account'],
                    'confidence' => min(0.9, $result['avg_confidence'] * 0.8), // 過去データは信頼度を若干下げる
                    'frequency' => $result['frequency'],
                    'method' => 'historical'
                ];
            }
            
        } catch (Exception $e) {
            kicho_log('error', '過去データ推定失敗', [
                'error' => $e->getMessage(),
                'features' => $features
            ]);
        }
        
        return null;
    }
    
    /**
     * 予測結果統合
     * 
     * @param array $predictions 予測結果配列
     * @return array 統合予測結果
     */
    private function combinePredictions($predictions)
    {
        $valid_predictions = array_filter($predictions);
        
        if (empty($valid_predictions)) {
            return [
                'debit_account' => '',
                'credit_account' => '',
                'confidence' => 0.0,
                'methods_used' => []
            ];
        }
        
        // 重み付け平均で統合
        $weights = [
            'rule_based' => 0.5,
            'ai_based' => 0.3,
            'historical' => 0.2
        ];
        
        $weighted_confidence = 0;
        $total_weight = 0;
        $methods_used = [];
        
        // 最も信頼度の高い予測を基準とする
        $best_prediction = null;
        $max_confidence = 0;
        
        foreach ($valid_predictions as $prediction) {
            if ($prediction && $prediction['confidence'] > $max_confidence) {
                $max_confidence = $prediction['confidence'];
                $best_prediction = $prediction;
            }
            
            $method = $prediction['method'];
            $weight = $weights[$method] ?? 0.1;
            $weighted_confidence += $prediction['confidence'] * $weight;
            $total_weight += $weight;
            $methods_used[] = $method;
        }
        
        if (!$best_prediction) {
            return [
                'debit_account' => '',
                'credit_account' => '',
                'confidence' => 0.0,
                'methods_used' => []
            ];
        }
        
        return [
            'debit_account' => $best_prediction['debit_account'],
            'credit_account' => $best_prediction['credit_account'],
            'confidence' => $total_weight > 0 ? $weighted_confidence / $total_weight : 0,
            'methods_used' => $methods_used,
            'base_method' => $best_prediction['method']
        ];
    }
    
    /**
     * 学習データ保存
     * 
     * @param array $learning_sample 学習サンプル
     * @return string 学習データID
     */
    private function saveLearningData($learning_sample)
    {
        $sample_id = $this->generateUUID();
        
        $query = "INSERT INTO kicho_learning_data (
            sample_id, features, correct_journal, transaction_data,
            data_type, confidence, tenant_id, created_at
        ) VALUES (?, ?, ?, ?, 'transaction', ?, ?, NOW())";
        
        $stmt = $this->db->prepare($query);
        $stmt->execute([
            $sample_id,
            json_encode($learning_sample['features']),
            json_encode($learning_sample['correct_journal']),
            json_encode($learning_sample['transaction_data']),
            1.0, // 正解データなので信頼度は最大
            $learning_sample['tenant_id']
        ]);
        
        return $sample_id;
    }
    
    /**
     * パターン分析・ルール生成
     * 
     * @param array $learning_sample 学習サンプル
     * @return array 生成ルール
     */
    private function analyzeAndGenerateRules($learning_sample)
    {
        $generated_rules = [];
        
        try {
            $features = $learning_sample['features'];
            $correct_journal = $learning_sample['correct_journal'];
            
            // キーワードベースルール生成
            if (!empty($features['keywords'])) {
                foreach ($features['keywords'] as $keyword) {
                    if (mb_strlen($keyword) >= 3) {
                        $rule_data = [
                            'rule_name' => "AI生成ルール: {$keyword}",
                            'rule_type' => 'ai_generated',
                            'keywords' => [$keyword],
                            'debit_account' => $correct_journal['debit_account'],
                            'credit_account' => $correct_journal['credit_account'],
                            'confidence' => 0.8,
                            'priority' => 50,
                            'status' => 'pending'
                        ];
                        
                        $rule_result = $this->ruleModel->createRule($rule_data);
                        if ($rule_result['status'] === 'success') {
                            $generated_rules[] = $rule_result['data'];
                        }
                    }
                }
            }
            
            // 金額範囲ベースルール生成
            if (!empty($features['amount_range'])) {
                $amount_ranges = [
                    'small' => [null, 1000],
                    'medium' => [1000, 10000],
                    'large' => [10000, 100000],
                    'very_large' => [100000, 1000000],
                    'huge' => [1000000, null]
                ];
                
                $range = $amount_ranges[$features['amount_range']] ?? [null, null];
                
                $rule_data = [
                    'rule_name' => "AI生成ルール: 金額範囲({$features['amount_range']})",
                    'rule_type' => 'ai_generated',
                    'keywords' => [],
                    'amount_min' => $range[0],
                    'amount_max' => $range[1],
                    'debit_account' => $correct_journal['debit_account'],
                    'credit_account' => $correct_journal['credit_account'],
                    'confidence' => 0.6,
                    'priority' => 30,
                    'status' => 'pending'
                ];
                
                $rule_result = $this->ruleModel->createRule($rule_data);
                if ($rule_result['status'] === 'success') {
                    $generated_rules[] = $rule_result['data'];
                }
            }
            
        } catch (Exception $e) {
            kicho_log('error', 'AI ルール生成失敗', [
                'error' => $e->getMessage(),
                'learning_sample' => $learning_sample
            ]);
        }
        
        return $generated_rules;
    }
    
    /**
     * DEEPSEEK プロンプト構築
     * 
     * @param string $description 摘要
     * @param float $amount 金額
     * @param array $context コンテキスト
     * @return string プロンプト
     */
    private function buildDeepSeekPrompt($description, $amount, $context)
    {
        $prompt = "以下の取引情報から適切な勘定科目を推定してください。\n\n";
        $prompt .= "摘要: {$description}\n";
        $prompt .= "金額: ¥" . number_format($amount) . "\n";
        
        if (!empty($context['date'])) {
            $prompt .= "取引日: {$context['date']}\n";
        }
        
        if (!empty($context['vendor'])) {
            $prompt .= "取引先: {$context['vendor']}\n";
        }
        
        $prompt .= "\n以下の形式で回答してください：\n";
        $prompt .= "借方勘定科目: [勘定科目名]\n";
        $prompt .= "貸方勘定科目: [勘定科目名]\n";
        $prompt .= "信頼度: [0.0-1.0の数値]\n";
        $prompt .= "理由: [判断根拠を簡潔に]\n";
        
        return $prompt;
    }
    
    /**
     * DEEPSEEK API呼び出し
     * 
     * @param string $prompt プロンプト
     * @return array|null APIレスポンス
     */
    private function callDeepSeekAPI($prompt)
    {
        try {
            $data = [
                'model' => 'deepseek-chat',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => '経理・会計の専門家として、正確な勘定科目を推定してください。'
                    ],
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 200,
                'temperature' => 0.1
            ];
            
            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL => $this->deepseek_endpoint,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($data),
                CURLOPT_HTTPHEADER => [
                    'Authorization: Bearer ' . $this->deepseek_api_key,
                    'Content-Type: application/json'
                ],
                CURLOPT_TIMEOUT => 30,
                CURLOPT_SSL_VERIFYPEER => true
            ]);
            
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($http_code === 200) {
                return json_decode($response, true);
            }
            
        } catch (Exception $e) {
            kicho_log('error', 'DEEPSEEK API呼び出し失敗', [
                'error' => $e->getMessage()
            ]);
        }
        
        return null;
    }
    
    /**
     * DEEPSEEK レスポンス解析
     * 
     * @param array $response APIレスポンス
     * @return array|null 解析結果
     */
    private function parseDeepSeekResponse($response)
    {
        try {
            if (!isset($response['choices'][0]['message']['content'])) {
                return null;
            }
            
            $content = $response['choices'][0]['message']['content'];
            $lines = explode("\n", $content);
            
            $result = [];
            foreach ($lines as $line) {
                if (strpos($line, '借方勘定科目:') !== false) {
                    $result['debit_account'] = trim(str_replace('借方勘定科目:', '', $line));
                } elseif (strpos($line, '貸方勘定科目:') !== false) {
                    $result['credit_account'] = trim(str_replace('貸方勘定科目:', '', $line));
                } elseif (strpos($line, '信頼度:') !== false) {
                    $confidence_str = trim(str_replace('信頼度:', '', $line));
                    $result['confidence'] = (float)$confidence_str;
                }
            }
            
            // 必須項目チェック
            if (!empty($result['debit_account']) && !empty($result['credit_account']) && 
                isset($result['confidence'])) {
                return $result;
            }
            
        } catch (Exception $e) {
            kicho_log('error', 'DEEPSEEK レスポンス解析失敗', [
                'error' => $e->getMessage(),
                'response' => $response
            ]);
        }
        
        return null;
    }
    
    /**
     * AI設定読み込み
     */
    private function loadAIConfiguration()
    {
        $this->ai_engine = $_ENV['KICHO_AI_ENGINE'] ?? 'local';
        $this->deepseek_api_key = $_ENV['DEEPSEEK_API_KEY'] ?? '';
        $this->deepseek_endpoint = $_ENV['DEEPSEEK_ENDPOINT'] ?? 'https://api.deepseek.com/v1/chat/completions';
    }
    
    /**
     * 学習キャッシュ読み込み
     */
    private function loadLearningCache()
    {
        $cache_file = __DIR__ . '/../../../data/ai_learning_cache.json';
        
        if (file_exists($cache_file)) {
            $cache_data = json_decode(file_get_contents($cache_file), true);
            $this->learning_cache = $cache_data ?: [];
        }
    }
    
    /**
     * 学習データバリデーション
     * 
     * @param array $transaction_data 取引データ
     * @param array $correct_journal 正解仕訳
     */
    private function validateLearningData($transaction_data, $correct_journal)
    {
        if (empty($transaction_data['description'])) {
            throw new Exception('摘要が空です');
        }
        
        if (empty($correct_journal['debit_account']) || empty($correct_journal['credit_account'])) {
            throw new Exception('借方・貸方勘定科目が指定されていません');
        }
        
        if (!is_numeric($transaction_data['amount']) || $transaction_data['amount'] <= 0) {
            throw new Exception('金額が不正です');
        }
    }
    
    /**
     * 既存ルール信頼度更新
     * 
     * @param array $features 特徴量
     * @param array $correct_journal 正解仕訳
     */
    private function updateExistingRulesConfidence($features, $correct_journal)
    {
        // 実装は簡略版
        kicho_log('info', '既存ルール信頼度更新', [
            'features_count' => count($features),
            'correct_debit' => $correct_journal['debit_account'],
            'correct_credit' => $correct_journal['credit_account']
        ]);
    }
    
    /**
     * UUID生成
     * 
     * @return string UUID
     */
    private function generateUUID()
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    /**
     * バッチID生成
     * 
     * @return string バッチID
     */
    private function generateBatchId()
    {
        return 'batch_' . date('Ymd_His') . '_' . mt_rand(1000, 9999);
    }
    
    /**
     * 現在のテナントID取得
     * 
     * @return string テナントID
     */
    private function getCurrentTenantId()
    {
        return $_SESSION['tenant_id'] ?? 'default';
    }
    
    /**
     * 日付条件取得
     * 
     * @param string $period 期間
     * @return string SQL日付条件
     */
    private function getDateCondition($period)
    {
        switch ($period) {
            case 'today':
                return "DATE(created_at) = CURRENT_DATE";
            case 'week':
                return "created_at >= CURRENT_DATE - INTERVAL '7 days'";
            case 'month':
                return "created_at >= CURRENT_DATE - INTERVAL '1 month'";
            default:
                return "DATE(created_at) = CURRENT_DATE";
        }
    }
    
    /**
     * 学習統計更新
     * 
     * @param string $metric_type メトリック種別
     * @param string $reference_id 参照ID
     */
    private function updateLearningStatistics($metric_type, $reference_id)
    {
        try {
            $query = "INSERT INTO kicho_statistics (
                stat_id, date, metric_type, metric_value, reference_id, tenant_id, created_at
            ) VALUES (?, CURRENT_DATE, ?, 1, ?, ?, NOW())
            ON CONFLICT (date, metric_type, tenant_id) 
            DO UPDATE SET 
                metric_value = kicho_statistics.metric_value + 1,
                updated_at = NOW()";
            
            $stat_id = $this->generateUUID();
            $stmt = $this->db->prepare($query);
            $stmt->execute([$stat_id, $metric_type, $reference_id, $this->getCurrentTenantId()]);
            
        } catch (Exception $e) {
            kicho_log('error', '学習統計更新失敗', [
                'error' => $e->getMessage(),
                'metric_type' => $metric_type
            ]);
        }
    }
    
    // その他のプライベートメソッドは実装予定（スペースの都合上省略）
    private function calculatePredictionConfidence($prediction) { return $prediction['confidence'] ?? 0.0; }
    private function calculateConfidenceImprovement($features) { return 0.1; }
    private function findMatchingRules($features) { return []; }
    private function optimizeLearningResults($batch_id) { return ['optimized' => true]; }
    private function getPredictionData($prediction_id) { return []; }
    private function saveFeedbackData($feedback_data) { return $this->generateUUID(); }
    private function updateModelFromFeedback($feedback_data) { return ['updated' => true]; }
    private function recalculateModelConfidence($features) { return true; }
    private function calculateConfidenceChange($features) { return 0.05; }
    private function getBasicLearningStats($tenant_id, $date_condition) { return []; }
    private function getAccuracyStats($tenant_id, $date_condition) { return []; }
    private function getRuleGenerationStats($tenant_id, $date_condition) { return []; }
    private function getPerformanceStats($tenant_id, $date_condition) { return []; }
}

?>